'use strict';
// Holy Mass simulator: game controller layered on the 3D explorer (mass-3d.js).

const ROLE_BLURBS={
  P:'Celebrant. Vest, lead the procession, say the prayers from the Missal, and keep an eye on the ministers.',
  D:'Carry the Book of the Gospels, proclaim the Gospel, assist at the altar and dismiss the people.',
  S:'Book, vessels, water, bell: the server who assists the Priest at the chair and altar.',
  X:'Carry the processional cross and know where it stands.',
  C1:'Carry a candle in the processions and flank the Gospel.',
  T:'Thurible and boat: incense at the entrance, Gospel, offertory and elevations.',
  L:'Proclaim the readings from the ambo and lead the Psalm.',
  MC:'Master of Ceremonies: direct the liturgy, cue every minister and catch mistakes.',
  SAC:'Prepare everything before Mass and put it away afterwards.',
  PEW:'Arrive, find a seat and take your part: postures, responses and acclamations.'
};
const EXTRA_FIGURES={MC:{name:'M.C.',color:'#2e2f36'},SAC:{name:'Sacristan',color:'#5a6470'},PEW:{name:'Parishioner',color:'#6a7fa0'}};
const PROP_FOR_ITEM={chalice:['chalice'],corporal:['corporal'],missal:['missal'],water:['ewer'],wine:['wine'],ciborium:['bread'],gospels:['gospels'],gospelsAltar:['gospels'],procCross:['cross'],altarCross:['cross'],procCandles:['cand1','cand2'],thurible:['thurible'],altarBell:['bell']};
const SACRISTY_SLOTS=[[1070,95],[1110,95],[1150,95],[1070,150],[1150,150],[1070,205],[1110,205],[1150,205],[1190,150],[1190,205]];

const game={
  phase:'setup',role:null,level:'choice',options:null,notes:[],seed:1,
  board:createScoreboard(),stops:[],active:null,lapse:null,duties:[],
  soundCues:[],soundIndex:0,lastElapsed:-1,
  walkers:{},overrides:{},player:null,seatIndex:-1,
  markers:[],tokens:[],placed:new Set(),hideProps:false,hideMinisters:false,
  checklist:[],book:null,clock:0,mcPos:MC_HOME.slice(),afterWalk:null,
  questions:true,autoCount:0,highlight:null,cross:null
};

// ---------- small helpers ----------
const el=(tag,props={},children=[])=>{
  const {dataset,...rest}=props;
  const node=Object.assign(document.createElement(tag),rest);
  if(dataset)Object.assign(node.dataset,dataset);
  for(const child of [].concat(children))node.append(child);
  return node;
};
const roleLabel=role=>EXTRA_FIGURES[role]?.name||ROLE_NAMES[role]||role;
const currentElapsed=()=>stepStart[cur3d]+STEPS[cur3d].dur*progress3d;
function placeById(id){return GAME_PLACES.find(p=>p.id===id);}
function toast(text,bad=false,ms=3200){
  const node=$('gameToast');
  node.textContent=text;node.classList.toggle('bad',bad);node.hidden=false;
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>{node.hidden=true;},ms);
}
const LABEL_SCALE=.65;
function relabel(figure,text){
  if(figure.label){
    figure.root.remove(figure.label);
    const index=sceneLabels.indexOf(figure.label);
    if(index>=0)sceneLabels.splice(index,1);
    figure.label.material.map.dispose();figure.label.material.dispose();
  }
  figure.label=label(text,new THREE.Vector3(0,2,0));
  figure.label.scale.multiplyScalar(LABEL_SCALE);
  figure.root.add(figure.label);
  figure.root.userData.labelText=text;
}
function disposeSprite(sprite){
  scene.remove(sprite);
  const index=sceneLabels.indexOf(sprite);
  if(index>=0)sceneLabels.splice(index,1);
  sprite.material.map?.dispose();sprite.material.dispose();
}
function unlayout(mapped){
  let q=mapped.slice();
  for(let i=0;i<10;i++){const lp=layoutPoint(q);q=[mapped[0]-(lp[0]-q[0]),mapped[1]-(lp[1]-q[1])];}
  return q;
}
function rayToPlan(raycaster){
  for(const height of [.32,0]){
    const hit=new THREE.Vector3();
    if(!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height),hit))continue;
    const plan=unlayout([hit.x/SCALE+500,hit.z/SCALE+440]);
    if(height>0&&!(plan[1]<300||plan[0]>1000))continue;
    return plan;
  }
  return null;
}
function figureRole(raycaster){
  const roots=Object.entries(figures).filter(([key,f])=>key!=='player'&&f.root.visible).map(([,f])=>f.root);
  for(const hit of raycaster.intersectObjects(roots,true)){
    let node=hit.object;
    while(node&&!node.userData.role)node=node.parent;
    if(node)return node.userData.role;
  }
  return null;
}

// ---------- extra scenery: sacristy annex, narthex, stoup ----------
function buildGameScene(){
  const annex=world(SACRISTY);
  box(scene,annex.x,.16,annex.z,5.6,.32,5.8,'#d8ccb2',false);
  box(scene,(12.4+annex.x-2.8)/2,.16,world([1000,215]).z,1.6,.32,1.5,'#d8ccb2',false);
  box(scene,annex.x,.8,annex.z-2.9,5.6,1.3,.15,'#b9aa8d');
  box(scene,annex.x+2.8,.8,annex.z,.15,1.3,5.8,'#b9aa8d');
  box(scene,annex.x,.8,annex.z+2.9,5.6,1.3,.15,'#b9aa8d');
  const vesting=world([1150,72]);
  box(scene,vesting.x,.32+.48,vesting.z,2.6,.08,.8,'#8a6a45');
  box(scene,vesting.x,.32+.22,vesting.z,2.4,.44,.7,'#6e5236');
  const cupboard=world([1205,190]);
  box(scene,cupboard.x,.32+.9,cupboard.z,.6,1.8,1.6,'#6e5236');
  const crucifix=world([1110,44]);
  box(scene,crucifix.x,1.8,crucifix.z+.1,.06,.9,.05,'#795b34');
  box(scene,crucifix.x,2.0,crucifix.z+.1,.45,.06,.05,'#795b34');
  scene.add(Object.assign(label('Sacristy',world(SACRISTY,2.5)),{}));
  box(scene,0,-.15,12.6,8.6,.3,3.2,'#cfc6b4',false);
  for(const side of [-1,1])box(scene,side*1.4,1.4,11.05,.25,2.8,.3,'#a39172');
  box(scene,0,2.9,11.05,3.05,.25,.3,'#a39172');
  const stoup=world([440,866]);
  cylinder(scene,stoup.x,.55,stoup.z,.05,.07,1.1,'#9d9282');
  cylinder(scene,stoup.x,1.12,stoup.z,.2,.12,.1,'#c8d9d9');
  scene.add(label('Way in',world([500,985],2.2)));
  for(const [key,info] of Object.entries(EXTRA_FIGURES)){
    ROLE_NAMES[key]=info.name;
    const figure=makeFigure(info.color,'#c49a76',key);
    figure.root.visible=false;
    figures[key]=figure;
  }
  figures.PEW.root.scale.set(.78,.78,.78);
  figures.PEW.root.userData.baseScale=.78;
  for(const sprite of sceneLabels)sprite.scale.multiplyScalar(LABEL_SCALE);
}

// ---------- walking ----------
function walkTo(key,from,to,speed=170,onArrive){
  const path=[...routeVia(from,to)];
  game.walkers[key]={pos:from.slice(),path,speed,onArrive,phase:Math.random()*5};
  game.overrides[key]=from.slice();
}
// Adds the sacristy door to routes leaving or entering the annex, then avoids pews.
function routeVia(from,to){
  const inside=p=>p[0]>1005;
  const legs=[];
  let start=from;
  if(inside(from)&&!inside(to)){
    legs.push([1040,215],[975,215]);start=[975,215];
    if(to[1]>300){legs.push([945,300]);start=[945,300];}
  }
  if(!inside(from)&&inside(to)){
    const entry=from[1]>300?[[945,Math.min(from[1],780)],[945,300],[975,215]]:[[975,215]];
    if(from[1]>300&&inPews(from))legs.push(...routeBetween(from,[945,Math.min(from[1],780)]).slice(0,-1));
    legs.push(...entry,[1040,215],to);
    return legs;
  }
  return [...legs,...routeBetween(start,to)];
}
function updateWalkers(dt){
  for(const [key,w] of Object.entries(game.walkers)){
    let budget=w.speed*dt*Math.max(1,Number($('rate').value));
    while(budget>0&&w.path.length){
      const target=w.path[0],d=distance(w.pos,target);
      if(d<=budget){w.pos=target.slice();w.path.shift();budget-=d;}
      else{w.pos=[w.pos[0]+(target[0]-w.pos[0])*budget/d,w.pos[1]+(target[1]-w.pos[1])*budget/d];budget=0;}
    }
    game.overrides[key]=w.pos.slice();
    if(!w.path.length){
      delete game.walkers[key];
      w.onArrive?.();
    }
  }
}
function placeFigure(key,p,time){
  const figure=figures[key];
  const w=game.walkers[key];
  const target=w?.path[0];
  figure.root.visible=true;
  figure.root.position.copy(world(p));
  if(target){
    const a=layoutPoint(p),b=layoutPoint(target);
    figure.root.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);
  }else if(game.facing?.[key]!==undefined)figure.root.rotation.y=game.facing[key];
  const kneeling=game.kneel?.[key]>time;
  pose(figure,kneeling?'kneel':'stand',kneeling?'genuflects':'',time+(w?.phase||0),Boolean(target));
}

function walk(key,from,to,speed){
  return new Promise(resolve=>walkTo(key,from,to,speed,resolve));
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

// ---------- setup form ----------
const SETUP_KEY='massGameSetup',SCORES_KEY='massGameScores';
function buildSetupForm(){
  const roleOrder=['P','D','S','X','C1','T','L','MC','SAC','PEW'];
  $('roleCards').replaceChildren(...roleOrder.map(id=>el('label',{},[
    el('input',{type:'radio',name:'role',value:id,checked:id==='P'}),
    el('strong',{textContent:GAME_ROLES[id].name}),ROLE_BLURBS[id]])));
  $('levelCards').replaceChildren(...Object.values(GAME_LEVELS).map(level=>el('label',{},[
    el('input',{type:'radio',name:'level',value:level.id,checked:level.id==='choice'}),
    el('strong',{textContent:level.name}),level.blurb])));
  const form=$('setupForm');
  try{
    const saved=JSON.parse(localStorage.getItem(SETUP_KEY)||'null');
    if(saved)for(const [name,value] of Object.entries(saved)){
      const field=form.elements[name];
      if(!field)continue;
      if(field instanceof RadioNodeList)field.value=value;
      else if(field.type==='checkbox')field.checked=!!value;
      else field.value=value;
    }
  }catch{}
  if(typeof applyAppearance==='function'&&figures.P)applyAppearance(readAppearance());
  form.addEventListener('change',previewNotes);
  form.addEventListener('submit',event=>{event.preventDefault();startGame(readForm());});
  previewNotes();
  showHighScores();
}
function readForm(){
  const f=$('setupForm').elements;
  const saved={};
  for(const field of f){
    if(!field.name||field.type==='submit')continue;
    if(field.type==='radio'){if(field.checked)saved[field.name]=field.value;}
    else saved[field.name]=field.type==='checkbox'?field.checked:field.value;
  }
  try{localStorage.setItem(SETUP_KEY,JSON.stringify(saved));}catch{}
  const raw={
    deacon:saved.deacon,lector:saved.lector,serverCount:Number(saved.serverCount),incense:saved.incense,bothKinds:saved.bothKinds,
    gloria:saved.gloria,creed:saved.creed,secondReading:saved.secondReading,giftsProcession:saved.giftsProcession,solemnBlessing:saved.solemnBlessing,
    introductory:saved.introductory,music:saved.music,eucharisticPrayer:saved.eucharisticPrayer,
    bells:{start:saved.bellStart,epiclesis:saved.bellEpiclesis,elevation:saved.bellElevation},
    crucifix:saved.crucifix,crossStand:saved.crossStand,
    lapses:saved.lapses,detail:saved.detail,symbols:saved.symbols,level:saved.level,seed:Math.floor(Math.random()*1e6)
  };
  return {role:saved.role||'P',level:saved.level||'choice',sound:saved.sound!==false,raw};
}
function previewNotes(){
  const config=readForm();
  try{
    const {notes}=normaliseGameOptions(config.role,config.raw);
    $('setupNotes').textContent=notes.join(' ');
  }catch(error){$('setupNotes').textContent=error.message;}
}
function loadScores(){
  try{return JSON.parse(localStorage.getItem(SCORES_KEY)||'[]');}catch{return [];}
}
function showHighScores(){
  const scores=loadScores();
  if(!scores.length){$('highScores').replaceChildren();return;}
  const rows=scores.slice(0,8).map(s=>el('tr',{},[el('td',{textContent:GAME_ROLES[s.role]?.name||s.role}),el('td',{textContent:GAME_LEVELS[s.level]?.name||s.level}),el('td',{textContent:s.percent+'%'}),el('td',{textContent:s.points+' pts'}),el('td',{textContent:s.date})]));
  $('highScores').replaceChildren(el('strong',{textContent:'Best results on this device'}),el('table',{},[el('tbody',{},rows)]));
}

// ---------- starting a game ----------
function gameScenarioOptions(){return game.options?scenarioRequest(game.options):{};}
function resetGameState(){
  game.gen=(game.gen||0)+1;
  closeDecision();
  clearMarkers();
  for(const token of game.tokens)disposeSprite(token);
  game.tokens=[];
  for(const key of Object.keys(EXTRA_FIGURES))figures[key].root.visible=false;
  if(game.labelled){
    const figure=game.labelled.figure;
    if(game.labelled.congregant){
      figure.root.remove(figure.label);
      const index=sceneLabels.indexOf(figure.label);
      if(index>=0)sceneLabels.splice(index,1);
      figure.label=null;
    }else relabel(figure,ROLE_NAMES[game.labelled.key]||game.labelled.key);
    game.labelled=null;
  }
  congregation.forEach(person=>{person.figure.root.visible=true;});
  Object.assign(game,{phase:'setup',stops:[],active:null,lapse:null,duties:[],soundCues:[],lastElapsed:-1,walkers:{},overrides:{},
    facing:{},kneel:{},hidden:new Set(),placed:new Set(),hideProps:new Set(),checklist:[],seatIndex:-1,busy:false,mcPos:MC_HOME.slice(),board:createScoreboard(),autoCount:0,highlight:null,history:[]});
  $('gameLog').replaceChildren();
  $('gameChecklist').hidden=true;
  $('bookModal').hidden=true;
  $('rate').value='1';
  updateScore();
}
function startGame(config){
  $('gameSetup').hidden=true;
  $('summaryModal').hidden=true;
  GameAudio.setEnabled(config.sound);
  GameAudio.ensure();
  syncSoundButton();
  resetGameState();
  const {options,notes}=normaliseGameOptions(config.role,{...config.raw,level:config.level});
  Object.assign(game,{role:config.role,level:config.level,options,notes,seed:options.seed,questions:!GAME_LEVELS[config.level].watch});
  game.cross=setCrossPlaces(options);
  document.body.classList.toggle('noSymbols',options.symbols===false);
  syncQuestionsButton();
  $('deacon').checked=options.deacon;$('lector').checked=options.lector;
  $('serverCount').value=String(options.serverCount);
  $('incense').checked=options.incense;$('bothKinds').checked=options.bothKinds;
  applySetup();
  setPlaying(false);
  jump(0);
  game.team=scenario.team;game.visible=scenario.visible;
  setupPlayerFigure();
  game.soundCues=deriveSoundCues(STEPS,stepStart);
  scheduleStops();
  const info=GAME_ROLES[game.role];
  $('gameBadge').textContent='You: '+info.name+' / '+GAME_LEVELS[game.level].name;
  $('gameRoleNote').textContent=ROLE_BLURBS[game.role];
  $('gameBookButton').hidden=!info.book;
  $('gameBookButton').textContent='Open the '+(info.book||'book');
  game.book=info.sayRole?buildBook(info.sayRole):null;
  for(const note of notes)logLine(note,'note');
  logLine('Celebration: '+describeCelebration(),'note');
  setCamera('player');
  runPreMass(game.gen);
  if(GAME_ROLES[game.role].start==='sacristy'){
    // After the figures are placed: a higher, wider view of the crowded sacristy, which the follow camera keeps.
    const gen=game.gen;
    wait(150).then(()=>{
      if(gen!==game.gen||cameraMode!=='player')return;
      controls.target.copy(world([1090,170],.8));
      camera3d.position.copy(world([1010,470],8.5));
      followPosition=null;
      controls.update();
    });
  }
}
function describeCelebration(){
  const o=game.options,parts=[];
  parts.push(o.music==='sung'?'sung Mass':'said Mass');
  if(o.deacon)parts.push('Deacon');
  parts.push(o.serverCount+' server'+(o.serverCount===1?'':'s'));
  if(o.lector)parts.push('lector');
  parts.push(o.incense?'incense':'no incense');
  if(o.bothKinds)parts.push('Communion under both kinds');
  if(!o.gloria)parts.push('no Gloria');
  if(!o.creed)parts.push('no Creed');
  if(!o.secondReading)parts.push('one reading before the Gospel');
  parts.push({A:'Confiteor',C:'invocations',sprinkling:'sprinkling rite'}[o.introductory]);
  parts.push('Eucharistic Prayer '+o.eucharisticPrayer);
  if(o.solemnBlessing)parts.push('Solemn Blessing');
  if(o.crucifix!=='wall')parts.push('crucifix: '+CRUCIFIX_PLACES[o.crucifix].name.toLowerCase());
  if(o.crossStand!=='right')parts.push('cross stand: '+CROSS_STANDS[o.crossStand].name.toLowerCase());
  return parts.join(', ')+'.';
}
function setupPlayerFigure(){
  const actor=GAME_ROLES[game.role].actor;
  const key=actor||game.role;
  const figure=figures[key];
  figures.player=figure;
  relabel(figure,'You: '+(EXTRA_FIGURES[key]?.name||ROLE_NAMES[key]));
  game.labelled={key,figure};
  const option=$('camera').querySelector('option[value="player"]');
  option.disabled=false;
  for(const extra of Object.keys(EXTRA_FIGURES)){
    if(![...$('camera').options].some(o=>o.value===extra)&&extra===game.role)$('camera').append(el('option',{value:extra,textContent:'Follow the '+EXTRA_FIGURES[extra].name}));
  }
}

// ---------- stops during Mass ----------
const STOP_ORDER={lapse:0,cue:1,decision:2};
function stepTime(step,t){return stepStart[step]+t*STEPS[step].dur;}
function scheduleStops(){
  const stops=[];
  const detail=game.options.detail;
  if(game.role==='MC'){
    game.duties=deriveCues(game.visible,STEPS,detail);
    for(const cue of game.duties)stops.push({time:stepTime(cue.step,cue.t),type:'cue',cue});
  }else{
    game.allDuties=deriveDuties(game.role,STEPS,game.options);
    game.duties=selectDecisionDuties(game.allDuties,detail);
    for(const duty of game.duties)stops.push({time:stepTime(duty.step,duty.t),type:'decision',duty});
  }
  const lapses=planLapses({playerRole:game.role,level:game.level,enabled:game.options.lapses,seed:game.seed,visible:game.visible,steps:STEPS,avoid:game.duties});
  for(const lapse of lapses)stops.push({time:stepTime(lapse.step,lapse.t),type:'lapse',lapse});
  stops.sort((a,b)=>a.time-b.time||STOP_ORDER[a.type]-STOP_ORDER[b.type]);
  game.stops=stops;
}
function nextStop(){return game.stops.find(stop=>!stop.done);}
function gameTimeLimit(elapsed){
  if(game.phase==='setup')return elapsed;
  if(game.phase!=='mass')return currentElapsed();
  const stop=nextStop();
  return stop?Math.min(elapsed,Math.max(stop.time,currentElapsed())):elapsed;
}

// ---------- decisions ----------
function displayAnswer(value){
  if(Array.isArray(value))return value.length===2&&typeof value[0]==='number'?placeFor(value).name:value.length+' ticked';
  if(ROLE_NAMES[value]||EXTRA_FIGURES[value])return roleLabel(value);
  return String(value??'(no answer)');
}
function optionValue(option){return option.role??option.value??option.label;}
function ask(decision){
  return new Promise(resolve=>{
    closeDecision();
    const active={decision,resolve,attempt:1,started:performance.now(),finished:false,gen:game.gen,lastTick:99};
    if(!game.questions){
      // Questions off: the duty is done for the player after a short pause, without scoring.
      active.timer=setTimeout(()=>autoResolve(active),350);
      return;
    }
    game.active=active;
    renderDecision(active);
  });
}
function renderDecision(active){
  const d=active.decision;
  const box=$('decision');
  box.hidden=false;
  box.className=d.input==='floor'||d.input==='figure'?'floor':'';
  document.body.classList.add('deciding');
  $('decisionStep').textContent=d.stage||(STEPS[cur3d].part+' / '+(d.title||STEPS[cur3d].title));
  $('decisionPrompt').textContent=d.prompt;
  const hints={
    floor:'Click the place in the church (you can turn and zoom the view first).',
    figure:'Click the minister in the church.',
    book:'Look in the book and click the words you say.',
    palette:'Choose from all your actions.',
    checklist:'Tick everything that should be done, then press Finished.'
  };
  let hint=d.hint||hints[d.input]||'';
  if(isGuided(game.level)&&!d.hint)hint='Guided: press the button to do it.';
  if(d.input==='options'&&d.options.some(o=>o.at)&&!isGuided(game.level))hint='Click an answer, or its marker on the floor.';
  $('decisionHint').textContent=hint;
  const list=$('decisionOptions');
  list.className=d.input==='palette'?'palette':d.input==='checklist'?'checklist':'';
  list.replaceChildren();
  const buttons=d.input==='options'||d.input==='palette'?d.options:(d.extraOptions||[]);
  buttons.forEach((option,i)=>{
    const button=el('button',{type:'button'},[el('span',{className:'key',textContent:i<9?String(i+1):''}),iconNode(GameIcons.iconFor(option.label,iconKind(d,option))),(isGuided(game.level)&&option.correct?'▶ ':'')+option.label]);
    button.dataset.value=JSON.stringify(optionValue(option));
    linkHighlight(button,()=>highlightTarget(option,option.label));
    button.onclick=()=>answer(optionValue(option),button);
    list.append(button);
  });
  if(d.input==='checklist'){
    for(const item of d.items){
      const row=el('label',{},[el('input',{type:'checkbox',value:item.id}),iconNode(GameIcons.iconFor(item.name)),item.name]);
      linkHighlight(row,()=>highlightTarget(item.places?.[0]?{at:placeById(item.places[0])?.at}:null,item.name));
      list.append(row);
    }
  }
  $('decisionFinish').hidden=d.input!=='checklist';
  $('decisionFinish').onclick=()=>answer([...list.querySelectorAll('input:checked')].map(x=>x.value));
  $('decisionBook').hidden=d.input!=='book';
  $('decisionBook').onclick=()=>openBook();
  $('decisionContinue').hidden=true;
  $('decisionFeedback').replaceChildren();
  $('decisionTimer').hidden=!d.timer;
  $('decisionTimer').firstElementChild.style.width='100%';
  $('decisionTimer').classList.remove('low');
  clearMarkers();
  if(d.input==='options'&&!isGuided(game.level)){
    for(const option of d.options)if(option.at)addMarker(option.at,option.label,optionValue(option));
  }
  if(d.input==='book')openBook();
  const first=list.querySelector('button');
  if(first&&d.input!=='book')first.focus({preventScroll:true});
}
function answer(value,button){
  const active=game.active;
  if(!active||active.finished)return;
  const d=active.decision;
  const correct=d.check?d.check(value):checkAnswer(d,value);
  if(correct){finish(active,{correct:true,answer:value});return;}
  GameAudio.wrong();
  if(button){button.classList.add('incorrect');button.disabled=true;}
  if(d.kind==='nudge'&&value){
    penalise(game.board,SCORE_RULES.wrongNudge,'Nudged the '+displayAnswer(value)+', who had not missed anything',d.ref);
    logLine('−20: the '+displayAnswer(value)+' was doing fine.','wrong');
    updateScore();
  }
  active.attempt++;
  if(active.attempt>d.attempts){finish(active,{correct:false,answer:value});return;}
  const where=Array.isArray(value)?' That is '+displayAnswer(value)+'.':'';
  $('decisionFeedback').replaceChildren('Not quite.'+where+' Try again ('+(d.attempts-active.attempt+1)+' left).');
  $('decision').className=($('decision').className.replace(/\b(right|wrong)\b/g,'')+' wrong').trim();
  if(d.input==='book')$('bookHint').textContent='Not that one. Look again: '+(d.title||'')+'.';
}
function finish(active,result){
  if(active.finished)return;
  active.finished=true;
  const d=active.decision;
  const remaining=d.timer?Math.max(0,1-(performance.now()-active.started)/(d.timer*1000)):0;
  const attempt=result.correct?active.attempt:d.attempts;
  const outcome={...result,attempt,remaining,raw:result.answer,answer:displayAnswer(result.answer)};
  let points=0;
  if(d.score)points=d.score(result,outcome);
  else if(!d.noScore)points=recordResult(game.board,d,outcome);
  updateScore();
  (result.correct?GameAudio.correct:GameAudio.wrong)();
  const box=$('decision');
  box.className=(box.className.replace(/\b(right|wrong)\b/g,'')+(result.correct?' right':' wrong')).trim();
  for(const button of $('decisionOptions').querySelectorAll('button')){
    const option=d.options?.find(o=>JSON.stringify(optionValue(o))===button.dataset.value);
    button.disabled=true;
    if(option?.correct){
      button.classList.add('correct');
      if(!result.correct){button.disabled=false;button.onclick=()=>done();}
    }
  }
  $('decisionTimer').hidden=true;
  const message=result.correct
    ?'✓ '+(attempt>1?'Got it. ':'Correct. ')+(d.explain||'')
    :(result.timedOut?'⏱ Time is up. ':'✗ ')+'The answer: '+displayAnswer(d.correct)+'. '+(d.explain||'');
  $('decisionFeedback').replaceChildren(message.trim()+' ',el('span',{className:'ref',textContent:d.ref?'('+d.ref+')':''}),points?el('strong',{textContent:' '+(points>0?'+':'')+points}):'');
  logResult(d,result.correct,outcome,points);
  if(d.input==='book'&&result.correct)$('bookModal').hidden=true;
  function done(){
    if(game.active!==active)return;
    closeDecision();
    active.resolve(outcome);
  }
  if(result.correct)active.timer=setTimeout(done,isGuided(game.level)?450:900);
  else{
    $('decisionContinue').hidden=false;
    $('decisionContinue').onclick=done;
    $('decisionContinue').focus({preventScroll:true});
    if(game.level==='timed')active.timer=setTimeout(done,4000);
  }
}
function closeDecision(){
  const active=game.active;
  if(active){clearTimeout(active.timer);}
  game.active=null;
  $('decision').hidden=true;
  document.body.classList.remove('deciding');
  clearMarkers();
  setHighlight(null);
}
function autoResolve(active){
  if(active.finished||active.gen!==game.gen)return;
  active.finished=true;
  clearTimeout(active.timer);
  const d=active.decision;
  const value=autoAnswer(d);
  game.autoCount++;
  const shown=d.input==='checklist'?d.items.filter(i=>i.needed).length+' tasks done':displayAnswer(value);
  logLine('▶ '+(d.title?d.title+': ':'')+shown,'auto');
  if(d.input==='checklist')for(const item of d.items)if(item.needed)markChecklist(item.id,'done');
  if(!['cue','nudge'].includes(d.kind)&&game.phase!=='pre')toast('You: '+shown,false,1800);
  if(game.active===active)closeDecision();
  active.resolve({correct:true,attempt:1,remaining:0,raw:value,answer:shown,auto:true});
}
function updateDecisionTimer(){
  const active=game.active;
  if(!active||active.finished||!active.decision.timer||!$('bookModal').hidden&&active.decision.input!=='book')return;
  const left=1-(performance.now()-active.started)/(active.decision.timer*1000);
  const bar=$('decisionTimer');
  bar.firstElementChild.style.width=Math.max(0,left*100)+'%';
  bar.classList.toggle('low',left<.3);
  const seconds=Math.ceil(left*active.decision.timer);
  if(seconds<=3&&seconds<active.lastTick&&seconds>0){active.lastTick=seconds;GameAudio.tick();}
  if(left<=0)finish(active,{correct:false,timedOut:true,answer:null});
}

// ---------- symbols and hover highlights ----------
function iconNode(name){
  const span=el('span',{className:'iconWrap'});
  if(name)span.innerHTML=GameIcons.svg(name);
  return span;
}
function iconKind(d,option){
  if(option.role)return 'role';
  if(d.kind==='say'||d.input==='book')return 'say';
  if(d.kind==='posture')return 'posture';
  return d.kind;
}
// Resolves what an answer refers to in the church: a plan point, a minister or a prop.
function highlightTarget(option,text){
  if(option?.at)return {point:option.at};
  if(option?.role&&figures[option.role])return {figure:option.role};
  const target=GameIcons.targetFor(text);
  if(!target)return null;
  if(target.cross){
    const cross=game.cross;
    if(cross?.kind==='crucifix')return {point:[cross.at[0],cross.at[1]+12]};
    return objects.cross?{object:'cross'}:null;
  }
  if(target.prop&&objects[target.prop])return {object:target.prop};
  if(target.place){const place=placeById(target.place);return place?{point:place.at}:null;}
  return null;
}
let highlightMesh=null;
function setHighlight(target){
  game.highlight=target||null;
  if(!target&&highlightMesh)highlightMesh.visible=false;
}
function linkHighlight(node,resolve){
  const show=()=>setHighlight(resolve());
  node.addEventListener('mouseenter',show);
  node.addEventListener('focus',()=>{if(node.matches(':focus-visible'))show();});
  node.addEventListener('mouseleave',()=>setHighlight(null));
  node.addEventListener('blur',()=>setHighlight(null));
}
function updateHighlight(now){
  const target=game.highlight;
  if(!target){if(highlightMesh)highlightMesh.visible=false;return;}
  if(!highlightMesh){
    highlightMesh=new THREE.Group();
    const glow={color:'#3fd0e6',transparent:true,depthTest:false,side:THREE.DoubleSide};
    const ring=new THREE.Mesh(new THREE.RingGeometry(.42,.6,40),new THREE.MeshBasicMaterial({...glow,opacity:.95}));
    ring.rotation.x=-Math.PI/2;ring.renderOrder=6;
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,3.2,16,1,true),new THREE.MeshBasicMaterial({...glow,opacity:.22}));
    beam.position.y=1.6;beam.renderOrder=5;
    highlightMesh.add(ring,beam);
    highlightMesh.userData.ring=ring;
    scene.add(highlightMesh);
  }
  let position;
  if(target.point)position=world(target.point);
  else if(target.figure)position=figures[target.figure].root.position.clone();
  else if(target.object)position=objects[target.object].position.clone();
  if(!position){highlightMesh.visible=false;return;}
  highlightMesh.visible=true;
  highlightMesh.position.set(position.x,position.y+.05,position.z);
  const pulse=1+.22*Math.sin(now*6);
  highlightMesh.userData.ring.scale.set(pulse,pulse,pulse);
}

// ---------- floor markers ----------
function addMarker(p,text,value){
  const ring=new THREE.Mesh(new THREE.RingGeometry(.32,.48,32),new THREE.MeshBasicMaterial({color:'#e2b33c',transparent:true,opacity:.9,side:THREE.DoubleSide,depthTest:false}));
  ring.rotation.x=-Math.PI/2;
  ring.position.copy(world(p,.04));
  ring.renderOrder=4;
  ring.userData.answer=value;
  scene.add(ring);
  const tag=label(text.length>34?text.slice(0,32)+'…':text,world(p,.9));
  tag.userData.answer=value;
  scene.add(tag);
  game.markers.push(ring,tag);
}
function clearMarkers(){
  for(const marker of game.markers){
    if(marker.isSprite)disposeSprite(marker);
    else{scene.remove(marker);marker.geometry.dispose();marker.material.dispose();}
  }
  game.markers=[];
}
function addToken(p,text){
  const tag=label(text,world(p,1.1));
  tag.scale.multiplyScalar(.75);
  scene.add(tag);
  game.tokens.push(tag);
}

// ---------- the book ----------
function openBook(){
  if(!game.book)return;
  const select=$('bookPage');
  select.replaceChildren(...game.book.map((page,i)=>el('option',{value:i,textContent:page.part})));
  const part=STEPS[cur3d]?.part;
  const index=Math.max(0,game.book.findIndex(page=>page.part===part));
  $('bookTitle').textContent=GAME_ROLES[game.role].book;
  renderBookPage(game.phase==='mass'?index:0);
  $('bookModal').hidden=false;
  $('bookClose').focus({preventScroll:true});
}
function renderBookPage(index){
  const pages=game.book;
  index=Math.max(0,Math.min(pages.length-1,index));
  $('bookPage').value=String(index);
  $('bookPrev').disabled=index===0;$('bookNext').disabled=index===pages.length-1;
  const active=game.active&&!game.active.finished&&game.active.decision.input==='book'?game.active:null;
  $('bookHint').textContent=active?'Find what you say now ('+(active.decision.title||STEPS[cur3d].title)+') and click it. Pages follow the parts of the Mass.':'Browse your texts. During Expert decisions, click a line to say it.';
  const body=$('bookBody');
  body.replaceChildren();
  for(const section of pages[index].sections){
    body.append(el('h3',{className:section.today?'':'unused'},[section.title+' ',el('small',{textContent:section.ref+(section.note?' '+section.note:'')})]));
    for(const text of section.lines){
      const button=el('button',{type:'button',className:'line'+(section.today?'':' unused'),textContent:text,disabled:!active});
      button.onclick=()=>answer(text,button);
      body.append(button);
    }
  }
  body.scrollTop=0;
}

// ---------- status panel, log and score ----------
function setPhase(title,note){
  $('gamePhase').textContent=title;
  if(note!==undefined)$('gameNow').replaceChildren(el('p',{textContent:note}));
}
function updateScore(){
  const board=game.board;
  const percent=board.possible?Math.max(0,Math.round(board.points/board.possible*100)):0;
  $('gameScore').textContent='Score '+board.points+(board.possible?' ('+percent+'%)':'');
}
function logLine(text,className=''){
  $('gameLog').prepend(el('li',{className,textContent:text}));
}
function logResult(d,correct,outcome,points){
  const text=(correct?'✓ ':'✗ ')+(d.title?d.title+': ':'')+(correct?displayAnswer(d.correct):'expected '+displayAnswer(d.correct)+(outcome.timedOut?' (time ran out)':', you chose '+outcome.answer));
  $('gameLog').prepend(el('li',{className:correct?'right':'wrong'},[iconNode(GameIcons.iconFor(displayAnswer(d.correct),iconKind(d,{}))),text+' ',el('span',{className:'ref',textContent:d.ref?'('+d.ref+')':''}),points?' '+(points>0?'+':'')+points:'']));
}
function setChecklist(items){
  const list=$('gameChecklist');
  list.replaceChildren(...items.map(item=>el('li',{dataset:{id:item.id}},[iconNode(GameIcons.iconFor(item.name)),item.name])));
  list.hidden=!items.length;
}
function markChecklist(id,state){
  const item=$('gameChecklist').querySelector(`li[data-id="${id}"]`);
  if(item)item.className=state;
}

// ---------- turning prepared tasks into decisions ----------
function taskDecision(task,stage){
  const level=game.level;
  const d={...task,stage,title:task.title||stage,level,attempts:GAME_LEVELS[level].attempts,timer:decisionTimer(level,task.kind),input:'options'};
  d.options=(task.options||[]).map(o=>({...o}));
  if(isGuided(level))d.options=d.options.filter(o=>o.correct);
  if(task.kind==='place'){
    d.options.forEach(o=>{if(!o.at){const place=GAME_PLACES.find(p=>p.name===o.label);if(place)o.at=place.at;}});
    if(task.target)d.options.forEach(o=>{if(o.correct)o.at=task.target;});
    if(level==='expert')d.input='floor';
    if(task.target)d.check=value=>Array.isArray(value)?distance(value,task.target)<=60||checkAnswer(d,value):checkAnswer(d,value);
  }
  if(task.kind==='pew'){
    d.input='floor';
    d.hint='Click a pew in the nave.';
    d.check=value=>value==='auto'||Array.isArray(value)&&inPews(value);
    if(level!=='expert')d.extraOptions=[{label:'Pick a seat for me',value:'auto'}];
  }
  return d;
}
const roleStart=()=>{
  const actor=GAME_ROLES[game.role].actor;
  return actor?starts[0].pos[actor]:game.role==='MC'?MC_START:null;
};
function ministersOnStage(){return ['P','D','X','C1','C2','T','S','L'].filter(r=>game.visible.has(r));}

// ---------- before Mass ----------
async function runPreMass(gen){
  game.phase='pre';
  const ministers=ministersOnStage();
  ministers.forEach((r,i)=>{game.overrides[r]=SACRISTY_SLOTS[i].slice();game.facing[r]=Math.PI;});
  if(game.role==='MC'){game.overrides.MC=SACRISTY_SLOTS[8].slice();game.facing.MC=Math.PI;}
  if(game.role==='SAC'){game.overrides.SAC=[1190,205];game.facing.SAC=Math.PI;}
  if(game.role==='PEW'){game.overrides.PEW=OUTSIDE.slice();game.facing.PEW=Math.PI;}
  const npcWalk=()=>Promise.all(ministers.filter(r=>r!==GAME_ROLES[game.role].actor).map((r,i)=>wait(i*350).then(()=>walk(r,game.overrides[r],starts[0].pos[r]))));
  if(game.role==='SAC'){
    setPhase('Before Mass: preparing','Set out everything this celebration needs (GIRM 105, 117-118). The ministers are vesting in the sacristy.');
    await runSacristanSetup(gen);
    if(gen!==game.gen)return;
    const seat=game.options.bells.start?[1040,200]:SACRISTAN_SEAT;
    toast('Everything is ready. The ministers line up.');
    await Promise.all([npcWalk(),walk('SAC',game.overrides.SAC,seat)]);
  }else{
    const where=game.role==='PEW'?'You arrive outside the church.':'You are in the sacristy with the other ministers.';
    setPhase('Before Mass',where);
    const tasks=preMassTasks(game.role,game.options,game.team,roleStart());
    let walking=null;
    if(game.role==='PEW')walking=npcWalk();
    for(const task of tasks){
      const outcome=await ask(taskDecision(task,'Before Mass'));
      if(gen!==game.gen)return;
      await afterPreTask(task,outcome,gen);
      if(gen!==game.gen)return;
    }
    if(walking)await walking;
    else if(game.role!=='PEW'){
      // The player has already walked to their place; the others follow.
      await npcWalk();
    }
  }
  if(gen!==game.gen)return;
  beginMass();
}
async function afterPreTask(task,outcome,gen){
  const key=GAME_ROLES[game.role].actor||game.role;
  const raw=outcome.raw;
  if(task.id==='vest')toast('You vest: '+displayAnswer(task.correct).toLowerCase()+'.');
  else if(task.id==='carry')toast('You take: '+displayAnswer(task.correct).toLowerCase()+'.');
  else if(task.id==='order')toast('The procession lines up: '+task.correct+'.');
  else if(task.id==='stoup'){await walk('PEW',game.overrides.PEW,[455,862]);toast('You sign yourself with holy water.');await wait(700);}
  else if(task.id==='reverence'){
    await walk('PEW',game.overrides.PEW,[500,735]);
    game.kneel.PEW=performance.now()/1000+1.3;await wait(1300);
  }else if(task.id==='pew'){
    const point=Array.isArray(raw)&&inPews(raw)?raw:[[395,560],[605,560],[325,600],[675,600]][game.seed%4];
    await takeSeat(point,gen);
  }else if(task.id==='line'){
    const target=outcome.correct&&Array.isArray(raw)&&task.target&&distance(raw,task.target)<=60?task.target:task.target||roleStart();
    await walk(key,game.overrides[key],target);
    game.facing[key]=target[1]>300?Math.PI:0;
  }
  void gen;
}
async function takeSeat(point,gen){
  let best=0;
  congregation.forEach((person,i)=>{if(distance(person.home,point)<distance(congregation[best].home,point))best=i;});
  const person=congregation[best];
  person.figure.root.visible=false;
  game.hidden.add(best);
  const aisleX=person.home[0]<500?470:530;
  await walk('PEW',game.overrides.PEW,[aisleX,person.home[1]]);
  await walk('PEW',game.overrides.PEW,person.home);
  if(gen!==game.gen)return;
  delete game.overrides.PEW;
  figures.PEW.root.visible=false;
  game.hidden.delete(best);
  person.figure.root.visible=true;
  game.seatIndex=best;
  relabel(person.figure,'You: Parishioner');
  game.labelled={key:'PEW',figure:person.figure,congregant:true};
  figures.player=person.figure;
  if(cameraMode==='player')setCamera('player');
  toast('You take your place in the pew.');
}

// ---------- sacristan ----------
const NOT_NEEDED='Not needed (or not my task)';
const SHORT_NAMES={altarCloth:'Altar cloth',altarCandles:'Candles lit',lectionary:'Lectionary',lavabo:'Lavabo set',commPlate:'Communion plate',chalice2:'Second chalice',aspersory:'Holy water',sacristyBell:'Sacristy bell',vestP:'Chasuble',vestD:'Dalmatic',vestS:'Albs',lamp:'Lamp lit',altarCross:'Altar cross'};
async function runSacristanSetup(gen){
  const items=sacristanSetup(game.options,game.team);
  game.checklist=items;
  setChecklist(items);
  for(const item of items)if(item.needed)for(const prop of PROP_FOR_ITEM[item.id]||[])game.hideProps.add(prop);
  const placeCount={};
  for(const item of items){
    const decision=placeDecision(item);
    const outcome=await ask(decision);
    if(gen!==game.gen)return;
    markChecklist(item.id,outcome.correct?'done':'missed');
    if(!item.needed)continue;
    const place=placeById(item.places[0]);
    const target=outcome.correct&&Array.isArray(outcome.raw)?outcome.raw:place.at;
    if(item.places[0]!=='sacristy'){
      await walk('SAC',game.overrides.SAC,[target[0],target[1]+(target[1]<300?28:0)]);
      if(gen!==game.gen)return;
    }
    for(const prop of PROP_FOR_ITEM[item.id]||[])game.hideProps.delete(prop);
    if(!PROP_FOR_ITEM[item.id]||item.places[0]==='sacristy'){
      const n=placeCount[place.id]=(placeCount[place.id]||0)+1;
      const at=item.places[0]==='sacristy'?SACRISTY_SLOTS[(n+3)%SACRISTY_SLOTS.length]:place.at;
      const tag=label(SHORT_NAMES[item.id]||item.name.split(/[,(]/)[0],world(at,1.25+(n-1)*.32));
      tag.scale.multiplyScalar(.7);scene.add(tag);game.tokens.push(tag);
    }
  }
}
function placeDecision(item){
  const level=game.level;
  const random=seededRandom(game.seed+'|'+item.id);
  const right=item.needed?placeById(item.places[0]):null;
  const pool=['credence','altar','ambo','sacristy','giftTable','chair','tabernacle','sanctuaryStep'].filter(id=>!item.places.includes(id)).map(placeById);
  let options;
  if(item.needed){
    options=[{label:right.name,correct:true,at:right.at},...shuffled(pool,random).slice(0,2).map(p=>({label:p.name,correct:false,at:p.at})),{label:NOT_NEEDED,correct:false}];
  }else{
    const tempting=placeById(item.places[0]);
    options=[{label:NOT_NEEDED,correct:true},{label:tempting.name,correct:false,at:tempting.at},...shuffled(pool,random).slice(0,2).map(p=>({label:p.name,correct:false,at:p.at}))];
  }
  options=shuffled(options,random);
  if(isGuided(level))options=options.filter(o=>o.correct);
  return {id:'setup:'+item.id,kind:'place',stage:'Before Mass: sacristan',title:item.name,prompt:item.name+': where does it go?',
    places:item.needed?item.places:[],correct:item.needed?right.name:NOT_NEEDED,ref:item.ref,explain:item.reason||'',
    level,attempts:GAME_LEVELS[level].attempts,timer:decisionTimer(level,'place'),
    input:level==='expert'?'floor':'options',options,extraOptions:level==='expert'?[{label:NOT_NEEDED,correct:!item.needed}]:undefined,
    hint:level==='expert'?'Click where it belongs in the church or sacristy, or press "'+NOT_NEEDED+'".':undefined};
}
const PACK_PROPS={booksBack:['missal','gospels'],vessels:['chalice','bread'],cruets:['ewer','wine'],procBack:['cross','cand1','cand2'],thuribleOut:['thurible'],bellBack:['bell']};
async function runPackAway(gen){
  const items=sacristanPackAway(game.options,game.team);
  game.checklist=items;
  setChecklist(items);
  setPhase('After Mass: putting away','The ministers have gone. Put everything away (GIRM 105).');
  await walk('SAC',game.overrides.SAC||SACRISTAN_SEAT,[860,300]);
  if(gen!==game.gen)return;
  if(game.level==='expert'){
    const decision={id:'packaway',kind:'checklist',stage:'After Mass: sacristan',title:'Pack-away checklist',prompt:'Which of these should you do now? Tick them all, then press Finished.',
      level:'expert',attempts:1,timer:0,input:'checklist',items,correct:items.filter(i=>i.needed).map(i=>i.name).join('; '),ref:'GIRM 105, 163, 183, 316',
      check:value=>{const r=checklistScore(items,value);return r.complete&&!r.traps&&!r.extra;},
      score:(result,outcome)=>{
        const r=checklistScore(items,result.answer||[]);
        game.board.points+=r.points;game.board.possible+=r.possible;game.board.decisions++;
        if(outcome.correct)game.board.correct++;else game.board.wrong++;
        if(outcome.correct&&outcome.attempt===1)game.board.firstTry++;
        game.board.log.push({title:'Pack-away checklist',kind:'checklist',correct:outcome.correct,expected:r.needed+' tasks',answer:r.correct+' done, '+r.missed+' missed, '+r.traps+' mistakes',ref:decision.ref,points:r.points});
        const chosen=new Set(result.answer||[]);
        for(const item of items)markChecklist(item.id,item.needed===chosen.has(item.id)?'done':'missed');
        decision.explain=r.correct+' of '+r.needed+' done'+(r.traps?'; '+r.traps+' should never be done ('+items.filter(i=>i.trap&&chosen.has(i.id)).map(i=>i.reason).join(' ')+')':'')+'.';
        return r.points;
      }};
    const outcome=await ask(decision);
    if(gen!==game.gen)return;
    void outcome;
    for(const [id,props] of Object.entries(PACK_PROPS))if(items.find(i=>i.id===id)?.needed)props.forEach(p=>game.hideProps.add(p));
    await walk('SAC',game.overrides.SAC,SACRISTY);
    return;
  }
  for(const item of items){
    const correct=item.needed?'Do it now':'Leave it';
    let options=[{label:'Do it now',correct:item.needed},{label:'Leave it',correct:!item.needed}];
    if(isGuided(game.level))options=options.filter(o=>o.correct);
    const outcome=await ask({id:'pack:'+item.id,kind:'task',stage:'After Mass: sacristan',title:item.name,prompt:item.name+'?',correct,options,ref:item.ref,explain:item.reason||'',
      level:game.level,attempts:1,timer:decisionTimer(game.level,'task'),input:'options'});
    if(gen!==game.gen)return;
    markChecklist(item.id,outcome.correct?'done':'missed');
    if(item.needed){
      const place=placeById(item.places[0]);
      await walk('SAC',game.overrides.SAC,place.id==='sacristy'?[1060,180]:[place.at[0],place.at[1]+(place.at[1]<300?28:0)]);
      if(gen!==game.gen)return;
      for(const prop of PACK_PROPS[item.id]||[])game.hideProps.add(prop);
    }
  }
}

// ---------- during Mass ----------
function beginMass(){
  for(const r of Object.keys(ACTORS))delete game.overrides[r];
  game.facing={};
  for(const token of game.tokens)disposeSprite(token);
  game.tokens=[];
  game.hideProps.clear();
  $('gameChecklist').hidden=true;
  game.phase='mass';
  game.lastElapsed=-1;
  if(game.role==='MC')game.mcPos=MC_START.slice();
  const notes={
    MC:'Watch every minister. Cue each one at the right moment, and catch anyone who stalls.',
    SAC:'During Mass the sacristan stays ready at the back. Speed up the clock if you wish; pack-away follows.',
    PEW:'Follow the Mass: postures, responses and acclamations.'
  };
  setPhase('Holy Mass',notes[game.role]||'Your decisions appear at each of your duties. Watch the other ministers too.');
  if(game.role==='SAC'){$('rate').value='3';toast('Speed set to 3x: there is little for the sacristan to do during Mass.');}
  if(game.role==='MC'||game.role==='SAC')setCamera('action');
  setPlaying(true);
}
async function runStop(stop){
  game.busy=true;
  const gen=game.gen;
  const snapshot={stop,board:JSON.parse(JSON.stringify(game.board)),autoCount:game.autoCount,logLen:$('gameLog').children.length};
  if(stop.type==='decision'){
    const d=buildDecision(stop.duty,game.level,game.seed,game.allDuties);
    if(stop.duty.type==='move')d.explain='You go to '+placeFor(stop.duty.to,GAME_ROLES[game.role].actor).name+'.';
    await ask(d);
  }else if(stop.type==='cue'){
    const d=cueDecision(stop.cue,game.level,game.visible,game.seed);
    d.explain=stop.cue.correctRoles.map(r=>ROLE_NAMES[r]).join(' / ')+': '+stop.cue.text+'.';
    const outcome=await ask(d);
    if(gen===game.gen&&outcome.correct)toast('You cue the '+roleLabel(stop.cue.correctRoles[0]).toLowerCase()+'.');
  }else{
    await lapseStop(stop.lapse,gen);
  }
  if(gen!==game.gen)return;
  stop.done=true;
  game.history.push(snapshot);
  game.busy=false;
}
// Takes the player back to the previous decision, undoing its score and log entry.
function redoPrevious(){
  if(game.phase!=='mass'||!game.history.length){toast('There is no earlier step to redo yet.');return;}
  const entry=game.history.pop();
  game.gen++;
  closeDecision();
  $('bookModal').hidden=true;
  setHighlight(null);
  game.busy=false;game.lapse=null;
  Object.assign(game.board,entry.board);
  game.autoCount=entry.autoCount;
  const log=$('gameLog');
  while(log.children.length>entry.logLen)log.firstElementChild.remove();
  const index=game.stops.indexOf(entry.stop);
  game.stops.forEach((stop,i)=>{if(i>=index)stop.done=false;});
  let step=0;
  while(step<STEPS.length-1&&stepStart[step+1]<=entry.stop.time)step++;
  jump(step,Math.min(1,(entry.stop.time-stepStart[step])/STEPS[step].dur));
  game.lastElapsed=entry.stop.time-1e-6;
  setPlaying(true);
  updateScore();
  toast('Back one step: '+STEPS[step].title+'.');
}
async function lapseStop(lapse,gen){
  game.lapse=lapse;
  const d=nudgeDecision(lapse,game.level,game.visible);
  const who=ROLE_NAMES[lapse.role];
  d.explain='Due now for the '+who.toLowerCase()+': '+lapse.expected+'.';
  if(isGuided(game.level))d.options=d.options.filter(o=>o.correct);
  if(game.level==='timed'||game.level==='expert')d.prompt='The celebration has stalled. Who needs a discreet reminder?';
  if(game.level==='expert')d.hint='Click the minister who has missed their duty.';
  d.stage=STEPS[cur3d].part+' / something is wrong';
  const outcome=await ask(d);
  if(gen!==game.gen)return;
  game.lapse=null;
  toast(outcome.correct?'A quiet word: the '+who.toLowerCase()+' carries on.':'The '+who.toLowerCase()+' realises and carries on, a little late.',!outcome.correct);
}

// ---------- after Mass ----------
async function startPost(){
  if(game.phase!=='mass')return;
  game.phase='post';
  setPlaying(false);
  const gen=game.gen;
  const actor=GAME_ROLES[game.role].actor;
  setPhase('After Mass',game.role==='PEW'?'The ministers have gone out.':'The ministers return to the sacristy.');
  ministersOnStage().forEach((r,i)=>{
    const from=actorAt(STEPS.length-1,r,1);
    const start=from[1]>842?[from[0],850]:from;
    game.overrides[r]=start.slice();
    if(r!==actor)wait(i*300).then(()=>{if(gen===game.gen)walk(r,game.overrides[r],SACRISTY_SLOTS[i]).then(()=>{game.facing[r]=Math.PI;});});
  });
  if(game.role==='MC')game.overrides.MC=game.mcPos.slice();
  if(game.role==='SAC'){
    await runPackAway(gen);
  }else{
    for(const task of postMassTasks(game.role,game.options)){
      const outcome=await ask(taskDecision(task,'After Mass'));
      if(gen!==game.gen)return;
      if(task.id==='where'){
        const key=actor||game.role;
        await walk(key,game.overrides[key],SACRISTY_SLOTS[ministersOnStage().indexOf(key)]||[1150,205]);
        game.facing[key]=Math.PI;
      }else if(task.id==='leave'){
        const home=congregation[game.seatIndex]?.home||[500,700];
        game.overrides.player=home.slice();
        await walk('player',home,[home[0]<500?470:530,home[1]]);
        await walk('player',game.overrides.player,OUTSIDE);
      }
      void outcome;
    }
  }
  if(gen!==game.gen)return;
  await wait(600);
  finishGame();
}
function finishGame(){
  game.phase='summary';
  setPlaying(false);
  const board=game.board,grade=gradeBoard(board);
  const watched=board.decisions===0;
  $('summaryScore').textContent=board.points+' points of '+board.possible+' ('+grade.percent+'%). '+board.correct+' of '+board.decisions+' right, '+board.firstTry+' first time'+(board.timeouts?', '+board.timeouts+' timed out':'')+(board.lapsesCaught+board.lapsesMissed?'. Lapses caught: '+board.lapsesCaught+' of '+(board.lapsesCaught+board.lapsesMissed):'')+'.';
  $('summaryVerdict').textContent=grade.verdict;
  if(watched){
    $('summaryScore').textContent='Watched from start to finish: '+game.autoCount+' duties were done for you, so there is no score.';
    $('summaryVerdict').textContent='Choose another level to be asked questions.';
  }else if(game.autoCount)$('summaryScore').textContent+=' Questions were off for '+game.autoCount+' duties (not scored).';
  const rows=board.log.map(entry=>el('tr',{className:entry.correct?'right':'wrong'},[
    el('td',{textContent:entry.kind==='penalty'?'−':entry.correct?'✓':'✗'}),
    el('td',{},[iconNode(GameIcons.iconFor(typeof entry.expected==='string'?entry.expected:entry.title||'',entry.kind))]),
    el('td',{textContent:entry.title||''}),
    el('td',{textContent:entry.kind==='penalty'?'':entry.correct?displayAnswer(entry.expected):'Expected: '+displayAnswer(entry.expected)+(entry.timedOut?' (time ran out)':'. You: '+(entry.answer??''))}),
    el('td',{className:'small',textContent:entry.ref||''}),
    el('td',{textContent:String(entry.points??0)})]));
  $('summaryLog').replaceChildren(el('table',{},[el('tbody',{},rows)]));
  const scores=loadScores();
  if(!watched)scores.push({role:game.role,level:game.level,percent:grade.percent,points:board.points,date:new Date().toLocaleDateString()});
  scores.sort((a,b)=>b.percent-a.percent||b.points-a.points);
  try{localStorage.setItem(SCORES_KEY,JSON.stringify(scores.slice(0,10)));}catch{}
  showHighScores();
  setPhase('Finished','See your results. Choose "Play again" or another role.');
  $('summaryModal').hidden=false;
  $('summaryAgain').focus({preventScroll:true});
}

// ---------- per-frame hook from mass-3d.js ----------
function tweenTowards(key,target,dt,speed=190){
  const p=game.overrides[key]||target.slice();
  const d=distance(p,target),step=speed*dt*Math.max(1,Number($('rate').value));
  game.overrides[key]=d<=step?target.slice():[p[0]+(target[0]-p[0])*step/d,p[1]+(target[1]-p[1])*step/d];
  if(d>1){const a=layoutPoint(p),b=layoutPoint(target);game.facing[key]=Math.atan2(b[0]-a[0],b[1]-a[1]);}
  return d>1;
}
function gameBeforeRender(dt,positions){
  if(!game||game.phase==='setup')return;
  const now=performance.now()/1000;
  updateWalkers(dt);
  if(game.phase==='mass'){
    const key=STEPS[cur3d].key;
    if(game.role==='MC'){
      const target=key===0||key===40?[positions.P[0]+38,positions.P[1]-12]:MC_HOME;
      if(!tweenTowards('MC',target,dt*(playing3d?1:0),key===0||key===40?400:190))game.facing.MC=0;
      game.mcPos=game.overrides.MC.slice();
    }
    if(game.role==='SAC'){
      const target=game.options.bells.start&&cur3d===0&&progress3d<.3?[1040,200]:SACRISTAN_SEAT;
      if(!game.walkers.SAC)tweenTowards('SAC',target,dt*(playing3d?1:0));
      game.facing.SAC=Math.PI;
    }
  }
  for(const key of Object.keys(EXTRA_FIGURES))if(!game.overrides[key])figures[key].root.visible=false;
  for(const [key,p] of Object.entries(game.overrides)){
    if(!figures[key])continue;
    const base=positions[key];
    placeFigure(key,p,now);
    if(game.phase==='mass'&&(key==='MC'||key==='SAC')&&!game.walkers[key]){
      const posture=postureAt(cur3d,progress3d).name;
      const atRest=distance(p,key==='MC'?MC_HOME:SACRISTAN_SEAT)<6;
      pose(figures[key],posture==='kneel'?'kneel':posture==='sit'&&atRest?'sit':'stand','',now,false);
      if(key==='SAC')figures[key].root.rotation.y=Math.PI;
    }
    if(base){
      // Carried props follow a minister whose position the game has taken over.
      const shift=world(p).sub(world(base));
      for(const name of Object.keys(PROP_DEF)){
        const state=propAt(cur3d,name,progress3d,positions);
        if(state.by!==key||state.h)continue;
        objects[name].position.x+=shift.x;objects[name].position.z+=shift.z;
        objects[name].position.y=world(p).y+(name==='cross'?.2:figures[key].root.scale.y*1.28);
        objects[name].visible=true;
      }
    }
  }
  for(const index of game.hidden)congregation[index].figure.root.visible=false;
  for(const name of game.hideProps)if(objects[name])objects[name].visible=false;
  if(game.lapse&&figures[game.lapse.role]){
    const figure=figures[game.lapse.role];
    if(game.lapse.kind==='wrong')pose(figure,'sit','',now,false);
    else{figure.root.rotation.y+=2.3;figure.torso.rotation.x=-.15;}
  }
  updateDecisionTimer();
  updateHighlight(now);
  if(game.phase==='mass'){
    const elapsed=currentElapsed();
    if(game.options&&GameAudio.enabled)for(const cue of game.soundCues){
      if(cue.time>game.lastElapsed&&cue.time<=elapsed+1e-6){
        const rate=Number($('rate').value)||1;
        if(cue.type==='bell')GameAudio.altarBell(Math.max(.8,Math.min(3,(cue.until-cue.time)/rate)));
        else if(cue.type==='sacristyBell')GameAudio.sacristyBell();
        else GameAudio.thurible(cue.swings,Math.max(.35,.9/Math.sqrt(rate)));
      }
    }
    game.lastElapsed=elapsed;
    if(!game.busy){
      const stop=nextStop();
      if(stop&&elapsed>=stop.time-1e-4)runStop(stop);
      else if(!stop&&cur3d===STEPS.length-1&&progress3d>=1)startPost();
    }
    if(!game.statusTick||now-game.statusTick>.5){
      game.statusTick=now;
      const stop=nextStop();
      const lines=[el('p',{},[el('strong',{textContent:'Now: '}),STEPS[cur3d].title])];
      if(stop&&game.level!=='expert'&&stop.type!=='lapse'){
        const title=STEPS[(stop.duty||stop.cue).step].title;
        lines.push(el('p',{className:'next',textContent:'Your next moment: '+title+(isGuided(game.level)&&stop.duty?' ('+stop.duty.text+')':'')}));
      }
      $('gameNow').replaceChildren(...lines);
    }
  }
}

// ---------- clicks in the 3D scene ----------
function gamePick(raycaster){
  const active=game.active;
  if(!active||active.finished)return false;
  const d=active.decision;
  if(game.markers.length){
    const hit=raycaster.intersectObjects(game.markers,false)[0];
    if(hit){answer(hit.object.userData.answer);return true;}
  }
  if(d.input==='figure'){
    const role=figureRole(raycaster);
    if(role&&ROLE_NAMES[role]){answer(role);return true;}
    toast('Click on one of the ministers.');
    return true;
  }
  if(d.input==='floor'||d.kind==='pew'){
    const plan=rayToPlan(raycaster);
    if(plan){answer(plan);return true;}
  }
  return false;
}

// ---------- start-up ----------
function syncQuestionsButton(){
  $('gameQuestions').textContent=game.questions?'Questions on':'Questions off (watching)';
  $('gameQuestions').setAttribute('aria-pressed',String(game.questions));
}
function syncSoundButton(){
  $('gameSound').textContent=GameAudio.enabled?'Sound on':'Sound off';
  $('gameSound').setAttribute('aria-pressed',String(GameAudio.enabled));
}
function showSetup(){
  setPlaying(false);
  $('summaryModal').hidden=true;
  $('gameSetup').hidden=false;
  previewNotes();showHighScores();
}
function initialiseGame(){
  if(!scene)return;
  buildGameScene();
  buildSetupForm();
  $('gameBookButton').onclick=()=>openBook();
  $('gameSound').onclick=()=>{GameAudio.setEnabled(!GameAudio.enabled);if(GameAudio.enabled)GameAudio.ensure();syncSoundButton();};
  $('gameRestart').onclick=showSetup;
  $('gameRedo').onclick=redoPrevious;
  $('gameQuestions').onclick=()=>{
    game.questions=!game.questions;
    syncQuestionsButton();
    if(!game.questions&&game.active&&!game.active.finished)autoResolve(game.active);
    toast(game.questions?'Questions are back on from your next duty.':'Questions off: just watch. Your duties are done for you.');
  };
  $('bookClose').onclick=()=>{$('bookModal').hidden=true;};
  $('bookPrev').onclick=()=>renderBookPage(Number($('bookPage').value)-1);
  $('bookNext').onclick=()=>renderBookPage(Number($('bookPage').value)+1);
  $('bookPage').onchange=()=>renderBookPage(Number($('bookPage').value));
  $('summaryAgain').onclick=()=>startGame(readForm());
  $('summaryNew').onclick=showSetup;
  $('play3d').addEventListener('click',event=>{
    if(game.phase!=='mass'){event.stopImmediatePropagation();toast(game.phase==='setup'?'Choose a role first.':'The clock starts when Mass begins.');}
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('bookModal').hidden){$('bookModal').hidden=true;event.preventDefault();return;}
    if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
    if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.stopImmediatePropagation();event.preventDefault();return;}
    if(event.code==='Space'&&game.phase!=='mass'){event.stopImmediatePropagation();event.preventDefault();return;}
    if(game.active&&/^[1-9]$/.test(event.key)&&$('bookModal').hidden&&$('gameSetup').hidden){
      const button=$('decisionOptions').querySelectorAll('button')[Number(event.key)-1];
      if(button&&!button.disabled){event.preventDefault();button.click();}
    }
  },true);
  setPhase('Choose your role','Pick a role, a level and the kind of celebration, then press Start.');
}
initialiseGame();
