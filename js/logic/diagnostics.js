/**
 * js/logic/diagnostics.js
 * Lógica de diagnósticos, alertas y auditoría.
 * Sigue la regla I (SoC) y IV (Clean Code).
 */

import { fMovp, fStock, DB, LOADED, SUCURSALES } from '../state.js';

/**
 * Genera alertas basadas en quiebres de stock y otros patrones.
 */
export const getActiveAlerts = () => {
  const alerts = [];
  const addA = (msg, type) => {
    const icon = type === 'error' ? '🔴' : type === 'warning' ? '🟡' : '🔵';
    const border = type === 'error' ? 'var(--red)' : 'var(--gold)';
    alerts.push(`
      <div style="background:var(--bg3); padding:8px; border-radius:6px; border-left:3px solid ${border}; display:flex; gap:6px; align-items:flex-start; line-height:1.3;">
        <span>${icon}</span>
        <span style="flex:1;">${msg}</span>
      </div>
    `);
  };

  const movp = fMovp();
  const stock = fStock();
  
  // Alerta 1: Quiebres de Stock Críticos (Ventas >= 3 y Stock <= 0)
  const pVenta = {};
  movp.forEach(r => { pVenta[r.nombre_prod || r.cod_prod] = (pVenta[r.nombre_prod || r.cod_prod] || 0) + r.salida; });
  const pStock = {};
  stock.forEach(r => { pStock[r.nombre_prod || r.cod_prod] = (pStock[r.nombre_prod || r.cod_prod] || 0) + r.stock; });

  let brk = 0;
  Object.keys(pVenta).forEach(p => {
    if (pVenta[p] >= 3 && (!pStock[p] || pStock[p] <= 0)) {
      if (brk < 6) addA(`<b>Quiebre de Stock:</b> "${p}" vendió ${pVenta[p]} un. pero el stock general reporta 0.`, 'error');
      brk++;
    }
  });

  if (brk > 6) addA(`Y otros ${brk - 6} productos sin stock con alta rotación.`, 'warning');

  return alerts;
};

/**
 * Diagnóstico consolidado de la base de datos local.
 */
export const runFullDiagnostic = () => {
  const MNAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  console.log('=== DIAGNOSTICO MOVP (Mov. Productos) ===');
  console.log('Total registros movp:', DB.movp.length);
  const byYear = {};
  const tipos = {};
  const conceptos = {};

  DB.movp.forEach(r => {
    const y = r.anio;
    if (!byYear[y]) byYear[y] = {};
    if (!byYear[y][r.mes]) byYear[y][r.mes] = { count: 0, salida: 0, entrada: 0 };
    byYear[y][r.mes].count++;
    byYear[y][r.mes].salida += r.salida;
    byYear[y][r.mes].entrada += (r.entrada || 0);
    const t = r.tipo_comp || '(vacio)';
    tipos[t] = (tipos[t] || 0) + r.salida;
    const c = r.concepto || '(vacio)';
    conceptos[c] = (conceptos[c] || 0) + r.salida;
  });

  Object.keys(byYear).sort().forEach(y => {
    console.log(`--- Year ${y} ---`);
    for (let m = 1; m <= 12; m++) {
      const d = byYear[y][m];
      if (d) console.log(`  ${MNAMES[m]}: ${d.count} registros, Salida=${d.salida}, Entrada=${d.entrada}`);
    }
  });
  console.log('--- Desglose por Tipo/Concepto (Unidades Salida) ---', tipos, conceptos);
  console.log('=== DIAGNOSTICO COMP (Comprobantes) ===', DB.comp.length);
  console.log('=== ARCHIVOS CARGADOS ===');
  LOADED.forEach(l => console.log(`  - ${l.suc} ${l.typeName} ${l.n} registros`));
  console.log('SUCURSALES:', SUCURSALES.join(', '));
};

/**
 * Diagnóstico de superposición entre sucursales.
 */
export const runSucursalDiagnostic = () => {
  console.log('%c=== DIAGNÓSTICO POR SUCURSAL ===', 'color:#c9a96e;font-weight:bold;font-size:14px');
  
  const compBySuc = {};
  DB.comp.forEach(r => {
    const s = r.sucursal || '(sin sucursal)';
    if (!compBySuc[s]) compBySuc[s] = { count: 0, importe: 0, nros: new Set() };
    compBySuc[s].count++;
    compBySuc[s].importe += (r.importe || 0);
    if (r.nro) compBySuc[s].nros.add(r.nro);
  });
  
  console.log('%cCOMPROBANTES por sucursal:', 'color:#5a9fd4;font-weight:bold');
  Object.keys(compBySuc).forEach(s => {
    const d = compBySuc[s];
    console.log(`  📍 ${s}: ${d.count} registros, Importe total: $${Math.round(d.importe).toLocaleString('es-AR')}, Nros únicos: ${d.nros.size}`);
  });
  
  const movpBySuc = {};
  DB.movp.forEach(r => {
    const s = r.sucursal || '(sin sucursal)';
    if (!movpBySuc[s]) movpBySuc[s] = { count: 0, salida: 0, productos: new Set() };
    movpBySuc[s].count++;
    movpBySuc[s].salida += (r.salida || 0);
    if (r.cod_prod) movpBySuc[s].productos.add(r.cod_prod);
  });
  
  console.log('%cMOVIMIENTOS por sucursal:', 'color:#52c48a;font-weight:bold');
  Object.keys(movpBySuc).forEach(s => {
    const d = movpBySuc[s];
    console.log(`  📍 ${s}: ${d.count} registros, Unidades salida: ${Math.round(d.salida).toLocaleString('es-AR')}, Productos únicos: ${d.productos.size}`);
  });
  
  const sucKeys = Object.keys(compBySuc);
  if (sucKeys.length >= 2) {
    console.log('%c⚠️ COMPARACIÓN DE COMPROBANTES ENTRE SUCURSALES:', 'color:#e05252;font-weight:bold');
    for (let i = 0; i < sucKeys.length; i++) {
      for (let j = i + 1; j < sucKeys.length; j++) {
        const s1 = sucKeys[i], s2 = sucKeys[j];
        const nros1 = compBySuc[s1].nros, nros2 = compBySuc[s2].nros;
        let overlap = 0;
        nros1.forEach(n => { if (nros2.has(n)) overlap++; });
        const pct = Math.round(overlap / Math.max(nros1.size, nros2.size) * 100);
        console.log(`  ${s1} vs ${s2}: ${overlap} NROs en común (${pct}% de superposición)`);
        if (pct > 80) console.log('%c  🚨 ALERTA: Muy alta superposición!', 'color:#e05252;font-weight:bold');
      }
    }
  }
  console.log('%c=== FIN DIAGNÓSTICO ===', 'color:#c9a96e;font-weight:bold');
};
