import { SUCURSALES, setSucursales, LOADED, curPage, setCurPage, clearDB, DB, SEEN } from './state.js';
import { handleFiles } from './excelParser.js';
import { renderFact } from './views/facturacion.js';
import { renderProd, filterProductos, filterProductosPesos } from './views/producto.js';
import { renderVend } from './views/vendedor.js';
import { handleSort } from './components/tables.js';
import { exportCSV } from './utils.js';
import { loadAllData, saveAllData, clearLocalData } from './storage.js';

window.exportCSV = exportCSV;
window.clearLocalData = clearLocalData;

export function doRender(){
  if(curPage==='fact')renderFact();
  else if(curPage==='vend')renderVend();
  else renderProd();
}
window.doRender = doRender;

window.doSort = function(tableId, colIdx) {
  handleSort(tableId, colIdx, doRender);
};

window.filterProductos = filterProductos;
window.filterProductosPesos = filterProductosPesos;

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
  document.getElementById('suc-count').textContent=SUCURSALES.length+' cargada'+(SUCURSALES.length!==1?'s':'');
  document.getElementById('sucChips').innerHTML=SUCURSALES.length?SUCURSALES.map(function(s){return'<div class="suc-chip">'+s+'<span class="suc-chip-del" onclick="window.removeSucursal(\''+s.replace(/'/g,"\\'")+'\')" title="Eliminar">✕</span></div>';}).join(''):'<span class="suc-empty">Todavía no hay sucursales cargadas</span>';
  var sel=document.getElementById('sucSelect'),prev=sel.value;
  sel.innerHTML='<option value="">— Seleccioná sucursal —</option>'+SUCURSALES.map(function(s){return'<option value="'+s+'">'+s+'</option>';}).join('');
  if(prev&&SUCURSALES.indexOf(prev)!==-1)sel.value=prev;
}

window.addSucursal = function(){
  var inp=document.getElementById('sucNameInput'),name=inp.value.trim();if(!name)return;
  if(SUCURSALES.some(function(s){return s.toLowerCase()===name.toLowerCase();})){inp.style.borderColor='#e05252';setTimeout(function(){inp.style.borderColor='';},1500);return;}
  SUCURSALES.push(name);
  inp.value='';renderSucursales();buildFilters();
  saveSucursales();
};

window.removeSucursal = function(name){
  let idx = SUCURSALES.indexOf(name);
  if(idx !== -1) SUCURSALES.splice(idx, 1);
  renderSucursales();buildFilters();
  saveSucursales();
};

function buildFilters(){
  var ys={};['comp','movp','caja'].forEach(function(t){DB[t].forEach(function(r){if(r.anio)ys[r.anio]=1;});});
  var years=Object.keys(ys).map(Number).sort(function(a,b){return b-a;});
  var sA=document.getElementById('fAnio'),pA=sA.value;
  sA.innerHTML='<option value="0">Todos</option>';
  years.forEach(function(y){var o=document.createElement('option');o.value=String(y);o.textContent=String(y);sA.appendChild(o);});
  if(pA&&pA!=='0'&&ys[parseInt(pA)])sA.value=pA;else if(years.length)sA.value=String(years[0]);
  var sC=document.getElementById('fCaja'),pC=sC.value;
  sC.innerHTML='<option value="">Todas</option>';
  SUCURSALES.forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent=s;sC.appendChild(o);});
  if(pC&&SUCURSALES.indexOf(pC)!==-1)sC.value=pC;
}

window.toggleConfig = function(){var b=document.getElementById('config-body'),a=document.getElementById('config-arrow'),o=b.classList.contains('open');b.classList.toggle('open',!o);a.classList.toggle('open',!o);};
window.triggerUpload = function(){var suc=document.getElementById('sucSelect').value;if(!suc){document.getElementById('sucSelect').style.borderColor='#e05252';setTimeout(function(){document.getElementById('sucSelect').style.borderColor='';},2000);return;}document.getElementById('fi').value='';document.getElementById('fi').click();};

window.showPage = function(name,tab){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.ntab').forEach(function(t){t.classList.remove('active');});
  document.getElementById('page-'+name).classList.add('active');if(tab)tab.classList.add('active');
  setCurPage(name);
  var titles={fact:'Facturación Diaria',vend:'Análisis por Vendedor',prod:'Reporte de Producto'};
  document.getElementById('pageTitle').textContent=titles[name];doRender();
};

function saveSucursales(){try{localStorage.setItem('kvn_sucursales',JSON.stringify(SUCURSALES));}catch(e){}}
function loadSucursales(){try{var s=localStorage.getItem('kvn_sucursales');if(s){setSucursales(JSON.parse(s));renderSucursales();buildFilters();}}catch(e){}}
loadSucursales();

document.getElementById('fAnio').onchange=doRender;
document.getElementById('fMes').onchange=doRender;
document.getElementById('fCaja').onchange=doRender;
document.getElementById('fi').onchange=function(ev){ handleFiles(ev, renderLoaded, buildFilters); };

window.addEventListener('resize', function() {
  if (window.chartDiaria) window.chartDiaria.resize();
  if (window.chartGender) window.chartGender.resize();
  if (window.chartRubro) window.chartRubro.resize();
});

loadAllData().then(function(hasData) {
  if (hasData) {
    console.log('[KBI] Datos recuperados de sesión anterior existosamente.');
    renderLoaded();
    buildFilters();
  }
  doRender();
});
