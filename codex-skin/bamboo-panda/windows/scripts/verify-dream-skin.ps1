[CmdletBinding()]
param(
  [int]$Port = 9335,
  [string]$ScreenshotPath
)

$ErrorActionPreference = 'Stop'
$Common = Join-Path $PSScriptRoot 'common-dream-skin.ps1'
. $Common
$package = Get-OfficialCodexPackage
$exe = Get-OfficialCodexExecutable $package
$node = Get-CodexNodeRuntime $package
$injector = Join-Path $PSScriptRoot 'injector.mjs'
if (-not (Test-CodexDebugPort $Port $exe)) {
  throw "未检测到由官方 Store Codex 持有的 127.0.0.1:$Port 调试端口。请先启动竹影熊猫。"
}
$arguments = @($injector, '--verify', '--port', "$Port")
if ($ScreenshotPath) { $arguments += @('--screenshot', $ScreenshotPath) }
& $node @arguments
exit $LASTEXITCODE
