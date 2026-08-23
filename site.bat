@echo off
rem Double-click this file to SEE THE SITE locally. It builds the tree it sits in
rem and serves that build, so what you look at here is the article the
rem deployment serves - the portal at /, /portfolio, and every deep link.
rem
rem This is not the only way, and it is not the one to WORK in: `pnpm dev`
rem reloads as you edit. But `astro dev` runs as a background daemon, which a
rem double-clicked window cannot own or stop, so this file builds and serves
rem instead - one process, ended by closing the window.
rem
rem run.bat is the OTHER server, and it is not this one: the repo root as plain
rem files, for the dev-only instruments under design/. It cannot serve the site,
rem because /portfolio is a build and not a folder.

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

if not exist "node_modules\" (
  echo.
  echo   First run here - installing dependencies.
  echo.
  call pnpm install --frozen-lockfile
  if errorlevel 1 goto :failed
)

echo.
echo   Building %CD%
echo   (about 15 seconds - the source checks and the typecheck run first)
echo.
call pnpm build
if errorlevel 1 goto :failed

rem --- pick the first free port from 4321 upwards ---
set "PORT=4321"
for /l %%i in (1,1,20) do (
  netstat -ano -p tcp | findstr /r /c:":!PORT! .*LISTENING" >nul 2>nul
  if errorlevel 1 goto :gotport
  set /a PORT+=1
)
:gotport

set "URL=http://localhost:%PORT%/"

echo.
echo   Serving the build of %CD%
echo   %URL%
echo   %URL%portfolio
echo.
echo   Press Ctrl+C (or close this window) to stop.
echo.

rem open the browser once the server has had a moment to bind
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 700; Start-Process '%URL%'"

rem serve-dist.mjs serves THIS tree's dist/, which is the point of it. No `--`
rem before the port: pnpm 11 forwards that through as a literal argument, so
rem serve-dist reads "--" as the port and dies on NaN.
call pnpm preview %PORT%
exit /b 0

:failed
echo.
echo   That failed, and nothing is being served. The output above says why.
echo.
pause
exit /b 1
