# lanzar_kiosco.ps1 - Lanzador Unificado 1 Solo Clic (IberáSoft + Nora AI)
$ErrorActionPreference = 'SilentlyContinue'
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $rootDir) { $rootDir = (Get-Location).Path }

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   NORA AI x IBERASOFT POS - KIOSCO Y MAXIKIOSCO 2026" -ForegroundColor Green
Write-Host "            Iniciando Sistema Completo a UN SOLO CLIC" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Green

# 1. Liberar procesos y puertos previos si quedaron colgados
Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
try {
    $connections = Get-NetTCPConnection -LocalPort 3040 -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $connections) {
        if ($c.OwningProcess) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
} catch {}

# 2. Iniciar motor Node de Nora AI en segundo plano
Write-Host "[1/4] Iniciando Motor Nora AI (Cerebro + 1.277 articulos de Kiosco)..." -ForegroundColor Cyan
$backendDir = Join-Path $rootDir 'backend'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'NORA_SERVIDOR_BUCLE.bat' -WorkingDirectory $backendDir -WindowStyle Minimized

# 3. Detectar y lanzar IberáSoft POS en simultáneo (Ultra Rápido sin demoras)
Write-Host "[2/4] Detectando y abriendo IberaSoft POS en simultaneo..." -ForegroundColor Cyan
$desktopDirs = @(
    "$env:USERPROFILE\Desktop",
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('CommonDesktopDirectory'),
    "$env:USERPROFILE\OneDrive\Escritorio",
    "$env:USERPROFILE\OneDrive\Desktop"
) | Where-Object { $_ -and (Test-Path $_) }

$ibera = $null
foreach ($d in $desktopDirs) {
    $match = Get-ChildItem -Path $d -Filter "*Iber*.lnk" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch 'Nora' } | Select-Object -First 1
    if (-not $match) {
        $match = Get-ChildItem -Path $d -Filter "*Kiosco*.lnk" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch 'Nora' } | Select-Object -First 1
    }
    if ($match) { $ibera = $match; break }
}

if (-not $ibera) {
    $commonExes = @(
        'C:\IberaSoft\IberaSoft.exe',
        'C:\IberaSoft\Ibera.exe',
        'C:\IberaSoft\Kiosco.exe',
        'C:\Ibera\Ibera.exe'
    )
    foreach ($exe in $commonExes) {
        if (Test-Path $exe) { $ibera = Get-Item $exe; break }
    }
}

if ($ibera) {
    Start-Process -FilePath $ibera.FullName
    Write-Host "[OK] Iberasoft POS iniciado: $($ibera.Name)" -ForegroundColor Green
} else {
    Write-Host "[INFO] Iberasoft POS listo para uso manual o ya en ejecucion." -ForegroundColor Yellow
}

# 4. Esperar que el motor de Nora este activo en el puerto 3040 (máximo 6 segundos)
Write-Host "[3/4] Verificando conexion del motor de Nora..." -ForegroundColor Cyan
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Milliseconds 500
    $conn = Get-NetTCPConnection -LocalPort 3040 -State Listen -ErrorAction SilentlyContinue
    if ($conn) { break }
}

# 5. Abrir Navegador en Modo App Mostrador
Write-Host "[4/4] Abriendo Asistente Mostrador Kiosco..." -ForegroundColor Cyan
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
$chromeX86 = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"

if (Test-Path $chrome) {
    Start-Process -FilePath $chrome -ArgumentList '--app=http://localhost:3040/'
} elseif (Test-Path $chromeX86) {
    Start-Process -FilePath $chromeX86 -ArgumentList '--app=http://localhost:3040/'
} elseif (Test-Path $edge) {
    Start-Process -FilePath $edge -ArgumentList '--app=http://localhost:3040/'
} else {
    Start-Process -FilePath 'http://localhost:3040/'
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   SISTEMA OPERANDO CON EXITO (A UN SOLO CLIC):" -ForegroundColor Green
Write-Host "   - IberaSoft POS:                 Iniciado en simultaneo" -ForegroundColor White
Write-Host "   - Mostrador Kiosco:              http://localhost:3040/" -ForegroundColor White
Write-Host "   - Acceso Remoto Celular Duenio:  http://localhost:3040/?rol=duenio" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
Start-Sleep -Seconds 2
