// Exposition of the Blessed Sacrament, adoration and, with a Priest, Benediction.
// Order: exposition, adoration, benediction, reposition (HCWEOM 82-100). An instituted acolyte or
// an authorised extraordinary minister may expose and repose the Sacrament, and may incense it,
// but may not give the blessing with it (HCWEOM 91; CIC 943). Texts are short paraphrases.
// Loaded after mass-scenarios.js; registers RITES.exposition. Step keys are strings ('exp:...').
const EXPOSITION_MINISTERS={lay:'E',priest:'P'};
const EXPOSITION_PLACES={
  start:{T:[948,194],S:[948,222],M:[952,250]},
  kneel:{M:[500,264],S:[548,268],T:[452,268]},
  tabernacle:[150,128],
  monstrance:[500,160]
};

function expositionSteps({minister,team,incense}){
  const M=EXPOSITION_MINISTERS[minister]||'E';
  const priest=M==='P';
  const server=team.includes('S'),thurifer=incense&&team.includes('T');
  const P=EXPOSITION_PLACES,K=P.kneel,mon=P.monstrance,tab=P.tabernacle;
  const toAltarBack=[[640,250],[630,105],ALT_P];
  const fromAltarBack=[[630,105],[640,250],K.M];
  const who=priest?'the Priest':'the minister';
  const facing=(roles,a=0,b=1)=>Object.fromEntries(roles.map(r=>[r,[[mon,a,b]]]));
  const kneelers=[M,...(server?['S']:[]),...(thurifer?['T']:[])];
  const steps=[];
  const add=(id,step)=>steps.push({...step,key:'exp:'+id});

  const entrance={mv:{[M]:M_([[900,262],K.M],.12,.9)},acts:{[M]:[['genuflects to the tabernacle',.9,1]]},face:{}};
  if(server){entrance.mv.S=M_([[900,262],K.S],.06,.82);entrance.acts.S=[['genuflects to the tabernacle',.84,.94]];}
  if(thurifer){entrance.mv.T=M_([[900,262],K.T],0,.75);}
  add('entrance',{part:'Exposition',title:'Entrance',dur:10,posture:'stand',
    text:'When the people have gathered, '+who+(server?' and the servers':'')+' come in from the sacristy'+(thurifer?', the thurifer first with the thurible,':'')+' and go to the front of the altar. A hymn may be sung.',
    ref:'HCWEOM 93',...entrance,say:[['ppl','♪ Opening hymn ♪',.05,1]],smoke:thurifer?[['T',0,1]]:[]});

  add('expose',{part:'Exposition',title:'Exposition of the Blessed Sacrament',dur:16,posture:[['stand',0],['kneel',.7]],
    text:(priest?'The Priest':'The lay minister (an instituted acolyte or an authorised extraordinary minister, when no Priest or Deacon is available)')+
      ' goes to the tabernacle, genuflects and takes the Blessed Sacrament. At the altar he places the Sacrament in the monstrance, genuflects and returns to kneel before the altar.',
    ref:priest?'HCWEOM 93':'HCWEOM 91, 93; CIC 943',
    mv:{[M]:[M_([[360,250],tab],.02,.2),M_([[380,100],[500,118]],.4,.58),M_(fromAltarBack,.75,.97)]},
    acts:{[M]:[['genuflects and opens the tabernacle',.2,.3],['takes the Blessed Sacrament from the tabernacle',.3,.38],
      ['places the Sacrament in the monstrance on the altar',.6,.68],['genuflects before the Blessed Sacrament',.68,.74]]},
    props:{lunette:[{hide:false,t:.32},{by:M,t:.32},{at:mon,a:.6,b:.66}]},
    tabernacle:[[.26,.4]],kneel:{[M]:[[.97,1]]},face:{...facing(kneelers.filter(r=>r!==M)),[M]:[[mon,.97,1]]},
    say:[['ppl','♪ Hymn at the exposition ♪',0,1]],smoke:thurifer?[['T',0,1]]:[]});

  const incensing=(id,part,title,ref,extra={})=>{
    if(!thurifer)return false;
    add(id,{part,title,dur:10,posture:'kneel',ref,
      text:'Kneeling before the altar, '+who+' puts incense into the thurible and incenses the Blessed Sacrament.'+(extra.text||''),
      mv:{T:[M_([[475,272]],0,.12),M_([K.T],.88,1)]},
      acts:{[M]:[['puts incense into the thurible',.12,.2],['incenses the Blessed Sacrament (3 swings)',.25,.8]],T:[['presents the thurible and incense boat',.06,.14],['takes back the thurible',.82,.88]]},
      props:{thurible:[{by:M,t:.18},{by:'T',t:.85}]},smoke:[['T',0,.18],[M,.18,.85],['T',.85,1]],
      kneel:{[M]:[[0,1]]},face:facing([M,...(server?['S']:[])]),say:extra.say||[]});
    return true;
  };
  incensing('incense','Exposition','Incensing the Blessed Sacrament',priest?'HCWEOM 93':'HCWEOM 91, 93');

  add('reading',{part:'Adoration',title:'A reading from Scripture',dur:14,posture:'sit',
    text:'During the adoration there may be readings from Scripture with a short reflection, songs and prayers, so that the people can turn their attention to Christ the Lord.',
    ref:'HCWEOM 95',
    mv:{[M]:[M_([[330,262],AMBO],0,.15),M_([[330,262],K.M],.85,1)]},
    say:[[M,'A reading from the first Letter of Saint Paul to the Corinthians.',.18,.32],
      [M,'(1 Corinthians 11: on the night he was betrayed, the Lord Jesus took bread…)',.34,.68],
      [M,'The word of the Lord.',.7,.8],['ppl','Thanks be to God.',.81,.9]],
    face:facing(kneelers.filter(r=>r!==M))});

  add('silence',{part:'Adoration',title:'Silent adoration',dur:14,posture:'kneel',
    text:'All pray before the Blessed Sacrament. Periods of sacred silence are kept.',ref:'HCWEOM 95-96',
    acts:{[M]:[['prays in silence before the Blessed Sacrament',.1,.9]]},kneel:{[M]:[[0,1]]},face:facing(kneelers),
    say:[['ppl','(silent prayer)',.05,.95]]});

  const prayer=[[M,'Let us pray.',.05,.18],['ppl','(brief silence)',.2,.34],
    [M,'Lord Jesus Christ, in this wonderful Sacrament you left us the memorial of your Passion: help us so to revere it that we may always know its fruit in us.',.36,.84],
    ['ppl','Amen.',.86,.98]];
  if(priest){
    if(!incensing('hymn','Benediction','Eucharistic hymn and incensing','HCWEOM 97',{say:[['ppl','♪ Eucharistic hymn (for example Tantum ergo) ♪',0,1]],text:' Meanwhile a Eucharistic hymn is sung.'}))
      add('hymn',{part:'Benediction',title:'Eucharistic hymn',dur:10,posture:'kneel',ref:'HCWEOM 97',
        text:'Towards the end of the adoration the Priest kneels before the altar while a Eucharistic hymn is sung.',
        kneel:{P:[[0,1]]},face:facing(kneelers),say:[['ppl','♪ Eucharistic hymn (for example Tantum ergo) ♪',0,1]]});
    add('prayer',{part:'Benediction',title:'The prayer',dur:10,posture:'kneel',ref:'HCWEOM 98',
      text:'The Priest rises and says "Let us pray". After a brief pause in silence he says the prayer, and the people answer "Amen".',
      face:facing(kneelers.filter(r=>r!=='P')),say:prayer});
    const blessing={mv:{P:[M_(toAltarBack,.12,.35),M_(fromAltarBack,.84,1)]},
      acts:{P:[['receives the humeral veil',.02,.1],['genuflects before the Blessed Sacrament',.35,.4],
        ['blesses the people with the monstrance, in silence',.45,.75],['sets the monstrance down and genuflects',.76,.82]]},
      props:{monstrance:[{by:'P',t:.42},{at:mon,a:.75,b:.78}],lunette:[{by:'P',t:.42},{at:mon,a:.75,b:.78}]},
      face:facing(kneelers.filter(r=>r!=='P')),blessWith:[[.45,.75]]};
    if(server){blessing.acts.S=[['places the humeral veil on the Priest',.02,.1],['rings the bell',.48,.72]];blessing.bell=[[.48,.72]];}
    add('blessing',{part:'Benediction',title:'Benediction',dur:14,posture:'kneel',ref:'HCWEOM 92, 99'+(server?'; custom: the bell':''),
      text:'With the humeral veil over his shoulders the Priest genuflects, takes the monstrance and makes the Sign of the Cross over the people with it, saying nothing.'+(server?' A server may ring the bell.':''),
      ...blessing,say:[['ppl','(silence)',.45,.75]]});
    add('praises',{part:'Benediction',title:'The Divine Praises',dur:10,posture:'kneel',ref:'Custom (the Divine Praises)',
      text:'Where it is the custom, the Divine Praises are said after the blessing, the people repeating each line.',
      kneel:{P:[[0,1]]},face:facing(kneelers),
      say:[['P','Blessed be God. Blessed be his holy Name…',.05,.45],['ppl','Blessed be God. Blessed be his holy Name…',.5,.95]]});
  }else{
    add('prayer',{part:'Adoration',title:'Closing prayer and hymn',dur:12,posture:'kneel',ref:'HCWEOM 91, 96; CIC 943',
      text:'The lay minister may lead prayers and a hymn, but does not give the blessing with the Blessed Sacrament.',
      face:facing(kneelers.filter(r=>r!==M)),kneel:{[M]:[[.98,1]]},
      say:[...prayer.map(([w,t,a,b])=>[w,t,a*.7,b*.7]),['ppl','♪ Closing hymn ♪',.72,1]]});
  }

  add('repose',{part:'Reposition',title:'Reposition',dur:14,posture:[['kneel',0],['stand',.8]],
    text:(priest?'After the blessing the Priest':'The minister')+' takes the Blessed Sacrament from the monstrance, carries it to the tabernacle, places it inside, genuflects and closes the door. An acclamation may be sung meanwhile.',
    ref:priest?'HCWEOM 100':'HCWEOM 91, 100',
    mv:{[M]:[M_(toAltarBack,0,.2),M_([[380,100],[300,100],tab],.32,.55),M_([[360,250],K.M],.78,.98)]},
    acts:{[M]:[['genuflects and takes the Sacrament from the monstrance',.2,.3],['places the Blessed Sacrament in the tabernacle',.58,.66],['genuflects and closes the tabernacle',.66,.74]]},
    props:{lunette:[{by:M,t:.28},{at:[137,85],a:.55,b:.6},{hide:true,t:.72}]},tabernacle:[[.55,.74]],
    face:facing(kneelers.filter(r=>r!==M),0,.8),say:[['ppl','♪ Acclamation ♪',.1,1]]});

  const out={[M]:M_([[900,262],P.start.M],.25,1)};
  if(server)out.S=M_([[900,262],P.start.S],.2,.95);
  if(thurifer)out.T=M_([[900,262],P.start.T],.15,.9);
  add('depart',{part:'Reposition',title:'The ministers leave',dur:9,posture:'stand',ref:'HCWEOM 100',
    text:'The ministers genuflect to the tabernacle and return to the sacristy.',
    mv:out,acts:Object.fromEntries(kneelers.map(r=>[r,[['genuflects to the tabernacle',0,.12]]])),smoke:thurifer?[['T',0,1]]:[]});
  return steps;
}
// M() is defined in mass-rite.js; the alias keeps the role variable M free above.
function M_(points,a,b){return M(points,a,b);}

function buildExpositionScenario(requested={}){
  const minister=requested.minister==='priest'?'priest':'lay';
  const serverCount=Math.max(0,Math.min(2,Number(requested.serverCount)||0));
  const incense=!!requested.incense&&serverCount>=2;
  const team=serverCount>=1?(incense?['S','T']:['S']):[];
  const M=EXPOSITION_MINISTERS[minister];
  const options={...requested,rite:'exposition',minister,serverCount,servers:serverCount>0,incense,
    deacon:false,lector:false,bothKinds:false,collection:false,emhc:minister==='lay',readerCount:1,lectorProcession:false,projector:false,
    music:'sung',crucifix:CRUCIFIX_PLACES[requested.crucifix]?requested.crucifix:'wall',crossStand:CROSS_STANDS[requested.crossStand]?requested.crossStand:'right',
    bells:{start:false,epiclesis:false,elevation:false}};
  const visible=new Set([M,...team]);
  const steps=expositionSteps({minister,team,incense});
  const initialPos={...JSON.parse(JSON.stringify(START_POS)),...Object.fromEntries(Object.keys(ACTORS).map(a=>[a,HOME[a].slice()]))};
  initialPos[M]=EXPOSITION_PLACES.start.M.slice();
  for(const r of team)initialPos[r]=EXPOSITION_PLACES.start[r].slice();
  const initialProps=JSON.parse(JSON.stringify(START_PROPS));
  for(const name of Object.keys(initialProps))initialProps[name].h=true;
  initialProps.thurible={by:'T',h:!incense};
  initialProps.monstrance={at:EXPOSITION_PLACES.monstrance.slice()};
  initialProps.lunette={at:[137,85],h:true};
  STEPS.splice(0,STEPS.length,...steps);
  rebuildTimeline(initialPos,initialProps);
  const assignments=team.map(role=>role==='S'?'Server: humeral veil and bell.':'Thurifer: thurible and incense boat.');
  const note=minister==='priest'?'The Priest, in cope and stole, exposes the Blessed Sacrament and gives Benediction.':
    'An authorised lay minister exposes and reposes the Blessed Sacrament, without the blessing.';
  return {options,visible,assignments,team,note};
}
RITES.exposition={name:'Exposition of the Blessed Sacrament',build:buildExpositionScenario,roles:{lay:['E','S','T','PEW'],priest:['P','S','T','PEW']}};
if(typeof module!=='undefined')module.exports={buildExpositionScenario,expositionSteps,EXPOSITION_PLACES};
