@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Murder on the Flying Scotsman - Server
color 0a

echo ===================================================
echo   MURDER ON THE FLYING SCOTSMAN - SERVER LAUNCHER
echo ===================================================
echo.

set "PYTHON_CMD="

rem 1) Project virtualenv first
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_CMD=.venv\Scripts\python.exe"
)

rem 2) Common CPython install locations
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"

rem 3) Python launcher
if not defined PYTHON_CMD (
    where py >nul 2>&1
    if not errorlevel 1 (
        py -3 -c "import sys" >nul 2>&1
        if not errorlevel 1 (
            set "PYTHON_CMD=py -3"
        ) else (
            set "PYTHON_CMD=py"
        )
    )
)

rem 4) python in PATH
if not defined PYTHON_CMD (
    where python >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_CMD=python"
    )
)

rem 5) EduPython fallback (often missing SSL)
if not defined PYTHON_CMD if exist "C:\Applications\EduPython\App\python.exe" (
    set "PYTHON_CMD=C:\Applications\EduPython\App\python.exe"
)

if not defined PYTHON_CMD (
    echo [ERROR] Python introuvable.
    echo Installe Python 3.11+ (python.org) puis relance ce fichier.
    pause
    exit /b 1
)

echo [Python] Utilise: %PYTHON_CMD%
%PYTHON_CMD% -c "import sys; print('[Python Version] ' + sys.version.split()[0])"
echo.

echo [1/4] Stopping old server on port 5001 (if any)...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5001 .*LISTENING"') do (
    taskkill /F /PID %%P >nul 2>&1
)

echo [2/4] Checking SSL support...
%PYTHON_CMD% -c "import ssl" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Ce Python n'a pas le module SSL.
    echo [3/4] Checking if dependencies are already installed...
    %PYTHON_CMD% -c "import flask, flask_socketio, eventlet" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [ERROR] Impossible d'installer les dependances sans SSL.
        echo Installe Python officiel (python.org), puis relance run_game.bat.
        echo Conseil: coche 'Add python.exe to PATH' a l'installation.
        pause
        exit /b 1
    ) else (
        echo [OK] Dependances deja presentes. Demarrage sans pip.
        goto RUN_SERVER
    )
)

echo [3/4] Upgrading pip (quiet)...
%PYTHON_CMD% -m pip install --disable-pip-version-check --upgrade pip >nul 2>&1

echo [4/4] Installing/Verifying dependencies...
%PYTHON_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ERROR] Echec de l'installation des dependances.
    pause
    exit /b 1
)

goto RUN_SERVER

:RUN_SERVER
echo.
echo [Start] Starting server on port 5001...
echo.
echo Please allow firewall access if prompted.
echo.
echo ===================================================
echo YOUR LOCAL IP ADDRESSES (Share one of these to play):
echo ===================================================
ipconfig | findstr "IPv4"
echo.
echo e.g. http://192.168.1.15:5001
echo ===================================================
echo.

start "" "http://127.0.0.1:5001"
%PYTHON_CMD% app.py

pause
