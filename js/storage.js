import { DB, LOADED, setLoaded, clearDB, addDBRecord } from './state.js';

export function saveAllData() {
  window.localforage.setItem('KVN_DB_COMP', DB.comp);
  window.localforage.setItem('KVN_DB_MOVP', DB.movp);
  window.localforage.setItem('KVN_DB_STOCK', DB.stock);
  window.localforage.setItem('KVN_DB_CAJA', DB.caja);
  window.localforage.setItem('KVN_LOADED', LOADED);
  console.log('[KBI] Datos guardados en IndexedDB.');
}

export function loadAllData() {
  return Promise.all([
    window.localforage.getItem('KVN_DB_COMP'),
    window.localforage.getItem('KVN_DB_MOVP'),
    window.localforage.getItem('KVN_DB_STOCK'),
    window.localforage.getItem('KVN_DB_CAJA'),
    window.localforage.getItem('KVN_LOADED')
  ]).then(function(results) {
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
    return false;
  }).catch(function(err) {
    console.error('[KBI] Error cargando de IndexedDB:', err);
    return false;
  });
}

export function clearLocalData() {
  if(confirm('¿Estás seguro de borrar TODOS los datos almacenados localmente de esta computadora?')) {
    window.localforage.clear().then(function() {
      alert('Datos borrados exitosamente. La página se recargará.');
      location.reload();
    });
  }
}
