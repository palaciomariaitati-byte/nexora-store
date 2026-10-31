export type Language = 'es' | 'en';

export interface Translations {
  nav: {
    ecosystem: string;
    about: string;
    cases: string;
    appstore: string;
    licenses: string;
    explore: string;
    mobileAccess: string;
    closeAdmin: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    exploreBtn: string;
    casesBtn: string;
    licensesBtn: string;
    techCore: string;
    techArch: string;
    techAgent: string;
    techTagline: string;
  };
  about: {
    sectionTag: string;
    title: string;
    subtitle: string;
    card1Title: string;
    card1Desc: string;
    card2Title: string;
    card2Desc: string;
    card3Title: string;
    card3Desc: string;
  };
  cases: {
    badge: string;
    title: string;
    subtitle: string;
    telemetryTag: string;
    case1Badge: string;
    case1Title: string;
    case1Sub: string;
    case1Desc: string;
    case1MetricVal: string;
    case1MetricLbl: string;
    case1MetricTag: string;
    case2Badge: string;
    case2Title: string;
    case2Sub: string;
    case2Desc: string;
    case2MetricVal: string;
    case2MetricLbl: string;
    case2MetricTag: string;
    case3Badge: string;
    case3Title: string;
    case3Sub: string;
    case3Desc: string;
    case3MetricVal: string;
    case3MetricLbl: string;
    case3MetricTag: string;
  };
  appstore: {
    tag: string;
    title: string;
    searchPlaceholder: string;
    categories: {
      all: string;
      gastronomia: string;
      clasificados: string;
      inmuebles: string;
      musica: string;
      prensa: string;
    };
    activeCount: string;
    globeTitle: string;
    globeSub: string;
    globeHint: string;
    tryBtn: string;
    detailsBtn: string;
    targetTitle: string;
    featuresTitle: string;
    priceUsd: string;
    priceArs: string;
    freePrice: string;
  };
  trialModal: {
    badge: string;
    title: string;
    desc: string;
    fullName: string;
    fullNamePlaceholder: string;
    business: string;
    businessPlaceholder: string;
    businessNote: string;
    whatsapp: string;
    email: string;
    emailPlaceholder: string;
    submitBtn: string;
    submittingBtn: string;
    securityNote: string;
    successBadge: string;
    successDesc: string;
    licenseKeyLabel: string;
    expiresLabel: string;
    copyBtn: string;
    copiedBtn: string;
    sendWaBtn: string;
    supportBtn: string;
    downloadJsonBtn: string;
    closeBtn: string;
  };
  qrModal: {
    badge: string;
    title: string;
    subtitle: string;
    desc: string;
    qr1Badge: string;
    qr1Title: string;
    qr1Desc: string;
    qr1Action: string;
    copyNav: string;
    qr2Badge: string;
    qr2Title: string;
    qr2Desc: string;
    qr2Action: string;
    copyPwa: string;
    copyLink: string;
    copiedLink: string;
    close: string;
  };
  footer: {
    brand: string;
    copyright: string;
    terms: string;
    privacy: string;
    cryptoVerify: string;
    phone: string;
    email: string;
  };
  admin: {
    restricted: string;
    title: string;
    subtitle: string;
    exit: string;
    tabLicenses: string;
    tabPayments: string;
    tabCatalog: string;
    presencialTitle: string;
    presencialDesc: string;
    presencialClient: string;
    presencialBusiness: string;
    presencialWhatsapp: string;
    presencialEmail: string;
    presencialSystem: string;
    presencialMethod: string;
    presencialNotes: string;
    presencialSubmit: string;
    receiptTitle: string;
    receiptCopy: string;
    receiptSendWa: string;
    dossierTitle: string;
    cycleStage: string;
    cycleDay: string;
    daysRemaining: string;
    graceLimit: string;
    extendGrace: string;
    forceSuspend: string;
    renewCycle: string;
    sendWhatsappNotice: string;
    sendEmailNotice: string;
    auditHistory: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  es: {
    nav: {
      ecosystem: 'Ecosistema',
      about: 'Nosotros',
      cases: 'Casos de Éxito',
      appstore: 'App Store',
      licenses: 'Licencias',
      explore: 'Explorar Sistemas',
      mobileAccess: 'Acceso Móvil / QR',
      closeAdmin: 'Cerrar Sesión Admin',
    },
    hero: {
      badge: 'Plataforma Tecnológica Soberana de Nueva Generación',
      title: 'Infraestructura de alto rendimiento y software empresarial escalable',
      description: 'Impulsamos la expansión operativa mediante motores de cómputo reactivo offline-first, licenciamiento corporativo automatizado y nuestro agente insignia de IA Nora Itu.',
      exploreBtn: 'Explorar App Store',
      casesBtn: 'Casos de Éxito',
      licensesBtn: 'Ver Licencias',
      techCore: 'NÚCLEO',
      techArch: 'ARQUITECTURA',
      techAgent: 'AGENTE',
      techTagline: 'NÚCLEO: NEXORA ONE ENGINE | ARQUITECTURA: SOBERANA 2026 | AGENTE: NORA ITU',
    },
    about: {
      sectionTag: 'Identidad Corporativa',
      title: 'Ingeniería para Empresas que Exigen Autonomía',
      subtitle: 'Arquitectura de software que jamás colapsa ante cortes de internet ni retiene fondos.',
      card1Title: 'Qué Hacemos',
      card1Desc: 'Motores offline-first para gastronomía, carribars, medios periodísticos, marketplaces P2P y sincronizadores de show en vivo sin nube intermedia.',
      card2Title: 'Nuestras Políticas',
      card2Desc: 'Soberanía de datos absoluta. Cero telemetría externa. Todos los programas operan sobre el propio hardware del adquirente con réplica local.',
      card3Title: 'Nuestras Metas',
      card3Desc: 'Eliminar intermediarios abusivos y suscripciones cautivas, devolviendo rentabilidad y control total a los negocios.',
    },
    cases: {
      badge: 'RESULTADOS Y RENDIMIENTO VERIFICADO',
      title: 'Casos de Éxito & Métricas Reales',
      subtitle: 'Despliegues reales en empresas e instituciones que demandan tolerancia cero a interrupciones y soberanía operativa estricta.',
      telemetryTag: '● Telemetría Perimetral Auditada',
      case1Badge: 'GASTRONOMÍA & FRANQUICIAS',
      case1Title: 'Restobar 2026 POS',
      case1Sub: 'Cadena Gastronómica Multisede',
      case1Desc: 'Terminal de punto de venta reactiva con SQLite local e impresión térmica directa ESC/POS.',
      case1MetricVal: '100%',
      case1MetricLbl: 'operatividad en caídas',
      case1MetricTag: 'TOLERANCIA CERO',
      case2Badge: 'EVENTOS & FOOD PARKS',
      case2Title: 'Nexora Club & Carribar Pass',
      case2Sub: 'Control de Acceso en Tiempo Real',
      case2Desc: 'Despacho masivo y validación criptográfica de pases en predios al aire libre con congestión de antenas celulares o señal nula.',
      case2MetricVal: '+1.400',
      case2MetricLbl: 'pases QR / jornada',
      case2MetricTag: 'CERO COLAS',
      case3Badge: 'MEDIOS & COMUNICACIÓN',
      case3Title: 'Red de Prensa Soberana',
      case3Sub: 'Distribución de Contenidos Libres',
      case3Desc: 'Publicación periodística y réplica descentralizada barrial/regional con compresión WebP ultra-liviana y sindicación sin censura.',
      case3MetricVal: '99.98%',
      case3MetricLbl: 'disponibilidad',
      case3MetricTag: 'ALTA CARGA',
    },
    appstore: {
      tag: 'CATÁLOGO SOBERANO DE PRODUCCIÓN',
      title: 'Sistemas Listos para Producción',
      searchPlaceholder: 'Buscar en catálogo...',
      categories: {
        all: 'Todos',
        gastronomia: 'Gastronomía',
        clasificados: 'Clasificados',
        inmuebles: 'Inmuebles',
        musica: 'Música & Show',
        prensa: 'Prensa',
      },
      activeCount: 'Activos en Red',
      globeTitle: 'Nodo Soberano Orbital 3D',
      globeSub: 'Infraestructura Descentralizada',
      globeHint: 'Arrastre para orbitar el globo interactivo y visualizar nodos',
      tryBtn: 'Probar 15 Días',
      detailsBtn: 'Adquirir',
      targetTitle: '¿A QUIÉN LE RESUELVE EL DÍA?',
      featuresTitle: 'ESPECIFICACIONES TÉCNICAS',
      priceUsd: 'USD / mes',
      priceArs: 'ARS estimado',
      freePrice: 'Gratuito / P2P',
    },
    trialModal: {
      badge: 'EVALUACIÓN SOBERANA 15 DÍAS',
      title: 'Solicitud de Acceso de Evaluación',
      desc: 'Active acceso de evaluación completo por 15 días continuos con motor local y controladores comanderos sin ingresar tarjeta de crédito.',
      fullName: 'NOMBRE COMPLETO *',
      fullNamePlaceholder: 'Ej: Marcelo Díaz',
      business: 'COMERCIO / RAZÓN SOCIAL',
      businessPlaceholder: 'Ej: Bistró Central (Opcional)',
      businessNote: '* Dejar en blanco si es uso personal o profesional independiente.',
      whatsapp: 'WHATSAPP DE ACTIVACIÓN *',
      email: 'CORREO ELECTRÓNICO *',
      emailPlaceholder: 'contacto@empresa.com',
      submitBtn: 'Solicitar Acceso y Clave Criptográfica',
      submittingBtn: 'Generando Clave...',
      securityNote: 'Sin retención de fondos · Instalación en máquina local · Soporte de Nora Itu',
      successBadge: '✓ ACCESO SOBERANO EMITIDO',
      successDesc: 'Su licencia de evaluación por 15 días ha sido activada exitosamente.',
      licenseKeyLabel: 'CLAVE CRIPTOGRÁFICA DE LICENCIA',
      expiresLabel: 'Vence el:',
      copyBtn: 'Copiar',
      copiedBtn: '¡Copiado!',
      sendWaBtn: '📲 Enviar Licencia y Acceso a mi WhatsApp',
      supportBtn: '💬 Contactar Asistencia Oficial (+54 9 3786 414533)',
      downloadJsonBtn: '⬇ Descargar también copia local en formato .json',
      closeBtn: 'Cerrar',
    },
    qrModal: {
      badge: 'CONEXIÓN OMNICANAL',
      title: 'Acceso Móvil Soberano & Instalador PWA',
      subtitle: 'Escanee directamente con su dispositivo Android o iOS sin instalar aplicaciones de terceros.',
      desc: 'Escanee con la cámara de su smartphone para acceder al entorno o instalar la App Store directamente como aplicación nativa offline.',
      qr1Badge: 'NAVEGACIÓN MÓVIL',
      qr1Title: 'Portal Móvil Soberano',
      qr1Desc: 'Navegación táctil optimizada en smartphones con aceleración de hardware local.',
      qr1Action: 'Abrir en Móvil',
      copyNav: 'Copiar Enlace Móvil',
      qr2Badge: 'INSTALADOR PWA',
      qr2Title: 'Instalador App Store PWA',
      qr2Desc: 'Instale Nexora One Engine en su pantalla de inicio con soporte offline persistente.',
      qr2Action: 'Instalar App Store',
      copyPwa: 'Copiar Enlace PWA',
      copyLink: 'Copiar Enlace Web',
      copiedLink: '¡Enlace Copiado!',
      close: 'Cerrar',
    },
    footer: {
      brand: 'Nexora One Engine',
      copyright: '© 2026 Nexora One Engine. Todos los derechos reservados. Arquitectura de Software Soberano e Infraestructura Perimetral Independiente. Diseñado y Desarrollado por MyJNexoraVisual (NexoraOne).',
      terms: 'Términos de Servicio',
      privacy: 'Política de Privacidad',
      cryptoVerify: 'Verificación Criptográfica SHA-256',
      phone: 'Tel: 3786414533',
      email: 'nexoraone@nexativanews.com.ar',
    },
    admin: {
      restricted: 'ÁREA RESTRINGIDA',
      title: 'Panel de Administración Soberano',
      subtitle: 'Control de catálogo sincronizado con Supabase, precios duales ($ ARS / USD) y gestión de licencias.',
      exit: '← Salir al Sitio Público',
      tabLicenses: 'Descargas & Licencias de Clientes',
      tabPayments: 'Formas de Pago',
      tabCatalog: 'Catálogo & Precios',
      presencialTitle: 'Nueva Licencia Presencial / Mostrador',
      presencialDesc: 'Emisión inmediata de licencia de 30 días + 5 de gracia con registro presencial de pago.',
      presencialClient: 'CLIENTE / TITULAR *',
      presencialBusiness: 'COMERCIO / EMPRESA',
      presencialWhatsapp: 'WHATSAPP DE ACTIVACIÓN *',
      presencialEmail: 'CORREO ELECTRÓNICO *',
      presencialSystem: 'SISTEMA A VINCULAR *',
      presencialMethod: 'MÉTODO DE COBRO EN MOSTRADOR *',
      presencialNotes: 'NOTAS / REFERENCIA DE COBRO',
      presencialSubmit: 'Emitir Licencia y Cobrar en Mostrador',
      receiptTitle: 'Comprobante Criptográfico de Alta Presencial',
      receiptCopy: 'Copiar Recibo Criptográfico',
      receiptSendWa: 'Enviar Recibo por WhatsApp',
      dossierTitle: 'Expediente Granular del Cliente',
      cycleStage: 'ETAPA ACTUAL',
      cycleDay: 'DÍA DEL CICLO',
      daysRemaining: 'DÍAS RESTANTES',
      graceLimit: 'LÍMITE GRACIA',
      extendGrace: 'Extender Gracia (+5d)',
      forceSuspend: 'Suspender Forzosamente',
      renewCycle: 'Reactivar / Renovar (+30d)',
      sendWhatsappNotice: 'Disparar a WhatsApp del Cliente',
      sendEmailNotice: 'Disparar Correo Corporativo (SMTP Simulado)',
      auditHistory: 'HISTORIAL DE EVENTOS Y DISPACHOS',
    },
  },
  en: {
    nav: {
      ecosystem: 'Ecosystem',
      about: 'About Us',
      cases: 'Case Studies',
      appstore: 'App Store',
      licenses: 'Licenses',
      explore: 'Explore Systems',
      mobileAccess: 'Mobile Access / QR',
      closeAdmin: 'Log Out Admin',
    },
    hero: {
      badge: 'Next-Generation Sovereign Technology Platform',
      title: 'High-performance infrastructure and resilient enterprise software',
      description: 'We power institutional scale through offline-first reactive compute engines, automated corporate licensing, and our flagship AI concierge Nora Itu.',
      exploreBtn: 'Explore App Store',
      casesBtn: 'Case Studies',
      licensesBtn: 'View Licenses',
      techCore: 'CORE',
      techArch: 'ARCHITECTURE',
      techAgent: 'AGENT',
      techTagline: 'CORE: NEXORA ONE ENGINE | ARCHITECTURE: SOVEREIGN 2026 | AGENT: NORA ITU',
    },
    about: {
      sectionTag: 'Corporate Identity',
      title: 'Engineering for Enterprises Demanding Autonomy',
      subtitle: 'Software architecture immune to cloud outages, ISP cuts, and predatory escrow fees.',
      card1Title: 'What We Build',
      card1Desc: 'Offline-first systems for gastronomy, festivals, independent newsrooms, P2P marketplaces, and live stage sync hubs with zero external cloud dependencies.',
      card2Title: 'Our Principles',
      card2Desc: 'Absolute data sovereignty. Zero telemetry or surveillance. All software operates natively on client hardware with robust local database redundancy.',
      card3Title: 'Our Mission',
      card3Desc: 'Dismantle abusive intermediaries and forced cloud subscriptions, restoring profitability and autonomous control to businesses.',
    },
    cases: {
      badge: 'VERIFIED PERFORMANCE & METRICS',
      title: 'Real-World Deployments & Case Studies',
      subtitle: 'Operational deployments across demanding enterprises with strict requirements for zero downtime and data sovereignty.',
      telemetryTag: '● Audited Perimeter Telemetry',
      case1Badge: 'HOSPITALITY & CHAINS',
      case1Title: 'Restobar 2026 POS',
      case1Sub: 'Multi-Location Restaurant Group',
      case1Desc: 'Reactive point-of-sale terminal with embedded SQLite and direct ESC/POS thermal printing.',
      case1MetricVal: '100%',
      case1MetricLbl: 'uptime during outages',
      case1MetricTag: 'ZERO DOWNTIME',
      case2Badge: 'EVENTS & FOOD PARKS',
      case2Title: 'Nexora Club & Carribar Pass',
      case2Sub: 'Real-Time Access Control',
      case2Desc: 'High-throughput QR admission and order dispatch in crowded outdoor festival venues with zero cellular signal.',
      case2MetricVal: '+1,400',
      case2MetricLbl: 'QR passes / festival day',
      case2MetricTag: 'ZERO QUEUES',
      case3Badge: 'MEDIA & PRESS',
      case3Title: 'Sovereign Press Network',
      case3Sub: 'Decentralized Content Distribution',
      case3Desc: 'Editorial news publishing and edge caching featuring ultra-lightweight WebP compression and censorship-resistant syndication.',
      case3MetricVal: '99.98%',
      case3MetricLbl: 'global availability',
      case3MetricTag: 'HIGH LOAD',
    },
    appstore: {
      tag: 'SOVEREIGN PRODUCTION CATALOG',
      title: 'Production-Ready Enterprise Systems',
      searchPlaceholder: 'Search catalog...',
      categories: {
        all: 'All',
        gastronomia: 'Hospitality',
        clasificados: 'Classifieds',
        inmuebles: 'Real Estate',
        musica: 'Music & Stage',
        prensa: 'Press & Media',
      },
      activeCount: 'Active Network Nodes',
      globeTitle: '3D Orbital Sovereign Node',
      globeSub: 'Decentralized Perimeter Mesh',
      globeHint: 'Drag to rotate the interactive globe and inspect deployed nodes',
      tryBtn: 'Start 15-Day Trial',
      detailsBtn: 'Acquire',
      targetTitle: 'WHO BENEFIT FROM THIS SYSTEM?',
      featuresTitle: 'TECHNICAL SPECIFICATIONS',
      priceUsd: 'USD / month',
      priceArs: 'Est. ARS',
      freePrice: 'Free / Sovereign P2P',
    },
    trialModal: {
      badge: '15-DAY SOVEREIGN EVALUATION',
      title: 'Evaluation Access Request',
      desc: 'Activate full evaluation access for 15 continuous days with sovereign local runtime and thermal ticket printer drivers without credit card.',
      fullName: 'FULL NAME *',
      fullNamePlaceholder: 'E.g., Marcus Vance',
      business: 'BUSINESS / COMPANY NAME',
      businessPlaceholder: 'E.g., Coastal Bistro LLC',
      businessNote: '* Leave blank for personal or independent professional use.',
      whatsapp: 'ACTIVATION WHATSAPP *',
      email: 'CORPORATE EMAIL *',
      emailPlaceholder: 'contact@yourcompany.com',
      submitBtn: 'Request Access & Cryptographic Key',
      submittingBtn: 'Generating Key...',
      securityNote: 'Zero fund withholding · Local machine deployment · Nora Itu Executive Support',
      successBadge: '✓ SOVEREIGN ACCESS GRANTED',
      successDesc: 'Your 15-day evaluation license has been activated successfully.',
      licenseKeyLabel: 'CRYPTOGRAPHIC LICENSE KEY',
      expiresLabel: 'Expires:',
      copyBtn: 'Copy',
      copiedBtn: 'Copied!',
      sendWaBtn: '📲 Send License & Access to my WhatsApp',
      supportBtn: '💬 Contact Executive Support (+54 9 3786 414533)',
      downloadJsonBtn: '⬇ Download local credential package (.json)',
      closeBtn: 'Close',
    },
    qrModal: {
      badge: 'OMNICHANNEL CONNECTIVITY',
      title: 'Mobile Access & PWA Store Install',
      subtitle: 'Scan directly with your Android or iOS camera without installing third-party apps.',
      desc: 'Scan with your smartphone camera to access the sovereign runtime or install the App Store directly as an offline native application.',
      qr1Badge: 'MOBILE BROWSING',
      qr1Title: 'Sovereign Mobile Portal',
      qr1Desc: 'Optimized touch navigation on smartphones with zero downloads required.',
      qr1Action: 'Open on Mobile',
      copyNav: 'Copy Mobile Link',
      qr2Badge: 'PWA INSTALLER',
      qr2Title: 'Native PWA App Store',
      qr2Desc: 'Install Nexora One Engine to your home screen with persistent edge caching.',
      qr2Action: 'Install App Store',
      copyPwa: 'Copy PWA Link',
      copyLink: 'Copy Web Link',
      copiedLink: 'Link Copied!',
      close: 'Close',
    },
    footer: {
      brand: 'Nexora One Engine',
      copyright: '© 2026 Nexora One Engine. Todos los derechos reservados. Arquitectura de Software Soberano e Infraestructura Perimetral Independiente. Diseñado y Desarrollado por MyJNexoraVisual (NexoraOne).',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      cryptoVerify: 'Cryptographic Verification (SHA-256)',
      phone: 'Phone: +54 9 3786 414533',
      email: 'nexoraone@nexativanews.com.ar',
    },
    admin: {
      restricted: 'RESTRICTED AREA',
      title: 'Sovereign Admin Panel',
      subtitle: 'Catalog control synced with Supabase, dual pricing ($ ARS / USD), and customer licensing.',
      exit: '← Return to Public Site',
      tabLicenses: 'Customer Downloads & Licenses',
      tabPayments: 'Payment Methods',
      tabCatalog: 'Catalog & Dual Pricing',
      presencialTitle: 'New Over-The-Counter License',
      presencialDesc: 'Instant issuance of 30-day license + 5-day grace buffer with in-person cash/transfer receipt.',
      presencialClient: 'CLIENT / HOLDER NAME *',
      presencialBusiness: 'COMPANY / STORE NAME',
      presencialWhatsapp: 'ACTIVATION WHATSAPP *',
      presencialEmail: 'CORPORATE EMAIL *',
      presencialSystem: 'SYSTEM TO ASSIGN *',
      presencialMethod: 'PAYMENT METHOD RECEIVED *',
      presencialNotes: 'INTERNAL NOTES / RECEIPT REF',
      presencialSubmit: 'Issue Sovereign License & Confirm Payment',
      receiptTitle: 'Cryptographic Payment Receipt',
      receiptCopy: 'Copy Cryptographic Receipt',
      receiptSendWa: 'Send Receipt via WhatsApp',
      dossierTitle: 'Customer Comprehensive Dossier',
      cycleStage: 'CURRENT STAGE',
      cycleDay: 'CYCLE DAY',
      daysRemaining: 'DAYS REMAINING',
      graceLimit: 'GRACE DEADLINE',
      extendGrace: 'Extend Grace (+5d)',
      forceSuspend: 'Force Suspension',
      renewCycle: 'Renew Cycle (+30d)',
      sendWhatsappNotice: 'Dispatch via Client WhatsApp',
      sendEmailNotice: 'Dispatch Corporate Email (Simulated SMTP)',
      auditHistory: 'AUDIT LOG & DISPATCH HISTORY',
    },
  },
};

export function t(lang: Language): Translations {
  return TRANSLATIONS[lang] || TRANSLATIONS.es;
}
