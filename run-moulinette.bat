@echo off
setlocal

REM Launch the licence key moulinette.
cd /d "%~dp0"

set "APP_MAIN=tools\license-app\main.cjs"

if not exist "%APP_MAIN%" (
  echo Impossible de trouver %APP_MAIN%.
  exit /b 1
)

echo Lancement de la moulinette...
npx electron "%APP_MAIN%"
