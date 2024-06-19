@echo off
setlocal

cd .. 

cd frontend
rmdir /s /q dist
call npm run build:prod
cd ..

if exist gh-pages rmdir /s /q gh-pages

mkdir gh-pages

git clone --branch gh-pages --single-branch https://github.com/Devil4ngle/squadmortar gh-pages --depth=1

cd gh-pages

for /F "delims=" %%i in ('dir /b') do (if not "%%i"=="\.git" rmdir /s /q "%%i" 2>nul & del /f /q "%%i" 2>nul)

cd .. 

xcopy /s /e frontend\dist gh-pages\

cd gh-pages

git add .

git commit -m "Update gh-pages"

git push origin gh-pages

echo WebPage updated successfully.

cd .. 

python -m PyInstaller --onefile --noconsole --icon=config/icon.ico --name squadMortarOverlay squad_mortar_overlay.py 

if exist release rmdir /s /q release

:: Create the 'release' folder
mkdir release

git clone --depth=1 --no-checkout https://github.com/Devil4ngle/squadmortar-release.git release

:: Copy squadmortar.exe to the 'release' folder
copy VERSION.txt release

mkdir release\config

:: Copy only the specified files to the 'release' folder
copy /y config\text.txt release\config
copy /y config\icon.ico release\config

:: Initialize a new Git repository in the 'release' folder
cd release
:: Add all your changes

git add .

git commit -m "Update Release"

git push

echo Task completed successfully.

pause
