const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const context=vm.createContext({assert,console});
for(const file of ['mass-rite.js','mass-scenarios.js','mass-game-logic.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const same=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m);
const run=code=>vm.runInContext(code,context);
const G=name=>run(name);

const buildScenario=G('buildScenario'), STEPS=G('STEPS');
const setup=(role,raw={})=>{
  const {options,notes}=G('normaliseGameOptions')(role,raw);
  const scenario=buildScenario(G('scenarioRequest')(options));
  return {options,notes,scenario};
};

// ---- option normalisation ----
{
  const norm=G('normaliseGameOptions');
  let r=norm('T',{serverCount:2,incense:false});
  assert.equal(r.options.serverCount,5);assert.equal(r.options.incense,true);assert.ok(r.notes.length>=2);
  r=norm('X',{serverCount:3});assert.equal(r.options.serverCount,4);
  r=norm('D',{deacon:false});assert.equal(r.options.deacon,true);
  r=norm('L',{lector:false});assert.equal(r.options.lector,true);
  r=norm('P',{serverCount:0,incense:true,bothKinds:true,deacon:false});
  assert.equal(r.options.incense,false);assert.equal(r.options.bothKinds,false);
  assert.equal(r.options.bells.elevation,false);
  assert.throws(()=>norm('nobody',{}),/Unknown role/);
  for(const role of Object.keys(G('GAME_ROLES'))){
    const {scenario}=setup(role,{});
    const actor=G('GAME_ROLES')[role].actor;
    if(actor)assert.ok(scenario.visible.has(actor),role+' must be visible');
  }
}

// ---- new scenario options ----
{
  const base=buildScenario({deacon:true,lector:true,serverCount:5,incense:true}).options;
  assert.equal(STEPS.length,41);assert.equal(base.gloria,true);
  const keys=()=>STEPS.map(s=>s.key);
  buildScenario({deacon:true,lector:true,serverCount:5,incense:true,gloria:false,creed:false,secondReading:false});
  assert.equal(STEPS.length,38);for(const k of [7,11,15])assert.ok(!keys().includes(k));
  buildScenario({deacon:true,lector:true,serverCount:5,incense:true,introductory:'sprinkling'});
  assert.ok(!keys().includes(6));
  buildScenario({deacon:true,lector:true,serverCount:5,incense:true,bells:{start:true}});
  same(STEPS[0].bell,[[0,.06]]);
  buildScenario({deacon:true,lector:true,serverCount:5,incense:true,bells:{epiclesis:false,elevation:false}});
  assert.ok(STEPS.every(s=>!(s.bell||[]).length));
  buildScenario({deacon:true,lector:true,serverCount:5,incense:true,eucharisticPrayer:'III'});
  assert.ok(STEPS.some(s=>/EP III/.test(s.ref)));
  buildScenario({deacon:true,lector:true,serverCount:5,incense:true,music:'said'});
  assert.ok(STEPS.length<=41);
  // baseline restored
  buildScenario({deacon:true,lector:true,serverCount:5,incense:true});
  assert.equal(STEPS.length,41);
}

// ---- duties and decisions per role ----
for(const role of ['P','D','S','X','C1','T','L','PEW','SAC']){
  const {options}=setup(role,{});
  const duties=G('deriveDuties')(role,STEPS,options);
  if(role!=='SAC')assert.ok(duties.length>5,role+' has duties');
  for(let i=1;i<duties.length;i++){
    const a=duties[i-1],b=duties[i];
    assert.ok(a.step<b.step||(a.step===b.step&&a.t<=b.t+1e-9),role+' duties ordered');
  }
  assert.equal(new Set(duties.map(d=>d.id)).size,duties.length);
  const key=G('selectDecisionDuties')(duties,'key');
  assert.ok(key.length<=duties.length&&key.length>0||role==='SAC');
  for(const level of ['guided','choice','timed','expert']){
    for(const duty of key){
      const d=G('buildDecision')(duty,level,7,duties);
      assert.equal(d.options.filter(o=>o.correct).length,1,role+' '+level+' one correct option: '+duty.text);
      if(level==='guided')assert.equal(d.options.length,1);
      if(level==='choice'&&duty.type!=='posture')assert.ok(d.options.length>=2,'choices for '+duty.text);
      assert.equal(d.timer>0,level==='timed');
      const right=d.options.find(o=>o.correct);
      assert.ok(G('checkAnswer')(d,duty.type==='move'?duty.to:right.label));
      for(const o of d.options.filter(o=>!o.correct))assert.ok(!G('checkAnswer')(d,o.label),'distractor wrong: '+o.label);
      if(level==='expert'&&duty.type==='move')assert.equal(d.input,'floor');
      if(level==='expert'&&duty.type==='say')assert.equal(d.input,'book');
    }
  }
  if(role==='S'){
    assert.ok(duties.some(d=>/bell/.test(d.text)),'server rings the bell');
    assert.ok(duties.some(d=>d.type==='move'&&d.place==='credence'),'server goes to the credence');
  }
  if(role==='P')assert.ok(duties.some(d=>d.type==='say'));
  if(role==='PEW')assert.ok(duties.some(d=>d.type==='posture'&&d.answer==='kneel'));
}
// decisions are deterministic for a seed
{
  setup('P',{});
  const duty=G('deriveDuties')('P').find(d=>d.type==='say');
  same(JSON.stringify(G('buildDecision')(duty,'choice',3)),JSON.stringify(G('buildDecision')(duty,'choice',3)));
  const move=G('deriveDuties')('P').find(d=>d.type==='move');
  const dec=G('buildDecision')(move,'expert',3);
  assert.ok(G('checkAnswer')(dec,[move.to[0]+20,move.to[1]+20]));
  assert.ok(!G('checkAnswer')(dec,[move.to[0]+200,move.to[1]]));
}
// incense duties only with incense
{
  setup('T',{});
  assert.ok(G('deriveDuties')('T').some(d=>/incens|thurible|swing/i.test(d.text)));
  setup('S',{incense:false,serverCount:4});
  assert.ok(!G('deriveDuties')('S').some(d=>/incenses/i.test(d.text)));
}

// ---- scoring and timers ----
{
  const score=G('scoreDecision');
  assert.equal(score({level:'choice',correct:true,attempt:1}),100);
  assert.equal(score({level:'choice',correct:true,attempt:2}),40);
  assert.equal(score({level:'expert',correct:true,attempt:1}),150);
  assert.equal(score({level:'timed',correct:true,attempt:1,remaining:.5}),125);
  assert.equal(score({level:'timed',correct:true,timedOut:true}),0);
  assert.equal(score({level:'choice',correct:false}),0);
  assert.equal(score({level:'guided',correct:true}),25);
  assert.equal(G('decisionTimer')('choice','act'),0);
  assert.ok(G('decisionTimer')('timed','say')>G('decisionTimer')('timed','posture'));
  const board=G('createScoreboard')();
  const d={id:'x',kind:'act',level:'timed',ref:'GIRM 1',title:'T',correct:'a'};
  G('recordResult')(board,d,{correct:true,attempt:1,remaining:1});
  G('recordResult')(board,d,{correct:false,timedOut:true});
  assert.equal(board.points,150);assert.equal(board.possible,300);assert.equal(board.timeouts,1);
  assert.equal(G('gradeBoard')(board).percent,50);
  assert.equal(board.log[0].ref,'GIRM 1');
}

// ---- sacristan checklists ----
{
  const {options}=setup('SAC',{incense:false,bothKinds:false,introductory:'A',giftsProcession:true});
  let items=G('sacristanSetup')(options);
  const need=id=>items.find(i=>i.id===id).needed;
  assert.equal(need('thurible'),false);assert.equal(need('chalice2'),false);assert.equal(need('aspersory'),false);
  assert.equal(need('chalice'),true);same(items.find(i=>i.id==='wine').places,['giftTable']);
  assert.ok(items.some(i=>i.trap));
  const o2=setup('SAC',{incense:true,bothKinds:true,introductory:'sprinkling',giftsProcession:false,serverCount:5,bells:{start:true}}).options;
  items=G('sacristanSetup')(o2);
  for(const id of ['thurible','chalice2','aspersory','sacristyBell','procCross','procCandles'])assert.equal(need(id),true,id);
  same(items.find(i=>i.id==='wine').places,['credence']);
  const neededIds=items.filter(i=>i.needed).map(i=>i.id);
  let s=G('checklistScore')(items,neededIds);
  assert.ok(s.complete);assert.equal(s.points,s.possible);
  s=G('checklistScore')(items,[...neededIds.slice(1),'hosts']);
  assert.equal(s.missed,1);assert.equal(s.traps,1);assert.ok(!s.complete);
  const pack=G('sacristanPackAway')(o2);
  assert.ok(pack.find(i=>i.id==='thuribleOut').needed);
  assert.ok(pack.find(i=>i.id==='lampOut').trap&&!pack.find(i=>i.id==='lampOut').needed);
  assert.equal(G('sacristanPackAway')(options).find(i=>i.id==='thuribleOut').needed,false);
}

// ---- NPC lapses, nudges and M.C. cues ----
{
  const {scenario,options}=setup('P',{});
  const lapses=G('planLapses')({playerRole:'P',level:'choice',seed:4,visible:scenario.visible});
  assert.equal(lapses.length,3);
  for(const l of lapses){assert.notEqual(l.role,'P');assert.ok(scenario.visible.has(l.role));}
  for(let i=1;i<lapses.length;i++)assert.ok(lapses[i].step-lapses[i-1].step>=2);
  same(G('planLapses')({playerRole:'S',visible:scenario.visible}),[]);
  same(G('planLapses')({playerRole:'P',enabled:false,visible:scenario.visible}),[]);
  const n=G('nudgeDecision')(lapses[0],'choice',scenario.visible);
  assert.ok(G('checkAnswer')(n,lapses[0].role));
  assert.ok(!G('checkAnswer')(n,'P'));
  const board=G('createScoreboard')();
  G('recordResult')(board,n,{correct:true});assert.equal(board.lapsesCaught,1);assert.equal(board.points,80);
  void options;
  const mc=setup('MC',{});
  const mcl=G('planLapses')({playerRole:'MC',level:'expert',seed:2,visible:mc.scenario.visible});
  assert.equal(mcl.length,6);assert.ok(mcl.some(l=>l.kind==='wrong'));
  const cues=G('deriveCues')(mc.scenario.visible,STEPS,'key');
  assert.ok(cues.length>10);
  const steps=new Set();for(const c of cues){assert.ok(!steps.has(c.step));steps.add(c.step);}
  for(const level of ['guided','choice','timed','expert']){
    const cd=G('cueDecision')(cues[3],level,mc.scenario.visible,1);
    assert.ok(cd.options.some(o=>o.correct));
    assert.ok(G('checkAnswer')(cd,cues[3].correctRoles[0]));
  }
  // simultaneous candle-bearers both count as right
  const twin=G('deriveCues')(mc.scenario.visible,STEPS,'all').find(c=>c.correctRoles.includes('C1')&&c.correctRoles.includes('C2'));
  assert.ok(twin,'candle-bearers act together');
}

// ---- sound cues and the book ----
{
  setup('P',{bells:{start:true}});
  let cues=G('deriveSoundCues')(STEPS,G('stepStart'));
  assert.equal(cues.filter(c=>c.type==='sacristyBell').length,1);
  assert.ok(cues.filter(c=>c.type==='bell').length>=2);
  assert.ok(cues.some(c=>c.type==='thurible'&&c.swings>=2));
  for(let i=1;i<cues.length;i++)assert.ok(cues[i].time>=cues[i-1].time);
  setup('P',{incense:false,bells:{epiclesis:false,elevation:false}});
  cues=G('deriveSoundCues')(STEPS,G('stepStart'));
  assert.equal(cues.length,0);
  setup('P',{gloria:false});
  const book=G('buildBook')('P');
  assert.ok(book.length>=4);
  const sections=book.flatMap(p=>p.sections);
  assert.ok(sections.some(s=>!s.today),'omitted texts are kept, marked not used today');
  const line=G('deriveDuties')('P').find(d=>d.type==='say');
  assert.ok(G('findInBook')(book,line.text));
}

// ---- pre-Mass tasks ----
{
  for(const role of ['P','D','S','X','C1','T','L','MC','PEW']){
    const {options}=setup(role,{});
    const tasks=G('preMassTasks')(role,options);
    assert.ok(tasks.length>=1,role);
    for(const t of tasks)if(t.options.length)assert.equal(t.options.filter(o=>o.correct).length,1,role+' '+t.id);
  }
  {
    const {options}=setup('S',{});
    const line=G('preMassTasks')('S',options,G('serverTeam')(5),G('starts')[0].pos.S).find(t=>t.id==='line');
    assert.equal(line.places[0],'serverBench','the book server waits at the bench, not in the procession');
    assert.ok(G('checkAnswer')({...line,level:'expert'},[720,60]));
    assert.ok(!G('checkAnswer')({...line,level:'expert'},[500,770]));
    const back=G('preMassTasks')('X',options,G('serverTeam')(5),G('starts')[0].pos.X).find(t=>t.id==='line');
    assert.ok(G('checkAnswer')(back,[500,730]));
  }
  for(const role of ['P','D','S','T','L','MC','PEW','SAC']){
    const {options}=setup(role,{});
    const tasks=G('postMassTasks')(role,options);
    if(role==='SAC'){assert.equal(tasks.length,0);continue;}
    for(const t of tasks)assert.equal(t.options.filter(o=>o.correct).length,1,role+' '+t.id);
    if(role!=='PEW')assert.ok(G('checkAnswer')(tasks[0],[1110,150]),'sacristy floor click');
  }
  const {options}=setup('MC',{});
  const order=G('procOrder')(options,G('serverTeam')(5));
  assert.equal(order[0],'Thurifer');assert.equal(order[order.length-1],'Priest');
  assert.equal(G('placeFor')([500,58],'P').id,'home');
  assert.equal(G('placeFor')([860,128]).id,'credence');
  assert.equal(G('placeFor')([1100,160]).id,'sacristy');
  const route=G('routeBetween')([300,500],[700,100]);
  assert.ok(route.length>1);
}
console.log('mass-game tests passed');
