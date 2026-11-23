# Sends ONE approved pitch email from kitebright.hq@gmail.com over Gmail SMTP, exactly as approved in Review.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File life\desktop\send-approved.ps1 <review-item-id>
# Refuses unless the Review item has status "approved" and no sentAt; records sentAt + messageId; max 5 sends a day.
# The app password lives in life/private/gmail-app-password.txt (gitignored; Thierry writes it himself; never printed or logged).
param([Parameter(Mandatory)][string]$Id)
$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\Thierry\Documents\claude-life'
$statePath = Join-Path $repo 'life\state.json'
$pwFile = Join-Path $repo 'life\private\gmail-app-password.txt'
$from = 'kitebright.hq@gmail.com'
$dailyCap = 5  # warm-up week 1 (life/OUTREACH.md)

if (Test-Path (Join-Path $repo 'life\STOP')) { throw 'STOP is on: nothing sent.' }
$s = [IO.File]::ReadAllText($statePath) | ConvertFrom-Json
$item = $s.review | Where-Object { $_.id -eq $Id }
if (-not $item) { throw "No Review item '$Id'." }
if ($item.kind -ne 'email') { throw "Review item '$Id' is not an email." }
if ($item.status -ne 'approved') { throw "Not approved by Thierry (status: $($item.status)). Nothing sent." }
if ($item.sentAt) { throw "Already sent at $($item.sentAt). Nothing sent again." }
$today = (Get-Date).ToString('yyyy-MM-dd')
$sentToday = @($s.review | Where-Object { $_.sentAt -and ([datetime]$_.sentAt).ToString('yyyy-MM-dd') -eq $today }).Count
if ($sentToday -ge $dailyCap) { throw "Daily cap reached ($sentToday/$dailyCap). Nothing sent." }

# The approved text: "To: x", "Subject: y", blank line, body.
if ($item.email -notmatch '^To:\s*(\S+@\S+)\s*\r?\nSubject:\s*([^\r\n]+)\r?\n\r?\n([\s\S]+)$') { throw 'Email text must start with To:, Subject:, a blank line, then the body.' }
$to, $subject, $text = $Matches[1], $Matches[2].Trim(), $Matches[3].TrimEnd()
if (-not (Test-Path $pwFile)) { throw 'No app password yet: life\private\gmail-app-password.txt is missing.' }
$pw = (Get-Content $pwFile -Raw).Trim() -replace '\s', ''

# HTML version: "Label: https://..." lines become a named link "Label demo"; any other URL becomes a link to itself.
$html = ($text -split "`r?`n" | ForEach-Object {
  $line = [Net.WebUtility]::HtmlEncode($_)
  if ($line -match '^(.+?):\s*(https://\S+)$') { "<a href=""$($Matches[2])"">$($Matches[1]) demo</a>" }
  else { [regex]::Replace($line, 'https://[^\s<]+', { param($m) "<a href=""$($m.Value)"">$($m.Value)</a>" }) }
}) -join "<br>`n"

$msg = New-Object Net.Mail.MailMessage
$msg.From = New-Object Net.Mail.MailAddress($from, 'Thierry, Kitebright Studio')
$msg.To.Add($to); $msg.Subject = $subject
$msg.AlternateViews.Add([Net.Mail.AlternateView]::CreateAlternateViewFromString($text, $null, 'text/plain'))
$msg.AlternateViews.Add([Net.Mail.AlternateView]::CreateAlternateViewFromString("<div style=""font-family:Arial,sans-serif;font-size:14px"">$html</div>", $null, 'text/html'))
$msgId = "<$([guid]::NewGuid().ToString('N'))@kitebright>"; $msg.Headers.Add('Message-ID', $msgId)
$smtp = New-Object Net.Mail.SmtpClient('smtp.gmail.com', 587)
$smtp.EnableSsl = $true
$smtp.Credentials = New-Object Net.NetworkCredential($from, $pw)
$smtp.Send($msg); $msg.Dispose()

$sentAt = (Get-Date).ToString('o')
$item | Add-Member sentAt $sentAt -Force; $item | Add-Member messageId $msgId -Force; $item.status = 'sent'
[IO.File]::WriteAllText($statePath, (ConvertTo-Json -InputObject $s -Depth 50), (New-Object Text.UTF8Encoding $false))
Add-Content (Join-Path $repo 'life\LOG.md') "`n- $sentAt sent approved pitch '$subject' to $to ($Id, $msgId)" -Encoding utf8
Write-Output "Sent '$subject' to $to at $sentAt ($msgId)"
