/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE ENGINE — Generador de Paquete Local Autónomo (Offline)
 * ────────────────────────────────────────────────────────────────────
 *  Empaqueta la plataforma para computadoras de la empresa sin internet.
 *  Genera:
 *   - dist-offline/ (archivos web + servidor Node.js autónomo)
 *   - dist-offline/iniciar-nexora-local.bat (lanzador con doble clic)
 *   - dist-offline/server.js (servidor ultraliviano sin dependencias)
 * ════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
const offlineDir = path.join(rootDir, 'dist-offline');
const offlinePublicDir = path.join(offlineDir, 'public');

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║   NEXORA ONE ENGINE — GENERADOR DE DISTRIBUCIÓN LOCAL OFFLINE   ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// 1. Validar que la compilación de Vite exista
if (!fs.existsSync(distDir)) {
  console.error('❌ Error: El directorio "dist" no existe. Ejecute "npm run build" antes de empaquetar.');
  process.exit(1);
}

// 2. Limpiar y recrear directorio de destino
if (fs.existsSync(offlineDir)) {
  fs.rmSync(offlineDir, { recursive: true, force: true });
}
fs.mkdirSync(offlinePublicDir, { recursive: true });

// 3. Copiar recursivamente los archivos de dist a dist-offline/public
function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Copiando activos estáticos optimizados...');
copyRecursive(distDir, offlinePublicDir);

// 4. Generar servidor local ultraliviano en Node.js puro (cero dependencias externas)
const serverCode = `/**
 * NEXORA ONE ENGINE — Servidor Local Perimetral Autónomo
 * 100% Offline-First · Zero Cloud Dependency
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'nexora_local_db.json');

// Inicializar almacén de persistencia local en disco
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    licenses: [],
    paymentSettings: {},
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  // CORS y cabeceras de seguridad local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Local de Persistencia en Disco
  if (req.url === '/api/local/data' && req.method === 'GET') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error al leer almacén local' }));
    }
    return;
  }

  if (req.url === '/api/local/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        parsed.updatedAt = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, savedAt: parsed.updatedAt }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload JSON inválido' }));
      }
    });
    return;
  }

  // Servidor de archivos estáticos (SPA)
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(PUBLIC_DIR, reqPath);

  // Si no existe, servir index.html (fallback SPA)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Error interno del servidor perimetral.');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       NEXORA ONE ENGINE — SERVIDOR LOCAL PERIMETRAL          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('  ● Estado:     Operando 100% Offline (Sin dependencia externa)');
  console.log('  ● Acceso:     http://localhost:' + PORT);
  console.log('  ● Consola:    http://localhost:' + PORT + '/#admin');
  console.log('  ● Base Local: ' + DATA_FILE);
  console.log('────────────────────────────────────────────────────────────────');
  console.log('  Presione Ctrl + C para detener el servidor.');
});
`;

fs.writeFileSync(path.join(offlineDir, 'server.js'), serverCode, 'utf8');
console.log('✓ Servidor autónomo escrito en "dist-offline/server.js"');

// 5. Generar archivo ejecutable .bat para Windows
const batCode = `@echo off
chcp 65001 >nul
title NEXORA ONE ENGINE - TERMINAL LOCAL SOBERANA

echo ====================================================================
echo        NEXORA ONE ENGINE - INICIANDO SISTEMA LOCAL OFFLINE
echo ====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado en esta computadora.
    echo Por favor instale Node.js (https://nodejs.org) para ejecutar el servidor local.
    echo.
    pause
    exit /b 1
)

echo [1/2] Verificando servidor perimetral offline...
echo [2/2] Lanzando navegador en http://localhost:3000/#admin...
echo.

start "" http://localhost:3000/#admin

node "%~dp0server.js"

pause
`;

fs.writeFileSync(path.join(offlineDir, 'iniciar-nexora-local.bat'), batCode, 'utf8');
console.log('✓ Lanzador ejecutable escrito en "dist-offline/iniciar-nexora-local.bat"');

// 6. Archivo README explicativo para el personal de la empresa
const readmeContent = `# NEXORA ONE ENGINE — PAQUETE LOCAL PARA COMPUTADORAS DE LA EMPRESA

Este paquete permite ejecutar la plataforma Nexora One Engine en cualquier computadora con Windows sin conexión a internet ni dependencia de servidores en la nube.

## Instrucciones de Inicio Rápido:
1. Haga doble clic en el archivo \`iniciar-nexora-local.bat\`.
2. Se abrirá automáticamente el navegador en:
   - Sitio Público y App Store: \`http://localhost:3000\`
   - Consola Administrativa: \`http://localhost:3000/#admin\` (PIN de acceso soberano: \`2026\`).
3. Para apagar el servidor, simplemente cierre la ventana negra de la consola.

## Características:
- **100% Offline:** Funciona aún con cortes totales de fibra óptica y señal celular.
- **Persistencia Local:** Los cobros, licencias emitidas y configuraciones se guardan localmente en \`nexora_local_db.json\`.
- **Nora Copilot:** Guía técnica integrada para el operador en el Dashboard.
`;

fs.writeFileSync(path.join(offlineDir, 'LEEME_INSTRUCCIONES.md'), readmeContent, 'utf8');
console.log('✓ Instrucciones creadas en "dist-offline/LEEME_INSTRUCCIONES.md"');

console.log('\n✨ ¡Paquete de distribución local generado exitosamente en "dist-offline"!');

