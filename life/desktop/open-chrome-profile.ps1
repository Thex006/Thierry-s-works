# Opens Chrome in the "Claude Life" profile (visible) so Thierry can watch the team work live.
param([string]$ProfileName = 'Claude Life', [string]$Url = 'https://mail.google.com')
$localState = Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data\Local State'
if (-not (Test-Path $localState)) { Write-Error 'Chrome profile data not found.'; exit 1 }
$cache = (Get-Content $localState -Raw | ConvertFrom-Json).profile.info_cache
$dir = ($cache.PSObject.Properties | Where-Object { $_.Value.name -eq $ProfileName } | Select-Object -First 1).Name
if (-not $dir) { Write-Error "No Chrome profile named '$ProfileName'."; exit 1 }
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Error 'Chrome not found.'; exit 1 }
Start-Process $chrome -ArgumentList "--profile-directory=`"$dir`"", '--start-maximized', $Url
Write-Output "Opened Chrome profile '$ProfileName' ($dir)."
