import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Search, ShieldCheck, ChevronDown, Radio 
} from 'lucide-react';

export interface SystemItem {
  id: string;
  name: string;
  version: string;
  subtitle: string;
  category: 'gastro' | 'p2p' | 'realestate' | 'music';
  priceUsd: string;
  priceArs: string;
  tagline: string;
  solutionText: string;
  tags: string[];
  primaryCta: string;
  primaryCtaType: 'amber' | 'emerald' | 'cyan';
  secondaryCta?: string;
  demoUrl?: string;
}

const SYSTEMS_DATA: SystemItem[] = [
  {
    id: 'restobar-2026',
    name: 'Restobar 2026',
    version: 'v4.8.2',
    subtitle: 'Suite Gastronómica Soberana',
    category: 'gastro',
    priceUsd: '$65 USD/mes',
    priceArs: '~$101.725 ARS',
    tagline: '¿A QUIÉN LE RESUELVE EL DÍA?',
    solutionText: 'Control absoluto de mesas, comandas a cocina e inventario en tiempo real. Elimina caídas de conexión en horas pico para restaurantes y bares de alta rotación.',
    tags: ['● Offline-First Nativo', 'Térmica Directa ESC/POS', 'Win / Mac / Linux'],
    primaryCta: 'Probar 15 Días',
    primaryCtaType: 'amber',
    secondaryCta: 'Ver Demo'
  },
  {
    id: 'nexora-clasificados',
    name: 'Nexora Clasificados',
    version: 'v1.4',
    subtitle: 'Mercado Comunitario P2P',
    category: 'p2p',
    priceUsd: '100% GRATIS',
    priceArs: 'Sin comisión',
    tagline: 'ELIMINA INTERMEDIARIOS',
    solutionText: 'Compra-venta barrial de vehículos y artículos con compresión WebP automática. El comprador contacta al WhatsApp del dueño en 1 tap sin pasarelas retenedoras.',
    tags: ['● PWA Ultra Liviana (3MB)', 'Nora IA Copywriter', 'WhatsApp Direct API'],
    primaryCta: 'Lanzar Web App Oficial',
    primaryCtaType: 'emerald'
  },
  {
    id: 'inmuebles-verificados',
    name: 'Inmuebles Verificados',
    version: 'v3.1',
    subtitle: 'Plataforma Inmobiliaria Libre',
    category: 'realestate',
    priceUsd: '100% GRATIS',
    priceArs: 'Padrón Abierto',
    tagline: 'SEGURIDAD Y RAPIDEZ',
    solutionText: 'Publicación y búsqueda directa de alquileres y compraventas. Filtro pericial contra estafas y mapa catastral en tiempo real para inquilinos y propietarios honestos.',
    tags: ['● Geolocalización Libre', 'Filtro Anti-Fraude', 'Exportable PDF/Contrato'],
    primaryCta: 'Explorar Portal Catastral',
    primaryCtaType: 'cyan'
  },
  {
    id: 'autentico-tributo',
    name: 'Auténtico Tributo',
    version: 'v2.0 Web',
    subtitle: 'Live Stage Sync Engine',
    category: 'music',
    priceUsd: 'SOVEREIGN LIVE',
    priceArs: 'Baja latencia',
    tagline: 'PARA ARTISTAS Y TÉCNICOS',
    solutionText: 'Gestión integral de shows en vivo con setlist interactivo para fans y sincronización visual para pantalla gigante y teleprompters en tiempo real.',
    tags: ['● Live Sync WebSockets', 'Portal Fan PWA', 'Stage Screen HDMI 4K'],
    primaryCta: 'Acceso Oficial a Escenario',
    primaryCtaType: 'amber'
  }
];

export function SovereignStore() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [latency, setLatency] = useState<number>(17);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'restobar-2026': true,
    'nexora-clasificados': true,
    'inmuebles-verificados': true,
    'autentico-tributo': true
  });

  const globeContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fluctuación de latencia
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(Math.floor(Math.random() * 4) + 16);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Atajo ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Montaje Three.js Globe
  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) return;

    const getW = () => container.clientWidth || 360;
    const getH = () => container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, getW() / getH(), 0.1, 1000);
    camera.position.set(0, 0.2, 4.3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(getW(), getH());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0x1a2634, 1.2));
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(6, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.PointLight(0x00f2fe, 1.8, 15);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    const masterRig = new THREE.Group();
    scene.add(masterRig);

    // Canvas Procedural Texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
      oceanGrad.addColorStop(0, '#04101e');
      oceanGrad.addColorStop(0.2, '#061d38');
      oceanGrad.addColorStop(0.5, '#082548');
      oceanGrad.addColorStop(0.8, '#061a33');
      oceanGrad.addColorStop(1, '#030d1a');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, 2048, 1024);

      const drawLand = (pts: number[][], color: string, stroke: string) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const xc = (pts[i][0] + pts[(i + 1) % pts.length][0]) / 2;
          const yc = (pts[i][1] + pts[(i + 1) % pts.length][1]) / 2;
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      drawLand([[280, 180], [360, 140], [480, 160], [540, 220], [510, 320], [440, 360], [390, 440], [350, 420], [310, 340], [240, 260]], '#274b35', '#1d3e2a');
      drawLand([[420, 470], [500, 520], [560, 580], [530, 680], [490, 780], [440, 840], [420, 740], [390, 610], [395, 520]], '#225232', '#1b4027');
      drawLand([[950, 160], [1080, 140], [1280, 150], [1500, 190], [1650, 260], [1700, 360], [1620, 460], [1480, 450], [1360, 420], [1220, 440], [1120, 380], [1010, 340], [930, 260]], '#3a5836', '#2d4529');
      drawLand([[980, 380], [1120, 390], [1200, 480], [1180, 620], [1110, 750], [1030, 780], [960, 660], [920, 540], [940, 430]], '#4b4b2c', '#38381e');
      drawLand([[1540, 640], [1660, 620], [1720, 700], [1680, 800], [1580, 810], [1510, 730]], '#5c4d32', '#453924');

      // Polos
      ctx.fillStyle = 'rgba(235, 245, 255, 0.88)';
      ctx.beginPath();
      ctx.ellipse(1024, 40, 900, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1024, 990, 950, 65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Luces urbanas
      ctx.fillStyle = '#ffdf78';
      for (let i = 0; i < 350; i++) {
        const lx = Math.random() * 2048;
        const ly = 180 + Math.random() * 660;
        ctx.beginPath();
        ctx.arc(lx, ly, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Grilla Cartográfica
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y <= 1024; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke();
      }
      for (let x = 0; x <= 2048; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke();
      }

      // Branding Estampado
      const stampLogo = (cx: number, cy: number) => {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 64px "Geist", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 242, 254, 0.8)';
        ctx.shadowBlur = 18;
        ctx.fillText('NEXORA ONE', cx, cy - 15);

        ctx.font = '700 22px monospace';
        if ('letterSpacing' in ctx) {
          (ctx as unknown as { letterSpacing: string }).letterSpacing = '6px';
        }
        ctx.fillStyle = '#00f2fe';
        ctx.fillText('—  E N G I N E  —', cx, cy + 34);
        ctx.restore();
      };
      stampLogo(580, 520);
      stampLogo(1600, 520);
    }

    const earthTexture = new THREE.CanvasTexture(canvas);
    earthTexture.wrapS = THREE.RepeatWrapping;

    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 64, 64),
      new THREE.MeshPhongMaterial({ map: earthTexture, specular: 0x224466, shininess: 28 })
    );
    masterRig.add(earthMesh);

    // Órbita interactiva
    const orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.015, 16, 120),
      new THREE.MeshPhongMaterial({ color: 0x00f2fe, emissive: 0x0088cc })
    );
    orbitRing.rotation.x = Math.PI / 2.5;
    masterRig.add(orbitRing);

    let targetRotX = 0.15;
    let targetRotY = 0;
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      targetRotY += (e.clientX - prevMouse.x) * 0.008;
      targetRotX += (e.clientY - prevMouse.y) * 0.008;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => { isDragging = false; };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      earthMesh.rotation.y += 0.002;
      orbitRing.rotation.z = time * 0.15;

      masterRig.rotation.y += (targetRotY - masterRig.rotation.y) * 0.08;
      masterRig.rotation.x += (targetRotX - masterRig.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = getW();
      const h = getH();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, []);

  const filteredSystems = SYSTEMS_DATA.filter((s) => {
    const matchesCat = activeCategory === 'all' || s.category === activeCategory;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* HUD Telemetría */}
      <div className="flex items-center justify-between text-xs font-mono bg-slate-900/80 border border-slate-800/80 px-4 py-2 rounded-xl backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white">NEXORA SOVEREIGN RUNTIME</span>
          <span className="text-slate-600">|</span>
          <span>LATENCIA: <strong className="text-cyan-400">{latency}ms</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5"/>
          <span>ZERO-THIRD-PARTY AUDITED</span>
        </div>
      </div>

      {/* Hero 3D Globe */}
      <section className="relative rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                NEXORA ONE ENGINE
              </span>
              <span className="text-xs font-mono text-slate-400">RUNTIME SOBERANO</span>
            </div>
            <h1 className="text-xl font-black text-white mt-1">Mundo Digital Soberano NEXORA</h1>
          </div>
          <div className="text-xs font-mono text-cyan-400 flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
            <Radio className="w-3.5 h-3.5 animate-pulse"/>
            <span>GEORREFERENCIA GLOBAL SOBERANA</span>
          </div>
        </div>

        <div className="relative w-full h-[320px] sm:h-[420px] my-3 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing bg-black/60 border border-white/5">
          <div ref={globeContainerRef} className="w-full h-full" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-[11px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>Arrastra para rotar el planeta en 360°</span>
            <span className="text-cyan-400 hidden sm:inline">INERCIA CUÁNTICA ACTIVA</span>
          </div>
        </div>
      </section>

      {/* Buscador & Categorías */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">Catálogo Soberano</h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {filteredSystems.length} ACTIVOS DISPONIBLES
              </span>
            </div>
            <p className="text-sm text-slate-400">Software productivo independiente sin dependencias en la nube.</p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar sistema o stack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-500 font-mono absolute right-2.5 top-2.5 border border-slate-800 px-1 rounded">⌘K</span>
          </div>
        </div>

        {/* Botones de Filtro */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'gastro', label: 'Gastronomía & Bares' },
            { id: 'p2p', label: 'Clasificados & Autos' },
            { id: 'realestate', label: 'Inmuebles & Catastro' },
            { id: 'music', label: 'Shows & Eventos' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id 
                  ? 'bg-amber-500 text-slate-950 font-bold' 
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/30'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid de Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSystems.map((item) => (
            <article 
              key={item.id} 
              className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col justify-between hover:border-cyan-500/40 hover:-translate-y-0.5 transition-all shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base">{item.name}</h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{item.version}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{item.subtitle}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                      {item.priceUsd}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{item.priceArs}</span>
                  </div>
                </div>

                {/* Acordeón */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <button 
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full flex items-center justify-between text-left text-xs font-mono text-amber-400 font-bold"
                  >
                    <span>{item.tagline}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions[item.id] ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                  {openAccordions[item.id] && (
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {item.solutionText}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3 text-[10px] font-mono">
                  {item.tags.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                {item.secondaryCta && (
                  <button className="flex-1 py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-cyan-400 transition">
                    {item.secondaryCta}
                  </button>
                )}
                <button className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs text-slate-950 transition ${
                  item.primaryCtaType === 'amber' ? 'bg-amber-500 hover:bg-amber-400' :
                  item.primaryCtaType === 'emerald' ? 'bg-emerald-500 hover:bg-emerald-400' :
                  'bg-cyan-500 hover:bg-cyan-400'
                }`}>
                  {item.primaryCta}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
