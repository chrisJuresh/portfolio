@echo off
rem Double-click this file to SEE THE SITE AND KEEP SEEING IT. It builds the tree
rem it sits in and serves that build, exactly as site.bat does - and then it
rem watches the branch this checkout is standing on, which in the main checkout is
rem `development`. Every time a commit lands on it, this rebuilds and the page in
rem the browser reloads itself, back to the Section you were reading.
rem
rem That is the whole difference from site.bat: leave this window open and leave
rem the page open, and what you are looking at is whatever is on `development`
rem right now. `pnpm feature land` fast-forwards the main checkout as its last act
rem before taking the worktree down, so a change lands in the browser a rebuild
rem after it lands on the branch - about fifteen seconds later, no clicking.
rem
rem It watches the BRANCH and not the files. `pnpm dev` is the one that reloads as
rem you EDIT, and it is still the one to work in; this is the one to leave running
rem while changes arrive from somewhere else - a worktree, the Editor, an agent,
rem another machine you have just pulled from.
rem
rem It is not quite `pnpm preview` either, and the difference is one script tag:
rem the page is served with the reload channel in it, before `</body>`. Nothing
rem else is added, but a question about how something RENDERS should still be
rem asked of site.bat, which serves the document and nothing more.
rem
rem The three windows beside this one are not this one. site.bat serves one build
rem and leaves it there, which is the one to read a fixed version in. editor.bat
rem serves the same build with the Editor over it, which is how the site's words
rem and numbers get CHANGED. run.bat serves the repository root as plain files,
rem for the dev-only instruments under design/, and cannot serve the site at all.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

rem --- pnpm carries the build; without it there is nothing to serve ---
where pnpm >nul 2>nul
if errorlevel 1 (
  echo.
  echo   pnpm was not found on this machine.
  echo   Install Node 22, run "corepack enable", then run this again.
  echo.
  pause
  exit /b 1
)

rem --- git is what "the branch moved" is asked of ---
where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo   git was not found on this machine, so there is no branch to follow.
  echo   Use site.bat instead - it builds and serves once, without watching.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo   First run here - installing dependencies.
  echo.
  call pnpm install --frozen-lockfile
  if errorlevel 1 goto :failed
)

rem --- pick the first free port from 4321 upwards ---
set "PORT=4321"
for /l %%i in (1,1,20) do (
  netstat -ano -p tcp | findstr /r /c:":!PORT! .*LISTENING" >nul 2>nul
  if errorlevel 1 goto :gotport
  set /a PORT+=1
)
:gotport

set "URL=http://localhost:%PORT%/portfolio"

echo.
echo   Building %CD%, then serving it and following the branch.
echo   (about fifteen seconds - the source checks and the typecheck run first)
echo.
echo   %URL%
echo.
echo   Leave this window open. Every commit that lands rebuilds and reloads
echo   the page; a build that fails leaves the last good one on screen and
echo   says so here.
echo.
echo   Press Ctrl+C (or close this window) to stop.
echo.

rem Open the browser when the port ANSWERS, not after a fixed wait: the build in
rem front of the server is far longer than a wait worth guessing at, and it can
rem fail with no dist/ to fall back on, in which case nothing ever binds and
rem nothing should be opened. Same shape as editor.bat, for the same reason.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$stop=[datetime]::UtcNow.AddMinutes(5); while([datetime]::UtcNow -lt $stop){ try{ $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',%PORT%); $c.Close(); Start-Sleep -Milliseconds 300; Start-Process '%URL%'; exit }catch{ Start-Sleep -Milliseconds 500 } }"

rem No `--` before the port: pnpm 11 forwards that through as a literal argument,
rem so watch-branch.mjs would read "--" as the port and die on NaN.
call pnpm watch %PORT%
exit /b 0

:failed
echo.
echo   That failed, and nothing is being served. The output above says why.
echo.
pause
exit /b 1
