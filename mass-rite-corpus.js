'use strict';
// Corpus Christi procession after Mass (Order of Eucharistic Processions, HCWEOM 101-108).
// Route, canopy, lights, incense and stations are illustrative local customs, not universal requirements.
const CORPUS_PROCESSION_ROLES={priest:['P','S','X','C1','T','PEW']};
const CORPUS_ALTAR=[500,160],CORPUS_TABERNACLE=[137,85];
const CORPUS_START={P:CORPUS_ALTAR,S:[522,190],X:[500,220],C1:[476,190],C2:[524,220],T:[500,250]};
const CORPUS_ROUTE=[
  [500,820],[500,900],[560,980],[650,1080],[650,1180],[575,1240],[500,1270],
  [425,1240],[350,1180],[350,1080],[425,1000],[500,930],[500,820]
];
const CORPUS_STATIONS=[
  {id:'first',routeIndex:3,at:[650,1080],title:'First outdoor station'},
  {id:'second',routeIndex:6,at:[500,1270],title:'Second outdoor station'},
  {id:'third',routeIndex:9,at:[350,1080],title:'Third outdoor station'}
];
const CORPUS_OFFSETS={P:[0,0],S:[22,30],X:[0,60],C1:[-24,30],C2:[24,60],T:[0,90]};
function corpusMove(role,points,a=.05,b=.95){
  const [dx,dy]=CORPUS_OFFSETS[role]||[0,0];
  return M(points.map(([x,y])=>[x+dx,y+dy]),a,b);
}
function corpusProcessionStep(title,points,team,withIncense,ref='HCWEOM 104; local custom'){
  const mv={P:corpusMove('P',points)};
  for(const role of team)mv[role]=corpusMove(role,points);
  return {part:'Procession',title,dur:18,posture:'stand',ref,
    text:'After Mass, the Priest carries the Blessed Sacrament in the monstrance. This scenario begins as the procession sets out; the Mass itself is not depicted. The route follows local direction. The canopy, lights and incense are shown only as local customs.',
    mv,props:{monstrance:[{hide:false,t:.05},{by:'P',t:.05}],lunette:[{hide:false,t:.05},{by:'P',t:.05}]},say:[['ppl','♪ Eucharistic hymn or prayer ♪',.08,.96]],
    smoke:withIncense&&team.includes('T')?[['T',.08,.96]]:[]};
}
function corpusStationStep(station,team){
  const stay={P:station.at};
  for(const role of team)stay[role]=[station.at[0]+(CORPUS_OFFSETS[role]?.[0]||0),station.at[1]+(CORPUS_OFFSETS[role]?.[1]||0)];
  const face=Object.fromEntries(Object.keys(stay).map(role=>[role,[[station.at,0,1]]]));
  return {part:'Procession',title:station.title,dur:12,posture:[['stand',0],['kneel',.3],['stand',.8]],
    ref:'HCWEOM 104; local custom (stations are not required)',
    text:'The procession pauses for prayer and a silent Eucharistic blessing at this customary station. This local-custom stop is illustrative and may be omitted.',
    mv:Object.fromEntries(Object.entries(stay).map(([role,at])=>[role,M([at],0,1)])),face,
    acts:{P:[['prays before the Blessed Sacrament',.2,.38],['blesses the faithful with the monstrance in silence',.42,.8]]},
    props:{monstrance:[{by:'P',t:0}]},blessWith:[[.42,.8]],veil:{P:[[.4,.82]]},
    say:[['ppl','(prayer and silence at the station)',.2,.8]]};
}
function corpusProcessionSteps(requested,team){
  const steps=[],add=(id,step)=>steps.push({...step,key:'corpus:'+id});
  const altar=CORPUS_ALTAR,tab=CORPUS_TABERNACLE;
  const route=[CORPUS_ALTAR,...CORPUS_ROUTE];
  const teamList=['S','X','C1','C2','T'].filter(role=>team.includes(role));
  let previousIndex=0;
  CORPUS_STATIONS.forEach((station,index)=>{
    const routeIndex=station.routeIndex+1;
    add('route'+(index+1),corpusProcessionStep(index===0?'The procession sets out':'Continue the procession',route.slice(previousIndex,routeIndex+1),teamList,requested.incense));
    if(requested.corpusStations)add('station'+(index+1),corpusStationStep(station,teamList));
    previousIndex=routeIndex;
  });
  const inside=[500,820];
  add('return',corpusProcessionStep('Return to the church',route.slice(previousIndex),teamList,requested.incense,'HCWEOM 101-104; local route'));
  const blessingActs={P:[['genuflects before the Blessed Sacrament',.08,.14],['blesses the people with the monstrance in silence',.32,.72],['places the Blessed Sacrament in the tabernacle and genuflects',.78,.92]]};
  if(requested.corpusStations&&team.includes('S'))blessingActs.S=[['rings the bell at the blessing (local custom)',.32,.72]];
  add('blessing',{part:'Benediction',title:'Eucharistic Benediction and reposition',dur:20,posture:[['stand',0],['kneel',.18]],
    ref:'HCWEOM 108; Directory on Popular Piety 163',
    text:'At the church or another suitable place, the Priest gives the concluding blessing with the Blessed Sacrament, then reposes it in the tabernacle. For Corpus Christi this blessing concludes the celebration.',
    mv:{P:M([inside,altar,[380,100],tab],.03,.92)},
    acts:blessingActs,
    props:{monstrance:[{by:'P',t:.04},{at:CORPUS_ALTAR,a:.73,b:.78},{hide:true,t:.92}],lunette:[{by:'P',t:.04},{at:CORPUS_ALTAR,a:.73,b:.78},{hide:true,t:.92}]},
    tabernacle:[[.82,.94]],veil:{P:[[.08,.76]]},blessWith:[[.32,.72]],
    bell:requested.corpusStations&&team.includes('S')?[[.32,.72]]:[],kneel:{P:[[.14,.78]]},
    say:[['ppl','(silence during the blessing)',.32,.72]]});
  const leave={P:M([tab,altar,[952,250]],.04,.95)};
  for(const role of team)leave[role]=M([[500,820],CORPUS_START[role]],.05,.95);
  add('departure',{part:'Conclusion',title:'The ministers depart',dur:10,posture:'stand',ref:'HCWEOM 108',
    text:'After the Blessed Sacrament has been reposed, the ministers return to the sacristy.',
    mv:leave,props:{monstrance:[{hide:true,t:0}],lunette:[{hide:true,t:0}]},smoke:requested.incense&&team.includes('T')?[['T',0,1]]:[]});
  return steps;
}
function buildCorpusScenario(requested={}){
  const serverCount=Math.max(0,Math.min(5,Number(requested.serverCount)||0));
  const team=[[],['S'],['S','X'],['S','X','C1'],['S','X','C1','C2'],['S','X','C1','C2','T']][serverCount];
  const options={...requested,rite:'corpus',minister:'priest',serverCount,servers:serverCount>0,
    deacon:false,incense:serverCount===5&&!!requested.incense,corpusCanopy:serverCount>=4&&requested.corpusCanopy!==false,
    corpusTorches:serverCount>=4&&requested.corpusTorches!==false,corpusStations:requested.corpusStations!==false,
    bishop:false,confirmation:false,nativity:false,candlemas:false,ashWednesday:false,palmSunday:false,holyThursday:false,goodFriday:false,
    baptism:false,funeral:false,lector:false,bothKinds:false,collection:false,projector:false,emhc:false,readerCount:1,lectorProcession:false,
    music:'sung',bells:{start:false,epiclesis:false,elevation:false}};
  const visible=new Set(['P','PEW',...team]);
  const steps=corpusProcessionSteps(options,team);
  const initialPos={...JSON.parse(JSON.stringify(START_POS)),...Object.fromEntries(Object.keys(ACTORS).map(actor=>[actor,HOME[actor].slice()]))};
  for(const role of visible)if(CORPUS_START[role])initialPos[role]=CORPUS_START[role].slice();
  initialPos.P=CORPUS_START.P.slice();
  const initialProps=JSON.parse(JSON.stringify(START_PROPS));
  initialProps.monstrance={at:CORPUS_ALTAR.slice(),h:true};
  initialProps.lunette={at:CORPUS_ALTAR.slice(),h:true};
  initialProps.thurible={by:'T',h:!options.incense};
  initialProps.cross={by:'X',h:!team.includes('X')};
  for(const name of Object.keys(initialProps))if(!['monstrance','lunette','thurible','cross'].includes(name))initialProps[name].h=true;
  STEPS.splice(0,STEPS.length,...steps);
  rebuildTimeline(initialPos,initialProps);
  const assignments=team.map(role=>({
    S:'Server: prepares the humeral veil and assists at the blessing (where customary).',
    X:'Cross-bearer: leads the procession.',
    C1:'Candle-bearer: carries a light beside the Blessed Sacrament (local custom).',
    C2:'Candle-bearer: carries a light beside the Blessed Sacrament (local custom).',
    T:options.incense?'Thurifer: incense before the procession; street use follows local custom.':'Thurifer: accompanies the procession; no incense is used.'
  }[role]));
  const note='The Priest carries the Blessed Sacrament. The route, canopy, lights, incense during the procession and any stations follow local direction and custom; this simplified scene is illustrative.';
  return {options,visible,assignments,team,note,steps,initialPos,initialProps,
    vesture:{role:'P',cope:true,colour:'#f6f2e6'}};
}
RITES.corpus={name:'Corpus Christi procession',build:buildCorpusScenario,roles:CORPUS_PROCESSION_ROLES};
if(typeof module!=='undefined')module.exports={buildCorpusScenario,corpusProcessionSteps,CORPUS_PROCESSION_ROLES,CORPUS_ROUTE,CORPUS_STATIONS};
