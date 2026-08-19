// === sync_service.js ===
// Sincronizador Automático Kevingston BI -> Supabase & Base Local

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configuración Supabase
const SUPABASE_URL = 'https://sooutfkhgoofczdrjqis.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JKRgvgMKXSRKEw05wC2uNA_SD30xl0V';
let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) { }

// Carpeta Base de Franquicias en OneDrive
const BASE_FRANQUICIAS_DIR = path.resolve('C:/Users/kvnsa/OneDrive/Jogger SRL/Informes Mensuales/Analisis de Rentabilidad de Franquicias');
const DATA_DIR = path.resolve(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('\n=============================================================');
console.log('🚀 KEVINGSTON BI — SERVICIO DE SINCRONIZACIÓN AUTOMÁTICA');
console.log('=============================================================');
console.log(`📁 Carpeta Base: ${BASE_FRANQUICIAS_DIR}`);
console.log(`💾 Carpeta Datos: ${DATA_DIR}\n`);

// Base de datos consolidada en memoria
const MEM_DB = {
  comp: new Map(),
  movp: new Map(),
  stock: new Map(),
  caja: new Map(),
  sucursales: new Set(),
  loaded: new Map()
};

function loadPersistedData() {
  const files = {
    comp: 'db_comp.json',
    movp: 'db_movp.json',
    stock: 'db_stock.json',
    caja: 'db_caja.json',
    loaded: 'db_loaded.json'
  };

  try {
    for (const [key, fname] of Object.entries(files)) {
      const p = path.join(DATA_DIR, fname);
      if (fs.existsSync(p)) {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(arr)) {
          arr.forEach(r => {
            const k = makeKey(key, r);
            MEM_DB[key].set(k, r);
            if (r.sucursal) MEM_DB.sucursales.add(r.sucursal);
          });
        }
      }
    }
    const pSuc = path.join(DATA_DIR, 'db_sucursales.json');
    if (fs.existsSync(pSuc)) {
      const sucs = JSON.parse(fs.readFileSync(pSuc, 'utf8'));
      if (Array.isArray(sucs)) sucs.forEach(s => MEM_DB.sucursales.add(s));
    }
    console.log(`📦 Datos cargados: ${MEM_DB.comp.size} comp, ${MEM_DB.movp.size} movp, ${MEM_DB.stock.size} stock, ${MEM_DB.caja.size} caja.`);
  } catch (e) {
    console.log('ℹ️ Iniciando base de datos limpia.');
  }
}

function persistLocalData() {
  try {
    fs.writeFileSync(path.join(DATA_DIR, 'db_comp.json'), JSON.stringify(Array.from(MEM_DB.comp.values()), null, 2), 'utf8');
    fs.writeFileSync(path.join(DATA_DIR, 'db_movp.json'), JSON.stringify(Array.from(MEM_DB.movp.values()), null, 2), 'utf8');
    fs.writeFileSync(path.join(DATA_DIR, 'db_stock.json'), JSON.stringify(Array.from(MEM_DB.stock.values()), null, 2), 'utf8');
    fs.writeFileSync(path.join(DATA_DIR, 'db_caja.json'), JSON.stringify(Array.from(MEM_DB.caja.values()), null, 2), 'utf8');
    fs.writeFileSync(path.join(DATA_DIR, 'db_sucursales.json'), JSON.stringify(Array.from(MEM_DB.sucursales.values()), null, 2), 'utf8');
    fs.writeFileSync(path.join(DATA_DIR, 'db_loaded.json'), JSON.stringify(Array.from(MEM_DB.loaded.values()), null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando en data/:', err.message);
  }
}

function pMoney(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var s = String(v).trim();
  if (!s) return 0;
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s) || 0;
  return parseFloat(s.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function pNum(v) {
  if (typeof v === 'number') return v;
  return parseFloat(String(v || '').replace(',', '.')) || 0;
}

function pDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    var d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d;
  }
  var s = String(v).trim();
  var sn = parseFloat(s);
  if (!isNaN(sn) && sn > 30000 && sn < 70000 && !/[,\/\-]/.test(s)) {
    var d = new Date(Math.round((sn - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) return d;
  }
  var m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+(\d{1,2})[:\.](\d{1,2})(?:[:\.](\d{1,2}))?)?$/);
  if (m) {
    var y = parseInt(m[3]);
    if (y < 100) y += 2000;
    var hr = m[4] ? parseInt(m[4]) : 0;
    var min = m[5] ? parseInt(m[5]) : 0;
    var sec = m[6] ? parseInt(m[6]) : 0;
    return new Date(y, parseInt(m[2]) - 1, parseInt(m[1]), hr, min, sec);
  }
  var m2 = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]));
  var d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}

function ST(v) {
  if (!v) return '';
  var s = String(v).trim();
  if (s.indexOf('BAĐO') !== -1 || s.indexOf('BAÃ‘O') !== -1) {
    s = s.replace(/BAĐO/g, 'BAÑO').replace(/BAÃ‘O/g, 'BAÑO');
  }
  return s;
}

function vendCod(v) {
  if (!v) return '';
  var s = String(v).trim();
  var m = s.match(/^0*(\d+)[-–\s]/);
  if (m) return m[1];
  m = s.match(/^0*(\d+)$/);
  if (m) return m[1];
  return s;
}

function vendNombre(v) {
  if (!v) return '';
  var s = String(v).trim();
  var m = s.match(/^\d+[-–]\s*(.+)$/);
  if (m) return m[1].trim();
  return s;
}

function getCol(row, name) {
  var target = String(name).toUpperCase().replace(/[\s_]/g, '');
  var keys = Object.keys(row);
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i]).toUpperCase().replace(/[\s_]/g, '') === target) {
      var val = row[keys[i]];
      if (val === null || val === undefined) return '';
      if (val instanceof Date || typeof val === 'number') return val;
      return ST(val);
    }
  }
  return '';
}

function makeKey(t, r) {
  if (t === 'comp') return r.sucursal + '|' + (r.prefijo || '') + '|' + r.nro + '|' + (r.letra || '') + '|' + (r.secuencia || '') + '|' + (r.tipo_pago || '');
  if (t === 'movp') return r.sucursal + '|' + r.anio + '|' + r.mes + '|' + r.dia + '|' + (r.nro_comp || '') + '|' + (r.cod_prod || '') + '|' + (r.salida || 0);
  if (t === 'stock') return r.sucursal + '|' + (r.cod_prod || '') + '|' + (r.nombre_prod || '') + '|' + (r.talle || '') + '|' + (r.color || '');
  if (t === 'caja') return r.sucursal + '|' + r.anio + '|' + r.mes + '|' + r.dia;
  return Math.random().toString(36);
}

function parseComp(rows, suc) {
  var out = [];
  rows.forEach(function (r) {
    var fecha = pDate(getCol(r, 'FECHA'));
    var imp = pMoney(getCol(r, 'IMPORTE_TOTAL'));
    if (!fecha || !imp) return;
    var vRaw = getCol(r, 'VENDEDOR');
    var hora = fecha.getHours();
    var hRaw = getCol(r, 'HORA') || getCol(r, 'HORA_ALTA') || getCol(r, 'HORA_COMPROBANTE');
    if (hora === 0 && hRaw) {
      if (typeof hRaw === 'number' && hRaw < 1) hora = Math.floor(hRaw * 24);
      else { var hs = String(hRaw).match(/(\d{1,2}):/); if (hs) hora = parseInt(hs[1]); }
    }
    out.push({
      sucursal: suc, fecha: fecha, anio: fecha.getFullYear(), mes: fecha.getMonth() + 1, dia: fecha.getDate(), dow: fecha.getDay(), hora: hora,
      nro: getCol(r, 'NUMERO_COMPROBANTE') || getCol(r, 'NUMERO'), prefijo: getCol(r, 'PREFIJO'), letra: getCol(r, 'LETRA'),
      tipo_comp: getCol(r, 'DESCRIPCION_COMPROBANTE') || getCol(r, 'ID_TIPO_COMPROBANTE'),
      cliente: getCol(r, 'NOMBRE_CLIENTE') || 'CONSUMIDOR FINAL', importe: imp,
      tipo_pago: getCol(r, 'NOMBRE_PAGO') || getCol(r, 'TIPO_PAGO'),
      vend_raw: vRaw, vend_cod: vendCod(vRaw), vend_nombre: vendNombre(vRaw), secuencia: getCol(r, 'SECUENCIA')
    });
  });
  return out;
}

function parseMovp(rows, suc) {
  var out = [];
  rows.forEach(function (r) {
    var fecha = pDate(getCol(r, 'FECHA'));
    if (!fecha) return;
    var vRaw = getCol(r, 'VENDEDOR');
    out.push({
      sucursal: suc, fecha: fecha, anio: fecha.getFullYear(), mes: fecha.getMonth() + 1, dia: fecha.getDate(), dow: fecha.getDay(),
      cod_prod: getCol(r, 'CODIGO_PRODUCTO'), nro_comp: getCol(r, 'NUMERO_COMPROBANTE'),
      nombre_prod: getCol(r, 'DESCRIPCION_PRODUCTO') || getCol(r, 'NOMBRE_PRODUCTO') || '',
      desc_prod: getCol(r, 'DESCRIPCION_PRODUCTO'), salida: pNum(getCol(r, 'CANTIDAD_SALIDA')),
      entrada: pNum(getCol(r, 'CANTIDAD_ENTRADA')), importe: pMoney(getCol(r, 'IMPORTE_VALORIZACION')),
      vend_raw: vRaw, vend_cod: vendCod(vRaw), vend_nombre: vendNombre(vRaw),
      rubro: getCol(r, 'RUBRO') || getCol(r, 'NOMBRE_CLASIFICACION_2') || getCol(r, 'FAMILIA'),
      subrubro: getCol(r, 'SUBRUBRO') || getCol(r, 'NOMBRE_CLASIFICACION_3') || getCol(r, 'CLASIFICACION_3') || getCol(r, 'SUBFAMILIA') || getCol(r, 'NOMBRE_RUBRO'),
      talle: getCol(r, 'CODIGO_TALLE'), color: getCol(r, 'CODIGO_COLOR'),
      tipo_comp: getCol(r, 'TIPO_COMPROBANTE') || getCol(r, 'ID_TIPO_COMPROBANTE') || getCol(r, 'TIPO'),
      concepto: getCol(r, 'CONCEPTO') || getCol(r, 'DESCRIPCION_MOVIMIENTO')
    });
  });
  return out;
}

function parseStock(rows, suc) {
  var out = [];
  var colNombreRubro = '', colNombreClas2 = '', colNombreClas1 = '';
  if (rows.length > 0) {
    Object.keys(rows[0]).forEach(function (k) {
      var ku = k.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (ku.indexOf('SUBRUBRO') !== -1 || ku === 'NOMBRERUBRO' || ku === 'SUBFAMILIA' || ku.indexOf('CLASIFICACION3') !== -1) colNombreRubro = k;
      if (ku === 'NOMBRECLASIFICACION2' || ku === 'RUBRO' || ku === 'FAMILIA' || ku === 'CLASIFICACION2') colNombreClas2 = k;
      if (ku === 'NOMBRECLASIFICACION1' || ku === 'GENERO' || ku === 'CLASIFICACION1') colNombreClas1 = k;
    });
  }
  var lastSubRubro = '', lastRubroPadre = '', lastClas1 = '';
  rows.forEach(function (r) {
    var np = getCol(r, 'NOMBRE_PRODUCTO'), cp = getCol(r, 'CODIGO_PRODUCTO');
    if (!np && !cp) return;
    var rawRubro = colNombreClas2 ? ST(r[colNombreClas2] || '') : (getCol(r, 'NOMBRE_CLASIFICACION_2') || getCol(r, 'RUBRO') || getCol(r, 'FAMILIA'));
    if (rawRubro && rawRubro !== lastRubroPadre) {
      lastRubroPadre = rawRubro;
      lastSubRubro = '';
    }
    var rubro = lastRubroPadre || '—';
    var rawSub = colNombreRubro ? ST(r[colNombreRubro] || '') : (getCol(r, 'NOMBRE_RUBRO') || getCol(r, 'SUBRUBRO') || getCol(r, 'NOMBRE_CLASIFICACION_3') || getCol(r, 'CLASIFICACION_3'));
    if (rawSub) lastSubRubro = rawSub;
    var subrubro = lastSubRubro || '—';
    var rawClas1 = colNombreClas1 ? ST(r[colNombreClas1] || '') : getCol(r, 'NOMBRE_CLASIFICACION_1');
    if (rawClas1) lastClas1 = rawClas1;
    var clas1 = lastClas1 || '—';

    out.push({
      sucursal: suc, nombre_rubro: rubro, nombre_subrubro: subrubro, cod_rubro: getCol(r, 'RUBRO'),
      unidades: pNum(getCol(r, 'UNIDADES_VENDIDAS')), imp_costo: pMoney(getCol(r, 'IMPORTE_COSTO')),
      imp_venta: pMoney(getCol(r, 'IMPORTE_VENTA')), stock: pNum(getCol(r, 'STOCK') || '0'),
      cod_prod: cp, nombre_prod: np, talle: getCol(r, 'CODIGO_TALLE'), color: getCol(r, 'CODIGO_COLOR'),
      clas1: clas1, clas2: rubro
    });
  });
  return out;
}

function parseCaja(rows, suc) {
  var out = [];
  rows.forEach(function (r) {
    var fecha = pDate(getCol(r, 'FECHA'));
    var v = pMoney(getCol(r, 'VENTAS'));
    if (!fecha || !v) return;
    out.push({
      sucursal: suc, fecha: fecha, anio: fecha.getFullYear(), mes: fecha.getMonth() + 1, dia: fecha.getDate(),
      ventas: v, gastos: pMoney(getCol(r, 'GASTOS')), tarjetas: pMoney(getCol(r, 'TARJETAS')), efectivo: pMoney(getCol(r, 'EFECTIVO_TESORERIA'))
    });
  });
  return out;
}

function detectReportType(allRows) {
  const keyAlts = {
    caja: ['VENTASTOTAL', 'TOTALVENTAS', 'VENTAS', 'GASTOS', 'TARJETAS', 'EFECTIVOTESORERIA'],
    comp: ['IMPORTETOTAL', 'IMPTOTAL', 'IMPORTECOMPROBANTE', 'TOTAL', 'NUMEROCOMPROBANTE', 'DESCRIPCIONCOMPROBANTE'],
    movp: ['CANTIDADSALIDA', 'CANTSALIDA', 'CANTSAL', 'DESCRIPCIONMOVIMIENTO', 'IMPORTEVALORIZACION'],
    stock: ['UNIDADESVENDIDAS', 'UNIDVENDIDAS', 'UNDVENDIDAS', 'CANTVENDIDA', 'UNIVENDIDAS', 'STOCKACTUAL', 'IMPORTEVENTA', 'IMPORTECOSTO']
  };

  for (let i = 0; i < Math.min(25, allRows.length); i++) {
    const nonEmpty = allRows[i].filter(c => c !== '' && c !== null && c !== undefined).length;
    if (nonEmpty < 2) continue;
    const normalized = allRows[i].map(c => ST(String(c)).toUpperCase().replace(/[^A-Z0-9]/g, ''));
    
    for (const [type, keys] of Object.entries(keyAlts)) {
      let matches = 0;
      for (const k of keys) {
        if (normalized.indexOf(k) !== -1) matches++;
      }
      if (matches >= 2 || (type === 'comp' && normalized.indexOf('IMPORTETOTAL') !== -1) || (type === 'caja' && normalized.indexOf('VENTAS') !== -1 && normalized.indexOf('GASTOS') !== -1)) {
        return { type, headerIdx: i };
      }
    }
  }
  return null;
}

async function processFile(filePath, sucursal) {
  const fileName = path.basename(filePath);
  const lowerName = fileName.toLowerCase();
  if (fileName.startsWith('~$') || (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls') && !lowerName.endsWith('.csv'))) {
    return;
  }

  console.log(`\n📄 [${new Date().toLocaleTimeString()}] Procesando: "${fileName}" (Sucursal: ${sucursal})`);

  try {
    let wb;
    if (fileName.toLowerCase().endsWith('.csv')) {
      const content = fs.readFileSync(filePath, 'utf8');
      wb = XLSX.read(content, { type: 'string', cellDates: true });
    } else {
      const buffer = fs.readFileSync(filePath);
      wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

    const detected = detectReportType(allRows);
    if (!detected) {
      console.warn(`⚠️ No se pudo identificar el tipo de reporte en: ${fileName}`);
      return;
    }

    const { type, headerIdx } = detected;
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true, range: headerIdx });

    let parsed = [];
    const TN = { comp: 'Comprobantes', movp: 'Mov. Productos', stock: 'Stock', caja: 'Caja' };

    if (type === 'comp') parsed = parseComp(rows, sucursal);
    if (type === 'movp') parsed = parseMovp(rows, sucursal);
    if (type === 'stock') parsed = parseStock(rows, sucursal);
    if (type === 'caja') parsed = parseCaja(rows, sucursal);

    if (parsed.length === 0) {
      console.warn(`⚠️ 0 filas válidas en ${fileName}`);
      return;
    }

    MEM_DB.sucursales.add(sucursal);
    parsed.forEach(r => {
      const k = makeKey(type, r);
      MEM_DB[type].set(k, r);
    });

    MEM_DB.loaded.set('sync_' + sucursal + '_' + type, {
      id: 'sync_' + sucursal + '_' + type,
      suc: sucursal,
      type: type,
      typeName: TN[type],
      files: 1,
      n: parsed.length
    });

    persistLocalData();
    console.log(`✅ ¡Sincronizado! ${parsed.length.toLocaleString('es-AR')} registros de ${TN[type]} incorporados para "${sucursal}"`);
  } catch (err) {
    console.error(`❌ Error procesando ${fileName}:`, err.message);
  }
}

const PROCESSED_MTIMES = new Map();

async function scanFolders() {
  try {
    if (!fs.existsSync(BASE_FRANQUICIAS_DIR)) return;
    const branches = fs.readdirSync(BASE_FRANQUICIAS_DIR);

    for (const sucName of branches) {
      const sucDir = path.join(BASE_FRANQUICIAS_DIR, sucName);
      try {
        const subItems = fs.readdirSync(sucDir);
        for (const itemName of subItems) {
          if (itemName.toLowerCase().replace(/\s+/g, '') === 'archivos_excel') {
            const targetDir = path.join(sucDir, itemName);
            const files = fs.readdirSync(targetDir);

            for (const f of files) {
              const ext = path.extname(f).toLowerCase();
              if ((ext === '.xlsx' || ext === '.xls' || ext === '.csv') && !f.startsWith('~$')) {
                const fullPath = path.join(targetDir, f);
                try {
                  const stat = fs.statSync(fullPath);
                  const lastMTime = PROCESSED_MTIMES.get(fullPath);
                  if (!lastMTime || stat.mtimeMs > lastMTime) {
                    PROCESSED_MTIMES.set(fullPath, stat.mtimeMs);
                    await processFile(fullPath, sucName);
                  }
                } catch (e) { }
              }
            }
          }
        }
      } catch (e) { }
    }
  } catch (err) {
    console.error('Error escaneando carpetas:', err.message);
  }
}

async function startWatcher() {
  loadPersistedData();
  console.log(`👀 Escaneando carpetas de franquicias...`);
  await scanFolders();

  setInterval(scanFolders, 5000);
  console.log('\n🟢 Sincronizador activo y vigilando en tiempo real.');
  console.log('📌 Podés guardar o arrastrar archivos en tus carpetas Archivos_Excel y se actualizarán automáticamente.\n');
}

startWatcher();
