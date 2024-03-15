@echo off
setlocal

cd .. 

cd frontend
call npm run buildOnce 
cd ..

python -m PyInstaller --onefile --noconsole --icon=frontend/public/icon.ico --name squadMortarOverlay squad_mortar_overlay.py 

if exist release rmdir /s /q release

:: Create the 'release' folder
mkdir release

git clone --no-checkout https://github.com/Devil4ngle/squadmortar-release.git release

:: Copy squadmortar.exe to the 'release' folder
copy VERSION.txt release

:: Create the 'release\scripts' folder if it doesn't exist
mkdir release\scripts
mkdir release\scripts\git
mkdir release\config

:: Copy only the specified files to the 'release' folder
copy /y dist\squadMortarOverlay.exe release\
copy /y config\text.txt release\config
copy /y scripts\update.bat release\scripts
copy /y icon.ico release\
xcopy /E /Y scripts\git release\scripts\git

if exist release\scripts\node_modules rmdir /s /q release\scripts\node_modules

:: Create the 'frontend' folder inside 'release'
mkdir release\frontend\public

:: Copy 'frontend/public' to 'release\frontend'
xcopy /s /e frontend\public release\frontend\public

if exist release\frontend\public\merged rmdir /s /q release\frontend\public\merged

:: powershell Compress-Archive -Path "release\*" -DestinationPath "release\squadmortar.zip"

:: Initialize a new Git repository in the 'release' folder
cd release
:: Add all your changes

echo runtime/ > .gitignore
echo frontend/public/merged/ >> .gitignore
echo config.json >> .gitignore

git add .

git commit -m "Update Release"

git push

echo Task completed successfully.

pause