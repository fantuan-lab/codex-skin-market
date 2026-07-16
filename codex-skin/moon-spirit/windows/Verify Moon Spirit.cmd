@echo off
chcp 65001 >nul
title 验证 Codex 月影灵编
set "MOON_SCRIPT=%LOCALAPPDATA%\CodexMoonSpirit\app\scripts\verify-dream-skin.ps1"
if not exist "%MOON_SCRIPT%" (
  echo 请先双击 Install Moon Spirit.cmd 完成安装。
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%MOON_SCRIPT%" -Port 9335
set "MOON_RESULT=%ERRORLEVEL%"
echo.
if not "%MOON_RESULT%"=="0" (echo 验证未通过。) else (echo 验证通过。)
pause
exit /b %MOON_RESULT%
