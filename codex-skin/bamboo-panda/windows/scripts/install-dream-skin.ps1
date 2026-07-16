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
$StatePath = Join-Path $StateRoot 'state.json'
$InstalledInjector = Join-Path $InstallRoot 'scripts\injector.mjs'
New-Item -ItemType Directory -Force -Path $StateRoot | Out-Null
$package = Get-OfficialCodexPackage
[void](Get-OfficialCodexExecutable $package)
$node = Get-CodexNodeRuntime $package
$ConfigPath = Join-Path $HOME '.codex\config.toml'
$BackupPath = Join-Path $StateRoot 'config.before-dream-skin.toml'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Codex config not found: $ConfigPath" }

# Build and validate the replacement beside the stable slot before stopping the
# active watcher. A failed copy or payload check therefore leaves the installed
# skin untouched and still startable.
$SourceFullPath = [IO.Path]::GetFullPath($SourceRoot).TrimEnd('\')
$InstallFullPath = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
$StagingRoot = Join-Path $StateRoot "app.installing.$PID"
$PreviousRoot = Join-Path $StateRoot "app.previous.$PID"
if ($SourceFullPath -ne $InstallFullPath) {
  Remove-Item -LiteralPath $StagingRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $StagingRoot | Out-Null
  try {
    foreach ($folder in @('assets', 'scripts', 'references')) {
      Copy-Item -LiteralPath (Join-Path $SourceRoot $folder) -Destination (Join-Path $StagingRoot $folder) -Recurse -Force
    }
    foreach ($file in @('README.md', 'LICENSE', 'ARTWORK-LICENSE.md', 'NOTICE.md', 'VERSION', 'SOURCE.md')) {
      $source = Join-Path $SourceRoot $file
      if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $StagingRoot $file) -Force }
    }
    & $node (Join-Path $StagingRoot 'scripts\injector.mjs') --check-payload | Out-Null
    if ($LASTEXITCODE -ne 0) { throw '竹影熊猫安装载荷校验失败。' }
  } catch {
    Remove-Item -LiteralPath $StagingRoot -Recurse -Force -ErrorAction SilentlyContinue
    throw
  }
} else {
  & $node (Join-Path $SourceRoot 'scripts\injector.mjs') --check-payload | Out-Null
  if ($LASTEXITCODE -ne 0) { throw '竹影熊猫安装载荷校验失败。' }
}

# Moon Spirit and Bamboo Panda deliberately share one stable runtime slot. Stop
# the currently recorded watcher before replacing that slot, otherwise an old
# in-memory payload can keep repainting the renderer after the Panda files land.
if (Test-Path -LiteralPath $StatePath) {
  $oldState = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
  if (-not (Stop-RecordedDreamSkinInjector $oldState $InstalledInjector)) {
    Remove-Item -LiteralPath $StagingRoot -Recurse -Force -ErrorAction SilentlyContinue
    throw '无法安全核验并停止当前皮肤监视器。为避免两个皮肤同时注入，安装已停止。'
  }
  Remove-Item -LiteralPath $StatePath -Force
}

if ($SourceFullPath -ne $InstallFullPath) {
  Remove-Item -LiteralPath $PreviousRoot -Recurse -Force -ErrorAction SilentlyContinue
  try {
    if (Test-Path -LiteralPath $InstallRoot) { Move-Item -LiteralPath $InstallRoot -Destination $PreviousRoot }
    Move-Item -LiteralPath $StagingRoot -Destination $InstallRoot
    Remove-Item -LiteralPath $PreviousRoot -Recurse -Force -ErrorAction SilentlyContinue
  } catch {
    if (-not (Test-Path -LiteralPath $InstallRoot) -and (Test-Path -LiteralPath $PreviousRoot)) {
      Move-Item -LiteralPath $PreviousRoot -Destination $InstallRoot
    }
    Remove-Item -LiteralPath $StagingRoot -Recurse -Force -ErrorAction SilentlyContinue
    throw
  }
}

if (-not (Test-Path -LiteralPath $BackupPath)) { Copy-Item -LiteralPath $ConfigPath -Destination $BackupPath }

# The Panda palette is designed for Codex's light desktop shell. Preserve the
# first pre-skin snapshot in the shared compatibility slot, then update only
# appearanceTheme inside the desktop section.
$configContent = Get-Content -LiteralPath $ConfigPath -Raw
$themePattern = '(?m)^appearanceTheme\s*=.*(?:\r?\n)?'
if ([regex]::IsMatch($configContent, $themePattern)) {
  $configContent = [regex]::Replace($configContent, $themePattern, "appearanceTheme = `"light`"`r`n", 1)
} else {
  $desktop = [regex]::Match($configContent, '(?ms)^\[desktop\]\s*\r?\n(?<body>.*?)(?=^\[|\z)')
  if (-not $desktop.Success) {
    $configContent = $configContent.TrimEnd() + "`r`n`r`n[desktop]`r`nappearanceTheme = `"light`"`r`n"
  } else {
    $body = "appearanceTheme = `"light`"`r`n" + $desktop.Groups['body'].Value
    $configContent = $configContent.Substring(0, $desktop.Groups['body'].Index) + $body +
      $configContent.Substring($desktop.Groups['body'].Index + $desktop.Groups['body'].Length)
  }
}
Set-Content -LiteralPath $ConfigPath -Value $configContent -Encoding utf8
Set-Content -LiteralPath (Join-Path $StateRoot 'restart-required.flag') -Value 'bamboo-panda-light' -Encoding ascii

if (-not $NoShortcuts) {
  $shell = New-Object -ComObject WScript.Shell
  $desktop = [Environment]::GetFolderPath('Desktop')
  $startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  $powershell = (Get-Command powershell.exe).Source
  $startScript = Join-Path $InstallRoot 'scripts\start-dream-skin.ps1'
  $restoreScript = Join-Path $InstallRoot 'scripts\restore-dream-skin.ps1'
  @(
    (Join-Path $desktop 'Codex 月影灵编.lnk'),
    (Join-Path $desktop 'Codex 月影灵编 - 恢复.lnk'),
    (Join-Path $startMenu 'Codex 月影灵编.lnk')
  ) | ForEach-Object { Remove-Item -LiteralPath $_ -Force -ErrorAction SilentlyContinue }
  foreach ($folder in @($desktop, $startMenu)) {
    $shortcut = $shell.CreateShortcut((Join-Path $folder 'Codex 竹影熊猫.lnk'))
    $shortcut.TargetPath = $powershell
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -Port $Port -RestartExisting"
    $shortcut.WorkingDirectory = $InstallRoot
    $shortcut.Description = '启动带竹影熊猫皮肤的官方 Codex'
    $shortcut.Save()
  }
  $restore = $shell.CreateShortcut((Join-Path $desktop 'Codex 竹影熊猫 - 恢复.lnk'))
  $restore.TargetPath = $powershell
  $restore.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$restoreScript`" -Port $Port -RestoreBaseTheme -RestartCodex"
  $restore.WorkingDirectory = $InstallRoot
  $restore.Description = '移除竹影熊猫实时皮肤并恢复安装前桌面主题'
  $restore.Save()
}

Write-Host "竹影熊猫已安装到：$InstallRoot"
Write-Host 'Codex 桌面主题已设为浅色；请双击桌面上的“Codex 竹影熊猫”启动。'
