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

export function fComp(){var a=getA(),m=getM(),c=getC();return DB.comp.filter(function(r){return(!a||r.anio===a)&&(!m||r.mes===m)&&(!c||r.sucursal===c);});}
export function fMovp(){var a=getA(),m=getM(),c=getC();return DB.movp.filter(function(r){return(!a||r.anio===a)&&(!m||r.mes===m)&&(!c||r.sucursal===c);});}
export function fStock(){var c=getC();return DB.stock.filter(function(r){return!c||r.sucursal===c;});}
export function fMovpBySuc(){var c=getC();return DB.movp.filter(function(r){return!c||r.sucursal===c;});}
