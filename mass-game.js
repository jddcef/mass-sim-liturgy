'use strict';
// Holy Mass simulator: game controller layered on the 3D explorer (mass-3d.js).

const ROLE_BLURBS={
  P:'Celebrant. Vest, lead the procession, say the prayers from the Missal, and keep an eye on the ministers.',
  D:'Carry the Book of the Gospels, proclaim the Gospel, assist at the altar and dismiss the people.',
  S:'Book, vessels, water, bell: the server who assists the Priest at the chair and altar.',
  X:'Carry the processional cross and know where it stands.',
  C1:'Carry a candle in the processions and flank the Gospel.',
  T:'Thurible and boat: incense at the entrance, Gospel, offertory and elevations.',
  MB:'In a vimp, hold the Bishop\u2019s mitre whenever he lays it aside, and bring it to him when he sits, preaches and blesses.',
  CB:'In a vimp, hold the Bishop\u2019s pastoral staff and bring it to him for the Gospel, the homily, the blessing and the recession.',
  L:'Proclaim the readings from the ambo and lead the Psalm.',
  L2:'Proclaim the Second Reading, then return to your place with the congregation.',
  U:'Take up the collection when cued and keep other gifts away from the altar.',
  E:'An authorised extraordinary minister: wait until after the Priest receives Communion, then assist when needed.',
  MC:'Master of Ceremonies: direct the liturgy, cue every minister and catch mistakes.',
  SAC:'Prepare everything before Mass and put it away afterwards.',
  PEW:'Arrive, find a seat and take your part: postures, responses and acclamations.',
  AV:'Screen operator: show the right slide and start or fade each backing track on cue.'
};
// Role notes for Exposition and Benediction (HCWEOM 91-100).
const DEVOTION_BLURBS={
  P:'Minister of Exposition. In white cope, expose and incense the Blessed Sacrament, lead the adoration and give Benediction with the humeral veil.',
  D:'Minister of Exposition. In white cope, expose and incense the Blessed Sacrament, lead the adoration and give Benediction with the humeral veil.',
  E:'An authorised lay minister: expose the Blessed Sacrament, lead the prayer and repose it. You do not give the blessing.',
  S:'Prepare the humeral veil and bell, kneel with the minister and assist at the blessing.',
  T:'Thurible and boat: present the incense at the exposition and before the blessing.'
};
// Role notes for the Baptism of children outside Mass (Ordo Baptismi Parvulorum 35-71).
const BAPTISM_BLURBS={
  P:'Minister of Baptism. In a white stole, receive the child at the door, lead the word and the prayers, anoint, baptize at the font and bless the family.',
  D:'Minister of Baptism (CIC 861). In a white stole, receive the child at the door, lead the word and the prayers, anoint, baptize at the font and bless the family.',
  S:'Prepare the font: the holy oils, the white garment, the candle and a towel. Hold the book and the oils, lead the intercessions, and assist at the font.'
};
// Role notes for the funeral liturgy outside Mass (Order of Christian Funerals 177-203).
const FUNERAL_BLURBS={
  P:'Presider. In a violet stole, receive the body at the door with holy water and the pall, lead the Liturgy of the Word and the prayers, and commend the deceased to God with holy water and incense.',
  D:'Presider when no Priest is available (Order of Christian Funerals 14). In a violet stole, receive the body, lead the word and the prayers, and lead the final commendation.',
  S:'Carry the holy water and the book; help place the white pall on the coffin, and hand the sprinkler at the commendation.',
  T:'Thurifer. Bring the thurible for the final commendation and lead the coffin out.'
};
const CORPUS_BLURBS={
  P:'Carry the Blessed Sacrament in the monstrance beneath the canopy where customary; give the concluding blessing and repose the Sacrament.',
  S:'Assist the Priest and carry a canopy pole or ring the bell where customary.',
  X:'Lead the procession with the processional cross.',
  C1:'Carry a processional light beside the Blessed Sacrament where customary.',
  C2:'Carry a processional light beside the Blessed Sacrament where customary.',
  T:'Incense the Blessed Sacrament before the procession; incense during the route follows local custom.',
  PEW:'Follow the procession in prayer and remain through the concluding blessing and reposition.'
};
const riteBlurb=role=>({baptism:BAPTISM_BLURBS,funeral:FUNERAL_BLURBS,corpus:CORPUS_BLURBS}[game.options.rite]||DEVOTION_BLURBS)[role];
const EXTRA_FIGURES={MC:{name:'M.C.',color:'#2e2f36'},SAC:{name:'Sacristan',color:'#5a6470'},PEW:{name:'Parishioner',color:'#6a7fa0'},AV:{name:'Screen operator',color:'#3f6b5a'}};
const PROP_FOR_ITEM={chalice:['chalice'],corporal:['corporal'],missal:['missal'],water:['ewer'],wine:['wine'],ciborium:['bread'],emhcVessel:['ciborium'],collectionBasket:['collection'],gospels:['gospels'],gospelsAltar:['gospels'],procCross:['cross'],altarCross:['cross'],procCandles:['cand1','cand2'],thurible:['thurible'],altarBell:['bell'],chrism:['chrism'],ashes:['ashes'],oilCat:['oilCat'],garment:['garment'],bcandle:['bcandle'],funeralWater:['holyWater'],funeralPall:['drape'],palms:['palms'],basin:['basin'],pitcherBasin:['basin']};
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
  sprite.parent?.remove(sprite);
  const index=sceneLabels.indexOf(sprite);
  if(index>=0)sceneLabels.splice(index,1);
  if(sprite.isSprite){sprite.material.map?.dispose();sprite.material.dispose();}
  else sprite.traverse(o=>o.geometry?.dispose());
}
function unlayout(mapped){
  if(typeof ChurchProfiles!=='undefined')mapped=ChurchProfiles.mapNave(mapped,ChurchProfiles.active,true);
  return furnitureUnpoint(mapped);
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
  box(scene,annex.x,.16,annex.z,5.6,.32,5.8,'#d8ccb2',false,'stone');
  box(scene,(12.4+annex.x-2.8)/2,.16,world([1000,215]).z,1.6,.32,1.5,'#d8ccb2',false,'stone');
  markWall(box(scene,annex.x,.8,annex.z-2.9,5.6,1.3,.15,'#b9aa8d'));
  for(const [front,back] of [[34,120],[180,266]]){
    markWall(box(scene,annex.x+2.8,.8,world([1222,(front+back)/2]).z,.15,1.3,(back-front)*SCALE,'#b9aa8d'));
  }
  markWall(box(scene,annex.x,.8,annex.z+2.9,5.6,1.3,.15,'#b9aa8d'));
  const vesting=world([1150,72]);
  box(scene,vesting.x,.32+.48,vesting.z,2.6,.08,.8,'#8a6a45',true,'wood');
  box(scene,vesting.x,.32+.22,vesting.z,2.4,.44,.7,'#6e5236',true,'wood');
  const cupboard=world([1205,190]);
  box(scene,cupboard.x+.22,.32+.9,cupboard.z,.16,1.8,1.6,'#6e5236',true,'wood');
  for(const side of [-1,1])box(scene,cupboard.x,.32+.9,cupboard.z+side*.78,.6,1.8,.05,'#6e5236',true,'wood');
  for(const y of [.05,.5,.95,1.4,1.78])box(scene,cupboard.x,.32+y,cupboard.z,.6,.04,1.6,'#7d6040',true,'wood');
  scene.add(Object.assign(label('Cupboard',world([1205,190],2.35)),{}));
  // Kept for Exposition and Benediction (a separate liturgy); not part of Mass setup.
  const monstrance=monstranceModel();
  monstrance.position.set(cupboard.x-.04,.32+.07,cupboard.z+.45);
  monstrance.scale.setScalar(.78);
  monstrance.userData.tip='Monstrance (for Exposition and Benediction, not used at Mass)';
  scene.add(monstrance);
  game.monstrance=monstrance;
  buildProjection();
  // Doors the sacristan unlocks and opens in the training opening; open the rest of the time.
  const hinge=new THREE.Group();
  hinge.position.copy(world([1222,130]));hinge.position.x+=.07;
  const leaf=box(hinge,0,.32+.65,.5,.07,1.3,1.0,'#4f3920',true,'wood');
  leaf.userData.door=true;
  scene.add(hinge);
  game.doors={sacristy:hinge,main:[]};
  for(const side of [-1,1]){
    const pivot=new THREE.Group();
    pivot.position.set(side*1.275,0,11.05);
    box(pivot,-side*.64,1.38,0,1.25,2.72,.08,'#5b3f22',true,'wood');
    box(pivot,-side*1.1,1.3,.06,.05,.25,.04,'#c9a64a',true,'gold');
    scene.add(pivot);
    game.doors.main.push(pivot);
  }
  setDoors(true,true);
  const crucifix=world([1110,44]);
  box(scene,crucifix.x,1.8,crucifix.z+.1,.06,.9,.05,'#795b34',true,'wood');
  box(scene,crucifix.x,2.0,crucifix.z+.1,.45,.06,.05,'#795b34',true,'wood');
  scene.add(Object.assign(label('Sacristy',world(SACRISTY,2.5)),{}));
  box(scene,0,-.15,12.6,8.6,.3,3.2,'#cfc6b4',false,'stone');
  for(const side of [-1,1])markWall(box(scene,side*1.4,1.4,11.05,.25,2.8,.3,'#a39172'));
  markWall(box(scene,0,2.9,11.05,3.05,.25,.3,'#a39172'));
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
  buildVestments();
  for(const sprite of sceneLabels)sprite.scale.multiplyScalar(LABEL_SCALE);
  if(typeof refreshParishScene==='function')refreshParishScene();
}

// ---------- doors ----------
const DOOR_OPEN={sacristy:1.45,main:[1.55,-1.55]};
function setDoors(open,instant=false,which=['sacristy','main']){
  game.doorTargets=game.doorTargets||{};
  if(which.includes('sacristy'))game.doorTargets.sacristy=open?DOOR_OPEN.sacristy:0;
  if(which.includes('main'))game.doorTargets.main=open?DOOR_OPEN.main:[0,0];
  if(instant)updateDoors(99);
}
function updateDoors(dt){
  if(!game.doors||!game.doorTargets)return;
  const ease=(object,to)=>{object.rotation.y+=(to-object.rotation.y)*Math.min(1,dt*3);};
  ease(game.doors.sacristy,game.doorTargets.sacristy);
  game.doors.main.forEach((pivot,i)=>ease(pivot,game.doorTargets.main[i]));
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
const gameTasks=new Set();
let gameTasksPaused=false;
function gameTimeout(action,ms){
  const task={action,left:ms,started:performance.now(),timer:null};
  gameTasks.add(task);
  if(!gameTasksPaused)armGameTask(task);
  return task;
}
function armGameTask(task){
  task.started=performance.now();
  task.timer=setTimeout(()=>{gameTasks.delete(task);task.action();},task.left);
}
function clearGameTimeout(task){
  if(!task)return;
  clearTimeout(task.timer);gameTasks.delete(task);
}
function pauseGameTasks(){
  gameTasksPaused=true;
  for(const task of gameTasks){
    clearTimeout(task.timer);
    task.left=Math.max(0,task.left-(performance.now()-task.started));
  }
}
function resumeGameTasks(){
  gameTasksPaused=false;
  for(const task of gameTasks)armGameTask(task);
}
function wait(ms){return new Promise(resolve=>gameTimeout(resolve,ms));}

// ---------- setup form ----------
const SETUP_KEY='massGameSetup',SCORES_KEY='massGameScores',SETUP_VERSION=8;
function buildSetupForm(){
  const roleOrder=['P','D','S','X','C1','T','MB','CB','L','L2','U','E','MC','SAC','PEW','AV'];
  $('roleCards').replaceChildren(...roleOrder.map(id=>el('label',{},[
    el('input',{type:'radio',name:'role',value:id,checked:id==='P'}),
    rolePortrait(id),el('strong',{textContent:GAME_ROLES[id].name}),ROLE_BLURBS[id]])));
  $('levelCards').replaceChildren(...Object.values(GAME_LEVELS).map(level=>el('label',{},[
    el('input',{type:'radio',name:'level',value:level.id,checked:level.id==='choice'}),
    el('strong',{textContent:level.name}),level.blurb])));
  const form=$('setupForm');
  try{
    const saved=JSON.parse(localStorage.getItem(SETUP_KEY)||'null');
    // Older saves predate the new defaults (bell on, reserved hosts on): let those defaults apply.
    if(saved&&!(saved._v>=7)){delete saved.bellStart;delete saved.reservedCommunion;delete saved.preset;}
    if(saved)for(const [name,value] of Object.entries(saved)){
      const field=form.elements[name];
      if(!field)continue;
      if(field instanceof RadioNodeList)field.value=value;
      else if(field.type==='checkbox')field.checked=!!value;
      else field.value=value;
    }
    if(saved&&!saved.rite){
      const preset=GAME_PRESETS[saved.preset]?.fields||{};
      form.elements.rite.value=preset.rite||'mass';
      form.elements.minister.value=preset.minister||'priest';
    }
  }catch{}
  if(typeof applyAppearance==='function'&&figures.P)applyAppearance(readAppearance());
  form.addEventListener('change',previewNotes);
  form.addEventListener('change',event=>{
    if(event.target.name==='preset')choosePreset(event.target.value);
    else syncPreset();
  });
  decorateOptions(form);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const config=readForm();
    // A role that has no part in the chosen rite (for example the Deacon at lay-led adoration).
    try{normaliseGameOptions(config.role,config.raw);}catch(error){toast(error.message,true);return;}
    startGame(config);
  });
  $('cancelSetup').onclick=cancelSetup;
  PathView.initialise(prepareCelebration);
  $('openPath').onclick=()=>PathView.open();
  syncPathStrip();
  syncPreset();
  previewNotes();
  showHighScores();
}
// Presets fill in the celebration fields; any later edit shows "Custom".
function formValues(){
  const values={};
  for(const field of $('setupForm').elements){
    if(!field.name||field.type==='radio'||field.type==='submit')continue;
    values[field.name]=field.type==='checkbox'?field.checked:field.value;
  }
  return values;
}
function choosePreset(id){
  const preset=GAME_PRESETS[id];
  if(!preset){$('presetNote').textContent='Your own choice of options.';syncLiturgicalRibbon(formValues());return;}
  const form=$('setupForm').elements;
  form.rite.value=preset.fields.rite||'mass';
  form.minister.value=preset.fields.minister||'priest';
  for(const [name,value] of Object.entries(preset.fields)){
    const field=form[name];
    if(!field)continue;
    if(field.type==='checkbox')field.checked=!!value;else field.value=String(value);
  }
  $('presetNote').textContent=preset.blurb;
  previewNotes();
  syncLiturgicalRibbon({...formValues(),rite:preset.fields.rite,minister:preset.fields.minister});
  window.SetupMenus?.refresh(id);
}
function syncPreset(){
  const values=formValues();
  const id=matchingPreset(values);
  $('gamePreset').value=id;
  $('presetNote').textContent=GAME_PRESETS[id]?.blurb||'Your own choice of options.';
  syncLiturgicalRibbon(values);
  window.SetupMenus?.refresh(id);
}

function syncLiturgicalRibbon(options){
  if(typeof liturgicalBreviary!=='function')return;
  const brev=liturgicalBreviary(options);
  const ribbon=$('liturgicalRibbon');
  if(!ribbon)return;
  ribbon.style.setProperty('--ribbon-bg',brev.colourHex);
  ribbon.style.setProperty('--ribbon-text',brev.colour==='white'?'#2c2214':'#fff8e7');
  const shortTitle=brev.title.length>26?brev.title.slice(0,24)+'…':brev.title;
  $('ribbonText').textContent=shortTitle;
  ribbon.title=`Liturgical Breviary: ${brev.title} (${brev.colourName} · ${brev.latinColour}) — click to open`;
}

function openBreviary(options){
  if(typeof liturgicalBreviary!=='function')return;
  const brev=liturgicalBreviary(options||game.options||formValues());
  const modal=$('breviaryModal');
  if(!modal)return;
  const tag=$('brevRibbonTag');
  if(tag){
    tag.style.setProperty('--ribbon-bg',brev.colourHex);
    tag.style.setProperty('color',brev.colour==='white'?'#8c6e25':'#ffd700');
  }
  $('brevSeason').textContent=brev.season;
  $('brevTitle').textContent=brev.title;
  $('brevRank').textContent=brev.rank;
  $('brevSwatch').style.background=brev.colourHex;
  $('brevColourName').textContent=`${brev.colourName} (${brev.latinColour})`;
  $('brevColourRationale').textContent=brev.colourRationale;

  $('brevEntrance').textContent=brev.penitentialAct==='Omitted'?'Second Form / Solemn Entrance with branches':'Processional Entrance';
  $('brevPenitential').textContent=brev.penitentialAct;
  $('brevGloria').textContent=brev.gloria;
  $('brevReadings').textContent=brev.readings;
  $('brevAcclamation').textContent=brev.acclamation;
  $('brevCreed').textContent=brev.creed;
  $('brevPreface').textContent=brev.preface;
  $('brevEP').textContent=brev.eucharisticPrayer;
  $('brevBlessing').textContent=brev.blessing;

  const list=$('brevSpecialList');
  if(list){
    list.replaceChildren(...(brev.specialRites||[]).map(r=>el('li',{textContent:r})));
  }
  $('brevSpecialBox').hidden=!(brev.specialRites&&brev.specialRites.length);
  modal.hidden=false;
}

function closeBreviary(){
  const modal=$('breviaryModal');
  if(modal)modal.hidden=true;
}

let chimeTimeout=null;
function triggerVisualChime(cue){
  const overlay=$('chimeOverlay');
  if(!overlay)return;
  const icon=$('chimeIcon'),text=$('chimeText');
  let iconText='🔔',label='Altar bells';
  let pos=null;
  if(cue.type==='sacristyBell'){
    iconText='🔔';
    label='Sacristy bell';
    if(typeof world==='function')pos=world([480,830]);
  }else if(cue.type==='bell'){
    iconText='🔔';
    const isElevation=cue.step&&STEPS[cue.step]&&(/elevation/i.test(STEPS[cue.step].title||'')||/elevation/i.test(STEPS[cue.step].part||''));
    label=isElevation?'Altar bells: Consecration Elevation':(cue.key===23?'Altar bell: Epiclesis':'Altar bells');
    const server=figures?.S1||figures?.S||figures?.G;
    pos=server?.root?.position?.clone()||(typeof world==='function'?world([660,245]):null);
  }else if(cue.type==='thurible'){
    iconText='💨';
    label=`Thurible: ${cue.swings||3} swings`;
    const thurifer=figures?.[cue.actor||'T']||figures?.T||figures?.P;
    pos=thurifer?.root?.position?.clone()||(typeof world==='function'?world([500,200]):null);
  }else if(cue.type==='silence'){
    iconText='🕊️';
    label='Sacred silence';
  }

  if(icon)icon.textContent=iconText;
  if(text)text.textContent=label;
  overlay.hidden=false;
  overlay.classList.remove('animPulse');
  void overlay.offsetWidth;
  overlay.classList.add('animPulse');

  if(pos&&typeof spawnSanctuaryRipple==='function'){
    spawnSanctuaryRipple(pos,cue.type==='thurible'?0xe8dfc8:0xffd54f);
  }

  clearGameTimeout(chimeTimeout);
  chimeTimeout=gameTimeout(()=>{
    overlay.hidden=true;
    overlay.classList.remove('animPulse');
  },2200);
}
// A symbol beside each setup option, so the long list can be scanned by eye.
const OPTION_ICONS={deacon:'gospels',serverCount:'bell',lector:'lectionary',readerCount:'lectionary',lectorProcession:'walk',collection:'collection',emhc:'ciborium',
  reservedCommunion:'tabernacle',deaconCommunion:'host',incense:'thurible',bothKinds:'chalice',gloria:'sing',creed:'speak',secondReading:'book',giftsProcession:'cruets',
  solemnBlessing:'bless',introductory:'sprinkler',music:'sing',eucharisticPrayer:'raise',bellStart:'bell',bellEpiclesis:'bell',bellElevation:'bell',
  crucifix:'crucifix',crossStand:'cross',bishop:'mitre',confirmation:'chrism',nativity:'candle',candlemas:'candle',ashWednesday:'ashes',palmSunday:'palm',baptism:'font',funeral:'coffin',app_corpus:'crucifix',app_windows:'church',app_tabernacle:'tabernacle',app_tabernacleStyle:'tabernacle',app_altarSize:'altar',app_nave:'church',
  app_floor:'altar',app_vestment:'vestment',app_serverRobe:'vestment',app_cincture:'vestment',app_seniorCross:'cross',lapses:'person',detail:'check',sound:'bell',
  recordedAudio:'speak',symbols:'host',openChurch:'door',firstPerson:'person',fpView:'walk',projector:'screen'};
function decorateOptions(form){
  for(const head of form.querySelectorAll('[data-icon]'))head.insertAdjacentHTML('afterbegin','<span class="iconWrap">'+GameIcons.svg(head.dataset.icon,20)+'</span>');
  for(const [name,icon] of Object.entries(OPTION_ICONS)){
    const field=form.elements[name];
    const label=field?.closest?.('label');
    if(!label||label.querySelector('.optIcon'))continue;
    const span=el('span',{className:'iconWrap optIcon'});
    span.innerHTML=GameIcons.svg(icon);
    label.prepend(span);
  }
}
function readForm(){
  const f=$('setupForm').elements;
  const saved={_v:SETUP_VERSION};
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
    crucifix:saved.crucifix,crossStand:saved.crossStand,bishop:saved.bishop===true,confirmation:saved.confirmation===true,nativity:saved.nativity===true,candlemas:saved.candlemas===true,ashWednesday:saved.ashWednesday===true,palmSunday:saved.palmSunday===true,holyThursday:saved.holyThursday===true,goodFriday:saved.goodFriday===true,baptism:saved.baptism===true,funeral:saved.funeral===true,
    lapses:saved.lapses,detail:saved.detail,symbols:saved.symbols,level:saved.level,seed:Math.floor(Math.random()*1e6)
  };
  const presetFields=GAME_PRESETS[saved.preset]?.fields||{};
  raw.rite=saved.rite||presetFields.rite||'mass';
  raw.minister=saved.minister||presetFields.minister||'priest';
  Object.assign(raw,{readerCount:Number(saved.readerCount),lectorProcession:saved.lectorProcession,collection:saved.collection,emhc:saved.emhc,reservedCommunion:saved.reservedCommunion,deaconCommunion:saved.deaconCommunion!==false,openChurch:saved.openChurch!==false,projector:saved.projector===true,
    corpusCanopy:saved.corpusCanopy,corpusTorches:saved.corpusTorches,corpusStations:saved.corpusStations});
  return {role:saved.role||'P',level:saved.level||'choice',preset:saved.preset||'custom',firstPerson:saved.firstPerson===true,fpView:saved.fpView||'shoulder',sound:saved.sound!==false,recordedAudio:saved.recordedAudio!==false,raw};
}
const ROLE_ICONS={P:'vestment',D:'gospels',S:'bell',X:'cross',C1:'candle',T:'thurible',MB:'mitre',CB:'crozier',L:'lectionary',L2:'lectionary',U:'collection',E:'ciborium',MC:'check',SAC:'sacristy',PEW:'people',AV:'screen'};
function rolePortrait(role){
  const badge=ROLE_ICONS[role];
  const image=el('span',{className:'rolePortrait',role:'img'});
  image.setAttribute('aria-label',GAME_ROLES[role].name);
  const robe=['P','D','S','X','C1','T','MB','CB'].includes(role)?'#f4f1e6':'#7293aa';
  image.innerHTML='<svg viewBox="0 0 96 80" aria-hidden="true"><circle cx="29" cy="17" r="10" fill="#c99b75"/><path d="M18 30h22l12 44H6z" fill="'+robe+'" stroke="#4d5b62" stroke-width="2"/><path d="M15 34L6 53m37-19 10 19" stroke="#4d5b62" stroke-width="5" stroke-linecap="round"/>'+
    (role==='D'?'<path d="m17 32 25 37" stroke="#d4af37" stroke-width="5"/>':role==='P'?'<path d="M29 34v33m-9-22h18" stroke="#d4af37" stroke-width="4"/>':'')+
    '<g transform="translate(57 26) scale(1.5)" fill="none" stroke="#7b5d27" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+GameIcons.PATHS[badge]+'"/></g></svg>';
  return image;
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
// ---------- the Path (mass-game-path.js draws it) ----------
function syncPathStrip(){
  $('pathStripRank').textContent=PathView.rankLine(PathView.load());
}
function showPathResult(watched,percent){
  const outcome=PathView.record({preset:game.preset,role:game.role,level:game.level,percent,watched});
  if(!outcome){
    $('summaryPath').textContent='Custom options are not on the Path. Choose a kind of celebration to earn seniority.';
    return;
  }
  const after=outcome.progress,next=nextRecommended(after);
  let text='On the Path: '+outcome.celebration.name+' as '+gameRoleName(game.role,game.options)+': '+MARK_NAMES[outcome.mark]+'.';
  if(outcome.rankAfter.id!==outcome.rankBefore.id)text+=' Your seniority is now '+outcome.rankAfter.name+'. '+outcome.rankAfter.blurb;
  text+=' Completion counts towards seniority regardless of score or involvement.';
  if(next&&next.id!==outcome.celebration.id)text+=' Recommended next: '+next.name+'.';
  $('summaryPath').textContent=text;
  syncPathStrip();
}
// Choosing a celebration on the Path fills in the setup form with its preset.
function prepareCelebration(celebration){
  if($('gameSetup').hidden)showSetup();
  $('gamePreset').value=celebration.preset;
  choosePreset(celebration.preset);
  syncPreset();
  window.SetupMenus?.showCelebration();
  $('gamePreset').closest('fieldset').scrollIntoView({block:'start',behavior:'smooth'});
  toast(celebration.name+' is ready: choose your role and press Start.');
}

// ---------- starting a game ----------
function gameScenarioOptions(){return game.options?scenarioRequest(game.options):{};}
function resetGameState(){
  game.gen=(game.gen||0)+1;
  closeDecision();
  clearMarkers();
  if(game.carrying)carry(null);
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
  congregation.forEach(person=>{person.figure.root.visible=!person.figure.root.userData.gfxHidden;});
  Object.assign(game,{phase:'setup',stops:[],active:null,lapse:null,duties:[],soundCues:[],lastElapsed:-1,walkers:{},overrides:{},
    facing:{},kneel:{},hidden:new Set(),placed:new Set(),hideProps:new Set(),checklist:[],seatIndex:-1,busy:false,mcPos:MC_HOME.slice(),board:createScoreboard(),autoCount:0,highlight:null,history:[],timerAllowance:0,emptyChurch:false,hintTarget:null,carrying:null});
  setDoors(true,true);
  GameAudio.stopTrack(.3);
  if($('mediaWarning'))$('mediaWarning').hidden=true;
  if(game.projection){game.projection.slideKey=null;showSlide(null);}
  resetGameView();
  $('gameLog').replaceChildren();
  $('gameChecklist').hidden=true;
  $('bookModal').hidden=true;
  $('rate').value='1';
  updateScore();
}
function startGame(config){
  if(typeof parishEditorOpen==='function'&&parishEditorOpen()){
    toast('Apply or cancel the parish draft before starting a game.',true);
    return;
  }
  $('gameSetup').hidden=true;
  $('summaryModal').hidden=true;
  GameAudio.setEnabled(config.sound);
  game.recordedAudio=config.recordedAudio;
  game.firstPersonChoice=config.firstPerson;
  $('speechEnabled').checked=config.sound&&config.recordedAudio;
  $('audioSource').value='static';
  resetSpeech();
  GameAudio.ensure();
  syncSoundButton();
  resetGameState();
  const {options,notes}=normaliseGameOptions(config.role,{...config.raw,level:config.level});
  Object.assign(game,{role:config.role,level:config.level,options,notes,seed:options.seed,questions:!GAME_LEVELS[config.level].watch});
  game.preset=presetForOptions(options,config.preset);
  game.cross=setCrossPlaces(options);
  setProjection(!!options.projector);
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
  hangVestments('rail');
  if(game.role!=='SAC')hangVestments('worn',['P','D','S'].filter(vestmentNeeded));
  scheduleStops();
  applyRoleUI();
  for(const note of notes)logLine(note,'note');
  logLine('Celebration: '+describeCelebration(),'note');
  syncLiturgicalRibbon(game.options);
  setCamera('player');
  setFirstPersonView(config.fpView);
  setFirstPerson(game.firstPersonChoice);
  runPreMass(game.gen);
  if(GAME_ROLES[game.role].start==='sacristy'&&!(game.role==='SAC'&&options.openChurch)&&!gameView.firstPerson){
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
function applyRoleUI(){
  const info=GAME_ROLES[game.role];
  $('gameBadge').textContent='You: '+gameRoleName(game.role,game.options)+' / '+GAME_LEVELS[game.level].name;
  $('gameRoleNote').textContent=(isDevotion()&&riteBlurb(game.role))||ROLE_BLURBS[game.role];
  $('roleCard').hidden=false;
  const picker=el('select',{id:'switchRole',title:'Take over another role from here on (between moments, during Mass)'});
  picker.setAttribute('aria-label','Switch to another role');
  picker.append(el('option',{value:'',textContent:'⇄ Switch role…'}));
  for(const role of switchableRoles(game.visible||new Set(),game.options))if(role!==game.role)picker.append(el('option',{value:role,textContent:gameRoleName(role,game.options)}));
  picker.onchange=()=>{const role=picker.value;picker.value='';if(role)switchRole(role);};
  $('roleCard').replaceChildren(rolePortrait(game.role),el('div',{},[el('small',{textContent:'You are playing'}),el('strong',{textContent:gameRoleName(game.role,game.options)}),el('small',{textContent:'Involvement: '+GAME_LEVELS[game.level].name}),picker]));
  syncSwitchRole();
  $('gameBookButton').hidden=!info.book;
  $('gameBookButton').textContent='Open the '+(bookName()||'book');
  game.book=info.sayRole?buildBook(info.sayRole):null;
}
function canSwitchRole(){return game.phase==='mass'&&!game.active&&!game.busy&&!game.lapse&&!Object.keys(game.walkers).length;}
function syncSwitchRole(){
  const picker=$('switchRole');
  if(!picker)return;
  const ok=canSwitchRole();
  if(picker.disabled===ok)picker.disabled=!ok;
}
// Hand the player's part back to the simulation and take over another minister from this moment on.
function switchRole(role){
  if(!canSwitchRole()||role===game.role||!GAME_ROLES[role])return;
  const oldRole=game.role,oldKey=GAME_ROLES[oldRole].actor||oldRole;
  if(game.labelled){
    const figure=game.labelled.figure;
    if(game.labelled.congregant){
      figure.root.remove(figure.label);
      const index=sceneLabels.indexOf(figure.label);
      if(index>=0)sceneLabels.splice(index,1);
      figure.label=null;
    }else relabel(figure,roleLabel(game.labelled.key));
    game.labelled=null;
  }
  // The extra figures stay in the church at their usual places; a parishioner stays seated.
  if(oldRole==='MC'){game.mcPos=MC_HOME.slice();}
  if(oldRole==='PEW')game.seatIndex=-1;
  void oldKey;
  game.role=role;
  if(role==='MC')game.overrides.MC=game.mcPos.slice();
  if(role==='SAC')game.overrides.SAC=SACRISTAN_SEAT.slice();
  if(role==='AV')game.overrides.AV=AV_DESK.slice();
  if(role==='PEW'){
    let best=-1;
    congregation.forEach((person,i)=>{if(!reservedPew(person.home)&&!person.figure.root.userData.gfxHidden&&person.figure.root.visible&&(best<0||distance(person.home,[395,560])<distance(congregation[best].home,[395,560])))best=i;});
    game.seatIndex=best;
  }
  setupPlayerFigure();
  if(role==='PEW'&&game.seatIndex>=0){
    relabel(figures.PEW,'Parishioner');
    const person=congregation[game.seatIndex];
    relabel(person.figure,'You: Parishioner');
    game.labelled={key:'PEW',figure:person.figure,congregant:true};
    figures.player=person.figure;
  }
  scheduleStops();
  game.stops=stopsFrom(game.stops,currentElapsed());
  game.history=[];
  applyRoleUI();
  logLine('You switch roles: from '+gameRoleName(oldRole,game.options)+' to '+gameRoleName(role,game.options)+'.','note');
  toast('You are now the '+gameRoleName(role,game.options)+'. Your duties continue from here.');
  if(cameraMode==='player'||gameView.firstPerson)setCamera('player');
}
// Mass, or a rite outside Mass such as Exposition (mass-rite-exposition.js).
const isDevotion=()=>isDevotionRite(game.options);
// Outside Mass the ministers read from the rite's book of prayers, not the Missal or Gospels.
const bookName=()=>isDevotion()&&GAME_ROLES[game.role].book?({baptism:'Rite of Baptism',funeral:'Order of Christian Funerals',corpus:'Holy Communion and Worship of the Eucharist outside Mass'}[game.options.rite]||'book of prayers for Exposition'):GAME_ROLES[game.role].book;
const riteWord=()=>isDevotion()?({baptism:'the Baptism',funeral:'the funeral',corpus:'the Corpus Christi procession'}[game.options.rite]||'Exposition'):'Mass';
function describeCelebration(){
  const o=game.options,parts=[];
  if(o.rite==='corpus'){
    return 'Corpus Christi Eucharistic procession after Mass, with '+o.serverCount+' server'+(o.serverCount===1?'':'s')+
      (o.incense?', including a thurifer':'')+'. Canopy, procession lights and stations follow local custom.';
  }
  if(isDevotion()&&o.rite==='funeral'){
    parts.push('Funeral liturgy outside Mass, with the '+(o.minister==='deacon'?'Deacon':'Priest'));
    parts.push(o.serverCount+' server'+(o.serverCount===1?'':'s')+(o.incense?', with incense':''));
    parts.push(o.music==='said'?'said':'sung');
    return parts.join(', ')+'.';
  }
  if(isDevotion()&&o.rite==='baptism'){
    parts.push('Baptism of children outside Mass, with the '+(o.minister==='deacon'?'Deacon':'Priest'));
    parts.push(o.serverCount+' server'+(o.serverCount===1?'':'s'));
    parts.push(o.music==='said'?'said':'sung');
    return parts.join(', ')+'.';
  }
  if(isDevotion()){
    parts.push(o.minister==='lay'?'adoration led by a lay minister, without the blessing':'Exposition and Benediction with the '+(o.minister==='deacon'?'Deacon':'Priest'));
    parts.push(o.serverCount+' server'+(o.serverCount===1?'':'s'));
    parts.push(o.incense?'incense':'no incense');
    return parts.join(', ')+'.';
  }
  parts.push(o.music==='sung'?'sung Mass':'said Mass');
  if(o.deacon)parts.push('Deacon');
  parts.push(o.serverCount+' server'+(o.serverCount===1?'':'s'));
  if(o.lector)parts.push('lector');
  parts.push(o.incense?'incense':'no incense');
  if(o.bothKinds)parts.push('Communion under both kinds');
  if(!o.gloria)parts.push('no Gloria');
  if(!o.creed)parts.push('no Creed');
  if(!o.secondReading)parts.push('one reading before the Gospel');
  if(o.baptism)parts.push('Baptism of children after the Homily');
  if(o.funeral)parts.push('Funeral Mass in violet, with the final commendation');
  parts.push(o.funeral?'reception of the body at the door (no Penitential Act)':o.baptism?'reception of the children at the door (no Penitential Act)':o.goodFriday?'Celebration of the Passion of the Lord (prostration, Passion of St John, Solemn Intercessions, Adoration of the Cross, Communion)':o.holyThursday?'Mass of the Lord\u2019s Supper (Mandatum, transfer to altar of repose, stripping of altar)':o.candlemas?'blessing of candles and procession (no Penitential Act)':o.ashWednesday?'blessing and giving of ashes (no Penitential Act)':o.palmSunday?'commemoration of the entrance and procession of palms (no Penitential Act)':{A:'Confiteor',C:'invocations',sprinkling:'sprinkling rite'}[o.introductory]);
  if(!o.goodFriday)parts.push('Eucharistic Prayer '+o.eucharisticPrayer);
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
const STOP_ORDER={lapse:0,cue:1,media:2,decision:3};
function stepTime(step,t){return stepStart[step]+t*STEPS[step].dur;}
function scheduleStops(){
  const stops=[];
  const detail=game.options.detail;
  game.mediaCues=deriveMediaCues(STEPS,stepStart,game.options,detail);
  if(game.role==='AV'){
    game.allDuties=[];
    game.duties=game.mediaCues.map(cue=>({...cue,t:(cue.time-stepStart[cue.step])/STEPS[cue.step].dur}));
    for(const cue of game.mediaCues)stops.push({time:cue.time,type:'media',cue});
  }else if(game.role==='MC'){
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
// A spoken line waits while a question at or before its start is still open (mass-speech.js).
function speechHeld(time){
  if(game.phase!=='mass')return false;
  const stop=nextStop();
  return !!stop&&stop.time<=time+1e-3;
}
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
    if(game.level==='timed'&&decision.timer)decision.timer+=game.timerAllowance;
    const active={decision,resolve,attempt:1,started:performance.now(),finished:false,gen:game.gen,lastTick:99};
    if(!game.questions){
      // Questions off: the duty is done for the player after a short pause, without scoring.
      active.timer=gameTimeout(()=>autoResolve(active),350);
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
  if(d.sideQuest)box.classList.add('sideQuest');
  document.body.classList.add('deciding');
  $('decisionRole').replaceChildren(iconNode(ROLE_ICONS[game.role]),(d.sideQuest?'Side quest / ':'You: ')+gameRoleName(game.role,game.options));
  $('decisionPortrait').replaceChildren(rolePortrait(game.role));
  $('decisionSkip').hidden=!d.sideQuest;
  $('decisionSkip').onclick=()=>skipSideQuest(active);
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
  if(d.input==='book'){
    const missalAt=objects.missal?.visible&&objects.missal.getWorldPosition(new THREE.Vector3());
    const near=missalAt&&figures.player&&missalAt.distanceTo(figures.player.root.position)<3.2;
    if(firstPersonActive()&&near){
      $('decisionHint').textContent='Look at the Missal in front of you and click it to read.';
      d.hintAfter=hintDelay(game.level);d.hintTarget={object:'missal'};
      d.hintText='Hint: the Missal is where the ring glows. Click it.';
      lookTowards(missalAt);
    }else openBook();
  }
  if(d.hintAfter===undefined&&d.kind==='place'&&d.input!=='book'){
    const at=d.target||d.options?.find(o=>o.correct)?.at||(d.places?.[0]&&placeById(d.places[0])?.at);
    if(at){d.hintAfter=hintDelay(game.level);d.hintTarget={point:at};}
  }
  scheduleHint(active);
  const first=list.querySelector('button');
  if(first&&d.input!=='book')first.focus({preventScroll:true});
}
// After a pause with no answer, a glowing ring shows where to go (or what to pick up).
function scheduleHint(active){
  const d=active.decision;
  if(d.hintAfter===undefined||!d.hintTarget)return;
  const show=()=>{
    if(game.active!==active||active.finished)return;
    game.hintTarget=d.hintTarget;
    setHighlight(null);
    $('decisionHint').textContent=d.hintText||'Hint: follow the glowing ring.';
    $('decision').classList.add('hinted');
  };
  if(d.hintAfter<=0)show();
  else active.hintTimer=gameTimeout(show,d.hintAfter*1000);
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
  if(game.level==='timed'&&result.timedOut)game.timerAllowance=nextTimerAllowance(game.timerAllowance,true);
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
  if(result.correct)active.timer=gameTimeout(done,isGuided(game.level)?450:900);
  else{
    $('decisionContinue').hidden=false;
    $('decisionContinue').onclick=done;
    $('decisionContinue').focus({preventScroll:true});
    if(game.level==='timed')active.timer=gameTimeout(done,4000);
  }
}
function skipSideQuest(active){
  if(game.active!==active||active.finished)return;
  active.finished=true;
  logLine('Side quest skipped: '+(active.decision.explain||active.decision.prompt),'auto');
  closeDecision();
  active.resolve({correct:false,skipped:true,attempt:1,remaining:0,raw:null,answer:'(skipped)'});
}
function closeDecision(){
  const active=game.active;
  if(active){clearGameTimeout(active.timer);clearGameTimeout(active.hintTimer);}
  game.active=null;
  game.hintTarget=null;
  $('decision').hidden=true;
  document.body.classList.remove('deciding');
  clearMarkers();
  setHighlight(null);
}
function autoResolve(active){
  if(active.finished||active.gen!==game.gen)return;
  active.finished=true;
  clearGameTimeout(active.timer);
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
  game.highlight=target||game.hintTarget||null;
  if(!game.highlight&&highlightMesh)highlightMesh.visible=false;
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
  else if(target.mesh)position=target.mesh.getWorldPosition(new THREE.Vector3());
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
  $('bookTitle').textContent=bookName();
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
    const at=task.target||d.options.find(o=>o.correct)?.at;
    if(at){d.hintAfter=hintDelay(level);d.hintTarget={point:at};}
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
  return actor?starts[0].pos[actor]:game.role==='MC'?MC_START:game.role==='AV'?AV_DESK:null;
};
function ministersOnStage(){return ['P','D','X','C1','C2','T','S','MB','CB',...(game.options.lectorProcession?['L']:[]),...(isDevotion()?['E']:[])].filter(r=>game.visible.has(r));}

// ---------- before Mass ----------
async function runPreMass(gen){
  game.phase='pre';
  const ministers=ministersOnStage();
  ministers.forEach((r,i)=>{game.overrides[r]=SACRISTY_SLOTS[i].slice();game.facing[r]=Math.PI;});
  if(game.role==='MC'){game.overrides.MC=SACRISTY_SLOTS[8].slice();game.facing.MC=Math.PI;}
  if(game.role==='SAC'){game.overrides.SAC=game.options.openChurch?SACRISTAN_ARRIVAL.slice():[1190,205];game.facing.SAC=Math.PI;}
  if(game.role==='PEW'){game.overrides.PEW=OUTSIDE.slice();game.facing.PEW=Math.PI;}
  if(game.role==='AV'){game.overrides.AV=[540,805];game.facing.AV=Math.PI;}
  else if(game.options.projector){game.overrides.AV=AV_DESK.slice();game.facing.AV=Math.PI;}
  for(const role of ['L','L2','U','E','K','SP'])if(game.visible.has(role)&&!ministers.includes(role)){
    game.overrides[role]=HOME[role].slice();game.facing[role]=Math.PI;
  }
  const npcWalk=()=>Promise.all(ministers.filter(r=>r!==GAME_ROLES[game.role].actor).map((r,i)=>wait(i*350).then(()=>walk(r,game.overrides[r],starts[0].pos[r]))));
  if(game.role==='SAC'){
    if(game.options.openChurch){
      setPhase('Before Mass: opening the church','You are the first to arrive. Let yourself in and open up.');
      await runOpening(gen);
      if(gen!==game.gen)return;
    }
    setPhase('Before Mass: preparing','Set out everything this celebration needs (GIRM 105, 117-118).'+(game.options.openChurch?' Take each thing from the cupboard in turn.':' The ministers are vesting in the sacristy.'));
    await runSacristanSetup(gen);
    game.emptyChurch=false;
    if(gen!==game.gen)return;
    const seat=game.options.bells.start?[1040,200]:SACRISTAN_SEAT;
    toast('Everything is ready. The ministers line up.');
    await Promise.all([npcWalk(),walk('SAC',game.overrides.SAC,seat)]);
  }else{
    const where=game.role==='PEW'?'You arrive outside the church.':game.role==='AV'?'You come in early to set up the screen at the back of the church.':['L','L2','U','E'].includes(game.role)&&!ministers.includes(game.role)?'You prepare your ministry and take your place with the congregation.':'You are in the sacristy with the other ministers.';
    setPhase('Before '+riteWord(),where);
    const tasks=isDevotion()?devotionPreTasks(game.role,game.options,roleStart()):preMassTasks(game.role,game.options,game.team,roleStart());
    let walking=null;
    if(game.role==='PEW'||game.role==='AV')walking=npcWalk();
    for(const task of tasks){
      const outcome=await ask(taskDecision(task,'Before '+riteWord()));
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
  // The bell rings once everyone has gathered at the entrance, just before the procession moves off.
  if(ringForProcession()){
    toast('🔔 The procession has gathered at the entrance: the bell rings.');
    logLine('The bell rings: the procession is ready to set out.','note');
    await wait(1600);
    if(gen!==game.gen)return;
  }
  beginMass();
}
// Rings the sacristy bell for the procession once (where that custom is chosen).
function ringForProcession(){
  const cue=game.options.bells.start&&game.soundCues.find(c=>c.type==='sacristyBell'&&!c.rung);
  if(!cue)return false;
  cue.rung=true;
  if(GameAudio.enabled)GameAudio.sacristyBell();
  triggerVisualChime(cue);
  return true;
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
  let best=-1;
  congregation.forEach((person,i)=>{if(!reservedPew(person.home)&&!person.figure.root.userData.gfxHidden&&(best<0||distance(person.home,point)<distance(congregation[best].home,point)))best=i;});
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
// Training opening: the church is empty and locked until the sacristan opens it.
async function runOpening(gen){
  game.emptyChurch=true;
  setDoors(false,true);
  setCamera('player');
  for(const task of sacristanOpening()){
    const outcome=await ask(taskDecision(task,'Before Mass: opening up'));
    if(gen!==game.gen)return;
    void outcome;
    if(task.id==='unlock'){
      await walk('SAC',game.overrides.SAC,[1262,150]);
      if(gen!==game.gen)return;
      GameAudio.unlock();
      toast('Click: the sacristy door is unlocked.');
      setDoors(true,false,['sacristy']);
      await wait(700);
    }else if(task.id==='enter'){
      await walk('SAC',game.overrides.SAC,[1150,150]);
    }else if(task.id==='lights'){
      toast('Lights on. The sanctuary lamp is burning.');
      await wait(600);
    }else if(task.id==='openMain'){
      await walk('SAC',game.overrides.SAC,[500,795]);
      if(gen!==game.gen)return;
      GameAudio.unlock();
      setDoors(true,false,['main']);
      toast('The main doors are open. People can start to arrive.');
      await wait(900);
    }
    if(gen!==game.gen)return;
  }
  // The others arrive only once the sacristan has set everything out (cleared in runPreMass).
}
// Small models of the things the sacristan takes out of the cupboard (judgement call: simple
// recognisable shapes, roughly to scale with the shelves rather than to the figures).
const GOLD='#c9a64a',SILVER='#b9bec4',LINEN='#f6f3ea',GLASS='#cfe3ea';
function miniModel(id){
  const g=new THREE.Group();
  const cup=(x,z,lid)=>{
    cylinder(g,x,.015,z,.05,.06,.03,GOLD,'gold');cylinder(g,x,.07,z,.012,.012,.09,GOLD,'gold');cylinder(g,x,.15,z,.055,.025,.08,GOLD,'gold');
    if(lid){finishSurface(sphere(g,x,.2,z,.05,GOLD),'gold').scale.y=.5;finishSurface(sphere(g,x,.235,z,.012,GOLD),'gold');}
  };
  const book=(colour,trim,thick=.045)=>{box(g,0,thick/2,0,.13,thick,.17,colour);box(g,.003,thick/2,0,.12,thick*.8,.165,'#efe6cc');box(g,0,thick+.002,0,.03,.004,.1,trim);box(g,0,thick+.002,-.01,.07,.004,.022,trim);};
  const candle=(x,z,h=.2)=>{cylinder(g,x,.015,z,.03,.04,.03,GOLD,'gold');cylinder(g,x,.03+h/2,z,.012,.012,h,'#fbf6e6');};
  const cruet=(x,z,colour)=>{cylinder(g,x,.06,z,.025,.035,.12,colour);cylinder(g,x,.14,z,.012,.018,.04,GLASS);};
  const cross=(h,staff)=>{
    if(staff){cylinder(g,0,.015,0,.04,.05,.03,'#6e5236','wood');cylinder(g,0,h/2,0,.008,.008,h,GOLD,'gold');}
    box(g,0,h+.06,0,.012,.13,.012,GOLD,true,'gold');box(g,0,h+.08,0,.08,.012,.012,GOLD,true,'gold');
  };
  const bell=(x,z,colour,r=.04)=>{cylinder(g,x,.03,z,r*.45,r,.06,colour,'gold');cylinder(g,x,.09,z,.008,.008,.07,'#6e5236','wood');};
  switch(id){
    case 'altarCloth':case 'corporal':
      for(let i=0;i<(id==='corporal'?1:3);i++)box(g,0,.01+i*.022,0,.15,.02,.15,LINEN);
      if(id==='corporal')box(g,0,.022,0,.02,.002,.06,'#b8202a');
      break;
    case 'altarCandles':candle(0,-.04);candle(0,.04);break;
    case 'procCandles':candle(0,-.04,.26);candle(0,.04,.26);break;
    case 'altarCross':cross(.12,true);break;
    case 'procCross':cross(.28,true);break;
    case 'gospels':case 'gospelsAltar':book('#9b1c2c',GOLD,.05);break;
    case 'lectionary':book('#2f5d3a',GOLD,.06);break;
    case 'missal':book('#5a2617','#e7c96a',.06);box(g,.04,.03,.09,.01,.002,.04,'#b8202a');break;
    case 'chalice':case 'chalice2':cup(0,0,false);box(g,0,.195,0,.1,.006,.1,LINEN);break;
    case 'ciborium':case 'emhcVessel':cup(0,0,true);break;
    case 'commPlate':cylinder(g,0,.01,0,.07,.07,.01,GOLD,'gold');box(g,0,.01,.09,.025,.008,.05,GOLD,true,'gold');break;
    case 'water':cruet(0,0,GLASS);break;
    case 'wine':cruet(0,0,'#7a1f2b');break;
    case 'lavabo':cylinder(g,0,.025,0,.08,.05,.05,SILVER,'silver');cylinder(g,0,.11,.03,.02,.035,.1,SILVER,'silver');box(g,0,.006,-.06,.09,.01,.05,LINEN);break;
    case 'collectionBasket':cylinder(g,0,.04,0,.08,.065,.08,'#9b7442');box(g,0,.02,.12,.02,.02,.1,'#6e5236');break;
    case 'aspersory':cylinder(g,0,.05,0,.055,.045,.1,SILVER,'silver');cylinder(g,.02,.15,0,.006,.006,.16,SILVER,'silver').rotation.z=.4;finishSurface(sphere(g,.05,.22,0,.018,SILVER),'silver');break;
    case 'thurible':
      finishSurface(sphere(g,0,.07,0,.05,SILVER),'silver').scale.y=.8;cylinder(g,0,.13,0,.012,.035,.05,SILVER,'silver');
      for(const x of [-.02,.02])cylinder(g,x,.21,0,.003,.003,.14,'#8a8f94','silver');
      finishSurface(sphere(g,0,.03,.1,.035,SILVER),'silver').scale.set(1,.6,1.6);break;
    case 'altarBell':for(const z of [-.04,0,.04])bell(0,z,GOLD,.03);break;
    case 'sacristyBell':bell(0,0,'#b08d3c',.05);break;
    case 'lamp':cylinder(g,0,.05,0,.04,.03,.1,'#b8202a');cylinder(g,0,.12,0,.005,.005,.06,GOLD);break;
    case 'hosts':box(g,0,.04,0,.12,.08,.1,'#d8c27a');sphere(g,0,.09,0,.02,GOLD);break;
    default:box(g,0,.07,0,.14,.14,.14,'#d8c27a');
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  return g;
}
function greyOut(model){
  model.traverse(o=>{
    if(!o.isMesh)return;
    delete o.userData.surfaceType;
    o.material=material('#8f8579');
  });
}
// Objects on the cupboard shelves; vestments instead hang on the rail.
function fillCupboard(items){
  const base=world([1205,190]);
  let slot=0;
  return items.map(item=>{
    if(VESTMENT_ITEMS[item.id])return game.vestments[VESTMENT_ITEMS[item.id]].mesh;
    const row=slot%4,col=Math.floor(slot/4);slot++;
    const model=miniModel(item.id);
    model.position.set(base.x-.12,.32+.52+row*.45,base.z-.62+col*.2);
    model.rotation.y=Math.PI/2;
    model.userData.item=item.id;
    scene.add(model);
    game.tokens.push(model);
    return model;
  });
}

// ---------- vestments: hanging rail and vesting stand ----------
// A sunburst monstrance: foot, stem with knop, rays round a glass luna. Faces -x (out of the cupboard).
function monstranceModel(){
  const g=new THREE.Group();
  cylinder(g,0,.012,0,.06,.075,.024,GOLD,'gold');
  cylinder(g,0,.11,0,.012,.018,.18,GOLD,'gold');
  cylinder(g,0,.12,0,.026,.026,.03,GOLD,'gold');
  const centre=.3;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.045,.01,6,20),material(GOLD));
  ring.position.set(0,centre,0);ring.rotation.y=Math.PI/2;g.add(ring);
  finishSurface(ring,'gold');
  const luna=new THREE.Mesh(new THREE.CircleGeometry(.04,16),material('#f4efe0'));
  luna.position.set(-.004,centre,0);luna.rotation.y=-Math.PI/2;g.add(luna);
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2,long=i%2?.07:.11;
    const ray=box(g,0,centre+Math.sin(a)*(.055+long/2),Math.cos(a)*(.055+long/2),.008,long,.012,GOLD,false,'gold');
    ray.rotation.x=-a+Math.PI/2;
  }
  box(g,0,centre+.18,0,.008,.05,.008,GOLD,false,'gold');
  box(g,0,centre+.19,0,.008,.008,.035,GOLD,false,'gold');
  g.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  return g;
}
const VESTMENT_ITEMS={vestP:'P',vestD:'D',vestS:'S'};
const VESTMENT_RAIL=[1085,250],VESTMENT_RAIL_FRONT=[1085,215],VESTING_STAND=[1040,95],VESTING_STAND_FRONT=[1050,130];
function vestmentModel(kind){
  const g=new THREE.Group();
  box(g,0,0,0,.42,.025,.025,'#6e5236',true,'wood');
  cylinder(g,0,.06,0,.008,.008,.1,SILVER,'silver');
  const alb=box(g,0,-.6,.02,.4,1.15,.04,LINEN);
  alb.userData.part='alb';
  if(kind!=='S'){
    // Chasuble (rounded, sleeveless) or dalmatic (squarer, with short sleeves) in the day's colour; the front faces -z.
    const outer=kind==='P'?cylinder(g,0,-.48,-.02,.2,.34,.9,'#2e6b3a'):box(g,0,-.45,-.02,.48,.84,.03,'#2e6b3a');
    if(kind==='P')outer.scale.z=.12;
    if(kind==='D')for(const side of [-1,1])box(g,side*.33,-.17,-.02,.2,.22,.03,'#2e6b3a').userData.part='outer';
    outer.userData.part='outer';
    box(g,0,-.12,-.05,.06,.3,.01,GOLD);
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  return g;
}
function buildVestments(){
  const rail=world(VESTMENT_RAIL);
  box(scene,rail.x,.32+1.95,rail.z,2.4,.04,.04,'#7d6040',true,'wood');
  for(const side of [-1,1])box(scene,rail.x+side*1.18,.32+1.0,rail.z,.05,1.95,.05,'#6e5236',true,'wood');
  const stand=world(VESTING_STAND);
  for(const side of [-1,1]){
    box(scene,stand.x+side*.75,.32+.85,stand.z,.05,1.7,.05,'#8a6a45',true,'wood');
    box(scene,stand.x+side*.75,.32+.02,stand.z,.05,.04,.5,'#8a6a45',true,'wood');
  }
  box(scene,stand.x,.32+1.65,stand.z,1.55,.05,.05,'#8a6a45',true,'wood');
  box(scene,stand.x,.32+.9,stand.z,1.55,.04,.04,'#8a6a45',true,'wood');
  scene.add(label('Vestments',world(VESTMENT_RAIL,2.7)));
  scene.add(label('Vesting stand',world(VESTING_STAND,2.3)));
  game.vestments={};
  ['P','D','S'].forEach((kind,i)=>{
    const mesh=vestmentModel(kind);
    game.vestments[kind]={mesh,rail:new THREE.Vector3(rail.x-.75+i*.75,.32+1.9,rail.z+.05),stand:new THREE.Vector3(stand.x-.5+i*.5,.32+1.62,stand.z)};
    scene.add(mesh);
  });
  hangVestments('rail');
}
// 'rail' (before setup and after pack-away), 'stand' (laid out), or 'worn' (hidden: the ministers are vested).
function hangVestments(where,kinds=['P','D','S']){
  if(!game.vestments)return;
  const colours={P:figures.P?.colour,D:figures.D?.colour};
  for(const kind of kinds){
    const v=game.vestments[kind];
    if(game.carrying===v.mesh){figures.SAC.root.remove(v.mesh);game.carrying=null;}
    if(v.mesh.parent!==scene)scene.add(v.mesh);
    v.mesh.visible=where!=='worn';
    v.mesh.scale.set(1,1,1);
    v.mesh.rotation.set(0,where==='stand'?Math.PI:0,0);
    if(where!=='worn')v.mesh.position.copy(v[where]);
    v.mesh.traverse(o=>{if(o.isMesh&&o.userData.part==='outer'&&colours[kind])o.material=material(colours[kind]);});
    v.where=where;
  }
}
function vestmentNeeded(kind){
  return kind==='P'||(kind==='D'&&game.options.deacon)||(kind==='S'&&game.team.length>0);
}
// The sacristan walks to the rail, takes the vestment and lays it out on the vesting stand.
async function layOutVestment(kind,gen,speed){
  const v=game.vestments[kind];
  await walk('SAC',game.overrides.SAC,VESTMENT_RAIL_FRONT,speed);
  if(gen!==game.gen)return;
  carry(v.mesh);
  await walk('SAC',game.overrides.SAC,VESTING_STAND_FRONT,speed);
  if(gen!==game.gen)return;
  hangVestments('stand',[kind]);
}
// After Mass: from the vesting stand back onto the rail.
async function hangUpVestments(gen){
  for(const kind of ['P','D','S']){
    const v=game.vestments[kind];
    if(v.where!=='stand')continue;
    await walk('SAC',game.overrides.SAC,VESTING_STAND_FRONT);
    if(gen!==game.gen)return;
    carry(v.mesh);
    await walk('SAC',game.overrides.SAC,VESTMENT_RAIL_FRONT);
    if(gen!==game.gen)return;
    hangVestments('rail',[kind]);
  }
}
function followSacristan(){
  if(game.role==='SAC'&&!firstPersonActive()&&cameraMode!=='player')setCamera('player');
}

async function runSacristanSetup(gen){
  const training=!!game.options.openChurch;
  const items=training?cupboardOrder(sacristanSetup(game.options,game.team)):sacristanSetup(game.options,game.team);
  game.checklist=items;
  setChecklist(items);
  for(const item of items)if(item.needed)for(const prop of PROP_FOR_ITEM[item.id]||[])game.hideProps.add(prop);
  const placeCount={};
  const shelf=training?fillCupboard(items):[];
  if(training){
    await walk('SAC',game.overrides.SAC,CUPBOARD);
    if(gen!==game.gen)return;
    game.facing.SAC=Math.PI/2;
    focusCameraOn(world([1180,190],1));
    toast('Everything is in the cupboard. Take one thing at a time.');
  }
  for(const [index,item] of items.entries()){
    const vest=VESTMENT_ITEMS[item.id];
    if(training&&!vest&&distance(game.overrides.SAC,CUPBOARD)>8){
      await walk('SAC',game.overrides.SAC,CUPBOARD,240);
      if(gen!==game.gen)return;
    }
    const decision=placeDecision(item);
    if(training){
      decision.prompt=(vest?'From the vestment rail: ':'From the cupboard: ')+item.name+'. Where does it go?';
      setHighlight({mesh:shelf[index]});
    }else setHighlight(vest?{mesh:game.vestments[vest].mesh}:null);
    const outcome=await ask(decision);
    if(gen!==game.gen)return;
    markChecklist(item.id,outcome.correct?'done':'missed');
    if(!item.needed){
      if(training&&!vest)greyOut(shelf[index]);
      continue;
    }
    followSacristan();
    if(vest){
      await layOutVestment(vest,gen,training?240:undefined);
      if(gen!==game.gen)return;
      continue;
    }
    const place=placeById(item.places[0]);
    const target=outcome.correct&&Array.isArray(outcome.raw)?outcome.raw:place.at;
    if(training)carry(shelf[index]);
    if(item.places[0]!=='sacristy'){
      await walk('SAC',game.overrides.SAC,[target[0],target[1]+(target[1]<300?28:0)],training?240:undefined);
      if(gen!==game.gen)return;
    }else if(training){
      await walk('SAC',game.overrides.SAC,[1150,95],240);
      if(gen!==game.gen)return;
    }
    if(training)carry(null);
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
    hint:level==='expert'?'Click where it belongs in the church or sacristy, or press "'+NOT_NEEDED+'".':undefined,
    hintAfter:hintDelay(level),hintTarget:item.needed?{point:right.at}:null};
}
// The item being carried rides in the sacristan's hands; null puts it down (it becomes the real prop).
function carry(mesh){
  if(game.carrying){
    figures.SAC.root.remove(game.carrying);
    game.carrying.visible=false;
  }
  game.carrying=mesh||null;
  if(mesh){
    const scale=figures.SAC.root.scale.x||1;
    mesh.position.set(0,1.15/scale,.35/scale);
    figures.SAC.root.add(mesh);
  }
}
const PACK_PROPS={booksBack:['missal','gospels'],vessels:['chalice','bread'],cruets:['ewer','wine'],procBack:['cross','cand1','cand2'],thuribleOut:['thurible'],bellBack:['bell']};
// What a pack-away question is about: the object itself if it is still in the church, else its place.
const PACK_FOCUS={linens:'corporal',pourAway:'chalice',charcoalBin:'thurible',hostsAway:'ciborium'};
function packFocus(item){
  for(const name of [PACK_FOCUS[item.id],...(PACK_PROPS[item.id]||[])]){
    const object=name&&objects[name];
    if(object?.visible&&!game.hideProps.has(name))return {target:{object:name},position:object.position.clone()};
  }
  const place=placeById(item.places[0]);
  return place?{target:{point:place.at},position:world(place.at,1)}:null;
}
async function runPackAway(gen){
  const items=sacristanPackAway(game.options,game.team);
  game.checklist=items;
  setChecklist(items);
  setPhase('After Mass: putting away','The ministers have gone. Put everything away (GIRM 105).');
  // The ministers have taken off their vestments and left them on the vesting stand.
  hangVestments('stand',['P','D','S'].filter(vestmentNeeded));
  followSacristan();
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
    followSacristan();
    await walk('SAC',game.overrides.SAC,SACRISTY);
    if(gen!==game.gen)return;
    if((outcome.raw||[]).includes?.('vestments'))await hangUpVestments(gen);
    return;
  }
  for(const item of items){
    const focus=packFocus(item);
    if(focus){
      focusCameraOn(focus.position);
      game.hintTarget=focus.target;
      setHighlight(null);
    }
    const correct=item.needed?'Do it now':'Leave it';
    let options=[{label:'Do it now',correct:item.needed},{label:'Leave it',correct:!item.needed}];
    if(isGuided(game.level))options=options.filter(o=>o.correct);
    const outcome=await ask({id:'pack:'+item.id,kind:'task',stage:'After Mass: sacristan',title:item.name,prompt:item.name+'?',correct,options,ref:item.ref,explain:item.reason||'',
      level:game.level,attempts:1,timer:decisionTimer(game.level,'task'),input:'options',hintAfter:0,hintTarget:focus?.target,hintText:'The glowing ring shows what this is about.'});
    if(gen!==game.gen)return;
    markChecklist(item.id,outcome.correct?'done':'missed');
    if(item.needed){
      followSacristan();
      if(item.id==='vestments'){await hangUpVestments(gen);continue;}
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
  if(game.carrying)carry(null);
  game.emptyChurch=false;
  for(const token of game.tokens)disposeSprite(token);
  game.tokens=[];
  game.hideProps.clear();
  hangVestments('worn',['P','D','S'].filter(vestmentNeeded));
  $('gameChecklist').hidden=true;
  game.phase='mass';
  game.lastElapsed=-1;
  if(game.role==='MC')game.mcPos=MC_START.slice();
  const notes={
    MC:'Watch every minister. Cue each one at the right moment, and catch anyone who stalls.',
    SAC:'During Mass the sacristan stays ready at the back. Speed up the clock if you wish; pack-away follows.',
    PEW:isDevotion()?'Pray before the Blessed Sacrament: postures, responses and hymns.':'Follow the Mass: postures, responses and acclamations.'
  };
  setPhase(isDevotion()?RITES[game.options.rite].name:'Holy Mass',notes[game.role]||'Your decisions appear at each of your duties. Watch the other ministers too.');
  if(game.role==='SAC'){$('rate').value='3';$('rate').dispatchEvent(new Event('change'));toast('Speed set to 3x: there is little for the sacristan to do during Mass.');}
  if(game.role==='MC'||game.role==='SAC')setCamera('action');
  setPlaying(true);
}
async function runStop(stop){
  game.busy=true;
  const gen=game.gen;
  const snapshot={stop,board:JSON.parse(JSON.stringify(game.board)),autoCount:game.autoCount,timerAllowance:game.timerAllowance,logLen:$('gameLog').children.length};
  const bell=preProcessionBell(game.soundCues,stop.time,stepStart[1]);
  // The sacristy bell signals the start of the procession, so it sounds as this question opens.
  if(bell)ringForProcession();
  if(stop.type==='decision'){
    const d=buildDecision(stop.duty,game.level,game.seed,game.allDuties);
    if(stop.duty.type==='move')d.explain='You go to '+placeFor(stop.duty.to,GAME_ROLES[game.role].actor).name+'.';
    const outcome=await ask(d);
    if(gen===game.gen&&stop.duty.type==='homily'){
      const value=outcome.correct?outcome.raw:AMBO;
      chooseHomilyPlace(Array.isArray(value)?value:value==="the celebrant's chair"?CHAIR:AMBO);
    }
  }else if(stop.type==='cue'){
    const d=cueDecision(stop.cue,game.level,game.visible,game.seed);
    d.explain=stop.cue.correctRoles.map(r=>ROLE_NAMES[r]).join(' / ')+': '+stop.cue.text+'.';
    const outcome=await ask(d);
    if(gen===game.gen&&outcome.correct)toast('You cue the '+roleLabel(stop.cue.correctRoles[0]).toLowerCase()+'.');
  }else if(stop.type==='media'){
    await mediaStop(stop.cue,gen);
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
  game.timerAllowance=entry.timerAllowance??0;
  const log=$('gameLog');
  while(log.children.length>entry.logLen)log.firstElementChild.remove();
  const index=game.stops.indexOf(entry.stop);
  game.stops.forEach((stop,i)=>{if(i>=index)stop.done=false;});
  let step=0;
  while(step<STEPS.length-1&&stepStart[step+1]<=entry.stop.time)step++;
  jump(step,Math.min(1,(entry.stop.time-stepStart[step])/STEPS[step].dur));
  game.lastElapsed=entry.stop.time-1e-6;
  rewindCues(game.soundCues,entry.stop.time);
  GameAudio.stopTrack(.4);
  if(game.projection)game.projection.slideKey=null;
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
  if(game.level==='timed'||game.level==='expert')d.prompt='The celebration has stalled. Who needs a discreet reminder? Due now: '+lapse.expected+'.';
  if(game.level==='expert')d.hint='Click the minister who has missed their duty.';
  d.stage=STEPS[cur3d].part+' / something is wrong';
  d.sideQuest=true;
  const outcome=await ask(d);
  if(gen!==game.gen)return;
  game.lapse=null;
  if(outcome.skipped){toast('Left alone, the '+who.toLowerCase()+' notices and carries on.',false,2200);return;}
  toast(outcome.correct?'A quiet word: the '+who.toLowerCase()+' carries on.':'The '+who.toLowerCase()+' realises and carries on, a little late.',!outcome.correct);
}

// ---------- screen operator: projection screen, slides and backing tracks ----------
const SCREEN_AT=[925,330],SLIDE_W=512,SLIDE_H=288;
function buildProjection(){
  const group=new THREE.Group();
  const at=world(SCREEN_AT);
  group.position.set(at.x,0,at.z);
  group.rotation.y=-.45;
  for(const side of [-1,1])box(group,side*1.25,1.6,-.05,.05,3.2,.05,'#3b3b3b');
  box(group,0,3.48,-.05,2.62,.08,.08,'#3b3b3b');
  box(group,0,2.7,-.03,2.56,1.5,.02,'#202020',false);
  const canvas=document.createElement('canvas');
  canvas.width=SLIDE_W;canvas.height=SLIDE_H;
  const texture=new THREE.CanvasTexture(canvas);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(2.46,1.38),new THREE.MeshBasicMaterial({map:texture}));
  face.position.set(0,2.7,-.01);
  group.add(face);
  group.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  scene.add(group);
  anchorParishObject(group,SCREEN_AT);
  const desk=new THREE.Group(),d=world(AV_DESK);
  desk.position.set(d.x,0,d.z-.45);
  box(desk,0,.72,0,1.3,.05,.6,'#6e5236',true,'wood');
  for(const x of [-.6,.6])for(const z of [-.25,.25])box(desk,x,.36,z,.05,.72,.05,'#5a4330',true,'wood');
  box(desk,.15,.76,.08,.42,.02,.28,'#2b2b2b');
  const lid=box(desk,.15,.9,-.07,.42,.28,.02,'#2b2b2b');
  lid.rotation.x=.25;
  box(desk,-.35,.76,0,.3,.03,.2,'#444');
  desk.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  scene.add(desk);
  anchorParishObject(desk,AV_DESK);
  game.projection={group,desk,canvas,texture,slideKey:null};
  drawSlide(null);
  setProjection(false);
}
function setProjection(on){
  if(!game.projection)return;
  game.projection.group.visible=on;
  game.projection.desk.visible=on;
}
// Slides show the part's title and how it is sung; the words themselves are only indicated (illustrative).
function drawSlide(cue){
  const p=game.projection;
  if(!p)return;
  const g=p.canvas.getContext('2d');
  const grad=g.createLinearGradient(0,0,0,SLIDE_H);
  grad.addColorStop(0,'#1d2c4f');grad.addColorStop(1,'#0e1528');
  g.fillStyle=grad;g.fillRect(0,0,SLIDE_W,SLIDE_H);
  g.textAlign='center';g.fillStyle='#f6efd9';
  if(!cue||cue.action==='stop'){
    g.font='bold 34px Georgia, serif';
    g.fillText('✠',SLIDE_W/2,110);
    g.font='26px Georgia, serif';
    g.fillText(cue?'':'Welcome',SLIDE_W/2,165);
  }else{
    g.font='bold 30px Georgia, serif';
    g.fillText(cue.title,SLIDE_W/2,70,SLIDE_W-30);
    g.font='italic 19px Georgia, serif';
    g.fillStyle='#e7c46a';
    g.fillText({track:'♪ With music: please sing',acapella:'♪ Sung unaccompanied',slide:'All say:'}[cue.mode]||'',SLIDE_W/2,108);
    g.fillStyle='rgba(246,239,217,.55)';
    for(let i=0;i<4;i++)g.fillRect(70+(i%2)*30,140+i*28,SLIDE_W-140-(i%2)*60,10);
    g.font='13px sans-serif';g.fillStyle='rgba(246,239,217,.6)';
    g.fillText('(the words would appear here)',SLIDE_W/2,268);
  }
  p.texture.needsUpdate=true;
}
function showSlide(cue){
  const p=game.projection;
  const key=cue?cue.id:'blank';
  if(!p||p.slideKey===key)return;
  p.slideKey=key;
  drawSlide(cue);
}
// With a simulated operator, slides change by themselves at the right moments.
function updateAutoSlides(elapsed){
  if(!game.options?.projector||game.role==='AV'||!game.mediaCues)return;
  let last=null;
  for(const cue of game.mediaCues)if(cue.time<=elapsed+1e-6)last=cue;
  showSlide(last);
}
// The warning bar fills as the next part approaches.
function updateMediaWarning(elapsed){
  const bar=$('mediaWarning');
  if(!bar)return;
  const stop=game.role==='AV'&&game.phase==='mass'?game.stops.find(s=>!s.done&&s.type==='media'):null;
  const lead=stop?stop.time-elapsed:Infinity;
  const show=!!stop&&lead<=MEDIA_WARNING&&lead>-1;
  if(bar.hidden===show)bar.hidden=!show;
  if(!show)return;
  const fraction=Math.max(0,Math.min(1,1-lead/MEDIA_WARNING));
  bar.querySelector('.fill').style.width=(fraction*100).toFixed(1)+'%';
  const text=(stop.cue.action==='stop'?'Ending soon: ':'Coming up: ')+stop.cue.title;
  const label=bar.querySelector('.label');
  if(label.textContent!==text)label.textContent=text;
}
async function mediaStop(cue,gen){
  const d=mediaDecision(cue,game.level,game.seed,game.mediaCues);
  d.stage=STEPS[cue.step].part+' / screen and music';
  const outcome=await ask(d);
  if(gen!==game.gen)return;
  // The right thing happens either way; a wrong or late answer just means it starts late.
  if(cue.action==='stop'){
    GameAudio.stopTrack(1.5);
    showSlide({...cue});
  }else{
    showSlide(cue);
    if(cue.mode==='track')GameAudio.startTrack(cue.part);
    else GameAudio.stopTrack(.6);
  }
  if(!outcome.correct&&!outcome.auto&&!outcome.skipped)toast(cue.action==='stop'?'The music fades, a little late.':'The '+cue.title+' starts, a little late.',true,1800);
}

// ---------- after Mass ----------
async function startPost(){
  if(game.phase!=='mass')return;
  game.phase='post';
  setPlaying(false);
  GameAudio.stopTrack(3);
  const gen=game.gen;
  const actor=GAME_ROLES[game.role].actor;
  setPhase('After '+riteWord(),game.role==='PEW'?'The ministers have gone out.':'The ministers return to the sacristy.');
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
    for(const task of isDevotion()?devotionPostTasks(game.role,game.options):postMassTasks(game.role,game.options)){
      const outcome=await ask(taskDecision(task,'After '+riteWord()));
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
  GameAudio.stopTrack(2);
  const board=game.board,grade=gradeBoard(board);
  const watched=board.decisions===0;
  $('summaryScore').textContent=board.points+' points of '+board.possible+' ('+grade.percent+'%). '+board.correct+' of '+board.decisions+' right, '+board.firstTry+' first time'+(board.timeouts?', '+board.timeouts+' timed out':'')+(board.lapsesCaught+board.lapsesMissed?'. Lapses caught: '+board.lapsesCaught+' of '+(board.lapsesCaught+board.lapsesMissed):'')+'.';
  $('summaryVerdict').textContent=grade.verdict;
  if(watched){
    $('summaryScore').textContent='Watched from start to finish: '+game.autoCount+' duties were done for you, so there is no score.';
    $('summaryVerdict').textContent='Choose another involvement (Guided or harder) to be asked questions.';
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
  showPathResult(watched,grade.percent);
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
  if(PracticeRoom.isOpen()){PracticeRoom.frame();return;}
  if(!game||game.phase==='setup')return;
  const now=performance.now()/1000;
  updateWalkers(dt);
  if(game.phase==='mass'){
    const key=STEPS[cur3d].key;
    if(game.role==='MC'){
      const target=key<=0||key===40?[positions.P[0]+38,positions.P[1]-12]:MC_HOME;
      if(!tweenTowards('MC',target,dt*(playing3d?1:0),key<=0||key===40?400:190))game.facing.MC=0;
      game.mcPos=game.overrides.MC.slice();
    }
    if(game.role==='SAC'){
      const target=game.options.bells.start&&key===0&&progress3d<.3?[1040,200]:SACRISTAN_SEAT;
      if(!game.walkers.SAC)tweenTowards('SAC',target,dt*(playing3d?1:0));
      game.facing.SAC=Math.PI;
    }
    if(game.overrides.AV&&!game.walkers.AV){
      const a=layoutPoint(game.overrides.AV),b=layoutPoint([500,170]);
      game.facing.AV=Math.atan2(b[0]-a[0],b[1]-a[1]);
    }
  }
  for(const key of Object.keys(EXTRA_FIGURES))if(!game.overrides[key])figures[key].root.visible=false;
  for(const [key,p] of Object.entries(game.overrides)){
    if(!figures[key])continue;
    const base=positions[key];
    placeFigure(key,p,now);
    if(game.phase==='mass'&&(key==='MC'||key==='SAC'||key==='AV')&&!game.walkers[key]){
      const posture=postureAt(cur3d,progress3d).name;
      const atRest=distance(p,{MC:MC_HOME,SAC:SACRISTAN_SEAT,AV:AV_DESK}[key])<6;
      // The screen operator stays standing at the desk, ready to change slides, but kneels with everyone.
      pose(figures[key],posture==='kneel'?'kneel':posture==='sit'&&atRest&&key!=='AV'?'sit':'stand','',now,false);
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
  if(game.emptyChurch){
    for(const person of congregation)person.figure.root.visible=false;
    for(const key of Object.keys(ACTORS))if(figures[key])figures[key].root.visible=false;
  }
  updateDoors(dt);
  for(const name of game.hideProps)if(objects[name])objects[name].visible=false;
  if(game.lapse&&figures[game.lapse.role]){
    const figure=figures[game.lapse.role];
    if(game.lapse.kind==='wrong')pose(figure,'sit','',now,false);
    else{figure.root.rotation.y+=2.3;figure.torso.rotation.x=-.15;}
  }
  updateDecisionTimer();
  updateHighlight(now);
  syncSwitchRole();
  if(game.phase==='mass'){
    const elapsed=currentElapsed();
    updateAutoSlides(elapsed);
    updateMediaWarning(elapsed);
    if(game.options)for(const cue of game.soundCues){
      if(cue.time>game.lastElapsed&&cue.time<=elapsed+1e-6&&!cue.rung){
        if(cue.type==='sacristyBell')cue.rung=true;
        const rate=Number($('rate').value)||1;
        if(GameAudio.enabled){
          if(cue.type==='bell')GameAudio.altarBell(Math.max(.8,Math.min(3,(cue.until-cue.time)/rate)));
          else if(cue.type==='sacristyBell')GameAudio.sacristyBell();
          else if(cue.type==='silence')GameAudio.silence();
          else GameAudio.thurible(cue.swings,Math.max(.35,.9/Math.sqrt(rate)));
        }
        triggerVisualChime(cue);
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
  if(PracticeRoom.isOpen())return true;
  const active=game.active;
  if(!active||active.finished)return false;
  const d=active.decision;
  if(game.markers.length){
    const hit=raycaster.intersectObjects(game.markers,false)[0];
    if(hit){answer(hit.object.userData.answer);return true;}
  }
  if(d.input==='book'&&objects.missal?.visible&&raycaster.intersectObject(objects.missal,true).length){openBook();return true;}
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
  const on=GameAudio.enabled,button=$('gameSound');
  button.textContent=on?'🔊':'🔇';
  button.setAttribute('aria-pressed',String(on));
  button.setAttribute('aria-label',on?'Sound on':'Sound off');
  button.title=on?'Sound on (click to mute)':'Sound off (click to unmute)';
}
function showSetup(){
  const inGame=game.phase&&game.phase!=='setup'&&game.phase!=='summary'&&!!game.role;
  game.resumePlaying=inGame&&playing3d;
  game.resumeSummary=game.phase==='summary';
  setPlaying(false);
  $('summaryModal').hidden=true;
  $('cancelSetup').hidden=!(inGame||game.resumeSummary);
  $('gameSetup').hidden=false;
  previewNotes();showHighScores();syncPathStrip();
}
// Close the setup sheet without starting a new game: carry on where you were.
function cancelSetup(){
  if($('gameSetup').hidden||$('cancelSetup').hidden)return;
  $('gameSetup').hidden=true;
  if(game.resumeSummary&&game.phase==='summary'){$('summaryModal').hidden=false;return;}
  if(game.resumePlaying&&game.phase==='mass'&&!game.active)setPlaying(true);
}
function initialiseGame(){
  if(!scene)return;
  buildGameScene();
  buildSetupForm();
  initialiseGameView();
  initialiseGameUi();
  PracticeRoom.initialise();
  $('liturgicalRibbon').onclick=()=>openBreviary();
  $('liturgicalRibbon').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openBreviary();}};
  $('brevClose').onclick=closeBreviary;
  $('brevDone').onclick=closeBreviary;
  $('gameBookButton').onclick=()=>openBook();
  $('gameSound').onclick=()=>{
    GameAudio.setEnabled(!GameAudio.enabled);
    $('speechEnabled').checked=GameAudio.enabled&&game.recordedAudio!==false;
    if(!GameAudio.enabled)resetSpeech();
    else GameAudio.ensure();
    syncSoundButton();
  };
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
  $('summaryPathButton').onclick=()=>PathView.open();
  $('timeline').disabled=false;
  $('timeline').oninput=()=>{
    const stop=game.phase==='mass'?nextQuestionStop(game.stops,currentElapsed(),Number($('timeline').value)/10000*TOTAL):null;
    if(!stop||game.busy){toast('Answer or continue the current question before skipping forward.');return;}
    let step=0;
    while(step<STEPS.length-1&&stepStart[step+1]<=stop.time)step++;
    jump(step,(stop.time-stepStart[step])/STEPS[step].dur);
    game.lastElapsed=stop.time-1e-6;
    setPlaying(true);
    toast('Skipped ahead to your next question; intervening time is not scored.');
  };
  const slider=$('speedSlider');
  slider.oninput=()=>{
    const rate=$('rate');
    if(![...rate.options].some(option=>option.value===slider.value))rate.add(el('option',{value:slider.value,textContent:slider.value+'x'}));
    rate.value=slider.value;
    $('speedValue').textContent=slider.value+'x';
  };
  $('rate').addEventListener('change',()=>{slider.value=$('rate').value;$('speedValue').textContent=$('rate').value+'x';});
  $('play3d').addEventListener('click',event=>{
    if(game.phase!=='mass'){event.stopImmediatePropagation();toast(game.phase==='setup'?'Choose a role first.':'The clock starts when Mass begins.');}
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&PathView.isOpen()){PathView.close();event.preventDefault();return;}
    if(event.key==='Escape'&&!$('breviaryModal').hidden){closeBreviary();event.preventDefault();return;}
    if(event.key==='Escape'&&!$('bookModal').hidden){$('bookModal').hidden=true;event.preventDefault();return;}
    if(event.key==='Escape'&&!$('gameSetup').hidden&&!$('cancelSetup').hidden){cancelSetup();event.preventDefault();return;}
    if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
    if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.stopImmediatePropagation();event.preventDefault();return;}
    if(event.code==='Space'&&game.phase!=='mass'){event.stopImmediatePropagation();event.preventDefault();return;}
    if(event.key==='v'||event.key==='V'){
      if(!$('gameSetup').hidden||!$('bookModal').hidden)return;
      event.preventDefault();
      cameraNudge('view');
      return;
    }
    if(event.key==='s'||event.key==='S'){
      if(!$('gameSetup').hidden||!$('bookModal').hidden)return;
      event.preventDefault();
      if(game.active&&!game.active.finished&&game.active.decision.sideQuest)skipSideQuest(game.active);
      else skipCurrent();
      return;
    }
    if(game.active&&/^[1-9]$/.test(event.key)&&$('bookModal').hidden&&$('gameSetup').hidden){
      const button=$('decisionOptions').querySelectorAll('button')[Number(event.key)-1];
      if(button&&!button.disabled){event.preventDefault();button.click();}
    }
  },true);
  setPhase('Choose your role','Pick a role, your involvement and the kind of celebration, then press Start.');
}
initialiseGame();
