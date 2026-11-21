/**
 * database.js - Motor Relacional Transaccional SQLite (better-sqlite3) en Modo WAL
 * Proyecto: Tren Agéntico Nexora One Engine ("By Nora") -> Administradora de IberáSoft POS
 * Ubicación: D:\Kioscos 2026\backend\database.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const SYNC_DIR = path.resolve(__dirname, '..', 'sincronizacion_iberasoft');
const COMPROBANTES_DIR = path.resolve(__dirname, '..', 'comprobantes_contador');

for (const dir of [DATA_DIR, SYNC_DIR, COMPROBANTES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SQLITE_FILE = path.join(DATA_DIR, 'kiosco_iberasoft.sqlite');

/**
 * Redondeo comercial para Kiosco (ej. múltiplos de $50 o $100 ARS para agilizar el vuelto)
 */
export function redondearPrecioKiosco(precioBruto, multiplo = 50) {
  const num = Number(precioBruto) || 0;
  if (!multiplo || multiplo <= 1) return Math.round(num);
  return Math.ceil(num / multiplo) * multiplo;
}

export function limpiarImporteArgentino(val, fallback = 1000) {
  if (typeof val === 'number') {
    // Si viene 10.4 pero en el ticket decía 10.400 (miles argentinos interpretados como decimales en JSON)
    if (val > 0 && val < 100 && String(val).includes('.')) {
      const parts = String(val).split('.');
      if (parts[1] && (parts[1].length === 1 || parts[1].length === 2 || parts[1].length === 3)) {
        return Math.round(val * 1000);
      }
    }
    return val;
  }
  if (!val) return fallback;
  let str = String(val).trim().replace(/[^0-9.,]/g, '');
  if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts.length > 1 && (parts[parts.length - 1].length === 3 || parts[parts.length - 1].length === 2)) {
      str = str.replace(/\./g, '');
    }
  } else if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) || n <= 0 ? fallback : n;
}

class KioscoDatabase {
  constructor() {
    this.db = new Database(SQLITE_FILE);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    this.initTables();
    this.seedDefaultsIfEmpty();
    this.exportarCSVCompatibleIberaSoft();
  }

  initTables() {
    this.db.exec(`
      -- 1. CATÁLOGO Y STOCK SINCRONIZADO CON IBERÁSOFT POS
      CREATE TABLE IF NOT EXISTS iberasoft_articulos (
        id TEXT PRIMARY KEY,
        codigo_barras TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rubro TEXT NOT NULL DEFAULT 'Almacén',
        proveedor TEXT DEFAULT 'General',
        costo_unitario REAL NOT NULL DEFAULT 0,
        margen_pct REAL NOT NULL DEFAULT 40,
        precio_venta REAL NOT NULL DEFAULT 0,
        stock_actual REAL NOT NULL DEFAULT 0,
        stock_minimo REAL NOT NULL DEFAULT 5,
        unidad TEXT NOT NULL DEFAULT 'Unidades',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. OPERARIOS DEL KIOSCO (RECONOCIMIENTO POR NOMBRE / VOZ / PIN)
      CREATE TABLE IF NOT EXISTS operarios (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL UNIQUE,
        rol TEXT NOT NULL DEFAULT 'Operador de Turno',
        turno_habitual TEXT NOT NULL DEFAULT 'Mañana',
        pin TEXT NOT NULL DEFAULT '1234',
        huella_voz_tag TEXT,
        activo INTEGER DEFAULT 1
      );

      -- 3. TURNOS Y CONTROL DE CAJA DIARIA
      CREATE TABLE IF NOT EXISTS turnos_caja (
        id TEXT PRIMARY KEY,
        operario_id TEXT,
        operario_nombre TEXT NOT NULL,
        turno_tipo TEXT NOT NULL DEFAULT 'Mañana',
        estado TEXT NOT NULL DEFAULT 'abierto',
        monto_inicial REAL NOT NULL DEFAULT 0,
        ventas_efectivo REAL NOT NULL DEFAULT 0,
        ventas_digital REAL NOT NULL DEFAULT 0,
        egresos_caja REAL NOT NULL DEFAULT 0,
        monto_esperado_efectivo REAL NOT NULL DEFAULT 0,
        monto_declarado_cierre REAL DEFAULT 0,
        diferencia_caja REAL DEFAULT 0,
        notas_cierre TEXT,
        fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre DATETIME
      );

      -- 4. MOVIMIENTOS DETALLADOS DE CAJA
      CREATE TABLE IF NOT EXISTS caja_movimientos (
        id TEXT PRIMARY KEY,
        turno_id TEXT NOT NULL,
        operario_nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        medio_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
        monto REAL NOT NULL DEFAULT 0,
        descripcion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. FACTURAS Y REMITOS (CON APROBACIÓN Y FILTRO DE MERCADERÍA QUE SÍ LLEGÓ)
      CREATE TABLE IF NOT EXISTS facturas_remitos (
        id TEXT PRIMARY KEY,
        proveedor TEXT NOT NULL,
        cuit_proveedor TEXT DEFAULT '',
        tipo_comprobante TEXT NOT NULL DEFAULT 'Factura B',
        numero_comprobante TEXT NOT NULL DEFAULT '0001-00000000',
        fecha_comprobante TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente_aprobacion',
        origen TEXT NOT NULL DEFAULT 'CAMARA_KIOSCO',
        operario_captura TEXT NOT NULL DEFAULT 'Operador',
        aprobado_por TEXT,
        margen_aplicado_pct REAL NOT NULL DEFAULT 40,
        redondeo_aplicado INTEGER NOT NULL DEFAULT 50,
        pagado_desde_caja INTEGER NOT NULL DEFAULT 0,
        medio_pago TEXT NOT NULL DEFAULT 'CUENTA_CORRIENTE',
        total_facturado REAL NOT NULL DEFAULT 0,
        total_recibido_real REAL NOT NULL DEFAULT 0,
        monto_nc_pendiente REAL NOT NULL DEFAULT 0,
        items_json TEXT NOT NULL,
        imagen_path TEXT,
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. NOTAS DE CRÉDITO PENDIENTES (MERCADERÍA FACTURADA QUE NO LLEGÓ)
      CREATE TABLE IF NOT EXISTS notas_credito_pendientes (
        id TEXT PRIMARY KEY,
        factura_id TEXT NOT NULL,
        proveedor TEXT NOT NULL,
        numero_comprobante_origen TEXT NOT NULL,
        monto_reclamo REAL NOT NULL DEFAULT 0,
        items_faltantes_json TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'PENDIENTE_RECLAMO',
        nc_resolucion_numero TEXT,
        fecha_reclamo DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_resolucion DATETIME
      );

      -- 7. LIBRO DIARIO CONTABLE (PARA ENTREGA MENSUAL AL CONTADOR)
      CREATE TABLE IF NOT EXISTS libro_diario_contable (
        id TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        tipo_asiento TEXT NOT NULL,
        comprobante_tipo TEXT NOT NULL,
        comprobante_nro TEXT NOT NULL,
        proveedor_o_responsable TEXT NOT NULL,
        cuit TEXT DEFAULT '',
        concepto TEXT NOT NULL,
        neto_gravado REAL NOT NULL DEFAULT 0,
        iva_21 REAL NOT NULL DEFAULT 0,
        total_debe REAL NOT NULL DEFAULT 0,
        total_haber REAL NOT NULL DEFAULT 0,
        medio_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
        referencia_id TEXT,
        respaldo_imagen TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. BITÁCORA DE MENSAJES Y ALERTAS WHATSAPP (OPERADOR <-> NORA <-> DUEÑO)
      CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
        id TEXT PRIMARY KEY,
        direccion TEXT NOT NULL,
        remitente TEXT NOT NULL,
        destinatario TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        tipo_alerta TEXT NOT NULL DEFAULT 'INFO',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. CONFIGURACIÓN GENERAL DEL KIOSCO Y REGLAS DE REMARCACIÓN
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );

      -- 10. BASE DE CONOCIMIENTO EVOLUTIVA DE NORA COPILOT (IBERÁSOFT + PANEL NORA)
      CREATE TABLE IF NOT EXISTS copilot_knowledge (
        id TEXT PRIMARY KEY,
        sistema TEXT NOT NULL DEFAULT 'PANEL_NORA', -- 'IBERASOFT_POS' | 'PANEL_NORA' | 'REGLA_KIOSCO'
        titulo TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'Operación Diaria',
        keywords TEXT NOT NULL,
        resumen TEXT NOT NULL,
        pasos_json TEXT NOT NULL, -- Array de pasos claros
        tab_destino TEXT DEFAULT '', -- Pestaña del panel a abrir si aplica
        selector_destacado TEXT DEFAULT '', -- Elemento visual a resaltar
        creado_por TEXT NOT NULL DEFAULT 'Sistema Nexora One',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  seedDefaultsIfEmpty() {
    const countConfig = this.db.prepare('SELECT COUNT(*) as c FROM configuracion').get().c;
    if (countConfig === 0) {
      const insertCfg = this.db.prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?)');
      insertCfg.run('nombre_kiosco', 'Maxikiosco 24Hs - IberáSoft + Nora AI');
      insertCfg.run('telefono_duenio', '+5491100000000');
      insertCfg.run('telefono_kiosco', '+5491111111111');
      insertCfg.run('margen_default_pct', '45');
      insertCfg.run('redondeo_multiplo', '50');
      insertCfg.run('iberasoft_ruta_detectada', 'MODO_ESPEJO_ACTIVO (Listo para vincular IberáSoft.lnk)');
      insertCfg.run('rubros_margenes_json', JSON.stringify({
        'Bebidas': 45,
        'Golosinas': 55,
        'Cigarrillos': 15,
        'Snacks': 50,
        'Almacén': 40,
        'Lácteos': 35,
        'Helados': 50
      }));
    }

    // Configuración inicial de suscripción y licencia (Fecha Límite + 5 Días de Gracia + Brubank / Nexora Pay)
    const insCfgIfNot = this.db.prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)');
    insCfgIfNot.run('licencia_id', 'NX-KIOSCO-2026');
    insCfgIfNot.run('licencia_dias_gracia', '5');
    insCfgIfNot.run('licencia_monto_mensual_ars', '69750');
    insCfgIfNot.run('licencia_banco', 'Banco Brubank S.A.U.');
    insCfgIfNot.run('licencia_alias_pago', 'javilo29');
    insCfgIfNot.run('licencia_cbu_pago', '1430001713002240580018');
    insCfgIfNot.run('licencia_titular_pago', 'Grupo Nexora / NexoraOne');
    insCfgIfNot.run('licencia_whatsapp_soporte', '+54 9 3786 414533');
    insCfgIfNot.run('licencia_estado_override', 'auto');

    const countOperarios = this.db.prepare('SELECT COUNT(*) as c FROM operarios').get().c;
    if (countOperarios === 0) {
      const insOp = this.db.prepare(`
        INSERT INTO operarios (id, nombre, rol, turno_habitual, pin, huella_voz_tag)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insOp.run('OP-01', 'Lucas', 'Operador Turno Mañana', 'Mañana', '1111', 'voz_lucas_512d');
      insOp.run('OP-02', 'Martín', 'Operador Turno Tarde', 'Tarde', '2222', 'voz_martin_512d');
      insOp.run('OP-03', 'Sofía', 'Operadora Turno Noche', 'Noche', '3333', 'voz_sofia_512d');
      insOp.run('OP-04', 'Titular / Admin', 'Dueño / Administrador General', 'General', '9999', 'voz_admin_512d');
    } else {
      this.db.prepare("UPDATE operarios SET nombre = 'Titular / Admin' WHERE pin = '9999'").run();
    }

    const flagLimpiados = this.db.prepare("SELECT valor FROM configuracion WHERE clave = 'ejemplos_limpiados'").get()?.valor === '1';

    const countArt = this.db.prepare('SELECT COUNT(*) as c FROM iberasoft_articulos').get().c;
    if (countArt === 0 && !flagLimpiados) {
      const insArt = this.db.prepare(`
        INSERT INTO iberasoft_articulos (
          id, codigo_barras, nombre, rubro, proveedor, costo_unitario, margen_pct, precio_venta, stock_actual, stock_minimo, unidad
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const catalogoInicial = [
        ['IB-1001', '7790895000997', 'Coca-Cola Sabor Original 2.25L', 'Bebidas', 'Coca-Cola FEMSA', 2100, 45, 3050, 18, 6, 'Unidades'],
        ['IB-1002', '7790895000782', 'Coca-Cola Sin Azúcares 500ml', 'Bebidas', 'Coca-Cola FEMSA', 950, 45, 1400, 4, 8, 'Unidades'],
        ['IB-1003', '7790387015522', 'Agua Mineral Villavicencio 1.5L', 'Bebidas', 'Danone Aguas', 880, 45, 1300, 12, 5, 'Unidades'],
        ['IB-1004', '7790580112202', 'Alfajor Jorgito Chocolate 55g', 'Golosinas', 'Distribuidora Arcor', 620, 55, 1000, 24, 10, 'Unidades'],
        ['IB-1005', '7790580341008', 'Gomitas Mogul Ositos 30g', 'Golosinas', 'Distribuidora Arcor', 380, 55, 600, 3, 12, 'Unidades'],
        ['IB-1006', '7790580998813', 'Chocolate Cofler Block 38g', 'Golosinas', 'Distribuidora Arcor', 890, 55, 1400, 15, 6, 'Unidades'],
        ['IB-1007', '7791813000129', 'Marlboro Box 20 Cigarrillos', 'Cigarrillos', 'Massalin Particulares', 3100, 15, 3600, 5, 10, 'Atados'],
        ['IB-1008', '7791813000440', 'Philip Morris Box 20', 'Cigarrillos', 'Massalin Particulares', 2750, 15, 3200, 14, 10, 'Atados'],
        ['IB-1009', '7790310981122', 'Papas Fritas Lays Clásicas 85g', 'Snacks', 'PepsiCo Snacks', 1450, 50, 2200, 9, 5, 'Unidades'],
        ['IB-1010', '7793704000016', 'Yerba Mate Playadito 500g', 'Almacén', 'Mayorista El Sol', 1900, 40, 2700, 7, 4, 'Paquetes']
      ];

      const tx = this.db.transaction(() => {
        for (const row of catalogoInicial) {
          insArt.run(...row);
        }
      });
      tx();
    }

    // Abrir un turno inicial si no hay ningún turno registrado y no se limpiaron los ejemplos
    const countTurnos = this.db.prepare('SELECT COUNT(*) as c FROM turnos_caja').get().c;
    if (countTurnos === 0 && !flagLimpiados) {
      this.abrirTurnoCaja({
        operarioNombre: 'Lucas',
        turnoTipo: 'Mañana',
        montoInicial: 35000
      });
    }

    // Sembrar Manual Operativo Inicial de Nora Copilot (IberáSoft POS + Panel Nora)
    const countCopilot = this.db.prepare('SELECT COUNT(*) as c FROM copilot_knowledge').get().c;
    if (countCopilot === 0) {
      const insCop = this.db.prepare(`
        INSERT INTO copilot_knowledge (
          id, sistema, titulo, categoria, keywords, resumen, pasos_json, tab_destino, selector_destacado, creado_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const manualInicial = [
        [
          'COP-NORA-01',
          'PANEL_NORA',
          'Cómo cargar una Factura o Remito con Cámara y descartar mercadería que NO llegó',
          'Recepción de Mercadería',
          'factura,remito,camara,cámara,foto,cargar,stock,no vino,faltante,nota de credito,crédito,destildar,llegó',
          'Escaneá la factura al recibir al proveedor, destildá lo que no bajó del camión para que no ensucie el stock y aprobá para actualizar precios.',
          JSON.stringify([
            '1. Andá a la Pestaña 1 ("📸 Facturas, Remitos & Recepción Parcial") y tocá "🎥 Encender Cámara" o "📁 Subir Imagen" para que Nora lea los renglones.',
            '2. En la tabla amarilla de Pre-Aprobación, verificá la columna "¿Llegó al Local?": dejá tildado [✅ Llegó] lo que recibiste y destildá [❌ No vino (NC)] cualquier producto facturado que haya faltado.',
            '3. Revisá el % de margen de ganancia y presioná el botón verde "✅ Aprobar Mercadería Recibida": Nora sumará al stock solo lo que llegó y creará el reclamo de Nota de Crédito por lo faltante.'
          ]),
          'tab-facturas',
          '#btn-open-cam',
          'Nexora One Core'
        ],
        [
          'COP-NORA-02',
          'PANEL_NORA',
          'Cómo abrir y cerrar el Turno de Caja reconociendo al Operario',
          'Caja y Turnos',
          'caja,turno,abrir,cerrar,operario,efectivo,arqueo,inicio,cierre,diferencia,plata,dinero',
          'Registrá quién está a cargo del mostrador, con cuánto cambio inicia el cajón y realizá el arqueo al terminar el turno.',
          JSON.stringify([
            '1. Entrá a la Pestaña 3 ("💰 Caja Diaria & Turnos por Operario") o decile por micrófono: "Nora, soy [tu nombre]".',
            '2. Al iniciar tu turno, elegí tu nombre, la franja (Mañana/Tarde/Noche) y escribí con cuánto efectivo físico arranca la caja.',
            '3. Al terminar tu horario, contá los billetes del cajón, ingresá el monto en "¿Con cuánto efectivo físico cierra?" y tocá "🔒 Cerrar Turno": Nora calculará si da exacta y le avisará al dueño.'
          ]),
          'tab-caja',
          '#panel-gestion-turno',
          'Nexora One Core'
        ],
        [
          'COP-NORA-03',
          'PANEL_NORA',
          'Cómo ver los Productos en Límite Mínimo y enviar el Informe de Faltantes',
          'Control de Stock',
          'faltantes,stock minimo,mínimo,reponer,pedido,preventista,alerta,pocas unidades,agotado',
          'Consultá qué artículos tocaron el stock mínimo configurado por el kiosco y enviale la lista de reposición al dueño o preventista.',
          JSON.stringify([
            '1. Abrí la Pestaña 2 ("📦 Stock IberáSoft, Precios (%) y Faltantes").',
            '2. En el cuadro superior rojo ("🚨 Informe Automático de Faltantes") verás todos los productos cuyo stock actual es igual o menor al límite mínimo.',
            '3. Tocá "📲 Enviar Informe de Faltantes al WhatsApp del Dueño" o "💬 Compartir por WhatsApp Web" para mandar el pedido armado.'
          ]),
          'tab-stock',
          '#tabla-faltantes-minimos',
          'Nexora One Core'
        ],
        [
          'COP-NORA-04',
          'PANEL_NORA',
          'Cómo saldar una Nota de Crédito y descargar el Libro Diario para el Contador',
          'Contabilidad y Contador',
          'contador,libro diario,excel,csv,nota de credito,saldar,fin de mes,impuestos,iva,compras',
          'Gestioná los créditos pendientes con proveedores y exportá a fin de mes la planilla contable completa.',
          JSON.stringify([
            '1. Abrí la Pestaña 4 ("📒 Libro Diario Contador & Notas de Crédito").',
            '2. Cuando un proveedor te traiga la Nota de Crédito por mercadería que había faltado en un pedido anterior, tocá "🧾 Recibí Nota de Crédito (Saldar)".',
            '3. A fin de mes, presioná "📥 Descargar Libro Diario Excel (.CSV) para el Contador" para entregar todos los asientos y la carpeta de fotos de facturas.'
          ]),
          'tab-contabilidad',
          '#tabla-libro-diario',
          'Nexora One Core'
        ],
        [
          'COP-IBERA-01',
          'IBERASOFT_POS',
          'IberáSoft POS: Cómo actualizar Stock y Precios masivamente desde Nora',
          'Integración IberáSoft',
          'iberasoft,ibera,importar,excel,csv,precios,actualizar,sincronizar,lista,sistema',
          'Cómo impactar o importar en el programa de escritorio IberáSoft las subidas de stock y remarcaciones de precios aprobadas por Nora.',
          JSON.stringify([
            '1. Cada vez que aprobás una factura en Nora, el sistema actualiza automáticamente el archivo `sincronizacion_iberasoft/lista_precios_stock_iberasoft.csv` (también podés descargarlo en Pestaña 2 -> "📥 Descargar Planilla CSV para IberáSoft").',
            '2. En la ventana de escritorio de IberáSoft POS, entrá al menú "Artículos / Stock" -> "Actualización Masiva / Importar desde Excel o CSV".',
            '3. Seleccioná el archivo generado por Nora, verificá las columnas (Código, Código de Barras, Costo, % Margen, Precio Venta y Stock) y confirmá para que el mostrador cobre al nuevo precio.'
          ]),
          'tab-stock',
          '#tabla-articulos-iberasoft',
          'Manual IberáSoft POS'
        ],
        [
          'COP-IBERA-02',
          'IBERASOFT_POS',
          'IberáSoft POS: Cómo cobrar rápido con Lector de Barras y Facturación en Espera',
          'Mostrador IberáSoft',
          'iberasoft,cobrar,venta,lector,codigo de barras,espera,cliente,ticket,factura electronica,arca,afip',
          'Procedimiento estándar de venta rápida en mostrador de IberáSoft para no frenar la fila del kiosco.',
          JSON.stringify([
            '1. En la pantalla principal de Punto de Venta de IberáSoft, pasá el producto por el lector de código de barras (o buscá por nombre con F2/F3).',
            '2. Si el cliente se olvidó algo o va a buscar otro producto a la heladera, usá la función "Facturación en Espera" para dejar su cuenta pausada y cobrarle al siguiente cliente de la fila.',
            '3. Elegí el medio de pago (Efectivo con cálculo de vuelto, MercadoPago o Tarjeta con recargo automático) y cerrá el comprobante (Ticket interno o Factura Electrónica ARCA/AFIP).'
          ]),
          '',
          '',
          'Manual IberáSoft POS'
        ],
        [
          'COP-IBERA-03',
          'IBERASOFT_POS',
          'IberáSoft POS: Cómo configurar Promociones, Combos y Ofertas por Cantidad',
          'Promos IberáSoft',
          'iberasoft,promo,promocion,combo,oferta,descuento,2x1,cantidad,golosinas,bebidas',
          'Cómo armar combos de kiosco (ej. Panchos + Gaseosa o 3x2 en alfajores) dentro de IberáSoft.',
          JSON.stringify([
            '1. En IberáSoft de escritorio, abrí el módulo "Artículos" -> "Promociones / Combos".',
            '2. Creá un nuevo combo asignándole un código rápido de mostrador y seleccioná los artículos que lo componen para que descuente el stock de cada integrante al venderse.',
            '3. Definí el precio final promocional o el descuento por cantidad (ej. llevando 3 unidades) y guardá.'
          ]),
          '',
          '',
          'Manual IberáSoft POS'
        ]
      ];

      const txCop = this.db.transaction(() => {
        for (const row of manualInicial) {
          insCop.run(...row);
        }
      });
      txCop();
    }
  }

  // =========================================================================
  // 1. CONFIGURACIÓN Y REGLAS DE PORCENTAJE
  // =========================================================================
  getConfig() {
    const rows = this.db.prepare('SELECT clave, valor FROM configuracion').all();
    const cfg = {};
    for (const r of rows) {
      if (r.clave.endsWith('_json')) {
        try {
          cfg[r.clave] = JSON.parse(r.valor);
        } catch {
          cfg[r.clave] = {};
        }
      } else {
        cfg[r.clave] = r.valor;
      }
    }
    return cfg;
  }

  updateConfig(updates = {}) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)');
    const tx = this.db.transaction(() => {
      for (const [k, v] of Object.entries(updates)) {
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        stmt.run(k, valStr);
      }
    });
    tx();
    return this.getConfig();
  }

  // =========================================================================
  // 1.1 GESTIÓN DE LICENCIA, FECHA LÍMITE + 5 DÍAS DE GRACIA Y SUSPENSIÓN
  // =========================================================================
  getEstadoLicencia() {
    const cfg = this.getConfig();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const licenciaId = cfg.licencia_id || 'NX-KIOSCO-2026';
    const diasGracia = parseInt(cfg.licencia_dias_gracia || '5', 10);
    const montoArs = parseInt(cfg.licencia_monto_mensual_ars || '69750', 10);
    const banco = cfg.licencia_banco || 'Banco Brubank S.A.U.';
    const aliasPago = cfg.licencia_alias_pago || 'javilo29';
    const cbuPago = cfg.licencia_cbu_pago || '1430001713002240580018';
    const titularPago = cfg.licencia_titular_pago || 'Grupo Nexora / NexoraOne';
    const whatsappSoporte = cfg.licencia_whatsapp_soporte || '+54 9 3786 414533';
    const override = (cfg.licencia_estado_override || 'auto').toLowerCase();

    // Si no está seteada la fecha de vencimiento, inicializarla a 30 días a partir de hoy
    let fechaVencStr = cfg.licencia_fecha_vencimiento;
    if (!fechaVencStr) {
      const fechaDef = new Date(hoy);
      fechaDef.setDate(fechaDef.getDate() + 30);
      fechaVencStr = fechaDef.toISOString().split('T')[0];
      this.db.prepare("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('licencia_fecha_vencimiento', ?)").run(fechaVencStr);
    }

    const fechaVenc = new Date(fechaVencStr + 'T00:00:00');
    const fechaLimiteCorte = new Date(fechaVenc);
    fechaLimiteCorte.setDate(fechaLimiteCorte.getDate() + diasGracia);

    const diffMsVenc = fechaVenc.getTime() - hoy.getTime();
    const diasHastaVenc = Math.ceil(diffMsVenc / (1000 * 60 * 60 * 24));

    const diffMsCorte = fechaLimiteCorte.getTime() - hoy.getTime();
    const diasHastaCorte = Math.ceil(diffMsCorte / (1000 * 60 * 60 * 24));

    let estado = 'ACTIVA';
    if (override === 'suspendido' || override === 'suspendida') {
      estado = 'SUSPENDIDA';
    } else if (override === 'gracia' || override === 'en_gracia') {
      estado = 'EN_GRACIA';
    } else if (override === 'activo' || override === 'activa') {
      estado = 'ACTIVA';
    } else {
      // Regla de negocio estricta:
      // Si hoy <= fechaVencimiento: ACTIVA
      // Si hoy > fechaVencimiento pero <= fechaLimiteCorte (+5 días): EN_GRACIA
      // Si hoy > fechaLimiteCorte (+5 días): SUSPENDIDA
      if (diasHastaCorte < 0) {
        estado = 'SUSPENDIDA';
      } else if (diasHastaVenc < 0) {
        estado = 'EN_GRACIA';
      } else {
        estado = 'ACTIVA';
      }
    }

    return {
      licenciaId,
      estado, // 'ACTIVA' | 'EN_GRACIA' | 'SUSPENDIDA'
      activa: estado === 'ACTIVA',
      enGracia: estado === 'EN_GRACIA',
      suspendida: estado === 'SUSPENDIDA',
      fechaVencimiento: fechaVencStr,
      fechaLimiteCorte: fechaLimiteCorte.toISOString().split('T')[0],
      diasHastaVenc,
      diasHastaCorte: Math.max(0, diasHastaCorte),
      diasGracia,
      montoArs,
      banco,
      aliasPago,
      cbuPago,
      titularPago,
      whatsappSoporte
    };
  }

  reactivarLicencia(dias = 30) {
    const hoy = new Date();
    const nuevaFecha = new Date(hoy);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    const fechaStr = nuevaFecha.toISOString().split('T')[0];
    this.updateConfig({
      licencia_fecha_vencimiento: fechaStr,
      licencia_estado_override: 'auto'
    });
    return this.getEstadoLicencia();
  }

  // =========================================================================
  // 2. GESTIÓN DE STOCK, LÍMITES MÍNIMOS Y SINCRONIZACIÓN CON IBERÁSOFT
  // =========================================================================
  getArticulos() {
    return this.db.prepare('SELECT * FROM iberasoft_articulos ORDER BY rubro ASC, nombre ASC').all();
  }

  getFaltantesStockMinimo() {
    return this.db.prepare(`
      SELECT *,
        (stock_minimo - stock_actual) AS Deficit,
        MAX(stock_minimo * 2 - stock_actual, stock_minimo) AS cantidad_sugerida_pedido
      FROM iberasoft_articulos
      WHERE stock_actual <= stock_minimo
      ORDER BY (stock_actual - stock_minimo) ASC, rubro ASC
    `).all();
  }

  actualizarLimiteMinimoYMargen({ articuloId, stockMinimo, margenPct, precioVenta }) {
    const art = this.db.prepare('SELECT * FROM iberasoft_articulos WHERE id = ?').get(articuloId);
    if (!art) throw new Error('Artículo no encontrado en IberáSoft');

    const cfg = this.getConfig();
    const multiplo = Number(cfg.redondeo_multiplo) || 50;
    const nuevoMin = stockMinimo !== undefined ? Number(stockMinimo) : art.stock_minimo;
    const nuevoMargen = margenPct !== undefined ? Number(margenPct) : art.margen_pct;
    const nuevoPrecio = precioVenta !== undefined
      ? Number(precioVenta)
      : redondearPrecioKiosco(art.costo_unitario * (1 + nuevoMargen / 100), multiplo);

    this.db.prepare(`
      UPDATE iberasoft_articulos
      SET stock_minimo = ?, margen_pct = ?, precio_venta = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nuevoMin, nuevoMargen, nuevoPrecio, articuloId);

    this.exportarCSVCompatibleIberaSoft();
    return this.db.prepare('SELECT * FROM iberasoft_articulos WHERE id = ?').get(articuloId);
  }

  /**
   * Registra una venta proveniente del mostrador de IberáSoft, descuenta stock,
   * suma a la caja del turno activo y dispara alerta si toca el límite mínimo.
   */
  registrarVentaMostradorIberaSoft({ articuloId, cantidad = 1, medioPago = 'EFECTIVO' }) {
    const art = this.db.prepare('SELECT * FROM iberasoft_articulos WHERE id = ?').get(articuloId);
    if (!art) throw new Error('Artículo no encontrado');

    const cant = Number(cantidad) || 1;
    const nuevoStock = Math.max(0, Number(art.stock_actual) - cant);
    const subtotal = cant * Number(art.precio_venta);

    let alertaDisparada = null;

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE iberasoft_articulos
        SET stock_actual = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nuevoStock, articuloId);

      // Impactar en la caja del turno activo
      const turno = this.getTurnoActivo();
      if (turno) {
        const movId = `MOV-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
        this.db.prepare(`
          INSERT INTO caja_movimientos (id, turno_id, operario_nombre, tipo, medio_pago, monto, descripcion)
          VALUES (?, ?, ?, 'VENTA_MOSTRADOR', ?, ?, ?)
        `).run(movId, turno.id, turno.operario_nombre, medioPago, subtotal, `Venta IberáSoft: ${cant}x ${art.nombre}`);

        if (medioPago === 'EFECTIVO') {
          this.db.prepare(`
            UPDATE turnos_caja
            SET ventas_efectivo = ventas_efectivo + ?,
                monto_esperado_efectivo = monto_inicial + ventas_efectivo + ? - egresos_caja
            WHERE id = ?
          `).run(subtotal, subtotal, turno.id);
        } else {
          this.db.prepare(`
            UPDATE turnos_caja
            SET ventas_digital = ventas_digital + ?
            WHERE id = ?
          `).run(subtotal, turno.id);
        }
      }

      // Verificar si acaba de tocar o perforar el límite mínimo
      if (nuevoStock <= art.stock_minimo) {
        const msg = `🚨 [ALERTA DE FALTANTE - NORA]: El producto "${art.nombre}" (${art.rubro}) tocó el límite mínimo en IberáSoft. Stock actual: ${nuevoStock} ${art.unidad} (Mínimo exigido: ${art.stock_minimo}). Proveedor habitual: ${art.proveedor}.`;
        alertaDisparada = this.registrarMensajeWhatsApp({
          direccion: 'SALIENTE_DUENIO',
          remitente: 'Nora AI (Control Stock)',
          destinatario: 'Dueño del Kiosco',
          mensaje: msg,
          tipoAlerta: 'STOCK_MINIMO'
        });
      }
    });

    tx();
    this.exportarCSVCompatibleIberaSoft();

    return {
      articulo: this.db.prepare('SELECT * FROM iberasoft_articulos WHERE id = ?').get(articuloId),
      subtotal,
      tocoMinimo: nuevoStock <= art.stock_minimo,
      alertaDisparada
    };
  }

  /**
   * Busca el artículo más parecido en el catálogo de IberáSoft (por código de barras o nombre)
   */
  buscarArticuloPorNombreOCodigo(nombreOCodigo = '', rubroSugerido = 'Almacén') {
    const limpio = String(nombreOCodigo || '').trim().toLowerCase();
    if (!limpio) return null;

    const todos = this.getArticulos();
    // 1. Coincidencia exacta por código o EAN
    let match = todos.find(
      (a) => a.id.toLowerCase() === limpio || a.codigo_barras.toLowerCase() === limpio
    );
    if (match) return match;

    // 2. Coincidencia por palabras clave del nombre
    const palabras = limpio
      .replace(/[^a-záéíóúñ0-9\s\.]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    let mejorScore = 0;
    let mejorArt = null;

    for (const art of todos) {
      const nombreArt = art.nombre.toLowerCase();
      if (nombreArt === limpio) return art;
      let score = 0;
      for (const p of palabras) {
        if (nombreArt.includes(p)) score += 1;
      }
      if (score > mejorScore && score >= Math.min(2, palabras.length)) {
        mejorScore = score;
        mejorArt = art;
      }
    }

    return mejorArt;
  }

  // =========================================================================
  // 3. FACTURAS Y REMITOS: PRE-CARGA, FILTRO DE MERCADERÍA RECIBIDA VS. NC
  // =========================================================================
  getFacturasRemitos() {
    const rows = this.db.prepare('SELECT * FROM facturas_remitos ORDER BY created_at DESC').all();
    return rows.map((r) => ({
      ...r,
      items: JSON.parse(r.items_json || '[]')
    }));
  }

  getNotasCreditoPendientes() {
    const rows = this.db.prepare('SELECT * FROM notas_credito_pendientes ORDER BY fecha_reclamo DESC').all();
    return rows.map((r) => ({
      ...r,
      items_faltantes: JSON.parse(r.items_faltantes_json || '[]')
    }));
  }

  /**
   * Crea un borrador de factura/remito leído por Nora (Cámara o WhatsApp)
   * que queda en estado 'pendiente_aprobacion' hasta que el operador o el dueño
   * elija qué mercadería llegó realmente y confirme la subida al stock.
   */
  crearBorradorFactura({
    proveedor,
    cuitProveedor = '',
    tipoComprobante = 'Factura B',
    numeroComprobante = '',
    fechaComprobante = '',
    origen = 'CAMARA_KIOSCO',
    operarioCaptura = 'Operador',
    margenPct = null,
    items = [],
    imagenPath = '',
    notas = ''
  }) {
    const cfg = this.getConfig();
    const multiplo = Number(cfg.redondeo_multiplo) || 50;
    const margenDefault = Number(margenPct ?? cfg.margen_default_pct) || 45;
    const rubrosMargenes = cfg.rubros_margenes_json || {};

    const id = `FAC-${Date.now()}`;
    const nro = numeroComprobante || `0001-${String(Math.floor(Math.random() * 899999 + 100000))}`;
    const fecha = fechaComprobante || new Date().toISOString().split('T')[0];

    const itemsEnriquecidos = items.map((item, idx) => {
      const rawName = item.name || item.nombre || item.n || item.articulo || item.producto || `Artículo ${idx + 1}`;
      const matchArt = this.buscarArticuloPorNombreOCodigo(rawName);
      const rubro = item.rubro || item.r || matchArt?.rubro || 'Almacén';
      const margenItem = Number(
        item.margen_pct ?? (margenPct !== null ? margenPct : (rubrosMargenes[rubro] ?? matchArt?.margen_pct ?? margenDefault))
      );
      const cantFacturada = Number(item.quantity ?? item.cantidad_facturada ?? item.cant ?? item.q ?? 1);
      const cantRecibida = Number(item.cantidad_recibida ?? cantFacturada);
      const recibido = item.recibido !== undefined ? Boolean(item.recibido) : true;
      const rawCosto = item.costPerUnit ?? item.costo_unitario ?? item.costo ?? item.c ?? matchArt?.costo_unitario ?? 1000;
      const costoUnitario = limpiarImporteArgentino(rawCosto, 1000);
      const nuevoPrecioVenta = redondearPrecioKiosco(costoUnitario * (1 + margenItem / 100), multiplo);

      return {
        linea_id: idx + 1,
        articulo_id: matchArt ? matchArt.id : null,
        codigo_barras: matchArt ? matchArt.codigo_barras : (item.codigo_barras || `779${Math.floor(1000000000 + Math.random() * 8999999999)}`),
        nombre: matchArt ? matchArt.nombre : rawName,
        es_articulo_nuevo: !matchArt,
        rubro,
        unidad: item.unit || item.u || item.unidad || matchArt?.unidad || 'Unidades',
        cantidad_facturada: cantFacturada,
        cantidad_recibida: recibido ? cantRecibida : 0,
        recibido, // true = Llegó y entra al stock; false = No vino en el pedido (reclamar Nota de Crédito)
        costo_anterior: matchArt ? matchArt.costo_unitario : costoUnitario,
        costo_unitario: costoUnitario,
        margen_pct: margenItem,
        precio_venta_anterior: matchArt ? matchArt.precio_venta : nuevoPrecioVenta,
        nuevo_precio_venta: nuevoPrecioVenta,
        subtotal_facturado: cantFacturada * costoUnitario,
        subtotal_recibido: (recibido ? cantRecibida : 0) * costoUnitario,
        subtotal_faltante_nc: Math.max(0, cantFacturada - (recibido ? cantRecibida : 0)) * costoUnitario
      };
    });

    const totalFacturado = itemsEnriquecidos.reduce((acc, i) => acc + i.subtotal_facturado, 0);
    const totalRecibidoReal = itemsEnriquecidos.reduce((acc, i) => acc + i.subtotal_recibido, 0);
    const montoNcPendiente = itemsEnriquecidos.reduce((acc, i) => acc + i.subtotal_faltante_nc, 0);

    this.db.prepare(`
      INSERT INTO facturas_remitos (
        id, proveedor, cuit_proveedor, tipo_comprobante, numero_comprobante, fecha_comprobante,
        estado, origen, operario_captura, margen_aplicado_pct, redondeo_aplicado,
        total_facturado, total_recibido_real, monto_nc_pendiente, items_json, imagen_path, notas
      ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente_aprobacion', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      proveedor || 'Proveedor Mayorista',
      cuitProveedor,
      tipoComprobante,
      nro,
      fecha,
      origen,
      operarioCaptura,
      margenDefault,
      multiplo,
      totalFacturado,
      totalRecibidoReal,
      montoNcPendiente,
      JSON.stringify(itemsEnriquecidos),
      imagenPath,
      notas
    );

    // Notificar al WhatsApp del Dueño que hay un comprobante listo para aprobación
    this.registrarMensajeWhatsApp({
      direccion: 'SALIENTE_DUENIO',
      remitente: `Nora AI (${origen})`,
      destinatario: 'Dueño del Kiosco',
      mensaje: `📸 [FACTURA LEÍDA - PENDIENTE DE APROBACIÓN]: ${tipoComprobante} Nº ${nro} de "${proveedor}". Total facturado: $${totalFacturado.toLocaleString('es-AR')} (${itemsEnriquecidos.length} ítems). Capturada por: ${operarioCaptura}. Verificá qué mercadería llegó para impactar stock y precios en IberáSoft.`,
      tipoAlerta: 'FACTURA_RECIBIDA'
    });

    return this.getFacturaById(id);
  }

  getFacturaById(id) {
    const row = this.db.prepare('SELECT * FROM facturas_remitos WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      items: JSON.parse(row.items_json || '[]')
    };
  }

  /**
   * APRUEBA LA FACTURA CON SELECCIÓN DE MERCADERÍA QUE SÍ LLEGÓ:
   * 1. Solo suma al stock de IberáSoft los productos con recibido = true (y por la cantidad_recibida real).
   * 2. Actualiza los precios de venta aplicando el % de margen de cada producto sobre el nuevo costo.
   * 3. Si hubo productos descartados o que vinieron de menos, crea el Reclamo de Nota de Crédito Pendiente.
   * 4. Asienta la operación en el Libro Diario Contable para el contador.
   */
  aprobarFacturaEImpactarStock({
    facturaId,
    itemsModificados = null,
    margenGlobalPct = null,
    redondeoMultiplo = null,
    aprobadoPor = 'Operador / Dueño',
    pagadoDesdeCaja = false,
    medioPago = 'EFECTIVO'
  }) {
    const factura = this.getFacturaById(facturaId);
    if (!factura) throw new Error('Comprobante no encontrado');
    if (factura.estado.startsWith('aprobada')) {
      throw new Error('Este comprobante ya fue aprobado e impactado en el stock de IberáSoft.');
    }

    const cfg = this.getConfig();
    const multiplo = Number(redondeoMultiplo ?? factura.redondeo_aplicado ?? cfg.redondeo_multiplo) || 50;
    const rawItems = itemsModificados || factura.items;

    // Recalcular cada renglón según lo que el usuario tildó como recibido o descartado
    const itemsFinales = rawItems.map((item) => {
      const recibido = Boolean(item.recibido);
      const cantFacturada = Number(item.cantidad_facturada) || 0;
      const cantRecibida = recibido ? Math.max(0, Number(item.cantidad_recibida ?? cantFacturada)) : 0;
      const costoUnitario = Number(item.costo_unitario) || 0;
      const margenItem = Number(margenGlobalPct !== null && margenGlobalPct !== '' ? margenGlobalPct : item.margen_pct) || 40;
      const nuevoPrecioVenta = item.nuevo_precio_venta_manual
        ? Number(item.nuevo_precio_venta_manual)
        : redondearPrecioKiosco(costoUnitario * (1 + margenItem / 100), multiplo);

      const cantFaltante = Math.max(0, cantFacturada - cantRecibida);

      return {
        ...item,
        recibido: cantRecibida > 0,
        cantidad_facturada: cantFacturada,
        cantidad_recibida: cantRecibida,
        cantidad_faltante_nc: cantFaltante,
        costo_unitario: costoUnitario,
        margen_pct: margenItem,
        nuevo_precio_venta: nuevoPrecioVenta,
        subtotal_facturado: cantFacturada * costoUnitario,
        subtotal_recibido: cantRecibida * costoUnitario,
        subtotal_faltante_nc: cantFaltante * costoUnitario
      };
    });

    const totalFacturado = itemsFinales.reduce((s, i) => s + i.subtotal_facturado, 0);
    const totalRecibidoReal = itemsFinales.reduce((s, i) => s + i.subtotal_recibido, 0);
    const montoNcPendiente = itemsFinales.reduce((s, i) => s + i.subtotal_faltante_nc, 0);
    const itemsQueLlegaron = itemsFinales.filter((i) => i.recibido && i.cantidad_recibida > 0);
    const itemsFaltantesNC = itemsFinales.filter((i) => i.cantidad_faltante_nc > 0);

    const estadoFinal = itemsFaltantesNC.length > 0 ? 'aprobada_parcial_con_nc' : 'aprobada_completa';
    const articulosActualizados = [];
    let notaCreditoCreada = null;

    const tx = this.db.transaction(() => {
      // A. Impactar en Stock y Precios de IberáSoft SOLO la mercadería que sí llegó
      for (const item of itemsQueLlegaron) {
        let artExistente = item.articulo_id
          ? this.db.prepare('SELECT * FROM iberasoft_articulos WHERE id = ?').get(item.articulo_id)
          : this.buscarArticuloPorNombreOCodigo(item.nombre);

        if (artExistente) {
          const nuevoStock = Number(artExistente.stock_actual) + Number(item.cantidad_recibida);
          this.db.prepare(`
            UPDATE iberasoft_articulos
            SET stock_actual = ?,
                costo_unitario = ?,
                margen_pct = ?,
                precio_venta = ?,
                proveedor = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            nuevoStock,
            item.costo_unitario,
            item.margen_pct,
            item.nuevo_precio_venta,
            factura.proveedor,
            artExistente.id
          );
          articulosActualizados.push({
            id: artExistente.id,
            nombre: artExistente.nombre,
            stockAnterior: artExistente.stock_actual,
            stockNuevo: nuevoStock,
            precioAnterior: artExistente.precio_venta,
            precioNuevo: item.nuevo_precio_venta,
            margenPct: item.margen_pct
          });
        } else {
          // Si es un producto nuevo para el kiosco, darlo de alta en IberáSoft
          const nuevoId = `IB-${Math.floor(2000 + Math.random() * 7999)}`;
          this.db.prepare(`
            INSERT INTO iberasoft_articulos (
              id, codigo_barras, nombre, rubro, proveedor, costo_unitario, margen_pct, precio_venta, stock_actual, stock_minimo, unidad
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, ?)
          `).run(
            nuevoId,
            item.codigo_barras || `779${Math.floor(1000000000 + Math.random() * 8999999999)}`,
            item.nombre,
            item.rubro || 'Almacén',
            factura.proveedor,
            item.costo_unitario,
            item.margen_pct,
            item.nuevo_precio_venta,
            item.cantidad_recibida,
            item.unidad || 'Unidades'
          );
          articulosActualizados.push({
            id: nuevoId,
            nombre: item.nombre,
            stockAnterior: 0,
            stockNuevo: item.cantidad_recibida,
            precioAnterior: 0,
            precioNuevo: item.nuevo_precio_venta,
            margenPct: item.margen_pct
          });
        }
      }

      // B. Actualizar estado de la factura
      this.db.prepare(`
        UPDATE facturas_remitos
        SET estado = ?,
            aprobado_por = ?,
            redondeo_aplicado = ?,
            pagado_desde_caja = ?,
            medio_pago = ?,
            total_facturado = ?,
            total_recibido_real = ?,
            monto_nc_pendiente = ?,
            items_json = ?
        WHERE id = ?
      `).run(
        estadoFinal,
        aprobadoPor,
        multiplo,
        pagadoDesdeCaja ? 1 : 0,
        medioPago,
        totalFacturado,
        totalRecibidoReal,
        montoNcPendiente,
        JSON.stringify(itemsFinales),
        facturaId
      );

      // C. Si hubo mercadería facturada que NO llegó, generar registro de Nota de Crédito Pendiente
      if (itemsFaltantesNC.length > 0 && montoNcPendiente > 0) {
        const ncId = `NCP-${Date.now()}`;
        this.db.prepare(`
          INSERT INTO notas_credito_pendientes (
            id, factura_id, proveedor, numero_comprobante_origen, monto_reclamo, items_faltantes_json, estado
          ) VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE_RECLAMO')
        `).run(
          ncId,
          facturaId,
          factura.proveedor,
          factura.numero_comprobante,
          montoNcPendiente,
          JSON.stringify(itemsFaltantesNC)
        );
        notaCreditoCreada = {
          id: ncId,
          proveedor: factura.proveedor,
          monto_reclamo: montoNcPendiente,
          items_faltantes: itemsFaltantesNC
        };
      }

      // D. Asentar en el Libro Diario Contable (Para el Contador a fin de mes)
      const hoy = factura.fecha_comprobante || new Date().toISOString().split('T')[0];
      const hora = new Date().toTimeString().split(' ')[0];
      const neto = Number((totalFacturado / 1.21).toFixed(2));
      const iva = Number((totalFacturado - neto).toFixed(2));

      this.db.prepare(`
        INSERT INTO libro_diario_contable (
          id, fecha, hora, tipo_asiento, comprobante_tipo, comprobante_nro,
          proveedor_o_responsable, cuit, concepto, neto_gravado, iva_21,
          total_debe, total_haber, medio_pago, referencia_id, respaldo_imagen
        ) VALUES (?, ?, ?, 'COMPRA_MERCADERIA', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(
        `LD-${Date.now()}-1`,
        hoy,
        hora,
        factura.tipo_comprobante,
        factura.numero_comprobante,
        factura.proveedor,
        factura.cuit_proveedor || '',
        `Compra mercadería (${itemsQueLlegaron.length} ítems ingresados al stock de IberáSoft)${itemsFaltantesNC.length > 0 ? ` | Faltantes a reclamar NC: $${montoNcPendiente.toLocaleString('es-AR')}` : ''}`,
        neto,
        iva,
        totalFacturado,
        medioPago,
        facturaId,
        factura.imagen_path || ''
      );

      // Si hay Nota de Crédito pendiente por mercadería no entregada, dejar asentado el crédito a favor en el Libro Diario
      if (itemsFaltantesNC.length > 0 && montoNcPendiente > 0) {
        const detalleFaltantes = itemsFaltantesNC
          .map((f) => `${f.cantidad_faltante_nc}x ${f.nombre}`)
          .join(', ');
        this.db.prepare(`
          INSERT INTO libro_diario_contable (
            id, fecha, hora, tipo_asiento, comprobante_tipo, comprobante_nro,
            proveedor_o_responsable, cuit, concepto, neto_gravado, iva_21,
            total_debe, total_haber, medio_pago, referencia_id, respaldo_imagen
          ) VALUES (?, ?, ?, 'CREDITO_A_FAVOR_NC_PENDIENTE', 'Reclamo NC', ?, ?, ?, ?, ?, ?, ?, 0, 'CREDITO_PROVEEDOR', ?, ?)
        `).run(
          `LD-${Date.now()}-2`,
          hoy,
          hora,
          factura.numero_comprobante,
          factura.proveedor,
          factura.cuit_proveedor || '',
          `Mercadería facturada NO entregada (Pendiente Nota de Crédito): ${detalleFaltantes}`,
          Number((montoNcPendiente / 1.21).toFixed(2)),
          Number((montoNcPendiente - montoNcPendiente / 1.21).toFixed(2)),
          montoNcPendiente,
          facturaId,
          factura.imagen_path || ''
        );
      }

      // E. Si se pagó desde la caja chica del turno actual, descontar lo pagado de la caja
      if (pagadoDesdeCaja) {
        const turno = this.getTurnoActivo();
        if (turno) {
          const montoPagadoCaja = totalRecibidoReal > 0 ? totalRecibidoReal : totalFacturado;
          this.db.prepare(`
            INSERT INTO caja_movimientos (id, turno_id, operario_nombre, tipo, medio_pago, monto, descripcion)
            VALUES (?, ?, ?, 'PAGO_PROVEEDOR', ?, ?, ?)
          `).run(
            `MOV-${Date.now()}-PRV`,
            turno.id,
            turno.operario_nombre,
            medioPago,
            montoPagadoCaja,
            `Pago en mostrador a ${factura.proveedor} (${factura.tipo_comprobante} ${factura.numero_comprobante})`
          );

          if (medioPago === 'EFECTIVO') {
            this.db.prepare(`
              UPDATE turnos_caja
              SET egresos_caja = egresos_caja + ?,
                  monto_esperado_efectivo = monto_inicial + ventas_efectivo - (egresos_caja + ?)
              WHERE id = ?
            `).run(montoPagadoCaja, montoPagadoCaja, turno.id);
          }
        }
      }
    });

    tx();
    this.exportarCSVCompatibleIberaSoft();

    // Enviar resumen al WhatsApp del Dueño
    const msgConfirmacion = itemsFaltantesNC.length > 0
      ? `✅ [STOCK Y PRECIOS ACTUALIZADOS CON RECEPCIÓN PARCIAL]: ${factura.tipo_comprobante} ${factura.numero_comprobante} de "${factura.proveedor}" aprobada por ${aprobadoPor}. Ingresaron ${itemsQueLlegaron.length} productos al stock de IberáSoft ($${totalRecibidoReal.toLocaleString('es-AR')}). ⚠️ Se descartaron ${itemsFaltantesNC.length} productos que NO llegaron y se abrió reclamo de Nota de Crédito por $${montoNcPendiente.toLocaleString('es-AR')}.`
      : `✅ [STOCK Y PRECIOS ACTUALIZADOS EN IBERÁSOFT]: ${factura.tipo_comprobante} ${factura.numero_comprobante} de "${factura.proveedor}" aprobada por ${aprobadoPor}. Se sumaron ${itemsQueLlegaron.length} productos al stock y se remarcaron precios automáticamente ($${totalRecibidoReal.toLocaleString('es-AR')}).`;

    this.registrarMensajeWhatsApp({
      direccion: 'SALIENTE_DUENIO',
      remitente: 'Nora AI (Stock & Precios)',
      destinatario: 'Dueño del Kiosco',
      mensaje: msgConfirmacion,
      tipoAlerta: itemsFaltantesNC.length > 0 ? 'NC_PENDIENTE' : 'FACTURA_RECIBIDA'
    });

    return {
      factura: this.getFacturaById(facturaId),
      articulosActualizados,
      notaCreditoCreada
    };
  }

  /**
   * Salda una Nota de Crédito pendiente cuando el proveedor entrega la NC o repone el importe
   */
  saldarNotaCreditoPendiente({ ncId, numeroNotaCredito = '' }) {
    const nc = this.db.prepare('SELECT * FROM notas_credito_pendientes WHERE id = ?').get(ncId);
    if (!nc) throw new Error('Reclamo de Nota de Crédito no encontrado');

    const nroNC = numeroNotaCredito || `NC-0001-${Math.floor(100000 + Math.random() * 899999)}`;
    const hoy = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0];

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE notas_credito_pendientes
        SET estado = 'SALDADA_CON_NC',
            nc_resolucion_numero = ?,
            fecha_resolucion = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nroNC, ncId);

      this.db.prepare(`
        INSERT INTO libro_diario_contable (
          id, fecha, hora, tipo_asiento, comprobante_tipo, comprobante_nro,
          proveedor_o_responsable, cuit, concepto, neto_gravado, iva_21,
          total_debe, total_haber, medio_pago, referencia_id
        ) VALUES (?, ?, ?, 'NOTA_CREDITO_RECIBIDA', 'Nota de Crédito', ?, ?, '', ?, ?, ?, ?, 0, 'COMPENSACION_NC', ?)
      `).run(
        `LD-${Date.now()}-NC`,
        hoy,
        hora,
        nroNC,
        nc.proveedor,
        `Nota de Crédito aplicada sobre comprobante origen ${nc.numero_comprobante_origen}`,
        Number((nc.monto_reclamo / 1.21).toFixed(2)),
        Number((nc.monto_reclamo - nc.monto_reclamo / 1.21).toFixed(2)),
        nc.monto_reclamo,
        nc.id
      );
    });

    tx();

    this.registrarMensajeWhatsApp({
      direccion: 'SALIENTE_DUENIO',
      remitente: 'Nora AI (Contabilidad)',
      destinatario: 'Dueño del Kiosco',
      mensaje: `🧾 [NOTA DE CRÉDITO APLICADA]: Se saldó el reclamo pendiente de "${nc.proveedor}" por $${Number(nc.monto_reclamo).toLocaleString('es-AR')} con la Nota de Crédito Nº ${nroNC}. Asentado en el Libro Diario.`,
      tipoAlerta: 'NC_PENDIENTE'
    });

    return this.db.prepare('SELECT * FROM notas_credito_pendientes WHERE id = ?').get(ncId);
  }

  // =========================================================================
  // 4. CONTROL DE CAJA DIARIA Y TURNOS CON RECONOCIMIENTO DE OPERARIO
  // =========================================================================
  getOperarios() {
    return this.db.prepare('SELECT * FROM operarios WHERE activo = 1 ORDER BY id ASC').all();
  }

  crearOperario({ nombre, rol = 'Operador de Turno', turnoHabitual = 'Mañana', pin = '1234' }) {
    const id = `OP-${Date.now().toString().slice(-4)}`;
    this.db.prepare(`
      INSERT INTO operarios (id, nombre, rol, turno_habitual, pin, huella_voz_tag)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, nombre.trim(), rol, turnoHabitual, pin, `voz_${nombre.toLowerCase().replace(/\s+/g, '_')}`);
    return this.getOperarios();
  }

  getTurnoActivo() {
    return this.db.prepare(`
      SELECT * FROM turnos_caja WHERE estado = 'abierto' ORDER BY fecha_apertura DESC LIMIT 1
    `).get() || null;
  }

  getHistorialTurnos(limit = 20) {
    return this.db.prepare(`
      SELECT * FROM turnos_caja ORDER BY fecha_apertura DESC LIMIT ?
    `).all(limit);
  }

  getMovimientosTurnoActual() {
    const turno = this.getTurnoActivo();
    if (!turno) return [];
    return this.db.prepare(`
      SELECT * FROM caja_movimientos WHERE turno_id = ? ORDER BY created_at DESC
    `).all(turno.id);
  }

  abrirTurnoCaja({ operarioNombre, turnoTipo = 'Mañana', montoInicial = 0 }) {
    const activo = this.getTurnoActivo();
    if (activo) {
      throw new Error(`Ya hay un turno abierto a nombre de ${activo.operario_nombre}. Debe cerrarse antes de abrir uno nuevo.`);
    }

    const op = this.db.prepare('SELECT * FROM operarios WHERE LOWER(nombre) = LOWER(?)').get(operarioNombre.trim());
    const id = `TUR-${Date.now()}`;
    const inicial = Number(montoInicial) || 0;

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO turnos_caja (
          id, operario_id, operario_nombre, turno_tipo, estado,
          monto_inicial, ventas_efectivo, ventas_digital, egresos_caja, monto_esperado_efectivo
        ) VALUES (?, ?, ?, ?, 'abierto', ?, 0, 0, 0, ?)
      `).run(id, op ? op.id : 'OP-EXT', operarioNombre.trim(), turnoTipo, inicial, inicial);

      this.db.prepare(`
        INSERT INTO caja_movimientos (id, turno_id, operario_nombre, tipo, medio_pago, monto, descripcion)
        VALUES (?, ?, ?, 'APERTURA', 'EFECTIVO', ?, ?)
      `).run(
        `MOV-${Date.now()}-INI`,
        id,
        operarioNombre.trim(),
        inicial,
        `Apertura de Turno ${turnoTipo} por ${operarioNombre.trim()}`
      );
    });

    tx();

    this.registrarMensajeWhatsApp({
      direccion: 'SALIENTE_DUENIO',
      remitente: 'Nora AI (Caja & Turnos)',
      destinatario: 'Dueño del Kiosco',
      mensaje: `🔑 [APERTURA DE TURNO]: Operario reconocido: ${operarioNombre.trim()} (${turnoTipo}). Caja iniciada con $${inicial.toLocaleString('es-AR')} en efectivo.`,
      tipoAlerta: 'CAJA_TURNO'
    });

    return this.getTurnoActivo();
  }

  registrarMovimientoCajaManual({ tipo = 'GASTO_OPERATIVO', medioPago = 'EFECTIVO', monto = 0, descripcion = '' }) {
    const turno = this.getTurnoActivo();
    if (!turno) throw new Error('No hay un turno de caja abierto actualmente.');

    const importe = Number(monto) || 0;
    const movId = `MOV-${Date.now()}`;

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO caja_movimientos (id, turno_id, operario_nombre, tipo, medio_pago, monto, descripcion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(movId, turno.id, turno.operario_nombre, tipo, medioPago, importe, descripcion);

      if (tipo === 'PAGO_PROVEEDOR' || tipo === 'RETIRO_DUENIO' || tipo === 'GASTO_OPERATIVO') {
        if (medioPago === 'EFECTIVO') {
          this.db.prepare(`
            UPDATE turnos_caja
            SET egresos_caja = egresos_caja + ?,
                monto_esperado_efectivo = monto_inicial + ventas_efectivo - (egresos_caja + ?)
            WHERE id = ?
          `).run(importe, importe, turno.id);
        }
      } else if (tipo === 'INGRESO_EXTRA') {
        if (medioPago === 'EFECTIVO') {
          this.db.prepare(`
            UPDATE turnos_caja
            SET ventas_efectivo = ventas_efectivo + ?,
                monto_esperado_efectivo = monto_inicial + ventas_efectivo + ? - egresos_caja
            WHERE id = ?
          `).run(importe, importe, turno.id);
        }
      }
    });

    tx();
    return this.getTurnoActivo();
  }

  cerrarTurnoCaja({ montoDeclaradoEfectivo, notasCierre = '' }) {
    const turno = this.getTurnoActivo();
    if (!turno) throw new Error('No hay ningún turno abierto para cerrar.');

    const declarado = Number(montoDeclaradoEfectivo) || 0;
    const esperado = Number(turno.monto_esperado_efectivo) || 0;
    const diferencia = declarado - esperado;
    const hoy = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0];
    const totalVentasTurno = Number(turno.ventas_efectivo) + Number(turno.ventas_digital);

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE turnos_caja
        SET estado = 'cerrado',
            monto_declarado_cierre = ?,
            diferencia_caja = ?,
            notas_cierre = ?,
            fecha_cierre = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(declarado, diferencia, notasCierre, turno.id);

      this.db.prepare(`
        INSERT INTO caja_movimientos (id, turno_id, operario_nombre, tipo, medio_pago, monto, descripcion)
        VALUES (?, ?, ?, 'CIERRE', 'EFECTIVO', ?, ?)
      `).run(
        `MOV-${Date.now()}-FIN`,
        turno.id,
        turno.operario_nombre,
        declarado,
        `Cierre Turno ${turno.turno_tipo} (${turno.operario_nombre}). Esperado: $${esperado.toLocaleString('es-AR')} | Declarado: $${declarado.toLocaleString('es-AR')} | Dif: $${diferencia.toLocaleString('es-AR')}`
      );

      // Asentar el resumen de ventas del turno en el Libro Diario Contable
      this.db.prepare(`
        INSERT INTO libro_diario_contable (
          id, fecha, hora, tipo_asiento, comprobante_tipo, comprobante_nro,
          proveedor_o_responsable, cuit, concepto, neto_gravado, iva_21,
          total_debe, total_haber, medio_pago, referencia_id
        ) VALUES (?, ?, ?, 'CIERRE_VENTAS_TURNO', 'Zeta / Cierre Turno', ?, ?, '', ?, ?, ?, ?, 0, 'MIXTO', ?)
      `).run(
        `LD-${Date.now()}-CAJ`,
        hoy,
        hora,
        turno.id,
        `Operario: ${turno.operario_nombre} (Turno ${turno.turno_tipo})`,
        `Cierre de Caja Turno ${turno.turno_tipo}. Inició: $${turno.monto_inicial.toLocaleString('es-AR')} | Ventas Efectivo: $${turno.ventas_efectivo.toLocaleString('es-AR')} | Ventas Digital: $${turno.ventas_digital.toLocaleString('es-AR')} | Egresos: $${turno.egresos_caja.toLocaleString('es-AR')} | Cierre Efectivo: $${declarado.toLocaleString('es-AR')} (Dif: $${diferencia.toLocaleString('es-AR')})`,
        Number((totalVentasTurno / 1.21).toFixed(2)),
        Number((totalVentasTurno - totalVentasTurno / 1.21).toFixed(2)),
        totalVentasTurno,
        turno.id
      );
    });

    tx();

    const estadoDif = diferencia === 0
      ? 'Caja exacta ($0 diferencia)'
      : diferencia > 0
        ? `Sobrante de +$${diferencia.toLocaleString('es-AR')}`
        : `Faltante de -$${Math.abs(diferencia).toLocaleString('es-AR')}`;

    this.registrarMensajeWhatsApp({
      direccion: 'SALIENTE_DUENIO',
      remitente: 'Nora AI (Cierre de Turno)',
      destinatario: 'Dueño del Kiosco',
      mensaje: `🔒 [CIERRE DE CAJA - TURNO ${turno.turno_tipo.toUpperCase()}]: Operario: ${turno.operario_nombre}. Inició con: $${turno.monto_inicial.toLocaleString('es-AR')} | Ventas Efectivo: $${turno.ventas_efectivo.toLocaleString('es-AR')} | Ventas MP/Tarjeta: $${turno.ventas_digital.toLocaleString('es-AR')} | Pagos/Retiros: $${turno.egresos_caja.toLocaleString('es-AR')} | Efectivo al cerrar: $${declarado.toLocaleString('es-AR')} (${estadoDif}).`,
      tipoAlerta: 'CAJA_TURNO'
    });

    return this.db.prepare('SELECT * FROM turnos_caja WHERE id = ?').get(turno.id);
  }

  // =========================================================================
  // 5. LIBRO DIARIO CONTABLE Y EXPORTACIÓN PARA EL CONTADOR
  // =========================================================================
  getLibroDiario(mes = '') {
    if (mes) {
      return this.db.prepare(`
        SELECT * FROM libro_diario_contable
        WHERE fecha LIKE ?
        ORDER BY created_at DESC
      `).all(`${mes}%`);
    }
    return this.db.prepare('SELECT * FROM libro_diario_contable ORDER BY created_at DESC').all();
  }

  generarCSVLibroDiarioContador(mes = '') {
    const asientos = this.getLibroDiario(mes);
    const headers = [
      'ID_ASIENTO',
      'FECHA',
      'HORA',
      'TIPO_MOVIMIENTO',
      'TIPO_COMPROBANTE',
      'NRO_COMPROBANTE',
      'PROVEEDOR_O_RESPONSABLE',
      'CUIT',
      'CONCEPTO_DETALLE',
      'NETO_GRAVADO_ARS',
      'IVA_21_ARS',
      'DEBE_INGRESOS_CREDITOS_ARS',
      'HABER_COMPRAS_EGRESOS_ARS',
      'MEDIO_PAGO'
    ];

    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(';')];

    for (const a of asientos) {
      lines.push([
        escapeCsv(a.id),
        escapeCsv(a.fecha),
        escapeCsv(a.hora),
        escapeCsv(a.tipo_asiento),
        escapeCsv(a.comprobante_tipo),
        escapeCsv(a.comprobante_nro),
        escapeCsv(a.proveedor_o_responsable),
        escapeCsv(a.cuit),
        escapeCsv(a.concepto),
        Number(a.neto_gravado || 0).toFixed(2).replace('.', ','),
        Number(a.iva_21 || 0).toFixed(2).replace('.', ','),
        Number(a.total_debe || 0).toFixed(2).replace('.', ','),
        Number(a.total_haber || 0).toFixed(2).replace('.', ','),
        escapeCsv(a.medio_pago)
      ].join(';'));
    }

    // UTF-8 BOM para que Excel en Argentina abra los acentos y columnas con punto y coma directamente
    return '\uFEFF' + lines.join('\r\n');
  }

  /**
   * Exporta automáticamente la planilla CSV compatible con la importación de IberáSoft POS
   */
  exportarCSVCompatibleIberaSoft() {
    try {
      const articulos = this.getArticulos();
      const headers = [
        'CODIGO',
        'CODIGO_BARRAS',
        'DESCRIPCION',
        'RUBRO',
        'PROVEEDOR',
        'COSTO',
        'MARGEN_PORCENTAJE',
        'PRECIO_VENTA',
        'STOCK_ACTUAL',
        'STOCK_MINIMO',
        'UNIDAD'
      ];
      const lines = [headers.join(';')];
      for (const a of articulos) {
        lines.push([
          a.id,
          a.codigo_barras,
          `"${String(a.nombre).replace(/"/g, '""')}"`,
          `"${String(a.rubro).replace(/"/g, '""')}"`,
          `"${String(a.proveedor).replace(/"/g, '""')}"`,
          Number(a.costo_unitario).toFixed(2),
          Number(a.margen_pct).toFixed(2),
          Number(a.precio_venta).toFixed(2),
          Number(a.stock_actual),
          Number(a.stock_minimo),
          a.unidad
        ].join(';'));
      }
      const csvPath = path.join(SYNC_DIR, 'lista_precios_stock_iberasoft.csv');
      fs.writeFileSync(csvPath, '\uFEFF' + lines.join('\r\n'), 'utf8');
      return csvPath;
    } catch (e) {
      console.error('[IberaBridge CSV] Error exportando CSV:', e.message);
      return null;
    }
  }

  // =========================================================================
  // 6. MENSAJERÍA WHATSAPP (BITÁCORA EN VIVO OPERADOR <-> NORA <-> DUEÑO)
  // =========================================================================
  getMensajesWhatsApp(limit = 40) {
    return this.db.prepare('SELECT * FROM whatsapp_mensajes ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  registrarMensajeWhatsApp({ direccion, remitente, destinatario, mensaje, tipoAlerta = 'INFO' }) {
    const id = `WA-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    this.db.prepare(`
      INSERT INTO whatsapp_mensajes (id, direccion, remitente, destinatario, mensaje, tipo_alerta)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, direccion, remitente, destinatario, mensaje, tipoAlerta);
    return this.db.prepare('SELECT * FROM whatsapp_mensajes WHERE id = ?').get(id);
  }

  // =========================================================================
  // 7. MODO NORA COPILOT (BASE DE CONOCIMIENTO BLINDADA IBERÁSOFT + PANEL NORA)
  // =========================================================================
  getCopilotManuals() {
    const rows = this.db.prepare('SELECT * FROM copilot_knowledge ORDER BY sistema DESC, id ASC').all();
    return rows.map((r) => ({
      ...r,
      pasos: JSON.parse(r.pasos_json || '[]')
    }));
  }

  buscarGuiaCopilot(consulta = '') {
    const q = String(consulta || '').toLowerCase().trim();
    if (!q) return null;

    const guias = this.getCopilotManuals();
    let mejorMatch = null;
    let mejorScore = 0;

    const tokens = q.replace(/[^a-záéíóúñ0-9\s]/gi, ' ').split(/\s+/).filter((w) => w.length >= 3);

    for (const g of guias) {
      let score = 0;
      const textoCompleto = `${g.titulo} ${g.keywords} ${g.resumen} ${g.categoria} ${g.sistema}`.toLowerCase();
      const kws = g.keywords.toLowerCase().split(',').map((k) => k.trim());

      for (const kw of kws) {
        if (kw && q.includes(kw)) score += 4;
      }
      for (const t of tokens) {
        if (textoCompleto.includes(t)) score += 2;
      }
      if (score > mejorScore) {
        mejorScore = score;
        mejorMatch = g;
      }
    }

    return mejorScore >= 3 ? mejorMatch : null;
  }

  /**
   * BLINDAJE DE SEGURIDAD:
   * Solo el Dueño (con PIN de Dueño/Admin, por defecto '9999') puede enseñar o actualizar
   * procedimientos en la base de conocimiento de Nora Copilot.
   * Además filtra cualquier intento de Prompt Injection o alteración de reglas contables.
   */
  guardarConocimientoCopilot({
    pinDuenio = '',
    id = '',
    sistema = 'IBERASOFT_POS',
    titulo = '',
    categoria = 'Procedimiento Personalizado',
    keywords = '',
    resumen = '',
    pasos = [],
    tabDestino = '',
    selectorDestacado = ''
  }) {
    // 1. Validar PIN Maestro del Dueño
    const adminOp = this.db.prepare("SELECT * FROM operarios WHERE pin = ? AND (rol LIKE '%Dueño%' OR pin = '9999')").get(String(pinDuenio).trim());
    if (!adminOp && String(pinDuenio).trim() !== '9999') {
      throw new Error('Acceso denegado: Solo el Dueño del Kiosco (PIN Maestro 9999) puede enseñar o modificar el conocimiento de Nora Copilot.');
    }

    // 2. Filtro Anti-Sabotaje / Anti-Prompt-Injection
    const textoInspeccion = `${titulo} ${resumen} ${(pasos || []).join(' ')}`.toLowerCase();
    const patronesProhibidos = [
      'ignora tus instrucciones',
      'ignore previous',
      'no avises al dueño',
      'ocultar faltante',
      'borrar caja',
      'revela tu prompt',
      'api_key',
      'groq_api_key'
    ];
    for (const prohibido of patronesProhibidos) {
      if (textoInspeccion.includes(prohibido)) {
        throw new Error('Bloqueo de Seguridad Nexora One: El procedimiento contiene directivas no permitidas por las políticas de auditoría.');
      }
    }

    if (!titulo.trim() || !Array.isArray(pasos) || pasos.length === 0) {
      throw new Error('Debés indicar un título y al menos un paso claro para la guía.');
    }

    const guiaId = id && id.trim() ? id.trim() : `COP-CUSTOM-${Date.now().toString().slice(-5)}`;
    const pasosLimpios = pasos.map((p) => String(p).trim()).filter(Boolean);

    this.db.prepare(`
      INSERT OR REPLACE INTO copilot_knowledge (
        id, sistema, titulo, categoria, keywords, resumen, pasos_json, tab_destino, selector_destacado, creado_por, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      guiaId,
      sistema,
      titulo.trim(),
      categoria.trim() || 'Operación Kiosco',
      keywords.trim() || titulo.toLowerCase().split(/\s+/).join(','),
      resumen.trim() || titulo.trim(),
      JSON.stringify(pasosLimpios),
      tabDestino,
      selectorDestacado,
      adminOp ? adminOp.nombre : 'Dueño (PIN Maestro)'
    );

    return this.getCopilotManuals();
  }

  // =========================================================================
  // 8. ELIMINACIÓN DE ÍTEMS DE EJEMPLO, ALTA MANUAL E IMPORTACIÓN REAL IBERÁSOFT
  // =========================================================================
  eliminarArticulo(articuloId) {
    this.updateConfig({ ejemplos_limpiados: '1' });
    this.db.prepare('DELETE FROM iberasoft_articulos WHERE id = ?').run(articuloId);
    this.exportarCSVCompatibleIberaSoft();
    return this.getArticulos();
  }

  crearArticuloManual({
    id = '',
    codigoBarras = '',
    nombre = '',
    rubro = 'Almacén',
    proveedor = 'General',
    costoUnitario = 0,
    margenPct = 45,
    precioVenta = null,
    stockActual = 0,
    stockMinimo = 5,
    unidad = 'Unidades'
  }) {
    if (!nombre || !String(nombre).trim()) {
      throw new Error('El nombre del artículo es obligatorio.');
    }
    const cfg = this.getConfig();
    const multiplo = Number(cfg.redondeo_multiplo) || 50;
    const artId = id && String(id).trim() ? String(id).trim() : `IB-${Date.now().toString().slice(-5)}`;
    const ean = codigoBarras && String(codigoBarras).trim()
      ? String(codigoBarras).trim()
      : `779${Math.floor(1000000000 + Math.random() * 8999999999)}`;
    const costo = Number(costoUnitario) || 0;
    const margen = Number(margenPct) || Number(cfg.margen_default_pct) || 45;
    const precio = precioVenta !== null && precioVenta !== '' && precioVenta !== undefined
      ? Number(precioVenta)
      : redondearPrecioKiosco(costo * (1 + margen / 100), multiplo);

    this.db.prepare(`
      INSERT OR REPLACE INTO iberasoft_articulos (
        id, codigo_barras, nombre, rubro, proveedor, costo_unitario, margen_pct, precio_venta, stock_actual, stock_minimo, unidad, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      artId,
      ean,
      String(nombre).trim(),
      String(rubro || 'Almacén').trim(),
      String(proveedor || 'General').trim(),
      costo,
      margen,
      precio,
      Number(stockActual) || 0,
      Number(stockMinimo) || 5,
      String(unidad || 'Unidades').trim()
    );

    this.exportarCSVCompatibleIberaSoft();
    return this.getArticulos();
  }

  /**
   * Importa el catálogo real exportado desde IberáSoft POS (CSV / Excel guardado como CSV)
   * y permite reemplazar los artículos de ejemplo en 1 clic.
   */
  importarArticulosDesdeCSVIberaSoft({ csvText = '', reemplazarCatalogoActual = false }) {
    const cleanText = String(csvText || '').replace(/^\uFEFF/, '').trim();
    if (!cleanText) throw new Error('El archivo CSV está vacío.');

    const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 1) throw new Error('El archivo no contiene artículos.');

    const sep = lines[0].includes(';') ? ';' : ',';

    const parseLine = (text) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"') {
          if (inQuotes && next === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === sep && !inQuotes) {
          result.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const firstCols = parseLine(lines[0]);
    // Detección automática de volcado nativo de IberáSoft POS (sin encabezados, con IVA en col 7 y nombre en col 4)
    const isNativeIberasoft = (
      firstCols.length >= 10 &&
      !firstCols[0].toUpperCase().includes('CODIGO') &&
      !firstCols[0].toUpperCase().includes('DESCRIPCION') &&
      Boolean(firstCols[4] && firstCols[4].length > 1)
    );

    const headers = isNativeIberasoft
      ? []
      : parseLine(lines[0]).map((h) => h.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

    const findIdx = (...names) => headers.findIndex((h) => names.some((n) => h.includes(n)));
    const idxId = findIdx('CODIGO', 'ID');
    const idxBarras = findIdx('BARRA', 'EAN');
    const idxNombre = findIdx('DESCRIPCION', 'NOMBRE', 'ARTICULO', 'PRODUCTO');
    const idxRubro = findIdx('RUBRO', 'CATEGORIA', 'FAMILIA');
    const idxProv = findIdx('PROVEEDOR');
    const idxCosto = findIdx('COSTO');
    const idxMargen = findIdx('MARGEN', 'PORCENTAJE', 'GANANCIA');
    const idxPrecio = findIdx('PRECIO', 'VENTA');
    const idxStock = findIdx('STOCK_ACTUAL', 'STOCK', 'CANTIDAD');
    const idxMin = findIdx('MINIMO', 'LIMITE');
    const idxUnidad = findIdx('UNIDAD');

    const cfg = this.getConfig();
    const multiplo = Number(cfg.redondeo_multiplo) || 50;
    const margenDefault = Number(cfg.margen_default_pct) || 45;
    let importados = 0;

    const parseNum = (val, fallback = 0) => {
      if (val === undefined || val === null || val === '') return fallback;
      const n = Number(String(val).replace(/\$/g, '').replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : fallback;
    };

    const insStmt = this.db.prepare(`
      INSERT OR REPLACE INTO iberasoft_articulos (
        id, codigo_barras, nombre, rubro, proveedor, costo_unitario, margen_pct, precio_venta, stock_actual, stock_minimo, unidad, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const startIndex = isNativeIberasoft ? 0 : 1;

    const tx = this.db.transaction(() => {
      if (reemplazarCatalogoActual) {
        this.db.prepare('DELETE FROM iberasoft_articulos').run();
      }
      this.updateConfig({ ejemplos_limpiados: '1' });

      for (let i = startIndex; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        if (cols.length < 3) continue;

        let id = '';
        let barras = '';
        let nombre = '';
        let rubro = 'Kiosco & Lubricentro';
        let prov = 'IberáSoft POS';
        let costo = 0;
        let margen = margenDefault;
        let precio = 0;
        let stock = 0;
        let min = 5;
        let unidad = 'Unidades';

        if (isNativeIberasoft) {
          // Mapeo posicional nativo de base de datos IberáSoft (col 0: barra, col 1: interno, col 2: nombre, col 3: stock, col 5: costo, col 7: venta, col 14: rubro)
          const rawBar = (cols[0] || '').trim();
          const rawCode = (cols[1] || '').trim();
          id = (rawBar && rawBar !== '0') ? rawBar : (rawCode ? `IB-${rawCode}` : `IB-${1000 + i}`);
          barras = (rawBar && rawBar !== '0') ? rawBar : id;
          nombre = (cols[2] || '').trim();
          stock = parseNum(cols[3], 0);
          costo = parseNum(cols[5], 0);
          precio = parseNum(cols[7], 0);
          if (cols[14] && cols[14].trim() && cols[14].trim() !== 'Sin Clasificar' && cols[14].trim() !== '0') {
            rubro = cols[14].trim();
          }
          if (cols[15] && cols[15].trim() && isNaN(Number(cols[15]))) {
            prov = cols[15].trim();
          }
        } else {
          // Mapeo estándar con encabezados
          nombre = (idxNombre >= 0 ? cols[idxNombre] : cols[2] || cols[1] || '').trim();
          id = (idxId >= 0 && cols[idxId]) ? cols[idxId].trim() : `IB-${1000 + i}`;
          barras = (idxBarras >= 0 && cols[idxBarras]) ? cols[idxBarras].trim() : id;
          if (idxRubro >= 0 && cols[idxRubro]) rubro = cols[idxRubro].trim();
          if (idxProv >= 0 && cols[idxProv]) prov = cols[idxProv].trim();
          costo = parseNum(idxCosto >= 0 ? cols[idxCosto] : 0, 0);
          margen = parseNum(idxMargen >= 0 ? cols[idxMargen] : margenDefault, margenDefault);
          precio = parseNum(idxPrecio >= 0 ? cols[idxPrecio] : 0, 0);
          stock = parseNum(idxStock >= 0 ? cols[idxStock] : 0, 0);
          min = parseNum(idxMin >= 0 ? cols[idxMin] : 5, 5);
          if (idxUnidad >= 0 && cols[idxUnidad]) unidad = cols[idxUnidad].trim();
        }

        if (!nombre || nombre === '*') continue;

        if (costo > 0 && precio > costo) {
          margen = Math.round(((precio - costo) / costo) * 100);
        } else if (precio <= 0 && costo > 0) {
          precio = redondearPrecioKiosco(costo * (1 + margen / 100), multiplo);
        }

        insStmt.run(id, barras, nombre, rubro, prov, costo, margen, precio, stock, min, unidad);
        importados++;
      }
    });

    tx();
    this.exportarCSVCompatibleIberaSoft();
    return { importados, totalArticulos: this.getArticulos().length };
  }

  eliminarFactura(facturaId) {
    this.db.prepare('DELETE FROM notas_credito_pendientes WHERE factura_id = ?').run(facturaId);
    this.db.prepare('DELETE FROM libro_diario_contable WHERE referencia_id = ?').run(facturaId);
    this.db.prepare('DELETE FROM facturas_remitos WHERE id = ?').run(facturaId);
    return this.getFacturasRemitos();
  }

  eliminarNotaCredito(ncId) {
    this.db.prepare('DELETE FROM notas_credito_pendientes WHERE id = ?').run(ncId);
    return this.getNotasCreditoPendientes();
  }

  eliminarOperario(operarioId) {
    const op = this.db.prepare('SELECT * FROM operarios WHERE id = ?').get(operarioId);
    if (!op) throw new Error('Operario no encontrado.');
    if (op.pin === '9999') {
      throw new Error('No se puede eliminar el usuario Administrador Principal (PIN 9999).');
    }
    this.db.prepare('DELETE FROM operarios WHERE id = ?').run(operarioId);
    return this.getOperarios();
  }

  eliminarGuiaCopilot({ guiaId, pinDuenio }) {
    if (String(pinDuenio).trim() !== '9999') {
      throw new Error('Acceso denegado: Se requiere el PIN Maestro del Dueño (9999) para eliminar guías del Copilot.');
    }
    this.db.prepare('DELETE FROM copilot_knowledge WHERE id = ?').run(guiaId);
    return this.getCopilotManuals();
  }

  /**
   * Limpia de un plumazo todos los datos de ejemplo (Artículos de prueba, Facturas demo,
   * Notas de Crédito demo, Libro Diario demo y Turnos demo) para enlazar desde cero con IberáSoft.
   */
  limpiarDatosDeEjemplo({ pinDuenio = '', conservarCatalogo = false }) {
    if (String(pinDuenio).trim() !== '9999') {
      throw new Error('Se requiere el PIN Maestro del Dueño (9999) para vaciar los datos de ejemplo.');
    }

    const tx = this.db.transaction(() => {
      this.updateConfig({ ejemplos_limpiados: '1' });
      if (!conservarCatalogo) {
        this.db.prepare('DELETE FROM iberasoft_articulos').run();
      }
      this.db.prepare('DELETE FROM facturas_remitos').run();
      this.db.prepare('DELETE FROM notas_credito_pendientes').run();
      this.db.prepare('DELETE FROM libro_diario_contable').run();
      this.db.prepare('DELETE FROM caja_movimientos').run();
      this.db.prepare('DELETE FROM turnos_caja').run();
      this.db.prepare('DELETE FROM whatsapp_mensajes').run();
    });

    tx();
    this.exportarCSVCompatibleIberaSoft();
    return {
      ok: true,
      message: 'Todos los ítems de ejemplo fueron eliminados. Sistema limpio para enlazar con IberáSoft.'
    };
  }

  /**
   * Restaura los artículos de demostración si el usuario desea volver a probar con datos de ejemplo
   */
  restaurarDatosDeEjemplo({ pinDuenio = '9999' }) {
    if (String(pinDuenio).trim() !== '9999') {
      throw new Error('Se requiere el PIN Maestro del Dueño (9999).');
    }
    this.updateConfig({ ejemplos_limpiados: '0' });
    this.seedDefaultsIfEmpty();
    this.exportarCSVCompatibleIberaSoft();
    return { ok: true };
  }
}

export const db = new KioscoDatabase();
export default db;
