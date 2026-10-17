const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const context=vm.createContext({assert,console});
for(const file of ['mass-rite.js','mass-scenarios.js','mass-parishes.js','mass-game-logic.js','mass-game-icons.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const same=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m);
const run=code=>vm.runInContext(code,context);
const G=name=>run(name);

{
  const profiles=G('ChurchProfiles');
  for(const style of ['aisles','full']){
    const p=profiles.base();p.seating.style=style;
    profiles.activate(p);
    for(const r of profiles.checks(p)){
      same(G('routeBetween')(r.from,r.to),r.path,'game uses the same routes as the editor');
    }
  }
  profiles.activate(null);
}

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
  // The sacristy bell sounds as a question opens just before the procession moves off.
  const start=G('stepStart');
  const bell=G('preProcessionBell')(cues,0,start[1]);
  assert.equal(bell?.type,'sacristyBell');
  assert.equal(G('preProcessionBell')(cues,start[1]+1,start[1]),null,'not for later questions');
  assert.equal(G('preProcessionBell')(cues,bell.until+.5,start[1]),null,'not once the bell has passed');
  bell.rung=true;
  assert.equal(G('preProcessionBell')(cues,0,start[1]),null,'rings only once');
  G('rewindCues')(cues,0);
  assert.equal(G('preProcessionBell')(cues,0,start[1]),bell,'going back lets it ring again');
  setup('P',{incense:false,bells:{start:false,epiclesis:false,elevation:false}});
  cues=G('deriveSoundCues')(STEPS,G('stepStart'));
  assert.equal(cues.filter(c=>c.type!=='silence').length,0,'no bells or thurible');
  assert.ok(cues.some(c=>c.type==='silence'),'silences are marked with a soft sound');
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
// ---- round 5: Deacon Communion, sacristan opening, cupboard and hints ----
{
  const says=(scenario,role,text)=>G('STEPS').some(s=>(s.say||[]).some(([r,t])=>r===role&&t===text));
  let {options,scenario}=setup('P',{deacon:true});
  assert.equal(options.deaconCommunion,true);
  assert.ok(says(scenario,'D','The Body of Christ.'),'the Deacon distributes Communion by default');
  ({scenario}=setup('P',{deacon:true,deaconCommunion:false}));
  assert.ok(!says(scenario,'D','The Body of Christ.'));
  ({options}=setup('SAC',{}));
  assert.equal(options.openChurch,true);
  const opening=G('sacristanOpening')();
  same(opening.map(t=>t.id),['unlock','enter','lights','openMain']);
  assert.equal(opening[0].correct,'the outside door of the sacristy');
  assert.equal(opening[3].correct,'the main doors, from the inside');
  for(const task of opening){
    assert.equal(task.options.filter(o=>o.correct).length,1,task.id);
    assert.equal(task.options.find(o=>o.correct).label,task.correct,task.id);
    if(task.kind==='place')assert.ok(task.target,task.id+' has a target');
  }
  const items=G('sacristanSetup')(options);
  const ordered=G('cupboardOrder')(items);
  assert.equal(ordered.length,items.length);
  same(new Set(ordered.map(i=>i.id)).size,items.length);
  const firstOther=ordered.findIndex(i=>i.places[0]!=='sacristy');
  assert.ok(ordered.slice(firstOther).every(i=>i.places[0]!=='sacristy'),'vestments and sacristy things come first');
  assert.equal(G('hintDelay')('guided'),0);
  assert.ok(G('hintDelay')('choice')>0&&G('hintDelay')('expert')>G('hintDelay')('choice'));
  const places=G('GAME_PLACES');
  assert.ok(places.some(p=>p.id==='sacristyDoor')&&places.some(p=>p.id==='mainDoors'));
  const nudge=G('nudgeDecision')({id:'x',role:'C2',expected:'lights the candle'},'choice',new Set(['P','C1','C2','S']));
  same(nudge.options.map(o=>o.label),['Candle-bearer 1','Candle-bearer 2','Server']);
  assert.equal(nudge.options.find(o=>o.correct).role,'C2');
}
// ---- offline materials and reversible detail ----
{
  const {SURFACE_FINISHES,surfaceTextureSize,surfaceSample}=require('./mass-materials.js');
  const {GRAPHICS_PROFILES,GraphicsDetail}=require('./mass-graphics.js');
  assert.equal(surfaceTextureSize(GRAPHICS_PROFILES.low),0);
  assert.equal(surfaceTextureSize(GRAPHICS_PROFILES.standard),256);
  assert.equal(surfaceTextureSize(GRAPHICS_PROFILES.high),512);
  assert.ok(SURFACE_FINISHES.gold.metalness>.5);
  assert.ok(SURFACE_FINISHES.marble.roughness<SURFACE_FINISHES.sandstone.roughness);
  for(const kind of Object.keys(SURFACE_FINISHES)){
    const values=new Set();
    for(let i=0;i<24;i++){
      const u=(i+.37)/24,v=(i*7+.61)/24;
      const sample=surfaceSample(kind,u,v);
      assert.deepEqual(sample,surfaceSample(kind,u,v),'deterministic '+kind);
      assert.ok(sample.value>=0&&sample.value<=1&&sample.height>=0&&sample.height<=1);
      for(const periodic of [surfaceSample(kind,u+1,v),surfaceSample(kind,u,v+1)]){
        assert.ok(Math.abs(periodic.value-sample.value)<1e-10,'seamless '+kind);
        assert.ok(Math.abs(periodic.height-sample.height)<1e-10,'seamless bump '+kind);
      }
      values.add(sample.value.toFixed(5));
    }
    assert.ok(values.size>8,'visible variation in '+kind);
  }
  assert.throws(()=>surfaceSample('invalid',0,0),/Unknown surface/);
  let installed=0,removed=0;
  GraphicsDetail.addTextureProvider(()=>{installed++;return ()=>removed++;});
  GraphicsDetail.applyTextureProviders({},true);
  GraphicsDetail.applyTextureProviders({},true);
  assert.equal(installed,1,'providers install only once');
  GraphicsDetail.applyTextureProviders({},false);
  assert.equal(removed,1,'providers release High-only resources');
  GraphicsDetail.applyTextureProviders({},false);
  GraphicsDetail.applyTextureProviders({},true);
  assert.equal(installed,2);
  GraphicsDetail.applyTextureProviders({},false);
  GraphicsDetail.providers.length=0;

  const THREE=require('./vendor/three.min.js');
  const canvases=[];
  const ctx=vm.createContext({THREE,document:{createElement:()=>{
    const canvas={getContext:()=>({
      createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
      putImageData:image=>{canvas.image=image;}
    })};
    canvases.push(canvas);return canvas;
  }}});
  vm.runInContext(fs.readFileSync('mass-materials.js','utf8'),ctx);
  const surfaces=vm.runInContext('ChurchMaterials',ctx);
  surfaces.reflection=()=>null;
  const scene=new THREE.Scene(),renderer={capabilities:{getMaxAnisotropy:()=>2}};
  const base=new THREE.MeshStandardMaterial({color:'#e5d7bc',roughness:.78});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(22,.34,7.5),base);
  scene.add(floor);
  surfaces.assign(floor,'marble');
  assert.equal(floor.material,base,'Low retains untextured base');
  const pos=floor.geometry.attributes.position,uv=floor.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)if(floor.geometry.attributes.normal.getY(i)>.5){
    assert.ok(Math.abs(uv.getX(i)-pos.getX(i)/1.5)<1e-6);
    assert.ok(Math.abs(uv.getY(i)-pos.getZ(i)/1.5)<1e-6,'square slabs use physical dimensions');
  }
  surfaces.configure(scene,renderer,GRAPHICS_PROFILES.standard);
  const standard=floor.material;
  assert.equal(standard.map.image.width,256);
  assert.equal(standard.map.encoding,THREE.sRGBEncoding);
  assert.equal(standard.bumpMap.encoding,THREE.LinearEncoding);
  assert.equal(standard.map.anisotropy,2,'anisotropy bounded by GPU support');
  assert.equal(standard.map.wrapS,THREE.RepeatWrapping);
  assert.equal(base.map,null,'shared colour material is never mutated');
  assert.ok(new Set(canvases[0].image.data).size>16,'texture contains actual pixel detail');
  surfaces.configure(scene,renderer,GRAPHICS_PROFILES.high);
  assert.equal(floor.material.map.image.width,512);
  const count=surfaces.materials.size;
  floor.userData.fadeMaterial=floor.material.clone();
  floor.material=floor.userData.fadeMaterial;
  surfaces.configure(scene,renderer,GRAPHICS_PROFILES.low);
  assert.equal(floor.material,floor.userData.fadeMaterial,'active first-person fade survives switches');
  assert.equal(floor.material.map,null);
  assert.equal(floor.material.opacity,.22);
  assert.equal(floor.userData.solidMaterial,base);
  surfaces.configure(scene,renderer,GRAPHICS_PROFILES.standard);
  assert.equal(floor.userData.solidMaterial,standard);
  assert.equal(floor.material.map,standard.map);
  floor.material=floor.userData.solidMaterial;
  for(let i=0;i<5;i++)for(const profile of Object.values(GRAPHICS_PROFILES))surfaces.configure(scene,renderer,profile);
  assert.equal(surfaces.materials.size,count,'switching reuses cached materials');
  assert.equal(surfaces.textures.size,2,'one texture pair per recipe and resolution');
  const late=new THREE.Mesh(new THREE.BoxGeometry(2,.1,.5),base);
  scene.add(late);surfaces.assign(late,'wood');
  assert.ok(late.material.map,'new scene extras inherit the current profile');
  delete late.userData.surfaceType;late.material=base;
  surfaces.configure(scene,renderer,GRAPHICS_PROFILES.low);
  surfaces.configure(scene,renderer,GRAPHICS_PROFILES.standard);
  assert.equal(late.material,base,'disabled cupboard objects remain grey');
  surfaces.assign(floor,'slate',base);
  assert.equal(floor.userData.surfaceType,'slate');
  surfaces.configure(scene,renderer,GRAPHICS_PROFILES.low);
  assert.equal(floor.material,base,'appearance changes retain an untextured fallback');
}
// ---- controller regressions: revealed answer and score rollback ----
// ---- round 7: presets, reserved hosts, role switching, screen operator, graphics ----
{
  const presets=G('GAME_PRESETS');
  assert.ok(presets.sunday&&presets.weekday);
  const weekday=G('applyPreset')('weekday',{deacon:true,gloria:true});
  assert.equal(weekday.gloria,false);assert.equal(weekday.creed,false);assert.equal(weekday.serverCount,'0');assert.equal(weekday.preset,'weekday');
  assert.equal(G('matchingPreset')(presets.weekday.fields),'weekday');
  assert.equal(G('matchingPreset')(presets.sunday.fields),'sunday');
  assert.equal(G('matchingPreset')({...presets.sunday.fields,gloria:false}),'custom');
  assert.equal(G('applyPreset')('nope',{a:1}).preset,'custom');
  // Weekday preset as the priest: a valid Mass with no Gloria or Creed decisions.
  const {options:wk}=setup('P',{...presets.weekday.fields,level:'choice'});
  assert.equal(wk.serverCount,0);assert.equal(wk.gloria,false);
  assert.equal(G('normaliseGameOptions')('P',{}).options.reservedCommunion,true,'reserved hosts by default');
  // Bell at the start is on by default.
  assert.equal(G('normaliseGameOptions')('P',{}).options.bells.start,true);

  const visible=new Set(['P','D','S','L']);
  const roles=G('switchableRoles')(visible,{projector:false});
  assert.ok(roles.includes('P')&&roles.includes('MC')&&roles.includes('SAC')&&roles.includes('PEW'));
  assert.ok(!roles.includes('AV'),'no screen operator without a projector');
  assert.ok(!roles.includes('T'),'absent ministers cannot be taken over');
  assert.ok(G('switchableRoles')(visible,{projector:true}).includes('AV'));
  const stops=[{time:1},{time:5},{time:9}];
  same(G('stopsFrom')(stops,5).map(s=>s.time),[5,9]);
  assert.equal(stops[0].done,true);

  const av=G('normaliseGameOptions')('AV',{projector:false,music:'sung'});
  assert.equal(av.options.projector,true);assert.ok(av.notes.some(n=>/projector/.test(n)));
  const scen=buildScenario(G('scenarioRequest')(av.options));
  const starts=[];let clock=0;for(const step of scen.steps||STEPS){starts.push(clock);clock+=step.dur;}
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'key');
  assert.ok(cues.length>5);
  assert.ok(cues.every((c,i)=>i===0||c.time>=cues[i-1].time),'cues in time order');
  const sanctus=cues.find(c=>c.part==='sanctus'&&c.action==='start');
  assert.equal(sanctus.mode,'track');
  assert.equal(cues.find(c=>c.part==='kyrie').mode,'acapella');
  assert.ok(cues.some(c=>c.part==='entrance'&&c.action==='stop'),'hymn tracks are faded out');
  {
    const at=key=>{let t=0;for(const s of STEPS){if(s.key===key)return t;t+=s.dur;}};
    const stop=cues.find(c=>c.part==='entrance'&&c.action==='stop');
    assert.ok(stop.time>at(2)&&stop.time<at(3),'entrance hymn runs through the incensation and ends before the Sign of the Cross');
    assert.equal(cues.find(c=>c.part==='confiteor').key,5,'Confiteor slide at the Penitential Act');
    assert.ok(cues.find(c=>c.part==='offertory').time<at(18),'offertory chant starts at the preparation of the altar');
  }
  assert.ok(!cues.some(c=>c.part==='sanctus'&&c.action==='stop'),'only hymns fade at key detail');
  assert.ok(G('deriveMediaCues')(STEPS,null,av.options,'all').some(c=>c.part==='sanctus'&&c.action==='stop'));
  same(G('deriveMediaCues')(STEPS,null,{...av.options,projector:false}),[]);
  const said=G('deriveMediaCues')(STEPS,null,{...av.options,music:'said'});
  assert.ok(said.every(c=>c.mode==='slide'),'said Mass: words only');
  assert.ok(!said.some(c=>c.part==='entrance'),'no hymns at a said Mass');
  const sprinkle=G('deriveMediaCues')(STEPS,null,{...av.options,introductory:'sprinkling'});
  assert.ok(sprinkle.some(c=>c.part==='asperges'&&c.mode==='track'));
  for(const level of ['guided','choice','timed','expert']){
    for(const cue of cues){
      const d=G('mediaDecision')(cue,level,7,cues);
      assert.equal(d.options.filter(o=>o.correct).length,1,cue.id+' '+level);
      assert.equal(d.options.find(o=>o.correct).label,d.correct);
      assert.equal(new Set(d.options.map(o=>o.label)).size,d.options.length,'no duplicate options');
      if(level==='guided')assert.equal(d.options.length,1);
      if(level==='timed')assert.ok(d.timer>0&&d.timer<=G('MEDIA_WINDOW').choice);
    }
  }
  assert.ok(G('MEDIA_WARNING')>0);
  G('setCrossPlaces')(av.options);
  const pre=G('preMassTasks')('AV',av.options),post=G('postMassTasks')('AV',av.options);
  assert.equal(pre.find(t=>t.id==='line').correct,"the screen operator's desk at the back",'desk even after the cross places are set');
  assert.ok(pre.some(t=>t.places&&t.places.includes('avDesk')));
  assert.ok(post.length>=1);
  assert.ok(G('GAME_PLACES').some(p=>p.id==='avDesk'));

  const gfx=require('./mass-graphics.js');
  assert.equal(gfx.chooseGraphicsProfile('low').id,'low');
  assert.equal(gfx.chooseGraphicsProfile('auto',{deviceMemory:2,cores:2,width:800}).id,'low');
  assert.equal(gfx.chooseGraphicsProfile('auto',{deviceMemory:8,cores:8,width:1600,height:900}).id,'standard');
  assert.equal(gfx.chooseGraphicsProfile('high').id,'high');
  assert.equal(gfx.crowdVisible(5,1),true);
  const shown=Array.from({length:100},(_,i)=>gfx.crowdVisible(i,.5)).filter(Boolean).length;
  assert.ok(shown>35&&shown<65,'about half the crowd at 50%');
}
// ---- controller regressions: revealed answer and score rollback ----
{
  const ui=vm.createContext({
    assert,console,scene:null,clearTimeout:()=>{},performance:{now:()=>100},
    document:{body:{classList:{remove:()=>{}}},createElement:()=>({append:()=>{}})},
    GameAudio:{correct:()=>{},wrong:()=>{},stopTrack:()=>{},startTrack:()=>{}}
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

    // A skipped side quest resolves without scoring.
    const before=JSON.stringify(game.board);
    let skipped=null;
    logLine=()=>{};
    nodes.decision.hidden=false;
    const quest={finished:false,decision:{sideQuest:true,prompt:'Who needs a reminder?'},resolve:o=>{skipped=o;}};
    game.active=quest;
    skipSideQuest(quest);
    assert.equal(skipped.skipped,true);
    assert.equal(skipped.correct,false);
    assert.equal(JSON.stringify(game.board),before);
    assert.equal(game.active,null);
    skipSideQuest(quest);
    assert.equal(skipped.skipped,true,'only once');
  `,ui);
}
// ---- round 8: nave seating, search index, next use, speech held for answers ----
{
  const setPewLayout=G('setPewLayout'),inPews=G('inPews'),routeBetween=G('routeBetween');
  assert.equal(setPewLayout('full'),'full');
  assert.ok(inPews([90,500]),'benches reach the side walls');
  const route=routeBetween([90,500],[500,300]);
  assert.equal(route[0][0],500,'leaves the benches by the centre aisle');
  assert.ok(route.slice(0,-1).every(p=>p[0]===500),'no side aisle in this layout');
  assert.equal(setPewLayout('aisles'),'aisles');
  assert.ok(!inPews([90,500]),'side aisle by the wall again');
  assert.equal(routeBetween([300,500],[200,300])[0][0],110,'side aisle used when it exists');

  const index=G('buildSearchIndex')([{key:'P',name:'Priest'},{key:'S',name:'Altar server'},{key:'T',name:'Thurifer'}]);
  const cats=new Set(index.map(e=>e.cat));
  for(const c of G('SEARCH_CATEGORIES'))assert.ok(cats.has(c.id),'category has entries: '+c.id);
  for(const c of G('SEARCH_CATEGORIES'))assert.ok(index.some(e=>e.cat===c.id&&e.main),'category has a main entry: '+c.id);
  assert.ok(index.every(e=>G('GameIcons').PATHS[e.icon]),'every entry has a symbol');
  const search=G('searchEntries');
  same(search(index,'').length,0);
  same(search(index,'chal').map(r=>r.entry.id)[0],'object:chalice');
  same(search(index,'chal')[0].match,[0,4],'match range to highlight');
  same(search(index,'incense').map(r=>r.entry.id),['object:thurible'],'keywords find synonyms');
  assert.equal(search(index,'missal')[0].entry.id,'object:missal');
  assert.ok(search(index,'server').some(r=>r.entry.id==='role:S'));

  const next=G('nextUseFor'),find=id=>index.find(e=>e.id===id);
  const thurible=next(find('object:thurible'),STEPS,0,0);
  assert.equal(STEPS[thurible.step].props.thurible.length>0,true);
  assert.match(thurible.what,/taken by the priest/);
  const chalice=next(find('object:chalice'),STEPS,0,0);
  assert.match(chalice.title,/Preparation/);
  const later=next(find('object:chalice'),STEPS,chalice.step+1,0);
  assert.ok(!later||later.step>chalice.step,'looks only forward');
  const priest=next(find('role:P'),STEPS,0,0);
  assert.equal(priest.step,0);assert.equal(priest.soon,true);
  const ambo=next(find('place:ambo'),STEPS,0,0);
  assert.match(ambo.title,/Reading/);
  assert.equal(next(find('object:thurible'),STEPS,STEPS.length-1,1),null,'nothing after the end');
}
{
  const ctx=vm.createContext({assert,console,scene:null,clearTimeout:()=>{},performance:{now:()=>100},document:{body:{classList:{remove:()=>{}}},createElement:()=>({append:()=>{}})}});
  for(const file of ['mass-rite.js','mass-scenarios.js','mass-game-logic.js','mass-game.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  vm.runInContext(`
    game.phase='mass';
    game.stops=[{time:10,type:'decision',done:false},{time:30,type:'cue',done:false}];
    assert.equal(speechHeld(10),true,'a line starting at an unanswered question waits');
    assert.equal(speechHeld(12),true,'and so does a line after it');
    assert.equal(speechHeld(5),false,'earlier lines play');
    game.stops[0].done=true;
    assert.equal(speechHeld(10),false,'plays once answered');
    game.phase='pre';
    assert.equal(speechHeld(40),false,'only during Mass');
  `,ctx);
}
// ---- round 10: the Path (celebrations and seniority) ----
{
  const presets=G('GAME_PRESETS'),match=G('matchingPreset');
  assert.equal(match(presets.sunday.fields),'sunday');
  assert.equal(match(presets.sundayIncense.fields),'sundayIncense');
  assert.equal(presets.sunday.fields.incense,false);assert.equal(presets.sundayIncense.fields.incense,true);
  // The setup form's defaults (incense on, five servers) still match a named preset.
  assert.equal(match({...presets.sundayIncense.fields}),'sundayIncense');
  const C=G('CELEBRATIONS'),byId=G('celebrationById'),avail=G('celebrationAvailable');
  const ids=new Set(C.map(c=>c.id));
  assert.equal(ids.size,C.length,'unique ids');
  for(const c of C){
    for(const a of c.after)assert.ok(ids.has(a),c.id+' follows a known celebration '+a);
    assert.ok(G('PATH_BRANCHES')[c.branch],c.id+' has a branch');
    assert.ok(c.at[0]>=0&&c.at[0]<=1000&&c.at[1]>=0&&c.at[1]<=1200,c.id+' is on the map');
    assert.ok(G('GameIcons').PATHS[c.icon],c.id+' icon');
    if(c.preset)assert.ok(presets[c.preset],c.id+' preset exists');
  }
  same(C.filter(avail).map(c=>c.id),['feria','dominica','dominicaIncense','solemnity'],'four celebrations are playable now');
  assert.equal(avail(byId('easterVigil')),false);
  // Every available celebration starts a valid Mass in every role.
  for(const c of C.filter(avail))for(const role of Object.keys(G('GAME_ROLES')))setup(role,{...presets[c.preset].fields,serverCount:Number(presets[c.preset].fields.serverCount)});
  // Seniority ranks have known requirements, in order.
  for(const r of G('SENIORITY_RANKS'))for(const id of r.needs)assert.ok(ids.has(id),r.id+' needs '+id);
  // Marks.
  const mark=G('markFor');
  assert.equal(mark({level:'watch',watched:true,percent:0}),'attended');
  assert.equal(mark({level:'guided',percent:100}),'attended');
  assert.equal(mark({level:'choice',percent:69}),'attended');
  assert.equal(mark({level:'choice',percent:70}),'served');
  assert.equal(mark({level:'choice',percent:100}),'served','distinction needs Timed or Expert');
  assert.equal(mark({level:'expert',percent:95}),'distinction');
  // Recording progress and seniority.
  const record=G('recordCelebration'),rank=G('seniorityFor');
  let p=G('emptyProgress')();
  assert.equal(rank(p).id,'aspirant');
  assert.equal(G('nextRecommended')(p).id,'feria');
  assert.equal(record(p,{preset:'custom',role:'P',level:'choice',percent:100}),null,'custom options are not on the path');
  let r=record(p,{preset:'weekday',role:'P',level:'watch',watched:true,percent:0});
  p=r.progress;assert.equal(r.celebration.id,'feria');assert.equal(rank(p).id,'aspirant','watching does not raise seniority');
  r=record(p,{preset:'weekday',role:'P',level:'choice',percent:80});
  p=r.progress;assert.equal(r.rankBefore.id,'aspirant');assert.equal(r.rankAfter.id,'server');
  r=record(p,{preset:'weekday',role:'P',level:'choice',percent:50});
  p=r.progress;assert.equal(p.celebrations.feria.roles.P.mark,'served','a worse result keeps the best mark');
  assert.equal(p.celebrations.feria.roles.P.best,80);assert.equal(p.celebrations.feria.roles.P.plays,3);
  assert.equal(G('nextRecommended')(p).id,'dominica');
  p=record(p,{preset:'sunday',role:'S',level:'timed',percent:75}).progress;
  assert.equal(rank(p).id,'server','senior needs both Sundays');
  p=record(p,{celebration:'dominicaIncense',role:'T',level:'expert',percent:92}).progress;
  assert.equal(rank(p).id,'senior');
  assert.equal(G('celebrationStatus')(p,'dominicaIncense').mark,'distinction');
  p=record(p,{preset:'solemnity',role:'MC',level:'choice',percent:90}).progress;
  assert.equal(rank(p).id,'head');
  const next=G('nextRank')(p);
  assert.equal(next.rank.id,'mc');assert.equal(next.ready,false,'the M.C. rank waits for celebrations in preparation');
  assert.equal(G('nextRecommended')(p),null,'all playable celebrations served');
  // Stored progress is cleaned on load.
  const clean=G('normaliseProgress')({celebrations:{feria:{roles:{P:{mark:'served',best:500,plays:2},ZZ:{mark:'served'}}},bogus:{roles:{}}}});
  same(Object.keys(clean.celebrations),['feria']);same(Object.keys(clean.celebrations.feria.roles),['P']);
  assert.equal(clean.celebrations.feria.roles.P.best,100);
  assert.equal(G('normaliseProgress')('junk').celebrations&&Object.keys(G('normaliseProgress')(null).celebrations).length,0);
  // The credited celebration follows the final options.
  const pfo=G('presetForOptions');
  const opts=(role,preset)=>G('normaliseGameOptions')(role,{...presets[preset].fields,serverCount:Number(presets[preset].fields.serverCount),readerCount:Number(presets[preset].fields.readerCount),
    bells:{start:presets[preset].fields.bellStart,epiclesis:presets[preset].fields.bellEpiclesis,elevation:presets[preset].fields.bellElevation}}).options;
  for(const id of Object.keys(presets))assert.equal(pfo(opts('P',id),id),id,id+' round-trips');
  assert.equal(pfo(opts('T','sunday'),'sunday'),'sundayIncense','the thurifer brings incense to Sunday');
  assert.equal(pfo(opts('E','weekday'),'weekday'),'weekday','an EMHC on a weekday still credits the weekday');
  assert.equal(pfo(opts('E','weekday'),'custom'),'custom');
}
console.log('mass-game tests passed');
