# Claude Life worker. Started every 15 min (hidden) by the "ClaudeLife-Worker" scheduled task. See CLAUDE.md "Worker or manager?".
# Lock: life/private/worker.lock = JSON {pid, started, heartbeat} (ISO 8601), heartbeat refreshed every 2 min. Stale at >=15 min.
# Out of usage: life/private/sleep-until.txt holds the reset time (ISO); runs before it skip without calling claude.
$repo = 'C:\Users\Thierry\Documents\claude-life'
$priv = Join-Path $repo 'life\private'
$log  = Join-Path $priv 'worker.log'
$lock = Join-Path $priv 'worker.lock'
$sleepFile = Join-Path $priv 'sleep-until.txt'
$statePath = Join-Path $repo 'life\state.json'

function Write-Log($msg) { Add-Content -Path $log -Encoding utf8 -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg" }
function Write-Lock($procId, $started) {
  @{ pid = $procId; started = $started; heartbeat = (Get-Date).ToString('o') } | ConvertTo-Json -Compress | Set-Content -Path $lock -Encoding utf8
}

# Parses a claude "resets ..." time, e.g. "resets 2:59am (Europe/Budapest)" or "resets Nov 22, 2:59am". Local time assumed.
# Returns [datetime] or $null.
function Get-ResetTime([string]$text, [datetime]$now = (Get-Date)) {
  if ($text -match 'limit reached\|(\d{10})') { return [DateTimeOffset]::FromUnixTimeSeconds([long]$Matches[1]).LocalDateTime }
  if ($text -notmatch '(?i)resets\s+(?:([A-Z][a-z]{2})\s+(\d{1,2}),?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)') { return $null }
  $h = [int]$Matches[3] % 12; if ($Matches[5] -ieq 'pm') { $h += 12 }
  $min = if ($Matches[4]) { [int]$Matches[4] } else { 0 }
  if ($Matches[1]) {
    $day = [datetime]::ParseExact("$($Matches[1]) $($Matches[2]) $($now.Year)", 'MMM d yyyy', [Globalization.CultureInfo]::InvariantCulture)
    $t = $day.Date.AddHours($h).AddMinutes($min); if ($t -lt $now.AddDays(-1)) { $t = $t.AddYears(1) }
  } else {
    $t = $now.Date.AddHours($h).AddMinutes($min); if ($t -le $now) { $t = $t.AddDays(1) }
  }
  return $t
}

# True when claude's output says the plan limit was hit (not just a "% used" line from /usage).
function Test-UsageLimit([string]$text) {
  return $text -match "(?i)(usage limit|limit reached|hit your (session |weekly )?limit|you've reached your|out of (extra )?usage)"
}

# Merge into state.json without clobbering; UTF-8 without BOM so the app's JSON.parse works.
function Update-State([string]$path, [scriptblock]$change) {
  $s = [IO.File]::ReadAllText($path) | ConvertFrom-Json
  & $change $s
  [IO.File]::WriteAllText($path, (ConvertTo-Json -InputObject $s -Depth 50), (New-Object Text.UTF8Encoding $false))
}
function Set-Prop($obj, $name, $value) { $obj | Add-Member -NotePropertyName $name -NotePropertyValue $value -Force }

# The app shows Energy = 100 - usage.percent while now < usage.windowStart + windowHours, so windowStart is set from the reset.
function Set-OutOfUsage([string]$path, [datetime]$reset) {
  Update-State $path {
    param($s)
    $label = 'Out of usage. Back at ' + $reset.ToString('h:mm tt', [Globalization.CultureInfo]::InvariantCulture)
    Set-Prop $s 'activity' ([pscustomobject]@{ type = 'sleep'; bet = $null; label = $label; since = (Get-Date).ToString('o') })
    if (-not $s.usage) { Set-Prop $s 'usage' ([pscustomobject]@{}) }
    Set-Prop $s.usage 'percent' 100
    Set-Prop $s.usage 'windowHours' 5
    Set-Prop $s.usage 'windowStart' $reset.AddHours(-5).ToString('o')
    Set-Prop $s.usage 'resets' $reset.ToString('o')
  }
}

function Invoke-Worker {
  Set-Location $repo
  New-Item -ItemType Directory -Force $priv | Out-Null
  if (Test-Path (Join-Path $repo 'life\STOP')) { Write-Log 'skipped: STOP'; return 0 }
  & (Join-Path $PSScriptRoot 'manager.ps1')  # manager check: safe auto-fixes, every run, even while a worker is busy

  if (Test-Path $sleepFile) {
    $until = [datetime](Get-Content $sleepFile -Raw).Trim()
    if ((Get-Date) -lt $until) { Write-Log "skipped: out of usage until $($until.ToString('yyyy-MM-dd HH:mm'))"; return 0 }
    Remove-Item $sleepFile
  }

  if (Test-Path $lock) {
    try { $hb = [datetime]((Get-Content $lock -Raw | ConvertFrom-Json).heartbeat) } catch { $hb = (Get-Item $lock).LastWriteTime }
    if (((Get-Date) - $hb).TotalMinutes -lt 15) { Write-Log 'skipped: worker active'; return 0 }
    Write-Log "stale lock (heartbeat $hb), taking over"
  }

  $started = (Get-Date).ToString('o')
  $out = Join-Path $priv 'worker.out'
  $err = Join-Path $priv 'worker.err'
  $code = 1
  try {
    Write-Lock $PID $started

    # Real plan usage from `claude -p "/usage"` -> state.json usage.
    try {
      $u = (& claude -p '/usage' 2>&1 | ForEach-Object { "$_" }) -join "`n"
      if ($u -match 'Current session: (\d+)% used') {
        $pct = [int]$Matches[1]; $reset = Get-ResetTime (($u -split "`n" | Where-Object { $_ -match 'Current session' }) -join ' ')
        $week = if ($u -match 'Current week[^:]*: (\d+)% used') { [int]$Matches[1] } else { $null }
        Update-State $statePath {
          param($s)
          if (-not $s.usage) { Set-Prop $s 'usage' ([pscustomobject]@{}) }
          Set-Prop $s.usage 'percent' $pct
          if ($null -ne $week) { Set-Prop $s.usage 'weekPercent' $week }
          if ($reset) { Set-Prop $s.usage 'resets' $reset.ToString('o'); Set-Prop $s.usage 'windowHours' 5; Set-Prop $s.usage 'windowStart' $reset.AddHours(-5).ToString('o') }
        }
        Write-Log "usage: session $pct%, week $week%"
      } else { Write-Log 'usage: could not parse /usage output' }
    } catch { Write-Log "usage: error $_" }

    Write-Log 'start: claude -p "Wake up and continue." --permission-mode dontAsk --chrome'
    # Permissions come from .claude/settings.json (allow/deny); dontAsk refuses everything else.
    $p = Start-Process claude -ArgumentList '-p', '"Wake up and continue."', '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--chrome', '--disallowedTools', '"Edit(.claude/**)"', '"Edit(life/desktop/**)"' `
         -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
    $null = $p.Handle  # cache the handle now, or ExitCode stays empty after the process ends
    Write-Lock $p.Id $started
    $deadline = (Get-Date).AddMinutes(350)  # safety cap under the task's 6h limit; runs normally end themselves (CLAUDE.md)
    while (-not $p.WaitForExit(120000)) {
      if ((Get-Date) -gt $deadline) { Write-Log 'timeout: killing claude after 350 min'; $p.Kill(); break }
      if (Test-Path (Join-Path $repo 'life\STOP')) { Write-Log 'STOP appeared: killing claude'; $p.Kill(); break }
      Write-Lock $p.Id $started
    }
    $p.WaitForExit()
    $code = $p.ExitCode

    # This run's output only (worker.out/.err are recreated each run).
    $runText = (@($out, $err) | Where-Object { Test-Path $_ } | ForEach-Object { Get-Content $_ -Raw }) -join "`n"
    if ($runText) { $runText -split "`r?`n" | ForEach-Object { "  $_" } | Add-Content -Path $log -Encoding utf8 }
    if (Test-UsageLimit $runText) {
      $reset = Get-ResetTime $runText
      if (-not $reset) { $reset = (Get-Date).AddHours(1); Write-Log 'usage limit hit: reset time not found, sleeping 1h' }
      Set-Content -Path $sleepFile -Value $reset.ToString('o')
      Set-OutOfUsage $statePath $reset
      Write-Log "usage limit hit: sleeping until $($reset.ToString('yyyy-MM-dd HH:mm'))"
    }
  } catch {
    Write-Log "error: $_"
  } finally {
    Remove-Item $out, $err -ErrorAction SilentlyContinue
    Remove-Item $lock -ErrorAction SilentlyContinue  # shortcut: if Task Scheduler kills this process, the lock goes stale after 15 min instead
    Write-Log "end exit=$code"
  }
  return $code
}

if ($MyInvocation.InvocationName -ne '.') { exit (Invoke-Worker) }
