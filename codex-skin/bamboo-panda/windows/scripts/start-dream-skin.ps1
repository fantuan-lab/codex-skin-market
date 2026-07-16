[CmdletBinding()]
param(
  [int]$Port = 9335,
  [switch]$RestartExisting,
  [string]$ProfilePath,
  [switch]$ForegroundInjector
)

$ErrorActionPreference = 'Stop'
$Common = Join-Path $PSScriptRoot 'common-dream-skin.ps1'
. $Common
$SkillRoot = Split-Path -Parent $PSScriptRoot
$Injector = Join-Path $PSScriptRoot 'injector.mjs'
$StateRoot = Join-Path $env:LOCALAPPDATA 'CodexMoonSpirit'
$StatePath = Join-Path $StateRoot 'state.json'
$StdoutPath = Join-Path $StateRoot 'injector.log'
$StderrPath = Join-Path $StateRoot 'injector-error.log'
$RestartFlag = Join-Path $StateRoot 'restart-required.flag'
New-Item -ItemType Directory -Force -Path $StateRoot | Out-Null

$package = Get-OfficialCodexPackage
$exe = Get-OfficialCodexExecutable $package
$node = Get-CodexNodeRuntime $package
$debugReady = Test-CodexDebugPort $Port $exe
$requiresThemeRestart = Test-Path -LiteralPath $RestartFlag
$codexExeFullPath = [IO.Path]::GetFullPath($exe)
$mainProcesses = @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.ExecutablePath -and [IO.Path]::GetFullPath($_.ExecutablePath).Equals($codexExeFullPath, [StringComparison]::OrdinalIgnoreCase)
  } |
  ForEach-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue } |
  Where-Object { $_ -and $_.MainWindowHandle -ne 0 })

if ((-not $debugReady -or $requiresThemeRestart) -and -not $ProfilePath -and $mainProcesses.Count -gt 0) {
  if (-not $RestartExisting) {
    throw "Codex must restart to activate Bamboo Panda's light shell on port $Port. Close Codex or rerun with -RestartExisting."
  }
  foreach ($process in $mainProcesses) {
    if (Test-ProcessExecutablePath $process.Id $exe) { [void]$process.CloseMainWindow() }
  }
  Start-Sleep -Seconds 2
  foreach ($process in $mainProcesses) {
    if (Test-ProcessExecutablePath $process.Id $exe) {
      Get-Process -Id $process.Id -ErrorAction SilentlyContinue | Stop-Process -Force
    }
  }
  Start-Sleep -Milliseconds 600
  $debugReady = $false
}

if (-not (Test-CodexDebugPort $Port $exe)) {
  $arguments = @('--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$Port")
  if ($ProfilePath) {
    New-Item -ItemType Directory -Force -Path $ProfilePath | Out-Null
    $arguments += "--user-data-dir=$ProfilePath"
  }
  Start-Process -FilePath $exe -ArgumentList $arguments
}

$deadline = (Get-Date).AddSeconds(30)
while (-not (Test-CodexDebugPort $Port $exe)) {
  if ((Get-Date) -ge $deadline) { throw "Codex did not expose CDP on port $Port within 30 seconds." }
  Start-Sleep -Milliseconds 400
}
Remove-Item -LiteralPath $RestartFlag -Force -ErrorAction SilentlyContinue

if (Test-Path -LiteralPath $StatePath) {
  $old = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
  if (-not (Stop-RecordedDreamSkinInjector $old $Injector)) {
    throw '无法安全核验并停止旧注入器。状态文件仍保留，请查看其中的 PID、路径和启动时间。'
  }
}

if ($ForegroundInjector) {
  & $node $Injector --watch --port $Port
  exit $LASTEXITCODE
}

$injectorArgs = @("`"$Injector`"", '--watch', '--port', "$Port")
$daemon = Start-Process -FilePath $node -ArgumentList $injectorArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath
$daemon.Refresh()
@{
  port = $Port
  injectorPid = $daemon.Id
  injectorPath = [IO.Path]::GetFullPath($Injector)
  nodePath = [IO.Path]::GetFullPath($node)
  injectorStartedAt = $daemon.StartTime.ToUniversalTime().ToString('o')
  startedAt = (Get-Date).ToString('o')
  themeId = 'bamboo-panda-2026'
  skinVersion = '1.2.0-bamboo-panda-beta.1'
  skillRoot = $SkillRoot
  profilePath = $ProfilePath
} | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8

$verified = $false
for ($attempt = 0; $attempt -lt 45; $attempt++) {
  Start-Sleep -Milliseconds 700
  & $node $Injector --verify --port $Port *> $null
  if ($LASTEXITCODE -eq 0) { $verified = $true; break }
}
if (-not $verified) {
  $failedState = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
  if (Stop-RecordedDreamSkinInjector $failedState $Injector) {
    Remove-Item -LiteralPath $StatePath -Force
  }
  throw '竹影熊猫已启动，但注入验证失败；本次启动的皮肤监视器已安全停止。请查看 injector.log 与 injector-error.log。'
}
Write-Host "竹影熊猫已生效（官方 Store Codex；CDP 仅监听 127.0.0.1:$Port）。"
