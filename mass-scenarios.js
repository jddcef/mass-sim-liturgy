const ORIGINAL_STEPS=JSON.parse(JSON.stringify(STEPS));
const SERVER_ROLES=['X','C1','C2','T','S'];
const ROLE_NAMES={P:'Priest',D:'Deacon',X:'Cross-bearer',C1:'Candle-bearer',C2:'Candle-bearer',T:'Thurifer',S:'Server',L:'Lector',L2:'Second reader',Ps:'Psalmist',U:'Collection usher',E:'EMHC',G1:'Gift-bearer',G2:'Gift-bearer',ppl:'People'};

// The rite registry: each rite builds its own STEPS and timeline. Mass is the default;
// other rites (mass-rite-exposition.js) register themselves here and use string step keys,
// so the numeric Mass keys used for special cases elsewhere never match them.
const RITES={mass:{name:'Holy Mass',build:buildMassScenario}};
function buildScenario(requested){
  const rite=RITES[requested?.rite]||RITES.mass;
  return rite.build(requested||{});
}
function buildMassScenario(requested){
  const serverCount=requested.serverCount??(requested.servers?5:0);
  if(!Number.isInteger(serverCount)||serverCount<0||serverCount>5){
    throw new RangeError('Server count must be an integer from 0 to 5.');
  }
  const options={...requested,rite:'mass',serverCount,servers:serverCount>0,incense:serverCount>0&&requested.incense,bothKinds:requested.deacon&&requested.bothKinds};
  // Optional elements; defaults reproduce the original baseline celebration.
  Object.assign(options,{
    gloria:requested.gloria??true,
    creed:requested.creed??true,
    secondReading:requested.secondReading??true,
    introductory:['A','C','sprinkling'].includes(requested.introductory)?requested.introductory:'A',
    music:requested.music==='said'?'said':'sung',
    solemnBlessing:!!requested.solemnBlessing,
    giftsProcession:requested.giftsProcession??true,
    eucharisticPrayer:['I','II','III','IV'].includes(requested.eucharisticPrayer)?requested.eucharisticPrayer:'II',
    crucifix:CRUCIFIX_PLACES[requested.crucifix]?requested.crucifix:'wall',
    crossStand:CROSS_STANDS[requested.crossStand]?requested.crossStand:'right',
    readerCount:requested.readerCount===2?2:1,
    lectorProcession:requested.lectorProcession??false,
    collection:!!requested.collection,emhc:!!requested.emhc,reservedCommunion:!!requested.reservedCommunion,
    deaconCommunion:!!requested.deacon&&(requested.deaconCommunion??true),
    bells:{
      start:!!requested.bells?.start,
      epiclesis:serverCount>0&&(requested.bells?.epiclesis??true),
      elevation:serverCount>0&&(requested.bells?.elevation??true)
    }
  });
  const visible=new Set(Object.keys(ACTORS));
  if(!options.lector||options.readerCount!==2)visible.delete('L2');
  if(!options.collection)visible.delete('U');
  if(!options.emhc)visible.delete('E');
  if(!options.deacon)visible.delete('D');
  if(!options.servers)SERVER_ROLES.forEach(a=>visible.delete(a));
  const team=[
    [],['S'],['S','X'],['S','C1','C2'],
    ['S','X','C1','C2'],['S','X','C1','C2','T']
  ][serverCount];
  SERVER_ROLES.forEach(role=>{if(!team.includes(role))visible.delete(role);});
  if(!options.lector){visible.delete('L');visible.delete('Ps');}
  const steps=JSON.parse(JSON.stringify(ORIGINAL_STEPS)).map((s,key)=>({...s,key}));
  const find=title=>steps.find(s=>s.title===title);
  const initialProps=JSON.parse(JSON.stringify(START_PROPS));
  const initialPos=JSON.parse(JSON.stringify(START_POS));
  const describe=(s,text,ref)=>{s.text=text;if(ref)s.ref=ref;};
  const at=(title)=>find(title);

  if(!options.incense){
    initialProps.thurible.h=true;
    steps.forEach(s=>{
      delete (s.mv||{}).T;
      delete (s.acts||{}).T;
      delete (s.props||{}).thurible;
      s.smoke=[];
    });
    const gospel=at('The Gospel');
    gospel.acts.D=gospel.acts.D.filter(a=>!a[0].includes('incenses'));
    gospel.props={};
    describe(gospel,'At the ambo the Gospel minister greets the people, signs the book and then the forehead, lips and breast. The faithful sign themselves likewise. After proclaiming the Gospel and its acclamation, the minister kisses the book and says the prescribed prayer quietly. No incense is used.');
    const acclamation=at('Gospel Acclamation & Blessing of the Deacon');
    acclamation.acts.P=acclamation.acts.P.filter(a=>!a[0].includes('incense'));
    describe(acclamation,'All rise for the Gospel Acclamation. The Deacon bows before the Priest and asks for his blessing in a low voice. After the blessing he takes the Book of the Gospels from the altar and carries it to the ambo, accompanied by candle-bearers if present. No incense is used.');
    for(const title of ['Consecration: the Host','Consecration: the Chalice']){
      const s=at(title);
      describe(s,s.text.replace(/, and the host incensed,/,',').replace('The bell may be rung and incense offered as before.','The bell may be rung as before.'));
    }
  }
  applyCrossPlacement(steps,options);

  if(!options.deacon){
    initialProps.gospels=options.lector?{by:'L'}:{at:[500,176]};
    const reverence=at('Reverence to the Altar');
    if(options.lector){
      reverence.mv.L=[
        M([[490,214]],.22,.34),
        M([[375,214],[375,285],[420,322]],.45,.8)
      ];
      reverence.acts.L=[['places the Book on the altar',.34,.44]];
      describe(reverence,'The Priest and ministers bow profoundly. The lector places the Book of the Gospels on the altar, while the Priest goes around to venerate the altar with a kiss. The cross and candles are set in place if carried.','GIRM 122-123, 194-195');
    }else{
      describe(reverence,'The Priest and any ministers bow profoundly. The Priest venerates the altar with a kiss. The Book of the Gospels is already on the altar. The cross and candles are set in place if carried.','GIRM 122-123');
    }
    const acclamation=at('Gospel Acclamation & Blessing of the Deacon');
    acclamation.title='Gospel Acclamation & Preparation';
    acclamation.mv.P=[
      M([[500,100]],.04,.2),
      M([[375,110],[375,212],[482,214]],.32,.58),
      M([[300,236],AMBO],.64,.9)
    ];
    acclamation.acts.P=[
      ['prays quietly for worthy proclamation',.22,.32],
      ['takes up the Book of the Gospels',.58,.64]
    ];
    if(options.incense){
      acclamation.acts.P.unshift(['puts incense in the thurible',.04,.2]);
    }
    acclamation.props.gospels=[{by:'P',t:.6}];
    describe(acclamation,'All rise and sing the Gospel Acclamation. With no Deacon, the Priest prepares to proclaim the Gospel himself. If incense is used he puts it into the thurible and blesses it. Bowing before the altar, he says the preparatory prayer quietly, takes the Book of the Gospels and goes to the ambo. No blessing of a Deacon takes place.','GIRM 131-134');
    const gospel=at('The Gospel');
    gospel.acts.P=gospel.acts.D;
    delete gospel.acts.D;
    describe(gospel,'The Priest greets the people at the ambo, signs the book and then his forehead, lips and breast; all sign themselves likewise. '+(options.incense?'He incenses the book, then ':'He then ')+'proclaims the Gospel. After the acclamation, he kisses the book and says the prescribed prayer quietly.','GIRM 134');
    const homily=at('Homily');
    homily.mv.P=[M([[300,252],[375,210],[375,90],CHAIR],0,.3)];
    homily.props.gospels=[{at:[210,246],a:0,b:.1}];
    describe(homily,'After leaving the Book of the Gospels at a fitting place by the ambo, the Priest returns to the chair and gives the Homily. A period of silence follows.','GIRM 66, 136');
    const prayer=at('Universal Prayer (Prayer of the Faithful)');
    if(options.lector){
      prayer.mv.L=M([[420,296],[255,285],[255,222],AMBO],.1,.3);
      prayer.say=prayer.say.map(([who,...rest])=>[who==='D'?'L':who,...rest]);
    }else{
      prayer.say=prayer.say.map(([who,...rest])=>[who==='D'?'P':who,...rest]);
    }
    describe(prayer,'The Priest introduces the prayer at the chair. '+(options.lector?'The lector announces the intentions from the ambo.':'With no lector or Deacon, the Priest announces the intentions himself.')+' The people respond. The Priest concludes the prayer with hands extended.','GIRM 69-71, 138');
    const preparation=at('Preparation of the Altar');
    preparation.mv.P=M([[625,90],[625,122],ALT_P],0,.35);
    if(options.lector)preparation.mv.L=M([[255,222],[275,300],[420,322]],0,.3);
    preparation.acts.P=[['arranges the altar',.46,.6]];
    describe(preparation,'The Offertory Chant begins. The Priest goes to the altar, where the ministers bring the corporal, purificator, chalice, pall and Missal. Without a Deacon, the Priest arranges them.','GIRM 139');
    const gifts=at('Presentation of the Gifts');
    gifts.props.wine=[{by:'P',t:.58}];
    gifts.acts.P=[['receives the bread and wine',.53,.62]];
    describe(gifts,'The faithful bring the bread and wine forward. The Priest receives both gifts, helped by a server if present, and brings them to the altar.','GIRM 140');
    const offering=at('Offering of the Bread and Wine');
    offering.acts.P.unshift(['pours wine and a little water into the chalice',.5,.62]);
    describe(offering,'The Priest holds the paten slightly raised and prays the blessing over the bread. He pours wine and a little water into the chalice, saying the prescribed prayer quietly, then holds the chalice slightly raised and prays the blessing over the wine. He places it on the corporal and bows profoundly for the quiet prayer.','GIRM 141-143');
    if(options.incense){
      const incensing=at('Incensing the Gifts, Altar, Priest and People');
      incensing.mv.S=incensing.mv.D;
      incensing.acts.S=incensing.acts.D;
      incensing.props.thurible=incensing.props.thurible.map(e=>({...e,by:e.by==='D'?'S':e.by}));
      incensing.smoke=incensing.smoke.map(([role,...rest])=>[role==='D'?'S':role,...rest]);
      describe(incensing,'The Priest incenses the offerings, the cross and the altar. A server then incenses the Priest and the people.','GIRM 144');
    }
    const doxology=at('Concluding Doxology');
    doxology.acts.P=[['raises the paten and chalice together',.1,.72]];
    describe(doxology,'With no Deacon, the Priest raises both the paten with the Host and the chalice. He alone sings or says the doxology, and the people acclaim Amen.','GIRM 151');
    const peace=at('Rite of Peace');
    if(options.servers){
      peace.mv.S=[M([[550,120]],.65,.72),M([HOME.S],.88,1)];
      peace.acts.P=[['offers the sign of peace to a server',.7,.86]];
    }else{
      peace.acts.P=[];
    }
    describe(peace,'The Priest prays for peace, greets the people and, if appropriate, invites them to offer the sign of peace. '+(options.servers?'He may offer the sign to a server while remaining in the sanctuary.':'No minister approaches the altar; the faithful exchange the sign of peace.') ,'GIRM 154');
    const purification=at('Purification & Sacred Silence');
    purification.mv.P=[
      M([[640,140],[838,140]],.08,.35),
      M([[700,90],CHAIR],.8,1)
    ];
    purification.acts.P=[['purifies the sacred vessels',.36,.75]];
    purification.props.chalice=[{by:'P',t:.1},{at:[888,128],a:.75,b:.8}];
    purification.props.bread=[{by:'P',t:.1},{hide:true,t:.3}];
    describe(purification,'The Priest reserves the remaining hosts, consumes any remaining Precious Blood and purifies the sacred vessels at the credence table. He then returns to the chair. Sacred silence follows. Reservation is indicated schematically, rather than a separate procession.','GIRM 163-164');
    const dismissal=at('Dismissal & Veneration of the Altar');
    describe(dismissal,'With no Deacon, the Priest himself dismisses the people, who reply. He then venerates the altar with a kiss.','GIRM 168-169');
    for(const s of steps){
      s.say=(s.say||[]).map(([who,...rest])=>[who==='D'?'P':who,...rest]);
      for(const events of Object.values(s.props||{})){
        for(const event of events)if(event.by==='D')event.by='P';
      }
    }
  }

  if(!options.lector){
    const readingTitles=['First Reading','Responsorial Psalm','Second Reading'];
    readingTitles.forEach((title,i)=>{
      const s=at(title);
      s.mv={};
      if(i===0)s.mv.P=M([[375,110],[260,285],[255,222],AMBO],0,.25);
      s.say=s.say.map(([who,...rest])=>[who==='L'||who==='Ps'?'P':who,...rest]);
      describe(s,(i===1?'The Priest leads the Responsorial Psalm at the ambo; the people make the response.':'With no other reader available, the Priest proclaims this reading at the ambo; the people sit and listen. At its end they reply to the acclamation.') ,'GIRM 59, 61, 128-130');
    });
    const acclamation=steps.find(s=>s.key===12);
    acclamation.mv.P=options.deacon
      ? M([[255,222],[375,110],CHAIR],0,.22)
      : [M([[255,222],[375,110],[500,100]],0,.2),...segs(acclamation.mv.P).slice(1)];
  }

  if(!options.servers){
    initialProps.cross={at:CROSS_STANDS[options.crossStand].at.slice()};
    initialProps.cand1={at:[388,140]};
    initialProps.cand2={at:[612,140]};
    initialProps.missal={at:[545,82]};
    initialProps.ewer={at:[640,126]};
    const collect=at('Collect');
    collect.props={};
    describe(collect,'At the chair, the Priest says Let us pray with hands joined. All pray silently for a while. With hands extended he says the Collect from a book on a stand beside the chair. The people acclaim Amen. No server holds the book.','GIRM 54, 127');
    const preparation=at('Preparation of the Altar');
    const minister=options.deacon?'D':'P';
    preparation.mv[minister]=[
      M([[560,82]],0,.12),
      M([[700,90],[838,130]],.15,.35),
      M([[640,140],minister==='D'?ALT_D:ALT_P],.48,.68)
    ];
    preparation.props={
      missal:[{by:minister,t:.12},{at:[570,160],a:.7,b:.76}],
      corporal:[{by:minister,t:.4},{at:[500,168],a:.72,b:.78}],
      chalice:[{by:minister,t:.4},{at:[540,170],a:.74,b:.8}]
    };
    preparation.acts={[minister]:[['prepares the altar and vessels',.68,.85]]};
    describe(preparation,'With no servers, the '+(options.deacon?'Deacon':'Priest')+' brings the book and vessels from their stands and the credence table, then prepares the altar. The Offertory Chant accompanies the preparation.','GIRM 139, 178');
    const offering=at('Offering of the Bread and Wine');
    const mixer=options.deacon?'D':'P';
    offering.props.wine=[{by:mixer,t:.5},{at:[640,142],a:.63,b:.68}];
    describe(offering,offering.text+' The cruets are within reach on a side stand; no server approaches.');
    const washing=at('Washing of Hands');
    washing.mv.P=[M([[630,122]],0,.2),M([ALT_P],.76,.9)];
    washing.props={};
    describe(washing,'At the side of the altar, the Priest washes his hands, saying the prescribed prayer quietly. With no server to pour, the water, basin and towel are arranged within reach on a side stand. The practical handling is simplified in this animation.','GIRM 145');
    const purification=at('Purification & Sacred Silence');
    const purifier=options.deacon?'D':'P';
    purification.props.corporal=[{by:purifier,t:.1},{at:[866,120],a:.75,b:.8}];
    for(const s of steps){
      for(const key of ['cross','cand1','cand2','ewer'])delete (s.props||{})[key];
      s.bell=[];
      if(s.props?.missal){
        s.props.missal=s.props.missal.filter(e=>e.by!=='S');
      }
    }
    const reverence=at('Reverence to the Altar');
    describe(reverence,reverence.text.replace('The cross and candles are set in place if carried.','The cross and candles are already in place.').replace('The cross and candles are set in place if carried.',''));
    const gospelPreparation=steps.find(s=>s.key===12);
    gospelPreparation.text=gospelPreparation.text.replace(', accompanied by candle-bearers if present','');
    for(const title of ['Consecration: the Host','Consecration: the Chalice']){
      const s=at(title);
      s.text=s.text.replace(/The bell may be rung[^.]*\./g,'No bell or incense is used in this scenario.');
    }
  }

  const entrance=at('Entrance Procession');
  describe(entrance,'The people stand as the Entrance Chant is sung. '+(options.servers?(options.incense?'The thurifer leads, followed by ':'The procession begins with ')+'the cross between two candles. ':'The cross and candles are already in place; no servers process. ')+(options.lector?(options.deacon?'The lector follows. ':'The lector carries the Book of the Gospels. '):'')+(options.deacon?'The Deacon carries the Book of the Gospels, followed by the Priest.':'The Priest comes last; no Deacon is present.'),'GIRM 120-123, 194');
  if(options.deacon&&!options.servers){
    describe(at('Reverence to the Altar'),'The Priest, Deacon and any other ministers bow profoundly. The Deacon places the Book of the Gospels on the altar. The Priest and Deacon then venerate the altar with a kiss. The cross and candles are already in place.','GIRM 122-123, 173');
  }
  const epiclesis=at('Epiclesis');
  describe(epiclesis,'The Priest extends his hands over the offerings, invokes the Holy Spirit, and makes the Sign of the Cross over the bread and chalice. The faithful kneel according to the custom illustrated here. '+(options.deacon?'The Deacon kneels from the epiclesis until after the chalice is shown. ':'')+(options.servers?'A server may ring a bell before the consecration.':'No server rings a bell.'),'GIRM 43, 79c, 150, 179');
  const mystery=at('The Mystery of Faith');
  describe(mystery,'The Priest announces the mystery of faith, and the people make the acclamation.'+(options.deacon?' The Deacon rises.':''),'GIRM 151, 179');
  const communion=at('Holy Communion');
  if(!options.bothKinds){
    communion.props.chalice=[{at:[540,170],a:0,b:.01}];
    communion.say=communion.say.filter(([who])=>who!=='D');
    if(!options.deacon){
      communion.say=communion.say.filter(([,text])=>text!=='The Blood of Christ.');
      communion.acts.P=communion.acts.P.filter(a=>!a[0].includes('Deacon'));
    }
    if(options.deacon)communion.mv.D=[M([[500,114]],.13,.2),M([DCHAIR],.22,.32),M([ALT_D],.92,1)];
    communion.mv.P=[
      M([[625,122],[625,262],[500,292]],.22,.32),
      M([[625,262],[625,122],ALT_P],.92,1)
    ];
  }
  describe(communion,'The Priest receives the Body and Blood of Christ. '+(options.deacon?'He then gives Communion to the Deacon. ':'')+'The faithful approach in procession. '+(options.bothKinds?'The Priest distributes the Host; the Deacon ministers the chalice.':'The Priest distributes the Host; the chalice remains on the altar. No extraordinary minister is assumed.')+' Each communicant replies Amen. The Communion Chant accompanies the procession.','GIRM 158-161, 182, 284');
  communion.special.bothKinds=options.bothKinds;

  if(options.servers){
    const carriedCross=team.includes('X');
    const carriedCandles=team.includes('C1');
    const combinedThurifer=serverCount<5&&options.incense;
    if(!carriedCross)initialProps.cross={at:CROSS_STANDS[options.crossStand].at.slice()};
    if(!carriedCandles){
      initialProps.cand1={at:[388,140]};
      initialProps.cand2={at:[612,140]};
    }
    if(combinedThurifer){
      initialProps.thurible={by:'S'};
      initialPos.S=START_POS.T;
      // These phases need the incense route rather than the general server route.
      const incenseRoute=new Set([0,2,12,13,24,25,26,27,28,29,39,40]);
      for(const step of steps){
        if(incenseRoute.has(step.key)&&step.mv?.T){
          step.mv.S=step.mv.T;
        }
        if(step.acts?.T){
          step.acts.S=[...(step.acts.S||[]),...step.acts.T];
        }
        step.smoke=(step.smoke||[]).map(([role,...rest])=>[role==='T'?'S':role,...rest]);
        for(const events of Object.values(step.props||{})){
          for(const event of events)if(event.by==='T')event.by='S';
        }
        if([26,27].includes(step.key)){
          step.bell=[];
          step.acts.S=(step.acts.S||[]).filter(([text])=>!text.includes('rings the bell'));
          step.text=step.text.replace(/The bell may be rung[^.]*\./g,'The combined server incenses the elevation; the bell is omitted to avoid simultaneous duties.');
        }
      }
      // Park the thurible while the same person handles books, vessels and water.
      for(const key of [3,14,21,30]){
        const step=steps.find(s=>s.key===key);
        (step.props??={}).thurible=[{at:[760,90],a:0,b:.06}];
      }
      for(const key of [12,24,39]){
        const step=steps.find(s=>s.key===key);
        if(!step.props?.thurible)(step.props??={}).thurible=[];
        step.props.thurible.unshift({by:'S',t:0});
      }
      const incensing=at('Incensing the Gifts, Altar, Priest and People');
      incensing.props.thurible.unshift({by:'S',t:0});
    }else if(serverCount===5){
      // The fifth server assists even when incense is not selected.
      initialPos.T=options.incense?START_POS.T:[500,700];
      if(!options.incense){
        at('Entrance Procession').mv.T=M([[500,310],HOME.T],0,.65);
        at('Recession').mv.T=M([[500,312],[500,860]],.44,.8);
      }
    }
    for(const step of steps){
      if(!carriedCross)delete (step.props||{}).cross;
      if(!carriedCandles){
        delete (step.props||{}).cand1;
        delete (step.props||{}).cand2;
      }
    }
    const entrance=at('Entrance Procession');
    entrance.text='The people stand as the Entrance Chant is sung. '+
      (options.incense?'The incense server leads. ':'')+
      (carriedCross?'A server carries the cross. ':'The cross is already in place. ')+
      (carriedCandles?'Two servers carry candles. ':'The altar candles remain in place. ')+
      (options.lector?(options.deacon?'The lector follows. ':'The lector carries the Book of the Gospels. '):'')+
      (options.deacon?'The Deacon carries the Book of the Gospels, followed by the Priest.':'The Priest comes last.');
    const reverence=at('Reverence to the Altar');
    reverence.text='The Priest and ministers make the appropriate reverence. '+
      (carriedCross?'The cross-bearer sets the cross in place. ':'The cross is already in place. ')+
      (carriedCandles?'The candle-bearers place the candles by the altar. ':'The candles are already in place. ')+
      (options.deacon?'The Deacon places the Book of the Gospels on the altar. The Priest and Deacon kiss the altar.':
        options.lector?'The lector places the Book of the Gospels on the altar. The Priest kisses the altar.':
        'The Book of the Gospels is already on the altar. The Priest kisses the altar.');
    if(!carriedCandles){
      const preparation=steps.find(s=>s.key===12);
      preparation.text=preparation.text.replace(', accompanied by candle-bearers if present','')+' No candle-bearers accompany the Gospel in this setup.';
    }
  }

  applyOptionalElements(steps,options,initialProps,find);
  applyParishMinistries(steps,options,initialPos,initialProps);

  for(const s of steps){
    for(const field of ['mv','acts','orans']){
      for(const role of Object.keys(s[field]||{}))if(!visible.has(role))delete s[field][role];
    }
    s.say=(s.say||[]).filter(([who])=>who==='ppl'||visible.has(who));
    for(const [name,events] of Object.entries(s.props||{})){
      const bad=events.find(e=>e.by&&!visible.has(e.by));
      if(bad)throw new Error(`Unassigned ${name} in ${s.title}: ${bad.by}`);
    }
  }
  const removed=new Set(options.incense?[]:[2,20]);
  if(!options.gloria)removed.add(7);
  if(!options.creed)removed.add(15);
  if(!options.secondReading)removed.add(11);
  if(options.introductory!=='A')removed.add(6);
  const filtered=steps.filter(s=>!removed.has(s.key));
  STEPS.splice(0,STEPS.length,...filtered);
  rebuildTimeline(initialPos,initialProps);
  const assignments=team.map(role=>{
    if(role==='S')return 'Server 1: book, vessels, water and bell'+(serverCount<5&&options.incense?'; also incense (no bell during elevations)':'')+'.';
    if(role==='X')return 'Server 2: processional cross.';
    if(role==='T')return options.incense?'Server 5: incense.':'Server 5: additional assistant.';
    return 'Server '+(team.indexOf(role)+1)+': processional candle.';
  });
  return {options,visible,assignments,team};
}

// Parish options share the original step keys so audio and training references remain stable.
function applyParishMinistries(steps,options,initialPos,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  const route=(from,to,a,b)=>M([[110,from[1]],[110,290],[255,290],[255,222],to],a,b);
  const homeward=(home,a,b)=>M([[255,222],[255,290],[110,290],[110,home[1]],home],a,b);
  if(options.lector){
    if(!options.lectorProcession){
      initialPos.L=HOME.L.slice();
      for(const key of [0,1,39,40]){
        delete at(key).mv?.L;
        delete at(key).acts?.L;
      }
      if(!options.deacon){
        initialProps.gospels={at:[500,176]};
        delete at(1).props?.gospels;
      }
      at(0).text=at(0).text.replace(/The lector follows\. |The lector carries the Book of the Gospels\. /g,'The readers are already in their pews. ');
      at(1).text=at(1).text.replace('The lector places the Book of the Gospels on the altar.','The Book of the Gospels is already on the altar.');
    }
    at(9).mv.L=route(HOME.L,AMBO,0,.25);
    at(10).mv.L=homeward(HOME.L,0,.25);
    at(10).mv.Ps=route(HOME.Ps,AMBO,.15,.42);
    at(11).mv.Ps=homeward(HOME.Ps,0,.25);
    at(11).mv.L=route(HOME.L,AMBO,.12,.38);
    at(12).mv.L=homeward(HOME.L,0,.2);
    if(!options.secondReading)at(12).mv.Ps=homeward(HOME.Ps,0,.2);
    if(!options.deacon){
      at(16).mv.L=route(HOME.L,AMBO,.1,.3);
      at(17).mv.L=homeward(HOME.L,0,.3);
    }
    if(options.lectorProcession)at(1).mv.L=homeward(HOME.L,.45,.9);
    if(options.readerCount===2){
      at(11).mv.L2=at(11).mv.L;delete at(11).mv.L;
      at(11).say=at(11).say.map(([role,...rest])=>[role==='L'?'L2':role,...rest]);
      at(12).mv.L2=homeward(HOME.L2,0,.2);delete at(12).mv.L;
      at(11).text+=' A second reader comes from their pew for this reading.';
    }
  }
  // The celebrant can choose either legitimate preaching place during the game.
  at(14).acts.P=[['preaches the homily',.3,.86]];
  at(14).homilyPlaces=[AMBO.slice(),CHAIR.slice()];
  at(14).mv.P=M([AMBO],0,.28);
  (at(15).mv??={}).P=M([CHAIR],0,.2);
  if(!options.creed)at(16).mv.P=M([CHAIR],0,.2);
  const gifts=at(18);
  if(options.giftsProcession){
    gifts.acts.P=[['receives the bread and wine, assisted by the ministers',.53,.62]];
    gifts.props.wine=[{by:'P',t:.58},...(options.deacon?[{by:'D',t:.64}]:[])];
    gifts.text+=' The Priest receives both bread and wine, assisted by the Deacon or another minister. Other offerings for the Church and the poor are placed away from the altar.';
  }
  if(options.collection){
    initialProps.collection={by:'U'};
    const collection={key:17.5,part:'Liturgy of the Eucharist',title:'Taking up the Collection',dur:20,posture:'sit',
      text:'An usher takes up the collection for the Church and the poor. One figure represents the collection team. Money is placed at a suitable place away from the altar.',
      ref:'GIRM 73, 105c; judgement call on timing',
      acts:{U:[['begins taking up the collection',0,.12],['collects the offerings from the pews',.12,.85]]},
      mv:{U:M([[890,700],[890,370],[110,330],[110,700],[890,745]],.12,.92)},
      props:{collection:[{by:'U',t:0}]},say:[]};
    steps.splice(steps.indexOf(gifts),0,collection);
    gifts.mv.U=[M([[890,300],[700,280]],0,.5),M([[890,300],HOME.U],.65,1)];
    gifts.acts.U=[['presents the collection and sets it beside the sanctuary, not on the altar',.5,.65]];
    gifts.props.collection=[{at:[710,280],a:.55,b:.6}];
    (gifts.acts.P??=[]).push(['acknowledges the other offerings for the Church and the poor',.63,.68]);
  }
  // The Priest incenses the offerings first; the assisting minister then incenses him before the people.
  const incense=at(20),minister=options.deacon?'D':'S';
  if(options.incense){
    incense.acts[minister]=[['receives the thurible from the Priest',.64,.69],['incenses the Priest',.7,.79],['incenses the people',.86,.95]];
    incense.mv[minister]=[M([[605,155]],.62,.7),M([[625,262],[500,282]],.79,.86),M([minister==='D'?ALT_D:HOME.S],.96,1)];
    incense.face??={};
    incense.face[minister]=[[ALT_P,.7,.79],[[500,500],.86,.95]];
    const thurifer=options.serverCount<5?'S':'T';
    incense.props.thurible=[{by:'P',t:.14},{by:minister,t:.69},{by:thurifer,t:.96}];
    incense.smoke=[[thurifer,0,.14],['P',.14,.69],[minister,.69,.96],[thurifer,.96,1]];
    incense.posture=[['sit',0],['stand',.82]];
    incense.text+=' The assisting minister receives the thurible, turns to incense the Priest first, then turns towards the people.';
  }
  const peace=at(32);
  peace.dur=22;
  peace.special={type:'peace',a:.65,b:1};
  peace.text+=' A short interval is allowed for neighbours to exchange the sign of peace without leaving their places.';
  for(const key of [38,39,40])at(key).posture='stand';
  const communion=at(35),purification=at(36);
  const ordinary=options.deacon?'D':'P';
  if(options.reservedCommunion){
    const fetch={key:34.5,part:'Communion Rite',title:'Fetching Reserved Hosts',dur:12,posture:'kneel',
      ref:'GIRM 85, 163, 182; local practice',
      text:'If additional hosts are needed, the Deacon (or Priest) goes to the tabernacle, genuflects, opens it and brings the reserved ciborium. Prefer Communion from hosts consecrated at this Mass. An EMHC does not take the vessel independently.',
      mv:{[ordinary]:[M([[375,110],[137,110],[137,85]],0,.32),M([[137,110],[375,110],ordinary==='D'?ALT_D:ALT_P],.58,.95)]},
      acts:{[ordinary]:[['genuflects before opening the tabernacle',.32,.42],['takes the reserved ciborium and closes the tabernacle',.43,.57]]},
      face:{[ordinary]:[[[137,85],.32,.57]]},
      props:{ciborium:[{hide:false,t:.43},{by:ordinary,t:.43},{at:[580,170],a:.95,b:1}]},say:[]};
    steps.splice(steps.indexOf(communion),0,fetch);
    initialProps.ciborium={at:[137,85],h:true};
  }else if(options.emhc)initialProps.ciborium={at:[866,152]};
  if(options.emhc){
    communion.dur=32;
    communion.mv.E=[M([[890,402],[890,300],[625,240],[580,210]],.14,.24),M([[625,262],[620,292]],.3,.36),M([[625,262],[580,210]],.9,.98)];
    communion.acts.E=[['approaches only after the Priest has received Communion',.14,.24],['receives Communion and the ciborium from the Priest',.25,.3],['distributes Holy Communion',.36,.89]];
    communion.acts.P.push(['gives Communion and the ciborium to the EMHC',.25,.3]);
    communion.props.ciborium=[{by:'P',t:.24},{by:'E',t:.3},{by:ordinary,t:.98}];
    communion.say.push(['E','The Body of Christ.',.65,.72]);
    communion.special.emhc=true;
    communion.text+=' When assistance is genuinely needed, an authorised EMHC approaches after the Priest has received, receives Communion and the vessel from him, and helps distribute. The EMHC returns the vessel to the ordinary minister afterwards.';
  }
  // The Deacon is an ordinary minister of Communion: by default he gives the Host at a second station.
  if(options.deaconCommunion&&!options.bothKinds){
    communion.mv.D=[M([[500,114]],.13,.2),M([[375,122],[375,262],[530,292]],.22,.32),M([[375,262],[375,122],ALT_D],.92,1)];
    communion.mv.P=[M([[625,122],[625,262],[470,292]],.22,.32),M([[625,262],[625,122],ALT_P],.92,1)];
    communion.acts.D=[['receives Communion from the Priest',.13,.2],['takes a ciborium and distributes Holy Communion',.2,.9]];
    communion.props.ciborium2=[{hide:false,t:.19},{by:'D',t:.2},{at:[455,170],a:.985,b:1}];
    communion.say.push(['D','The Body of Christ.',.52,.6]);
    communion.special.deaconHosts=true;
    purification.props.ciborium2=[{by:'D',t:.02},{hide:true,t:.33}];
    communion.text+=' The Deacon, an ordinary minister of Holy Communion, gives the Host at a second station.';
    communion.ref+='; GIRM 108, 182';
  }
  // Show reservation explicitly instead of hiding the remaining hosts at the credence.
  purification.dur=22;
  purification.mv[ordinary]=[
    M([[375,110],[137,110],[137,85]],.04,.23),
    M([[137,110],[375,110],[838,140]],.4,.57),
    M([[700,95],ordinary==='D'?DCHAIR:CHAIR],.9,1)
  ];
  purification.acts[ordinary]=[
    ['opens the tabernacle and reposes the remaining hosts',.24,.33],
    ['closes the tabernacle and genuflects',.34,.4],
    ['consumes remaining Precious Blood and purifies the vessels',.6,.88]
  ];
  purification.face??={};
  purification.face[ordinary]=[[[137,85],.23,.4]];
  purification.props.bread=[{by:ordinary,t:.02},{hide:true,t:.33}];
  purification.props.chalice=[{at:[540,170],a:0,b:.01},{by:ordinary,t:.57},{at:[888,128],a:.88,b:.9}];
  if(options.emhc||options.reservedCommunion)purification.props.ciborium=[{by:ordinary,t:.02},{hide:true,t:.33}];
  purification.text='After distribution, the '+(options.deacon?'Deacon':'Priest')+' reposes remaining hosts in the tabernacle, closes it and genuflects. Remaining Precious Blood is consumed, never reserved. The sacred vessels are purified by the Priest, Deacon or instituted acolyte, not a lay EMHC. Sacred silence follows.';
  purification.ref='GIRM 163-164, 182-183, 192, 279';
}

function chooseHomilyPlace(point){
  const homily=STEPS.find(s=>s.key===14);
  if(!homily)return;
  const ambo=Math.hypot(point[0]-AMBO[0],point[1]-AMBO[1])<60;
  homily.mv.P=M([ambo?AMBO:CHAIR],0,.28);
  rebuildTimeline(starts[0].pos,starts[0].props);
}

// Optional elements chosen for a particular celebration (used by the game and the 3D setup).
function applyOptionalElements(steps,options,initialProps,find){
  const byKey=key=>steps.find(s=>s.key===key);
  const team=new Set(options.serverCount>0?[[],['S'],['S','X'],['S','C1','C2'],['S','X','C1','C2'],['S','X','C1','C2','T']][options.serverCount]:[]);
  const hasS=team.has('S');

  if(!options.secondReading){
    // The psalmist returns during the acclamation; the lector is already seated.
    const acclamation=byKey(12);
    delete acclamation.mv.L;
    acclamation.mv.Ps=M([[250,296],[380,300],[380,322]],0,.2);
  }

  const penitential=byKey(5);
  if(options.introductory==='C'){
    penitential.title='Penitential Act (invocations)';
    penitential.text='The Priest invites the faithful to the Penitential Act and a brief silence follows. A minister or the Priest then sings or says invocations addressed to Christ, each answered by "Lord, have mercy" or "Christ, have mercy". The absolution follows. Because the invocations already include the Kyrie, it is not repeated.';
    penitential.ref='Order of Mass 4–6 (form C); GIRM 51–52';
    penitential.say=[['P','(invites all to acknowledge their sins)',.04,.18],['ppl','(brief silence)',.18,.28],
      [options.deacon?'D':'P','(invocation to Christ) … Lord, have mercy.',.3,.42],['ppl','Lord, have mercy.',.42,.5],
      [options.deacon?'D':'P','(invocation) … Christ, have mercy.',.5,.6],['ppl','Christ, have mercy.',.6,.68],
      [options.deacon?'D':'P','(invocation) … Lord, have mercy.',.68,.76],['ppl','Lord, have mercy.',.76,.84],
      ['P','May almighty God have mercy on us, forgive us our sins, and bring us to everlasting life.',.85,.94],['ppl','Amen.',.94,1]];
  }else if(options.introductory==='sprinkling'){
    penitential.title='Blessing and Sprinkling of Water';
    penitential.dur=22;
    penitential.text='On Sundays, especially in Easter Time, the blessing and sprinkling of water may replace the Penitential Act. The Priest blesses the water, then goes through the church sprinkling the ministers and the people while an antiphon such as "Asperges me" or "Vidi aquam" is sung. Returning to the chair he says the concluding prayer. The Kyrie is omitted.';
    penitential.ref='Roman Missal, Appendix II; GIRM 51';
    const aisle=(x,a,b)=>M([[x+125,90],[x+125,262],[x,300],[x,650],[x,300],[x+125,262],[x+125,90]],a,b);
    penitential.mv={P:[aisle(500,.3,.82),M([CHAIR],.82,.86)]};
    penitential.acts={P:[['blesses the water',.1,.28],['sprinkles himself, the ministers and the people',.3,.82]]};
    if(hasS){
      penitential.mv.S=[M([[850,140]],0,.07),M([[540,72]],.1,.22),aisle(520,.3,.82),M([[540,72]],.82,.86),M([[850,140]],.87,.94),M([HOME.S],.95,1)];
      penitential.props={ewer:[{by:'S',t:.07},{at:[850,144],a:.94,b:.95}]};
      penitential.acts.S=[['carries the holy-water vessel',.08,.94]];
    }
    if(options.deacon){
      penitential.mv.D=[aisle(480,.3,.82),M([DCHAIR],.82,.86)];
      penitential.acts.D=[['accompanies the Priest',.3,.82]];
    }
    penitential.say=[['P','(invites all to pray that God will bless this water)',.03,.1],['P','(prayer of blessing over the water)',.12,.27],['ppl','Amen.',.27,.3],
      ['ppl','♪ Asperges me… / Vidi aquam… ♪',.3,.82],['P','May almighty God cleanse us of our sins, and through the celebration of this Eucharist make us worthy to share at the table of his Kingdom.',.86,.96],['ppl','Amen.',.96,1]];
  }

  if(options.music==='said'){
    // GIRM 48 and 87: antiphons are recited when there is no singing; GIRM 63c: the Alleluia may be omitted if not sung.
    byKey(0).say=[['ppl','(the Entrance Antiphon is recited)',.75,1]];
    byKey(1).say=[];
    byKey(2).say=[];
    byKey(12).say=[];
    for(const key of [17,18])byKey(key).say=[];
    byKey(35).say=byKey(35).say.map(line=>line[1].includes('Communion Chant')?['ppl','(the Communion Antiphon is recited)',...line.slice(2)]:line);
    byKey(39).say=byKey(39).say.filter(line=>!line[1].includes('hymn'));
    byKey(40).say=[];
    for(const step of steps){
      step.say=(step.say||[]).map(([who,text,...rest])=>[who,text.replace(/♪\s*/g,'').replace(/\s*♪/g,'').trim(),...rest]);
    }
    byKey(12).text+=' At a said Mass the Alleluia, if not sung, may be omitted.';
  }

  if(options.bells.start)byKey(0).bell=[[0,.06]];
  if(!options.bells.epiclesis)byKey(25).bell=[];
  if(!options.bells.elevation){
    for(const key of [26,27]){
      const step=byKey(key);
      step.bell=[];
      if(step.acts?.S)step.acts.S=step.acts.S.filter(([text])=>!text.includes('rings the bell'));
    }
  }

  if(options.solemnBlessing){
    const blessing=byKey(38);
    blessing.title='Greeting & Solemn Blessing';
    blessing.dur=14;
    blessing.say=[['P','The Lord be with you.',.02,.1],['ppl','And with your spirit.',.1,.17],
      [options.deacon?'D':'P','Bow down for the blessing.',.18,.25],
      ['P','(first invocation of the Solemn Blessing)',.26,.38],['ppl','Amen.',.38,.42],
      ['P','(second invocation)',.42,.52],['ppl','Amen.',.52,.56],
      ['P','(third invocation)',.56,.66],['ppl','Amen.',.66,.7],
      ['P','And may the blessing of almighty God, the Father, and the Son, ✠ and the Holy Spirit, come down on you and remain with you for ever.',.71,.9],['ppl','Amen.',.9,1]];
    blessing.orans={P:[[.26,.7]]};
    blessing.acts={P:[['extends hands over the people',.26,.7],['blesses the people ✠',.71,.9]]};
    blessing.text='The Priest greets the people. The Deacon, or the Priest himself, invites all to bow down for the blessing. With hands extended over the people the Priest says the invocations of the Solemn Blessing, each answered "Amen", and then blesses them.';
    blessing.ref='Order of Mass 143; GIRM 167, 185';
  }

  if(!options.giftsProcession){
    // GIRM 73 and 118: without a procession the bread and wine wait on the credence.
    initialProps.bread={at:[872,152]};
    initialProps.wine={at:[892,150]};
    const gifts=byKey(18);
    const bearer=hasS?'S':options.deacon?'D':'P';
    gifts.title='Bringing the Gifts to the Altar';
    gifts.mv={P:M([ALT_P],.05,.3)};
    if(options.deacon)gifts.mv.D=M([ALT_D],.05,.3);
    if(bearer==='S')gifts.mv.S=[M([[850,140]],0,.12),M([[640,150]],.2,.45),M([[850,100]],.62,.8),M([HOME.S],.82,.95)];
    else gifts.mv[bearer]=[M([[625,90],[850,140]],.05,.3),M([[625,122],bearer==='D'?ALT_D:ALT_P],.36,.6)];
    const pick=bearer==='S'?.12:.3;
    gifts.props={bread:[{by:bearer,t:pick},{at:[500,160],a:.48,b:.54}],wine:[{by:bearer,t:pick},{at:[600,165],a:.5,b:.56}]};
    gifts.acts={[bearer]:[['brings the bread and wine from the credence',pick,.56]]};
    gifts.text='With no procession of the faithful, the bread and wine are brought from the credence table to the altar'+(bearer==='S'?' by a server and received by the Priest.':bearer==='D'?' by the Deacon.':' by the Priest.');
    gifts.ref='GIRM 73, 118, 139–140';
    const offering=byKey(19);
    delete offering.mv.P;
    delete offering.mv.D;
    if(offering.props?.bread)offering.props.bread=[];
  }

  const prayer=options.eucharisticPrayer;
  for(const key of [23,24,25,26,27,28,29,30]){
    const step=byKey(key);
    if(step&&prayer!=='II'&&!/EP /.test(step.ref))step.ref+=' (EP '+prayer+')';
    if(step)step.eucharisticPrayer=prayer;
  }
  if(prayer==='IV'){
    byKey(23).text+=' Eucharistic Prayer IV has its own unchangeable Preface.';
  }else if(prayer==='I'){
    byKey(25).text+=' In the Roman Canon (EP I) the corresponding prayer begins "Be pleased, O God…" before the Institution narrative.';
  }
}

// Where the fixed crucifix hangs and where the processional cross is set up (GIRM 117, 122, 277).
const CRUCIFIX_PLACES={
  wall:{name:'On the wall behind the altar',face:[500,14],x:0,nearAltar:true},
  apse:{name:'In a recessed apse behind the altar',face:[500,10],x:0,recess:true,nearAltar:true},
  wallLeft:{name:'On the back wall, to the left',face:[260,14],x:-6},
  wallRight:{name:'On the back wall, to the right',face:[740,14],x:6},
  chapelLeft:{name:'In a recessed side chapel on the left',face:[260,10],x:-6,recess:true},
  none:{name:'No fixed crucifix (the processional cross serves)',face:null}
};
const CROSS_STANDS={
  right:{name:'Beside the altar, right',at:[670,126]},
  left:{name:'Beside the altar, left',at:[330,126]},
  backRight:{name:'Back of the sanctuary, right',at:[800,95]},
  backLeft:{name:'Back of the sanctuary, left',at:[250,95]}
};
const ALTAR_RING={FL:[375,232],BL:[375,108],BR:[625,108],FR:[625,232]};
const THURIFER_WAIT={BR:[660,94],FR:[662,246],BL:[340,94]};

// The cross the Priest incenses and the point where he stands to do it.
function incensedCross(options){
  const crucifix=CRUCIFIX_PLACES[options.crucifix]||CRUCIFIX_PLACES.wall;
  const stand=(CROSS_STANDS[options.crossStand]||CROSS_STANDS.right).at;
  if(crucifix.nearAltar)return {kind:'crucifix',at:crucifix.face,stop:[500,240],offertoryStop:[500,106],name:'the crucifix behind the altar'};
  const len=Math.hypot(500-stand[0],170-stand[1]);
  const stop=[Math.round(stand[0]+(500-stand[0])*45/len),Math.round(stand[1]+(170-stand[1])*45/len)];
  return {kind:'processional',at:stand,stop,offertoryStop:stop,name:'the processional cross'};
}

// A full circuit of the altar starting at the corner nearest the Priest; never ends at the front-left corner.
function altarCircuit(stop){
  const order=['FL','BL','BR','FR'];
  let start=0;
  order.forEach((corner,i)=>{
    const p=ALTAR_RING[corner],q=ALTAR_RING[order[start]];
    if(Math.hypot(p[0]-stop[0],p[1]-stop[1])<=Math.hypot(q[0]-stop[0],q[1]-stop[1]))start=i;
  });
  const names=[0,1,2,3,4].map(i=>order[(start+i)%4]);
  if(names[names.length-1]==='FL')names.push('BL');
  return {path:names.map(n=>ALTAR_RING[n].slice()),end:names[names.length-1]};
}

function applyCrossPlacement(steps,options){
  const stand=CROSS_STANDS[options.crossStand].at;
  const foot=[stand[0],stand[1]+16];
  const same=(p,q)=>p[0]===q[0]&&p[1]===q[1];
  const remap=p=>same(p,[670,126])?stand.slice():same(p,[670,142])?foot.slice():p;
  for(const step of steps){
    for(const value of Object.values(step.mv||{}))for(const seg of [].concat(value))seg.p=seg.p.map(remap);
    for(const events of Object.values(step.props||{}))for(const e of events)if(e.at)e.at=remap(e.at);
  }
  if(options.crossStand!=='right'){
    // Keep the cross-bearer clear of the altar on the way to and from another stand.
    const left=stand[0]<500;
    const reverence=steps.find(s=>s.key===1);
    reverence.mv.X=[M(left?[[350,240],foot]:[foot],.15,.33),M([[foot[0],92],[700,92],[640,55]],.45,.72)];
    steps.find(s=>s.key===39).mv.X=M([[700,92],[foot[0],92],foot],.55,.8);
    if(left)steps.find(s=>s.key===40).mv.X=M([[foot[0],250],[640,265]],0,.22);
  }
  const cross=incensedCross(options);
  const where=CROSS_STANDS[options.crossStand].name.toLowerCase();
  if(!options.incense)return;
  const entrance=steps.find(s=>s.key===2);
  if(entrance){
    const circuit=altarCircuit(cross.stop);
    const wait=THURIFER_WAIT[circuit.end];
    const thuriferRoute={BR:[wait],FR:[[640,128],wait],BL:[[546,94],wait]}[circuit.end];
    entrance.dur=16;
    entrance.mv={
      T:[M([[600,140],[546,130]],0,.06),M(thuriferRoute,.22,.34)],
      P:[M(cross.kind==='crucifix'?[[625,122],[625,232],cross.stop]:[cross.stop],.2,.3),M(circuit.path,.46,.88)]
    };
    entrance.props={thurible:[{by:'P',t:.17},{by:'T',t:.93}]};
    entrance.acts={
      P:[['puts incense in the thurible',.06,.14],['takes the thurible from the thurifer',.14,.19],['bows to the cross',.3,.33],['incenses the cross',.33,.42],['bows again to the cross',.42,.45],['incenses the altar, walking around it',.46,.88],['returns the thurible to the thurifer',.89,.95]],
      T:[['presents the thurible and boat',0,.14],['hands the thurible to the Priest',.14,.19],['receives the thurible back',.89,.95]]
    };
    entrance.face={P:[[cross.at,.3,.46]]};
    entrance.smoke=[['T',0,.17],['P',.17,.93],['T',.93,1]];
    entrance.cross=cross;
    entrance.text='If incense is used, the thurifer brings the thurible. The Priest puts in incense and blesses it, saying nothing, then takes the thurible. '+
      (cross.kind==='crucifix'
        ?'The crucifix stands behind the altar, so he incenses it from in front of the altar with three double swings, bowing before and after. '
        :'There is no crucifix on or near the altar here, so the processional cross, set up '+where+', serves as the altar cross: he goes to it, bows, incenses it with three double swings and bows again. ')+
      'Then he walks around the altar, incensing it with single swings, and returns the thurible to the thurifer.';
    entrance.ref='GIRM 49, 122–123, 276–277';
  }
  const offertory=steps.find(s=>s.key===20);
  if(offertory){
    const circuit=altarCircuit(cross.offertoryStop);
    const path=circuit.path;
    if(circuit.end==='FR')path.push(ALTAR_RING.BR.slice());
    path.push(ALT_P.slice());
    offertory.dur=18;
    offertory.posture=[['sit',0],['stand',.72]];
    offertory.mv.P=[M([cross.offertoryStop],.27,.31),M(path,.4,.68)];
    offertory.mv.D=[M([[470,96]],.7,.73),M([[375,110],[375,262],[500,282]],.75,.84),M([[375,262],[375,122],ALT_D],.93,1)];
    offertory.props={thurible:[{by:'P',t:.14},{by:'D',t:.7},{by:'T',t:.92}]};
    offertory.acts={P:[['incenses the offerings',.14,.26],['incenses the cross',.31,.38],['incenses the altar',.4,.68]],D:[['incenses the Priest',.7,.75],['incenses the people',.85,.92]]};
    offertory.face={P:[[cross.at,.31,.39]]};
    offertory.smoke=[['T',0,.14],['P',.14,.7],['D',.7,.92],['T',.92,1]];
    offertory.cross=cross;
    offertory.text+=cross.kind==='crucifix'?' The Priest turns to the crucifix behind the altar to incense it.':' The Priest incenses the processional cross where it stands ('+where+').';
  }
}

// Simplified Sunday calendar; vestment colours follow GIRM 346.
const VESTMENT_COLOURS={
  green:{name:'Green',hex:'#2e7d4f'},purple:{name:'Violet',hex:'#6a3d8f'},white:{name:'White',hex:'#f4f1e6'},
  red:{name:'Red',hex:'#b3262d'},rose:{name:'Rose',hex:'#d88ea2'},gold:{name:'Gold',hex:'#d4af37'}
};
function easterSunday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  return new Date(year,month-1,day);
}
// The Sunday on or after the given date.
function nextSunday(date=new Date()){
  const day=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  day.setDate(day.getDate()+(7-day.getDay())%7);
  return day;
}
const DAY_MS=864e5;
const daysBetween=(a,b)=>Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/DAY_MS);
// Season and colour of a Sunday, with the commonly used colour for the day.
function liturgicalDay(date){
  const y=date.getFullYear();
  const easter=easterSunday(y);
  const since=daysBetween(easter,date);
  const christmasDay=new Date(y,11,25);
  const advent1=new Date(y,10,27);advent1.setDate(advent1.getDate()+(7-advent1.getDay())%7);
  const baptism=new Date(y,0,7);baptism.setDate(baptism.getDate()+(7-baptism.getDay())%7);
  const info=(season,name,colour)=>({season,name,colour,hex:VESTMENT_COLOURS[colour].hex,colourName:VESTMENT_COLOURS[colour].name});
  if(date.getMonth()===10&&date.getDate()===1)return info('Ordinary Time','All Saints','white');
  if(date>=advent1&&date<christmasDay){
    const week=daysBetween(advent1,date)/7+1;
    return week===3?info('Advent','Third Sunday of Advent (Gaudete)','rose'):info('Advent','Advent Sunday '+week,'purple');
  }
  if(daysBetween(new Date(y,advent1.getMonth(),advent1.getDate()-7),date)===0)return info('Ordinary Time','Our Lord Jesus Christ, King of the Universe','white');
  if(date>=christmasDay)return info('Christmas','Christmas season','white');
  if(daysBetween(date,baptism)>=0)return info('Christmas','Christmas season (to the Baptism of the Lord)','white');
  if(since<-7&&since>=-46)return since===-21?info('Lent','Fourth Sunday of Lent (Laetare)','rose'):info('Lent','Lent','purple');
  if(since===-7)return info('Lent','Palm Sunday of the Passion of the Lord','red');
  if(since>=0&&since<49)return info('Easter','Easter season','white');
  if(since===49)return info('Easter','Pentecost','red');
  if(since===56)return info('Ordinary Time','The Most Holy Trinity','white');
  if(since===63)return info('Ordinary Time','The Most Holy Body and Blood of Christ','white');
  return info('Ordinary Time','Ordinary Time','green');
}
if(typeof module!=='undefined')module.exports={...(module.exports||{}),CRUCIFIX_PLACES,CROSS_STANDS,incensedCross,altarCircuit,easterSunday,nextSunday,liturgicalDay,VESTMENT_COLOURS};
