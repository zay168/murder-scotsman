@echo off
title Murder on the Flying Scotsman - Server
color 0a
echo ===================================================
echo   MURDER ON THE FLYING SCOTSMAN - SERVER LAUNCHER
echo ===================================================
echo.
echo [1/3] Stopping any old server processes...
taskkill /F /IM python.exe >nul 2>&1

echo [2/3] Installing/Verifying Dependencies...
pip install -r requirements.txt

echo.
echo [3/3] Starting Server on Port 5001...
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
echo The game will open in your default browser shortly.
echo.

start "" "http://127.0.0.1:5001"

python app.py
pause
