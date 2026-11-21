# Emergency stop: ends Claude Code processes on this computer and prints each stopped process id.
# Leaves the Claude desktop app itself running (its files live under AnthropicClaude or WindowsApps).
$procs = Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -ieq 'claude.exe' -and $_.ExecutablePath -notmatch 'AnthropicClaude|WindowsApps') -or
  ($_.Name -ieq 'node.exe' -and $_.CommandLine -match '@anthropic-ai[\\/]claude-code')
}
foreach ($p in $procs) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; Write-Output $p.ProcessId } catch {}
}
