@echo off
rem Double-click this file to open the EDITOR on the real page. It builds the tree
rem it sits in, serves that build, and puts the Editor over it - so clicking a
rem piece of text and typing changes the source file, dragging a Token moves the
rem page, and Publish commits and pushes.
rem
rem This is the one to use for changing what the site SAYS and its named numbers.
rem It is not for changing layout, palette or motion - Measure hands back an
rem Annotation to paste to an agent for those, and writes an Override if asked.
rem scripts/editor/NOTES.md and README.md's "Editing the site" are the rest of it.
rem
rem To rearrange a whole screenful and hand the lot over, use the two toggles at
rem the top of the Measure surface and then the RECORDING surface beside it:
rem
rem   scale text with the box   a resize carries the text size with it, by the
rem                             ratio the box changed by. One gesture, not two.
rem   keep changes when         the change you just made stays on the page while
rem   picking something else    you pick the next thing, so several can be
rem                             arranged and looked at together.
rem
rem Everything you do lands on the Recording: one block per element, with the
rem numbers and which values the Editor has already written for you. Press copy
rem and paste it to an agent. "put the page back" takes every kept change off the
rem page; "clear the Recording" empties the document and leaves the page alone.
rem
rem The other two windows beside this one are not this one. site.bat serves the
rem same build with nothing over it, which is how the article is READ rather than
rem edited; run.bat serves the repository root as plain files, for the dev-only
rem instruments under design/. `pnpm dev` is the one to work in, reloading as you
rem edit - but it cannot carry the Editor, which serves a build on purpose.
rem
rem It builds first, and that is load-bearing rather than polite: the Editor
rem matches an element on the page against the Content the SERVED BUILD was made
rem from, and a Token's value is baked into the built stylesheet. Against a stale
rem dist/ the text fields go missing and the Tokens quietly describe a page a
rem build ago. Expect about fifteen seconds before the browser opens.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

rem --- pnpm carries the build and the Editor's server ---
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

rem --- pick the first free port from 8790 upwards ---
rem `pnpm editor` alone takes an ephemeral one and only prints it. A port chosen
rem here is a port the browser can be sent to before the server has bound it.
set "PORT=8790"
for /l %%i in (1,1,20) do (
  netstat -ano -p tcp | findstr /r /c:":!PORT! .*LISTENING" >nul 2>nul
  if errorlevel 1 goto :gotport
  set /a PORT+=1
)
:gotport

set "URL=http://localhost:%PORT%/portfolio"

echo.
echo   Building %CD%, then opening the Editor on it.
echo   (about fifteen seconds - the source checks and the typecheck run first)
echo.
echo   %URL%
echo.
echo   Click any text to change it. Enter commits, Escape puts it back.
echo   Publish commits and pushes, and the Checks run on the commit.
echo.
echo   Press Ctrl+C (or close this window) to stop.
echo.

rem Open the browser when the port ANSWERS, not after a fixed wait: the build in
rem front of the server is far longer than a wait worth guessing at, and it can
rem fail, in which case nothing ever binds and nothing should be opened.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$stop=[datetime]::UtcNow.AddMinutes(5); while([datetime]::UtcNow -lt $stop){ try{ $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',%PORT%); $c.Close(); Start-Sleep -Milliseconds 300; Start-Process '%URL%'; exit }catch{ Start-Sleep -Milliseconds 500 } }"

rem No `--` before the flag: pnpm 11 forwards that through as a literal argument,
rem and open.mjs would read it as one of its own.
call pnpm editor --port %PORT%
exit /b 0

:failed
echo.
echo   That failed, and there is nothing to edit against. The output above says why.
echo.
pause
exit /b 1
