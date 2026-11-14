@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Installiert die Mod. Liegt das Spiel nicht in C:\Pizza Syndicate, den Spielordner auf diese Datei ziehen
rem oder als Parameter angeben: installieren.bat "D:\Spiele\Pizza Syndicate"
where node >nul 2>nul || (echo Node.js fehlt. Bitte von https://nodejs.org installieren und dann erneut starten. & pause & exit /b 1)
node install.js %*
echo.
echo Fertig. Bitte im Spiel ein NEUES Spiel starten, um die neuen Staedte zu sehen.
pause
