/**
 * server.js - Servidor Central del Tren Agéntico Nexora One ("By Nora") para Kioscos + IberáSoft
 * Puerto: 3040 (Unificado: API + WebSockets Tiempo Real + Panel Mostrador + Panel Móvil Dueño)
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './database.js';
import { iberaBridge } from './ibera_bridge.js';
import { noraAgents } from './nora_kiosco_agents.js';
import { whatsappService } from './whatsapp_baileys_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const COMPROBANTES_DIR = path.resolve(__dirname, '..', 'comprobantes_contador');
const SYNC_DIR = path.resolve(__dirname, '..', 'sincronizacion_iberasoft');

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Archivos estáticos e imágenes de comprobantes para el contador
app.use(express.static(PUBLIC_DIR));
app.use('/comprobantes', express.static(COMPROBANTES_DIR));
app.use('/iberasoft-sync', express.static(SYNC_DIR));

function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

let REMOTE_TUNNEL_URL = '';
let TUNNEL_STATUS = 'INICIANDO_TUNEL_HTTPS';
let TUNNEL_CHILD = null;

/**
 * Guarda el link del túnel en disco y lo manda por WhatsApp (al propio número del kiosco y al dueño),
 * así después de cada reinicio el link nuevo llega solo al celular.
 */
function notificarNuevoTunel(url) {
  try {
    const dataDir = path.resolve(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'ultimo_tunel.txt'), `${url}/?rol=duenio`, 'utf8');
  } catch (_) { }

  let intentos = 0;
  const intentar = async () => {
    intentos++;
    if (url !== REMOTE_TUNNEL_URL) return; // ya cambió, no mandar link viejo
    if (whatsappService.linked && typeof whatsappService.enviarAvisoPropioYDuenio === 'function') {
      const ok = await whatsappService.enviarAvisoPropioYDuenio(
        `🔗 *Nuevo link de acceso remoto del Kiosco*\nEl sistema se reinició. Usá este enlace para entrar desde el celular:\n${url}/?rol=duenio`
      );
      if (ok) return;
    }
    if (intentos < 40) setTimeout(intentar, 6000);
  };
  setTimeout(intentar, 4000);
}

function cerrarTunelHijo() {
  try { if (TUNNEL_CHILD && !TUNNEL_CHILD.killed) TUNNEL_CHILD.kill(); } catch (_) { }
}
process.on('exit', cerrarTunelHijo);
process.on('SIGINT', () => { cerrarTunelHijo(); process.exit(0); });
const NEXORA_MASTER_KEY = process.env.NEXORA_MASTER_KEY || 'NEXORA-MASTER-2026';

// Conectar callbacks en tiempo real del motor Baileys WhatsApp Multi-Device
whatsappService.onStateChange = () => {
  broadcastStateUpdate('WHATSAPP_BAILEYS_UPDATE');
};

/**
 * Inicia automáticamente un túnel HTTPS seguro (4G/5G/WiFi) sin requerir abrir puertos en el router ni firewall
 */
function iniciarTunelRemotoAutomatico(port) {
  const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');

  // Si cloudflared.exe está disponible y completo (> 15 MB), usarlo; si no, usar OpenSSH nativo de Windows (localhost.run)
  let useCloudflared = false;
  try {
    if (fs.existsSync(cloudflaredPath) && fs.statSync(cloudflaredPath).size > 15 * 1024 * 1024) {
      useCloudflared = true;
    }
  } catch (e) {
    useCloudflared = false;
  }

  if (useCloudflared) {
    console.log('[Túnel Remoto 4G] Iniciando Cloudflare Tunnel HTTPS...');
    const cf = spawn(cloudflaredPath, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
      windowsHide: true
    });

    TUNNEL_CHILD = cf;
    const parseCfOutput = (chunk) => {
      const txt = chunk.toString();
      const match = txt.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && match[0] !== REMOTE_TUNNEL_URL && !match[0].includes('api.trycloudflare')) {
        REMOTE_TUNNEL_URL = match[0];
        TUNNEL_STATUS = 'ACTIVO_CLOUDFLARE_HTTPS';
        console.log(` 📱 [ACCESO CELULAR 4G/WIFI ACTIVO]: ${REMOTE_TUNNEL_URL}/?rol=duenio`);
        broadcastStateUpdate('TUNNEL_READY');
        notificarNuevoTunel(REMOTE_TUNNEL_URL);
      }
    };

    cf.stdout.on('data', parseCfOutput);
    cf.stderr.on('data', parseCfOutput);
    cf.on('error', () => iniciarTunelSSHFallback(port));
  } else {
    iniciarTunelSSHFallback(port);
  }
}

function iniciarTunelSSHFallback(port) {
  console.log('[Túnel Remoto 4G] Iniciando túnel HTTPS vía OpenSSH (localhost.run)...');
  const ssh = spawn(
    'ssh',
    [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-R', `80:127.0.0.1:${port}`,
      'nokey@localhost.run'
    ],
    { windowsHide: true }
  );

  const parseSshOutput = (chunk) => {
    const txt = chunk.toString();
    const match = txt.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    if (match && match[0] !== REMOTE_TUNNEL_URL) {
      REMOTE_TUNNEL_URL = match[0];
      TUNNEL_STATUS = 'ACTIVO_HTTPS_4G';
      console.log(` 📱 [ACCESO CELULAR 4G/WIFI ACTIVO]: ${REMOTE_TUNNEL_URL}/?rol=duenio`);
      broadcastStateUpdate('TUNNEL_READY');
    }
  };

  ssh.stdout.on('data', parseSshOutput);
  ssh.stderr.on('data', parseSshOutput);
}

/**
 * Empaqueta el estado completo en tiempo real para sincronizar Mostrador y Celular del Dueño
 */
function buildFullKioscoState() {
  return {
    config: db.getConfig(),
    iberaStatus: iberaBridge.lastScan || iberaBridge.detectarInstalacionIberaSoft(),
    operarios: db.getOperarios(),
    turnoActivo: db.getTurnoActivo(),
    movimientosCaja: db.getMovimientosTurnoActual(),
    historialTurnos: db.getHistorialTurnos(15),
    articulos: db.getArticulos(),
    faltantes: db.getFaltantesStockMinimo(),
    facturas: db.getFacturasRemitos(),
    notasCreditoPendientes: db.getNotasCreditoPendientes(),
    libroDiario: db.getLibroDiario(),
    whatsappFeed: db.getMensajesWhatsApp(40),
    copilotManuals: db.getCopilotManuals(),
    localIp: getLocalIpAddress(),
    port: PORT,
    remoteTunnelUrl: REMOTE_TUNNEL_URL,
    tunnelStatus: TUNNEL_STATUS,
    whatsappBridge: whatsappService.getState(),
    licencia: db.getEstadoLicencia(),
    versionInfo: getLocalVersionInfo()
  };
}

function broadcastStateUpdate(eventReason = 'STATE_UPDATED') {
  io.emit('kiosco:state', {
    reason: eventReason,
    state: buildFullKioscoState()
  });
}

// =========================================================================
// ENDPOINTS REST DEL TREN AGÉNTICO NEXORA ONE (KIOSCOS + IBERÁSOFT)
// =========================================================================

// 1. Estado General & Diagnóstico del Puente IberáSoft
app.get('/api/state', (req, res) => {
  res.json({ ok: true, state: buildFullKioscoState() });
});

app.post('/api/iberasoft/scan', (req, res) => {
  const scan = iberaBridge.detectarInstalacionIberaSoft();
  broadcastStateUpdate('IBERASOFT_SCANNED');
  res.json({ ok: true, scan });
});

app.post('/api/config', (req, res) => {
  const cfg = db.updateConfig(req.body || {});
  broadcastStateUpdate('CONFIG_UPDATED');
  res.json({ ok: true, config: cfg });
});

// 1.1 Estado y Control de Licencia / Suscripción
app.get('/api/licencia', (req, res) => {
  res.json({ ok: true, licencia: db.getEstadoLicencia() });
});

app.post('/api/licencia/reactivar', (req, res) => {
  const { masterKey, dias, override } = req.body || {};
  if (masterKey !== NEXORA_MASTER_KEY) {
    return res.status(401).json({ ok: false, error: 'CLAVE_MAESTRA_INVALIDA', mensaje: 'Clave Maestra incorrecta.' });
  }
  if (override) {
    db.updateConfig({ licencia_estado_override: override });
  }
  const lic = db.reactivarLicencia(Number(dias) || 30);
  broadcastStateUpdate('LICENCIA_ACTUALIZADA');
  res.json({ ok: true, licencia: lic, mensaje: 'Licencia reactivada correctamente por 30 días.' });
});

app.post('/api/licencia/simular-estado', (req, res) => {
  const { estado, masterKey } = req.body || {};
  if (masterKey !== NEXORA_MASTER_KEY) {
    return res.status(401).json({ ok: false, error: 'CLAVE_MAESTRA_INVALIDA' });
  }
  db.updateConfig({ licencia_estado_override: estado || 'auto' });
  const lic = db.getEstadoLicencia();
  broadcastStateUpdate('LICENCIA_ACTUALIZADA');
  res.json({ ok: true, licencia: lic });
});

// Middleware guard para bloquear operaciones operativas si el servicio está suspendido (+5 días de gracia superados)
function checkLicenciaActiva(req, res, next) {
  const lic = db.getEstadoLicencia();
  if (lic.suspendida) {
    return res.status(403).json({
      ok: false,
      error: 'LICENCIA_SUSPENDIDA',
      mensaje: 'El servicio se encuentra temporalmente suspendido por suscripción vencida (período de gracia de 5 días expirado). Regularizá tu abono con el link de pago o contactá a soporte técnico.',
      licencia: lic
    });
  }
  next();
}

// 2. Lectura de Facturas y Remitos con Cámara / WhatsApp / Celular Dueño
app.post('/api/nora/leer-factura', checkLicenciaActiva, async (req, res) => {
  try {
    const { imageBase64, origen, operarioCaptura, margenPct, presetDemo } = req.body || {};
    let agentsInstance = noraAgents;
    try {
      const dyn = await import(`./nora_kiosco_agents.js?v=${Date.now()}`);
      if (dyn && dyn.noraAgents) {
        agentsInstance = dyn.noraAgents;
      }
    } catch (_) { }

    const resultado = await agentsInstance.leerFacturaConCamara({
      imageBase64,
      origen: origen || 'CAMARA_KIOSCO',
      operarioCaptura: operarioCaptura || 'Operador',
      margenPct: margenPct !== undefined && margenPct !== '' ? Number(margenPct) : null,
      presetDemo: presetDemo || null
    });
    broadcastStateUpdate('FACTURA_BORRADOR_CREADO');
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 3. Aprobación de Factura con Selección de Mercadería Recibida vs. Descartada (Nota de Crédito)
app.post('/api/facturas/:id/aprobar', (req, res) => {
  try {
    const { itemsModificados, margenGlobalPct, redondeoMultiplo, aprobadoPor, pagadoDesdeCaja, medioPago } = req.body || {};
    const result = db.aprobarFacturaEImpactarStock({
      facturaId: req.params.id,
      itemsModificados,
      margenGlobalPct,
      redondeoMultiplo,
      aprobadoPor: aprobadoPor || 'Operador',
      pagadoDesdeCaja: Boolean(pagadoDesdeCaja),
      medioPago: medioPago || 'CUENTA_CORRIENTE'
    });
    broadcastStateUpdate('FACTURA_APROBADA_STOCK_ACTUALIZADO');
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 4. Saldar Nota de Crédito Pendiente (Mercadería que no había venido en entregas previas)
app.post('/api/notas-credito/:id/saldar', (req, res) => {
  try {
    const { numeroNotaCredito } = req.body || {};
    const nc = db.saldarNotaCreditoPendiente({
      ncId: req.params.id,
      numeroNotaCredito
    });
    broadcastStateUpdate('NOTA_CREDITO_SALDADA');
    res.json({ ok: true, notaCredito: nc });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 5. Stock de IberáSoft, Límites Mínimos y Simulación/Sincronización de Ventas de Mostrador
app.post('/api/stock/venta-mostrador', (req, res) => {
  try {
    const { articuloId, cantidad, medioPago } = req.body || {};
    const result = db.registrarVentaMostradorIberaSoft({
      articuloId,
      cantidad: Number(cantidad) || 1,
      medioPago: medioPago || 'EFECTIVO'
    });
    broadcastStateUpdate('VENTA_MOSTRADOR_IBERASOFT');
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.put('/api/stock/:id', (req, res) => {
  try {
    const art = db.actualizarLimiteMinimoYMargen({
      articuloId: req.params.id,
      stockMinimo: req.body.stockMinimo,
      margenPct: req.body.margenPct,
      precioVenta: req.body.precioVenta
    });
    broadcastStateUpdate('ARTICULO_ACTUALIZADO');
    res.json({ ok: true, articulo: art });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/stock', (req, res) => {
  try {
    const articulos = db.crearArticuloManual(req.body || {});
    broadcastStateUpdate('ARTICULO_CREADO');
    res.json({ ok: true, articulos });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete('/api/stock/:id', (req, res) => {
  try {
    const articulos = db.eliminarArticulo(req.params.id);
    broadcastStateUpdate('ARTICULO_ELIMINADO');
    res.json({ ok: true, articulos });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/iberasoft/importar-csv', (req, res) => {
  try {
    const result = db.importarArticulosDesdeCSVIberaSoft(req.body || {});
    broadcastStateUpdate('CATALOGO_IBERASOFT_IMPORTADO');
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/iberasoft/limpiar-ejemplos', (req, res) => {
  try {
    const result = db.limpiarDatosDeEjemplo(req.body || {});
    broadcastStateUpdate('EJEMPLOS_LIMPIADOS');
    res.json(result);
  } catch (err) {
    res.status(403).json({ ok: false, error: err.message });
  }
});

app.post('/api/iberasoft/restaurar-ejemplos', (req, res) => {
  try {
    const result = db.restaurarDatosDeEjemplo(req.body || {});
    broadcastStateUpdate('EJEMPLOS_RESTAURADOS');
    res.json(result);
  } catch (err) {
    res.status(403).json({ ok: false, error: err.message });
  }
});

app.post(['/api/iberasoft/restaurar-catalogo-kiosco', '/api/iberasoft/restaurar-lubricentro'], (req, res) => {
  try {
    const csvFile = path.resolve(__dirname, '..', 'sincronizacion_iberasoft', 'lista_precios_stock_iberasoft.csv');
    if (fs.existsSync(csvFile)) {
      const csvText = fs.readFileSync(csvFile, 'utf8');
      const result = db.importarArticulosDesdeCSVIberaSoft({ csvText, reemplazarCatalogoActual: true });
      broadcastStateUpdate('CATALOGO_KIOSCO_RESTAURADO');
      return res.json({ ok: true, message: `Catálogo de ${result.totalArticulos} artículos del Kiosco cargado exitosamente.`, ...result });
    }
    throw new Error('No se encontró la planilla lista_precios_stock_iberasoft.csv.');
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/facturas/:id', (req, res) => {
  try {
    const facturas = db.eliminarFactura(req.params.id);
    broadcastStateUpdate('FACTURA_ELIMINADA');
    res.json({ ok: true, facturas });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete('/api/notas-credito/:id', (req, res) => {
  try {
    const notasCredito = db.eliminarNotaCredito(req.params.id);
    broadcastStateUpdate('NOTA_CREDITO_ELIMINADA');
    res.json({ ok: true, notasCredito });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete('/api/operarios/:id', (req, res) => {
  try {
    const operarios = db.eliminarOperario(req.params.id);
    broadcastStateUpdate('OPERARIO_ELIMINADO');
    res.json({ ok: true, operarios });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete('/api/copilot/:id', (req, res) => {
  try {
    const manuales = db.eliminarGuiaCopilot({
      guiaId: req.params.id,
      pinDuenio: req.body?.pinDuenio || req.query?.pinDuenio || ''
    });
    broadcastStateUpdate('COPILOT_GUIA_ELIMINADA');
    res.json({ ok: true, manuales });
  } catch (err) {
    res.status(403).json({ ok: false, error: err.message });
  }
});

// 6. Control de Caja Diaria y Turnos por Nombre de Operario
app.post('/api/turnos/abrir', (req, res) => {
  try {
    const { operarioNombre, turnoTipo, montoInicial } = req.body || {};
    const turno = db.abrirTurnoCaja({
      operarioNombre,
      turnoTipo,
      montoInicial
    });
    broadcastStateUpdate('TURNO_ABIERTO');
    res.json({ ok: true, turno });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/turnos/movimiento', (req, res) => {
  try {
    const { tipo, medioPago, monto, descripcion } = req.body || {};
    const turno = db.registrarMovimientoCajaManual({
      tipo,
      medioPago,
      monto,
      descripcion
    });
    broadcastStateUpdate('CAJA_MOVIMIENTO');
    res.json({ ok: true, turno });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/turnos/cerrar', (req, res) => {
  try {
    const { montoDeclaradoEfectivo, notasCierre } = req.body || {};
    const turnoCerrado = db.cerrarTurnoCaja({
      montoDeclaradoEfectivo,
      notasCierre
    });
    broadcastStateUpdate('TURNO_CERRADO');
    res.json({ ok: true, turnoCerrado });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/operarios', (req, res) => {
  try {
    const operarios = db.crearOperario(req.body || {});
    broadcastStateUpdate('OPERARIO_CREADO');
    res.json({ ok: true, operarios });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 7. Exportación del Libro Diario Contable Mensual para el Contador (Excel CSV)
app.get('/api/contabilidad/libro-diario.csv', (req, res) => {
  const mes = req.query.mes || '';
  const csv = db.generarCSVLibroDiarioContador(mes);
  const filename = `Libro_Diario_Contador_Kiosco_${mes || new Date().toISOString().slice(0, 7)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// 8. Exportación de Lista de Precios y Stock para IberáSoft POS (CSV)
app.get('/api/iberasoft/lista-actualizada.csv', (req, res) => {
  const csvPath = db.exportarCSVCompatibleIberaSoft();
  res.download(csvPath, 'IberaSoft_Stock_Y_Precios_Actualizados.csv');
});

// 9. Conversación y Comandos por Voz con Nora COO
app.post('/api/nora/chat', async (req, res) => {
  try {
    const { textoUsuario, operarioActual, rol } = req.body || {};
    const resp = await noraAgents.procesarComandoConversacional({
      textoUsuario,
      operarioActual,
      rol
    });
    broadcastStateUpdate('NORA_VOICE_INTERACTION');
    res.json(resp);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 10. Envío de Reporte de Faltantes por WhatsApp al Dueño / Proveedores
app.post('/api/whatsapp/enviar-faltantes', (req, res) => {
  const faltantes = db.getFaltantesStockMinimo();
  const detalle = faltantes.length > 0
    ? faltantes.map((f) => `• ${f.nombre}: quedan ${f.stock_actual} (Mín: ${f.stock_minimo}) -> Pedir ${f.cantidad_sugerida_pedido} u. [${f.proveedor}]`).join(' | ')
    : 'Sin faltantes críticos.';

  const msg = db.registrarMensajeWhatsApp({
    direccion: 'SALIENTE_DUENIO',
    remitente: 'Nora AI (Informe Faltantes)',
    destinatario: 'Dueño del Kiosco',
    mensaje: `📋 [INFORME DE FALTANTES AL LÍMITE MÍNIMO (${faltantes.length} productos)]: ${detalle}`,
    tipoAlerta: 'STOCK_MINIMO'
  });

  broadcastStateUpdate('WHATSAPP_FALTANTES_ENVIADO');
  res.json({ ok: true, mensajeRegistrado: msg, faltantes });
});

// 11. Modo Nora Copilot: Consulta Paso a Paso (IberáSoft + Panel Nora)
app.post('/api/copilot/query', async (req, res) => {
  try {
    const { pregunta, operarioActual } = req.body || {};
    const result = await noraAgents.consultarCopilot({ pregunta, operarioActual });
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 12. Modo Nora Copilot: Actualizar / Enseñar Conocimiento (Blindado con PIN del Dueño)
app.post('/api/copilot/learn', (req, res) => {
  try {
    const manuales = db.guardarConocimientoCopilot(req.body || {});
    broadcastStateUpdate('COPILOT_KNOWLEDGE_UPDATED');
    res.json({ ok: true, manuales });
  } catch (err) {
    res.status(403).json({ ok: false, error: err.message });
  }
});

// 13. Modo Nora Copilot: Aprender Pantalla de IberáSoft por Foto / Captura (Exclusivo Dueño)
app.post('/api/copilot/learn-vision', async (req, res) => {
  try {
    const result = await noraAgents.aprenderProcedimientoDesdeImagen(req.body || {});
    broadcastStateUpdate('COPILOT_VISION_LEARNED');
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 14. Vinculación de Puente WhatsApp QR Multi-Device Real (Baileys)
app.post('/api/whatsapp/vincular', async (req, res) => {
  const { accion } = req.body || {};
  if (accion === 'regenerar_qr' || accion === 'desvincular') {
    await whatsappService.limpiarYReiniciarQR();
  } else {
    await whatsappService.iniciarSesionWhatsApp();
  }
  broadcastStateUpdate('WHATSAPP_QR_UPDATED');
  res.json({ ok: true, whatsappBridge: whatsappService.getState() });
});

// 15. CONSOLA DE SOPORTE REMOTO Y ACTUALIZACIONES OTA (EXCLUSIVO NEXORA DEVELOPER)
app.post('/api/nexora-support/diagnostics', (req, res) => {
  const { masterKey } = req.body || {};
  if (masterKey !== NEXORA_MASTER_KEY) {
    return res.status(403).json({ ok: false, error: 'Clave Maestra de Soporte Nexora inválida.' });
  }
  const scan = iberaBridge.detectarInstalacionIberaSoft();
  res.json({
    ok: true,
    hostname: os.hostname(),
    platform: os.platform(),
    uptimeSeconds: process.uptime(),
    remoteTunnelUrl: REMOTE_TUNNEL_URL,
    iberaScan: scan,
    whatsappState: whatsappService.getState(),
    config: db.getConfig()
  });
});

app.post('/api/nexora-support/apply-patch', (req, res) => {
  const { masterKey, relativeFilePath, newContent, configUpdates, isBase64 } = req.body || {};
  if (masterKey !== NEXORA_MASTER_KEY) {
    return res.status(403).json({ ok: false, error: 'Clave Maestra de Soporte Nexora inválida.' });
  }

  try {
    const rootDir = path.resolve(__dirname, '..');
    let patchedFile = null;

    if (relativeFilePath && typeof newContent === 'string') {
      const safeTarget = path.resolve(rootDir, relativeFilePath);
      if (!safeTarget.startsWith(rootDir)) {
        throw new Error('Ruta fuera del directorio del proyecto.');
      }
      // Backup automático antes de aplicar parche OTA
      if (fs.existsSync(safeTarget)) {
        fs.copyFileSync(safeTarget, `${safeTarget}.bak`);
      }
      const dataToWrite = isBase64 ? Buffer.from(newContent, 'base64') : Buffer.from(newContent, 'utf8');
      fs.writeFileSync(safeTarget, dataToWrite);
      patchedFile = relativeFilePath;
    }

    if (configUpdates && typeof configUpdates === 'object') {
      db.updateConfig(configUpdates);
    }

    broadcastStateUpdate('NEXORA_OTA_PATCH_APPLIED');
    res.json({
      ok: true,
      patchedFile,
      message: 'Actualización remota Nexora OTA aplicada con éxito en la PC del cliente.'
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Reinicio remoto del servidor (el .bat lo vuelve a levantar solo en 3 segundos)
app.post('/api/nexora-support/restart', (req, res) => {
  const { masterKey } = req.body || {};
  if (masterKey !== NEXORA_MASTER_KEY) {
    return res.status(403).json({ ok: false, error: 'Clave Maestra de Soporte Nexora inválida.' });
  }
  res.json({ ok: true, message: 'Reiniciando servidor Nora. El link remoto nuevo llegará por WhatsApp.' });
  setTimeout(() => {
    cerrarTunelHijo();
    process.exit(0);
  }, 1500);
});

// =========================================================================
// 16. SISTEMA DE AUTO-ACTUALIZACIÓN SILENCIOSA EN REMOTO (NEXORA PERIMETER OTA)
// =========================================================================
function compararVersiones(v1, v2) {
  const p1 = (v1 || '0').split('.').map(Number);
  const p2 = (v2 || '0').split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function getLocalVersionInfo() {
  const versionPath = path.resolve(__dirname, '..', 'version.json');
  let info = {
    systemId: 'nora-kiosco-iberasoft',
    version: '1.2.0',
    releaseDate: '2026-11-19',
    channel: 'production',
    otaManifestUrl: 'https://nexora-store-app.vercel.app/ota/nora-kiosco/manifest.json'
  };
  if (fs.existsSync(versionPath)) {
    try {
      info = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    } catch { }
  }
  return info;
}

async function verificarYDescargarActualizacionesOTA(forzar = false) {
  try {
    const versionPath = path.resolve(__dirname, '..', 'version.json');
    const localInfo = getLocalVersionInfo();
    const manifestUrl = localInfo.otaManifestUrl || 'https://nexora-store-app.vercel.app/ota/nora-kiosco/manifest.json';

    console.log(`[Nexora OTA] Consultando canal de actualización en ${manifestUrl}...`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let res;
    try {
      res = await fetch(manifestUrl, { signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } });
    } finally {
      clearTimeout(timer);
    }

    if (!res || !res.ok) {
      console.log(`[Nexora OTA] Canal de actualización remoto respondió status ${res ? res.status : 'timeout'}. Continúa con versión local.`);
      return { ok: false, razon: `HTTP_${res ? res.status : 'TIMEOUT'}` };
    }

    const remoteManifest = await res.json();
    if (!remoteManifest || !remoteManifest.version) {
      return { ok: false, razon: 'MANIFEST_INVALIDO' };
    }

    const esMasNueva = compararVersiones(remoteManifest.version, localInfo.version) > 0;
    if (!esMasNueva && !forzar) {
      console.log(`[Nexora OTA] Sistema al día (v${localInfo.version}).`);
      return { ok: true, actualizada: false, version: localInfo.version };
    }

    console.log(`🚀 [Nexora OTA] Actualización encontrada: v${remoteManifest.version} (Local: v${localInfo.version}). Descargando parches...`);
    const rootDir = path.resolve(__dirname, '..');
    const archivosActualizados = [];

    if (remoteManifest.files && typeof remoteManifest.files === 'object') {
      for (const [relPath, fileUrl] of Object.entries(remoteManifest.files)) {
        try {
          const fileRes = await fetch(fileUrl, { headers: { 'Cache-Control': 'no-cache' } });
          if (fileRes.ok) {
            const arrBuf = await fileRes.arrayBuffer();
            const targetPath = path.resolve(rootDir, relPath);
            if (targetPath.startsWith(rootDir)) {
              if (fs.existsSync(targetPath)) {
                fs.copyFileSync(targetPath, `${targetPath}.bak`);
              }
              fs.writeFileSync(targetPath, Buffer.from(arrBuf));
              archivosActualizados.push(relPath);
            }
          }
        } catch (fileErr) {
          console.error(`[Nexora OTA] Error descargando archivo ${relPath}:`, fileErr.message);
        }
      }
    }

    localInfo.version = remoteManifest.version;
    localInfo.releaseDate = remoteManifest.releaseDate || new Date().toISOString().split('T')[0];
    localInfo.changelog = remoteManifest.changelog || 'Actualización remota aplicada con éxito.';
    fs.writeFileSync(versionPath, JSON.stringify(localInfo, null, 2), 'utf8');

    console.log(`✅ [Nexora OTA] Sistema actualizado exitosamente a v${remoteManifest.version}. Archivos: ${archivosActualizados.join(', ')}`);
    broadcastStateUpdate('OTA_UPDATE_COMPLETED');
    io.emit('nora:ota-updated', {
      version: remoteManifest.version,
      changelog: localInfo.changelog,
      archivos: archivosActualizados
    });

    return { ok: true, actualizada: true, version: remoteManifest.version, archivos: archivosActualizados };
  } catch (err) {
    console.log('[Nexora OTA] Sin conexión o verificación omitida (modo offline):', err.message);
    return { ok: false, error: err.message };
  }
}

// Endpoints REST de OTA
app.get('/api/ota/version', (req, res) => {
  res.json({ ok: true, ...getLocalVersionInfo() });
});

app.post('/api/ota/check', async (req, res) => {
  const result = await verificarYDescargarActualizacionesOTA(req.body?.forzar === true);
  res.json(result);
});

io.on('connection', (socket) => {
  socket.emit('kiosco:state', {
    reason: 'INITIAL_CONNECT',
    state: buildFullKioscoState()
  });
});

const PORT = Number(process.env.KIOSCO_PORT) || 3040;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIpAddress();
  console.log('======================================================================');
  console.log(' 🚆 TREN AGÉNTICO NEXORA ONE ("BY NORA") - KIOSCOS + IBERÁSOFT POS');
  console.log(` 🏪 Panel Mostrador Kiosco:   http://localhost:${PORT}`);
  console.log(` 📱 Panel Celular (WiFi LAN): http://${ip}:${PORT}/?rol=duenio`);
  console.log(` 🛠️ Consola Soporte Nexora:   http://localhost:${PORT}/?soporte=nexora`);
  console.log(' 🌐 Iniciando Túnel HTTPS 4G/WiFi y Motor WhatsApp Multi-Device...');
  console.log('======================================================================');
  iniciarTunelRemotoAutomatico(PORT);
  whatsappService.iniciarSesionWhatsApp();

  // Auto-verificación OTA en segundo plano (arranque + cada 4 horas)
  setTimeout(() => verificarYDescargarActualizacionesOTA(false), 4000);
  setInterval(() => verificarYDescargarActualizacionesOTA(false), 4 * 60 * 60 * 1000);
});
