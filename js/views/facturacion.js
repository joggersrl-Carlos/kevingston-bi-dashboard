import { emptyMsg, fm, fn, fd, groupSum, uniqueTickets, DOW_SHORT, MESES_NOMBRE } from '../utils.js';
import { fComp, fMovp, SUCURSALES, getC } from '../state.js';
import { buildTable, mkTH, mkTD } from '../components/tables.js';

export function renderMensualFact(tkts, movp) {
  var mesF={};
  tkts.forEach(function(r){
    var k=String(r.mes);
    mesF[k]=(mesF[k]||0)+r.importe;
  });

  var listFact=Object.keys(mesF).map(function(k){
    return{mes:parseInt(k),imp:mesF[k]};
  }).sort(function(a,b){return b.imp-a.imp;});

  var tF=listFact.reduce(function(a,r){return a+r.imp;},0);
  if(listFact.length){
    // YoY/MoM can be inferred if we have multiple months, since we sort by desc imp, let's sort by month asc to calculate MoM
    let listTemporal = [...listFact].sort((a,b)=>a.mes - b.mes);
    let momMap = {};
    for (let i = 1; i < listTemporal.length; i++) {
        let prev = listTemporal[i-1].imp;
        let act = listTemporal[i].imp;
        if(prev > 0) momMap[listTemporal[i].mes] = ((act/prev) - 1) * 100;
    }

    document.getElementById('tbl-mes-fact').innerHTML=buildTable(
      [mkTH('#',true),mkTH('Mes'),mkTH('Facturación',true),mkTH('% del Total',true), mkTH('MoM',true)],
      listFact.map(function(r,i){
        var pct=tF>0?(r.imp/tF*100):0;
        let momHit = momMap[r.mes];
        let momCell = '';
        if(momHit !== undefined) {
             let clr = momHit > 0 ? 'var(--green)' : (momHit < 0 ? 'var(--red)' : '');
             let arrow = momHit > 0 ? '▲' : (momHit < 0 ? '▼' : '');
             momCell = `<span style="color:${clr};font-size:11px">${arrow} ${Math.abs(momHit).toFixed(1)}%</span>`;
        }
        return[
          mkTD(String(i+1),true, i+1),
          mkTD(MESES_NOMBRE[r.mes-1]||String(r.mes),false, r.mes),
          mkTD(fm(r.imp),true, r.imp),
          mkTD(pct.toFixed(1)+'%',true, pct),
          mkTD(momCell,true, momHit || 0)
        ];
      }),
      ['','Total',mkTD(fm(tF),true),mkTD('100%',true), ''],
      'tbl-mes-fact'
    );
  } else {
    document.getElementById('tbl-mes-fact').innerHTML=emptyMsg('Sin datos');
  }
}

export function renderMensualUni(tkts, movp) {
  var mesU={};
  movp.forEach(function(r){
    var k=String(r.mes);
    mesU[k]=(mesU[k]||0)+r.salida;
  });

  var listUni=Object.keys(mesU).map(function(k){
    return{mes:parseInt(k),uni:mesU[k]};
  }).sort(function(a,b){return b.uni-a.uni;});

  var tU=listUni.reduce(function(a,r){return a+r.uni;},0);
  if(listUni.length){
    let listTemporal = [...listUni].sort((a,b)=>a.mes - b.mes);
    let momMap = {};
    for (let i = 1; i < listTemporal.length; i++) {
        let prev = listTemporal[i-1].uni;
        let act = listTemporal[i].uni;
        if(prev > 0) momMap[listTemporal[i].mes] = ((act/prev) - 1) * 100;
    }

    document.getElementById('tbl-mes-uni').innerHTML=buildTable(
      [mkTH('#',true),mkTH('Mes'),mkTH('Unidades',true),mkTH('% del Total',true), mkTH('MoM', true)],
      listUni.map(function(r,i){
        var pct=tU>0?(r.uni/tU*100):0;
        let momHit = momMap[r.mes];
        let momCell = '';
        if(momHit !== undefined) {
             let clr = momHit > 0 ? 'var(--green)' : (momHit < 0 ? 'var(--red)' : '');
             let arrow = momHit > 0 ? '▲' : (momHit < 0 ? '▼' : '');
             momCell = `<span style="color:${clr};font-size:11px">${arrow} ${Math.abs(momHit).toFixed(1)}%</span>`;
        }
        return[
          mkTD(String(i+1),true, i+1),
          mkTD(MESES_NOMBRE[r.mes-1]||String(r.mes), false, r.mes),
          mkTD(fn(r.uni),true, r.uni),
          mkTD(pct.toFixed(1)+'%',true, pct),
          mkTD(momCell, true, momHit || 0)
        ];
      }),
      ['','Total',mkTD(fn(tU),true),mkTD('100%',true), ''],
      'tbl-mes-uni'
    );
  } else {
    document.getElementById('tbl-mes-uni').innerHTML=emptyMsg('Sin datos');
  }
}

export function renderDowRanking(tkts,movp){
  var dd={};for(var d=0;d<7;d++)dd[d]={imp:0,tkt:0,uni:0,dias:{}};
  tkts.forEach(function(r){if(r.dow==null)return;dd[r.dow].imp+=r.importe;dd[r.dow].tkt++;dd[r.dow].dias[r.anio+'-'+r.mes+'-'+r.dia]=true;});
  movp.forEach(function(r){if(r.dow!=null)dd[r.dow].uni+=r.salida;});
  var list=[];for(var d=0;d<7;d++){if(dd[d].imp>0){var nd=Math.max(1,Object.keys(dd[d].dias).length);list.push({short:DOW_SHORT[d],imp:dd[d].imp,uni:dd[d].uni,pImp:dd[d].imp/nd,pTkt:dd[d].tkt/nd});}}
  list.sort(function(a,b){return b.imp-a.imp;});
  if(!list.length){document.getElementById('dow-ranking').innerHTML='<div style="padding:10px;font-size:11px;color:var(--muted);text-align:center">Sin datos</div>';return;}
  var mI=list[0].imp,mU=Math.max.apply(null,list.map(function(r){return r.uni;}));
  var RC=['#c9a96e','#aaaaaa','#c97744','#5a9fd4','#52c48a','#9b7fd4','#e07b9a'];
  var html='';
  list.forEach(function(r,i){
    var cls=i===0?'r1':i===1?'r2':i===2?'r3':'';
    var pI=mI>0?(r.imp/mI*100):0,pU=mU>0?(r.uni/mU*100):0,col=RC[i]||'var(--muted)';
    html+='<div class="dow-row"><div class="dow-rank '+cls+'">'+(i+1)+'</div><div class="dow-name" style="color:'+col+'">'+r.short+'</div><div class="dow-bars">';
    html+='<div class="dow-bar-wrap"><div class="dow-bar-lbl">$</div><div class="dow-bar-bg"><div class="dow-bar-fill" style="width:'+pI.toFixed(1)+'%;background:'+col+'"></div></div><div class="dow-bar-val">'+fm(r.imp)+'</div></div>';
    html+='<div class="dow-bar-wrap"><div class="dow-bar-lbl">U</div><div class="dow-bar-bg"><div class="dow-bar-fill" style="width:'+pU.toFixed(1)+'%;background:'+col+';opacity:.6"></div></div><div class="dow-bar-val">'+fn(r.uni)+' un.</div></div>';
    html+='<div style="font-size:9px;color:var(--muted);margin-top:1px">Prom/día: '+fm(r.pImp)+' · '+Math.round(r.pTkt)+' tkts</div>';
    html+='</div></div>';
  });
  document.getElementById('dow-ranking').innerHTML=html;
}

export function renderFact(){
  var comp=fComp(),movp=fMovp();
  if(!comp.length&&!movp.length){
    document.getElementById('kpi-fact').innerHTML=emptyMsg('Configurá las sucursales y cargá los archivos');
    document.getElementById('tbl-suc').innerHTML='';
    document.getElementById('tbl-diaria').innerHTML='';
    document.getElementById('dow-ranking').innerHTML='';
    return;
  }
  var tkts=uniqueTickets(comp);
  var tF=0;tkts.forEach(function(r){tF+=r.importe;});
  var tT=tkts.length,tU=0;movp.forEach(function(r){tU+=r.salida;});
  var tP=tT>0?tF/tT:0,cxt=tT>0?tU/tT:0;
  
  const mkKpi = (l,v,cls) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-val ${cls||''}">${v}</div></div>`;
  
  document.getElementById('kpi-fact').innerHTML=mkKpi('Facturación Total',fm(tF))+mkKpi('Unidades',fn(tU))+mkKpi('Tickets',fn(tT))+mkKpi('Cantidad x Ticket',fd(cxt))+mkKpi('Ticket Promedio',fm(tP),'gold')+mkKpi('Costo x Unidad',tU>0?fm(tF/tU):'-','gold');
  
  var sM=groupSum(tkts,'sucursal',['importe']),sU2=groupSum(movp,'sucursal',['salida']),cSel=getC();
  var sRows=SUCURSALES.filter(function(s){return sM[s]||sU2[s];}).map(function(s){var imp=sM[s]?sM[s].importe:0,u=sU2[s]?sU2[s].salida:0,t=0;tkts.forEach(function(r){if(r.sucursal===s)t++;});return{k:s,i:imp,u:u,t:t};}).sort(function(a,b){return b.i-a.i;});
  var hlIdx=undefined;if(cSel)for(var i=0;i<sRows.length;i++)if(sRows[i].k===cSel){hlIdx=i;break;}
  
  document.getElementById('tbl-suc').innerHTML=buildTable(
    [mkTH('Sucursal',false,'k'),mkTH('Fact',true,'i'),mkTH('Unidades',true,'u'),mkTH('Tkt',true,'t'),mkTH('Cant/Tkt',true,'cxt'),mkTH('Tkt Prom',true,'tp')],
    sRows.map(function(r){return[
        mkTD(r.k, false, r.k),
        mkTD(fm(r.i),true, r.i),
        mkTD(fn(r.u),true, r.u),
        mkTD(fn(r.t),true, r.t),
        mkTD(r.t>0?fd(r.u/r.t):'-',true, r.t>0?r.u/r.t:0),
        mkTD(r.t>0?fm(r.i/r.t):'-',true, r.t>0?r.i/r.t:0)
    ];}),
    ['Total',mkTD(fm(tF),true),mkTD(fn(tU),true),mkTD(fn(tT),true),mkTD(fd(cxt),true),mkTD(fm(tP),true)],
    'tbl-suc'
  );
  if(hlIdx!==undefined){var trs=document.getElementById('tbl-suc').querySelectorAll('tbody tr');if(trs[hlIdx])trs[hlIdx].className='hl';}
  var DN=['dom','lun','mar','mié','jue','vie','sáb'],dM={};
  tkts.forEach(function(r){var k=r.anio+'-'+r.mes+'-'+r.dia;if(!dM[k])dM[k]={anio:r.anio,mes:r.mes,dia:r.dia,dow:r.fecha?DN[r.fecha.getDay()]:'',imp:0,tkt:0};dM[k].imp+=r.importe;dM[k].tkt++;});
  var uD={};movp.forEach(function(r){var k=r.anio+'-'+r.mes+'-'+r.dia;uD[k]=(uD[k]||0)+r.salida;});
  var dK=Object.keys(dM).sort(function(a,b){var pa=a.split('-'),pb=b.split('-');return(+pa[0]-+pb[0])||(+pa[1]-+pb[1])||(+pa[2]-+pb[2]);});
  
  if(dK.length){
    document.getElementById('chart-diaria').style.display='block';
    if(!window.chartDiaria) window.chartDiaria = window.echarts.init(document.getElementById('chart-diaria'));
    var cX=[], cF=[], cU=[];
    dK.forEach(function(k){
      var v=dM[k];
      cX.push(v.dia+'/'+v.mes);
      cF.push(Math.round(v.imp));
      cU.push(uD[k]||0);
    });
    window.chartDiaria.setOption({
      tooltip:{trigger:'axis',axisPointer:{type:'cross'},formatter:function(p){
        var h='<b>'+p[0].axisValue+'</b><br/>';
        p.forEach(function(s){
          if(s.seriesName==='Facturación') h+=s.marker+' Facturación: <b>$ '+s.value.toLocaleString('es-AR')+'</b><br/>';
          else h+=s.marker+' Unidades: <b>'+s.value.toLocaleString('es-AR')+'</b><br/>';
        });return h;
      }},
      legend:{data:['Facturación','Unidades'],textStyle:{color:'#f0ede8'},bottom:0},
      grid:{left:'3%',right:'4%',bottom:'15%',top:'12%',containLabel:true},
      xAxis:[{type:'category',data:cX,axisLabel:{color:'#8a8680'}}],
      yAxis:[
        {type:'value',name:'$',nameTextStyle:{color:'#c9a96e'},axisLabel:{color:'#8a8680',formatter:function(v){return'$ '+(v>=1000?(v/1000).toFixed(0)+'k':v);}},splitLine:{lineStyle:{color:'rgba(255,255,255,0.05)'}}},
        {type:'value',name:'Unidades',nameTextStyle:{color:'#52c48a'},axisLabel:{color:'#8a8680'},splitLine:{show:false}}
      ],
      series:[
        {name:'Facturación',type:'line',smooth:true,yAxisIndex:0,data:cF,itemStyle:{color:'#c9a96e'},areaStyle:{color:new window.echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(201,169,110,0.5)'},{offset:1,color:'rgba(201,169,110,0.0)'}])}},
        {name:'Unidades',type:'line',smooth:true,yAxisIndex:1,data:cU,itemStyle:{color:'#52c48a'}}
      ]
    });
  } else {
    document.getElementById('chart-diaria').style.display='none';
  }

  // To allow sorting by actual date, convert dK string back to Date or Unix for raw value
  document.getElementById('tbl-diaria').innerHTML=buildTable(
    [mkTH('Fecha',false,'f'),mkTH('Fact',true,'i'),mkTH('Unidades',true,'u'),mkTH('Tkt',true,'t')],
    dK.map(function(k){
        var v=dM[k];
        return[
            mkTD(v.dow+' '+v.dia+'/'+v.mes, false, new Date(v.anio, v.mes-1, v.dia).getTime()),
            mkTD(fm(v.imp),true, v.imp),
            mkTD(fn(uD[k]||0),true, uD[k]||0),
            mkTD(fn(v.tkt),true, v.tkt)
        ];
    }),
    ['Total',mkTD(fm(tF),true),mkTD(fn(tU),true),mkTD(fn(tT),true)],
    'tbl-diaria'
  );
  renderDowRanking(tkts,movp);
  renderMensualFact(tkts,movp);
  renderMensualUni(tkts,movp);
}
