export var DB={comp:[],movp:[],stock:[],caja:[]};
export var SEEN={comp:{},movp:{},stock:{},caja:{}};
export var SUCURSALES=[];
export var LOADED=[];
export var curPage='fact';

export function setSucursales(sucs) { SUCURSALES.splice(0, SUCURSALES.length, ...sucs); }
export function setLoaded(l) { LOADED.splice(0, LOADED.length, ...l); }
export function setCurPage(p) { curPage = p; }
export function clearDB(type, forceEmpty) {
  if(forceEmpty || !LOADED.some(function(l){return l.type===type;})){
    DB[type].splice(0, DB[type].length);
    for (const key in SEEN[type]) delete SEEN[type][key];
  }
}
export function addDBRecord(t, k, r) {
  SEEN[t][k] = true;
  DB[t].push(r);
}

export var ALL_PROD_ROWS=[];
export var ALL_PROD_PESOS_ROWS=[];
export function setAllProdRows(r) { ALL_PROD_ROWS.splice(0, ALL_PROD_ROWS.length, ...r); }
export function setAllProdPesosRows(r) { ALL_PROD_PESOS_ROWS.splice(0, ALL_PROD_PESOS_ROWS.length, ...r); }

export const PALETTE=['#c9a96e','#5a9fd4','#52c48a','#e07b9a','#9b7fd4','#4ec9b0','#e8c98a','#e05252','#73c6e8','#a3d977'];
export const DOW_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
export const MESES_NOMBRE=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function getA(){return parseInt(document.getElementById('fAnio').value)||0;}
export function getM(){return parseInt(document.getElementById('fMes').value)||0;}
export function getC(){return document.getElementById('fCaja').value;}
export function getDesde(){return document.getElementById('fDesde').value;}
export function getHasta(){return document.getElementById('fHasta').value;}
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
export function fComp(){var a=getA(),m=getM(),c=getC(),d=getDesde(),h=getHasta();return DB.comp.filter(function(r){return checkRange(r,a,m,c,d,h);});}
export function fMovp(){
  var a=getA(),m=getM(),c=getC(),d=getDesde(),h=getHasta(),valid=getValidComps();
  return DB.movp.filter(function(r){
    if(!checkRange(r,a,m,c,d,h)) return false;
    if(!valid) return true;
    if(!r.nro_comp) return false;
    var norm_movp = normalizeNro(r.nro_comp); if(!norm_movp) return false; return valid.has(norm_movp);
  });
}
export function fStock(){var c=getC();return DB.stock.filter(function(r){return!c||r.sucursal===c;});}
export function fMovpBySuc(){
  var c=getC(),valid=getValidComps(),d=getDesde(),h=getHasta();
  return DB.movp.filter(function(r){
    if(!checkRange(r,0,0,c,d,h)) return false;
    if(!valid) return true;
    if(!r.nro_comp) return false;
    var norm_movp = normalizeNro(r.nro_comp); if(!norm_movp) return false; return valid.has(norm_movp);
  });
}


