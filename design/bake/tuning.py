#!/usr/bin/env python3
"""What the Editor has tuned, as the generator beside it wants it.

WHAT A BAKE IS. A generator under design/ and the numbers it is run with. Five of
them - design/bake/<name>/ - and each holds two files:

  recipe.json   the declaration: what the Bake is, what it needs that this
                repository does not carry, the command, and every parameter with
                its DEFAULT, its label, its range and the paragraph saying what
                it does. Authored, committed, and never written by the Editor.
  params.json   what has MOVED off those defaults, and nothing else. Written by
                the Editor. Absent, or empty, until something is tuned.

WHY THE FILE EXISTS AT ALL, which is the whole of what #146 bought. Every one of
the five HTML tuners this replaces ended by printing a block of Python to paste
back into the generator by hand, and a paste that was not made is a shipped asset
that nothing in the tree describes. A generator that reads its numbers from a
file is run the SAME WAY from the Editor and from a shell - there is nothing to
paste, and the two cannot drift.

WHICH IS ALSO WHY THIS IS NOT AN OVERRIDE MECHANISM. The recipe's default is not
"what the script would have done" kept somewhere else; it is the constant, moved
out of the .py and into a file two things can read. The Python line that used to
be

    SKY_LUMA_MIN = 0.130      # linear luma a pixel needs to seed the sky

is now a lookup with the same comment on it. One value, one place, and the prose
stays beside the code that uses it.

EVERY VALUE CROSSES AS TEXT, so the coercion is here rather than in the file: a
number in JSON would arrive as a float with its own rounding, and half of these
parameters are not numbers at all. Ask for what you want - num, integer, words,
colour8, linear, flag - and an answer that cannot be given is an error naming the
parameter rather than a NaN four hundred lines downstream.

A COLOUR IS WRITTEN AS sRGB HEX, always, so the Editor can put a picker on it.
`colour8` hands it back as the three bytes it was written as, which is what
design/plate/build-plate.py's endpoints are; `linear` decodes it, which is what
Cycles wants. That conversion is the one thing in this file that loses anything:
a linear value below about 1/255 cannot be said in hex, so it comes back rounded
to about half a percent. Fine for a colour chosen by eye, and stated here so that
nobody measures against it.

RUNNING A GENERATOR WITH NO PARAMS FILE is the ordinary case and not a fallback:
it means nothing has been tuned, so every value is the recipe's own.
"""

from __future__ import annotations

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

RECIPE = "recipe.json"
PARAMS = "params.json"


class Missing(KeyError):
    """A parameter that no recipe declares. Raised rather than defaulted: a
    generator asking for a key by the wrong name is a mistake somebody made a
    minute ago, and silently handing back None makes it a wrong picture."""


class Params:
    """One Bake's parameters, at their effective values."""

    def __init__(self, name: str, values: dict[str, str]) -> None:
        self.name = name
        self._values = values

    def __contains__(self, key: str) -> bool:
        return key in self._values

    def text(self, key: str) -> str:
        try:
            return self._values[key]
        except KeyError:
            raise Missing(
                "%s has no parameter %r - design/bake/%s/%s declares %s"
                % (self.name, key, self.name, RECIPE, ", ".join(sorted(self._values)))
            ) from None

    def num(self, key: str) -> float:
        written = self.text(key)
        try:
            return float(written)
        except ValueError:
            raise ValueError("%s.%s is %r, which is not a number" % (self.name, key, written)) from None

    def integer(self, key: str) -> int:
        value = self.num(key)
        if value != int(value):
            raise ValueError("%s.%s is %s, and this one is a whole number" % (self.name, key, value))
        return int(value)

    def words(self, key: str, how_many: int) -> tuple[float, ...]:
        """A parameter holding several numbers - a bump's strength and distance,
        a crop's two fractions. One control, because it is one decision."""
        parts = self.text(key).split()
        if len(parts) != how_many:
            raise ValueError(
                "%s.%s is %d number(s) and this one takes %d"
                % (self.name, key, len(parts), how_many)
            )
        return tuple(float(part) for part in parts)

    def flag(self, key: str) -> bool:
        """A switch. `yes` and `no` are what the recipes write, because that is
        what reads in a text box; the rest are here so a hand-edited file does
        not turn a `true` into a silent False."""
        written = self.text(key).strip().lower()
        if written in ("yes", "true", "on", "1"):
            return True
        if written in ("no", "false", "off", "0", ""):
            return False
        raise ValueError("%s.%s is %r, which is neither yes nor no" % (self.name, key, written))

    def colour8(self, key: str) -> tuple[int, int, int]:
        """The three bytes an sRGB hex was written as."""
        written = self.text(key).strip().lstrip("#")
        if len(written) == 3:
            written = "".join(ch + ch for ch in written)
        if len(written) != 6:
            raise ValueError("%s.%s is %r, which is not a six-digit colour" % (self.name, key, self.text(key)))
        try:
            return tuple(int(written[at:at + 2], 16) for at in (0, 2, 4))
        except ValueError:
            raise ValueError("%s.%s is %r, which is not a colour" % (self.name, key, self.text(key))) from None

    def linear(self, key: str) -> tuple[float, float, float]:
        """...and the same colour with sRGB's transfer curve taken off it, which
        is what a renderer works in. See A COLOUR IS WRITTEN AS sRGB HEX."""
        return tuple(_decode(channel / 255.0) for channel in self.colour8(key))


def _decode(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def _recipe_defaults(folder: str) -> dict[str, str]:
    with open(os.path.join(folder, RECIPE), encoding="utf-8") as fh:
        recipe = json.load(fh)
    defaults: dict[str, str] = {}
    for group in recipe.get("groups", []):
        for param in group.get("params", []):
            key, value = param["key"], param["value"]
            if key in defaults:
                raise ValueError("%s declares %r twice" % (RECIPE, key))
            if not isinstance(value, str):
                raise ValueError("%s: %r is not text - every value crosses as text" % (RECIPE, key))
            defaults[key] = value
    return defaults


def bake(name: str) -> Params:
    """One Bake's parameters: its recipe's defaults with what has been tuned over
    them.

    An override naming a parameter the recipe no longer declares is IGNORED, for
    the same reason the Editor's own boundary ignores it: a recipe is edited by
    hand, a dropped parameter leaves a line behind, and refusing would make a
    generator unrunnable over a line nothing reads.
    """
    folder = os.path.join(HERE, name)
    values = _recipe_defaults(folder)
    try:
        with open(os.path.join(folder, PARAMS), encoding="utf-8") as fh:
            tuned = json.load(fh)
    except FileNotFoundError:
        tuned = {}
    for key, value in tuned.items():
        if key in values:
            values[key] = value
    return Params(name, values)


if __name__ == "__main__":
    import sys

    for name in sys.argv[1:] or sorted(
        entry for entry in os.listdir(HERE)
        if os.path.isfile(os.path.join(HERE, entry, RECIPE))
    ):
        held = bake(name)
        print(name)
        for key in sorted(held._values):
            print("  %-34s %s" % (key, held.text(key)))
