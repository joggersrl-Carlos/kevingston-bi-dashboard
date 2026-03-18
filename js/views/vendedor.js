import { emptyMsg, fm, fn, fd, uniqueTickets } from '../utils.js';
import { fComp, fMovp } from '../state.js';
import { buildTable, mkTH, mkTD } from '../components/tables.js';

export function renderVend(){
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
