/**
 * app.js - Cliente Interactivo Tiempo Real (Mostrador Kiosco + Celular Remoto del Dueño)
 * Tren Agéntico Nexora One Engine ("By Nora") x IberáSoft POS
 */

let KIOSCO_STATE = null;
let DRAFT_EDITS = {}; // Guarda cambios temporales de checkboxes [Llegó / No vino] y % antes de aprobar
let WEBCAM_STREAM = null;
let MODO_DUENIO = new URLSearchParams(window.location.search).get('rol') === 'duenio';

const socket = io();

socket.on('kiosco:state', (payload) => {
  if (payload && payload.state) {
    KIOSCO_STATE = payload.state;
    renderAll();
  }
});

socket.on('nora:ota-updated', (payload) => {
  mostrarNotificacionOTA(payload);
});

// =========================================================================
// REGISTRO DE SERVICE WORKER & INSTALADOR PWA (APP NATIVA EN CELULAR)
// =========================================================================
let deferredPwaPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('✓ ServiceWorker Nora PWA activo:', reg.scope))
      .catch((err) => console.warn('ServiceWorker error:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.display = 'flex';
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const btnInstall = document.getElementById('btn-pwa-install');
  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      const banner = document.getElementById('pwa-install-banner');
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const choice = await deferredPwaPrompt.userChoice;
        console.log('PWA install outcome:', choice?.outcome);
        deferredPwaPrompt = null;
        if (banner) banner.style.display = 'none';
      }
    });
  }

  aplicarEstiloRol();
  if (new URLSearchParams(window.location.search).get('soporte') === 'nexora') {
    const devPanel = document.getElementById('nexora-dev-support-panel');
    if (devPanel) devPanel.style.display = 'block';
  }
  cargarEstadoInicial();
});

async function cargarEstadoInicial() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    if (data.ok) {
      KIOSCO_STATE = data.state;
      renderAll();
    }
  } catch (e) {
    console.error('Error cargando estado inicial:', e);
  }
}

function aplicarEstiloRol() {
  const btn = document.getElementById('btn-switch-rol');
  if (MODO_DUENIO) {
    document.body.classList.add('modo-duenio');
    if (btn) btn.innerHTML = '🏪 Cambiar a Vista Mostrador Kiosco';
    const selOrigen = document.getElementById('select-origen-factura');
    if (selOrigen) selOrigen.value = 'CELULAR_DUENIO';
  } else {
    document.body.classList.remove('modo-duenio');
    if (btn) btn.innerHTML = '📱 Cambiar a Vista Celular Dueño';
  }
}

function toggleRolVista() {
  if (!MODO_DUENIO) {
    const pin = prompt('🔒 Ingresá el PIN Maestro del Dueño para ver Costos, Márgenes (%) y Contabilidad Privada:', '');
    if (pin !== '9999') {
      if (pin !== null) alert('PIN incorrecto. Los costos de compra y márgenes de ganancia son exclusivos del Dueño.');
      return;
    }
  }
  MODO_DUENIO = !MODO_DUENIO;
  aplicarEstiloRol();
  renderAll();
}

function cambiarTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
}

function fmtARS(num) {
  return '$' + Number(num || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ARS';
}

function redondearPrecio(precioBruto, multiplo = 50) {
  const n = Number(precioBruto) || 0;
  if (!multiplo || multiplo <= 1) return Math.round(n);
  return Math.ceil(n / multiplo) * multiplo;
}

/**
 * Sanitiza el texto antes de enviarlo al sintetizador de voz de Windows/Chrome
 * para que JAMÁS lea el símbolo "$" como "dólares", sino siempre como "pesos argentinos".
 */
function normalizarMonedaParaVozArgentina(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/\$\s*(\d[\d\.,]*)\s*(ARS|pesos\s*argentinos|pesos)?/gi, '$1 pesos ')
    .replace(/\b(d[óo]lares|usd|u\$s)\b/gi, 'pesos argentinos')
    .replace(/\bARS\b/g, 'pesos');
}

// =========================================================================
// MOTOR DE VOZ FEMENINA ARGENTINA CÁLIDA (NORA AI TTS)
// =========================================================================
let VOCES_DISPONIBLES_NORA = [];

function cargarVocesNora() {
  if ('speechSynthesis' in window) {
    VOCES_DISPONIBLES_NORA = window.speechSynthesis.getVoices() || [];
  }
}

if ('speechSynthesis' in window) {
  cargarVocesNora();
  window.speechSynthesis.onvoiceschanged = cargarVocesNora;
}

function obtenerMejorVozFemeninaEspanol() {
  if (!VOCES_DISPONIBLES_NORA || VOCES_DISPONIBLES_NORA.length === 0) {
    cargarVocesNora();
  }
  const voices = VOCES_DISPONIBLES_NORA || [];
  if (voices.length === 0) return null;

  // 1. Prioridad: Voces femeninas latinas / argentinas / españolas naturales
  const preferencias = [
    'sabina', 'helena', 'laura', 'paulina', 'francisca', 'victoria', 
    'monica', 'zira', 'es-ar', 'spanish argentina', 'google español', 'es-419', 'es-us', 'es-mx', 'es-es'
  ];
  const masculinas = ['david', 'raul', 'pablo', 'jorge', 'diego', 'carlos', 'male', 'hombre'];

  for (const p of preferencias) {
    const v = voices.find(vox => {
      const nom = (vox.name || '').toLowerCase();
      const lan = (vox.lang || '').toLowerCase();
      const esHombre = masculinas.some(m => nom.includes(m));
      return !esHombre && (nom.includes(p) || lan.includes(p));
    });
    if (v) return v;
  }

  // 2. Cualquier voz en español que no sea explícitamente masculina
  const fallbackFemenina = voices.find(vox => {
    const nom = (vox.name || '').toLowerCase();
    const lan = (vox.lang || '').toLowerCase();
    const esHombre = masculinas.some(m => nom.includes(m));
    return !esHombre && lan.startsWith('es');
  });
  if (fallbackFemenina) return fallbackFemenina;

  // 3. Cualquier voz en español
  return voices.find(vox => (vox.lang || '').toLowerCase().startsWith('es')) || null;
}

function hablarNora(texto) {
  const textoLimpioPantalla = String(texto || '').replace(/\b(d[óo]lares|usd)\b/gi, 'pesos ARS');
  const box = document.getElementById('nora-speech-text');
  if (box && textoLimpioPantalla) {
    box.textContent = `"${textoLimpioPantalla}"`;
  }

  if (!('speechSynthesis' in window) || !textoLimpioPantalla) return;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    // Pequeño timeout para no colisionar con el cancel() en Chromium
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const textoHablado = normalizarMonedaParaVozArgentina(textoLimpioPantalla);
        const u = new SpeechSynthesisUtterance(textoHablado);
        
        const bestVoice = obtenerMejorVozFemeninaEspanol();
        if (bestVoice) {
          u.voice = bestVoice;
          u.lang = bestVoice.lang || 'es-AR';
        } else {
          u.lang = 'es-AR';
        }

        u.rate = 1.02;
        u.pitch = 1.15; // Tono más dulce y femenino
        u.volume = 1.0;

        u.onerror = (err) => {
          console.warn('[Nora TTS Error]:', err);
        };

        window.speechSynthesis.speak(u);
      } catch (errInner) {
        console.warn('[Nora TTS] Error al reproducir:', errInner);
      }
    }, 60);
  } catch (e) {
    console.warn('[Nora TTS] SpeechSynthesis error:', e);
  }
}

function probarVozNoraManual() {
  const box = document.getElementById('nora-speech-text');
  const texto = box ? box.textContent.replace(/^"|"$/g, '') : 'Hola, soy Nora. Estoy conectada al sistema de IberáSoft y lista para ayudarte.';
  hablarNora(texto || 'Hola, soy Nora. El sistema está funcionando correctamente.');
}

// =========================================================================
// RENDERIZADO PRINCIPAL DE LAS 5 SECCIONES
// =========================================================================
function renderAll() {
  if (!KIOSCO_STATE) return;

  const {
    config,
    iberaStatus,
    turnoActivo,
    articulos,
    faltantes,
    facturas,
    notasCreditoPendientes,
    libroDiario,
    whatsappFeed,
    localIp,
    port
  } = KIOSCO_STATE;

  // 1. Cabecera y Pills
  const sub = document.getElementById('ibera-status-sub');
  if (sub && iberaStatus) {
    sub.textContent = `IberáSoft POS: ${iberaStatus.motorDetectado} • Sincronización Activa`;
  }

  const pillTurno = document.getElementById('pill-turno-operario');
  const pillCaja = document.getElementById('pill-caja-efectivo');
  if (turnoActivo) {
    pillTurno.textContent = `👤 Turno ${turnoActivo.turno_tipo}: ${turnoActivo.operario_nombre}`;
    pillTurno.className = 'pill pill-emerald';
    pillCaja.textContent = `💵 Efectivo Caja: ${fmtARS(turnoActivo.monto_esperado_efectivo)}`;
  } else {
    pillTurno.textContent = '🔒 Caja Cerrada (Sin Turno Activo)';
    pillTurno.className = 'pill pill-red';
    pillCaja.textContent = '💵 Caja: $0';
  }

  const pillFaltantes = document.getElementById('pill-faltantes-top');
  pillFaltantes.textContent = `🚨 Faltantes Mínimo: ${faltantes.length}`;

  // Badges de pestañas
  const borradores = facturas.filter((f) => f.estado === 'pendiente_aprobacion');
  const ncActivas = notasCreditoPendientes.filter((n) => n.estado === 'PENDIENTE_RECLAMO');
  document.getElementById('badge-facturas-pend').textContent = borradores.length;
  document.getElementById('badge-faltantes').textContent = faltantes.length;
  document.getElementById('badge-nc-pend').textContent = ncActivas.length;

  renderEstadoLicencia(KIOSCO_STATE.licencia);
  renderBorradoresFacturas(borradores, config);
  renderHistorialFacturas(facturas);
  renderStockYFaltantes(articulos, faltantes);
  renderCajaYTurnos();
  renderContabilidadYNotasCredito(notasCreditoPendientes, libroDiario);
  renderWhatsAppYConfig(whatsappFeed, config, localIp, port);
  renderCopilotManuals(KIOSCO_STATE.copilotManuals || []);
}

// =========================================================================
// 1. RENDER BORRADORES DE FACTURAS (SELECCIÓN DE MERCADERÍA QUE SÍ LLEGÓ)
// =========================================================================
function renderBorradoresFacturas(borradores, config) {
  const container = document.getElementById('contenedor-borradores-facturas');
  if (!container) return;

  if (borradores.length === 0) {
    container.innerHTML = '';
    return;
  }

  const multiplo = Number(config.redondeo_multiplo) || 50;

  container.innerHTML = borradores.map((fac) => {
    // Inicializar estado editable local si no existe
    if (!DRAFT_EDITS[fac.id]) {
      DRAFT_EDITS[fac.id] = {
        margenGlobal: fac.margen_aplicado_pct || 45,
        pagadoDesdeCaja: false,
        medioPago: 'CUENTA_CORRIENTE',
        items: JSON.parse(JSON.stringify(fac.items))
      };
    }

    const editState = DRAFT_EDITS[fac.id];
    let totalFacturado = 0;
    let totalRecibidoReal = 0;
    let totalFaltanteNC = 0;
    let countRecibidos = 0;
    let countFaltantes = 0;

    const filasHtml = editState.items.map((item, idx) => {
      const cantFac = Number(item.cantidad_facturada) || 0;
      const cantRec = item.recibido ? Number(item.cantidad_recibida) : 0;
      const costo = Number(item.costo_unitario) || 0;
      const margen = Number(item.margen_pct) || 40;
      const nuevoPrecio = redondearPrecio(costo * (1 + margen / 100), multiplo);
      item.nuevo_precio_venta = nuevoPrecio;

      const subFac = cantFac * costo;
      const subRec = cantRec * costo;
      const subFaltante = Math.max(0, cantFac - cantRec) * costo;

      totalFacturado += subFac;
      totalRecibidoReal += subRec;
      totalFaltanteNC += subFaltante;

      if (item.recibido && cantRec > 0) countRecibidos++;
      if (!item.recibido || cantRec < cantFac) countFaltantes++;

      return `
        <tr class="${!item.recibido || cantRec < cantFac ? 'row-unreceived' : ''}">
          <td>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:700;">
              <input
                type="checkbox"
                ${item.recibido ? 'checked' : ''}
                onchange="toggleItemRecibido('${fac.id}', ${idx}, this.checked)"
                style="width:18px; height:18px; accent-color:#10b981;"
              />
              ${item.recibido ? '<span style="color:#34d399;">✅ Llegó</span>' : '<span style="color:#f87171;">❌ No vino (NC)</span>'}
            </label>
          </td>
          <td>
            <strong>${item.nombre}</strong>
            <div style="font-size:0.74rem; color:#94a3b8;">
              ${item.articulo_id ? `🔗 IberáSoft ID: ${item.articulo_id}` : '🆕 Alta automática en IberáSoft'} • Rubro: ${item.rubro}
            </div>
          </td>
          <td><strong>${cantFac}</strong> ${item.unidad}</td>
          <td>
            <input
              type="number"
              min="0"
              max="${cantFac}"
              value="${cantRec}"
              ${!item.recibido ? 'disabled' : ''}
              style="width:75px; font-weight:700;"
              onchange="cambiarCantidadRecibida('${fac.id}', ${idx}, this.value)"
            />
          </td>
          <td>
            ${MODO_DUENIO ? `
              <input
                type="number"
                min="0"
                value="${costo}"
                style="width:95px;"
                onchange="cambiarCostoItem('${fac.id}', ${idx}, this.value)"
              />
            ` : `<span style="color:#64748b; font-size:0.78rem;">🔒 Privado Dueño</span>`}
          </td>
          <td>
            ${MODO_DUENIO ? `
              <div style="display:flex; align-items:center; gap:4px;">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value="${margen}"
                  style="width:68px;"
                  onchange="cambiarMargenItem('${fac.id}', ${idx}, this.value)"
                />
                <span>%</span>
              </div>
            ` : `<span style="color:#64748b; font-size:0.78rem;">🔒 Auto</span>`}
          </td>
          <td>
            <strong style="color:#fbbf24; font-size:0.95rem;">${fmtARS(nuevoPrecio)}</strong>
            <div style="font-size:0.72rem; color:#94a3b8;">Ant: ${fmtARS(item.precio_venta_anterior)}</div>
          </td>
          <td>
            ${item.recibido && cantRec > 0
              ? `<span style="color:#34d399; font-weight:700;">+${cantRec} al Stock (${fmtARS(subRec)})</span>`
              : `<span style="color:#f87171; font-weight:700;">Descartado Stock</span>`
            }
            ${subFaltante > 0
              ? `<div style="font-size:0.75rem; color:#fca5a5;">⚠️ Reclamar NC: ${fmtARS(subFaltante)}</div>`
              : ''
            }
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card" style="border: 2px solid #f59e0b; box-shadow: 0 0 25px rgba(245, 158, 11, 0.15);">
        <div class="card-header">
          <div>
            <span class="pill pill-amber" style="margin-bottom:4px;">⏳ PENDIENTE DE APROBACIÓN DEL OPERADOR / DUEÑO</span>
            <h2>🧾 ${fac.tipo_comprobante} Nº ${fac.numero_comprobante} — ${fac.proveedor}</h2>
            <p style="font-size:0.8rem; color:#94a3b8;">
              Capturada vía: <strong>${fac.origen}</strong> por <strong>${fac.operario_captura}</strong> • Fecha: ${fac.fecha_comprobante}
              ${fac.notas ? ` • Nota: <span style="color:#fbbf24;">${fac.notas}</span>` : ''}
            </p>
          </div>
          ${MODO_DUENIO ? `
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <label style="font-size:0.8rem; color:#cbd5e1;">Aplicar % Margen a toda la factura:</label>
              <input
                type="number"
                value="${editState.margenGlobal}"
                style="width:72px;"
                onchange="aplicarMargenGlobalBorrador('${fac.id}', this.value)"
              />
              <button class="btn btn-secondary" onclick="aplicarMargenGlobalBorrador('${fac.id}', ${editState.margenGlobal})">
                Aplicar %
              </button>
            </div>
          ` : `<span class="pill" style="color:#94a3b8;">🔒 Margen % Automático del Dueño</span>`}
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>¿Llegó al Local?</th>
                <th>Artículo Facturado</th>
                <th>Cant. Facturada</th>
                <th>Cant. Recibida Real</th>
                <th>Costo Unit. ($)</th>
                <th>% Ganancia</th>
                <th>Nuevo Precio Venta</th>
                <th>Impacto en Stock / Nota de Crédito</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
        </div>

        <!-- RESUMEN FINANCIERO Y BOTÓN DE APROBACIÓN -->
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid #334155; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
          <div style="display:flex; flex-wrap:wrap; gap:16px; font-size:0.88rem;">
            <div>📄 Total Facturado: <strong>${fmtARS(totalFacturado)}</strong></div>
            <div style="color:#34d399;">✅ Mercadería que Entra al Stock (${countRecibidos} ítems): <strong>${fmtARS(totalRecibidoReal)}</strong></div>
            <div style="color:#f87171;">⚠️ Mercadería NO Recibida (Reclamar Nota de Crédito): <strong>${fmtARS(totalFaltanteNC)}</strong></div>
          </div>

          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:12px;">
            <label style="font-size:0.82rem; display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input
                type="checkbox"
                ${editState.pagadoDesdeCaja ? 'checked' : ''}
                onchange="DRAFT_EDITS['${fac.id}'].pagadoDesdeCaja = this.checked"
              />
              Pagado en efectivo desde Caja Chica del Turno
            </label>
            <button class="btn btn-danger" onclick="eliminarFacturaUI('${fac.id}')">
              🗑️ Descartar Borrador
            </button>
            <button class="btn btn-success" onclick="confirmarYAprobarFactura('${fac.id}')">
              ✅ Aprobar Mercadería Recibida y Actualizar Stock + Precios en IberáSoft
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleItemRecibido(facturaId, idx, checked) {
  const edit = DRAFT_EDITS[facturaId];
  if (!edit) return;
  edit.items[idx].recibido = checked;
  edit.items[idx].cantidad_recibida = checked ? edit.items[idx].cantidad_facturada : 0;
  renderAll();
}

function cambiarCantidadRecibida(facturaId, idx, val) {
  const edit = DRAFT_EDITS[facturaId];
  if (!edit) return;
  const cant = Math.max(0, Number(val) || 0);
  edit.items[idx].cantidad_recibida = cant;
  edit.items[idx].recibido = cant > 0;
  renderAll();
}

function cambiarCostoItem(facturaId, idx, val) {
  const edit = DRAFT_EDITS[facturaId];
  if (!edit) return;
  edit.items[idx].costo_unitario = Math.max(0, Number(val) || 0);
  renderAll();
}

function cambiarMargenItem(facturaId, idx, val) {
  const edit = DRAFT_EDITS[facturaId];
  if (!edit) return;
  edit.items[idx].margen_pct = Math.max(0, Number(val) || 0);
  renderAll();
}

function aplicarMargenGlobalBorrador(facturaId, val) {
  const edit = DRAFT_EDITS[facturaId];
  if (!edit) return;
  const pct = Math.max(0, Number(val) || 0);
  edit.margenGlobal = pct;
  edit.items.forEach((i) => {
    i.margen_pct = pct;
  });
  renderAll();
}

async function confirmarYAprobarFactura(facturaId) {
  const edit = DRAFT_EDITS[facturaId];
  if (!edit) return;

  const turno = KIOSCO_STATE?.turnoActivo;
  const aprobador = MODO_DUENIO
    ? 'Dueño (Desde Celular Remoto)'
    : (turno ? `${turno.operario_nombre} (Operador Turno ${turno.turno_tipo})` : 'Operador Mostrador');

  try {
    const res = await fetch(`/api/facturas/${facturaId}/aprobar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemsModificados: edit.items,
        aprobadoPor: aprobador,
        pagadoDesdeCaja: edit.pagadoDesdeCaja,
        medioPago: edit.pagadoDesdeCaja ? 'EFECTIVO' : 'CUENTA_CORRIENTE'
      })
    });
    const data = await res.json();
    if (!data.ok) {
      alert('Error al aprobar factura: ' + data.error);
      return;
    }
    delete DRAFT_EDITS[facturaId];
    const msgVoz = data.notaCreditoCreada
      ? `Listo. Cargué al stock de IberáSoft solo los ${data.articulosActualizados.length} productos que llegaron y actualicé sus precios con el porcentaje. Además dejé asentado el reclamo de Nota de Crédito por ${fmtARS(data.notaCreditoCreada.monto_reclamo)} en el Libro Diario.`
      : `Perfecto. Se sumaron los ${data.articulosActualizados.length} productos al stock de IberáSoft, se actualizaron los precios con el margen y quedó registrado en el Libro Diario Contable.`;
    hablarNora(msgVoz);
  } catch (e) {
    alert('Error de red al aprobar factura: ' + e.message);
  }
}

function renderHistorialFacturas(facturas) {
  const tbody = document.getElementById('tabla-historial-facturas');
  if (!tbody) return;
  const procesadas = facturas.filter((f) => f.estado !== 'pendiente_aprobacion');
  if (procesadas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8;">Aún no hay facturas aprobadas en esta sesión.</td></tr>';
    return;
  }
  tbody.innerHTML = procesadas.map((f) => `
    <tr>
      <td>${f.fecha_comprobante}<div style="font-size:0.72rem; color:#94a3b8;">${f.id}</div></td>
      <td><strong>${f.proveedor}</strong></td>
      <td>${f.tipo_comprobante} ${f.numero_comprobante}</td>
      <td>${f.origen}<div style="font-size:0.72rem; color:#94a3b8;">Aprobó: ${f.aprobado_por || f.operario_captura}</div></td>
      <td>${fmtARS(f.total_facturado)}</td>
      <td style="color:#34d399; font-weight:700;">${fmtARS(f.total_recibido_real)}</td>
      <td style="color:${f.monto_nc_pendiente > 0 ? '#f87171' : '#94a3b8'}; font-weight:700;">
        ${f.monto_nc_pendiente > 0 ? `${fmtARS(f.monto_nc_pendiente)} (NC)` : '$0'}
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="pill ${f.estado === 'aprobada_parcial_con_nc' ? 'pill-amber' : 'pill-emerald'}">
            ${f.estado === 'aprobada_parcial_con_nc' ? '⚠️ Parcial + Reclamo NC' : '✅ Completa en Stock'}
          </span>
          <button class="btn btn-danger" style="padding:4px 8px;" title="Eliminar registro" onclick="eliminarFacturaUI('${f.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function eliminarFacturaUI(facturaId) {
  await fetch(`/api/facturas/${facturaId}`, { method: 'DELETE' });
  delete DRAFT_EDITS[facturaId];
}

// =========================================================================
// 2. CAPTURA POR CÁMARA WEB / ARCHIVO / PRESET (CON COMPRESIÓN HD Y FALLBACK)
// =========================================================================
function comprimirImagenDataURL(dataUrl, maxDim = 1280, quality = 0.84) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width || 1000;
      let h = img.height || 750;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function mostrarPreviewFactura(base64) {
  const prev = document.getElementById('img-preview-factura');
  if (prev && base64) {
    prev.src = base64;
    prev.style.display = 'block';
  }
}

async function activarCamaraWeb() {
  const video = document.getElementById('webcam-video');
  const placeholder = document.getElementById('camera-placeholder');
  const btnSnap = document.getElementById('btn-snap-cam');
  const btnClose = document.getElementById('btn-close-cam');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('El navegador actual requiere conexión local (localhost) o HTTPS para encender la cámara en vivo, o bien podés tocar "📁 Subir Imagen de Factura" que abre la cámara nativa del celular.');
    return;
  }

  try {
    detenerCamaraWeb();
    try {
      WEBCAM_STREAM = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (innerErr) {
      // Fallback universal para cualquier cámara USB de PC de escritorio
      WEBCAM_STREAM = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    video.srcObject = WEBCAM_STREAM;
    await video.play().catch(() => {});
    video.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (btnSnap) btnSnap.style.display = 'inline-flex';
    if (btnClose) btnClose.style.display = 'inline-flex';
    hablarNora('Cámara encendida. Enfocá la factura con buena luz y presioná Sacar Foto.');
  } catch (e) {
    alert('No se detectó una cámara disponible o el permiso fue denegado (' + e.message + '). Podés usar "📁 Subir Imagen de Factura" directamente.');
  }
}

function detenerCamaraWeb() {
  const video = document.getElementById('webcam-video');
  const placeholder = document.getElementById('camera-placeholder');
  const btnSnap = document.getElementById('btn-snap-cam');
  const btnClose = document.getElementById('btn-close-cam');
  if (WEBCAM_STREAM) {
    WEBCAM_STREAM.getTracks().forEach((t) => t.stop());
    WEBCAM_STREAM = null;
  }
  if (video) {
    video.srcObject = null;
    video.style.display = 'none';
  }
  if (placeholder) placeholder.style.display = 'block';
  if (btnSnap) btnSnap.style.display = 'none';
  if (btnClose) btnClose.style.display = 'none';
}

async function capturarFotoDeCamara() {
  const video = document.getElementById('webcam-video');
  const canvas = document.getElementById('webcam-canvas');
  if (!video || !WEBCAM_STREAM) return;
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const rawBase64 = canvas.toDataURL('image/jpeg', 0.88);
  const base64 = await comprimirImagenDataURL(rawBase64, 1280, 0.84);
  mostrarPreviewFactura(base64);
  await enviarImagenFacturaANora(base64);
}

function subirArchivoFactura(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const comprimida = await comprimirImagenDataURL(ev.target.result, 1280, 0.84);
    mostrarPreviewFactura(comprimida);
    await enviarImagenFacturaANora(comprimida);
    event.target.value = '';
  };
  reader.readAsDataURL(file);
}

async function enviarImagenFacturaANora(imageBase64) {
  const origen = document.getElementById('select-origen-factura')?.value || 'CAMARA_KIOSCO';
  const margenPct = document.getElementById('input-margen-captura')?.value || 45;
  const turno = KIOSCO_STATE?.turnoActivo;
  const operario = MODO_DUENIO ? 'Dueño (Celular)' : (turno ? turno.operario_nombre : 'Operador');

  hablarNora('Analizando la imagen de la factura con visión óptica, dame un segundo...');
  try {
    const res = await fetch('/api/nora/leer-factura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        origen,
        operarioCaptura: operario,
        margenPct
      })
    });
    const data = await res.json();
    if (data.spokenResponse) hablarNora(data.spokenResponse);
    if (!data.ok) {
      alert(data.error || 'No se pudo leer la factura');
    } else {
      cambiarTab('facturas');
      setTimeout(() => {
        const contenedor = document.getElementById('contenedor-borradores-facturas');
        if (contenedor) {
          contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          contenedor.classList.add('pulse-highlight');
          setTimeout(() => contenedor.classList.remove('pulse-highlight'), 3000);
        }
      }, 350);
    }
  } catch (e) {
    alert('Error procesando factura: ' + e.message);
  }
}

async function cargarFacturaPreset(presetDemo) {
  const origen = document.getElementById('select-origen-factura')?.value || 'CAMARA_KIOSCO';
  const margenPct = document.getElementById('input-margen-captura')?.value || 45;
  const turno = KIOSCO_STATE?.turnoActivo;
  const operario = MODO_DUENIO ? 'Dueño (Celular)' : (turno ? turno.operario_nombre : 'Operador');

  const res = await fetch('/api/nora/leer-factura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      presetDemo,
      origen,
      operarioCaptura: operario,
      margenPct
    })
  });
  const data = await res.json();
  if (data.spokenResponse) hablarNora(data.spokenResponse);
  cambiarTab('facturas');
  setTimeout(() => {
    const contenedor = document.getElementById('contenedor-borradores-facturas');
    if (contenedor) {
      contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      contenedor.classList.add('pulse-highlight');
      setTimeout(() => contenedor.classList.remove('pulse-highlight'), 3000);
    }
  }, 350);
}

// =========================================================================
// 3. STOCK IBERÁSOFT, PRECIOS (%) E INFORME DE FALTANTES (LÍMITE MÍNIMO)
// =========================================================================
function renderStockYFaltantes(articulos, faltantes) {
  const tbFaltantes = document.getElementById('tabla-faltantes-minimos');
  if (tbFaltantes) {
    if (faltantes.length === 0) {
      tbFaltantes.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#34d399;">✅ Todos los productos superan el límite mínimo asignado por el comercio.</td></tr>';
    } else {
      tbFaltantes.innerHTML = faltantes.map((f) => `
        <tr class="row-low-stock">
          <td><strong>${f.id}</strong><div style="font-size:0.72rem;">${f.codigo_barras}</div></td>
          <td><strong>${f.nombre}</strong></td>
          <td>${f.rubro}</td>
          <td>${f.proveedor}</td>
          <td style="color:#f87171; font-weight:800; font-size:0.95rem;">${f.stock_actual} ${f.unidad}</td>
          <td><strong>${f.stock_minimo} ${f.unidad}</strong></td>
          <td style="color:#fbbf24; font-weight:700;">Pedir +${f.cantidad_sugerida_pedido} ${f.unidad}</td>
        </tr>
      `).join('');
    }
  }

  const tbArt = document.getElementById('tabla-articulos-iberasoft');
  if (tbArt) {
    tbArt.innerHTML = articulos.map((a) => {
      const enMinimo = a.stock_actual <= a.stock_minimo;
      return `
        <tr class="${enMinimo ? 'row-low-stock' : ''}">
          <td><strong>${a.id}</strong><div style="font-size:0.72rem; color:#94a3b8;">${a.codigo_barras}</div></td>
          <td><strong>${a.nombre}</strong></td>
          <td>${a.rubro}<div style="font-size:0.72rem; color:#94a3b8;">${MODO_DUENIO ? a.proveedor : ''}</div></td>
          <td>${MODO_DUENIO ? fmtARS(a.costo_unitario) : '<span style="color:#64748b; font-size:0.78rem;">🔒 Privado</span>'}</td>
          <td>
            ${MODO_DUENIO ? `
              <input
                type="number"
                value="${a.margen_pct}"
                style="width:65px;"
                onchange="actualizarArticuloIberaSoft('${a.id}', { margenPct: this.value })"
              /> %
            ` : '<span style="color:#64748b; font-size:0.78rem;">🔒 Privado</span>'}
          </td>
          <td><strong style="color:#34d399; font-size:0.95rem;">${fmtARS(a.precio_venta)}</strong></td>
          <td>
            <span class="pill ${enMinimo ? 'pill-red' : 'pill-emerald'}">
              ${a.stock_actual} ${a.unidad}
            </span>
          </td>
          <td>
            <input
              type="number"
              value="${a.stock_minimo}"
              style="width:65px;"
              onchange="actualizarArticuloIberaSoft('${a.id}', { stockMinimo: this.value })"
            />
          </td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary" onclick="simularVentaMostrador('${a.id}', 1, 'EFECTIVO')">
                🛒 Vender 1
              </button>
              <button class="btn btn-danger" style="padding:5px 9px;" title="Eliminar este artículo" onclick="eliminarArticuloIberaSoft('${a.id}')">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function eliminarArticuloIberaSoft(id) {
  await fetch(`/api/stock/${id}`, { method: 'DELETE' });
}

async function crearArticuloManualUI() {
  const id = document.getElementById('new-art-id')?.value || '';
  const nombre = document.getElementById('new-art-nombre')?.value || '';
  const rubro = document.getElementById('new-art-rubro')?.value || 'Almacén';
  const costoUnitario = Number(document.getElementById('new-art-costo')?.value) || 0;
  const margenPct = Number(document.getElementById('new-art-margen')?.value) || 45;
  const stockActual = Number(document.getElementById('new-art-stock')?.value) || 0;
  const stockMinimo = Number(document.getElementById('new-art-min')?.value) || 5;

  if (!nombre.trim()) {
    alert('Ingresá el nombre del artículo.');
    return;
  }

  const res = await fetch('/api/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, nombre, rubro, costoUnitario, margenPct, stockActual, stockMinimo })
  });
  const data = await res.json();
  if (data.ok) {
    document.getElementById('new-art-id').value = '';
    document.getElementById('new-art-nombre').value = '';
    document.getElementById('new-art-costo').value = '';
    hablarNora(`Artículo ${nombre} agregado al catálogo de IberáSoft.`);
  } else {
    alert(data.error);
  }
}

function importarCSVIberaSoft(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reemplazar = confirm('¿Querés reemplazar los artículos de ejemplo por los de este archivo CSV de IberáSoft?\n(Aceptar = Reemplazar todo | Cancelar = Sumar a los actuales)');
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const res = await fetch('/api/iberasoft/importar-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvText: ev.target.result,
        reemplazarCatalogoActual: reemplazar
      })
    });
    const data = await res.json();
    if (data.ok) {
      hablarNora(`Importé ${data.importados} artículos desde la planilla de IberáSoft correctamente.`);
    } else {
      alert('Error importando CSV: ' + data.error);
    }
    event.target.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

async function limpiarTodosLosEjemplos() {
  const pin = prompt('🧹 Para borrar todos los artículos, facturas y movimientos de ejemplo y dejar el sistema en cero listo para IberáSoft, ingresá el PIN Maestro del Dueño (9999):', '9999');
  if (!pin) return;
  const res = await fetch('/api/iberasoft/limpiar-ejemplos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinDuenio: pin, conservarCatalogo: false })
  });
  const data = await res.json();
  if (data.ok) {
    DRAFT_EDITS = {};
    hablarNora('Se eliminaron todos los datos de ejemplo. El sistema está limpio y listo para cargar el catálogo real de IberáSoft.');
  } else {
    alert('🔒 ' + (data.error || 'No se pudo limpiar'));
  }
}

async function restaurarCatalogoKioscoUI() {
  if (!confirm('¿Querés cargar el catálogo completo del Kiosco (1.277 artículos con precios y stock de IberáSoft)?')) return;
  try {
    const res = await fetch('/api/iberasoft/restaurar-catalogo-kiosco', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      alert(`✅ ¡Éxito! Se cargaron ${data.totalArticulos} artículos del Kiosco en la base de datos.`);
      hablarNora(`Catálogo del Kiosco cargado exitosamente. Hay ${data.totalArticulos} productos disponibles.`);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Error al conectar con el servidor: ' + err.message);
  }
}
const restaurarCatalogoLubricentroUI = restaurarCatalogoKioscoUI;

async function actualizarArticuloIberaSoft(id, payload) {
  await fetch(`/api/stock/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function simularVentaMostrador(articuloId, cantidad = 1, medioPago = 'EFECTIVO') {
  const res = await fetch('/api/stock/venta-mostrador', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articuloId, cantidad, medioPago })
  });
  const data = await res.json();
  if (data.ok && data.tocoMinimo) {
    hablarNora(`Atención: ${data.articulo.nombre} acaba de tocar el límite mínimo de ${data.articulo.stock_minimo} unidades. Ya envié el informe de faltantes al celular del dueño.`);
  }
}

async function enviarInformeFaltantesWhatsApp() {
  const res = await fetch('/api/whatsapp/enviar-faltantes', { method: 'POST' });
  const data = await res.json();
  if (data.ok) {
    hablarNora(`Envié el informe con los ${data.faltantes.length} productos en límite mínimo al WhatsApp del dueño.`);
  }
}

function abrirWhatsAppExternoFaltantes() {
  if (!KIOSCO_STATE) return;
  const faltantes = KIOSCO_STATE.faltantes || [];
  const tel = (KIOSCO_STATE.config?.telefono_duenio || '').replace(/[^0-9]/g, '');
  const texto = `🚨 *INFORME DE FALTANTES (LÍMITE MÍNIMO) - NORA AI x IBERÁSOFT*\n\n` +
    faltantes.map((f) => `• *${f.nombre}*: Quedan ${f.stock_actual} (Mín: ${f.stock_minimo}) ➔ Pedir ${f.cantidad_sugerida_pedido} u. [${f.proveedor}]`).join('\n');
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank');
}

async function escanearConexionIberaSoft() {
  const res = await fetch('/api/iberasoft/scan', { method: 'POST' });
  const data = await res.json();
  if (data.ok) {
    hablarNora(`Escaneo de IberáSoft completado. Motor activo: ${data.scan.motorDetectado}. Planilla CSV de precios y stock sincronizada.`);
  }
}

// =========================================================================
// 4. CAJA DIARIA Y TURNOS POR OPERARIO
// =========================================================================
function renderCajaYTurnos() {
  const { turnoActivo, operarios, movimientosCaja, historialTurnos } = KIOSCO_STATE;

  const statsEl = document.getElementById('stats-caja-cards');
  if (statsEl) {
    if (turnoActivo) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">👤 Operario del Turno (${turnoActivo.turno_tipo})</div>
          <div class="stat-value" style="color:#34d399;">${turnoActivo.operario_nombre}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🏁 Con cuánto Inició la Caja</div>
          <div class="stat-value">${fmtARS(turnoActivo.monto_inicial)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💵 Ventas Efectivo / 💳 Digital</div>
          <div class="stat-value" style="color:#fbbf24;">${fmtARS(turnoActivo.ventas_efectivo)} <span style="font-size:0.9rem; color:#94a3b8;">/ ${fmtARS(turnoActivo.ventas_digital)}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🔒 Efectivo Esperado al Cerrar</div>
          <div class="stat-value" style="color:#38bdf8;">${fmtARS(turnoActivo.monto_esperado_efectivo)}</div>
        </div>
      `;
    } else {
      statsEl.innerHTML = `
        <div class="stat-card" style="grid-column: 1 / -1; text-align:center;">
          <div class="stat-label">Estado de Caja</div>
          <div class="stat-value" style="color:#f87171;">🔒 Caja Cerrada — Seleccioná el Operario del Turno y el Monto Inicial</div>
        </div>
      `;
    }
  }

  const panelTurno = document.getElementById('panel-gestion-turno');
  if (panelTurno) {
    if (turnoActivo) {
      panelTurno.innerHTML = `
        <div style="background:#0b1120; border:1px solid #1e293b; padding:14px; border-radius:10px; margin-bottom:12px;">
          <div style="font-size:0.85rem; color:#94a3b8;">Operario Reconocido en Turno Activo:</div>
          <div style="font-size:1.2rem; font-weight:800; color:#34d399; margin:4px 0;">
            👤 ${turnoActivo.operario_nombre} — Turno ${turnoActivo.turno_tipo}
          </div>
          <div style="font-size:0.8rem; color:#cbd5e1;">
            Apertura: ${turnoActivo.fecha_apertura} • Inició con: <strong>${fmtARS(turnoActivo.monto_inicial)}</strong> • Pagos/Retiros: <strong>${fmtARS(turnoActivo.egresos_caja)}</strong>
          </div>
        </div>

        <h3 style="font-size:0.95rem; margin-bottom:8px; color:#fbbf24;">🔒 Arqueo y Cierre de Turno</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-size:0.78rem; color:#94a3b8; display:block; margin-bottom:4px;">
              ¿Con cuánto efectivo físico cierra ${turnoActivo.operario_nombre}?
            </label>
            <input type="number" id="input-cierre-declarado" value="${turnoActivo.monto_esperado_efectivo}" style="width:100%; font-weight:700;" />
          </div>
          <div>
            <label style="font-size:0.78rem; color:#94a3b8; display:block; margin-bottom:4px;">Observaciones de Cierre</label>
            <input type="text" id="input-cierre-notas" placeholder="Ej: Todo ok, se dejó cambio" style="width:100%;" />
          </div>
        </div>
        <button class="btn btn-danger" style="width:100%;" onclick="cerrarTurnoActual()">
          🔒 Cerrar Turno de ${turnoActivo.operario_nombre}, Asentar Libro Diario y Avisar al Dueño
        </button>
      `;
    } else {
      const opts = operarios.map((o) => `<option value="${o.nombre}">${o.nombre} (${o.rol})</option>`).join('');
      panelTurno.innerHTML = `
        <h3 style="font-size:0.95rem; margin-bottom:10px; color:#34d399;">🔑 Abrir Nuevo Turno de Caja</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-size:0.78rem; color:#94a3b8; display:block; margin-bottom:4px;">Operario Reconocido por Nora</label>
            <select id="select-operario-apertura" style="width:100%;">${opts}</select>
          </div>
          <div>
            <label style="font-size:0.78rem; color:#94a3b8; display:block; margin-bottom:4px;">Franja de Turno</label>
            <select id="select-tipo-turno" style="width:100%;">
              <option value="Mañana">🌅 Turno Mañana</option>
              <option value="Tarde">☀️ Turno Tarde</option>
              <option value="Noche">🌙 Turno Noche</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:0.78rem; color:#94a3b8; display:block; margin-bottom:4px;">¿Con cuánto efectivo inicia la caja ($ ARS)?</label>
          <input type="number" id="input-apertura-monto" value="35000" style="width:100%; font-weight:700;" />
        </div>
        <button class="btn btn-success" style="width:100%;" onclick="abrirNuevoTurno()">
          🔑 Confirmar Identidad del Operario e Iniciar Turno de Caja
        </button>
      `;
    }
  }

  const tbMov = document.getElementById('tabla-movimientos-caja');
  if (tbMov) {
    tbMov.innerHTML = movimientosCaja.map((m) => `
      <tr>
        <td>${(m.created_at || '').split(' ')[1] || m.created_at}</td>
        <td><strong>${m.operario_nombre}</strong></td>
        <td><span class="pill">${m.tipo}</span></td>
        <td>${m.medio_pago}</td>
        <td>${m.descripcion || ''}</td>
        <td style="font-weight:700; color:${m.tipo === 'PAGO_PROVEEDOR' || m.tipo === 'RETIRO_DUENIO' || m.tipo === 'GASTO_OPERATIVO' ? '#f87171' : '#34d399'};">
          ${fmtARS(m.monto)}
        </td>
      </tr>
    `).join('');
  }

  const tbHist = document.getElementById('tabla-historial-turnos');
  if (tbHist) {
    tbHist.innerHTML = historialTurnos.map((t) => `
      <tr>
        <td>
          <div>🟢 ${t.fecha_apertura}</div>
          <div style="font-size:0.74rem; color:#94a3b8;">🔴 ${t.fecha_cierre || 'En curso'}</div>
        </td>
        <td><strong>👤 ${t.operario_nombre}</strong></td>
        <td>${t.turno_tipo}</td>
        <td>${fmtARS(t.monto_inicial)}</td>
        <td style="color:#34d399;">${fmtARS(t.ventas_efectivo)}</td>
        <td style="color:#38bdf8;">${fmtARS(t.ventas_digital)}</td>
        <td style="color:#f87171;">${fmtARS(t.egresos_caja)}</td>
        <td><strong>${fmtARS(t.monto_esperado_efectivo)}</strong></td>
        <td><strong>${t.estado === 'cerrado' ? fmtARS(t.monto_declarado_cierre) : 'Abierto'}</strong></td>
        <td>
          ${t.estado === 'cerrado'
            ? `<span class="pill ${t.diferencia_caja === 0 ? 'pill-emerald' : 'pill-red'}">${fmtARS(t.diferencia_caja)}</span>`
            : '<span class="pill pill-amber">Activo</span>'
          }
        </td>
      </tr>
    `).join('');
  }
}

async function abrirNuevoTurno() {
  const operarioNombre = document.getElementById('select-operario-apertura')?.value || 'Lucas';
  const turnoTipo = document.getElementById('select-tipo-turno')?.value || 'Mañana';
  const montoInicial = Number(document.getElementById('input-apertura-monto')?.value) || 0;

  const res = await fetch('/api/turnos/abrir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operarioNombre, turnoTipo, montoInicial })
  });
  const data = await res.json();
  if (data.ok) {
    hablarNora(`Bienvenido ${operarioNombre}. Quedó abierto el turno ${turnoTipo} con un fondo inicial de ${fmtARS(montoInicial)} en caja.`);
  } else {
    alert(data.error);
  }
}

async function cerrarTurnoActual() {
  const montoDeclaradoEfectivo = Number(document.getElementById('input-cierre-declarado')?.value) || 0;
  const notasCierre = document.getElementById('input-cierre-notas')?.value || '';

  const res = await fetch('/api/turnos/cerrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ montoDeclaradoEfectivo, notasCierre })
  });
  const data = await res.json();
  if (data.ok) {
    const t = data.turnoCerrado;
    hablarNora(`Turno ${t.turno_tipo} de ${t.operario_nombre} cerrado con ${fmtARS(t.monto_declarado_cierre)}. Ya asenté el cierre en el Libro Diario y le mandé el reporte al WhatsApp del dueño.`);
  } else {
    alert(data.error);
  }
}

async function registrarMovimientoCaja() {
  const tipo = document.getElementById('mov-tipo')?.value || 'GASTO_OPERATIVO';
  const monto = Number(document.getElementById('mov-monto')?.value) || 0;
  const descripcion = document.getElementById('mov-desc')?.value || tipo;
  if (monto <= 0) {
    alert('Ingresá un monto mayor a $0');
    return;
  }
  const res = await fetch('/api/turnos/movimiento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, medioPago: 'EFECTIVO', monto, descripcion })
  });
  const data = await res.json();
  if (data.ok) {
    document.getElementById('mov-monto').value = '';
    document.getElementById('mov-desc').value = '';
  }
}

// =========================================================================
// 5. LIBRO DIARIO CONTABLE (CONTADOR) Y NOTAS DE CRÉDITO PENDIENTES
// =========================================================================
function renderContabilidadYNotasCredito(notasCredito, libroDiario) {
  const tbNC = document.getElementById('tabla-notas-credito');
  if (tbNC) {
    if (notasCredito.length === 0) {
      tbNC.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No hay reclamos de Notas de Crédito pendientes.</td></tr>';
    } else {
      tbNC.innerHTML = notasCredito.map((nc) => {
        const detalleItems = (nc.items_faltantes || [])
          .map((i) => `${i.cantidad_faltante_nc}x ${i.nombre} (${fmtARS(i.subtotal_faltante_nc)})`)
          .join(', ');
        return `
          <tr>
            <td>${nc.fecha_reclamo}</td>
            <td><strong>${nc.proveedor}</strong></td>
            <td>${nc.numero_comprobante_origen}</td>
            <td style="color:#fca5a5;">${detalleItems}</td>
            <td style="font-weight:800; color:#fbbf24;">${fmtARS(nc.monto_reclamo)}</td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                ${nc.estado === 'PENDIENTE_RECLAMO'
                  ? `<button class="btn btn-success" onclick="saldarNotaCredito('${nc.id}')">🧾 Recibí Nota de Crédito (Saldar)</button>`
                  : `<span class="pill pill-emerald">✅ Saldada (${nc.nc_resolucion_numero})</span>`
                }
                <button class="btn btn-danger" style="padding:4px 8px;" title="Eliminar reclamo" onclick="eliminarNotaCreditoUI('${nc.id}')">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  const tbLibro = document.getElementById('tabla-libro-diario');
  if (tbLibro) {
    if (libroDiario.length === 0) {
      tbLibro.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#94a3b8;">El Libro Diario se alimenta automáticamente al aprobar facturas o cerrar turnos de caja.</td></tr>';
    } else {
      tbLibro.innerHTML = libroDiario.map((a) => `
        <tr>
          <td>${a.fecha} <span style="font-size:0.73rem; color:#94a3b8;">${a.hora}</span></td>
          <td><span class="pill">${a.tipo_asiento}</span></td>
          <td>${a.comprobante_tipo} ${a.comprobante_nro}</td>
          <td><strong>${a.proveedor_o_responsable}</strong></td>
          <td>${a.concepto}</td>
          <td>${fmtARS(a.neto_gravado)}</td>
          <td>${fmtARS(a.iva_21)}</td>
          <td style="color:#34d399; font-weight:700;">${a.total_debe > 0 ? fmtARS(a.total_debe) : '-'}</td>
          <td style="color:#fbbf24; font-weight:700;">${a.total_haber > 0 ? fmtARS(a.total_haber) : '-'}</td>
        </tr>
      `).join('');
    }
  }
}

async function saldarNotaCredito(ncId) {
  const nro = prompt('Ingresá el número de la Nota de Crédito entregada por el proveedor (o dejá vacío para autogenerar):', '');
  if (nro === null) return;
  const res = await fetch(`/api/notas-credito/${ncId}/saldar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numeroNotaCredito: nro })
  });
  const data = await res.json();
  if (data.ok) {
    hablarNora('Nota de Crédito aplicada y saldada en el Libro Diario Contable.');
  }
}

async function eliminarNotaCreditoUI(ncId) {
  await fetch(`/api/notas-credito/${ncId}`, { method: 'DELETE' });
}

// =========================================================================
// 6. WHATSAPP FEED, CÓDIGOS QR Y CONFIGURACIÓN REMOTA DEL DUEÑO
// =========================================================================
function renderWhatsAppYConfig(whatsappFeed, config, localIp, port) {
  const localUrl = `http://${localIp}:${port}/?rol=duenio`;
  const tunnelBase = KIOSCO_STATE?.remoteTunnelUrl || '';
  const httpsUrl = tunnelBase ? `${tunnelBase}/?rol=duenio` : localUrl;

  const linkLocalEl = document.getElementById('link-celular-duenio');
  if (linkLocalEl) {
    linkLocalEl.textContent = localUrl;
  }

  const linkHttpsEl = document.getElementById('link-celular-https');
  const badgeTunnel = document.getElementById('badge-tunnel-status');
  if (linkHttpsEl) {
    if (tunnelBase) {
      linkHttpsEl.innerHTML = `<a href="${httpsUrl}" target="_blank" style="color:#34d399; text-decoration:underline;">${httpsUrl}</a>`;
      if (badgeTunnel) {
        badgeTunnel.textContent = '🌐 Túnel HTTPS 4G/WiFi Activo';
        badgeTunnel.className = 'pill pill-emerald';
      }
    } else {
      linkHttpsEl.textContent = `Conectando túnel HTTPS... (Red local: ${localUrl})`;
      if (badgeTunnel) {
        badgeTunnel.textContent = '⏳ Conectando Túnel 4G...';
        badgeTunnel.className = 'pill pill-amber';
      }
    }
  }

  // 1. Generar imagen del Código QR para entrar desde el Celular del Dueño
  const qrCelularImg = document.getElementById('qr-img-celular-duenio');
  if (qrCelularImg) {
    const targetQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(httpsUrl)}`;
    if (qrCelularImg.getAttribute('data-current') !== httpsUrl) {
      qrCelularImg.src = targetQrUrl;
      qrCelularImg.setAttribute('data-current', httpsUrl);
    }
  }

  // 2. Renderizar el QR Oficial de Dispositivos Vinculados de WhatsApp (Baileys Multi-Device)
  const waBridge = KIOSCO_STATE?.whatsappBridge || {};
  const qrWaImg = document.getElementById('qr-img-whatsapp-nora');
  const qrWaContainer = document.getElementById('qr-wa-container');
  const waLinkedBanner = document.getElementById('wa-linked-banner');

  if (waBridge.linked) {
    if (qrWaContainer) qrWaContainer.style.display = 'none';
    if (waLinkedBanner) {
      waLinkedBanner.style.display = 'block';
      waLinkedBanner.innerHTML = `
        <div style="background:rgba(16,185,129,0.15); border:1.5px solid #10b981; border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:1.8rem; margin-bottom:6px;">✅</div>
          <div style="font-size:1rem; font-weight:800; color:#34d399;">WhatsApp Vinculado Exitosamente</div>
          <div style="font-size:0.85rem; color:#e2e8f0; margin:4px 0 10px 0;">
            Número conectado: <strong>${waBridge.linkedPhone}</strong> (${waBridge.linkedName || 'Kiosco'})
          </div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:12px;">
            El Kiosco ya está recibiendo mensajes y fotos de facturas automáticamente.
          </div>
          <button class="btn btn-warning" onclick="regenerarCodigoQRWhatsApp()" style="background:#f59e0b; color:#0f172a; font-weight:800; padding:8px 16px; border:none; border-radius:8px; cursor:pointer;">
            🔄 Desvincular y Conectar Otro Número de WhatsApp
          </button>
        </div>
      `;
    }
  } else {
    if (waLinkedBanner) waLinkedBanner.style.display = 'none';
    if (qrWaContainer) qrWaContainer.style.display = 'flex';
    if (qrWaImg && waBridge.qrDataUrl) {
      qrWaImg.src = waBridge.qrDataUrl;
    }
  }

  const tokenEl = document.getElementById('wa-session-token');
  if (tokenEl) {
    tokenEl.textContent = waBridge.linked
      ? `✅ Número Asignado al Kiosco: ${waBridge.linkedPhone} (${waBridge.linkedName || 'Activo'})`
      : '📲 Abrí WhatsApp ➔ Dispositivos vinculados ➔ Vincular un dispositivo y escaneá este QR';
  }

  const badgeWa = document.getElementById('badge-wa-qr-status');
  if (badgeWa) {
    if (waBridge.linked) {
      badgeWa.textContent = `✅ Vinculado: ${waBridge.linkedPhone}`;
      badgeWa.className = 'pill pill-emerald';
    } else if (waBridge.qrDataUrl) {
      badgeWa.textContent = '📷 QR Oficial Listo (Escanear desde WhatsApp)';
      badgeWa.className = 'pill pill-amber';
    } else {
      badgeWa.textContent = '⏳ Generando QR de WhatsApp...';
      badgeWa.className = 'pill pill-amber';
    }
  }

  const telIn = document.getElementById('cfg-tel-duenio');
  if (telIn && document.activeElement !== telIn) {
    telIn.value = config.telefono_duenio || '+5491100000000';
  }

  const redIn = document.getElementById('cfg-redondeo');
  if (redIn && document.activeElement !== redIn) {
    redIn.value = String(config.redondeo_multiplo || '50');
  }

  const feedEl = document.getElementById('whatsapp-feed-list');
  if (feedEl) {
    feedEl.innerHTML = whatsappFeed.map((w) => `
      <div class="wa-bubble ${w.tipo_alerta === 'NC_PENDIENTE' || w.tipo_alerta === 'STOCK_MINIMO' ? 'nc-alert' : ''}">
        <div class="wa-meta">
          <span><strong>${w.remitente}</strong> ➔ ${w.destinatario}</span>
          <span>${w.created_at}</span>
        </div>
        <div>${w.mensaje}</div>
      </div>
    `).join('');
  }
}

function copiarLinkCelularHTTPS() {
  const tunnelBase = KIOSCO_STATE?.remoteTunnelUrl || `http://${KIOSCO_STATE?.localIp || 'localhost'}:${KIOSCO_STATE?.port || 3040}`;
  const url = `${tunnelBase}/?rol=duenio`;
  navigator.clipboard.writeText(url);
  hablarNora('Copié el enlace seguro para tu celular al portapapeles.');
  alert('Enlace copiado:\n' + url);
}

function enviarLinkCelularPorWhatsApp() {
  const tunnelBase = KIOSCO_STATE?.remoteTunnelUrl || `http://${KIOSCO_STATE?.localIp || 'localhost'}:${KIOSCO_STATE?.port || 3040}`;
  const url = `${tunnelBase}/?rol=duenio`;
  const tel = String(KIOSCO_STATE?.config?.telefono_duenio || '').replace(/[^0-9]/g, '');
  const msg = `📱 *ACCESO REMOTO CELULAR DEL DUEÑO (NORA AI x IBERÁSOFT)*\n\nTocá este enlace para supervisar la caja, ver faltantes en límite mínimo y cargar o aprobar facturas desde tu celular:\n${url}`;
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function confirmarVinculacionWhatsAppQR() {
  const tel = document.getElementById('cfg-tel-duenio')?.value || '';
  const res = await fetch('/api/whatsapp/vincular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefono: tel, accion: 'vincular' })
  });
  const data = await res.json();
  if (data.ok) {
    hablarNora('Puente de WhatsApp QR vinculado correctamente con el kiosco.');
  }
}

async function regenerarCodigoQRWhatsApp() {
  await fetch('/api/whatsapp/vincular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'regenerar_qr' })
  });
  hablarNora('Código QR de WhatsApp regenerado y listo para escanear.');
}

function abrirWhatsAppWebDirecto() {
  window.open('https://web.whatsapp.com/', '_blank');
}

async function guardarConfiguracionKiosco() {
  const telefono_duenio = document.getElementById('cfg-tel-duenio')?.value || '';
  const redondeo_multiplo = document.getElementById('cfg-redondeo')?.value || '50';
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefono_duenio, redondeo_multiplo })
  });
  hablarNora('Configuración del kiosco y regla de redondeo actualizadas.');
}

// =========================================================================
// 7. INTERACCIÓN POR VOZ Y CHAT CON NORA COO (CON AVATAR REAL)
// =========================================================================
function abrirChatNoraModal() {
  const modal = document.getElementById('modal-chat-nora');
  if (modal) {
    modal.style.display = 'flex';
    const input = document.getElementById('modal-chat-input');
    if (input) setTimeout(() => input.focus(), 100);
    scrollChatStream();
  }
}

function cerrarChatNoraModal() {
  const modal = document.getElementById('modal-chat-nora');
  if (modal) modal.style.display = 'none';
}

function scrollChatStream() {
  const stream = document.getElementById('chat-stream-container');
  if (stream) stream.scrollTop = stream.scrollHeight;
}

function appendMensajeChat(remitente, texto) {
  const stream = document.getElementById('chat-stream-container');
  if (!stream) return;

  const row = document.createElement('div');
  row.className = `chat-row ${remitente === 'nora' ? 'chat-row-nora' : 'chat-row-user'}`;

  const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  if (remitente === 'nora') {
    row.innerHTML = `
      <img src="/nora-avatar-circle.png" class="chat-msg-avatar" alt="Nora AI" />
      <div class="chat-bubble chat-bubble-nora">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <span class="chat-sender-label">Nora AI</span>
          <span style="font-size:0.65rem; color:#64748b;">${hora}</span>
        </div>
        <div>${texto}</div>
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="chat-user-avatar">👤</div>
      <div class="chat-bubble chat-bubble-user">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <span class="chat-sender-label" style="color:#bfdbfe;">Vos</span>
          <span style="font-size:0.65rem; color:#cbd5e1;">${hora}</span>
        </div>
        <div>${texto}</div>
      </div>
    `;
  }

  stream.appendChild(row);
  scrollChatStream();
}

async function enviarComandoNora(textoManual = null) {
  const input = document.getElementById('nora-command-input');
  const texto = (textoManual || input?.value || '').trim();
  if (!texto) return;
  if (!textoManual && input) input.value = '';

  appendMensajeChat('user', texto);

  const turno = KIOSCO_STATE?.turnoActivo;
  const res = await fetch('/api/nora/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      textoUsuario: texto,
      operarioActual: turno ? turno.operario_nombre : 'Operador',
      rol: MODO_DUENIO ? 'Dueño Remoto (Celular)' : 'Mostrador Kiosco'
    })
  });
  const data = await res.json();
  const resp = data.spokenResponse || 'Listo, registrado en el sistema.';
  appendMensajeChat('nora', resp);
  hablarNora(resp);
}

async function enviarMensajeModalChat() {
  const input = document.getElementById('modal-chat-input');
  const texto = (input?.value || '').trim();
  if (!texto) return;
  input.value = '';

  appendMensajeChat('user', texto);

  const turno = KIOSCO_STATE?.turnoActivo;
  const res = await fetch('/api/nora/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      textoUsuario: texto,
      operarioActual: turno ? turno.operario_nombre : 'Operador',
      rol: MODO_DUENIO ? 'Dueño Remoto (Celular)' : 'Mostrador Kiosco'
    })
  });
  const data = await res.json();
  const resp = data.spokenResponse || 'Listo, registrado en el sistema.';
  appendMensajeChat('nora', resp);
  hablarNora(resp);
}

function enviarSugerenciaChat(pregunta) {
  const input = document.getElementById('modal-chat-input');
  if (input) input.value = pregunta;
  enviarMensajeModalChat();
}

function iniciarReconocimientoVozModalChat() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Tu navegador no soporta reconocimiento de voz. Escribile a Nora en el chat.');
    return;
  }
  const rec = new SpeechRec();
  rec.lang = 'es-AR';
  rec.interimResults = false;
  const input = document.getElementById('modal-chat-input');
  if (input) input.placeholder = '🔴 Escuchando tu voz...';

  rec.onresult = (ev) => {
    const transcript = ev.results[0][0].transcript;
    if (input) input.value = transcript;
    enviarMensajeModalChat();
  };
  rec.onend = () => {
    if (input) input.placeholder = 'Escribile un mensaje o pregunta a Nora...';
  };
  rec.start();
}

function iniciarReconocimientoVoz() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Tu navegador no soporta reconocimiento de voz directo. Escribile a Nora en la barra superior.');
    return;
  }
  const rec = new SpeechRec();
  rec.lang = 'es-AR';
  rec.interimResults = false;
  const btn = document.getElementById('btn-mic-voz');
  if (btn) btn.textContent = '🔴 Escuchando...';

  rec.onresult = (ev) => {
    const transcript = ev.results[0][0].transcript;
    document.getElementById('nora-command-input').value = transcript;
    enviarComandoNora(transcript);
  };
  rec.onend = () => {
    if (btn) btn.textContent = '🎤 Voz';
  };
  rec.start();
}

// =========================================================================
// 8. MODO NORA COPILOT INTERACTIVO Y EVOLUTIVO (IBERÁSOFT + PANEL NORA)
// =========================================================================
function renderCopilotManuals(manuales = []) {
  const badge = document.getElementById('badge-copilot-count');
  if (badge) badge.textContent = manuales.length;

  const contNora = document.getElementById('lista-guias-nora');
  const contIbera = document.getElementById('lista-guias-iberasoft');
  if (!contNora || !contIbera) return;

  const guiasNora = manuales.filter((m) => m.sistema === 'PANEL_NORA');
  const guiasIbera = manuales.filter((m) => m.sistema !== 'PANEL_NORA');

  const buildCard = (g) => `
    <div class="copilot-guide-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
        <div>
          <span class="pill ${g.sistema === 'PANEL_NORA' ? 'pill-emerald' : 'pill-amber'}" style="font-size:0.7rem; padding:2px 8px;">
            ${g.sistema === 'PANEL_NORA' ? '🧠 Panel Nora' : '⚙️ IberáSoft POS'} • ${g.categoria}
          </span>
          <h3 style="font-size:0.93rem; margin-top:6px; color:#f8fafc;">${g.titulo}</h3>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary" style="padding:4px 9px; font-size:0.76rem;" onclick="leerGuiaEnVozAlta('${g.id}')">
            🔊 Escuchar
          </button>
          ${g.tab_destino ? `
            <button class="btn btn-primary" style="padding:4px 9px; font-size:0.76rem;" onclick="irAPantallaYResaltar('${g.tab_destino}', '${g.selector_destacado || ''}')">
              🎯 Llevame ahí
            </button>
          ` : ''}
        </div>
      </div>
      <p style="font-size:0.82rem; color:#94a3b8;">${g.resumen}</p>
      <ul class="copilot-step-list">
        ${(g.pasos || []).map((p) => `<li>${p}</li>`).join('')}
      </ul>
    </div>
  `;

  contNora.innerHTML = guiasNora.map(buildCard).join('');
  contIbera.innerHTML = guiasIbera.map(buildCard).join('');
}

function leerGuiaEnVozAlta(guiaId) {
  const manuales = KIOSCO_STATE?.copilotManuals || [];
  const g = manuales.find((m) => m.id === guiaId);
  if (!g) return;
  hablarNora(`${g.titulo}. ${g.resumen}. ${(g.pasos || []).join('. ')}`);
}

function irAPantallaYResaltar(tabId, selector = '') {
  if (!tabId) return;
  cambiarTab(tabId);
  if (selector) {
    setTimeout(() => {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('copilot-highlight-active');
        setTimeout(() => el.classList.remove('copilot-highlight-active'), 4500);
      }
    }, 150);
  }
}

async function consultarNoraCopilot() {
  const input = document.getElementById('copilot-query-input');
  const box = document.getElementById('copilot-answer-box');
  const pregunta = input?.value?.trim() || '';
  if (!pregunta) return;

  const turno = KIOSCO_STATE?.turnoActivo;
  const res = await fetch('/api/copilot/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pregunta,
      operarioActual: turno ? turno.operario_nombre : 'Operador'
    })
  });
  const data = await res.json();
  if (!data.ok) {
    alert(data.error || 'No se pudo consultar a Nora Copilot');
    return;
  }

  if (box) {
    box.style.display = 'block';
    if (data.guia) {
      box.innerHTML = `
        <div class="copilot-guide-card" style="border: 2px solid #f59e0b; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="/nora-avatar-circle.png" class="copilot-nora-thumb" alt="Nora" />
              <div>
                <strong style="color:#fbbf24; font-size:1.02rem;">🧭 Guía Paso a Paso: ${data.guia.titulo}</strong>
                <div style="font-size:0.75rem; color:#94a3b8;">Nora Copilot • Instructora IberáSoft</div>
              </div>
            </div>
            ${data.guia.tab_destino ? `
              <button class="btn btn-primary" onclick="irAPantallaYResaltar('${data.guia.tab_destino}', '${data.guia.selector_destacado || ''}')">
                🎯 Llevame a esa Pantalla y Resaltá el Control
              </button>
            ` : ''}
          </div>
          <p style="font-size:0.86rem; color:#cbd5e1; margin-bottom:10px;">${data.guia.resumen}</p>
          <ul class="copilot-step-list">
            ${(data.guia.pasos || []).map((p) => `<li>${p}</li>`).join('')}
          </ul>
          ${data.respuestaDetallada ? `<div style="margin-top:10px; font-size:0.85rem; color:#a7f3d0; background:rgba(16,185,129,0.1); padding:8px 12px; border-radius:8px; border:1px solid rgba(16,185,129,0.25);">💡 Nora: ${data.respuestaDetallada}</div>` : ''}
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="copilot-guide-card" style="border: 2px solid #8b5cf6; padding:16px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <img src="/nora-avatar-circle.png" class="copilot-nora-thumb" alt="Nora" />
            <strong style="color:#c4b5fd; font-size:1rem;">🧭 Respuesta de Nora Copilot:</strong>
          </div>
          <p style="font-size:0.88rem; color:#e2e8f0; line-height:1.5; white-space:pre-line;">${data.respuestaDetallada || data.spokenResponse}</p>
        </div>
      `;
    }
  }

  if (data.spokenResponse) {
    hablarNora(data.spokenResponse);
  }
}

async function guardarNuevaGuiaCopilot() {
  const pinDuenio = document.getElementById('cop-pin-duenio')?.value || '';
  const sistema = document.getElementById('cop-sistema')?.value || 'IBERASOFT_POS';
  const titulo = document.getElementById('cop-titulo')?.value || '';
  const resumen = document.getElementById('cop-resumen')?.value || '';
  const rawPasos = document.getElementById('cop-pasos')?.value || '';
  const pasos = rawPasos.split('\n').map((l) => l.trim()).filter(Boolean);

  const res = await fetch('/api/copilot/learn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pinDuenio,
      sistema,
      titulo,
      resumen,
      keywords: `${titulo},${resumen}`,
      pasos
    })
  });
  const data = await res.json();
  if (!data.ok) {
    alert('🔒 ' + (data.error || 'No se pudo guardar la guía'));
    return;
  }
  document.getElementById('cop-titulo').value = '';
  document.getElementById('cop-resumen').value = '';
  document.getElementById('cop-pasos').value = '';
  hablarNora(`Perfecto. Aprendí el nuevo procedimiento "${titulo}" y ya está disponible en el manual de Nora Copilot para guiar a los operadores.`);
}

function aprenderPantallaIberaSoftConFoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const pinDuenio = document.getElementById('cop-pin-duenio')?.value || prompt('Ingresá el PIN Maestro del Dueño (por defecto 9999) para autorizar el nuevo conocimiento:', '9999');
  if (!pinDuenio) return;
  const tituloSugerido = document.getElementById('cop-vision-titulo')?.value || '';

  const reader = new FileReader();
  reader.onload = async (ev) => {
    hablarNora('Analizando la captura de pantalla de IberáSoft para armar la guía paso a paso...');
    const res = await fetch('/api/copilot/learn-vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: ev.target.result,
        pinDuenio,
        sistema: 'IBERASOFT_POS',
        tituloSugerido
      })
    });
    const data = await res.json();
    if (!data.ok) {
      alert('🔒 ' + (data.error || 'No se pudo aprender la pantalla'));
      return;
    }
    hablarNora(`¡Excelente! Analicé la pantalla de IberáSoft y agregué la guía "${data.aprendido?.titulo || tituloSugerido}" al Copilot.`);
  };
  reader.readAsDataURL(file);
}

// =========================================================================
// 9. CONSOLA REMOTA DE DESARROLLADOR NEXORA (DIAGNÓSTICO + PARCHES OTA)
// =========================================================================
async function diagnosticarPCClienteRemoto() {
  const masterKey = document.getElementById('nexora-master-key')?.value || '';
  const area = document.getElementById('nexora-patch-content');
  const res = await fetch('/api/nexora-support/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ masterKey })
  });
  const data = await res.json();
  if (area) {
    area.value = JSON.stringify(data, null, 2);
  }
}

async function enviarParcheOTACliente() {
  const masterKey = document.getElementById('nexora-master-key')?.value || '';
  const relativeFilePath = document.getElementById('nexora-patch-file')?.value?.trim() || '';
  const newContent = document.getElementById('nexora-patch-content')?.value || '';
  if (!relativeFilePath || !newContent) {
    alert('Indicá la ruta del archivo (ej. public/app.js) y el contenido nuevo.');
    return;
  }
  const res = await fetch('/api/nexora-support/apply-patch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ masterKey, relativeFilePath, newContent })
  });
  const data = await res.json();
  if (data.ok) {
    alert('✅ ' + data.message);
  } else {
    alert('❌ Error OTA: ' + data.error);
  }
}

// =========================================================================
// GESTIÓN DE LICENCIA, BANNER DE GRACIA (+5 DÍAS), SUSPENSIÓN Y PAGO MP
// =========================================================================
function renderEstadoLicencia(lic) {
  if (!lic) return;

  const pill = document.getElementById('pill-licencia');
  const bannerGracia = document.getElementById('licencia-grace-banner');
  const overlaySusp = document.getElementById('overlay-licencia-suspendida');

  // 1. Pill en Cabecera
  if (pill) {
    if (lic.activa) {
      pill.className = 'pill pill-emerald';
      pill.innerHTML = `🟢 Abono al Día <small style="opacity:0.8;">(Vence ${lic.fechaVencimiento})</small>`;
    } else if (lic.enGracia) {
      pill.className = 'pill pill-amber';
      pill.innerHTML = `⚠️ Gracia: ${lic.diasHastaCorte}d restantes`;
    } else if (lic.suspendida) {
      pill.className = 'pill pill-red';
      pill.innerHTML = `🚫 Servicio Suspendido`;
    }
  }

  // 2. Banner de Gracia (+5 Días)
  if (bannerGracia) {
    if (lic.enGracia) {
      bannerGracia.style.display = 'block';
      const txtDias = document.getElementById('grace-dias-restantes');
      if (txtDias) txtDias.textContent = lic.diasHastaCorte;
      const btnMp = document.getElementById('btn-grace-mp');
      if (btnMp && lic.linkPagoMp) btnMp.href = lic.linkPagoMp;
    } else {
      bannerGracia.style.display = 'none';
    }
  }

  // 3. Overlay Bloqueante de Suspensión (Fecha Límite + 5 Días superados)
  if (overlaySusp) {
    if (lic.suspendida) {
      overlaySusp.style.display = 'flex';
      const btnSuspWa = document.getElementById('btn-susp-wa');
      if (btnSuspWa) {
        btnSuspWa.href = `https://wa.me/5493786414533?text=${encodeURIComponent(
          `Hola Grupo Nexora, mi servicio de Kiosco/Lubricentro se encuentra suspendido (Licencia ${lic.licenciaId}). Adjunto comprobante de transferencia a Brubank de $${lic.montoArs.toLocaleString('es-AR')} ARS (Alias: ${lic.aliasPago || 'javilo29'}, CBU: ${lic.cbuPago || '1430001713002240580018'}) para reactivación inmediata.`
        )}`;
      }
    } else {
      overlaySusp.style.display = 'none';
    }
  }

  // 4. Actualizar Modal de Pago Brubank & Nexora Pay
  const elId = document.getElementById('lic-info-id');
  if (elId) elId.textContent = lic.licenciaId;

  const elBadge = document.getElementById('lic-info-badge');
  if (elBadge) {
    if (lic.activa) {
      elBadge.className = 'pill pill-emerald';
      elBadge.textContent = '🟢 ACTIVA (Al Día)';
    } else if (lic.enGracia) {
      elBadge.className = 'pill pill-amber';
      elBadge.textContent = `⚠️ EN GRACIA (${lic.diasHastaCorte} días restantes)`;
    } else {
      elBadge.className = 'pill pill-red';
      elBadge.textContent = '🚫 SUSPENDIDA';
    }
  }

  const elVenc = document.getElementById('lic-info-venc');
  if (elVenc) elVenc.textContent = lic.fechaVencimiento;

  const elCorte = document.getElementById('lic-info-corte');
  if (elCorte) elCorte.textContent = `${lic.fechaLimiteCorte} (+${lic.diasGracia} días de gracia)`;

  const elMonto = document.getElementById('lic-info-monto');
  if (elMonto) elMonto.textContent = `$${lic.montoArs.toLocaleString('es-AR')} ARS / mes`;

  const elCardMonto = document.getElementById('lic-card-monto');
  if (elCardMonto) elCardMonto.textContent = `$${lic.montoArs.toLocaleString('es-AR')} ARS`;

  const elAlias = document.getElementById('txt-alias-val');
  if (elAlias) elAlias.textContent = lic.aliasPago || 'javilo29';

  const elCbu = document.getElementById('txt-cbu-val');
  if (elCbu) elCbu.textContent = lic.cbuPago || '1430001713002240580018';

  const elQr = document.getElementById('qr-brubank-pago');
  if (elQr) {
    elQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(lic.cbuPago || '1430001713002240580018')}`;
  }

  const elBtnWa = document.getElementById('lic-btn-wa-comprobante');
  if (elBtnWa) {
    elBtnWa.href = `https://wa.me/5493786414533?text=${encodeURIComponent(
      `Hola Grupo Nexora, adjunto comprobante de transferencia bancaria Brubank de $${lic.montoArs.toLocaleString('es-AR')} ARS (Alias: ${lic.aliasPago || 'javilo29'}, CBU: ${lic.cbuPago || '1430001713002240580018'}) para el abono de Kiosco/Lubricentro (Licencia ${lic.licenciaId}).`
    )}`;
  }
}

function copiarAlPortapapeles(texto, btnId) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => {
      mostrarFeedbackCopiado(btnId);
    }).catch(() => fallbackCopiar(texto, btnId));
  } else {
    fallbackCopiar(texto, btnId);
  }
}

function fallbackCopiar(texto, btnId) {
  const t = document.createElement('textarea');
  t.value = texto;
  t.style.position = 'fixed';
  t.style.opacity = '0';
  document.body.appendChild(t);
  t.select();
  try {
    document.execCommand('copy');
    mostrarFeedbackCopiado(btnId);
  } catch (e) {
    alert('Copiá manualmente: ' + texto);
  }
  document.body.removeChild(t);
}

function mostrarFeedbackCopiado(btnId) {
  if (!btnId) return;
  const btn = document.getElementById(btnId);
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ ¡Copiado!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copied');
    }, 2200);
  }
}

function abrirModalPagoLicencia() {
  const modal = document.getElementById('modal-pago-licencia');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalPagoLicencia() {
  const modal = document.getElementById('modal-pago-licencia');
  if (modal) modal.style.display = 'none';
}

async function reactivarLicenciaManual() {
  const key = document.getElementById('input-lic-reactivar-key')?.value?.trim();
  if (!key) {
    alert('Ingresá la clave de reactivación provista por Grupo Nexora.');
    return;
  }
  try {
    const res = await fetch('/api/licencia/reactivar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterKey: key, dias: 30 })
    });
    const data = await res.json();
    if (data.ok) {
      alert('🎉 ' + data.mensaje);
      cerrarModalPagoLicencia();
      if (data.licencia) renderEstadoLicencia(data.licencia);
    } else {
      alert('❌ Error: ' + (data.mensaje || data.error));
    }
  } catch (err) {
    alert('Error al conectar con el servidor: ' + err.message);
  }
}

async function desbloquearServicioSuspendido() {
  const key = document.getElementById('input-susp-key')?.value?.trim();
  if (!key) {
    alert('Por favor ingresá la clave de reactivación provista por soporte.');
    return;
  }
  try {
    const res = await fetch('/api/licencia/reactivar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterKey: key, dias: 30, override: 'auto' })
    });
    const data = await res.json();
    if (data.ok) {
      alert('✅ Servicio desbloqueado con éxito. Nueva fecha de vencimiento: ' + data.licencia.fechaVencimiento);
      const overlay = document.getElementById('overlay-licencia-suspendida');
      if (overlay) overlay.style.display = 'none';
      if (data.licencia) renderEstadoLicencia(data.licencia);
    } else {
      alert('❌ Clave de reactivación incorrecta.');
    }
  } catch (err) {
    alert('Error al intentar reactivar: ' + err.message);
  }
}

function mostrarNotificacionOTA(payload) {
  if (!payload || !payload.version) return;
  let toast = document.getElementById('ota-floating-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ota-floating-toast';
    toast.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999999; background:linear-gradient(135deg, #1e1b4b, #311042); border:1px solid #a855f7; border-radius:14px; padding:16px 20px; box-shadow:0 10px 30px rgba(168,85,247,0.4); max-width:380px; color:#fff;';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <strong style="color:#d8b4fe; font-size:0.92rem;">✨ Nora se actualizó a v${payload.version}</strong>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>
    </div>
    <div style="font-size:0.78rem; color:#cbd5e1; line-height:1.4; margin-bottom:10px;">
      ${payload.changelog || 'Nuevas mejoras de rendimiento, pasarela y sincronización aplicadas silenciosamente.'}
    </div>
    <button class="btn btn-success" onclick="location.reload()" style="font-size:0.78rem; width:100%; padding:6px 10px;">
      🔄 Refrescar Pantalla para Activar
    </button>
  `;
}
