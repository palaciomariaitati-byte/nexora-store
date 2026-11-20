@echo off
title Servidor Nora AI - Kiosco (no cerrar)
cd /d "%~dp0"
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\nodejs"
:loop
echo [%date% %time%] Iniciando servidor Nora AI...
node server.js
echo [%date% %time%] Servidor detenido. Reiniciando en 3 segundos...
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 3 /nobreak >nul
goto loop
