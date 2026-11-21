# Adds a "Claude Life" icon to the desktop that opens the game like an app.
$here = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$desktop\Claude Life.lnk")
$lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
$lnk.Arguments = "`"$here\launch.vbs`""
$lnk.IconLocation = "$here\claude-life.ico"
$lnk.WorkingDirectory = $here
$lnk.Description = 'Watch Claude Life'
$lnk.Save()
Write-Host "Added 'Claude Life' to your desktop. Double-click it to open."
