@echo off
timeout /t 2 /nobreak 
echo Fetching from Git...
echo Current directory: %CD%
cd .. 
"%CD%\scripts\git\bin\git.exe" init
rem Check if remote origin exists
"%CD%\scripts\git\bin\git.exe" remote -v | find "origin" > nul
if %errorlevel% neq 0 (
    echo Adding remote origin...
    "%CD%\scripts\git\bin\git.exe" remote add origin https://github.com/Devil4ngle/squadmortar-release.git
) else (
    echo Remote origin already exists.
)
"%CD%\scripts\git\bin\git.exe" fetch origin main
echo no | "%CD%\scripts\git\bin\git.exe" reset --hard origin/main


echo Script is up to date. Press any key to close. Start Script again
pause
