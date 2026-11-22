# Claude Life worker. Started every minute (hidden) by the "ClaudeLife-Worker" scheduled task. See CLAUDE.md "Worker or manager?".
# Lock: life/private/worker.lock = JSON {pid, started, heartbeat} (ISO 8601), heartbeat refreshed every 2 min. Stale at >=15 min.
# Out of usage: life/private/sleep-until.txt holds the reset time (ISO); runs before it skip without calling claude.
$repo = 'C:\Users\Thierry\Documents\claude-life'
$priv = Join-Path $repo 'life\private'
$log  = Join-Path $priv 'worker.log'
$lock = Join-Path $priv 'worker.lock'
$sleepFile = Join-Path $priv 'sleep-until.txt'
$statePath = Join-Path $repo 'life\state.json'

$skipFile = Join-Path $priv 'worker-skip.txt'   # last skip reason (the task fires every minute; the log only gets reason changes)
$lastFile = Join-Path $priv 'worker-last.json'  # {ended, exit, idle} of the previous run

function Write-Log($msg) { Add-Content -Path $log -Encoding utf8 -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg" }
function Write-Skip($reason) {
  $prev = if (Test-Path $skipFile) { ((Get-Content $skipFile -Raw) -replace '^\S+ ', '').Trim() } else { '' }
  if ($prev -ne $reason) { Write-Log "skipped: $reason" }
  Set-Content -Path $skipFile -Value "$((Get-Date).ToString('o')) $reason"
}
# A Chat message the worker hasn't picked up yet (status "new" in life/inbox.json).
function Test-NewMessage {
  try { return [bool](([IO.File]::ReadAllText((Join-Path $repo 'life\inbox.json')) | ConvertFrom-Json) | Where-Object { $_.status -eq 'new' }) } catch { return $false }
}
# The previous run had nothing it could do: it says every bet is blocked / waiting on Thierry, or claude failed fast.
# Model for the next run, from state.json nextRun.model (set by the worker at checkpoint). Opus only for site builds.
function Get-RunModel([string]$path) {
  try { $m = ([IO.File]::ReadAllText($path) | ConvertFrom-Json).nextRun.model } catch { $m = $null }
  if ($m -eq 'opus') { return 'claude-opus-5-5' } else { return 'claude-sonnet-5-5' }
}
function Test-IdleRun([string]$text, [int]$code, [double]$minutes) {
  if ($code -eq 0 -and $text -match 'Task done; next:') { return $false }  # short-run handoff: start the next run right away
  return ($code -ne 0 -and $minutes -lt 5) -or ($text -match '(?i)(all|every) (active )?bets? (are |is )?(truly )?(blocked|waiting)|nothing (left )?(i can|to) do')
}
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

# Chat responder: a short Sonnet run that only reads and edits life/inbox.json, so Thierry gets a reply within ~1 min
# even while the main worker is deep in a long step. It acknowledges ("seen"); the worker still acts on "seen" messages.
# --restricted ignores the project allow list, so only Read and Edit(life/inbox.json) are possible.
$ChatPrompt = 'You are the Claude Life chat responder. Read life/inbox.json, life/state.json and the first 40 lines of life/LOG.md, plus any image files listed in a message''s "images" field. For every message whose status is "new": set "reply" to a short, honest, plain-English answer (1 to 3 sentences) saying what the team is doing right now and that the instruction is queued for the worker (or answer the question if state.json or LOG.md already answers it), and set "status" to "seen". Change nothing else and keep the file valid JSON. You cannot do the work yourself, so never claim it is done.'
function Get-NewMessages([double]$olderThanMin = 0) {
  try {
    return @(([IO.File]::ReadAllText((Join-Path $repo 'life\inbox.json')) | ConvertFrom-Json) |
      Where-Object { $_.status -eq 'new' -and ((Get-Date) - [datetime]$_.t).TotalMinutes -ge $olderThanMin })
  } catch { return @() }
}
function Invoke-ChatResponder([double]$olderThanMin = 0) {
  $msgs = @(Get-NewMessages $olderThanMin)
  if (-not $msgs) { return }
  # shortcut: inbox.json can also be written by the app or the worker meanwhile; a lost reply just gets re-answered next minute
  $r = Start-Process claude -ArgumentList '-p', "`"$($ChatPrompt -replace '"', '\"')`"", '--model', 'claude-sonnet-5-5', '--restricted', '--tools', 'Read,Edit',
       '--strict-mcp-config', '--allowedTools', 'Read', '"Edit(life/inbox.json)"', '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--no-session-persistence' `
       -WorkingDirectory $repo -WindowStyle Hidden -PassThru
  $null = $r.Handle
  if (-not $r.WaitForExit(180000)) { $r.Kill(); Write-Log "chat responder: timed out after 3 min ($($msgs.Count) message(s))"; return }
  Write-Log "chat responder: $($msgs.Count) message(s), exit=$($r.ExitCode), still new: $(@(Get-NewMessages).Count)"
}

function Invoke-Worker {
  Set-Location $repo
  New-Item -ItemType Directory -Force $priv | Out-Null
  if (Test-Path (Join-Path $repo 'life\STOP')) { Write-Skip 'STOP'; return 0 }
  & (Join-Path $PSScriptRoot 'manager.ps1')  # manager check: safe auto-fixes, every run, even while a worker is busy

  if (Test-Path $sleepFile) {
    $until = [datetime](Get-Content $sleepFile -Raw).Trim()
    if ((Get-Date) -lt $until) { Write-Skip "out of usage until $($until.ToString('yyyy-MM-dd HH:mm'))"; return 0 }
    Remove-Item $sleepFile
  }

  if (Test-Path $lock) {
    try { $hb = [datetime]((Get-Content $lock -Raw | ConvertFrom-Json).heartbeat) } catch { $hb = (Get-Item $lock).LastWriteTime }
    if (((Get-Date) - $hb).TotalMinutes -lt 15) { Write-Skip 'worker active'; return 0 }
    Write-Log "stale lock (heartbeat $hb), taking over"
  }

  # Back-off: after a run where every bet was blocked, wait 15 min before the next one, unless Thierry sent a Chat message.
  if (Test-Path $lastFile) {
    try { $last = Get-Content $lastFile -Raw | ConvertFrom-Json } catch { $last = $null }
    if ($last -and $last.idle -and ((Get-Date) - [datetime]$last.ended).TotalMinutes -lt 15 -and -not (Test-NewMessage)) {
      Write-Skip 'all bets blocked last run; retrying 15 min after it ended, or sooner on a new Chat message'; return 0
    }
  }
  Remove-Item $skipFile -ErrorAction SilentlyContinue

  $started = (Get-Date).ToString('o')
  $out = Join-Path $priv 'worker.out'
  $err = Join-Path $priv 'worker.err'
  $code = 1; $idle = $true  # an early error counts as idle so a broken setup doesn't relaunch every minute
  try {
    Write-Lock $PID $started
    Invoke-ChatResponder  # reply to waiting Chat messages first; the full run takes a while to read them

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

    $model = Get-RunModel $statePath
    Write-Log "start: claude -p 'Wake up and continue.' --model $model --effort medium --permission-mode dontAsk --chrome"
    # Permissions come from .claude/settings.json (allow/deny); dontAsk refuses everything else.
    $p = Start-Process claude -ArgumentList '-p', '"Wake up and continue."', '--model', $model, '--effort', 'medium', '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--chrome', '--disallowedTools', '"Edit(.claude/**)"', '"Edit(life/desktop/**)"' `
         -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
    $null = $p.Handle  # cache the handle now, or ExitCode stays empty after the process ends
    Write-Lock $p.Id $started
    $deadline = (Get-Date).AddMinutes(350)  # safety cap under the task's 6h limit; runs normally end themselves (CLAUDE.md)
    while (-not $p.WaitForExit(60000)) {
      if ((Get-Date) -gt $deadline) { Write-Log 'timeout: killing claude after 350 min'; $p.Kill(); break }
      if (Test-Path (Join-Path $repo 'life\STOP')) { Write-Log 'STOP appeared: killing claude'; $p.Kill(); break }
      Write-Lock $p.Id $started
      Invoke-ChatResponder 1
      # The scheduled task doesn't start again while this run is busy, so the phone snapshot is refreshed from here.
      $mobile = (node (Join-Path $repo 'life\mobile\publish.js') 2>&1 | Out-String).Trim()
      if ($mobile -like 'mobile: failed*') { Write-Log $mobile }
    }
    $p.WaitForExit()
    $code = $p.ExitCode

    # This run's output only (worker.out/.err are recreated each run).
    $runText = (@($out, $err) | Where-Object { Test-Path $_ } | ForEach-Object { Get-Content $_ -Raw }) -join "`n"
    if ($runText) { $runText -split "`r?`n" | ForEach-Object { "  $_" } | Add-Content -Path $log -Encoding utf8 }
    $idle = Test-IdleRun $runText $code ((Get-Date) - [datetime]$started).TotalMinutes
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
    @{ ended = (Get-Date).ToString('o'); exit = $code; idle = $idle } | ConvertTo-Json -Compress | Set-Content -Path $lastFile -Encoding utf8
    Write-Log "end exit=$code idle=$idle"
  }
  return $code
}

if ($MyInvocation.InvocationName -ne '.') { exit (Invoke-Worker) }
