#!/bin/sh
# Windows popup from WSL so the user knows when to come back: ./notify.sh "message"
powershell.exe -NoProfile -WindowStyle Hidden -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('$1', 'slither AI') | Out-Null" >/dev/null 2>&1 &
