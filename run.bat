@echo off
rem Double-click this file to serve the repo ROOT locally. That is all it does.
rem
rem IT IS NOT HOW YOU RUN THE SITE. /portfolio is an Astro build now, so this
rem answers that path with a directory listing of the pictures. site.bat beside
rem this one is the site - it builds the tree and serves the build - and `pnpm
rem dev` is the one to WORK in, reloading as you edit. `pnpm editor` is how
rem Content, Tokens and a Bake's parameters get changed. README.md's "Running
rem locally" and "Editing the site" say which is for what.
rem
rem What still needs this: the instruments under design/ - the type lab and the
rem tuners beside it, and the five the Editor replaced, now in design/legacy/.
rem They are plain HTML reaching for ../portfolio/img/ and the rest by relative
rem path, and `pnpm dev` does not serve design/ at all, so only a server rooted
rem here resolves them - which is why the browser is opened at /design/ and not
rem at the portal. Close the window or press Ctrl+C to stop.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

rem --- find a Python (py launcher first: avoids the Microsoft Store stub) ---
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY where python3 >nul 2>nul && set "PY=python3"
if not defined PY (
  echo.
  echo   Python was not found on this machine.
  echo   Install it from https://www.python.org/downloads/ and run this again.
  echo.
  pause
  exit /b 1
)

rem --- pick the first free port from 8000 upwards ---
set "PORT=8000"
for /l %%i in (1,1,20) do (
  netstat -ano -p tcp | findstr /r /c:":!PORT! .*LISTENING" >nul 2>nul
  if errorlevel 1 goto :gotport
  set /a PORT+=1
)
:gotport

rem The root is what gets SERVED - design/ is where the browser is pointed. The
rem portal at / is served too, and its "portfolio" link goes to a path this
rem server answers with a directory listing of the pictures, so landing there
rem invites exactly one wrong conclusion.
set "URL=http://localhost:%PORT%/design/"

echo.
echo   Serving %CD%
echo   %URL%
echo.
echo   This is NOT the site. It is the repo root as plain files, for the
echo   instruments under design/. To see the SITE, close this and
echo   double-click site.bat instead - or `pnpm dev` to work in it.
echo.
echo   Press Ctrl+C (or close this window) to stop.
echo.

rem open the browser once the server has had a moment to bind
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 700; Start-Process '%URL%'"

rem 127.0.0.1 only - not exposed to the rest of the network
%PY% -m http.server %PORT% --bind 127.0.0.1
