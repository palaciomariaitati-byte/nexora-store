@echo off
title Activar Arranque Automatico de Nora AI x IberaSoft POS
color 0A

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo ======================================================================
echo    CONFIGURAR ARRANQUE AUTOMATICO AL PRENDER LA COMPUTADORA
echo             Nora AI x IberaSoft POS - 2026
echo ======================================================================
echo.
echo Al activar esta opcion, cada vez que enciendan la PC del kiosco en la
echo manana, tanto IberaSoft POS como Nora AI se abriran de manera
echo automatica sin necesidad de que el empleado toque ningun icono.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$startupFolder = $WshShell.SpecialFolders.Item('Startup'); " ^
  "$shortcutPath = Join-Path $startupFolder 'Nora_AI_x_IberaSoft_Arranque_Automatico.lnk'; " ^
  "$shortcut = $WshShell.CreateShortcut($shortcutPath); " ^
  "$shortcut.TargetPath = '%ROOT_DIR%INICIAR_SISTEMA_1_CLIC.bat'; " ^
  "$shortcut.WorkingDirectory = '%ROOT_DIR%'; " ^
  "$shortcut.IconLocation = '%ROOT_DIR%icon.ico,0'; " ^
  "$shortcut.Description = 'Arranque Automatico Kiosco - Nora AI x IberaSoft'; " ^
  "$shortcut.Save(); " ^
  "Write-Host '[OK] Acceso directo agregado a Carpeta de Inicio de Windows:' $shortcutPath"

echo.
echo ======================================================================
echo    LISTO! CONFIGURACION APLICADA CON EXITO.
echo    Al prender la PC manana abrira todo solo automaticamente.
echo ======================================================================
echo.
pause
