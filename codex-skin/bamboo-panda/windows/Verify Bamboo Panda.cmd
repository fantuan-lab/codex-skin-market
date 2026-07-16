@echo off
chcp 65001 >nul
title 验证 Codex 竹影熊猫
set "PANDA_SCRIPT=%LOCALAPPDATA%\CodexMoonSpirit\app\scripts\verify-dream-skin.ps1"
if not exist "%PANDA_SCRIPT%" (
  echo 请先双击 Install Bamboo Panda.cmd 完成安装。
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PANDA_SCRIPT%" -Port 9335
set "PANDA_RESULT=%ERRORLEVEL%"
echo.
if not "%PANDA_RESULT%"=="0" (echo 验证未通过。) else (echo 验证通过。)
pause
exit /b %PANDA_RESULT%
