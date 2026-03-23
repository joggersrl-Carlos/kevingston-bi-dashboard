import { pDate, pMoney, pNum, ST, getCol, vendCod, vendNombre, showToast } from './utils.js';
import { DB, SEEN, SUCURSALES, setLoaded, LOADED, addDBRecord } from './state.js';
import { saveAllData } from './storage.js';

export function makeKey(t,r){
  if(t==='comp') return r.sucursal+'|'+r.prefijo+'|'+r.nro+'|'+r.letra+'|'+r.secuencia+'|'+r.tipo_pago;
  if(t==='movp') return r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia+'|'+r.nro_comp+'|'+r.cod_prod+'|'+r.salida;
  if(t==='stock')return r.sucursal+'|'+r.cod_prod+'|'+r.nombre_prod+'|'+r.talle+'|'+r.color;
  if(t==='caja') return r.sucursal+'|'+r.anio+'|'+r.mes+'|'+r.dia;
  return Math.random().toString(36);
}

export function doParseComp(rows,suc){
  var out=[];
  rows.forEach(function(r){
    var fecha=pDate(getCol(r,'FECHA'));var imp=pMoney(getCol(r,'IMPORTE_TOTAL'));if(!fecha||!imp)return;
    var vRaw=getCol(r,'VENDEDOR');
    out.push({sucursal:suc,fecha:fecha,anio:fecha.getFullYear(),mes:fecha.getMonth()+1,dia:fecha.getDate(),dow:fecha.getDay(),
      nro:getCol(r,'NUMERO_COMPROBANTE')||getCol(r,'NUMERO'),prefijo:getCol(r,'PREFIJO'),letra:getCol(r,'LETRA'),
      tipo_comp:getCol(r,'DESCRIPCION_COMPROBANTE')||getCol(r,'ID_TIPO_COMPROBANTE'),
      cliente:getCol(r,'NOMBRE_CLIENTE')||'CONSUMIDOR FINAL',importe:imp,
      tipo_pago:getCol(r,'NOMBRE_PAGO')||getCol(r,'TIPO_PAGO'),
      vend_raw:vRaw,vend_cod:vendCod(vRaw),vend_nombre:vendNombre(vRaw),secuencia:getCol(r,'SECUENCIA')});
  });
  return out;
}

export function doParseMovp(rows,suc){
  var out=[];
  rows.forEach(function(r){
    var fecha=pDate(getCol(r,'FECHA'));if(!fecha)return;
    var vRaw=getCol(r,'VENDEDOR');
    out.push({sucursal:suc,fecha:fecha,anio:fecha.getFullYear(),mes:fecha.getMonth()+1,dia:fecha.getDate(),dow:fecha.getDay(),
      cod_prod:getCol(r,'CODIGO_PRODUCTO'),nro_comp:getCol(r,'NUMERO_COMPROBANTE'),
      desc_prod:getCol(r,'DESCRIPCION_PRODUCTO'),salida:pNum(getCol(r,'CANTIDAD_SALIDA')),
      entrada:pNum(getCol(r,'CANTIDAD_ENTRADA')),importe:pMoney(getCol(r,'IMPORTE_VALORIZACION')),
      vend_raw:vRaw,vend_cod:vendCod(vRaw),vend_nombre:vendNombre(vRaw),
      rubro:getCol(r,'RUBRO') || getCol(r,'NOMBRE_CLASIFICACION_2') || getCol(r,'FAMILIA'),
      subrubro:getCol(r,'SUBRUBRO') || getCol(r,'NOMBRE_CLASIFICACION_3') || getCol(r,'CLASIFICACION_3') || getCol(r,'SUBFAMILIA') || getCol(r,'NOMBRE_RUBRO'),
      talle:getCol(r,'CODIGO_TALLE'),color:getCol(r,'CODIGO_COLOR'),
      tipo_comp:getCol(r,'TIPO_COMPROBANTE')||getCol(r,'ID_TIPO_COMPROBANTE')||getCol(r,'TIPO'),
      concepto:getCol(r,'CONCEPTO')||getCol(r,'DESCRIPCION_MOVIMIENTO')});
  });
  return out;
}

export function doParseStock(rows,suc){
  var out=[];
  var colNombreRubro='', colNombreClas2='', colNombreClas1='';
  if(rows.length>0){
    Object.keys(rows[0]).forEach(function(k){
      var ku=k.toUpperCase().replace(/[^A-Z0-9]/g,'');
      if(ku.indexOf('SUBRUBRO')!==-1 || ku==='NOMBRERUBRO' || ku==='SUBFAMILIA' || ku.indexOf('CLASIFICACION3')!==-1) colNombreRubro=k;
      if(ku==='NOMBRECLASIFICACION2' || ku==='RUBRO' || ku==='FAMILIA' || ku==='CLASIFICACION2') colNombreClas2=k;
      if(ku==='NOMBRECLASIFICACION1' || ku==='GENERO' || ku==='CLASIFICACION1') colNombreClas1=k;
    });
  }
  var lastSubRubro='', lastRubroPadre='', lastClas1='';
  rows.forEach(function(r){
    var np=getCol(r,'NOMBRE_PRODUCTO'),cp=getCol(r,'CODIGO_PRODUCTO');
    if(!np&&!cp)return;

    var rawRubro = colNombreClas2 ? ST(r[colNombreClas2]||'') : (getCol(r,'NOMBRE_CLASIFICACION_2') || getCol(r,'RUBRO') || getCol(r,'FAMILIA'));
    if(rawRubro && rawRubro !== lastRubroPadre){ 
      lastRubroPadre = rawRubro; 
      lastSubRubro = ''; // Reset subrubro when parent changes
    }
    var rubro = lastRubroPadre || '—';

    var rawSub = colNombreRubro ? ST(r[colNombreRubro]||'') : (getCol(r,'NOMBRE_RUBRO') || getCol(r,'SUBRUBRO') || getCol(r,'NOMBRE_CLASIFICACION_3') || getCol(r,'CLASIFICACION_3'));
    if(rawSub) lastSubRubro = rawSub;
    var subrubro = lastSubRubro || '—';

    var rawClas1 = colNombreClas1 ? ST(r[colNombreClas1]||'') : getCol(r,'NOMBRE_CLASIFICACION_1');
    if(rawClas1) lastClas1 = rawClas1;
    var clas1 = lastClas1 || '—';

    out.push({sucursal:suc,
      nombre_rubro:rubro,
      nombre_subrubro:subrubro,
      cod_rubro:getCol(r,'RUBRO'),
      unidades:pNum(getCol(r,'UNIDADES_VENDIDAS')),
      imp_costo:pMoney(getCol(r,'IMPORTE_COSTO')),
      imp_venta:pMoney(getCol(r,'IMPORTE_VENTA')),
      stock:pNum(getCol(r,'STOCK')||'0'),
      cod_prod:cp,nombre_prod:np,
      talle:getCol(r,'CODIGO_TALLE'),color:getCol(r,'CODIGO_COLOR'),
      clas1:clas1,clas2:rubro});
  });
  return out;
}

export function doParseCaja(rows,suc){
  var out=[];
  rows.forEach(function(r){
    var fecha=pDate(getCol(r,'FECHA'));var v=pMoney(getCol(r,'VENTAS'));if(!fecha||!v)return;
    out.push({sucursal:suc,fecha:fecha,anio:fecha.getFullYear(),mes:fecha.getMonth()+1,dia:fecha.getDate(),
      ventas:v,gastos:pMoney(getCol(r,'GASTOS')),tarjetas:pMoney(getCol(r,'TARJETAS')),efectivo:pMoney(getCol(r,'EFECTIVO_TESORERIA'))});
  });
  return out;
}

export function handleFiles(ev, renderLoadedFn, buildFiltersFn, doRenderFn){
  var files=Array.from(ev.target.files);if(!files.length)return;
  var suc=document.getElementById('sucSelect').value,t=document.getElementById('tipoSelect').value;if(!suc)return;
  var total=files.length,done=0,added=0,failedFiles=[];
  files.forEach(function(file){
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb;
        if(file.name.toLowerCase().indexOf('.csv')!==-1)wb=window.XLSX.read(e.target.result,{type:'string',cellDates:true});
        else wb=window.XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var allRows=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
        var keyAlts={
          comp:['IMPORTETOTAL','IMPTOTAL','IMPORTECOMPROBANTE','TOTAL'],
          movp:['CANTIDADSALIDA','CANTSALIDA','CANTSAL'],
          stock:['UNIDADESVENDIDAS','UNIDVENDIDAS','UNDVENDIDAS','CANTVENDIDA','UNIVENDIDAS','STOCK','STOCKACTUAL','EXISTENCIA','SALDO','CODIGOPRODUCTO','NOMBREPRODUCTO','DESCRIPCIONPRODUCTO','IMPORTEVENTA','IMPORTECOSTO','CODIGOTALLE','CODIGOCOLOR'],
          caja:['VENTAS','VENTASTOTAL','TOTALVENTAS']
        };
        var keys=keyAlts[t],headerIdx=-1;
        for(var i=0;i<Math.min(25,allRows.length)&&headerIdx===-1;i++){
          var nonEmpty=allRows[i].filter(function(c){return c!==''&&c!==null&&c!==undefined;}).length;
          if(nonEmpty<3)continue;
          var normalized=allRows[i].map(function(c){return ST(String(c)).toUpperCase().replace(/[^A-Z0-9]/g,'');});
          for(var ki=0;ki<keys.length&&headerIdx===-1;ki++){
            if(normalized.indexOf(keys[ki])!==-1){headerIdx=i;break;}
          }
        }
        if(headerIdx!==-1){
          var rows=window.XLSX.utils.sheet_to_json(ws,{defval:'',raw:true,range:headerIdx});
          console.log('[KBI] Tipo:',t,'| Suc:',suc,'| Header fila:',headerIdx,'| Filas:',rows.length);
          var parsed=[];
          if(t==='comp') parsed=doParseComp(rows,suc);
          if(t==='movp') parsed=doParseMovp(rows,suc);
          if(t==='stock')parsed=doParseStock(rows,suc);
          if(t==='caja') parsed=doParseCaja(rows,suc);
          parsed.forEach(function(r){var k=makeKey(t,r);if(!SEEN[t][k]){addDBRecord(t, k, r);added++;}});
        } else {
          console.warn('[KBI] Header no encontrado para "'+t+'" — buscando:',keys.join(', '));
          failedFiles.push(file.name);
        }
      }catch(err){console.error(file.name,err);failedFiles.push(file.name);}
      done++;
      if(done===total){
        if(added>0){
          var TN={comp:'Comprobantes',movp:'Mov. Productos',stock:'Stock',caja:'Caja'};
          let newLoaded = [...LOADED, {id:'l'+Date.now(),suc:suc,type:t,typeName:TN[t],files:total,n:added}];
          setLoaded(newLoaded);
          renderLoadedFn();buildFiltersFn();doRenderFn();
          saveAllData(); // Guardar en IndexedDB
          document.getElementById('config-body').classList.remove('open');document.getElementById('config-arrow').classList.remove('open');
          showToast('✅ '+added+' registros cargados y guardados','success');
        }
        if(failedFiles.length){
          showToast('⚠️ Formato no reconocido en: '+failedFiles.join(', ')+'. Verificá que el tipo de archivo seleccionado sea el correcto.','error',6000);
        }
      }
    };
    if(file.name.toLowerCase().indexOf('.csv')!==-1)reader.readAsText(file,'UTF-8');else reader.readAsArrayBuffer(file);
  });
}
