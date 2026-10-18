const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const context=vm.createContext({assert,console});
vm.runInContext(
  fs.readFileSync('mass-rite.js','utf8')+'\n'+
  fs.readFileSync('mass-scenarios.js','utf8')+'\n'+`
  const original=JSON.stringify(ORIGINAL_STEPS);
  let frames=0;
  for(let mask=0;mask<32;mask++){
    const requested={
      deacon:!!(mask&1),servers:!!(mask&2),lector:!!(mask&4),
      incense:!!(mask&8),bothKinds:!!(mask&16)
    };
    const {options,visible}=buildScenario(requested);
    assert.equal(options.incense,requested.servers&&requested.incense);
    assert.equal(options.bothKinds,requested.deacon&&requested.bothKinds);
    assert.equal(STEPS.length,options.incense?41:39);
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans']){
        for(const role in step[field])assert.ok(visible.has(role),mask+': hidden '+role+' in '+field);
      }
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role));
      for(let k=0;k<=20;k++){
        const p={};
        for(const role in ACTORS){
          p[role]=actorAt(i,role,k/20);
          assert.ok(p[role].every(Number.isFinite),mask+': actor '+role);
        }
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          const point=resolveProp(prop,p,name);
          assert.ok(point.every(Number.isFinite),mask+': prop '+name);
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),mask+': invisible holder '+prop.by+' for '+name+' in '+step.title);
        }
        assert.ok(Number.isFinite(postureAt(i,k/20).val));
        frames++;
      }
    }
    if(!options.incense)assert.ok(!STEPS.some(s=>s.key===2||s.key===20));
    if(!options.deacon){
      const gospel=STEPS.findIndex(s=>s.title==='The Gospel');
      assert.ok(STEPS[gospel].say.some(s=>s[0]==='P'));
      assert.deepEqual(actorAt(gospel,'P',0),AMBO);
      const dismissal=STEPS.find(s=>s.key===39);
      assert.ok(dismissal.say.some(s=>s[0]==='P'&&s[1].includes('Go forth')));
    }
    if(!options.lector){
      for(const key of [9,10,11]){
        const i=STEPS.findIndex(s=>s.key===key);
        assert.deepEqual(actorAt(i,'P',.5),AMBO);
      }
    }
    const communion=STEPS.find(s=>s.key===35);
    assert.equal(communion.special.bothKinds,options.bothKinds);
    if(!options.bothKinds)assert.ok(!communion.say.some(s=>s[1]==='The Blood of Christ.'));
    assert.equal(JSON.stringify(ORIGINAL_STEPS),original);
  }
  buildScenario({deacon:true,servers:true,lector:true,incense:true,bothKinds:true});
  assert.equal(STEPS.length,41);
  for(let serverCount=0;serverCount<=5;serverCount++){
    for(let mask=0;mask<16;mask++){
      const result=buildScenario({
        serverCount,deacon:!!(mask&1),lector:!!(mask&2),
        incense:!!(mask&4),bothKinds:!!(mask&8)
      });
      assert.equal(SERVER_ROLES.filter(role=>result.visible.has(role)).length,serverCount);
      assert.equal(result.assignments.length,serverCount);
      for(let i=0;i<STEPS.length;i++){
        const step=STEPS[i];
        for(const field of ['mv','acts','orans']){
          for(const role in step[field])assert.ok(result.visible.has(role));
        }
        for(let k=0;k<=20;k++){
          const pos=Object.fromEntries(Object.keys(ACTORS).map(role=>[role,actorAt(i,role,k/20)]));
          for(const name in PROP_DEF){
            const state=propAt(i,name,k/20,pos);
            assert.ok(resolveProp(state,pos,name).every(Number.isFinite));
            if(!state.h&&state.by)assert.ok(result.visible.has(state.by),serverCount+': '+name+' held by hidden '+state.by);
          }
          frames++;
        }
        if(serverCount>0&&serverCount<5&&result.options.incense&&[26,27].includes(step.key)){
          assert.equal(step.bell.length,0);
          assert.ok(step.acts.S.some(([text])=>text.includes('incenses')));
        }
      }
    }
  }
  for(const serverCount of [-1,6,1.5,NaN]){
    assert.throws(()=>buildScenario({serverCount}),{name:'RangeError'});
  }
  console.log('Passed 32 legacy scenarios, 96 server-count scenarios and '+frames+' sampled frames.');
`,context);

// Exposition, adoration and Benediction (mass-rite-exposition.js): every form samples valid frames.
vm.runInContext(fs.readFileSync('mass-rite-exposition.js','utf8')+'\n'+`
  let expFrames=0;
  for(const minister of ['lay','priest','deacon'])for(let serverCount=0;serverCount<=3;serverCount++)for(const incense of [false,true]){
    const {options,visible,vesture}=buildScenario({rite:'exposition',minister,serverCount,incense});
    const M=EXPOSITION_MINISTERS[minister];
    assert.equal(options.rite,'exposition');
    assert.equal(options.incense,incense&&serverCount>=2);
    assert.ok(visible.has(M));
    assert.equal(STEPS.some(s=>s.key==='exp:blessing'),minister!=='lay');
    assert.equal(vesture?.role,minister==='lay'?undefined:M,'the ordained minister wears the cope');
    for(const step of STEPS)for(const role in step.veil||{})assert.equal(role,M,'only the minister wears the humeral veil');
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','kneel','face','veil'])for(const role in step[field]||{})assert.ok(visible.has(role),minister+': hidden '+role+' in '+field+' of '+step.title);
      for(const [role] of step.say||[])assert.ok(role==='ppl'||visible.has(role));
      for(let k=0;k<=20;k++){
        const p={};
        for(const role in ACTORS){p[role]=actorAt(i,role,k/20);assert.ok(p[role].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite),'prop '+name);
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' for '+name+' in '+step.title);
        }
        assert.ok(Number.isFinite(postureAt(i,k/20).val));
        expFrames++;
      }
    }
  }
  buildScenario({});
  assert.equal(STEPS[0].key,0,'Mass is the default rite');
  console.log('Passed 24 exposition scenarios and '+expFrames+' sampled frames.');
  // Mass with the Bishop: the insignia pass between the Bishop and his bearers and are never left unheld.
  let bishopFrames=0;
  for(const solemnBlessing of [false,true])for(const serverCount of [1,5]){
    const {options,visible}=buildScenario({bishop:true,serverCount,incense:true,solemnBlessing});
    assert.ok(options.deacon&&options.lector,'the Bishop brings a Deacon and a reader');
    assert.equal(ROLE_NAMES.P,'Bishop');
    assert.ok(visible.has('MB')&&visible.has('CB'));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    const holder=(key,name,u)=>{const i=idx(key),p={};for(const r in ACTORS)p[r]=actorAt(i,r,u);return propAt(i,name,u,p).by;};
    for(let i=0;i<STEPS.length;i++)for(let k=0;k<=20;k++){
      const p={};
      for(const r in ACTORS)p[r]=actorAt(i,r,k/20);
      for(const name of ['mitre','staff']){
        const prop=propAt(i,name,k/20,p);
        assert.ok(!prop.h&&['P','MB','CB'].includes(prop.by),name+' held in '+STEPS[i].title);
        assert.ok(resolveProp(prop,p,name).every(Number.isFinite));
      }
      bishopFrames++;
    }
    assert.equal(holder(0,'mitre',.5),'P');assert.equal(holder(0,'staff',.5),'P');
    assert.equal(holder(1,'mitre',.5),'MB');assert.equal(holder(1,'staff',.5),'CB');
    assert.equal(holder(9,'mitre',.5),'P','seated with the mitre for the readings');
    assert.equal(holder(13,'staff',.5),'P');assert.equal(holder(13,'mitre',.5),'MB');
    assert.equal(holder(14,'mitre',.5),'P');assert.equal(holder(14,'staff',.5),'P');
    assert.deepEqual(actorAt(idx(14),'P',.5).map(Math.round),CHAIR.map(Math.round),'the homily at the cathedra');
    assert.equal(holder(38,'mitre',.9),'P');assert.equal(holder(38,'staff',.9),'P');
    assert.equal(holder(39,'mitre',.7),'MB','the altar is kissed without the insignia');
    assert.equal(holder(40,'mitre',.9),'P');assert.equal(holder(40,'staff',.9),'P');
    assert.ok(STEPS[idx(4)].say.some(([r,t])=>r==='P'&&t==='Peace be with you.'));
    assert.ok(STEPS.every(s=>!/\bPriest\b/.test(s.text)),'the rubrics name the Bishop');
  }
  const plain=buildScenario({serverCount:5,incense:true});
  assert.equal(ROLE_NAMES.P,'Priest');
  assert.ok(!plain.visible.has('MB')&&!plain.visible.has('CB'));
  assert.ok(STEPS[STEPS.findIndex(s=>s.key===4)].say.some(([r,t])=>r==='P'&&t==='The Lord be with you.'));
  assert.ok(!buildScenario({bishop:true,rite:'exposition',minister:'priest'}).visible.has('MB'),'no bearers at Exposition');
  assert.equal(ROLE_NAMES.P,'Priest');
  buildScenario({});
  console.log('Passed 4 Mass with the Bishop scenarios and '+bishopFrames+' sampled frames.');
  // Confirmation within Mass: the rite after the Gospel, the Creed omitted, the chrism always held or set down.
  let confirmFrames=0;
  for(const serverCount of [0,1,5])for(const eucharisticPrayer of ['I','III']){
    const {options,visible}=buildScenario({confirmation:true,serverCount,incense:serverCount>0,eucharisticPrayer});
    assert.ok(options.bishop&&options.deacon&&!options.creed&&options.solemnBlessing);
    assert.equal(ROLE_NAMES.P,'Bishop');
    assert.ok(visible.has('K')&&visible.has('SP'));
    const keys=STEPS.map(s=>s.key);
    assert.ok(!keys.includes(15),'the Creed is omitted (Ordo Confirmationis 31)');
    for(const key of [13.5,14.2,14.4,14.6,14.8])assert.ok(keys.includes(key),'step '+key);
    assert.deepEqual(keys.filter(k=>k>13&&k<16),[13.5,14,14.2,14.4,14.6,14.8]);
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    const holder=(key,name,u)=>{const i=idx(key),p={};for(const r in ACTORS)p[r]=actorAt(i,r,u);return propAt(i,name,u,p);};
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),serverCount+': hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name of ['mitre','staff']){
          const prop=propAt(i,name,k/20,p);
          assert.ok(!prop.h&&['P','MB','CB'].includes(prop.by),name+' held in '+step.title);
        }
        const chrism=propAt(i,'chrism',k/20,p);
        assert.ok(!chrism.h&&(chrism.by?visible.has(chrism.by):chrism.at),'chrism in '+step.title);
        assert.ok(resolveProp(chrism,p,'chrism').every(Number.isFinite));
        confirmFrames++;
      }
    }
    assert.equal(holder(14.6,'chrism',.5).by,'D','the Deacon holds the chrism for the anointing');
    assert.equal(holder(14.6,'mitre',.55).by,'P','the Bishop anoints wearing the mitre');
    assert.equal(holder(14.4,'mitre',.7).by,'MB','the prayer without the mitre');
    assert.equal(holder(14.8,'ewer',.5).by,serverCount?'S':'D');
    assert.deepEqual(holder(40,'chrism',.5).at,[878,138],'the chrism is back at the credence');
    assert.deepEqual(actorAt(idx(14.6),'K',.55).map(Math.round),[500,306],'the candidate before the Bishop');
    assert.deepEqual(actorAt(idx(16),'K',0),HOME.K,'back in the pew');
    assert.ok(STEPS[idx(14.6)].say.some(([r,t])=>r==='P'&&/be sealed with the Gift of the Holy Spirit/.test(t)));
    assert.equal(/Hanc igitur/.test(STEPS[idx(25)].text),eucharisticPrayer==='I');
    assert.ok(/Ordo Confirmationis 33/.test(STEPS[idx(38)].ref));
    assert.ok(STEPS.every(s=>!/\bPriest\b/.test(s.text)),'the rubrics name the Bishop');
  }
  for(const requested of [{},{bishop:true},{rite:'exposition',minister:'priest'}]){
    const {visible}=buildScenario(requested);
    assert.ok(!visible.has('K')&&!visible.has('SP'),'candidates only at Confirmation');
    assert.ok(STEPS.every(s=>![13.5,14.2,14.4,14.6,14.8].includes(s.key)),'no Confirmation steps');
  }
  buildScenario({});
  console.log('Passed 6 Confirmation scenarios and '+confirmFrames+' sampled frames.');
  // Christmas Mass during the Night: the Proclamation before the Entrance, the genuflection at the Creed, the crib blessed.
  let nativityFrames=0;
  for(const requested of [{nativity:true,serverCount:5,incense:true,deacon:true,lector:true,solemnBlessing:true,eucharisticPrayer:'I'},
    {nativity:true,serverCount:0,lector:false,creed:false,gloria:false,eucharisticPrayer:'IV',music:'said'},
    {nativity:true,bishop:true,serverCount:5,incense:true,solemnBlessing:true},{nativity:true,confirmation:true}]){
    const {options,visible}=buildScenario(requested);
    assert.ok(options.nativity&&options.creed&&options.gloria,'Gloria and Creed at Christmas');
    assert.ok(!options.confirmation,'no ritual Mass on a solemnity (GIRM 372)');
    assert.notEqual(options.eucharisticPrayer,'IV','EP IV has its own Preface (GIRM 365d)');
    assert.equal(ROLE_NAMES.P,options.bishop?'Bishop':'Priest');
    assert.ok(visible.has('Ps'),'the cantor sings the Proclamation');
    assert.equal(STEPS[0].key,-.5);
    assert.equal(STEPS[1].key,0);
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    const proclamation=STEPS[0];
    assert.ok(proclamation.say.some(([r,t])=>r==='Ps'&&/Nativity of our Lord Jesus Christ according to the flesh/.test(t)));
    assert.equal(proclamation.say.some(([,t])=>/\u266a/.test(t)),options.music!=='said');
    assert.deepEqual(actorAt(0,'Ps',.5),AMBO,'the Proclamation from the ambo');
    assert.deepEqual(actorAt(0,'Ps',1),HOME.Ps,'back to the pew');
    assert.deepEqual(actorAt(0,'P',.5),START_POS.P,'the celebrant waits at the back');
    const creed=STEPS[idx(15)];
    assert.ok(creed.pplGenuflect&&!creed.pplBow,'all genuflect');
    assert.ok(creed.say.some(([r,t])=>r==='ppl'&&/all genuflect/.test(t)));
    for(const role of ['P','D',...SERVER_ROLES,...BEARER_ROLES])if(visible.has(role))assert.ok(creed.acts[role].some(([t])=>t==='genuflects'),role+' genuflects');
    const prayer=STEPS[idx(16)];
    assert.ok(prayer.say.some(([r,t])=>r==='P'&&/manger/.test(t)));
    assert.deepEqual(prayer.face.P[0][0],CRIB);
    assert.ok(/Book of Blessings .*1562-1564/.test(prayer.ref));
    assert.equal(/Communicantes/.test(STEPS[idx(25)].text),options.eucharisticPrayer==='I');
    assert.equal(/Solemn Blessings 2/.test(STEPS[idx(38)].ref),options.solemnBlessing);
    if(options.bishop)assert.ok(STEPS.every(s=>!/\bPriest\b/.test(s.text)),'the rubrics name the Bishop');
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF)assert.ok(resolveProp(propAt(i,name,k/20,p),p,name).every(Number.isFinite));
        nativityFrames++;
      }
    }
  }
  for(const requested of [{},{bishop:true},{confirmation:true},{rite:'exposition',minister:'priest'}]){
    buildScenario(requested);
    assert.ok(STEPS.every(s=>s.key!==-.5&&!s.pplGenuflect),'Christmas rites only at Christmas');
  }
  buildScenario({});
  console.log('Passed 4 Christmas scenarios and '+nativityFrames+' sampled frames.');
  // Candlemas: the candles blessed at the back, the procession with the Canticle of Simeon, then the Gloria at once.
  let candleFrames=0;
  for(const requested of [{candlemas:true,serverCount:5,incense:true,deacon:true,lector:true,creed:false,secondReading:false,eucharisticPrayer:'III'},
    {candlemas:true,serverCount:0,deacon:false,lector:false,gloria:false,introductory:'sprinkling',eucharisticPrayer:'IV',music:'said'},
    {candlemas:true,serverCount:2,incense:false,deacon:true,introductory:'C',bishop:true,confirmation:true},
    {candlemas:true,nativity:true,serverCount:5,incense:true}]){
    const {options,visible}=buildScenario(requested);
    if(requested.nativity){
      assert.ok(!options.candlemas&&options.nativity,'Christmas wins over Candlemas');
      assert.ok(STEPS.every(s=>s.title!=='Blessing of Candles'));
      continue;
    }
    assert.ok(options.candlemas&&options.gloria&&options.introductory==='A'&&!options.bishop&&!options.confirmation);
    assert.notEqual(options.eucharisticPrayer,'IV','the proper Preface (GIRM 365d)');
    assert.equal(ROLE_NAMES.P,'Priest');
    const keys=STEPS.map(s=>s.key);
    assert.equal(keys[0],-.5);assert.equal(keys[1],0);
    for(const key of [3,4,5,6])assert.ok(!keys.includes(key),'no separate Sign of the Cross, greeting or Penitential Act ('+key+')');
    assert.equal(keys[keys.indexOf(0)+(options.incense?3:2)],7,'the Gloria follows the reverence at once');
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    const blessing=STEPS[0];
    assert.equal(blessing.title,'Blessing of Candles');
    assert.ok(blessing.say.some(([r,t])=>r==='P'&&/In the name of the Father/.test(t)),'the Sign of the Cross at the blessing');
    assert.ok(blessing.say.some(([r,t])=>r==='P'&&/The Lord be with you/.test(t)),'the greeting at the blessing');
    assert.ok(blessing.say.some(([r,t])=>r===(options.deacon?'D':'P')&&/go forth in peace/.test(t)));
    assert.ok(blessing.say.some(([r,t])=>r==='ppl'&&/In the name of Christ/.test(t)));
    assert.ok(blessing.acts.P.some(([t])=>/sprinkles the candles/.test(t)));
    assert.equal(blessing.acts.P.some(([t])=>/puts incense/.test(t)),options.incense);
    assert.equal(blessing.say.some(([,t])=>/\u266a/.test(t)),options.music!=='said');
    assert.ok(blessing.pplCandles&&STEPS[1].pplCandles,'the faithful hold lighted candles');
    assert.deepEqual(actorAt(0,'P',.5),START_POS.P,'the Priest blesses the candles at the back');
    assert.ok(STEPS[1].say.some(([,t])=>/A light for revelation/.test(t)),'the Canticle of Simeon');
    if(visible.has('S')){
      assert.equal(propAt(0,'ewer',.7).by,'S','the server holds the holy water');
      assert.deepEqual(propAt(1,'ewer',1).at,[850,144],'and takes it back to the credence');
      assert.deepEqual(actorAt(1,'S',1),HOME.S);
    }else assert.ok(!propAt(0,'ewer',.5).by,'the Priest sprinkles without a server');
    const gloria=STEPS[idx(7)];
    assert.deepEqual(actorAt(idx(7),'P',1),CHAIR,'the Priest goes to the chair for the Gloria');
    if(options.deacon)assert.deepEqual(actorAt(idx(7),'D',1),DCHAIR);
    assert.ok(/Presentation of the Lord, n\. 7/.test(gloria.ref));
    assert.ok(!STEPS[idx(8)].pplCandles,'the candles are out by the Collect');
    assert.ok(/Presentation of the Lord/.test(STEPS[idx(23)].text));
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF)assert.ok(resolveProp(propAt(i,name,k/20,p),p,name).every(Number.isFinite));
        candleFrames++;
      }
    }
  }
  for(const requested of [{},{nativity:true},{rite:'exposition',minister:'priest'}]){
    buildScenario(requested);
    assert.ok(STEPS.every(s=>s.title!=='Blessing of Candles'&&!s.pplCandles),'candles only at Candlemas');
  }
  buildScenario({});
  console.log('Passed 3 Candlemas scenarios and '+candleFrames+' sampled frames.');
`,context);
