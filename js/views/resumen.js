import { emptyMsg, fm, fn, uniqueTickets } from '../utils.js';
import { fComp, fMovp, fStock } from '../state.js';
import { buildTable, mkTH, mkTD } from '../components/tables.js';

export function renderResumen() {
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

  // Top Vendedores — Render de Podio Visual
  var top1 = vendArr[0] || { nombre: '—', imp: 0, uni: 0 };
  var top2 = vendArr[1] || { nombre: '—', imp: 0, uni: 0 };
  var top3 = vendArr[2] || { nombre: '—', imp: 0, uni: 0 };

  var podiumHtml = `
    <div class="podium-wrapper">
      <!-- 2do puesto (Plata) -->
      <div class="podium-column podium-silver" style="opacity: ${top2.imp > 0 ? 1 : 0.4}">
        <div class="podium-info">
          <div class="name" title="${top2.nombre}">${top2.nombre}</div>
          <div class="val" style="color:#a1a1aa">${top2.imp > 0 ? fm(top2.imp) : '—'}</div>
          <div class="sub">${top2.imp > 0 ? fn(top2.uni) + ' un.' : ''}</div>
        </div>
        <div class="podium-step">
          2
          <span class="podium-num-lbl">Puesto</span>
        </div>
      </div>
      
      <!-- 1er puesto (Oro) -->
      <div class="podium-column podium-gold" style="opacity: ${top1.imp > 0 ? 1 : 0.4}">
        <div class="podium-info">
          <div class="name" title="${top1.nombre}">${top1.nombre}</div>
          <div class="val" style="color:#e8c98a">${top1.imp > 0 ? fm(top1.imp) : '—'}</div>
          <div class="sub">${top1.imp > 0 ? fn(top1.uni) + ' un.' : ''}</div>
        </div>
        <div class="podium-step">
          ${top1.imp > 0 ? '<span class="podium-crown">👑</span>' : ''}
          1
          <span class="podium-num-lbl">Puesto</span>
        </div>
      </div>
      
      <!-- 3er puesto (Bronce) -->
      <div class="podium-column podium-bronze" style="opacity: ${top3.imp > 0 ? 1 : 0.4}">
        <div class="podium-info">
          <div class="name" title="${top3.nombre}">${top3.nombre}</div>
          <div class="val" style="color:#c97744">${top3.imp > 0 ? fm(top3.imp) : '—'}</div>
          <div class="sub">${top3.imp > 0 ? fn(top3.uni) + ' un.' : ''}</div>
        </div>
        <div class="podium-step">
          3
          <span class="podium-num-lbl">Puesto</span>
        </div>
      </div>
    </div>
  `;
  document.getElementById('tbl-resu-vend').innerHTML = podiumHtml;


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
     var isDark = !document.body.classList.contains('light-mode');
     if(!window.chartResu) window.chartResu = window.echarts.init(charContainer, isDark ? 'dark' : null);
     var tcM = isDark ? '#8a8680' : '#64748b';
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
