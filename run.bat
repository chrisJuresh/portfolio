@echo off
rem Double-click this file to serve the repo ROOT locally. That is all it does.
rem
rem IT IS NOT HOW YOU RUN THE SITE. /portfolio is an Astro build now, so this
rem answers that path with a directory listing of the pictures. `pnpm dev` is
rem the site - the built routes, the four verbatim paths and the deep links off
rem one origin - and `pnpm editor` is how Content, Tokens and a Bake's
rem parameters get changed. README.md's "Running locally" and "Editing the
rem site" say which is for what.
rem
rem What still needs this: the instruments under design/ - the type lab and the
rem tuners beside it, and the five the Editor replaced, now in design/legacy/.
rem They are plain HTML reaching for ../portfolio/img/ and the rest by relative
rem path, and `pnpm dev` does not serve design/ at all, so only a server rooted
rem here resolves them. Close the window or press Ctrl+C to stop.

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

set "URL=http://localhost:%PORT%/"

echo.
echo   Serving %CD%
echo   %URL%
echo.
echo   Press Ctrl+C (or close this window) to stop.
echo.

rem open the browser once the server has had a moment to bind
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 700; Start-Process '%URL%'"

rem 127.0.0.1 only - not exposed to the rest of the network
%PY% -m http.server %PORT% --bind 127.0.0.1
