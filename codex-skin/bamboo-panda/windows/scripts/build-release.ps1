[CmdletBinding()]
param(
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $PSScriptRoot
$Version = (Get-Content -LiteralPath (Join-Path $Root 'VERSION') -Raw).Trim()
if (-not $Version -or $Version -notmatch '^[0-9A-Za-z][0-9A-Za-z._-]+$') {
  throw "Invalid VERSION value: $Version"
}
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $Root 'dist' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$PackageName = "Codex-Bamboo-Panda-Windows-$Version"
$ArchivePath = Join-Path $OutputDirectory "$PackageName.zip"
$ChecksumPath = "$ArchivePath.sha256"
$StagingBase = Join-Path ([IO.Path]::GetTempPath()) ("codex-bamboo-panda-" + [guid]::NewGuid().ToString('N'))
$PackageRoot = Join-Path $StagingBase $PackageName

try {
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue }
  if (-not $node) { throw 'Node.js 22+ is required to run the release checks.' }
  & $node.Source (Join-Path $Root 'tests\static-check.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Static release checks failed.' }

  New-Item -ItemType Directory -Force -Path $PackageRoot | Out-Null
  foreach ($folder in @('assets', 'scripts', 'references', 'tests', 'agents')) {
    Copy-Item -LiteralPath (Join-Path $Root $folder) -Destination (Join-Path $PackageRoot $folder) -Recurse -Force
  }
  foreach ($file in @(
    'Install Bamboo Panda.cmd',
    'Start Bamboo Panda.cmd',
    'Verify Bamboo Panda.cmd',
    'Restore Bamboo Panda.cmd',
    'README.md',
    'LICENSE',
    'NOTICE.md',
    'SOURCE.md',
    'ARTWORK-LICENSE.md',
    'SKILL.md',
    'VERSION'
  )) {
    Copy-Item -LiteralPath (Join-Path $Root $file) -Destination (Join-Path $PackageRoot $file) -Force
  }

  foreach ($required in @(
    'Install Bamboo Panda.cmd',
    'Start Bamboo Panda.cmd',
    'Verify Bamboo Panda.cmd',
    'Restore Bamboo Panda.cmd',
    'assets\panda-reference.png',
    'scripts\injector.mjs'
  )) {
    if (-not (Test-Path -LiteralPath (Join-Path $PackageRoot $required) -PathType Leaf)) {
      throw "Release staging is missing: $required"
    }
  }

  Remove-Item -LiteralPath $ArchivePath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $ChecksumPath -Force -ErrorAction SilentlyContinue
  Compress-Archive -LiteralPath $PackageRoot -DestinationPath $ArchivePath -CompressionLevel Optimal
  $hash = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -LiteralPath $ChecksumPath -Value "$hash  $([IO.Path]::GetFileName($ArchivePath))" -Encoding ascii

  Write-Host "Release archive: $ArchivePath"
  Write-Host "SHA-256: $hash"
} finally {
  Remove-Item -LiteralPath $StagingBase -Recurse -Force -ErrorAction SilentlyContinue
}
