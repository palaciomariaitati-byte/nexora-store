/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE ENGINE — Motor Autónomo de Inteligencia Nora Itu
 * ────────────────────────────────────────────────────────────────────
 *  Protocolo: Concierge Ejecutivo Internacional (SOUL.md)
 *  Operación: 100% Local / Cliente Offline-First (cero caída de servidor)
 *  Idiomas: Español (ES) y Corporate English (EN)
 * ════════════════════════════════════════════════════════════════════
 */

export type Language = 'es' | 'en';

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
  nameEn?: string;
  summaryEn?: string;
  audienceEn?: string;
}

export const SYSTEMS_CATALOG: Record<string, SystemInfo> = {
  restobar: {
    name: 'Restobar 2026 POS',
    usd: 65,
    ars: 101725,
    category: 'Gastronomía y Bares',
    summary: 'Terminal de punto de venta reactiva con base de datos local SQLite y comanderas térmicas directas ESC/POS. Opera con normalidad aún sin internet.',
    audience: 'Restaurantes, bares y confiterías que precisan facturación y comanda instantánea sin caídas en horas pico.',
    nameEn: 'Restobar 2026 POS',
    summaryEn: 'Reactive point-of-sale terminal powered by embedded SQLite and direct ESC/POS thermal printer communication. Zero downtime during internet outages.',
    audienceEn: 'Restaurants, bistros, and cocktail lounges demanding sub-second ticketing and resilient billing during peak hours.',
  },
  carribar: {
    name: 'Nexora Club & Carribar Pass',
    usd: 150,
    ars: 235000,
    category: 'Food Trucks y Eventos',
    summary: 'Control de pases móviles QR, despacho veloz de barra y comanderas portátiles con sincronización offline.',
    audience: 'Festivales, predios gastronómicos y carribars con alto flujo de público y sin internet garantizada.',
    nameEn: 'Nexora Club & Carribar Pass',
    summaryEn: 'High-throughput QR pass validation, bar queue dispatch, and offline wireless order routing.',
    audienceEn: 'Music festivals, outdoor gastronomic hubs, and food truck clusters with fluctuating mobile coverage.',
  },
  clasificados: {
    name: 'Nexora Clasificados',
    usd: 0,
    ars: 0,
    category: 'Marketplace P2P',
    summary: 'Plataforma comunitaria de proximidad para compraventa de artículos y rodados sin retención forzosa de fondos.',
    audience: 'Comerciantes y vecinos que buscan transacciones directas con 0% de comisión intermediaria.',
    nameEn: 'Nexora Classifieds P2P',
    summaryEn: 'Decentralized neighborhood marketplace for vehicle and goods exchange without predatory escrow fees.',
    audienceEn: 'Merchants and local communities requiring direct peer-to-peer commerce with 0% intermediary commission.',
  },
  inmuebles: {
    name: 'Inmuebles Verificados',
    usd: 0,
    ars: 0,
    category: 'Padrón Catastral',
    summary: 'Registro catastral libre con geo-localización precisa y emisión de contratos validados en PDF anti-fraude.',
    audience: 'Propietarios e inquilinos que buscan negociaciones transparentes sin sobreprecios de publicación.',
    nameEn: 'Verified Sovereign Properties',
    summaryEn: 'Unrestricted cadastral ledger featuring precise GPS coordinates and cryptographic anti-fraud PDF lease generation.',
    audienceEn: 'Landlords and prospective tenants seeking direct, transparent real estate negotiations without brokerage fee inflation.',
  },
  autentico: {
    name: 'Auténtico Tributo Live',
    usd: 120,
    ars: 185000,
    category: 'Producción Escénica 4K',
    summary: 'Sincronizador maestro para conciertos en vivo: pantallas HDMI 4K, proyecciones, letras y setlist sin latencia (<10ms).',
    audience: 'Bandas tributo, productoras de eventos y directores de escenario que no pueden depender del Wi-Fi.',
    nameEn: 'Auténtico Tributo Live',
    summaryEn: 'Master live stage sync hub: zero-latency (<10ms) 4K HDMI video playback, dynamic teleprompter, and automated DMX cueing without cloud dependence.',
    audienceEn: 'Tribute acts, stage production companies, and touring engineers requiring deterministic local performance.',
  },
  prensa: {
    name: 'Prensa & Medios Soberano (Próximamente v2.0)',
    usd: 45,
    ars: 70000,
    category: 'CMS Editorial Descentralizado',
    summary: 'Publicación periodística perimetral (en refactorización para despliegue v2.0 - disponible únicamente bajo consulta institucional).',
    audience: 'Medios de comunicación independientes, periodistas y portales de noticias comunitarios.',
    nameEn: 'Nexora Independent Press (Coming Soon v2.0)',
    summaryEn: 'Perimeter editorial CMS currently undergoing v2.0 modernization. Available upon direct institutional consultation.',
    audienceEn: 'Independent investigative journalists, local newspapers, and decentralized publishing houses.',
  },
  'nora-isp': {
    name: 'Nora ISP Core & FTTH Cloud',
    usd: 180,
    ars: 280000,
    category: 'Telecomunicaciones & Infraestructura',
    summary: 'Sistema integral para ISPs y cableoperadores: gestión de red FTTH, monitoreo de cajas NAP, geolocalización de cuadrillas técnicas en vivo y portal de autogestión de abonados.',
    audience: 'Proveedores de internet (ISPs), cooperativas de telecomunicaciones y cableoperadores que buscan automatizar NOC, cuadrillas y atención con IA.',
    nameEn: 'Nora ISP Core & FTTH Cloud',
    summaryEn: 'Mission-critical ISP & FTTH management core: NAP box monitoring, live GPS technician dispatch, and subscriber self-service portal.',
    audienceEn: 'ISPs, telecom cooperatives, and cable operators seeking autonomous NOC operations and AI-powered billing.',
  },
  'crm-obras': {
    name: 'Nexora Obras & CRM Corporativo',
    usd: 95,
    ars: 148000,
    category: 'Construcción & Obras Civiles',
    summary: 'Suite soberana para estudios de arquitectura y empresas constructoras. Cómputo métrico, libro de obras digital, certificación de avances UOCRA y gestión legal CCyCN con evidencia fotográfica georreferenciada.',
    audience: 'Arquitectos colegiados, empresas constructoras, desarrolladores y directores de obra que demandan trazabilidad técnica, contable y jurídica.',
    nameEn: 'Nexora Works & Architecture CRM',
    summaryEn: 'Sovereign construction management and architectural CRM: metric computing, digital site log, labor certifications, and CCyCN legal compliance with geotagged photo proof.',
    audienceEn: 'Registered architects, construction firms, developers, and field directors requiring deterministic job-site tracking.',
  },
  retail: {
    name: 'Nexora Stock & Retail 2026',
    usd: 55,
    ars: 85000,
    category: 'Comercio & Retail',
    summary: 'Punto de venta comercial, control de stock y lector de códigos offline con pistola USB/Bluetooth y arqueo multidepósito.',
    audience: 'Comercios minoristas, ferreterías, almacenes y minimercados que precisan facturar sin interrupciones por corte de internet.',
    nameEn: 'Nexora Stock & Retail 2026',
    summaryEn: 'High-speed commercial retail POS featuring barcode scanner support, multi-warehouse inventory control, and offline daily reconciliation.',
    audienceEn: 'Retail stores, hardware shops, and mini-markets requiring resilient, offline checkout that never halts during ISP failures.',
  },
  turnos: {
    name: 'Nexora Turnos & Citas Express',
    usd: 40,
    ars: 62000,
    category: 'Servicios & Consultorios',
    summary: 'Agendamiento autónomo para clínicas y consultorios. Reserva local, sincronización por WhatsApp y confirmaciones automáticas sin intermediarios.',
    audience: 'Médicos, odontólogos, centros de estética, peluquerías y consultorios independientes que requieren turnero directo.',
    nameEn: 'Nexora Appointments Express',
    summaryEn: 'Autonomous appointment scheduling for clinics and practices. Local reservation database, WhatsApp notifications, and automated reminders.',
    audienceEn: 'Healthcare professionals, dentists, aesthetics centers, and independent practices requiring zero-commission booking.',
  },
  hotel: {
    name: 'Nexora Hotel & Cabañas Desk',
    usd: 85,
    ars: 132000,
    category: 'Hotelería & Inmuebles',
    summary: 'Check-in local, reservas y administración hotelera sin intermediarios. Cuadrícula de ocupación, cobro en mostrador y gestión de cabañas desconectada de OTAs.',
    audience: 'Hoteles boutique, complejos de cabañas, hosterías y administradores turísticos que rechazan comisiones abusivas de portales externos.',
    nameEn: 'Nexora Hotel & Lodge Desk',
    summaryEn: 'Local front-desk PMS, check-in management, and independent room/cabin booking system free from third-party OTA commissions.',
    audienceEn: 'Boutique hotels, cabin resorts, and independent vacation rentals seeking full operational autonomy.',
  },
  flota: {
    name: 'Nexora Flota & Encomiendas',
    usd: 90,
    ars: 140000,
    category: 'Logística & Envíos',
    summary: 'Ruteo logístico, despachos y control perimetral de paquetería. Manifiesto de carga, hojas de ruta offline y firma de entrega digital en mano.',
    audience: 'Empresas de logística urbana, distribuidoras, expresos y cooperativas de transporte de encomiendas.',
    nameEn: 'Nexora Fleet & Parcel Logistics',
    summaryEn: 'Perimeter fleet dispatch, delivery manifest routing, package barcode tracking, and offline digital hand-delivery confirmation.',
    audienceEn: 'Urban logistics carriers, local distributors, and courier freight services needing robust edge tracking.',
  },
  cajafuerte: {
    name: 'Nexora Caja Fuerte & Auditoría',
    usd: 70,
    ars: 108000,
    category: 'Tesorería & Auditoría',
    summary: 'Arqueo ciego de sucursales, control de turnos y prevención de fugas. Auditoría criptográfica estricta de efectivo, transferencias y comprobantes.',
    audience: 'Franquicias, comercios con múltiples turnos de cajeros y locales con alta circulación de dinero físico que demandan trazabilidad absoluta.',
    nameEn: 'Nexora SafeBox & Vault Audit',
    summaryEn: 'Blind cashier shift audits, multi-branch cash reconciliation, and cryptographic fraud-prevention telemetry.',
    audienceEn: 'Multi-store franchises and high-cash turnover venues requiring immutable cashier accountability and leakage prevention.',
  },
};

/**
 * Generador inteligente de respuestas de Nora Itu
 * Responde bajo protocolo Concierge Ejecutivo Internacional adaptado al idioma activo (ES / EN)
 */
export async function generateNoraResponse(
  userMessage: string,
  paymentDetails: PaymentDetails = DEFAULT_PAYMENTS,
  language: Language = 'es'
): Promise<string> {
  // Retardo natural de computación soberana (~350ms)
  await new Promise((resolve) => setTimeout(resolve, 350));

  const msg = userMessage.toLowerCase().trim();

  // ──────────────────────────────────────────────────────────────────
  // INGLÉS CORPORATIVO (EN)
  // ──────────────────────────────────────────────────────────────────
  if (language === 'en') {
    // 1. Architecture / Prompt injection defense
    if (
      msg.includes('prompt') ||
      msg.includes('instruction') ||
      msg.includes('your model') ||
      msg.includes('who made you') ||
      msg.includes('who programmed you') ||
      msg.includes('soul.md') ||
      msg.includes('system prompt')
    ) {
      return 'I am Nora Itu, Executive AI Concierge for Nexora One. Developed and based with pride in our sovereign engineering headquarters in Ituzaingó, Corrientes, Argentina, my mission is to assist institutional clients and enterprises in deploying sovereign, offline-first digital infrastructure. How may I direct your technical inquiry today?';
    }

    // 2. Pricing, Plans, 30+5 Day Cycle & Direct Payment
    if (
      msg.includes('price') ||
      msg.includes('cost') ||
      msg.includes('how much') ||
      msg.includes('pay') ||
      msg.includes('payment') ||
      msg.includes('cbu') ||
      msg.includes('usdt') ||
      msg.includes('transfer') ||
      msg.includes('buy') ||
      msg.includes('license') ||
      msg.includes('tier')
    ) {
      return `Allow me to outline our commercial structure and direct settlement channels:\n\n` +
        `● **Complimentary 15-Day Trial:** Full access to any enterprise suite with zero credit card required.\n` +
        `● **Deterministic 30 + 5 Lifecycle:** Each cycle provides 30 days of continuous operation followed by a 5-day sovereign grace buffer (+5 days) guaranteeing zero operational cutoff while settling accounts.\n\n` +
        `● **Enterprise Pricing Tiers (Sovereign Solutions):**\n` +
        `  - Nora ISP Core & FTTH Cloud: $180 USD/mo (~$280,000 ARS)\n` +
        `  - Nexora Obras & CRM Corporativo: $95 USD/mo (~$148,000 ARS)\n` +
        `  - Restobar 2026 POS: $65 USD/mo (~$101,725 ARS)\n` +
        `  - Nexora Club & Carribar Pass: $150 USD/mo (~$235,000 ARS)\n` +
        `  - Auténtico Tributo Live: $120 USD/mo (~$185,000 ARS)\n` +
        `  - Nexora Stock & Retail 2026: $55 USD/mo (~$85,000 ARS)\n` +
        `  - Nexora Turnos & Citas Express: $40 USD/mo (~$62,000 ARS)\n` +
        `  - Nexora Hotel & Cabañas Desk: $85 USD/mo (~$132,000 ARS)\n` +
        `  - Nexora Flota & Encomiendas: $90 USD/mo (~$140,000 ARS)\n` +
        `  - Nexora Caja Fuerte & Auditoría: $70 USD/mo (~$108,000 ARS)\n` +
        `  - Nexora Clasificados & Inmuebles Verificados: 100% Free Sovereign Utilities.\n` +
        `  - Prensa & Medios Soberano: Coming Soon v2.0 (Direct Inquiry Only).\n\n` +
        `● **Direct Settlement Rails (0% Intermediary Fee):**\n` +
        `  1. Bank Transfer (ARS): CBU ${paymentDetails.cbu} | Alias: ${paymentDetails.alias}\n` +
        `  2. USDT TRC-20: \`${paymentDetails.usdtTron}\`\n` +
        `  3. USDT Polygon: \`${paymentDetails.usdtPolygon}\`\n\n` +
        `Would you like me to issue a 15-day evaluation key for your organization now?`;
    }

    // 3. Gastronomy / Restobar POS
    if (
      msg.includes('restobar') ||
      msg.includes('gastro') ||
      msg.includes('restaurant') ||
      msg.includes('pos') ||
      msg.includes('waiter') ||
      msg.includes('table') ||
      msg.includes('kitchen')
    ) {
      const s = SYSTEMS_CATALOG.restobar;
      return `For food and beverage enterprises, we recommend **${s.nameEn || s.name}**:\n\n` +
        `● **Architecture:** ${s.summaryEn || s.summary}\n` +
        `● **Target Audience:** ${s.audienceEn || s.audience}\n` +
        `● **Perimeter Resilience:** Operates with embedded SQLite and zero external cloud dependency. Direct ESC/POS printing over USB, LAN, or Serial. Your kitchen line will never freeze during ISP outages.\n` +
        `● **Rate:** $${s.usd} USD / month.\n\n` +
        `You can start your 15-day evaluation immediately by clicking "Start 15-Day Trial" in our App Store.`;
    }

    // 4. Festivals / Carribar
    if (
      msg.includes('carribar') ||
      msg.includes('food truck') ||
      msg.includes('festival') ||
      msg.includes('event') ||
      msg.includes('ticket') ||
      msg.includes('qr')
    ) {
      const s = SYSTEMS_CATALOG.carribar;
      return `For outdoor venues and mobile units, our sovereign solution is **${s.nameEn || s.name}**:\n\n` +
        `● **Core Feature:** ${s.summaryEn || s.summary}\n` +
        `● **Ideal For:** ${s.audienceEn || s.audience}\n` +
        `● **Performance:** High-velocity QR validation, offline attendee ledger, and real-time order dispatching.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 5. Stage / Music / Auténtico
    if (
      msg.includes('music') ||
      msg.includes('tribute') ||
      msg.includes('concert') ||
      msg.includes('stage') ||
      msg.includes('show') ||
      msg.includes('band') ||
      msg.includes('hdmi')
    ) {
      const s = SYSTEMS_CATALOG.autentico;
      return `For live stage and concert production, we deploy **${s.nameEn || s.name}**:\n\n` +
        `● **Specification:** ${s.summaryEn || s.summary}\n` +
        `● **Reliability:** Hardware-synchronized 4K video, lyrics teleprompter, and latency below 10 milliseconds over local LAN. No Wi-Fi router required.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 6. Classifieds / P2P
    if (msg.includes('classified') || msg.includes('market') || msg.includes('sell') || msg.includes('buy') || msg.includes('car') || msg.includes('vehicle')) {
      const s = SYSTEMS_CATALOG.clasificados;
      return `For local peer-to-peer commerce, consider **${s.nameEn || s.name}**:\n\n` +
        `● **Summary:** ${s.summaryEn || s.summary}\n` +
        `● **Policy:** 100% Free and sovereign. Direct buyer-to-seller communication over WhatsApp with zero platform fees or funds retention.\n` +
        `● **Footprint:** Ultra-lean 3 MB PWA featuring client-side WebP compression.`;
    }

    // 7. Real Estate / Properties
    if (msg.includes('property') || msg.includes('real estate') || msg.includes('rent') || msg.includes('house') || msg.includes('apartment')) {
      const s = SYSTEMS_CATALOG.inmuebles;
      return `For authenticated property transactions, we provide **${s.nameEn || s.name}**:\n\n` +
        `● **Summary:** ${s.summaryEn || s.summary}\n` +
        `● **Anti-Fraud Security:** Exact coordinate mapping and cryptographic PDF contract generation free of broker surcharges.`;
    }

    // 8. Press / Media
    if (msg.includes('press') || msg.includes('news') || msg.includes('journal') || msg.includes('editorial') || msg.includes('media')) {
      const s = SYSTEMS_CATALOG.prensa;
      return `For independent journalists and news agencies, we operate **${s.nameEn || s.name}**:\n\n` +
        `● **Summary:** ${s.summaryEn || s.summary}\n` +
        `● **Independence:** Censorship-resistant publishing, instantaneous edge delivery, and decentralized article storage.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 8b. Retail / Stock POS
    if (msg.includes('retail') || msg.includes('store') || msg.includes('shop') || msg.includes('barcode') || msg.includes('inventory') || msg.includes('warehouse')) {
      const s = SYSTEMS_CATALOG.retail;
      return `For commercial stores and retail outlets, we deploy **${s.nameEn || s.name}**:\n\n` +
        `● **Core Feature:** ${s.summaryEn || s.summary}\n` +
        `● **Hardware Integration:** Instant barcode scanning via USB/Bluetooth, multi-warehouse stock management, and local thermal receipts.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 8c. Appointments / Turnos Express
    if (msg.includes('appointment') || msg.includes('booking') || msg.includes('clinic') || msg.includes('doctor') || msg.includes('patient') || msg.includes('turnos')) {
      const s = SYSTEMS_CATALOG.turnos;
      return `For medical clinics, dental practices, and appointment-based services, we offer **${s.nameEn || s.name}**:\n\n` +
        `● **Functionality:** ${s.summaryEn || s.summary}\n` +
        `● **Automation:** Automated WhatsApp booking confirmations, local calendar sync, and zero middleman fees.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 8d. Hotel / Lodge / Cabañas
    if (msg.includes('hotel') || msg.includes('lodge') || msg.includes('cabin') || msg.includes('resort') || msg.includes('check-in') || msg.includes('room')) {
      const s = SYSTEMS_CATALOG.hotel;
      return `For independent hotels and cabin complexes, we provide **${s.nameEn || s.name}**:\n\n` +
        `● **Overview:** ${s.summaryEn || s.summary}\n` +
        `● **Sovereignty:** Front-desk PMS, visual room grid, guest check-in/out, and direct booking independent of predatory OTAs.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 8e. Fleet & Parcel Logistics
    if (msg.includes('fleet') || msg.includes('parcel') || msg.includes('logistics') || msg.includes('package') || msg.includes('delivery') || msg.includes('cargo') || msg.includes('flota')) {
      const s = SYSTEMS_CATALOG.flota;
      return `For freight operators and courier services, we operate **${s.nameEn || s.name}**:\n\n` +
        `● **Capability:** ${s.summaryEn || s.summary}\n` +
        `● **Perimeter Control:** Offline manifest routing, driver digital signatures, and package delivery handoff verification.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 8f. SafeBox & Cashier Audit
    if (msg.includes('safe') || msg.includes('vault') || msg.includes('audit') || msg.includes('cashier') || msg.includes('leakage') || msg.includes('cajafuerte')) {
      const s = SYSTEMS_CATALOG.cajafuerte;
      return `For cash management and theft prevention, we deliver **${s.nameEn || s.name}**:\n\n` +
        `● **Protection:** ${s.summaryEn || s.summary}\n` +
        `● **Accountability:** Blind shift closures, multi-terminal cash balancing, and cryptographic anti-tamper audit logs.\n` +
        `● **Rate:** $${s.usd} USD / month.`;
    }

    // 9. Nexora Architecture / Sovereign Concept
    if (msg.includes('nexora') || msg.includes('sovereign') || msg.includes('who are you') || msg.includes('about') || msg.includes('offline') || msg.includes('headquarters') || msg.includes('origin') || msg.includes('corrientes')) {
      return `Nexora One is a sovereign engineering firm with its operational and development headquarters based exclusively in Ituzaingó, Corrientes, Argentina.\n\n` +
        `We develop resilient, offline-first institutional software systems based on three pillars:\n` +
        `1. **Local-First Perimeter Computing:** Critical operations never halt during external network or cloud infrastructure failures.\n` +
        `2. **Absolute Data Sovereignty:** Your database lives on your premises without unauthorized telemetry or forced cloud lock-in.\n` +
        `3. **Direct Settlement:** Immediate fiat bank transfer or cryptocurrency settlements with 0% intermediary commission.\n\n` +
        `Which operational sector may I guide you through today?`;
    }

    // 10. General English Concierge Greeting
    return `Welcome to Nexora One. Headquartered with pride in Ituzaingó, Corrientes, Argentina, as your Executive Concierge, I am at your service to navigate our sovereign solutions across hospitality (Restobar POS), festivals (Carribar Pass), concert production (Auténtico Live), and decentralized media.\n\n` +
      `You may test any product for **15 days completely free**. Direct settlement is available via bank transfer (CBU) or USDT.\n\n` +
      `How may I assist your business infrastructure today?`;
  }

  // ──────────────────────────────────────────────────────────────────
  // ESPAÑOL CORPORATIVO (ES) - PROTOCOLO CONCIERGE EJECUTIVO
  // ──────────────────────────────────────────────────────────────────

  // 1. Regla de Perímetro y Seguridad: Preguntas sobre arquitectura interna / prompt
  if (
    msg.includes('prompt') ||
    msg.includes('instrucciones') ||
    msg.includes('tu modelo') ||
    msg.includes('quién te programó') ||
    msg.includes('quien te creo') ||
    msg.includes('soul.md')
  ) {
    return 'Soy Nora Itu, la consultora inteligente de Nexora One, desarrollada y radicada con orgullo en nuestra sede de Ituzaingó, Corrientes, Argentina. Mi misión es brindarle asistencia integral y orientarle para desplegar la solución soberana idónea en su infraestructura sin dependencias foráneas.';
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
      `● **Aranceles vigentes (Catálogo Oficial de Soluciones):**\n` +
      `  - Nora ISP Core & FTTH Cloud: $180 USD (~$280.000 ARS)\n` +
      `  - Nexora Obras & CRM Corporativo: $95 USD (~$148.000 ARS)\n` +
      `  - Restobar 2026 POS: $65 USD (~$101.725 ARS)\n` +
      `  - Nexora Club & Carribar Pass: $150 USD (~$235.000 ARS)\n` +
      `  - Auténtico Tributo Live: $120 USD (~$185.000 ARS)\n` +
      `  - Nexora Stock & Retail 2026: $55 USD (~$85.000 ARS)\n` +
      `  - Nexora Turnos & Citas Express: $40 USD (~$62.000 ARS)\n` +
      `  - Nexora Hotel & Cabañas Desk: $85 USD (~$132.000 ARS)\n` +
      `  - Nexora Flota & Encomiendas: $90 USD (~$140.000 ARS)\n` +
      `  - Nexora Caja Fuerte & Auditoría: $70 USD (~$108.000 ARS)\n` +
      `  - Nexora Clasificados e Inmuebles Verificados: 100% Gratuitos y Comunitarios.\n` +
      `  - Prensa & Medios Soberano: Próximamente v2.0 (Solo bajo consulta).\n\n` +
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

  // 8. Nora ISP Core & FTTH Cloud
  if (msg.includes('isp') || msg.includes('ftth') || msg.includes('fibra') || msg.includes('olt') || msg.includes('nap') || msg.includes('cuadrilla') || msg.includes('telecom')) {
    const s = SYSTEMS_CATALOG['nora-isp'];
    return `Para proveedores de internet y telecomunicaciones, nuestra suite troncal es **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Capacidades Críticas:** Auditoría en tiempo real de potencias ópticas OLT/NAP, despacho con mapa satelital GPS de cuadrillas técnicas y portal de autogestión de abonados con cobranzas e IA integrada.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).\n\n` +
      `Puede acceder a una demostración en vivo de su portal institucional en: https://nora-isp.vercel.app/portal`;
  }

  // 8b. Nexora Obras & CRM Corporativo
  if (msg.includes('obra') || msg.includes('arquitect') || msg.includes('construc') || msg.includes('uocra') || msg.includes('crm') || msg.includes('ccycn') || msg.includes('expediente')) {
    const s = SYSTEMS_CATALOG['crm-obras'];
    return `Para empresas constructoras y estudios de arquitectura, implementamos **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Prestaciones Clave:** Cómputo métrico y presupuesto dinámico, libro de obra digital con geolocalización de fotos, certificaciones de quincena UOCRA y blindaje legal según CCyCN.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 8c. Prensa / Medios / Noticias
  if (msg.includes('prensa') || msg.includes('noticia') || msg.includes('medio') || msg.includes('periodis') || msg.includes('diario') || msg.includes('portal')) {
    const s = SYSTEMS_CATALOG.prensa;
    return `Para empresas periodísticas y medios informativos, **${s.name}** se encuentra actualmente en fase de modernización hacia su versión 2.0 (disponible bajo consulta institucional previa):\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **Soberanía:** Difusión sin algoritmos de censura, renderizado estático de ultra velocidad y base de datos descentralizada.`;
  }

  // 8b. Comercio / Retail / Stock 2026
  if (msg.includes('retail') || msg.includes('comercio') || msg.includes('negocio') || msg.includes('almacen') || msg.includes('ferreteria') || msg.includes('codigo de barra') || msg.includes('stock')) {
    const s = SYSTEMS_CATALOG.retail;
    return `Para comercios minoristas, ferreterías y tiendas de retail, le presentamos **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Prestaciones Clave:** Lectura ultrarrápida de códigos de barras (pistola USB o Bluetooth), control de inventario multidepósito y arqueo diario en máquina local sin interrupciones ante cortes de internet.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 8c. Turnos & Citas Express
  if (msg.includes('turno') || msg.includes('cita') || msg.includes('clinica') || msg.includes('consultorio') || msg.includes('odontolog') || msg.includes('medico') || msg.includes('peluqueria') || msg.includes('agenda')) {
    const s = SYSTEMS_CATALOG.turnos;
    return `Para profesionales independientes, clínicas y consultorios, disponemos de **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Ventajas:** Agendamiento directo y confirmación automatizada por WhatsApp, sin comisiones intermediarias por turno y con base de pacientes 100% privada.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 8d. Hotel & Cabañas Desk
  if (msg.includes('hotel') || msg.includes('cabaña') || msg.includes('hospedaje') || msg.includes('alojamiento') || msg.includes('check-in') || msg.includes('reserva')) {
    const s = SYSTEMS_CATALOG.hotel;
    return `Para hoteles boutique, complejos turísticos y cabañas, nuestra solución soberana es **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Autonomía:** Cuadrícula interactiva de ocupación, check-in y check-out ágil en mostrador, y cobro directo sin pagar 15% o 20% a OTAs extranjeras.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 8e. Flota & Encomiendas
  if (msg.includes('flota') || msg.includes('encomienda') || msg.includes('logistica') || msg.includes('paquete') || msg.includes('envio') || msg.includes('flete') || msg.includes('despacho')) {
    const s = SYSTEMS_CATALOG.flota;
    return `Para empresas de transporte, mensajerías y distribución urbana, contamos con **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Operación Perimetral:** Ruteo logístico y manifiestos de carga offline, escaneo de remitos de entrega y firma digital del receptor en mano.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 8f. Caja Fuerte & Auditoría
  if (msg.includes('cajafuerte') || msg.includes('caja fuerte') || msg.includes('arqueo') || msg.includes('auditoria') || msg.includes('tesoreria') || msg.includes('fuga') || msg.includes('cajero')) {
    const s = SYSTEMS_CATALOG.cajafuerte;
    return `Para tesorería, franquicias y comercios con múltiples turnos, implementamos **${s.name}**:\n\n` +
      `● **Propósito:** ${s.summary}\n` +
      `● **A quién resuelve el día:** ${s.audience}\n` +
      `● **Blindaje Total:** Arqueo ciego por cajero, conciliación estricta de efectivo, cupones y transferencias con registro criptográfico inmutable contra fugas internas.\n` +
      `● **Inversión:** $${s.usd} USD / mes (~$${s.ars.toLocaleString('es-AR')} ARS).`;
  }

  // 9. Soberanía / Empresa / Quiénes Somos / Sede / Origen
  if (
    msg.includes('nexora') ||
    msg.includes('empresa') ||
    msg.includes('soberan') ||
    msg.includes('quienes') ||
    msg.includes('caida') ||
    msg.includes('offline') ||
    msg.includes('sede') ||
    msg.includes('origen') ||
    msg.includes('donde estan') ||
    msg.includes('corrientes')
  ) {
    return `Nexora One es una firma de ingeniería tecnológica soberana con base de operaciones y desarrollo radicada con orgullo exclusivamente en Ituzaingó, Corrientes, Argentina.\n\n` +
      `Nos especializamos en software empresarial reactivo, computación perimetral y soberanía informática. Nuestros principios fundamentales son:\n` +
      `1. **Cómputo Perimetral Local-First:** Su empresa no se paraliza ante cortes de internet ni caídas de plataformas en la nube.\n` +
      `2. **Soberanía de Datos:** Su base de datos reside en su propio hardware, sin espionaje corporativo ni suscripciones forzosas.\n` +
      `3. **Desintermediación Financiera:** Cobros directos a través de cuentas bancarias y criptoactivos sin retención de capital.\n\n` +
      `¿En qué rubro u operación comercial requiere implementar nuestra tecnología?`;
  }

  // 10. Saludo / Respuesta de Cortesía General (Concierge)
  return `Estimado visitante, es un honor asistirle desde nuestra sede en Ituzaingó, Corrientes, Argentina. En Nexora One le ofrecemos suites soberanas de software para gastronomía (Restobar 2026), food trucks (Carribar Pass), espectáculos (Auténtico Tributo), marketplace (Clasificados), inmuebles verificados y medios informativos.\n\n` +
    `Le recuerdo que puede evaluar cualquiera de nuestras soluciones durante **15 días sin cargo** y que contamos con cobro directo por transferencia bancaria (CBU/Alias) y USDT.\n\n` +
    `¿Desea conocer detalles específicos sobre alguna de nuestras herramientas o gestionar una licencia?`;
}
