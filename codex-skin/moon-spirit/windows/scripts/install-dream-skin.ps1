[CmdletBinding()]
param(
  [int]$Port = 9335,
  [switch]$NoShortcuts
)

$ErrorActionPreference = 'Stop'
$Common = Join-Path $PSScriptRoot 'common-dream-skin.ps1'
. $Common
$SourceRoot = Split-Path -Parent $PSScriptRoot
$StateRoot = Join-Path $env:LOCALAPPDATA 'CodexMoonSpirit'
$InstallRoot = Join-Path $StateRoot 'app'
New-Item -ItemType Directory -Force -Path $StateRoot | Out-Null
$package = Get-OfficialCodexPackage
[void](Get-OfficialCodexExecutable $package)
[void](Get-CodexNodeRuntime $package)

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
$SourceFullPath = [IO.Path]::GetFullPath($SourceRoot).TrimEnd('\')
$InstallFullPath = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
if ($SourceFullPath -ne $InstallFullPath) {
  foreach ($folder in @('assets', 'scripts', 'references')) {
    $destination = Join-Path $InstallRoot $folder
    Remove-Item -LiteralPath $destination -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -LiteralPath (Join-Path $SourceRoot $folder) -Destination $destination -Recurse -Force
  }
  foreach ($file in @('README.md', 'LICENSE', 'ARTWORK-LICENSE.md', 'NOTICE.md', 'VERSION', 'SOURCE.md')) {
    $source = Join-Path $SourceRoot $file
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $InstallRoot $file) -Force }
  }
}

$ConfigPath = Join-Path $HOME '.codex\config.toml'
$BackupPath = Join-Path $StateRoot 'config.before-dream-skin.toml'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Codex config not found: $ConfigPath" }
if (-not (Test-Path -LiteralPath $BackupPath)) { Copy-Item -LiteralPath $ConfigPath -Destination $BackupPath }

if (-not $NoShortcuts) {
  $shell = New-Object -ComObject WScript.Shell
  $desktop = [Environment]::GetFolderPath('Desktop')
  $startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  $powershell = (Get-Command powershell.exe).Source
  $startScript = Join-Path $InstallRoot 'scripts\start-dream-skin.ps1'
  $restoreScript = Join-Path $InstallRoot 'scripts\restore-dream-skin.ps1'
  foreach ($folder in @($desktop, $startMenu)) {
    $shortcut = $shell.CreateShortcut((Join-Path $folder 'Codex 月影灵编.lnk'))
    $shortcut.TargetPath = $powershell
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -Port $Port -RestartExisting"
    $shortcut.WorkingDirectory = $InstallRoot
    $shortcut.Description = '启动带月影灵编皮肤的官方 Codex'
    $shortcut.Save()
  }
  $restore = $shell.CreateShortcut((Join-Path $desktop 'Codex 月影灵编 - 恢复.lnk'))
  $restore.TargetPath = $powershell
  $restore.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$restoreScript`" -Port $Port"
  $restore.WorkingDirectory = $InstallRoot
  $restore.Description = '移除月影灵编实时皮肤并恢复原界面'
  $restore.Save()
}

Write-Host "月影灵编已安装到：$InstallRoot"
Write-Host '请双击桌面上的“Codex 月影灵编”启动。'
