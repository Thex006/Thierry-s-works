# Starts the Claude Life server in the background (if it isn't running) and opens it as an app window.
# Writes what happened to desktop\launch.log and shows a message box if something fails.
$ErrorActionPreference = 'Stop'
$life = Split-Path -Parent $PSScriptRoot
$url = 'http://127.0.0.1:4747'   # 127.0.0.1, not localhost: avoids Windows trying IPv6 first
$log = Join-Path $PSScriptRoot 'launch.log'
$srvOut = Join-Path $PSScriptRoot 'server.log'
$srvErr = Join-Path $PSScriptRoot 'server-error.log'
"$(Get-Date) launching from $life" | Out-File $log

function Say($msg) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($msg, 'Claude Life') | Out-Null
}
function Test-Up { try { Invoke-WebRequest "$url/api/state" -UseBasicParsing -TimeoutSec 2 | Out-Null; $true } catch { $false } }

try {
  if (-not (Test-Up)) {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $node) { foreach ($p in "$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe") { if (Test-Path $p) { $node = $p; break } } }
    "node: $node" | Out-File $log -Append
    if (-not $node) { Say 'Claude Life needs Node.js. Install the LTS version from nodejs.org, restart, then open Claude Life again.'; exit 1 }

    Start-Process -FilePath $node -ArgumentList "`"$life\app\server.js`"" -WorkingDirectory $life -WindowStyle Hidden `
      -RedirectStandardOutput $srvOut -RedirectStandardError $srvErr
    for ($i = 0; $i -lt 40 -and -not (Test-Up); $i++) { Start-Sleep -Milliseconds 250 }
    if (-not (Test-Up)) {
      $err = if (Test-Path $srvErr) { (Get-Content $srvErr -Raw) } else { '' }
      "server did not start: $err" | Out-File $log -Append
      Say "The Claude Life server didn't start.`n`n$err`n`nDetails are in $srvErr"
      exit 1
    }
  }

  $browsers = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  $b = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  "browser: $b" | Out-File $log -Append
  if ($b) { Start-Process $b -ArgumentList "--app=$url", "--window-size=1440,900" } else { Start-Process $url }
} catch {
  "error: $_" | Out-File $log -Append
  Say "Claude Life couldn't open:`n`n$_`n`nDetails are in $log"
}
