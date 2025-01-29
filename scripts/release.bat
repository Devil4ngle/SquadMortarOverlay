@echo off
setlocal

cd .. 
cd src
python -m PyInstaller --add-data=favicon.ico;. --clean --onefile --noconsole --icon=favicon.ico --name squadMortarOverlay main.py 

echo Task completed successfully.

pause
