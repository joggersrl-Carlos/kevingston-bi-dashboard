export function pMoney(v){if(v===''||v===null||v===undefined)return 0;if(typeof v==='number')return v;var s=String(v).trim();if(!s)return 0;if(/^-?\d+(\.\d+)?$/.test(s))return parseFloat(s)||0;return parseFloat(s.replace(/[$\s]/g,'').replace(/\./g,'').replace(',','.'))||0;}
export function pNum(v){if(typeof v==='number')return v;return parseFloat(String(v||'').replace(',','.'))||0;}
export function pDate(v){
  if(!v)return null;
  if(v instanceof Date)return isNaN(v.getTime())?null:v;
  if(typeof v==='number'){var d=new Date(Math.round((v-25569)*86400*1000));if(!isNaN(d.getTime()))return d;}
  var s=String(v).trim();
  var sn=parseFloat(s);
  if(!isNaN(sn)&&sn>30000&&sn<70000&&!/[,\/\-]/.test(s)){var d=new Date(Math.round((sn-25569)*86400*1000));if(!isNaN(d.getTime())&&d.getFullYear()>=1900&&d.getFullYear()<=2100)return d;}
  var m=s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+(\d{1,2})[:\.](\d{1,2})(?:[:\.](\d{1,2}))?)?$/);
  if(m){
     var y=parseInt(m[3]);if(y<100)y+=2000;
     var hr=m[4]?parseInt(m[4]):0;
     var min=m[5]?parseInt(m[5]):0;
     var sec=m[6]?parseInt(m[6]):0;
     return new Date(y,parseInt(m[2])-1,parseInt(m[1]),hr,min,sec);
  }
  m=s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if(m)return new Date(parseInt(m[1]),parseInt(m[2])-1,parseInt(m[3]));
  var d2=new Date(s);return isNaN(d2.getTime())?null:d2;
}
export function ST(v){return String(v||'').trim();}
export function gel(id){return document.getElementById(id);}
export function fm(n){return '$\u00a0'+Math.round(n).toLocaleString('es-AR');}
export function fn(n){return Math.round(n).toLocaleString('es-AR');}
export function fd(n){return parseFloat(n).toFixed(2);}
export function emptyMsg(m){return'<div class="empty">'+m+'</div>';}
export function vendCod(v){if(!v)return'';var s=String(v).trim();var m=s.match(/^0*(\d+)[-–\s]/);if(m)return m[1];m=s.match(/^0*(\d+)$/);if(m)return m[1];return s;}
export function vendNombre(v){if(!v)return'';var s=String(v).trim();var m=s.match(/^\d+[-–]\s*(.+)$/);if(m)return m[1].trim();return s;}
export function getCol(row,name){
  var target=String(name).toUpperCase().replace(/[\s_]/g,'');
  var keys=Object.keys(row);
  for(var i=0;i<keys.length;i++){
    if(String(keys[i]).toUpperCase().replace(/[\s_]/g,'')===target){
      var val=row[keys[i]];
      if(val===null||val===undefined)return '';
      if(val instanceof Date||typeof val==='number')return val;
      return ST(val);
    }
  }
  return '';
}

export function uniqueTickets(comp){var seen={},out=[];comp.forEach(function(r){var k=r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.prefijo+'|'+r.nro+'|'+r.letra+'|'+r.secuencia;if(!seen[k]){seen[k]=true;out.push(r);}});return out;}
export function groupSum(arr,key,fields){var m={};arr.forEach(function(r){var k=r[key]||'—';if(!m[k]){m[k]={_n:0};fields.forEach(function(f){m[k][f]=0;});}m[k]._n++;fields.forEach(function(f){m[k][f]+=(r[f]||0);});});return m;}

export function showToast(msg,type,duration){
  type=type||'info';duration=duration||3500;
  var c=document.getElementById('toast-container');
  if(!c) return;
  var t=document.createElement('div');
  t.className='toast '+type;t.innerHTML=msg;
  c.appendChild(t);
  setTimeout(function(){t.classList.add('hiding');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},260);},duration);
}

export function exportCSV(tableContainerId,filename){
  var container=document.getElementById(tableContainerId);
  if(!container)return;
  var table=container.querySelector('table');
  if(!table){showToast('No hay datos para exportar','info');return;}
  var csv=[],rows=table.querySelectorAll('tr');
  rows.forEach(function(row){
    var cols=row.querySelectorAll('th,td');
    var line=[];
    cols.forEach(function(col){
      var clone = col.cloneNode(true);
      var sortIcs = clone.querySelectorAll('.sort-ic');
      sortIcs.forEach(i => i.remove());
      var text=clone.textContent.replace(/"/g,'""').trim();
      line.push('"'+text+'"');
    });
    csv.push(line.join(','));
  });
  var blob=new Blob(['\uFEFF'+csv.join('\n')],{type:'text/csv;charset=utf-8;'});
  var link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=(filename||'export')+'_'+new Date().toISOString().slice(0,10)+'.csv';
  link.click();
  showToast('📥 CSV exportado: '+link.download,'success');
}
