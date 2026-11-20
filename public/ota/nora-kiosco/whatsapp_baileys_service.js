/**
 * whatsapp_baileys_service.js - Motor Real de WhatsApp Multi-Device (Dispositivos Vinculados)
 * Permite asignar un número/chip de WhatsApp directamente al Kiosco escaneando el QR Ámbar
 * desde: WhatsApp -> 3 puntitos -> Dispositivos vinculados -> Vincular un dispositivo.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './database.js';
import { noraAgents } from './nora_kiosco_agents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, 'data', 'whatsapp_auth_session');

class WhatsAppKioscoService {
  constructor() {
    this.sock = null;
    this.qrDataUrl = '';
    this.status = 'INICIANDO_MOTOR_QR';
    this.linked = false;
    this.linkedPhone = '';
    this.linkedName = '';
    this.linkedAt = null;
    this.onStateChange = null;
    this.isConnecting = false;
  }

  getState() {
    return {
      linked: this.linked,
      mode: this.status,
      qrDataUrl: this.qrDataUrl,
      linkedPhone: this.linkedPhone,
      linkedName: this.linkedName,
      linkedAt: this.linkedAt
    };
  }

  notifyChange() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.getState());
    }
  }

  async iniciarSesionWhatsApp() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      let version = [2, 3000, 1015901307];
      try {
        const latest = await fetchLatestBaileysVersion();
        if (latest && latest.version) version = latest.version;
      } catch (e) {
        // Fallback versión estable
      }

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Nora AI x IberaSoft (Kiosco)', 'Chrome', '122.0.0']
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, {
              width: 240,
              margin: 2,
              color: { dark: '#0b0f19', light: '#ffffff' }
            });
            this.linked = false;
            this.status = 'ESPERANDO_ESCANEO_DISPOSITIVOS_VINCULADOS';
            this.notifyChange();
          } catch (err) {
            console.error('[WhatsApp Baileys] Error generando QR DataURL:', err.message);
          }
        }

        if (connection === 'open') {
          this.isConnecting = false;
          this.linked = true;
          this.qrDataUrl = '';
          this.status = 'VINCULADO_DISPOSITIVO_OFICIAL';
          const rawId = this.sock?.user?.id || '';
          this.linkedPhone = '+' + rawId.split(':')[0].split('@')[0];
          this.linkedName = this.sock?.user?.name || 'WhatsApp Kiosco';
          this.linkedAt = new Date().toLocaleTimeString('es-AR');

          console.log(` ✅ [WHATSAPP KIOSCO VINCULADO]: ${this.linkedPhone} (${this.linkedName})`);
          db.registrarMensajeWhatsApp({
            direccion: 'SALIENTE_DUENIO',
            remitente: 'Nora AI (Motor WhatsApp Multi-Device)',
            destinatario: `Kiosco (${this.linkedPhone})`,
            mensaje: `✅ Número de WhatsApp ${this.linkedPhone} (${this.linkedName}) vinculado oficialmente a Nora AI. Cualquier foto de factura que envíes a este número será leída automáticamente por Visión IA.`,
            tipoAlerta: 'INFO'
          });
          this.notifyChange();
        }

        if (connection === 'close') {
          this.isConnecting = false;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (!shouldReconnect) {
            // Sesión cerrada desde el celular -> limpiar carpeta y generar nuevo QR
            this.limpiarYReiniciarQR();
          } else {
            this.status = 'RECONECTANDO_WHATSAPP';
            this.notifyChange();
            setTimeout(() => this.iniciarSesionWhatsApp(), 3500);
          }
        }
      });

      // ESCUCHAR FOTOS DE FACTURAS Y MENSAJES ENTRANTES AL WHATSAPP DEL KIOSCO
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
          try {
            if (!msg.message) continue;
            const remoteJid = msg.key.remoteJid || '';
            if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;

            const senderNumber = '+' + remoteJid.split('@')[0];
            const imgMsg = msg.message.imageMessage;

            // Si alguien envía una FOTO al WhatsApp del Kiosco (o desde el mismo celular a "Mensajes consigo mismo")
            if (imgMsg) {
              const caption = (imgMsg.caption || '').toLowerCase();
              // Evitar bucle si no es del usuario o si no parece comprobante
              const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: this.sock.updateMediaMessage }
              );

              if (buffer && buffer.length > 0) {
                const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                db.registrarMensajeWhatsApp({
                  direccion: 'ENTRANTE_OPERADOR',
                  remitente: `WhatsApp (${senderNumber})`,
                  destinatario: 'Nora AI (Visión OCR)',
                  mensaje: `📸 Foto de comprobante recibida por WhatsApp ${caption ? `("${caption}")` : ''}. Procesando con Groq Vision...`,
                  tipoAlerta: 'FACTURA_RECIBIDA'
                });
                this.notifyChange();

                let agentsInstance = noraAgents;
                try {
                  const dyn = await import(`./nora_kiosco_agents.js?v=${Date.now()}`);
                  if (dyn && dyn.noraAgents) {
                    agentsInstance = dyn.noraAgents;
                  }
                } catch (_) {}

                const resVision = await agentsInstance.leerFacturaConCamara({
                  imageBase64: base64Image,
                  origen: 'WHATSAPP_OPERADOR',
                  operarioCaptura: `WhatsApp ${senderNumber}`
                });

                if (resVision.ok && resVision.borrador) {
                  const b = resVision.borrador;
                  await this.sock.sendMessage(remoteJid, {
                    text: `🤖 *Nora AI x IberáSoft POS*\n\n✅ Leí el comprobante de *${b.proveedor}* (${b.tipo_comprobante} ${b.numero_comprobante}).\n• *Total Facturado:* $${b.total_facturado.toLocaleString('es-AR')} ARS\n• *Artículos detectados:* ${b.items.length}\n\n👉Ya está cargado en la pantalla de Pre-Aprobación para que tildes qué mercadería llegó realmente y actualices stock y precios en IberáSoft.`
                  });
                }
                this.notifyChange();
              }
            }
          } catch (err) {
            console.warn('[WhatsApp Incoming Msg Warning]:', err.message);
          }
        }
      });
    } catch (e) {
      this.isConnecting = false;
      console.error('[WhatsApp Baileys Init Error]:', e.message);
      this.status = 'ERROR_REINTENTANDO';
      setTimeout(() => this.iniciarSesionWhatsApp(), 5000);
    }
  }

  /**
   * Envía un mensaje de WhatsApp real al número del dueño (si el dispositivo está vinculado)
   */
  async enviarWhatsAppAlDuenio(texto) {
    if (!this.linked || !this.sock) return false;
    try {
      const cfg = db.getConfig();
      const rawPhone = String(cfg.telefono_duenio || '').replace(/[^0-9]/g, '');
      if (!rawPhone || rawPhone.length < 10 || rawPhone.endsWith('00000000')) {
        return false;
      }
      const jid = `${rawPhone}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text: `🤖 *Nora AI (Kiosco)*\n${texto}` });
      return true;
    } catch (e) {
      console.warn('[WhatsApp Outgoing Warning]:', e.message);
      return false;
    }
  }

  /**
   * Envía un mensaje al propio número vinculado ("Mensajes contigo mismo") y al dueño si está configurado.
   */
  async enviarAvisoPropioYDuenio(texto) {
    if (!this.linked || !this.sock) return false;
    let enviado = false;
    try {
      const propio = String(this.linkedPhone || '').replace(/[^0-9]/g, '');
      if (propio.length >= 10) {
        await this.sock.sendMessage(`${propio}@s.whatsapp.net`, { text: `🤖 *Nora AI (Kiosco)*\n${texto}` });
        enviado = true;
      }
    } catch (e) {
      console.warn('[WhatsApp Aviso Propio Warning]:', e.message);
    }
    const alDuenio = await this.enviarWhatsAppAlDuenio(texto);
    return enviado || alDuenio;
  }

  /**
   * Desvincula el número actual y genera un Código QR limpio para vincular otro celular
   */
  async limpiarYReiniciarQR() {
    try {
      if (this.sock) {
        try { await this.sock.logout(); } catch (e) {}
        try { this.sock.end(); } catch (e) {}
      }
    } catch (e) {}

    this.sock = null;
    this.linked = false;
    this.linkedPhone = '';
    this.linkedName = '';
    this.qrDataUrl = '';
    this.isConnecting = false;
    this.status = 'GENERANDO_NUEVO_QR';
    this.notifyChange();

    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
    } catch (e) {}

    setTimeout(() => this.iniciarSesionWhatsApp(), 800);
  }
}

export const whatsappService = new WhatsAppKioscoService();
export default whatsappService;
