#!/usr/bin/env python3
"""Prove a change to /portfolio has not broken the author's GitHub profile.

    python design/tools/check-capture-contract.py             # this working tree
    python design/tools/check-capture-contract.py --ref origin/development

`chrisJuresh/chrisJuresh` — the profile repo — screenshots `chrisj.uk/portfolio`
about once an hour and rewrites its README to a light/dark `<picture>` of the
result. Nothing in THIS repo hints at that, so a change here can break a page
over there, and the two ways it breaks are not alike:

* **Loudly.** Its `scripts/capture-portfolio.mjs` asserts on selectors and on
  geometry — a `.listing` whose `h2` is exactly `Work Experience`, two roles in
  it, balanced gutters, a capture width inside a range. Break one and the job
  throws and the profile keeps the last preview it managed.
* **Silently.** It asserts nothing whatever about colour. Invert the theme and
  every assertion still passes; the profile just quietly starts showing a dark
  slab on GitHub's white paper, and nobody finds out from the job log.

So this script replays that capture against a local server and reports both: the
four geometry numbers the job would compute, and the mean luminance of the two
images it wrote, which is the only thing standing between a theme regression and
an hour of a wrong profile page.

## The four numbers

`captureWidth` **592**, `cropHeight` **852**, and all four gutters **80**. Only
the first and the gutters are hard contract. 592 is also the hardcoded divisor in
the capture's `deviceScaleFactor` (`846 * 3 / 592`), so moving `--col`,
`--slide-h` or the track gap either fails its range check or silently resamples
the type; this script fails on it. `cropHeight` is the bottom of the second role
plus one gutter, so any legitimate edit to the column's vertical spacing moves it
— it has been 897, 893, 854 and now 852 — and an unexplained change is the tell
that font resolution moved on the runner. This script reports drift as a warning
and takes `--expect-crop-height` when a change is meant to move it.

## The traps, all of which cost somebody an hour once

* **`preview_start` serves the main checkout**, never the worktree the edit lives
  in, so verifying with it measures `development` while you believe you are
  measuring your branch. This script starts its own `http.server` on the tree it
  was invoked from, with `--directory`, so the server's cwd is never inside that
  tree and never holds a Windows lock on a worktree you are about to remove.
* **The capture script is fetched, never vendored.** A committed copy drifts
  silently against a repo we do not own and cannot answer "is this current" —
  the same failure mode the worktree guard is documented against in CLAUDE.md.
  The blob sha of what actually ran is printed in the report.
* **ESM resolves `playwright` from the capture script's own directory**, not the
  cwd, and a worktree has no `node_modules` because it is ignored. So the fetched
  script is staged inside `design/tools/` of whichever checkout has the install —
  the main checkout, found through `--git-common-dir` — and resolution walks up
  into the `node_modules` that is already there. Nothing is installed, and in
  particular nothing is ever `npm install --prefix`ed into a directory that is
  standing in for one.
* **The capture writes `assets/*.png` and `README.md` into its cwd**, so it runs
  in a staging directory, never in a checkout. Each run gets its own directory
  keyed on `--label` (defaulting to the branch or ref), so an A/B against
  `development` does not leave you measuring the baseline's pixels believing they
  are the branch's. **Two runs sharing a label overwrite each other.**

Needs `node`, `gh` (authenticated), Pillow, and a `playwright` install under
`design/tools/` — `npm install` there, in the main checkout, if it is missing.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

# The upstream capture, fetched at run time. Path is inside the profile repo.
CAPTURE_REPO = "chrisJuresh/chrisJuresh"
CAPTURE_PATH = "scripts/capture-portfolio.mjs"

# Hard contract. 592 is load-bearing twice over — the range check and the
# deviceScaleFactor divisor — and the gutters are what "balanced" means.
EXPECT_CAPTURE_WIDTH = 592
EXPECT_GUTTER = 80
GEOMETRY_TOLERANCE = 0.5

# The bottom gutter gets its own, looser one. It is not measured, it is derived:
# `round(secondRoleBottom + sideGutter) - secondRoleBottom`, so it carries the
# rounding residue of the crop height and lands anywhere in gutter +/- 0.5 before
# anything is wrong. It reads 80.4 on development. At the 0.5 the others use,
# half a pixel of ordinary drift would fail a capture the real job passes, since
# upstream only ever compares it against the side gutter.
BOTTOM_GUTTER_TOLERANCE = 1.0

# Soft contract: legitimately moves with the column's vertical spacing.
EXPECT_CROP_HEIGHT = 852

# Luminance, 0-255, over the whole cropped image. The light capture is forced to
# #ffffff paper and the dark one to #0d1117, and both carry the same three
# photographs, so the two means sit far apart and stay there: 188.4 and 46.1 on
# development at 2026-08-15. The bounds are deliberately loose. Swapping which
# photographs lead the strip moves these by a few points and must not fail;
# a theme that renders dark where it should be light moves them by 140 and must.
LIGHT_MIN_LUMA = 150.0
DARK_MAX_LUMA = 100.0
MIN_LUMA_SEPARATION = 60.0

# The capture keys its output filenames on PORTFOLIO_SOURCE_SHA, which we leave
# unset so they come out `portfolio-preview-manual-<theme>.png`. Found by glob
# rather than by that literal name: the naming belongs to a repo this one does
# not own and is fetched fresh every run, so a rename there would otherwise
# surface as a FileNotFoundError traceback reported as a broken contract.
PREVIEW_GLOB = "assets/portfolio-preview-*-{theme}.png"


class CheckError(RuntimeError):
    """Something stopped the check running, as opposed to the check failing."""


# ---------------------------------------------------------------- locating things


def repo_root() -> Path:
    """The checkout this script is running out of — worktree or main."""
    return Path(__file__).resolve().parents[2]


def playwright_tools_dir(root: Path) -> Path:
    """The `design/tools/` that has the `playwright` install.

    A worktree gets only what git puts in it and `node_modules/` is ignored, so
    the install is almost always in the main checkout. `--git-common-dir` is how
    a worktree names it without being told.
    """
    candidates = [root / "design" / "tools"]

    common = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--path-format=absolute", "--git-common-dir"],
        capture_output=True,
        text=True,
    )
    if common.returncode == 0:
        main_checkout = Path(common.stdout.strip()).parent
        candidates.append(main_checkout / "design" / "tools")

    for tools in candidates:
        if (tools / "node_modules" / "playwright").is_dir():
            return tools

    tried = "\n  ".join(str(c) for c in candidates)
    raise CheckError(
        "Could not find a playwright install to run the capture against. Looked in:\n  "
        + tried
        + "\n\nRun `npm install` in design/tools of the main checkout. Do not install "
        "into a worktree copy and do not use `npm install --prefix`."
    )


# ---------------------------------------------------------------- the tree to serve


def export_ref(root: Path, ref: str, dest: Path) -> None:
    """Lay `ref` out on disk with `git archive`, rather than checking it out.

    A second checkout of the same ref would need a second worktree; an archive
    needs nothing and leaves no branch, no lock and no entry in `git worktree
    list` behind.
    """
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    tarball = dest.parent / "tree.tar"
    result = subprocess.run(
        ["git", "-C", str(root), "archive", "--format=tar", "-o", str(tarball), ref],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise CheckError(f"git archive {ref} failed:\n{result.stderr.strip()}")

    with tarfile.open(tarball) as archive:
        archive.extractall(dest, filter="data")
    tarball.unlink()


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def serve(directory: Path, port: int) -> subprocess.Popen:
    """Serve `directory` on loopback and wait until it answers.

    `--directory` rather than a cwd: a server whose cwd is inside a worktree
    holds a Windows lock on it, and `git worktree remove` then fails while still
    deregistering the worktree, which leaves an empty directory nothing can take
    down until the machine restarts.
    """
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port),
         "--bind", "127.0.0.1", "--directory", str(directory)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # An empty ProxyHandler, because urlopen otherwise honours http_proxy from
    # the environment and a managed machine tends to set one. Sent through a
    # corporate proxy, a request to 127.0.0.1 fails, and the script reports a
    # server that never answered while the server is sitting there answering.
    direct = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    url = f"http://127.0.0.1:{port}/portfolio/"
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if server.poll() is not None:
            raise CheckError(f"http.server exited immediately (port {port} taken?).")
        try:
            with direct.open(url, timeout=1) as response:
                if response.status == 200:
                    return server
        except (urllib.error.URLError, OSError):
            pass
        time.sleep(0.2)

    stop(server)
    raise CheckError(f"Server never answered {url}.")


def stop(server: subprocess.Popen) -> None:
    """Take the server down without ever raising over whatever else went wrong.

    This runs in a `finally`, so a `TimeoutExpired` escaping here would replace
    the capture error that is the actual reason the run is ending.
    """
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()


# ---------------------------------------------------------------- the capture itself


def fetch_capture_script(destination: Path) -> str:
    """Fetch the upstream capture and return the blob sha that ran.

    Fetched, not vendored: a copy in this repo drifts against a repo this one
    does not own, and silently, because nothing here would fail when it did.
    """
    result = subprocess.run(
        ["gh", "api", f"repos/{CAPTURE_REPO}/contents/{CAPTURE_PATH}"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise CheckError(
            f"Could not fetch {CAPTURE_REPO}/{CAPTURE_PATH} with gh:\n{result.stderr.strip()}"
        )

    payload = json.loads(result.stdout)
    destination.write_bytes(base64.b64decode(payload["content"]))
    return payload["sha"]


def run_capture(script: Path, out_dir: Path, url: str) -> dict:
    """Run the capture with its cwd in staging, and hand back its JSON report."""
    out_dir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["node", str(script)],
        cwd=str(out_dir),
        capture_output=True,
        text=True,
        env={**os.environ, "PORTFOLIO_URL": url},
    )
    if result.returncode != 0:
        raise CheckError(
            # ASCII only in anything printed: this runs on a Windows console
            # whose codepage is not always UTF-8, and an em dash there is either
            # mojibake or a UnicodeEncodeError on top of the real error.
            "The capture script threw. This is the loud failure mode, and the "
            "profile README would keep its previous preview:\n\n"
            + (result.stderr.strip() or result.stdout.strip())
        )
    return json.loads(result.stdout)


def find_preview(out_dir: Path, theme: str) -> Path:
    """The PNG the capture just wrote for `theme`, whatever it chose to call it."""
    matches = sorted(out_dir.glob(PREVIEW_GLOB.format(theme=theme)))
    if len(matches) != 1:
        raise CheckError(
            f"Expected exactly one {theme} preview in {out_dir / 'assets'}, found "
            f"{len(matches)}. The capture's output naming has moved; read the "
            f"fetched {CAPTURE_PATH} and update PREVIEW_GLOB."
        )
    return matches[0]


def mean_luminance(image_path: Path) -> float:
    """Mean Rec.601 luma of the whole cropped image, 0-255.

    Whole image on purpose. The capture forces both palettes explicitly, so the
    question this answers is not "is some element the wrong colour" but "did the
    render as a whole come back dark", which is the failure GitHub would show.
    """
    try:
        from PIL import Image, ImageStat
    except ImportError as exc:  # pragma: no cover - environment problem, not a result
        raise CheckError("Pillow is needed to measure luminance: pip install Pillow") from exc

    with Image.open(image_path) as image:
        return ImageStat.Stat(image.convert("L")).mean[0]


# ---------------------------------------------------------------- reporting


def check(label: str, actual: float, expected: float, tolerance: float) -> tuple[str, str]:
    ok = abs(actual - expected) <= tolerance
    return ("PASS" if ok else "FAIL", f"{label:<26} {actual:>8.1f}   expected {expected:g}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Replay the GitHub profile's portfolio capture against a local tree.",
    )
    parser.add_argument(
        "--ref",
        help="Serve this git ref instead of the working tree (e.g. origin/development).",
    )
    parser.add_argument(
        "--label",
        help="Name the staging directory. Defaults to the branch or ref. "
             "Two runs sharing a label overwrite each other's images.",
    )
    parser.add_argument("--port", type=int, help="Serve on this port instead of a free one.")
    parser.add_argument(
        "--expect-crop-height",
        type=float,
        default=EXPECT_CROP_HEIGHT,
        help=f"Crop height to compare against (default {EXPECT_CROP_HEIGHT}). "
             "Pass the new value when a spacing change is meant to move it.",
    )
    parser.add_argument("--json", action="store_true", help="Print the raw capture report too.")
    args = parser.parse_args()

    root = repo_root()
    tools = playwright_tools_dir(root)

    label = args.label or args.ref or current_branch(root) or "worktree"
    label = re.sub(r"[^A-Za-z0-9._-]+", "-", label).strip("-") or "run"

    stage = tools / ".capture-contract"
    run_dir = stage / "runs" / label
    out_dir = run_dir / "out"
    run_dir.mkdir(parents=True, exist_ok=True)

    script = stage / "capture-portfolio.mjs"
    sha = fetch_capture_script(script)

    if args.ref:
        served = run_dir / "tree"
        export_ref(root, args.ref, served)
    else:
        served = root

    port = args.port or free_port()
    server = serve(served, port)
    try:
        report = run_capture(script, out_dir, f"http://127.0.0.1:{port}/portfolio/")
    finally:
        stop(server)

    print(f"served     {served}")
    print(f"capture    {CAPTURE_REPO}/{CAPTURE_PATH} @ {sha[:12]}")
    print(f"staging    {out_dir}")
    print()

    results: list[str] = []
    warnings: list[str] = []

    for capture in report["captures"]:
        theme = capture["themeName"]
        print(f"[{theme}]")

        rows = [
            check("captureWidth", capture["captureWidth"], EXPECT_CAPTURE_WIDTH, GEOMETRY_TOLERANCE),
            check("leftGutter", capture["leftGutter"], EXPECT_GUTTER, GEOMETRY_TOLERANCE),
            check("rightGutter", capture["rightGutter"], EXPECT_GUTTER, GEOMETRY_TOLERANCE),
            check("topWhitespace", capture["topWhitespace"], EXPECT_GUTTER, GEOMETRY_TOLERANCE),
            check("bottomWhitespace", capture["whitespaceAfterSecondRole"], EXPECT_GUTTER,
                  BOTTOM_GUTTER_TOLERANCE),
        ]

        crop_ok = abs(capture["cropHeight"] - args.expect_crop_height) <= GEOMETRY_TOLERANCE
        rows.append((
            "PASS" if crop_ok else "WARN",
            f"{'cropHeight':<26} {capture['cropHeight']:>8.1f}   expected {args.expect_crop_height:g}",
        ))
        if not crop_ok:
            warnings.append(
                f"{theme}: cropHeight {capture['cropHeight']} not {args.expect_crop_height:g}. "
                "Legitimate if this change moved the column's vertical spacing; otherwise it "
                "means font resolution moved. Re-run with --expect-crop-height once explained."
            )

        image = find_preview(out_dir, theme)
        luma = mean_luminance(image)
        if theme == "light":
            luma_ok = luma >= LIGHT_MIN_LUMA
            bound = f"expected >= {LIGHT_MIN_LUMA:g}"
        else:
            luma_ok = luma <= DARK_MAX_LUMA
            bound = f"expected <= {DARK_MAX_LUMA:g}"
        rows.append(("PASS" if luma_ok else "FAIL", f"{'meanLuminance':<26} {luma:>8.1f}   {bound}"))
        capture["meanLuminance"] = luma

        for status, line in rows:
            print(f"  {status}  {line}")
            results.append(status)
        print(f"  ----  {'image':<26} {image}")
        print()

    lumas = {c["themeName"]: c["meanLuminance"] for c in report["captures"]}
    separation = lumas["light"] - lumas["dark"]
    separation_ok = separation >= MIN_LUMA_SEPARATION
    results.append("PASS" if separation_ok else "FAIL")
    print(f"  {'PASS' if separation_ok else 'FAIL'}  {'light - dark luminance':<26} "
          f"{separation:>8.1f}   expected >= {MIN_LUMA_SEPARATION:g}")
    print()

    if args.json:
        print(json.dumps(report, indent=2))
        print()

    for warning in warnings:
        print(f"WARN  {warning}")

    failed = results.count("FAIL")
    if failed:
        print(f"\n{failed} check(s) FAILED. This change would break the profile README.")
        return 1
    print("\nAll checks passed. The profile README survives this change.")
    return 0


def current_branch(root: Path) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True,
        text=True,
    )
    return result.stdout.strip() if result.returncode == 0 else None


if __name__ == "__main__":
    try:
        sys.exit(main())
    except CheckError as error:
        print(f"\n{error}", file=sys.stderr)
        sys.exit(2)
