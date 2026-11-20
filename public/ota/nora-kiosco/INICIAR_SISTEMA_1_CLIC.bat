@echo off
title Nora AI x IberaSoft POS - Kiosco & Maxikiosco (1 Clic)
color 0A

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\nodejs"

echo ======================================================================
echo    NORA AI x IBERASOFT POS - KIOSCO & MAXIKIOSCO 2026
echo             Iniciando Sistema Completo a UN SOLO CLIC
echo ======================================================================
echo.

:: 1. Verificar si Node.js esta disponible
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=%PATH%;C:\Program Files\nodejs"
    ) else (
        echo [ERROR] No se detecto Node.js instalado.
        echo Ejecutando instalador automatico...
        call "%ROOT_DIR%INSTALAR_EN_PC_CLIENTE_KIOSCO.bat"
        exit /b 0
    )
)

:: 2. Cerrar ventanas de servidor previas y liberar puerto 3040 si habia un proceso colgado
taskkill /F /T /FI "WINDOWTITLE eq Servidor Nora AI*" >nul 2>&1
taskkill /F /T /FI "WINDOWTITLE eq Nora Kiosco - Servidor*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3040" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 3. Iniciar Servidor Local de Nora AI en segundo plano
echo [1/3] Iniciando Servidor Local (Cerebro Nora AI + 1.277 articulos de Kiosco)...
:: El servidor corre en bucle: si se reinicia (actualizacion remota), vuelve a levantar solo
taskkill /F /IM cloudflared.exe >nul 2>&1
start "Nora Kiosco - Servidor" /min cmd /c ""%ROOT_DIR%backend\NORA_SERVIDOR_BUCLE.bat""

:: 4. El Tunel Remoto 4G lo abre el propio servidor y manda el link nuevo por WhatsApp
echo [2/3] Conectando Tunel Remoto 4G para el Celular del Duenio...

:: 5. Esperar confirmacion de puerto 3040
echo [3/3] Abriendo Mostrador Kiosco...
set TRIES=0
:wait_ready
timeout /t 1 /nobreak >nul
set /a TRIES=%TRIES%+1
netstat -ano | findstr ":3040" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if %TRIES% LEQ 8 (
        goto wait_ready
    )
)

:: 6. Abrir Navegador en Modo App Mostrador
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3040/
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3040/
) else (
    start http://localhost:3040/
)

echo.
echo ======================================================================
echo    SISTEMA OPERANDO CON EXITO (A UN SOLO CLIC):
echo    - Mostrador Kiosco:               http://localhost:3040/
echo    - Supervisi?n Celular del Due?o:  http://localhost:3040/?rol=duenio
echo    - Planilla Iber?Soft Sincronizada: %ROOT_DIR%sincronizacion_iberasoft\
echo ======================================================================
echo  (Podes minimizar esta ventana. Nora queda activa atendiendo el local).
echo.
pause
