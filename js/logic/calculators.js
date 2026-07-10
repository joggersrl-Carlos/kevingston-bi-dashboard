/**
 * js/logic/calculators.js
 * Lógica de negocio y funciones de cálculo puro.
 * Sigue la regla I (SoC) y IV (SOLID).
 */

/**
 * Normaliza números de comprobantes para comparaciones.
 */
export function normalizeNro(nro) {
  if (!nro) return '';
  let s = String(nro).replace(/[^0-9\-]/g, '');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!s) return '';
  return s.split('-').map(p => p.replace(/^0+/, '') || '0').join('-');
}

/**
 * Verifica si un registro está dentro del rango de filtros seleccionado.
 */
export function checkRange(r, { anio, mes, sucursal, desde, hasta }) {
  if ((anio && r.anio !== anio) || (mes && r.mes !== mes) || (sucursal && r.sucursal !== sucursal)) {
    return false;
  }
  
  if (desde || hasta) {
    const rStr = `${r.anio}-${String(r.mes).padStart(2, '0')}-${String(r.dia).padStart(2, '0')}`;
    if (desde && rStr < desde) return false;
    if (hasta && rStr > hasta) return false;
  }
  
  return true;
}

/**
 * Filtra comprobantes (Facturación).
 */
export function filterComps(data, filters) {
  return data.filter(r => checkRange(r, filters));
}

/**
 * Obtiene un Set de números de comprobantes válidos para filtrar movimientos.
 */
export function getValidCompNumbers(comps) {
  if (!comps || !comps.length) return null;
  const valid = new Set();
  
  comps.forEach(c => {
    if (c.nro) {
      const norm = normalizeNro(c.nro);
      if (norm) {
        valid.add(norm);
        if (norm.includes('-')) valid.add(norm.split('-').pop());
      }
      if (c.prefijo && !String(c.nro).includes('-')) {
        const pNorm = normalizeNro(`${c.prefijo}-${c.nro}`);
        if (pNorm) valid.add(pNorm);
      }
    }
  });
  
  return valid;
}

/**
 * Filtra movimientos de producto, validando contra comprobantes si es necesario.
 */
export function filterMovp(data, filters, validCompNumbers = null) {
  return data.filter(r => {
    if (!checkRange(r, filters)) return false;
    if (!validCompNumbers) return true;
    if (!r.nro_comp) return false;
    
    const norm = normalizeNro(r.nro_comp);
    return norm && validCompNumbers.has(norm);
  });
}

/**
 * Calcula el ratio de reconciliación entre Facturación y Movimientos.
 * Útil para alinear totales de reportes de producto con la caja real.
 */
export function calculateReconciliationRatio(comps, movp) {
  const totalComp = comps.reduce((a, r) => a + (r.importe || 0), 0);
  const totalMovp = movp.reduce((a, r) => a + (r.importe || 0), 0);
  return (totalMovp > 0 && totalComp > 0) ? (totalComp / totalMovp) : 1;
}

/**
 * Genera una clave única para un registro basado en su tipo.
 * Reemplaza a 'makeKey' de excelParser.js.
 */
export function generateKey(type, r) {
  if (type === 'comp') return `${r.sucursal}|${r.prefijo}|${r.nro}|${r.letra}|${r.secuencia}|${r.tipo_pago}`;
  if (type === 'movp') return `${r.sucursal}|${r.anio}|${r.mes}|${r.dia}|${r.nro_comp}|${r.cod_prod}|${r.salida || 0}`;
  if (type === 'stock') return `${r.sucursal}|${r.cod_prod}|${r.nombre_prod || ''}|${r.talle || ''}|${r.color || ''}`;
  if (type === 'caja') return `${r.sucursal}|${r.anio}|${r.mes}|${r.dia}`;
  return Math.random().toString(36);
}

/**
 * Agrupa y suma valores por una clave específica.
 */
export function groupAndSum(data, key, sumFields = []) {
  const map = {};
  data.forEach(r => {
    const k = r[key] || '—';
    if (!map[k]) {
      map[k] = {};
      sumFields.forEach(f => map[k][f] = 0);
    }
    sumFields.forEach(f => {
      map[k][f] += (r[f] || 0);
    });
  });
  return map;
}
