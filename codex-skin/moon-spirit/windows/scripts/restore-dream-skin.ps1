[CmdletBinding()]
param(
  [int]$Port = 9335,
  [switch]$Uninstall,
  [switch]$RestoreBaseTheme
)

$ErrorActionPreference = 'Stop'
$Common = Join-Path $PSScriptRoot 'common-dream-skin.ps1'
. $Common
$package = Get-OfficialCodexPackage
$exe = Get-OfficialCodexExecutable $package
$node = Get-CodexNodeRuntime $package
$injector = Join-Path $PSScriptRoot 'injector.mjs'
$StateRoot = Join-Path $env:LOCALAPPDATA 'CodexMoonSpirit'
$StatePath = Join-Path $StateRoot 'state.json'
$debugReady = Test-CodexDebugPort $Port $exe

if (Test-Path -LiteralPath $StatePath) {
  $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
  if (-not (Stop-RecordedMoonSpiritInjector $state $injector)) {
    throw '无法安全核验注入器身份，已保留状态文件且未停止该 PID。'
  }
  Remove-Item -LiteralPath $StatePath -Force
}
Start-Sleep -Milliseconds 250
if ($debugReady) {
  & $node $injector --remove --port $Port --timeout-ms 3000
  if ($LASTEXITCODE -ne 0) { throw '已停止皮肤监视器，但从当前 Codex 渲染器移除样式失败。' }
} else {
  Write-Warning "未检测到由官方 Store Codex 持有的 127.0.0.1:$Port；已跳过 CDP 移除。"
}

if ($Uninstall) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  @(
    (Join-Path $desktop 'Codex 月影灵编.lnk'),
    (Join-Path $desktop 'Codex 月影灵编 - 恢复.lnk'),
    (Join-Path $startMenu 'Codex 月影灵编.lnk')
  ) | ForEach-Object { Remove-Item -LiteralPath $_ -Force -ErrorAction SilentlyContinue }
}

if ($RestoreBaseTheme) {
  $backup = Join-Path $StateRoot 'config.before-dream-skin.toml'
  $config = Join-Path $HOME '.codex\config.toml'
  if (-not (Test-Path -LiteralPath $backup)) { throw 'No pre-install config backup is available.' }
  $backupContent = Get-Content -LiteralPath $backup -Raw
  $currentContent = Get-Content -LiteralPath $config -Raw
  foreach ($key in @('appearanceTheme', 'appearanceLightCodeThemeId', 'appearanceLightChromeTheme')) {
    $pattern = "(?m)^$([regex]::Escape($key))\s*=.*(?:\r?\n)?"
    $saved = [regex]::Match($backupContent, $pattern)
    if ([regex]::IsMatch($currentContent, $pattern)) {
      $replacement = if ($saved.Success) { $saved.Value.TrimEnd("`r", "`n") + "`r`n" } else { '' }
      $currentContent = [regex]::Replace($currentContent, $pattern, $replacement, 1)
    } elseif ($saved.Success) {
      $desktop = [regex]::Match($currentContent, '(?ms)^\[desktop\]\s*\r?\n(?<body>.*?)(?=^\[|\z)')
      if (-not $desktop.Success) {
        $currentContent = $currentContent.TrimEnd() + "`r`n`r`n[desktop]`r`n"
        $desktop = [regex]::Match($currentContent, '(?ms)^\[desktop\]\s*\r?\n(?<body>.*?)(?=^\[|\z)')
      }
      $body = $desktop.Groups['body'].Value.TrimEnd() + "`r`n" + $saved.Value.TrimEnd("`r", "`n") + "`r`n"
      $currentContent = $currentContent.Substring(0, $desktop.Groups['body'].Index) + $body +
        $currentContent.Substring($desktop.Groups['body'].Index + $desktop.Groups['body'].Length)
    }
  }
  Set-Content -LiteralPath $config -Value $currentContent -Encoding utf8
}

Write-Host '月影灵编的皮肤监视器已停止。Codex 的 CDP 端口会一直保留到 Codex 退出。'
