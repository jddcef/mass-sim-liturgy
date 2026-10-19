// Baptism of children outside Mass (Ordo Baptismi Parvulorum 32-71, the rite for several children, here
// with one family standing for all). Order: reception at the door, Liturgy of the Word, the Sacrament at
// the font, the procession to the altar, the Lord's Prayer and the blessing. A Priest or a Deacon is the
// ordinary minister (CIC 861). Outside Mass he wears alb (or surplice) and a white stole; one server may
// assist and bring the oil of catechumens. Texts are short paraphrases.
// Loaded after mass-scenarios.js; registers RITES.baptism. Step keys are strings ('bap:...').
const BAPTISM_RITE_MINISTERS={priest:'P',deacon:'D'};
const BAPTISM_RITE_NAMES={priest:'the Priest',deacon:'the Deacon'};
const BAPTISM_RITE_PLACES={sacristy:{cel:[952,250],S:[948,222]},door:{cel:[500,808],S:[548,812]}};

function baptismRiteSteps({minister,server,sung}){
  const cel=BAPTISM_RITE_MINISTERS[minister]||'P';
  const who=BAPTISM_RITE_NAMES[minister]||'the Priest';
  const Who=who[0].toUpperCase()+who.slice(1);
  const B=BAPTISM_PLACES,R=BAPTISM_RITE_PLACES;
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const steps=[];
  const add=(id,step)=>steps.push({...step,key:'bap:'+id});
  const toChair=[[500,300],[625,250],[625,90],CHAIR];
  const chairToAmbo=[[440,70],[340,110],[300,200],AMBO];

  const arrive={mv:{[cel]:M([[900,262],[880,300],[880,790],R.door.cel],0,.9)},face:{[cel]:[[[500,840],.9,1]],BP:[[R.door.cel,.6,1]],GP:[[R.door.cel,.6,1]]}};
  if(server)arrive.mv.S=M([[900,262],[880,300],[880,790],R.door.S],.06,.95);
  add('arrive',{part:'Reception of the Children',title:'Going to the Door',dur:10,posture:'stand',
    text:'The parents and godparents bring the child to the church. '+Who+(server?', with a server,':'')+' comes from the sacristy, in alb or surplice and a white stole, and goes to the door to meet them.',
    ref:'Ordo Baptismi Parvulorum 35',...arrive,say:[['ppl',chant('a hymn may be sung'),.1,1]]});

  add('reception',baptismReception({cel,who,within:false}));

  const procession={mv:{[cel]:M(toChair,.12,.92),BP:M([[487,790],[513,700],[513,HOME.BP[1]],HOME.BP],.02,.8),GP:M([[513,790],[513,HOME.GP[1]],HOME.GP],.06,.86)}};
  if(server)procession.mv.S=M([[548,700],[548,300],[700,250],[805,110],HOME.S],.08,.9);
  add('procession',{part:'Liturgy of the Word',title:'Procession to the Place of the Word',dur:16,posture:'stand',
    text:Who+' invites the parents, godparents and others to take part in the Liturgy of the Word. All go in procession to the front of the church while a song is sung, and the family takes its places.',
    ref:'Ordo Baptismi Parvulorum 42-43',...procession,say:[[cel,'(invites all to the Liturgy of the Word)',0,.1],['ppl',chant('a song, for example Psalm 85'),.12,1]]});

  add('word',{part:'Liturgy of the Word',title:'Gospel and Homily',dur:24,posture:[['stand',0],['sit',.55]],
    text:'One or more passages of Scripture are read, for example the Gospel of the baptism of Jesus or of Christ sending out the apostles to baptize all nations. '+Who+' then gives a short homily on the reading and on the mystery of baptism, and on the duties of the parents and godparents. A period of silence may follow.',
    ref:'Ordo Baptismi Parvulorum 44-46',
    mv:{[cel]:[M(chairToAmbo,0,.12),M([...chairToAmbo].reverse().slice(1).concat([CHAIR]),.9,1)]},
    say:[[cel,'A reading from the holy Gospel according to Matthew.',.14,.2],[cel,'(Matthew 28: go, make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit)',.2,.4],
      [cel,'The Gospel of the Lord.',.4,.44],['ppl','Praise to you, Lord Jesus Christ.',.44,.5],[cel,'(short homily on baptism and the duties of the parents and godparents)',.56,.88]]});

  add('intercessions',{part:'Liturgy of the Word',title:'Intercessions and Litany of the Saints',dur:18,posture:'stand',
    text:'Standing at the chair, '+who+' introduces the intercessions for the child, the parents and godparents and all the baptized. They end with the litany of the saints, Holy Mary, Saint John the Baptist, Saint Joseph, the patron saints of the child and others.',
    ref:'Ordo Baptismi Parvulorum 47-48',
    say:[[cel,'(invitation to prayer)',0,.1],[server?'S':cel,'(intention for the child\u2026) Lord, hear us.',.12,.28],['ppl','Lord, graciously hear us.',.28,.36],
      [server?'S':cel,'(intention for the parents and godparents\u2026) Lord, hear us.',.38,.54],['ppl','Lord, graciously hear us.',.54,.62],
      ['ppl',chant('Holy Mary, Mother of God, pray for us\u2026 Saint John the Baptist\u2026 Saint Joseph\u2026 (litany of the saints)'),.64,1]]});

  for(const step of baptismCoreSteps({cel,helper:server?'S':cel,who,within:false,sung,key:id=>'bap:'+id}))steps.push(step);

  const front=B.front,family={BP:[[front,0,1]],GP:[[front,0,1]]};
  add('lordsPrayer',{part:'Conclusion of the Rite',title:'The Lord\u2019s Prayer',dur:16,posture:'stand',
    text:'Before the altar '+who+' reminds everyone that the child, reborn in baptism, will one day be confirmed and come to the altar to share in the Eucharist. In the name of the child, as children of God, all pray together the prayer the Lord taught us.',
    ref:'Ordo Baptismi Parvulorum 68-69',
    face:{[cel]:[[[500,320],0,1]],...family},
    say:[[cel,'(this child, reborn in baptism, will one day receive the Spirit in Confirmation and come to the Lord\u2019s altar; in her name let us pray as the Lord taught us)',.03,.3],
      ['ppl',chant('Our Father, who art in heaven\u2026'),.34,1]]});

  add('blessing',{part:'Conclusion of the Rite',title:'Blessing and Dismissal',dur:18,posture:'stand',
    text:Who+' blesses the mothers, holding their children, then the fathers, and then all present. He dismisses them in peace, and a song of thanksgiving or the Magnificat may be sung. Where it is the custom, the baptized child may be brought to the altar of Our Lady.',
    ref:'Ordo Baptismi Parvulorum 70-71',
    acts:{[cel]:[['blesses the people',.66,.78]]},face:{[cel]:[[[500,320],0,1]],...family},
    say:[[cel,'(God, through his Son born of the Virgin Mary, bless the mother of this child\u2026)',.03,.18],['ppl','Amen.',.18,.22],
      [cel,'(God, the giver of life, bless the father of this child\u2026)',.24,.38],['ppl','Amen.',.38,.42],
      [cel,'(God bless all of you who are gathered here\u2026)',.44,.58],['ppl','Amen.',.58,.62],
      [cel,'May almighty God, the Father, and the Son, and the Holy Spirit, bless you.',.64,.78],['ppl','Amen.',.78,.82],
      [cel,'Go in peace, and the Lord be with you.',.84,.94],['ppl','Thanks be to God.',.94,1]]});

  const out={[cel]:M([[625,250],[900,262],R.sacristy.cel],.2,1),BP:M([[487,330],[513,HOME.BP[1]],HOME.BP],.1,.8),GP:M([[513,330],[513,HOME.GP[1]],HOME.GP],.14,.86)};
  if(server)out.S=M([[700,250],[900,262],R.sacristy.S],.1,.9);
  add('depart',{part:'Conclusion of the Rite',title:'The Ministers Leave',dur:10,posture:'stand',ref:'Ordo Baptismi Parvulorum 71',
    text:Who+(server?' and the server bow':' bows')+' to the altar and return'+(server?'':'s')+' to the sacristy, while the family goes back to its places.',
    mv:out,acts:{[cel]:[['bows to the altar',0,.15]]},say:[['ppl',chant('a song of thanksgiving'),0,1]]});
  return steps;
}

function buildBaptismScenario(requested={}){
  const minister=BAPTISM_RITE_MINISTERS[requested.minister]?requested.minister:'priest';
  const serverCount=Math.max(0,Math.min(1,Number(requested.serverCount)||0));
  const cel=BAPTISM_RITE_MINISTERS[minister];
  const server=serverCount>0;
  const music=requested.music==='said'?'said':'sung';
  const options={...requested,rite:'baptism',minister,serverCount,servers:server,incense:false,baptism:true,
    deacon:minister==='deacon',lector:false,bothKinds:false,collection:false,emhc:false,readerCount:1,lectorProcession:false,projector:false,
    music,crucifix:CRUCIFIX_PLACES[requested.crucifix]?requested.crucifix:'wall',crossStand:CROSS_STANDS[requested.crossStand]?requested.crossStand:'right',
    bells:{start:false,epiclesis:false,elevation:false}};
  const team=server?['S']:[];
  const visible=new Set([cel,...team,'BP','GP']);
  const steps=baptismRiteSteps({minister,server,sung:music==='sung'});
  const initialPos={...JSON.parse(JSON.stringify(START_POS)),...Object.fromEntries(Object.keys(ACTORS).map(a=>[a,HOME[a].slice()]))};
  initialPos[cel]=BAPTISM_RITE_PLACES.sacristy.cel.slice();
  if(server)initialPos.S=BAPTISM_RITE_PLACES.sacristy.S.slice();
  initialPos.BP=BAPTISM_PLACES.doorParent.slice();
  initialPos.GP=BAPTISM_PLACES.doorGodparent.slice();
  const initialProps=JSON.parse(JSON.stringify(START_PROPS));
  for(const name of Object.keys(initialProps))initialProps[name].h=true;
  Object.assign(initialProps,{infant:{by:'BP'},oilCat:{at:BAPTISM_PLACES.oil.slice()},chrism:{at:BAPTISM_PLACES.chrism.slice()},
    garment:{at:BAPTISM_PLACES.garment.slice()},bcandle:{at:BAPTISM_PLACES.bcandle.slice()}});
  STEPS.splice(0,STEPS.length,...steps);
  rebuildTimeline(initialPos,initialProps);
  const assignments=server?['Server: brings the oil of catechumens and leads the intercessions.']:[];
  const note=BAPTISM_RITE_NAMES[minister].replace('the','The')+', in alb and white stole, baptizes the child at the font'+(server?', helped by one server.':'.');
  // Outside Mass the minister wears a white stole (no chasuble or dalmatic); mass-3d.js recolours the figure.
  const vesture={role:cel,cope:false,recolour:true,colour:'#f6f2e6'};
  return {options,visible,assignments,team,note,vesture};
}
RITES.baptism={name:'Baptism of Children',build:buildBaptismScenario,roles:{priest:['P','S','PEW'],deacon:['D','S','PEW']}};
if(typeof module!=='undefined')module.exports={...(module.exports||{}),buildBaptismScenario,baptismRiteSteps,BAPTISM_RITE_PLACES,BAPTISM_RITE_MINISTERS};
