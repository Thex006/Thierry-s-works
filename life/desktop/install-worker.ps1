# Run once yourself. 1) merges life/desktop/worker-permissions.json into .claude/settings.json (keeps anything already there),
# 2) removes the old ClaudeLife-Headless task, 3) creates ClaudeLife-Worker (every 15 min, only while you're logged on, no stored password).
$repo = 'C:\Users\Thierry\Documents\claude-life'
$settingsPath = "$repo\.claude\settings.json"
New-Item -ItemType Directory -Force "$repo\.claude" | Out-Null
$new = Get-Content "$repo\life\desktop\worker-permissions.json" -Raw | ConvertFrom-Json
$cur = if (Test-Path $settingsPath) { [IO.File]::ReadAllText($settingsPath) | ConvertFrom-Json } else { [pscustomobject]@{} }
if (-not $cur.permissions) { $cur | Add-Member permissions ([pscustomobject]@{}) }
foreach ($k in 'allow', 'deny') {
  $merged = @(@($cur.permissions.$k) + @($new.permissions.$k) | Where-Object { $_ } | Select-Object -Unique)
  $cur.permissions | Add-Member $k $merged -Force
}
[IO.File]::WriteAllText($settingsPath, (ConvertTo-Json -InputObject $cur -Depth 10), (New-Object Text.UTF8Encoding $false))
Write-Output "Merged permissions into $settingsPath"

Unregister-ScheduledTask -TaskName 'ClaudeLife-Headless' -Confirm:$false -ErrorAction SilentlyContinue
$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$repo\life\desktop\worker.ps1`"" -WorkingDirectory $repo
# Every 15 min; worker.ps1 skips while a running worker's lock heartbeat (refreshed every 2 min) is under 15 min old.
$t = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
# 6h hard limit; worker.ps1 stops claude itself at 350 min so the lock is always cleaned up first.
$s = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 6) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$p = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'ClaudeLife-Worker' -Action $a -Trigger $t -Settings $s -Principal $p -Force | Out-Null
schtasks /Query /TN ClaudeLife-Worker /V /FO LIST | Select-String 'TaskName|Next Run|Status|Logon Mode|Repeat: Every|Stop Task|Last Result'
