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
`,context);
