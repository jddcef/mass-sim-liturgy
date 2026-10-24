const ORIGINAL_STEPS=JSON.parse(JSON.stringify(STEPS));
const SERVER_ROLES=['X','C1','C2','T','S'];
// The Bishop's bearers (Mass with the Bishop only): servers in vimps who carry the mitre and the staff.
const BEARER_ROLES=['MB','CB'];
const ROLE_NAMES={P:'Priest',D:'Deacon',X:'Cross-bearer',C1:'Candle-bearer',C2:'Candle-bearer',T:'Thurifer',S:'Server',L:'Lector',L2:'Second reader',Ps:'Psalmist',U:'Collection usher',E:'EMHC',G1:'Gift-bearer',G2:'Gift-bearer',MB:'Mitre-bearer',CB:'Crozier-bearer',K:'Candidate',SP:'Sponsor',BP:'Parent',GP:'Godparent',FD:'Funeral director',FM:'Family member',ppl:'People'};

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
  // Palm Sunday is modelled with the parish Priest presiding (see applyPalmSunday).
  if(rite===RITES.mass&&requested?.palmSunday&&!requested.nativity&&!requested.candlemas&&!requested.ashWednesday)requested={...requested,bishop:false,confirmation:false};
  // Holy Thursday is modelled with the parish Priest presiding (see applyHolyThursday).
  if(rite===RITES.mass&&requested?.holyThursday&&!requested.nativity&&!requested.candlemas&&!requested.ashWednesday&&!requested.palmSunday)requested={...requested,bishop:false,confirmation:false};
  // Good Friday is modelled with the parish Priest presiding (see applyGoodFriday).
  if(rite===RITES.mass&&requested?.goodFriday&&!requested.nativity&&!requested.candlemas&&!requested.ashWednesday&&!requested.palmSunday&&!requested.holyThursday)requested={...requested,bishop:false,confirmation:false};
  // Baptism within Mass is modelled only at a parish Sunday Mass: the Bishop, Confirmation and the proper days take precedence (Holy Thursday: GIRM 372; Good Friday: Paschale Solemnitatis 61; Palm Sunday is allowed, OBP 29).
  if(rite===RITES.mass&&requested?.baptism&&(requested.nativity||requested.candlemas||requested.ashWednesday||requested.holyThursday||requested.goodFriday||requested.bishop||requested.confirmation))requested={...requested,baptism:false};
  // A Funeral Mass is modelled only on an ordinary day (GIRM 380) with the parish Priest: the other occasions take precedence.
  if(rite===RITES.mass&&requested?.funeral&&(requested.nativity||requested.candlemas||requested.ashWednesday||requested.palmSunday||requested.holyThursday||requested.goodFriday||requested.bishop||requested.confirmation||requested.baptism))requested={...requested,funeral:false};
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
  // Palm Sunday: no Gloria in Lent (GIRM 53), the Creed is said (GIRM 68); the commemoration of the Lord's
  // entrance replaces the Penitential Act (Roman Missal, Palm Sunday, n. 17); Preface of Palm Sunday (GIRM 365d).
  if(requested.palmSunday&&!requested.nativity&&!requested.candlemas&&!requested.ashWednesday)requested={...requested,gloria:false,creed:true,introductory:'A',bishop:false,confirmation:false,
    eucharisticPrayer:requested.eucharisticPrayer==='IV'?'III':requested.eucharisticPrayer};
  else if(requested.palmSunday)requested={...requested,palmSunday:false};
  // Holy Thursday: bells at the Gloria then silent until Easter Vigil; the Mandatum after the Homily;
  // Creed omitted (Roman Missal, Holy Thursday, n. 13); Eucharistic Prayer I (the Roman Canon) with proper formulas;
  // transfer of the Blessed Sacrament to the Altar of Repose; stripping of the altar.
  if(requested.holyThursday&&!requested.nativity&&!requested.candlemas&&!requested.ashWednesday&&!requested.palmSunday)requested={...requested,gloria:true,creed:false,introductory:'A',bishop:false,confirmation:false,eucharisticPrayer:'I'};
  else if(requested.holyThursday)requested={...requested,holyThursday:false};
  // Good Friday: silent entrance and prostration before bare altar; Passion of St John in parts;
  // Solemn Intercessions; Adoration of the Holy Cross; Communion from reserved Sacrament;
  // strictly no Gloria, no Creed, no bells, no gifts procession, no Eucharistic Prayer, no blessing or dismissal.
  if(requested.goodFriday&&!requested.nativity&&!requested.candlemas&&!requested.ashWednesday&&!requested.palmSunday&&!requested.holyThursday)requested={...requested,gloria:false,creed:false,introductory:'A',bishop:false,confirmation:false,giftsProcession:false,bothKinds:false};
  else if(requested.goodFriday)requested={...requested,goodFriday:false};
  // Confirmation is conferred by the Bishop within Mass; the Creed is omitted because the faith has
  // already been professed (Ordo Confirmationis 31a) and its own blessing replaces the usual one (n. 33).
  if(requested.confirmation)requested={...requested,bishop:true,creed:false,solemnBlessing:true};
  // Baptism within Mass: the reception of the children replaces the greeting and the Penitential Act, the
  // profession of faith replaces the Creed, and the blessing may be taken from the rite (Ordo Baptismi Parvulorum 29).
  if(requested.baptism)requested={...requested,creed:false,solemnBlessing:true,introductory:'A'};
  // Funeral Mass: no Gloria and no Creed; the reception at the door replaces the greeting and the Penitential
  // Act, and the final commendation replaces the concluding rites (GIRM 384; OCF 159-176).
  if(requested.funeral)requested={...requested,gloria:false,creed:false,introductory:'A',solemnBlessing:false};
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
    palmSunday:!!requested.palmSunday,
    holyThursday:!!requested.holyThursday,
    goodFriday:!!requested.goodFriday,
    baptism:!!requested.baptism,
    funeral:!!requested.funeral,
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
  if(!options.funeral){visible.delete('FD');visible.delete('FM');}
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
  if(options.palmSunday)applyPalmSunday(steps,options,initialPos,initialProps);
  if(options.holyThursday)applyHolyThursday(steps,options,initialPos,initialProps);
  if(options.goodFriday)applyGoodFriday(steps,options,initialPos,initialProps);
  if(options.bishop)applyBishop(steps,options,initialProps);
  if(options.confirmation)applyConfirmation(steps,options,initialProps);
  if(options.baptism)applyBaptism(steps,options,initialPos,initialProps);
  if(options.funeral)applyFuneral(steps,options,initialPos,initialProps,visible);

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
  if(options.palmSunday)[3,4,5,6].forEach(key=>removed.add(key));
  if(options.holyThursday)[38,40].forEach(key=>removed.add(key));
  if(options.goodFriday)[2,3,4,5,6,7,15,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,39].forEach(key=>removed.add(key));
  if(options.baptism)[3,4,5,6].forEach(key=>removed.add(key));
  if(options.funeral)[3,4,5,6].forEach(key=>removed.add(key));
  const filtered=steps.filter(s=>!removed.has(s.key));
  STEPS.splice(0,STEPS.length,...filtered);
  rebuildTimeline(initialPos,initialProps);
  const assignments=team.map(role=>{
    if(role==='S')return 'Server 1: book, vessels, water and bell'+(serverCount<5&&options.incense?'; also incense (no bell during elevations)':'')+'.';
    if(role==='X')return 'Server 2: processional cross.';
    if(role==='T')return options.incense?'Server 5: incense.':'Server 5: additional assistant.';
    return 'Server '+(team.indexOf(role)+1)+': processional candle.';
  });
  // A Funeral Mass is celebrated in violet here (black or, where permitted, white are also allowed: OCF 39).
  const vesture=options.funeral?{role:'P',roles:['P','D'],cope:false,recolour:true,colour:FUNERAL_VIOLET}:undefined;
  return {options,visible,assignments,team,vesture};
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
    gifts.text+=' The Priest receives both bread and wine, assisted by the Deacon or another minister.';
    if(!options.collection)gifts.text+=' Other offerings for the Church and the poor are placed away from the altar.';
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
    gifts.mv.U=[M([[890,745],[890,330],[700,280]],0,.5),M([[700,280],[890,330],HOME.U],.65,1)];
    gifts.acts.U=[['presents the collection and sets it beside the sanctuary, not on the altar',.5,.65]];
    gifts.props.collection=[{at:[710,280],a:.55,b:.6}];
    (gifts.acts.P??=[]).push(['acknowledges the other offerings for the Church and the poor',.63,.68]);
    gifts.text+=' The usher joins the presentation with the collection, placing it at a suitable place away from the altar.';
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

// Palm Sunday of the Passion of the Lord, Second Form: The Solemn Entrance (Roman Missal, Palm Sunday,
// nn. 12-17). The faithful hold palm branches; the Priest and ministers go to a suitable place at the back
// of the church where the procession forms. The antiphon "Hosanna to the Son of David" is sung, the palms
// are blessed and sprinkled with holy water in silence, and the Gospel of the Lord's Entrance is proclaimed.
// The procession goes to the altar while "All Glory, Laud and Honour" is sung. The Penitential Act and
// the Gloria are omitted; the Passion is read in parts at the ambo without candles or incense; all genuflect
// at the death of the Lord. The Creed is said, and the proper Preface of Palm Sunday is used.
function applyPalmSunday(steps,options,initialPos,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  const sung=options.music!=='said';
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const hasS=options.serverCount>0;
  const caller=options.deacon?'D':'P';
  const incense=options.incense;
  const blessing={key:-.5,part:'Introductory Rites',title:'Blessing of Palms',dur:36,posture:'stand',pplPalms:[[.04,1]],
    text:'The faithful gather in the church holding branches. The Priest and the ministers go to a suitable place at the back of the church where the procession forms. The antiphon "Hosanna to the Son of David" is '+(sung?'sung':'said')+'. The Priest makes the Sign of the Cross, greets the people and gives a brief address. He says the prayer of blessing and sprinkles the branches with holy water in silence'+(incense?', then puts incense into the thurible for the procession':'')+'. The Gospel of the Lord\u2019s entrance into Jerusalem is proclaimed. '+(options.deacon?'The Deacon':'The Priest')+' invites all to go forth in peace.',
    ref:'Roman Missal, Palm Sunday of the Passion of the Lord, nn. 12-17',
    say:[['ppl',chant('Hosanna to the Son of David; blessed is he who comes in the name of the Lord, the King of Israel. Hosanna in the highest!'),.02,.16],
      ['P','In the name of the Father, and of the Son, and of the Holy Spirit.',.17,.22],['ppl','Amen.',.22,.24],
      ['P','The Lord be with you.',.25,.28],['ppl','And with your spirit.',.28,.31],
      ['P','(address: Dear brethren, since the beginning of Lent until now we have prepared our hearts\u2026)',.32,.4],
      ['P','Let us pray. (prayer of blessing: sanctify these branches with your blessing\u2026)',.42,.54],['ppl','Amen.',.54,.56],
      [caller,'The Lord be with you.',.58,.62],['ppl','And with your spirit.',.62,.65],
      [caller,'A reading from the holy Gospel according to N. (the entrance into Jerusalem)',.65,.74],['ppl','Glory to you, O Lord.',.74,.77],
      [caller,'(proclaims the Gospel of the Lord\u2019s Entrance)',.77,.86],
      [caller,'The Gospel of the Lord.',.86,.89],['ppl','Praise to you, Lord Jesus Christ.',.89,.92],
      [caller,'Let us go forth in peace.',.93,.96],['ppl','In the name of Christ. Amen.',.96,1]],
    acts:{P:[['signs himself \u2720',.17,.22],['blesses the branches',.48,.54],['sprinkles the branches with holy water, saying nothing',.58,.7]]},
    orans:{P:[[.25,.28],[.42,.48]]},
    mv:{},props:{},smoke:incense?[['T',0,1]]:[]};
  if(hasS){
    initialPos.S=[446,806];
    initialProps.ewer={by:'S'};
    blessing.acts.S=[['holds the holy water for the Priest',.56,.72]];
    blessing.mv.S=[M([[464,814]],.54,.58),M([[446,806]],.71,.75)];
  }
  if(incense){
    blessing.mv.T=[M([[548,700],[548,796]],.72,.76),M([[548,700],[500,700]],.83,.87)];
    blessing.acts.T=[['brings the thurible to the Priest',.72,.76]];
    blessing.acts.P.push(['puts incense in the thurible and blesses it',.76,.82]);
  }
  steps.unshift(blessing);

  const entrance=at(0);
  entrance.pplPalms=[[0,1]];
  entrance.text='The procession goes to the altar, led by the '+(incense?'thurifer':'cross')+', while all carry palm branches and sing "All Glory, Laud and Honour" with its verses. As the procession enters the sanctuary the Entrance Antiphon is sung. '+entrance.text.replace(/^When the people are gathered, the Priest and ministers go to the altar while the Entrance Chant is sung\. /,'');
  entrance.ref='Roman Missal, Palm Sunday, nn. 16-17; GIRM 120-121';
  entrance.say=[['ppl',chant('All glory, laud and honour to you, Redeemer, King, to whom the lips of children made sweet hosannas ring\u2026'),.03,.82],['ppl',chant('Entrance Antiphon'),.82,1]];
  if(hasS){
    entrance.mv.S=[M([[446,824],[880,824],[880,300],[850,165],[850,150]],.3,.82),M([HOME.S],.88,.96)];
    entrance.props=entrance.props||{};
    entrance.props.ewer=[{at:[850,144],a:.83,b:.86}];
    entrance.acts=entrance.acts||{};
    entrance.acts.S=[['takes the holy water back to the credence by the side aisle',.3,.84]];
  }
  for(const key of [1,2]){const s=at(key);if(s)s.pplPalms=[[0,1]];}

  const collect=at(8);
  collect.dur=13;
  collect.text='At the altar the Priest venerates it'+(incense?' and incenses it':'')+' and goes to the chair. Omitting the greeting and the Penitential Act, he says the Collect. A server may hold the Missal.';
  collect.ref='Roman Missal, Palm Sunday, n. 17; GIRM 54';
  collect.mv=collect.mv||{};
  collect.mv.P=M([[560,90],CHAIR],0,.24);
  if(options.deacon)collect.mv.D=M([[440,90],DCHAIR],0,.24);
  if(incense)collect.mv.T=M([[760,55]],0,.3);

  const acclamation=at(12);
  if(acclamation){
    if(acclamation.say.length)acclamation.say=acclamation.say.map(([who,text,...rest])=>who==='ppl'&&/Alleluia/.test(text)?[who,chant('Praise to you, Lord Jesus Christ, King of endless glory!'),...rest]:[who,text,...rest]);
    acclamation.text='All rise and sing the verse before the Gospel: "Christ became obedient to the point of death, even death on a cross." In Lent the Alleluia is not sung. '+(options.deacon?'The Deacon bows before the Priest and asks for his blessing, but no incense or candles accompany the Passion.':'The Priest prepares to proclaim the Passion.');
    acclamation.ref='Roman Missal, Palm Sunday, n. 21; GIRM 62b';
    if(acclamation.mv){
      delete acclamation.mv.C1;
      delete acclamation.mv.C2;
      delete acclamation.mv.T;
    }
    if(acclamation.acts?.P)acclamation.acts.P=acclamation.acts.P.filter(([t])=>!/incense/.test(t));
    acclamation.smoke=[];
  }

  const passion=at(13);
  if(passion){
    passion.title='The Passion of the Lord';
    passion.dur=24;
    passion.text='The Passion of our Lord Jesus Christ is proclaimed. It is read without candles and without incense, without the greeting and without the signing of the book. The narrative is read in parts: the words of Christ are reserved to the Priest, the Deacon or a reader narrates, and all speak the crowd parts. At the mention of the Lord\u2019s death, all genuflect and a brief silence is kept.';
    passion.ref='Roman Missal, Palm Sunday, nn. 21-22';
    passion.smoke=[];
    if(passion.props?.thurible)delete passion.props.thurible;
    const narrator=options.deacon?'D':'P';
    passion.say=[
      [narrator,'The Passion of our Lord Jesus Christ according to N.',0,.1],
      [narrator,'(proclaims the narrative: When they came to the place called Golgotha, they crucified him\u2026)',.1,.3],
      ['P','Father, forgive them, for they know not what they do.',.3,.42],
      ['ppl','If you are the King of the Jews, save yourself!',.42,.54],
      ['P','Father, into your hands I commend my spirit.',.54,.64],
      [narrator,'And bowing his head, he gave up his spirit. (All genuflect, and pause in silence.)',.64,.78],
      [narrator,'(proclaims the conclusion of the Passion)',.78,.88],
      [narrator,'The Gospel of the Lord.',.88,.94],
      ['ppl','Praise to you, Lord Jesus Christ.',.94,1]
    ];
    passion.pplGenuflect=[[.65,.78]];
    passion.acts={
      P:[['turns toward the ambo',0,.64],['genuflects and pauses in silence',.65,.78]],
      [narrator]:[['genuflects and pauses in silence',.65,.78],['kisses the Book',.94,1]]
    };
    if(options.deacon&&narrator!=='D')passion.acts.D=[['genuflects and pauses in silence',.65,.78]];
  }

  const homily=at(14);
  if(homily){
    if(homily.mv){
      delete homily.mv.C1;
      delete homily.mv.C2;
      delete homily.mv.T;
    }
    homily.text+=' On Palm Sunday a brief homily may follow.';
    homily.ref+='; Roman Missal, Palm Sunday, n. 22';
  }

  const creed=at(15);
  if(creed){
    creed.text+=' On Palm Sunday the Creed is said as on all Sundays of Lent.';
    creed.ref+='; GIRM 68; Roman Missal, Palm Sunday';
  }

  if(options.eucharisticPrayer!=='IV'){
    const preface=at(23);
    preface.text+=' Today the proper Preface of Palm Sunday (The Passion of the Lord) is said.';
    preface.ref+='; Roman Missal, Preface of Palm Sunday';
  }

  const end=at(38);
  if(end){
    end.text+=' On Palm Sunday the Missal gives a Prayer over the People before the blessing.';
    end.ref+='; Roman Missal, Palm Sunday';
  }
}

// Holy Thursday (Evening Mass of the Lord's Supper / Missa vespertina in Cena Domini):
// 1. Gloria sung solemnly with bells; bells then remain silent until Easter Vigil.
// 2. Mandatum (Washing of Feet): after the Homily, Priest removes chasuble, vests in linen towel,
//    and washes/dries the feet of chosen faithful with pitcher, basin and towel; washes hands and vests again.
// 3. Creed is strictly omitted; Universal Prayer follows directly.
// 4. Eucharistic Prayer I (Roman Canon): proper Communicantes, proper Hanc igitur, and proper Qui pridie; no altar bells.
// 5. Transfer of the Blessed Sacrament: after Prayer after Communion, Priest incenses kneeling, receives humeral veil,
//    carries ciborium in solemn procession to Altar of Repose singing Pange Lingua, incenses with Tantum Ergo, tabernacle closed.
// 6. Stripping of the Altar: in silence, altar cloths, candles and cross are stripped; main tabernacle left open and empty.
function applyHolyThursday(steps,options,initialPos,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  const sung=options.music!=='said';
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const hasS=options.serverCount>0;
  const incense=options.incense;

  // 1. Gloria with bells, then liturgical silence for bells
  const gloria=at(7);
  if(gloria){
    gloria.bell=[[0,.4]];
    gloria.text='The Gloria in excelsis is sung. While the hymn is being sung, bells are rung, and when it is finished they remain silent until the Gloria in excelsis of the Easter Vigil. The organ and other musical instruments may be used only so as to accompany the singing.';
    gloria.ref='Roman Missal, Holy Thursday, n. 7; GIRM 53';
  }

  // 2. EP I (Roman Canon) proper texts & no bells at consecration
  for(const key of [25,26,27]){
    const s=at(key);
    if(s){
      s.bell=[];
      if(s.acts?.S)s.acts.S=s.acts.S.filter(([text])=>!text.includes('rings the bell'));
      s.text=s.text.replace(/The bell may be rung[^.]*\./g,'In accordance with the rubrics of the Triduum, bells remain silent after the Gloria until the Easter Vigil.');
    }
  }
  const epiclesis=at(25);
  if(epiclesis){
    epiclesis.text+=' In the Roman Canon on Holy Thursday the proper Hanc igitur is used: "Therefore, Lord, we pray: graciously accept this oblation of our service\u2026 which we offer you in memory of the day on which our Lord Jesus Christ handed on the mysteries of his Body and Blood\u2026".';
    epiclesis.ref+='; Roman Missal, Holy Thursday, n. 34';
  }
  const host=at(26);
  if(host){
    host.text+=' The proper Qui pridie is used: "On the day before he was to suffer for our salvation and the salvation of all, that is, today\u2026".';
    host.ref+='; Roman Missal, Holy Thursday, n. 35';
  }
  const preface=at(23);
  if(preface){
    preface.text+=' Today the Preface of the Most Holy Eucharist I (The Sacrifice and the Sacrament of Christ) is said.';
    preface.ref+='; Roman Missal, Preface of the Most Holy Eucharist I';
  }

  // 3. The Mandatum (Washing of the Feet)
  const homily=at(14);
  initialProps.basin={at:[850,144],h:true};
  const holder=hasS?'S':(options.deacon?'D':'P');
  const mandatum={
    key:14.5,part:'Liturgy of the Word',title:'Washing of the Feet (Mandatum)',dur:34,posture:'sit',
    text:'After the Homily the Priest, putting aside his chasuble if appropriate, puts on a linen gremial or towel. Assisted by the ministers, he goes to each person chosen from the faithful, pours water over their feet, and dries them with a towel. Meanwhile antiphons such as "Ubi caritas" or "A new commandment I give you" are '+(sung?'sung':'said')+'. Afterwards the Priest washes and dries his hands, puts the chasuble back on, and returns to the chair.',
    ref:'Roman Missal, Holy Thursday, nn. 10–13; Congregation for Divine Worship decree, 6 Jan 2016',
    mv:{
      P:[
        M([[560,90],[625,122],[640,140]],0,.14),
        M([[625,250],[500,290]],.18,.3),
        M([[625,140]],.75,.86),
        M([[560,90],CHAIR],.9,1)
      ]
    },
    acts:{
      P:[
        ['removes chasuble and puts on linen towel',0,.14],
        ['washes and dries the feet of the chosen faithful',.3,.74],
        ['washes hands and vests in chasuble again',.8,.9]
      ]
    },
    props:{
      basin:[{hide:false,t:.12},{by:holder,t:.14},{at:[850,144],a:.86,b:.9}]
    },
    say:[
      ['ppl',chant('Ubi caritas et amor, Deus ibi est. Congregavit nos in unum Christi amor\u2026'),.04,.96]
    ]
  };
  if(holder==='S'){
    mandatum.mv.S=[
      M([[850,140]],0,.12),
      M([[625,250],[540,290]],.18,.3),
      M([[625,140],[850,140]],.75,.86),
      M([HOME.S],.9,1)
    ];
    mandatum.acts.S=[
      ['brings pitcher, basin and towel',0,.16],
      ['holds the basin and assists the Priest',.3,.74],
      ['takes the basin and towel back to the credence',.76,.88]
    ];
  }
  if(options.deacon){
    if(holder==='D'){
      mandatum.mv.D=[
        M([[850,150]],0,.12),
        M([[625,250],[540,290]],.18,.3),
        M([[625,140],[850,150]],.75,.86),
        M([DCHAIR],.9,1)
      ];
      mandatum.acts.D=[
        ['brings the pitcher and basin',.12,.18],
        ['assists the Priest with the basin and towel',.18,.74],
        ['returns the basin to the credence',.76,.88]
      ];
    }else{
      mandatum.mv.D=[
        M([[452,122],[470,270]],.18,.3),
        M([[470,270],[452,122],DCHAIR],.76,.88)
      ];
      mandatum.acts.D=[
        ['assists the Priest and ministers at the Washing of Feet',.18,.74]
      ];
    }
  }
  steps.splice(steps.indexOf(homily)+1,0,mandatum);

  // 4. Universal Prayer follows directly (Creed omitted)
  const prayer=at(16);
  if(prayer){
    prayer.text='From the chair the Priest directs the Universal Prayer. On Holy Thursday the Creed is omitted, so the Universal Prayer follows the Washing of Feet directly.';
    prayer.ref+='; Roman Missal, Holy Thursday, n. 13';
  }

  // 5. Purification & Reservation: consecrated ciborium remains on the altar
  const purification=at(36);
  if(purification){
    purification.dur=16;
    purification.text='The sacred vessels are purified. The ciborium containing the Blessed Sacrament for Communion on Good Friday remains on the altar on the corporal, awaiting the procession to the Altar of Repose. The main tabernacle remains empty. Sacred silence follows.';
    purification.ref='Roman Missal, Holy Thursday, nn. 2, 36–37; GIRM 163';
    const ordinary=options.deacon?'D':'P';
    purification.mv[ordinary]=[
      M([[625,122],[838,140]],0,.3),
      M([[700,95],ordinary==='D'?DCHAIR:CHAIR],.75,1)
    ];
    purification.acts[ordinary]=[
      ['consumes remaining Precious Blood and purifies the vessels',.25,.68]
    ];
    purification.face={};
    purification.props.bread=[{at:[500,168],a:0,b:.01}];
    purification.props.chalice=[{at:[540,170],a:0,b:.01},{by:ordinary,t:.28},{at:[888,128],a:.68,b:.72}];
  }

  // 6. Transfer of the Blessed Sacrament to the Altar of Repose (key 38.5)
  const postCommunion=at(37);
  const REPOSE=[260,110];
  const transfer={
    key:38.5,part:'Concluding Rites',title:'Transfer of the Blessed Sacrament to the Altar of Repose',dur:38,posture:'stand',
    text:'After the Prayer after Communion, the Priest kneels before the altar and incenses the Blessed Sacrament. He puts on the white humeral veil, takes the ciborium, and covers it with the veil. A solemn procession forms, led by the cross between candles and the thurifer with incense, carrying the Blessed Sacrament to the Altar of Repose while the hymn "Pange lingua" is sung. At the place of repose, the Priest places the ciborium in the tabernacle, kneels and incenses it while "Tantum ergo" is sung. The tabernacle door is closed, and after silent adoration, all genuflect.',
    ref:'Roman Missal, Holy Thursday, nn. 36–41',
    veil:{P:[[.22,.9]]},
    smoke:incense?[['T',0,1]]:[],
    mv:{
      P:[
        M([ALT_P],0,.18),
        M([[500,170],[500,270],[350,270],[260,200],[260,150]],.3,.66),
        M([[260,150]],.66,1)
      ]
    },
    acts:{
      P:[
        ['incenses the Blessed Sacrament kneeling',0,.2],
        ['receives the humeral veil and takes the ciborium',.21,.28],
        ['carries the Blessed Sacrament in procession',.3,.65],
        ['places the ciborium in the tabernacle of repose and incenses it',.67,.86],
        ['genuflects and remains in silent adoration',.88,1]
      ]
    },
    props:{
      ciborium:[{by:'P',t:.24},{at:REPOSE,a:.68,b:.72}]
    },
    say:[
      ['ppl',chant('Pange, lingua, gloriosi Corporis mysterium, Sanguinisque pretiosi, quem in mundi pretium fructus ventris generosi Rex effudit gentium\u2026'),.06,.65],
      ['ppl',chant('Tantum ergo Sacramentum veneremur cernui: et antiquum documentum novo cedat ritui\u2026 Amen.'),.68,.96]
    ]
  };
  if(hasS){
    transfer.mv.X=M([[670,142],[625,262],[350,285],[260,240],[240,150]],.28,.64);
    transfer.mv.C1=M([[392,152],[392,262],[350,275],[260,230],[240,165]],.28,.64);
    transfer.mv.C2=M([[612,152],[612,262],[350,295],[260,250],[240,135]],.28,.64);
    transfer.acts.X=[['leads the procession with the cross',.28,.65]];
    transfer.acts.C1=[['carries lighted candle in procession',.28,.65]];
    transfer.acts.C2=[['carries lighted candle in procession',.28,.65]];
  }
  if(incense){
    transfer.mv.T=M([[500,240],[450,270],[350,270],[260,215],[260,170]],.28,.64);
    transfer.acts.T=[['presents the thurible and boat',0,.2],['leads with smoking thurible before the Blessed Sacrament',.28,.65]];
    transfer.props.thurible=[{by:'P',t:.08},{by:'T',t:.22},{by:'P',t:.72},{by:'T',t:.86}];
  }
  if(options.deacon){
    transfer.mv.D=M([[452,122],[470,270],[350,270],[275,200],[275,150]],.3,.66);
    transfer.acts.D=[['accompanies the Priest and closes the tabernacle of repose',.3,.92]];
  }
  steps.splice(steps.indexOf(postCommunion)+1,0,transfer);

  // 7. Stripping of the Altar (Denudatio altaris) (key 39)
  const stripping=at(39);
  if(stripping){
    stripping.title='Stripping of the Altar (Denudatio altaris)';
    stripping.dur=18;
    stripping.posture='stand';
    stripping.tabernacle=[[0,1]];
    stripping.text='In silence, the altar is stripped of its altar cloths, candles and cross, recalling the abandonment of the Lord before his Passion. The main tabernacle remains empty and wide open, and the sanctuary lamp is extinguished. All depart in silence without a blessing or dismissal.';
    stripping.ref='Roman Missal, Holy Thursday, nn. 41–42';
    stripping.say=[];
    stripping.smoke=[];
    delete stripping.mv.X;
    delete stripping.mv.C1;
    delete stripping.mv.C2;
    delete stripping.mv.T;
    stripping.props={
      cross:[{hide:true,t:.3}],
      cand1:[{hide:true,t:.3}],
      cand2:[{hide:true,t:.3}],
      corporal:[{hide:true,t:.3}]
    };
    stripping.acts={
      P:[['strips the altar in silence',0,.5],['makes a profound bow and departs in silence',.6,1]]
    };
    if(options.deacon){
      stripping.acts.D=[['assists in stripping the altar',0,.5],['makes a profound bow and departs in silence',.6,1]];
    }
  }
}

// Good Friday (Celebration of the Passion of the Lord / Feria VI in Passione Domini):
// 1. Liturgy of the Word: altar stripped bare beforehand, silent entrance, prostration flat on face,
//    Collect without "Let us pray", Passion of St John in parts without candles or incense, Solemn Intercessions.
// 2. Adoration of the Holy Cross: veiled Cross brought from sacristy, unveiled in three stages (Ecce lignum Crucis),
//    procession to venerate Cross with Improperia and Crucem tuam.
// 3. Holy Communion: single cloth and corporal spread on altar, ciborium brought from Altar of Repose with candles,
//    Our Father (Rite of Peace and Agnus Dei omitted), Behold the Lamb of God, Communion,
//    reposition to repose, altar stripped bare again, Prayer after Communion, Prayer over the People, silent departure.
function applyGoodFriday(steps,options,initialPos,initialProps){
  const at=key=>steps.find(s=>s.key===key);
  const sung=options.music!=='said';
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const hasS=options.serverCount>0;
  const REPOSE=[260,110];

  // 1. Initial props: bare altar beforehand, veiled cross in sacristy, main tabernacle empty
  initialProps.cross={at:[1180,190],h:true};
  initialProps.cand1={at:[1180,190],h:true};
  initialProps.cand2={at:[1180,190],h:true};
  initialProps.corporal={at:[866,120],h:true};

  // 2. Entrance in silence (key 0)
  const entrance=at(0);
  if(entrance){
    entrance.title='Entrance in Silence';
    entrance.text='The Priest and Deacon, vested in red, enter the church in complete silence with the ministers and approach the sanctuary. There is no entrance hymn or instrumental music.';
    entrance.ref='Roman Missal, Friday of the Passion of the Lord, n. 4';
    entrance.say=[];
    entrance.bell=[];
    entrance.smoke=[];
  }

  // 3. Reverence & Prostration in Silence (key 1)
  const prostration=at(1);
  if(prostration){
    prostration.title='Reverence & Prostration in Silence';
    prostration.dur=24;
    prostration.posture='kneel';
    prostration.text='The Priest and Deacon approach the bare altar, make a reverence, and prostrate themselves flat on the floor in silent prayer. All others in the church kneel and pray in silence.';
    prostration.ref='Roman Missal, Friday of the Passion of the Lord, n. 5';
    prostration.say=[];
    prostration.bell=[];
    prostration.mv.P=M([[500,240]],0,.2);
    prostration.acts.P=[
      ['prostrates flat before the bare altar in silent prayer',.2,.85],
      ['rises and prepares to go to the chair',.85,1]
    ];
    if(options.deacon){
      prostration.mv.D=M([[460,240]],0,.2);
      prostration.acts.D=[
        ['prostrates flat beside the Priest in silent prayer',.2,.85],
        ['rises with the Priest',.85,1]
      ];
    }
    prostration.props={};
    delete prostration.acts.X;
    delete prostration.acts.C1;
    delete prostration.acts.C2;
    delete prostration.acts.L;
  }

  // 4. Collect without Oremus (key 8)
  const collect=at(8);
  if(collect){
    collect.title='Prayer (Collect)';
    collect.text='The Priest goes to the chair with the ministers. Facing the people, with hands joined, he says the prayer without "Let us pray", since the silent prayer has already been offered in prostration: "Remember your mercies, O Lord, and with your eternal protection sanctify your servants, for whom Christ your Son, by the shedding of his Blood, established the Paschal Mystery." All respond: "Amen."';
    collect.ref='Roman Missal, Friday of the Passion of the Lord, n. 5';
    collect.mv={P:M([[500,240],[500,120],CHAIR],0,.2)};
    collect.acts={P:[['prays the Collect with hands joined',.2,.85]]};
    if(options.deacon){
      collect.mv.D=M([[460,240],[450,120],DCHAIR],0,.2);
      collect.acts.D=[['stands beside the Priest at the chair',.2,1]];
    }
    collect.say=[
      ['P','Remember your mercies, O Lord, and with your eternal protection sanctify your servants, for whom Christ your Son, by the shedding of his Blood, established the Paschal Mystery.',0,.85],
      ['ppl','Amen.',.88,1]
    ];
  }

  // 5. Responsorial Psalm (key 10)
  const psalm=at(10);
  if(psalm){
    psalm.text='The psalmist sings or says the Responsorial Psalm (Psalm 31): "Father, into your hands I commend my spirit."';
    psalm.ref='Roman Missal, Friday of the Passion of the Lord, n. 7; Lectionary n. 40';
    psalm.say=[['ppl',chant('Father, into your hands I commend my spirit.'),0,1]];
  }

  // 6. Verse before the Gospel without Alleluia, no candles or incense (key 12)
  const acclamation=at(12);
  if(acclamation){
    acclamation.title='Verse before the Gospel';
    acclamation.text='All stand. The verse before the Gospel is sung without Alleluia: "Christ became obedient for us even unto death, dying on the cross. Therefore God raised him on high and gave him the name above all other names." Candles and incense are not used.';
    acclamation.ref='Roman Missal, Friday of the Passion of the Lord, n. 8; Phil 2:8–9';
    acclamation.say=[['ppl',chant('Christ became obedient for us even unto death, dying on the cross. Therefore God raised him on high and gave him the name above all other names.'),0,1]];
    acclamation.acts={};
    acclamation.props={};
    acclamation.smoke=[];
  }

  // 7. Passion of our Lord Jesus Christ according to John (key 13)
  const passion=at(13);
  if(passion){
    passion.title='The Passion of the Lord according to John';
    passion.dur=44;
    passion.text='The Passion of our Lord Jesus Christ according to John (Jn 18:1—19:42) is proclaimed in parts at the ambo without candles or incense, and without the greeting or signing of the book. At the death of the Lord ("bowed his head and gave up the spirit"), all kneel and pause in silent prayer.';
    passion.ref='Roman Missal, Friday of the Passion of the Lord, nn. 8–9';
    passion.kneel=[[.62,.76]];
    passion.props={};
    passion.smoke=[];
    passion.acts={
      P:[['listens to the proclamation of the Passion',0,.62],['kneels at the death of the Lord',.62,.76],['rises for the remainder of the Passion',.76,1]]
    };
    if(options.deacon){
      passion.acts.D=[['proclaims the Passion of the Lord at the ambo',0,.62],['kneels at the death of the Lord',.62,.76],['concludes the proclamation of the Passion',.76,1]];
    }
    const reader=options.lector?'L':(options.deacon?'D':'P');
    passion.say=[
      [reader,'The Passion of our Lord Jesus Christ according to John.',0,.12],
      [reader,'...Jesus said, "It is finished"; and bowing his head, he gave up the spirit.',.5,.62],
      ['ppl','(All kneel and pause in silent prayer)',.63,.75],
      [reader,'...they laid Jesus there because of the Jewish day of Preparation, for the tomb was close at hand.',.78,.92],
      [reader,'The Gospel of the Lord.',.93,.97],
      ['ppl','Praise to you, Lord Jesus Christ.',.97,1]
    ];
  }

  // 8. Homily (key 14)
  const homily=at(14);
  if(homily){
    homily.text='A brief homily is given, drawing the minds of the faithful to the mystery of the Passion and Cross.';
    homily.ref='Roman Missal, Friday of the Passion of the Lord, n. 10';
  }

  // 9. Solemn Intercessions (key 16)
  const intercessions=at(16);
  if(intercessions){
    intercessions.title='The Solemn Intercessions (Orationes Solemnes)';
    intercessions.dur=38;
    intercessions.posture='stand';
    intercessions.text='From the chair, the Priest directs the ten Solemn Intercessions: for Holy Church, the Pope, all orders of the faithful, catechumens, Christian unity, the Jewish people, those who do not believe in Christ, those who do not believe in God, public officials, and those in tribulation. The Deacon (or Priest) announces the bidding, all pray in silence kneeling, and the Priest sings or says the prayer with hands extended.';
    intercessions.ref='Roman Missal, Friday of the Passion of the Lord, nn. 11–13';
    intercessions.say=[
      [options.deacon?'D':'P','Let us kneel. (Silent prayer) ... Let us stand.',.08,.35],
      ['P','Almighty ever-living God, in whose hand lies every human heart and the rights of peoples, look with favour on those who govern us... Through Christ our Lord.',.4,.9],
      ['ppl','Amen.',.92,1]
    ];
    intercessions.acts={
      P:[
        ['introduces the Solemn Intercession',0,.08],
        ['kneels in silent prayer',.08,.35],
        ['says the prayer with hands extended',.4,.9]
      ]
    };
    if(options.deacon){
      intercessions.acts.D=[
        ['sings or says the bidding: "Let us kneel ... Let us stand"',.08,.35]
      ];
    }
  }

  // 10. Showing of the Holy Cross (key 16.5)
  const showing={
    key:16.5,part:'The Adoration of the Holy Cross',title:'Showing of the Holy Cross (Ecce lignum Crucis)',dur:36,posture:'stand',
    text:'The veiled Cross is brought in procession from the sacristy to the altar accompanied by two servers with lighted candles. At the altar, the Priest uncovers the upper part, the right arm, and then the entire Cross, raising it three times and singing: "Behold the wood of the Cross, on which hung the salvation of the world." All respond: "Come, let us adore," and all kneel and adore in silence each time.',
    ref:'Roman Missal, Friday of the Passion of the Lord, nn. 14–17',
    mv:{
      P:[
        M([CHAIR],0,.08),
        M([[500,170],[500,220]],.1,.25),
        M([[500,220]],.25,1)
      ]
    },
    acts:{
      P:[
        ['goes to the altar and receives the veiled Cross',.1,.25],
        ['unveils the Cross in three stages, singing "Ecce lignum Crucis"',.26,.85],
        ['kneels in silent adoration with all present',.86,1]
      ]
    },
    props:{
      cross:[{hide:false,t:.15},{by:'P',t:.25},{at:[500,230],a:.85,b:.9}]
    },
    say:[
      ['P',chant('Ecce lignum Crucis, in quo salus mundi pependit.'),.26,.55],
      ['ppl',chant('Venite, adoremus.'),.58,.84]
    ]
  };
  if(options.deacon){
    showing.mv.D=[
      M([DCHAIR],0,.08),
      M([[460,170],[460,220]],.1,.25),
      M([[460,220]],.25,1)
    ];
    showing.acts.D=[
      ['assists the Priest in the unveiling of the Cross',.26,.85]
    ];
  }
  if(options.serverCount>=3){
    showing.mv.C1=M([[392,152],[440,240]],.15,.35);
    showing.mv.C2=M([[612,152],[560,240]],.15,.35);
    showing.acts.C1=[['accompanies the Cross with a lighted candle',.15,.85]];
    showing.acts.C2=[['accompanies the Cross with a lighted candle',.15,.85]];
    showing.props.cand1=[{hide:false,t:.2},{at:[440,240],a:.85,b:.9}];
    showing.props.cand2=[{hide:false,t:.2},{at:[560,240],a:.85,b:.9}];
  }
  steps.splice(steps.indexOf(intercessions)+1,0,showing);

  // 11. Adoration of the Holy Cross (key 16.7)
  const adoration={
    key:16.7,part:'The Adoration of the Holy Cross',title:'Adoration of the Holy Cross (Adoratio Sanctae Crucis)',dur:36,posture:'stand',
    text:'The Cross is placed between two lighted candles at the entrance to the sanctuary. The Priest, clergy and faithful approach in procession to venerate the Cross of the Lord, making a genuflection or kissing the wood of the Cross. Meanwhile the Reproaches (Improperia), the antiphon "Crucem tuam adoramus", and hymns are sung.',
    ref:'Roman Missal, Friday of the Passion of the Lord, nn. 18–20',
    mv:{
      P:[
        M([[500,240]],0,.15),
        M([[500,220],CHAIR],.5,.8)
      ]
    },
    acts:{
      P:[
        ['venerates the Holy Cross with a genuflection',.1,.45],
        ['returns to the chair',.5,.8]
      ]
    },
    props:{
      cross:[{at:[500,230],a:0,b:1}]
    },
    say:[
      ['ppl',chant('Crucem tuam adoramus, Domine, et sanctam resurrectionem tuam laudamus et glorificamus: ecce enim propter lignum venit gaudium in universo mundo.'),.05,.95]
    ]
  };
  if(options.deacon){
    adoration.mv.D=[
      M([[460,240]],0,.15),
      M([[460,220],DCHAIR],.5,.8)
    ];
    adoration.acts.D=[
      ['venerates the Holy Cross with a genuflection',.15,.5],
      ['returns to the seat',.5,.8]
    ];
  }
  steps.splice(steps.indexOf(showing)+1,0,adoration);

  // 12. Preparation of the Altar for Communion (key 17)
  const prep=at(17);
  if(prep){
    prep.title='Preparation of the Altar for Communion';
    prep.dur=20;
    prep.posture='sit';
    prep.text='The altar is covered with a single white cloth, and a corporal and the Missal are placed upon it. Two candlesticks are set on or near the altar. No chalice, water, wine or lavabo are prepared, since there is no Sacrifice of the Mass today.';
    prep.ref='Roman Missal, Friday of the Passion of the Lord, n. 21';
    prep.say=[];
    prep.bell=[];
    const minister=options.deacon?'D':'P';
    prep.acts={};
    prep.acts[minister]=[
      ['spreads the corporal and places the Missal on the bare altar',.2,.8]
    ];
    prep.props={
      corporal:[{hide:false,t:.2},{at:[500,168],a:.25,b:.9}]
    };
  }

  // 13. Bringing the Blessed Sacrament from the Altar of Repose (key 17.5)
  const ordinary=options.deacon?'D':'P';
  const transfer={
    key:17.5,part:'Holy Communion',title:'Bringing the Blessed Sacrament from the Altar of Repose',dur:32,posture:'stand',
    text:'The Deacon (or Priest) goes to the Altar of Repose where the Blessed Sacrament was reserved on Holy Thursday. Accompanied by two servers carrying lighted candles, he brings the ciborium with the consecrated hosts to the altar and places it on the corporal. The servers place their candles on or near the altar. All stand in reverence.',
    ref:'Roman Missal, Friday of the Passion of the Lord, n. 22',
    mv:{
      [ordinary]:[
        M([ordinary==='D'?DCHAIR:CHAIR],0,.08),
        M([[350,270],[260,200],[260,130]],.1,.35),
        M([[260,130],[350,270],[500,240],[500,170],ordinary==='D'?ALT_D:ALT_P],.4,.8)
      ]
    },
    acts:{
      [ordinary]:[
        ['goes to the Altar of Repose',.1,.35],
        ['takes the ciborium and brings it to the altar',.36,.8],
        ['places the ciborium on the corporal and genuflects',.8,1]
      ]
    },
    props:{
      ciborium:[{by:ordinary,t:.35},{at:[500,168],a:.8,b:.85}]
    },
    say:[]
  };
  if(options.serverCount>=3){
    transfer.mv.C1=M([[440,240],[350,275],[260,230],[260,150],[350,275],[440,170]],.1,.8);
    transfer.mv.C2=M([[560,240],[350,295],[260,250],[260,135],[350,295],[560,170]],.1,.8);
    transfer.acts.C1=[['accompanies the Blessed Sacrament with a lighted candle',.1,.85]];
    transfer.acts.C2=[['accompanies the Blessed Sacrament with a lighted candle',.1,.85]];
    transfer.props.cand1=[{at:[440,170],a:.8,b:.9}];
    transfer.props.cand2=[{at:[560,170],a:.8,b:.9}];
  }
  steps.splice(steps.indexOf(prep)+1,0,transfer);

  // 14. The Lord's Prayer (key 31)
  const pater=at(31);
  if(pater){
    pater.text='The Priest approaches the altar and genuflects. With hands joined, he introduces the Lord\'s Prayer: "At the Saviour\'s command and formed by divine teaching, we dare to say." All pray the Our Father. The Priest alone says the embolism: "Deliver us, Lord, we pray, from every evil..." The people conclude: "For the kingdom, the power and the glory are yours now and for ever." The Rite of Peace is omitted.';
    pater.ref='Roman Missal, Friday of the Passion of the Lord, nn. 23–28';
  }

  // 15. Behold the Lamb of God (key 34)
  const behold=at(34);
  if(behold){
    behold.text='The Priest genuflects, takes a host, and holding it slightly raised above the ciborium, facing the people, says aloud: "Behold the Lamb of God, behold him who takes away the sins of the world. Blessed are those called to the supper of the Lamb." All respond: "Lord, I am not worthy that you should enter under my roof, but only say the word and my soul shall be healed."';
    behold.ref='Roman Missal, Friday of the Passion of the Lord, n. 29';
    behold.acts={P:[['genuflects and shows the host above the ciborium',.2,.7]]};
  }

  // 16. Holy Communion (key 35)
  const comm=at(35);
  if(comm){
    comm.text='The Priest reverently consumes the Body of Christ and distributes Holy Communion to the ministers and faithful from the hosts consecrated on Holy Thursday. Psalm 22 or another appropriate chant may be sung, or Communion may be distributed in silence.';
    comm.ref='Roman Missal, Friday of the Passion of the Lord, n. 30';
    comm.acts={P:[['receives the Body of Christ and distributes Holy Communion',.1,.9]]};
    if(options.deacon){
      comm.acts.D=[['receives Holy Communion and assists in distribution',.1,.9]];
    }
  }

  // 17. Reposition & Stripping of the Altar (key 36)
  const purif=at(36);
  if(purif){
    purif.title='Reposition & Stripping of the Altar';
    purif.dur=22;
    purif.posture='sit';
    purif.text='After Communion, the ciborium with remaining consecrated hosts is carried by the Deacon (or Priest) to a place of reposition outside the church (or in a side chapel). The altar is stripped bare once again: the corporal, Missal and altar cloth are removed, leaving the bare altar. A period of sacred silence is kept.';
    purif.ref='Roman Missal, Friday of the Passion of the Lord, nn. 31, 33';
    purif.mv={
      [ordinary]:[
        M([ordinary==='D'?ALT_D:ALT_P],0,.1),
        M([[500,170],[350,270],[260,200],[260,110]],.1,.45),
        M([[260,110],[350,270],[500,240],ordinary==='D'?DCHAIR:CHAIR],.5,.85)
      ]
    };
    purif.acts={
      [ordinary]:[
        ['carries the ciborium to the place of reposition',.1,.45],
        ['strips the altar bare: removes corporal and Missal',.5,.85]
      ]
    };
    purif.props={
      ciborium:[{by:ordinary,t:.1},{at:REPOSE,a:.45,b:.5}],
      corporal:[{hide:true,t:.75}]
    };
    if(ordinary==='D'){
      purif.acts.P=[['sits in silence during reposition and stripping of the altar',.1,.85]];
    }
  }

  // 18. Prayer after Communion (key 37)
  const postComm=at(37);
  if(postComm){
    postComm.text='The Priest says: "Let us pray." All stand, and the Priest says the Prayer after Communion: "Almighty ever-living God, who have restored us to life by the blessed Death and Resurrection of your Christ, preserve in us the work of your mercy, that, by partaking of this mystery, we may have a life unceasingly devoted to you. Through Christ our Lord." All respond: "Amen."';
    postComm.ref='Roman Missal, Friday of the Passion of the Lord, n. 32';
  }

  // 19. Prayer over the People (key 38)
  const prayerPeople=at(38);
  if(prayerPeople){
    prayerPeople.title='Prayer over the People';
    prayerPeople.dur=16;
    prayerPeople.posture='stand';
    prayerPeople.text='For the dismissal, the Deacon (or Priest) says: "Bow down for the blessing." The Priest extends his hands over the people and says the Prayer over the People: "May your abundant blessing, Lord, come down upon your people, who have honoured the Death of your Son in the hope of their resurrection: may pardon come, comfort be given, holy faith increase, and everlasting redemption be made secure. Through Christ our Lord." There is no blessing formula or dismissal.';
    prayerPeople.ref='Roman Missal, Friday of the Passion of the Lord, n. 33';
    prayerPeople.say=[
      [options.deacon?'D':'P','Bow down for the blessing.',.05,.2],
      ['P','May your abundant blessing, Lord, come down upon your people, who have honoured the Death of your Son in the hope of their resurrection: may pardon come, comfort be given, holy faith increase, and everlasting redemption be made secure. Through Christ our Lord.',.25,.88],
      ['ppl','Amen.',.9,1]
    ];
    prayerPeople.acts={
      P:[['extends hands over the people and says the Prayer over the People',.2,.9]]
    };
    if(options.deacon){
      prayerPeople.acts.D=[['says: "Bow down for the blessing"',.05,.2]];
    }
    delete prayerPeople.orans;
  }

  // 20. Silent Departure (key 40)
  const recession=at(40);
  if(recession){
    recession.title='Silent Departure';
    recession.dur=24;
    recession.text='All ministers, after genuflecting to the Holy Cross, depart in complete silence into the sacristy. The altar remains bare, and the Cross remains with candles for prayer and veneration.';
    recession.ref='Roman Missal, Friday of the Passion of the Lord, n. 33';
    recession.say=[];
    recession.bell=[];
    recession.smoke=[];
    recession.acts={
      P:[['genuflects to the Cross and departs in silence',.1,.9]]
    };
    if(options.deacon){
      recession.acts.D=[['genuflects to the Cross and departs in silence',.1,.9]];
    }
    if(hasS){
      recession.acts.S=[['genuflects to the Cross and departs in silence',.1,.9]];
    }
  }
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

// Funerals (Ordo Exsequiarum, OE; Order of Christian Funerals, OCF, US numbering). The coffin rests in the
// aisle before the sanctuary, with the paschal candle on one side and the holy-water stand on the other.
// The funeral director (FD) stands for all the bearers and one member of the family (FM) for the mourners.
// Texts are short paraphrases; "brother" and "he" stand for "brother or sister", "he or she".
const FUNERAL_VIOLET='#5b3a7a';
const FUNERAL_PLACES={
  rest:[500,377],door:[500,790],stand:[460,345],paschal:[540,345],standReach:[470,334],
  celDoor:[500,738],helperDoor:[528,744],thuriferDoor:[472,744],directorDoor:[500,836],familyDoor:[526,836],pallSpot:[528,800],
  directorRest:[500,423],celCoffin:[500,322],helperCoffin:[458,322],thuriferCoffin:[542,322],assistantCoffin:[478,300]
};
// The reception at the church door (OCF 159-161 within Mass; 184-186 outside Mass); cel is standing just
// inside the door, facing it.
function funeralReception({cel,who,helper,within}){
  const F=FUNERAL_PLACES;
  const Who=who[0].toUpperCase()+who.slice(1);
  const step={part:within?'Introductory Rites':'Reception at the Church',title:'Reception at the Church Door',dur:30,posture:'stand',
    text:'The bearers bring the coffin to the door of the church, with the family. '+Who+(within?' and the ministers go':' goes')+' to meet them. He greets those present with words of faith and consolation and sprinkles the coffin with holy water, which recalls the baptism in which the deceased first received new life. A member of the family then places the white pall over the coffin, a reminder of the baptismal garment; a cross or a Book of the Gospels may also be placed on it.'+(within?' At Mass this reception takes the place of the greeting and the Penitential Act. The paschal candle already stands where the coffin will rest.':''),
    ref:(within?'GIRM 384; Order of Christian Funerals 159-161':'Order of Christian Funerals 184-186'),
    mv:{[cel]:M([F.celDoor],0,.08),FM:[M([F.pallSpot],.54,.6),M([F.familyDoor],.76,.82)]},
    acts:{[cel]:[['greets those present',.03,.14],['sprinkles the coffin with holy water',.3,.46]],FM:[['places the white pall on the coffin',.62,.72]]},
    face:{[cel]:[[[500,840],.08,1]],FD:[[F.celDoor,0,1]],FM:[[F.door,.6,.74],[F.celDoor,.82,1]]},
    props:{pall:[{hide:true,t:.7}],drape:[{hide:false,t:.7}]},
    say:[[cel,'(greets those present: the grace and peace of God our Father, who raised Jesus from the dead, be always with you)',.03,.14],['ppl','And with your spirit.',.14,.2],
      [cel,'(as he sprinkles the coffin: in the waters of baptism N. died with Christ and rose with him to new life; may he now share with him eternal glory)',.3,.48],
      ['ppl','(the pall is placed in silence)',.6,.74]]};
  if(helper!==cel){
    step.mv[helper]=M([F.helperDoor],0,.08);
    step.props.holyWater=[{by:cel,t:.26},{by:helper,t:.5}];
    step.acts[helper]=[['holds the holy water for '+who,.08,.26],['offers the sprinkler',.24,.28],['takes back the holy water',.48,.52]];
    step.face[helper]=[[F.door,.08,1]];
  }
  return step;
}
// The final commendation and farewell (OE 46-48; OCF 170-175), shared by the Funeral Mass (applyFuneral)
// and the funeral liturgy outside Mass (mass-rite-funeral.js). cel starts at the chair; helper brings the
// holy water from its stand (cel himself when nobody can); thurifer (if any) holds the thurible; assistant
// (a Deacon who is not the helper) stands by the celebrant; key(id,massKey) names each step.
function funeralCommendationSteps({cel,helper,thurifer,assistant,who,within,sung,key,thuriblePick}){
  const F=FUNERAL_PLACES;
  const Who=who[0].toUpperCase()+who.slice(1);
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const part='Final Commendation';
  const fetch=helper===cel;
  const fromChair=[[625,90],[625,250],[520,300]];
  const steps=[];

  const invitation={key:key('invitation',38),part,title:'Final Commendation: Invitation and Silence',dur:22,posture:'stand',
    text:(within?'After the Prayer after Communion the concluding rites are omitted and the final commendation and farewell take place. ':'Following the Lord\u2019s Prayer, the final commendation and farewell take place. ')+Who+' goes to stand near the coffin, facing the people, with the ministers who hold the holy water'+(thurifer?' and the incense':'')+'. He invites all to pray, and all pray for a while in silence. (Before the commendation a member of the family or a friend may speak in remembrance of the deceased.)',
    ref:(within?'GIRM 384; Order of Christian Funerals 170-172; ':'Order of Christian Funerals 197-199; ')+'Ordo Exsequiarum 46-47',
    mv:{[cel]:fetch?[M([...fromChair,F.standReach],0,.3),M([F.celCoffin],.33,.38)]:M([...fromChair,F.celCoffin],0,.32)},
    acts:{[cel]:fetch?[['takes the holy water from its stand',.3,.33]]:[]},
    face:{[cel]:[[[500,400],.38,1]]},
    props:{holyWater:[{by:helper,t:.31}]},
    say:[[cel,'(invitation: with faith in Jesus Christ, let us commend our brother N. to the mercy of God, that he may rise with all the saints)',.4,.62],['ppl','(all pray in silence)',.64,1]]};
  if(!fetch){
    const route=helper==='D'?[[375,90],[375,250],[440,300],F.standReach]:[[805,110],[700,250],[520,300],F.standReach];
    invitation.mv[helper]=[M(route,.04,.29),M([F.helperCoffin],.32,.38)];
    invitation.acts[helper]=[['takes the holy water from its stand',.29,.32]];
    invitation.face[helper]=[[F.rest,.38,1]];
  }
  if(assistant){
    invitation.mv[assistant]=M([[375,90],[375,250],[440,290],F.assistantCoffin],.04,.3);
    invitation.face[assistant]=[[F.rest,.3,1]];
  }
  if(thurifer){
    invitation.mv[thurifer]=thuriblePick?[M([[760,95]],0,.08),M([[760,250],[560,292],F.thuriferCoffin],.12,.36)]:M([[760,250],[560,292],F.thuriferCoffin],.06,.32);
    invitation.face[thurifer]=[[F.rest,.36,1]];
    invitation.props.thurible=[{by:thurifer,t:thuriblePick?.09:0}];
    invitation.smoke=[[thurifer,0,1]];
  }
  steps.push(invitation);

  const sprinkleEnd=thurifer?.34:.5;
  const farewell={key:key('farewell',38.5),part,title:'Song of Farewell',dur:30,posture:'stand',
    text:'The song of farewell is sung, for example: "Saints of God, come to his aid! Hasten to meet him, angels of the Lord!" During the song '+who+' sprinkles the coffin with holy water'+(thurifer?' and then incenses it':'')+'. The holy water recalls the baptism of the deceased'+(thurifer?'; the incense honours the body, once a temple of the Holy Spirit':'')+'. (The sprinkling'+(thurifer?' and the incensing':'')+' may also take place before or after the song.)',
    ref:(within?'Order of Christian Funerals 173-174; ':'Order of Christian Funerals 200-201; ')+'Ordo Exsequiarum 46-48',
    acts:{[cel]:[['sprinkles the coffin with holy water',.08,sprinkleEnd]]},
    face:{[cel]:[[F.rest,0,1]]},
    props:fetch?{}:{holyWater:[{by:cel,t:.06},{by:helper,t:sprinkleEnd+.02}]},
    say:[['ppl',chant('Saints of God, come to his aid! Hasten to meet him, angels of the Lord! Receive his soul and present him to God the Most High.'),.04,.96]]};
  if(!fetch){
    farewell.acts[helper]=[['offers the sprinkler',.04,.08],['takes back the holy water',sprinkleEnd,sprinkleEnd+.04]];
    farewell.face[helper]=[[F.celCoffin,0,1]];
  }
  if(thurifer){
    farewell.acts[cel].push(['incenses the coffin',.44,.72]);
    farewell.acts[thurifer]=[['hands the thurible to '+who,.36,.4],['takes back the thurible',.72,.76]];
    farewell.face[thurifer]=[[F.celCoffin,0,1]];
    farewell.props.thurible=[{by:cel,t:.4},{by:thurifer,t:.74}];
    farewell.smoke=[[thurifer,0,.4],[cel,.4,.74],[thurifer,.74,1]];
  }
  steps.push(farewell);

  const prayer={key:key('commendation',38.7),part,title:'Prayer of Commendation',dur:18,posture:'stand',
    text:Who+' says the prayer of commendation, entrusting the deceased to the Father of mercies in the sure hope that he will rise with Christ on the last day.'+(fetch?' He first puts the holy water back on its stand.':' The holy water is put back on its stand.')+' The funeral director and the bearers come forward to take the coffin'+(within?', and the ministers make ready for the procession.':'.'),
    ref:(within?'Order of Christian Funerals 175; ':'Order of Christian Funerals 202; ')+'Ordo Exsequiarum 48',
    mv:{FD:M([[470,800],[470,440],F.directorRest],.2,.9)},
    acts:{FD:[['comes forward with the bearers to take the coffin',.2,.9]]},
    orans:{[cel]:[[.24,.8]]},
    face:{[cel]:[[[500,400],0,1]]},
    say:[[cel,'Let us pray.',.18,.24],[cel,'(prayer of commendation: into your hands, Father of mercies, we commend our brother N., in the sure and certain hope that, with all who have died in Christ, he will rise with him on the last day)',.24,.8],['ppl','Amen.',.82,.9]]};
  if(fetch){
    prayer.mv[cel]=[M([F.standReach],0,.06),M([F.celCoffin],.1,.16)];
    prayer.props={holyWater:[{at:F.stand,a:.06,b:.09}]};
    prayer.acts[cel]=[['puts the holy water back on its stand',.06,.1]];
  }else{
    prayer.mv[helper]=[M([F.standReach],.02,.08),M([F.helperCoffin],.12,.18)];
    prayer.props={holyWater:[{at:F.stand,a:.08,b:.11}]};
    prayer.acts[helper]=[['puts the holy water back on its stand',.08,.12]];
  }
  if(thurifer)prayer.smoke=[[thurifer,0,1]];
  steps.push(prayer);
  return steps;
}
// The procession out of the church (OCF 176 within Mass; 203 outside Mass): the ministers go first in single
// file, passing beside the coffin, then the coffin, then the family. order lists the ministers in the order
// they leave; lead gives each one an optional first segment to reach the lane; bow lists those who bow to the
// altar first.
function funeralProcessionOut({speaker,sung,key,order,lead={},bow=[],thurifer,within=true}){
  const chant=text=>sung?'\u266a '+text+' \u266a':text;
  const lane=[[522,300],[522,430],[500,452],[500,860]];
  const mv={},acts={};
  order.forEach((role,i)=>{const a=.22+i*.05;mv[role]=[...segs(lead[role]),M(lane,a,a+.38)];});
  const lastA=.22+Math.max(0,order.length-1)*.05;
  const fdA=Math.min(.74,lastA+.16),fdB=Math.min(1,fdA+.4),fmA=fdA+.05;
  mv.FD=M([[500,960]],fdA,fdB);
  mv.FM=M([[540,380],[500,470],[500,870]],fmA,1);
  for(const role of bow)acts[role]=[['profound bow',.12,.2]];
  acts.FD=[['wheels the coffin out of the church',fdA,fdB]];
  const step={key,part:'Final Commendation',title:'Procession to the Place of Committal',dur:26,posture:'stand',
    text:(within?'The Deacon or, in his absence, the Priest says: ':'An assisting minister, or in the absence of an assisting minister, the presiding minister says: ')+'"In peace let us take our brother to his place of rest." The ministers lead the procession, then the coffin, followed by the family and the mourners, while "In paradisum" or another song is sung. The rite of committal follows at the grave or the crematorium; it takes place outside the church and is not shown here.',
    ref:within?'Order of Christian Funerals 176':'Order of Christian Funerals 203',mv,acts,
    props:{coffin:[{by:'FD',t:0},{hide:true,t:fdB}],drape:[{by:'FD',t:0},{hide:true,t:fdB}]},
    say:[[speaker,'In peace let us take our brother to his place of rest.',.02,.12],['ppl',chant('May the angels lead you into paradise; may the martyrs come to welcome you\u2026 (In paradisum)'),.14,1]]};
  if(thurifer)step.smoke=[[thurifer,0,1]];
  return step;
}

// The Funeral Mass (GIRM 380-385; OCF 154-176): the reception at the door takes the place of the greeting and
// the Penitential Act; there is no Gloria and no Creed; after the Prayer after Communion the final commendation
// replaces the concluding rites (GIRM 384) and the coffin is taken out in procession.
function applyFuneral(steps,options,initialPos,initialProps,visible){
  const at=key=>steps.find(s=>s.key===key);
  const F=FUNERAL_PLACES;
  const sung=options.music!=='said';
  const thurifer=options.incense?(options.serverCount===5?'T':'S'):null;
  const carrier=options.serverCount===5?'S':'P';
  const helper=options.serverCount===5?'S':options.deacon?'D':'P';
  const assistant=options.deacon&&helper!=='D'?'D':null;
  // The ministers wait inside the door, a little further up the aisle, leaving room for the coffin.
  for(const role of ['T','X','C1','C2','L','D','P','S']){
    const p=initialPos[role];
    if(p&&p[1]>=690&&p[0]>=450&&p[0]<=550)initialPos[role]=[p[0],p[1]-100];
  }
  if(carrier==='S')initialPos.S=[530,708];
  initialPos.FD=F.directorDoor.slice();initialPos.FM=F.familyDoor.slice();
  Object.assign(initialProps,{coffin:{by:'FD'},drape:{by:'FD',h:true},pall:{by:'FM'},holyWater:{by:carrier}});
  steps.unshift({key:-.4,...funeralReception({cel:'P',who:'the Priest',helper:carrier,within:true})});

  const entrance=at(0);
  entrance.dur=Math.max(entrance.dur,18);
  entrance.text='After the reception the procession goes to the altar while the Entrance Chant is sung: the ministers go first, then the coffin, with the family following. The coffin is placed in the aisle before the altar, beside the paschal candle. '+entrance.text.replace(/^The people stand as the Entrance Chant is sung\. /,'');
  entrance.ref+='; Order of Christian Funerals 162';
  entrance.props??={};entrance.acts??={};
  Object.assign(entrance.mv,{FD:M([F.directorRest],.22,.86),FM:M([[526,470],[560,380],HOME.FM],.42,.98)});
  Object.assign(entrance.props,{coffin:[{at:F.rest,a:.87,b:.87}],drape:[{at:F.rest,a:.87,b:.87}]});
  entrance.acts.FD=[['brings the coffin before the altar',.22,.86]];
  if(carrier==='S'){
    entrance.mv.S=[M([[528,700],[470,600],[470,420],F.standReach],.1,.6),M([[513,300],[700,250],[805,110],HOME.S],.68,1)];
    entrance.props.holyWater=[{at:F.stand,a:.61,b:.65}];
    entrance.acts.S=[['puts the holy water on its stand by the coffin',.6,.66]];
  }else{
    entrance.mv.P=[M([[500,360],F.standReach],.16,.55),M([[500,310],[530,250]],.62,.86)];
    entrance.props.holyWater=[{at:F.stand,a:.56,b:.6}];
    entrance.acts.P=[...(entrance.acts.P||[]),['puts the holy water on its stand by the coffin',.55,.61]];
  }
  // The bearers withdraw once the coffin is in place.
  (at(1).mv??={}).FD=M([[470,430],[470,800],HOME.FD],0,.6);

  // The Sign of the Cross and the greeting are omitted; the ministers go to their places during the Collect.
  const sign=at(3),next=at(options.gloria?7:8);
  for(const field of ['mv','props']){
    for(const [name,value] of Object.entries(sign[field]||{})){
      next[field]??={};
      next[field][name]=field==='mv'?[...segs(value),...segs(next[field][name])]:[...value,...(next[field][name]||[])];
    }
  }
  next.text='The Priest goes straight to the chair: the reception at the door has taken the place of the greeting and the Penitential Act. '+next.text;
  next.ref+='; Order of Christian Funerals 163-164';

  const homily=at(14);
  homily.text+=' At a funeral the Homily proclaims the paschal mystery and the hope of eternal life; it is never a eulogy of the deceased.';
  homily.ref+='; GIRM 382; Order of Christian Funerals 27';
  const prayer=at(16);
  prayer.text+=' At a funeral the intentions pray for the deceased, for the family and all who mourn, and for all the faithful departed. There is no Creed.';
  prayer.ref+='; GIRM 385';
  const communion=at(35);
  // Communicants walk either side of the coffin, which rests in the middle of the aisle.
  communion.special.lanes=[468,532];

  const blessing=at(38),dismissal=at(39),recession=at(40);
  const commendation=funeralCommendationSteps({cel:'P',who:'the Priest',helper,thurifer,assistant,within:true,sung,key:(id,k)=>k,thuriblePick:thurifer==='S'});
  const last=commendation[commendation.length-1];
  // The cross and candles are taken up during the prayer, as at the dismissal of an ordinary Mass.
  for(const role of ['X','C1','C2','L'])if(dismissal.mv?.[role])(last.mv??={})[role]=[...segs(last.mv[role]),...segs(dismissal.mv[role])];
  for(const name of ['cross','cand1','cand2'])if(dismissal.props?.[name])(last.props??={})[name]=dismissal.props[name];
  steps.splice(steps.indexOf(blessing),1,...commendation);
  steps.splice(steps.indexOf(dismissal),1);

  const hadL=!!recession.mv?.L;
  const order=[thurifer==='T'||visible.has('T')?'T':null,'X','C1','C2',hadL?'L':null,'S','D','P'].filter(role=>role&&visible.has(role));
  const lead={};
  for(const role of ['X','C1','C2'])if(recession.mv?.[role])lead[role]=segs(recession.mv[role])[0];
  if(visible.has('T')&&thurifer!=='T')lead.T=M([[760,250]],0,.2);
  if(visible.has('S')&&thurifer!=='S'&&helper!=='S')lead.S=M([[805,110],[700,250]],0,.2);
  if(helper!=='P')lead[helper]=M([[468,300]],.1,.18);
  const out=funeralProcessionOut({speaker:options.deacon?'D':'P',sung,key:40,order,lead,bow:['P','D'].filter(r=>visible.has(r)),thurifer});
  out.part='Final Commendation';
  steps.splice(steps.indexOf(recession),1,out);
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
