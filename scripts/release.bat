@echo off
setlocal

cd .. 

python -m PyInstaller --add-data=favicon.ico;. --clean --onefile --noconsole --icon=favicon.ico --name squadMortarOverlay squad_mortar_overlay.py 

echo Task completed successfully.

pause
