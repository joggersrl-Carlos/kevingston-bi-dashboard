/**
 * js/services/pdf.service.js
 * Servicio para exportación a PDF utilizando html2pdf.
 * Sigue la regla II (Wrappers).
 */

/**
 * Exporta una sección de la página a PDF.
 */
export const exportToPDF = (element, filename, options = {}) => {
  if (!window.html2pdf) {
    console.error('html2pdf.js no está cargado.');
    return Promise.reject('html2pdf not found');
  }

  const isDark = !document.body.classList.contains('light-mode');
  const backgroundColor = isDark ? '#0f172a' : '#f8fafc';

  const defaultOptions = {
    margin: 10,
    filename: filename || `Reporte_KVN_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      logging: false, 
      backgroundColor 
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  const finalOptions = { ...defaultOptions, ...options };

  return window.html2pdf().set(finalOptions).from(element).save();
};

/**
 * Exporta secciones específicas (Resumen, Gráficos o Tablas).
 */
export const exportPageSection = (type) => {
  const p = document.querySelector('.page.active');
  if (!p) return;
  
  const clone = p.cloneNode(true);
  clone.style.width = (type === 'charts') ? '1400px' : 'auto';
  clone.style.padding = '20px';
  clone.style.background = '#0f172a';
  
  const selectors = {
    resu: ['.chart-container', 'div[id^="chart-"]', '.tgrid', '.tgrid2', '.tgrid3', '.prod-main-grid', '.vend-grid', '.dow-card', '.alert-bell'],
    charts: ['.kpi-row', '.tgrid', '.tgrid2', '.tgrid3', '.prod-main-grid', '.vend-grid', '.alert-bell', '.filters'],
    tables: ['.kpi-row', '.chart-container', 'div[id^="chart-"]', '.gender-block', '.prod-kpi-strip', '.alert-bell']
  };

  (selectors[type] || []).forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  clone.querySelectorAll('div').forEach(d => {
    if (d.id && d.id.startsWith('chart-') && type === 'charts') d.style.display = 'block';
  });

  const opt = {
    filename: `Reporte_${type.toUpperCase()}_KVN_${new Date().toISOString().split('T')[0]}.pdf`,
    pagebreak: { mode: ['css', 'legacy'], avoid: '.tcrd, .tcrd-full, .kpi-row, .pdf-avoid-break, .dow-card, .tgrid2, .tgrid3' },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#0f172a',
      windowWidth: (type === 'charts' ? 1400 : 1200)
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: (type === 'tables' ? 'portrait' : 'landscape') }
  };

  return exportToPDF(clone, opt.filename, opt);
};
