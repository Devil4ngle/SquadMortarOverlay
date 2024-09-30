@echo off
setlocal

cd .. 

python -m PyInstaller --add-data=frontend/src/img/favicons/favicon.ico;. --clean --onefile --noconsole --icon=frontend/src/img/favicons/favicon.ico --name squadMortarOverlay squad_mortar_overlay.py 

echo Task completed successfully.

pause
