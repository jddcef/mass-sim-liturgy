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
vm.runInContext(fs.readFileSync('mass-rite-exposition.js','utf8')+'\n'+fs.readFileSync('mass-rite-baptism.js','utf8')+'\n'+fs.readFileSync('mass-rite-funeral.js','utf8')+'\n'+`
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
  // Baptism of children outside Mass (mass-rite-baptism.js): a Priest or Deacon, with or without a server.
  let riteFrames=0;
  for(const minister of ['priest','deacon'])for(const serverCount of [0,1,3])for(const music of ['sung','said']){
    const {options,visible,vesture}=buildScenario({rite:'baptism',minister,serverCount,music});
    const cel=minister==='deacon'?'D':'P';
    assert.equal(options.rite,'baptism');
    assert.equal(options.serverCount,Math.min(1,serverCount));
    assert.ok(visible.has(cel)&&visible.has('BP')&&visible.has('GP'));
    assert.equal(visible.has(cel==='P'?'D':'P'),false);
    assert.deepEqual(vesture,{role:cel,cope:false,recolour:true,colour:'#f6f2e6'});
    const keys=STEPS.map(s=>s.key);
    assert.deepEqual(keys,['bap:arrive','bap:reception','bap:procession','bap:word','bap:intercessions','bap:exorcism','bap:toFont','bap:water','bap:promises','bap:baptism','bap:explanatory','bap:return','bap:lordsPrayer','bap:blessing','bap:depart']);
    const idx=key=>keys.indexOf('bap:'+key);
    assert.equal(propAt(idx('exorcism'),'oilCat',.5).by,options.servers?'S':cel);
    assert.deepEqual(actorAt(idx('toFont'),cel,1),[330,758]);
    assert.ok(STEPS[idx('baptism')].say.some(([r,t])=>r===cel&&/I baptize you/.test(t)));
    assert.deepEqual(actorAt(idx('return'),cel,1),[500,262],'the procession goes to the altar');
    assert.deepEqual(actorAt(idx('depart'),cel,1),[952,250]);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','kneel','face','orans'])for(const role in step[field]||{})assert.ok(visible.has(role),minister+': hidden '+role+' in '+field+' of '+step.title);
      for(const [role] of step.say||[])assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const role in ACTORS){p[role]=actorAt(i,role,k/20);assert.ok(p[role].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite),'prop '+name);
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' for '+name+' in '+step.title);
        }
        assert.ok(Number.isFinite(postureAt(i,k/20).val));
        riteFrames++;
      }
    }
  }
  buildScenario({});
  console.log('Passed 12 Baptism (outside Mass) scenarios and '+riteFrames+' sampled frames.');
  // Funeral liturgy outside Mass (mass-rite-funeral.js): a Priest or Deacon with up to two servers.
  let funRiteFrames=0;
  for(const minister of ['priest','deacon'])for(const serverCount of [0,1,2,4])for(const music of ['sung','said']){
    const {options,visible,vesture}=buildScenario({rite:'funeral',minister,serverCount,music});
    const cel=minister==='deacon'?'D':'P';
    const servers=Math.min(2,serverCount);
    assert.equal(options.rite,'funeral');
    assert.ok(options.funeral);
    assert.equal(options.serverCount,servers);
    assert.equal(options.incense,servers===2,'the second server is the thurifer');
    assert.ok(visible.has(cel)&&visible.has('FD')&&visible.has('FM'));
    assert.equal(visible.has(cel==='P'?'D':'P'),false);
    assert.equal(visible.has('T'),servers===2);
    assert.deepEqual(vesture,{role:cel,cope:false,recolour:true,colour:FUNERAL_VIOLET});
    const keys=STEPS.map(s=>s.key);
    assert.deepEqual(keys,['fun:arrive','fun:reception','fun:procession','fun:collect','fun:word','fun:intercessions','fun:lordsPrayer','fun:invitation','fun:farewell','fun:commendation','fun:out']);
    const idx=key=>keys.indexOf('fun:'+key);
    const helper=servers?'S':cel;
    assert.equal(propAt(0,'coffin',0).by,'FD','the coffin is brought to the door');
    assert.equal(propAt(idx('reception'),'pall',.5).by,'FM');
    assert.ok(propAt(idx('reception'),'pall',1).h,'the pall is on the coffin');
    assert.ok(!propAt(idx('reception'),'drape',1).h);
    assert.ok(STEPS[idx('reception')].acts[cel].some(([t])=>/sprinkles/.test(t)));
    assert.deepEqual(propAt(idx('procession'),'coffin',1).at,FUNERAL_PLACES.rest,'the coffin rests before the altar');
    assert.deepEqual(propAt(idx('procession'),'holyWater',1).at,FUNERAL_PLACES.stand);
    assert.deepEqual(actorAt(idx('procession'),cel,1),CHAIR);
    assert.ok(STEPS[idx('word')].say.some(([,t])=>/John 11/.test(t)));
    assert.ok(/never a eulogy/.test(STEPS[idx('word')].text));
    assert.equal(propAt(idx('farewell'),'holyWater',.2).by,cel,'the celebrant sprinkles the coffin');
    assert.equal(STEPS[idx('farewell')].acts[cel].some(([t])=>/incenses/.test(t)),servers===2);
    if(servers===2)assert.equal(propAt(idx('farewell'),'thurible',.5).by,cel);
    assert.deepEqual(propAt(idx('commendation'),'holyWater',1).at,FUNERAL_PLACES.stand,'the holy water goes back');
    assert.ok(STEPS[idx('out')].say.some(([r,t])=>r===cel&&/In peace let us take our brother/.test(t)));
    assert.ok(propAt(idx('out'),'coffin',1).h,'the coffin has left the church');
    assert.ok(actorAt(idx('out'),cel,1)[1]>800);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','kneel','face','orans'])for(const role in step[field]||{})assert.ok(visible.has(role),minister+': hidden '+role+' in '+field+' of '+step.title);
      for(const [role] of step.say||[])assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const role in ACTORS){p[role]=actorAt(i,role,k/20);assert.ok(p[role].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite),'prop '+name);
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' for '+name+' in '+step.title);
        }
        assert.ok(Number.isFinite(postureAt(i,k/20).val));
        funRiteFrames++;
      }
    }
  }
  buildScenario({});
  console.log('Passed 16 Funeral (outside Mass) scenarios and '+funRiteFrames+' sampled frames.');
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

  // Ash Wednesday: the ashes blessed and given after the Homily; no Penitential Act, Gloria, Creed or Alleluia.
  let ashFrames=0,ashCount=0;
  for(const requested of [{ashWednesday:true,serverCount:4,incense:false,deacon:true,lector:true,eucharisticPrayer:'III'},
    {ashWednesday:true,serverCount:0,deacon:false,lector:false,gloria:true,creed:true,introductory:'sprinkling',eucharisticPrayer:'IV',music:'said'},
    {ashWednesday:true,serverCount:2,deacon:false,introductory:'C',bishop:true,confirmation:true},
    {ashWednesday:true,serverCount:0,deacon:true,incense:true},
    {ashWednesday:true,candlemas:true,serverCount:5},{ashWednesday:true,nativity:true,serverCount:5}]){
    const {options,visible}=buildScenario(requested);
    if(requested.candlemas||requested.nativity){
      assert.ok(!options.ashWednesday,'a different day wins over Ash Wednesday');
      assert.ok(STEPS.every(s=>s.title!=='Blessing of Ashes'));
      continue;
    }
    ashCount++;
    assert.ok(options.ashWednesday&&!options.gloria&&!options.creed&&options.introductory==='A'&&!options.bishop&&!options.confirmation);
    assert.notEqual(options.eucharisticPrayer,'IV','a Preface of Lent (GIRM 365d)');
    assert.equal(ROLE_NAMES.P,'Priest');
    const keys=STEPS.map(s=>s.key);
    for(const key of [5,6,7,15])assert.ok(!keys.includes(key),'omitted: '+key);
    assert.equal(keys[keys.indexOf(4)+1],8,'the Collect follows the greeting');
    assert.deepEqual(keys.slice(keys.indexOf(14),keys.indexOf(14)+5),[14,14.3,14.5,14.8,16],'the ashes between the Homily and the Universal Prayer');
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    assert.ok(!STEPS[idx(12)].say.some(([,t])=>/Alleluia/.test(t)),'no Alleluia in Lent');
    if(options.music!=='said')assert.ok(STEPS[idx(12)].say.some(([,t])=>/Glory and praise/.test(t)));
    const blessing=STEPS[idx(14.3)],giving=STEPS[idx(14.5)];
    assert.ok(blessing.acts.P.some(([t])=>/sprinkles the ashes with holy water/.test(t)));
    assert.deepEqual(actorAt(idx(14.3),'P',1),[500,262],'the Priest blesses the ashes before the people');
    const holder=options.deacon?'D':visible.has('S')?'S':'P';
    assert.equal(propAt(idx(14.3),'ashes',.9).by,holder,'the ashes are held by '+holder);
    assert.equal(propAt(idx(14.5),'ashes',.5).by,holder);
    assert.deepEqual(actorAt(idx(14.5),'P',.5),[500,292]);
    assert.equal(giving.special.type,'ashes');
    assert.ok(giving.say.some(([r,t])=>r==='P'&&/Repent, and believe in the Gospel/.test(t)));
    assert.ok(giving.say.some(([r,t])=>r==='P'&&/Remember that you are dust/.test(t)));
    assert.deepEqual(propAt(idx(14.8),'ashes',1).at,[858,132],'the ashes are back at the credence');
    assert.deepEqual(actorAt(idx(14.8),'P',1),CHAIR,'the Priest is at the chair for the Universal Prayer');
    if(options.deacon)assert.deepEqual(actorAt(idx(14.8),'D',1),DCHAIR);
    if(visible.has('S')){
      assert.equal(propAt(idx(14.3),'ewer',.9).by,'S','the server holds the holy water');
      assert.deepEqual(propAt(idx(14.8),'ewer',1).at,[850,144]);
      assert.deepEqual(actorAt(idx(14.8),'S',1),HOME.S);
    }
    chooseHomilyPlace(CHAIR);
    assert.deepEqual(actorAt(idx(14.3),'P',1),[500,262],'also when preaching from the chair');
    chooseHomilyPlace(AMBO);
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite));
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' of '+name+' in '+step.title);
        }
        ashFrames++;
      }
    }
  }
  for(const requested of [{},{candlemas:true},{rite:'exposition',minister:'priest'}]){
    buildScenario(requested);
    assert.ok(STEPS.every(s=>s.title!=='Blessing of Ashes'&&s.special?.type!=='ashes'),'ashes only on Ash Wednesday');
    assert.ok(!propAt(0,'ashes',0,{}).by);
  }
  buildScenario({});
  console.log('Passed '+ashCount+' Ash Wednesday scenarios and '+ashFrames+' sampled frames.');

  // Palm Sunday: the palms blessed at the back, procession with palms, no Gloria, Passion read in parts, Creed is said.
  let palmFrames=0,palmCount=0;
  for(const requested of [{palmSunday:true,serverCount:5,incense:true,deacon:true,lector:true,eucharisticPrayer:'III'},
    {palmSunday:true,serverCount:0,deacon:false,lector:false,gloria:true,creed:false,introductory:'sprinkling',eucharisticPrayer:'IV',music:'said'},
    {palmSunday:true,serverCount:2,deacon:false,introductory:'C',bishop:true,confirmation:true},
    {palmSunday:true,serverCount:0,deacon:true,incense:false},
    {palmSunday:true,ashWednesday:true,serverCount:5},{palmSunday:true,candlemas:true,serverCount:5},{palmSunday:true,nativity:true,serverCount:5}]){
    const {options,visible}=buildScenario(requested);
    if(requested.ashWednesday||requested.candlemas||requested.nativity){
      assert.ok(!options.palmSunday,'a different day wins over Palm Sunday');
      assert.ok(STEPS.every(s=>s.title!=='Blessing of Palms'));
      continue;
    }
    palmCount++;
    assert.ok(options.palmSunday&&!options.gloria&&options.creed&&options.introductory==='A'&&!options.bishop&&!options.confirmation);
    assert.notEqual(options.eucharisticPrayer,'IV','Preface of Palm Sunday (GIRM 365d)');
    assert.equal(ROLE_NAMES.P,'Priest');
    const keys=STEPS.map(s=>s.key);
    for(const key of [3,4,5,6,7])assert.ok(!keys.includes(key),'omitted: '+key);
    assert.equal(keys[0],-.5,'blessing of palms comes first');
    assert.equal(keys[keys.indexOf(options.incense?2:1)+1],8,'the Collect follows the altar reverence/incensation');
    assert.ok(keys.includes(15),'the Creed is said on Sundays in Lent (GIRM 68)');
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    assert.ok(!STEPS[idx(12)].say.some(([,t])=>/Alleluia/.test(t)),'no Alleluia in Lent');
    if(options.music!=='said')assert.ok(STEPS[idx(12)].say.some(([,t])=>/Praise to you, Lord Jesus Christ/.test(t)));
    const blessing=STEPS[idx(-.5)],entrance=STEPS[idx(0)],passion=STEPS[idx(13)];
    assert.equal(blessing.title,'Blessing of Palms');
    assert.ok(blessing.pplPalms&&entrance.pplPalms,'people hold palms');
    assert.equal(passion.title,'The Passion of the Lord');
    assert.equal(passion.smoke.length,0,'no smoke during the Passion');
    assert.ok(passion.pplGenuflect&&passion.pplGenuflect.length>0,'all genuflect at the death of the Lord');
    if(options.deacon){
      assert.ok(passion.say.some(([r])=>r==='D'),'Deacon narrates');
      assert.ok(passion.say.some(([r])=>r==='P'),'Priest speaks words of Christ');
    }
    if(visible.has('S')){
      assert.equal(propAt(idx(-.5),'ewer',.65).by,'S','the server holds the holy water');
      assert.deepEqual(propAt(idx(8),'ewer',1).at,[850,144]);
      assert.deepEqual(actorAt(idx(8),'S',1),HOME.S);
    }
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite));
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' of '+name+' in '+step.title);
        }
        palmFrames++;
      }
    }
  }
  for(const requested of [{},{candlemas:true},{ashWednesday:true},{rite:'exposition',minister:'priest'}]){
    buildScenario(requested);
    assert.ok(STEPS.every(s=>s.title!=='Blessing of Palms'&&!s.pplPalms),'palms only on Palm Sunday');
  }
  buildScenario({});
  console.log('Passed '+palmCount+' Palm Sunday scenarios and '+palmFrames+' sampled frames.');

  // Holy Thursday: bells at the Gloria then silent until the Easter Vigil, Mandatum (Washing of Feet),
  // Creed omitted, Roman Canon with proper formulas, transfer of the Blessed Sacrament to Altar of Repose,
  // stripping of the altar in silence.
  let thursdayFrames=0,thursdayCount=0;
  for(const requested of [{holyThursday:true,serverCount:5,incense:true,deacon:true,lector:true,eucharisticPrayer:'I'},
    {holyThursday:true,serverCount:0,deacon:false,lector:false,gloria:false,creed:true,introductory:'sprinkling',eucharisticPrayer:'IV',music:'said'},
    {holyThursday:true,serverCount:2,deacon:false,introductory:'C',bishop:true,confirmation:true},
    {holyThursday:true,serverCount:1,deacon:true,incense:false},
    {holyThursday:true,palmSunday:true,serverCount:5},{holyThursday:true,ashWednesday:true,serverCount:5},{holyThursday:true,candlemas:true,serverCount:5},{holyThursday:true,nativity:true,serverCount:5}]){
    const {options,visible}=buildScenario(requested);
    if(requested.palmSunday||requested.ashWednesday||requested.candlemas||requested.nativity){
      assert.ok(!options.holyThursday,'a preceding day wins over Holy Thursday');
      assert.ok(STEPS.every(s=>s.title!=='Washing of the Feet (Mandatum)'));
      continue;
    }
    thursdayCount++;
    assert.ok(options.holyThursday&&options.gloria&&!options.creed&&options.introductory==='A'&&!options.bishop&&!options.confirmation);
    assert.equal(options.eucharisticPrayer,'I','Roman Canon on Holy Thursday (Roman Missal, Holy Thursday, nn. 33–35)');
    assert.equal(ROLE_NAMES.P,'Priest');
    const keys=STEPS.map(s=>s.key);
    for(const key of [15,38,40])assert.ok(!keys.includes(key),'omitted: '+key);
    assert.ok(keys.includes(7),'Gloria is included with bells');
    assert.ok(keys.includes(14.5),'Mandatum (Washing of Feet) included');
    assert.ok(keys.includes(16),'Universal Prayer included');
    assert.ok(keys.includes(38.5),'Transfer of the Blessed Sacrament included');
    assert.ok(keys.includes(39),'Stripping of the Altar included');
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    const gloria=STEPS[idx(7)],mandatum=STEPS[idx(14.5)],transfer=STEPS[idx(38.5)],stripping=STEPS[idx(39)];
    assert.ok(gloria.bell&&gloria.bell.length>0,'bells ring during Gloria');
    // Consecration bells silent
    for(const k of [25,26,27]){
      const s=STEPS[idx(k)];
      if(s)assert.equal(s.bell.length,0,'no bells during consecration on Holy Thursday');
    }
    assert.equal(mandatum.title,'Washing of the Feet (Mandatum)');
    assert.equal(transfer.title,'Transfer of the Blessed Sacrament to the Altar of Repose');
    assert.equal(stripping.title,'Stripping of the Altar (Denudatio altaris)');
    assert.equal(stripping.say.length,0,'stripping of altar in complete silence');
    if(visible.has('S')){
      assert.equal(propAt(idx(14.5),'basin',.5).by,'S','the server holds the basin');
    }
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite));
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' of '+name+' in '+step.title);
        }
        thursdayFrames++;
      }
    }
  }
  for(const requested of [{},{candlemas:true},{ashWednesday:true},{palmSunday:true},{rite:'exposition',minister:'priest'}]){
    buildScenario(requested);
    assert.ok(STEPS.every(s=>s.title!=='Washing of the Feet (Mandatum)'&&s.title!=='Stripping of the Altar (Denudatio altaris)'),'Holy Thursday rites only on Holy Thursday');
  }
  buildScenario({});
  console.log('Passed '+thursdayCount+' Holy Thursday scenarios and '+thursdayFrames+' sampled frames.');

  // Good Friday: silent entrance and prostration before bare altar, Passion of St John in parts,
  // Solemn Intercessions, Showing and Adoration of the Holy Cross, Communion from reserved Sacrament,
  // Prayer over the People, silent departure. Strictly no Gloria, Creed, bells, or Eucharistic Prayer.
  let fridayFrames=0,fridayCount=0;
  for(const requested of [{goodFriday:true,serverCount:5,incense:true,deacon:true,lector:true},
    {goodFriday:true,serverCount:0,deacon:false,lector:false,gloria:true,creed:true,introductory:'sprinkling',music:'said'},
    {goodFriday:true,serverCount:2,deacon:false,introductory:'C',bishop:true,confirmation:true},
    {goodFriday:true,serverCount:3,deacon:true,incense:false},
    {goodFriday:true,holyThursday:true,serverCount:5},{goodFriday:true,palmSunday:true,serverCount:5},{goodFriday:true,ashWednesday:true,serverCount:5},{goodFriday:true,candlemas:true,serverCount:5},{goodFriday:true,nativity:true,serverCount:5}]){
    const {options,visible}=buildScenario(requested);
    if(requested.holyThursday||requested.palmSunday||requested.ashWednesday||requested.candlemas||requested.nativity){
      assert.ok(!options.goodFriday,'a preceding day wins over Good Friday');
      assert.ok(STEPS.every(s=>s.title!=='Showing of the Holy Cross (Ecce lignum Crucis)'));
      continue;
    }
    fridayCount++;
    assert.ok(options.goodFriday&&!options.gloria&&!options.creed&&options.introductory==='A'&&!options.bishop&&!options.confirmation);
    assert.equal(ROLE_NAMES.P,'Priest');
    const keys=STEPS.map(s=>s.key);
    for(const key of [2,3,4,5,6,7,15,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,39])assert.ok(!keys.includes(key),'omitted: '+key);
    assert.equal(STEPS.length,21,'Good Friday has exactly 21 steps');
    assert.ok(keys.includes(0),'Entrance in silence included');
    assert.ok(keys.includes(1),'Prostration included');
    assert.ok(keys.includes(8),'Collect included');
    assert.ok(keys.includes(13),'Passion according to John included');
    assert.ok(keys.includes(16),'Solemn Intercessions included');
    assert.ok(keys.includes(16.5),'Showing of Cross included');
    assert.ok(keys.includes(16.7),'Adoration of Cross included');
    assert.ok(keys.includes(17),'Preparation of Altar included');
    assert.ok(keys.includes(17.5),'Transfer from Repose included');
    assert.ok(keys.includes(31),'Lord\u2019s Prayer included');
    assert.ok(keys.includes(34),'Behold the Lamb of God included');
    assert.ok(keys.includes(35),'Holy Communion included');
    assert.ok(keys.includes(36),'Reposition & Stripping included');
    assert.ok(keys.includes(37),'Prayer after Communion included');
    assert.ok(keys.includes(38),'Prayer over the People included');
    assert.ok(keys.includes(40),'Silent Departure included');
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    const entrance=STEPS[idx(0)],prostration=STEPS[idx(1)],passion=STEPS[idx(13)],showing=STEPS[idx(16.5)],adoration=STEPS[idx(16.7)],transfer=STEPS[idx(17.5)],stripping=STEPS[idx(36)],recession=STEPS[idx(40)];
    assert.equal(entrance.title,'Entrance in Silence');
    assert.equal(entrance.say.length,0,'no entrance hymn');
    assert.equal(prostration.title,'Reverence & Prostration in Silence');
    assert.equal(prostration.posture,'kneel');
    assert.deepEqual(actorAt(idx(1),'P',.5),[500,240],'Priest prostrates before the bare altar');
    assert.equal(passion.title,'The Passion of the Lord according to John');
    assert.ok(passion.kneel&&passion.kneel.length>0,'kneel at death of the Lord');
    assert.equal(showing.title,'Showing of the Holy Cross (Ecce lignum Crucis)');
    assert.ok(showing.say.some(([r,t])=>r==='P'&&/Ecce lignum Crucis/.test(t)));
    assert.ok(showing.say.some(([r,t])=>r==='ppl'&&/Venite, adoremus/.test(t)));
    assert.equal(adoration.title,'Adoration of the Holy Cross (Adoratio Sanctae Crucis)');
    assert.ok(adoration.say.some(([r,t])=>r==='ppl'&&/Crucem tuam/.test(t)));
    assert.equal(transfer.title,'Bringing the Blessed Sacrament from the Altar of Repose');
    const holder=options.deacon?'D':'P';
    assert.equal(propAt(idx(17.5),'ciborium',.5).by,holder,'the ciborium is brought by '+holder);
    assert.equal(stripping.title,'Reposition & Stripping of the Altar');
    assert.equal(recession.title,'Silent Departure');
    assert.equal(recession.say.length,0,'silent departure');
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite));
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' of '+name+' in '+step.title);
        }
        fridayFrames++;
      }
    }
  }
  for(const requested of [{},{candlemas:true},{ashWednesday:true},{palmSunday:true},{holyThursday:true},{rite:'exposition',minister:'priest'}]){
    buildScenario(requested);
    assert.ok(STEPS.every(s=>s.title!=='Showing of the Holy Cross (Ecce lignum Crucis)'&&s.title!=='Adoration of the Holy Cross (Adoratio Sanctae Crucis)'),'Good Friday rites only on Good Friday');
  }
  buildScenario({});
  console.log('Passed '+fridayCount+' Good Friday scenarios and '+fridayFrames+' sampled frames.');

  // Baptism of children within Mass (OBP 29): the reception at the door replaces the greeting and the
  // Penitential Act; the sacrament is celebrated at the font after the Universal Prayer and litany.
  let bapFrames=0,bapCount=0;
  for(const requested of [{baptism:true,serverCount:4,deacon:true,lector:true,incense:true},
    {baptism:true,serverCount:0,deacon:false,lector:false,music:'said',gloria:false,creed:true},
    {baptism:true,serverCount:1,deacon:false,gloria:true,introductory:'C'},
    {baptism:true,serverCount:0,deacon:true},
    {baptism:true,bishop:true,serverCount:2},{baptism:true,confirmation:true,bishop:true},{baptism:true,nativity:true},{baptism:true,candlemas:true},{baptism:true,ashWednesday:true}]){
    const {options,visible}=buildScenario(requested);
    if(requested.bishop||requested.nativity||requested.candlemas||requested.ashWednesday){
      assert.ok(!options.baptism,'another celebration wins over Baptism');
      assert.ok(!visible.has('BP')&&!visible.has('GP'));
      assert.ok(STEPS.every(s=>s.title!=='The Baptism'));
      continue;
    }
    bapCount++;
    assert.ok(options.baptism&&!options.creed&&options.solemnBlessing&&options.introductory==='A');
    assert.ok(visible.has('BP')&&visible.has('GP'));
    const keys=STEPS.map(s=>s.key);
    assert.equal(keys[0],-.4,'the reception at the door comes first');
    for(const key of [3,4,5,6,15])assert.ok(!keys.includes(key),'omitted: '+key);
    assert.deepEqual(keys.slice(keys.indexOf(16),keys.indexOf(16)+9),[16,16.2,16.3,16.4,16.5,16.6,16.7,16.8,17],'the sacrament between the Universal Prayer and the Preparation');
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    assert.deepEqual(actorAt(0,'BP',0),[470,840],'the family waits at the door');
    assert.equal(propAt(0,'infant',.5).by,'BP');
    assert.ok(STEPS[idx(-.4)].say.some(([r,t])=>r==='BP'&&t==='Baptism.'));
    assert.deepEqual(actorAt(idx(0),'BP',1),HOME.BP,'the family goes to its places');
    assert.ok(STEPS[idx(16)].say.some(([,t])=>/litany of the saints/.test(t)));
    assert.ok(!STEPS[idx(16)].say.some(([,t])=>/concluding prayer/.test(t)));
    const helper=options.deacon?'D':visible.has('S')?'S':'P';
    assert.equal(propAt(idx(16.2),'oilCat',.5).by,helper,'the oil is held by '+helper);
    assert.deepEqual(propAt(idx(16.2),'oilCat',1).at,[870,150]);
    assert.deepEqual(actorAt(idx(16.3),'P',1),[330,758],'the Priest at the font');
    assert.deepEqual(actorAt(idx(16.3),'BP',1),[302,820]);
    assert.equal(STEPS[idx(16.6)].acts.P.filter(([t])=>/pours water/.test(t)).length,3,'three pourings');
    assert.ok(STEPS[idx(16.6)].say.some(([,t])=>/I baptize you in the name of the Father/.test(t)));
    assert.equal(propAt(idx(16.7),'bcandle',1).by,'GP','the godparent holds the lighted candle');
    assert.ok(propAt(idx(16.7),'garment',1).h,'the garment is on the child');
    assert.deepEqual(propAt(idx(16.7),'chrism',1).at,[362,750]);
    assert.deepEqual(actorAt(idx(16.8),'P',1),CHAIR);
    assert.deepEqual(actorAt(idx(16.8),'BP',1),HOME.BP);
    if(options.deacon)assert.deepEqual(actorAt(idx(16.8),'D',1),DCHAIR);
    if(visible.has('S')&&!options.deacon)assert.deepEqual(actorAt(idx(16.8),'S',1),HOME.S);
    assert.ok(STEPS[idx(38)].say.some(([r,t])=>r==='P'&&/the mother of this child/.test(t)));
    chooseHomilyPlace(CHAIR);
    assert.deepEqual(actorAt(idx(16.3),'P',1),[330,758],'also when preaching from the chair');
    chooseHomilyPlace(AMBO);
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite));
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' of '+name+' in '+step.title);
        }
        bapFrames++;
      }
    }
  }
  for(const requested of [{},{confirmation:true,bishop:true},{rite:'exposition',minister:'priest'}]){
    const {visible}=buildScenario(requested);
    assert.ok(!visible.has('BP')&&!visible.has('GP')&&STEPS.every(s=>s.title!=='The Baptism'),'the baptismal family only at a baptism');
    assert.ok(propAt(0,'infant',0,{}).h);
  }
  buildScenario({});
  console.log('Passed '+bapCount+' Baptism scenarios and '+bapFrames+' sampled frames.');

  // Funeral Mass (GIRM 380-385; OCF 154-176): reception at the door, no Gloria or Creed, and the final
  // commendation in place of the concluding rites, then the procession to the place of committal.
  let funFrames=0,funCount=0;
  for(const requested of [{funeral:true,serverCount:5,deacon:true,lector:true,incense:true},
    {funeral:true,serverCount:4,deacon:false,incense:true,gloria:true,creed:true},
    {funeral:true,serverCount:2,deacon:true,incense:true,music:'said'},
    {funeral:true,serverCount:1,deacon:false},
    {funeral:true,serverCount:0,deacon:true,bothKinds:true},
    {funeral:true,serverCount:0,deacon:false,lector:true},
    {funeral:true,bishop:true},{funeral:true,nativity:true},{funeral:true,candlemas:true},{funeral:true,ashWednesday:true},{funeral:true,baptism:true}]){
    const {options,visible,vesture}=buildScenario(requested);
    if(requested.bishop||requested.nativity||requested.candlemas||requested.ashWednesday||requested.baptism){
      assert.ok(!options.funeral,'another celebration wins over a Funeral Mass');
      assert.ok(!visible.has('FD')&&!visible.has('FM'));
      assert.ok(STEPS.every(s=>!/Commendation/.test(s.title)));
      continue;
    }
    funCount++;
    assert.ok(options.funeral&&!options.gloria&&!options.creed&&!options.solemnBlessing,'no Gloria or Creed');
    assert.ok(visible.has('FD')&&visible.has('FM'));
    assert.deepEqual(vesture,{role:'P',roles:['P','D'],cope:false,recolour:true,colour:FUNERAL_VIOLET});
    const keys=STEPS.map(s=>s.key);
    assert.equal(keys[0],-.4,'the reception at the door comes first');
    for(const key of [3,4,5,6,7,15,39])assert.ok(!keys.includes(key),'omitted: '+key);
    assert.deepEqual(keys.slice(keys.indexOf(37)),[37,38,38.5,38.7,40],'the commendation follows the Prayer after Communion');
    assert.equal(stepStart.length,STEPS.length);
    assert.equal(TOTAL,STEPS.reduce((n,s)=>n+s.dur,0));
    const idx=key=>STEPS.findIndex(s=>s.key===key);
    assert.equal(propAt(0,'coffin',0).by,'FD');
    assert.ok(propAt(0,'pall',1).h&&!propAt(0,'drape',1).h,'the pall is placed at the door');
    assert.deepEqual(propAt(idx(0),'coffin',1).at,FUNERAL_PLACES.rest);
    assert.deepEqual(propAt(idx(0),'holyWater',1).at,FUNERAL_PLACES.stand);
    assert.deepEqual(actorAt(idx(0),'FM',1),HOME.FM,'the family goes to its places');
    assert.deepEqual(actorAt(idx(1),'FD',1),HOME.FD,'the bearers withdraw');
    assert.ok(/never a eulogy/.test(STEPS[idx(14)].text));
    assert.deepEqual(STEPS[idx(35)].special.lanes,[468,532],'communicants pass either side of the coffin');
    assert.ok(STEPS[idx(38.5)].acts.P.some(([t])=>/sprinkles/.test(t)));
    assert.equal(STEPS[idx(38.5)].acts.P.some(([t])=>/incenses/.test(t)),!!options.incense);
    assert.equal(propAt(idx(38.5),'holyWater',.2).by,'P');
    assert.deepEqual(propAt(idx(38.7),'holyWater',1).at,FUNERAL_PLACES.stand);
    assert.ok(STEPS[idx(40)].say.some(([r,t])=>r===(options.deacon?'D':'P')&&/In peace let us take/.test(t)));
    assert.ok(propAt(idx(40),'coffin',1).h,'the coffin has left the church');
    assert.ok(actorAt(idx(40),'P',1)[1]>800,'the Priest leads the coffin out');
    for(let i=0;i<STEPS.length;i++){
      const step=STEPS[i];
      for(const field of ['mv','acts','orans','face'])for(const role in step[field]||{})assert.ok(visible.has(role),'hidden '+role+' in '+step.title);
      for(const [role] of step.say)assert.ok(role==='ppl'||visible.has(role),role+' speaks in '+step.title);
      for(let k=0;k<=20;k++){
        const p={};
        for(const r in ACTORS){p[r]=actorAt(i,r,k/20);assert.ok(p[r].every(Number.isFinite));}
        for(const name in PROP_DEF){
          const prop=propAt(i,name,k/20,p);
          assert.ok(resolveProp(prop,p,name).every(Number.isFinite));
          if(!prop.h&&prop.by)assert.ok(visible.has(prop.by),'invisible holder '+prop.by+' of '+name+' in '+step.title);
        }
        funFrames++;
      }
    }
  }
  for(const requested of [{},{baptism:true},{rite:'exposition',minister:'priest'}]){
    const {visible}=buildScenario(requested);
    assert.ok(!visible.has('FD')&&!visible.has('FM')&&STEPS.every(s=>!/Commendation/.test(s.title)),'the coffin only at a funeral');
    assert.ok(propAt(0,'coffin',0,{}).h);
  }
  buildScenario({});
  console.log('Passed '+funCount+' Funeral Mass scenarios and '+funFrames+' sampled frames.');
`,context);

// Chancel arch (mass-features.js): no sampled minister walk passes through a chancel wall outside its openings.
{
  const features=fs.readFileSync('mass-features.js','utf8');
  vm.runInContext(features.match(/const CHANCEL=[\s\S]*?\};/)[0]+'\n'+features.match(/function chancelBlocks\(a,b\)\{[\s\S]*?\n\}/)[0]+`
  {
    const requests=[],bad=[];
    let walks=0;
    for(let mask=0;mask<32;mask++)requests.push({deacon:!!(mask&1),servers:!!(mask&2),lector:!!(mask&4),incense:!!(mask&8),bothKinds:!!(mask&16)});
    for(const serverCount of [0,2,5])requests.push({serverCount,deacon:true,lector:true,incense:serverCount>0},{bishop:true,serverCount,incense:true},{confirmation:true,serverCount,incense:serverCount>0},{rite:'baptism',minister:'priest',serverCount},{rite:'exposition',minister:'priest',serverCount,incense:serverCount>0},{rite:'funeral',minister:'priest',serverCount});
    for(const request of requests){
      buildScenario(request);
      for(let i=0;i<STEPS.length;i++)for(const role in ACTORS){
        let prev=actorAt(i,role,0);
        for(let k=1;k<=40;k++){
          const p=actorAt(i,role,k/40);
          walks++;
          if(chancelBlocks(prev,p))bad.push(role+' in '+STEPS[i].title+' '+JSON.stringify(request));
          prev=p;
        }
      }
    }
    assert.deepEqual(bad.slice(0,5),[],'walks through a chancel wall');
    buildScenario({});
    console.log('Passed chancel walls against '+walks+' sampled walks.');
  }`,context);
}
