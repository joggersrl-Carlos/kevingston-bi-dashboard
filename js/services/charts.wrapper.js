/**
 * js/services/charts.wrapper.js
 * Wrapper para ECharts. Centraliza la creación y configuración de gráficos.
 * Sigue la regla II (Agnosticismo de Dependencias).
 */

import { Colors } from '../design-tokens.js';

class ChartsWrapper {
  constructor() {
    this.instances = new Map();
  }

  /**
   * Inicializa o recupera una instancia de ECharts para un elemento del DOM.
   * @param {string|HTMLElement} elementId 
   * @returns {object} Instancia de ECharts
   */
  init(elementId) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (!el) {
      console.warn(`[ChartsWrapper] Elemento ${elementId} no encontrado.`);
      return null;
    }

    if (!window.echarts) {
      console.error('[ChartsWrapper] ECharts SDK no encontrado.');
      return null;
    }

    // Si ya existe una instancia para este elemento, la reutilizamos o la disponemos
    if (this.instances.has(el)) {
      this.instances.get(el).dispose();
    }

    const instance = window.echarts.init(el);
    this.instances.set(el, instance);
    return instance;
  }

  /**
   * Crea un gráfico de tipo Pie (Donut por defecto).
   * @param {string} elementId 
   * @param {object} options { title, data, showPct, isDark }
   */
  renderPie(elementId, { titleText, data, showPct = false, isDark = true }) {
    const chart = this.init(elementId);
    if (!chart) return;

    const textColor = isDark ? '#f0ede8' : '#334155';
    const borderColor = isDark ? '#2a2a2a' : '#ffffff';

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: params => `<b>${params.name}</b><br/>${params.value.toLocaleString('es-AR')} ${showPct ? '(' + params.percent + '%)' : ''}`
      },
      title: {
        text: titleText,
        left: 'center',
        top: 'center',
        textStyle: { fontSize: 13, fontWeight: 'bold', color: textColor }
      },
      legend: { show: false },
      color: Colors.palette,
      series: [{
        type: 'pie',
        radius: ['40%', '65%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor, borderWidth: 2 },
        label: {
          show: true,
          position: 'outside',
          formatter: showPct ? '{b}\n{d}%' : '{b}\n{c}',
          fontSize: 11,
          fontWeight: 'bold',
          color: textColor
        },
        data: data
      }]
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * Ejecuta resize en todas las instancias activas.
   */
  resizeAll() {
    this.instances.forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }

  /**
   * Crea un gráfico de Línea (Tendencia).
   */
  renderLine(elementId, { titleText, keys, data, isDark = true, area = false, smooth = true }) {
    const chart = this.init(elementId);
    if (!chart) return;

    const textColor = isDark ? '#f0ede8' : '#334155';
    const splitLineColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const option = {
      title: { text: titleText, left: 'center', top: 5, textStyle: { color: textColor, fontSize: 13 } },
      tooltip: { trigger: 'axis', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: Colors.border, textStyle: { color: textColor } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: keys, axisLine: { lineStyle: { color: splitLineColor } }, axisLabel: { color: textColor, fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { show: false }, axisLabel: { color: textColor, fontSize: 10 }, splitLine: { lineStyle: { color: splitLineColor } } },
      color: Colors.palette,
      series: data.map(s => ({
        name: s.name,
        type: 'line',
        data: s.values,
        smooth: smooth,
        symbolSize: 6,
        areaStyle: area ? { opacity: 0.2 } : null,
        lineStyle: { width: 3 }
      }))
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * Crea un gráfico de Barras.
   */
  renderBar(elementId, { titleText, keys, data, isDark = true, horizontal = false, stacked = false }) {
    const chart = this.init(elementId);
    if (!chart) return;

    const textColor = isDark ? '#f0ede8' : '#334155';
    const splitLineColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const option = {
      title: { text: titleText, left: 'center', top: 5, textStyle: { color: textColor, fontSize: 13 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: horizontal ? { type: 'value', splitLine: { show: false } } : { type: 'category', data: keys, axisLabel: { fontSize: 10, color: textColor } },
      yAxis: horizontal ? { type: 'category', data: keys, axisLabel: { fontSize: 10, color: textColor } } : { type: 'value', splitLine: { lineStyle: { color: splitLineColor } } },
      color: Colors.palette,
      series: data.map(s => ({
        name: s.name,
        type: 'bar',
        stack: stacked ? 'total' : null,
        data: s.values,
        itemStyle: { borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] }
      }))
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * Elimina una instancia específica.
   */
  dispose(elementId) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (this.instances.has(el)) {
      this.instances.get(el).dispose();
      this.instances.delete(el);
    }
  }
}

export const charts = new ChartsWrapper();
