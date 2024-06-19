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

python -m PyInstaller --add-data=frontend/src/img/favicons/favicon.ico;. --clean --onefile --noconsole --icon=frontend/src/img/favicons/favicon.ico --name squadMortarOverlay squad_mortar_overlay.py 

echo Task completed successfully.

pause
