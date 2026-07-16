@echo off
chcp 65001 >nul
title 启动 Codex 月影灵编
set "MOON_SCRIPT=%LOCALAPPDATA%\CodexMoonSpirit\app\scripts\start-dream-skin.ps1"
if not exist "%MOON_SCRIPT%" (
  echo 请先双击 Install Moon Spirit.cmd 完成安装。
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%MOON_SCRIPT%" -Port 9335 -RestartExisting
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方错误信息。
  pause
  exit /b 1
)
