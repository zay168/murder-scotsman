@echo off
title Murder on the Flying Scotsman - Auto Launcher
color 0a

echo ===================================================
echo   MURDER ON THE FLYING SCOTSMAN - MEGA LAUNCHER
echo ===================================================
echo.

:: 1. Tuer les anciens processus
echo [1/4] Nettoyage des anciens serveurs...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

:: 2. Lancer le serveur Python en arrière-plan
echo [2/4] Lancement du serveur de jeu...
start /B "" "C:\Users\ALSARRAFZayd\AppData\Local\Programs\Python\Python312\python.exe" app.py

:: Attendre que le serveur démarre
timeout /t 3 /nobreak >nul

:: 3. Lancer le tunnel public (le "Hack" pour passer le firewall)
echo [3/4] Ouverture du tunnel public (ZERO SECURITE IP)...
echo.
echo === MODE SANS IP ===
echo Dans la NOUVELLE FENETRE qui va s'ouvrir :
echo 1. Attends de voir une URL (ex: https://abc-123.tunnelmole.net)
echo 2. Envoie cette adresse a tes amis.
echo 3. Ils arriveront DIRECTEMENT sur le jeu sans rien taper !
echo ====================
echo.

:: Lancement de tunnelmole pour eviter la verification d'IP de localtunnel
start "TUNNEL - SANS IP" cmd /k "npx --yes tunnelmole 5001"

:: 4. Ouvrir le jeu localement pour toi
echo [4/4] Ouverture du jeu pour toi...
start "" "http://127.0.0.1:5001"

echo.
echo ===================================================
echo TOUT EST PRET ! Laisse cette fenetre ouverte.
echo Appuie sur une touche pour TOUT fermer.
echo ===================================================
pause >nul

:: Nettoyage à la fermeture
taskkill /F /IM python.exe >nul 2>&1
exit
