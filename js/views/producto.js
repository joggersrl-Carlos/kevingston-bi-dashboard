import { emptyMsg, fn, fm, groupSum, exportCSV, PALETTE } from '../utils.js';
import { fStock, fMovp, fMovpBySuc, ALL_PROD_ROWS, ALL_PROD_PESOS_ROWS, setAllProdRows, setAllProdPesosRows } from '../state.js';
import { buildTable, mkTH, mkTD } from './tables.js';

export function filterProductos(){
  var q=(document.getElementById('prodSearch').value||'').toLowerCase().trim();
  var filtered=q?ALL_PROD_ROWS.filter(function(r){return r.cod.toLowerCase().indexOf(q)!==-1||r.nombre.toLowerCase().indexOf(q)!==-1;}):ALL_PROD_ROWS;
  renderProdTable(filtered);
}
export function renderProdTable(rows){
  if(!rows.length){document.getElementById('tbl-producto').innerHTML=emptyMsg('Sin resultados');return;}
  var tV=rows.reduce(function(a,r){return a+r.uni;},0),tS=rows.reduce(function(a,r){return a+r.stk;},0);
  document.getElementById('tbl-producto').innerHTML=buildTable(
    [mkTH('Cód',false,'c'),mkTH('Producto',false,'n'),mkTH('Venta',true,'v'),mkTH('Stock',true,'s')],
    rows.map(function(r){return[
      mkTD(r.cod||'—', false, r.cod),
      mkTD(r.nombre, false, r.nombre),
      mkTD(fn(r.uni),true, r.uni),
      mkTD(fn(r.stk),true, r.stk)
    ];}),
    rows.length>1?['','Total',mkTD(fn(tV),true),mkTD(fn(tS),true)]:null,
    'tbl-producto'
  );
}

export function filterProductosPesos(){
  var q=(document.getElementById('prodSearchPesos').value||'').toLowerCase().trim();
  var filtered=q?ALL_PROD_PESOS_ROWS.filter(function(r){return r.cod.toLowerCase().indexOf(q)!==-1||r.nombre.toLowerCase().indexOf(q)!==-1;}):ALL_PROD_PESOS_ROWS;
  renderProdTablePesos(filtered);
}
export function renderProdTablePesos(rows){
  if(!rows.length){document.getElementById('tbl-producto-pesos').innerHTML=emptyMsg('Sin resultados');return;}
  var tV=rows.reduce(function(a,r){return a+r.imp;},0);
  document.getElementById('tbl-producto-pesos').innerHTML=buildTable(
    [mkTH('Cód',false,'c'),mkTH('Producto',false,'n'),mkTH('$ Venta',true,'v')],
    rows.map(function(r){return[
      mkTD(r.cod||'—', false, r.cod),
      mkTD(r.nombre, false, r.nombre),
      mkTD(fm(r.imp),true, r.imp)
    ];}),
    rows.length>1?['','Total',mkTD(fm(tV),true)]:null,
    'tbl-producto-pesos'
  );
}

export function renderProd(){
  var stockF=fStock();
  var movpF=fMovp();
  var movpBySuc=fMovpBySuc();

  if(!stockF.length&&!movpBySuc.length){
    document.getElementById('gender-block').innerHTML='';
    document.getElementById('prod-kpi-strip').innerHTML='';
    document.getElementById('tbl-rubro').innerHTML=emptyMsg('Cargá archivos');
    document.getElementById('tbl-subrubro').innerHTML='';
    document.getElementById('tbl-producto').innerHTML='';
    document.getElementById('sbar-legend').innerHTML='';
    document.getElementById('sbar-content').innerHTML='';
    document.getElementById('tbl-annual').innerHTML='';
    setAllProdRows([]);
    return;
  }

  var tVenta=0;movpF.forEach(function(r){tVenta+=r.salida;});
  var tStock=0;stockF.forEach(function(r){tStock+=r.stock;});
  document.getElementById('prod-kpi-strip').innerHTML=
    '<div class="pkpi"><div class="pkpi-val">'+fn(tVenta)+'</div><div class="pkpi-label">Venta</div></div>'+
    '<div class="pkpi"><div class="pkpi-val">'+fn(tStock)+'</div><div class="pkpi-label">Stock</div></div>';

  var genM={};
  var stockClas1={};stockF.forEach(function(r){if(r.cod_prod&&r.clas1)stockClas1[r.cod_prod]=r.clas1;});
  movpF.forEach(function(r){
    var g=stockClas1[r.cod_prod]||'—';
    if(g&&g!=='—')genM[g]=(genM[g]||0)+r.salida;
  });
  if(!Object.keys(genM).length){
    stockF.forEach(function(r){var g=r.clas1||'—';if(g&&g!=='—')genM[g]=(genM[g]||0)+r.unidades;});
  }
  var tGenTotal=Object.keys(genM).reduce(function(a,k){return a+genM[k];},0)||tVenta;
  var genH='';
  var chartGenderData=[];
  Object.keys(genM).sort(function(a,b){return genM[b]-genM[a];}).forEach(function(g){
    chartGenderData.push({name:g,value:genM[g]});
  });
  
  if(chartGenderData.length){
    document.getElementById('chart-gender').style.display='block';
    if(!window.chartGender) window.chartGender=window.echarts.init(document.getElementById('chart-gender'));
    window.chartGender.setOption({
      tooltip:{trigger:'item',formatter:'<b>{b}</b><br/>{c} un. ({d}%)'},
      legend:{show:false},
      color:['#c9a96e','#5a9fd4','#e07b9a','#52c48a'],
      series:[{
        name:'Género',type:'pie',radius:['50%','75%'],avoidLabelOverlap:false,
        itemStyle:{borderColor:'#2a2a2a',borderWidth:2},
        label:{show:true,position:'center',formatter:function(){return fn(tGenTotal)+'\nUnidades';},fontSize:14,fontWeight:'bold',color:'#f0ede8'},
        emphasis:{label:{show:true,fontSize:14,fontWeight:'bold'}},
        labelLine:{show:false},
        data:chartGenderData
      }]
    });
  } else {
    document.getElementById('chart-gender').style.display='none';
  }
  document.getElementById('gender-block').innerHTML=genH;

  var stockRubroMap={};stockF.forEach(function(r){if(r.cod_prod&&r.nombre_rubro)stockRubroMap[r.cod_prod]=r.nombre_rubro;});
  var rubroVenta={},rubroStock={};
  movpF.forEach(function(r){
    var rb=stockRubroMap[r.cod_prod]||'—';
    if(!rubroVenta[rb])rubroVenta[rb]=0;
    rubroVenta[rb]+=r.salida;
  });
  stockF.forEach(function(r){
    var rb=r.nombre_rubro||'—';
    if(!rubroStock[rb])rubroStock[rb]=0;
    rubroStock[rb]+=r.stock;
  });
  var allRubros={};Object.keys(rubroVenta).forEach(function(k){allRubros[k]=1;});Object.keys(rubroStock).forEach(function(k){allRubros[k]=1;});
  var rubroList=Object.keys(allRubros).filter(function(k){return k&&k!=='—'&&k!=='';}).map(function(k){return{k:k,u:rubroVenta[k]||0,s:rubroStock[k]||0};}).sort(function(a,b){return b.u-a.u;});
  
  if(rubroList.length){
    document.getElementById('chart-rubro').style.display='block';
    if(!window.chartRubro) window.chartRubro=window.echarts.init(document.getElementById('chart-rubro'));
    window.chartRubro.setOption({
      tooltip:{trigger:'item',formatter:'<b>{b}</b><br/>Venta: {c} un. ({d}%)'},
      legend:{type:'scroll',orient:'vertical',right:0,top:'middle',textStyle:{color:'#8a8680',fontSize:10},pageTextStyle:{color:'#8a8680'}},
      color:PALETTE,
      series:[{
        name:'Rubro',type:'pie',radius:['40%','70%'],center:['40%','50%'],
        itemStyle:{borderColor:'#2a2a2a',borderWidth:2},
        label:{show:false},
        data:rubroList.map(function(r){return{name:r.k,value:r.u};}).filter(function(d){return d.value>0;})
      }]
    });
  } else {
    document.getElementById('chart-rubro').style.display='none';
  }

  document.getElementById('tbl-rubro').innerHTML=buildTable(
    [mkTH('Rubro',false,'k'),mkTH('Venta',true,'u'),mkTH('Stock',true,'s')],
    rubroList.map(function(r){return[
      mkTD(r.k, false, r.k),
      mkTD(fn(r.u),true, r.u),
      mkTD(fn(r.s),true, r.s)
    ];}),
    ['Total',mkTD(fn(tVenta),true),mkTD(fn(tStock),true)],
    'tbl-rubro'
  );

  var stockSubRubroMap={};stockF.forEach(function(r){if(r.cod_prod&&r.nombre_subrubro)stockSubRubroMap[r.cod_prod]=r.nombre_subrubro;});
  var subVenta={},subStock={};
  movpF.forEach(function(r){
    var sb=stockSubRubroMap[r.cod_prod]||'—';
    if(!subVenta[sb])subVenta[sb]=0;
    subVenta[sb]+=r.salida;
  });
  stockF.forEach(function(r){
    var sb=r.nombre_subrubro||'—';
    if(!subStock[sb])subStock[sb]=0;
    subStock[sb]+=r.stock;
  });
  var allSubs={};Object.keys(subVenta).forEach(function(k){allSubs[k]=1;});Object.keys(subStock).forEach(function(k){allSubs[k]=1;});
  var subKeys=Object.keys(allSubs).filter(function(k){return k&&k!=='—'&&k!=='';});
  if(subKeys.length){
    var tSV=subKeys.reduce(function(a,k){return a+(subVenta[k]||0);},0);
    var tSS=subKeys.reduce(function(a,k){return a+(subStock[k]||0);},0);
    document.getElementById('tbl-subrubro').innerHTML=buildTable(
      [mkTH('Sub-Rubro',false,'k'),mkTH('Venta',true,'u'),mkTH('Stock',true,'s')],
      subKeys.map(function(k){return{k:k,u:subVenta[k]||0,s:subStock[k]||0};}).sort(function(a,b){return b.u-a.u;}).map(function(r){return[
        mkTD(r.k, false, r.k),
        mkTD(fn(r.u),true, r.u),
        mkTD(fn(r.s),true, r.s)
      ];}),
      ['Total',mkTD(fn(tSV),true),mkTD(fn(tSS),true)],
      'tbl-subrubro'
    );
  } else {
    var subMapStock=groupSum(stockF,'nombre_subrubro',['unidades','stock']);
    var subKeysStock=Object.keys(subMapStock).filter(function(k){return k&&k!=='—'&&k!=='';});
    if(subKeysStock.length){
      var tSV2=0,tSS2=0;subKeysStock.forEach(function(k){tSV2+=subMapStock[k].unidades;tSS2+=subMapStock[k].stock;});
      document.getElementById('tbl-subrubro').innerHTML=buildTable(
        [mkTH('Sub-Rubro',false,'k'),mkTH('Venta',true,'u'),mkTH('Stock',true,'s')],
        subKeysStock.map(function(k){return{k:k,u:subMapStock[k].unidades,s:subMapStock[k].stock};}).sort(function(a,b){return b.u-a.u;}).map(function(r){return[
          mkTD(r.k, false, r.k),
          mkTD(fn(r.u),true, r.u),
          mkTD(fn(r.s),true, r.s)
        ];}),
        ['Total',mkTD(fn(tSV2),true),mkTD(fn(tSS2),true)],
        'tbl-subrubro'
      );
    } else {
      document.getElementById('tbl-subrubro').innerHTML='<div style="padding:12px;font-size:11px;color:var(--muted)">Columna NOMBRE_RUBRO no encontrada en el archivo de Stock.</div>';
    }
  }

  var prodVenta={},prodStock={},prodCod={};
  movpF.forEach(function(r){if(!prodVenta[r.cod_prod])prodVenta[r.cod_prod]=0;prodVenta[r.cod_prod]+=r.salida;});
  stockF.forEach(function(r){
    if(!prodStock[r.cod_prod])prodStock[r.cod_prod]=0;
    prodStock[r.cod_prod]+=r.stock;
    prodCod[r.cod_prod]=r.nombre_prod;
  });
  var allProds={};Object.keys(prodVenta).forEach(function(k){allProds[k]=1;});Object.keys(prodStock).forEach(function(k){allProds[k]=1;});
  let pr = Object.keys(allProds).filter(function(k){return k&&k!=='—'&&k!=='';}).map(function(k){
    return{cod:k,nombre:prodCod[k]||k,uni:prodVenta[k]||0,stk:prodStock[k]||0};
  }).sort(function(a,b){return b.uni-a.uni;});
  setAllProdRows(pr);
  if(document.getElementById('prodSearch'))document.getElementById('prodSearch').value='';
  renderProdTable(pr);

  var prodPesos={};
  movpF.forEach(function(r){if(!prodPesos[r.cod_prod])prodPesos[r.cod_prod]=0;prodPesos[r.cod_prod]+=r.importe;});
  let prP = Object.keys(prodPesos).filter(function(k){return k&&k!=='—'&&k!=='';}).map(function(k){
    return{cod:k,nombre:prodCod[k]||k,imp:prodPesos[k]||0};
  }).sort(function(a,b){return b.imp-a.imp;});
  setAllProdPesosRows(prP);
  if(document.getElementById('prodSearchPesos'))document.getElementById('prodSearchPesos').value='';
  renderProdTablePesos(prP);

  var top=rubroList.slice(0,10);
  var tV2=tVenta||1;
  var rubroImpVenta={};
  stockF.forEach(function(r){
    var rb=r.nombre_rubro||'—';
    if(!rubroImpVenta[rb])rubroImpVenta[rb]=0;
    rubroImpVenta[rb]+=r.imp_venta;
  });
  var tIV=stockF.reduce(function(a,r){return a+r.imp_venta;},0)||1;
  document.getElementById('sbar-legend').innerHTML=top.map(function(r,i){return'<div class="sleg"><div class="sleg-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></div>'+r.k+'</div>';}).join('');
  var sbH='<div class="sbar-row2"><div class="sbar-metric" style="color:var(--gold2)">Unidades</div><div class="sbar-track">';
  top.forEach(function(r,i){var pct=tV2>0?(r.u/tV2*100):0;var lbl=pct>6?pct.toFixed(0)+'%':'';sbH+='<div class="sbar-seg" style="width:'+pct.toFixed(2)+'%;background:'+PALETTE[i%PALETTE.length]+'" title="'+r.k+': '+fn(r.u)+' ('+pct.toFixed(1)+'%)">'+lbl+'</div>';});
  var rU=tV2-top.reduce(function(a,r){return a+r.u;},0);if(rU>0&&tV2>0)sbH+='<div class="sbar-seg" style="width:'+(rU/tV2*100).toFixed(2)+'%;background:#3a3a3a"></div>';
  sbH+='</div><div class="sbar-total">'+fn(tV2)+' un.</div></div>';
  sbH+='<div class="sbar-row2" style="margin-top:6px"><div class="sbar-metric" style="color:var(--blue)">$ Pesos</div><div class="sbar-track">';
  top.forEach(function(r,i){
    var impRubro=rubroImpVenta[r.k]||0;
    var pct=tIV>0?(impRubro/tIV*100):0;
    var lbl=pct>6?pct.toFixed(0)+'%':'';
    sbH+='<div class="sbar-seg" style="width:'+pct.toFixed(2)+'%;background:'+PALETTE[i%PALETTE.length]+';opacity:.75" title="'+r.k+': '+fm(impRubro)+' ('+pct.toFixed(1)+'%)">'+lbl+'</div>';
  });
  var rP=tIV-top.reduce(function(a,r){return a+(rubroImpVenta[r.k]||0);},0);if(rP>0&&tIV>0)sbH+='<div class="sbar-seg" style="width:'+(rP/tIV*100).toFixed(2)+'%;background:#3a3a3a"></div>';
  sbH+='</div><div class="sbar-total">'+fm(tIV)+'</div></div>';
  document.getElementById('sbar-content').innerHTML=sbH;

  var MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var añosSet={};movpBySuc.forEach(function(r){if(r.anio)añosSet[r.anio]=1;});var años=Object.keys(añosSet).map(Number).sort();
  if(!años.length){document.getElementById('tbl-annual').innerHTML='<div style="padding:8px;color:var(--muted);font-size:11px">Cargá Mov. Productos para la tabla anual</div>';return;}
  document.getElementById('tbl-annual').innerHTML=buildTable(
    [mkTH('Año',false,'a')].concat(MESES.map(function(m, i){return mkTH(m,true, 'm'+i);})).concat([mkTH('Total',true,'t')]),
    años.map(function(yr){
      var yrR=movpBySuc.filter(function(r){return r.anio===yr;});
      var meses=MESES.map(function(_,i){var v=0;yrR.forEach(function(r){if(r.mes===i+1)v+=r.salida;});return v>0?mkTD(fn(v),true, v):mkTD('',true, 0);});
      var tot=0;yrR.forEach(function(r){tot+=r.salida;});
      return [mkTD(yr, false, yr)].concat(meses).concat([mkTD(fn(tot),true, tot)]);
    }),
    null,
    'tbl-annual'
  );
}
