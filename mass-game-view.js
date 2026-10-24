'use strict';
// View helpers for the game page: on-screen camera pad, a brief first-person view while the
// player's role speaks, a highlight mode that fades everything except what is happening now,
// and skipping the line or action in progress. Loaded before mass-game.js.

const gameView={firstPerson:false,yaw:0,pitch:-.18,fov:null,drag:null,highlightOn:true,speaker:null,spokenDone:new Set(),dim:null,boost:null,lit:new Set(),lastProps:new Map()};

function setCameraHint(text){
  const hint=$('hint');
  if(hint&&hint.textContent!==text)hint.textContent=text;
}

// ---------- camera pad ----------
function cameraNudge(action){
  if(!camera3d||!controls)return;
  if(action==='view'){
    if(firstPersonActive()){cycleFirstPersonView();return;}
    // Outside first person, step through the fixed cameras of the camera menu.
    if(gameView.speaker)endSpeakerView();
    const choices=[...$('camera').options].map(o=>o.value);
    const next=choices[(choices.indexOf(cameraMode)+1)%choices.length];
    setCamera(next);
    toast('Camera: '+$('camera').selectedOptions[0].textContent+'.',false,1200);
    return;
  }
  if(firstPersonActive()){
    // In first person the pad turns the head and zooms the eye instead of moving an orbit camera.
    const turn={left:.26,right:-.26,panLeft:.26,panRight:-.26}[action];
    if(turn)gameView.yaw+=turn;
    if(action==='up'||action==='panForward')gameView.pitch=Math.min(.6,gameView.pitch+.17);
    if(action==='down'||action==='panBack')gameView.pitch=Math.max(-1.2,gameView.pitch-.17);
    if(action==='in'||action==='out'){
      camera3d.fov=Math.max(20,Math.min(80,camera3d.fov*(action==='in'?.8:1.25)));
      camera3d.updateProjectionMatrix();
    }
    return;
  }
  if(gameView.speaker){
    const turn={left:.26,right:-.26,panLeft:.26,panRight:-.26}[action];
    if(turn)gameView.speaker.yaw+=turn;
    if(action==='up'||action==='panForward')gameView.speaker.pitch=Math.min(.6,gameView.speaker.pitch+.17);
    if(action==='down'||action==='panBack')gameView.speaker.pitch=Math.max(-1.2,gameView.speaker.pitch-.17);
    if(action==='in'||action==='out'){
      camera3d.fov=Math.max(20,Math.min(80,camera3d.fov*(action==='in'?.8:1.25)));
      camera3d.updateProjectionMatrix();
    }
    return;
  }
  if(gameView.speaker)endSpeakerView();
  if(cameraMode==='action'){
    // The automatic camera would undo the change at once, so stay where the user moved it.
    cameraMode='free';
    followPosition=null;
  }
  const offset=camera3d.position.clone().sub(controls.target);
  const up=new THREE.Vector3(0,1,0);
  if(action==='in'||action==='out'){
    const distance=offset.length();
    const next=Math.max(1.2,Math.min(60,distance*(action==='in'?.8:1.25)));
    offset.setLength(next);
  }else if(action==='left'||action==='right'){
    offset.applyAxisAngle(up,(action==='left'?-1:1)*Math.PI/12);
  }else if(action==='up'||action==='down'){
    const right=new THREE.Vector3().crossVectors(up,offset).normalize();
    const turned=offset.clone().applyAxisAngle(right,(action==='up'?-1:1)*Math.PI/18);
    const elevation=Math.asin(turned.clone().normalize().y);
    if(elevation>.05&&elevation<1.5)offset.copy(turned);
  }else{
    const forward=offset.clone().negate().setY(0).normalize();
    const right=new THREE.Vector3().crossVectors(forward,up).normalize();
    const step=Math.max(.6,offset.length()*.12);
    const move={panLeft:right.clone().multiplyScalar(-step),panRight:right.clone().multiplyScalar(step),
      panForward:forward.clone().multiplyScalar(step),panBack:forward.clone().multiplyScalar(-step)}[action];
    if(!move)return;
    controls.target.add(move);
    if(followPosition)followPosition.add(move);
  }
  camera3d.position.copy(controls.target).add(offset);
  controls.update();
}

// Glides the camera to look at a point in the church (world coordinates), e.g. the object a
// sacristan question is about. The automatic camera is paused so it stays there.
function focusCameraOn(point,distance=5.5){
  if(!camera3d||!controls||!point)return;
  if(firstPersonActive()){lookTowards(point);return;}
  if(gameView.speaker)endSpeakerView();
  const offset=camera3d.position.clone().sub(controls.target).setY(0);
  if(offset.lengthSq()<.01)offset.set(0,0,1);
  offset.setLength(distance*.8).setY(distance*.6);
  gameView.tween={fromPosition:camera3d.position.clone(),fromTarget:controls.target.clone(),
    toPosition:point.clone().add(offset),toTarget:point.clone(),started:performance.now(),duration:900};
  cameraMode='free';
  followPosition=null;
}
function updateCameraTween(){
  const tween=gameView.tween;
  if(!tween)return;
  const u=Math.min(1,(performance.now()-tween.started)/tween.duration),e=u*u*(3-2*u);
  camera3d.position.lerpVectors(tween.fromPosition,tween.toPosition,e);
  controls.target.lerpVectors(tween.fromTarget,tween.toTarget,e);
  camera3d.lookAt(controls.target);
  if(u>=1){gameView.tween=null;controls.update();}
}

// ---------- first-person mode ----------
// The camera follows the player and turns with them; drag (or the pad) to look around.
// Views: just above and behind the shoulder (default), through the eyes (own head hidden),
// or high behind. Walls pull the camera in, and people in the way are faded.
const FP_VIEWS={shoulder:{name:'Over the shoulder',back:1.1,up:.7,side:.6},eyes:{name:'Through the eyes',back:0,up:0,side:0},high:{name:'High behind',back:3.2,up:1.9,side:0}};
gameView.fpView='shoulder';
gameView.faded=new Set();
function firstPersonActive(){
  return gameView.firstPerson&&typeof game!=='undefined'&&game.phase!=='setup'&&game.phase!=='summary'&&figures.player?.root.visible;
}
function eyeOf(root){
  root.updateMatrixWorld();
  return root.localToWorld(new THREE.Vector3(0,1.6,.2));
}
function lookTowards(point){
  const root=figures.player.root,eye=eyeOf(root);
  const dx=point.x-eye.x,dz=point.z-eye.z;
  gameView.yaw=Math.atan2(dx,dz)-root.rotation.y;
  gameView.pitch=Math.max(-1.2,Math.min(.6,Math.atan2(point.y-eye.y,Math.hypot(dx,dz))));
}
function setFirstPersonView(view){
  gameView.fpView=FP_VIEWS[view]?view:'shoulder';
  if($('fpView'))$('fpView').value=gameView.fpView;
  updateOwnHead();
}
function cycleFirstPersonView(){
  const keys=Object.keys(FP_VIEWS);
  setFirstPersonView(keys[(keys.indexOf(gameView.fpView)+1)%keys.length]);
  toast('View: '+FP_VIEWS[gameView.fpView].name+'.',false,1200);
}
// The player's own head and body block the view from the eyes, so they are hidden then
// (also when a wall has pulled the camera right up to the head).
function updateOwnHead(){
  const hide=firstPersonActive()&&(gameView.fpView==='eyes'||gameView.closeUp);
  for(const figure of [...Object.values(figures),...congregation.map(p=>p.figure)]){
    if(!figure?.head)continue;
    const mine=hide&&figure===figures.player;
    figure.head.visible=!mine;
    if(figure.body)figure.body.visible=!mine;
  }
  // Name tags (the player's own, or furniture right beside the camera) would float in front of the view.
  const on=!!$('labels')?.checked,fp=firstPersonActive(),own=figures.player?.label;
  for(const sprite of sceneLabels){
    if(!on||!fp){sprite.visible=on;continue;}
    sprite.visible=sprite!==own&&sprite.getWorldPosition(new THREE.Vector3()).distanceTo(camera3d.position)>1.8;
  }
}
let staticMeshes=null;
function sceneStaticMeshes(){
  if(staticMeshes)return staticMeshes;
  const moving=new Set([...Object.values(figures).map(f=>f.root),...congregation.map(p=>p.figure.root),...Object.values(objects)]);
  staticMeshes=[];
  scene.traverse(child=>{
    if(!child.isMesh||child.material?.transparent)return;
    for(let node=child;node;node=node.parent)if(moving.has(node))return;
    staticMeshes.push(child);
  });
  return staticMeshes;
}
const fpRay=new THREE.Raycaster();
function fadeFigure(root,on){
  root.traverse(child=>{
    if(!child.isMesh)return;
    if(on){
      if(!child.userData.fadeMaterial){
        child.userData.fadeMaterial=child.material.clone();
        Object.assign(child.userData.fadeMaterial,{transparent:true,opacity:.22,depthWrite:false});
      }
      if(child.material!==child.userData.fadeMaterial){child.userData.solidMaterial=child.material;child.material=child.userData.fadeMaterial;}
    }else if(child.userData.solidMaterial&&child.material===child.userData.fadeMaterial){
      child.material=child.userData.solidMaterial;
    }
  });
}
// Fades anyone standing between the camera and what the player is looking at or looking for.
function updateOccluders(points){
  const self=figures.player?.root;
  const roots=[...Object.values(figures).map(f=>f.root),...congregation.map(p=>p.figure.root)].filter(r=>r.visible&&r!==self);
  const hits=new Set();
  for(const point of points){
    if(!point)continue;
    const dir=point.clone().sub(camera3d.position);
    const far=dir.length();
    if(far<.3)continue;
    fpRay.set(camera3d.position,dir.normalize());
    fpRay.camera=camera3d;
    fpRay.far=far-.25;
    for(const hit of fpRay.intersectObjects(roots,true)){
      let node=hit.object;
      while(node.parent&&!roots.includes(node))node=node.parent;
      if(roots.includes(node))hits.add(node);
    }
  }
  for(const root of gameView.faded)if(!hits.has(root))fadeFigure(root,false);
  for(const root of hits)if(!gameView.faded.has(root))fadeFigure(root,true);
  gameView.faded=hits;
}
function clearOccluders(){
  for(const root of gameView.faded)fadeFigure(root,false);
  gameView.faded=new Set();
}
function firstPersonCamera(){
  const root=figures.player.root,eye=eyeOf(root);
  const heading=root.rotation.y+gameView.yaw,pitch=gameView.pitch;
  const dir=new THREE.Vector3(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
  const view=FP_VIEWS[gameView.fpView];
  const flat=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));
  const right=new THREE.Vector3(-flat.z,0,flat.x);
  const scale=root.scale.x||1;
  const wanted=eye.clone().addScaledVector(flat,-view.back*scale).addScaledVector(right,-view.side*scale).add(new THREE.Vector3(0,view.up*scale,0));
  const offset=wanted.clone().sub(eye);
  const full=offset.length();
  let distance=full;
  if(distance>.01){
    // Keep the camera inside the church: stop just short of any wall or furniture behind.
    fpRay.set(eye,offset.clone().normalize());
    fpRay.camera=camera3d;
    fpRay.far=distance;
    const hit=fpRay.intersectObjects(sceneStaticMeshes(),false)[0];
    if(hit)distance=Math.max(0,hit.distance-.25);
  }
  gameView.closeUp=gameView.fpView!=='eyes'&&distance<.7*scale;
  camera3d.position.copy(eye).add(offset.setLength(distance));
  // Pulled in by a wall: rise to look down over the head instead of into the back of it.
  if(!gameView.closeUp&&distance<full-.05)camera3d.position.y+=Math.min(1,(full-distance)*.8)*scale;
  controls.target.copy(eye).add(dir.multiplyScalar(4));
  camera3d.lookAt(controls.target);
  updateOwnHead();
  updateOccluders([controls.target.clone(),eye,hintWorldPoint(),game.highlight?.object&&objects[game.highlight.object]?.getWorldPosition(new THREE.Vector3())]);
}
function setFirstPerson(on){
  gameView.firstPerson=!!on;
  if($('firstPerson'))$('firstPerson').checked=gameView.firstPerson;
  controls.enabled=!gameView.firstPerson;
  setCameraHint(gameView.firstPerson?'Drag to look around':'Drag to orbit / right-drag to pan / scroll to zoom');
  gameView.yaw=0;gameView.pitch=-.18;
  if(gameView.fov===null)gameView.fov=camera3d.fov;
  if(!gameView.firstPerson){
    clearOccluders();
    updateOwnHead();
    camera3d.fov=gameView.fov;camera3d.updateProjectionMatrix();
    setCamera($('camera').value);
  }else if(gameView.speaker)endSpeakerView();
}
// Where the current hint points, in world coordinates.
function hintWorldPoint(){
  const target=typeof game!=='undefined'&&game.hintTarget;
  if(!target)return null;
  if(target.point)return world(target.point,1);
  if(target.object&&objects[target.object])return objects[target.object].getWorldPosition(new THREE.Vector3());
  if(target.mesh)return target.mesh.getWorldPosition(new THREE.Vector3());
  if(target.figure&&figures[target.figure])return figures[target.figure].root.position.clone().setY(1);
  return null;
}
// An on-screen arrow when the hinted place is out of view: which way to turn.
function updateDirectionArrow(){
  const arrow=$('dirArrow');
  if(!arrow)return;
  const point=hintWorldPoint();
  if(!point){arrow.hidden=true;return;}
  camera3d.updateMatrixWorld();
  const local=point.clone().applyMatrix4(camera3d.matrixWorldInverse);
  const ndc=point.clone().project(camera3d);
  const inView=local.z<0&&Math.abs(ndc.x)<.85&&Math.abs(ndc.y)<.85;
  if(inView){arrow.hidden=true;return;}
  // The arrow glyph points right at 0; CSS rotation is clockwise with y down the screen.
  const behind=local.z>=0;
  const angle=Math.atan2(behind?0:-local.y,behind&&Math.abs(local.x)<.01?1:local.x);
  arrow.hidden=false;
  arrow.firstElementChild.style.transform='rotate('+angle+'rad)';
  arrow.lastElementChild.textContent=Math.abs(local.x)>Math.abs(local.y)||local.z>0?(local.x<0?'Turn left':'Turn right'):(local.y<0?'Look down':'Look up');
}

// ---------- first-person view while the player speaks ----------
const SPEAKER_VIEW_LIMIT=7000;
function speakerLine(){
  if(gameView.firstPerson||!$('speakerView')?.checked||game.phase!=='mass'||game.active||!playing3d)return null;
  const sayRole=GAME_ROLES[game.role]?.sayRole;
  const figure=figures.player;
  if(!sayRole||!figure||!figure.root.visible)return null;
  const step=STEPS[cur3d];
  const index=(step.say||[]).findIndex(([role,text,a,b])=>role===sayRole&&progress3d>=a&&progress3d<=b&&cleanEnglishSpeech(text));
  if(index<0)return null;
  const id=step.key+':'+index;
  return gameView.spokenDone.has(id)?null:id;
}
function endSpeakerView(){
  const saved=gameView.speaker;
  if(!saved)return;
  gameView.speaker=null;
  gameView.spokenDone.add(saved.id);
  camera3d.position.copy(saved.position);
  controls.target.copy(saved.target);
  if(camera3d.fov!==saved.fov){camera3d.fov=saved.fov;camera3d.updateProjectionMatrix();}
  cameraMode=saved.mode;
  followPosition=null;
  controls.enabled=!gameView.firstPerson;
  controls.update();
  setCameraHint(gameView.firstPerson?'Drag to look around':'Drag to orbit / right-drag to pan / scroll to zoom');
}
function gameCameraOverride(){
  if(typeof game==='undefined')return;
  if(gameView.tween&&!firstPersonActive()){updateCameraTween();updateDirectionArrow();return;}
  if(firstPersonActive()){
    if(gameView.speaker){gameView.speaker.id='';endSpeakerView();}
    firstPersonCamera();
    updateDirectionArrow();
    return;
  }
  updateDirectionArrow();
  const line=speakerLine();
  if(gameView.speaker&&(line!==gameView.speaker.id||performance.now()-gameView.speaker.started>SPEAKER_VIEW_LIMIT)){
    endSpeakerView();
    return;
  }
  if(!gameView.speaker&&line){
    gameView.speaker={id:line,mode:cameraMode,position:camera3d.position.clone(),target:controls.target.clone(),started:performance.now(),yaw:0,pitch:-.15,fov:camera3d.fov};
    cameraMode='speaker';
    controls.enabled=false;
    setCameraHint('Drag to look around from your perspective');
  }
  if(gameView.speaker){
    const root=figures.player.root;
    root.updateMatrixWorld();
    camera3d.position.copy(root.localToWorld(new THREE.Vector3(0,1.68,.3)));
    const heading=root.rotation.y+gameView.speaker.yaw,pitch=gameView.speaker.pitch;
    const direction=new THREE.Vector3(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
    controls.target.copy(camera3d.position).add(direction.multiplyScalar(3.2));
    camera3d.lookAt(controls.target);
  }
}
function resetGameView(){
  if(gameView.speaker){gameView.speaker.id='';endSpeakerView();}
  gameView.spokenDone.clear();
  gameView.lastProps.clear();
}

// ---------- highlight mode ----------
function propMovingNow(name,step){
  const track=step.props?.[name];
  if(!track)return false;
  return track.some(k=>k.by&&progress3d>=(k.t??0)-.02&&progress3d<=(k.t??0)+.25||
    k.a!==undefined&&progress3d>=k.a-.02&&progress3d<=(k.b??k.a)+.02);
}
function activeThings(){
  const step=STEPS[cur3d];
  const roles=new Set(),props=new Set();
  const shown=role=>figures[role]&&figures[role].root.visible&&(scenario.visible.has(role)||!ACTORS[role]);
  for(const [role,acts] of Object.entries(step.acts||{})){
    if(acts.some(([text,a,b])=>text&&progress3d>=a&&progress3d<=b&&!/^(kneels|stands|sits|turns toward)/.test(text)))roles.add(role);
  }
  for(const [role,,a,b] of step.say||[])if(role!=='ppl'&&progress3d>=a&&progress3d<=b)roles.add(role);
  for(const role of Object.keys(ACTORS)){
    if(!shown(role))continue;
    const p=actorAt(cur3d,role,progress3d),next=actorAt(cur3d,role,Math.min(1,progress3d+.01));
    if(Math.hypot(next[0]-p[0],next[1]-p[1])>.08)roles.add(role);
  }
  for(const name of Object.keys(objects)){
    const object=objects[name];
    if(!object.visible)continue;
    const last=gameView.lastProps.get(name);
    const moved=last&&last.distanceToSquared(object.position)>1e-6;
    gameView.lastProps.set(name,object.position.clone());
    if(moved||propMovingNow(name,step))props.add(name);
  }
  if(game.lapse)roles.add(game.lapse.role);
  const target=game.highlight;
  if(target?.figure)roles.add(target.figure);
  if(target?.object)props.add(target.object);
  for(const role of [...roles])if(!shown(role))roles.delete(role);
  return {roles,props};
}
function setLit(object,on){
  object.traverse(child=>{if(on)child.layers.enable(1);else child.layers.disable(1);});
}
function ensureHighlightScene(){
  if(gameView.dim)return;
  const dimCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const dimScene=new THREE.Scene();
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({color:'#77736d',transparent:true,opacity:.62,depthTest:false,depthWrite:false}));
  dimScene.add(veil);
  gameView.dim={scene:dimScene,camera:dimCamera};
  // Lights also need layer 1 to light the highlighted pass; the extra light brightens only that pass.
  scene.traverse(child=>{if(child.isLight)child.layers.enable(1);});
  const boost=new THREE.AmbientLight('#fff4d8',.45);
  boost.layers.set(1);
  scene.add(boost);
  gameView.boost=boost;
}
function gameRender(){
  if(!gameView.highlightOn||typeof game==='undefined'||game.phase==='setup')return false;
  ensureHighlightScene();
  const {roles,props}=activeThings();
  const lit=new Set();
  for(const role of roles)lit.add(figures[role].root);
  for(const name of props)lit.add(objects[name]);
  if(highlightMesh?.visible)lit.add(highlightMesh);
  for(const object of gameView.lit)if(!lit.has(object))setLit(object,false);
  for(const object of lit)if(!gameView.lit.has(object))setLit(object,true);
  gameView.lit=lit;
  if(!lit.size)return false;
  renderer.autoClear=false;
  renderer.clear();
  camera3d.layers.set(0);
  renderer.render(scene,camera3d);
  renderer.render(gameView.dim.scene,gameView.dim.camera);
  // A colour background makes three.js clear on every render, so drop it for the overlay pass.
  const background=scene.background;
  scene.background=null;
  camera3d.layers.set(1);
  renderer.render(scene,camera3d);
  camera3d.layers.set(0);
  scene.background=background;
  renderer.autoClear=true;
  return true;
}
function setHighlightMode(on){
  gameView.highlightOn=!!on;
  if(!on){for(const object of gameView.lit)setLit(object,false);gameView.lit=new Set();}
  $('highlightMode').checked=gameView.highlightOn;
}

// ---------- skipping ----------
// The next point worth stopping at: a spoken line, a new step or the player's next question.
function nextSkipTarget(now){
  let target=Infinity;
  for(let i=cur3d;i<STEPS.length;i++){
    if(stepStart[i]>now+.05){target=Math.min(target,stepStart[i]);break;}
    for(const [,,a] of STEPS[i].say||[]){
      const time=stepStart[i]+a*STEPS[i].dur;
      if(time>now+.05)target=Math.min(target,time);
    }
  }
  const stop=nextStop();
  if(stop)target=Math.min(target,stop.time);
  return Math.min(target,TOTAL);
}
function skipCurrent(){
  if(typeof game==='undefined'||game.phase==='setup'||game.phase==='summary')return false;
  if(gameView.speaker)endSpeakerView();
  if(skipSpeech()){toast('Skipped the words being spoken.',false,1200);return true;}
  if(game.phase!=='mass'||game.active||game.busy){
    toast(game.active?'Answer the question first, or use its Skip button if it has one.':'Nothing to skip just now.',false,1600);
    return false;
  }
  const now=currentElapsed(),target=nextSkipTarget(now);
  if(!(target>now))return false;
  let step=0;
  while(step<STEPS.length-1&&stepStart[step+1]<=target)step++;
  const wasPlaying=playing3d;
  jump(step,Math.min(1,(target-stepStart[step])/STEPS[step].dur));
  game.lastElapsed=target-1e-6;
  if(wasPlaying)setPlaying(true);
  toast('Skipped to the next action.',false,1200);
  return true;
}

function initialiseGameView(){
  for(const button of document.querySelectorAll('#cameraPad [data-cam]')){
    button.onclick=()=>cameraNudge(button.dataset.cam);
  }
  controls?.addEventListener('start',()=>{gameView.tween=null;});
  $('firstPerson').onchange=()=>setFirstPerson($('firstPerson').checked);
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{if(firstPersonActive()||gameView.speaker)gameView.drag={x:event.clientX,y:event.clientY};});
  window.addEventListener('pointermove',event=>{
    const drag=gameView.drag;
    if(!drag||(!firstPersonActive()&&!gameView.speaker))return;
    const yaw=gameView.speaker?gameView.speaker.yaw:gameView.yaw;
    const pitch=gameView.speaker?gameView.speaker.pitch:gameView.pitch;
    const nextYaw=yaw-(event.clientX-drag.x)*.005;
    const nextPitch=Math.max(-1.2,Math.min(.6,pitch-(event.clientY-drag.y)*.005));
    if(gameView.speaker){gameView.speaker.yaw=nextYaw;gameView.speaker.pitch=nextPitch;}
    else{gameView.yaw=nextYaw;gameView.pitch=nextPitch;}
    drag.x=event.clientX;drag.y=event.clientY;
  });
  window.addEventListener('pointerup',()=>{gameView.drag=null;});
  $('highlightMode').onchange=()=>setHighlightMode($('highlightMode').checked);
  $('gameSkip').onclick=()=>skipCurrent();
  $('camera').addEventListener('change',()=>{if(gameView.speaker){gameView.speaker.mode=$('camera').value;endSpeakerView();setCamera($('camera').value);}});
}
