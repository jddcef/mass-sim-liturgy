const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const context=vm.createContext({assert,console});
for(const file of ['mass-rite.js','mass-scenarios.js','mass-rite-exposition.js','mass-rite-baptism.js','mass-rite-funeral.js','mass-parishes.js','mass-game-logic.js','mass-game-icons.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const same=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m);
const run=code=>vm.runInContext(code,context);
const G=name=>run(name);

{
  const groups=G('SETUP_CELEBRATION_GROUPS'),presets=G('GAME_PRESETS');
  const ids=groups.flatMap(group=>Array.from(group.presets));
  same(ids.slice().sort(),Object.keys(presets).sort(),'every celebration appears once in the seasonal browser');
  assert.equal(new Set(ids).size,ids.length,'no duplicate celebration shortcuts');
  same(Array.from(groups.slice(0,7),group=>group.id),['advent','christmas','ordinary','lent','holyWeek','triduum','easter']);
  for(const id of ['advent','easter'])assert.equal(groups.find(group=>group.id===id).presets.length,0,'do not invent seasonal rites');
  assert.ok(groups.find(group=>group.id==='feasts').presets.includes('candlemas'));
  const visible=G('setupCelebrationFlags');
  same(visible(presets.sunday.fields,'sunday'),[],'ordinary Sunday has no special celebration toggles');
  for(const [id,preset] of Object.entries(presets)){
    const expected=(preset.fields.rite||'mass')==='mass'
      ?Array.from(G('SETUP_CELEBRATION_FLAGS')).filter(name=>preset.fields[name]===true):[];
    same(visible(preset.fields,id),expected,id+' shows only its own celebration features');
  }
  same(visible({...presets.nativity.fields,nativity:false},'nativity'),['nativity'],'can re-enable an edited celebration feature');
  same(visible({nativity:true},'custom'),['nativity'],'old custom saves keep active features visible');
  same(visible({nativity:true,funeral:true,rite:'exposition'},'benediction'),[],'outside Mass ignores retained Mass flags');
  for(const name of ['eye','guide','choices','timer','target']){
    assert.ok(G('GameIcons').PATHS[name],name+' involvement icon exists');
  }
}

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
{
  const {scenario}=setup('U',{collection:true,giftsProcession:true});
  const collection=STEPS.find(s=>s.key===17.5),gifts=STEPS.find(s=>s.key===18);
  assert.equal(scenario.options.collection,true);
  assert.ok(collection&&gifts);
  const collectionIndex=STEPS.indexOf(collection),giftsIndex=STEPS.indexOf(gifts);
  same(G('actorAt')(collectionIndex,'U',1),G('actorAt')(giftsIndex,'U',0),'usher continues from collection into the offertory procession');
  assert.match(gifts.text,/same presentation|joins the presentation/i);
  assert.match(gifts.text,/away from the altar/i);
  assert.ok(gifts.props.collection.some(event=>event.at?.[0]===710&&event.at?.[1]===280));
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
  same(C.filter(avail).map(c=>c.id),['feria','dominica','dominicaIncense','solemnity','pontifical','nativity','holyThursday','goodFriday','adorationLay','benediction','confirmation','baptism','candlemas','ashWednesday','palmSunday','funeral'],'sixteen celebrations are playable now');
  assert.equal(G('celebrationForPreset')('baptismMass').id,'baptism','Mass with Baptism credits Baptism');
  assert.equal(G('celebrationForPreset')('baptismDeacon').id,'baptism');
  assert.equal(G('celebrationForPreset')('benedictionDeacon').id,'benediction','the Deacon form credits Benediction');
  assert.equal(avail(byId('easterVigil')),false);
  // Every available celebration starts in every role it has; other roles are refused with a reason.
  for(const c of C.filter(avail))for(const role of Object.keys(G('GAME_ROLES'))){
    const raw={...presets[c.preset].fields,serverCount:Number(presets[c.preset].fields.serverCount)};
    const roles=raw.rite?G('RITE_ROLES')[raw.rite][raw.minister]:null;
    if(roles&&!roles.includes(role))assert.throws(()=>setup(role,raw),/has no part/,c.id+' refuses '+role);
    else setup(role,raw);
  }
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
  assert.equal(next.rank.id,'mc');assert.equal(next.ready,true,'the M.C. rank can be earned now Christmas is playable');
  same(next.missing,['pontifical','nativity']);
  assert.equal(G('nextRecommended')(p).id,'pontifical','then the Mass with the Bishop');
  p=record(p,{preset:'pontifical',role:'MB',level:'choice',percent:90}).progress;
  assert.equal(G('nextRecommended')(p).id,'nativity','then Christmas');
  p=record(p,{preset:'nativity',role:'T',level:'choice',percent:90}).progress;
  assert.equal(rank(p).id,'mc','Master of Ceremonies after the Bishop and Christmas');
  assert.equal(G('nextRank')(p).ready,false,'the Triduum waits for celebrations in preparation');
  assert.equal(G('nextRecommended')(p).id,'adorationLay','then the devotions');
  p=record(p,{preset:'adorationLay',role:'E',level:'choice',percent:90}).progress;
  r=record(p,{preset:'benedictionDeacon',role:'D',level:'choice',percent:90});
  assert.equal(r.celebration.id,'benediction');p=r.progress;
  assert.equal(G('nextRecommended')(p).id,'confirmation','then the Confirmation Mass');
  p=record(p,{preset:'confirmation',role:'CB',level:'choice',percent:90}).progress;
  assert.equal(G('nextRecommended')(p).id,'baptism','then Christian initiation');
  p=record(p,{preset:'baptismDeacon',role:'S',level:'choice',percent:90}).progress;
  assert.equal(G('nextRecommended')(p).id,'candlemas','then the rites of the seasons');
  p=record(p,{preset:'candlemas',role:'C1',level:'choice',percent:90}).progress;
  assert.equal(G('nextRecommended')(p).id,'ashWednesday','then Ash Wednesday');
  p=record(p,{preset:'ashWednesday',role:'S',level:'choice',percent:90}).progress;
  assert.equal(G('nextRecommended')(p).id,'palmSunday','then Palm Sunday');
  p=record(p,{preset:'palmSunday',role:'S',level:'choice',percent:90}).progress;
  assert.equal(G('nextRecommended')(p).id,'funeral','then the rites for the dead');
  r=record(p,{preset:'funeralDeacon',role:'T',level:'choice',percent:90});
  assert.equal(r.celebration.id,'funeral');p=r.progress;
  assert.equal(G('nextRecommended')(p).id,'holyThursday','then Holy Thursday (the summit of the Triduum)');
  p=record(p,{preset:'holyThursday',role:'P',level:'choice',percent:90}).progress;
  assert.equal(G('nextRecommended')(p).id,'goodFriday','then Good Friday (the Passion of the Lord)');
  p=record(p,{preset:'goodFriday',role:'P',level:'choice',percent:90}).progress;
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
  for(const id of Object.keys(presets).filter(id=>!presets[id].fields.rite))assert.equal(pfo(opts('P',id),id),id,id+' round-trips');
  assert.equal(pfo(opts('T','sunday'),'sunday'),'sundayIncense','the thurifer brings incense to Sunday');
  assert.equal(pfo(opts('E','weekday'),'weekday'),'weekday','an EMHC on a weekday still credits the weekday');
  assert.equal(pfo(opts('E','weekday'),'custom'),'custom');
  for(const id of ['adorationLay','benediction','benedictionDeacon']){
    const role=G('EXPOSITION_ROLES')[presets[id].fields.minister][0];
    assert.equal(pfo(opts(role,id),id),id,id+' round-trips with its minister');
    assert.equal(pfo(opts('PEW',id),id),id,id+' round-trips from the pew');
  }
  for(const id of ['baptism','baptismDeacon']){
    const role=G('BAPTISM_ROLES')[presets[id].fields.minister][0];
    assert.equal(pfo(opts(role,id),id),id,id+' round-trips with its minister');
    assert.equal(pfo(opts('S',id),id),id,id+' round-trips from the server');
  }
  assert.equal(pfo(opts('P','baptismMass'),'sunday'),'baptismMass','Mass with Baptism is its own preset');
  assert.equal(pfo(opts('T','adorationLay'),'adorationLay'),'adorationLay','a thurifer at lay-led adoration still credits it');
  assert.equal(pfo(opts('P','weekday'),'benediction'),'weekday');
  assert.equal(pfo({...opts('P','weekday'),music:'sung',gloria:true},'benediction'),'custom','a Mass is never credited as Benediction');
}
// ---- round 11: Exposition, adoration and Benediction (HCWEOM 82-100; CIC 943) ----
{
  const presets=G('GAME_PRESETS');
  const raw=id=>({...presets[id].fields,serverCount:Number(presets[id].fields.serverCount)});
  const lay=setup('E',raw('adorationLay')),priest=setup('P',raw('benediction'));
  assert.equal(lay.options.rite,'exposition');assert.equal(lay.options.minister,'lay');
  same([...lay.scenario.visible],['E','S']);same([...priest.scenario.visible],['P','S','T']);
  let keys=STEPS.map(s=>s.key);
  assert.ok(keys.every(k=>typeof k==='string'&&k.startsWith('exp:')),'string keys keep Mass special cases away');
  assert.ok(keys.includes('exp:blessing')&&keys.includes('exp:incense'));
  assert.ok(STEPS.find(s=>s.key==='exp:blessing').acts.P.some(([a])=>/blesses the people/.test(a)));
  // The lay form never blesses with the Sacrament (HCWEOM 91; CIC 943).
  setup('E',raw('adorationLay'));
  keys=STEPS.map(s=>s.key);
  assert.ok(!keys.includes('exp:blessing'),'no Benediction without a Priest');
  assert.ok(!STEPS.some(s=>Object.values(s.acts||{}).flat().some(([a])=>/bless/.test(a))),'no blessing acts in the lay form');
  assert.ok(STEPS.every(s=>s.ref),'every step cites its source');
  // Props: the Sacrament leaves the tabernacle, rests in the monstrance and returns.
  const lunette=run("STEPS.map((_,i)=>propAt(i,'lunette',1,Object.fromEntries(Object.keys(ACTORS).map(a=>[a,actorAt(i,a,1)]))))");
  same(lunette[keys.indexOf('exp:silence')].at,[500,160]);
  assert.equal(lunette.at(-1).h,true,'reposed at the end');
  // Duties exist for every role present; the book holds only this rite's texts.
  for(const [role,form] of [['E','adorationLay'],['S','adorationLay'],['P','benediction'],['S','benediction'],['T','benediction'],['PEW','benediction']]){
    setup(role,raw(form));
    assert.ok(G('deriveDuties')(role,STEPS,setup(role,raw(form)).options).length>0,role+' has duties in '+form);
  }
  setup('P',raw('benediction'));
  const book=G('buildBook')('P',STEPS);
  assert.ok(book.length&&book.every(p=>['Exposition','Adoration','Benediction','Reposition'].includes(p.part)));
  // Option rules: up to two servers, incense needs a thurifer, Mass-only options off.
  const norm=G('normaliseGameOptions');
  assert.equal(norm('T',raw('adorationLay')).options.incense,true);
  assert.equal(norm('T',raw('adorationLay')).options.serverCount,2);
  assert.equal(norm('E',{...raw('adorationLay'),serverCount:5,incense:true}).options.serverCount,2);
  assert.equal(norm('E',{...raw('adorationLay'),serverCount:1,incense:true}).options.incense,false);
  assert.equal(norm('P',raw('benediction')).options.deacon,false);
  assert.throws(()=>norm('P',raw('adorationLay')),/has no part/);
  assert.throws(()=>norm('D',raw('benediction')),/has no part/);
  // The Deacon form (HCWEOM 91-92, 99): the Deacon exposes, incenses and blesses, in cope and humeral veil.
  const deacon=setup('D',raw('benedictionDeacon'));
  same([...deacon.scenario.visible],['D','S','T']);
  assert.equal(deacon.options.deacon,true);assert.equal(deacon.scenario.vesture.role,'D');
  const blessing=STEPS.find(s=>s.key==='exp:blessing');
  assert.ok(blessing.acts.D.some(([a])=>/blesses the people/.test(a))&&!blessing.acts.P);
  same(Object.keys(blessing.veil),['D']);
  assert.ok(STEPS.every(s=>!Object.keys(s.mv||{}).includes('P')),'no Priest in the Deacon form');
  assert.ok(G('deriveDuties')('D',STEPS,deacon.options).length>0);
  assert.throws(()=>norm('P',raw('benedictionDeacon')),/has no part/);
  const dPre=G('devotionPreTasks')('D',deacon.options,[952,250]);
  assert.ok(dPre[0].correct.includes('cope'));assert.ok(dPre.some(t=>t.id==='bless'&&/ordinary minister/.test(t.correct)));
  assert.ok(G('devotionPostTasks')('D',{}).some(t=>/cope/.test(t.correct)));
  assert.equal(priest.scenario.vesture.role,'P');assert.equal(lay.scenario.vesture,null,'the lay minister wears no cope');
  same(G('switchableRoles')(new Set(['P','S','T']),norm('P',raw('benediction')).options),['P','S','T','PEW']);
  // Before and after: cope for the Priest, the authorisation question for the lay minister.
  const pre=G('devotionPreTasks');
  assert.ok(pre('P',norm('P',raw('benediction')).options,[952,250])[0].correct.includes('cope'));
  assert.ok(pre('E',norm('E',raw('adorationLay')).options,[952,250]).some(t=>/not bless/.test(t.correct)));
  assert.equal(pre('PEW',norm('PEW',raw('benediction')).options)[0].id,'stoup');
  assert.equal(G('devotionPostTasks')('PEW',{})[0].id,'leave');
  assert.ok(G('devotionPostTasks')('E',{}).some(t=>/tabernacle is locked/.test(t.correct)));
  // Mass still builds afterwards.
  setup('P',{});assert.equal(STEPS[0].key,0);
}
// ---- round 17: Mass with the Bishop ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  let r=norm('MB',{deacon:false,lector:false,serverCount:0});
  assert.equal(r.options.bishop,true,'a bearer brings the Bishop');
  assert.equal(r.options.deacon,true);assert.equal(r.options.lector,true);assert.ok(r.options.serverCount>=1);
  assert.ok(r.notes.some(n=>/Pontificales ritus 6/.test(n)));
  r=norm('P',{});assert.equal(r.options.bishop,false,'the Bishop is optional');
  const raw={...presets.pontifical.fields,serverCount:Number(presets.pontifical.fields.serverCount)};
  const {options,scenario}=setup('P',raw);
  assert.equal(G('presetForOptions')(options,'pontifical'),'pontifical');
  assert.equal(G('celebrationForPreset')('pontifical').id,'pontifical');
  assert.ok(scenario.visible.has('MB')&&scenario.visible.has('CB'));
  assert.equal(G('gameRoleName')('P',options),'Bishop');
  assert.equal(G('gameRoleName')('P',{}),'Priest');
  // The homily from the cathedra is not a choice for the Bishop.
  assert.ok(!G('deriveDuties')('P',STEPS,options).some(d=>d.type==='homily'));
  for(const role of ['MB','CB']){
    const duties=G('deriveDuties')(role,STEPS,options);
    assert.ok(duties.length>5,role+' has duties');
    assert.ok(duties.some(d=>/mitre|staff/.test(d.text)),role+' handles the insignia');
    const pre=G('preMassTasks')(role,options);
    assert.ok(pre.some(t=>/vimp/.test(t.correct)),role+' vests with a vimp');
  }
  assert.ok(G('procOrder')(options,G('serverTeam')(options.serverCount)).includes('Bishop'));
  assert.ok(G('sacristanSetup')(options).some(i=>i.id==='vimps'&&i.needed));
  assert.ok(G('deriveCues')(scenario.visible,STEPS).some(c=>c.role==='MB'||c.role==='CB'),'the M.C. cues the bearers');
  // Without the Bishop the bearers are absent and the Priest is named as before.
  const plain=setup('P',{...raw,bishop:false});
  assert.ok(!plain.scenario.visible.has('MB'));
  assert.equal(G('presetForOptions')(plain.options,'pontifical'),'pontifical','a changed preset still credits the chosen celebration');
}
// ---- round 18: Confirmation within Mass ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  let r=norm('S',{confirmation:true,bishop:false,creed:true,deacon:false,solemnBlessing:false});
  assert.ok(r.options.bishop&&r.options.deacon&&!r.options.creed&&r.options.solemnBlessing,'the Bishop confirms; no Creed');
  assert.ok(r.notes.some(n=>/Ordo Confirmationis 31/.test(n)));
  assert.equal(norm('P',{}).options.confirmation,false);
  assert.equal(norm('E',{rite:'exposition',confirmation:true}).options.confirmation,false,'not at Exposition');
  const raw={...presets.confirmation.fields,serverCount:Number(presets.confirmation.fields.serverCount)};
  const {options,scenario}=setup('D',raw);
  assert.equal(G('presetForOptions')(options,'confirmation'),'confirmation');
  assert.equal(G('celebrationForPreset')('confirmation').id,'confirmation');
  assert.ok(scenario.visible.has('K')&&scenario.visible.has('SP'));
  assert.ok(!STEPS.some(s=>s.key===15),'no Creed');
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>/chrism|candidates/.test(d.text)),'the Deacon presents the candidates and the chrism');
  assert.ok(G('deriveDuties')('S',STEPS,options).some(d=>/pours water over the Bishop/.test(d.text)),'a server washes the Bishop\u2019s hands');
  for(const role of ['MB','CB','P','PEW','MC','SAC'])setup(role,raw);
  const items=G('sacristanSetup')(options);
  assert.ok(items.some(i=>i.id==='chrism'&&i.needed&&i.places.includes('credence')));
  assert.ok(G('sacristanPackAway')(options).some(i=>i.id==='chrismBack'&&i.needed));
  assert.ok(!G('sacristanSetup')(setup('P',{}).options).some(i=>i.id==='chrism'&&i.needed));
  assert.equal(G('GameIcons').iconFor('anoints the forehead with chrism, tracing the cross'),'chrism');
  assert.ok(!G('deriveCues')(scenario.visible,STEPS).some(c=>c.role==='K'||c.role==='SP'),'the candidates are not cued as ministers');
  assert.equal(G('presetForOptions')(setup('D',{...presets.pontifical.fields,serverCount:5}).options,'pontifical'),'pontifical','the plain Bishop\u2019s Mass is not Confirmation');
  setup('P',{});assert.equal(STEPS[0].key,0);
}
// ---- round 19: Christmas Mass during the Night ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  let r=norm('P',{nativity:true,confirmation:true,creed:false,gloria:false,eucharisticPrayer:'IV'});
  assert.ok(r.options.nativity&&!r.options.confirmation&&r.options.creed&&r.options.gloria&&r.options.eucharisticPrayer==='I');
  for(const ref of ['GIRM 372','GIRM 53','GIRM 68','GIRM 365d'])assert.ok(r.notes.some(n=>n.includes(ref)),ref);
  assert.equal(norm('P',{}).options.nativity,false);
  assert.equal(norm('E',{rite:'exposition',nativity:true}).options.nativity,false,'not at Exposition');
  const raw={...presets.nativity.fields,serverCount:Number(presets.nativity.fields.serverCount)};
  const {options,scenario}=setup('S',raw);
  assert.equal(G('presetForOptions')(options,'nativity'),'nativity');
  assert.equal(G('presetForOptions')(setup('P',{...presets.solemnity.fields,serverCount:Number(presets.solemnity.fields.serverCount)}).options,'solemnity'),'solemnity','a plain solemnity is not Christmas');
  assert.equal(G('celebrationForPreset')('nativity').id,'nativity');
  setup('S',raw);
  assert.equal(STEPS[0].key,-.5,'the Proclamation comes first');
  assert.ok(scenario.visible.has('Ps'));
  assert.ok(G('deriveDuties')('S',STEPS,options).some(d=>/genuflect/.test(d.text)&&d.key===15),'the server genuflects at the Creed');
  for(const role of ['D','T','MC','SAC','PEW','P'])setup(role,raw);
  const items=G('sacristanSetup')(options);
  assert.ok(items.some(i=>i.id==='proclamation'&&i.needed&&i.places.includes('ambo')));
  assert.ok(!G('sacristanSetup')(setup('P',{}).options).some(i=>i.id==='proclamation'&&i.needed));
  setup('P',{});assert.equal(STEPS[0].key,0);
}
// ---- round 20: Candlemas (the Presentation of the Lord) ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  let r=norm('P',{candlemas:true,gloria:false,introductory:'sprinkling',eucharisticPrayer:'IV',bishop:true,confirmation:true});
  const o=r.options;
  assert.ok(o.candlemas&&o.gloria&&o.introductory==='A'&&o.eucharisticPrayer==='III'&&!o.bishop&&!o.confirmation);
  for(const ref of ['n. 7','GIRM 365d'])assert.ok(r.notes.some(n=>n.includes(ref)),ref);
  assert.ok(r.notes.some(n=>/Bishop was switched off/.test(n)));
  assert.ok(r.notes.some(n=>/Confirmation .*switched off/.test(n)));
  r=norm('P',{candlemas:true,nativity:true});
  assert.ok(!r.options.candlemas&&r.options.nativity,'Christmas wins');
  r=norm('MB',{candlemas:true});
  assert.ok(!r.options.candlemas&&r.options.bishop,'the bearers play the Bishop’s Mass');
  assert.equal(norm('P',{}).options.candlemas,false);
  assert.equal(norm('E',{rite:'exposition',candlemas:true}).options.candlemas,false,'not at Exposition');
  const raw={...presets.candlemas.fields,serverCount:Number(presets.candlemas.fields.serverCount)};
  const {options,scenario}=setup('S',raw);
  assert.equal(G('presetForOptions')(options,'candlemas'),'candlemas');
  assert.equal(G('presetForOptions')(setup('P',{...presets.sundayIncense.fields,serverCount:5}).options,'sundayIncense'),'sundayIncense','a plain Sunday is not Candlemas');
  assert.equal(G('celebrationForPreset')('candlemas').id,'candlemas');
  setup('S',raw);
  assert.equal(STEPS[0].title,'Blessing of Candles');
  assert.ok(G('deriveDuties')('S',STEPS,options).some(d=>d.key===-.5&&/holy water/.test(d.text)),'the server holds the holy water');
  for(const role of ['P','D','T','C1','X','MC','SAC','PEW','L','AV'])setup(role,{...raw,projector:role==='AV'});
  const items=G('sacristanSetup')(options);
  assert.ok(items.some(i=>i.id==='faithfulCandles'&&i.needed&&i.places.includes('procession')));
  assert.ok(items.some(i=>i.id==='aspersory'&&i.needed&&i.places.includes('procession')));
  assert.ok(G('sacristanPackAway')(options).some(i=>i.id==='aspersoryBack'&&i.needed));
  assert.ok(!G('sacristanSetup')(setup('P',{}).options).some(i=>i.id==='faithfulCandles'&&i.needed));
  const av=setup('AV',{...raw,projector:true});
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'all');
  assert.ok(cues.some(c=>c.part==='candles'),'a slide for the antiphon at the lighting of candles');
  assert.ok(cues.some(c=>c.part==='entrance'&&/Simeon/.test(c.title)));
  assert.ok(!cues.some(c=>c.part==='confiteor'||c.part==='kyrie'),'no Penitential Act or Kyrie');
  setup('P',{});assert.equal(STEPS[0].key,0);
}
// ---- round 21: Ash Wednesday ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  let r=norm('P',{ashWednesday:true,gloria:true,creed:true,introductory:'sprinkling',eucharisticPrayer:'IV',bishop:true,confirmation:true});
  const o=r.options;
  assert.ok(o.ashWednesday&&!o.gloria&&!o.creed&&o.introductory==='A'&&o.eucharisticPrayer==='III'&&!o.bishop&&!o.confirmation);
  for(const ref of ['GIRM 53','GIRM 68','GIRM 365d','GIRM 372','Ash Wednesday'])assert.ok(r.notes.some(n=>n.includes(ref)),ref);
  for(const other of [{candlemas:true},{nativity:true}]){
    r=norm('P',{ashWednesday:true,...other});
    assert.ok(!r.options.ashWednesday,'a different day wins');
  }
  assert.ok(!norm('CB',{ashWednesday:true}).options.ashWednesday,'the bearers play the Bishop\u2019s Mass');
  assert.equal(norm('P',{}).options.ashWednesday,false);
  assert.equal(norm('E',{rite:'exposition',ashWednesday:true}).options.ashWednesday,false,'not at Exposition');
  const raw={...presets.ashWednesday.fields,serverCount:Number(presets.ashWednesday.fields.serverCount)};
  const {options}=setup('S',raw);
  assert.equal(G('presetForOptions')(options,'ashWednesday'),'ashWednesday');
  assert.equal(G('presetForOptions')(setup('P',{...presets.sunday.fields,serverCount:Number(presets.sunday.fields.serverCount)}).options,'sunday'),'sunday','a plain Sunday is not Ash Wednesday');
  assert.equal(G('celebrationForPreset')('ashWednesday').id,'ashWednesday');
  setup('D',raw);
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>d.key===14.3&&/ashes/.test(d.text)),'the Deacon holds the ashes');
  setup('S',raw);
  assert.ok(G('deriveDuties')('S',STEPS,options).some(d=>d.key===14.3),'the server holds the holy water');
  for(const role of ['P','D','S','C1','X','MC','SAC','PEW','L','AV'])setup(role,{...raw,projector:role==='AV'});
  const items=G('sacristanSetup')(options);
  assert.ok(items.some(i=>i.id==='ashes'&&i.needed&&i.places.includes('credence')));
  assert.ok(items.some(i=>i.id==='aspersory'&&i.needed&&i.places.includes('credence')));
  assert.ok(items.some(i=>i.id==='missal'&&/blessing of ashes/.test(i.name)));
  const away=G('sacristanPackAway')(options);
  assert.ok(away.some(i=>i.id==='aspersoryBack'&&i.needed)&&away.some(i=>i.id==='ashesAway'&&i.needed));
  assert.ok(!G('sacristanSetup')(setup('P',{}).options).some(i=>i.id==='ashes'&&i.needed));
  const av=setup('AV',{...raw,projector:true});
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'all');
  assert.ok(cues.some(c=>c.part==='ashes'),'music during the giving of ashes');
  assert.ok(cues.some(c=>c.part==='alleluia'&&/no Alleluia/.test(c.title)));
  assert.ok(!cues.some(c=>c.part==='confiteor'||c.part==='kyrie'||c.part==='gloria'||c.part==='creed'));
  setup('P',{});assert.equal(STEPS[0].key,0);
}
// ---- round 22: Baptism of children, within Mass and on its own (Ordo Baptismi Parvulorum; CIC 861) ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  const raw=id=>({...presets[id].fields,serverCount:Number(presets[id].fields.serverCount),readerCount:Number(presets[id].fields.readerCount||1)});
  // Within Mass: no Creed, the reception replaces the Penitential Act, the solemn blessing of the parents.
  let r=norm('P',{baptism:true,creed:true,introductory:'sprinkling',solemnBlessing:false});
  assert.ok(r.options.baptism&&!r.options.creed&&r.options.introductory==='A'&&r.options.solemnBlessing);
  assert.ok(r.notes.filter(n=>/Ordo Baptismi Parvulorum 29/.test(n)).length===2);
  for(const other of [{nativity:true},{candlemas:true},{ashWednesday:true},{confirmation:true},{bishop:true}]){
    r=norm('P',{baptism:true,...other});
    assert.ok(!r.options.baptism&&r.notes.some(n=>/Baptism within Mass is not combined/.test(n)),JSON.stringify(other)+' wins');
  }
  assert.ok(!norm('MB',{baptism:true}).options.baptism,'the bearers play the Bishop\u2019s Mass');
  assert.equal(norm('P',{}).options.baptism,false);
  assert.equal(norm('E',{rite:'exposition',baptism:true}).options.baptism,false,'not at Exposition');
  const {options,scenario}=setup('S',raw('baptismMass'));
  assert.equal(G('presetForOptions')(options,'baptismMass'),'baptismMass');
  assert.equal(G('presetForOptions')(setup('P',raw('sunday')).options,'sunday'),'sunday','a plain Sunday is not a Baptism');
  assert.ok(scenario.visible.has('BP')&&scenario.visible.has('GP'));
  setup('S',raw('baptismMass'));
  assert.ok(!STEPS.some(s=>s.key===15)&&!STEPS.some(s=>[3,4,5,6].includes(s.key)),'no Creed or Penitential Act');
  assert.ok(STEPS.some(s=>s.key===16.6),'the baptism follows the litany');
  for(const role of ['P','D','S','X','C1','MC','SAC','PEW','L','AV'])setup(role,{...raw('baptismMass'),projector:role==='AV'});
  setup('D',raw('baptismMass'));
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>/oil|chrism|font/.test(d.text)),'the Deacon assists at the font');
  assert.ok(!G('deriveCues')(scenario.visible,STEPS).some(c=>c.role==='BP'||c.role==='GP'),'the family is not cued as ministers');
  const items=G('sacristanSetup')(options);
  for(const id of ['chrism','oilCat','fontWater','garment','bcandle','register'])assert.ok(items.some(i=>i.id===id&&i.needed),id+' is needed');
  assert.ok(items.find(i=>i.id==='chrism').places.includes('font'));
  const away=G('sacristanPackAway')(options);
  for(const id of ['chrismBack','oilCatBack','paschalOut'])assert.ok(away.some(i=>i.id===id&&i.needed),id);
  assert.ok(!G('sacristanSetup')(setup('P',{}).options).some(i=>['oilCat','garment','bcandle'].includes(i.id)&&i.needed));
  const av=setup('AV',{...raw('baptismMass'),projector:true});
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'all');
  assert.ok(cues.some(c=>c.part==='litany')&&cues.some(c=>c.part==='promises'));
  assert.ok(!cues.some(c=>c.part==='confiteor'||c.part==='kyrie'||c.part==='creed'));
  const icon=G('GameIcons').iconFor;
  assert.equal(icon('anoints the child with the oil of catechumens'),'chrism');
  assert.equal(icon('Put the white garment on the child'),'vestment');
  assert.equal(icon('Light the baptismal candle from the paschal candle'),'candle');
  // Outside Mass: the Priest or the Deacon (CIC 861), with at most one server.
  for(const id of ['baptism','baptismDeacon']){
    const minister=presets[id].fields.minister,cel=minister==='deacon'?'D':'P';
    const s=setup(cel,raw(id));
    assert.equal(s.options.rite,'baptism');assert.equal(s.options.baptism,true);
    assert.equal(s.options.deacon,minister==='deacon');
    assert.ok(STEPS.every(st=>typeof st.key==='string'&&st.key.startsWith('bap:')),'string keys keep Mass special cases away');
    assert.ok(G('deriveDuties')(cel,STEPS,s.options).length>5,cel+' has duties');
    assert.ok(G('deriveDuties')('S',STEPS,setup('S',raw(id)).options).length>0,'the server has duties');
    setup('PEW',raw(id));
    for(const role of ['X','T','E','MC','SAC','MB',minister==='deacon'?'P':'D'])assert.throws(()=>norm(role,raw(id)),/has no part/,id+' refuses '+role);
    same(G('switchableRoles')(new Set([cel,'S','BP','GP']),s.options),[cel,'S','PEW']);
    assert.equal(G('celebrationForPreset')(id).id,'baptism');
  }
  assert.equal(norm('S',{...raw('baptism'),serverCount:0}).options.serverCount,1,'the server role adds a server');
  assert.equal(norm('P',{...raw('baptism'),serverCount:4,incense:true}).options.serverCount,1);
  assert.equal(norm('P',{...raw('baptism'),incense:true}).options.incense,false);
  const pre=G('devotionPreTasks'),post=G('devotionPostTasks');
  const dOpts=norm('D',raw('baptismDeacon')).options;
  assert.ok(pre('D',dOpts,[952,250]).some(t=>t.id==='minister'&&/ordinary minister/.test(t.correct)),'the Deacon may baptize');
  assert.ok(pre('P',norm('P',raw('baptism')).options,[952,250])[0].correct.includes('white stole'));
  assert.ok(pre('S',norm('S',raw('baptism')).options,[948,222]).some(t=>/oils of catechumens and chrism/.test(t.correct)));
  assert.equal(pre('PEW',norm('PEW',raw('baptism')).options)[0].id,'arrive');
  assert.equal(post('PEW',dOpts)[0].id,'leave');
  assert.ok(post('D',dOpts).some(t=>/register/.test(t.correct)));
  assert.ok(post('S',dOpts).some(t=>/ambry/.test(t.correct)));
  assert.ok(post('E',{rite:'exposition'}).some(t=>/tabernacle is locked/.test(t.correct)),'Exposition keeps its own tasks');
  setup('P',{});assert.equal(STEPS[0].key,0);
}
// ---- round 23: Funerals, the Funeral Mass and the funeral liturgy outside Mass (OCF 14, 154-203; GIRM 380-385) ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  const raw=id=>({...presets[id].fields,serverCount:Number(presets[id].fields.serverCount),readerCount:Number(presets[id].fields.readerCount||1)});
  // Within Mass: no Gloria or Creed, the reception replaces the Penitential Act, the commendation replaces the blessing.
  let r=norm('P',{funeral:true,gloria:true,creed:true,introductory:'sprinkling',solemnBlessing:true});
  assert.ok(r.options.funeral&&!r.options.gloria&&!r.options.creed&&r.options.introductory==='A'&&!r.options.solemnBlessing);
  assert.equal(r.notes.length,4);
  for(const other of [{nativity:true},{candlemas:true},{ashWednesday:true},{confirmation:true},{bishop:true},{baptism:true}]){
    r=norm('P',{funeral:true,...other});
    assert.ok(!r.options.funeral&&r.notes.some(n=>/Funeral Mass is not combined/.test(n)),JSON.stringify(other)+' wins');
  }
  assert.ok(!norm('MB',{funeral:true}).options.funeral,'the bearers play the Bishop\u2019s Mass');
  assert.equal(norm('P',{}).options.funeral,false);
  assert.equal(norm('E',{rite:'exposition',funeral:true}).options.funeral,false,'not at Exposition');
  assert.equal(norm('P',{rite:'baptism',funeral:true}).options.funeral,false,'not at a Baptism');
  const {options,scenario}=setup('S',raw('funeralMass'));
  assert.equal(G('presetForOptions')(options,'funeralMass'),'funeralMass');
  assert.equal(G('celebrationForPreset')('funeralMass').id,'funeral');
  assert.ok(scenario.visible.has('FD')&&scenario.visible.has('FM'));
  setup('S',raw('funeralMass'));
  assert.ok(!STEPS.some(s=>[3,4,5,6,7,15,39].includes(s.key)),'no greeting, Penitential Act, Gloria, Creed or blessing');
  assert.ok(STEPS.some(s=>s.key===38.5)&&STEPS.some(s=>s.key===40),'the commendation and the procession out');
  for(const role of ['P','D','S','T','X','C1','MC','SAC','PEW','L','AV'])setup(role,{...raw('funeralMass'),projector:role==='AV'});
  setup('T',raw('funeralMass'));
  assert.ok(G('deriveDuties')('T',STEPS,options).some(d=>d.key>=38&&d.key<39),'the thurifer serves the commendation');
  assert.ok(!G('deriveCues')(scenario.visible,STEPS).some(c=>c.role==='FD'||c.role==='FM'),'the family is not cued as ministers');
  const items=G('sacristanSetup')(options);
  for(const id of ['funeralWater','funeralPall','paschalFuneral','funeralVest'])assert.ok(items.some(i=>i.id===id&&i.needed),id+' is needed');
  assert.ok(items.find(i=>i.id==='paschalFuneral').places.includes('coffinPlace'));
  assert.ok(items.find(i=>i.id==='missal').name.includes('final commendation'));
  const away=G('sacristanPackAway')(options);
  assert.ok(away.some(i=>i.id==='pallAway'&&i.needed)&&away.find(i=>i.id==='paschalOut').places.includes('coffinPlace'));
  assert.ok(!G('sacristanSetup')(setup('P',{}).options).some(i=>['funeralWater','funeralPall','paschalFuneral'].includes(i.id)&&i.needed));
  const av=setup('AV',{...raw('funeralMass'),projector:true});
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'all');
  assert.ok(cues.some(c=>c.part==='farewell')&&cues.some(c=>c.part==='paradisum'));
  assert.ok(!cues.some(c=>['confiteor','kyrie','gloria','creed','recessional'].includes(c.part)));
  const icon=G('GameIcons').iconFor;
  assert.equal(icon('The bearers carry the coffin out'),'coffin');
  assert.equal(icon('Place the white pall on the coffin'),'coffin');
  assert.equal(icon('Help place the white pall'),'vestment');
  // Outside Mass: the Priest, or the Deacon when no Priest is available (OCF 14), with up to two servers.
  for(const id of ['funeral','funeralDeacon']){
    const minister=presets[id].fields.minister,cel=minister==='deacon'?'D':'P';
    const s=setup(cel,raw(id));
    assert.equal(s.options.rite,'funeral');assert.equal(s.options.funeral,true);assert.equal(s.options.incense,true);
    assert.equal(s.options.deacon,minister==='deacon');
    assert.ok(STEPS.every(st=>typeof st.key==='string'&&st.key.startsWith('fun:')),'string keys keep Mass special cases away');
    assert.ok(G('deriveDuties')(cel,STEPS,s.options).length>5,cel+' has duties');
    for(const role of ['S','T'])assert.ok(G('deriveDuties')(role,STEPS,setup(role,raw(id)).options).length>0,role+' has duties');
    setup('PEW',raw(id));
    for(const role of ['X','E','MC','SAC','MB','L',minister==='deacon'?'P':'D'])assert.throws(()=>norm(role,raw(id)),/has no part/,id+' refuses '+role);
    same(G('switchableRoles')(new Set([cel,'S','T','FD','FM']),s.options),[cel,'S','T','PEW']);
    assert.equal(G('celebrationForPreset')(id).id,'funeral');
    assert.equal(G('presetForOptions')(s.options,id),id);
  }
  assert.equal(norm('T',{...raw('funeral'),serverCount:0}).options.serverCount,2,'the thurifer role adds two servers');
  r=norm('P',{...raw('funeral'),serverCount:1,incense:true}).options;
  assert.ok(r.serverCount===1&&!r.incense,'no thurifer, no incense');
  assert.equal(norm('P',{...raw('funeral'),serverCount:5}).options.serverCount,2);
  const pre=G('devotionPreTasks'),post=G('devotionPostTasks');
  const dOpts=norm('D',raw('funeralDeacon')).options;
  assert.ok(pre('D',dOpts,[952,250]).some(t=>t.id==='minister'&&/no Priest is available/.test(t.correct)),'the Deacon may lead it');
  assert.ok(pre('P',norm('P',raw('funeral')).options,[952,250])[0].correct.includes('violet stole'));
  assert.ok(pre('S',norm('S',raw('funeral')).options,[948,222]).some(t=>/white pall/.test(t.correct)));
  assert.ok(pre('T',norm('T',raw('funeral')).options,[946,278]).some(t=>/Thurible/.test(t.correct)));
  assert.equal(pre('PEW',norm('PEW',raw('funeral')).options)[0].id,'arrive');
  assert.equal(post('PEW',dOpts)[0].id,'leave');
  assert.ok(post('T',dOpts).some(t=>/sand bucket/.test(t.correct)));
  assert.ok(post('S',dOpts).some(t=>/pall/.test(t.correct)));
  setup('P',{});assert.equal(STEPS[0].key,0);
}
// ---- round 24: Palm Sunday ----
{
  const norm=G('normaliseGameOptions'),presets=G('GAME_PRESETS');
  let r=norm('P',{palmSunday:true,gloria:true,creed:false,introductory:'sprinkling',eucharisticPrayer:'IV',bishop:true,confirmation:true});
  const o=r.options;
  assert.ok(o.palmSunday&&!o.gloria&&o.creed&&o.introductory==='A'&&o.eucharisticPrayer==='III'&&!o.bishop&&!o.confirmation);
  for(const ref of ['GIRM 53','GIRM 68','GIRM 365d','GIRM 372','Palm Sunday'])assert.ok(r.notes.some(n=>n.includes(ref)),ref);
  for(const other of [{candlemas:true},{nativity:true},{ashWednesday:true}]){
    r=norm('P',{palmSunday:true,...other});
    assert.ok(!r.options.palmSunday,'a different day wins');
  }
  assert.ok(!norm('CB',{palmSunday:true}).options.palmSunday,'the bearers play the Bishop\u2019s Mass');
  assert.equal(norm('P',{}).options.palmSunday,false);
  assert.equal(norm('E',{rite:'exposition',palmSunday:true}).options.palmSunday,false,'not at Exposition');
  const raw={...presets.palmSunday.fields,serverCount:Number(presets.palmSunday.fields.serverCount)};
  const {options}=setup('S',raw);
  assert.equal(G('presetForOptions')(options,'palmSunday'),'palmSunday');
  assert.equal(G('presetForOptions')(setup('P',{...presets.sundayIncense.fields,serverCount:5}).options,'sundayIncense'),'sundayIncense','a plain Sunday is not Palm Sunday');
  assert.equal(G('celebrationForPreset')('palmSunday').id,'palmSunday');
  setup('S',raw);
  assert.equal(STEPS[0].title,'Blessing of Palms');
  assert.ok(G('deriveDuties')('S',STEPS,options).some(d=>d.key===-.5&&/holy water/.test(d.text)),'the server holds the holy water');
  setup('D',raw);
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>d.key===13&&/Passion/.test(d.title)),'the Deacon narrates the Passion');
  for(const role of ['P','D','S','C1','X','MC','SAC','PEW','L','AV'])setup(role,{...raw,projector:role==='AV'});
  const items=G('sacristanSetup')(options);
  assert.ok(items.some(i=>i.id==='palms'&&i.needed&&i.places.includes('procession')));
  assert.ok(items.some(i=>i.id==='passionTexts'&&i.needed&&i.places.includes('ambo')));
  assert.ok(items.some(i=>i.id==='aspersory'&&i.needed&&i.places.includes('procession')));
  assert.ok(items.some(i=>i.id==='missal'&&/commemoration of the entrance/.test(i.name)));
  const away=G('sacristanPackAway')(options);
  assert.ok(away.some(i=>i.id==='aspersoryBack'&&i.needed)&&away.some(i=>i.id==='palmsAway'&&i.needed));
  assert.ok(!G('sacristanSetup')(setup('P',{}).options).some(i=>i.id==='palms'&&i.needed));
  const av=setup('AV',{...raw,projector:true});
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'all');
  assert.ok(cues.some(c=>c.part==='palms'),'music and slide during the blessing of palms');
  assert.ok(cues.some(c=>c.part==='entrance'&&/All Glory, Laud and Honour/.test(c.title)));
  assert.ok(cues.some(c=>c.part==='passion'),'slide and track for the Passion');
  assert.ok(!cues.some(c=>c.part==='confiteor'||c.part==='kyrie'||c.part==='gloria'));
  setup('P',{});assert.equal(STEPS[0].key,0);
}

// ---- round 25: liturgical season ribbon and breviary ----
{
  const breviary=G('liturgicalBreviary');
  const presets=G('GAME_PRESETS');
  const palm=breviary(presets.palmSunday.fields);
  assert.equal(palm.colour,'red');
  assert.equal(palm.latinColour,'Ruber');
  assert.equal(palm.title,'Palm Sunday of the Passion of the Lord');
  assert.equal(palm.preface,'Preface of Palm Sunday (The Passion of the Lord)');
  assert.ok(palm.specialRites.some(r=>/palm branches/.test(r)));

  const ash=breviary(presets.ashWednesday.fields);
  assert.equal(ash.colour,'purple');
  assert.equal(ash.latinColour,'Violaceus');
  assert.equal(ash.title,'Ash Wednesday');
  assert.ok(ash.specialRites.some(r=>/ashes/.test(r)));

  const candle=breviary(presets.candlemas.fields);
  assert.equal(candle.colour,'white');
  assert.equal(candle.latinColour,'Albus');
  assert.ok(candle.specialRites.some(r=>/candles/.test(r)));

  const nat=breviary(presets.nativity.fields);
  assert.equal(nat.colour,'white');
  assert.equal(nat.latinColour,'Albus');
  assert.equal(nat.season,'Christmas');

  const conf=breviary(presets.confirmation.fields);
  assert.equal(conf.colour,'red');
  assert.equal(conf.latinColour,'Ruber');
  assert.ok(conf.specialRites.some(r=>/Chrism/.test(r)));

  const bish=breviary(presets.pontifical.fields);
  assert.equal(bish.colour,'white');
  assert.equal(bish.latinColour,'Albus');

  const sun=breviary(presets.sunday.fields);
  assert.equal(sun.colour,'green');
  assert.equal(sun.latinColour,'Viridis');

  const exp=breviary(presets.benediction.fields);
  assert.equal(exp.colour,'white');
  assert.equal(exp.season,'Eucharistic Worship');

  const lay=breviary(presets.adorationLay.fields);
  assert.equal(lay.colour,'white');
  assert.ok(/Lay-led/.test(lay.title));

  const ht=breviary(presets.holyThursday.fields);
  assert.equal(ht.colour,'white');
  assert.equal(ht.latinColour,'Albus');
  assert.equal(ht.season,'The Sacred Paschal Triduum');
  assert.ok(ht.specialRites.some(r=>/Mandatum|Washing of the Feet/.test(r)));
  assert.ok(ht.specialRites.some(r=>/Altar of Repose/.test(r)));
  assert.ok(ht.specialRites.some(r=>/Stripping of the altar/.test(r)));

  const gf=breviary(presets.goodFriday.fields);
  assert.equal(gf.colour,'red');
  assert.equal(gf.latinColour,'Ruber');
  assert.equal(gf.season,'The Sacred Paschal Triduum');
  assert.ok(gf.specialRites.some(r=>/Prostration|prostrate/i.test(r)));
  assert.ok(gf.specialRites.some(r=>/Passion of the Lord according to John/i.test(r)));
  assert.ok(gf.specialRites.some(r=>/Adoration of the Holy Cross/i.test(r)));
  assert.ok(gf.specialRites.some(r=>/Altar of Repose/i.test(r)));
}

// ---- round 26: Holy Thursday (Mass of the Lord's Supper) ----
{
  const presets=G('GAME_PRESETS'),norm=G('normaliseGameOptions');
  assert.ok(presets.holyThursday,'holyThursday preset exists');
  assert.equal(presets.holyThursday.fields.holyThursday,true);
  assert.equal(presets.holyThursday.fields.gloria,true);
  assert.equal(presets.holyThursday.fields.creed,false);
  assert.equal(presets.holyThursday.fields.eucharisticPrayer,'I');
  assert.equal(presets.holyThursday.fields.bellEpiclesis,false);
  assert.equal(presets.holyThursday.fields.bellElevation,false);
  assert.equal(norm('E',{rite:'exposition',holyThursday:true}).options.holyThursday,false,'not at Exposition');
  const raw={...presets.holyThursday.fields,serverCount:Number(presets.holyThursday.fields.serverCount)};
  const {options}=setup('S',raw);
  assert.equal(G('presetForOptions')(options,'holyThursday'),'holyThursday');
  assert.equal(G('celebrationForPreset')('holyThursday').id,'holyThursday');
  assert.equal(G('celebrationForPreset')('holyThursday').branch,'triduum');
  assert.equal(G('celebrationForPreset')('holyThursday').station,7);
  setup('S',raw);
  assert.ok(STEPS.some(s=>s.key===14.5&&s.title==='Washing of the Feet (Mandatum)'));
  assert.ok(STEPS.some(s=>s.key===38.5&&s.title==='Transfer of the Blessed Sacrament to the Altar of Repose'));
  assert.ok(STEPS.some(s=>s.key===39&&s.title==='Stripping of the Altar (Denudatio altaris)'));
  assert.ok(!STEPS.some(s=>s.key===15),'no Creed on Holy Thursday');
  assert.ok(!STEPS.some(s=>s.key===38),'no final blessing');
  assert.ok(!STEPS.some(s=>s.key===40),'no recession with hymn');
  assert.ok(G('deriveDuties')('S',STEPS,options).some(d=>d.key===14.5&&/basin/.test(d.text)),'the server assists with the basin');
  setup('D',raw);
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>d.key===14.5),'the Deacon assists at the Mandatum');
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>d.key===38.5),'the Deacon accompanies the Blessed Sacrament');
  for(const role of ['P','D','S','C1','X','MC','SAC','PEW','L','AV'])setup(role,{...raw,projector:role==='AV'});
  const items=G('sacristanSetup')(options);
  assert.ok(items.some(i=>i.id==='pitcherBasin'&&i.needed&&i.places.includes('credence')));
  assert.ok(items.some(i=>i.id==='gremialTowel'&&i.needed&&i.places.includes('sacristy')));
  assert.ok(items.some(i=>i.id==='humeralVeil'&&i.needed&&i.places.includes('credence')));
  assert.ok(items.some(i=>i.id==='ciboriumRepose'&&i.needed));
  assert.ok(items.some(i=>i.id==='lamp'&&!i.needed),'main tabernacle is empty beforehand');
  const away=G('sacristanPackAway')(options);
  assert.ok(away.some(i=>i.id==='stripAltarLinens'&&i.needed));
  assert.ok(away.some(i=>i.id==='basinBack'&&i.needed));
  assert.ok(away.some(i=>i.id==='emptyStoups'&&i.needed));
  assert.ok(away.some(i=>i.id==='lampOut'&&i.needed&&!i.trap),'sanctuary lamp is extinguished after Mass on Holy Thursday');
  assert.ok(away.some(i=>i.id==='dustCover'&&i.trap),'altar is left stripped, no dust cover');
  const av=setup('AV',{...raw,projector:true});
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'all');
  assert.ok(cues.some(c=>c.part==='mandatum'),'slide and track for Mandatum');
  assert.ok(cues.some(c=>c.part==='pangeLingua'),'slide and track for Pange Lingua');
  assert.ok(cues.some(c=>c.part==='recessional'&&c.title.includes('Stripping of the Altar')),'stripping in silence');
  setup('P',{});assert.equal(STEPS[0].key,0);
}

// ---- round 27: Good Friday (Celebration of the Passion of the Lord) ----
{
  const presets=G('GAME_PRESETS'),norm=G('normaliseGameOptions');
  assert.ok(presets.goodFriday,'goodFriday preset exists');
  assert.equal(presets.goodFriday.fields.goodFriday,true);
  assert.equal(presets.goodFriday.fields.gloria,false);
  assert.equal(presets.goodFriday.fields.creed,false);
  assert.equal(presets.goodFriday.fields.incense,false);
  assert.equal(presets.goodFriday.fields.bellStart,false);
  assert.equal(presets.goodFriday.fields.bellEpiclesis,false);
  assert.equal(presets.goodFriday.fields.bellElevation,false);
  assert.equal(norm('E',{rite:'exposition',goodFriday:true}).options.goodFriday,false,'not at Exposition');
  const raw={...presets.goodFriday.fields,serverCount:Number(presets.goodFriday.fields.serverCount)};
  const {options}=setup('S',raw);
  assert.equal(G('presetForOptions')(options,'goodFriday'),'goodFriday');
  assert.equal(G('celebrationForPreset')('goodFriday').id,'goodFriday');
  assert.equal(G('celebrationForPreset')('goodFriday').branch,'triduum');
  assert.equal(G('celebrationForPreset')('goodFriday').station,7);
  setup('S',raw);
  assert.ok(STEPS.some(s=>s.key===1&&s.title==='Reverence & Prostration in Silence'));
  assert.ok(STEPS.some(s=>s.key===13&&s.title==='The Passion of the Lord according to John'));
  assert.ok(STEPS.some(s=>s.key===16&&s.title==='The Solemn Intercessions (Orationes Solemnes)'));
  assert.ok(STEPS.some(s=>s.key===16.5&&s.title==='Showing of the Holy Cross (Ecce lignum Crucis)'));
  assert.ok(STEPS.some(s=>s.key===16.7&&s.title==='Adoration of the Holy Cross (Adoratio Sanctae Crucis)'));
  assert.ok(STEPS.some(s=>s.key===17.5&&s.title==='Bringing the Blessed Sacrament from the Altar of Repose'));
  assert.ok(STEPS.some(s=>s.key===36&&s.title==='Reposition & Stripping of the Altar'));
  assert.ok(STEPS.some(s=>s.key===38&&s.title==='Prayer over the People'));
  assert.ok(STEPS.some(s=>s.key===40&&s.title==='Silent Departure'));
  assert.ok(!STEPS.some(s=>s.key===7),'no Gloria on Good Friday');
  assert.ok(!STEPS.some(s=>s.key===15),'no Creed on Good Friday');
  assert.ok(!STEPS.some(s=>s.key===26),'no Eucharistic Prayer or Consecration on Good Friday');
  assert.ok(!STEPS.some(s=>s.key===32),'no Sign of Peace on Good Friday');
  assert.ok(!STEPS.some(s=>s.key===33),'no Agnus Dei on Good Friday');
  assert.ok(!STEPS.some(s=>s.key===39),'no recessional hymn on Good Friday');
  setup('P',raw);
  assert.ok(G('deriveDuties')('P',STEPS,options).some(d=>d.key===1&&/prostrate/i.test(d.text)),'the Priest prostrates before the altar');
  assert.ok(G('deriveDuties')('P',STEPS,options).some(d=>d.key===16.5&&/Cross|Crucis/i.test(d.text)),'the Priest shows the Cross');
  setup('D',raw);
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>d.key===1&&/prostrate/i.test(d.text)),'the Deacon prostrates before the altar');
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>d.key===16&&/kneel|stand/i.test(d.text)),'the Deacon announces the biddings');
  assert.ok(G('deriveDuties')('D',STEPS,options).some(d=>d.key===17.5&&/Repose|ciborium/i.test(d.text)),'the Deacon brings the Blessed Sacrament from the Altar of Repose');
  for(const role of ['P','D','S','C1','X','MC','SAC','PEW','L','AV'])setup(role,{...raw,projector:role==='AV'});
  const items=G('sacristanSetup')(options);
  assert.ok(items.some(i=>i.id==='veiledCross'&&i.needed&&i.places.includes('sacristy')));
  assert.ok(items.some(i=>i.id==='commCandles'&&i.needed&&i.places.includes('credence')));
  assert.ok(items.some(i=>i.id==='lamp'&&!i.needed),'main tabernacle is empty and lamp extinguished beforehand');
  assert.ok(items.some(i=>i.id==='chalice'&&!i.needed),'no chalice needed on Good Friday');
  assert.ok(items.some(i=>i.id==='wine'&&!i.needed),'no wine needed on Good Friday');
  const away=G('sacristanPackAway')(options);
  assert.ok(away.some(i=>i.id==='crossPlaced'&&i.needed));
  assert.ok(away.some(i=>i.id==='lampOut'&&i.needed&&!i.trap),'sanctuary lamp extinguished');
  assert.ok(away.some(i=>i.id==='dustCover'&&i.trap),'altar remains bare, no dust cover');
  const av=setup('AV',{...raw,projector:true});
  const cues=G('deriveMediaCues')(STEPS,null,av.options,'all');
  assert.ok(cues.some(c=>c.part==='passion'),'slide and track for Passion of St John');
  assert.ok(cues.some(c=>c.part==='ecceLignum'),'slide and chant for Ecce lignum Crucis');
  assert.ok(cues.some(c=>c.part==='improperia'),'slide and track for Reproaches / Adoration of the Cross');
  assert.ok(!cues.some(c=>c.part==='entrance'),'silent entrance on Good Friday');
  assert.ok(!cues.some(c=>c.part==='recessional'),'silent departure on Good Friday');
  setup('P',{});assert.equal(STEPS[0].key,0);
}
console.log('mass-game tests passed');
