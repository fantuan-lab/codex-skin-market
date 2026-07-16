@echo off
chcp 65001 >nul
title 恢复 Codex 原界面
set "MOON_SCRIPT=%LOCALAPPDATA%\CodexMoonSpirit\app\scripts\restore-dream-skin.ps1"
if not exist "%MOON_SCRIPT%" (
  echo 请先双击 Install Moon Spirit.cmd 完成安装。
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%MOON_SCRIPT%" -Port 9335
if errorlevel 1 (
  echo.
  echo 恢复失败，请查看上方错误信息。
  pause
  exit /b 1
)
echo.
echo 月影灵编已从当前 Codex 会话移除。
pause
