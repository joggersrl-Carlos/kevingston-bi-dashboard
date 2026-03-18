export function mkTH(t,r, sortKey, sortType){return{t:t,r:!!r, sk: sortKey, st: sortType};}
export function mkTD(v,r, rawValue){return{v:v,r:!!r, raw: rawValue};}

let currentSortId = null;
let currentSortCol = null;
let currentSortDir = -1; // -1 for descending, 1 for ascending

export function resetSort() {
  currentSortId = null;
  currentSortCol = null;
  currentSortDir = -1;
}

export function buildTable(heads, rows, totRow, tableId) {
  var ths = heads.map(function(h, cIdx) {
    var cls = h.r ? ' class="r"' : '';
    let content = h.t;
    let arrow = '';
    
    if (tableId && h.sk) {
      cls = ' class="' + (h.r ? 'r ' : '') + 'sortable"';
      if (currentSortId === tableId && currentSortCol === cIdx) {
        arrow = currentSortDir === 1 ? ' <span class="sort-ic">▲</span>' : ' <span class="sort-ic">▼</span>';
        cls = ' class="' + (h.r ? 'r ' : '') + 'sortable active-sort"';
      }
      return `<th${cls} onclick="window.doSort('${tableId}', ${cIdx})">${content}${arrow}</th>`;
    }
    return `<th${cls}>${content}</th>`;
  }).join('');

  let sortedRows = [...rows];
  if (tableId && currentSortId === tableId && currentSortCol !== null) {
    sortedRows.sort((a, b) => {
      let cellA = a[currentSortCol];
      let cellB = b[currentSortCol];
      
      let valA = cellA && cellA.raw !== undefined ? cellA.raw : (cellA && cellA.v !== undefined ? cellA.v : cellA);
      let valB = cellB && cellB.raw !== undefined ? cellB.raw : (cellB && cellB.v !== undefined ? cellB.v : cellB);
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * currentSortDir;
      }
      return ((valA||0) - (valB||0)) * currentSortDir;
    });
  }

  var trs = sortedRows.map(function(r) {
    return '<tr>' + r.map(function(c) {
      var val = typeof c === 'object' && c !== null && 'v' in c ? c.v : c;
      var rt = typeof c === 'object' && c !== null && c.r;
      return '<td' + (rt ? ' class="r"' : '') + '>' + (val == null ? '' : val) + '</td>';
    }).join('') + '</tr>';
  }).join('');

  var tot = totRow ? '<tr class="tot">' + totRow.map(function(c) {
    var val = typeof c === 'object' && c !== null && 'v' in c ? c.v : c;
    var rt = typeof c === 'object' && c !== null && c.r;
    return '<td' + (rt ? ' class="r"' : '') + '>' + (val == null ? '' : val) + '</td>';
  }).join('') + '</tr>' : '';

  return '<table><thead><tr>' + ths + '</tr></thead><tbody>' + trs + tot + '</tbody></table>';
}

export function handleSort(tableId, colIdx, renderCb) {
  if (currentSortId === tableId && currentSortCol === colIdx) {
    currentSortDir *= -1;
  } else {
    currentSortId = tableId;
    currentSortCol = colIdx;
    currentSortDir = -1;
  }
  renderCb();
}
