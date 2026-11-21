# Starts the Claude Life server in the background (if it isn't running) and opens it as an app window.
$life = Split-Path -Parent $PSScriptRoot
$url = 'http://localhost:4747'
function Test-Up { try { Invoke-WebRequest "$url/api/state" -UseBasicParsing -TimeoutSec 1 | Out-Null; $true } catch { $false } }

if (-not (Test-Up)) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show('Claude Life needs Node.js. Install it from nodejs.org, then open Claude Life again.', 'Claude Life') | Out-Null
    exit 1
  }
  Start-Process -FilePath $node -ArgumentList "`"$life\app\server.js`"" -WorkingDirectory $life -WindowStyle Hidden
  for ($i = 0; $i -lt 40 -and -not (Test-Up); $i++) { Start-Sleep -Milliseconds 250 }
}

$browsers = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$b = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($b) { Start-Process $b -ArgumentList "--app=$url", "--window-size=1440,900" } else { Start-Process $url }
