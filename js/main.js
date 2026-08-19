import { SUCURSALES, setSucursales, LOADED, curPage, setCurPage, clearDB, DB, SEEN } from './state.js';
import { handleFiles } from './excelParser.js';
import { renderFact } from './views/facturacion.js';
import { renderProd, filterProductos, filterProductosPesos } from './views/producto.js';
import { renderVend } from './views/vendedor.js';
import { renderResumen } from './views/resumen.js';
import { renderInsights } from './views/insights.js';
import { renderCaja } from './views/caja.js';
import { handleSort } from './components/tables.js';
import { exportCSV, showToast } from './utils.js';
import { loadAllData, saveAllData, clearLocalData, syncToSupabase } from './storage.js';


window.setQuickDate = function(tipo) {
    if(!window.doRender) return;
    var td = new Date();
    var y = td.getFullYear(), m = td.getMonth();
    var pad = n => n<10 ? '0'+n : n;
    var fDate = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    var fi = document.getElementById('fDesde'), ff = document.getElementById('fHasta'); // Corrected IDs based on existing code
    if (tipo === 'HOY') {
        fi.value = fDate(td); ff.value = fDate(td);
    } else if (tipo === '7D') {
        var d7 = new Date(td); d7.setDate(td.getDate() - 6);
        fi.value = fDate(d7); ff.value = fDate(td);
    } else if (tipo === 'MTD') {
        var d1 = new Date(y, m, 1);
        fi.value = fDate(d1); ff.value = fDate(td);
    }
    document.getElementById('fAnio').value = '0'; // Corrected ID based on existing code
    document.getElementById('fMes').value = '0'; // Corrected ID based on existing code
    window.doRender();
};

window.exportGlobalPDF = function() {
    var activePage = document.querySelector('.page.active');
    if(!activePage || !window.html2pdf) {
        if(window.showToast) window.showToast('❌ html2pdf no está disponible', 'error', 3000);
        return;
    }

    var isDark = !document.body.classList.contains('light-mode');
    var bColor = isDark ? '#0f172a' : '#f8fafc';

    var opt = {
      margin:       10,
      filename:     'KVN_Reporte_' + new Date().toISOString().split('T')[0] + '.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: bColor },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    if(window.showToast) window.showToast('⏳ Generando PDF...', 'info', 4000);
    window.html2pdf().set(opt).from(activePage).save().then(function(){
       if(window.showToast) window.showToast('✅ PDF generado exitosamente', 'success', 3000);
    }).catch(function(e){
       console.error(e);
       if(window.showToast) window.showToast('❌ Error generando PDF', 'error', 3000);
    });
};

window.toggleAlerts = function() {
    var d = document.getElementById('alertDropdown');
    if(d.style.display === 'none') d.style.display = 'block';
    else d.style.display = 'none';
};

window.generateAlerts = function() {
    var alerts = [];
    var addA = (msg, type) => {
        var icon = type==='error'?'🔴':type==='warning'?'🟡':'🔵';
        var borderColor = type==='error' ? 'var(--red)' : type==='warning' ? '#e8c98a' : 'var(--blue)';
        alerts.push(`<div style="background:var(--bg3); padding:8px; border-radius:6px; border-left:3px solid ${borderColor}; display:flex; gap:6px; align-items:flex-start; line-height:1.3;"><span>${icon}</span><span style="flex:1;">${msg}</span></div>`);
    };

    var movp = fMovp();
    var stock = fStock();
    
    // Alerta 1: Quiebres de Stock Críticos (Ventas >= 3 y Stock <= 0)
    var pVenta = {};
    var pNombre = {};
    movp.forEach(r => {
        var key = r.nombre_prod || r.cod_prod;
        pVenta[key] = (pVenta[key]||0) + r.salida;
        if (!pNombre[key]) pNombre[key] = r.nombre_prod || r.cod_prod;
    });
    var pStock = {};
    stock.forEach(r => {
        var key = r.nombre_prod || r.cod_prod;
        pStock[key] = (pStock[key]||0) + r.stock;
    });

    var brk = 0;
    Object.keys(pVenta).forEach(p => {
        if(pVenta[p] >= 3 && (!pStock[p] || pStock[p] <= 0)) {
            if(brk < 5) addA(`<b>Sin Stock:</b> "${pNombre[p]||p}" vendió ${Math.round(pVenta[p])} un. y tiene stock 0.`, 'error');
            brk++;
        }
    });
    if (brk > 5) addA(`Y otros ${brk - 5} productos sin stock con alta rotación.`, 'warning');

    // Alerta 2: Stock Bajo (Stock <= 5 pero > 0 con ventas recientes >= 2)
    var lowStock = 0;
    Object.keys(pVenta).forEach(p => {
        var stk = pStock[p];
        if(pVenta[p] >= 2 && stk > 0 && stk <= 5) {
            if(lowStock < 3) addA(`<b>Stock Bajo:</b> "${pNombre[p]||p}" tiene solo ${stk} unidad${stk!==1?'es':''} y vendió ${Math.round(pVenta[p])} recientemente.`, 'warning');
            lowStock++;
        }
    });
    if (lowStock > 3) addA(`Y otros ${lowStock - 3} productos con stock bajo y buena rotación.`, 'warning');

    var badge = document.getElementById('alertBadge');
    var list = document.getElementById('alertList');
    if(!badge || !list) return;

    if(alerts.length > 0) {
        badge.style.display = 'block';
        badge.innerText = alerts.length;
        list.innerHTML = alerts.join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = '<div style="color:var(--muted); text-align:center; padding:10px 0;">Todo en orden. No hay alertas críticas. 🎉</div>';
    }
};

console.log('[KBI] main.js initialized');

export function doRender(){
  if(curPage==='fact')renderFact();
  else if(curPage==='vend')renderVend();
  else if(curPage==='prod')renderProd();
  else if(curPage==='resu')renderResumen();
  else if(curPage==='ins')renderInsights();
  else if(curPage==='caja')renderCaja();
}
window.doRender = doRender;

window.doSort = function(tableId, colIdx) {
  handleSort(tableId, colIdx, doRender);
};

window.filterProductos = filterProductos;
window.filterProductosPesos = filterProductosPesos;
window.exportCSV = exportCSV;
window.clearLocalData = clearLocalData;
window.showToast = showToast;

window.syncNube = async function() {
  showToast('☁️ Sincronizando con la nube...', 'info', 5000);
  try {
    await syncToSupabase();
    showToast('✅ Datos sincronizados con Supabase exitosamente!', 'success', 4000);
  } catch(e) {
    showToast('❌ Error al sincronizar: ' + e.message, 'error', 5000);
  }
};

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
  const countEl = document.getElementById('suc-count');
  if (countEl) countEl.textContent=SUCURSALES.length+' cargada'+(SUCURSALES.length!==1?'s':'');
  
  const chipsEl = document.getElementById('sucChips');
  if (chipsEl) {
    chipsEl.innerHTML=SUCURSALES.length?SUCURSALES.map(function(s){
        return'<div class="suc-chip">'+s+'<span class="suc-chip-del" onclick="window.removeSucursal(\''+s.replace(/'/g,"\\'")+'\')" title="Eliminar">✕</span></div>';
    }).join(''):'<span class="suc-empty">Todavía no hay sucursales cargadas</span>';
  }

  var sel=document.getElementById('sucSelect'),prev=sel.value;
  if(sel) {
    sel.innerHTML='<option value="">— Seleccioná sucursal —</option>'+SUCURSALES.map(function(s){return'<option value="'+s+'">'+s+'</option>';}).join('');
    if(prev&&SUCURSALES.indexOf(prev)!==-1)sel.value=prev;
  }
}

window.addSucursal = function(){
  var inp = document.getElementById('sucNameInput');
  if(!inp) return;
  var name = inp.value.trim();
  if(!name) {
    inp.style.borderColor = '#e05252';
    if(window.showToast) window.showToast('⚠️ Escribe el nombre de tu sucursal antes de añadirla', 'error', 3000);
    setTimeout(function(){ inp.style.borderColor=''; }, 2000);
    inp.focus();
    return;
  }
  if(SUCURSALES.some(function(s){return s.toLowerCase()===name.toLowerCase();})){
    inp.style.borderColor='#e05252';
    if(window.showToast) window.showToast('⚠️ Esta sucursal ya existe', 'error', 3000);
    setTimeout(function(){inp.style.borderColor='';},1500);
    return;
  }
  SUCURSALES.push(name);
  inp.value='';
  renderSucursales();
  buildFilters();
  saveAllData(); 
};

window.removeSucursal = function(name){
  let idx = SUCURSALES.indexOf(name);
  if(idx !== -1) SUCURSALES.splice(idx, 1);
  renderSucursales();
  buildFilters();
  saveAllData(); 
};

function buildFilters(){
  var ys={};['comp','movp','caja'].forEach(function(t){DB[t].forEach(function(r){if(r.anio)ys[r.anio]=1;});});
  var years=Object.keys(ys).map(Number).sort(function(a,b){return b-a;});
  var sA=document.getElementById('fAnio'),pA=sA.value;
  if(sA) {
    sA.innerHTML='<option value="0">Todos</option>';
    years.forEach(function(y){var o=document.createElement('option');o.value=String(y);o.textContent=String(y);sA.appendChild(o);});
    if(pA&&pA!=='0'&&ys[parseInt(pA)])sA.value=pA;else if(years.length)sA.value=String(years[0]);
  }
  var sC=document.getElementById('fCaja'),pC=sC.value;
  if(sC) {
    sC.innerHTML='<option value="">Todas</option>';
    SUCURSALES.forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent=s;sC.appendChild(o);});
    if(pC&&SUCURSALES.indexOf(pC)!==-1)sC.value=pC;
  }
}

window.showPage = function(name, tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t => t.classList.remove('active'));
  const pageEl = document.getElementById('page-' + name);
  if (pageEl) pageEl.classList.add('active');
  if (tab) tab.classList.add('active');
  setCurPage(name);
  const titles = { fact: 'Facturación Diaria', vend: 'Análisis por Vendedor', prod: 'Reporte de Producto', resu: 'Resumen General', ins: '💡 Insights Ejecutivos', caja: '💰 Control de Caja' };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[name] || 'Dashboard';
  doRender();
};

window.toggleConfig = function() {
  const b = document.getElementById('config-body');
  const a = document.getElementById('config-arrow');
  if(b && a) {
    const isOpen = b.classList.contains('open');
    b.classList.toggle('open', !isOpen);
    a.classList.toggle('open', !isOpen);
  }
};

window.triggerUpload = function() {
  const suc = document.getElementById('sucSelect').value;
  if (!suc) {
    document.getElementById('sucSelect').style.borderColor = '#e05252';
    if(window.showToast) window.showToast('❌ Primero tenés que crear una Sucursal en el Paso 1 para asignarle los Excel.', 'error', 5000);
    setTimeout(() => { if(document.getElementById('sucSelect')) document.getElementById('sucSelect').style.borderColor = ''; }, 2000);
    
    const b = document.getElementById('config-body');
    const a = document.getElementById('config-arrow');
    if(b && a && !b.classList.contains('open')) { b.classList.add('open'); a.classList.add('open'); }
    
    const inp = document.getElementById('sucNameInput');
    if(inp) { inp.focus(); inp.style.borderColor='#e05252'; setTimeout(()=>inp.style.borderColor='', 2000); }
    return;
  }
  const fi = document.getElementById('fi');
  if(fi) { fi.value = ''; fi.click(); }
};

window.handleFiles = function(ev) {
  handleFiles(ev, renderLoaded, buildFilters, doRender);
};

function initEvents() {
  console.log('[KBI] Binding events...');
  
  const addBtn = document.getElementById('btnAddSucursal');
  if (addBtn) {
    addBtn.removeAttribute('onclick');
    addBtn.addEventListener('click', window.addSucursal);
  }

  const configHeader = document.querySelector('.config-header');
  if (configHeader) {
    configHeader.removeAttribute('onclick');
    configHeader.addEventListener('click', window.toggleConfig);
  }

  const triggerBtn = document.querySelector('button[onclick="triggerUpload()"]');
  if (triggerBtn) {
    triggerBtn.removeAttribute('onclick');
    triggerBtn.addEventListener('click', window.triggerUpload);
  }

  const navTabFact = document.getElementById('tab-fact');
  if(navTabFact) navTabFact.addEventListener('click', () => window.showPage('fact', navTabFact));
  
  const navTabVend = document.getElementById('tab-vend');
  if(navTabVend) navTabVend.addEventListener('click', () => window.showPage('vend', navTabVend));
  
  const navTabProd = document.getElementById('tab-prod');
  if(navTabProd) navTabProd.addEventListener('click', () => window.showPage('prod', navTabProd));

  const navTabIns = document.getElementById('tab-ins');
  if(navTabIns) navTabIns.addEventListener('click', () => window.showPage('ins', navTabIns));

  const navTabCaja = document.getElementById('tab-caja');
  if(navTabCaja) navTabCaja.addEventListener('click', () => window.showPage('caja', navTabCaja));

  const navTabResu = document.getElementById('tab-resu');
  if(navTabResu) navTabResu.addEventListener('click', () => window.showPage('resu', navTabResu));

  const sucInput = document.getElementById('sucNameInput');
  if (sucInput) {
    sucInput.removeAttribute('onkeydown');
    sucInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.addSucursal();
    });
  }

  const fAnio = document.getElementById('fAnio');
  if(fAnio) {
    fAnio.addEventListener('change', () => {
      var d = document.getElementById('fDesde'), h = document.getElementById('fHasta');
      if(d) d.value = '';
      if(h) h.value = '';
      doRender();
    });
  }
  
  const fMes = document.getElementById('fMes');
  if(fMes) {
    fMes.addEventListener('change', () => {
      var d = document.getElementById('fDesde'), h = document.getElementById('fHasta');
      if(d) d.value = '';
      if(h) h.value = '';
      doRender();
    });
  }
  
  const fCaja = document.getElementById('fCaja');
  if(fCaja) fCaja.addEventListener('change', doRender);

  const fDesde = document.getElementById('fDesde');
  if(fDesde) {
    fDesde.addEventListener('change', () => {
      var a = document.getElementById('fAnio'), m = document.getElementById('fMes');
      if(a) a.value = '0';
      if(m) m.value = '0';
      doRender();
    });
  }

  const fHasta = document.getElementById('fHasta');
  if(fHasta) {
    fHasta.addEventListener('change', () => {
      var a = document.getElementById('fAnio'), m = document.getElementById('fMes');
      var desde = document.getElementById('fDesde').value;
      // Fix #8: Validar que Hasta >= Desde
      if (desde && fHasta.value && fHasta.value < desde) {
        showToast('⚠️ La fecha "Hasta" no puede ser anterior a "Desde"', 'error', 3000);
        fHasta.value = '';
        return;
      }
      if(a) a.value = '0';
      if(m) m.value = '0';
      doRender();
    });
  }

  const setupPdfExport = (id, type) => {
    const btn = document.getElementById(id);
    if(btn) btn.addEventListener('click', () => exportPageSection(type));
  };
  setupPdfExport('btnExportResu', 'resu');
  setupPdfExport('btnExportCharts', 'charts');
  setupPdfExport('btnExportTables', 'tables');
}

function exportPageSection(type) {
  const p = document.querySelector('.page.active');
  if(!p) return;
  
  // Clonar la página para no afectar la UI real
  const clone = p.cloneNode(true);
  clone.style.width = (type === 'charts') ? '1400px' : 'auto';
  clone.style.padding = '20px';
  clone.style.background = '#0f172a';
  
  // Definir que ocultar según el tipo
  const selectors = {
    resu: ['.chart-container', 'div[id^="chart-"]', '.tgrid', '.tgrid2', '.tgrid3', '.prod-main-grid', '.vend-grid', '.dow-card', '.alert-bell'],
    charts: ['.kpi-row', '.tgrid', '.tgrid2', '.tgrid3', '.prod-main-grid', '.vend-grid', '.alert-bell', '.filters'],
    tables: ['.kpi-row', '.chart-container', 'div[id^="chart-"]', '.gender-block', '.prod-kpi-strip', '.alert-bell']
  };

  (selectors[type] || []).forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Asegurar que lo que queda sea visible (por si tiene display:none en el original)
  clone.querySelectorAll('div').forEach(d => {
    if(d.id && d.id.indexOf('chart-') === 0 && type === 'charts') d.style.display = 'block';
  });

  const opt = {
    margin: 10,
    filename: `Reporte_${type.toUpperCase()}_KVN_${new Date().toISOString().split('T')[0]}.pdf`,
    pagebreak: { mode: ['css', 'legacy'], avoid: '.tcrd, .tcrd-full, .kpi-row, .pdf-avoid-break, .dow-card, .tgrid2, .tgrid3' },
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#0f172a',
      windowWidth: (type === 'charts' ? 1400 : 1200)
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: (type === 'tables' ? 'portrait' : 'landscape') }
  };

  window.html2pdf().set(opt).from(clone).save();
}

let _resizeTimer = null;
window.addEventListener('resize', function() {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function() {
    if (window.chartDiaria)      window.chartDiaria.resize();
    if (window.chartGender)      window.chartGender.resize();
    if (window.chartGenderPct)   window.chartGenderPct.resize();
    if (window.chartGenderPesos) window.chartGenderPesos.resize();
    if (window.chartRubro)       window.chartRubro.resize();
    if (window.chartRubroPesos)  window.chartRubroPesos.resize();
    if (window.chartYOY)         window.chartYOY.resize();
    if (window.chartResu)        window.chartResu.resize();
    if (window.chartHora)        window.chartHora.resize();
    if (window.chartVend)        window.chartVend.resize();
    if (window.chartInsDist)     window.chartInsDist.resize();
    if (window.chartInsAvg)      window.chartInsAvg.resize();
    if (window.chartCajaComp)    window.chartCajaComp.resize();
    if (window.chartCajaMix)     window.chartCajaMix.resize();
  }, 150);
});

showToast('☁️ Sincronizando datos automáticamente...', 'info', 3000);
loadAllData().then(function(hasData) {
  console.log('[KBI] Storage loaded, hasData:', hasData);
  renderLoaded();
  buildFilters();
  renderSucursales();
  initEvents();
  doRender();
  if(window.generateAlerts) window.generateAlerts(); // Added this line
  if (hasData) {
    showToast('✅ Datos sincronizados', 'success', 3000);
  }
}).catch(err => {
  console.error('[KBI] Init error:', err);
  initEvents();
  doRender();
  showToast('❌ Error sincronizando', 'error', 3000);
});
window.diagnostico = function() {
  var MNAMES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  console.log('=== DIAGNOSTICO MOVP (Mov. Productos) ===');
  console.log('Total registros movp:', DB.movp.length);
  var byYear = {};
  var tipos = {};
  var conceptos = {};
  DB.movp.forEach(function(r) {
    var y = r.anio;
    if(!byYear[y]) byYear[y] = {};
    if(!byYear[y][r.mes]) byYear[y][r.mes] = {count:0, salida:0, entrada:0};
    byYear[y][r.mes].count++;
    byYear[y][r.mes].salida += r.salida;
    byYear[y][r.mes].entrada += (r.entrada||0);
    var t = r.tipo_comp || '(vacio)';
    tipos[t] = (tipos[t]||0) + r.salida;
    var c = r.concepto || '(vacio)';
    conceptos[c] = (conceptos[c]||0) + r.salida;
  });
  Object.keys(byYear).sort().forEach(function(y) {
    console.log('--- Year ' + y + ' ---');
    for(var m=1; m<=12; m++) {
      var d = byYear[y][m];
      if(d) console.log('  ' + MNAMES[m] + ': ' + d.count + ' registros, Salida=' + d.salida + ', Entrada=' + d.entrada);
    }
  });
  console.log('--- Desglose por Tipo/Concepto (Unidades Salida) ---');
  console.log('Tipos:', tipos);
  console.log('Conceptos:', conceptos);
  console.log('=== DIAGNOSTICO COMP (Comprobantes) ===');
  console.log('Total registros comp:', DB.comp.length);
  console.log('=== ARCHIVOS CARGADOS ===');
  LOADED.forEach(function(l) { console.log('  -', l.suc, l.typeName, l.n, 'registros'); });
  console.log('SUCURSALES:', SUCURSALES.join(', '));
};

window.diagnosticoSucursales = function() {
  console.log('%c=== DIAGNÓSTICO POR SUCURSAL ===', 'color:#c9a96e;font-weight:bold;font-size:14px');
  
  // Comp por sucursal
  var compBySuc = {};
  DB.comp.forEach(function(r) {
    var s = r.sucursal || '(sin sucursal)';
    if (!compBySuc[s]) compBySuc[s] = { count: 0, importe: 0, nros: new Set() };
    compBySuc[s].count++;
    compBySuc[s].importe += (r.importe || 0);
    if (r.nro) compBySuc[s].nros.add(r.nro);
  });
  
  console.log('%cCOMPROBANTES por sucursal:', 'color:#5a9fd4;font-weight:bold');
  Object.keys(compBySuc).forEach(function(s) {
    var d = compBySuc[s];
    console.log('  📍 ' + s + ': ' + d.count + ' registros, Importe total: $' + Math.round(d.importe).toLocaleString('es-AR') + ', Nros únicos: ' + d.nros.size);
  });
  
  // Movp por sucursal
  var movpBySuc = {};
  DB.movp.forEach(function(r) {
    var s = r.sucursal || '(sin sucursal)';
    if (!movpBySuc[s]) movpBySuc[s] = { count: 0, salida: 0, productos: new Set() };
    movpBySuc[s].count++;
    movpBySuc[s].salida += (r.salida || 0);
    if (r.cod_prod) movpBySuc[s].productos.add(r.cod_prod);
  });
  
  console.log('%cMOVIMIENTOS por sucursal:', 'color:#52c48a;font-weight:bold');
  Object.keys(movpBySuc).forEach(function(s) {
    var d = movpBySuc[s];
    console.log('  📍 ' + s + ': ' + d.count + ' registros, Unidades salida: ' + Math.round(d.salida).toLocaleString('es-AR') + ', Productos únicos: ' + d.productos.size);
  });
  
  // Comparar NROs entre sucursales para detectar duplicados
  var sucKeys = Object.keys(compBySuc);
  if (sucKeys.length >= 2) {
    console.log('%c⚠️ COMPARACIÓN DE COMPROBANTES ENTRE SUCURSALES:', 'color:#e05252;font-weight:bold');
    for (var i = 0; i < sucKeys.length; i++) {
      for (var j = i + 1; j < sucKeys.length; j++) {
        var s1 = sucKeys[i], s2 = sucKeys[j];
        var nros1 = compBySuc[s1].nros, nros2 = compBySuc[s2].nros;
        var overlap = 0;
        nros1.forEach(function(n) { if (nros2.has(n)) overlap++; });
        var pct = Math.round(overlap / Math.max(nros1.size, nros2.size) * 100);
        console.log('  ' + s1 + ' vs ' + s2 + ': ' + overlap + ' NROs en común (' + pct + '% de superposición)');
        if (pct > 80) {
          console.log('%c  🚨 ALERTA: Muy alta superposición! Es posible que los mismos archivos hayan sido cargados para ambas sucursales.', 'color:#e05252;font-weight:bold');
        }
      }
    }
  }
  
  console.log('%c=== FIN DIAGNÓSTICO ===', 'color:#c9a96e;font-weight:bold');
};

// --- THEME TOGGLE ---
const THEME_KEY = 'kbi_theme';
let isLightMode = localStorage.getItem(THEME_KEY) === 'light';
if (isLightMode) document.body.classList.add('light-mode');

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.title = isLightMode ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
    // If the button only has text (legacy), replace with sun/moon icon text
    if (!btn.querySelector('svg')) {
      btn.textContent = isLightMode ? '🌙' : '☀️';
    }
  }
}
updateThemeIcon();

window.toggleTheme = function() {
  document.body.classList.toggle('light-mode');
  isLightMode = document.body.classList.contains('light-mode');
  localStorage.setItem(THEME_KEY, isLightMode ? 'light' : 'dark');
  updateThemeIcon();
  // Destruir TODOS los gráficos para que se recreen con el nuevo tema
  const chartKeys = [
    'chartResu','chartDiaria','chartRubro','chartRubroPesos',
    'chartGender','chartGenderPct','chartGenderPesos',
    'chartYOY','chartHora','chartVend','chartInsDist','chartInsAvg',
    'chartCajaComp','chartCajaMix'
  ];
  chartKeys.forEach(k => {
    if (window[k]) { window[k].dispose(); window[k] = null; }
  });
  if(window.doRender) window.doRender();
};

