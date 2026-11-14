@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Stellt den Originalzustand des Spiels wieder her.
where node >nul 2>nul || (echo Node.js fehlt. Bitte von https://nodejs.org installieren und dann erneut starten. & pause & exit /b 1)
node install.js %* --uninstall
pause
