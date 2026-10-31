/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE — NORA COPILOT OPERATIVO (BACKOFFICE EXCLUSIVO)
 * ────────────────────────────────────────────────────────────────────
 *  Rol: Copiloto de Oficina y Guía Pragmática Paso a Paso para Operadores.
 *  Regla de Oro: Cero código fuente, cero esquemas técnicos.
 *  100% Instrucciones visuales y operativas directas de mostrador.
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
    title: 'Publicar Nuevo Sistema en la Tienda',
    badge: 'PASO A PASO',
    summary: 'Cómo dar de alta un producto o módulo en la App Store pública en 3 pasos simples.',
    content:
      `### Cómo publicar un nuevo sistema en 3 pasos:\n\n` +
      `1. **Hacé clic en la pestaña Catálogo & Precios** en la barra superior de este panel.\n` +
      `2. **Pulsá el botón verde '+ Publicar Nuevo Sistema / Módulo'** y completá el formulario:\n` +
      `   - Nombre comercial del software (ej: Turnos Médicos Express).\n` +
      `   - Rubro o categoría (Gastronomía, Comercio, Eventos, Inmuebles, Servicios o Medios).\n` +
      `   - Arancel en pesos argentinos ($ ARS) y en dólares ($ USD).\n` +
      `   - Descripción breve de 1 renglón.\n` +
      `   - Enlace de acceso a la demo o instalador.\n` +
      `   - Selector de visibilidad: Marcá 'Sí' para que se vea en la tienda.\n` +
      `3. **Pulsá Guardar y Publicar**; el sistema impactará en la App Store pública de inmediato sin tocar código ni reiniciar nada.`,
  },
  licencias_presenciales: {
    id: 'licencias_presenciales',
    title: 'Cobro y Emisión de Licencia en Mostrador',
    badge: 'VENTAS Y COBROS',
    summary: 'Procedimiento sencillo para registrar un cliente presencial, cobrar y entregarle su recibo con clave.',
    content:
      `### Cómo registrar una venta física y emitir la licencia:\n\n` +
      `1. En la pestaña **Descargas & Licencias**, hacé clic en el botón verde **'+ Nueva Licencia Presencial / Mostrador'**.\n` +
      `2. Completá la ficha del cliente: Nombre y Apellido, Comercio o Razón Social (opcional), número de WhatsApp y Correo Electrónico.\n` +
      `3. Seleccioná el sistema adquirido (ej: Restobar 2026 POS, Retail o Turnos Express).\n` +
      `4. Indicá la forma de cobro percibida en mostrador: Efectivo en mano (ARS), Transferencia bancaria (CBU/CVU) o USDT.\n` +
      `5. Pulsá **'Emitir Licencia y Cobrar'**. Se generará la clave activada por 30 días (+5 días de gracia).\n` +
      `6. Hacé clic en **'Enviar Recibo por WhatsApp'** para mandarle el comprobante oficial al celular del cliente en 1 segundo.`,
  },
  regla_30_5: {
    id: 'regla_30_5',
    title: 'Vencimientos y Período de Gracia (30 + 5 Días)',
    badge: 'ATENCIÓN AL CLIENTE',
    summary: 'Qué hacer cuando un cliente está por vencer, entra en gracia o necesita unos días extra para pagar.',
    content:
      `### Cómo funciona el ciclo de pago (30 + 5 Días):\n\n` +
      `● **Día 1 al 30 (Al Día / Activo):** El cliente usa su sistema normalmente. El día 25 podés enviarle el aviso recordatorio por WhatsApp con un solo clic.\n` +
      `● **Día 31 al 35 (En Gracia):** Se cumplieron los 30 días, pero **el sistema NO se corta** para que su negocio no se detenga. Le sale un aviso amable de cuenta en período de gracia con fecha límite.\n` +
      `● **Día 36 en adelante (Corte Preventivo / Suspendido):** Si no abonó, el acceso se suspende automáticamente hasta regularizar.\n\n` +
      `### ¿Qué botón tocar cuando el cliente paga?:\n` +
      `● **Si abonó su cuota:** Buscalo en la tabla y pulsá el botón **'💳 +30d'**. Listo: se reinicia su mes completo de servicio desde hoy.\n` +
      `● **Si pide una prórroga de unos días:** Abrí **'⚙ Dossier'** y pulsá **'⏳ Extender Gracia (+5d)'** para darle 5 días adicionales sin cortar el sistema.\n` +
      `● **Si hubo un conflicto grave:** Podés presionar **'🛑 Suspender Forzosamente'**.`,
  },
  formas_cobro: {
    id: 'formas_cobro',
    title: 'Cambiar Cuentas Bancarias y Enlaces de Pago',
    badge: 'FINANZAS',
    summary: 'Cómo actualizar el CBU, Alias o billetera de cobro en un solo clic.',
    content:
      `### Cómo modificar los datos donde los clientes te pagan:\n\n` +
      `1. Hacé clic en la pestaña **'Formas de Pago'** en el menú superior.\n` +
      `2. Vas a ver los 3 canales oficiales:\n` +
      `   - **Transferencia Bancaria:** Modificá el CBU/CVU (22 dígitos), Alias bancario y Nombre del Titular.\n` +
      `   - **Mercado Pago:** Actualizá el enlace directo de cobro o URL del QR.\n` +
      `   - **Criptoactivos USDT:** Actualizá las direcciones de red Tron (TRC-20) o Polygon.\n` +
      `3. Pulsá el botón **'Guardar Métodos de Cobro'**.\n` +
      `4. ¡Listo! Los nuevos datos impactan inmediatamente tanto en la tienda pública como en las plantillas automáticas de cobro que envía Nora.`,
  },
  offline_distribucion: {
    id: 'offline_distribucion',
    title: 'Instalar el Sistema en las PCs de la Oficina',
    badge: 'USO EN OFICINA',
    summary: 'Cómo llevar el sistema a cualquier computadora para trabajar sin conexión a internet.',
    content:
      `### Cómo usar el sistema en las computadoras de la empresa:\n\n` +
      `1. Copiá la carpeta \`dist-offline\` a la computadora donde vas a trabajar (mediante un pendrive o red local).\n` +
      `2. Hacé **doble clic en el archivo \`iniciar-nexora-local.bat\`**.\n` +
      `3. Se abrirá automáticamente el navegador en \`http://localhost:3000/#admin\`.\n` +
      `4. Podés registrar clientes, cobrar y emitir licencias sin necesitar conexión a internet ni depender de servidores externos.`,
  },
  blindaje_seguridad: {
    id: 'blindaje_seguridad',
    title: 'Seguridad y Privacidad del Negocio',
    badge: 'PROTECCIÓN',
    summary: 'Por qué los datos de tus clientes están seguros y nadie puede espiarlos.',
    content:
      `### Protección del negocio para el operador:\n\n` +
      `● **Base de datos propia y privada:** La información de tus clientes y cobros reside en tu propio hardware.\n` +
      `● **Acceso protegido por PIN:** Solo el personal autorizado con clave interna (ej: PIN 2026) puede ingresar a este panel.\n` +
      `● **Separación absoluta:** Las personas que visitan la web pública ven únicamente el catálogo de venta. Nadie desde el exterior puede ver tu lista de clientes, contactos ni montos cobrados.`,
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
  // Retardo de procesamiento local natural (~180ms)
  await new Promise((resolve) => setTimeout(resolve, 180));

  const q = userQuery.toLowerCase().trim();

  // 0. Identidad, origen y sede soberana de Nexora One
  if (
    q.includes('quien') ||
    q.includes('quién') ||
    q.includes('origen') ||
    q.includes('sede') ||
    q.includes('empresa') ||
    q.includes('donde') ||
    q.includes('dónde') ||
    q.includes('corrientes')
  ) {
    return `### Nora Copilot — Identidad y Sede Soberana\n\n` +
      `Pertenezco con orgullo a **Nexora One**, firma de software e infraestructura soberana radicada exclusivamente en **Ituzaingó, Corrientes, Argentina**.\n\n` +
      `Como su copiloto técnico de backoffice, mi función es guiarle paso a paso en la administración de clientes, cobros de mostrador, publicación de sistemas y resguardo de su negocio sin depender de nubes externas.`;
  }

  // 1. Alta y publicación de sistemas (Guía de 3 pasos)
  if (
    q.includes('publicar') ||
    q.includes('subir') ||
    q.includes('alta') ||
    q.includes('nuevo sistema') ||
    q.includes('catalogo') ||
    q.includes('catálogo') ||
    q.includes('agregar sistema') ||
    q.includes('cargar sistema') ||
    q.includes('crear sistema')
  ) {
    const topic = COPILOT_KNOWLEDGE_BASE.alta_sistemas;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `Para publicar un nuevo sistema o módulo en la tienda pública, seguí estos 3 pasos directos:\n\n` +
      `1. **Hacé clic en la pestaña Catálogo & Precios** en la barra superior de este panel.\n` +
      `2. **Pulsá el botón '+ Publicar Nuevo Sistema / Módulo'** y completá el formulario (Nombre comercial, rubro, precio en pesos/dólares y el enlace de la demo).\n` +
      `3. **Pulsá Guardar y Publicar**; el sistema impactará en la App Store pública de inmediato sin tocar código ni reiniciar nada.\n\n` +
      `💡 *Atajo:* Podés abrir ahora mismo la pestaña 'Catálogo & Precios' y comenzar la carga en segundos.`;
  }

  // 2. Offline / PCs de la empresa / Paquete local (.bat)
  if (
    q.includes('offline') ||
    q.includes('pc') ||
    q.includes('oficina') ||
    q.includes('local') ||
    q.includes('bat') ||
    q.includes('instalar') ||
    q.includes('descargar') ||
    q.includes('sin internet')
  ) {
    const topic = COPILOT_KNOWLEDGE_BASE.offline_distribucion;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}\n\n` +
      `💡 *Recordá:* Para crear la carpeta actualizada de oficina, ejecutás \`npm run package:offline\` y te llevás la carpeta \`dist-offline\` en un pendrive.`;
  }

  // 3. Licencias presenciales / mostrador / cobros físicos
  if (
    q.includes('presencial') ||
    q.includes('mostrador') ||
    q.includes('emitir') ||
    q.includes('cliente nuevo') ||
    q.includes('cobro fisico') ||
    q.includes('efectivo') ||
    q.includes('vender')
  ) {
    const topic = COPILOT_KNOWLEDGE_BASE.licencias_presenciales;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}\n\n` +
      `💡 *Tip rápido:* Si el cliente te paga en efectivo o transferencia, dale a '+ Nueva Licencia Presencial / Mostrador' arriba de la tabla y en 30 segundos tiene el comprobante en su WhatsApp.`;
  }

  // 4. Regla 30 + 5 y estados de gracia / corte / renovación
  if (
    q.includes('30') ||
    q.includes('gracia') ||
    q.includes('corte') ||
    q.includes('vence') ||
    q.includes('vencimiento') ||
    q.includes('suspension') ||
    q.includes('dias') ||
    q.includes('renovar') ||
    q.includes('pagan')
  ) {
    const topic = COPILOT_KNOWLEDGE_BASE.regla_30_5;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}\n\n` +
      (context
        ? `📊 *Estado actual:* Contás con ${context.activeLicenses || 0} licencias activas al día y ${context.graceLicenses || 0} en período de gracia.`
        : '');
  }

  // 5. Formas de cobro (CBU / MP / USDT)
  if (
    q.includes('pago') ||
    q.includes('cbu') ||
    q.includes('alias') ||
    q.includes('usdt') ||
    q.includes('wallet') ||
    q.includes('mercadopago') ||
    q.includes('cobro') ||
    q.includes('banco')
  ) {
    const topic = COPILOT_KNOWLEDGE_BASE.formas_cobro;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}`;
  }

  // 6. Seguridad y blindaje
  if (
    q.includes('seguridad') ||
    q.includes('blindaje') ||
    q.includes('f12') ||
    q.includes('consola') ||
    q.includes('proteccion') ||
    q.includes('privacidad') ||
    q.includes('espia')
  ) {
    const topic = COPILOT_KNOWLEDGE_BASE.blindaje_seguridad;
    return `### Nora Copilot — ${topic.title}\n\n` +
      `${topic.summary}\n\n` +
      `${topic.content}`;
  }

  // 7. Respuesta de bienvenida y guía operativa general
  return `### Nora Copilot — Asistente de Operaciones\n\n` +
    `Hola, soy su copiloto de oficina para la administración de **Nexora One**, radicada en **Ituzaingó, Corrientes, Argentina**. Estoy aquí para orientarle paso a paso en las tareas del negocio:\n\n` +
    `1. 📦 **Publicar Sistemas:** Cómo agregar nuevos productos a la tienda en 3 pasos con el botón verde.\n` +
    `2. 🏪 **Ventas de Mostrador:** Cómo cargar clientes físicos, registrar el pago y emitir la licencia.\n` +
    `3. ⏳ **Ciclo 30 + 5 Días:** Qué hacer cuando un cliente está en gracia, regulariza su cuota (+30d) o pide prórroga.\n` +
    `4. 💳 **Cuentas de Cobro:** Cómo cambiar tu CBU, Alias o Mercado Pago sin tocar código.\n` +
    `5. 💻 **Uso en Oficina Offline:** Cómo correr el sistema con doble clic (\`.bat\`) en las computadoras sin internet.\n` +
    `6. 🛡️ **Seguridad:** Cómo se protegen tus clientes y números del negocio.\n\n` +
    `¿En qué tarea necesitás ayuda en este momento?`;
}
