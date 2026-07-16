@echo off
chcp 65001 >nul
title 恢复 Codex 原界面
set "PANDA_SCRIPT=%LOCALAPPDATA%\CodexMoonSpirit\app\scripts\restore-dream-skin.ps1"
if not exist "%PANDA_SCRIPT%" (
  echo 请先双击 Install Bamboo Panda.cmd 完成安装。
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PANDA_SCRIPT%" -Port 9335 -RestoreBaseTheme -RestartCodex
if errorlevel 1 (
  echo.
  echo 恢复失败，请查看上方错误信息。
  pause
  exit /b 1
)
echo.
echo 竹影熊猫已移除，安装前的 Codex 桌面主题已恢复。
pause
