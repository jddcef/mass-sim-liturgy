// Funeral liturgy outside Mass (Ordo Exsequiarum 6, 46-48; Order of Christian Funerals 177-203): the reception
// at the door, the procession, the Liturgy of the Word, the prayer of the faithful and the Lord's Prayer, the
// final commendation and the procession to the place of committal. A Priest or, when no Priest is available,
// a Deacon presides (OCF 14). One server may bring the holy water and read the intentions; a second carries
// the thurible. One funeral director stands for the bearers and one family member for the mourners.
// Loaded after mass-scenarios.js; registers RITES.funeral. Step keys are strings ('fun:...').
const FUNERAL_RITE_MINISTERS={priest:'P',deacon:'D'};
const FUNERAL_RITE_NAMES={priest:'the Priest',deacon:'the Deacon'};
const FUNERAL_RITE_PLACES={sacristy:{cel:[952,250],S:[948,222],T:[946,278]}};

function funeralRiteSteps({minister,server,thurifer,sung}){
  const cel=FUNERAL_RITE_MINISTERS[minister]||'P';
  const who=FUNERAL_RITE_NAMES[minister]||'the Priest';
  const Who=who[0].toUpperCase()+who.slice(1);
  const F=FUNERAL_PLACES,R=FUNERAL_RITE_PLACES;
  const helper=server?'S':cel;
  const T=thurifer?'T':null;
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const steps=[];
  const add=(id,step)=>steps.push({...step,key:'fun:'+id});
  const chairToAmbo=[[440,70],[340,110],[300,200],AMBO];

  const arrive={mv:{[cel]:M([[900,262],[880,300],[880,728],F.celDoor],0,.9)},
    face:{[cel]:[[[500,840],.9,1]],FD:[[F.celDoor,.6,1]],FM:[[F.celDoor,.6,1]]}};
  if(server)arrive.mv.S=M([[900,262],[880,300],[880,744],F.helperDoor],.06,.95);
  if(T)arrive.mv.T=M([[900,262],[880,300],[880,744],F.thuriferDoor],.1,1);
  add('arrive',{part:'Reception at the Church',title:'Going to the Door',dur:10,posture:'stand',
    text:'The funeral director and the bearers bring the coffin to the church, with the family. '+Who+(server||T?', with the servers,':'')+' comes from the sacristy, in alb or surplice and a violet stole, and goes to the door to meet them.',
    ref:'Order of Christian Funerals 183',...arrive,smoke:T?[['T',0,1]]:undefined,say:[['ppl','(all stand)',.6,1]]});

  add('reception',{...funeralReception({cel,who,helper,within:false}),smoke:T?[['T',0,1]]:undefined});

  const toChair=[[478,600],[478,420],[500,300],[625,250],[625,90],CHAIR];
  const procession={mv:{FD:M([F.directorRest],.22,.86),FM:M([[526,470],[560,380],HOME.FM],.42,.98)},
    acts:{FD:[['brings the coffin before the altar',.22,.86]]},
    props:{coffin:[{at:F.rest,a:.87,b:.87}],drape:[{at:F.rest,a:.87,b:.87}]}};
  if(server){
    procession.mv[cel]=M(toChair,.06,.9);
    procession.mv.S=[M([[528,700],[470,600],[470,420],F.standReach],.1,.6),M([[513,300],[700,250],[805,110],HOME.S],.68,1)];
    procession.props.holyWater=[{at:F.stand,a:.61,b:.65}];
    procession.acts.S=[['puts the holy water on its stand by the coffin',.6,.66]];
  }else{
    procession.mv[cel]=[M([[478,600],[470,420],F.standReach],.06,.55),M(toChair.slice(2),.62,.92)];
    procession.props.holyWater=[{at:F.stand,a:.56,b:.6}];
    procession.acts[cel]=[['puts the holy water on its stand by the coffin',.55,.61]];
  }
  if(T){
    procession.mv.T=M([[472,600],[472,420],[500,300],[700,250],[760,120],HOME.T],0,.7);
    procession.smoke=[['T',0,1]];
  }
  add('procession',{part:'Reception at the Church',title:'Entrance Procession',dur:20,posture:'stand',
    text:(T?'The thurifer leads the procession, then ':'The procession goes up the aisle: ')+who+' and the ministers, then the coffin, with the family following, while a song or psalm is sung. The coffin is placed before the altar, beside the lighted paschal candle, and the family takes its places.',
    ref:'Order of Christian Funerals 162-163, 186',...procession,
    say:[['ppl',chant('a song or psalm, for example Psalm 25: to you, O Lord, I lift up my soul'),.04,1]]});

  add('collect',{part:'Reception at the Church',title:'Opening Prayer',dur:12,posture:'stand',
    text:'At the chair '+who+' invites all to pray, and after a brief silence says the opening prayer for the deceased.',
    ref:'Order of Christian Funerals 164, 187',
    face:{[cel]:[[[500,400],0,1]]},orans:{[cel]:[[.2,.85]]},
    mv:{FD:M([[470,430],[470,800],HOME.FD],0,.6)},
    say:[[cel,'Let us pray.',0,.1],['ppl','(silence)',.1,.2],[cel,'(opening prayer: O God, Father of mercies, receive our brother N. into your peace and light\u2026)',.2,.85],['ppl','Amen.',.86,.94]]});

  add('word',{part:'Liturgy of the Word',title:'Readings, Gospel and Homily',dur:26,posture:[['sit',0],['stand',.3],['sit',.58]],
    text:'One or more readings are proclaimed, with a psalm, for example "The Lord is my shepherd". '+Who+' reads the Gospel, here the raising of Lazarus. A brief homily follows: it speaks of God\u2019s love and the paschal mystery of Christ, and it is never a eulogy of the deceased.',
    ref:'Order of Christian Funerals 27, 165-166, 188-189',
    mv:{[cel]:[M(chairToAmbo,.28,.34),M([...chairToAmbo].reverse().slice(1).concat([CHAIR]),.92,1)]},
    say:[['ppl','(a reading, for example Wisdom 3: the souls of the just are in the hand of God; and Psalm 23)',.02,.26],
      [cel,'A reading from the holy Gospel according to John.',.36,.4],[cel,'(John 11: I am the resurrection and the life; whoever believes in me, even though he die, will live)',.4,.52],
      [cel,'The Gospel of the Lord.',.52,.55],['ppl','Praise to you, Lord Jesus Christ.',.55,.58],[cel,'(brief homily on the hope of the resurrection)',.6,.9]]});

  const reader=server?'S':cel;
  add('intercessions',{part:'Liturgy of the Word',title:'Prayer of the Faithful',dur:16,posture:'stand',
    text:Who+' introduces the prayer of the faithful. '+(server?'The server reads':'He reads')+' the intentions: for the deceased, for the family and all who mourn, and for all the faithful departed.',
    ref:'Order of Christian Funerals 167, 190',
    say:[[cel,'(invitation to prayer)',0,.1],[reader,'(for our brother N., that he may share in the resurrection\u2026) Lord, in your mercy.',.12,.34],['ppl','Hear our prayer.',.34,.42],
      [reader,'(for his family and all who mourn, that they may be comforted\u2026) Lord, in your mercy.',.44,.66],['ppl','Hear our prayer.',.66,.74],
      [reader,'(for all the faithful departed\u2026) Lord, in your mercy.',.76,.92],['ppl','Hear our prayer.',.92,1]]});

  add('lordsPrayer',{part:'Liturgy of the Word',title:'The Lord\u2019s Prayer',dur:14,posture:'stand',
    text:Who+' invites all to pray the Lord\u2019s Prayer together, and ends the prayer of the faithful with a concluding prayer.',
    ref:'Order of Christian Funerals 191-192',orans:{[cel]:[[.72,.92]]},
    say:[[cel,'(let us pray as Christ taught us)',0,.1],['ppl',chant('Our Father, who art in heaven\u2026'),.12,.66],[cel,'(concluding prayer: Lord God, you are attentive to the voice of our pleading\u2026)',.7,.92],['ppl','Amen.',.92,1]]});

  for(const step of funeralCommendationSteps({cel,helper,thurifer:T,assistant:null,who,within:false,sung,key:id=>'fun:'+id}))steps.push(step);

  const lead={};
  if(server)lead.S=M([[468,300]],.1,.18);
  steps.push(funeralProcessionOut({speaker:cel,sung,key:'fun:out',order:[T,server?'S':null,cel].filter(Boolean),lead,bow:[cel],thurifer:T}));
  return steps;
}

function buildFuneralScenario(requested={}){
  const minister=FUNERAL_RITE_MINISTERS[requested.minister]?requested.minister:'priest';
  const serverCount=Math.max(0,Math.min(2,Number(requested.serverCount)||0));
  const cel=FUNERAL_RITE_MINISTERS[minister];
  const server=serverCount>0,thurifer=serverCount>1;
  const music=requested.music==='said'?'said':'sung';
  const options={...requested,rite:'funeral',minister,serverCount,servers:server,incense:thurifer,funeral:true,
    deacon:minister==='deacon',lector:false,bothKinds:false,collection:false,emhc:false,readerCount:1,lectorProcession:false,projector:false,
    music,crucifix:CRUCIFIX_PLACES[requested.crucifix]?requested.crucifix:'wall',crossStand:CROSS_STANDS[requested.crossStand]?requested.crossStand:'right',
    bells:{start:false,epiclesis:false,elevation:false}};
  const team=[...(server?['S']:[]),...(thurifer?['T']:[])];
  const visible=new Set([cel,...team,'FD','FM']);
  const steps=funeralRiteSteps({minister,server,thurifer,sung:music==='sung'});
  const initialPos={...JSON.parse(JSON.stringify(START_POS)),...Object.fromEntries(Object.keys(ACTORS).map(a=>[a,HOME[a].slice()]))};
  initialPos[cel]=FUNERAL_RITE_PLACES.sacristy.cel.slice();
  if(server)initialPos.S=FUNERAL_RITE_PLACES.sacristy.S.slice();
  if(thurifer)initialPos.T=FUNERAL_RITE_PLACES.sacristy.T.slice();
  initialPos.FD=FUNERAL_PLACES.directorDoor.slice();
  initialPos.FM=FUNERAL_PLACES.familyDoor.slice();
  const initialProps=JSON.parse(JSON.stringify(START_PROPS));
  for(const name of Object.keys(initialProps))initialProps[name].h=true;
  Object.assign(initialProps,{coffin:{by:'FD'},drape:{by:'FD',h:true},pall:{by:'FM'},holyWater:{by:server?'S':cel}});
  if(thurifer)initialProps.thurible={by:'T'};
  STEPS.splice(0,STEPS.length,...steps);
  rebuildTimeline(initialPos,initialProps);
  const assignments=[...(server?['Server: carries the holy water, holds it for the sprinkling and reads the intentions.']:[]),
    ...(thurifer?['Thurifer: leads the procession and holds the thurible for the incensing of the coffin.']:[])];
  const note=FUNERAL_RITE_NAMES[minister].replace('the','The')+', in alb and violet stole, leads the funeral liturgy outside Mass'+(server?', helped by '+(thurifer?'two servers.':'one server.'):'.');
  // Outside Mass the minister wears alb and stole (a cope may be added); mass-3d.js recolours the figure violet.
  const vesture={role:cel,cope:false,recolour:true,colour:FUNERAL_VIOLET};
  return {options,visible,assignments,team,note,vesture};
}
RITES.funeral={name:'Funeral Liturgy outside Mass',build:buildFuneralScenario,roles:{priest:['P','S','T','PEW'],deacon:['D','S','T','PEW']}};
if(typeof module!=='undefined')module.exports={...(module.exports||{}),buildFuneralScenario,funeralRiteSteps,FUNERAL_RITE_PLACES,FUNERAL_RITE_MINISTERS};
