import { DB, LOADED, setLoaded, SUCURSALES, setSucursales, clearDB, addDBRecord } from './state.js';
import { supabase } from './supabase.js';

const COLS = {
  kvn_sucursales: ['name'],
  kvn_loaded: ['id', 'suc', 'type', 'typename', 'files', 'n'],
  kvn_comp: ['id', 'sucursal', 'fecha', 'anio', 'mes', 'dia', 'dow', 'hora', 'nro', 'prefijo', 'letra', 'tipo_comp', 'cliente', 'importe', 'tipo_pago', 'vend_raw', 'vend_cod', 'vend_nombre', 'secuencia'],
  kvn_movp: ['id', 'sucursal', 'fecha', 'anio', 'mes', 'dia', 'dow', 'cod_prod', 'nro_comp', 'desc_prod', 'salida', 'entrada', 'importe', 'vend_raw', 'vend_cod', 'vend_nombre', 'rubro', 'subrubro', 'talle', 'color', 'tipo_comp', 'concepto'],
  kvn_stock: ['id', 'sucursal', 'nombre_rubro', 'nombre_subrubro', 'cod_rubro', 'unidades', 'imp_costo', 'imp_venta', 'stock', 'cod_prod', 'nombre_prod', 'talle', 'color', 'clas1', 'clas2'],
  kvn_caja: ['id', 'sucursal', 'fecha', 'anio', 'mes', 'dia', 'ventas', 'gastos', 'tarjetas', 'efectivo']
};

// Helper: fetch ALL rows from a table (Supabase default limit is 1000)
async function fetchAll(table, orderCol) {
  if (!supabase) return [];
  const pageSize = 1000;
  let allData = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select('*').range(from, from + pageSize - 1);
    if (orderCol) q = q.order(orderCol, { ascending: true });
    const { data, error } = await q;
    if (error) { console.error('[KBI] Error fetching', table, error); break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

function mkK(t, r) {
  if (t === 'comp') return r.sucursal + '|' + r.prefijo + '|' + r.nro + '|' + r.letra + '|' + r.secuencia + '|' + r.tipo_pago;
  if (t === 'movp') return r.sucursal + '|' + r.anio + '|' + r.mes + '|' + r.dia + '|' + r.nro_comp + '|' + r.cod_prod + '|' + (r.salida || 0);
  if (t === 'stock') return r.sucursal + '|' + r.cod_prod + '|' + (r.nombre_prod || '') + '|' + (r.talle || '') + '|' + (r.color || '');
  if (t === 'caja') return r.sucursal + '|' + r.anio + '|' + r.mes + '|' + r.dia;
  return Math.random().toString(36);
}

// Helper: prepare a record for Supabase
function prepareForSupabase(r, keyFn, table) {
  var clean = {};
  var allowed = table ? COLS[table] : null;

  for (var k in r) {
    if (!r.hasOwnProperty(k)) continue;
    
    // If table is provided, filter by allowed columns
    var keyToUse = k;
    if (k === 'typeName') keyToUse = 'typename'; // Special case for LOADED
    
    if (allowed && !allowed.includes(keyToUse)) continue;

    var v = r[k];
    if (v instanceof Date) {
      clean[keyToUse] = v.toISOString();
    } else {
      clean[keyToUse] = v;
    }
  }
  if (keyFn) clean.id = keyFn(r);
  return clean;
}

export function updateCloudUI(status) {
  var dot = document.getElementById('cloudDot');
  var box = document.getElementById('cloudStatus');
  if (!dot || !box) return;
  if (status === 'syncing') {
    dot.style.background = '#e8c98a'; // Amarillo
    box.title = 'Sincronizando con Supabase...';
  } else if (status === 'ok') {
    dot.style.background = '#52c48a'; // Verde
    box.title = 'Sincronizado con Supabase';
  } else if (status === 'error') {
    dot.style.background = '#e05252'; // Rojo
    box.title = 'Error de conexión a Supabase';
  }
}

export async function saveAllData() {
  // 1. Save to Local Cache (IndexedDB)
  if (window.localforage) {
    window.localforage.setItem('KVN_DB_COMP', DB.comp);
    window.localforage.setItem('KVN_DB_MOVP', DB.movp);
    window.localforage.setItem('KVN_DB_STOCK', DB.stock);
    window.localforage.setItem('KVN_DB_CAJA', DB.caja);
    window.localforage.setItem('KVN_LOADED', LOADED);
    window.localforage.setItem('KVN_SUCURSALES', SUCURSALES);
    console.log('[KBI] Datos guardados en IndexedDB local.');
  }

  // 2. Sync to Supabase (Background)
  syncToSupabase().catch(e => console.error('[KBI] Sync error:', e));
}

async function syncRows(table, rows, keyFn) {
  if (!rows || rows.length === 0) return;
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize).map(r => prepareForSupabase(r, keyFn, table));
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) {
      console.error('[KBI] Error en upsert de', table, '(batch', i, '):', error);
      throw error;
    }
  }
}

export async function syncToSupabase() {
  if (!supabase) return;
  updateCloudUI('syncing');
  try {
    console.log('[KBI] Sincronizando datos a Supabase...');

    // Sync Sucursales
    if (SUCURSALES.length > 0) {
      const { error: errSuc } = await supabase.from('kvn_sucursales').upsert(SUCURSALES.map(s => ({ name: s })));
      if (errSuc) throw errSuc;
    }

    // Sync Loaded
    if (LOADED.length > 0) {
      const { error: errLoad } = await supabase.from('kvn_loaded').upsert(LOADED.map(l => prepareForSupabase(l, null, 'kvn_loaded')));
      if (errLoad) throw errLoad;
    }

    // Sync DB Tables
    await syncRows('kvn_comp', DB.comp, (r) => mkK('comp', r));
    await syncRows('kvn_movp', DB.movp, (r) => mkK('movp', r));
    await syncRows('kvn_stock', DB.stock, (r) => mkK('stock', r));
    await syncRows('kvn_caja', DB.caja, (r) => mkK('caja', r));

    console.log('[SUPABASE] Sincronización completa exitosa.');
    updateCloudUI('ok');
  } catch (e) {
    console.error('[SUPABASE] Error en sincronización:', e);
    // Log more details if it's a Supabase error
    if (e.message) console.error('[SUPABASE] Mensaje:', e.message);
    if (e.details) console.error('[SUPABASE] Detalles:', e.details);
    if (e.hint) console.error('[SUPABASE] Sugerencia:', e.hint);
    
    updateCloudUI('error');
    // If we have access to showToast, use it to show the error
    if (window.showToast) window.showToast('❌ Error de sincronización: ' + (e.message || 'Error desconocido'), 'error', 5000);
    throw e;
  }
}



export async function loadAllData() {
  updateCloudUI('syncing');
  let supabaseSuccess = false;

  if (supabase) {
    try {
      console.log('[KBI] Intentando cargar datos de Supabase...');

      // Fetch all in parallel
      const [resSuc, resLoad, resComp, resMovp, resStock, resCaja] = await Promise.all([
        fetchAll('kvn_sucursales', 'name'),
        fetchAll('kvn_loaded', 'id'),
        fetchAll('kvn_comp', 'id'),
        fetchAll('kvn_movp', 'id'),
        fetchAll('kvn_stock', 'id'),
        fetchAll('kvn_caja', 'id')
      ]);

      if (resSuc.length > 0 || resLoad.length > 0 || resComp.length > 0) {
        setSucursales(resSuc.map(s => s.name));
        setLoaded(resLoad.map(l => {
          if (l.typename) { l.typeName = l.typename; delete l.typename; }
          return l;
        }));

        clearDB('comp', true); clearDB('movp', true); clearDB('stock', true); clearDB('caja', true);

        resComp.forEach(r => addDBRecord('comp', r.id, r));
        resMovp.forEach(r => addDBRecord('movp', r.id, r));
        resStock.forEach(r => addDBRecord('stock', r.id, r));
        resCaja.forEach(r => addDBRecord('caja', r.id, r));

        console.log('[KBI] Datos cargados de Supabase:', {
          sucursales: resSuc.length,
          loaded: resLoad.length,
          comp: resComp.length,
          movp: resMovp.length,
          stock: resStock.length,
          caja: resCaja.length
        });
        supabaseSuccess = true;
      }
    } catch (err) {
      console.error('[KBI] Error cargando de Supabase, intentando local:', err);
    }
  }

  if (supabaseSuccess) {
    updateCloudUI('ok');
    return true;
  }

  // Fallback to IndexedDB (as before)
  if (!window.localforage) return false;
  console.log('[KBI] Cargando de IndexedDB local...');
  try {
    const results = await Promise.all([
      window.localforage.getItem('KVN_DB_COMP'),
      window.localforage.getItem('KVN_DB_MOVP'),
      window.localforage.getItem('KVN_DB_STOCK'),
      window.localforage.getItem('KVN_DB_CAJA'),
      window.localforage.getItem('KVN_LOADED'),
      window.localforage.getItem('KVN_SUCURSALES')
    ]);

    if (results[5]) setSucursales(results[5]);

    if (results[4] && results[4].length > 0) {
      clearDB('comp', true); clearDB('movp', true); clearDB('stock', true); clearDB('caja', true);

      let cc = results[0] || [];
      cc.forEach(r => addDBRecord('comp', mkK('comp', r), r));

      let mm = results[1] || [];
      mm.forEach(r => addDBRecord('movp', mkK('movp', r), r));

      let ss = results[2] || [];
      ss.forEach(r => addDBRecord('stock', mkK('stock', r), r));

      let ca = results[3] || [];
      ca.forEach(r => addDBRecord('caja', mkK('caja', r), r));

      setLoaded(results[4]);
      console.log('[KBI] Datos cargados de IndexedDB (Total LOADED:', LOADED.length, ')');
      updateCloudUI('ok');
      return true;
    }
    return results[5] ? true : false;
  } catch (err) {
    console.error('[KBI] Error cargando de IndexedDB:', err);
    updateCloudUI('error');
    return false;
  }
}

export function clearLocalData() {
  if (!window.localforage) return;
  if (confirm('Estas seguro de borrar TODOS los datos almacenados localmente de esta computadora?')) {
    window.localforage.clear().then(function() {
      alert('Datos borrados exitosamente. La pagina se recargara.');
      location.reload();
    });
  }
}

