/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE ENGINE — Nora Copilot Backoffice Runtime
 * ────────────────────────────────────────────────────────────────────
 *  Rol: Copiloto Técnico y Guía de Operaciones Internas para Operadores.
 *  Operación: 100% Local / In-Memory / Determinista (Cero fugas a terceros).
 * ════════════════════════════════════════════════════════════════════
 */

export interface CopilotTopic {
  id: string;
  title: string;
  badge: string;
  summary: string;
  content: string;
}

export const COPILOT_KNOWLEDGE_BASE: Record<string, CopilotTopic> = {
  alta_sistemas: {
    id: 'alta_sistemas',
    title: 'Alta y Configuración de Sistemas en Catálogo',
    badge: 'ESTRUCTURA DE DATOS',
    summary: 'Requisitos y especificaciones para integrar una nueva solución al App Store público y backoffice.',
    content:
      `### Estructura de Datos Requerida (SystemItem):\n\n` +
      `Para registrar un nuevo software en el catálogo, cada ítem debe contar con:\n` +
      `● **id:** Cadena alfanumérica única en minúsculas (ej: 'restobar', 'carribar', 'logistica').\n` +
      `● **name:** Nombre comercial oficial del sistema (ej: 'Restobar 2026 POS').\n` +
      `● **subtitle:** Subtítulo técnico en mayúsculas (ej: 'PUNTO DE VENTA & COMANDERAS OFFLINE').\n` +
      `● **category:** Uno de los dominios perimetrales: 'gastronomia' | 'clasificados' | 'inmuebles' | 'musica' | 'prensa'.\n` +
      `● **priceUsd / priceArs:** Valores duales para cotización en tiempo real. Si es comunitario o gratuito, ambos valores son 0.\n` +
      `● **slaOrBadge:** Métrica visual destacada (ej: '< 2MS LATENCY', 'ANTI-FRAUDE', '0% COMISIÓN').\n` +
      `● **slaColor:** Clases CSS de Tailwind para color de insignia.\n` +
      `● **description:** Resumen conciso de 1-2 oraciones enfocado en la ventaja competitiva offline-first.\n` +
      `● **targetAudience:** Texto explicativo para el desplegable '¿A quién le resuelve el día?'.\n` +
      `● **tags:** Array de strings con especificaciones técnicas (ej: ['SQLite Local', 'ESC/POS LAN', 'Sin Nube']).\n` +
      `● **active:** Booleano para activar o desactivar la visibilidad en el App Store sin borrar el registro.`,
  },
  licencias_presenciales: {
    id: 'licencias_presenciales',
    title: 'Protocolo de Emisión de Licencias Presenciales (Mostrador)',
    badge: 'OPERACIÓN DE COBRO',
    summary: 'Procedimiento paso a paso para el cobro físico en mostrador y entrega de clave con recibo criptográfico.',
    content:
      `### Guía de Emisión Presencial:\n\n` +
      `1. **Recepción del Cliente:** Diríjase a la pestaña 'Descargas & Licencias' y presione el botón verde '+ Nueva Licencia Presencial / Mostrador'.\n` +
      `2. **Completado de Datos:**\n` +
      `   - Ingrese el *Nombre Completo* del titular.\n` +
      `   - Ingrese el *Comercio / Razón Social* (o deje vacío si es profesional independiente).\n` +
      `   - Ingrese el *WhatsApp* con prefijo internacional (ej: +54 9 3786...).\n` +
      `   - Ingrese el *Correo Electrónico* corporativo.\n` +
      `   - Seleccione el *Sistema* adquirido.\n` +
      `   - Seleccione la forma de pago percibida: 'Efectivo (ARS)', 'Transferencia Bancaria (CBU/CVU)' o 'USDT TRC-20'.\n` +
      `3. **Emisión Criptográfica:** Al presionar 'Emitir Licencia y Cobrar', el motor calcula automáticamente:\n` +
      `   - Inicio: Fecha de hoy.\n` +
      `   - Vencimiento regular: +30 días continuos.\n` +
      `   - Margen de gracia perimetral: +35 días continuos (5 días de gracia).\n` +
      `   - Clave única: NX-PRE-[HEX]-[SISTEMA]-30D.\n` +
      `4. **Entrega de Comprobante:** Se abrirá el modal con el recibo firmado por SHA-256. Presione 'Copiar Recibo' o 'Enviar Recibo por WhatsApp' para enviarlo directamente al celular del cliente.`,
  },
  regla_30_5: {
    id: 'regla_30_5',
    title: 'Regla 30 + 5 de Gracia y Gestión de Cortes',
    badge: 'POLÍTICA DETERMINISTA',
    summary: 'Gestión de etapas del ciclo de vida, avisos preventivos, prórrogas y reactivación inmediata.',
    content:
      `### Ciclo Operativo 30 + 5 Días:\n\n` +
      `● **Días 1 a 30 (Activo):** Acceso regular pleno sin restricciones. El día 25 se dispara el aviso preventivo de renovación.\n` +
      `● **Días 31 a 35 (En Gracia):** El sistema venció, pero el software perimetral NO se interrumpe para proteger el negocio del cliente. Muestra aviso de cuenta en período de gracia con fecha fatal.\n` +
      `● **Día 36+ (Suspendido / Corte):** Corte forzoso. La clave no valida licencias y requiere regularización.\n\n` +
      `### Acciones del Operador:\n` +
      `1. **Reactivación / Renovación Ordinaria:** Presione el botón '💳 +30d' en la fila o 'Reactivar / Renovar (+30d)' dentro del Dossier. Esto reinicia el contador de 30 días + 5 de gracia desde hoy y reconcilia el pago.\n` +
      `2. **Prórroga Excepcional:** Si el cliente solicita unos días más para abonar, abra '⚙ Dossier' y presione '⏳ Extender Gracia (+5d)'. Esto extiende la fecha de corte 5 días adicionales sin reiniciar el ciclo completo.\n` +
      `3. **Corte Manual:** Si se detecta uso no autorizado o incumplimiento grave, presione '🛑 Suspender Forzosamente'.`,
  },
  formas_cobro: {
    id: 'formas_cobro',
    title: 'Modificación de Canales de Cobro (CBU / MP / USDT)',
    badge: 'CONFIGURACIÓN FINANCIERA',
    summary: 'Cómo actualizar cuentas bancarias y billeteras cripto sin editar código fuente.',
    content:
      `### Actualización de Coordenadas Financieras:\n\n` +
      `1. En el Dashboard administrativo, ingrese a la pestaña **'Formas de Pago'**.\n` +
      `2. Dispone de tres canales administrables en tiempo real:\n` +
      `   - **Transferencia CBU / CVU:** Actualice CBU/CVU (22 dígitos), Alias bancario y Nombre del Titular.\n` +
      `   - **Mercado Pago:** Actualice el enlace de cobro checkout directo o URL del QR.\n` +
      `   - **Criptoactivos USDT:** Configure las direcciones para red TRC-20 (Tron) y red Polygon.\n` +
      `3. Presione el botón **'Guardar Métodos de Cobro'**.\n` +
      `4. **Sincronización Inmediata:** Los cambios se persisten en almacenamiento soberano y tanto Nora Itu (en el front público) como las plantillas de notificación de cobro (Día 25, 31 y 36) comenzarán a responder con los nuevos datos al instante, sin reiniciar el servidor.`,
  },
  offline_distribucion: {
    id: 'offline_distribucion',
    title: 'Despliegue Local para Computadoras de la Empresa',
    badge: 'DISTRIBUCIÓN PERIMETRAL',
    summary: 'Cómo empaquetar y ejecutar Nexora One Engine en las computadoras de la oficina sin internet.',
    content:
      `### Ejecución Local-First en PCs de la Empresa:\n\n` +
      `1. Ejecute en la terminal el comando: \`npm run package:offline\`.\n` +
      `2. Esto generará la carpeta autónoma \`dist-offline\` que contiene:\n` +
      `   - Todos los activos estáticos compilados.\n` +
      `   - Servidor ultraliviano nativo de Node.js.\n` +
      `   - Archivo ejecutable \`iniciar-nexora-local.bat\`.\n` +
      `3. **Uso en Mostrador / Oficina:**\n` +
      `   - Copie la carpeta \`dist-offline\` a cualquier PC con Windows (o distribúyala vía pendrive/red LAN).\n` +
      `   - Haga doble clic en \`iniciar-nexora-local.bat\`.\n` +
      `   - El sistema abrirá automáticamente el navegador en \`http://localhost:3000\` en modo offline.\n` +
      `   - Todas las altas, cobros y operaciones se guardan de forma local sin requerir conexión a internet ni depender de Vercel.`,
  },
  blindaje_seguridad: {
    id: 'blindaje_seguridad',
    title: 'Blindaje Perimetral y Seguridad Ofensiva / Defensiva',
    badge: 'SEGURIDAD PERIMETRAL',
    summary: 'Medidas de protección de credenciales, bloqueo de consola F12 y desacople de builds.',
    content:
      `### Mecanismos de Blindaje Implementados:\n\n` +
      `● **Cero Credenciales 'service_role' en Front:** El código cliente jamás emite claves maestras. Únicamente utiliza tokens públicos anonimizados.\n` +
      `● **Políticas RLS en Base de Datos:** Las consultas directas desde la consola del navegador (F12) sobre \`licenses\` y \`clients\` son rechazadas con error 403 Forbidden a nivel de base de datos salvo autorización explícita.\n` +
      `● **Builds Separadas:**\n` +
      `   - \`npm run build:public\`: Compila exclusivamente el App Store y portada pública sin rastros de lógica de backoffice.\n` +
      `   - \`npm run build:admin\`: Empaqueta la consola interna para uso de operadores autorizados.\n` +
      `● **Firma Local Determinista:** Todas las claves de licencia se verifican mediante funciones criptográficas locales sin consultar servidores externos.`,
  },
};

/**
 * Motor de respuestas contextuales de Nora Copilot para el Operador del Backoffice
 */
export async function generateCopilotResponse(
  userQuery: string,
  context?: {
    totalLicenses?: number;
    activeLicenses?: number;
    graceLicenses?: number;
    systemsCount?: number;
  }
): Promise<string> {
  // Retardo de procesamiento local (~200ms)
  await new Promise((resolve) => setTimeout(resolve, 200));

  const q = userQuery.toLowerCase().trim();

  // 1. Offline / PCs de la empresa / Paquete local
  if (q.includes('offline') || q.includes('pc') || q.includes('oficina') || q.includes('local') || q.includes('bat') || q.includes('instalar') || q.includes('descargar') || q.includes('sin internet')) {
    const topic = COPILOT_KNOWLEDGE_BASE.offline_distribucion;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}\n\n` +
      `💡 *Atajo:* Ejecute \`npm run package:offline\` y copie el contenido de \`dist-offline\` al equipo de destino.`;
  }

  // 2. Licencias presenciales / mostrador
  if (q.includes('presencial') || q.includes('mostrador') || q.includes('emitir') || q.includes('cliente nuevo') || q.includes('cobro fisico') || q.includes('efectivo')) {
    const topic = COPILOT_KNOWLEDGE_BASE.licencias_presenciales;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}\n\n` +
      `💡 *Consejo:* Puede utilizar el botón '+ Nueva Licencia Presencial / Mostrador' ubicado en la parte superior de la tabla de licencias.`;
  }

  // 3. Regla 30 + 5 y estados de gracia / corte
  if (q.includes('30') || q.includes('gracia') || q.includes('corte') || q.includes('vence') || q.includes('vencimiento') || q.includes('suspension') || q.includes('dias')) {
    const topic = COPILOT_KNOWLEDGE_BASE.regla_30_5;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}\n\n` +
      (context
        ? `📊 *Estado Actual del Parque:* ${context.activeLicenses || 0} licencias activas y ${context.graceLicenses || 0} en período de gracia.`
        : '');
  }

  // 4. Formas de cobro (CBU / MP / USDT)
  if (q.includes('pago') || q.includes('cbu') || q.includes('alias') || q.includes('usdt') || q.includes('wallet') || q.includes('mercadopago') || q.includes('cobro')) {
    const topic = COPILOT_KNOWLEDGE_BASE.formas_cobro;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}`;
  }

  // 5. Seguridad y blindaje
  if (q.includes('seguridad') || q.includes('blindaje') || q.includes('f12') || q.includes('consola') || q.includes('rls') || q.includes('build')) {
    const topic = COPILOT_KNOWLEDGE_BASE.blindaje_seguridad;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}`;
  }

  // 6. Alta y subida de sistemas
  if (q.includes('sistema') || q.includes('alta') || q.includes('subir') || q.includes('catalogo') || q.includes('producto') || q.includes('campos') || q.includes('estructura')) {
    const topic = COPILOT_KNOWLEDGE_BASE.alta_sistemas;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}\n\n` +
      `💡 *Consejo:* Para agregar un sistema de prueba, verifique que los precios USD y ARS reflejen el arancel mensual correspondiente y que la categoría sea válida.`;
  }

  // 7. Respuesta de bienvenida y guía operativa general
  return `### Nora Copilot — Centro de Control Operativo\n\n` +
    `Hola, soy su copiloto técnico interno para la administración de Nexora One Engine. Estoy configurada para asistirle en las siguientes tareas clave:\n\n` +
    `1. 📦 **Alta y Estructura de Sistemas:** Cómo dar de alta nuevos programas en el catálogo.\n` +
    `2. 🏪 **Emisión Presencial en Mostrador:** Procedimiento para cobros físicos y entrega de recibos.\n` +
    `3. ⏳ **Regla 30 + 5 de Gracia:** Qué hacer ante clientes en gracia, corte preventivo o renovación.\n` +
    `4. 💳 **Canales de Cobro Directo:** Configuración de CBU, Mercado Pago y wallets USDT sin tocar código.\n` +
    `5. 💻 **Despliegue Offline en PCs:** Cómo empaquetar y correr el sistema con doble clic (\`.bat\`) sin internet.\n` +
    `6. 🛡️ **Blindaje y RLS:** Seguridad contra desarrolladores e inspección externa.\n\n` +
    `¿Sobre cuál de estos temas requiere orientación inmediata?`;
}

