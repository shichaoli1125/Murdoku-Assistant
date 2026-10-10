@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0index.html"
  exit /b
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4173' -TimeoutSec 1 -UseBasicParsing; if ($r.Content -match 'Murdoku') { exit 0 } } catch {}; exit 1" >nul 2>nul
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath 'node' -ArgumentList 'server.cjs' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
  timeout /t 1 /nobreak >nul
)
start "" "http://127.0.0.1:4173"
