import { DB, LOADED, setLoaded, SUCURSALES, setSucursales, clearDB, addDBRecord } from './state.js';
import { supabase } from './supabase.js';

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
    if (data.length < pageSize) break; // last page
    from += pageSize;
  }
  return allData;
}

// Helper: prepare a record for Supabase (remove Date objects, keep only serializable fields)
function prepareForSupabase(r, keyFn) {
  var clean = {};
  for (var k in r) {
    if (!r.hasOwnProperty(k)) continue;
    var v = r[k];
    // Skip Date objects (we store anio/mes/dia separately)
    if (v instanceof Date) continue;
    clean[k] = v;
  }
  clean.id = keyFn(r);
  return clean;
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
  await syncToSupabase();
}

export async function syncToSupabase() {
  if (!supabase) { console.warn('[KBI] Supabase no disponible.'); return; }
  console.log('[KBI] Sincronizando con Supabase...');
  try {
    // Sync Sucursales
    if (SUCURSALES.length > 0) {
      await supabase.from('kvn_sucursales').upsert(SUCURSALES.map(s => ({ name: s })));
    }
    
    // Sync Loaded Metadata
    if (LOADED.length > 0) {
      await supabase.from('kvn_loaded').upsert(LOADED);
    }

    var compKey = r => r.sucursal+'|'+r.prefijo+'|'+r.nro+'|'+r.letra+'|'+r.secuencia+'|'+r.tipo_pago;
    var movpKey = r => r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia+'|'+r.nro_comp+'|'+r.cod_prod+'|'+r.salida;
    var stockKey = r => r.sucursal+'|'+r.cod_prod+'|'+r.nombre_prod+'|'+r.talle+'|'+r.color;
    var cajaKey = r => r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia;

    if (DB.comp.length > 0) await syncRows('kvn_comp', DB.comp, compKey);
    if (DB.movp.length > 0) await syncRows('kvn_movp', DB.movp, movpKey);
    if (DB.stock.length > 0) await syncRows('kvn_stock', DB.stock, stockKey);
    if (DB.caja.length > 0) await syncRows('kvn_caja', DB.caja, cajaKey);

    console.log('[KBI] ✅ Sincronización con Supabase completada. Comp:', DB.comp.length, 'Movp:', DB.movp.length, 'Stock:', DB.stock.length, 'Caja:', DB.caja.length);
  } catch (err) {
    console.error('[KBI] Error sincronizando con Supabase:', err);
  }
}

async function syncRows(table, rows, keyFn) {
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize).map(r => prepareForSupabase(r, keyFn));
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) {
      console.error('[KBI] Error en upsert de', table, '(batch', i, '-', i + batchSize, '):', error);
      throw error;
    }
  }
}

export async function loadAllData() {
  let success = false;

  // Try Supabase first
  if (supabase) {
    try {
      console.log('[KBI] Intentando cargar datos de Supabase...');
      const sucsData = await fetchAll('kvn_sucursales');

      if (sucsData.length > 0) {
        setSucursales(sucsData.map(s => s.name));
        
        const loadedData = await fetchAll('kvn_loaded', 'created_at');
        
        if (loadedData.length > 0) {
          console.log('[KBI] Supabase tiene datos. Cargando todo...');
          const [compData, movpData, stockData, cajaData] = await Promise.all([
            fetchAll('kvn_comp'),
            fetchAll('kvn_movp'),
            fetchAll('kvn_stock'),
            fetchAll('kvn_caja')
          ]);

          clearDB('comp', true); clearDB('movp', true); clearDB('stock', true); clearDB('caja', true);
          
          compData.forEach(r => addDBRecord('comp', r.id, r));
          movpData.forEach(r => addDBRecord('movp', r.id, r));
          stockData.forEach(r => addDBRecord('stock', r.id, r));
          cajaData.forEach(r => addDBRecord('caja', r.id, r));
          
          setLoaded(loadedData);
          console.log('[KBI] ✅ Datos cargados de Supabase — Comp:', compData.length, 'Movp:', movpData.length, 'Stock:', stockData.length, 'Caja:', cajaData.length);
          success = true;
        }
      }
    } catch (err) {
      console.error('[KBI] Error cargando de Supabase, reintentando con IndexedDB:', err);
    }
  }

  if (success) return true;

  // Fallback to IndexedDB
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
      cc.forEach(r => addDBRecord('comp', r.sucursal+'|'+r.prefijo+'|'+r.nro+'|'+r.letra+'|'+r.secuencia+'|'+r.tipo_pago, r));
      
      let mm = results[1] || [];
      mm.forEach(r => addDBRecord('movp', r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia+'|'+r.nro_comp+'|'+r.cod_prod+'|'+r.salida, r));
      
      let ss = results[2] || [];
      ss.forEach(r => addDBRecord('stock', r.sucursal+'|'+r.cod_prod+'|'+r.nombre_prod+'|'+r.talle+'|'+r.color, r));
      
      let ca = results[3] || [];
      ca.forEach(r => addDBRecord('caja', r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia, r));
      
      setLoaded(results[4]);
      console.log('[KBI] Datos cargados de IndexedDB (Total LOADED:', LOADED.length, ')');
      return true;
    }
    return results[5] ? true : false;
  } catch (err) {
    console.error('[KBI] Error cargando de IndexedDB:', err);
    return false;
  }
}

export function clearLocalData() {
  if (!window.localforage) return;
  if(confirm('¿Estás seguro de borrar TODOS los datos almacenados localmente de esta computadora?')) {
    window.localforage.clear().then(function() {
      alert('Datos borrados exitosamente. La página se recargará.');
      location.reload();
    });
  }
}
