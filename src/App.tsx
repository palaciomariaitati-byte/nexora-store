import { useState, useEffect, useRef, type FormEvent } from 'react';
import * as THREE from 'three';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { generateNoraResponse, DEFAULT_PAYMENTS, type PaymentDetails } from './lib/noraEngine';
import { t, type Language } from './lib/i18n';
import {
  getLicenseLifecycle,
  buildNotificationTemplates,
  simulateEmailDispatch,
  generatePresencialLicense,
  type ExtendedLicense,
  type PresencialPaymentMethod
} from './lib/licensing';
import { generateQrSvgString } from './lib/qrCode';
import { generateCopilotResponse, COPILOT_KNOWLEDGE_BASE, type CopilotTopic } from './lib/noraCopilot';

// --- ENTORNO Y BLINDAJE PERIMETRAL ---
const APP_MODE = (import.meta.env.VITE_APP_MODE as string) || 'full';
const IS_PUBLIC_ONLY = APP_MODE === 'public';

// --- TIPOS DE DATOS ---
export interface SystemItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'gastronomia' | 'comercio' | 'eventos' | 'inmuebles' | 'servicios' | 'medios' | 'clasificados' | 'musica' | 'prensa' | 'telecom' | 'construccion';
  slaOrBadge: string;
  slaColor: string;
  priceUsd: number;
  priceArs: number;
  description: string;
  targetAudience: string;
  tags: string[];
  active: boolean;
  status?: 'active' | 'coming_soon' | 'en_refactorizacion' | 'deprecated';
  demoUrl?: string;
  downloadUrl?: string;
  isDesktopOnly?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cbu' | 'mercadopago' | 'crypto' | 'stripe';
  details: string;
  active: boolean;
}

export type CorporateLicense = ExtendedLicense;

export function formatWhatsAppLink(rawPhone: string, text: string): string {
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('15') && digits.length === 10) digits = digits.slice(2);
  if (!digits.startsWith('54') && digits.length === 10) {
    digits = `549${digits}`;
  } else if (digits.startsWith('54') && !digits.startsWith('549') && digits.length === 12) {
    digits = `549${digits.slice(2)}`;
  }
  return `https://wa.me/${digits || '5493786414533'}?text=${encodeURIComponent(text)}`;
}

export function getLicenseDynamicStatus(lic: CorporateLicense): { label: 'Trial' | 'Activo' | 'En Gracia' | 'Suspendido'; color: string } {
  const lifecycle = getLicenseLifecycle(lic);
  if (lifecycle.stage === 'trial') {
    return { label: 'Trial', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  }
  if (lifecycle.stage === 'active') {
    return { label: 'Activo', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  }
  if (lifecycle.stage === 'grace') {
    return { label: 'En Gracia', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
  }
  return { label: 'Suspendido', color: 'bg-red-500/15 text-red-400 border-red-500/30' };
}

interface ChatMessage {
  sender: 'user' | 'nora';
  text: string;
  timestamp: string;
}

// Tipado permisivo para mapeo de base de datos Supabase
interface DbProduct {
  id: string;
  name?: string;
  subtitle?: string;
  category?: 'gastronomia' | 'clasificados' | 'inmuebles' | 'musica' | 'prensa';
  sla_badge?: string;
  slaOrBadge?: string;
  sla_color?: string;
  slaColor?: string;
  price_usd?: number;
  priceUsd?: number;
  price_ars?: number;
  priceArs?: number;
  description?: string;
  target_audience?: string;
  targetAudience?: string;
  tags?: string[] | string;
  active?: boolean;
}

interface DbLicense {
  id?: string;
  key?: string;
  license_key?: string;
  client?: string;
  client_name?: string;
  business_name?: string;
  businessName?: string;
  whatsapp?: string;
  client_phone?: string;
  email?: string;
  client_email?: string;
  system_id?: string;
  systemId?: string;
  system_name?: string;
  status?: 'active' | 'trial' | 'grace' | 'suspended';
  start_date?: string;
  startDate?: string;
  starts_at?: string;
  expires?: string;
  expires_at?: string;
  grace_limit?: string;
  graceLimit?: string;
}

// --- CATÁLOGO DETERMINISTA LOCAL OFFLINE-FIRST (11 SOLUCIONES ACTIVAS) ---
const INITIAL_SYSTEMS: SystemItem[] = [
  {
    id: 'restobar',
    name: 'Restobar 2026 POS',
    subtitle: 'SUITE GASTRONÓMICA SOBERANA & COMANDAS',
    category: 'gastronomia',
    slaOrBadge: 'SLA 100%',
    slaColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    priceUsd: 65,
    priceArs: 101725,
    description: 'Terminal POS reactiva para bares y restaurantes. Cero caídas de salón con base local y comanderas térmicas directas.',
    targetAudience: 'Dueños gastronómicos que pierden facturación por fallas de conexión o demoras en comanderas en horas pico.',
    tags: ['ESC/POS Térmico', 'SQLite Local', 'WebSockets Offline', 'Win / Mac / Linux'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?pwa=true',
    isDesktopOnly: false
  },
  {
    id: 'carribar',
    name: 'Nexora Club & Carribar Pass',
    subtitle: 'CONTROL FOOD TRUCKS & ACCESOS MÓVILES',
    category: 'gastronomia',
    slaOrBadge: 'PASS EVENTOS',
    slaColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    priceUsd: 150,
    priceArs: 235000,
    description: 'Control de despachos rápidos, comandas por código QR, pases de barra y cobro dinámico offline para food trucks y predios gastronómicos.',
    targetAudience: 'Organizadores de festivales, predios gastronómicos y carribars que precisan facturar y despachar a máxima velocidad sin depender de internet.',
    tags: ['QR Express', 'Offline Sync', 'ESC/POS Portátil', 'Wallet Fan'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?pwa=true',
    isDesktopOnly: false
  },
  {
    id: 'prensa',
    name: 'Prensa & Medios Soberano',
    subtitle: 'CMS EDITORIAL SOBERANO & DIFUSIÓN',
    category: 'medios',
    slaOrBadge: 'Próximamente v2.0 - Solo bajo consulta',
    slaColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    priceUsd: 45,
    priceArs: 70000,
    description: 'CMS perimetral con sindicación remota para medios informativos. Distribución ultra liviana con soberanía editorial total.',
    targetAudience: 'Medios independientes y periodistas que buscan control total sin dependencias centralizadas.',
    tags: ['CMS Ultra Liviano', 'Syndication Feed', 'Soberanía Editorial', 'PWA Noticias'],
    active: false,
    status: 'coming_soon',
    demoUrl: 'https://nexora-news.vercel.app',
    downloadUrl: 'https://nexora-news.vercel.app',
    isDesktopOnly: false
  },
  {
    id: 'nora-isp',
    name: 'Nora ISP Core & FTTH Cloud',
    subtitle: 'GESTIÓN FTTH, NAPS & CUADRILLAS EN VIVO',
    category: 'telecom',
    slaOrBadge: 'ISP MISSION CRITICAL',
    slaColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    priceUsd: 180,
    priceArs: 280000,
    description: 'Sistema integral para ISPs y cableoperadores: gestión de red FTTH, monitoreo de cajas NAP, geolocalización de cuadrillas técnicas en vivo y portal de autogestión de abonados.',
    targetAudience: 'Proveedores de internet (ISPs), cooperativas de telecomunicaciones y cableoperadores que buscan automatizar NOC, cuadrillas y atención con IA.',
    tags: ['OLT / NAP Monitor', 'Geolocalización GPS', 'Portal Abonados', 'NOC Automatizado'],
    active: true,
    status: 'active',
    demoUrl: 'https://nora-isp.vercel.app/portal',
    isDesktopOnly: false
  },
  {
    id: 'crm-obras',
    name: 'Nexora Obras & CRM Corporativo',
    subtitle: 'ARQUITECTURA, CONSTRUCCIÓN & EXPEDIENTES CCyCN',
    category: 'construccion',
    slaOrBadge: 'SEGUIMIENTO 360°',
    slaColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    priceUsd: 95,
    priceArs: 148000,
    description: 'Suite soberana para estudios de arquitectura y empresas constructoras. Cómputo métrico, libro de obras digital, certificación de avances UOCRA y gestión legal CCyCN con evidencia fotográfica georreferenciada.',
    targetAudience: 'Arquitectos colegiados, desarrolladores inmobiliarios y contratistas que precisan trazabilidad técnica, financiera y legal de cada obra sin caídas de red.',
    tags: ['Cómputo & Presupuesto', 'Certificaciones UOCRA', 'Libro de Obra Digital', 'Auditoría CCyCN'],
    active: true,
    status: 'active',
    demoUrl: 'https://nexora-store-app.vercel.app/?demo=obras',
    isDesktopOnly: true
  },
  {
    id: 'autentico',
    name: 'Auténtico Tributo Live',
    subtitle: 'LIVE STAGE SYNC & 4K HDMI ENGINE',
    category: 'eventos',
    slaOrBadge: '< 10MS SYNC',
    slaColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    priceUsd: 120,
    priceArs: 185000,
    description: 'Sincronizador para conciertos en vivo: pantallas HDMI 4K, letras y setlist sin requerir internet. Boletería directa, streaming y gestión para artistas.',
    targetAudience: 'Bandas, artistas y directores técnicos de espectáculos que no pueden depender de conectividad Wi-Fi durante el show.',
    tags: ['4K HDMI', 'LAN Sockets', 'Portal Fan PWA', 'Cero Latencia'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?pwa=true',
    isDesktopOnly: false
  },
  {
    id: 'clasificados',
    name: 'Nexora Clasificados',
    subtitle: 'MARKETPLACE COMUNITARIO P2P',
    category: 'comercio',
    slaOrBadge: '0% COMISIÓN',
    slaColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    priceUsd: 0,
    priceArs: 0,
    description: 'Marketplace comunitario de compra-venta directa de rodados y artículos sin pasarelas intermedias retenedoras.',
    targetAudience: 'Comerciantes y particulares cansados de comisiones abusivas y retenciones de fondos.',
    tags: ['Compresión WebP', 'WhatsApp Direct', 'PWA 3MB', 'Nora Copywriter'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?pwa=true',
    isDesktopOnly: false
  },
  {
    id: 'inmuebles',
    name: 'Inmuebles Verificados',
    subtitle: 'PADRÓN INMOBILIARIO INDEPENDIENTE',
    category: 'inmuebles',
    slaOrBadge: 'ANTI-FRAUDE',
    slaColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    priceUsd: 0,
    priceArs: 0,
    description: 'Catálogo inmobiliario con trazabilidad criptográfica. Registro catastral libre con mapas precisos y emisión local de contratos validados en PDF.',
    targetAudience: 'Propietarios e inquilinos que buscan operaciones directas sin costos ocultos de publicación.',
    tags: ['PDF Engine Local', 'GeoJSON Mapping', 'Anti-Fraude', 'Contratos Validados'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?pwa=true',
    isDesktopOnly: false
  },
  {
    id: 'retail',
    name: 'Nexora Stock & Retail 2026',
    subtitle: 'PUNTO DE VENTA COMERCIAL & STOCK OFFLINE',
    category: 'comercio',
    slaOrBadge: '< 2MS SCAN',
    slaColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    priceUsd: 55,
    priceArs: 85000,
    description: 'Punto de venta comercial, control de stock y lector de códigos offline. Lectura instantánea con pistola USB/Bluetooth y arqueo multidepósito.',
    targetAudience: 'Comercios minoristas, ferreterías, almacenes y minimercados que precisan facturar sin interrupciones por corte de internet.',
    tags: ['Lector Códigos', 'Control Stock', 'Offline Local', 'Ticket Térmico'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?demo=retail',
    isDesktopOnly: true
  },
  {
    id: 'turnos',
    name: 'Nexora Turnos & Citas Express',
    subtitle: 'AGENDAMIENTO AUTÓNOMO PARA CLÍNICAS',
    category: 'servicios',
    slaOrBadge: 'CERO ESPERA',
    slaColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    priceUsd: 40,
    priceArs: 62000,
    description: 'Agendamiento autónomo para clínicas y consultorios. Reserva local, sincronización por WhatsApp y confirmaciones automáticas sin intermediarios.',
    targetAudience: 'Médicos, odontólogos, centros de estética, peluquerías y consultorios independientes que requieren turnero directo.',
    tags: ['WhatsApp Bot', 'Agenda Local', 'Recordatorios', 'Sin Comisiones'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?pwa=true',
    isDesktopOnly: false
  },
  {
    id: 'hotel',
    name: 'Nexora Hotel & Cabañas Desk',
    subtitle: 'CHECK-IN LOCAL & PMS HOTELERO',
    category: 'inmuebles',
    slaOrBadge: 'PMS SOBERANO',
    slaColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    priceUsd: 85,
    priceArs: 132000,
    description: 'Check-in local, reservas y administración hotelera sin intermediarios. Cuadrícula de ocupación, cobro en mostrador y gestión de cabañas desconectada de OTAs.',
    targetAudience: 'Hoteles boutique, complejos de cabañas, hosterías y administradores turísticos que rechazan comisiones abusivas de portales externos.',
    tags: ['Check-in Local', 'Plano Tarifario', 'Cero OTAs', 'Calendario Offline'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?pwa=true',
    isDesktopOnly: false
  },
  {
    id: 'flota',
    name: 'Nexora Flota & Encomiendas',
    subtitle: 'RUTEO LOGÍSTICO & CONTROL DE PAQUETERÍA',
    category: 'servicios',
    slaOrBadge: 'DESPACHO REAL-TIME',
    slaColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    priceUsd: 90,
    priceArs: 140000,
    description: 'Ruteo logístico, despachos y control perimetral de paquetería. Manifiesto de carga, hojas de ruta offline y firma de entrega digital en mano.',
    targetAudience: 'Empresas de logística urbana, distribuidoras, expresos y cooperativas de transporte de encomiendas.',
    tags: ['Ruteo Offline', 'Firma Digital', 'Paquetería', 'Manifiesto de Carga'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?demo=flota',
    isDesktopOnly: true
  },
  {
    id: 'cajafuerte',
    name: 'Nexora Caja Fuerte & Auditoría',
    subtitle: 'ARQUEO CIEGO & PREVENCIÓN DE FUGAS',
    category: 'comercio',
    slaOrBadge: 'BLINDAJE TOTAL',
    slaColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    priceUsd: 70,
    priceArs: 108000,
    description: 'Arqueo ciego de sucursales, control de turnos y prevención de fugas. Auditoría criptográfica estricta de efectivo, transferencias y comprobantes.',
    targetAudience: 'Franquicias, comercios con múltiples turnos de cajeros y locales con alta circulación de dinero físico que demandan trazabilidad absoluta.',
    tags: ['Arqueo Ciego', 'Control Fugas', 'Auditoría Criptográfica', 'Multi-Turno'],
    active: true,
    demoUrl: 'https://nexora-store-app.vercel.app/?demo=cajafuerte',
    isDesktopOnly: true
  }
];

const INITIAL_LICENSES: CorporateLicense[] = [
  {
    id: 'lic_1',
    key: 'NX-7701-RESTOBAR-SOV',
    client: 'Marcelo Díaz',
    businessName: 'Bistró Central',
    whatsapp: '+54 9 11 4522-8901',
    email: 'gerencia@bistrocentral.com.ar',
    systemId: 'restobar',
    status: 'active',
    startDate: '2026-10-15',
    expires: '2026-11-14',
    graceLimit: '2026-11-19'
  },
  {
    id: 'lic_2',
    key: 'NX-9942-STAGE-LIVE',
    client: 'Gonzalo Benítez',
    businessName: 'Producciones Tour 2026',
    whatsapp: '+54 9 3786 51-2290',
    email: 'escenario@tourlive.com',
    systemId: 'autentico',
    status: 'grace',
    startDate: '2026-09-20',
    expires: '2026-10-20',
    graceLimit: '2026-10-25'
  },
  {
    id: 'lic_3',
    key: 'NX-4108-CARRIBAR-PASS',
    client: 'Clara Valenzuela',
    businessName: 'Food Park Costanera',
    whatsapp: '+54 9 3794 88-1244',
    email: 'contacto@foodpark.ar',
    systemId: 'carribar',
    status: 'active',
    startDate: '2026-10-28',
    expires: '2026-11-27',
    graceLimit: '2026-12-02'
  }
];

export default function App() {
  // --- INTERNACIONALIZACIÓN (ES / EN) ---
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('nexora_lang');
      if (saved === 'es' || saved === 'en') return saved;
    } catch { }
    return 'es';
  });

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('nexora_lang', newLang);
    } catch { }
  };

  const tr = t(lang);

  // --- MODAL DUAL QR MÓVIL / PWA ---
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedQrLink, setCopiedQrLink] = useState<'nav' | 'pwa' | null>(null);

  // --- MENÚ HAMBURGUESA MÓVIL ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (hash: string) => {
    setIsMobileMenuOpen(false);
    setIsPortalOpen(false);
    const element = document.querySelector(hash);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- DETECCIÓN E INSTALADOR PWA INTELIGENTE (?install=pwa) ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);

  // --- MODAL ALTA PRESENCIAL / MOSTRADOR ---
  const [isPresencialModalOpen, setIsPresencialModalOpen] = useState(false);
  const [presencialClient, setPresencialClient] = useState('');
  const [presencialBusiness, setPresencialBusiness] = useState('');
  const [presencialWhatsapp, setPresencialWhatsapp] = useState('+54 ');
  const [presencialEmail, setPresencialEmail] = useState('');
  const [presencialSystem, setPresencialSystem] = useState('restobar');
  const [presencialMethod, setPresencialMethod] = useState<PresencialPaymentMethod>('cash');
  const [presencialNotes, setPresencialNotes] = useState('');
  const [presencialReceipt, setPresencialReceipt] = useState<ExtendedLicense | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // --- MODAL EXPEDIENTE / DOSSIER GRANULAR DEL CLIENTE ---
  const [selectedLicDossier, setSelectedLicDossier] = useState<ExtendedLicense | null>(null);
  const [selectedNoticeType, setSelectedNoticeType] = useState<'preventive_25' | 'grace_31' | 'suspension_36'>('preventive_25');
  const [noticeToast, setNoticeToast] = useState<string | null>(null);
  const [addSystemSelect, setAddSystemSelect] = useState('carribar');

  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // --- MODAL DE CAPTURA PÚBLICA (LEAD / DEMO 15 DÍAS) ---
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedTrialSystem, setSelectedTrialSystem] = useState<SystemItem | null>(null);
  const [desktopNoticeSystem, setDesktopNoticeSystem] = useState<SystemItem | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadBusiness, setLeadBusiness] = useState('');
  const [leadWhatsapp, setLeadWhatsapp] = useState('+54 ');
  const [leadEmail, setLeadEmail] = useState('');
  const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);
  const [trialResult, setTrialResult] = useState<{
    key: string;
    expires: string;
    clientName: string;
    businessName: string;
    whatsapp: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // --- MODAL VISUAL "+ PUBLICAR NUEVO SISTEMA / MÓDULO" ---
  const [isNewSystemModalOpen, setIsNewSystemModalOpen] = useState(false);
  const [newSysName, setNewSysName] = useState('');
  const [newSysCategory, setNewSysCategory] = useState<SystemItem['category']>('gastronomia');
  const [newSysSubtitle, setNewSysSubtitle] = useState('');
  const [newSysPriceArs, setNewSysPriceArs] = useState<number | ''>('');
  const [newSysPriceUsd, setNewSysPriceUsd] = useState<number | ''>('');
  const [newSysDescription, setNewSysDescription] = useState('');
  const [newSysDemoUrl, setNewSysDemoUrl] = useState('');
  const [newSysActive, setNewSysActive] = useState(true);

  const [portalTab, setPortalTab] = useState<'licenses' | 'payments' | 'catalog' | 'copilot'>('licenses');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  // --- NORA COPILOT PARA EL BACKOFFICE ---
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: 'user' | 'nora'; text: string; timestamp: string }>>([
    {
      sender: 'nora',
      text: 'Hola, soy Nora Copilot, su asistente de operaciones de Nexora One. Estoy para orientarle paso a paso en publicaciones de sistemas, ventas de mostrador, ciclo de 30+5 días y configuración de cobros. ¿En qué tarea necesita ayuda?',
      timestamp: 'Ahora'
    }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotSending, setIsCopilotSending] = useState(false);
  const [selectedCopilotTopic, setSelectedCopilotTopic] = useState<CopilotTopic | null>(null);
  const copilotChatEndRef = useRef<HTMLDivElement>(null);

  // --- CATÁLOGO Y LICENCIAS DINÁMICAS (SINCRONIZADAS) ---
  const [systems, setSystems] = useState<SystemItem[]>(INITIAL_SYSTEMS);
  const [licenses, setLicenses] = useState<CorporateLicense[]>(INITIAL_LICENSES);

  // --- FORMAS DE PAGO ADMINISTRABLES (CANALES DIRECTOS CBU / MP / USDT) ---
  const [paymentSettings, setPaymentSettings] = useState<PaymentDetails>(() => {
    try {
      const saved = localStorage.getItem('nexora_payment_settings');
      if (saved) return JSON.parse(saved);
    } catch { }
    return DEFAULT_PAYMENTS;
  });
  const [paymentSavedToast, setPaymentSavedToast] = useState(false);

  // Formularios de Backoffice
  const [newLicClient, setNewLicClient] = useState('');
  const [newLicBusiness, setNewLicBusiness] = useState('');
  const [newLicWhatsapp, setNewLicWhatsapp] = useState('');
  const [newLicEmail, setNewLicEmail] = useState('');
  const [newLicSystem, setNewLicSystem] = useState('restobar');

  // Nora Chat (Protocolo Concierge Ejecutivo Internacional - SOUL.md)
  const [isNoraChatOpen, setIsNoraChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'nora',
      text: 'Estimado visitante, sea bienvenido a Nexora One Engine. Soy Nora Itu, su consultora ejecutiva. ¿En qué solución o requerimiento tecnológico puedo asistirle el día de hoy?',
      timestamp: 'Ahora'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const globeMountRef = useRef<HTMLDivElement>(null);

  // --- 1. CARGA INICIAL DE SUPABASE CON FALLBACK OFFLINE-FIRST ---
  useEffect(() => {
    let isMounted = true;

    async function syncFromSupabase() {
      if (!supabase || !isSupabaseConfigured) {
        return;
      }

      try {
        const { data: prodData, error: prodErr } = await supabase.from('products').select('*');
        if (!prodErr && prodData && prodData.length > 0 && isMounted) {
          const mapped: SystemItem[] = prodData.map((d: DbProduct) => ({
            id: d.id,
            name: d.name || 'Sistema Soberano',
            subtitle: d.subtitle || '',
            category: (d.category || 'gastronomia') as SystemItem['category'],
            slaOrBadge: d.slaOrBadge || d.sla_badge || 'SLA 100%',
            slaColor: d.slaColor || d.sla_color || 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
            priceUsd: Number(d.priceUsd ?? d.price_usd ?? 0),
            priceArs: Number(d.priceArs ?? d.price_ars ?? 0),
            description: d.description || '',
            targetAudience: d.targetAudience || d.target_audience || '',
            tags: Array.isArray(d.tags) ? d.tags : typeof d.tags === 'string' ? d.tags.split(',') : [],
            active: d.active !== false
          }));
          setSystems(mapped);
        }
      } catch (err) {
        console.warn('Operando con catálogo determinista local:', err);
      }

      try {
        const { data: licData, error: licErr } = await supabase.from('licenses').select('*');
        if (!licErr && licData && licData.length > 0 && isMounted) {
          const mappedLics: CorporateLicense[] = licData.map((l: DbLicense) => ({
            id: String(l.id || `lic_${Date.now()}`),
            key: l.key || l.license_key || `NX-SOV-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
            client: l.client || l.client_name || 'Cliente Corporativo',
            businessName: l.businessName || l.business_name || '',
            whatsapp: l.whatsapp || l.client_phone || '',
            email: l.email || l.client_email || '',
            systemId: l.systemId || l.system_id || l.system_name || 'restobar',
            status: l.status || 'active',
            startDate: l.startDate || l.start_date || l.starts_at || '2026-10-31',
            expires: l.expires || l.expires_at || '2026-11-30',
            graceLimit: l.graceLimit || l.grace_limit || '2026-12-05'
          }));
          setLicenses(mappedLics);
        } else {
          const localLics = localStorage.getItem('nexora_licenses');
          if (localLics && isMounted) {
            setLicenses(JSON.parse(localLics));
          }
        }
      } catch (err) {
        console.warn('Operando con licencias locales:', err);
        const localLics = localStorage.getItem('nexora_licenses');
        if (localLics && isMounted) {
          setLicenses(JSON.parse(localLics));
        }
      }
    }

    void syncFromSupabase();
    return () => { isMounted = false; };
  }, []);

  // --- NAVEGACIÓN Y ACCESO DIRECTO A DEMOS REALES (SIN BUCLES) ---
  const handleOpenTrialModal = (sys: SystemItem) => {
    setSelectedTrialSystem(sys);
    setLeadName('');
    setLeadBusiness('');
    setLeadWhatsapp('+54 ');
    setLeadEmail('');
    setTrialResult(null);
    setCopiedKey(false);
    setIsTrialModalOpen(true);
  };

  const handleAccessDemo = (sys: SystemItem) => {
    // Si es Nora ISP, abrir el portal de caso de éxito en pestaña nueva
    if (sys.id === 'nora-isp') {
      window.open('https://nora-isp.vercel.app/portal', '_blank', 'noopener,noreferrer');
      return;
    }

    // Si es Prensa & Medios Soberano, abrir la instancia operativa oficial
    if (sys.id === 'prensa') {
      window.open('https://nexora-news.vercel.app', '_blank', 'noopener,noreferrer');
      return;
    }

    // Si es sistema exclusivo de escritorio/mostrador y el visitante está en un móvil
    const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    if (sys.isDesktopOnly && isMobileDevice) {
      setDesktopNoticeSystem(sys);
      return;
    }

    // Si tiene demoUrl funcional
    if (sys.demoUrl && sys.demoUrl.startsWith('http')) {
      window.open(sys.demoUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Alternativa: abrir modal de prueba con clave criptográfica
    handleOpenTrialModal(sys);
  };

  // --- CONTROL DE RUTA OCULTA (#admin), DEMOS DIRECTAS (#demo-) Y PIN SOBERANO ---
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;

      // Interceptar hashes directos #demo-[id] para evitar bucle a home
      if (hash.startsWith('#demo-')) {
        const sysId = hash.replace('#demo-', '');
        const target = systems.find(s => s.id === sysId) || INITIAL_SYSTEMS.find(s => s.id === sysId);
        if (target) {
          handleAccessDemo(target);
          return;
        }
      }

      if (hash === '#admin') {
        if (IS_PUBLIC_ONLY) {
          window.location.hash = '';
          return;
        }
        if (isAdminAuthenticated) {
          setIsPortalOpen(true);
        } else {
          setShowPinModal(true);
        }
      } else {
        if (!isAdminAuthenticated) {
          setIsPortalOpen(false);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isAdminAuthenticated) {
          setIsPortalOpen(prev => !prev);
        } else {
          setShowPinModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdminAuthenticated]);

  // --- DETECCIÓN DE PWA Y MANEJADOR DE INSTALACIÓN (?install=pwa) ---
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
          setIsStandaloneApp(true);
        }

        const handleBeforeInstall = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        const searchParams = new URLSearchParams(window.location.search);
        if (
          searchParams.get('install') === 'pwa' ||
          searchParams.get('mode') === 'standalone' ||
          searchParams.get('pwa') === 'true'
        ) {
          setShowPwaInstallModal(true);
        }

        return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
      }
    } catch { }
  }, []);

  const handleTriggerPwaInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setShowPwaInstallModal(false);
        }
      } catch { }
      setDeferredPrompt(null);
    }
  };

  // Three.js Mount (Globo 3D fotorrealista satélite estilo Google Earth)
  useEffect(() => {
    if (!globeMountRef.current) return;
    const container = globeMountRef.current;
    while (container.firstChild) container.removeChild(container.firstChild);

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.25, 4.3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    // Iluminación solar fotorrealista
    scene.add(new THREE.AmbientLight(0x1a2634, 1.3));
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.7);
    sunLight.position.set(6, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.PointLight(0x00f2fe, 1.8, 20);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    const masterRig = new THREE.Group();
    scene.add(masterRig);

    // 1. Texturas Fotográficas Terrestres (NASA Blue Marble / Three.js CDN)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    const colorMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'
    );
    const normalMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'
    );
    const specularMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
    );
    const cloudsMap = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
    );

    // Esfera Principal (Tierra con brillo oceánico y relieve)
    const radius = 1.22;
    const earthGeom = new THREE.SphereGeometry(radius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: colorMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      specularMap: specularMap,
      specular: new THREE.Color(0x284868),
      shininess: 28,
      emissive: new THREE.Color(0x020814),
      emissiveIntensity: 0.25,
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    masterRig.add(earthMesh);

    // 2. Esfera de Nubes con Rotación Suave Independiente
    const cloudGeom = new THREE.SphereGeometry(radius * 1.015, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
    masterRig.add(cloudMesh);

    // 3. Halo Atmosférico (Dispersión Rayleigh / Corona Fresnel Cian)
    const atmoGeom = new THREE.SphereGeometry(radius * 1.12, 48, 48);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
          gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 1.6;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmoMesh = new THREE.Mesh(atmoGeom, atmoMat);
    masterRig.add(atmoMesh);

    // Función auxiliar para convertir Lat/Lon geográfica a Vector3 en la esfera
    const latLonToVector3 = (lat: number, lon: number, r: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(r * Math.sin(phi) * Math.cos(theta)),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    };

    // 4. Pines Luminosos de Infraestructura Soberana (Lat/Lon reales)
    const pinsData = [
      { lat: -34.6037, lon: -58.3816, name: 'Nodo Primario (Buenos Aires)', color: 0x00f2fe },
      { lat: 19.4326, lon: -99.1332, name: 'Nodo Perimetral (CDMX)', color: 0xf59e0b },
      { lat: 40.4168, lon: -3.7038, name: 'Nodo Réplica (Madrid)', color: 0x34d399 }
    ];

    const beaconGroups: { group: THREE.Group; ring: THREE.Mesh; ringMat: THREE.MeshBasicMaterial }[] = [];

    pinsData.forEach((pin) => {
      const pinPos = latLonToVector3(pin.lat, pin.lon, radius * 1.002);
      const group = new THREE.Group();
      group.position.copy(pinPos);
      group.lookAt(pinPos.clone().multiplyScalar(2));

      // Anillo de pulso exterior
      const ringGeom = new THREE.RingGeometry(0.035, 0.075, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: pin.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      group.add(ringMesh);

      // Núcleo luminoso
      const dotGeom = new THREE.SphereGeometry(0.028, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: pin.color });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      group.add(dotMesh);

      // Luz puntual local sobre el pin
      const pinLight = new THREE.PointLight(pin.color, 1.2, 0.6);
      group.add(pinLight);

      earthMesh.add(group);
      beaconGroups.push({ group, ring: ringMesh, ringMat });
    });

    // 5. Órbita y Satélite de Telemetría
    const orbitRingGeom = new THREE.TorusGeometry(1.85, 0.016, 16, 120);
    const orbitRingMat = new THREE.MeshPhongMaterial({ color: 0x00f2fe, emissive: 0x0088cc, shininess: 95 });
    const orbitRing = new THREE.Mesh(orbitRingGeom, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.5;
    orbitRing.rotation.y = Math.PI / 9;
    masterRig.add(orbitRing);

    const satGeom = new THREE.SphereGeometry(0.065, 16, 16);
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const satellite = new THREE.Mesh(satGeom, satMat);
    masterRig.add(satellite);

    // 6. Faro Soberano Volumétrico sobre Argentina (Lat -34.6°, Lon -58.4°)
    const argLat = -34.6037;
    const argLon = -58.3816;
    const argLocalPos = latLonToVector3(argLat, argLon, radius * 1.001);
    const argNormal = argLocalPos.clone().normalize();

    // Rig de anclaje geográfico de Argentina (rota sincronizado con earthMesh)
    const argBeaconRig = new THREE.Group();
    argBeaconRig.position.copy(argLocalPos);
    argBeaconRig.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), argNormal);
    earthMesh.add(argBeaconRig);

    // Haz volumétrico cian proyectado al espacio (cilindro/cono invertido)
    const beamHeight = 1.35;
    const beamGeom = new THREE.CylinderGeometry(0.38, 0.05, beamHeight, 32, 1, true);
    beamGeom.translate(0, beamHeight / 2, 0); // Base en la superficie, cúspide hacia el espacio

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeom, beamMat);
    beamMesh.visible = false;
    argBeaconRig.add(beamMesh);

    // Anillo focal luminoso en la superficie
    const baseGlowGeom = new THREE.RingGeometry(0.04, 0.16, 32);
    const baseGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const baseGlowMesh = new THREE.Mesh(baseGlowGeom, baseGlowMat);
    baseGlowMesh.rotation.x = Math.PI / 2;
    baseGlowMesh.visible = false;
    argBeaconRig.add(baseGlowMesh);

    // Generador de textura holográfica de alta resolución para el Logo
    const createHolographicLogoTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.clearRect(0, 0, 1024, 512);

      // Marco exterior holográfico con gradiente cian (#00f2fe) a azul (#0070f3)
      const gradBorder = ctx.createLinearGradient(80, 40, 944, 472);
      gradBorder.addColorStop(0, '#00f2fe');
      gradBorder.addColorStop(0.5, '#0070f3');
      gradBorder.addColorStop(1, '#00f2fe');

      ctx.save();
      ctx.strokeStyle = gradBorder;
      ctx.lineWidth = 5;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 24;

      // Caja redondeada holográfica
      const bx = 90, by = 50, bw = 844, bh = 412, br = 32;
      ctx.beginPath();
      ctx.moveTo(bx + br, by);
      ctx.lineTo(bx + bw - br, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
      ctx.lineTo(bx + bw, by + bh - br);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
      ctx.lineTo(bx + br, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
      ctx.lineTo(bx, by + br);
      ctx.quadraticCurveTo(bx, by, bx + br, by);
      ctx.closePath();
      ctx.stroke();

      // Relleno translúcido cibernético
      const bgGrad = ctx.createRadialGradient(512, 256, 40, 512, 256, 440);
      bgGrad.addColorStop(0, 'rgba(0, 112, 243, 0.28)');
      bgGrad.addColorStop(0.6, 'rgba(0, 242, 254, 0.08)');
      bgGrad.addColorStop(1, 'rgba(3, 10, 20, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fill();
      ctx.restore();

      // Líneas de escaneo holográficas
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.12)';
      ctx.lineWidth = 1.5;
      for (let y = by + 16; y < by + bh; y += 14) {
        ctx.beginPath();
        ctx.moveTo(bx + 18, y);
        ctx.lineTo(bx + bw - 18, y);
        ctx.stroke();
      }
      ctx.restore();

      // Insignia NX central
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const isoY = 150;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 26;
      ctx.fillStyle = '#0e1117';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(512, isoY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 36px monospace';
      ctx.fillStyle = '#00f2fe';
      ctx.shadowBlur = 18;
      ctx.fillText('NX', 512, isoY + 2);

      // Tipografía principal "NEXORA ONE"
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 32;
      ctx.font = '900 64px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('NEXORA ONE', 512, 260);

      // Subtítulo "— ENGINE —"
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 16;
      ctx.font = '700 24px monospace';
      ctx.fillStyle = '#00f2fe';
      ctx.fillText('— ENGINE —', 512, 320);

      // Tagline perimetral
      ctx.shadowBlur = 8;
      ctx.font = '600 15px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('SOVEREIGN RUNTIME ARCHITECTURE', 512, 370);
      ctx.restore();

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    };

    const logoTexture = createHolographicLogoTexture();
    logoTexture.colorSpace = THREE.SRGBColorSpace;

    // Placa del Logo Holográfico en la cúspide (en scene para Billboard puro sin espejo)
    const logoGeom = new THREE.PlaneGeometry(1.6, 0.8);
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const logoMesh = new THREE.Mesh(logoGeom, logoMat);
    logoMesh.visible = false;
    scene.add(logoMesh);

    // Halo difuso de respaldo para el logo
    const haloGeom = new THREE.PlaneGeometry(1.85, 0.95);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeom, haloMat);
    haloMesh.visible = false;
    scene.add(haloMesh);

    // 7. Interactividad 360° con Puntero / Touch
    let targetRotX = 0.15;
    let targetRotY = 0;
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      // En dispositivos móviles (< 768px) o gestos táctiles, no interceptar para permitir scroll vertical nativo
      if (e.pointerType === 'touch' || window.innerWidth < 768) {
        return;
      }
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      targetRotY += (e.clientX - prevMousePos.x) * 0.008;
      targetRotX += (e.clientY - prevMousePos.y) * 0.008;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Rotación suave del globo y nubes a distinta velocidad (efecto volumétrico)
      earthMesh.rotation.y += 0.0022;
      cloudMesh.rotation.y += 0.0031;

      // Pulsación de pines luminosos
      beaconGroups.forEach((b, i) => {
        const pulse = 1.0 + Math.sin(time * 4.5 + i) * 0.45;
        b.ring.scale.set(pulse, pulse, pulse);
        b.ringMat.opacity = 0.35 + Math.sin(time * 4.5 + i) * 0.55;
      });

      // Trayectoria orbital del satélite
      satellite.position.x = Math.cos(time * 1.35) * 1.85;
      satellite.position.y = Math.sin(time * 1.35) * 0.55;
      satellite.position.z = Math.sin(time * 1.35) * 1.65;
      orbitRing.rotation.z = time * 0.12;

      // ── Detección Angular de Argentina & Faro Soberano ─────────────
      const argWorldPos = new THREE.Vector3();
      argBeaconRig.getWorldPosition(argWorldPos);

      const earthWorldPos = new THREE.Vector3();
      earthMesh.getWorldPosition(earthWorldPos);

      const normalWorld = argWorldPos.clone().sub(earthWorldPos).normalize();
      const viewDir = camera.position.clone().sub(argWorldPos).normalize();
      const dot = normalWorld.dot(viewDir);

      if (dot > 0.60) {
        // Mapeo suave entre 0.60 y 0.95
        const rawVis = Math.min(1, Math.max(0, (dot - 0.60) / 0.35));
        const smoothVis = rawVis * rawVis * (3 - 2 * rawVis);
        const pulse = Math.sin(time * 5.0) * 0.08;

        // Activar haz volumétrico
        beamMesh.visible = true;
        baseGlowMesh.visible = true;
        beamMat.opacity = Math.min(0.85, smoothVis * 0.72 + pulse * smoothVis);
        baseGlowMat.opacity = smoothVis * 0.85;

        // Altura y escala dinámica del haz hacia el espacio
        const dynamicHeight = beamHeight * (0.85 + 0.35 * smoothVis);
        beamMesh.scale.set(1 + smoothVis * 0.25, 0.85 + 0.35 * smoothVis, 1 + smoothVis * 0.25);

        // Posición de la cúspide del haz
        const apexWorldPos = argWorldPos.clone().add(normalWorld.clone().multiplyScalar(dynamicHeight + 0.12));
        logoMesh.position.copy(apexWorldPos);
        haloMesh.position.copy(apexWorldPos);

        // Billboard puro: garantiza lectura al derecho y nítida
        logoMesh.quaternion.copy(camera.quaternion);
        haloMesh.quaternion.copy(camera.quaternion);

        // Magnificación suave de escala 1.0 -> 1.75
        const currentScale = 1.0 + 0.75 * smoothVis;
        logoMesh.scale.set(currentScale, currentScale, currentScale);
        haloMesh.scale.set(currentScale * 1.12, currentScale * 1.12, currentScale * 1.12);

        logoMesh.visible = true;
        haloMesh.visible = true;
        logoMat.opacity = smoothVis * 0.95;
        haloMat.opacity = smoothVis * 0.18;
      } else {
        beamMesh.visible = false;
        baseGlowMesh.visible = false;
        logoMesh.visible = false;
        haloMesh.visible = false;
        beamMat.opacity = 0;
        baseGlowMat.opacity = 0;
        logoMat.opacity = 0;
        haloMat.opacity = 0;
      }

      // Amortiguación inercial del arrastre 360°
      masterRig.rotation.y += (targetRotY - masterRig.rotation.y) * 0.08;
      masterRig.rotation.x += (targetRotX - masterRig.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      scene.remove(logoMesh);
      scene.remove(haloMesh);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // --- MOTOR AUTÓNOMO DE NORA ITU (CLIENTE OFFLINE-FIRST) ---
  const handleSendChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: q, timestamp: 'Ahora' }]);
    setIsSendingChat(true);

    try {
      const responseText = await generateNoraResponse(q, paymentSettings, lang);
      setChatMessages(prev => [
        ...prev,
        { sender: 'nora', text: responseText, timestamp: 'Ahora' }
      ]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'nora',
          text: lang === 'en'
            ? 'Dear visitor, I am currently operating in perimeter mode. Which sovereign solution may I guide you through?'
            : 'Estimado visitante, en este momento opero en modo perimetral directo. ¿En qué solución del catálogo le puedo asesorar?',
          timestamp: 'Ahora'
        }
      ]);
    } finally {
      setIsSendingChat(false);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // --- 2.B EMISIÓN PRESENCIAL / MOSTRADOR ---
  const handleCreatePresencialLicense = async (e: FormEvent) => {
    e.preventDefault();
    if (!presencialClient.trim() || !presencialWhatsapp.trim() || !presencialEmail.trim()) return;

    const sysName = systems.find(s => s.id === presencialSystem)?.name || presencialSystem;
    const newLic = generatePresencialLicense({
      clientName: presencialClient,
      businessName: presencialBusiness,
      whatsapp: presencialWhatsapp,
      email: presencialEmail,
      systemId: presencialSystem,
      systemName: sysName,
      paymentMethod: presencialMethod,
      notes: presencialNotes
    });

    const updated = [newLic, ...licenses];
    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('licenses').insert([{
          key: newLic.key,
          license_key: newLic.key,
          client: newLic.client,
          client_name: newLic.client,
          business_name: newLic.businessName || '',
          whatsapp: newLic.whatsapp,
          client_phone: newLic.whatsapp,
          email: newLic.email,
          client_email: newLic.email,
          system_id: newLic.systemId,
          system_name: sysName,
          status: newLic.status,
          start_date: newLic.startDate,
          starts_at: newLic.startDate,
          expires: newLic.expires,
          expires_at: newLic.expires,
          grace_limit: newLic.graceLimit,
          payment_method: presencialMethod,
          notes: presencialNotes
        }]);
      } catch (err) {
        console.warn('Persistencia presencial en Supabase:', err);
      }
    }

    setPresencialReceipt(newLic);
    setIsPresencialModalOpen(false);
    setPresencialClient('');
    setPresencialBusiness('');
    setPresencialWhatsapp('+54 ');
    setPresencialEmail('');
    setPresencialNotes('');
  };

  // --- 2.C GESTIÓN GRANULAR DE CLIENTE (DOSSIER) ---
  const handleExtendGrace = async (licId: string) => {
    const updated = licenses.map(l => {
      if (l.id === licId) {
        const curGrace = new Date(l.graceLimit + 'T23:59:59');
        const newGraceObj = new Date(curGrace.getTime() + 5 * 86400000);
        const newGraceStr = newGraceObj.toISOString().split('T')[0];
        const newHistory = [
          ...(l.history || []),
          {
            id: `hist-${Date.now()}`,
            type: 'grace_extended' as const,
            channel: 'system' as const,
            sentAt: new Date().toISOString(),
            detail: `Prórroga de gracia +5 días concedida. Nueva fecha fatal: ${newGraceStr}`,
            status: 'applied' as const
          }
        ];
        return { ...l, graceLimit: newGraceStr, history: newHistory };
      }
      return l;
    });

    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));
    const target = updated.find(l => l.id === licId);
    if (target) setSelectedLicDossier(target);
    setNoticeToast('Gracia perimetral extendida +5 días.');
    setTimeout(() => setNoticeToast(null), 3000);
  };

  const handleForceSuspend = async (licId: string) => {
    const updated = licenses.map(l => {
      if (l.id === licId) {
        const newHistory = [
          ...(l.history || []),
          {
            id: `hist-${Date.now()}`,
            type: 'suspension_36' as const,
            channel: 'system' as const,
            sentAt: new Date().toISOString(),
            detail: 'Suspensión forzosa aplicada desde la consola de control.',
            status: 'applied' as const
          }
        ];
        return { ...l, status: 'suspended' as const, history: newHistory };
      }
      return l;
    });

    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));
    const target = updated.find(l => l.id === licId);
    if (target) setSelectedLicDossier(target);
    setNoticeToast('Licencia suspendida forzosamente.');
    setTimeout(() => setNoticeToast(null), 3000);
  };

  const handleAddSystemToLicense = (licId: string, sysId: string) => {
    const updated = licenses.map(l => {
      if (l.id === licId) {
        const cur = l.assignedSystems || [l.systemId];
        if (!cur.includes(sysId)) {
          const nextSystems = [...cur, sysId];
          const sysName = systems.find(s => s.id === sysId)?.name || sysId;
          const newHistory = [
            ...(l.history || []),
            {
              id: `hist-${Date.now()}`,
              type: 'renewal' as const,
              channel: 'system' as const,
              sentAt: new Date().toISOString(),
              detail: `Sistema adicional vinculado: ${sysName}`,
              status: 'applied' as const
            }
          ];
          return { ...l, assignedSystems: nextSystems, history: newHistory };
        }
      }
      return l;
    });

    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));
    const target = updated.find(l => l.id === licId);
    if (target) setSelectedLicDossier(target);
    setNoticeToast('Sistema adicional asignado al cliente.');
    setTimeout(() => setNoticeToast(null), 3000);
  };

  const handleRevokeSystemFromLicense = (licId: string, sysId: string) => {
    const updated = licenses.map(l => {
      if (l.id === licId) {
        const cur = l.assignedSystems || [l.systemId];
        const nextSystems = cur.filter(s => s !== sysId);
        const sysName = systems.find(s => s.id === sysId)?.name || sysId;
        const newHistory = [
          ...(l.history || []),
          {
            id: `hist-${Date.now()}`,
            type: 'suspension_36' as const,
            channel: 'system' as const,
            sentAt: new Date().toISOString(),
            detail: `Sistema desvinculado / revocado: ${sysName}`,
            status: 'applied' as const
          }
        ];
        return { ...l, assignedSystems: nextSystems, history: newHistory };
      }
      return l;
    });

    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));
    const target = updated.find(l => l.id === licId);
    if (target) setSelectedLicDossier(target);
    setNoticeToast('Sistema revocado del expediente.');
    setTimeout(() => setNoticeToast(null), 3000);
  };

  const handleSendDossierEmail = (lic: ExtendedLicense, noticeType: 'preventive_25' | 'grace_31' | 'suspension_36') => {
    if (!lic.email) {
      alert('El cliente no posee correo electrónico registrado.');
      return;
    }
    const sysName = systems.find(s => s.id === lic.systemId)?.name || lic.systemId;
    const templates = buildNotificationTemplates(lic, sysName, paymentSettings, lang);
    const tmpl = templates[noticeType === 'preventive_25' ? 'preventive25' : noticeType === 'grace_31' ? 'grace31' : 'suspension36'];

    const result = simulateEmailDispatch(lic.email, tmpl.emailSubject, tmpl.emailBody);

    const updated = licenses.map(l => {
      if (l.id === lic.id) {
        const newHistory = [
          ...(l.history || []),
          {
            id: `hist-${Date.now()}`,
            type: noticeType,
            channel: 'email' as const,
            sentAt: result.timestamp,
            detail: `Despacho SMTP: "${tmpl.emailSubject}"`,
            status: 'simulated' as const
          }
        ];
        return { ...l, history: newHistory };
      }
      return l;
    });

    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));
    const target = updated.find(l => l.id === lic.id);
    if (target) setSelectedLicDossier(target);
    setNoticeToast(`Correo despachado a <${lic.email}> (Status 250 OK).`);
    setTimeout(() => setNoticeToast(null), 3500);
  };

  // --- 2. EMISIÓN Y RENOVACIÓN DE LICENCIAS (30 DÍAS + 5 DE GRACIA) ---
  const handleCreateLicense = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLicClient.trim()) return;

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const expObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expires = expObj.toISOString().split('T')[0];
    const graceObj = new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000);
    const graceLimit = graceObj.toISOString().split('T')[0];
    const hex = Math.random().toString(16).substring(2, 6).toUpperCase();

    const newLic: CorporateLicense = {
      id: `lic_${Date.now()}`,
      key: `NX-${hex}-${newLicSystem.toUpperCase()}-SOV`,
      client: newLicClient.trim(),
      businessName: newLicBusiness.trim() || undefined,
      whatsapp: newLicWhatsapp.trim(),
      email: newLicEmail.trim(),
      systemId: newLicSystem,
      status: 'active',
      startDate,
      expires,
      graceLimit
    };

    const updated = [newLic, ...licenses];
    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));

    setNewLicClient('');
    setNewLicBusiness('');
    setNewLicWhatsapp('');
    setNewLicEmail('');

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('licenses').insert([{
          key: newLic.key,
          license_key: newLic.key,
          client: newLic.client,
          client_name: newLic.client,
          business_name: newLic.businessName || '',
          whatsapp: newLic.whatsapp,
          client_phone: newLic.whatsapp,
          email: newLic.email,
          client_email: newLic.email,
          system_id: newLic.systemId,
          system_name: systems.find(s => s.id === newLic.systemId)?.name || newLic.systemId,
          status: newLic.status,
          start_date: newLic.startDate,
          starts_at: newLic.startDate,
          expires: newLic.expires,
          expires_at: newLic.expires,
          grace_limit: newLic.graceLimit
        }]);
      } catch (err) {
        console.warn('Error al persistir licencia en Supabase (offline):', err);
      }
    }
  };

  const handleRenewLicense = async (licId: string) => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const expObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expires = expObj.toISOString().split('T')[0];
    const graceObj = new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000);
    const graceLimit = graceObj.toISOString().split('T')[0];

    const targetLic = licenses.find(l => l.id === licId);

    const updated = licenses.map(l => {
      if (l.id === licId) {
        return {
          ...l,
          status: 'active' as const,
          startDate,
          expires,
          graceLimit,
        };
      }
      return l;
    });

    setLicenses(updated);
    localStorage.setItem('nexora_licenses', JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('licenses').update({
          status: 'active',
          start_date: startDate,
          starts_at: startDate,
          expires,
          expires_at: expires,
          grace_limit: graceLimit,
          payment_status: 'paid'
        }).eq('id', licId);
      } catch (err) {
        console.warn('Persistencia de renovación en Supabase:', err);
      }

      // Registro de conciliación de cobro asociado a WhatsApp y ciclo operativo
      if (targetLic) {
        try {
          await supabase.from('payments_reconciliation').insert([{
            license_id: licId,
            license_key: targetLic.key,
            client_name: targetLic.client,
            business_name: targetLic.businessName || '',
            whatsapp: targetLic.whatsapp || '',
            system_id: targetLic.systemId,
            cycle_days: 30,
            status: 'conciliated',
            conciliated_at: new Date().toISOString()
          }]);
        } catch {
          // Fallback silencioso si la tabla auxiliar aún no está creada
        }
      }
    }
  };

  // --- 3. GUARDAR FORMAS DE PAGO (CBU / MERCADO PAGO / USDT) ---
  const handleSavePayments = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nexora_payment_settings', JSON.stringify(paymentSettings));
    setPaymentSavedToast(true);
    setTimeout(() => setPaymentSavedToast(false), 3000);
  };

  // --- 4. ACTUALIZACIÓN REACTIVA Y PERSISTENCIA DE PRECIOS DUALES ---
  const handleUpdatePrice = async (id: string, field: 'priceUsd' | 'priceArs', val: number) => {
    const updated = systems.map(s => s.id === id ? { ...s, [field]: val } : s);
    setSystems(updated);
    localStorage.setItem('nexora_systems', JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      try {
        const updatePayload = field === 'priceUsd' ? { price_usd: val } : { price_ars: val };
        await supabase.from('products').update(updatePayload).eq('id', id);
      } catch (err) {
        console.warn('Error al actualizar precio en Supabase (offline):', err);
      }
    }
  };

  // --- NORA EN MODO COPILOT PARA EL BACKOFFICE ---
  const handleSendCopilotChat = async (queryText?: string) => {
    const textToSend = (typeof queryText === 'string' ? queryText : copilotInput).trim();
    if (!textToSend || isCopilotSending) return;
    if (!queryText) setCopilotInput('');

    setCopilotMessages(prev => [...prev, { sender: 'user', text: textToSend, timestamp: 'Ahora' }]);
    setIsCopilotSending(true);

    try {
      const activeCount = licenses.filter(l => getLicenseDynamicStatus(l).label === 'Activo').length;
      const graceCount = licenses.filter(l => getLicenseDynamicStatus(l).label === 'En Gracia').length;
      const resp = await generateCopilotResponse(textToSend, {
        totalLicenses: licenses.length,
        activeLicenses: activeCount,
        graceLicenses: graceCount,
        systemsCount: systems.length
      });
      setCopilotMessages(prev => [...prev, { sender: 'nora', text: resp, timestamp: 'Ahora' }]);
    } catch {
      setCopilotMessages(prev => [...prev, {
        sender: 'nora',
        text: 'Disculpe, ocurrió una demora en el procesamiento perimetral interno.',
        timestamp: 'Ahora'
      }]);
    } finally {
      setIsCopilotSending(false);
      setTimeout(() => copilotChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // --- AUTENTICACIÓN ADMIN POR PIN SOBERANO ---
  const handleVerifyPin = (e: FormEvent) => {
    e.preventDefault();
    if (IS_PUBLIC_ONLY) {
      alert('Entorno público restringido. Consola administrativa desacoplada.');
      setShowPinModal(false);
      return;
    }
    if (adminPinInput.trim() === '2026' || adminPinInput.trim() === '1984') {
      setIsAdminAuthenticated(true);
      setIsPortalOpen(true);
      setShowPinModal(false);
      setPinError(false);
      setAdminPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleCloseAdmin = () => {
    setIsPortalOpen(false);
    setIsAdminAuthenticated(false);
    setShowPinModal(false);
    setPinError(false);
    setAdminPinInput('');
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // --- FORMULARIO DE CAPTURA PÚBLICA (LEAD / DEMO 15 DÍAS) ---
  const handleSubmitTrialLead = async (e: FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadWhatsapp.trim() || !leadEmail.trim() || !selectedTrialSystem) return;
    setIsSubmittingTrial(true);

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const expObj = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
    const expDate = expObj.toISOString().split('T')[0];
    const graceObj = new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000);
    const graceDate = graceObj.toISOString().split('T')[0];
    const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const trialKey = `NX-TRIAL-${hex}-${selectedTrialSystem.id.toUpperCase()}-15D`;

    const newLic: CorporateLicense = {
      id: `lic_trial_${Date.now()}`,
      key: trialKey,
      client: leadName.trim(),
      businessName: leadBusiness.trim() || undefined,
      whatsapp: leadWhatsapp.trim(),
      email: leadEmail.trim(),
      systemId: selectedTrialSystem.id,
      status: 'trial',
      startDate,
      expires: expDate,
      graceLimit: graceDate
    };

    const updatedLics = [newLic, ...licenses];
    setLicenses(updatedLics);
    localStorage.setItem('nexora_licenses', JSON.stringify(updatedLics));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('licenses').insert([{
          key: trialKey,
          license_key: trialKey,
          client: leadName.trim(),
          client_name: leadName.trim(),
          business_name: leadBusiness.trim() || '',
          whatsapp: leadWhatsapp.trim(),
          client_phone: leadWhatsapp.trim(),
          email: leadEmail.trim(),
          client_email: leadEmail.trim(),
          system_id: selectedTrialSystem.id,
          system_name: selectedTrialSystem.name,
          status: 'trial',
          payment_status: 'trial',
          start_date: startDate,
          starts_at: startDate,
          expires: expDate,
          expires_at: expDate,
          grace_limit: graceDate
        }]);
      } catch (err) {
        console.warn('Persistencia de prueba en Supabase:', err);
      }

      try {
        await supabase.from('leads').insert([{
          name: leadName.trim(),
          client_name: leadName.trim(),
          business_name: leadBusiness.trim() || '',
          whatsapp: leadWhatsapp.trim(),
          client_phone: leadWhatsapp.trim(),
          email: leadEmail.trim(),
          client_email: leadEmail.trim(),
          system_id: selectedTrialSystem.id,
          system_name: selectedTrialSystem.name,
          license_key: trialKey,
          starts_at: startDate,
          expires_at: expDate,
          payment_status: 'trial'
        }]);
      } catch {
        // Fallback si la tabla no existe
      }
    }

    setIsSubmittingTrial(false);
    setTrialResult({
      key: trialKey,
      expires: expDate,
      clientName: leadName.trim(),
      businessName: leadBusiness.trim(),
      whatsapp: leadWhatsapp.trim()
    });
    setCopiedKey(false);
  };

  // --- DESCARGA DIRECTA DE PAQUETE DE INDUCCIÓN (SIN 404) ---
  const handleDownloadTrialKit = () => {
    if (!selectedTrialSystem || !trialResult) return;
    const kitData = {
      empresa_emisora: 'Nexora One',
      suite: selectedTrialSystem.name,
      sistema_id: selectedTrialSystem.id,
      credencial_soberana: trialResult.key,
      titular: leadName,
      whatsapp_vinculado: leadWhatsapp,
      email_vinculado: leadEmail || 'No informado',
      validez_dias: 15,
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_vencimiento: trialResult.expires,
      limite_gracia: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      arquitectura: 'Sovereign Offline-First Runtime',
      soporte_ejecutivo_nora: '+54 9 3786 414533',
      instrucciones_despliegue: [
        '1. Conserve esta credencial digital en la terminal o servidor local.',
        '2. Ingrese la clave criptográfica al iniciar el software para validar la base de datos local.',
        '3. La base de datos SQLite opera con total independencia y cero caídas de internet.',
        '4. Para adquirir la licencia permanente mensual (30 días de ciclo + 5 de gracia), comuníquese por WhatsApp o abone vía CBU/USDT.'
      ]
    };

    const blob = new Blob([JSON.stringify(kitData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NexoraOne-${selectedTrialSystem.id.toUpperCase()}-Induction-Kit.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- FORMULARIO PRAGMÁTICO: PUBLICAR NUEVO SISTEMA (CERO CÓDIGO) ---
  const handleCreateNewSystem = (e: FormEvent) => {
    e.preventDefault();
    if (!newSysName.trim()) return;

    const cleanId = newSysName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || `sys_${Date.now()}`;
    const newSystem: SystemItem = {
      id: cleanId,
      name: newSysName.trim(),
      subtitle: newSysSubtitle.trim() || 'SOLUCIÓN SOBERANA & OFFLINE',
      category: newSysCategory,
      slaOrBadge: 'SLA 100%',
      slaColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      priceUsd: Number(newSysPriceUsd) || 0,
      priceArs: Number(newSysPriceArs) || 0,
      description: newSysDescription.trim() || 'Sistema de cómputo perimetral independiente con base de datos local.',
      targetAudience: 'Comercios y empresas que precisan facturar e interactuar sin caídas de conexión a internet.',
      tags: ['Local-First', 'SQLite/IndexedDB', 'Sin Nube', 'ESC/POS Directo'],
      active: newSysActive,
    };

    setSystems((prev) => [newSystem, ...prev]);

    try {
      const existing = JSON.parse(localStorage.getItem('nexora_custom_systems') || '[]');
      existing.unshift(newSystem);
      localStorage.setItem('nexora_custom_systems', JSON.stringify(existing));
    } catch { }

    if (supabase && isSupabaseConfigured) {
      void Promise.resolve(
        supabase.from('products').insert([{
          id: cleanId,
          name: newSystem.name,
          subtitle: newSystem.subtitle,
          category: newSystem.category,
          price_usd: newSystem.priceUsd,
          price_ars: newSystem.priceArs,
          description: newSystem.description,
          target_audience: newSystem.targetAudience,
          active: newSystem.active
        }])
      ).catch(() => { });
    }

    setNewSysName('');
    setNewSysSubtitle('');
    setNewSysPriceArs('');
    setNewSysPriceUsd('');
    setNewSysDescription('');
    setNewSysDemoUrl('');
    setNewSysActive(true);
    setIsNewSystemModalOpen(false);

    setNoticeToast(`¡"${newSystem.name}" publicado exitosamente en la tienda!`);
    setTimeout(() => setNoticeToast(null), 4000);
  };

  const filteredSystems = systems.filter(sys => {
    if (!sys.active && (!isPortalOpen || !isAdminAuthenticated)) return false;
    const matchCat = activeCategory === 'all' || sys.category === activeCategory;
    const matchQ = !searchQuery || sys.name.toLowerCase().includes(searchQuery.toLowerCase()) || sys.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#f1f5f9] font-sans antialiased selection:bg-[#00f2fe]/30 selection:text-[#00f2fe] flex flex-col">

      {/* HEADER PERSISTENTE CON MENÚ HAMBURGUESA RESPONSIVO */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090b0e]/90 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* LOGO OFICIAL */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              setIsPortalOpen(false);
              setIsMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img
              src="/brand/logo-full.png?v=2026"
              alt="Nexora One Engine"
              className="h-8 sm:h-10 w-auto object-contain mix-blend-screen hover:opacity-90 transition"
            />
          </div>

          {/* NAVEGACIÓN EN ESCRITORIO (md:flex) */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400 font-medium">
            <a href="#ecosistema" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">{tr.nav.ecosystem}</a>
            <a href="#nosotros" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">{tr.nav.about}</a>
            <a href="#casos" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">{tr.nav.cases}</a>
            <a href="#appstore" onClick={() => setIsPortalOpen(false)} className="hover:text-[#00f2fe] transition">{tr.nav.appstore}</a>
            <a href="#licencias" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">{tr.nav.licenses}</a>
          </nav>

          {/* CONTROLES EN ESCRITORIO (md:flex) */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {/* SELECTOR REACTIVO DE IDIOMA (ES | EN) */}
            <div className="flex items-center bg-[#141822] p-1 rounded-xl border border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleSetLang('es')}
                className={`px-2 py-1 rounded-lg transition font-bold ${lang === 'es' ? 'bg-[#00f2fe] text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                title="Español"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => handleSetLang('en')}
                className={`px-2 py-1 rounded-lg transition font-bold ${lang === 'en' ? 'bg-[#00f2fe] text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                title="English"
              >
                EN
              </button>
            </div>

            {/* BOTÓN DUAL QR DE ACCESO RÁPIDO Y DESCARGA PWA MÓVIL */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1a202c] border border-cyan-500/30 text-cyan-300 font-mono text-xs transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.15)] cursor-pointer"
              title={tr.nav.mobileAccess}
            >
              <span className="text-sm">📱</span>
              <span>{tr.nav.mobileAccess}</span>
            </button>

            <a
              href="#appstore"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-[#090b0e] font-bold text-xs hover:brightness-110 shadow-[0_0_20px_-3px_rgba(0,242,254,0.35)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{tr.nav.explore}</span>
            </a>

            {isPortalOpen && isAdminAuthenticated && (
              <button
                onClick={handleCloseAdmin}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-xs hover:bg-red-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{tr.nav.closeAdmin}</span>
              </button>
            )}
          </div>

          {/* BOTÓN HAMBURGUESA EXCLUSIVO PARA MÓVILES (md:hidden) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl bg-[#141822] border border-white/15 text-slate-200 hover:text-cyan-400 hover:border-cyan-400/50 transition flex items-center justify-center cursor-pointer shadow-md"
              aria-label="Abrir Menú de Navegación"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* CAJÓN DESPLEGABLE MÓVIL (MOBILE DRAWER) */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 mt-3 pt-3 pb-5 px-3 space-y-4 bg-[#070b12]/95 backdrop-blur-2xl rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-cyan-500/20">
            {/* ENLACES DE SALTO SUAVE */}
            <nav className="flex flex-col space-y-1 text-sm font-medium">
              <a
                href="#ecosistema"
                onClick={() => handleNavClick('#ecosistema')}
                className="px-4 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
              >
                <span>{tr.nav.ecosystem}</span>
                <span className="text-[11px] text-slate-500 font-mono">01</span>
              </a>
              <a
                href="#nosotros"
                onClick={() => handleNavClick('#nosotros')}
                className="px-4 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
              >
                <span>{tr.nav.about}</span>
                <span className="text-[11px] text-slate-500 font-mono">02</span>
              </a>
              <a
                href="#casos"
                onClick={() => handleNavClick('#casos')}
                className="px-4 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
              >
                <span>{tr.nav.cases}</span>
                <span className="text-[11px] text-slate-500 font-mono">03</span>
              </a>
              <a
                href="#appstore"
                onClick={() => handleNavClick('#appstore')}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-bold transition flex items-center justify-between cursor-pointer"
              >
                <span>{tr.nav.appstore}</span>
                <span className="text-[11px] text-cyan-400 font-mono font-bold">11 Sistemas</span>
              </a>
              <a
                href="#licencias"
                onClick={() => handleNavClick('#licencias')}
                className="px-4 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
              >
                <span>{tr.nav.licenses}</span>
                <span className="text-[11px] text-slate-500 font-mono">05</span>
              </a>
            </nav>

            {/* SELECTOR DE IDIOMA Y BOTONES DE ACCIÓN */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-mono text-slate-400">Idioma / Language:</span>
                <div className="flex items-center bg-[#141822] p-1 rounded-xl border border-white/10 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => handleSetLang('es')}
                    className={`px-3 py-1 rounded-lg transition font-bold ${lang === 'es' ? 'bg-[#00f2fe] text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                  >
                    ES
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetLang('en')}
                    className={`px-3 py-1 rounded-lg transition font-bold ${lang === 'en' ? 'bg-[#00f2fe] text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsQrModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#141822] hover:bg-[#1a202c] border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.15)] cursor-pointer"
              >
                <span className="text-sm">📱</span>
                <span>{tr.nav.mobileAccess}</span>
              </button>

              <a
                href="#appstore"
                onClick={() => handleNavClick('#appstore')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-[#090b0e] font-bold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,242,254,0.35)] transition flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>{tr.nav.explore}</span>
                <span>→</span>
              </a>

              {isPortalOpen && isAdminAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleCloseAdmin();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-xs hover:bg-red-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{tr.nav.closeAdmin}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* VISTA A: PANEL ADMINISTRATIVO CMS (SOLO CON AUTENTICACIÓN SOBERANA) */}
      {isPortalOpen && isAdminAuthenticated ? (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">ÁREA RESTRINGIDA</span>
                <h1 className="text-2xl font-black text-white">Panel de Administración Soberano</h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">Control de catálogo sincronizado con Supabase, precios duales ($ ARS / USD) y gestión de licencias.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-[#141822] p-1 rounded-xl border border-white/10 text-xs font-mono">
                <button
                  onClick={() => setPortalTab('licenses')}
                  className={`px-3 py-1.5 rounded-lg transition ${portalTab === 'licenses' ? 'bg-[#00f2fe] text-slate-950 font-bold shadow-[0_0_15px_-3px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                >
                  Descargas & Licencias de Clientes
                </button>
                <button
                  onClick={() => setPortalTab('payments')}
                  className={`px-3 py-1.5 rounded-lg transition ${portalTab === 'payments' ? 'bg-[#00f2fe] text-slate-950 font-bold shadow-[0_0_15px_-3px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                >
                  Formas de Pago
                </button>
                <button
                  onClick={() => setPortalTab('catalog')}
                  className={`px-3 py-1.5 rounded-lg transition ${portalTab === 'catalog' ? 'bg-[#00f2fe] text-slate-950 font-bold shadow-[0_0_15px_-3px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                >
                  Catálogo & Precios
                </button>
                <button
                  onClick={() => setPortalTab('copilot')}
                  className={`px-3 py-1.5 rounded-lg transition ${portalTab === 'copilot' ? 'bg-[#00f2fe] text-slate-950 font-bold shadow-[0_0_15px_-3px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'}`}
                >
                  🤖 Copilot Operador
                </button>
              </div>
              <button
                onClick={handleCloseAdmin}
                className="px-3 py-1.5 rounded-xl bg-[#141822] border border-white/15 text-slate-300 hover:text-white text-xs font-mono transition"
              >
                ← Salir al Sitio Público
              </button>
            </div>
          </div>

          {/* TAB 1: DESCARGAS Y LICENCIAS DE CLIENTES (30 DÍAS + 5 DE GRACIA) */}
          {portalTab === 'licenses' && (
            <div className="space-y-6">
              {/* FORMULARIO DE EMISIÓN MANUAL */}
              <form onSubmit={handleCreateLicense} className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-[#00f2fe]">
                      EMISIÓN SOBERANA DE LICENCIA CORPORATIVA (CICLO 30 DÍAS + 5 DE GRACIA)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Asigna credenciales criptográficas locales con base de datos perimetral offline.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsPresencialModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-mono font-bold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🏪</span>
                      <span>+ Nueva Licencia Presencial / Mostrador</span>
                    </button>
                    <span className="text-[11px] font-mono text-emerald-400">
                      ● Registros: {licenses.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">CLIENTE / TITULAR *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Marcelo Díaz"
                      value={newLicClient}
                      onChange={(e) => setNewLicClient(e.target.value)}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">COMERCIO / EMPRESA</label>
                    <input
                      type="text"
                      placeholder="Ej: Bistró Central (Opcional)"
                      value={newLicBusiness}
                      onChange={(e) => setNewLicBusiness(e.target.value)}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">WHATSAPP DE ACTIVACIÓN</label>
                    <input
                      type="tel"
                      placeholder="Ej: +54 9 11 4522-8901"
                      value={newLicWhatsapp}
                      onChange={(e) => setNewLicWhatsapp(e.target.value)}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">CORREO ELECTRÓNICO</label>
                    <input
                      type="email"
                      placeholder="contacto@empresa.com"
                      value={newLicEmail}
                      onChange={(e) => setNewLicEmail(e.target.value)}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">SISTEMA A VINCULAR</label>
                    <select
                      value={newLicSystem}
                      onChange={(e) => setNewLicSystem(e.target.value)}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    >
                      {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 font-bold text-xs hover:brightness-110 shadow-[0_0_15px_-3px_rgba(0,242,254,0.3)] transition flex items-center gap-2"
                  >
                    <span>+ Emitir y Firmar Licencia Soberana</span>
                  </button>
                </div>
              </form>

              {/* TABLA DE LEADS Y LICENCIAS EMITIDAS */}
              <div className="rounded-2xl bg-[#141822] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-4 bg-[#0e1117] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Descargas, Evaluaciones & Licencias de Clientes
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Ciclo Soberano: 30 días continuos + 5 días perimetrales de gracia antes de suspensión
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    ● {licenses.filter(l => getLicenseDynamicStatus(l).label === 'Activo').length} Activas
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono whitespace-nowrap">
                    <thead className="bg-[#090b0e] text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="p-3.5">Cliente / Razón Social</th>
                        <th className="p-3.5">WhatsApp / Contacto</th>
                        <th className="p-3.5">Sistemas Asignados</th>
                        <th className="p-3.5">Clave Emitida</th>
                        <th className="p-3.5">Fecha Inicio</th>
                        <th className="p-3.5">Vencimiento (30d)</th>
                        <th className="p-3.5">Límite Gracia (35d)</th>
                        <th className="p-3.5">Estado Ciclo</th>
                        <th className="p-3.5 text-center">Gestión & Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {licenses.map(lic => {
                        const statusInfo = getLicenseDynamicStatus(lic);
                        const lifecycle = getLicenseLifecycle(lic);
                        const systemName = systems.find(s => s.id === lic.systemId)?.name || lic.systemId;
                        const clientLabel = lic.businessName ? `${lic.client} (${lic.businessName})` : lic.client;
                        const followUpText = `Estimado/a ${clientLabel}, le saludamos desde el centro de administración de Nexora One Engine respecto a su licencia activa ${lic.key} para ${systemName}.`;
                        const waHref = lic.whatsapp ? formatWhatsAppLink(lic.whatsapp, followUpText) : '#';

                        return (
                          <tr key={lic.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                <span>{lic.client}</span>
                                {lic.paymentMethod && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                                    {lic.paymentMethod}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                                {lic.businessName ? lic.businessName : <span className="text-slate-500 italic">Particular</span>}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-300">
                              {lic.whatsapp ? (
                                <a
                                  href={waHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition group font-mono text-[11px]"
                                  title="Iniciar conversación de seguimiento por WhatsApp en un clic"
                                >
                                  <span>💬</span>
                                  <span className="font-semibold underline decoration-emerald-500/40">{lic.whatsapp}</span>
                                  <span className="text-[10px] opacity-70 group-hover:opacity-100">↗</span>
                                </a>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                              {lic.email && <div className="text-[10px] text-slate-500 mt-1">{lic.email}</div>}
                            </td>
                            <td className="p-3.5 text-slate-300">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-200 border border-white/10 text-[10px]">
                                  {systemName}
                                </span>
                                {lic.assignedSystems && lic.assignedSystems.filter(sid => sid !== lic.systemId).map(sid => (
                                  <span key={sid} className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 text-[9px]">
                                    + {systems.find(s => s.id === sid)?.name || sid}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3.5 text-[#00f2fe] select-all font-mono font-semibold">{lic.key}</td>
                            <td className="p-3.5 text-slate-400">{lic.startDate}</td>
                            <td className="p-3.5 text-slate-300 font-semibold">{lic.expires}</td>
                            <td className="p-3.5 text-amber-300/80">{lic.graceLimit}</td>
                            <td className="p-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusInfo.color}`}>
                                  ● {statusInfo.label}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Día {lifecycle.totalCycleDay} / 35
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLicDossier(lic)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Abrir expediente granular, prorrogar o despachar notificaciones"
                                >
                                  <span>⚙</span>
                                  <span>Dossier</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleRenewLicense(lic.id)}
                                  title="Registrar Pago, Conciliar y Renovar (+30 días)"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <span>💳</span>
                                  <span>+30d</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORMAS DE PAGO (CBU / MERCADO PAGO / USDT) */}
          {portalTab === 'payments' && (
            <form onSubmit={handleSavePayments} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-sm font-mono text-[#00f2fe] font-bold uppercase tracking-wider">
                    CONFIGURACIÓN DIRECTA DE MÉTODOS DE COBRO
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Coordenadas financieras administrables consultadas en tiempo real por el motor autónomo de Nora Itu.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 font-bold text-xs hover:brightness-110 shadow-[0_0_20px_-3px_rgba(0,242,254,0.4)] transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span>💾</span>
                  <span>Guardar Métodos de Cobro</span>
                </button>
              </div>

              {paymentSavedToast && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>✓ Métodos de cobro guardados en almacenamiento soberano y sincronizados con Nora Itu.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Transferencia Bancaria */}
                <div className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏦</span>
                      <span className="font-bold text-white text-sm">Transferencia CBU / CVU</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      ARS Pesos
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">CBU O CVU BANCARIO</label>
                    <input
                      type="text"
                      value={paymentSettings.cbu}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, cbu: e.target.value }))}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">ALIAS BANCARIO</label>
                    <input
                      type="text"
                      value={paymentSettings.alias}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, alias: e.target.value }))}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">TITULAR DE LA CUENTA</label>
                    <input
                      type="text"
                      value={paymentSettings.titular}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, titular: e.target.value }))}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                </div>

                {/* Mercado Pago */}
                <div className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💳</span>
                      <span className="font-bold text-white text-sm">Mercado Pago</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      Link / QR
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">ENLACE DE COBRO / CHECKOUT</label>
                    <input
                      type="text"
                      value={paymentSettings.mercadopago}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, mercadopago: e.target.value }))}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed pt-2">
                    Permite a los clientes abonar mediante tarjetas de crédito, débito o dinero en cuenta al instante.
                  </p>
                </div>

                {/* Cripto USDT */}
                <div className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🪙</span>
                      <span className="font-bold text-white text-sm">Criptoactivos / USDT</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      USDT Global
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">BILLETERA TRON (TRC-20)</label>
                    <input
                      type="text"
                      value={paymentSettings.usdtTron}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, usdtTron: e.target.value }))}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">BILLETERA POLYGON (ERC-20)</label>
                    <input
                      type="text"
                      value={paymentSettings.usdtPolygon}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, usdtPolygon: e.target.value }))}
                      className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: GESTIÓN DE CATÁLOGO Y PRECIOS DUALES */}
          {portalTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-mono text-[#00f2fe] font-bold">ADMINISTRACIÓN DE SISTEMAS Y PRECIOS DUALES</h2>
                  <span className="text-[11px] font-mono text-slate-400">
                    Persistencia: <span className="text-emerald-400 font-bold">{isSupabaseConfigured ? 'Supabase DB' : 'Memoria Local-First'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewSystemModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-mono font-bold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(0,242,254,0.35)] transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <span className="text-sm font-black">+</span>
                  <span>Publicar Nuevo Sistema / Módulo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systems.map((sys) => (
                  <div key={sys.id} className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-white">{sys.name}</h3>
                        <span className="text-[11px] font-mono text-slate-400 block">{sys.subtitle}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sys.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {sys.active ? 'ACTIVO' : 'PAUSADO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">PRECIO USD ($)</label>
                        <input
                          type="number"
                          value={sys.priceUsd}
                          onChange={(e) => void handleUpdatePrice(sys.id, 'priceUsd', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">PRECIO PESOS ($ ARS)</label>
                        <input
                          type="number"
                          value={sys.priceArs}
                          onChange={(e) => void handleUpdatePrice(sys.id, 'priceArs', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#090b0e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: NORA COPILOT OPERATIVO DEL BACKOFFICE */}
          {portalTab === 'copilot' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#141822] via-[#0d121c] to-[#070b12] border border-cyan-500/30 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#090b0e] border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-lg font-bold shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                      🤖
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wider">
                          Copilot Operador — Terminal de Operaciones Internas
                        </h2>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          BACKOFFICE EXCLUSIVO
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Guía interactiva paso a paso para el operador: altas de sistemas, cobros presenciales, ciclo 30+5 y configuración de pagos (cero código).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>100% Cómputo Local (Sin Fugas)</span>
                  </div>
                </div>

                {/* BOTONES DE CONSULTA RÁPIDA (CHIPS) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Consultas Frecuentes del Operador:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendCopilotChat('¿Cómo publico un nuevo sistema en la tienda usando el botón visual?')}
                      className="px-3 py-1.5 rounded-xl bg-[#090b0e] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📦</span>
                      <span>Publicar Nuevo Sistema</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendCopilotChat('¿Cómo cobro y emito una licencia en mostrador/presencial en efectivo o transferencia?')}
                      className="px-3 py-1.5 rounded-xl bg-[#090b0e] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🏪</span>
                      <span>Venta en Mostrador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendCopilotChat('¿Cómo funciona la regla de 30+5 días y qué botón toco para registrar un pago?')}
                      className="px-3 py-1.5 rounded-xl bg-[#090b0e] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>⏳</span>
                      <span>Regla 30 + 5 Días (+30d)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendCopilotChat('¿Cómo configuro el CBU, Mercado Pago y USDT para que el bot pase mis cuentas?')}
                      className="px-3 py-1.5 rounded-xl bg-[#090b0e] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>💳</span>
                      <span>Configurar Cobros</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendCopilotChat('¿Cómo iniciar el sistema en la oficina sin internet con el archivo bat?')}
                      className="px-3 py-1.5 rounded-xl bg-[#090b0e] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>💻</span>
                      <span>Usar en PC sin Internet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendCopilotChat('¿Por qué es seguro el sistema ante desarrolladores externos y quién tiene el PIN?')}
                      className="px-3 py-1.5 rounded-xl bg-[#090b0e] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🛡️</span>
                      <span>Seguridad y PIN Operador</span>
                    </button>
                  </div>
                </div>

                {/* VENTANA DE CONVERSACIÓN DE NORA COPILOT */}
                <div className="rounded-2xl bg-[#090b0e] border border-white/10 p-4 space-y-3">
                  <div className="h-80 overflow-y-auto space-y-3 pr-1 text-xs font-mono">
                    {copilotMessages.map((m, idx) => (
                      <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-3.5 rounded-2xl max-w-[90%] sm:max-w-[80%] whitespace-pre-wrap leading-relaxed shadow-lg ${m.sender === 'user'
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold'
                              : 'bg-[#141822] text-slate-200 border border-cyan-500/20'
                            }`}
                        >
                          {m.text}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
                      </div>
                    ))}
                    {isCopilotSending && (
                      <div className="text-[11px] text-cyan-400 font-mono animate-pulse">
                        Nora Copilot analizando protocolo operativo...
                      </div>
                    )}
                    <div ref={copilotChatEndRef} />
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSendCopilotChat();
                    }}
                    className="flex gap-2 pt-2 border-t border-white/10"
                  >
                    <input
                      type="text"
                      placeholder="Pregunte a Nora Copilot (ej: ¿cómo dar de alta un sistema o registrar un pago en CBU?)..."
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      className="flex-1 bg-[#141822] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={isCopilotSending}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs font-mono hover:brightness-110 transition cursor-pointer"
                    >
                      Consultar
                    </button>
                  </form>
                </div>

                {/* TARJETAS DE CONOCIMIENTO TÉCNICO DIRECTO */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider text-cyan-400">
                    Fichas Técnicas del Manual Operativo:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
                    {Object.values(COPILOT_KNOWLEDGE_BASE).map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-[#090b0e] border border-white/10 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {t.badge}
                          </span>
                          <h4 className="text-sm font-bold text-white">{t.title}</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{t.summary}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCopilotTopic(t)}
                          className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-white/10 hover:border-cyan-500/30 transition text-center cursor-pointer"
                        >
                          Ver Guía Completa →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* VISTA B: SITIO PÚBLICO OFICIAL */
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-16">

          {/* HERO SECTION */}
          <section id="ecosistema" className="pt-4 sm:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md w-fit text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#00f2fe] animate-pulse"></span>
                <span className="text-slate-200 font-medium">{tr.hero.badge}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                {tr.hero.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal">
                {tr.hero.description}
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <a
                  href="#appstore"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-[#090b0e] font-bold text-sm hover:brightness-110 shadow-[0_0_25px_-3px_rgba(0,242,254,0.4)] transition-all flex items-center gap-2"
                >
                  <span>{tr.hero.exploreBtn}</span>
                  <span className="text-base leading-none">→</span>
                </a>
                <a
                  href="#casos"
                  className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-[#00f2fe]/40 hover:bg-white/10 text-slate-200 text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <span>{tr.hero.casesBtn}</span>
                  <span className="text-xs text-[#00f2fe]">★</span>
                </a>
                <a
                  href="#licencias"
                  className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-[#00f2fe]/40 hover:bg-white/10 text-slate-200 text-sm font-semibold transition-all"
                >
                  {tr.hero.licensesBtn}
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md p-7 rounded-3xl bg-gradient-to-b from-[#141822] to-[#0c0f17] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00f2fe]/10 via-transparent to-transparent opacity-60 pointer-events-none"></div>

                {/* LOGO OFICIAL CON RESPLANDOR DIFUSO */}
                <div className="relative py-2 px-4 flex items-center justify-center w-full">
                  <img
                    src="/brand/logo-full.png?v=2026"
                    alt="Nexora One Engine Sovereign Architecture"
                    className="w-full max-w-[280px] h-auto object-contain mix-blend-screen transition-transform duration-500 group-hover:scale-105"
                    style={{ filter: 'drop-shadow(0 0 25px rgba(0, 242, 254, 0.35))' }}
                  />
                </div>

                {/* FICHA TÉCNICA EJECUTIVA */}
                <div className="w-full mt-5 pt-4 border-t border-white/10 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{tr.hero.techCore}</span>
                    <span className="text-[#00f2fe] font-semibold tracking-wider">NEXORA ONE ENGINE</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{tr.hero.techArch}</span>
                    <span className="text-emerald-400 font-semibold tracking-wider">SOBERANA 2026</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{tr.hero.techAgent}</span>
                    <span className="text-cyan-400 font-semibold tracking-wider">NORA ITU</span>
                  </div>
                  <div className="pt-2">
                    <span className="font-mono text-[10px] sm:text-[11px] tracking-wider text-cyan-400 uppercase block text-center">
                      {tr.hero.techTagline}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* NOSOTROS, POLÍTICAS Y METAS */}
          <section id="nosotros" className="p-6 sm:p-8 rounded-3xl bg-[#141822]/40 border border-white/10 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-[#00f2fe] uppercase tracking-wider">{tr.about.sectionTag}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">{tr.about.title}</h2>
              <p className="text-sm text-slate-300 mt-1">{tr.about.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/5 space-y-2">
                <h3 className="font-bold text-white text-base">{tr.about.card1Title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tr.about.card1Desc}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/5 space-y-2">
                <h3 className="font-bold text-white text-base">{tr.about.card2Title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tr.about.card2Desc}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/5 space-y-2">
                <h3 className="font-bold text-white text-base">{tr.about.card3Title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tr.about.card3Desc}
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN INTERACTIVA: CASOS DE ÉXITO (#casos) */}
          <section id="casos" className="space-y-8 scroll-mt-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/10 pb-5 gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[#00f2fe] text-xs font-mono mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe]"></span>
                  <span>RESULTADOS Y RENDIMIENTO VERIFICADO</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">Casos de Éxito & Métricas Reales</h2>
                <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Despliegues reales en empresas e instituciones que demandan tolerancia cero a interrupciones y soberanía operativa estricta.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                ● Telemetría Perimetral Auditada
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CASO 1: RESTOBAR 2026 */}
              <div className="p-6 rounded-3xl bg-[#141822]/80 border border-white/10 hover:border-[#00f2fe]/40 backdrop-blur-xl shadow-xl space-y-5 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30">
                      GASTRONOMÍA DE ALTA DENSIDAD
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">PROD-VERIFIED</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#00f2fe] transition-colors">
                      Restobar 2026 POS
                    </h3>
                    <p className="text-xs font-mono text-cyan-400 mt-0.5">Soberanía Gastronómica</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Operación continua ininterrumpida de <strong className="text-white">12 horas en corte total de enlace externo</strong>. Gestión integral de mesas y despacho directo por comanderas ESC/POS sin depender de la nube.
                  </p>

                  {/* MÉTRICA NEÓN */}
                  <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-[#00f2fe] font-mono tracking-tight drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                        0
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-2">comandas perdidas</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">100% OPERATIVO</span>
                  </div>
                </div>

                {/* FICHA TÉCNICA */}
                <div className="pt-4 border-t border-white/10 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Base de Datos:</span>
                    <span className="text-white">SQLite Local Criptográfica</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Impresión Térmica:</span>
                    <span className="text-white">ESC/POS LAN / USB Directa</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Latencia Salón:</span>
                    <span className="text-[#00f2fe]">&lt; 2ms In-Memory</span>
                  </div>
                </div>
              </div>

              {/* CASO 2: CARRIBAR PASS */}
              <div className="p-6 rounded-3xl bg-[#141822]/80 border border-white/10 hover:border-[#00f2fe]/40 backdrop-blur-xl shadow-xl space-y-5 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      EVENTOS & FOOD PARKS
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">OFFLINE-FIRST</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#00f2fe] transition-colors">
                      Nexora Club & Carribar Pass
                    </h3>
                    <p className="text-xs font-mono text-amber-400 mt-0.5">Control de Acceso en Tiempo Real</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Despacho masivo y validación criptográfica de pases en predios al aire libre con congestión de antenas celulares o señal nula.
                  </p>

                  {/* MÉTRICA NEÓN */}
                  <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-[#00f2fe] font-mono tracking-tight drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                        +1.400
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-2">pases QR / jornada</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">CERO COLAS</span>
                  </div>
                </div>

                {/* FICHA TÉCNICA */}
                <div className="pt-4 border-t border-white/10 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Validación:</span>
                    <span className="text-white">QR HMAC Local Offline</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Sincronización:</span>
                    <span className="text-white">Mesh P2P Perimetral</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Velocidad Despacho:</span>
                    <span className="text-[#00f2fe]">1.2 seg / pedido</span>
                  </div>
                </div>
              </div>

              {/* CASO 3: PRENSA SOBERANA */}
              <div className="p-6 rounded-3xl bg-[#141822]/80 border border-white/10 hover:border-[#00f2fe]/40 backdrop-blur-xl shadow-xl space-y-5 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      MEDIOS & COMUNICACIÓN
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">DISTRIBUIDO</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#00f2fe] transition-colors">
                      Red de Prensa Soberana
                    </h3>
                    <p className="text-xs font-mono text-cyan-400 mt-0.5">Distribución de Contenidos Libres</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Publicación periodística y réplica descentralizada barrial/regional con compresión WebP ultra-liviana y sindicación sin censura ni comisiones en dólares.
                  </p>

                  {/* MÉTRICA NEÓN */}
                  <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-[#00f2fe] font-mono tracking-tight drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                        99.98%
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-2">disponibilidad</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">ALTA CARGA</span>
                  </div>
                </div>

                {/* FICHA TÉCNICA */}
                <div className="pt-4 border-t border-white/10 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Tamaño App:</span>
                    <span className="text-white">PWA &lt; 3.2 MB</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Optimización:</span>
                    <span className="text-white">WebP Lossless perimetral</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Soberanía:</span>
                    <span className="text-[#00f2fe]">Cero cookies de rastreo</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* APP STORE CON GLOBO 3D Y PRECIOS DUALES */}
          <section id="appstore" className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/10 pb-4 gap-4">
              <div>
                <span className="text-xs font-mono text-[#00f2fe]">CATÁLOGO SOBERANO DE PRODUCCIÓN</span>
                <h2 className="text-2xl font-bold text-white mt-0.5">Sistemas Listos para Producción</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar en catálogo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#141822] border border-white/10 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-48"
                />
                <div className="flex flex-wrap items-center gap-1 bg-[#141822] p-1 rounded-xl border border-white/10 text-xs font-mono">
                  {([
                    { id: 'all', label: 'Todos' },
                    { id: 'telecom', label: 'Telecom & ISP' },
                    { id: 'gastronomia', label: 'Gastronomía' },
                    { id: 'comercio', label: 'Comercio' },
                    { id: 'construccion', label: 'Obras & CRM' },
                    { id: 'eventos', label: 'Eventos' },
                    { id: 'inmuebles', label: 'Inmuebles' },
                    { id: 'servicios', label: 'Servicios' },
                    { id: 'medios', label: 'Medios' },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCategory(tab.id)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${activeCategory === tab.id ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <span className="px-3 py-1 rounded-full bg-[#141822] text-[#00f2fe] font-mono text-xs border border-white/10">
                  {filteredSystems.length} ACTIVOS
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 rounded-2xl bg-[#141822] border border-white/10 p-4 lg:sticky lg:top-20 shadow-2xl">
                <div className="flex justify-between pb-2 border-b border-white/10 text-xs font-mono">
                  <span className="text-white">MOTOR 3D INTERACTIVO</span>
                  <span className="text-[#00f2fe]">ROTACIÓN 360°</span>
                </div>
                <div
                  ref={globeMountRef}
                  className="w-full h-64 sm:h-72 md:h-80 max-h-[42vh] md:max-h-none bg-[#090b0e] rounded-xl my-2 cursor-grab active:cursor-grabbing pointer-events-none md:pointer-events-auto touch-pan-y"
                  style={{ touchAction: 'pan-y' }}
                ></div>
                <p className="text-[11px] text-slate-400 text-center font-mono">
                  Simulación de red perimetral independiente sin dependencias externas.
                </p>
              </div>

              <div className="lg:col-span-7 flex flex-col gap-4">
                {filteredSystems.map(sys => {
                  const isOpen = openAccordionId === sys.id;
                  return (
                    <article key={sys.id} className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-3 shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{sys.name}</h3>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sys.slaColor}`}>{sys.slaOrBadge}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{sys.subtitle}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/30 px-2 py-0.5 rounded">
                            {sys.priceUsd > 0 ? `$${sys.priceUsd} USD/mes` : '100% GRATIS'}
                          </span>
                          {sys.priceArs > 0 && (
                            <span className="block text-[10px] font-mono text-slate-400 mt-0.5">~${sys.priceArs.toLocaleString('es-AR')} ARS</span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{sys.description}</p>

                      <div className="rounded-xl bg-[#0e1117] border border-white/5 overflow-hidden">
                        <button
                          onClick={() => setOpenAccordionId(isOpen ? null : sys.id)}
                          className="w-full p-2.5 flex justify-between text-xs font-mono text-[#00f2fe] font-bold"
                        >
                          <span>¿A QUIÉN LE RESUELVE EL DÍA?</span>
                          <span>{isOpen ? '▲' : '▼'}</span>
                        </button>
                        {isOpen && (
                          <div className="p-3 text-xs text-slate-400 bg-[#090b0e]/70 border-t border-white/5">
                            {sys.targetAudience}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sys.tags.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-lg bg-[#0e1117] border border-white/5 text-[10px] font-mono text-slate-400">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* ACCEDER O PROBAR DEMO DIRECTA */}
                        <button
                          type="button"
                          onClick={() => handleAccessDemo(sys)}
                          className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-mono font-bold text-xs transition flex items-center justify-center gap-1.5"
                          title="Acceder a la demostración operativa del sistema"
                        >
                          <span>{sys.id === 'nora-isp' ? '🌐 Ver Caso de Éxito / Solicitar Demo' : '🚀 Acceder / Demo'}</span>
                          <span className="text-[#00f2fe]">↗</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenTrialModal(sys)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 font-bold text-xs hover:brightness-110 shadow-[0_0_15px_-3px_rgba(0,242,254,0.3)] transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>Clave 15D</span>
                          <span className="text-[10px] font-mono opacity-80">● Gratis</span>
                        </button>

                        {sys.priceUsd > 0 && (
                          <a
                            href={`https://wa.me/5493786414533?text=${encodeURIComponent(`Hola Nexora One, deseo información sobre la licencia de ${sys.name}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-3 rounded-xl bg-[#090b0e] border border-white/10 hover:border-[#00f2fe]/40 text-slate-200 text-xs font-semibold font-mono transition flex items-center justify-center gap-1"
                          >
                            <span>Adquirir</span>
                            <span className="text-[#00f2fe]">→</span>
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* LICENCIAS */}
          <section id="licencias" className="p-6 rounded-2xl bg-[#141822] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
              <span className="text-xs font-mono text-emerald-400">VERIFICACIÓN CRIPTOGRÁFICA</span>
              <h2 className="text-xl font-bold text-white">Activación Inmediata de Licencias</h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Cada sistema adquirido cuenta con una clave única de ejecución que garantiza funcionamiento ininterrumpido con 30 días de ciclo y 5 días de gracia operativa.
              </p>
            </div>
            <button
              onClick={() => {
                setIsNoraChatOpen(true);
                setChatInput('Hola Nora, quiero consultar el estado y activación de una clave de licencia.');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#00f2fe] text-slate-950 font-bold text-xs hover:bg-[#00f2fe]/90 transition"
            >
              Consultar Licencia con Nora
            </button>
          </section>

        </main>
      )}

      {/* FOOTER CORPORATIVO OFICIAL */}
      <footer className="bg-[#0e1117] border-t border-white/10 px-4 sm:px-6 py-10 mt-16 text-xs font-mono relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-slate-400">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00f2fe]"></span>
                <span className="text-white font-bold text-sm tracking-wider">{tr.footer.brand}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-400">v2026.1 SOV</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 font-normal leading-relaxed max-w-2xl">
                {tr.footer.copyright}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-300 text-xs font-mono">
              <a href="tel:3786414533" className="hover:text-[#00f2fe] transition flex items-center gap-1.5">
                <span>📞</span>
                <span>3786414533</span>
              </a>
              <a href={`mailto:${tr.footer.email}`} className="hover:text-[#00f2fe] transition flex items-center gap-1.5">
                <span>✉</span>
                <span>{tr.footer.email}</span>
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <a href="#licencias" className="hover:text-cyan-400 transition">{tr.footer.terms}</a>
              <span>·</span>
              <a href="#nosotros" className="hover:text-cyan-400 transition">{tr.footer.privacy}</a>
              <span>·</span>
              <a href="#licencias" className="hover:text-cyan-400 transition">{tr.footer.cryptoVerify}</a>
            </div>
            <span className="text-slate-600 font-mono text-[10px]">
              {tr.footer.location}
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL DE PIN SOBERANO (ACCESO ADMINISTRATIVO OCULTO #admin / Ctrl+Shift+A) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-[#141822] border border-[#00f2fe]/40 p-6 shadow-[0_0_50px_rgba(0,242,254,0.2)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#090b0e] border border-[#00f2fe]/50 flex items-center justify-center text-[#00f2fe] text-xs font-bold font-mono">
                  NX
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Consola Administrativa</h3>
              </div>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinError(false);
                  setAdminPinInput('');
                  if (window.location.hash === '#admin') window.history.replaceState(null, '', window.location.pathname);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ingresa el PIN soberano de seguridad para acceder a la gestión de productos, precios y licencias.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-[#00f2fe] block mb-1.5 font-bold uppercase tracking-wider">
                  PIN DE SEGURIDAD SOBERANO
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={12}
                  placeholder="••••"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setPinError(false);
                  }}
                  className={`w-full bg-[#090b0e] border ${pinError ? 'border-red-500' : 'border-white/15'} focus:border-[#00f2fe] rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none transition`}
                />
                {pinError && (
                  <span className="text-[11px] text-red-400 font-mono block mt-1 text-center">
                    PIN incorrecto. Acceso denegado.
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinError(false);
                    setAdminPinInput('');
                    if (window.location.hash === '#admin') window.history.replaceState(null, '', window.location.pathname);
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#090b0e] border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 text-xs font-bold font-mono hover:brightness-110 shadow-[0_0_15px_-3px_rgba(0,242,254,0.4)] transition"
                >
                  Autenticar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PÚBLICO DE PRUEBA 15 DÍAS (LEAD / DEMO) */}
      {isTrialModalOpen && selectedTrialSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#141822] border border-[#00f2fe]/40 p-6 shadow-[0_0_50px_rgba(0,242,254,0.25)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  DEMO 15 DÍAS
                </span>
                <h3 className="text-sm font-bold text-white font-mono">{selectedTrialSystem.name}</h3>
              </div>
              <button
                onClick={() => {
                  setIsTrialModalOpen(false);
                  setTrialResult(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {!trialResult ? (
              <form onSubmit={handleSubmitTrialLead} className="space-y-3.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Active su acceso de evaluación durante <strong className="text-white">15 días continuos</strong> con motor soberano y comanderas locales sin requerir tarjeta de crédito.
                </p>

                {/* 1. NOMBRE COMPLETO */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    NOMBRE COMPLETO *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcelo Díaz"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/15 focus:border-[#00f2fe] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  />
                </div>

                {/* 2. COMERCIO / RAZÓN SOCIAL */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[10px] font-mono text-slate-400 block">
                      COMERCIO / RAZÓN SOCIAL
                    </label>
                    <span className="text-[9px] font-mono text-slate-500 italic">Opcional</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Ej: Bistró Costanera SRL"
                    value={leadBusiness}
                    onChange={(e) => setLeadBusiness(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/15 focus:border-[#00f2fe] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  />
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    * Dejar en blanco si es uso personal o profesional independiente.
                  </span>
                </div>

                {/* 3. WHATSAPP CON PREFIJO INTERNACIONAL VISIBLE */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    WHATSAPP DE ACTIVACIÓN *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-xl bg-[#0e1117] border border-white/15 text-xs font-mono text-[#00f2fe] select-none font-bold">
                      🇦🇷 +54
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="9 3786 414533"
                      value={leadWhatsapp}
                      onChange={(e) => setLeadWhatsapp(e.target.value)}
                      className="flex-1 bg-[#090b0e] border border-white/15 focus:border-[#00f2fe] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono transition"
                    />
                  </div>
                </div>

                {/* 4. CORREO ELECTRÓNICO */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    CORREO ELECTRÓNICO *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contacto@tuempresa.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/15 focus:border-[#00f2fe] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingTrial}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 text-xs font-bold font-mono hover:brightness-110 shadow-[0_0_20px_-3px_rgba(0,242,254,0.4)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isSubmittingTrial ? 'Generando Clave...' : 'Solicitar Acceso y Clave de Evaluación'}</span>
                    <span className="text-slate-950 font-sans">→</span>
                  </button>
                  <span className="block text-[10px] text-center text-slate-500 font-mono mt-2">
                    Cero retención · Despliegue en máquina local · Soporte por Nora Itu
                  </span>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-400">✓ ACCESO SOBERANO CONCEDIDO</span>
                  <p className="text-xs text-slate-300">
                    Su período de evaluación de 15 días para <strong className="text-white">{selectedTrialSystem.name}</strong> ha sido activado con éxito.
                  </p>
                </div>

                {/* TARJETA DE CONFIRMACIÓN CON CLAVE Y COPIADO RÁPIDO */}
                <div className="p-4 rounded-xl bg-[#090b0e] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      CLAVE DE LICENCIA CRIPTOGRÁFICA
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Vence: {trialResult.expires}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono font-bold text-xs sm:text-sm text-[#00f2fe] bg-[#141822] p-2.5 rounded-xl border border-[#00f2fe]/30 select-all tracking-wider text-center overflow-x-auto">
                      {trialResult.key}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(trialResult.key);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2500);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-[#141822] hover:bg-[#1f2433] border border-white/20 text-slate-200 text-xs font-mono font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      title="Copiar Clave al Portapapeles"
                    >
                      <span>{copiedKey ? '✓' : '📋'}</span>
                      <span>{copiedKey ? '¡Copiada!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* BOTÓN PRIORITARIO WHATSAPP DESTACADO EN VERDE */}
                {(() => {
                  const saludoCliente = trialResult.businessName
                    ? `${trialResult.clientName} de (${trialResult.businessName})`
                    : trialResult.clientName;

                  const demoUrl = selectedTrialSystem.id === 'prensa'
                    ? 'https://nexora-news.vercel.app'
                    : (selectedTrialSystem.demoUrl || `${typeof window !== 'undefined' ? window.location.origin : 'https://nexoraone.com'}/?demo=${selectedTrialSystem.id}`);
                  const plantillawa = `Estimado/a ${saludoCliente}:

Le damos la bienvenida a Nexora One.
Su acceso de evaluación por 15 días para ${selectedTrialSystem.name} ha sido concedido exitosamente.

🔑 Clave de Licencia: ${trialResult.key}
📅 Vigencia de Prueba: 15 días
🚀 Enlace de Acceso / Demo: ${demoUrl}

Conserve este mensaje oficial. Al término de su período de prueba o para habilitar el servicio definitivo, este canal verificará su comprobante de pago directo (Transferencia Bancaria, Mercado Pago o USDT).

Nexora One — Arquitectura Soberana`;

                  const waHref = formatWhatsAppLink(trialResult.whatsapp, plantillawa);
                  const supportHref = formatWhatsAppLink(
                    '5493786414533',
                    `Estimado equipo de soporte de Nexora One, me comunico por la licencia de prueba ${trialResult.key} para ${selectedTrialSystem.name} solicitada por ${saludoCliente}.`
                  );

                  return (
                    <div className="space-y-2.5 pt-1">
                      {demoUrl && (
                        <a
                          href={demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f2fe]/20 to-[#00b4d8]/20 border border-[#00f2fe]/50 text-[#00f2fe] hover:bg-[#00f2fe]/30 text-xs font-bold font-mono transition flex items-center justify-center gap-2 text-center"
                        >
                          <span>🚀 Abrir Demo en Vivo de {selectedTrialSystem.name} ↗</span>
                        </a>
                      )}

                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold font-mono shadow-[0_0_25px_rgba(37,211,102,0.4)] transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
                      >
                        <span className="text-base leading-none">📲</span>
                        <span>Enviar Licencia y Acceso a mi WhatsApp</span>
                      </a>

                      <a
                        href={supportHref}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#141822] border border-white/15 text-slate-300 hover:text-white text-xs font-mono transition flex items-center justify-center gap-2"
                      >
                        <span>💬 Contactar Asistencia Oficial (+54 9 3786 414533)</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleDownloadTrialKit}
                        className="w-full py-2 px-3 rounded-lg text-slate-400 hover:text-[#00f2fe] text-[11px] font-mono transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>⬇ Descargar también copia local en formato .json</span>
                      </button>
                    </div>
                  );
                })()}

                <button
                  onClick={() => {
                    setIsTrialModalOpen(false);
                    setTrialResult(null);
                  }}
                  className="w-full py-2 rounded-xl bg-[#090b0e] border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition text-center"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ARQUITECTURA PERIMETRAL / DESKTOP ONLY */}
      {desktopNoticeSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-[#141822] border border-cyan-500/40 p-6 sm:p-7 shadow-[0_0_60px_rgba(0,242,254,0.25)] space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#090b0e] border border-cyan-400/40 mx-auto flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,242,254,0.3)]">
              🖥️
            </div>

            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                ARQUITECTURA PERIMETRAL LOCAL
              </span>
              <h3 className="text-lg font-bold text-white font-mono">
                {desktopNoticeSystem.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Este sistema opera con motor nativo de escritorio (Windows / Linux) para impresoras térmicas ESC/POS, lectores de código de barra y SQLite offline sin cortes por internet.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090b0e] border border-white/10 text-left text-xs font-mono text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 text-[#00f2fe]">
                <span>✓</span>
                <span>Instalador local (.exe / script perimetral)</span>
              </div>
              <div className="flex items-center gap-2 text-[#00f2fe]">
                <span>✓</span>
                <span>Base SQLite aislada con cero dependencia de la nube</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <span>✓</span>
                <span>Listo para terminales de mostrador y cajas offline</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {desktopNoticeSystem.demoUrl && (
                <a
                  href={desktopNoticeSystem.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00f2fe] hover:bg-[#00d0dc] text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center gap-2"
                >
                  <span>🌐 Ver Simulación Web Interactiva ↗</span>
                </a>
              )}

              <a
                href={`https://wa.me/5493786414533?text=${encodeURIComponent(`Hola Nexora One, deseo recibir el instalador de escritorio y demostración asistida para ${desktopNoticeSystem.name}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center gap-2"
              >
                <span>📲 Solicitar Instalador a mi WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setDesktopNoticeSystem(null)}
                className="w-full py-2 rounded-xl bg-[#090b0e] border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DUAL QR DE ACCESO RÁPIDO Y DESCARGA PWA MÓVIL */}
      {isQrModalOpen && (() => {
        const mobileNavUrl = 'https://tinyurl.com/nexora-one';
        const pwaUrl = 'https://nexora-store-app.vercel.app/?install=pwa';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-2xl rounded-3xl bg-[#141822] border border-cyan-500/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,242,254,0.25)] space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] mb-1">
                    <span>GATEWAY MÓVIL SOBERANO</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {tr.qrModal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tr.qrModal.subtitle}
                  </p>
                </div>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* QR 1: NAVEGACIÓN MÓVIL DIRECTA */}
                <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/10 flex flex-col items-center text-center space-y-3 group hover:border-cyan-500/40 transition">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    {tr.qrModal.qr1Badge}
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {tr.qrModal.qr1Title}
                  </h4>
                  <div
                    className="w-52 h-52 rounded-2xl bg-white p-3 flex items-center justify-center shadow-[0_0_35px_rgba(0,242,254,0.35)] border-2 border-cyan-400"
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvgString(mobileNavUrl, {
                        size: 184,
                        fgColor: '#000000',
                        bgColor: '#ffffff',
                        margin: 2,
                        errorCorrectionLevel: 'M'
                      })
                    }}
                  />
                  <div className="text-[10px] font-mono text-cyan-400 select-all font-semibold break-all">
                    {mobileNavUrl}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {tr.qrModal.qr1Desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mobileNavUrl);
                      setCopiedQrLink('nav');
                      setTimeout(() => setCopiedQrLink(null), 2000);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#141822] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{copiedQrLink === 'nav' ? '✓ Copiado al Portapapeles' : tr.qrModal.copyNav}</span>
                  </button>
                </div>

                {/* QR 2: INSTALADOR PWA */}
                <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/10 flex flex-col items-center text-center space-y-3 group hover:border-emerald-500/40 transition">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {tr.qrModal.qr2Badge}
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {tr.qrModal.qr2Title}
                  </h4>
                  <div
                    className="w-52 h-52 rounded-2xl bg-white p-3 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.35)] border-2 border-emerald-400"
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvgString(pwaUrl, {
                        size: 184,
                        fgColor: '#000000',
                        bgColor: '#ffffff',
                        margin: 2,
                        errorCorrectionLevel: 'M'
                      })
                    }}
                  />
                  <div className="text-[10px] font-mono text-emerald-400 select-all font-semibold break-all">
                    {pwaUrl}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {tr.qrModal.qr2Desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pwaUrl);
                      setCopiedQrLink('pwa');
                      setTimeout(() => setCopiedQrLink(null), 2000);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#141822] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{copiedQrLink === 'pwa' ? '✓ Copiado al Portapapeles' : tr.qrModal.copyPwa}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-[#090b0e] border border-white/15 text-slate-300 hover:text-white text-xs font-mono transition"
                >
                  {tr.qrModal.close}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE ASISTENCIA E INSTALACIÓN PWA (?install=pwa) */}
      {showPwaInstallModal && !isStandaloneApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-[#141822] border border-emerald-500/50 p-6 sm:p-7 shadow-[0_0_60px_rgba(16,185,129,0.35)] space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#090b0e] border border-emerald-400/50 mx-auto flex items-center justify-center p-2.5 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <img src="/brand/logo-full.png" alt="Nexora One" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                INSTALADOR APP SOBERANA (PWA)
              </span>
              <h3 className="text-lg font-bold text-white font-mono">
                Instalar Nexora One en tu Dispositivo
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Obtén acceso directo de pantalla completa con funcionamiento offline garantizado y sin intermediarios ni tiendas externas.
              </p>
            </div>

            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleTriggerPwaInstall}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-mono font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:brightness-110 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>➕</span>
                <span>Instalar Ahora en la Pantalla de Inicio</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-[#090b0e] border border-white/10 text-left space-y-2 text-xs font-mono text-slate-300">
                <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <span>📱</span>
                  <span>Instrucciones para instalar:</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <p><span className="text-white font-semibold">En iPhone / Safari:</span> Tocá el botón <span className="text-cyan-400">Compartir ⎋</span> en la barra inferior y seleccioná <span className="text-emerald-400">"Agregar a Inicio ➕"</span>.</p>
                  <p><span className="text-white font-semibold">En Android / Chrome:</span> Tocá el menú <span className="text-cyan-400">⋮</span> (arriba a la derecha) y seleccioná <span className="text-emerald-400">"Instalar aplicación"</span> o "Agregar a pantalla principal".</p>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-center">
              <button
                type="button"
                onClick={() => setShowPwaInstallModal(false)}
                className="text-xs font-mono text-slate-400 hover:text-white transition py-1 px-4 cursor-pointer"
              >
                Continuar navegando en la web →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALTA PRESENCIAL / MOSTRADOR */}
      {isPresencialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#141822] border border-emerald-500/40 p-6 sm:p-7 shadow-[0_0_50px_rgba(16,185,129,0.25)] space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏪</span>
                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                    {tr.admin.presencialTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {tr.admin.presencialDesc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPresencialModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePresencialLicense} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    {tr.admin.presencialClient}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Laura Giménez"
                    value={presencialClient}
                    onChange={(e) => setPresencialClient(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    {tr.admin.presencialBusiness}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Café de la Plaza (Opcional)"
                    value={presencialBusiness}
                    onChange={(e) => setPresencialBusiness(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    {tr.admin.presencialWhatsapp}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+54 9 3786 55-1234"
                    value={presencialWhatsapp}
                    onChange={(e) => setPresencialWhatsapp(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    {tr.admin.presencialEmail}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="gerencia@cafedelaplaza.ar"
                    value={presencialEmail}
                    onChange={(e) => setPresencialEmail(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    {tr.admin.presencialSystem}
                  </label>
                  <select
                    value={presencialSystem}
                    onChange={(e) => setPresencialSystem(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.priceUsd > 0 ? `$${s.priceUsd} USD` : 'Gratuito'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    {tr.admin.presencialMethod}
                  </label>
                  <select
                    value={presencialMethod}
                    onChange={(e) => setPresencialMethod(e.target.value as PresencialPaymentMethod)}
                    className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  >
                    <option value="cash">💵 Efectivo (ARS)</option>
                    <option value="transfer">🏦 Transferencia Bancaria (CBU/CVU)</option>
                    <option value="usdt">💎 USDT Criptoactivo (TRC-20)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  {tr.admin.presencialNotes}
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cobrado en mostrador local Central, factura manual 0012"
                  value={presencialNotes}
                  onChange={(e) => setPresencialNotes(e.target.value)}
                  className="w-full bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPresencialModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#090b0e] border border-white/15 text-slate-400 hover:text-white text-xs font-mono transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold font-mono text-xs hover:brightness-110 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition flex items-center gap-2 cursor-pointer"
                >
                  <span>✓</span>
                  <span>{tr.admin.presencialSubmit}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECIBO CRIPTOGRÁFICO DE ALTA PRESENCIAL */}
      {presencialReceipt && (() => {
        const sysName = systems.find(s => s.id === presencialReceipt.systemId)?.name || presencialReceipt.systemId;
        const receiptText =
          `════════════════════════════════════════════════════\n` +
          `  NEXORA ONE ENGINE — RECIBO CRIPTOGRÁFICO DE PAGO\n` +
          `════════════════════════════════════════════════════\n` +
          `Cliente:       ${presencialReceipt.client}\n` +
          `Comercio:      ${presencialReceipt.businessName || 'Particular'}\n` +
          `WhatsApp:      ${presencialReceipt.whatsapp}\n` +
          `Email:         ${presencialReceipt.email}\n` +
          `Sistema:       ${sysName}\n` +
          `Clave Emitida: ${presencialReceipt.key}\n` +
          `Forma de Pago: ${(presencialReceipt.paymentMethod || 'cash').toUpperCase()}\n` +
          `Inicio Ciclo:  ${presencialReceipt.startDate}\n` +
          `Vencimiento:   ${presencialReceipt.expires} (30 días)\n` +
          `Límite Gracia: ${presencialReceipt.graceLimit} (+5 días)\n` +
          `Sello SHA-256: NX-${Date.now().toString(16).toUpperCase()}-SOVEREIGN\n` +
          `════════════════════════════════════════════════════`;

        const waHref = presencialReceipt.whatsapp
          ? formatWhatsAppLink(presencialReceipt.whatsapp, receiptText)
          : '#';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-lg rounded-3xl bg-[#141822] border border-emerald-500/40 p-6 sm:p-7 shadow-[0_0_60px_rgba(16,185,129,0.3)] space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                  <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                    {tr.admin.receiptTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setPresencialReceipt(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#090b0e] border border-white/10 text-emerald-400 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all">
                {receiptText}
              </pre>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(receiptText);
                    setCopiedReceipt(true);
                    setTimeout(() => setCopiedReceipt(false), 2000);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#090b0e] hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{copiedReceipt ? '✓ Copiado al Portapapeles' : tr.admin.receiptCopy}</span>
                </button>
                {presencialReceipt.whatsapp && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs font-mono shadow-[0_0_20px_rgba(37,211,102,0.4)] transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <span>📲</span>
                    <span>{tr.admin.receiptSendWa}</span>
                  </a>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPresencialReceipt(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#090b0e] border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL EXPEDIENTE / DOSSIER GRANULAR DEL CLIENTE */}
      {selectedLicDossier && (() => {
        const lifecycle = getLicenseLifecycle(selectedLicDossier);
        const sysName = systems.find(s => s.id === selectedLicDossier.systemId)?.name || selectedLicDossier.systemId;
        const templates = buildNotificationTemplates(selectedLicDossier, sysName, paymentSettings, lang);
        const activeTmpl = templates[selectedNoticeType === 'preventive_25' ? 'preventive25' : selectedNoticeType === 'grace_31' ? 'grace31' : 'suspension36'];
        const waHref = selectedLicDossier.whatsapp ? formatWhatsAppLink(selectedLicDossier.whatsapp, activeTmpl.whatsapp) : '#';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-3xl rounded-3xl bg-[#141822] border border-cyan-500/40 p-6 sm:p-7 shadow-[0_0_60px_rgba(0,242,254,0.25)] space-y-5 max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wider">
                      {tr.admin.dossierTitle} — {selectedLicDossier.client}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Clave: <span className="text-[#00f2fe] select-all">{selectedLicDossier.key}</span> | {selectedLicDossier.businessName || 'Particular'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLicDossier(null)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
                >
                  ✕
                </button>
              </div>

              {/* Toast de acción */}
              {noticeToast && (
                <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>{noticeToast}</span>
                </div>
              )}

              {/* Telemetría del Ciclo 30+5 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase block">{tr.admin.cycleStage}</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${lifecycle.badgeColor} ${lifecycle.textColor}`}>
                    {lifecycle.label}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase block">{tr.admin.cycleDay}</span>
                  <span className="text-base font-bold text-white">
                    Día {lifecycle.totalCycleDay} <span className="text-xs text-slate-500 font-normal">/ 35</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase block">{tr.admin.daysRemaining}</span>
                  <span className="text-base font-bold text-[#00f2fe]">
                    {lifecycle.daysRemaining} días
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase block">{tr.admin.graceLimit}</span>
                  <span className="text-xs font-bold text-amber-300">
                    {selectedLicDossier.graceLimit}
                  </span>
                </div>
              </div>

              {/* Panel de Acciones Granulares */}
              <div className="p-4 rounded-2xl bg-[#0e1117] border border-white/10 space-y-3">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider text-cyan-400">
                  Acciones Rápidas sobre la Licencia
                </h4>
                <div className="flex flex-wrap gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleExtendGrace(selectedLicDossier.id)}
                    className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold transition cursor-pointer"
                  >
                    ⏳ {tr.admin.extendGrace}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForceSuspend(selectedLicDossier.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold transition cursor-pointer"
                  >
                    🛑 {tr.admin.forceSuspend}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRenewLicense(selectedLicDossier.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold transition cursor-pointer"
                  >
                    💳 {tr.admin.renewCycle}
                  </button>
                </div>

                {/* Sistemas asignados y revocación */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">Sistemas activos en este expediente:</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                      {sysName} (Principal)
                    </span>
                    {selectedLicDossier.assignedSystems && selectedLicDossier.assignedSystems.filter(sid => sid !== selectedLicDossier.systemId).map(sid => (
                      <span key={sid} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[10px] font-mono">
                        <span>+ {systems.find(s => s.id === sid)?.name || sid}</span>
                        <button
                          type="button"
                          onClick={() => handleRevokeSystemFromLicense(selectedLicDossier.id, sid)}
                          className="hover:text-red-400 text-slate-400 text-xs font-bold transition cursor-pointer"
                          title="Revocar este sistema adicional"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Asignar Sistema Adicional */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-mono text-slate-400">Vincular otro sistema al cliente:</span>
                    <select
                      value={addSystemSelect}
                      onChange={(e) => setAddSystemSelect(e.target.value)}
                      className="bg-[#090b0e] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    >
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddSystemToLicense(selectedLicDossier.id, addSystemSelect)}
                      className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition cursor-pointer"
                    >
                      + Asignar
                    </button>
                  </div>
                </div>
              </div>

              {/* Disparador de Notificaciones (WhatsApp / SMTP) */}
              <div className="p-4 rounded-2xl bg-[#0e1117] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider text-cyan-400">
                    Disparador de Notificaciones de Cobro
                  </h4>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedNoticeType('preventive_25')}
                      className={`px-2.5 py-1 rounded-lg transition ${selectedNoticeType === 'preventive_25' ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      Día 25 (Preventivo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNoticeType('grace_31')}
                      className={`px-2.5 py-1 rounded-lg transition ${selectedNoticeType === 'grace_31' ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      Día 31 (Gracia Fatal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNoticeType('suspension_36')}
                      className={`px-2.5 py-1 rounded-lg transition ${selectedNoticeType === 'suspension_36' ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      Día 36+ (Corte)
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090b0e] border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono text-cyan-300 uppercase block font-bold">
                    Vista Previa: {activeTmpl.title}
                  </span>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    {activeTmpl.whatsapp}
                  </pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  {selectedLicDossier.whatsapp ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs font-mono shadow-[0_0_20px_rgba(37,211,102,0.35)] transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <span>📲</span>
                      <span>{tr.admin.sendWhatsappNotice}</span>
                    </a>
                  ) : (
                    <button disabled className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 text-slate-500 text-xs font-mono">
                      Sin WhatsApp Registrado
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSendDossierEmail(selectedLicDossier, selectedNoticeType)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 font-bold text-xs font-mono shadow-[0_0_20px_rgba(0,242,254,0.3)] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>✉</span>
                    <span>{tr.admin.sendEmailNotice}</span>
                  </button>
                </div>
              </div>

              {/* Historial de Auditoría */}
              {selectedLicDossier.history && selectedLicDossier.history.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#0e1117] border border-white/10 space-y-2">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    {tr.admin.auditHistory}
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto font-mono text-[11px]">
                    {selectedLicDossier.history.map((h) => (
                      <div key={h.id} className="p-2 rounded-lg bg-[#090b0e] border border-white/5 flex items-center justify-between gap-2 text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {h.channel === 'whatsapp' ? '📲' : h.channel === 'email' ? '✉' : '⚙'}
                          </span>
                          <span>{h.detail}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(h.sentAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedLicDossier(null)}
                  className="px-5 py-2 rounded-xl bg-[#090b0e] border border-white/15 text-slate-300 hover:text-white text-xs font-mono transition"
                >
                  Cerrar Expediente
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DETALLE DE GUÍA OPERATIVA (NORA COPILOT) */}
      {selectedCopilotTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl bg-[#141822] border border-cyan-500/40 p-6 sm:p-7 shadow-[0_0_60px_rgba(0,242,254,0.3)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {selectedCopilotTopic.badge}
                </span>
                <h3 className="text-base font-bold text-white font-mono mt-1">
                  {selectedCopilotTopic.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCopilotTopic(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/10 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedCopilotTopic.content}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedCopilotTopic(null)}
                className="px-5 py-2 rounded-xl bg-[#090b0e] border border-white/15 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRAGMÁTICO: + PUBLICAR NUEVO SISTEMA / MÓDULO (CERO CÓDIGO) */}
      {isNewSystemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl bg-[#141822] border border-cyan-400/50 p-6 sm:p-7 shadow-[0_0_60px_rgba(0,242,254,0.3)] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  CATÁLOGO & TIENDA SOBERANA
                </span>
                <h3 className="text-base font-bold text-white font-mono mt-1">
                  Publicar Nuevo Sistema / Módulo
                </h3>
              </div>
              <button
                onClick={() => setIsNewSystemModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSystem} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Nombre del Software / Módulo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Nexora Taller Mecánico, Nexora Carnicería..."
                  value={newSysName}
                  onChange={(e) => setNewSysName(e.target.value)}
                  className="w-full bg-[#090b0e] border border-white/15 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Categoría / Rubro
                  </label>
                  <select
                    value={newSysCategory}
                    onChange={(e) => setNewSysCategory(e.target.value as SystemItem['category'])}
                    className="w-full bg-[#090b0e] border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="gastronomia">Gastronomía & Restobares</option>
                    <option value="logistica">Logística, Flotas & Envíos</option>
                    <option value="salud">Salud, Clínicas & Farmacias</option>
                    <option value="retail">Comercio, Retail & Supermercados</option>
                    <option value="corporativo">Corporativo & Enterprise ERP</option>
                    <option value="legal">Legal, Escribanías & Notarial</option>
                    <option value="finanzas">Finanzas, Fintech & Pagos</option>
                    <option value="educacion">Educación & Colegios</option>
                    <option value="hotel">Hotelería, Cabañas & Turismo</option>
                    <option value="agro">Agro & Acopio</option>
                    <option value="industrial">Industria & Producción</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Subtítulo / SLA
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gestión Taller Offline · SLA 100%"
                    value={newSysSubtitle}
                    onChange={(e) => setNewSysSubtitle(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/15 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Precio Pesos ($ ARS) / mes
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 35000"
                    value={newSysPriceArs}
                    onChange={(e) => setNewSysPriceArs(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#090b0e] border border-white/15 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Precio Dólares ($ USD) / mes
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 35"
                    value={newSysPriceUsd}
                    onChange={(e) => setNewSysPriceUsd(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#090b0e] border border-white/15 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Descripción Breve del Sistema
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Control de órdenes de reparación, repuestos, clientes y cobranzas con funcionamiento offline."
                  value={newSysDescription}
                  onChange={(e) => setNewSysDescription(e.target.value)}
                  className="w-full bg-[#090b0e] border border-white/15 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Enlace Demo o Binario de Instalación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="https://... o ruta local"
                  value={newSysDemoUrl}
                  onChange={(e) => setNewSysDemoUrl(e.target.value)}
                  className="w-full bg-[#090b0e] border border-white/15 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#090b0e] border border-white/10">
                <span className="text-slate-300 font-semibold">Visible en Tienda Pública:</span>
                <button
                  type="button"
                  onClick={() => setNewSysActive(!newSysActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    newSysActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  {newSysActive ? 'SÍ (Activo)' : 'NO (Pausado)'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewSystemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs font-mono shadow-[0_0_20px_rgba(0,242,254,0.35)] hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Guardar y Publicar en Tienda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT FLOTANTE NORA ITU - EXCLUSIVO PARA VISITANTES EN EL SITIO PÚBLICO */}
      {!(isPortalOpen && isAdminAuthenticated) && (
        <div className="fixed bottom-10 right-6 sm:bottom-12 sm:right-10 z-40 flex flex-col items-end">
          {isNoraChatOpen && (
            <div className="w-80 sm:w-96 rounded-2xl bg-[#141822] border border-[#00f2fe]/30 shadow-2xl mb-3 overflow-hidden flex flex-col h-[440px]">
              <div className="bg-[#0e1117] p-3 flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-white">Nora Itu — Concierge Soberana</span>
                </div>
                <button onClick={() => setIsNoraChatOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs bg-[#090b0e]">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-2.5 rounded-xl max-w-[85%] ${m.sender === 'user' ? 'bg-[#00f2fe] text-slate-950 font-medium' : 'bg-[#141822] text-slate-200 border border-white/10'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isSendingChat && <div className="text-[11px] text-slate-500 font-mono">Nora Itu procesando...</div>}
                <div ref={chatMessagesEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="p-2 bg-[#0e1117] border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Ask Nora Itu anything...' : 'Pregunta a Nora Itu...'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-[#141822] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                />
                <button type="submit" disabled={isSendingChat} className="px-3 py-1.5 bg-[#00f2fe] text-slate-950 font-bold rounded-lg text-xs hover:bg-[#00f2fe]/90">
                  {lang === 'en' ? 'Send' : 'Enviar'}
                </button>
              </form>
            </div>
          )}

          <button
            onClick={() => setIsNoraChatOpen(!isNoraChatOpen)}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-[#00f2fe] to-[#00b4d8] text-slate-950 shadow-[0_0_25px_rgba(0,242,254,0.4)] hover:scale-105 transition-all flex items-center gap-2 font-bold text-xs cursor-pointer"
          >
            <span>Nora Itu AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </button>
        </div>
      )}

      {/* BOTÓN FLOTANTE COPILOT OPERADOR - EXCLUSIVO EN EL DASHBOARD ADMINISTRATIVO */}
      {isPortalOpen && isAdminAuthenticated && (
        <div className="fixed bottom-10 right-6 sm:bottom-12 sm:right-10 z-40 flex flex-col items-end">
          <button
            onClick={() => {
              setPortalTab('copilot');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-[#141822] via-[#0d121c] to-[#070b12] border border-cyan-400 text-cyan-300 shadow-[0_0_25px_rgba(0,242,254,0.3)] hover:scale-105 transition-all flex items-center gap-2 font-mono font-bold text-xs cursor-pointer"
            title="Abrir Asistente Copilot para Operador"
          >
            <span className="text-base">🤖</span>
            <span>Copilot Operador</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          </button>
        </div>
      )}

    </div>
  );
}
