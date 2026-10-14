const ORIGINAL_STEPS=JSON.parse(JSON.stringify(STEPS));
const SERVER_ROLES=['X','C1','C2','T','S'];
const ROLE_NAMES={P:'Priest',D:'Deacon',X:'Cross-bearer',C1:'Candle-bearer',C2:'Candle-bearer',T:'Thurifer',S:'Server',L:'Lector',Ps:'Psalmist',G1:'Gift-bearer',G2:'Gift-bearer',ppl:'People'};

function buildScenario(requested){
  const serverCount=requested.serverCount??(requested.servers?5:0);
  if(!Number.isInteger(serverCount)||serverCount<0||serverCount>5){
    throw new RangeError('Server count must be an integer from 0 to 5.');
  }
  const options={...requested,serverCount,servers:serverCount>0,incense:serverCount>0&&requested.incense,bothKinds:requested.deacon&&requested.bothKinds};
  const visible=new Set(Object.keys(ACTORS));
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
    initialProps.cross={at:[670,126]};
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
      missal:[{by:minister,t:.12},{at:[450,160],a:.7,b:.76}],
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
    if(!carriedCross)initialProps.cross={at:[670,126]};
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
  const filtered=steps.filter(s=>options.incense||![2,20].includes(s.key));
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
