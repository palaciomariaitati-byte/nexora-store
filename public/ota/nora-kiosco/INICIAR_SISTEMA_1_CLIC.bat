@echo off
title Nora AI x IberaSoft POS - Kiosco y Maxikiosco (1 Clic)
color 0A

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\nodejs"

echo ======================================================================
echo    NORA AI x IBERASOFT POS - KIOSCO Y MAXIKIOSCO 2026
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
echo [1/4] Iniciando Motor Nora AI (Cerebro + Catalogo Kiosco)...
taskkill /F /IM cloudflared.exe >nul 2>&1
cd /d "%ROOT_DIR%backend"
start "Nora Kiosco - Servidor" /min cmd /c "NORA_SERVIDOR_BUCLE.bat"
cd /d "%ROOT_DIR%"

:: 4. INICIAR IBERASOFT POS EN SIMULTANEO (1 SOLO CLIC PARA AMBOS SISTEMAS)
echo [2/4] Detectando y abriendo IberaSoft POS en simultaneo...
set "IBERA_FOUND="

for %%D in (
    "%USERPROFILE%\Desktop"
    "%PUBLIC%\Desktop"
    "%USERPROFILE%\OneDrive\Escritorio"
    "%USERPROFILE%\OneDrive\Desktop"
) do (
    if not defined IBERA_FOUND (
        if exist "%%~D\*Ibera*.lnk" (
            for %%F in ("%%~D\*Ibera*.lnk") do (
                if not defined IBERA_FOUND (
                    set "IBERA_FOUND=%%~fF"
                    echo [OK] IberaSoft detectado en Escritorio: "%%~nxF"
                    start "" "%%~fF"
                )
            )
        )
    )
)

if not defined IBERA_FOUND (
    for %%P in (
        "C:\IberaSoft\IberaSoft.exe"
        "C:\IberaSoft\Ibera.exe"
        "C:\IberaSoft\Kiosco.exe"
        "C:\Program Files (x86)\IberaSoft\*.exe"
        "C:\Program Files\IberaSoft\*.exe"
        "C:\Ibera\*.exe"
    ) do (
        if not defined IBERA_FOUND (
            if exist %%P (
                set "IBERA_FOUND=%%~fP"
                echo [OK] IberaSoft detectado en disco: "%%~fP"
                start "" "%%~fP"
            )
        )
    )
)

if defined IBERA_FOUND (
    echo [OK] IberaSoft POS iniciado correctamente junto a Nora.
) else (
    echo [INFO] IberaSoft ya iniciado o listo para uso manual si tiene acceso personalizado.
)

:: 5. Esperar confirmacion de puerto 3040 del Servidor Nora
echo [3/4] Verificando conexion del motor Nora...
set TRIES=0
:wait_ready
ping 127.0.0.1 -n 2 >nul
set /a TRIES=%TRIES%+1
netstat -ano 2>nul | findstr ":3040" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if %TRIES% LEQ 10 (
        goto wait_ready
    )
)

:: 6. Abrir Navegador en Modo App Mostrador
echo [4/4] Abriendo Asistente Mostrador Kiosco...
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
echo    - IberaSoft POS:                 Iniciado en simultaneo
echo    - Mostrador Kiosco:              http://localhost:3040/
echo    - Acceso Remoto Celular Duenio:  http://localhost:3040/?rol=duenio
echo    - Planilla IberaSoft Sincronizada: %ROOT_DIR%sincronizacion_iberasoft\
echo ======================================================================
echo  (Podes minimizar esta ventana. Nora queda activa atendiendo el local).
echo.
ping 127.0.0.1 -n 4 >nul
exit /b 0
