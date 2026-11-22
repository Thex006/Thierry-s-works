# One-time Cloudflare login for publish-demo.ps1, opened in the "Claude Life" Chrome profile (not your personal one).
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Thierry\Documents\claude-life\life\desktop\cloudflare-login.ps1
$repo = 'C:\Users\Thierry\Documents\claude-life'
Set-Location $repo

# wrangler prints the login link instead of opening the default browser; the callback goes to localhost, so any profile works.
$psi = New-Object Diagnostics.ProcessStartInfo 'cmd.exe', '/c npx --yes wrangler login --browser=false'
$psi.WorkingDirectory = $repo; $psi.UseShellExecute = $false; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
$p = [Diagnostics.Process]::Start($psi)
$opened = $false
while (-not $p.StandardOutput.EndOfStream) {
  $line = $p.StandardOutput.ReadLine(); Write-Host $line
  if (-not $opened -and $line -match '(https://dash\.cloudflare\.com/oauth2/auth\S+)') {
    $opened = $true
    & (Join-Path $PSScriptRoot 'open-chrome-profile.ps1') -Url $Matches[1]
    Write-Host '>> Opened the login page in the Claude Life Chrome window. Click Allow there.'
  }
}
$p.WaitForExit(); $err = $p.StandardError.ReadToEnd(); if ($err) { Write-Host $err }
if (-not $opened) { Write-Host '>> No login link found above. If it printed one, copy it into the Claude Life Chrome window.' }
cmd /c npx wrangler whoami
Read-Host 'Done. Press Enter to close'
