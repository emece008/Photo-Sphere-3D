@echo off
cd /d "%~dp0"
set PORT=8765
where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%/"
  python -m http.server %PORT%
  goto :eof
)
where npx >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%/"
  npx --yes http-server -p %PORT% -c-1
  goto :eof
)
echo Necesitas Python o Node.js instalado para servir el proyecto.
pause
