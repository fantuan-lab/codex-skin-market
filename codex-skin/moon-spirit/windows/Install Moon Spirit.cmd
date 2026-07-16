@echo off
chcp 65001 >nul
title 安装 Codex 月影灵编
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-dream-skin.ps1" -Port 9335
if errorlevel 1 (
  echo.
  echo 安装失败，请查看上方错误信息。
  pause
  exit /b 1
)
echo.
echo 安装完成。请双击桌面上的“Codex 月影灵编”。
pause
