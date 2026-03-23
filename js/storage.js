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
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

// Helper: prepare a record for Supabase (remove Date objects)
function prepareForSupabase(r, keyFn) {
  var clean = {};
  for (var k in r) {
    if (!r.hasOwnProperty(k)) continue;
    var v = r[k];
    if (v instanceof Date) continue;
    clean[k] = v;
  }
  clean.id = keyFn(r);
  return clean;
}

export function updateCloudUI(status){
  var dot = document.getElementById('cloudDot');
  var box = document.getElementById('cloudStatus');
  if(!dot || !box) return;
  if(status === 'syncing') {
    dot.style.background = '#e8c98a'; // Amarillo
    box.title = 'Sincronizando con Supabase...';
  } else if(status === 'ok') {
    dot.style.background = '#52c48a'; // Verde
    box.title = 'Sincronizado con Supabase';
  } else if(status === 'error') {
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
  await syncToSupabase();
}

export async function syncToSupabase() {
  if (!LOADED.length) return;
  if (!window.supabaseClient) return;
  updateCloudUI('syncing');
  try {
    var id_session = 'suc_' + (SUCURSALES[0] || 'default').replace(/\s/g,'_').toLowerCase();
    var payload = { comp: DB.comp, movp: DB.movp, stock: DB.stock, caja: DB.caja, loaded: LOADED, sucursales: SUCURSALES };
    var { data, error } = await window.supabaseClient.from('dashboard_cargas').upsert({ id: id_session, payload_json: payload, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
    console.log('[SUPABASE] Sincronización exitosa (' + id_session + ')');
    updateCloudUI('ok');
  } catch (e) {
    console.error('[SUPABASE] Error en sincronización:', e);
    updateCloudUI('error');
  }
}

async function syncRows(table, rows, keyFn) {
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize).map(r => prepareForSupabase(r, keyFn));
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) {
      console.error('[KBI] Error en upsert de', table, '(batch', i, '):', error);
      throw error;
    }
  }
}

export async function loadAllData() {
  updateCloudUI('syncing');
  let success = false;

  if (supabase) {
    try {
      console.log('[KBI] Intentando cargar datos de Supabase...');
      const sucsData = await fetchAll('kvn_sucursales');

      if (sucsData.length > 0) {
        setSucursales(sucsData.map(s => s.name));
      }

      // Load all data tables regardless of kvn_loaded status
      const [loadedData, compData, movpData, stockData, cajaData] = await Promise.all([
        fetchAll('kvn_loaded', 'created_at'),
        fetchAll('kvn_comp'),
        fetchAll('kvn_movp'),
        fetchAll('kvn_stock'),
        fetchAll('kvn_caja')
      ]);

      const hasData = compData.length > 0 || movpData.length > 0 || stockData.length > 0 || cajaData.length > 0;

      if (hasData) {
        clearDB('comp', true); clearDB('movp', true); clearDB('stock', true); clearDB('caja', true);

        compData.forEach(r => addDBRecord('comp', r.id, r));
        movpData.forEach(r => addDBRecord('movp', r.id, r));
        stockData.forEach(r => addDBRecord('stock', r.id, r));
        cajaData.forEach(r => addDBRecord('caja', r.id, r));

        if (loadedData.length > 0) {
          setLoaded(loadedData);
        } else {
          // kvn_loaded is empty — synthesize chips from data so the UI shows loaded files
          var synthesized = [];
          var countBySuc = function(arr) {
            var m = {};
            arr.forEach(r => { if (r.sucursal) m[r.sucursal] = (m[r.sucursal] || 0) + 1; });
            return m;
          };
          var addChips = function(arr, type, typeName) {
            var m = countBySuc(arr);
            Object.keys(m).forEach(s => {
              synthesized.push({ id: 'synth-' + type + '-' + s, suc: s, type: type, typeName: typeName, files: 1, n: m[s] });
            });
          };
          addChips(compData, 'comp', 'Comprobantes');
          addChips(movpData, 'movp', 'Mov. Productos');
          addChips(stockData, 'stock', 'Stock');
          addChips(cajaData, 'caja', 'Caja');
          setLoaded(synthesized);
          console.log('[KBI] kvn_loaded vacio — chips sintetizados:', synthesized.length);
        }

        console.log('[KBI] Cargados de Supabase — Comp:', compData.length, 'Movp:', movpData.length, 'Stock:', stockData.length, 'Caja:', cajaData.length);
        success = true;
      } else if (sucsData.length > 0) {
        success = true;
      } else {
        success = true; // No data yet, but connection was OK
      }
    } catch (err) {
      console.error('[KBI] Error cargando de Supabase, usando IndexedDB:', err);
      updateCloudUI('error');
    }
  } else {
    updateCloudUI('error');
  }

  if (success) {
      updateCloudUI('ok');
      return true;
  }

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
  if (confirm('Estas seguro de borrar TODOS los datos almacenados localmente de esta computadora?')) {
    window.localforage.clear().then(function() {
      alert('Datos borrados exitosamente. La pagina se recargara.');
      location.reload();
    });
  }
}
