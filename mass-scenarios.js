const ORIGINAL_STEPS=JSON.parse(JSON.stringify(STEPS));
const SERVER_ROLES=['X','C1','C2','T','S'];
// The Bishop's bearers (Mass with the Bishop only): servers in vimps who carry the mitre and the staff.
const BEARER_ROLES=['MB','CB'];
const ROLE_NAMES={P:'Priest',D:'Deacon',X:'Cross-bearer',C1:'Candle-bearer',C2:'Candle-bearer',T:'Thurifer',S:'Server',L:'Lector',L2:'Second reader',Ps:'Psalmist',U:'Collection usher',E:'EMHC',G1:'Gift-bearer',G2:'Gift-bearer',MB:'Mitre-bearer',CB:'Crozier-bearer',K:'Candidate',SP:'Sponsor',BP:'Parent',GP:'Godparent',ppl:'People'};

// The rite registry: each rite builds its own STEPS and timeline. Mass is the default;
// other rites (mass-rite-exposition.js) register themselves here and use string step keys,
// so the numeric Mass keys used for special cases elsewhere never match them.
const RITES={mass:{name:'Holy Mass',build:buildMassScenario}};
// The Christmas crib stands in the nave, outside the presbyterium (Book of Blessings 1544).
const CRIB=[66,332];
function buildScenario(requested){
  const rite=RITES[requested?.rite]||RITES.mass;
  // A ritual Mass is not celebrated on a solemnity (GIRM 372): Christmas takes precedence over Confirmation.
  if(rite===RITES.mass&&requested?.nativity&&requested.confirmation)requested={...requested,confirmation:false};
  // Candlemas is modelled with the parish Priest presiding (see applyCandlemas).
  if(rite===RITES.mass&&requested?.candlemas&&!requested.nativity)requested={...requested,bishop:false,confirmation:false};
  // Ash Wednesday is likewise modelled with the parish Priest presiding (see applyAshWednesday).
  if(rite===RITES.mass&&requested?.ashWednesday&&!requested.nativity&&!requested.candlemas)requested={...requested,bishop:false,confirmation:false};
  // Baptism within Mass is modelled only at a parish Sunday Mass: the Bishop, Confirmation and the proper days take precedence.
  if(rite===RITES.mass&&requested?.baptism&&(requested.nativity||requested.candlemas||requested.ashWednesday||requested.bishop||requested.confirmation))requested={...requested,baptism:false};
  // The celebrant is named "Bishop" wherever ROLE_NAMES is shown when the Bishop presides.
  ROLE_NAMES.P=rite===RITES.mass&&(requested?.bishop||requested?.confirmation)?'Bishop':'Priest';
  return rite.build(requested||{});
}
function buildMassScenario(requested){
  // Christmas: a solemnity, with the Gloria and the Creed (GIRM 53, 68); Eucharistic Prayer IV has its own Preface (GIRM 365d).
  if(requested.nativity)requested={...requested,gloria:true,creed:true,eucharisticPrayer:requested.eucharisticPrayer==='IV'?'I':requested.eucharisticPrayer};
  // The Presentation of the Lord: the Gloria follows the procession (Roman Missal, 2 February, n. 7); the
  // feast has its own Preface (GIRM 365d); the entrance rites replace the Penitential Act. Only the parish
  // form is modelled, so a Bishop, Confirmation and Christmas are not combined with it.
  if(requested.candlemas&&!requested.nativity)requested={...requested,gloria:true,introductory:'A',bishop:false,confirmation:false,
    eucharisticPrayer:requested.eucharisticPrayer==='IV'?'III':requested.eucharisticPrayer};
  else if(requested.candlemas)requested={...requested,candlemas:false};
  // Ash Wednesday: no Gloria in Lent (GIRM 53) and no Creed; the blessing and giving of ashes after the
  // Homily take the place of the Penitential Act (Roman Missal, Ash Wednesday); a Lenten Preface (GIRM 365d).
  if(requested.ashWednesday&&!requested.nativity&&!requested.candlemas)requested={...requested,gloria:false,creed:false,introductory:'A',bishop:false,confirmation:false,
    eucharisticPrayer:requested.eucharisticPrayer==='IV'?'III':requested.eucharisticPrayer};
  else if(requested.ashWednesday)requested={...requested,ashWednesday:false};
  // Confirmation is conferred by the Bishop within Mass; the Creed is omitted because the faith has
  // already been professed (Ordo Confirmationis 31a) and its own blessing replaces the usual one (n. 33).
  if(requested.confirmation)requested={...requested,bishop:true,creed:false,solemnBlessing:true};
  // Baptism within Mass: the reception of the children replaces the greeting and the Penitential Act, the
  // profession of faith replaces the Creed, and the blessing may be taken from the rite (Ordo Baptismi Parvulorum 29).
  if(requested.baptism)requested={...requested,creed:false,solemnBlessing:true,introductory:'A'};
  // The Bishop is assisted by a Deacon (Pontificales ritus 6) and the readings are read by readers.
  if(requested.bishop)requested={...requested,deacon:true,lector:true};
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
    bishop:!!requested.bishop,
    confirmation:!!requested.confirmation,
    nativity:!!requested.nativity,
    candlemas:!!requested.candlemas,
    ashWednesday:!!requested.ashWednesday,
    baptism:!!requested.baptism,
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
  if(!options.bishop)BEARER_ROLES.forEach(a=>visible.delete(a));
  if(!options.confirmation){visible.delete('K');visible.delete('SP');}
  if(!options.baptism){visible.delete('BP');visible.delete('GP');}
  if(!options.servers)SERVER_ROLES.forEach(a=>visible.delete(a));
  const team=[
    [],['S'],['S','X'],['S','C1','C2'],
    ['S','X','C1','C2'],['S','X','C1','C2','T']
  ][serverCount];
  SERVER_ROLES.forEach(role=>{if(!team.includes(role))visible.delete(role);});
  if(!options.lector){visible.delete('L');if(!options.nativity)visible.delete('Ps');}
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
  if(options.nativity)applyNativity(steps,options);
  if(options.candlemas)applyCandlemas(steps,options,initialPos,initialProps);
  if(options.ashWednesday)applyAshWednesday(steps,options,initialProps);
  if(options.bishop)applyBishop(steps,options,initialProps);
  if(options.confirmation)applyConfirmation(steps,options,initialProps);
  if(options.baptism)applyBaptism(steps,options,initialPos,initialProps);

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
  if(options.candlemas)[3,4,5,6].forEach(key=>removed.add(key));
  if(options.ashWednesday)[5,6].forEach(key=>removed.add(key));
  if(options.baptism)[3,4,5,6].forEach(key=>removed.add(key));
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

// Mass with the Bishop. The Bishop wears the mitre and carries the pastoral staff in processions,
// wears the mitre when seated, for the homily and for the blessing, and takes the staff for the
// Gospel, the homily and the blessing (CB 59-60, judgement call to verify; Pontificales ritus 18-21).
// Servers in vimps hold the insignia when he lays them aside; they are never put on the altar.
function applyBishop(steps,options,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  initialProps.mitre={by:'P'};
  initialProps.staff={by:'P'};
  const MB_AT=[468,86],CB_AT=[532,86];
  const prop=(step,name,...events)=>{
    const list=((step.props??={})[name]??=[]);
    list.push(...events);
    list.sort((x,y)=>(x.t??x.a)-(y.t??y.a));
  };
  const act=(step,role,...items)=>{
    const list=((step.acts??={})[role]??=[]);
    list.push(...items);
    list.sort((x,y)=>x[1]-y[1]);
  };
  const move=(step,role,...segments)=>{(step.mv??={})[role]=segments.length===1?segments[0]:segments;};
  const vimp=' (hands covered by the vimp)';

  const entrance=at(0);
  move(entrance,'MB',M([[480,320],[500,274]],.2,.92));
  move(entrance,'CB',M([[520,320],[558,274]],.2,.92));
  const reverence=at(1);
  reverence.acts.P=reverence.acts.P.map(a=>a[0]==='profound bow'?['profound bow',.08,.2]:a);
  act(reverence,'P',['gives the staff and the mitre to the bearers',0,.07]);
  act(reverence,'MB',['receives the mitre'+vimp,0,.07],['profound bow',.08,.2]);
  act(reverence,'CB',['receives the pastoral staff'+vimp,0,.07],['profound bow',.08,.2]);
  prop(reverence,'staff',{by:'CB',t:.03});
  prop(reverence,'mitre',{by:'MB',t:.06});
  move(reverence,'MB',M([[340,250],[330,120],HOME.MB],.3,.72));
  move(reverence,'CB',M([[350,262],[345,110],HOME.CB],.32,.76));

  const greeting=at(4);
  if(greeting){
    greeting.say=greeting.say.map(line=>line[0]==='P'&&line[1]==='The Lord be with you.'?['P','Peace be with you.',line[2],line[3]]:line);
    greeting.text+=' A Bishop greets the people with "Peace be with you."';
  }

  // Seated for the readings, the Bishop wears the mitre.
  const reading=at(9);
  move(reading,'MB',M([MB_AT],0,.08),M([HOME.MB],.13,.22));
  act(reading,'MB',['places the mitre on the Bishop'+vimp,.08,.12]);
  prop(reading,'mitre',{by:'P',t:.1});
  reading.text+=' The Bishop sits wearing the mitre.';

  // He puts on incense and blesses the Deacon seated, then lays the mitre aside and takes the staff.
  const acclamation=at(12);
  move(acclamation,'MB',M([MB_AT],.44,.5),M([HOME.MB],.56,.66));
  move(acclamation,'CB',M([CB_AT],.5,.57),M([HOME.CB],.63,.72));
  act(acclamation,'MB',['takes the mitre'+vimp,.5,.55]);
  act(acclamation,'CB',['hands the pastoral staff to the Bishop',.57,.62]);
  act(acclamation,'P',['stands and takes the pastoral staff',.57,.62]);
  prop(acclamation,'mitre',{by:'MB',t:.53});
  prop(acclamation,'staff',{by:'P',t:.6});
  acclamation.text+=' The Bishop lays aside the mitre, stands and takes the pastoral staff for the Gospel.';
  const gospel=at(13);
  gospel.acts.P=(gospel.acts.P||[]).map(a=>a[0]==='turns toward the ambo'?['turns toward the ambo, holding the pastoral staff',a[1],a[2]]:a);

  // The homily from the cathedra, seated, with mitre and staff unless he decides otherwise.
  const homily=at(14);
  homily.mv.P=M([CHAIR],0,.28);
  homily.homilyPlaces=[CHAIR.slice()];
  homily.bishopSeated=true;
  move(homily,'MB',M([MB_AT],.02,.12),M([HOME.MB],.18,.28),M([MB_AT],.84,.9),M([HOME.MB],.95,1));
  move(homily,'CB',M([CB_AT],.84,.9),M([HOME.CB],.95,1));
  homily.acts.P=[['receives the mitre and sits',.12,.17],['preaches seated at the cathedra, with mitre and pastoral staff',.3,.86],['gives back the staff and the mitre',.9,.94]];
  act(homily,'MB',['places the mitre on the Bishop'+vimp,.12,.17],['takes the mitre'+vimp,.9,.94]);
  act(homily,'CB',['takes the pastoral staff'+vimp,.9,.94]);
  prop(homily,'mitre',{by:'P',t:.15},{by:'MB',t:.93});
  prop(homily,'staff',{by:'CB',t:.91});
  homily.text='The Book of the Gospels is taken to a fitting place. The Bishop gives the Homily seated at the cathedra, wearing the mitre and holding the pastoral staff, unless he decides otherwise. A brief period of silence follows.';
  homily.ref+='; CB 142 (to verify)';

  // Before the blessing the mitre-bearer comes to the chair.
  const prayer=at(37);
  move(prayer,'MB',M([MB_AT],.88,.98));
  const blessing=at(38);
  act(blessing,'MB',['places the mitre on the Bishop'+vimp,0,.05]);
  prop(blessing,'mitre',{by:'P',t:.03});
  blessing.acts.P=blessing.acts.P.map(a=>/blesses the people/.test(a[0])?['blesses the people, making the sign of the cross three times ✠ ✠ ✠',a[1],a[2]]:a);
  act(blessing,'P',['receives the mitre',0,.05]);
  const staffAt=options.solemnBlessing?.68:.54;
  if(!options.solemnBlessing){
    blessing.say=[['P','(brief announcements)',.05,.12],['P','The Lord be with you.',.13,.2],['ppl','And with your spirit.',.2,.27],
      ['P','Blessed be the name of the Lord.',.29,.36],['ppl','Now and for ever.',.36,.42],
      ['P','Our help is in the name of the Lord.',.43,.49],['ppl','Who made heaven and earth.',.49,.55],
      ['P','May almighty God bless you, the Father, ✠ and the Son, ✠ and the Holy Spirit. ✠',.58,.84],['ppl','Amen.  (all sign themselves)',.86,.96]];
    blessing.orans={P:[[.13,.2]]};
    blessing.acts.P=blessing.acts.P.map(a=>/blesses the people/.test(a[0])?[a[0],.58,.84]:a);
  }
  move(blessing,'CB',M([CB_AT],staffAt-.1,staffAt-.02));
  act(blessing,'CB',['hands the pastoral staff to the Bishop',staffAt-.02,staffAt+.03]);
  act(blessing,'P',['takes the pastoral staff',staffAt-.02,staffAt+.03]);
  prop(blessing,'staff',{by:'P',t:staffAt});
  blessing.text=(options.solemnBlessing?blessing.text:'The Bishop receives the mitre and greets the people. In the pontifical blessing he says "Blessed be the name of the Lord" and "Our help is in the name of the Lord", and the people reply.')+
    ' He takes the pastoral staff and blesses the people, making the sign of the cross three times.';
  blessing.ref+='; CB 169 (to verify)';

  // The insignia are laid aside to kiss the altar, then taken up again after the bow for the recession.
  const dismissal=at(39);
  act(dismissal,'P',['gives back the staff and the mitre',.3,.4]);
  act(dismissal,'MB',['takes the mitre'+vimp,.33,.4]);
  act(dismissal,'CB',['takes the pastoral staff'+vimp,.3,.36]);
  prop(dismissal,'staff',{by:'CB',t:.33});
  prop(dismissal,'mitre',{by:'MB',t:.37});
  move(dismissal,'MB',M([[340,100],[340,250],[500,274]],.44,.8));
  move(dismissal,'CB',M([[350,110],[350,262],[558,274]],.46,.82));
  const recession=at(40);
  act(recession,'P',['receives the mitre and the pastoral staff',.43,.5]);
  act(recession,'MB',['profound bow',.3,.42],['places the mitre on the Bishop'+vimp,.43,.47]);
  act(recession,'CB',['profound bow',.3,.42],['hands the pastoral staff to the Bishop',.46,.5]);
  prop(recession,'mitre',{by:'P',t:.45});
  prop(recession,'staff',{by:'P',t:.48});
  move(recession,'MB',M([[480,312],[480,860]],.64,1));
  move(recession,'CB',M([[520,312],[520,860]],.64,1));

  entrance.text+=' The Bishop wears the mitre and carries the pastoral staff, followed by the servers who will hold them, wearing vimps.';
  reverence.text+=' Before the bow the Bishop hands the staff and the mitre to their bearers; they are never placed on the altar.';
  dismissal.text+=' The Bishop lays aside the mitre and staff to kiss the altar.';
  recession.text+=' After the bow the Bishop receives the mitre and the pastoral staff.';
  for(const step of steps)step.text=step.text.replace(/\bPriest\b/g,'Bishop');
}

// Confirmation within Mass (Ordo Confirmationis 20-33), after the Gospel: the presentation of the
// candidates, the homily, the renewal of baptismal promises, the laying on of hands, the anointing
// with chrism and the washing of the Bishop's hands; the universal prayer follows. One candidate (K)
// and one sponsor (SP) stand for all of them. The Ordo does not say when the mitre is worn: here the
// Bishop wears it seated and for the anointing, and lays it aside to pray (judgement call; CB to verify).
function applyConfirmation(steps,options,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  initialProps.chrism={at:[878,138]};
  const FRONT=[500,258],STATION=[500,306],BESIDE=[528,318],D_SIDE=[455,262],MB_SIDE=[468,236];
  const toFront=(a,b)=>M([[625,90],[625,250],FRONT],a,b);
  const toChair=(a,b)=>M([[625,250],[625,90],CHAIR],a,b);
  const fromPew=(home,to,a,b)=>M([[513,home[1]],[506,330],to],a,b);
  const toPew=(home,a,b)=>M([[506,330],[513,home[1]],home],a,b);
  const vimp=' (hands covered by the vimp)';
  const homily=at(14);
  const presentation={key:13.5,part:'Liturgy of the Word',title:'Presentation of the Candidates',dur:14,posture:'sit',
    text:'After the Gospel the Bishop sits, wearing the mitre. The Book of the Gospels is taken to the credence. The Deacon (or the parish priest or a catechist) presents the candidates. Each is called by name and comes into the sanctuary; if there are very many, they stand in their places. One candidate here stands for all.',
    ref:'Ordo Confirmationis 21',
    mv:{D:[M([[300,252],[620,252],[830,165]],0,.22),M([[625,262],D_SIDE],.28,.42)],
      MB:[M([[468,86]],.02,.1),M([HOME.MB],.16,.26)],
      K:[fromPew(HOME.K,STATION,.48,.62),toPew(HOME.K,.82,.98)]},
    acts:{P:[['receives the mitre and sits',.1,.15],['receives the candidates presented to him',.5,.8]],
      MB:[['places the mitre on the Bishop'+vimp,.1,.15]],
      D:[['places the Book of the Gospels at the credence',.22,.27],['calls the candidates by name and presents them to the Bishop',.44,.62]],
      K:[['comes forward when called by name',.48,.62],['bows to the Bishop and returns to the pew',.66,.98]]},
    face:{K:[[CHAIR,.62,.8]]},
    props:{gospels:[{at:[868,146],a:.22,b:.27}],mitre:[{by:'P',t:.13}]},
    say:[['D','(calls each candidate by name)',.44,.62],['K','(answers: "Present.")',.62,.68]]};
  steps.splice(steps.indexOf(homily),0,presentation);
  // The mitre and the Book are already dealt with: the homily keeps only the preaching and the end.
  homily.mv.D=M([[400,150],DCHAIR],0,.25);
  delete homily.props.gospels;
  homily.props.mitre=homily.props.mitre.filter(e=>e.by!=='P');
  homily.mv.MB=homily.mv.MB.slice(2);
  homily.acts.P=homily.acts.P.filter(a=>!/receives the mitre/.test(a[0]));
  homily.acts.MB=homily.acts.MB.filter(a=>!/places the mitre/.test(a[0]));
  homily.text='The Bishop gives the Homily seated at the cathedra, wearing the mitre and holding the pastoral staff, explaining the readings and the meaning of Confirmation to the candidates, their sponsors and parents, and the whole assembly. Then he lays the mitre and staff aside.';
  homily.ref='Ordo Confirmationis 22; CB 142 (to verify)';

  const promises={key:14.2,part:'Liturgy of the Word',title:'Renewal of Baptismal Promises',dur:16,posture:'stand',
    text:'The candidates stand and the Bishop questions them. They renew their baptismal promises, rejecting sin and professing their faith in the Father, the Son and the Holy Spirit (given to them today) and in the Church. The Bishop and the whole assembly confirm this profession of faith.',
    ref:'Ordo Confirmationis 23',
    acts:{K:[['stands and answers the Bishop',.05,.8]],P:[['questions the candidates',.05,.8]]},
    say:[['P','Do you renounce Satan, and all his works and empty show?',.04,.14],['K','I do.',.14,.19],
      ['P','Do you believe in God, the Father almighty, Creator of heaven and earth?',.21,.31],['K','I do.',.31,.36],
      ['P','(questions on Jesus Christ, the Holy Spirit given today, and the Church)',.38,.66],['K','I do.',.66,.71],
      ['P','This is our faith. This is the faith of the Church…',.74,.9],['ppl','Amen.',.9,1]]};
  const hands={key:14.4,part:'Liturgy of the Word',title:'Laying on of Hands',dur:16,posture:'stand',
    text:'The Bishop, with any priests assisting him, comes to face the candidates. With hands joined he invites all to pray, and all pray in silence for a while. Then he extends his hands over all the candidates. He alone says the prayer asking God to send the Holy Spirit, the Paraclete, with the gifts of wisdom and understanding, counsel and fortitude, knowledge and piety, and the fear of the Lord.',
    ref:'Ordo Confirmationis 24-25',
    mv:{P:toFront(0,.24)},
    acts:{P:[['invites all to pray, hands joined',.26,.36],['extends his hands over all the candidates',.5,.9]],K:[['stands to receive the laying on of hands',.26,.92]]},
    orans:{P:[[.5,.9]]},
    say:[['P','(invites all to pray that the Holy Spirit be poured out on these adopted children)',.26,.36],['ppl','(silent prayer)',.36,.48],
      ['P','(the prayer for the sevenfold gift of the Holy Spirit)',.5,.9],['ppl','Amen.',.92,1]]};
  const anointing={key:14.6,part:'Liturgy of the Word',title:'Anointing with Chrism',dur:28,posture:'sit',
    text:'The Deacon brings the holy chrism to the Bishop, who wears the mitre. Each candidate comes to the Bishop with the sponsor, who places the right hand on the candidate\u2019s shoulder and gives the candidate\u2019s name (or the candidate says it). The Bishop dips his right thumb in the chrism and makes the sign of the cross on the candidate\u2019s forehead with the words of the sacrament, and gives the sign of peace. A suitable chant may be sung during the anointing.',
    ref:'Ordo Confirmationis 26-29',
    mv:{D:[M([[700,95],[850,150]],0,.14),M([[625,262],D_SIDE],.18,.32),M([[625,262],[850,150]],.84,.96)],
      MB:[M([MB_SIDE],.04,.16),M([HOME.MB],.24,.38)],
      K:[fromPew(HOME.K,STATION,.3,.44),toPew(HOME.K,.76,.94)],
      SP:[fromPew(HOME.SP,BESIDE,.31,.46),toPew(HOME.SP,.77,.96)]},
    acts:{D:[['takes the vessel of holy chrism',.14,.18],['presents the holy chrism to the Bishop',.32,.38],['takes the chrism back to the credence',.84,.98]],
      MB:[['places the mitre on the Bishop'+vimp,.16,.2]],
      P:[['receives the mitre',.16,.2],['anoints the forehead with chrism, tracing the cross with his thumb',.52,.6],['gives the newly confirmed the sign of peace',.62,.7]],
      K:[['comes forward with the sponsor',.3,.44],['receives the anointing',.52,.6],['returns to the pew',.76,.94]],
      SP:[['places the right hand on the candidate\u2019s shoulder',.46,.6]]},
    face:{K:[[FRONT,.44,.74]],SP:[[FRONT,.46,.74]],D:[[FRONT,.38,.84]]},
    props:{chrism:[{by:'D',t:.16},{at:[878,138],a:.94,b:.98}],mitre:[{by:'P',t:.18}]},
    say:[['SP','(gives the candidate\u2019s name)',.46,.51],['P','N., be sealed with the Gift of the Holy Spirit.',.52,.6],['K','Amen.',.6,.63],
      ['P','Peace be with you.',.64,.68],['K','And with your spirit.',.68,.72],['ppl','\u266a a suitable chant during the anointing \u266a',.74,1]]};
  // A server brings the water; with no servers the Deacon does it.
  const w=options.serverCount>0?'S':'D';
  const washing={key:14.8,part:'Liturgy of the Word',title:'Washing of the Bishop\u2019s Hands',dur:12,posture:'sit',
    text:'After the anointing the Bishop washes his hands. '+(w==='S'?'A server':'The Deacon')+' brings water, a basin and a towel; by custom lemon and bread may be offered to remove the oil. The mitre is laid aside and the Bishop returns to the cathedra for the universal prayer.',
    ref:'Ordo Confirmationis 29; custom',
    mv:{[w]:[M([[850,144]],0,.1),M([[625,262],[540,262]],.12,.32),M([[625,262],[850,144]],.7,.86),M(w==='S'?[HOME.S]:[[700,95],DCHAIR],.88,1)],
      MB:[M([MB_SIDE],.58,.68),M([HOME.MB],.76,.94)],
      P:toChair(.74,.98)},
    acts:{[w]:[['pours water over the Bishop\u2019s hands and offers the towel',.36,.62]],P:[['washes the chrism from his hands',.36,.62],['gives back the mitre',.68,.72]],
      MB:[['takes the mitre'+vimp,.68,.72]]},
    props:{ewer:[{by:w,t:.1},{at:[850,144],a:.86,b:.88}],mitre:[{by:'MB',t:.7}]},
    say:[]};
  if(w==='S')washing.mv.D=M([[700,95],DCHAIR],.02,.3);
  const after=steps.indexOf(homily)+1;
  steps.splice(after,0,promises,hands,anointing,washing);
  const prayer=at(16);
  prayer.text+=' Among the intentions, the people pray for the newly confirmed, their parents and sponsors, and the whole Church.';
  prayer.ref+='; Ordo Confirmationis 30';
  const gifts=at(18);
  gifts.text+=' Some of the newly confirmed may join those who bring the gifts.';
  gifts.ref+='; Ordo Confirmationis 31b';
  if(options.eucharisticPrayer==='I'){
    const epiclesis=at(25);
    epiclesis.text+=' In the Roman Canon the Bishop says the proper form of "Hanc igitur" for the newly confirmed.';
    epiclesis.ref+='; Ordo Confirmationis 31c';
  }
  const blessing=at(38);
  const invocations=['(God the Father, who made you his adopted children, bless you…)','(the Son, who promised the Spirit of truth, confirm you in the faith…)','(the Holy Spirit, who kindled the fire of love, lead you to the joy of the kingdom…)'];
  let n=0;
  blessing.say=blessing.say.map(line=>line[0]==='P'&&/invocation/.test(line[1])?['P',invocations[n++],line[2],line[3]]:line);
  blessing.text+=' In place of the usual blessing the Order of Confirmation gives its own threefold blessing (or a prayer over the people).';
  blessing.ref+='; Ordo Confirmationis 33';
}

// Christmas Mass during the Night. Before Mass the Christmas Proclamation from the Roman Martyrology
// may be sung (Directory on Popular Piety 111); here the cantor sings it at the ambo while the ministers
// wait at the back. All genuflect at the Incarnation in the Creed (GIRM 137). The crib is blessed within
// Mass: the universal prayer is introduced for it and concluded by the prayer of blessing (Book of Blessings 1562-1564).
function applyNativity(steps,options){
  const at=key=>steps.find(s=>s.key===key);
  const sung=options.music!=='said';
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const route=(from,to,a,b)=>M([[110,from[1]],[110,290],[255,290],[255,222],to],a,b);
  const homeward=(home,a,b)=>M([[255,222],[255,290],[110,290],[110,home[1]],home],a,b);
  const proclamation={key:-.5,part:'Introductory Rites',title:'The Christmas Proclamation',dur:26,posture:'stand',
    text:'Before Mass begins, with the ministers waiting at the back of the church, the cantor '+(sung?'sings':'reads')+' the Proclamation of the Birth of Christ from the Roman Martyrology at the ambo. It recalls the ages of salvation history, from the Creation to the peace of the Roman Empire, and announces the birth of Jesus Christ in Bethlehem. All stand. Then the Entrance Chant begins.',
    ref:'Martyrologium Romanum, 25 December; Directory on Popular Piety 111',
    mv:{Ps:[route(HOME.Ps,AMBO,0,.14),homeward(HOME.Ps,.86,1)]},
    acts:{Ps:[[(sung?'sings':'reads')+' the Christmas Proclamation at the ambo',.16,.84]]},
    say:[['Ps',chant('The twenty-fifth day of December\u2026'),.16,.26],
      ['Ps',chant('(the ages of salvation history: the Creation and the Flood, Abraham, Moses, David and the prophets, Rome at peace)'),.27,.58],
      ['Ps',chant('Jesus Christ, eternal God and Son of the eternal Father, conceived by the Holy Spirit, was born of the Virgin Mary in Bethlehem of Judah, and was made man.'),.59,.74],
      ['Ps',chant('The Nativity of our Lord Jesus Christ according to the flesh.'),.75,.84]]};
  steps.unshift(proclamation);
  at(0).text='After the Christmas Proclamation, the procession sets out. '+at(0).text;

  const creed=at(15);
  creed.text='At Christmas the Creed is sung or said, and at the words "and by the Holy Spirit was incarnate of the Virgin Mary, and became man" all genuflect (on other days all bow).';
  creed.pplGenuflect=creed.pplBow||[[.42,.62]];
  delete creed.pplBow;
  creed.acts={};
  for(const role of ['P','D',...SERVER_ROLES,...BEARER_ROLES])creed.acts[role]=[['genuflects',.42,.62]];
  creed.say=creed.say.map(line=>line[0]==='ppl'&&/\(all bow\)/.test(line[1])?['ppl',line[1].replace('(all bow)','(all genuflect)'),line[2],line[3]]:line);

  const prayer=at(16);
  prayer.text='The crib is blessed within Mass. The universal prayer begins with an introduction asking God\u2019s blessing on the Christmas manger, and the intentions follow. The Priest concludes them with the prayer of blessing, his hands outstretched toward the crib, which stands outside the sanctuary. No holy water or incense is prescribed.';
  prayer.ref+='; Book of Blessings 1541-1544, 1562-1564';
  prayer.say=prayer.say.map(line=>{
    if(line[0]!=='P')return line;
    if(/invitation/.test(line[1]))return ['P','(invites all to ask God\u2019s blessing on this Christmas manger)',line[2],line[3]];
    if(/concluding prayer/.test(line[1]))return ['P','(the prayer of blessing: may all who look upon this manger worship the Word made flesh)',line[2],line[3]];
    return line;
  });
  (prayer.acts??={}).P=[...(prayer.acts.P||[]),['extends his hands toward the crib and says the prayer of blessing',.82,.94]];
  (prayer.face??={}).P=[[CRIB,.82,.94]];

  if(options.eucharisticPrayer!=='IV'){
    const preface=at(23);
    preface.text+=' At Christmas one of the Prefaces of the Nativity of the Lord is said.';
    preface.ref+='; Roman Missal, Prefaces of the Nativity I-III';
  }
  if(options.eucharisticPrayer==='I'){
    const epiclesis=at(25);
    epiclesis.text+=' In the Roman Canon the proper form of "In communion with those" (Communicantes) for the Nativity is said.';
    epiclesis.ref+='; Roman Missal, Eucharistic Prayer I (proper Communicantes)';
  }
  const blessing=at(38);
  if(blessing.say.some(line=>line[0]==='P'&&/invocation/.test(line[1]))){
    const invocations=['(God, who scattered the darkness of the world by the Incarnation of his Son, drive away the darkness of sin\u2026)','(God, who had the angels announce the Saviour\u2019s birth to the shepherds, fill your minds with gladness\u2026)','(God, who joined earth to heaven when his Word became flesh, give you his peace and goodwill\u2026)'];
    let n=0;
    blessing.say=blessing.say.map(line=>line[0]==='P'&&/invocation/.test(line[1])?['P',invocations[n++],line[2],line[3]]:line);
    blessing.text+=' The Solemn Blessing for the Nativity of the Lord is used.';
    blessing.ref+='; Roman Missal, Solemn Blessings 2';
  }
}

// The Presentation of the Lord (Candlemas), second form: the Solemn Entrance (Roman Missal, 2 February,
// nn. 13-15, with nn. 2-7). The faithful hold candles; the Priest and ministers go to a suitable place in
// the church, here the back where the procession forms. The candles are lit and blessed, the procession
// goes to the altar with the Canticle of Simeon, and the Gloria follows at once: the Sign of the Cross
// and the greeting were given at the blessing, and the Penitential Act is omitted.
const CANDLEMAS_HOLY_WATER=[446,806];
function applyCandlemas(steps,options,initialPos,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  const sung=options.music!=='said';
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const hasS=options.serverCount>0;
  const caller=options.deacon?'D':'P';
  const incense=options.incense;
  const blessing={key:-.5,part:'Introductory Rites',title:'Blessing of Candles',dur:32,posture:'stand',pplCandles:[[.06,1]],
    text:'The faithful gather holding candles. The Priest and the ministers wait at the back of the church, where most of the people can see them, and the candles are lit while the antiphon "Behold, our Lord will come with power" is '+(sung?'sung':'said')+'. The Priest makes the Sign of the Cross, greets the people and briefly introduces the feast: forty days after Christmas, Christ is presented in the Temple and meets Simeon and Anna. He blesses the candles and sprinkles them with holy water in silence'+(incense?', then puts incense into the thurible for the procession':'')+'. '+(options.deacon?'The Deacon':'The Priest')+' invites all to go forth in peace.',
    ref:'Roman Missal, Presentation of the Lord (2 February), nn. 2-7, 13-15',
    say:[['ppl',chant('Behold, our Lord will come with power, to enlighten the eyes of his servants\u2026'),.02,.16],
      ['P','In the name of the Father, and of the Son, and of the Holy Spirit.',.17,.22],['ppl','Amen.',.22,.24],
      ['P','The Lord be with you.',.25,.28],['ppl','And with your spirit.',.28,.31],
      ['P','(introduces the feast: Christ is presented in the Temple and meets his people)',.32,.42],
      ['P','Let us pray. (prayer of blessing: sanctify these candles, and bring us to the light that never fails)',.44,.58],['ppl','Amen.',.58,.61],
      [caller,'Let us go forth in peace to meet the Lord.',.9,.95],['ppl','In the name of Christ. Amen.',.95,1]],
    acts:{P:[['signs himself \u2720',.17,.22],['blesses the candles',.52,.58],['sprinkles the candles with holy water, saying nothing',.62,.76]]},
    orans:{P:[[.25,.28],[.44,.52]]},
    mv:{},props:{},smoke:incense?[['T',0,1]]:[]};
  if(hasS){
    // The holy water is ready at the back; the server holds it beside the Priest and then takes it to the credence.
    initialPos.S=CANDLEMAS_HOLY_WATER.slice();
    initialProps.ewer={by:'S'};
    blessing.acts.S=[['holds the holy water for the Priest',.6,.78]];
    blessing.mv.S=[M([[464,814]],.58,.62),M([CANDLEMAS_HOLY_WATER],.77,.81)];
  }
  if(incense){
    blessing.mv.T=[M([[548,700],[548,796]],.76,.8),M([[548,700],[500,700]],.87,.9)];
    blessing.acts.T=[['brings the thurible to the Priest',.76,.8]];
    blessing.acts.P.push(['puts incense in the thurible and blesses it',.8,.86]);
  }
  steps.unshift(blessing);

  const entrance=at(0);
  entrance.pplCandles=[[0,1]];
  entrance.text='The procession goes to the altar, led by the '+(incense?'thurifer':'cross')+', while all carry lighted candles and sing the Canticle of Simeon with its antiphon "A light for revelation to the Gentiles". As the procession enters the sanctuary the Entrance Antiphon is sung. '+entrance.text.replace(/^When the people are gathered, the Priest and ministers go to the altar while the Entrance Chant is sung\. /,'');
  entrance.ref='Roman Missal, Presentation of the Lord, nn. 6-7, 15; GIRM 120-121';
  entrance.say=[['ppl',chant('A light for revelation to the Gentiles, and the glory of your people Israel (Canticle of Simeon)'),.03,.82],['ppl',chant('Entrance Antiphon'),.82,1]];
  if(hasS){
    entrance.mv.S=[M([[446,824],[880,824],[880,300],[850,165],[850,150]],.3,.82),M([HOME.S],.88,.96)];
    entrance.props=entrance.props||{};
    entrance.props.ewer=[{at:[850,144],a:.83,b:.86}];
    entrance.acts=entrance.acts||{};
    entrance.acts.S=[['takes the holy water back to the credence by the side aisle',.3,.84]];
  }
  for(const key of [1,2]){const s=at(key);if(s)s.pplCandles=[[0,1]];}

  const gloria=at(7);
  gloria.dur=11;
  gloria.text='At the altar the Priest venerates it'+(incense?' and incenses it':'')+' and goes to the chair. The Gloria follows at once: the faithful were greeted at the blessing of candles, and the Penitential Act is omitted. The people extinguish their candles once the procession has ended.';
  gloria.ref='Roman Missal, Presentation of the Lord, n. 7; GIRM 53';
  gloria.mv=gloria.mv||{};
  gloria.mv.P=M([[560,90],CHAIR],0,.24);
  if(options.deacon)gloria.mv.D=M([[440,90],DCHAIR],0,.24);
  if(incense)gloria.mv.T=M([[760,55]],0,.3);
  gloria.say=[['P','Glory to God in the highest\u2026',.26,.38],['ppl',chant('\u2026and on earth peace to people of good will\u2026'),.38,1]];
  gloria.pplCandles=[[0,.3]];

  if(options.eucharisticPrayer!=='IV'){
    const preface=at(23);
    preface.text+=' Today the proper Preface of the Presentation of the Lord is said.';
    preface.ref+='; Roman Missal, Preface of the Presentation of the Lord';
  }
}

// Ash Wednesday (Roman Missal, Ash Wednesday: the Blessing and Distribution of Ashes). After the Homily
// the Priest blesses the ashes and sprinkles them with holy water in silence; he places ashes on all who
// come to him while antiphons are sung; then he washes his hands and the Universal Prayer follows. The
// Penitential Act (with the Kyrie), the Gloria and the Creed are omitted, and the Alleluia is not sung.
const ASH_FRONT=[500,262],ASH_STATION=[500,292],ASH_CREDENCE=[858,132];
// The Priest goes from the ambo or the chair to the front of the sanctuary; with nobody to bring the
// ashes he first fetches them from the credence himself.
function ashPriestPath(ambo,fetch){
  if(!fetch)return M(ambo?[[300,252],ASH_FRONT]:[[625,90],[625,250],ASH_FRONT],0,.26);
  return [M(ambo?[[300,252],[625,250],[850,165],[850,150]]:[[700,95],[850,150]],0,.14),M([[625,250],ASH_FRONT],.17,.3)];
}
function applyAshWednesday(steps,options,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  const sung=options.music!=='said';
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const hasS=options.serverCount>0;
  // Who holds the vessel of ashes for the Priest: the Deacon, else a server, else he carries it himself.
  const holder=options.deacon?'D':hasS?'S':'P';
  const homily=at(14);
  const ambo=JSON.stringify((Array.isArray(homily.mv.P)?homily.mv.P[homily.mv.P.length-1]:homily.mv.P).p.slice(-1)[0])===JSON.stringify(AMBO);
  initialProps.ashes={at:ASH_CREDENCE.slice()};
  const H_BLESS=[540,268],W_BLESS=[460,268];

  const blessing={key:14.3,part:'Liturgy of the Word',title:'Blessing of Ashes',dur:22,posture:'stand',fetchAshes:holder==='P',
    text:'After the Homily the Priest stands before the people. The ashes, made from the palms blessed the year before, are brought to him'+(holder==='P'?' (with no Deacon or server he brings them from the credence himself)':'')+'. With hands joined he invites the faithful to pray, and after a brief silence he says one of the two prayers of blessing. Then he sprinkles the ashes with holy water, saying nothing.',
    ref:'Roman Missal, Ash Wednesday (Blessing and Distribution of Ashes)',
    mv:{P:ashPriestPath(ambo,holder==='P')},
    acts:{P:[['invites all to pray, hands joined',.32,.42],['blesses the ashes \u2720',.5,.72],['sprinkles the ashes with holy water, saying nothing',.76,.92]]},
    props:{ashes:[{by:holder,t:holder==='P'?.15:.14}]},
    face:{},
    say:[['P','(invites all to pray that God will bless these ashes, to be put on our heads as a sign of penance)',.32,.42],['ppl','(brief silence)',.42,.49],
      ['P','(prayer of blessing: bless \u2720 these ashes, that keeping the Lenten observance we may come to Easter with hearts made new)',.5,.72],['ppl','Amen.',.72,.76]]};
  if(holder==='D'){
    blessing.mv.D=[M([[700,95],[850,150]],0,.12),M([[625,250],H_BLESS],.18,.32)];
    blessing.acts.D=[['brings the vessel of ashes',.14,.32],['holds the ashes for the Priest',.32,1]];
  }
  if(hasS){
    blessing.mv.S=[M([[850,140]],0,.11),M([[625,250],holder==='S'?H_BLESS:W_BLESS],.18,.32)];
    blessing.props.ewer=[{by:'S',t:.13}];
    blessing.acts.S=holder==='S'?[['brings the ashes and the holy water',.14,.32],['holds the ashes and the holy water for the Priest',.32,1]]:[['brings the holy water',.14,.32],['holds the holy water for the Priest',.74,.94]];
  }
  if(holder!=='P')blessing.face[holder]=[[ASH_FRONT,.32,1]];

  const imposition={key:14.5,part:'Liturgy of the Word',title:'Distribution of Ashes',dur:34,posture:'sit',
    text:'The Priest places ashes on all who come to him, saying to each one of the two formulas: "Repent, and believe in the Gospel" or "Remember that you are dust, and to dust you shall return." The ministers receive them first; others may help the Priest give them. Meanwhile antiphons such as "Let us change our garments to sackcloth and ashes" or "Blot out my transgressions, O Lord" are '+(sung?'sung':'said')+', or another suitable chant.',
    ref:'Roman Missal, Ash Wednesday (Blessing and Distribution of Ashes)',
    mv:{P:M([ASH_STATION],0,.06)},
    acts:{P:[['places ashes on the ministers',.07,.2],['places ashes on the forehead of each person who comes',.22,.92]]},
    special:{type:'ashes',a:.2,b:.92,stations:[[500,318]]},
    say:[['P','Repent, and believe in the Gospel.',.24,.32],['P','Remember that you are dust, and to dust you shall return.',.38,.48],
      ['ppl',chant('Blot out my transgressions, O Lord\u2026 (or another suitable chant)'),.5,.95]]};
  if(holder!=='P'){
    imposition.mv[holder]=M([[540,292]],0,.06);
    imposition.acts[holder]=[['receives ashes',.1,.16],['holds the vessel of ashes beside the Priest',.2,.92]];
  }
  if(hasS&&holder!=='S'){
    imposition.mv.S=M([[625,262]],0,.08);
    imposition.acts.S=[['receives ashes',.16,.2]];
  }

  const washing={key:14.8,part:'Liturgy of the Word',title:'Washing of Hands after the Ashes',dur:14,posture:'sit',
    text:'After the distribution of ashes the Priest washes his hands'+(hasS?', a server pouring the water,':'')+' and goes to the chair. '+(holder==='P'?'He first puts the ashes back at the credence. ':'The vessel of ashes is taken back to the credence. ')+'The Universal Prayer follows; the Creed is not said.',
    ref:'Roman Missal, Ash Wednesday (Blessing and Distribution of Ashes)',
    mv:{},acts:{},props:{},say:[]};
  if(hasS){
    washing.mv.P=[M([[625,262],[625,122],[600,122]],0,.25),M([[560,90],CHAIR],.72,.95)];
    washing.acts.P=[['washes his hands',.35,.65]];
    washing.mv.S=[M([[625,262],[625,140],[642,126]],0,.25),M([[850,140]],.7,.84),M([HOME.S],.88,1)];
    washing.acts.S=[['pours water over the Priest\u2019s hands',.35,.65],['takes the water'+(holder==='S'?' and the ashes':'')+' back to the credence',.7,.86]];
    washing.props.ewer=[{at:[850,144],a:.84,b:.86}];
    if(holder==='S')washing.props.ashes=[{at:ASH_CREDENCE.slice(),a:.84,b:.86}];
  }else if(holder==='P'){
    washing.mv.P=[M([[625,262],[625,140],[850,150]],0,.25),M([[700,110],[600,122]],.3,.45),M([[560,90],CHAIR],.75,.95)];
    washing.acts.P=[['puts the ashes back at the credence',.25,.28],['washes his hands',.48,.7]];
    washing.props.ashes=[{at:ASH_CREDENCE.slice(),a:.25,b:.28}];
  }else{
    washing.mv.P=[M([[625,262],[625,122],[600,122]],0,.25),M([[560,90],CHAIR],.72,.95)];
    washing.acts.P=[['washes his hands',.35,.65]];
  }
  if(holder==='D'){
    washing.mv.D=[M([[625,262],[625,140],[850,155]],0,.3),M([[700,95],DCHAIR],.4,.7)];
    washing.acts.D=[['takes the ashes back to the credence',0,.34]];
    washing.props.ashes=[{at:ASH_CREDENCE.slice(),a:.3,b:.34}];
  }
  steps.splice(steps.indexOf(homily)+1,0,blessing,imposition,washing);

  const greeting=at(4);
  greeting.text+=' Today the Penitential Act is omitted: the blessing and giving of ashes after the Homily take its place, and the Collect follows at once.';
  greeting.ref+='; Roman Missal, Ash Wednesday';
  const acclamation=at(12);
  if(acclamation.say.length)acclamation.say=acclamation.say.map(([who,text,...rest])=>who==='ppl'&&/Alleluia/.test(text)?[who,chant('Glory and praise to you, Lord Jesus Christ!'),...rest]:[who,text,...rest]);
  acclamation.text=acclamation.text.replace(' At a said Mass the Alleluia, if not sung, may be omitted.',' At a said Mass the acclamation, if not sung, may be omitted.')+' In Lent the Alleluia is not sung: another acclamation such as "Glory and praise to you, Lord Jesus Christ!" takes its place.';
  acclamation.ref+='; GIRM 62b';
  const prayer=at(16);
  prayer.text+=' On Ash Wednesday it follows the giving of ashes; the Creed is not said.';
  prayer.ref+='; Roman Missal, Ash Wednesday';
  if(options.eucharisticPrayer!=='IV'){
    const preface=at(23);
    preface.text+=' Today a Preface of Lent is said.';
    preface.ref+='; Roman Missal, Prefaces of Lent';
  }
  const end=at(38);
  end.text+=' On Ash Wednesday the Missal gives a Prayer over the People, said before the blessing.';
  end.ref+='; Roman Missal, Ash Wednesday';
}

// Baptism of children (Ordo Baptismi Parvulorum, OBP). The font stands at the back of the nave by the door,
// with the paschal candle beside it and a small table for the chrism, the white garment and the candle.
// One family (a parent carrying the child, BP, and a godparent, GP) stands for all. Texts are short paraphrases.
const BAPTISM_FONT=[330,792];
const BAPTISM_PLACES={
  font:BAPTISM_FONT,celebrant:[330,758],parent:[302,820],godparent:[360,822],nearChild:[292,794],round:[300,764],
  table:[372,752],chrism:[362,750],garment:[372,752],bcandle:[382,756],paschal:[398,772],atTable:[386,784],beside:[328,830],
  front:[500,262],parentFront:[478,302],godparentFront:[522,302],helperFront:[540,268],oil:[870,150],
  doorParent:[470,840],doorGodparent:[530,840]
};
// The reception at the church door (OBP 35-41); cel is already standing just inside the door at [500,808].
function baptismReception({cel,who,within}){
  const Who=who[0].toUpperCase()+who.slice(1);
  const spot=[500,814];
  return {part:within?'Introductory Rites':'Reception of the Children',title:'Reception of the Children',dur:34,posture:'stand',
    text:'The parents and godparents wait with the child at the church door. '+Who+(within?' and the ministers go':' goes')+' there. He greets everyone, especially the parents and godparents, and asks the name of the child and what they ask of God\u2019s Church. He reminds the parents of their duty to bring the child up in the faith and asks the godparents to help them. Then he welcomes the child for the Christian community and traces the sign of the cross on its forehead; the parents and godparents do the same.'+(within?' At Mass this reception takes the place of the greeting and the Penitential Act.':''),
    ref:within?'Ordo Baptismi Parvulorum 29, 35-41':'Ordo Baptismi Parvulorum 35-41',
    mv:{[cel]:[M([spot],0,.06),M([[486,826]],.78,.82),M([spot],.9,.96)]},
    acts:{[cel]:[['greets the parents and godparents',.04,.12],['traces the sign of the cross on the child\u2019s forehead',.82,.88]],
      BP:[['traces the sign of the cross on the child',.88,.95]],GP:[['traces the sign of the cross on the child',.9,.97]]},
    face:{[cel]:[[[500,840],.06,1]],BP:[[spot,0,1]],GP:[[spot,0,1]]},
    say:[[cel,'(greets all present, especially the parents and godparents)',.03,.12],
      [cel,'What name do you give your child?',.13,.19],['BP','N.',.19,.22],
      [cel,'What do you ask of God\u2019s Church for N.?',.24,.3],['BP','Baptism.',.3,.34],
      [cel,'(reminds the parents of their duty to bring up the child in the faith) Do you clearly understand what you are undertaking?',.36,.5],['BP','We do.',.5,.54],
      [cel,'Are you ready to help the parents of this child in their duty as Christian parents?',.56,.64],['GP','We are.',.64,.68],
      [cel,'N., the Christian community welcomes you with great joy; in its name I claim you for Christ our Saviour by the sign of his cross.',.7,.82]]};
}
// The steps from the exorcism to the return from the font, shared by Baptism within Mass (applyBaptism)
// and outside Mass (mass-rite-baptism.js). cel is the celebrant (P or D); helper brings the oil of
// catechumens from the credence (the celebrant himself when nobody can); key(id,massKey) names each step.
function baptismCoreSteps({cel,helper,who,within,sung,key}){
  const B=BAPTISM_PLACES;
  const Who=who[0].toUpperCase()+who.slice(1);
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const part=within?'Liturgy of the Word':'Celebration of the Sacrament';
  const fetch=helper===cel;
  const fromPew=(home,to,a,b)=>M([[513,home[1]],[506,330],to],a,b);
  const atFont={BP:[[B.celebrant,0,1]],GP:[[B.celebrant,0,1]]};
  const steps=[];

  const exorcism={key:key('exorcism',16.2),part,title:'Prayer of Exorcism and Anointing before Baptism',dur:26,posture:'stand',
    text:Who+' comes before the people and the parents and godparents bring the child forward. He prays that the child, who will face the temptations of the world, be set free from original sin and become a temple of God\u2019s glory. Then he anoints the child on the breast with the oil of catechumens'+(fetch?', which with nobody to bring it he fetches from the credence himself':'')+'. (The anointing may be omitted for a serious reason; then he lays his hand on the child in silence.)',
    ref:'Ordo Baptismi Parvulorum 49-51',
    mv:{[cel]:fetch?[M([[700,95],[850,150]],0,.14),M([[625,250],B.front],.17,.3),M([[625,250],[850,150]],.84,.92),M([[625,250],B.front],.94,1)]:M([[625,90],[625,250],B.front],0,.26),
      BP:fromPew(HOME.BP,B.parentFront,.02,.28),GP:fromPew(HOME.GP,B.godparentFront,.04,.3)},
    acts:{[cel]:[['extends his hands over the child and prays',.34,.56],['anoints the child on the breast with the oil of catechumens',.62,.78]],
      BP:[['brings the child forward',.02,.28],['holds the child for the anointing',.6,.8]],GP:[['comes forward with the parents',.04,.3]]},
    orans:{[cel]:[[.34,.56]]},
    face:{BP:[[B.front,.3,.95]],GP:[[B.front,.3,.95]]},
    props:{oilCat:[{by:helper,t:fetch?.15:helper==='D'?.14:.12},{at:B.oil,a:fetch?.9:.91,b:fetch?.92:.93}]},
    say:[[cel,'(prayer of exorcism: set this child free from original sin, make her a temple of your glory and send your Holy Spirit to dwell with her)',.34,.56],['ppl','Amen.',.56,.6],
      [cel,'We anoint you with the oil of salvation in the name of Christ our Saviour; may he strengthen you with his power.',.62,.78],['ppl','Amen.',.78,.82]]};
  if(fetch)exorcism.acts[cel].unshift(['takes the oil of catechumens from the credence',.14,.17]),exorcism.acts[cel].push(['puts the oil back on the credence',.88,.92]);
  else{
    exorcism.mv[helper]=helper==='D'?[M([[300,252],[625,250],[850,165],[850,150]],0,.14),M([[625,250],B.helperFront],.18,.32),M([[625,250],[850,150]],.84,.92),M([[700,95],DCHAIR],.94,1)]
      :[M([[850,140]],0,.11),M([[625,250],B.helperFront],.18,.32),M([[625,250],[850,150]],.84,.92),M([HOME.S],.94,1)];
    exorcism.acts[helper]=[['brings the oil of catechumens',.13,.32],['holds the oil for '+who,.32,.8],['takes the oil back to the credence',.84,.93]];
    exorcism.face[helper]=[[B.front,.32,.84]];
  }
  steps.push(exorcism);

  steps.push({key:key('toFont',16.3),part,title:'Procession to the Font',dur:18,posture:'stand',
    text:Who+' goes to the font with the parents and godparents, who carry the child, while a suitable song such as Psalm 23 is sung. Here the font stands at the back of the church near the door. If the baptistery cannot hold everyone, the baptism may be celebrated in a more suitable place in the church.',
    ref:'Ordo Baptismi Parvulorum 52',
    mv:{[cel]:M([[500,300],[500,740],[380,756],B.celebrant],.1,.85),
      BP:M([[487,330],[487,830],B.parent],.02,.7),GP:M([[513,330],[513,830],B.godparent],.04,.74)},
    acts:{[cel]:[['goes to the font',.1,.85]]},
    face:{[cel]:[[B.font,.85,1]],BP:[[B.celebrant,.74,1]],GP:[[B.celebrant,.76,1]]},
    say:[['ppl',chant('a suitable song, for example Psalm 23: The Lord is my shepherd'),0,1]]});

  steps.push({key:key('water',16.4),part,title:'Blessing of the Water',dur:18,posture:'stand',
    text:'At the font '+who+' reminds all of God\u2019s wonderful work in water, from the Creation and the Flood to the crossing of the Red Sea and the baptism of Jesus in the Jordan. He prays that the Holy Spirit give the water the grace of Christ, and touches the water with his right hand. (In Easter time, if the water was blessed at the Easter Vigil, a prayer of thanksgiving is said instead.)',
    ref:'Ordo Baptismi Parvulorum 53-55',
    acts:{[cel]:[['touches the water with his right hand',.62,.76]]},
    face:{[cel]:[[B.font,0,1]],...atFont},
    say:[[cel,'(invites all to pray that God will give this child new life by water and the Holy Spirit)',.03,.18],
      [cel,'(blessing of the water: through your Son may all buried with Christ in baptism rise with him to newness of life)',.2,.8],['ppl','Amen.',.82,.9]]});

  steps.push({key:key('promises',16.5),part,title:'Renunciation of Sin and Profession of Faith',dur:22,posture:'stand',
    text:Who+' asks the parents and godparents to renounce sin and to profess their faith in the Father, the Son and the Holy Spirit and in the Church, the faith in which the child is baptized. He and all present give their assent.',
    ref:'Ordo Baptismi Parvulorum 56-59',
    face:{[cel]:[[B.parent,0,1]],...atFont},
    say:[[cel,'Do you reject sin, so as to live in the freedom of God\u2019s children?',.03,.12],['BP','I do. (parents and godparents)',.12,.16],
      [cel,'Do you reject Satan, and all his works and empty promises?',.18,.27],['BP','I do.',.27,.31],
      [cel,'Do you believe in God, the Father almighty, creator of heaven and earth?',.33,.42],['BP','I do.',.42,.46],
      [cel,'(questions on Jesus Christ, and on the Holy Spirit, the Church, the forgiveness of sins and eternal life)',.48,.66],['BP','I do.',.66,.7],
      [cel,'This is our faith, the faith of the Church; we are proud to profess it in Christ Jesus our Lord.',.73,.9],['ppl','Amen.',.9,1]]});

  steps.push({key:key('baptism',16.6),part,title:'The Baptism',dur:24,posture:'stand',
    text:Who+' asks whether they want the child baptized in the faith they have professed. The parent holds the child over the font, and '+who+' baptizes the child, pouring water on its head three times (or immersing it), once at the name of each Person of the Trinity. After the baptism the people may sing an acclamation.',
    ref:'Ordo Baptismi Parvulorum 58-61; CIC 849-850',
    mv:{BP:[M([[312,806]],.2,.28),M([B.parent],.8,.88)]},
    acts:{BP:[['holds the child over the font',.28,.76]],[cel]:[['pours water on the child\u2019s head',.38,.46],['pours water a second time',.52,.6],['pours water a third time',.66,.74]]},
    face:{[cel]:[[B.font,0,1]],...atFont},
    say:[[cel,'Is it your will that N. should be baptized in the faith of the Church, which we have all professed with you?',.03,.16],['BP','It is.',.16,.2],
      [cel,'N., I baptize you in the name of the Father,',.32,.44],[cel,'and of the Son,',.48,.58],[cel,'and of the Holy Spirit.',.62,.72],
      ['ppl',chant('an acclamation, for example: Blessed be God, who chose you in Christ'),.78,1]]});

  steps.push({key:key('explanatory',16.7),part,title:'Chrism, White Garment and Lighted Candle',dur:40,posture:'stand',
    text:Who+' anoints the child on the crown of the head with chrism: like Christ, anointed Priest, Prophet and King, the child is now a member of his body. The godparent puts the white garment on the child, the sign of its Christian dignity. '+Who+' takes the paschal candle and the godparent lights the child\u2019s candle from it: the light of Christ is entrusted to the parents and godparents. '+Who+' may then touch the child\u2019s ears and mouth (the Ephphatha).',
    ref:'Ordo Baptismi Parvulorum 62-66',
    mv:{[cel]:[M([[352,754]],0,.04),M([B.round,B.nearChild],.08,.16),M([B.round,[352,754]],.28,.34),M([[388,760]],.54,.58),M([B.round,B.nearChild],.82,.88)],
      GP:[M([B.atTable],.3,.36),M([B.beside],.38,.44),M([B.atTable],.52,.58),M([B.godparent],.7,.76)]},
    acts:{[cel]:[['takes the holy chrism',.03,.06],['anoints the child on the crown of the head with chrism',.18,.27],['puts the chrism back',.33,.35],
        ['takes the paschal candle',.58,.64],['touches the child\u2019s ears and mouth (Ephphatha)',.88,.97]],
      GP:[['puts the white garment on the child',.44,.52],['lights the baptismal candle from the paschal candle',.6,.68]],BP:[['holds the child',0,1]]},
    face:{[cel]:[[B.parent,.16,.28],[B.paschal,.58,.66],[B.parent,.66,.82]],GP:[[[388,760],.58,.68],[B.celebrant,.76,1]],BP:[[B.celebrant,0,1]]},
    props:{chrism:[{by:cel,t:.05},{at:B.chrism,a:.33,b:.35}],garment:[{by:'GP',t:.37},{hide:true,t:.52}],bcandle:[{by:'GP',t:.59}]},
    say:[[cel,'(God, who freed you from sin and gave you new birth, anoints you with chrism: as Christ was anointed Priest, Prophet and King, may you live always as a member of his body)',.06,.2],['ppl','Amen.',.27,.3],
      [cel,'N., you have become a new creation and have clothed yourself in Christ: see in this white garment the outward sign of your Christian dignity.',.38,.52],['ppl','Amen.',.52,.55],
      [cel,'Receive the light of Christ.',.58,.64],[cel,'(to the parents and godparents: this light is entrusted to you; keep it burning brightly, so that this child may walk always as a child of the light)',.66,.82],
      [cel,'(Ephphatha: may the Lord soon touch your ears to receive his word, and your mouth to proclaim his faith)',.88,.97],['ppl','Amen.',.97,1]]});

  const ret={key:key('return',16.8),part,title:within?'Return from the Font':'Procession to the Altar',dur:16,posture:'stand',
    text:within?'All return from the font, the newly baptized child carried with the lighted candle, while a baptismal song is sung such as "You have put on Christ, in him you have been baptized. Alleluia". '+Who+' goes to the chair and the Mass continues with the Preparation of the Gifts.'
      :'All go in procession to the altar, the child carried with the lighted candle, while a baptismal song is sung such as "You have put on Christ, in him you have been baptized. Alleluia".',
    ref:within?'Ordo Baptismi Parvulorum 29, 67':'Ordo Baptismi Parvulorum 67',
    mv:{[cel]:M([B.round,[380,752],[500,740],[500,300],...(within?[[625,250],[625,90],CHAIR]:[B.front])],0,.9),
      BP:M(within?[[400,836],[513,836],[513,HOME.BP[1]],HOME.BP]:[[400,836],[487,836],[487,330],B.parentFront],.04,.9),
      GP:M(within?[[513,826],[513,HOME.GP[1]],HOME.GP]:[[513,826],[513,330],B.godparentFront],.12,.96)},
    acts:{GP:[['carries the lighted baptismal candle',0,1]]},
    say:[['ppl',chant('You have put on Christ; in him you have been baptized. Alleluia, alleluia'),0,1]]};
  if(!within)ret.face={BP:[[B.front,.92,1]],GP:[[B.front,.96,1]]};
  steps.push(ret);
  return steps;
}

// Baptism within Mass (OBP 29): the reception at the door takes the place of the greeting and the
// Penitential Act; the universal prayer, with the litany of the saints, follows the Homily; the Creed is
// omitted; the sacrament is celebrated at the font; the Mass continues with the Preparation of the Gifts;
// the blessing of the mothers, the fathers and all present ends the Mass.
function applyBaptism(steps,options,initialPos,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  const sung=options.music!=='said';
  const B=BAPTISM_PLACES;
  initialPos.BP=B.doorParent.slice();initialPos.GP=B.doorGodparent.slice();
  Object.assign(initialProps,{infant:{by:'BP'},oilCat:{at:B.oil.slice()},chrism:{at:B.chrism.slice()},garment:{at:B.garment.slice()},bcandle:{at:B.bcandle.slice()}});
  steps.unshift({key:-.4,...baptismReception({cel:'P',who:'the Priest',within:true})});

  const entrance=at(0);
  entrance.text='After the reception, the procession goes to the altar while the Entrance Chant is sung; the parents and godparents follow with the child and go to their places. '+entrance.text.replace(/^When the people are gathered, the Priest and ministers go to the altar while the Entrance Chant is sung\. /,'');
  entrance.ref+='; Ordo Baptismi Parvulorum 29';
  Object.assign(entrance.mv,{BP:M([[487,790],[513,700],[513,HOME.BP[1]],HOME.BP],.34,.9),GP:M([[513,790],[513,HOME.GP[1]],HOME.GP],.38,.96)});

  // The Sign of the Cross and the greeting are omitted; the ministers go to their places during the next step.
  const sign=at(3),next=at(options.gloria?7:8);
  for(const field of ['mv','props']){
    for(const [name,value] of Object.entries(sign[field]||{})){
      next[field]??={};
      next[field][name]=field==='mv'?[...segs(value),...segs(next[field][name])]:[...value,...(next[field][name]||[])];
    }
  }
  next.text='The Priest goes straight to the chair: the reception of the children has taken the place of the greeting and the Penitential Act. '+next.text;
  next.ref+='; Ordo Baptismi Parvulorum 29';

  const homily=at(14);
  homily.text+=' The Homily explains the readings and the mystery of baptism, and the duties of the parents and godparents.';
  homily.ref+='; Ordo Baptismi Parvulorum 29, 45';

  const prayer=at(16);
  prayer.dur=18;
  prayer.text='After the Homily the universal prayer is taken from the rite of baptism: intentions for the child, the parents and godparents and all the baptized. It ends with the litany of the saints, Holy Mary, Saint John the Baptist, Saint Joseph and others, and the prayer of exorcism takes the place of the concluding prayer. The Creed is not said: the profession of faith is made at the font.';
  prayer.ref+='; Ordo Baptismi Parvulorum 29, 47-48';
  prayer.say=prayer.say.filter(([,text])=>!/concluding prayer/.test(text)&&!(text==='Amen.')).map(([who,text,a,b])=>[who,text.replace('(intention\u2026)','(intention for the child, the parents and godparents\u2026)'),a,b]);
  prayer.say.push(['ppl',sung?'\u266a Holy Mary, Mother of God, pray for us\u2026 Saint John the Baptist\u2026 Saint Joseph\u2026 (litany of the saints) \u266a':'Holy Mary, Mother of God, pray for us\u2026 (litany of the saints)',.82,1]);
  if(prayer.orans)delete prayer.orans.P;
  const helper=options.deacon?'D':options.serverCount>0?'S':'P';
  steps.splice(steps.indexOf(prayer)+1,0,...baptismCoreSteps({cel:'P',helper,who:'the Priest',within:true,sung,key:(id,k)=>k}));

  const blessing=at(38);
  const invocations=['(God, through his Son born of the Virgin Mary, bless the mother of this child, that she may always be thankful\u2026)',
    '(God, the giver of life, bless the father of this child, that with his wife he may be the first teacher of the child in the faith\u2026)',
    '(God bless all of you who are gathered here, that you may always walk as children of the light\u2026)'];
  let n=0;
  blessing.say=blessing.say.map(line=>line[0]==='P'&&/invocation/.test(line[1])&&n<3?['P',invocations[n++],line[2],line[3]]:line);
  blessing.text+=' After the baptism the blessing may be taken from the rite: the mothers, the fathers and all present are blessed in turn.';
  blessing.ref+='; Ordo Baptismi Parvulorum 29, 70';
}

function chooseHomilyPlace(point){
  const homily=STEPS.find(s=>s.key===14);
  if(!homily)return;
  const ambo=Math.hypot(point[0]-AMBO[0],point[1]-AMBO[1])<60;
  homily.mv.P=M([ambo?AMBO:CHAIR],0,.28);
  const ashes=STEPS.find(s=>s.key===14.3);
  if(ashes)ashes.mv.P=ashPriestPath(ambo,ashes.fetchAshes);
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
