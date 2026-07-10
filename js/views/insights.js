/**
 * js/views/insights.js
 * Reporte de Insights Ejecutivos — usa ECharts directamente.
 */

import { fComp, fMovp } from '../state.js';
import { fm, fn, uniqueTickets } from '../utils.js';

const PALETTE = ['#c9a96e','#5a9fd4','#52c48a','#e07b9a','#9b7fd4','#4ec9b0','#e8c98a','#e05252','#73c6e8','#a3d977'];

export const renderInsights = () => {
  const comp = fComp();
  const movp = fMovp();
  const kpiEl  = document.getElementById('kpi-ins');
  const textEl = document.getElementById('ins-text');

  if (!kpiEl || !textEl) return;

  if (comp.length === 0) {
    kpiEl.innerHTML = '';
    textEl.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--muted);">
        <div style="font-size:40px; margin-bottom:12px;">📊</div>
        <div style="font-size:14px;">No hay datos suficientes para generar insights.</div>
        <div style="font-size:12px; margin-top:6px; color:var(--muted);">Cargá archivos de Comprobantes primero.</div>
      </div>
    `;
    return;
  }

  // --- CÁLCULO DE MÉTRICAS ---
  const tkts = uniqueTickets(comp);
  const bySuc = {};
  let totalRev = 0;

  tkts.forEach(r => {
    const s = r.sucursal || 'Desconocida';
    if (!bySuc[s]) bySuc[s] = { rev: 0, tickets: 0, uni: 0 };
    bySuc[s].rev     += (r.importe || 0);
    bySuc[s].tickets += 1;
    totalRev += (r.importe || 0);
  });

  movp.forEach(r => {
    const s = r.sucursal || 'Desconocida';
    if (!bySuc[s]) bySuc[s] = { rev: 0, tickets: 0, uni: 0 };
    bySuc[s].uni += (r.salida || 0);
  });

  const sucs = Object.keys(bySuc).sort((a, b) => bySuc[b].rev - bySuc[a].rev);
  const totalTickets = tkts.length;
  const globalAvg = totalTickets > 0 ? totalRev / totalTickets : 0;
  const isDark = !document.body.classList.contains('light-mode');

  // --- KPIs ---
  const topSuc  = sucs[0] || '—';
  const topPct  = totalRev > 0 ? Math.round((bySuc[topSuc]?.rev || 0) / totalRev * 100) : 0;
  const mkK = (l, v, cls) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-val ${cls||''}">${v}</div></div>`;
  kpiEl.innerHTML =
    mkK('Ingresos Totales', fm(totalRev), 'gold') +
    mkK('Ticket Promedio Global', fm(globalAvg)) +
    mkK('Sucursal Principal', topSuc.substring(0,16)) +
    mkK('Participación Líder', topPct + '%') +
    mkK('Sucursales', fn(sucs.length)) +
    mkK('Tickets', fn(totalTickets));

  // --- GRÁFICO DE DISTRIBUCIÓN (Pie) ---
  const distEl = document.getElementById('chart-ins-dist');
  if (distEl && window.echarts && sucs.length > 0) {
    if (!window.chartInsDist) {
      window.chartInsDist = window.echarts.init(distEl, isDark ? 'dark' : null);
    }
    const tcGen = isDark ? '#f0ede8' : '#334155';
    window.chartInsDist.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: p => `<b>${p.name}</b><br/>${fm(p.value)}<br/>${p.percent}%` },
      legend: { orient: 'horizontal', bottom: 0, textStyle: { color: tcGen, fontSize: 10 } },
      color: PALETTE,
      series: [{
        name: 'Ingresos',
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: isDark ? '#1e293b' : '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 10, color: tcGen },
        data: sucs.map(s => ({ name: s, value: Math.round(bySuc[s].rev) }))
      }]
    }, true);
  }

  // --- GRÁFICO TICKET PROMEDIO (Bar) ---
  const avgEl = document.getElementById('chart-ins-avg');
  if (avgEl && window.echarts && sucs.length > 0) {
    if (!window.chartInsAvg) {
      window.chartInsAvg = window.echarts.init(avgEl, isDark ? 'dark' : null);
    }
    const tc  = isDark ? '#f8fafc' : '#0f172a';
    const tcM = isDark ? '#94a3b8' : '#64748b';
    window.chartInsAvg.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: p => `<b>${p[0].name}</b><br/>Ticket Prom: <b>${fm(p[0].value)}</b>` },
      grid: { left: '3%', right: '5%', top: '8%', bottom: '12%', containLabel: true },
      xAxis: { type: 'category', data: sucs, axisLabel: { color: tcM, fontSize: 10, interval: 0, rotate: sucs.length > 4 ? 20 : 0 } },
      yAxis: { type: 'value', axisLabel: { color: tcM, formatter: v => '$ ' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } } },
      series: [{
        type: 'bar',
        data: sucs.map((s, i) => ({
          value: Math.round(bySuc[s].rev / (bySuc[s].tickets || 1)),
          itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [6, 6, 0, 0] }
        })),
        label: { show: true, position: 'top', formatter: p => fm(p.value), color: tcM, fontSize: 9 }
      }]
    }, true);
  }

  // --- TEXTO DE INSIGHTS AUTOMÁTICOS ---
  if (sucs.length === 0) { textEl.innerHTML = ''; return; }

  const sortedByAvg = [...sucs].sort((a, b) =>
    (bySuc[b].rev / (bySuc[b].tickets||1)) - (bySuc[a].rev / (bySuc[a].tickets||1))
  );
  const bestAvg   = sortedByAvg[0];
  const bestVal   = Math.round(bySuc[bestAvg].rev / (bySuc[bestAvg].tickets||1));
  const avgDiff   = globalAvg > 0 ? Math.round(((bestVal / globalAvg) - 1) * 100) : 0;
  const worstSuc  = sucs[sucs.length - 1];
  const oppImpact = Math.round(globalAvg * 0.1 * (bySuc[worstSuc]?.tickets || 0));

  const card = (icon, title, color, text) => `
    <div style="background:var(--bg2); padding:14px 16px; border-radius:10px; border-left:4px solid ${color}; margin-bottom:12px;">
      <div style="font-weight:700; color:${color}; margin-bottom:6px; font-size:13px; font-family:'Outfit',sans-serif;">${icon} ${title}</div>
      <div style="font-size:12px; line-height:1.6; color:var(--text);">${text}</div>
    </div>
  `;

  textEl.innerHTML = `<div style="display:flex; flex-direction:column; gap:0;">` +
    card('📊', 'Concentración de Mercado', '#c9a96e',
      `La sucursal <b>${topSuc}</b> genera el <b>${topPct}%</b> de los ingresos totales. ${topPct > 60 ? 'Alta concentración en una sola ubicación — se recomienda diversificar esfuerzos de marketing.' : 'Buena distribución entre sucursales.'}`
    ) +
    card('💰', 'Valor de Transacción', '#5a9fd4',
      `La sucursal <b>${bestAvg}</b> tiene el ticket promedio más alto: <b>${fm(bestVal)}</b>.
      ${avgDiff > 0 ? `Supera el promedio global en un <b>${avgDiff}%</b>. Analizá el mix de productos de esta sucursal para replicarlo.` : 'Se encuentra en línea con el promedio global.'}`
    ) +
    (sucs.length > 1 && oppImpact > 0 ? card('🚀', 'Oportunidad de Crecimiento', '#52c48a',
      `Incrementar el ticket promedio de <b>${worstSuc}</b> en solo un 10% generaría un impacto estimado de <b>${fm(oppImpact)}</b> adicionales en el período.`
    ) : '') +
  `</div>`;
};
