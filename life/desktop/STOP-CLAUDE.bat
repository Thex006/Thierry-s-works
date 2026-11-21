@echo off
rem Emergency stop for Claude Life. Works even when the game is closed.
cd /d "%~dp0.."
> STOP echo {"by": "operator", "note": "Emergency stop from STOP-CLAUDE.bat. Do not work until the operator removes this file."}
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-claude.ps1" > nul
echo Claude is STOPPED. Running Claude Code sessions were ended.
echo To let Claude work again, press "Let Claude work again" in the game or delete life\STOP.
pause
