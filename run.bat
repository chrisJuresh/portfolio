@echo off
rem Double-click this file to preview the site locally.
rem Serves the repo root so /portfolio resolves like it does on chrisj.uk (it
rem sets an absolute <base href>). Not everything matches: this server does not
rem read vercel.json, so /projects lists a directory instead of redirecting to
rem /portfolio#projects, and it serves /portfolio/ where Vercel's cleanUrls
rem serves /portfolio. Close the window or press Ctrl+C to stop.

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
