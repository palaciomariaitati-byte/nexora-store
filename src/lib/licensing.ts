/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE ENGINE — Motor de Licenciamiento y Ciclo Soberano (30+5)
 * ────────────────────────────────────────────────────────────────────
 *  Etapas determinísticas:
 *   ● Activo:        Días 1 a 30 desde emisión/renovación.
 *   ● En Gracia:     Días 31 a 35 post-vencimiento (acceso operativo
 *                    con aviso preventivo de corte inminente).
 *   ● Suspendido:    Día 36 en adelante (corte forzoso y revocación).
 * ════════════════════════════════════════════════════════════════════
 */

import { DEFAULT_PAYMENTS, type PaymentDetails } from './noraEngine';

export type LicenseStage = 'active' | 'grace' | 'suspended' | 'trial';
export type PresencialPaymentMethod = 'cash' | 'transfer' | 'usdt';

export interface LicenseHistoryEntry {
  id: string;
  type: 'preventive_25' | 'grace_31' | 'suspension_36' | 'manual' | 'renewal' | 'grace_extended';
  channel: 'whatsapp' | 'email' | 'system';
  sentAt: string;
  detail: string;
  status: 'delivered' | 'simulated' | 'applied';
}

export interface ExtendedLicense {
  id: string;
  key: string;
  client: string;
  businessName?: string;
  whatsapp?: string;
  email?: string;
  systemId: string;
  systemName?: string;
  status: LicenseStage;
  startDate: string;
  expires: string;
  graceLimit: string;
  paymentMethod?: PresencialPaymentMethod | 'stripe' | 'crypto';
  notes?: string;
  history?: LicenseHistoryEntry[];
  assignedSystems?: string[];
}

export interface LifecycleInfo {
  stage: LicenseStage;
  label: string;
  badgeColor: string;
  borderColor: string;
  textColor: string;
  daysRemaining: number;
  graceDaysRemaining: number;
  totalCycleDay: number; // Día 1..35+
  isExpired: boolean;
  isCutoff: boolean;
}

/**
 * Calcula con precisión determinística la etapa del ciclo de 30+5 días
 */
export function getLicenseLifecycle(lic: {
  status?: string;
  startDate?: string;
  expires: string;
  graceLimit: string;
}): LifecycleInfo {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const expDate = new Date(lic.expires + 'T23:59:59');
  const graceDate = new Date(lic.graceLimit + 'T23:59:59');
  const startDate = lic.startDate ? new Date(lic.startDate + 'T00:00:00') : new Date(expDate.getTime() - 30 * 86400000);

  const diffTime = now.getTime() - startDate.getTime();
  const totalCycleDay = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // Días restantes para el fin de los 30 días
  const diffExp = expDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffExp / (1000 * 60 * 60 * 24));

  // Días restantes en el margen de 5 días de gracia
  const diffGrace = graceDate.getTime() - now.getTime();
  const graceDaysRemaining = Math.max(0, Math.ceil(diffGrace / (1000 * 60 * 60 * 24)));

  if (lic.status === 'trial') {
    const isExpired = todayStr > lic.expires;
    return {
      stage: isExpired ? 'suspended' : 'trial',
      label: isExpired ? 'Trial Vencido' : 'Trial 15 Días',
      badgeColor: isExpired ? 'bg-red-500/15' : 'bg-amber-500/15',
      borderColor: isExpired ? 'border-red-500/30' : 'border-amber-500/30',
      textColor: isExpired ? 'text-red-400' : 'text-amber-400',
      daysRemaining: Math.max(0, daysRemaining),
      graceDaysRemaining: 0,
      totalCycleDay,
      isExpired,
      isCutoff: isExpired,
    };
  }

  // Si está forzosamente marcado como suspendido o sobrepasó el límite de gracia (día 36+)
  if (lic.status === 'suspended' || todayStr > lic.graceLimit) {
    return {
      stage: 'suspended',
      label: 'Corte / Suspendido',
      badgeColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
      textColor: 'text-red-400',
      daysRemaining: 0,
      graceDaysRemaining: 0,
      totalCycleDay,
      isExpired: true,
      isCutoff: true,
    };
  }

  // Días 31 a 35: Período de gracia
  if (todayStr > lic.expires && todayStr <= lic.graceLimit) {
    return {
      stage: 'grace',
      label: `En Gracia (${graceDaysRemaining}d para Corte)`,
      badgeColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/40',
      textColor: 'text-orange-400',
      daysRemaining: 0,
      graceDaysRemaining,
      totalCycleDay,
      isExpired: true,
      isCutoff: false,
    };
  }

  // Días 1 a 30: Activo ordinario
  return {
    stage: 'active',
    label: `Activo (${daysRemaining}d restantes)`,
    badgeColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    daysRemaining: Math.max(0, daysRemaining),
    graceDaysRemaining: 5,
    totalCycleDay,
    isExpired: false,
    isCutoff: false,
  };
}

/**
 * Plantillas dinámicas de notificaciones (WhatsApp y Correo)
 */
export function buildNotificationTemplates(
  lic: { client: string; businessName?: string; systemId: string; expires: string; graceLimit: string; key: string },
  systemName: string,
  payments: PaymentDetails = DEFAULT_PAYMENTS,
  lang: 'es' | 'en' = 'es'
) {
  const clientRef = lic.businessName ? `${lic.client} (${lic.businessName})` : lic.client;

  if (lang === 'en') {
    return {
      preventive25: {
        title: 'Preventive Renewal Notice (Day 25)',
        whatsapp:
          `*NEXORA ONE ENGINE — SATELLITE OPERATIONS & LICENSING*\n\n` +
          `Dear *${clientRef}*,\n\n` +
          `This is an operational notice regarding your sovereign suite *${systemName}* (Key: \`${lic.key}\`).\n\n` +
          `Your 30-day regular cycle expires on *${lic.expires}*. To guarantee 100% uninterrupted perimeter operation, you may process renewal through direct channels:\n\n` +
          `● *Direct Banking / CBU:* ${payments.cbu} (Alias: ${payments.alias})\n` +
          `● *USDT TRC-20:* \`${payments.usdtTron}\`\n` +
          `● *USDT Polygon:* \`${payments.usdtPolygon}\`\n\n` +
          `Once transferred, please reply with proof of payment for cryptographic receipt emission.\n\n` +
          `Best regards,\n` +
          `_Nexora One Engine Sovereign Operations_`,
        emailSubject: `[NEXORA ONE] Preventive License Renewal — ${systemName}`,
        emailBody:
          `Hello ${clientRef},\n\n` +
          `Your active license for ${systemName} (Key: ${lic.key}) is reaching Day 25 of its 30-day cycle. Expiration date: ${lic.expires}.\n\n` +
          `Direct Payment Details (0% intermediary fees):\n` +
          `- Bank Transfer: CBU ${payments.cbu} | Alias: ${payments.alias} | Holder: ${payments.titular}\n` +
          `- Crypto USDT (TRC-20): ${payments.usdtTron}\n` +
          `- Crypto USDT (Polygon): ${payments.usdtPolygon}\n\n` +
          `Please reply with your transfer receipt to maintain uninterrupted service.`,
      },
      grace31: {
        title: 'Fatal Grace Notice (Day 31 — 5 Days Left)',
        whatsapp:
          `*⚠️ URGENT NOTICE: 5-DAY GRACE PERIOD ACTIVATED*\n\n` +
          `Attention: *${clientRef}*,\n\n` +
          `The regular cycle for *${systemName}* concluded on *${lic.expires}*. Your system is now running under the *5-Day Operational Grace Buffer*.\n\n` +
          `● *Fatal Hard-Cutoff Date:* *${lic.graceLimit}* (23:59 UTC-3)\n` +
          `● Failure to regularize payment prior to this deadline will result in node isolation and license revocation.\n\n` +
          `*Fast Payment Channels:*\n` +
          `● CBU: ${payments.cbu} | Alias: ${payments.alias}\n` +
          `● USDT: \`${payments.usdtTron}\`\n\n` +
          `Send your proof immediately to avoid service interruption.\n` +
          `_Nexora One Engine Control Center_`,
        emailSubject: `[ACTION REQUIRED] Grace Period Active — Hard Cutoff on ${lic.graceLimit} (${systemName})`,
        emailBody:
          `Dear ${clientRef},\n\n` +
          `Your license for ${systemName} has entered the 5-Day Grace Period. Operation will be automatically revoked on ${lic.graceLimit}.\n\n` +
          `Please settle your cycle balance via CBU ${payments.cbu} or USDT ${payments.usdtTron} immediately.`,
      },
      suspension36: {
        title: 'Service Suspension Notice (Day 36+)',
        whatsapp:
          `*🛑 SERVICE SUSPENDED — NEXORA SOVEREIGN NODE FROZEN*\n\n` +
          `Client: *${clientRef}*,\n` +
          `System: *${systemName}* | Key: \`${lic.key}\`\n\n` +
          `The 5-day grace period expired on *${lic.graceLimit}*. In accordance with autonomous protocol, local validations are restricted.\n\n` +
          `*Immediate Reactivation:* Settle renewal fee via:\n` +
          `● CBU: ${payments.cbu} | Alias: ${payments.alias}\n` +
          `● USDT TRC-20: \`${payments.usdtTron}\`\n\n` +
          `Upon dispatching proof to this channel, Nora Itu will verify and unlock your node within 5 minutes.\n` +
          `_Nexora One Engine Infrastructure_`,
        emailSubject: `[SERVICE FROZEN] Node Suspended due to cycle expiration — ${systemName}`,
        emailBody:
          `Dear ${clientRef},\n\n` +
          `Your service for ${systemName} is suspended as of ${lic.graceLimit}. To restore live operation, please complete your payment and reply with the receipt.`,
      },
    };
  }

  // Spanish (default)
  return {
    preventive25: {
      title: 'Aviso Preventivo de Renovación (Día 25)',
      whatsapp:
        `*NEXORA ONE ENGINE — OPERACIONES SOBERANAS Y LICENCIAMIENTO*\n\n` +
        `Estimado/a *${clientRef}*,\n\n` +
        `Le escribimos desde el Centro de Operaciones respecto a su suite soberana *${systemName}* (Licencia: \`${lic.key}\`).\n\n` +
        `Su ciclo regular de 30 días concluye el próximo *${lic.expires}*. Para garantizar una operatividad perimetral 100% ininterrumpida, ponemos a su disposición los canales de renovación directa:\n\n` +
        `● *Transferencia Bancaria (ARS):* CBU ${payments.cbu} | Alias: *${payments.alias}*\n` +
        `● *Titular:* ${payments.titular}\n` +
        `● *USDT (Red TRC-20):* \`${payments.usdtTron}\`\n` +
        `● *USDT (Red Polygon):* \`${payments.usdtPolygon}\`\n\n` +
        `Una vez realizado el abono, reenvíenos el comprobante a este canal para la emisión inmediata de su recibo criptográfico.\n\n` +
        `Atentamente,\n` +
        `_Nexora One Engine Sovereign Operations_`,
      emailSubject: `[NEXORA ONE] Aviso Preventivo de Renovación — ${systemName}`,
      emailBody:
        `Estimado/a ${clientRef},\n\n` +
        `Le informamos que su licencia para ${systemName} (Clave: ${lic.key}) ha alcanzado el día 25 de su ciclo. Fecha de vencimiento regular: ${lic.expires}.\n\n` +
        `Canales de pago directo (0% comisiones intermediarias):\n` +
        `- CBU: ${payments.cbu} | Alias: ${payments.alias} | Titular: ${payments.titular}\n` +
        `- USDT TRC-20: ${payments.usdtTron}\n` +
        `- USDT Polygon: ${payments.usdtPolygon}\n\n` +
        `Por favor responda a este correo con su comprobante para mantener la continuidad del servicio.`,
    },
    grace31: {
      title: 'Aviso Período de Gracia (Día 31 — Límite Fatal 5 Días)',
      whatsapp:
        `*⚠️ ALERTA OPERATIVA: PERÍODO DE GRACIA INICIADO (5 DÍAS)*\n\n` +
        `Atención: *${clientRef}*,\n\n` +
        `El ciclo regular de su suite *${systemName}* venció el *${lic.expires}*. Conforme a nuestra política soberana, se ha activado la *Gracia Operativa de 5 días* para que su negocio no se detenga.\n\n` +
        `● *Fecha Límite Fatal de Corte:* *${lic.graceLimit}* (23:59 hs)\n` +
        `● De no regularizarse antes de dicha fecha, el sistema aplicará corte forzoso y suspensión de validación.\n\n` +
        `*Canales de Regularización Urgente:*\n` +
        `● CBU: ${payments.cbu} | Alias: *${payments.alias}*\n` +
        `● USDT TRC-20: \`${payments.usdtTron}\`\n\n` +
        `Por favor envíe su comprobante a la brevedad.\n` +
        `_Centro de Control Nexora One Engine_`,
      emailSubject: `[URGENTE] Período de Gracia Activo — Corte Fatal el ${lic.graceLimit} (${systemName})`,
      emailBody:
        `Estimado/a ${clientRef},\n\n` +
        `Su sistema ${systemName} se encuentra en sus últimos 5 días de gracia operativa. El corte forzoso se aplicará automáticamente el ${lic.graceLimit}.\n\n` +
        `Puede regularizar vía CBU ${payments.cbu} o USDT ${payments.usdtTron}.`,
    },
    suspension36: {
      title: 'Aviso de Suspensión y Corte Forzoso (Día 36+)',
      whatsapp:
        `*🛑 SERVICIO SUSPENDIDO — NODO NEXORA EN MODO BLOQUEO*\n\n` +
        `Cliente: *${clientRef}*,\n` +
        `Sistema: *${systemName}* | Clave: \`${lic.key}\`\n\n` +
        `Habiendo expirado el plazo de gracia el *${lic.graceLimit}*, la licencia ha entrado en suspensión automática y corte preventivo.\n\n` +
        `*Reactivación Inmediata (5 minutos):*\n` +
        `1. Transfiera el arancel a CBU: ${payments.cbu} (Alias: *${payments.alias}*) o USDT: \`${payments.usdtTron}\`.\n` +
        `2. Envíe el comprobante a este chat.\n` +
        `Nora Itu verificará la transacción y desbloqueará el nodo al instante.\n\n` +
        `_Infraestructura Perimetral Nexora One Engine_`,
      emailSubject: `[CORTE DE SERVICIO] Licencia Suspendida por vencimiento de ciclo — ${systemName}`,
      emailBody:
        `Estimado/a ${clientRef},\n\n` +
        `Le notificamos que el servicio para ${systemName} se encuentra suspendido al haber expirado la gracia el ${lic.graceLimit}.\n\n` +
        `Para reactivar su nodo en forma inmediata, transfiera a CBU ${payments.cbu} y adjunte el comprobante por este medio.`,
    },
  };
}

/**
 * Simulación de envío por Correo Electrónico Corporativo (SMTP Gateway)
 */
export function simulateEmailDispatch(
  recipientEmail: string,
  subject: string,
  body: string
): { success: boolean; log: string; timestamp: string } {
  const timestamp = new Date().toISOString();
  const logMessage = `[SMTP SOVEREIGN-RELAY ${timestamp}] Dispatched to <${recipientEmail}>: "${subject}" (Status: 250 OK - Queued for delivery)`;
  
  // Guardado en sessionStorage para trazabilidad durante la sesión
  try {
    const existingLogs = JSON.parse(sessionStorage.getItem('nexora_smtp_logs') || '[]');
    existingLogs.unshift({ timestamp, recipientEmail, subject, body });
    sessionStorage.setItem('nexora_smtp_logs', JSON.stringify(existingLogs.slice(0, 50)));
  } catch {
    // Entorno sin sessionStorage
  }

  return {
    success: true,
    log: logMessage,
    timestamp,
  };
}

/**
 * Generador de Licencia Presencial / Mostrador (30 Días + 5 Días de Gracia)
 */
export function generatePresencialLicense(data: {
  clientName: string;
  businessName?: string;
  whatsapp: string;
  email: string;
  systemId: string;
  systemName: string;
  paymentMethod: PresencialPaymentMethod;
  notes?: string;
}): ExtendedLicense {
  const now = new Date();
  const startDateStr = now.toISOString().split('T')[0];

  const expDate = new Date(now.getTime() + 30 * 86400000);
  const expiresStr = expDate.toISOString().split('T')[0];

  const graceDate = new Date(now.getTime() + 35 * 86400000);
  const graceLimitStr = graceDate.toISOString().split('T')[0];

  const sysPrefix = data.systemId.slice(0, 4).toUpperCase();
  const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
  const licenseKey = `NX-PRE-${randomHex}-${sysPrefix}-30D`;

  const newLicense: ExtendedLicense = {
    id: `lic-pre-${Date.now()}`,
    key: licenseKey,
    client: data.clientName.trim(),
    businessName: data.businessName?.trim() || undefined,
    whatsapp: data.whatsapp.trim(),
    email: data.email.trim(),
    systemId: data.systemId,
    systemName: data.systemName,
    status: 'active',
    startDate: startDateStr,
    expires: expiresStr,
    graceLimit: graceLimitStr,
    paymentMethod: data.paymentMethod,
    notes: data.notes?.trim() || undefined,
    history: [
      {
        id: `hist-${Date.now()}`,
        type: 'renewal',
        channel: 'system',
        sentAt: now.toISOString(),
        detail: `Alta Presencial / Mostrador abonada vía ${data.paymentMethod.toUpperCase()}. Clave emitida: ${licenseKey}`,
        status: 'applied',
      },
    ],
  };

  return newLicense;
}

