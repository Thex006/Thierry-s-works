# Claude Life manager check. worker.ps1 runs it at the start of every 15-min run (before the lock check), so it runs
# even while a worker is busy. It is a plain script, not a Claude session: it fixes only the known, safe problems below,
# clears the "Claude needs you" items those fixes resolve, and leaves everything else for Thierry. See CLAUDE.md "Manager check".
# Self-test: powershell -NoProfile -File life\desktop\manager.ps1 -Test
param([switch]$Test)
. (Join-Path $PSScriptRoot 'worker.ps1')  # $repo, $priv, $lock, $statePath, Write-Log, Update-State (dot-sourcing doesn't start a worker)

# The ONLY permissions this script may add to .claude/settings.json (all approved by Thierry). Edit this list by hand only.
$ApprovedAllow = @(
  'Read', 'Edit', 'Write', 'Glob', 'Grep', 'WebSearch', 'WebFetch',
  'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git add:*)',
  'Bash(git commit:*)', 'Bash(git pull:*)', 'Bash(git push:*)', 'Bash(git fetch:*)',
  'Bash(powershell -NoProfile -ExecutionPolicy Bypass -File life\desktop\open-chrome-profile.ps1)',
  'Bash(powershell -NoProfile -ExecutionPolicy Bypass -File life/desktop/open-chrome-profile.ps1)',
  'PowerShell(powershell -NoProfile -ExecutionPolicy Bypass -File life\desktop\open-chrome-profile.ps1)',
  'Bash(node:*)', 'PowerShell(node:*)', 'Skill', 'mcp__claude-in-chrome'
)

# True when a need is resolved: its fix code was fixed this run, or (old text-only items) every permission it asks for is allowed.
function Test-NeedFixed($need, [string[]]$allow, [string[]]$fixed) {
  if ($need -isnot [string] -and $need.fix -and ($fixed -contains $need.fix)) { return $true }
  $text = if ($need -is [string]) { $need } else { "$($need.text)" }
  $asked = [regex]::Matches($text, '"((?:Bash|PowerShell)\([^"]*\)|Skill)"') | ForEach-Object { $_.Groups[1].Value }
  return [bool]$asked -and -not ($asked | Where-Object { $allow -notcontains $_ })
}

function Invoke-Manager {
  Set-Location $repo
  if (Test-Path (Join-Path $repo 'life\STOP')) { return }
  $fixed = @(); $done = @()

  # 1) Permissions: add any missing approved allow rule. Never removes anything.
  # (worker.ps1 starts the worker with --disallowedTools so it can't edit .claude/ or life/desktop/, i.e. this list.)
  $settingsPath = Join-Path $repo '.claude\settings.json'
  $cur = if (Test-Path $settingsPath) { [IO.File]::ReadAllText($settingsPath) | ConvertFrom-Json } else { [pscustomobject]@{} }
  if (-not $cur.permissions) { $cur | Add-Member permissions ([pscustomobject]@{}) }
  $allow = @($cur.permissions.allow | Where-Object { $_ })
  $addA = @($ApprovedAllow | Where-Object { $allow -notcontains $_ })
  if ($addA) {
    $cur.permissions | Add-Member allow @($allow + $addA) -Force
    New-Item -ItemType Directory -Force (Split-Path $settingsPath) | Out-Null
    [IO.File]::WriteAllText($settingsPath, (ConvertTo-Json -InputObject $cur -Depth 10), (New-Object Text.UTF8Encoding $false))
    $done += "added permissions: $($addA -join ', ')"
  }
  $fixed += 'permissions'; $allow = @($allow + $addA)

  # 2) Dead lock: its process is gone and the heartbeat is over 5 min old (worker.ps1 itself waits 15).
  $workerActive = $false
  if (Test-Path $lock) {
    try { $l = Get-Content $lock -Raw | ConvertFrom-Json; $hb = [datetime]$l.heartbeat } catch { $l = $null; $hb = (Get-Item $lock).LastWriteTime }
    $alive = $l -and (Get-Process -Id $l.pid -ErrorAction SilentlyContinue)
    if (-not $alive -and ((Get-Date) - $hb).TotalMinutes -gt 5) { Remove-Item $lock; $done += "removed dead lock (pid $($l.pid), heartbeat $hb)" }
    else { $workerActive = ((Get-Date) - $hb).TotalMinutes -lt 15 }
  }
  $fixed += 'lock'

  # 3) Git: a leftover index.lock (10+ min old, no git running) and unpushed commits (only while no worker runs).
  $gitLock = Join-Path $repo '.git\index.lock'
  if ((Test-Path $gitLock) -and ((Get-Date) - (Get-Item $gitLock).LastWriteTime).TotalMinutes -gt 10 -and -not (Get-Process git -ErrorAction SilentlyContinue)) {
    Remove-Item $gitLock; $done += 'removed stale .git/index.lock'
  }
  $gitOk = $true
  if (-not $workerActive) {
    $ahead = (git rev-list --count '@{u}..HEAD' 2>$null); $behind = (git rev-list --count 'HEAD..@{u}' 2>$null)
    if ([int]$ahead -gt 0 -and [int]$behind -eq 0) {
      git push --quiet 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) { $done += "pushed $ahead commit(s)" } else { $gitOk = $false; Write-Log 'manager: git push failed, left for Thierry' }
    }
  }
  if ($gitOk -and -not (Test-Path $gitLock)) { $fixed += 'git' }

  # 4) Clear the needs those fixes resolved.
  $s = [IO.File]::ReadAllText($statePath) | ConvertFrom-Json
  $gone = @($s.needs | Where-Object { Test-NeedFixed $_ $allow $fixed })
  if ($gone) {
    Update-State $statePath {
      param($st)
      $st.needs = @($st.needs | Where-Object { -not (Test-NeedFixed $_ $allow $fixed) })
      $st.log = @([pscustomobject]@{ t = (Get-Date).ToString('o'); text = "Manager check fixed $($gone.Count) item(s) and cleared them from Review" }) + @($st.log)
    }
    $done += "cleared $($gone.Count) need(s)"
  }
  foreach ($d in $done) { Write-Log "manager: $d" }
}

if ($Test) {
  $allow = @('Skill', 'Bash(node:*)')
  if (-not (Test-NeedFixed 'Please add "Bash(node:*)" and "Skill"' $allow @())) { throw 'old permission need not cleared' }
  if (Test-NeedFixed 'Please add "Bash(curl:*)"' $allow @()) { throw 'unapproved permission cleared' }
  if (Test-NeedFixed 'Chrome has two browsers' $allow @('lock')) { throw 'unrelated need cleared' }
  if (-not (Test-NeedFixed ([pscustomobject]@{ text = 'stuck lock'; fix = 'lock' }) $allow @('lock'))) { throw 'fix code not cleared' }
  'manager self-test passed'; exit 0
}
if ($MyInvocation.InvocationName -ne '.') { try { Invoke-Manager } catch { Write-Log "manager: error $_" } }
