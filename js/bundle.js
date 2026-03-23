(function(){
// === js/utils.js ===
function pMoney(v){if(v===''||v===null||v===undefined)return 0;if(typeof v==='number')return v;var s=String(v).trim();if(!s)return 0;if(/^-?\d+(\.\d+)?$/.test(s))return parseFloat(s)||0;return parseFloat(s.replace(/[$\s]/g,'').replace(/\./g,'').replace(',','.'))||0;}
function pNum(v){if(typeof v==='number')return v;return parseFloat(String(v||'').replace(',','.'))||0;}
function pDate(v){
  if(!v)return null;
  if(v instanceof Date)return isNaN(v.getTime())?null:v;
  if(typeof v==='number'){var d=new Date(Math.round((v-25569)*86400*1000));if(!isNaN(d.getTime()))return d;}
  var s=String(v).trim();
  var sn=parseFloat(s);
  if(!isNaN(sn)&&sn>30000&&sn<70000&&!/[,\/\-]/.test(s)){var d=new Date(Math.round((sn-25569)*86400*1000));if(!isNaN(d.getTime())&&d.getFullYear()>=1900&&d.getFullYear()<=2100)return d;}
  var m=s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if(m){var y=parseInt(m[3]);if(y<100)y+=2000;return new Date(y,parseInt(m[2])-1,parseInt(m[1]));}
  m=s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if(m)return new Date(parseInt(m[1]),parseInt(m[2])-1,parseInt(m[3]));
  var d2=new Date(s);return isNaN(d2.getTime())?null:d2;
}
function ST(v){return String(v||'').trim();}
function gel(id){return document.getElementById(id);}
function fm(n){return '$\u00a0'+Math.round(n).toLocaleString('es-AR');}
function fn(n){return Math.round(n).toLocaleString('es-AR');}
function fd(n){return parseFloat(n).toFixed(2);}
function emptyMsg(m){return'<div class="empty">'+m+'</div>';}
function vendCod(v){if(!v)return'';var s=String(v).trim();var m=s.match(/^0*(\d+)[-–\s]/);if(m)return m[1];m=s.match(/^0*(\d+)$/);if(m)return m[1];return s;}
function vendNombre(v){if(!v)return'';var s=String(v).trim();var m=s.match(/^\d+[-–]\s*(.+)$/);if(m)return m[1].trim();return s;}
function getCol(row,name){
  var target=String(name).toUpperCase().replace(/[\s_]/g,'');
  var keys=Object.keys(row);
  for(var i=0;i<keys.length;i++){
    if(String(keys[i]).toUpperCase().replace(/[\s_]/g,'')===target){
      var val=row[keys[i]];
      if(val===null||val===undefined)return '';
      if(val instanceof Date||typeof val==='number')return val;
      return ST(val);
    }
  }
  return '';
}

function uniqueTickets(comp){var seen={},out=[];comp.forEach(function(r){var k=r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.prefijo+'|'+r.nro+'|'+r.letra+'|'+r.secuencia;if(!seen[k]){seen[k]=true;out.push(r);}});return out;}
function groupSum(arr,key,fields){var m={};arr.forEach(function(r){var k=r[key]||'—';if(!m[k]){m[k]={_n:0};fields.forEach(function(f){m[k][f]=0;});}m[k]._n++;fields.forEach(function(f){m[k][f]+=(r[f]||0);});});return m;}

function showToast(msg,type,duration){
  type=type||'info';duration=duration||3500;
  var c=document.getElementById('toast-container');
  if(!c) return;
  var t=document.createElement('div');
  t.className='toast '+type;t.innerHTML=msg;
  c.appendChild(t);
  setTimeout(function(){t.classList.add('hiding');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},260);},duration);
}

function exportCSV(tableContainerId,filename){
  var container=document.getElementById(tableContainerId);
  if(!container)return;
  var table=container.querySelector('table');
  if(!table){showToast('No hay datos para exportar','info');return;}
  var csv=[],rows=table.querySelectorAll('tr');
  rows.forEach(function(row){
    var cols=row.querySelectorAll('th,td');
    var line=[];
    cols.forEach(function(col){
      var clone = col.cloneNode(true);
      var sortIcs = clone.querySelectorAll('.sort-ic');
      sortIcs.forEach(i => i.remove());
      var text=clone.textContent.replace(/"/g,'""').trim();
      line.push('"'+text+'"');
    });
    csv.push(line.join(','));
  });
  var blob=new Blob(['\uFEFF'+csv.join('\n')],{type:'text/csv;charset=utf-8;'});
  var link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=(filename||'export')+'_'+new Date().toISOString().slice(0,10)+'.csv';
  link.click();
  showToast('📥 CSV exportado: '+link.download,'success');
}

// === js/supabase.js ===
// === js/supabase.js ===
const SUPABASE_URL = 'https://sooutfkhgoofczdrjqis.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JKRgvgMKXSRKEw05wC2uNA_SD30xl0V';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!supabase) {
    console.error('[KBI] Supabase SDK not found. Make sure to include it in index.html');
} else {
    console.log('[KBI] Supabase client initialized.');
}

// === js/state.js ===
var DB={comp:[],movp:[],stock:[],caja:[]};
var SEEN={comp:{},movp:{},stock:{},caja:{}};
var SUCURSALES=[];
var LOADED=[];
var curPage='resu';

function setSucursales(sucs) { SUCURSALES.splice(0, SUCURSALES.length, ...sucs); }
function setLoaded(l) { LOADED.splice(0, LOADED.length, ...l); }
function setCurPage(p) { curPage = p; }
function clearDB(type, forceEmpty) {
  if(forceEmpty || !LOADED.some(function(l){return l.type===type;})){
    DB[type].splice(0, DB[type].length);
    for (const key in SEEN[type]) delete SEEN[type][key];
  }
}
function addDBRecord(t, k, r) {
  SEEN[t][k] = true;
  DB[t].push(r);
}

var ALL_PROD_ROWS=[];
var ALL_PROD_PESOS_ROWS=[];
function setAllProdRows(r) { ALL_PROD_ROWS.splice(0, ALL_PROD_ROWS.length, ...r); }
function setAllProdPesosRows(r) { ALL_PROD_PESOS_ROWS.splice(0, ALL_PROD_PESOS_ROWS.length, ...r); }

const PALETTE=['#c9a96e','#5a9fd4','#52c48a','#e07b9a','#9b7fd4','#4ec9b0','#e8c98a','#e05252','#73c6e8','#a3d977'];
const DOW_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_NOMBRE=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getA(){return parseInt(document.getElementById('fAnio').value)||0;}
function getM(){return parseInt(document.getElementById('fMes').value)||0;}
function getC(){return document.getElementById('fCaja').value;}
function getDesde(){return document.getElementById('fDesde').value;}
function getHasta(){return document.getElementById('fHasta').value;}
function checkRange(r, a, m, c, d, h) {
  if((a&&r.anio!==a)||(m&&r.mes!==m)||(c&&r.sucursal!==c)) return false;
  if(d || h) {
    var rStr = r.anio + '-' + (r.mes<10?'0'+r.mes:r.mes) + '-' + (r.dia<10?'0'+r.dia:r.dia);
    if(d && rStr < d) return false;
    if(h && rStr > h) return false;
  }
  return true;
}

function normalizeNro(nro) {
  if (!nro) return '';
  var s = String(nro).replace(/[^0-9\-]/g, '');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!s) return '';
  return s.split('-').map(p => p.replace(/^0+/, '') || '0').join('-');
}
function getValidComps() {
  if(!DB.comp.length) return null;
  var valid = new Set();
  for(let i=0; i<DB.comp.length; i++) {
    var c = DB.comp[i];
    if(c.nro){
      var norm = normalizeNro(c.nro);
      if (norm) valid.add(norm);
      if (norm && norm.indexOf('-') !== -1) valid.add(norm.split('-').pop());
      if (c.prefijo && String(c.nro).indexOf('-') === -1) {
        var pNorm = normalizeNro(c.prefijo + '-' + c.nro);
        if (pNorm) valid.add(pNorm);
      }
    }
  }
  return valid;
}
function fComp(){var a=getA(),m=getM(),c=getC(),d=getDesde(),h=getHasta();return DB.comp.filter(function(r){return checkRange(r,a,m,c,d,h);});}
function fMovp(){
  var a=getA(),m=getM(),c=getC(),d=getDesde(),h=getHasta(),valid=getValidComps();
  return DB.movp.filter(function(r){
    if(!checkRange(r,a,m,c,d,h)) return false;
    if(!valid) return true;
    if(!r.nro_comp) return false;
    var norm_movp = normalizeNro(r.nro_comp); if(!norm_movp) return false; return valid.has(norm_movp);
  });
}
function fStock(){var c=getC();return DB.stock.filter(function(r){return!c||r.sucursal===c;});}
function fMovpBySuc(){
  var c=getC(),valid=getValidComps(),d=getDesde(),h=getHasta();
  return DB.movp.filter(function(r){
    if(!checkRange(r,0,0,c,d,h)) return false;
    if(!valid) return true;
    if(!r.nro_comp) return false;
    var norm_movp = normalizeNro(r.nro_comp); if(!norm_movp) return false; return valid.has(norm_movp);
  });
}



// === js/components/tables.js ===
function mkTH(t,r, sortKey, sortType){return{t:t,r:!!r, sk: sortKey, st: sortType};}
function mkTD(v,r, rawValue){return{v:v,r:!!r, raw: rawValue};}

let currentSortId = null;
let currentSortCol = null;
let currentSortDir = -1; // -1 for descending, 1 for ascending

function resetSort() {
  currentSortId = null;
  currentSortCol = null;
  currentSortDir = -1;
}

function buildTable(heads, rows, totRow, tableId) {
  var ths = heads.map(function(h, cIdx) {
    var cls = h.r ? ' class="r"' : '';
    let content = h.t;
    let arrow = '';
    
    if (tableId && h.sk) {
      cls = ' class="' + (h.r ? 'r ' : '') + 'sortable"';
      if (currentSortId === tableId && currentSortCol === cIdx) {
        arrow = currentSortDir === 1 ? ' <span class="sort-ic">▲</span>' : ' <span class="sort-ic">▼</span>';
        cls = ' class="' + (h.r ? 'r ' : '') + 'sortable active-sort"';
      }
      return `<th${cls} onclick="window.doSort('${tableId}', ${cIdx})">${content}${arrow}</th>`;
    }
    return `<th${cls}>${content}</th>`;
  }).join('');

  let sortedRows = [...rows];
  if (tableId && currentSortId === tableId && currentSortCol !== null) {
    sortedRows.sort((a, b) => {
      let cellA = a[currentSortCol];
      let cellB = b[currentSortCol];
      
      let valA = cellA && cellA.raw !== undefined ? cellA.raw : (cellA && cellA.v !== undefined ? cellA.v : cellA);
      let valB = cellB && cellB.raw !== undefined ? cellB.raw : (cellB && cellB.v !== undefined ? cellB.v : cellB);
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * currentSortDir;
      }
      return ((valA||0) - (valB||0)) * currentSortDir;
    });
  }

  var trs = sortedRows.map(function(r) {
    return '<tr>' + r.map(function(c) {
      var val = typeof c === 'object' && c !== null && 'v' in c ? c.v : c;
      var rt = typeof c === 'object' && c !== null && c.r;
      return '<td' + (rt ? ' class="r"' : '') + '>' + (val == null ? '' : val) + '</td>';
    }).join('') + '</tr>';
  }).join('');

  var tot = totRow ? '<tr class="tot">' + totRow.map(function(c) {
    var val = typeof c === 'object' && c !== null && 'v' in c ? c.v : c;
    var rt = typeof c === 'object' && c !== null && c.r;
    return '<td' + (rt ? ' class="r"' : '') + '>' + (val == null ? '' : val) + '</td>';
  }).join('') + '</tr>' : '';

  return '<table><thead><tr>' + ths + '</tr></thead><tbody>' + trs + tot + '</tbody></table>';
}

function handleSort(tableId, colIdx, renderCb) {
  if (currentSortId === tableId && currentSortCol === colIdx) {
    currentSortDir *= -1;
  } else {
    currentSortId = tableId;
    currentSortCol = colIdx;
    currentSortDir = -1;
  }
  renderCb();
}

// === js/storage.js ===

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

function updateCloudUI(status){
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

async function saveAllData() {
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

async function syncToSupabase() {
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

async function loadAllData() {
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

function clearLocalData() {
  if (!window.localforage) return;
  if (confirm('Estas seguro de borrar TODOS los datos almacenados localmente de esta computadora?')) {
    window.localforage.clear().then(function() {
      alert('Datos borrados exitosamente. La pagina se recargara.');
      location.reload();
    });
  }
}

// === js/excelParser.js ===

function makeKey(t,r){
  if(t==='comp') return r.sucursal+'|'+r.prefijo+'|'+r.nro+'|'+r.letra+'|'+r.secuencia+'|'+r.tipo_pago;
  if(t==='movp') return r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia+'|'+r.nro_comp+'|'+r.cod_prod+'|'+r.salida;
  if(t==='stock')return r.sucursal+'|'+r.cod_prod+'|'+r.nombre_prod+'|'+r.talle+'|'+r.color;
  if(t==='caja') return r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia;
  return Math.random().toString(36);
}

function doParseComp(rows,suc){
  var out=[];
  rows.forEach(function(r){
    var fecha=pDate(getCol(r,'FECHA'));var imp=pMoney(getCol(r,'IMPORTE_TOTAL'));if(!fecha||!imp)return;
    var vRaw=getCol(r,'VENDEDOR');
    out.push({sucursal:suc,fecha:fecha,anio:fecha.getFullYear(),mes:fecha.getMonth()+1,dia:fecha.getDate(),dow:fecha.getDay(),
      nro:getCol(r,'NUMERO_COMPROBANTE')||getCol(r,'NUMERO'),prefijo:getCol(r,'PREFIJO'),letra:getCol(r,'LETRA'),
      tipo_comp:getCol(r,'DESCRIPCION_COMPROBANTE')||getCol(r,'ID_TIPO_COMPROBANTE'),
      cliente:getCol(r,'NOMBRE_CLIENTE')||'CONSUMIDOR FINAL',importe:imp,
      tipo_pago:getCol(r,'NOMBRE_PAGO')||getCol(r,'TIPO_PAGO'),
      vend_raw:vRaw,vend_cod:vendCod(vRaw),vend_nombre:vendNombre(vRaw),secuencia:getCol(r,'SECUENCIA')});
  });
  return out;
}

function doParseMovp(rows,suc){
  var out=[];
  rows.forEach(function(r){
    var fecha=pDate(getCol(r,'FECHA'));if(!fecha)return;
    var vRaw=getCol(r,'VENDEDOR');
    out.push({sucursal:suc,fecha:fecha,anio:fecha.getFullYear(),mes:fecha.getMonth()+1,dia:fecha.getDate(),dow:fecha.getDay(),
      cod_prod:getCol(r,'CODIGO_PRODUCTO'),nro_comp:getCol(r,'NUMERO_COMPROBANTE'),
      desc_prod:getCol(r,'DESCRIPCION_PRODUCTO'),salida:pNum(getCol(r,'CANTIDAD_SALIDA')),
      entrada:pNum(getCol(r,'CANTIDAD_ENTRADA')),importe:pMoney(getCol(r,'IMPORTE_VALORIZACION')),
      vend_raw:vRaw,vend_cod:vendCod(vRaw),vend_nombre:vendNombre(vRaw),
      rubro:getCol(r,'RUBRO') || getCol(r,'NOMBRE_CLASIFICACION_2') || getCol(r,'FAMILIA'),
      subrubro:getCol(r,'SUBRUBRO') || getCol(r,'NOMBRE_CLASIFICACION_3') || getCol(r,'CLASIFICACION_3') || getCol(r,'SUBFAMILIA') || getCol(r,'NOMBRE_RUBRO'),
      talle:getCol(r,'CODIGO_TALLE'),color:getCol(r,'CODIGO_COLOR'),
      tipo_comp:getCol(r,'TIPO_COMPROBANTE')||getCol(r,'ID_TIPO_COMPROBANTE')||getCol(r,'TIPO'),
      concepto:getCol(r,'CONCEPTO')||getCol(r,'DESCRIPCION_MOVIMIENTO')});
  });
  return out;
}

function doParseStock(rows,suc){
  var out=[];
  var colNombreRubro='', colNombreClas2='', colNombreClas1='';
  if(rows.length>0){
    Object.keys(rows[0]).forEach(function(k){
      var ku=k.toUpperCase().replace(/[^A-Z0-9]/g,'');
      if(ku.indexOf('SUBRUBRO')!==-1 || ku==='NOMBRERUBRO' || ku==='SUBFAMILIA' || ku.indexOf('CLASIFICACION3')!==-1) colNombreRubro=k;
      if(ku==='NOMBRECLASIFICACION2' || ku==='RUBRO' || ku==='FAMILIA' || ku==='CLASIFICACION2') colNombreClas2=k;
      if(ku==='NOMBRECLASIFICACION1' || ku==='GENERO' || ku==='CLASIFICACION1') colNombreClas1=k;
    });
  }
  var lastSubRubro='', lastRubroPadre='', lastClas1='';
  rows.forEach(function(r){
    var np=getCol(r,'NOMBRE_PRODUCTO'),cp=getCol(r,'CODIGO_PRODUCTO');
    if(!np&&!cp)return;

    var rawRubro = colNombreClas2 ? ST(r[colNombreClas2]||'') : (getCol(r,'NOMBRE_CLASIFICACION_2') || getCol(r,'RUBRO') || getCol(r,'FAMILIA'));
    if(rawRubro && rawRubro !== lastRubroPadre){ 
      lastRubroPadre = rawRubro; 
      lastSubRubro = ''; // Reset subrubro when parent changes
    }
    var rubro = lastRubroPadre || '—';

    var rawSub = colNombreRubro ? ST(r[colNombreRubro]||'') : (getCol(r,'NOMBRE_RUBRO') || getCol(r,'SUBRUBRO') || getCol(r,'NOMBRE_CLASIFICACION_3') || getCol(r,'CLASIFICACION_3'));
    if(rawSub) lastSubRubro = rawSub;
    var subrubro = lastSubRubro || '—';

    var rawClas1 = colNombreClas1 ? ST(r[colNombreClas1]||'') : getCol(r,'NOMBRE_CLASIFICACION_1');
    if(rawClas1) lastClas1 = rawClas1;
    var clas1 = lastClas1 || '—';

    out.push({sucursal:suc,
      nombre_rubro:rubro,
      nombre_subrubro:subrubro,
      cod_rubro:getCol(r,'RUBRO'),
      unidades:pNum(getCol(r,'UNIDADES_VENDIDAS')),
      imp_costo:pMoney(getCol(r,'IMPORTE_COSTO')),
      imp_venta:pMoney(getCol(r,'IMPORTE_VENTA')),
      stock:pNum(getCol(r,'STOCK')||'0'),
      cod_prod:cp,nombre_prod:np,
      talle:getCol(r,'CODIGO_TALLE'),color:getCol(r,'CODIGO_COLOR'),
      clas1:clas1,clas2:rubro});
  });
  return out;
}

function doParseCaja(rows,suc){
  var out=[];
  rows.forEach(function(r){
    var fecha=pDate(getCol(r,'FECHA'));var v=pMoney(getCol(r,'VENTAS'));if(!fecha||!v)return;
    out.push({sucursal:suc,fecha:fecha,anio:fecha.getFullYear(),mes:fecha.getMonth()+1,dia:fecha.getDate(),
      ventas:v,gastos:pMoney(getCol(r,'GASTOS')),tarjetas:pMoney(getCol(r,'TARJETAS')),efectivo:pMoney(getCol(r,'EFECTIVO_TESORERIA'))});
  });
  return out;
}

function handleFiles(ev, renderLoadedFn, buildFiltersFn, doRenderFn){
  var files=Array.from(ev.target.files);if(!files.length)return;
  var suc=document.getElementById('sucSelect').value,t=document.getElementById('tipoSelect').value;if(!suc)return;
  var total=files.length,done=0,added=0,failedFiles=[];
  files.forEach(function(file){
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb;
        if(file.name.toLowerCase().indexOf('.csv')!==-1)wb=window.XLSX.read(e.target.result,{type:'string',cellDates:true});
        else wb=window.XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var allRows=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
        var keyAlts={
          comp:['IMPORTETOTAL','IMPTOTAL','IMPORTECOMPROBANTE','TOTAL'],
          movp:['CANTIDADSALIDA','CANTSALIDA','CANTSAL'],
          stock:['UNIDADESVENDIDAS','UNIDVENDIDAS','UNDVENDIDAS','CANTVENDIDA','UNIVENDIDAS','STOCK','STOCKACTUAL','EXISTENCIA','SALDO','CODIGOPRODUCTO','NOMBREPRODUCTO','DESCRIPCIONPRODUCTO','IMPORTEVENTA','IMPORTECOSTO','CODIGOTALLE','CODIGOCOLOR'],
          caja:['VENTAS','VENTASTOTAL','TOTALVENTAS']
        };
        var keys=keyAlts[t],headerIdx=-1;
        for(var i=0;i<Math.min(25,allRows.length)&&headerIdx===-1;i++){
          var nonEmpty=allRows[i].filter(function(c){return c!==''&&c!==null&&c!==undefined;}).length;
          if(nonEmpty<3)continue;
          var normalized=allRows[i].map(function(c){return ST(String(c)).toUpperCase().replace(/[^A-Z0-9]/g,'');});
          for(var ki=0;ki<keys.length&&headerIdx===-1;ki++){
            if(normalized.indexOf(keys[ki])!==-1){headerIdx=i;break;}
          }
        }
        if(headerIdx!==-1){
          var rows=window.XLSX.utils.sheet_to_json(ws,{defval:'',raw:true,range:headerIdx});
          console.log('[KBI] Tipo:',t,'| Suc:',suc,'| Header fila:',headerIdx,'| Filas:',rows.length);
          var parsed=[];
          if(t==='comp') parsed=doParseComp(rows,suc);
          if(t==='movp') parsed=doParseMovp(rows,suc);
          if(t==='stock')parsed=doParseStock(rows,suc);
          if(t==='caja') parsed=doParseCaja(rows,suc);
          parsed.forEach(function(r){var k=makeKey(t,r);if(!SEEN[t][k]){addDBRecord(t, k, r);added++;}});
        } else {
          console.warn('[KBI] Header no encontrado para "'+t+'" — buscando:',keys.join(', '));
          failedFiles.push(file.name);
        }
      }catch(err){console.error(file.name,err);failedFiles.push(file.name);}
      done++;
      if(done===total){
        if(added>0){
          var TN={comp:'Comprobantes',movp:'Mov. Productos',stock:'Stock',caja:'Caja'};
          let newLoaded = [...LOADED, {id:'l'+Date.now(),suc:suc,type:t,typeName:TN[t],files:total,n:added}];
          setLoaded(newLoaded);
          renderLoadedFn();buildFiltersFn();doRenderFn();
          saveAllData(); // Guardar en IndexedDB
          document.getElementById('config-body').classList.remove('open');document.getElementById('config-arrow').classList.remove('open');
          showToast('✅ '+added+' registros cargados y guardados','success');
        }
        if(failedFiles.length){
          showToast('⚠️ Formato no reconocido en: '+failedFiles.join(', ')+'. Verificá que el tipo de archivo seleccionado sea el correcto.','error',6000);
        }
      }
    };
    if(file.name.toLowerCase().indexOf('.csv')!==-1)reader.readAsText(file,'UTF-8');else reader.readAsArrayBuffer(file);
  });
}

// === js/views/facturacion.js ===

function renderMensualFact(tkts, movp) {
  var mesF={};
  tkts.forEach(function(r){
    var k=String(r.mes);
    mesF[k]=(mesF[k]||0)+r.importe;
  });

  var listFact=Object.keys(mesF).map(function(k){
    return{mes:parseInt(k),imp:mesF[k]};
  }).sort(function(a,b){return b.imp-a.imp;});

  var tF=listFact.reduce(function(a,r){return a+r.imp;},0);
  if(listFact.length){
    // YoY/MoM can be inferred if we have multiple months, since we sort by desc imp, let's sort by month asc to calculate MoM
    let listTemporal = [...listFact].sort((a,b)=>a.mes - b.mes);
    let momMap = {};
    for (let i = 1; i < listTemporal.length; i++) {
        let prev = listTemporal[i-1].imp;
        let act = listTemporal[i].imp;
        if(prev > 0) momMap[listTemporal[i].mes] = ((act/prev) - 1) * 100;
    }

    document.getElementById('tbl-mes-fact').innerHTML=buildTable(
      [mkTH('#',true),mkTH('Mes'),mkTH('Facturación',true),mkTH('% del Total',true), mkTH('MoM',true)],
      listFact.map(function(r,i){
        var pct=tF>0?(r.imp/tF*100):0;
        let momHit = momMap[r.mes];
        let momCell = '';
        if(momHit !== undefined) {
             let clr = momHit > 0 ? 'var(--green)' : (momHit < 0 ? 'var(--red)' : '');
             let arrow = momHit > 0 ? '▲' : (momHit < 0 ? '▼' : '');
             momCell = `<span style="color:${clr};font-size:11px">${arrow} ${Math.abs(momHit).toFixed(1)}%</span>`;
        }
        return[
          mkTD(String(i+1),true, i+1),
          mkTD(MESES_NOMBRE[r.mes-1]||String(r.mes),false, r.mes),
          mkTD(fm(r.imp),true, r.imp),
          mkTD(pct.toFixed(1)+'%',true, pct),
          mkTD(momCell,true, momHit || 0)
        ];
      }),
      ['','Total',mkTD(fm(tF),true),mkTD('100%',true), ''],
      'tbl-mes-fact'
    );
  } else {
    document.getElementById('tbl-mes-fact').innerHTML=emptyMsg('Sin datos');
  }
}

function renderMensualUni(tkts, movp) {
  var mesU={};
  movp.forEach(function(r){
    var k=String(r.mes);
    mesU[k]=(mesU[k]||0)+r.salida;
  });

  var listUni=Object.keys(mesU).map(function(k){
    return{mes:parseInt(k),uni:mesU[k]};
  }).sort(function(a,b){return b.uni-a.uni;});

  var tU=listUni.reduce(function(a,r){return a+r.uni;},0);
  if(listUni.length){
    let listTemporal = [...listUni].sort((a,b)=>a.mes - b.mes);
    let momMap = {};
    for (let i = 1; i < listTemporal.length; i++) {
        let prev = listTemporal[i-1].uni;
        let act = listTemporal[i].uni;
        if(prev > 0) momMap[listTemporal[i].mes] = ((act/prev) - 1) * 100;
    }

    document.getElementById('tbl-mes-uni').innerHTML=buildTable(
      [mkTH('#',true),mkTH('Mes'),mkTH('Unidades',true),mkTH('% del Total',true), mkTH('MoM', true)],
      listUni.map(function(r,i){
        var pct=tU>0?(r.uni/tU*100):0;
        let momHit = momMap[r.mes];
        let momCell = '';
        if(momHit !== undefined) {
             let clr = momHit > 0 ? 'var(--green)' : (momHit < 0 ? 'var(--red)' : '');
             let arrow = momHit > 0 ? '▲' : (momHit < 0 ? '▼' : '');
             momCell = `<span style="color:${clr};font-size:11px">${arrow} ${Math.abs(momHit).toFixed(1)}%</span>`;
        }
        return[
          mkTD(String(i+1),true, i+1),
          mkTD(MESES_NOMBRE[r.mes-1]||String(r.mes), false, r.mes),
          mkTD(fn(r.uni),true, r.uni),
          mkTD(pct.toFixed(1)+'%',true, pct),
          mkTD(momCell, true, momHit || 0)
        ];
      }),
      ['','Total',mkTD(fn(tU),true),mkTD('100%',true), ''],
      'tbl-mes-uni'
    );
  } else {
    document.getElementById('tbl-mes-uni').innerHTML=emptyMsg('Sin datos');
  }
}

function renderDowRanking(tkts,movp){
  var dd={};for(var d=0;d<7;d++)dd[d]={imp:0,tkt:0,uni:0,dias:{}};
  tkts.forEach(function(r){if(r.dow==null)return;dd[r.dow].imp+=r.importe;dd[r.dow].tkt++;dd[r.dow].dias[r.anio+'-'+r.mes+'-'+r.dia]=true;});
  movp.forEach(function(r){if(r.dow!=null) dd[r.dow].uni+=r.salida;});
  var list=[];for(var d=0;d<7;d++){if(dd[d].imp>0){var nd=Math.max(1,Object.keys(dd[d].dias).length);list.push({short:DOW_SHORT[d],imp:dd[d].imp,uni:dd[d].uni,pImp:dd[d].imp/nd,pTkt:dd[d].tkt/nd});}}
  list.sort(function(a,b){return b.imp-a.imp;});
  if(!list.length){document.getElementById('dow-ranking').innerHTML='<div style="padding:10px;font-size:11px;color:var(--muted);text-align:center">Sin datos</div>';return;}
  var mI=list[0].imp,mU=Math.max.apply(null,list.map(function(r){return r.uni;}));
  var RC=['#c9a96e','#aaaaaa','#c97744','#5a9fd4','#52c48a','#9b7fd4','#e07b9a'];
  var html='';
  list.forEach(function(r,i){
    var cls=i===0?'r1':i===1?'r2':i===2?'r3':'';
    var pI=mI>0?(r.imp/mI*100):0,pU=mU>0?(r.uni/mU*100):0,col=RC[i]||'var(--muted)';
    html+='<div class="dow-row"><div class="dow-rank '+cls+'">'+(i+1)+'</div><div class="dow-name" style="color:'+col+'">'+r.short+'</div><div class="dow-bars">';
    html+='<div class="dow-bar-wrap"><div class="dow-bar-lbl">$</div><div class="dow-bar-bg"><div class="dow-bar-fill" style="width:'+pI.toFixed(1)+'%;background:'+col+'"></div></div><div class="dow-bar-val">'+fm(r.imp)+'</div></div>';
    html+='<div class="dow-bar-wrap"><div class="dow-bar-lbl">U</div><div class="dow-bar-bg"><div class="dow-bar-fill" style="width:'+pU.toFixed(1)+'%;background:'+col+';opacity:.6"></div></div><div class="dow-bar-val">'+fn(r.uni)+' un.</div></div>';
    html+='<div style="font-size:9px;color:var(--muted);margin-top:1px">Prom/día: '+fm(r.pImp)+' · '+Math.round(r.pTkt)+' tkts</div>';
    html+='</div></div>';
  });
  document.getElementById('dow-ranking').innerHTML=html;
}

function renderFact(){
  var comp=fComp(),movp=fMovp();
  if(!comp.length&&!movp.length){
    document.getElementById('kpi-fact').innerHTML=emptyMsg('Configurá las sucursales y cargá los archivos');
    document.getElementById('tbl-suc').innerHTML='';
    document.getElementById('tbl-diaria').innerHTML='';
    document.getElementById('dow-ranking').innerHTML='';
    return;
  }
  var tkts=uniqueTickets(comp);
  var tF=0;tkts.forEach(function(r){tF+=r.importe;});
  var tT=tkts.length,tU=0;movp.forEach(function(r){tU+=r.salida;});
  var tP=tT>0?tF/tT:0,cxt=tT>0?tU/tT:0;
  
  const mkKpi = (l,v,cls) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-val ${cls||''}">${v}</div></div>`;
  
  document.getElementById('kpi-fact').innerHTML=mkKpi('Facturación Total',fm(tF))+mkKpi('Unidades',fn(tU))+mkKpi('Tickets',fn(tT))+mkKpi('Cantidad x Ticket',fd(cxt))+mkKpi('Ticket Promedio',fm(tP),'gold')+mkKpi('Costo x Unidad',tU>0?fm(tF/tU):'-','gold');
  
  var sM=groupSum(tkts,'sucursal',['importe']),sU2={};
  movp.forEach(function(r){sU2[r.sucursal]=(sU2[r.sucursal]||0)+r.salida;});
  var cSel=getC();
  var sRows=SUCURSALES.filter(function(s){return sM[s]||sU2[s];}).map(function(s){var imp=sM[s]?sM[s].importe:0,u=sU2[s]?sU2[s].salida:0,t=0;tkts.forEach(function(r){if(r.sucursal===s)t++;});return{k:s,i:imp,u:u,t:t};}).sort(function(a,b){return b.i-a.i;});
  var hlIdx=undefined;if(cSel)for(var i=0;i<sRows.length;i++)if(sRows[i].k===cSel){hlIdx=i;break;}
  
  document.getElementById('tbl-suc').innerHTML=buildTable(
    [mkTH('Sucursal',false,'k'),mkTH('Fact',true,'i'),mkTH('Unidades',true,'u'),mkTH('Tkt',true,'t'),mkTH('Cant/Tkt',true,'cxt'),mkTH('Tkt Prom',true,'tp')],
    sRows.map(function(r){return[
        mkTD(r.k, false, r.k),
        mkTD(fm(r.i),true, r.i),
        mkTD(fn(r.u),true, r.u),
        mkTD(fn(r.t),true, r.t),
        mkTD(r.t>0?fd(r.u/r.t):'-',true, r.t>0?r.u/r.t:0),
        mkTD(r.t>0?fm(r.i/r.t):'-',true, r.t>0?r.i/r.t:0)
    ];}),
    ['Total',mkTD(fm(tF),true),mkTD(fn(tU),true),mkTD(fn(tT),true),mkTD(fd(cxt),true),mkTD(fm(tP),true)],
    'tbl-suc'
  );
  if(hlIdx!==undefined){var trs=document.getElementById('tbl-suc').querySelectorAll('tbody tr');if(trs[hlIdx])trs[hlIdx].className='hl';}
  var DN=['dom','lun','mar','mié','jue','vie','sáb'],dM={};
  tkts.forEach(function(r){var k=r.anio+'-'+r.mes+'-'+r.dia;if(!dM[k])dM[k]={anio:r.anio,mes:r.mes,dia:r.dia,dow:r.fecha?DN[r.fecha.getDay()]:'',imp:0,tkt:0};dM[k].imp+=r.importe;dM[k].tkt++;});
  var uD={};movp.forEach(function(r){var k=r.anio+'-'+r.mes+'-'+r.dia;uD[k]=(uD[k]||0)+r.salida;});
  var dK=Object.keys(dM).sort(function(a,b){var pa=a.split('-'),pb=b.split('-');return(+pa[0]-+pb[0])||(+pa[1]-+pb[1])||(+pa[2]-+pb[2]);});
  
  if(dK.length){
    document.getElementById('chart-diaria').style.display='block';
    if(!window.chartDiaria) window.chartDiaria = window.echarts.init(document.getElementById('chart-diaria'));
    var tc = document.body.classList.contains('light-mode') ? '#334155' : '#f0ede8';
    var tcM = document.body.classList.contains('light-mode') ? '#64748b' : '#8a8680';
    var cX=[], cF=[], cU=[];
    dK.forEach(function(k){
      var v=dM[k];
      cX.push(v.dia+'/'+v.mes);
      cF.push(Math.round(v.imp));
      cU.push(uD[k]||0);
    });
    window.chartDiaria.setOption({
      tooltip:{trigger:'axis',axisPointer:{type:'cross'},formatter:function(p){
        var h='<b>'+p[0].axisValue+'</b><br/>';
        p.forEach(function(s){
          if(s.seriesName==='Facturación') h+=s.marker+' Facturación: <b>$ '+s.value.toLocaleString('es-AR')+'</b><br/>';
          else h+=s.marker+' Unidades: <b>'+s.value.toLocaleString('es-AR')+'</b><br/>';
        });return h;
      }},
      legend:{data:['Facturación','Unidades'],textStyle:{color:tc},bottom:0},
      grid:{left:'3%',right:'4%',bottom:'15%',top:'12%',containLabel:true},
      xAxis:[{type:'category',data:cX,axisLabel:{color:tcM}}],
      yAxis:[
        {type:'value',name:'$',nameTextStyle:{color:'#c9a96e'},axisLabel:{color:tcM,formatter:function(v){return'$ '+(v>=1000?(v/1000).toFixed(0)+'k':v);}},splitLine:{lineStyle:{color:'rgba(255,255,255,0.05)'}}},
        {type:'value',name:'Unidades',nameTextStyle:{color:'#52c48a'},axisLabel:{color:tcM},splitLine:{show:false}}
      ],
      series:[
        {name:'Facturación',type:'line',smooth:true,yAxisIndex:0,data:cF,itemStyle:{color:'#c9a96e'},areaStyle:{color:new window.echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(201,169,110,0.5)'},{offset:1,color:'rgba(201,169,110,0.0)'}])}},
        {name:'Unidades',type:'line',smooth:true,yAxisIndex:1,data:cU,itemStyle:{color:'#52c48a'}}
      ]
    });
  } else {
    document.getElementById('chart-diaria').style.display='none';
  }

  // To allow sorting by actual date, convert dK string back to Date or Unix for raw value
  document.getElementById('tbl-diaria').innerHTML=buildTable(
    [mkTH('Fecha',false,'f'),mkTH('Fact',true,'i'),mkTH('Unidades',true,'u'),mkTH('Tkt',true,'t')],
    dK.map(function(k){
        var v=dM[k];
        return[
            mkTD(v.dow+' '+v.dia+'/'+v.mes, false, new Date(v.anio, v.mes-1, v.dia).getTime()),
            mkTD(fm(v.imp),true, v.imp),
            mkTD(fn(uD[k]||0),true, uD[k]||0),
            mkTD(fn(v.tkt),true, v.tkt)
        ];
    }),
    ['Total',mkTD(fm(tF),true),mkTD(fn(tU),true),mkTD(fn(tT),true)],
    'tbl-diaria'
  );
  renderDowRanking(tkts,movp);
  renderMensualFact(tkts,movp);
  renderMensualUni(tkts,movp);

  // YoY Chart Logic
  var validComps = getValidComps();
  var cSel = getC();
  var yoyMovp = DB.movp.filter(function(r) {
    if (cSel && r.sucursal !== cSel) return false;
    if (!validComps) return true;
    if (!r.nro_comp) return false;
    var norm = normalizeNro(r.nro_comp);
    if (!norm) return false;
    return validComps.has(norm);
  });
  var yoyData = {};
  yoyMovp.forEach(function(r) {
    if (!r.anio || !r.mes) return;
    if (!yoyData[r.anio]) yoyData[r.anio] = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0 };
    yoyData[r.anio][r.mes] += r.salida;
  });
  var yoyCard = document.getElementById('yoy-card');
  var años = Object.keys(yoyData).sort();
  if (años.length > 0 && yoyCard) {
    yoyCard.style.display = 'block';
    if (!window.chartYOY) window.chartYOY = echarts.init(document.getElementById('chart-yoy'), document.body.classList.contains('light-mode') ? null : 'dark', {renderer: 'canvas'});
    var tcY = document.body.classList.contains('light-mode') ? '#334155' : '#f8fafc';
    var tcMY = document.body.classList.contains('light-mode') ? '#64748b' : '#94a3b8';
    var series = años.map(function(y, i) {
      return {
        name: y,
        type: 'line',
        smooth: true,
        symbolSize: 8,
        itemStyle: { color: i===0 ? '#94a3b8' : (i===1 ? '#38bdf8' : '#10b981') },
        lineStyle: { width: i===0 ? 2 : 3, type: i===0 ? 'dashed' : 'solid' },
        areaStyle: i > 0 ? { color: new window.echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:i===1?'rgba(56,189,248,0.2)':'rgba(16,185,129,0.2)'},{offset:1,color:'transparent'}]) } : null,
        data: [1,2,3,4,5,6,7,8,9,10,11,12].map(m => yoyData[y][m] || 0)
      };
    });
    window.chartYOY.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: function(p) {
         var h = '<div style="font-family:Inter"><b>' + p[0].axisValue + '</b><br/>';
         p.forEach(s => h += s.marker + ' ' + s.seriesName + ': <b>' + s.value.toLocaleString('es-AR') + ' un.</b><br/>');
         return h + '</div>';
      }},
      legend: { data: años, textStyle: { color: tcY, fontFamily: 'Inter' }, bottom: 0 },
      grid: { left: '2%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: MESES_NOMBRE.map(m=>m.substring(0,3)), axisLabel: { color: tcMY, fontFamily: 'Inter' } },
      yAxis: { type: 'value', axisLabel: { color: tcMY, fontFamily: 'Inter' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: series
    }, true);
  } else if (yoyCard) {
    yoyCard.style.display = 'none';
  }
}

// === js/views/vendedor.js ===

function renderVend(){
  var comp=fComp(),movp=fMovp();
  if(!comp.length){
    document.getElementById('kpi-vend').innerHTML=emptyMsg('Cargá los archivos');
    document.getElementById('tbl-vendedor').innerHTML='';
    return;
  }
  var tkts=uniqueTickets(comp);
  var tF=0;tkts.forEach(function(r){tF+=r.importe;});
  var tT=tkts.length,tU=0;movp.forEach(function(r){tU+=r.salida;});
  var tP=tT>0?tF/tT:0,cxt=tT>0?tU/tT:0;
  
  const mkKpiL = (l,v,cls) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-val ${cls||''}">${v}</div></div>`;

  document.getElementById('kpi-vend').innerHTML=mkKpiL('Facturación Total',fm(tF))+mkKpiL('Unidades',fn(tU))+mkKpiL('Tickets',fn(tT))+mkKpiL('Ticket Promedio',fm(tP),'gold')+mkKpiL('Cantidad x Ticket',fd(cxt))+mkKpiL('Costo x Unidad',tU>0?fm(tF/tU):'-','gold');
  var vComp={};tkts.forEach(function(r){var cod=r.vend_cod||'—';if(!vComp[cod])vComp[cod]={imp:0,tkt:0,nombre:r.vend_nombre||cod};vComp[cod].imp+=r.importe;vComp[cod].tkt++;});
  var vMovp={};movp.forEach(function(r){var cod=r.vend_cod||'—';if(!vMovp[cod])vMovp[cod]=0;vMovp[cod]+=r.salida;});
  var allCods={};Object.keys(vComp).forEach(function(k){allCods[k]=1;});Object.keys(vMovp).forEach(function(k){allCods[k]=1;});
  
  var rows=Object.keys(allCods).filter(function(cod){return cod&&cod!=='0'&&cod!=='—';}).map(function(cod){var c=vComp[cod]||{imp:0,tkt:0,nombre:cod};var uni=vMovp[cod]||0;var tkt=c.tkt,imp=c.imp;return{nombre:c.nombre,imp:imp,uni:uni,tkt:tkt,cxt:tkt>0?uni/tkt:0,tp:tkt>0?imp/tkt:0};}).sort(function(a,b){return b.imp-a.imp;}).map(function(r){return[
    mkTD(r.nombre, false, r.nombre),
    mkTD(fm(r.imp),true, r.imp),
    mkTD(fn(r.uni),true, r.uni),
    mkTD(fn(r.tkt),true, r.tkt),
    mkTD(fd(r.cxt),true, r.cxt),
    mkTD(fm(r.tp),true, r.tp)
  ];});
  
  document.getElementById('tbl-vendedor').innerHTML=buildTable(
    [mkTH('Nombre Vendedor',false,'n'),mkTH('Facturación',true,'i'),mkTH('Unidades',true,'u'),mkTH('Tickets',true,'t'),mkTH('Unidades x Ticket',true,'cxt'),mkTH('Ticket Promedio',true,'tp')],
    rows,
    ['Total',mkTD(fm(tF),true),mkTD(fn(tU),true),mkTD(fn(tT),true),mkTD(fd(cxt),true),mkTD(fm(tP),true)],
    'tbl-vendedor'
  );
}

// === js/views/producto.js ===

function filterProductos(){
  var q=(document.getElementById('prodSearch').value||'').toLowerCase().trim();
  var filtered=q?ALL_PROD_ROWS.filter(function(r){return r.cod.toLowerCase().indexOf(q)!==-1||r.nombre.toLowerCase().indexOf(q)!==-1;}):ALL_PROD_ROWS;
  renderProdTable(filtered);
}
function renderProdTable(rows){
  if(!rows.length){document.getElementById('tbl-producto').innerHTML=emptyMsg('Sin resultados');return;}
  var tV=rows.reduce(function(a,r){return a+r.uni;},0),tS=rows.reduce(function(a,r){return a+r.stk;},0);
  document.getElementById('tbl-producto').innerHTML=buildTable(
    [mkTH('Cód',false,'c'),mkTH('Producto',false,'n'),mkTH('Venta',true,'v'),mkTH('Stock',true,'s')],
    rows.map(function(r){return[
      mkTD(r.cod||'—', false, r.cod),
      mkTD(r.nombre, false, r.nombre),
      mkTD(fn(r.uni),true, r.uni),
      mkTD(fn(r.stk),true, r.stk)
    ];}),
    rows.length>1?['','Total',mkTD(fn(tV),true),mkTD(fn(tS),true)]:null,
    'tbl-producto'
  );
}

function filterProductosPesos(){
  var q=(document.getElementById('prodSearchPesos').value||'').toLowerCase().trim();
  var filtered=q?ALL_PROD_PESOS_ROWS.filter(function(r){return r.cod.toLowerCase().indexOf(q)!==-1||r.nombre.toLowerCase().indexOf(q)!==-1;}):ALL_PROD_PESOS_ROWS;
  renderProdTablePesos(filtered);
}
function renderProdTablePesos(rows){
  if(!rows.length){document.getElementById('tbl-producto-pesos').innerHTML=emptyMsg('Sin resultados');return;}
  var tV=rows.reduce(function(a,r){return a+r.imp;},0);
  document.getElementById('tbl-producto-pesos').innerHTML=buildTable(
    [mkTH('Cód',false,'c'),mkTH('Producto',false,'n'),mkTH('$ Venta',true,'v')],
    rows.map(function(r){return[
      mkTD(r.cod||'—', false, r.cod),
      mkTD(r.nombre, false, r.nombre),
      mkTD(fm(r.imp),true, r.imp)
    ];}),
    rows.length>1?['','Total',mkTD(fm(tV),true)]:null,
    'tbl-producto-pesos'
  );
}

function renderProd(){
  var stockF=fStock();
  var movpF=fMovp();
  var movpBySuc=fMovpBySuc();

  if(!stockF.length&&!movpBySuc.length){
    document.getElementById('gender-block').innerHTML='';
    document.getElementById('prod-kpi-strip').innerHTML='';
    document.getElementById('tbl-rubro').innerHTML=emptyMsg('Cargá archivos');
    document.getElementById('tbl-subrubro').innerHTML='';
    document.getElementById('tbl-producto').innerHTML='';
    document.getElementById('sbar-legend').innerHTML='';
    document.getElementById('sbar-content').innerHTML='';
    document.getElementById('tbl-annual').innerHTML='';
    setAllProdRows([]);
    return;
  }

  var tVenta=0;movpF.forEach(function(r){tVenta+=r.salida;});
  var tStock=0;stockF.forEach(function(r){tStock+=r.stock;});
  document.getElementById('prod-kpi-strip').innerHTML=
    '<div class="pkpi"><div class="pkpi-val">'+fn(tVenta)+'</div><div class="pkpi-label">Venta</div></div>'+
    '<div class="pkpi"><div class="pkpi-val">'+fn(tStock)+'</div><div class="pkpi-label">Stock</div></div>';

  var genM={};
  var stockClas1={};stockF.forEach(function(r){if(r.cod_prod&&r.clas1)stockClas1[r.cod_prod]=r.clas1;});
  movpF.forEach(function(r){
    var g=stockClas1[r.cod_prod]||'—';
    if(g&&g!=='—')genM[g]=(genM[g]||0)+r.salida;
  });
  if(!Object.keys(genM).length){
    stockF.forEach(function(r){var g=r.clas1||'—';if(g&&g!=='—')genM[g]=(genM[g]||0)+r.unidades;});
  }
  var tGenTotal=Object.keys(genM).reduce(function(a,k){return a+genM[k];},0)||tVenta;
  var genH='';
  var chartGenderData=[];
  Object.keys(genM).sort(function(a,b){return genM[b]-genM[a];}).forEach(function(g){
    chartGenderData.push({name:g,value:genM[g]});
  });
  
  if(chartGenderData.length){
    document.getElementById('chart-gender').style.display='block';
    if(!window.chartGender) window.chartGender=window.echarts.init(document.getElementById('chart-gender'));
    var tcGen = document.body.classList.contains('light-mode') ? '#334155' : '#f0ede8';
    window.chartGender.setOption({
      tooltip:{trigger:'item',formatter:'<b>{b}</b><br/>{c} un. ({d}%)'},
      legend:{show:false},
      color:['#c9a96e','#5a9fd4','#e07b9a','#52c48a'],
      series:[{
        name:'Género',type:'pie',radius:['50%','75%'],avoidLabelOverlap:false,
        itemStyle:{borderColor:'#2a2a2a',borderWidth:2},
        label:{show:true,position:'center',formatter:function(){return fn(tGenTotal)+'\nUnidades';},fontSize:14,fontWeight:'bold',color:tcGen},
        emphasis:{label:{show:true,fontSize:14,fontWeight:'bold'}},
        labelLine:{show:false},
        data:chartGenderData
      }]
    });
  } else {
    document.getElementById('chart-gender').style.display='none';
  }
  document.getElementById('gender-block').innerHTML=genH;

  var stockRubroMap={};stockF.forEach(function(r){if(r.cod_prod&&r.nombre_rubro)stockRubroMap[r.cod_prod]=r.nombre_rubro;});
  var rubroVenta={},rubroStock={};
  movpF.forEach(function(r){
    var rb=stockRubroMap[r.cod_prod] || r.rubro || '—';
    if(!rubroVenta[rb])rubroVenta[rb]=0;
    rubroVenta[rb]+=r.salida;
  });
  stockF.forEach(function(r){
    var rb=r.nombre_rubro||'—';
    if(!rubroStock[rb])rubroStock[rb]=0;
    rubroStock[rb]+=r.stock;
  });
  var allRubros={};Object.keys(rubroVenta).forEach(function(k){allRubros[k]=1;});Object.keys(rubroStock).forEach(function(k){allRubros[k]=1;});
  var rubroList=Object.keys(allRubros).filter(function(k){return k&&k!=='—'&&k!=='';}).map(function(k){return{k:k,u:rubroVenta[k]||0,s:rubroStock[k]||0};}).sort(function(a,b){return b.u-a.u;});
  
  if(rubroList.length){
    document.getElementById('chart-rubro').style.display='block';
    if(!window.chartRubro) window.chartRubro=window.echarts.init(document.getElementById('chart-rubro'));
    var tcRubM = document.body.classList.contains('light-mode') ? '#64748b' : '#8a8680';
    window.chartRubro.setOption({
      tooltip:{trigger:'item',formatter:'<b>{b}</b><br/>Venta: {c} un. ({d}%)'},
      legend:{type:'scroll',orient:'vertical',right:0,top:'middle',textStyle:{color:tcRubM,fontSize:10},pageTextStyle:{color:tcRubM}},
      color:PALETTE,
      series:[{
        name:'Rubro',type:'pie',radius:['40%','70%'],center:['40%','50%'],
        itemStyle:{borderColor:'#2a2a2a',borderWidth:2},
        label:{show:false},
        data:rubroList.map(function(r){return{name:r.k,value:r.u};}).filter(function(d){return d.value>0;})
      }]
    });
  } else {
    document.getElementById('chart-rubro').style.display='none';
  }

  document.getElementById('tbl-rubro').innerHTML=buildTable(
    [mkTH('Rubro',false,'k'),mkTH('Venta',true,'u'),mkTH('Stock',true,'s')],
    rubroList.map(function(r){return[
      mkTD(r.k, false, r.k),
      mkTD(fn(r.u),true, r.u),
      mkTD(fn(r.s),true, r.s)
    ];}),
    ['Total',mkTD(fn(tVenta),true),mkTD(fn(tStock),true)],
    'tbl-rubro'
  );

  var stockSubRubroMap={};stockF.forEach(function(r){if(r.cod_prod&&r.nombre_subrubro)stockSubRubroMap[r.cod_prod]=r.nombre_subrubro;});
  var subVenta={},subStock={};
  movpF.forEach(function(r){
    var sb=stockSubRubroMap[r.cod_prod] || r.subrubro || '—';
    if(!subVenta[sb])subVenta[sb]=0;
    subVenta[sb]+=r.salida;
  });
  stockF.forEach(function(r){
    var sb=r.nombre_subrubro||'—';
    if(!subStock[sb])subStock[sb]=0;
    subStock[sb]+=r.stock;
  });
  var allSubs={};Object.keys(subVenta).forEach(function(k){allSubs[k]=1;});Object.keys(subStock).forEach(function(k){allSubs[k]=1;});
  var subKeys=Object.keys(allSubs).filter(function(k){return k&&k!=='—'&&k!=='';});
  if(subKeys.length){
    var tSV=subKeys.reduce(function(a,k){return a+(subVenta[k]||0);},0);
    var tSS=subKeys.reduce(function(a,k){return a+(subStock[k]||0);},0);
    document.getElementById('tbl-subrubro').innerHTML=buildTable(
      [mkTH('Sub-Rubro',false,'k'),mkTH('Venta',true,'u'),mkTH('Stock',true,'s')],
      subKeys.map(function(k){return{k:k,u:subVenta[k]||0,s:subStock[k]||0};}).sort(function(a,b){return b.u-a.u;}).map(function(r){return[
        mkTD(r.k, false, r.k),
        mkTD(fn(r.u),true, r.u),
        mkTD(fn(r.s),true, r.s)
      ];}),
      ['Total',mkTD(fn(tSV),true),mkTD(fn(tSS),true)],
      'tbl-subrubro'
    );
  } else {
    var subMapStock=groupSum(stockF,'nombre_subrubro',['unidades','stock']);
    var subKeysStock=Object.keys(subMapStock).filter(function(k){return k&&k!=='—'&&k!=='';});
    if(subKeysStock.length){
      var tSV2=0,tSS2=0;subKeysStock.forEach(function(k){tSV2+=subMapStock[k].unidades;tSS2+=subMapStock[k].stock;});
      document.getElementById('tbl-subrubro').innerHTML=buildTable(
        [mkTH('Sub-Rubro',false,'k'),mkTH('Venta',true,'u'),mkTH('Stock',true,'s')],
        subKeysStock.map(function(k){return{k:k,u:subMapStock[k].unidades,s:subMapStock[k].stock};}).sort(function(a,b){return b.u-a.u;}).map(function(r){return[
          mkTD(r.k, false, r.k),
          mkTD(fn(r.u),true, r.u),
          mkTD(fn(r.s),true, r.s)
        ];}),
        ['Total',mkTD(fn(tSV2),true),mkTD(fn(tSS2),true)],
        'tbl-subrubro'
      );
    } else {
      document.getElementById('tbl-subrubro').innerHTML='<div style="padding:12px;font-size:11px;color:var(--muted)">No se detectaron Sub-Rubros. Verificá que el archivo de Stock o Movimientos tenga las columnas correspondientes.</div>';
    }
  }

  var prodVenta={},prodStock={},prodCod={};
  movpF.forEach(function(r){
    if(!prodVenta[r.cod_prod])prodVenta[r.cod_prod]=0;
    prodVenta[r.cod_prod]+=r.salida;
  });
  stockF.forEach(function(r){
    if(!prodStock[r.cod_prod])prodStock[r.cod_prod]=0;
    prodStock[r.cod_prod]+=r.stock;
    prodCod[r.cod_prod]=r.nombre_prod;
  });
  var allProds={};Object.keys(prodVenta).forEach(function(k){allProds[k]=1;});Object.keys(prodStock).forEach(function(k){allProds[k]=1;});
  let pr = Object.keys(allProds).filter(function(k){return k&&k!=='—'&&k!=='';}).map(function(k){
    return{cod:k,nombre:prodCod[k]||k,uni:prodVenta[k]||0,stk:prodStock[k]||0};
  }).sort(function(a,b){return b.uni-a.uni;});
  setAllProdRows(pr);
  if(document.getElementById('prodSearch'))document.getElementById('prodSearch').value='';
  renderProdTable(pr);

  var prodPesos={};
  movpF.forEach(function(r){
    if(!prodPesos[r.cod_prod])prodPesos[r.cod_prod]=0;
    prodPesos[r.cod_prod]+=r.importe;
  });
  let prP = Object.keys(prodPesos).filter(function(k){return k&&k!=='—'&&k!=='';}).map(function(k){
    return{cod:k,nombre:prodCod[k]||k,imp:prodPesos[k]||0};
  }).sort(function(a,b){return b.imp-a.imp;});
  setAllProdPesosRows(prP);
  if(document.getElementById('prodSearchPesos'))document.getElementById('prodSearchPesos').value='';
  renderProdTablePesos(prP);

  var top=rubroList.slice(0,10);
  var tV2=tVenta||1;
  var rubroImpVenta={};
  stockF.forEach(function(r){
    var rb=r.nombre_rubro||'—';
    if(!rubroImpVenta[rb])rubroImpVenta[rb]=0;
    rubroImpVenta[rb]+=r.imp_venta;
  });
  var tIV=stockF.reduce(function(a,r){return a+r.imp_venta;},0)||1;
  document.getElementById('sbar-legend').innerHTML=top.map(function(r,i){return'<div class="sleg"><div class="sleg-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></div>'+r.k+'</div>';}).join('');
  var sbH='<div class="sbar-row2"><div class="sbar-metric" style="color:var(--gold2)">Unidades</div><div class="sbar-track">';
  top.forEach(function(r,i){var pct=tV2>0?(r.u/tV2*100):0;var lbl=pct>6?pct.toFixed(0)+'%':'';sbH+='<div class="sbar-seg" style="width:'+pct.toFixed(2)+'%;background:'+PALETTE[i%PALETTE.length]+'" title="'+r.k+': '+fn(r.u)+' ('+pct.toFixed(1)+'%)">'+lbl+'</div>';});
  var rU=tV2-top.reduce(function(a,r){return a+r.u;},0);if(rU>0&&tV2>0)sbH+='<div class="sbar-seg" style="width:'+(rU/tV2*100).toFixed(2)+'%;background:#3a3a3a"></div>';
  sbH+='</div><div class="sbar-total">'+fn(tV2)+' un.</div></div>';
  sbH+='<div class="sbar-row2" style="margin-top:6px"><div class="sbar-metric" style="color:var(--blue)">$ Pesos</div><div class="sbar-track">';
  top.forEach(function(r,i){
    var impRubro=rubroImpVenta[r.k]||0;
    var pct=tIV>0?(impRubro/tIV*100):0;
    var lbl=pct>6?pct.toFixed(0)+'%':'';
    sbH+='<div class="sbar-seg" style="width:'+pct.toFixed(2)+'%;background:'+PALETTE[i%PALETTE.length]+';opacity:.75" title="'+r.k+': '+fm(impRubro)+' ('+pct.toFixed(1)+'%)">'+lbl+'</div>';
  });
  var rP=tIV-top.reduce(function(a,r){return a+(rubroImpVenta[r.k]||0);},0);if(rP>0&&tIV>0)sbH+='<div class="sbar-seg" style="width:'+(rP/tIV*100).toFixed(2)+'%;background:#3a3a3a"></div>';
  sbH+='</div><div class="sbar-total">'+fm(tIV)+'</div></div>';
  document.getElementById('sbar-content').innerHTML=sbH;

  var MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var añosSet={};movpBySuc.forEach(function(r){if(r.anio)añosSet[r.anio]=1;});var años=Object.keys(añosSet).map(Number).sort();
  if(!años.length){document.getElementById('tbl-annual').innerHTML='<div style="padding:8px;color:var(--muted);font-size:11px">Cargá Mov. Productos para la tabla anual</div>';return;}
  document.getElementById('tbl-annual').innerHTML=buildTable(
    [mkTH('Año',false,'a')].concat(MESES.map(function(m, i){return mkTH(m,true, 'm'+i);})).concat([mkTH('Total',true,'t')]),
    años.map(function(yr){
      var yrR=movpBySuc.filter(function(r){return r.anio===yr;});
      var meses=MESES.map(function(_,i){var v=0;yrR.forEach(function(r){if(r.mes===i+1)v+=r.salida;});return v>0?mkTD(fn(v),true, v):mkTD('',true, 0);});
      var tot=0;yrR.forEach(function(r){tot+=r.salida;});
      return [mkTD(yr, false, yr)].concat(meses).concat([mkTD(fn(tot),true, tot)]);
    }),
    null,
    'tbl-annual'
  );
}

// === js/views/resumen.js ===

function renderResumen() {
  var comp = fComp(), movp = fMovp();
  if(!comp.length && !movp.length) {
    document.getElementById('kpi-resu').innerHTML = emptyMsg('Configurá las sucursales y cargá los archivos para ver el Resumen Ejecutivo.');
    document.getElementById('tbl-resu-vend').innerHTML = '';
    document.getElementById('tbl-resu-rubro').innerHTML = '';
    document.getElementById('chart-resu-tendencia').style.display = 'none';
    return;
  }
  var tkts = uniqueTickets(comp);
  var tF = 0; tkts.forEach(function(r) { tF += r.importe; });
  var tT = tkts.length, tU = 0; movp.forEach(function(r) { tU += r.salida; });

  // Top Vendedores
  var vComp = {}; 
  tkts.forEach(function(r) { 
    var cod = r.vend_cod || '—'; 
    if(!vComp[cod]) vComp[cod] = { imp: 0, nombre: r.vend_nombre || cod }; 
    vComp[cod].imp += r.importe; 
  });
  var vMovp = {}; 
  movp.forEach(function(r) { 
    var cod = r.vend_cod || '—'; 
    if(!vMovp[cod]) vMovp[cod] = 0; 
    vMovp[cod] += r.salida; 
  });
  var vendArr = Object.keys(vComp).map(function(cod){
     return { nombre: vComp[cod].nombre, imp: vComp[cod].imp, uni: vMovp[cod] || 0 };
  }).sort(function(a,b) { return b.imp - a.imp; });
  
  // Top Rubros
  var stock = fStock();
  var stockRubroMap={}; stock.forEach(function(r){if(r.cod_prod&&r.nombre_rubro)stockRubroMap[r.cod_prod]=r.nombre_rubro;});
  var rubroV = {};
  movp.forEach(function(r) {
     var rb = stockRubroMap[r.cod_prod] || r.rubro || '—';
     if(!rubroV[rb]) rubroV[rb] = 0;
     rubroV[rb] += r.salida;
  });
  var rubroArr = Object.keys(rubroV).filter(function(k){return k&&k!=='—';}).map(function(k){
     return { nombre: k, uni: rubroV[k] };
  }).sort(function(a,b){ return b.uni - a.uni; });

  var topVend = vendArr.length ? vendArr[0].nombre : '-';
  var topRubro = rubroArr.length ? rubroArr[0].nombre : '-';

  var mkKpiL = function(l,v,cls) { return '<div class="kpi"><div class="kpi-label">'+l+'</div><div class="kpi-val '+(cls||'')+'">'+v+'</div></div>'; };
  document.getElementById('kpi-resu').innerHTML = 
    mkKpiL('Facturación', fm(tF), 'gold') + 
    mkKpiL('Unidades', fn(tU)) + 
    mkKpiL('Tickets', fn(tT)) + 
    mkKpiL('Mejor Vendedor', topVend.substring(0,15)) + 
    mkKpiL('Rubro Estrella', topRubro.substring(0,20));

  document.getElementById('tbl-resu-vend').innerHTML = buildTable(
    [mkTH('Vendedor'), mkTH('Facturación',true,'i'), mkTH('Unidades',true,'u')],
    vendArr.slice(0,5).map(function(r) { return [mkTD(r.nombre), mkTD(fm(r.imp),true,r.imp), mkTD(fn(r.uni),true,r.uni)]; }),
    null, 'tbl-resu-vend'
  );

  document.getElementById('tbl-resu-rubro').innerHTML = buildTable(
    [mkTH('Rubro'), mkTH('Unidades',true,'u')],
    rubroArr.slice(0,5).map(function(r){ return [mkTD(r.nombre), mkTD(fn(r.uni),true,r.uni)]; }),
    null, 'tbl-resu-rubro'
  );

  // Tendencia 7 días
  var dM={};
  tkts.forEach(function(r){ var k=r.anio+'-'+r.mes+'-'+r.dia; if(!dM[k]) dM[k]={dia:r.dia, mes:r.mes, imp:0}; dM[k].imp+=r.importe; });
  var dK=Object.keys(dM).sort(function(a,b){ var pa=a.split('-'), pb=b.split('-'); return (+pa[0]-+pb[0]) || (+pa[1]-+pb[1]) || (+pa[2]-+pb[2]); }).slice(-7);
  var charContainer = document.getElementById('chart-resu-tendencia');
  if(dK.length && charContainer) {
     charContainer.style.display='block';
     if(!window.chartResu) window.chartResu = window.echarts.init(charContainer);
     var tcM = document.body.classList.contains('light-mode') ? '#64748b' : '#8a8680';
     var grad = new window.echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(56,189,248,0.5)'},{offset:1,color:'rgba(56,189,248,0.01)'}]);
     window.chartResu.setOption({
       tooltip: {trigger:'axis'},
       grid: {left:'3%', right:'4%', bottom:'10%', top:'10%', containLabel:true},
       xAxis: {type: 'category', data: dK.map(function(k){return dM[k].dia+'/'+dM[k].mes;}), axisLabel:{color:tcM}},
       yAxis: {type: 'value', axisLabel:{color:tcM, formatter: function(v){return '$ '+(v>=1000?(v/1000).toFixed(0)+'k':v);}}, splitLine:{lineStyle:{color:'rgba(255,255,255,0.05)'}}},
       series: [{data: dK.map(function(k){return dM[k].imp;}), name:'Facturación', type: 'line', smooth:true, areaStyle: {color:grad}, itemStyle:{color:'#38bdf8'}}]
     });
  } else if (charContainer) {
     charContainer.style.display='none';
  }
}

// === js/main.js ===

console.log('[KBI] main.js initialized');

function doRender(){
  if(curPage==='fact')renderFact();
  else if(curPage==='vend')renderVend();
  else if(curPage==='prod')renderProd();
  else if(curPage==='resu')renderResumen();
}
window.doRender = doRender;

window.doSort = function(tableId, colIdx) {
  handleSort(tableId, colIdx, doRender);
};

window.filterProductos = filterProductos;
window.filterProductosPesos = filterProductosPesos;
window.exportCSV = exportCSV;
window.clearLocalData = clearLocalData;
window.showToast = showToast;

window.syncNube = async function() {
  showToast('☁️ Sincronizando con la nube...', 'info', 5000);
  try {
    await syncToSupabase();
    showToast('✅ Datos sincronizados con Supabase exitosamente!', 'success', 4000);
  } catch(e) {
    showToast('❌ Error al sincronizar: ' + e.message, 'error', 5000);
  }
};

function renderLoaded(){
  document.getElementById('loadedList').innerHTML=LOADED.map(function(l){
    return'<div class="loaded-chip"><span class="lc-suc">'+l.suc+'</span><span class="lc-type">· '+l.typeName+'</span><span class="lc-n">✓ '+l.n.toLocaleString('es-AR')+' reg'+(l.files>1?' ('+l.files+'f)':'')+'</span><span class="lc-del" onclick="window.removeLoaded(\''+l.id+'\',\''+l.type+'\')">✕</span></div>';
  }).join('');
}

window.removeLoaded = function(id,t){
  let idx = LOADED.findIndex(l => l.id === id);
  if(idx !== -1) {
    LOADED.splice(idx, 1);
  }
  if(!LOADED.some(function(l){return l.type===t;})){
    clearDB(t, true);
  }
  renderLoaded();buildFilters();doRender();
  saveAllData(); 
};

function renderSucursales(){
  const countEl = document.getElementById('suc-count');
  if (countEl) countEl.textContent=SUCURSALES.length+' cargada'+(SUCURSALES.length!==1?'s':'');
  
  const chipsEl = document.getElementById('sucChips');
  if (chipsEl) {
    chipsEl.innerHTML=SUCURSALES.length?SUCURSALES.map(function(s){
        return'<div class="suc-chip">'+s+'<span class="suc-chip-del" onclick="window.removeSucursal(\''+s.replace(/'/g,"\\'")+'\')" title="Eliminar">✕</span></div>';
    }).join(''):'<span class="suc-empty">Todavía no hay sucursales cargadas</span>';
  }

  var sel=document.getElementById('sucSelect'),prev=sel.value;
  if(sel) {
    sel.innerHTML='<option value="">— Seleccioná sucursal —</option>'+SUCURSALES.map(function(s){return'<option value="'+s+'">'+s+'</option>';}).join('');
    if(prev&&SUCURSALES.indexOf(prev)!==-1)sel.value=prev;
  }
}

window.addSucursal = function(){
  var inp=document.getElementById('sucNameInput'),name=inp.value.trim();if(!name)return;
  if(SUCURSALES.some(function(s){return s.toLowerCase()===name.toLowerCase();})){inp.style.borderColor='#e05252';setTimeout(function(){inp.style.borderColor='';},1500);return;}
  SUCURSALES.push(name);
  inp.value='';
  renderSucursales();
  buildFilters();
  saveAllData(); 
};

window.removeSucursal = function(name){
  let idx = SUCURSALES.indexOf(name);
  if(idx !== -1) SUCURSALES.splice(idx, 1);
  renderSucursales();
  buildFilters();
  saveAllData(); 
};

function buildFilters(){
  var ys={};['comp','movp','caja'].forEach(function(t){DB[t].forEach(function(r){if(r.anio)ys[r.anio]=1;});});
  var years=Object.keys(ys).map(Number).sort(function(a,b){return b-a;});
  var sA=document.getElementById('fAnio'),pA=sA.value;
  if(sA) {
    sA.innerHTML='<option value="0">Todos</option>';
    years.forEach(function(y){var o=document.createElement('option');o.value=String(y);o.textContent=String(y);sA.appendChild(o);});
    if(pA&&pA!=='0'&&ys[parseInt(pA)])sA.value=pA;else if(years.length)sA.value=String(years[0]);
  }
  var sC=document.getElementById('fCaja'),pC=sC.value;
  if(sC) {
    sC.innerHTML='<option value="">Todas</option>';
    SUCURSALES.forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent=s;sC.appendChild(o);});
    if(pC&&SUCURSALES.indexOf(pC)!==-1)sC.value=pC;
  }
}

window.showPage = function(name, tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t => t.classList.remove('active'));
  const pageEl = document.getElementById('page-' + name);
  if (pageEl) pageEl.classList.add('active');
  if (tab) tab.classList.add('active');
  setCurPage(name);
  const titles = { fact: 'Facturación Diaria', vend: 'Análisis por Vendedor', prod: 'Reporte de Producto', resu: 'Resumen General' };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[name] || 'Dashboard';
  doRender();
};

window.toggleConfig = function() {
  const b = document.getElementById('config-body');
  const a = document.getElementById('config-arrow');
  if(b && a) {
    const isOpen = b.classList.contains('open');
    b.classList.toggle('open', !isOpen);
    a.classList.toggle('open', !isOpen);
  }
};

window.triggerUpload = function() {
  const suc = document.getElementById('sucSelect').value;
  if (!suc) {
    document.getElementById('sucSelect').style.borderColor = '#e05252';
    setTimeout(() => document.getElementById('sucSelect').style.borderColor = '', 2000);
    return;
  }
  const fi = document.getElementById('fi');
  if(fi) {
    fi.value = '';
    fi.click();
  }
};

window.handleFiles = function(ev) {
  handleFiles(ev, renderLoaded, buildFilters, doRender);
};

function initEvents() {
  console.log('[KBI] Binding events...');
  
  const addBtn = document.getElementById('btnAddSucursal');
  if (addBtn) {
    addBtn.removeAttribute('onclick');
    addBtn.addEventListener('click', window.addSucursal);
  }

  const configHeader = document.querySelector('.config-header');
  if (configHeader) {
    configHeader.removeAttribute('onclick');
    configHeader.addEventListener('click', window.toggleConfig);
  }

  const triggerBtn = document.querySelector('button[onclick="triggerUpload()"]');
  if (triggerBtn) {
    triggerBtn.removeAttribute('onclick');
    triggerBtn.addEventListener('click', window.triggerUpload);
  }

  const navTabFact = document.getElementById('tab-fact');
  if(navTabFact) navTabFact.addEventListener('click', () => window.showPage('fact', navTabFact));
  
  const navTabVend = document.getElementById('tab-vend');
  if(navTabVend) navTabVend.addEventListener('click', () => window.showPage('vend', navTabVend));
  
  const navTabProd = document.getElementById('tab-prod');
  if(navTabProd) navTabProd.addEventListener('click', () => window.showPage('prod', navTabProd));

  const navTabResu = document.getElementById('tab-resu');
  if(navTabResu) navTabResu.addEventListener('click', () => window.showPage('resu', navTabResu));

  const sucInput = document.getElementById('sucNameInput');
  if (sucInput) {
    sucInput.removeAttribute('onkeydown');
    sucInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.addSucursal();
    });
  }

  const fAnio = document.getElementById('fAnio');
  if(fAnio) fAnio.onchange = doRender;
  
  const fMes = document.getElementById('fMes');
  if(fMes) fMes.onchange = doRender;
  
  const fCaja = document.getElementById('fCaja');
  if(fCaja) fCaja.onchange = doRender;

  const fDesde = document.getElementById('fDesde');
  if(fDesde) fDesde.onchange = doRender;

  const fHasta = document.getElementById('fHasta');
  if(fHasta) fHasta.onchange = doRender;

  const btnExport = document.getElementById('btnExportPDF');
  if(btnExport) btnExport.addEventListener('click', () => {
    const p = document.querySelector('.page.active');
    if(!p) return;
    const opt = {
      margin: 10,
      filename: 'Reporte_KVN_'+(new Date().toISOString().split('T')[0])+'.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(p).save();
  });
}

window.addEventListener('resize', function() {
  if (window.chartDiaria) window.chartDiaria.resize();
  if (window.chartGender) window.chartGender.resize();
  if (window.chartRubro) window.chartRubro.resize();
  if (window.chartYOY) window.chartYOY.resize();
  if (window.chartResu) window.chartResu.resize();
});

showToast('☁️ Sincronizando datos automáticamente...', 'info', 3000);
loadAllData().then(function(hasData) {
  console.log('[KBI] Storage loaded, hasData:', hasData);
  renderLoaded();
  buildFilters();
  renderSucursales();
  initEvents();
  doRender();
  if (hasData) {
    showToast('✅ Datos sincronizados', 'success', 3000);
  }
}).catch(err => {
  console.error('[KBI] Init error:', err);
  initEvents();
  doRender();
  showToast('❌ Error sincronizando', 'error', 3000);
});
window.diagnostico = function() {
  var MNAMES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  console.log('=== DIAGNOSTICO MOVP (Mov. Productos) ===');
  console.log('Total registros movp:', DB.movp.length);
  var byYear = {};
  var tipos = {};
  var conceptos = {};
  DB.movp.forEach(function(r) {
    var y = r.anio;
    if(!byYear[y]) byYear[y] = {};
    if(!byYear[y][r.mes]) byYear[y][r.mes] = {count:0, salida:0, entrada:0};
    byYear[y][r.mes].count++;
    byYear[y][r.mes].salida += r.salida;
    byYear[y][r.mes].entrada += (r.entrada||0);
    var t = r.tipo_comp || '(vacio)';
    tipos[t] = (tipos[t]||0) + r.salida;
    var c = r.concepto || '(vacio)';
    conceptos[c] = (conceptos[c]||0) + r.salida;
  });
  Object.keys(byYear).sort().forEach(function(y) {
    console.log('--- Year ' + y + ' ---');
    for(var m=1; m<=12; m++) {
      var d = byYear[y][m];
      if(d) console.log('  ' + MNAMES[m] + ': ' + d.count + ' registros, Salida=' + d.salida + ', Entrada=' + d.entrada);
    }
  });
  console.log('--- Desglose por Tipo/Concepto (Unidades Salida) ---');
  console.log('Tipos:', tipos);
  console.log('Conceptos:', conceptos);
  console.log('=== DIAGNOSTICO COMP (Comprobantes) ===');
  console.log('Total registros comp:', DB.comp.length);
  console.log('=== ARCHIVOS CARGADOS ===');
  LOADED.forEach(function(l) { console.log('  -', l.suc, l.typeName, l.n, 'registros'); });
  console.log('SUCURSALES:', SUCURSALES.join(', '));
};

window.diagnosticoSucursales = function() {
  console.log('%c=== DIAGNÓSTICO POR SUCURSAL ===', 'color:#c9a96e;font-weight:bold;font-size:14px');
  
  // Comp por sucursal
  var compBySuc = {};
  DB.comp.forEach(function(r) {
    var s = r.sucursal || '(sin sucursal)';
    if (!compBySuc[s]) compBySuc[s] = { count: 0, importe: 0, nros: new Set() };
    compBySuc[s].count++;
    compBySuc[s].importe += (r.importe || 0);
    if (r.nro) compBySuc[s].nros.add(r.nro);
  });
  
  console.log('%cCOMPROBANTES por sucursal:', 'color:#5a9fd4;font-weight:bold');
  Object.keys(compBySuc).forEach(function(s) {
    var d = compBySuc[s];
    console.log('  📍 ' + s + ': ' + d.count + ' registros, Importe total: $' + Math.round(d.importe).toLocaleString('es-AR') + ', Nros únicos: ' + d.nros.size);
  });
  
  // Movp por sucursal
  var movpBySuc = {};
  DB.movp.forEach(function(r) {
    var s = r.sucursal || '(sin sucursal)';
    if (!movpBySuc[s]) movpBySuc[s] = { count: 0, salida: 0, productos: new Set() };
    movpBySuc[s].count++;
    movpBySuc[s].salida += (r.salida || 0);
    if (r.cod_prod) movpBySuc[s].productos.add(r.cod_prod);
  });
  
  console.log('%cMOVIMIENTOS por sucursal:', 'color:#52c48a;font-weight:bold');
  Object.keys(movpBySuc).forEach(function(s) {
    var d = movpBySuc[s];
    console.log('  📍 ' + s + ': ' + d.count + ' registros, Unidades salida: ' + Math.round(d.salida).toLocaleString('es-AR') + ', Productos únicos: ' + d.productos.size);
  });
  
  // Comparar NROs entre sucursales para detectar duplicados
  var sucKeys = Object.keys(compBySuc);
  if (sucKeys.length >= 2) {
    console.log('%c⚠️ COMPARACIÓN DE COMPROBANTES ENTRE SUCURSALES:', 'color:#e05252;font-weight:bold');
    for (var i = 0; i < sucKeys.length; i++) {
      for (var j = i + 1; j < sucKeys.length; j++) {
        var s1 = sucKeys[i], s2 = sucKeys[j];
        var nros1 = compBySuc[s1].nros, nros2 = compBySuc[s2].nros;
        var overlap = 0;
        nros1.forEach(function(n) { if (nros2.has(n)) overlap++; });
        var pct = Math.round(overlap / Math.max(nros1.size, nros2.size) * 100);
        console.log('  ' + s1 + ' vs ' + s2 + ': ' + overlap + ' NROs en común (' + pct + '% de superposición)');
        if (pct > 80) {
          console.log('%c  🚨 ALERTA: Muy alta superposición! Es posible que los mismos archivos hayan sido cargados para ambas sucursales.', 'color:#e05252;font-weight:bold');
        }
      }
    }
  }
  
  console.log('%c=== FIN DIAGNÓSTICO ===', 'color:#c9a96e;font-weight:bold');
};

// --- THEME TOGGLE ---
const THEME_KEY = 'kbi_theme';
let isLightMode = localStorage.getItem(THEME_KEY) === 'light';
if (isLightMode) document.body.classList.add('light-mode');

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = isLightMode ? '🌙' : '☀️';
}
updateThemeIcon();

window.toggleTheme = function() {
  document.body.classList.toggle('light-mode');
  isLightMode = document.body.classList.contains('light-mode');
  localStorage.setItem(THEME_KEY, isLightMode ? 'light' : 'dark');
  updateThemeIcon();
  if (window.chartResu) { window.chartResu.dispose(); window.chartResu = null; }
  if (window.chartDiaria) { window.chartDiaria.dispose(); window.chartDiaria = null; }
  if (window.chartRubro) { window.chartRubro.dispose(); window.chartRubro = null; }
  if (window.chartGender) { window.chartGender.dispose(); window.chartGender = null; }
  if (window.chartYOY) { window.chartYOY.dispose(); window.chartYOY = null; }
  if(window.doRender) window.doRender();
};


})();