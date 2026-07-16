Set-StrictMode -Version Latest

function Get-OfficialCodexPackage {
  $package = Get-AppxPackage -Name 'OpenAI.Codex' |
    Sort-Object Version -Descending |
    Select-Object -First 1
  if (-not $package) {
    throw '未检测到 Microsoft Store 安装的官方 Codex（包名 OpenAI.Codex）。请先从 Microsoft Store 安装并至少启动一次。'
  }
  if ($package.Name -ne 'OpenAI.Codex' -or -not $package.InstallLocation) {
    throw '检测到的 Codex 包信息异常，已停止启动，避免连接到非官方程序。'
  }
  return $package
}

function Get-OfficialCodexExecutable([object]$Package) {
  $executable = Join-Path $Package.InstallLocation 'app\ChatGPT.exe'
  if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
    throw "官方 Codex 可执行文件不存在：$executable"
  }
  return $executable
}

function Get-CodexNodeRuntime([object]$Package) {
  $candidates = @(
    (Join-Path $Package.InstallLocation 'app\resources\cua_node\bin\node.exe'),
    (Join-Path $Package.InstallLocation 'app\resources\app\cua_node\bin\node.exe'),
    (Join-Path $Package.InstallLocation 'app\cua_node\bin\node.exe')
  )
  foreach ($candidate in $candidates) {
    if ((Test-Path -LiteralPath $candidate -PathType Leaf) -and (Test-NodeRuntimeCompatibility $candidate)) {
      return $candidate
    }
  }

  $appRoot = Join-Path $Package.InstallLocation 'app'
  $bundled = Get-ChildItem -LiteralPath $appRoot -Filter 'node.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '[\\/]cua_node[\\/]bin[\\/]node\.exe$' } |
    Select-Object -First 1
  if ($bundled -and (Test-NodeRuntimeCompatibility $bundled.FullName)) { return $bundled.FullName }

  $systemNode = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($systemNode -and (Test-NodeRuntimeCompatibility $systemNode.Source)) {
    Write-Warning '当前 Codex 包内未找到 cua_node，临时使用系统 Node.js。建议更新官方 Codex。'
    return $systemNode.Source
  }
  throw '未找到兼容的 Node.js。需要 Node.js 22 或更高版本，并且必须提供内置 fetch 与 WebSocket。请先更新官方 Codex。'
}

function Test-NodeRuntimeCompatibility([string]$NodePath) {
  if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { return $false }
  try {
    & $NodePath -e 'const major=Number(process.versions.node.split(".")[0]);process.exit(major>=22&&typeof fetch==="function"&&typeof WebSocket==="function"?0:1)' *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-ProcessExecutablePath([int]$ProcessId, [string]$ExpectedExecutable) {
  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
    if (-not $process -or -not $process.ExecutablePath) { return $false }
    $actual = [IO.Path]::GetFullPath([string]$process.ExecutablePath)
    $expected = [IO.Path]::GetFullPath($ExpectedExecutable)
    return $actual.Equals($expected, [StringComparison]::OrdinalIgnoreCase)
  } catch {
    return $false
  }
}

function Test-CodexDebugPort([int]$CandidatePort, [string]$ExpectedExecutable) {
  try {
    $targets = Invoke-RestMethod "http://127.0.0.1:$CandidatePort/json/list" -TimeoutSec 1
    if (-not ($targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'app://*' })) { return $false }
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $CandidatePort -ErrorAction Stop |
      Where-Object { $_.LocalAddress -eq '127.0.0.1' })
    return [bool]($listeners | Where-Object { Test-ProcessExecutablePath ([int]$_.OwningProcess) $ExpectedExecutable })
  } catch {
    return $false
  }
}

function Stop-RecordedDreamSkinInjector([object]$State, [string]$ExpectedInjectorPath) {
  if (-not $State) { return $true }
  $pidProperty = $State.PSObject.Properties['injectorPid']
  if (-not $pidProperty -or -not $pidProperty.Value) { return $true }
  $process = Get-Process -Id ([int]$pidProperty.Value) -ErrorAction SilentlyContinue
  if (-not $process) { return $true }

  $injectorProperty = $State.PSObject.Properties['injectorPath']
  $nodeProperty = $State.PSObject.Properties['nodePath']
  $startProperty = $State.PSObject.Properties['injectorStartedAt']
  if (-not $injectorProperty -or -not $injectorProperty.Value -or
      -not $nodeProperty -or -not $nodeProperty.Value -or
      -not $startProperty -or -not $startProperty.Value) {
    Write-Warning '旧状态缺少进程身份字段；为避免误杀，未停止记录的 PID。'
    return $false
  }

  $expectedInjector = [IO.Path]::GetFullPath($ExpectedInjectorPath)
  $recordedInjector = [IO.Path]::GetFullPath([string]$injectorProperty.Value)
  if (-not $recordedInjector.Equals($expectedInjector, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Warning '状态文件中的注入脚本路径与当前安装不一致；为避免误杀，未停止进程。'
    return $false
  }

  $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)" -ErrorAction SilentlyContinue
  if (-not $cim -or -not $cim.ExecutablePath -or -not $cim.CommandLine) {
    Write-Warning '无法读取记录进程的可执行路径与命令行；为避免误杀，未停止进程。'
    return $false
  }

  $actualNode = [IO.Path]::GetFullPath([string]$cim.ExecutablePath)
  $recordedNode = [IO.Path]::GetFullPath([string]$nodeProperty.Value)
  $commandLine = [string]$cim.CommandLine
  $commandMatches = $commandLine.IndexOf($expectedInjector, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $commandLine.IndexOf('--watch', [StringComparison]::OrdinalIgnoreCase) -ge 0
  if (-not $actualNode.Equals($recordedNode, [StringComparison]::OrdinalIgnoreCase) -or -not $commandMatches) {
    Write-Warning 'PID 对应的可执行文件或命令行不是本皮肤注入器；已拒绝停止。'
    return $false
  }

  try {
    $recordedStart = [DateTimeOffset]::Parse([string]$startProperty.Value).UtcDateTime
    $actualStart = $process.StartTime.ToUniversalTime()
  } catch {
    Write-Warning '无法核验注入器启动时间；为避免误杀，未停止进程。'
    return $false
  }
  if ([Math]::Abs(($actualStart - $recordedStart).TotalSeconds) -gt 2) {
    Write-Warning 'PID 已被其他进程复用；已拒绝停止。'
    return $false
  }

  Stop-Process -Id $process.Id -Force
  return $true
}
