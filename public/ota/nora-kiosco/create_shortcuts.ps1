$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $PSScriptRoot) { $PSScriptRoot = (Get-Location).Path }

$WshShell = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    $WshShell.SpecialFolders.Item("Desktop"),
    [Environment]::GetFolderPath("Desktop"),
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\OneDrive\Escritorio",
    "$env:USERPROFILE\OneDrive\Desktop"
) | Select-Object -Unique | Where-Object { Test-Path $_ }

$iconPath = Join-Path $PSScriptRoot "icon.ico"

foreach ($desk in $desktopPaths) {
    # Eliminar el acceso directo viejo que decía Lubricentro si existe
    $oldLnk = Join-Path $desk "Nora AI - Kiosco & Lubricentro (1 Clic).lnk"
    if (Test-Path $oldLnk) { Remove-Item $oldLnk -Force }

    $lnk1 = Join-Path $desk "Nora AI - Kiosco (1 Clic).lnk"
    $s1 = $WshShell.CreateShortcut($lnk1)
    $s1.TargetPath = Join-Path $PSScriptRoot "INICIAR_SISTEMA_1_CLIC.bat"
    $s1.WorkingDirectory = $PSScriptRoot
    $s1.IconLocation = "$iconPath,0"
    $s1.Description = "Tren Agentico Nexora One (By Nora) para IberaSoft POS Kiosco - 1 Solo Clic"
    $s1.Save()

    $lnk2 = Join-Path $desk "Nora AI - Modo Remoto Celular.lnk"
    $s2 = $WshShell.CreateShortcut($lnk2)
    $s2.TargetPath = Join-Path $PSScriptRoot "ACCESO_REMOTO_CELULAR_DUENIO.bat"
    $s2.WorkingDirectory = $PSScriptRoot
    $s2.IconLocation = "$iconPath,0"
    $s2.Description = "Acceso Remoto 4G Celular Duenio"
    $s2.Save()

    Write-Host "Accesos directos de Kiosco creados en: $desk con IconLocation: $iconPath,0"
}
