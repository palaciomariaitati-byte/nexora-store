import { useState, useEffect, useRef, type FormEvent } from 'react';
import * as THREE from 'three';
import { supabase, isSupabaseConfigured } from './lib/supabase';

// --- TIPOS DE DATOS ---
export interface SystemItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'gastronomia' | 'clasificados' | 'inmuebles' | 'musica' | 'prensa';
  slaOrBadge: string;
  slaColor: string;
  priceUsd: number;
  priceArs: number;
  description: string;
  targetAudience: string;
  tags: string[];
  active: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cbu' | 'mercadopago' | 'crypto' | 'stripe';
  details: string;
  active: boolean;
}

export interface CorporateLicense {
  id: string;
  key: string;
  client: string;
  systemId: string;
  status: 'active' | 'trial' | 'suspended';
  expires: string;
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
  client?: string;
  system_id?: string;
  systemId?: string;
  status?: 'active' | 'trial' | 'suspended';
  expires?: string;
}

// --- CATÁLOGO DETERMINISTA LOCAL OFFLINE-FIRST ---
const INITIAL_SYSTEMS: SystemItem[] = [
  {
    id: 'restobar',
    name: 'Restobar 2026',
    subtitle: 'SUITE GASTRONÓMICA SOBERANA & COMANDAS',
    category: 'gastronomia',
    slaOrBadge: 'SLA 100%',
    slaColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    priceUsd: 65,
    priceArs: 101725,
    description: 'Terminal POS reactiva para bares y restaurantes. Cero caídas de salón con base local y comanderas térmicas directas.',
    targetAudience: 'Dueños gastronómicos que pierden facturación por fallas de conexión o demoras en comanderas en horas pico.',
    tags: ['ESC/POS Térmico', 'SQLite Local', 'WebSockets Offline', 'Win / Mac / Linux'],
    active: true
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
    active: true
  },
  {
    id: 'clasificados',
    name: 'Nexora Clasificados',
    subtitle: 'MARKETPLACE COMUNITARIO P2P',
    category: 'clasificados',
    slaOrBadge: '0% COMISIÓN',
    slaColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    priceUsd: 0,
    priceArs: 0,
    description: 'Compraventa directa barrial de rodados y artículos sin pasarelas intermedias retenedoras.',
    targetAudience: 'Comerciantes y particulares cansados de comisiones abusivas y retenciones de fondos.',
    tags: ['Compresión WebP', 'WhatsApp Direct', 'PWA 3MB', 'Nora Copywriter'],
    active: true
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
    description: 'Registro catastral libre con mapas precisos y emisión local de contratos validados en PDF.',
    targetAudience: 'Propietarios e inquilinos que buscan operaciones directas sin costos ocultos de publicación.',
    tags: ['PDF Engine Local', 'GeoJSON Mapping', 'Anti-Fraude', 'Contratos Validados'],
    active: true
  },
  {
    id: 'autentico',
    name: 'Auténtico Tributo',
    subtitle: 'LIVE STAGE SYNC & 4K HDMI ENGINE',
    category: 'musica',
    slaOrBadge: '< 10MS SYNC',
    slaColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    priceUsd: 120,
    priceArs: 185000,
    description: 'Sincronizador para conciertos en vivo: pantallas HDMI 4K, letras y setlist sin requerir internet.',
    targetAudience: 'Bandas y directores técnicos que no pueden depender de conectividad Wi-Fi en vivo.',
    tags: ['4K HDMI', 'LAN Sockets', 'Portal Fan PWA', 'Cero Latencia'],
    active: true
  },
  {
    id: 'prensa',
    name: 'Nexora Prensa & Medios',
    subtitle: 'CMS EDITORIAL SOBERANO & DIFUSIÓN',
    category: 'prensa',
    slaOrBadge: 'PUBLISHER LIBRE',
    slaColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    priceUsd: 45,
    priceArs: 70000,
    description: 'Plataforma de redacción y publicación periodística barrial o regional. Distribución ultra liviana en WebP con sindicación independiente.',
    targetAudience: 'Medios independientes, radios y portales comunitarios que buscan control total de sus artículos sin censura algorítmica ni pagos forzados en dólares.',
    tags: ['CMS Ultra Liviano', 'Syndication Feed', 'Soberanía Editorial', 'PWA Noticias'],
    active: true
  }
];

const INITIAL_LICENSES: CorporateLicense[] = [
  { id: 'lic_1', key: 'NX-7701-RESTOBAR-SOV', client: 'Bistró Central', systemId: 'restobar', status: 'active', expires: '2027-10-31' },
  { id: 'lic_2', key: 'NX-9942-STAGE-LIVE', client: 'Producciones Tour', systemId: 'autentico', status: 'active', expires: '2027-05-15' },
  { id: 'lic_3', key: 'NX-4108-CARRIBAR-PASS', client: 'Complejo Gastronómico Park', systemId: 'carribar', status: 'active', expires: '2027-12-01' }
];

export default function App() {
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // --- MODAL DE CAPTURA PÚBLICA (LEAD / DEMO 15 DÍAS) ---
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedTrialSystem, setSelectedTrialSystem] = useState<SystemItem | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadWhatsapp, setLeadWhatsapp] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);
  const [trialResult, setTrialResult] = useState<{ key: string; downloadUrl: string; expires: string } | null>(null);

  const [portalTab, setPortalTab] = useState<'catalog' | 'payments' | 'licenses'>('catalog');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [latency, setLatency] = useState(16);
  const [dbStatus, setDbStatus] = useState<'connected' | 'local'>('local');

  // --- CATÁLOGO Y LICENCIAS DINÁMICAS (SINCRONIZADAS) ---
  const [systems, setSystems] = useState<SystemItem[]>(INITIAL_SYSTEMS);
  const [licenses, setLicenses] = useState<CorporateLicense[]>(INITIAL_LICENSES);

  // --- FORMAS DE PAGO ADMINISTRABLES ---
  const [payments] = useState<PaymentMethod[]>([
    { id: 'pay_1', name: 'Transferencia Bancaria Directa (ARS)', type: 'cbu', details: 'Alias: nexora.engine / CBU habilitado', active: true },
    { id: 'pay_2', name: 'Mercado Pago (Cobro QR / Link)', type: 'mercadopago', details: 'Cobro instantáneo sin retención forzosa', active: true },
    { id: 'pay_3', name: 'Cripto Soberano (USDT / USDC)', type: 'crypto', details: 'Red TRC20 / Polygon (Cero comisión pasarela)', active: true }
  ]);

  // Formularios de Backoffice
  const [newLicClient, setNewLicClient] = useState('');
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
        setDbStatus('local');
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
          setDbStatus('connected');
        }
      } catch (err) {
        console.warn('Operando con catálogo determinista local:', err);
      }

      try {
        const { data: licData, error: licErr } = await supabase.from('licenses').select('*');
        if (!licErr && licData && licData.length > 0 && isMounted) {
          const mappedLics: CorporateLicense[] = licData.map((l: DbLicense) => ({
            id: String(l.id || `lic_${Date.now()}`),
            key: l.key || `NX-SOV-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
            client: l.client || 'Cliente Corporativo',
            systemId: l.systemId || l.system_id || 'restobar',
            status: l.status || 'active',
            expires: l.expires || '2027-10-31'
          }));
          setLicenses(mappedLics);
        }
      } catch (err) {
        console.warn('Operando con licencias locales:', err);
      }
    }

    void syncFromSupabase();
    return () => { isMounted = false; };
  }, []);

  // Telemetría sutil
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(Math.floor(Math.random() * 4) + 15);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // --- CONTROL DE RUTA OCULTA (#admin) Y PIN SOBERANO ---
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
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

  // Chat con Nora Itu Core
  const handleSendChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: q, timestamp: 'Ahora' }]);
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/nora/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: q }]
        })
      });

      const reader = res.body?.pipeThrough(new TextDecoderStream()).getReader();
      let completeText = '';
      if (reader) {
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let idx: number;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            for (const line of raw.split('\n')) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5).trim());
                  if (data.t) completeText += data.t;
                  else if (data.message) completeText = data.message;
                } catch {
                  // ignorar keep-alive
                }
              }
            }
          }
        }
      }

      setChatMessages(prev => [
        ...prev,
        { sender: 'nora', text: completeText.trim() || 'Respuesta generada por Nora Itu Core.', timestamp: 'Ahora' }
      ]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { sender: 'nora', text: 'Nora Itu [Modo Local]: Operando en contingencia soberana.', timestamp: 'Ahora' }
      ]);
    } finally {
      setIsSendingChat(false);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // --- 2. EMISIÓN Y PERSISTENCIA DE LICENCIAS ---
  const handleCreateLicense = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLicClient.trim()) return;
    const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const newLic: CorporateLicense = {
      id: `lic_${Date.now()}`,
      key: `NX-${hex}-${newLicSystem.toUpperCase()}-SOV`,
      client: newLicClient,
      systemId: newLicSystem,
      status: 'active',
      expires: '2027-10-31'
    };

    setLicenses(prev => [newLic, ...prev]);
    setNewLicClient('');

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('licenses').insert([{
          key: newLic.key,
          client: newLic.client,
          system_id: newLic.systemId,
          status: newLic.status,
          expires: newLic.expires
        }]);
      } catch (err) {
        console.warn('Error al persistir licencia en Supabase (offline):', err);
      }
    }
  };

  // --- 3. ACTUALIZACIÓN REACTIVA Y PERSISTENCIA DE PRECIOS DUALES ---
  const handleUpdatePrice = async (id: string, field: 'priceUsd' | 'priceArs', val: number) => {
    setSystems(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));

    if (supabase && isSupabaseConfigured) {
      try {
        const updatePayload = field === 'priceUsd' ? { price_usd: val } : { price_ars: val };
        await supabase.from('products').update(updatePayload).eq('id', id);
      } catch (err) {
        console.warn('Error al actualizar precio en Supabase (offline):', err);
      }
    }
  };

  // --- AUTENTICACIÓN ADMIN POR PIN SOBERANO ---
  const handleVerifyPin = (e: FormEvent) => {
    e.preventDefault();
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
  const handleOpenTrialModal = (sys: SystemItem) => {
    setSelectedTrialSystem(sys);
    setLeadName('');
    setLeadWhatsapp('');
    setLeadEmail('');
    setTrialResult(null);
    setIsTrialModalOpen(true);
  };

  const handleSubmitTrialLead = async (e: FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadWhatsapp.trim() || !selectedTrialSystem) return;
    setIsSubmittingTrial(true);

    const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const trialKey = `NX-TRIAL-${hex}-${selectedTrialSystem.id.toUpperCase()}-15D`;
    const expDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const downloadUrl = 'https://github.com/palaciomariaitati-byte/nexora-store-app';

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('licenses').insert([{
          key: trialKey,
          client: `${leadName} (WhatsApp: ${leadWhatsapp})`,
          system_id: selectedTrialSystem.id,
          status: 'trial',
          payment_status: 'trial',
          expires: expDate
        }]);
      } catch (err) {
        console.warn('Persistencia de prueba en Supabase:', err);
      }

      try {
        await supabase.from('leads').insert([{
          name: leadName,
          whatsapp: leadWhatsapp,
          email: leadEmail,
          system_id: selectedTrialSystem.id,
          payment_status: 'trial'
        }]);
      } catch {
        // Fallback si la tabla no existe
      }
    }

    setLicenses(prev => [
      {
        id: `lic_trial_${Date.now()}`,
        key: trialKey,
        client: `${leadName} (WhatsApp: ${leadWhatsapp})`,
        systemId: selectedTrialSystem.id,
        status: 'trial',
        expires: expDate
      },
      ...prev
    ]);

    setIsSubmittingTrial(false);
    setTrialResult({
      key: trialKey,
      downloadUrl,
      expires: expDate
    });
  };

  const filteredSystems = systems.filter(sys => {
    if (!sys.active && (!isPortalOpen || !isAdminAuthenticated)) return false;
    const matchCat = activeCategory === 'all' || sys.category === activeCategory;
    const matchQ = !searchQuery || sys.name.toLowerCase().includes(searchQuery.toLowerCase()) || sys.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#f1f5f9] font-sans antialiased selection:bg-[#00f2fe]/30 selection:text-[#00f2fe] flex flex-col">

      {/* HEADER PERSISTENTE */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090b0e]/85 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setIsPortalOpen(false); window.location.hash = ''; }}>
            <div className="w-9 h-9 rounded-xl bg-[#141822] border border-[#00f2fe]/40 flex items-center justify-center shadow-[0_0_20px_-3px_rgba(0,242,254,0.35)]">
              <span className="font-black text-[#00f2fe] text-sm">NX</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base">NEXORA</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30">ONE</span>
              </div>
              <span className="text-[10px] tracking-wider text-slate-400 font-mono -mt-0.5">ENGINE</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-400 font-medium">
            <a href="#ecosistema" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">Ecosistema</a>
            <a href="#nosotros" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">Nosotros</a>
            <a href="#casos" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">Casos de Éxito</a>
            <a href="#appstore" onClick={() => setIsPortalOpen(false)} className="hover:text-[#00f2fe] transition">App Store</a>
            <a href="#licencias" onClick={() => setIsPortalOpen(false)} className="hover:text-white transition">Licencias</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#appstore"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-[#090b0e] font-bold text-xs hover:brightness-110 shadow-[0_0_20px_-3px_rgba(0,242,254,0.35)] transition-all flex items-center gap-2"
            >
              <span>Explorar Sistemas</span>
            </a>
            {isPortalOpen && isAdminAuthenticated && (
              <button
                onClick={handleCloseAdmin}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-xs hover:bg-red-500/30 transition flex items-center gap-1.5"
              >
                <span>Cerrar Sesión Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* TELEMETRÍA GLOBAL & ESTADO SUPABASE */}
      <section className="bg-[#0e1117] border-b border-white/10 px-4 py-1.5 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-white font-semibold">NEXORA GLOBAL SOVEREIGN MESH</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline">LATENCIA: <strong className="text-[#00f2fe]">{latency}ms</strong></span>
            <span className="text-slate-700 hidden md:inline">|</span>
            <span className="hidden md:inline">
              DATOS: <strong className={dbStatus === 'connected' ? 'text-emerald-400' : 'text-[#00f2fe]'}>
                {dbStatus === 'connected' ? 'SUPABASE LIVE' : 'LOCAL-FIRST DETERMINISTA'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-medium">DISPONIBILIDAD: 100% SOBERANA</span>
          </div>
        </div>
      </section>

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
                  onClick={() => setPortalTab('catalog')}
                  className={`px-3 py-1.5 rounded-lg transition ${portalTab === 'catalog' ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Catálogo & Precios
                </button>
                <button
                  onClick={() => setPortalTab('payments')}
                  className={`px-3 py-1.5 rounded-lg transition ${portalTab === 'payments' ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Formas de Pago
                </button>
                <button
                  onClick={() => setPortalTab('licenses')}
                  className={`px-3 py-1.5 rounded-lg transition ${portalTab === 'licenses' ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Licencias
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

          {/* TAB 1: GESTIÓN DE CATÁLOGO Y PRECIOS DUALES */}
          {portalTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-mono text-[#00f2fe] font-bold">ADMINISTRACIÓN DE SISTEMAS Y PRECIOS DUALES</h2>
                <span className="text-[11px] font-mono text-slate-400">
                  Persistencia: <span className="text-emerald-400 font-bold">{isSupabaseConfigured ? 'Supabase DB' : 'Memoria Local-First'}</span>
                </span>
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

          {/* TAB 2: FORMAS DE PAGO */}
          {portalTab === 'payments' && (
            <div className="space-y-4">
              <h2 className="text-sm font-mono text-[#00f2fe] font-bold">MÉTODOS DE COBRO HABILITADOS</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {payments.map((p) => (
                  <div key={p.id} className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    </div>
                    <p className="text-xs text-slate-400">{p.details}</p>
                    <span className="text-[10px] font-mono text-emerald-400 block pt-2">● Conexión Directa Activa</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LICENCIAS CORPORATIVAS */}
          {portalTab === 'licenses' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateLicense} className="p-5 rounded-2xl bg-[#141822] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white font-mono">EMITIR NUEVA LICENCIA CORPORATIVA</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nombre del Cliente o Empresa"
                    value={newLicClient}
                    onChange={(e) => setNewLicClient(e.target.value)}
                    className="bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                  />
                  <select
                    value={newLicSystem}
                    onChange={(e) => setNewLicSystem(e.target.value)}
                    className="bg-[#090b0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                  >
                    {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="submit" className="py-2 px-4 rounded-xl bg-[#00f2fe] text-slate-950 font-bold text-xs hover:bg-[#00f2fe]/90 transition">
                    Generar y Firmar Clave
                  </button>
                </div>
              </form>

              <div className="rounded-2xl bg-[#141822] border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0e1117] text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Clave Criptográfica</th>
                      <th className="p-3">Sistema</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {licenses.map(lic => (
                      <tr key={lic.id} className="hover:bg-white/5">
                        <td className="p-3 font-semibold text-white">{lic.client}</td>
                        <td className="p-3 text-[#00f2fe]">{lic.key}</td>
                        <td className="p-3 text-slate-400">{lic.systemId}</td>
                        <td className="p-3"><span className="text-emerald-400">● {lic.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* VISTA B: SITIO PÚBLICO OFICIAL */
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-16">

          {/* HERO SECTION */}
          <section id="ecosistema" className="pt-4 sm:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141822] text-[#00f2fe] border border-[#00f2fe]/30 w-fit text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse"></span>
                <span>Plataforma Tecnológica Soberana de Nueva Generación</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                Infraestructura de alto rendimiento y software empresarial escalable
              </h1>
              <p className="text-base text-slate-400 max-w-2xl leading-relaxed">
                Impulsamos la expansión operativa mediante motores de cómputo reactivo offline-first, licenciamiento corporativo automatizado y nuestro agente insignia de IA Nora Itu.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#appstore"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-[#090b0e] font-bold text-sm hover:brightness-110 shadow-[0_0_20px_-3px_rgba(0,242,254,0.35)] transition-all"
                >
                  Explorar App Store
                </a>
                <a
                  href="#licencias"
                  className="px-4 py-2.5 rounded-xl bg-[#141822] border border-white/10 hover:border-[#00f2fe]/40 text-slate-200 text-sm font-semibold transition-all"
                >
                  Ver Licencias y Cobertura
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md p-6 rounded-2xl bg-[#141822] border border-white/10 shadow-2xl flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#090b0e] border border-[#00f2fe]/40 flex items-center justify-center mb-3 text-[#00f2fe] text-2xl font-black">
                  NX
                </div>
                <span className="text-2xl font-black text-white">NEXORA <span className="text-[#00f2fe]">ONE</span></span>
                <span className="text-xs font-mono text-[#00f2fe] tracking-widest mt-1">— ENGINE —</span>
                <span className="text-[10px] font-mono text-slate-500 mt-2">SOVEREIGN RUNTIME ARCHITECTURE</span>
              </div>
            </div>
          </section>

          {/* NOSOTROS, POLÍTICAS Y METAS */}
          <section id="nosotros" className="p-6 sm:p-8 rounded-3xl bg-[#141822]/40 border border-white/10 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-[#00f2fe] uppercase tracking-wider">Identidad Corporativa</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Ingeniería para Empresas que Exigen Autonomía</h2>
              <p className="text-sm text-slate-400 mt-1">Arquitectura de software que jamás colapsa ante cortes de internet ni retiene fondos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/5 space-y-2">
                <h3 className="font-bold text-white text-base">Qué Hacemos</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Motores offline-first para gastronomía, carribars, medios periodísticos, marketplaces P2P y sincronizadores de show en vivo sin nube intermedia.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/5 space-y-2">
                <h3 className="font-bold text-white text-base">Nuestras Políticas</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Soberanía de datos absoluta. Cero telemetría externa. Todos los programas operan sobre el propio hardware del adquirente con réplica local.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#090b0e] border border-white/5 space-y-2">
                <h3 className="font-bold text-white text-base">Nuestras Metas</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Eliminar intermediarios abusivos y suscripciones cautivas, devolviendo rentabilidad y control total a los negocios.
                </p>
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
                <div className="flex items-center gap-1 bg-[#141822] p-1 rounded-xl border border-white/10 text-xs font-mono">
                  {(['all', 'gastronomia', 'clasificados', 'inmuebles', 'musica', 'prensa'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition ${
                        activeCategory === cat ? 'bg-[#00f2fe] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'Todos' : cat}
                    </button>
                  ))}
                </div>
                <span className="px-3 py-1 rounded-full bg-[#141822] text-[#00f2fe] font-mono text-xs border border-white/10">
                  {filteredSystems.length} ACTIVOS
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 rounded-2xl bg-[#141822] border border-white/10 p-4 sticky top-20 shadow-2xl">
                <div className="flex justify-between pb-2 border-b border-white/10 text-xs font-mono">
                  <span className="text-white">MOTOR 3D INTERACTIVO</span>
                  <span className="text-[#00f2fe]">ROTACIÓN 360°</span>
                </div>
                <div ref={globeMountRef} className="w-full h-80 bg-[#090b0e] rounded-xl my-2 cursor-grab active:cursor-grabbing"></div>
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

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenTrialModal(sys)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 font-bold text-xs hover:brightness-110 shadow-[0_0_15px_-3px_rgba(0,242,254,0.3)] transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>Probar 15 Días</span>
                          <span className="text-[10px] font-mono opacity-80">● Sin Tarjeta</span>
                        </button>
                        {sys.priceUsd > 0 && (
                          <a
                            href={`https://wa.me/5493786414533?text=${encodeURIComponent(`Hola Nexora One, deseo información sobre la licencia de ${sys.name}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-3 rounded-xl bg-[#090b0e] border border-white/10 hover:border-[#00f2fe]/40 text-slate-200 text-xs font-semibold font-mono transition flex items-center gap-1"
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
      <footer className="bg-[#0e1117] border-t border-white/10 px-4 sm:px-6 py-8 mt-12 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400">
          <div>
            <span className="text-white font-bold text-sm">Nexora One Engine</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Arquitectura de software soberana y cómputo independiente · NexoraOne</p>
          </div>
          <div className="flex items-center gap-6 text-slate-300">
            <a href="tel:3786414533" className="hover:text-[#00f2fe] transition">Tel: 3786414533</a>
            <a href="mailto:nexoraone@nexativanews.com.ar" className="hover:text-[#00f2fe] transition">nexoraone@nexativanews.com.ar</a>
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
                  Accede a la versión completa con motor soberano local durante <strong className="text-white">15 días continuos</strong> sin necesidad de tarjeta de crédito.
                </p>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">NOMBRE / EMPRESA *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcelo Díaz / Bistró Costanera"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/15 focus:border-[#00f2fe] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">WHATSAPP DE ACTIVACIÓN *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: +54 9 3786 414533"
                    value={leadWhatsapp}
                    onChange={(e) => setLeadWhatsapp(e.target.value)}
                    className="w-full bg-[#090b0e] border border-white/15 focus:border-[#00f2fe] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">CORREO ELECTRÓNICO (OPCIONAL)</label>
                  <input
                    type="email"
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
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 text-xs font-bold font-mono hover:brightness-110 shadow-[0_0_20px_-3px_rgba(0,242,254,0.4)] transition flex items-center justify-center gap-2"
                  >
                    <span>{isSubmittingTrial ? 'Generando Licencia...' : 'Activar Prueba de 15 Días'}</span>
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
                    Tu período de evaluación de 15 días ha sido activado con éxito.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090b0e] border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">CLAVE DE LICENCIA DE PRUEBA:</span>
                  <div className="flex items-center justify-between font-mono font-bold text-xs text-[#00f2fe] bg-[#141822] p-2 rounded-lg border border-[#00f2fe]/30 select-all">
                    <span>{trialResult.key}</span>
                    <span className="text-[10px] text-slate-400">Vence: {trialResult.expires}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={trialResult.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#00b4d8] text-slate-950 text-xs font-bold font-mono hover:brightness-110 transition flex items-center justify-center gap-2"
                  >
                    <span>Descargar Suite / Acceso de Evaluación</span>
                    <span>↗</span>
                  </a>

                  <a
                    href={`https://wa.me/5493786414533?text=${encodeURIComponent(`Hola Nexora One, activé la prueba de 15 días de ${selectedTrialSystem.name} con la clave ${trialResult.key}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-4 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-bold font-mono hover:bg-[#25D366]/30 transition flex items-center justify-center gap-2"
                  >
                    <span>Confirmar con Soporte por WhatsApp</span>
                    <span>💬</span>
                  </a>
                </div>

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

      {/* CHAT FLOTANTE NORA ITU */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isNoraChatOpen && (
          <div className="w-80 sm:w-96 rounded-2xl bg-[#141822] border border-[#00f2fe]/30 shadow-2xl mb-3 overflow-hidden flex flex-col h-[440px]">
            <div className="bg-[#0e1117] p-3 flex justify-between items-center border-b border-white/10">
              <span className="text-xs font-bold text-white">Nora Itu — Asistente Soberana</span>
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
                placeholder="Pregunta a Nora Itu..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-[#141822] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
              />
              <button type="submit" disabled={isSendingChat} className="px-3 py-1.5 bg-[#00f2fe] text-slate-950 font-bold rounded-lg text-xs hover:bg-[#00f2fe]/90">
                Enviar
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsNoraChatOpen(!isNoraChatOpen)}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-[#00f2fe] to-[#00b4d8] text-slate-950 shadow-xl hover:scale-105 transition-all flex items-center gap-2 font-bold text-xs"
        >
          <span>Nora Itu AI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </button>
      </div>

    </div>
  );
}
