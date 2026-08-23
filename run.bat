@echo off
rem Double-click this file to serve the repo root locally. This is what the
rem tuners under design/ are opened through: they are plain HTML and they reach
rem for ../portfolio/img/ and the rest by relative path, which only resolves
rem under the server root.
rem
rem IT DOES NOT SERVE THE SITE. /portfolio is built now - `pnpm dev`, or `pnpm
rem build` then `pnpm preview`, and README.md's "The build" says which is for
rem what. Close the window or press Ctrl+C to stop.

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
