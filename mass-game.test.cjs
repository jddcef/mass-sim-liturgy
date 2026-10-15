const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const context=vm.createContext({assert,console});
for(const file of ['mass-rite.js','mass-scenarios.js','mass-game-logic.js','mass-game-icons.js']){
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
      assert.equal(d.options.filter(o=>o.correct).length,duty.type==='homily'?2:1,role+' '+level+' correct options: '+duty.text);
      if(level==='guided')assert.equal(d.options.length,duty.type==='homily'?2:1);
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
  const steps=new Set();for(const c of cues){
    assert.ok(!steps.has(c.step)||c.key===20&&/incenses the Priest/.test(c.text));
    steps.add(c.step);
  }
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
  setup('P',{incense:false,bells:{start:false,epiclesis:false,elevation:false}});
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
    if(tasks[0].kind==='place')assert.ok(G('checkAnswer')(tasks[0],[1110,150]),'sacristy floor click');
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
// ---- watch level, questions off ----
{
  const levels=G('GAME_LEVELS');
  assert.equal(Object.keys(levels)[0],'watch');assert.ok(levels.watch.watch);
  assert.ok(G('isGuided')('watch'));assert.ok(G('isGuided')('guided'));assert.ok(!G('isGuided')('choice'));
  const {options,scenario}=setup('P',{lapses:true});
  same(G('planLapses')({playerRole:'P',level:'watch',seed:4,visible:scenario.visible}),[],'no lapses when watching');
  const auto=G('autoAnswer'),check=G('checkAnswer');
  for(const level of ['choice','expert','timed'])for(const role of ['P','S','T','L','D']){
    const {options:o}=setup(role,{});
    const duties=G('deriveDuties')(role,STEPS,o);
    for(const duty of duties){
      const d=G('buildDecision')(duty,level,7,duties);
      assert.ok(check(d,auto(d)),'autoAnswer must be correct: '+role+' '+level+' '+d.title);
    }
  }
  const items=G('sacristanSetup')(options,scenario.team||[]);
  same(auto({input:'checklist',items}),items.filter(i=>i.needed).map(i=>i.id));
  assert.equal(auto({kind:'nudge',correctRoles:['C1'],options:[]}),'C1');
}

// ---- crucifix and processional-cross placement ----
{
  const CP=G('CRUCIFIX_PLACES'),CS=G('CROSS_STANDS'),inc=G('incensedCross'),circ=G('altarCircuit');
  for(const crucifix of Object.keys(CP))for(const crossStand of Object.keys(CS)){
    const c=inc({crucifix,crossStand});
    assert.equal(c.kind,CP[crucifix].nearAltar?'crucifix':'processional',crucifix);
    if(c.kind==='processional')same(c.at,CS[crossStand].at);
    const circuit=circ(c.stop);
    assert.notEqual(circuit.end,'FL','circuit must not end where it began');
    assert.ok(circuit.path.length>=4);
    for(const incense of [true,false])for(const serverCount of [1,3,5]){
      const {options,scenario}=setup('P',{crucifix,crossStand,incense,serverCount});
      void scenario;
      const stand=STEPS.find(s=>s.key===39)?.props?.cross?.find(e=>e.at);
      if(stand&&serverCount>=2)same(stand.at,CS[crossStand].at,'cross returns to its stand');
      const step=STEPS.find(s=>s.key===2);
      if(!options.incense){assert.ok(!step,'no incensing step without incense');continue;}
      same(step.cross.at,c.at);
      const holders=step.props.thurible.map(e=>e.by);
      assert.equal(holders[0],'P');assert.notEqual(holders[1],'P','thurible returned');
      assert.ok(step.acts.P.some(a=>/incenses the cross/.test(a[0])));
    }
  }
  // GAME_PLACES follows the stand; the incensing spot wins over the washing stand.
  const cross=G('setCrossPlaces')({crucifix:'none',crossStand:'left'});
  assert.equal(cross.kind,'processional');
  assert.equal(G('placeFor')(cross.stop).id,'beforeCross');
  same(G('GAME_PLACES').find(p=>p.id==='crossStand').at,[330,142]);
  G('setCrossPlaces')({crucifix:'wall',crossStand:'right'});
  assert.equal(G('GAME_PLACES').filter(p=>p.id==='beforeCross').length,1);
  const norm=G('normaliseGameOptions')('P',{crucifix:'bogus',crossStand:'nowhere'}).options;
  assert.equal(norm.crucifix,'wall');assert.equal(norm.crossStand,'right');
}

// ---- symbols ----
{
  const I=G('GameIcons');
  assert.equal(I.iconFor('Ring the bell'),'bell');
  assert.equal(I.iconFor('Cruet of wine'),'cruets');
  same(I.targetFor('Incense the crucifix'),{cross:true});
  same(I.targetFor('Chalice with purificator'),{prop:'chalice'});
  assert.equal(I.iconFor('Thurifer','role'),'person');
  for(const [,icon] of I.RULES)assert.ok(I.PATHS[icon],'icon '+icon+' has a drawing');
  assert.match(I.svg('bell'),/^<svg[^>]*>.*<\/svg>$/s);
  for(const item of G('sacristanSetup')(setup('SAC',{}).options,[]))assert.ok(I.iconFor(item.name),'icon for '+item.name);
}
// ---- round 3: the Sign of the Cross is its own decision, not hidden behind the walk to the chair ----
{
  const {options}=setup('P',{});
  const key=G('selectDecisionDuties')(G('deriveDuties')('P',STEPS,options),'key');
  const index=STEPS.findIndex(s=>s.title==='Sign of the Cross');
  const greeting=STEPS.findIndex(s=>s.title==='Greeting');
  assert.ok(index>=0&&index<greeting,'the Sign of the Cross comes before the Greeting');
  const here=key.filter(d=>d.step===index);
  assert.ok(here.some(d=>d.type==='move'),'moves to the chair');
  assert.ok(here.some(d=>d.type==='act'&&/signs/.test(d.text)),'signs himself');
  assert.ok(here.some(d=>d.type==='say'&&/Father/.test(d.text)),'speaks the words before the Greeting');
  const actions=key.filter(d=>d.type!=='move'&&d.type!=='posture'&&!(d.key===20&&/incenses the Priest|incenses the people/.test(d.text)));
  assert.equal(new Set(actions.map(d=>d.step+':'+d.type)).size,actions.length,'one gesture and spoken line at each key moment');
}

// ---- round 3: season colours ----
{
  const day=d=>JSON.parse(JSON.stringify(run('liturgicalDay(new Date('+JSON.stringify(d+'T12:00:00')+'))')));
  assert.equal(day('2025-12-07').colour,'purple');
  assert.equal(day('2025-12-14').colour,'rose');
  assert.equal(day('2026-02-22').colour,'purple');
  assert.equal(day('2026-03-15').colour,'rose');
  assert.equal(day('2026-03-29').colour,'red');
  assert.equal(day('2026-04-05').colour,'white');
  assert.equal(day('2026-05-24').colour,'red');
  assert.equal(day('2026-08-02').colour,'green');
  assert.equal(day('2026-01-11').season,'Christmas');
  assert.equal(day('2026-11-22').colour,'white');
  assert.equal(run('easterSunday(2026).toDateString()'),'Sun Apr 05 2026');
  assert.equal(run('easterSunday(2025).toDateString()'),'Sun Apr 20 2025');
  assert.equal(run('nextSunday(new Date(2026,9,14)).toDateString()'),'Sun Oct 18 2026');
  assert.equal(run('nextSunday(new Date(2026,9,18)).toDateString()'),'Sun Oct 18 2026');
}
// ---- parish ministries and fair decisions ----
{
  const {options,scenario}=setup('P',{readerCount:2,emhc:true,reservedCommunion:true,collection:true,lectorProcession:false});
  assert.ok(scenario.visible.has('L2')&&scenario.visible.has('E')&&scenario.visible.has('U'));
  same(G('starts')[0].pos.L,G('HOME').L);
  assert.ok(!STEPS.find(s=>s.key===0).mv.L);
  const second=STEPS.find(s=>s.key===11);
  assert.ok(second.say.some(([role])=>role==='L2'));
  assert.ok(!second.say.some(([role])=>role==='L'));
  const cues=G('deriveCues')(scenario.visible,STEPS,'key');
  assert.ok(cues.some(c=>c.key===17.5&&c.correctRoles.includes('U')&&/begins/.test(c.text)));
  const incensing=STEPS.find(s=>s.key===20);
  const priest=incensing.acts.D.find(([text])=>text==='incenses the Priest');
  const people=incensing.acts.D.find(([text])=>text==='incenses the people');
  assert.ok(priest[2]<people[1]);
  assert.equal(G('propAt')(STEPS.indexOf(incensing),'thurible',.94).by,'D','minister retains thurible until the people have been incensed');
  assert.ok(cues.some(c=>c.key===20&&c.text==='incenses the Priest'));
  const communion=STEPS.find(s=>s.key===35);
  assert.ok(communion.mv.E[0].a>communion.acts.P.find(([text])=>text==='receives Communion')[2]);
  assert.ok(communion.acts.E.some(([text])=>/from the Priest/.test(text)));
  const reserve=STEPS.find(s=>s.key===36);
  assert.ok(reserve.acts.D.some(([text])=>/reposes/.test(text)));
  assert.ok(!reserve.acts.E);
  assert.ok(STEPS.some(s=>s.key===34.5));
  for(const key of [38,39,40])assert.equal(STEPS.find(s=>s.key===key).posture,'stand');
  assert.ok(STEPS.find(s=>s.key===32).dur>=20);
  const duties=G('deriveDuties')('P',STEPS,options);
  const homily=duties.find(d=>d.type==='homily');
  for(const level of ['watch','guided','choice','timed','expert']){
    const d=G('buildDecision')(homily,level,1,duties);
    for(const target of [G('AMBO'),G('CHAIR')])assert.ok(G('checkAnswer')(d,target));
    assert.ok(G('checkAnswer')(d,'the ambo'));
    assert.ok(G('checkAnswer')(d,"the celebrant's chair"));
  }
  G('chooseHomilyPlace')(G('AMBO'));
  const index=STEPS.findIndex(s=>s.key===14);
  same(G('actorAt')(index,'P',.5),G('AMBO'));
  G('chooseHomilyPlace')(G('CHAIR'));
  same(G('actorAt')(index,'P',.5),G('CHAIR'));
  const nudge=G('nudgeDecision')({id:'test',role:'S',expected:'ring the bell',title:'Elevation'},'expert',scenario.visible);
  assert.match(nudge.prompt,/ring the bell/);
  for(const duty of duties.filter(d=>d.type==='move'&&['altarP','altarD','altarFront','altarRight','altarLeft','altar'].includes(d.place))){
    const d=G('buildDecision')(duty,'choice',1,duties);
    for(const option of d.options.filter(o=>!o.correct))assert.ok(G('distance')(option.at,duty.to)>100);
  }
  for(const role of ['L2','U','E']){
    const config=setup(role,{deacon:false,lector:false,secondReading:false});
    assert.ok(config.scenario.visible.has(G('GAME_ROLES')[role].actor));
    assert.ok(G('deriveDuties')(role,STEPS,config.options).length>0);
    const tasks=G('preMassTasks')(role,config.options,config.scenario.team,G('HOME')[role]);
    assert.ok(tasks.some(task=>task.id==='line'&&task.target[1]>310));
    assert.ok(!G('postMassTasks')(role,config.options).some(task=>task.id==='where'));
  }
  for(let mask=0;mask<32;mask++){
    const config=setup('P',{deacon:!!(mask&1),lectorProcession:!!(mask&2),readerCount:2,
      emhc:!!(mask&4),reservedCommunion:!!(mask&8),giftsProcession:!!(mask&16),incense:!!(mask&2)});
    for(let i=0;i<STEPS.length;i++)for(const u of [0,.5,1]){
      const pos=Object.fromEntries(Object.keys(G('ACTORS')).map(role=>[role,G('actorAt')(i,role,u)]));
      for(const p of Object.values(pos))assert.ok(p.every(Number.isFinite));
      for(const name of Object.keys(G('PROP_DEF'))){
        const state=G('propAt')(i,name,u,pos);
        assert.ok(G('resolveProp')(state,pos,name).every(Number.isFinite));
        if(state.by&&!state.h)assert.ok(config.scenario.visible.has(state.by),name+' has a visible holder');
      }
    }
  }
  assert.equal(G('nextTimerAllowance')(0,true),5);
  assert.equal(G('nextTimerAllowance')(30,true),30);
  assert.equal(G('nextTimerAllowance')(10,false),10);
  const stops=[{time:10,done:true},{time:20},{time:30}];
  same(G('nextQuestionStop')(stops,12,100),stops[1]);
  assert.equal(G('nextQuestionStop')(stops,12,5),null);
}
// ---- controller regressions: revealed answer and score rollback ----
{
  const ui=vm.createContext({
    assert,console,scene:null,clearTimeout:()=>{},performance:{now:()=>100},
    document:{body:{classList:{remove:()=>{}}},createElement:()=>({append:()=>{}})},
    GameAudio:{correct:()=>{},wrong:()=>{}}
  });
  for(const file of ['mass-rite.js','mass-scenarios.js','mass-game-logic.js','mass-game.js']){
    vm.runInContext(fs.readFileSync(file,'utf8'),ui,{filename:file});
  }
  vm.runInContext(`
    const nodes={
      decision:{className:'',hidden:false},
      decisionOptions:{buttons:[],querySelectorAll(){return this.buttons;}},
      decisionTimer:{hidden:false},
      decisionFeedback:{replaceChildren(){}},
      decisionContinue:{hidden:true,focus(){}},
      bookModal:{hidden:false},
      gameLog:{children:[1,2,3],get firstElementChild(){return {remove:()=>this.children.shift()};}}
    };
    const $=id=>nodes[id];
    updateScore=()=>{};logResult=()=>{};clearMarkers=()=>{};setHighlight=()=>{};toast=()=>{};
    let jumped,playing,resolved=0;
    jump=(...args)=>{jumped=args;};setPlaying=value=>{playing=value;};
    const options=[{label:'correct',correct:true},{label:'wrong'}];
    nodes.decisionOptions.buttons=options.map(o=>({
      dataset:{value:JSON.stringify(o.label)},disabled:false,classList:{add(){}}
    }));
    const active={finished:false,decision:{options,correct:'correct',attempts:2,noScore:true},
      started:100,attempt:3,resolve:()=>resolved++};
    game.active=active;game.level='choice';
    finish(active,{correct:false,answer:'wrong'});
    assert.equal(nodes.decisionOptions.buttons[0].disabled,false);
    assert.equal(nodes.decisionOptions.buttons[1].disabled,true);
    assert.equal(nodes.decisionContinue.hidden,false);
    nodes.decisionOptions.buttons[0].onclick();
    assert.equal(resolved,1);
    assert.equal(game.active,null);
    nodes.decisionContinue.onclick();
    assert.equal(resolved,1,'stale Continue cannot resolve twice');

    const prior={time:2,done:true},later={time:4,done:true};
    const oldBoard=createScoreboard();
    game.phase='mass';game.gen=3;game.stops=[prior,later];game.autoCount=4;
    game.history=[{stop:prior,board:oldBoard,autoCount:1,logLen:1}];
    game.board.points=200;game.board.log.push({correct:true});
    game.active={timer:1};game.busy=true;game.lapse={role:'S'};
    nodes.bookModal.hidden=false;
    redoPrevious();
    assert.equal(game.gen,4);
    assert.equal(game.history.length,0);
    assert.equal(JSON.stringify(game.board),JSON.stringify(oldBoard));
    assert.equal(game.autoCount,1);
    assert.equal(nodes.gameLog.children.length,1);
    assert.equal(prior.done,false);assert.equal(later.done,false);
    assert.equal(game.active,null);assert.equal(game.lapse,null);assert.equal(game.busy,false);
    assert.equal(nodes.bookModal.hidden,true);
    assert.equal(jumped[0],0);assert.equal(playing,true);
  `,ui);
}
console.log('mass-game tests passed');
