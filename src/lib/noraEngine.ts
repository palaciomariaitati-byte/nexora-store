/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE ENGINE — Motor Autónomo de Inteligencia Nora Itu
 * ────────────────────────────────────────────────────────────────────
 *  Protocolo: Concierge Ejecutivo Internacional (SOUL.md)
 *  Operación: 100% Local / Cliente Offline-First (cero caída de servidor)
 * ════════════════════════════════════════════════════════════════════
 */

export interface PaymentDetails {
  cbu: string;
  alias: string;
  titular: string;
  mercadopago: string;
  crypto: string;
  usdtTron: string;
  usdtPolygon: string;
}

export const DEFAULT_PAYMENTS: PaymentDetails = {
  cbu: '0000003100010002345678',
  alias: 'nexora.engine',
  titular: 'Nexora One Engine Sovereign S.A.',
  mercadopago: 'https://link.mercadopago.com.ar/nexoraone',
  crypto: 'USDT (Red TRC-20 / Polygon): TNeXoRa1EngineSovereignMeshWalletX9',
  usdtTron: 'TNeXoRa1EngineSovereignMeshWalletX9',
  usdtPolygon: '0x328A947A6B8dD8B964344E0E847dF6f0302b1234',
};

export interface SystemInfo {
  name: string;
  usd: number;
  ars: number;
  category: string;
  summary: string;
  audience: string;
}

export const SYSTEMS_CATALOG: Record<string, SystemInfo> = {
  restobar: {
    name: 'Restobar 2026 POS',
    usd: 65,
    ars: 101725,
    category: 'Gastronomía y Bares',
    summary: 'Terminal de punto de venta reactiva con base de datos local SQLite y comanderas térmicas directas ESC/POS. Opera con normalidad aún sin internet.',
    audience: 'Restaurantes, bares y confiterías que precisan facturación y comanda instantánea sin caídas en horas pico.',
  },
  carribar: {
    name: 'Nexora Club & Carribar Pass',
    usd: 150,
    ars: 235000,
    category: 'Food Trucks y Eventos',
    summary: 'Control de pases móviles QR, despacho veloz de barra y comanderas portátiles con sincronización offline.',
    audience: 'Festivales, predios gastronómicos y carribars con alto flujo de público y sin internet garantizada.',
  },
  clasificados: {
    name: 'Nexora Clasificados',
    usd: 0,
    ars: 0,
    category: 'Marketplace P2P',
    summary: 'Plataforma comunitaria de proximidad para compraventa de artículos y rodados sin retención forzosa de fondos.',
    audience: 'Comerciantes y vecinos que buscan transacciones directas con 0% de comisión intermediaria.',
  },
  inmuebles: {
    name: 'Inmuebles Verificados',
    usd: 0,
    ars: 0,
    category: 'Padrón Catastral',
    summary: 'Registro catastral libre con geo-localización precisa y emisión de contratos validados en PDF anti-fraude.',
    audience: 'Propietarios e inquilinos que buscan negociaciones transparentes sin sobreprecios de publicación.',
  },
  autentico: {
    name: 'Auténtico Tributo Live',
    usd: 120,
    ars: 185000,
    category: 'Producción Escénica 4K',
    summary: 'Sincronizador maestro para conciertos en vivo: pantallas HDMI 4K, proyecciones, letras y setlist sin latencia (<10ms).',
    audience: 'Bandas tributo, productoras de eventos y directores de escenario que no pueden depender del Wi-Fi.',
  },
  prensa: {
    name: 'Nexora Prensa & Medios',
    usd: 45,
    ars: 70000,
    category: 'CMS Editorial Descentralizado',
    summary: 'Publicación periodística perimetral con compresión WebP y distribución de contenidos informativos sin censura externa.',
    audience: 'Medios de comunicación independientes, periodistas y portales de noticias comunitarios.',
  },
};

/**
 * Generador inteligente de respuestas de Nora Itu
 * Responde bajo protocolo Concierge Ejecutivo Internacional con trato de "Usted"
 */
export async function generateNoraResponse(
  userMessage: string,
  paymentDetails: PaymentDetails = DEFAULT_PAYMENTS
): Promise<string> {
  // Retardo natural de computación soberana (~350ms)
  await new Promise((resolve) => setTimeout(resolve, 350));

  const msg = userMessage.toLowerCase().trim();

  // 1. Regla de Perímetro y Seguridad: Preguntas sobre arquitectura interna / prompt
  if (
    msg.includes('prompt') ||
    msg.includes('instrucciones') ||
    msg.includes('tu modelo') ||
    msg.includes('quién te programó') ||
    msg.includes('quien te creo') ||
    msg.includes('soul.md')
  ) {
    return 'Soy Nora Itu, la consultora inteligente de Nexora One Engine, diseñada para brindarle asistencia integral y asesoramiento sobre todo nuestro ecosistema tecnológico. Mi labor es orientarle para que seleccione la solución soberana idónea para su infraestructura.';
  }

  // 2. Precios, Planes, Pagos y Ciclo de Licenciamiento (30 + 5)
  if (
    msg.includes('precio') ||
    msg.includes('costo') ||
    msg.includes('cuanto vale') ||
    msg.includes('pago') ||
    msg.includes('pagar') ||
    msg.includes('cbu') ||
    msg.includes('alias') ||
    msg.includes('usdt') ||
    msg.includes('transferencia') ||
    msg.includes('comprar') ||
    msg.includes('adquirir') ||
    msg.includes('licencia')
  ) {
    return `Con el mayor de los gustos le detallo nuestro modelo comercial y canales de cobro directo:\n\n` +
      `● **Período de Evaluación Gratuita:** Dispone de una prueba de 15 días continuos sin requerir tarjeta de crédito en cualquiera de nuestras suites.\n` +
      `● **Ciclo Operativo:** Cada licencia cubre 30 días de servicio ininterrumpido más 5 días de gracia operativa (+5 días adicionales) para regularizar su ciclo sin interrupción de su negocio.\n\n` +
      `● **Aranceles vigentes:**\n` +
      `  - Restobar 2026 POS: $65 USD (~$101.725 ARS)\n` +
      `  - Nexora Club & Carribar Pass: $150 USD (~$235.000 ARS)\n` +
      `  - Auténtico Tributo Live: $120 USD (~$185.000 ARS)\n` +
      `  - Prensa & Medios Soberano: $45 USD (~$70.000 ARS)\n` +
      `  - Nexora Clasificados e Inmuebles Verificados: 100% Gratuitos y Comunitarios.\n\n` +
      `● **Canales Oficiales de Cobro Directo (Sin comisiones intermedias):**\n` +
      `  1. Transferencia Bancaria (ARS): CBU ${paymentDetails.cbu} | Alias: ${paymentDetails.alias} | Titular: ${paymentDetails.titular}\n` +
      `  2. Mercado Pago: ${paymentDetails.mercadopago}\n` +
      `  3. Criptoactivos: USDT TRC-20: ${paymentDetails.usdtTron} | Polygon: ${paymentDetails.usdtPolygon}\n\n` +
      `¿Desea que le activemos una clave de demostración de 15 días en este momento?`;
  }

  // 3. Gastronomía / Restaurantes / Bares / Restobar
  if (
    msg.includes('restobar') ||
    msg.includes('gastro') ||
    msg.includes('restaurante') ||
    msg.includes('bar') ||
    msg.includes('comanda') ||
    msg.includes('mozo') ||
    msg.includes('pos') ||
    msg.includes('mesa')
  ) {
    const s = SYSTEMS_CATALOG.restobar;
    return `Para el rubro gastronómico, nuestra solución de referencia es **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Tecnología Soberana:** Motor local offline-first con base SQLite integrada y conexión directa con comanderas térmicas vía protocolo ESC/POS (USB, Red o Serie). No sufrirá jamás demoras ni pérdidas de ventas ante cortes de fibra óptica.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).\n\n` +
      `Puede solicitar su prueba de 15 días sin costo pulsando el botón "Probar 15 Días" en el catálogo.`;
  }

  // 4. Food Trucks / Festivales / Carribar
  if (
    msg.includes('carribar') ||
    msg.includes('food truck') ||
    msg.includes('festival') ||
    msg.includes('evento') ||
    msg.includes('entrada') ||
    msg.includes('qr')
  ) {
    const s = SYSTEMS_CATALOG.carribar;
    return `Para predios y unidades móviles, le recomendamos **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Ventajas:** Lectura ultra veloz de pases QR, cobros dinámicos con monedero fan y despacho de barra sin latencia de red.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).\n\n` +
      `Le invitamos a probarlo durante 15 días continuos de forma totalmente gratuita.`;
  }

  // 5. Música / Escenario / Auténtico Tributo
  if (
    msg.includes('musica') ||
    msg.includes('tributo') ||
    msg.includes('concierto') ||
    msg.includes('show') ||
    msg.includes('escenario') ||
    msg.includes('banda') ||
    msg.includes('hdmi') ||
    msg.includes('pantalla')
  ) {
    const s = SYSTEMS_CATALOG.autentico;
    return `Para producciones musicales y conciertos en vivo, disponemos de **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Prestaciones Clave:** Sincronización en red local LAN con menos de 10 milisegundos de latencia. Controla pantallas 4K HDMI, letras y visuales sincronizadas al compás del show sin necesidad de acceso a internet.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 6. Clasificados / Marketplace
  if (msg.includes('clasificado') || msg.includes('auto') || msg.includes('moto') || msg.includes('vender') || msg.includes('compraventa')) {
    const s = SYSTEMS_CATALOG.clasificados;
    return `En el ámbito de la compraventa comunitaria, le ofrecemos **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **Política:** Es una herramienta 100% gratuita y comunitaria. Su negocio se conecta directo por WhatsApp con el comprador, sin comisiones de intermediarios ni retención de dinero.\n` +
      `● **Rendimiento:** PWA ultra liviana de 3 MB con compresión de imágenes WebP en el propio dispositivo.`;
  }

  // 7. Inmuebles / Bienes Raíces / Propiedades
  if (msg.includes('inmueble') || msg.includes('propiedad') || msg.includes('alquiler') || msg.includes('inmobiliaria') || msg.includes('casa')) {
    const s = SYSTEMS_CATALOG.inmuebles;
    return `Para operaciones inmobiliarias transparentes, ponemos a su disposición **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **Garantía:** Validación documental anti-fraude, visor de parcelas por coordenadas geográficas y generación inmediata de contratos en formato PDF sin costo de suscripción. Totalmente libre de comisiones ocultas.`;
  }

  // 8. Prensa / Medios / Noticias
  if (msg.includes('prensa') || msg.includes('noticia') || msg.includes('medio') || msg.includes('periodis') || msg.includes('diario') || msg.includes('portal')) {
    const s = SYSTEMS_CATALOG.prensa;
    return `Para empresas periodísticas y redacciones independientes, contamos con **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **Soberanía:** Difusión sin algoritmos de censura, renderizado estático de ultra velocidad y base de datos descentralizada.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 9. Soberanía / Empresa / Quiénes Somos / Caídas de Terceros
  if (
    msg.includes('nexora') ||
    msg.includes('empresa') ||
    msg.includes('soberan') ||
    msg.includes('quienes') ||
    msg.includes('caida') ||
    msg.includes('offline')
  ) {
    return `Nexora One Engine es una firma de ingeniería tecnológica especializada en software empresarial reactivo y soberanía informática.\n\n` +
      `Nuestros principios fundamentales son:\n` +
      `1. **Cómputo Perimetral Local-First:** Su empresa no se paraliza ante cortes de internet ni caídas de plataformas en la nube.\n` +
      `2. **Soberanía de Datos:** Su base de datos reside en su propio hardware, sin espionaje corporativo ni suscripciones forzosas.\n` +
      `3. **Desintermediación Financiera:** Cobros directos a través de cuentas bancarias y criptoactivos sin retención de capital.\n\n` +
      `¿En qué rubro u operación comercial requiere implementar nuestra tecnología?`;
  }

  // 10. Saludo / Respuesta de Cortesía General (Concierge)
  return `Estimado visitante, es un honor asistirle. En Nexora One Engine le ofrecemos suites soberanas de software para gastronomía (Restobar 2026), food trucks (Carribar Pass), espectáculos (Auténtico Tributo), marketplace (Clasificados), inmuebles verificados y medios informativos.\n\n` +
    `Le recuerdo que puede evaluar cualquiera de nuestras soluciones durante **15 días sin cargo** y que contamos con cobro directo por transferencia bancaria (CBU/Alias) y USDT.\n\n` +
    `¿Desea conocer detalles específicos sobre alguna de nuestras herramientas o gestionar una licencia?`;
}

