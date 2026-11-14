Set WshShell = CreateObject("WScript.Shell")
Set WMI = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")

Set colProcessos = WMI.ExecQuery("SELECT * FROM Win32_Process WHERE CommandLine LIKE '%agente_nitro.py%'")

If colProcessos.Count > 0 Then
    For Each objProcesso in colProcessos
        objProcesso.Terminate()
    Next
    WshShell.Popup "Cyberdeck J1: DESCONECTADO", 2, "Cyberdeck", 64
Else
    WshShell.CurrentDirectory = "C:\Cyberdeck"
    WshShell.Run "pythonw.exe C:\Cyberdeck\agente_nitro.py", 0, False
    WshShell.Popup "Cyberdeck J1: CONECTADO", 2, "Cyberdeck", 64
End If