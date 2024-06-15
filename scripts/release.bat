@echo off
setlocal

cd .. 

cd frontend
rmdir /s /q dist
call npm run build:prod
cd ..

python -m PyInstaller --onefile --noconsole --icon=config/icon.ico --name squadMortarOverlay squad_mortar_overlay.py 

if exist release rmdir /s /q release

:: Create the 'release' folder
mkdir release

git clone --no-checkout https://github.com/Devil4ngle/squadmortar-release.git release

:: Copy squadmortar.exe to the 'release' folder
copy VERSION.txt release

mkdir release\config

:: Copy only the specified files to the 'release' folder
copy /y dist\squadMortarOverlay.exe release\
copy /y config\text.txt release\config
copy /y config\icon.ico release\config

:: Create the 'frontend' folder inside 'release'
mkdir release\frontend\dist

:: Copy 'frontend/dist' to 'release\frontend'
xcopy /s /e frontend\dist release\frontend\dist

:: Initialize a new Git repository in the 'release' folder
cd release
:: Add all your changes

git add .

git commit -m "Update Release"

git push

echo Task completed successfully.

pause