' Claude Life launcher: starts the server hidden (if needed) and opens the game as an app window.
Option Explicit
Dim sh, fso, here, life, url, q, node, i, b
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
life = fso.GetParentFolderName(here)
url = "http://127.0.0.1:4747"
q = Chr(34)

Function IsUp()
  Dim x
  On Error Resume Next
  Set x = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  x.setTimeouts 300, 300, 500, 500
  x.Open "GET", url & "/api/state", False
  x.Send
  IsUp = (Err.Number = 0 And x.Status = 200)
  Err.Clear
End Function

Function FirstExisting(list)
  Dim p
  FirstExisting = ""
  For Each p In list
    p = sh.ExpandEnvironmentStrings(p)
    If fso.FileExists(p) Then FirstExisting = p : Exit Function
  Next
End Function

Function FindNode()
  Dim dirs, d
  FindNode = FirstExisting(Array("%ProgramFiles%\nodejs\node.exe", "%ProgramFiles(x86)%\nodejs\node.exe", "%NVM_SYMLINK%\node.exe", "%LOCALAPPDATA%\Programs\nodejs\node.exe"))
  If FindNode <> "" Then Exit Function
  dirs = Split(sh.ExpandEnvironmentStrings("%PATH%"), ";")
  For Each d In dirs
    If d <> "" Then
      If fso.FileExists(fso.BuildPath(d, "node.exe")) Then FindNode = fso.BuildPath(d, "node.exe") : Exit Function
    End If
  Next
End Function

If Not IsUp() Then
  node = FindNode()
  If node = "" Then
    MsgBox "Claude Life needs Node.js. Install the LTS version from nodejs.org, then open Claude Life again.", 48, "Claude Life"
    WScript.Quit 1
  End If
  sh.CurrentDirectory = life
  sh.Run "cmd /c " & q & q & node & q & " " & q & life & "\app\server.js" & q & " > " & q & here & "\server.log" & q & " 2>&1" & q, 0, False
  For i = 1 To 100
    WScript.Sleep 100
    If IsUp() Then Exit For
  Next
  If Not IsUp() Then
    MsgBox "The Claude Life server didn't start. Details are in:" & vbCrLf & here & "\server.log", 48, "Claude Life"
    WScript.Quit 1
  End If
End If

b = FirstExisting(Array("%ProgramFiles%\Google\Chrome\Application\chrome.exe", "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe", "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe", "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe", "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"))
If b <> "" Then
  sh.Run q & b & q & " --app=" & url & " --window-size=1440,900", 1, False
Else
  sh.Run url, 1, False
End If
