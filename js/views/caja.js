/**
 * js/views/caja.js
 * Vista de Auditoría y Control de Caja
 */

import { DB, getA, getM, getC, getDesde, getHasta } from '../state.js';
import { emptyMsg, fm, fn, fd, buildTable, mkTH, mkTD } from '../components/tables.js';

function checkRangeCaja(r, a, m, c, d, h) {
  var rAnio = parseInt(r.anio) || 0;
  var rMes  = parseInt(r.mes)  || 0;
  if((a && rAnio !== a) || (m && rMes !== m) || (c && r.sucursal !== c)) return false;
  if(d || h) {
    var rMesPad = rMes < 10 ? '0' + rMes : rMes;
    var rDia = parseInt(r.dia) || 0;
    var rDiaPad = rDia < 10 ? '0' + rDia : rDia;
    var rStr = rAnio + '-' + rMesPad + '-' + rDiaPad;
    if(d && rStr < d) return false;
    if(h && rStr > h) return false;
  }
  return true;
}

export function fCajaFiltered() {
  var a = getA(), m = getM(), c = getC(), d = getDesde(), h = getHasta();
  return DB.caja.filter(function(r) {
    return checkRangeCaja(r, a, m, c, d, h);
  });
}

export function renderCaja() {
  var cajaData = fCajaFiltered();
  var kpiEl = document.getElementById('kpi-caja');
  var tblEl = document.getElementById('tbl-caja');
  var chartContainerComp = document.getElementById('chart-caja-comp');
  var chartContainerMix = document.getElementById('chart-caja-mix');

  if (!kpiEl || !tblEl) return;

  if (!cajaData.length) {
    kpiEl.innerHTML = emptyMsg('Configurá las sucursales y cargá los archivos de Mov. Caja Consolidados.');
    tblEl.innerHTML = '';
    if (chartContainerComp) chartContainerComp.style.display = 'none';
    if (chartContainerMix) chartContainerMix.style.display = 'none';
    return;
  }

  // --- 1. CÁLCULO DE MÉTRICAS ---
  var tVentas = 0, tGastos = 0, tTarjetas = 0, tEfectivo = 0;
  cajaData.forEach(function(r) {
    tVentas += (r.ventas || 0);
    tGastos += (r.gastos || 0);
    tTarjetas += (r.tarjetas || 0);
    tEfectivo += (r.efectivo || 0);
  });
  var tNeto = tVentas - tGastos;

  const mkK = (l, v, cls) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-val ${cls||''}">${v}</div></div>`;
  
  kpiEl.innerHTML = 
    mkK('Ventas Totales (Caja)', fm(tVentas), 'gold') +
    mkK('Gastos Registrados', fm(tGastos), 'gold') +
    mkK('Flujo Neto (Caja)', fm(tNeto), tNeto >= 0 ? 'gold' : 'gold') +
    mkK('Cobrado en Efectivo', fm(tEfectivo)) +
    mkK('Cobrado en Tarjetas', fm(tTarjetas)) +
    mkK('% Tarjetas s/Venta', tVentas > 0 ? fd((tTarjetas / tVentas) * 100) + '%' : '0.00%');

  // Sort caja data by date for charts/table
  var sortedData = [...cajaData].sort(function(a, b) {
    return new Date(a.anio, a.mes - 1, a.dia).getTime() - new Date(b.anio, b.mes - 1, b.dia).getTime();
  });

  // --- 2. GRÁFICO COMPARATIVO VENTAS VS GASTOS ---
  if (chartContainerComp && window.echarts) {
    chartContainerComp.style.display = 'block';
    var isDark = !document.body.classList.contains('light-mode');
    if (!window.chartCajaComp) {
      window.chartCajaComp = window.echarts.init(chartContainerComp, isDark ? 'dark' : null);
    }
    
    var tcM = isDark ? '#8a8680' : '#64748b';
    var tc  = isDark ? '#f0ede8' : '#334155';

    window.chartCajaComp.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['Ventas', 'Gastos'], textStyle: { color: tc, fontFamily: 'Inter' }, bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: sortedData.map(r => r.dia + '/' + r.mes),
        axisLabel: { color: tcM, fontFamily: 'Inter' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: tcM, formatter: v => '$ ' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } }
      },
      series: [
        { name: 'Ventas', type: 'line', smooth: true, data: sortedData.map(r => Math.round(r.ventas)), itemStyle: { color: '#52c48a' } },
        { name: 'Gastos', type: 'bar', data: sortedData.map(r => Math.round(r.gastos)), itemStyle: { color: '#e05252', borderRadius: [4, 4, 0, 0] } }
      ]
    }, true);
  }

  // --- 3. GRÁFICO MIX COBRANZA (Efectivo vs Tarjeta) ---
  if (chartContainerMix && window.echarts) {
    chartContainerMix.style.display = 'block';
    var isDark = !document.body.classList.contains('light-mode');
    if (!window.chartCajaMix) {
      window.chartCajaMix = window.echarts.init(chartContainerMix, isDark ? 'dark' : null);
    }
    var tcGen = isDark ? '#f0ede8' : '#334155';
    window.chartCajaMix.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: p => `<b>${p.name}</b><br/>${fm(p.value)} (${p.percent}%)` },
      legend: { orient: 'horizontal', bottom: 0, textStyle: { color: tcGen, fontSize: 10 } },
      color: ['#52c48a', '#5a9fd4'],
      series: [{
        name: 'Cobranza',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: isDark ? '#1e293b' : '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 10, color: tcGen },
        data: [
          { name: 'Efectivo', value: Math.round(tEfectivo) },
          { name: 'Tarjetas', value: Math.round(tTarjetas) }
        ]
      }]
    }, true);
  }

  // --- 4. RENDER TABLA DETALLE ---
  tblEl.innerHTML = buildTable(
    [mkTH('Fecha', false, 'f'), mkTH('Sucursal', false, 's'), mkTH('Ventas', true, 'v'), mkTH('Gastos', true, 'g'), mkTH('Tarjetas', true, 't'), mkTH('Efectivo', true, 'e'), mkTH('Flujo Neto', true, 'n')],
    sortedData.map(function(r) {
      var dateUnix = new Date(r.anio, r.mes - 1, r.dia).getTime();
      var neto = (r.ventas || 0) - (r.gastos || 0);
      var colorStyle = neto < 0 ? 'color:var(--red); font-weight:700' : 'color:var(--green); font-weight:700';
      return [
        mkTD(r.dia + '/' + r.mes + '/' + r.anio, false, dateUnix),
        mkTD(r.sucursal || '—', false, r.sucursal),
        mkTD(fm(r.ventas || 0), true, r.ventas),
        mkTD(fm(r.gastos || 0), true, r.gastos),
        mkTD(fm(r.tarjetas || 0), true, r.tarjetas),
        mkTD(fm(r.efectivo || 0), true, r.efectivo),
        mkTD(`<span style="${colorStyle}">${fm(neto)}</span>`, true, neto)
      ];
    }),
    ['Total', '', mkTD(fm(tVentas), true), mkTD(fm(tGastos), true), mkTD(fm(tTarjetas), true), mkTD(fm(tEfectivo), true), mkTD(fm(tNeto), true)],
    'tbl-caja'
  );
}
