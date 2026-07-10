import { emptyMsg, fm, fn, fd, uniqueTickets } from '../utils.js';
import { fComp, fMovp } from '../state.js';
import { buildTable, mkTH, mkTD } from '../components/tables.js';

export function renderVend(){
  var comp=fComp(),movp=fMovp();
  if(!comp.length){
    document.getElementById('kpi-vend').innerHTML=emptyMsg('Cargá los archivos');
    document.getElementById('tbl-vendedor').innerHTML='';
    var chartEl = document.getElementById('chart-vend');
    if(chartEl) chartEl.style.display='none';
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
  
  var vendData = Object.keys(allCods).filter(function(cod){return cod&&cod!=='0'&&cod!=='—';}).map(function(cod){
    var c=vComp[cod]||{imp:0,tkt:0,nombre:cod};
    var uni=vMovp[cod]||0;
    var tkt=c.tkt,imp=c.imp;
    return{nombre:c.nombre,imp:imp,uni:uni,tkt:tkt,cxt:tkt>0?uni/tkt:0,tp:tkt>0?imp/tkt:0};
  }).sort(function(a,b){return b.imp-a.imp;});

  var rows = vendData.map(function(r){return[
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

  // --- GRÁFICO DE BARRAS HORIZONTAL (Top 10 Vendedores) ---
  var chartEl = document.getElementById('chart-vend');
  if(!chartEl || !window.echarts || !vendData.length) return;
  chartEl.style.display = 'block';

  var isDark = !document.body.classList.contains('light-mode');
  if(!window.chartVend) {
    window.chartVend = window.echarts.init(chartEl, isDark ? 'dark' : null);
  }

  var top = vendData.slice(0, 10);
  var tc  = isDark ? '#f8fafc' : '#0f172a';
  var tcM = isDark ? '#94a3b8' : '#64748b';
  var COLORS = ['#c9a96e','#5a9fd4','#52c48a','#e07b9a','#9b7fd4','#4ec9b0','#e8c98a','#e05252','#73c6e8','#a3d977'];

  window.chartVend.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(p) {
        return '<b>' + p[0].name + '</b><br/>' +
          p[0].marker + ' Facturación: <b>' + fm(p[0].value) + '</b><br/>';
      }
    },
    grid: { left: '2%', right: '5%', top: '5%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: tcM, fontFamily: 'Inter', formatter: v => '$ ' + (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : v) },
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } }
    },
    yAxis: {
      type: 'category',
      data: top.map(r => r.nombre.length > 18 ? r.nombre.substring(0,18)+'…' : r.nombre).reverse(),
      axisLabel: { color: tc, fontFamily: 'Inter', fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: top.map((r, i) => ({
        value: Math.round(r.imp),
        itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [0, 6, 6, 0] }
      })).reverse(),
      label: {
        show: true,
        position: 'right',
        formatter: p => fm(p.value),
        color: tcM,
        fontFamily: 'Inter',
        fontSize: 10
      }
    }]
  }, true);
}
