@echo off
chcp 65001 >nul
title 启动 Codex 竹影熊猫
set "PANDA_SCRIPT=%LOCALAPPDATA%\CodexMoonSpirit\app\scripts\start-dream-skin.ps1"
if not exist "%PANDA_SCRIPT%" (
  echo 请先双击 Install Bamboo Panda.cmd 完成安装。
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PANDA_SCRIPT%" -Port 9335 -RestartExisting
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方错误信息。
  pause
  exit /b 1
)
