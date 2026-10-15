'use strict';

const $=id=>document.getElementById(id);
let cur3d=0, progress3d=0, playing3d=false, scenario;
let scene, camera3d, renderer, controls, cameraMode='overview', followPosition=null;
const figures={}, objects={}, congregation=[], smokeParticles=[];
const sceneLabels=[];
const materials=new Map();
const SCALE=.025;
// Servers are often of different ages; candle-bearers are drawn as younger children.
const SERVER_HEIGHTS={S:.95,X:1,C1:.84,C2:.86,T:.92};
const groundAt=p=>{const y=layoutPoint(p)[1];return y<295?.32:y<310?.32*(310-y)/15:0;};
const world=(p,height=0)=>{
  const mapped=layoutPoint(p);
  return new THREE.Vector3((mapped[0]-500)*SCALE,groundAt(p)+height,(mapped[1]-440)*SCALE);
};
const material=color=>{
  if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.78}));
  return materials.get(color);
};

function mesh(geometry,color,parent,x=0,y=0,z=0,shadow=true){
  const m=new THREE.Mesh(geometry,material(color));
  m.position.set(x,y,z);
  m.castShadow=shadow;
  m.receiveShadow=true;
  parent.add(m);
  return m;
}
function box(parent,x,y,z,w,h,d,color,shadow=true){
  return mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z,shadow);
}
function sphere(parent,x,y,z,r,color,shadow=true){
  return mesh(new THREE.SphereGeometry(r,10,8),color,parent,x,y,z,shadow);
}
function cylinder(parent,x,y,z,top,bottom,height,color){
  return mesh(new THREE.CylinderGeometry(top,bottom,height,12),color,parent,x,y,z);
}
function label(text,position){
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  ctx.font='28px sans-serif';
  canvas.width=Math.ceil(ctx.measureText(text).width+30);canvas.height=56;
  ctx.fillStyle='rgba(30,39,43,.85)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff4d8';
  ctx.textAlign='center';ctx.font='28px sans-serif';
  ctx.fillText(text,canvas.width/2,38);
  const texture=new THREE.CanvasTexture(canvas);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
  sprite.scale.set(canvas.width*.006,canvas.height*.006,1);
  sprite.position.copy(position);
  sprite.renderOrder=5;
  sceneLabels.push(sprite);
  return sprite;
}

function makeFigure(color,skin,role){
  const root=new THREE.Group();
  const torso=new THREE.Group();
  torso.position.y=.68;
  root.add(torso);
  const cleric=role==='P'||role==='D'||SERVER_ROLES.includes(role);
  const body=mesh(new THREE.CylinderGeometry(cleric?.22:.19,role==='P'?.4:cleric?.36:.23,role==='P'?1.4:.82,12),color,torso,0,role==='P'?.14:.4,0,Boolean(role));
  if(role==='P'){
    box(torso,0,.15,.285,.055,1.2,.022,'#d7b565');
    box(torso,0,.58,.24,.27,.04,.025,'#d7b565');
  }
  if(role==='D'){
    const stole=box(torso,0,.4,.245,.055,.78,.018,'#e5ca83');
    stole.rotation.z=-.55;
  }
  sphere(torso,0,1.02,0,.18,skin,Boolean(role));
  if(!SERVER_ROLES.includes(role))sphere(torso,0,1.105,-.015,.15,'#4b3628',false).scale.set(1,.45,1);
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();
    arm.position.set(side*.245,.74,0);
    mesh(new THREE.CylinderGeometry(.075,.065,.5,8),color,arm,0,-.22,0,Boolean(role));
    sphere(arm,0,-.49,0,.075,skin,Boolean(role));
    torso.add(arm);arms.push(arm);
  }
  const legs=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();
    leg.position.set(side*.115,.66,0);
    mesh(new THREE.CylinderGeometry(.065,.06,.57,8),cleric?'#e7e1d4':'#35434c',leg,0,-.27,0,Boolean(role));
    box(leg,0,-.56,.045,.13,.1,.24,'#322c26',Boolean(role));
    root.add(leg);legs.push(leg);
  }
  let cincture=null,pectoral=null;
  if(SERVER_ROLES.includes(role)){
    cincture=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.024,6,18),material('#ffffff'));
    ring.rotation.x=Math.PI/2;ring.position.set(0,.36,0);
    cincture.add(ring);
    for(const dx of [.03,.085])box(cincture,dx,.2,.3,.026,.3,.026,'#ffffff',false);
    torso.add(cincture);
    pectoral=new THREE.Group();
    box(pectoral,0,0,0,.035,.15,.02,'#d7b565',false);
    box(pectoral,0,.03,0,.1,.032,.02,'#d7b565',false);
    box(pectoral,0,.12,-.01,.2,.02,.02,'#d7b565',false);
    pectoral.position.set(0,.6,.275);
    torso.add(pectoral);
  }
  const name=role?label(ROLE_NAMES[role],new THREE.Vector3(0,2,0)):null;
  if(name)root.add(name);
  root.userData.role=role;
  scene.add(root);
  return {root,torso,body,arms,legs,label:name,cincture,pectoral};
}

function pose(figure,posture,action,phase,walking=false,orans=false){
  const {root,torso,arms,legs}=figure;
  const baseScale=root.userData.baseScale||1;
  root.scale.y=baseScale;
  torso.rotation.set(0,0,0);
  torso.position.set(0,.68,0);
  for(const arm of arms)arm.rotation.set(0,0,0);
  for(const leg of legs)leg.rotation.set(0,0,0);
  if(posture==='sit'){
    torso.position.y=.25;
    root.scale.y=baseScale*.84;
    legs.forEach(leg=>{leg.rotation.x=-1.25;});
  }else if(/genuflects/.test(action)){
    root.scale.y=baseScale*.72;
    torso.rotation.x=.12;
    legs.forEach((leg,i)=>{leg.rotation.x=i===0?.85:-.45;});
  }else if(posture==='kneel'||/kneels/.test(action)){
    root.scale.y=baseScale*.72;
    torso.position.y=.4;
    legs.forEach(leg=>{leg.rotation.x=.85;});
  }
  if(/bow|kisses/.test(action))torso.rotation.x=action.includes('slightly')?.22:.6;
  if(orans){
    arms[0].rotation.z=-.85;arms[1].rotation.z=.85;
    arms.forEach(arm=>arm.rotation.x=-.6);
  }else if(/raises|shows/.test(action)){
    arms.forEach(arm=>arm.rotation.x=-2.4);
  }else if(/extended over|pours|purifies|arranges|prepares|breaks|incenses/.test(action)){
    arms.forEach(arm=>arm.rotation.x=-1.1);
  }else if(/blesses|signs|Cross/.test(action)){
    arms[1].rotation.x=-1.2;arms[1].rotation.z=.2*Math.sin(phase*8);
  }else if(walking){
    legs[0].rotation.x=Math.sin(phase*9)*.35;
    legs[1].rotation.x=-legs[0].rotation.x;
    arms[0].rotation.x=-legs[0].rotation.x*.6;
    arms[1].rotation.x=-arms[0].rotation.x;
  }else{
    arms[0].rotation.z=-.18;arms[1].rotation.z=.18;
    arms.forEach(arm=>arm.rotation.x=-.4);
  }
}

let crucifixGroup, nicheGroup, corpusGroup, sanctuaryFloor, windowsGroup, tabernacleDoor;
function buildCrucifix(){
  crucifixGroup=new THREE.Group();
  box(crucifixGroup,0,0,0,.16,1.8,.12,'#5e432d');
  box(crucifixGroup,0,.35,.02,1.1,.13,.16,'#5e432d');
  box(crucifixGroup,0,.9,.02,.2,.05,.13,'#d7b565',false);
  // The corpus: head with crown, outstretched arms, torso, loincloth and legs.
  corpusGroup=new THREE.Group();
  const ivory='#d9b982';
  box(corpusGroup,0,.1,.11,.2,.52,.07,ivory);
  box(corpusGroup,-.27,.34,.11,.42,.07,.06,ivory).rotation.z=.12;
  box(corpusGroup,.27,.34,.11,.42,.07,.06,ivory).rotation.z=-.12;
  sphere(corpusGroup,0,.5,.12,.095,ivory);
  sphere(corpusGroup,0,.55,.115,.085,'#5b4630',false).scale.set(1,.5,1);
  box(corpusGroup,0,-.2,.12,.26,.2,.09,'#f6f1e4');
  box(corpusGroup,0,.1,.145,.015,.4,.01,'#a98456',false);
  box(corpusGroup,-.04,-.5,.11,.08,.5,.06,ivory);
  box(corpusGroup,.04,-.5,.11,.08,.5,.06,ivory);
  crucifixGroup.add(corpusGroup);
  crucifixGroup.position.set(0,3.8,-10.49);
  scene.add(crucifixGroup);
  nicheGroup=new THREE.Group();
  box(nicheGroup,0,2.4,0,3.4,4.6,.04,'#8c7c62',false);
  for(const dx of [-1.85,1.85])box(nicheGroup,dx,2.4,.18,.32,4.8,.36,'#d8ccb4');
  box(nicheGroup,0,4.9,.18,4.05,.34,.4,'#d8ccb4');
  box(nicheGroup,0,.08,.18,3.4,.16,.36,'#cbbd9f',false);
  nicheGroup.position.set(0,0,-10.54);
  nicheGroup.visible=false;
  scene.add(nicheGroup);
}
function setCorpus(on){if(corpusGroup)corpusGroup.visible=on;}
const WINDOW_GLASS=['#b3262d','#2f5fa8','#e0b43a','#2e7d4f','#6a3d8f','#d9822b'];
const FLOOR_COLOURS={sandstone:'#c2a27a',terracotta:'#b5694a',slate:'#7a8288',marble:'#e5d7bc'};
// Back-wall windows: a fine leaded grid, stained glass, or plain glass (never a four-pane cross).
function setWindowStyle(style){
  if(windowsGroup){scene.remove(windowsGroup);windowsGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  windowsGroup=new THREE.Group();
  const W=1.1,H=2.3;
  [-8,-4,4,8].forEach((x,n)=>{
    const win=new THREE.Group();
    win.position.set(x,3.1,-10.5);
    if(style==='plain')box(win,0,0,0,W,H,.06,'#9fc3c8',false);
    else if(style==='stained'){
      const cols=3,rows=7,pw=W/cols,ph=H/rows;
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
        const colour=r===3&&c===1?'#f4e6a8':WINDOW_GLASS[(r*2+c*3+n)%WINDOW_GLASS.length];
        box(win,(c-1)*pw,(r-3)*ph,0,pw-.025,ph-.025,.06,colour,false);
      }
    }else{
      const cols=4,rows=9;
      box(win,0,0,0,W,H,.06,'#8fb4bb',false);
      for(let c=1;c<cols;c++)box(win,(c/cols-.5)*W,0,.04,.022,H,.03,'#4f4b40',false);
      for(let r=1;r<rows;r++)box(win,0,(r/rows-.5)*H,.04,W,.022,.03,'#4f4b40',false);
    }
    box(win,0,H/2+.03,.04,W+.1,.07,.05,'#caa96e',false);
    box(win,0,-H/2-.03,.04,W+.1,.07,.05,'#caa96e',false);
    for(const dx of [-W/2-.03,W/2+.03])box(win,dx,0,.04,.07,H+.14,.05,'#caa96e',false);
    windowsGroup.add(win);
  });
  scene.add(windowsGroup);
}
function setSanctuaryFloor(name){
  if(sanctuaryFloor)sanctuaryFloor.material=material(FLOOR_COLOURS[name]||FLOOR_COLOURS.sandstone);
}
const APPEARANCE_DEFAULTS={corpus:'yes',windows:'stained',floor:'sandstone',vestment:'season',serverRobe:'#fbfbf6',cincture:'#ffffff',seniorCross:'yes',tabernacle:'behind'};
function readAppearance(){
  const a={...APPEARANCE_DEFAULTS};
  for(const key of Object.keys(a))if($('app_'+key))a[key]=$('app_'+key).value;
  return a;
}
function recolour(figure,colour){
  figure.body.material=material(colour);
  for(const arm of figure.arms)arm.children[0].material=material(colour);
}
function applyAppearance(a){
  setCorpus(a.corpus!=='no');
  setWindowStyle(a.windows);
  setSanctuaryFloor(a.floor);
  if(a.tabernacle!=='custom'){
    churchLayout.tabernacle=({behind:[500,40],left:[137,85],right:[863,85]})[a.tabernacle]?.slice()||[500,40];
    if(a.tabernacle==='behind'&&Math.hypot(churchLayout.chair[0]-500,churchLayout.chair[1]-40)<100)churchLayout.chair=[320,65];
    refreshFurniture();
    if(featuresReady)refreshLayoutFields();
  }
  const day=liturgicalDay(nextSunday(new Date()));
  const colour=a.vestment==='season'?day.hex:(VESTMENT_COLOURS[a.vestment]||VESTMENT_COLOURS.green).hex;
  recolour(figures.P,colour);
  recolour(figures.D,colour);
  const note=$('vestmentNote');
  if(note){
    const date=nextSunday(new Date()).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
    note.textContent='Next Sunday ('+date+'): '+day.name+', '+day.colourName.toLowerCase()+'. Simplified Sunday calendar; override for local feasts. Rose is optional.';
  }
  for(const role of SERVER_ROLES){
    const figure=figures[role];
    recolour(figure,a.serverRobe);
    figure.cincture.visible=a.cincture!=='none';
    if(a.cincture!=='none')figure.cincture.children.forEach(part=>{part.material=material(a.cincture);});
    figure.pectoral.visible=role==='S'&&a.seniorCross!=='no';
  }
}
// Moves the fixed crucifix (and its recess, if any) to the chosen place; 'none' hides it.
function placeCrucifix(id){
  if(!crucifixGroup)return;
  const place=(typeof CRUCIFIX_PLACES!=='undefined'&&CRUCIFIX_PLACES[id])||{x:0,face:[500,14]};
  crucifixGroup.visible=!!place.face;
  nicheGroup.visible=!!(place.face&&place.recess);
  if(!place.face)return;
  const x=world(place.face).x;
  crucifixGroup.position.set(x,place.recess?2.9:3.8,place.recess?-10.44:-10.49);
  nicheGroup.position.x=x;
}

function buildChurch(){
  box(scene,0,-.16,0,25,.3,22,'#ded4c0',false);
  sanctuaryFloor=box(scene,0,.14,-7.1,22,.34,7.5,'#c2a27a',false);
  box(scene,0,.07,-3.3,21,.16,.22,'#c6b99e',false);
  box(scene,0,.025,3.65,1.18,.04,14.3,'#923f38',false);
  for(let x=-12;x<=12;x+=1.5)box(scene,x,.008,3.5,.012,.014,13,'#cbc1af',false);
  for(let z=-2.5;z<=10.5;z+=1.5)box(scene,0,.009,z,24,.015,.012,'#cbc1af',false);
  // Cutaway walls leave the nave open to inspection from every camera.
  box(scene,0,2.6,-10.7,23,5.2,.28,'#c4b69d');
  box(scene,0,4.6,-10.52,5,.2,.1,'#967749');
  buildCrucifix();
  for(const side of [-1,1]){
    for(const z of [-8,-3.5,2,7]){
      cylinder(scene,side*11.6,1.8,z,.23,.3,3.6,'#e7ddca');
      box(scene,side*11.6,3.63,z,.8,.18,.8,'#a39172');
      box(scene,side*11.6,.08,z,.7,.16,.7,'#a39172');
    }
  }
  let fixtureStart=scene.children.length;
  const altar=world([500,170]);
  box(scene,altar.x,altar.y+.63,altar.z,3.5,1.15,1.1,'#bdab8f');
  box(scene,altar.x,altar.y+1.26,altar.z,5.1,.16,1.6,'#fffae9');
  box(scene,altar.x,altar.y+1.03,altar.z+.83,5.1,.4,.035,'#f5f0e4');
  collectFurniture('altar',fixtureStart);
  fixtureStart=scene.children.length;
  const ambo=world([200,245]);
  box(scene,ambo.x,ambo.y+.63,ambo.z,1.2,1.25,.6,'#94714a');
  const lectern=box(scene,ambo.x,ambo.y+1.3,ambo.z,.95,.09,.8,'#b18a5c');
  lectern.rotation.x=-.22;
  collectFurniture('ambo',fixtureStart);
  fixtureStart=scene.children.length;
  const credence=world([866,130]);
  box(scene,credence.x,credence.y+1,credence.z,2,.1,1.5,'#f3e7ce');
  for(const dx of [-.8,.8])box(scene,credence.x+dx,credence.y+.5,credence.z,.1,1,.9,'#80623e');
  collectFurniture('credence',fixtureStart);
  fixtureStart=scene.children.length;
  const wash=world([650,142]);
  box(scene,wash.x,wash.y+.85,wash.z,.9,.06,.6,'#ab8b60');
  cylinder(scene,wash.x,wash.y+.4,wash.z,.07,.07,.85,'#80623e');
  cylinder(scene,wash.x,wash.y+.9,wash.z,.18,.11,.1,'#c8d9d9');
  const washingStand=scene.children.slice(fixtureStart);
  washingStand.forEach(child=>furnitureGroups.altar.add(child));
  for(const [p,width] of [[CHAIR,1],[DCHAIR,.8],[[700,55],4]]){
    fixtureStart=scene.children.length;
    const w=world(p);
    box(scene,w.x,w.y+.45,w.z,width,.18,.7,'#795738');
    box(scene,w.x,w.y+1,w.z-.25,width,1.2,.1,'#795738');
    for(const dx of [-width*.4,width*.4])box(scene,w.x+dx,w.y+.2,w.z,.1,.4,.65,'#5e432d');
    if(width===4)collectFurniture('ministers',fixtureStart);
    else if(width===1)collectFurniture('chair',fixtureStart);
    else scene.children.slice(fixtureStart).forEach(child=>furnitureGroups.chair.add(child));
  }
  fixtureStart=scene.children.length;
  const stand=world([545,82]);
  cylinder(scene,stand.x,stand.y+.62,stand.z,.03,.03,1.24,'#665544');
  box(scene,stand.x,stand.y+1.26,stand.z,.65,.04,.4,'#795738');
  scene.children.slice(fixtureStart).forEach(child=>furnitureGroups.chair.add(child));
  for(let y=356;y<=700;y+=34){
    for(const x of [295,705]){
      const w=world([x,y+12]);
      box(scene,w.x,.48,w.z,7.8,.11,.38,'#8f6842',false);
      box(scene,w.x,.72,w.z+.18,7.8,.48,.08,'#9f784e',false);
      for(const dx of [-3.5,3.5])box(scene,w.x+dx,.23,w.z,.1,.46,.3,'#795638',false);
    }
  }
  fixtureStart=scene.children.length;
  const tab=world([137,85]);
  box(scene,tab.x,tab.y+.6,tab.z,1.4,1.2,1,'#7f3433');
  box(scene,tab.x,tab.y+1.23,tab.z,1.7,.14,1.25,'#e5d7bc');
  box(scene,tab.x,tab.y+1.7,tab.z,.95,.8,.7,'#c59a3f');
  tabernacleDoor=new THREE.Group();
  tabernacleDoor.position.set(tab.x-.38,tab.y+1.7,tab.z+.37);
  box(tabernacleDoor,.38,0,0,.76,.65,.04,'#e3bc62');
  box(tabernacleDoor,.38,.05,.04,.03,.35,.02,'#fff1ba');
  box(tabernacleDoor,.38,.12,.04,.22,.03,.02,'#fff1ba');
  sphere(tabernacleDoor,.66,0,.04,.025,'#7f3433',false);
  scene.add(tabernacleDoor);
  for(const side of [-1,1])cylinder(scene,tab.x+side*.48,tab.y+1.7,tab.z+.38,.04,.05,.87,'#e3bc62');
  cylinder(scene,tab.x,tab.y+2.16,tab.z,.27,.52,.18,'#c59a3f');
  sphere(scene,tab.x,tab.y+2.31,tab.z,.055,'#fff1ba');
  sphere(scene,tab.x+.76,tab.y+1.95,tab.z+.15,.09,'#df4735');
  cylinder(scene,tab.x+.76,tab.y+1.75,tab.z+.15,.025,.025,.3,'#c59a3f');
  collectFurniture('tabernacle',fixtureStart);
  const gifts=world([621,770]);
  box(scene,gifts.x,.9,gifts.z,1.25,.1,.7,'#ab8b60');
  box(scene,gifts.x,.45,gifts.z,.12,.9,.6,'#80623e');
  for(const [name,p] of [['Altar',[500,180]],['Ambo',[200,250]],['Chair',[500,55]],['Credence',[866,150]],['Tabernacle',[137,85]]]){
    const sprite=label(name,world(p,1.95));
    sprite.userData.fixture=name.toLowerCase();
    sprite.userData.canonical=p;
    scene.add(sprite);
  }
}

function makeObjects(){
  for(const name of Object.keys(PROP_DEF)){
    const g=new THREE.Group();
    objects[name]=g;
    scene.add(g);
    if(name==='cross'){
      box(g,0,1,0,.055,2.1,.055,'#b58d40');
      box(g,0,1.75,0,.65,.055,.055,'#b58d40');
      sphere(g,0,1.82,.045,.055,'#bba583');
      box(g,0,1.64,.045,.04,.24,.04,'#bba583');
      box(g,0,1.72,.045,.36,.035,.04,'#bba583');
    }else if(name.startsWith('cand')){
      cylinder(g,0,.17,0,.025,.05,.34,'#c6a15c');
      cylinder(g,0,.46,0,.045,.045,.28,'#fff5dc');
      sphere(g,0,.63,0,.04,'#ffbf50');
    }else if(name==='chalice'){
      cylinder(g,0,.01,0,.12,.12,.025,'#caa347');
      cylinder(g,0,.12,0,.025,.025,.22,'#caa347');
      cylinder(g,0,.26,0,.115,.035,.19,'#d4b563');
    }else if(name==='collection'){
      cylinder(g,0,.1,0,.2,.16,.2,'#8a6540');
      const handle=mesh(new THREE.TorusGeometry(.2,.025,6,16,Math.PI),'#8a6540',g,0,.15,0);
      handle.rotation.z=0;
      box(g,0,.22,0,.16,.015,.12,'#d4af37',false);
    }else if(name==='ciborium'){
      cylinder(g,0,.025,0,.12,.12,.04,'#c59a3f');
      cylinder(g,0,.13,0,.03,.03,.2,'#c59a3f');
      cylinder(g,0,.29,0,.18,.08,.18,'#e3bc62');
      cylinder(g,0,.4,0,.05,.19,.08,'#e3bc62');
      box(g,0,.49,0,.018,.12,.018,'#c59a3f');
      box(g,0,.51,0,.07,.018,.018,'#c59a3f');
    }else if(name==='bread'){
      cylinder(g,0,.025,0,.18,.18,.025,'#cfb464');
      const host=cylinder(g,0,.055,0,.105,.105,.025,'#fffdf0');
      g.remove(host);
      scene.add(host);objects.host=host;
    }else if(name==='wine'){
      for(const dx of [-.09,.09]){
        cylinder(g,dx,.09,0,.045,.065,.18,dx<0?'#7e2940':'#bad3de');
        cylinder(g,dx,.2,0,.025,.025,.08,'#d7d9d3');
      }
    }else if(name==='ewer'){
      cylinder(g,0,.1,0,.08,.1,.2,'#c2d5df');
    }else if(name==='thurible'){
      cylinder(g,0,-.18,0,.008,.008,.36,'#5c5c5c');
      sphere(g,0,-.4,0,.09,'#a9a6a0');
    }else if(name==='corporal'){
      box(g,.5,.006,0,1.5,.012,1.5,'#ffffff',false);
      for(const z of [-.7,.7])box(g,.5,.014,z,1.4,.004,.018,'#a6a195',false);
      for(const x of [-.2,1.2])box(g,x,.014,0,.018,.004,1.4,'#a6a195',false);
      for(const x of [.25,.75])box(g,x,.013,0,.009,.002,1.38,'#dedbd3',false);
      for(const z of [-.25,.25])box(g,.5,.013,z,1.38,.002,.009,'#dedbd3',false);
    }else{
      box(g,0,.035,0,.38,.07,.5,name==='gospels'?'#c5a34f':'#913b33');
      box(g,0,.075,0,.045,.008,.3,'#f0d085');
      box(g,0,.08,-.03,.18,.008,.04,'#f0d085');
    }
  }
  const smokeMaterial=new THREE.MeshBasicMaterial({color:'#ddd9d0',transparent:true,opacity:.18,depthWrite:false});
  for(let i=0;i<12;i++){
    const particle=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),smokeMaterial.clone());
    scene.add(particle);smokeParticles.push(particle);
  }
  const bell=new THREE.Group();
  cylinder(bell,0,.11,0,.03,.13,.2,'#caa347');
  cylinder(bell,0,.24,0,.025,.025,.08,'#795b34');
  bell.position.copy(world([660,245]));
  scene.add(bell);objects.bell=bell;
}

function setCamera(mode){
  cameraMode=mode;
  $('camera').value=mode;
  followPosition=null;
  const presets={
    overview:[[18,17,23],[0,1,-1]],
    altar:[[6,5,-1],[0,1.2,-7]],
    ambo:[[-2,4,-1],[-7.5,1.2,-5]],
    chair:[[4,3,-5],[0,1.2,-9.5]],
    nave:[[0,1.65,5],[0,1.4,-7]],
    overhead:[[0,30,.01],[0,0,0]]
  };
  if(mode==='action'){
    const view=activityView();
    camera3d.position.copy(view.position);
    controls.target.copy(view.target);
  }else if(presets[mode]){
    camera3d.position.fromArray(presets[mode][0]);
    controls.target.fromArray(presets[mode][1]);
    if(['altar','ambo','chair','nave'].includes(mode)){
      const target=world(mode==='ambo'?[200,245]:mode==='chair'?CHAIR:[500,170],1.2);
      const offset=camera3d.position.clone().sub(controls.target);
      controls.target.copy(target);camera3d.position.copy(target).add(offset);
    }
  }else{
    const target=figures[mode].root.position.clone().add(new THREE.Vector3(0,1,0));
    camera3d.position.copy(target).add(new THREE.Vector3(3,2.2,4));
    controls.target.copy(target);
    followPosition=target;
  }
  controls.update();
}

function activityView(){
  const step=STEPS[cur3d];
  const available=role=>scenario.visible.has(role)&&figures[role].root.visible;
  let point,wide=false;
  const raised=(step.raise||[]).some(([,a,b])=>progress3d>=a&&progress3d<=b);
  const active=Object.keys(ACTORS).filter(role=>available(role)&&
    (step.acts?.[role]||[]).some(([text,a,b])=>
      progress3d>=a&&progress3d<=b&&text&&!/^(kneels$|turns toward)/.test(text)));
  const speakers=(step.say||[]).filter(([role,,a,b])=>
    role!=='ppl'&&available(role)&&progress3d>=a&&progress3d<=b);
  if(step.key===0||step.key===40){
    const procession=['P','D',...SERVER_ROLES,'L'].filter(available);
    point=new THREE.Vector3();
    procession.forEach(role=>point.add(figures[role].root.position));
    point.divideScalar(Math.max(1,procession.length)).add(new THREE.Vector3(0,1,0));
    wide=true;
  }else if(step.key===35&&progress3d>=.22&&progress3d<=.92){
    point=world([500,330],1);
    wide=true;
  }else if(raised){
    point=world([500,160],1.5);
  }else if(active.length||speakers.length){
    // A concrete gesture takes priority over a concurrent chant or response.
    const role=active[0]||speakers[0][0];
    point=figures[role].root.position.clone().add(new THREE.Vector3(0,1,0));
  }else{
    const mover=Object.keys(ACTORS).find(role=>{
      if(!available(role))return false;
      const p=actorAt(cur3d,role,progress3d);
      const next=actorAt(cur3d,role,Math.min(1,progress3d+.01));
      return Math.hypot(next[0]-p[0],next[1]-p[1])>.08;
    });
    if(mover){
      point=figures[mover].root.position.clone().add(new THREE.Vector3(0,1,0));
    }else if([5,6,7,15,32].includes(step.key)){
      point=world([500,370],1);wide=true;
    }else{
      point=figures.P.root.position.clone().add(new THREE.Vector3(0,1,0));
    }
  }
  return {
    target:point,
    position:point.clone().add(wide?new THREE.Vector3(10,8,12):new THREE.Vector3(4.5,3.2,5.5))
  };
}

function updateFollow(dt){
  if(cameraMode==='action'){
    const view=activityView();
    const blend=1-Math.exp(-3*dt);
    camera3d.position.lerp(view.position,blend);
    controls.target.lerp(view.target,blend);
    return;
  }
  if(!figures[cameraMode])return;
  const target=figures[cameraMode].root.position.clone().add(new THREE.Vector3(0,1,0));
  if(followPosition){
    const delta=target.clone().sub(followPosition);
    camera3d.position.add(delta);
    controls.target.add(delta);
  }
  followPosition=target;
}

function reservedPew(point){
  return ['L','L2','Ps','U','E'].some(role=>scenario.visible.has(role)&&Math.hypot(point[0]-HOME[role][0],point[1]-HOME[role][1])<25);
}

function updatePeople(step,phase){
  const posture=postureAt(cur3d,progress3d).name;
  const bow=(step.pplBow||[]).some(([a,b])=>progress3d>=a&&progress3d<=b);
  const special=step.special?.type==='communion'?step.special:null;
  congregation.forEach((person,i)=>{
    person.figure.root.visible=!reservedPew(person.home);
    let p=person.home;
    let walking=false, receiving=false;
    if(special&&i%3===0){
      const number=Math.ceil(congregation.length/3);
      const span=special.b-special.a, duration=span*.35;
      const start=special.a+(span-duration)*(i/3)/Math.max(1,number-1);
      const t=(progress3d-start)/duration;
      if(t>0&&t<1){
        const side=p[0]<500?-1:1;
        const station=special.emhc&&i%2?[620,318]:special.bothKinds?(i%2?[530,318]:[470,318]):[500,318];
        const aisle=side<0?487:513,outer=side<0?112:888;
        if(t<.43)p=along([p,[aisle,p[1]],[aisle,340],station],t/.43);
        else if(t<.55){p=station;receiving=true;}
        else p=along([station,[outer,330],[outer,p[1]],person.home],(t-.55)/.45);
        walking=!receiving;
      }
    }
    person.figure.root.position.copy(world(p));
    person.figure.root.rotation.y=Math.PI;
    pose(person.figure,walking||receiving?'stand':posture,receiving||bow?'bows':'',phase+i,walking);
    if(step.special?.type==='peace'&&progress3d>=step.special.a&&progress3d<=step.special.b){
      person.figure.root.rotation.y=Math.PI+(i%2?-.7:.7);
      person.figure.arms[1].rotation.x=-1;
      person.figure.arms[1].rotation.z=(i%2?1:-1)*.35*Math.sin(phase*3);
    }
  });
}

function objectHeight(name,state,p){
  if(state.by){
    const owner=figures[state.by];
    return groundAt(p)+(name==='cross'?.2:owner.root.scale.y*1.28);
  }
  if(name==='cross')return groundAt(p);
  if(name.startsWith('cand'))return groundAt(p)+1.35;
  if(name==='gospels'&&p[0]<260)return groundAt(p)+1.38;
  if(name==='missal'&&p[1]<100)return groundAt(p)+1.29;
  if(p[1]>700)return .97;
  if(p[0]>800)return groundAt(p)+1.05;
  if(p[0]>615)return groundAt(p)+.94;
  return groundAt(p)+1.35;
}

function renderFrame(dt=1/60){
  const step=STEPS[cur3d];
  if(tabernacleDoor)tabernacleDoor.rotation.y=(step.key===34.5&&progress3d>=.43&&progress3d<=.57||step.key===36&&progress3d>=.24&&progress3d<=.33)?-1.2:0;
  const elapsed=stepStart[cur3d]+step.dur*progress3d;
  const positions={};
  const actionTexts=[];
  for(const role of Object.keys(ACTORS)){
    const figure=figures[role];
    const p=actorAt(cur3d,role,progress3d);
    positions[role]=p;
    figure.root.visible=scenario.visible.has(role)&&p[1]<842;
    if(!figure.root.visible)continue;
    figure.root.position.copy(world(p));
    const action=(step.acts?.[role]||[]).find(([,a,b])=>progress3d>=a&&progress3d<=b)?.[0]||'';
    const ahead=actorAt(cur3d,role,Math.min(1,progress3d+.008));
    const mapped=layoutPoint(p),mappedAhead=layoutPoint(ahead);
    const dx=mappedAhead[0]-mapped[0], dz=mappedAhead[1]-mapped[1];
    const walking=Math.hypot(dx,dz)>.03;
    if(walking)figure.root.rotation.y=Math.atan2(dx,dz);
    else if(p[1]>300)figure.root.rotation.y=Math.PI;
    else figure.root.rotation.y=0;
    if(/profound bow|kisses|genuflects/.test(action)){
      const altar=layoutPoint([500,170]);
      figure.root.rotation.y=Math.atan2(altar[0]-mapped[0],altar[1]-mapped[1]);
    }
    const facing=!walking&&(step.face?.[role]||[]).find(([,a,b])=>progress3d>=a&&progress3d<=b);
    if(facing){
      const target=layoutPoint(facing[0]);
      figure.root.rotation.y=Math.atan2(target[0]-mapped[0],target[1]-mapped[1]);
    }
    if(role==='P'&&step.title==='The Gospel'&&scenario.options.deacon){
      const ambo=layoutPoint(AMBO);
      figure.root.rotation.y=Math.atan2(ambo[0]-mapped[0],ambo[1]-mapped[1]);
    }
    const orans=(step.orans?.[role]||[]).some(([a,b])=>progress3d>=a&&progress3d<=b);
    const atSeat=Math.hypot(p[0]-HOME[role][0],p[1]-HOME[role][1])<15;
    const posture=postureAt(cur3d,progress3d).name;
    const layInPew=['L','L2','Ps','U','E'].includes(role)&&p[1]>310&&!walking;
    const seated=posture==='sit'&&atSeat&&!walking&&!(role==='P'&&step.key===14);
    const kneelingServer=SERVER_ROLES.includes(role)&&posture==='kneel'&&!walking;
    pose(figure,layInPew?posture:seated?'sit':kneelingServer?'kneel':'stand',action,elapsed,walking,orans);
    if(action)actionTexts.push(ROLE_NAMES[role]+': '+action);
  }
  updatePeople(step,elapsed);
  for(const name of Object.keys(PROP_DEF)){
    const state=propAt(cur3d,name,progress3d,positions);
    const p=resolveProp(state,positions,name);
    const object=objects[name];
    object.visible=!state.h&&(!state.by||scenario.visible.has(state.by))&&p[1]<842;
    object.position.copy(world(p));
    object.position.y=objectHeight(name,state,p);
    object.rotation.set(0,0,0);
    if((name==='gospels'||name==='missal')&&state.by)object.rotation.x=-Math.PI/2;
    if(state.by&&name==='thurible')object.rotation.z=Math.sin(elapsed*5)*.25;
  }
  const raised=(step.raise||[]).find(([,a,b])=>progress3d>=a&&progress3d<=b);
  let hostRaised=false;
  if(raised){
    const [type,a,b]=raised;
    const high=!type.endsWith('-low');
    const lift=Math.sin(Math.PI*(progress3d-a)/(b-a))*(high?1.05:.22);
    const priest=figures.P.root.position;
    if(type.startsWith('host')||type==='both'){
      hostRaised=type.startsWith('host')&&high;
      const lifted=hostRaised?objects.host:objects.bread;
      lifted.position.set(priest.x-(type==='both'?.16:0),priest.y+1.38+lift,priest.z+.34);
      lifted.rotation.x=hostRaised?Math.PI/2:0;
    }
    if(type.startsWith('chalice')||type==='both'){
      const bearer=type==='both'&&scenario.options.deacon?figures.D:figures.P;
      objects.chalice.position.copy(bearer.root.position).add(new THREE.Vector3(type==='both'?.16:0,1.38+lift,.34));
    }
  }
  objects.host.visible=objects.bread.visible;
  if(!hostRaised){
    objects.host.position.copy(objects.bread.position).add(new THREE.Vector3(0,.055,0));
    objects.host.rotation.set(0,0,0);
  }
  const smoking=scenario.options.incense&&(step.smoke||[]).some(([,a,b])=>progress3d>=a&&progress3d<=b);
  smokeParticles.forEach((particle,i)=>{
    particle.visible=smoking;
    if(!smoking)return;
    const t=(elapsed*.65+i/smokeParticles.length)%1;
    particle.position.copy(objects.thurible.position);
    particle.position.add(new THREE.Vector3(Math.sin(i+elapsed)*t*.22,t*1.2-.4,Math.cos(i)*t*.2));
    particle.scale.setScalar(1+t*2.5);
    particle.material.opacity=(1-t)*.22;
  });
  objects.bell.visible=scenario.options.servers;
  objects.bell.rotation.z=(step.bell||[]).some(([a,b])=>progress3d>=a&&progress3d<=b)?Math.sin(elapsed*50)*.35:0;
  const speaking=(step.say||[]).filter(([, ,a,b])=>progress3d>=a&&progress3d<=b);
  const caption=speechCaption(speaking);
  if($('caption').textContent!==caption)$('caption').textContent=caption;
  const posture=postureAt(cur3d,progress3d).name;
  $('posture3d').textContent={stand:'Standing',sit:'Seated',kneel:'Kneeling'}[posture]+(step.special?.type==='communion'?'; communicants approach standing.':'.');
  $('actions3d').textContent=actionTexts.join(' / ');
  $('timeline').value=Math.round(elapsed/TOTAL*10000);
  const format=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  $('time').textContent=`${format(elapsed)} / ${format(TOTAL)}`;
  $('previous').disabled=cur3d===0&&progress3d===0;
  sceneLabels.forEach(l=>{l.visible=$('labels').checked;});
  objects.bell.position.copy(world([660,245]));
  if(typeof gameBeforeRender==='function')gameBeforeRender(dt,positions);
  updateTraining();
  updateFollow(dt);
  controls.update();
  renderer.render(scene,camera3d);
}

function showStep(){
  const step=STEPS[cur3d];
  $('part3d').textContent=step.part;
  $('title3d').textContent=step.title;
  $('rubric3d').textContent=step.text;
  $('reference3d').textContent=step.ref;
  [...$('stepList').querySelectorAll('button')].forEach((button,i)=>button.classList.toggle('active',i===cur3d));
  $('previous').disabled=cur3d===0&&progress3d===0;
  $('next3d').disabled=cur3d===STEPS.length-1;
}
function jump(index,u=0){
  resetSpeech();
  cur3d=Math.max(0,Math.min(STEPS.length-1,index));
  progress3d=Math.max(0,Math.min(1,u));
  showStep();
  renderFrame();
}
function setPlaying(value){
  if(!value)resetSpeech();
  else if((speechUtterance||recording)&&!speechBusy)resetSpeech();
  playing3d=value;
  $('play3d').textContent=value?'Pause':'Play';
}
function applySetup(){
  const key=STEPS[cur3d]?.key??0;
  setPlaying(false);
  const requested=Object.fromEntries(['deacon','lector','incense','bothKinds'].map(id=>[id,$(id).checked]));
  requested.serverCount=Number($('serverCount').value);
  if($('readerCount'))requested.readerCount=Number($('readerCount').value);
  for(const id of ['lectorProcession','collection','emhc','reservedCommunion'])if($(id))requested[id]=$(id).checked;
  for(const id of ['crucifix','crossStand'])if($(id))requested[id]=$(id).value;
  if(typeof gameScenarioOptions==='function')Object.assign(requested,gameScenarioOptions());
  scenario=buildScenario(requested);
  for(const id of ['incense','bothKinds'])$(id).checked=scenario.options[id];
  $('incense').disabled=!scenario.options.servers;
  $('bothKinds').disabled=!scenario.options.deacon;
  placeCrucifix(scenario.options.crucifix);
  if(figures.P)applyAppearance(readAppearance());
  for(const option of $('camera').options){
    if(figures[option.value])option.disabled=!scenario.visible.has(option.value);
  }
  if(figures[cameraMode]&&!scenario.visible.has(cameraMode))setCamera('P');
  const notes=[];
  if(!scenario.options.deacon)notes.push('Priest proclaims the Gospel, raises both vessels and dismisses the people.');
  if(!scenario.options.servers)notes.push('Priest or Deacon prepares the altar; fixtures stay in place. No incense or bell.');
  if(!scenario.options.lector)notes.push('Priest proclaims the readings and leads the Psalm.');
  if(!notes.length)notes.push('Priest, Deacon, lay readers and servers share their proper duties.');
  $('scenarioNote').textContent=notes.join(' ');
  $('serverAssignments').textContent=scenario.assignments.length
    ?scenario.assignments.join(' ')
    :'No servers: the Priest or Deacon handles the preparation.';
  for(const role of SERVER_ROLES){
    const text=role==='T'&&!scenario.options.incense?'Assistant':ROLE_NAMES[role];
    // Labels are rebuilt only when the displayed duty changes.
    const figure=figures[role];
    if(figure.root.userData.labelText!==text){
      figure.root.remove(figure.label);
      sceneLabels.splice(sceneLabels.indexOf(figure.label),1);
      figure.label.material.map.dispose();
      figure.label.material.dispose();
      figure.label=label(text,new THREE.Vector3(0,2,0));
      figure.root.add(figure.label);
      figure.root.userData.labelText=text;
    }
  }
  $('stepList').replaceChildren();
  let part='';
  STEPS.forEach((step,i)=>{
    if(step.part!==part){
      const heading=document.createElement('h3');heading.textContent=step.part;
      $('stepList').appendChild(heading);part=step.part;
    }
    const button=document.createElement('button');
    button.type='button';button.textContent=step.title;
    button.onclick=()=>jump(i);
    $('stepList').appendChild(button);
  });
  const index=STEPS.findIndex(step=>step.key>=key);
  jump(index<0?STEPS.length-1:index);
  if(featuresReady){refreshTraining();refreshSpeechStatus();}
}

function initialise(){
  if(!THREE.OrbitControls)throw new Error('OrbitControls did not load. Keep the vendor folder beside this page.');
  scene=new THREE.Scene();
  scene.background=new THREE.Color('#ccd9de');
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.9;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('viewport').appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive 3D church scene');
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();setPlaying(false);
    $('sceneStatus').hidden=false;
    $('sceneStatus').textContent='The browser lost its 3D graphics context. Reload this page to restore the scene.';
  });
  camera3d=new THREE.PerspectiveCamera(45,1,.1,120);
  controls=new THREE.OrbitControls(camera3d,renderer.domElement);
  controls.enableDamping=true;
  controls.dampingFactor=.08;
  controls.minDistance=1.2;controls.maxDistance=55;
  controls.maxPolarAngle=Math.PI/2-.035;
  scene.add(new THREE.HemisphereLight('#fff7e9','#8b8170',.85));
  const sun=new THREE.DirectionalLight('#fff1d1',.9);
  sun.position.set(-8,18,8);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:50});
  sun.shadow.bias=-.001;
  scene.add(sun);
  buildChurch();
  for(const role of Object.keys(ACTORS)){
    figures[role]=makeFigure(ACTORS[role].fill,role==='P'?'#d2aa86':'#b78866',role);
    const height=SERVER_HEIGHTS[role];
    if(height){figures[role].root.scale.set(height,height,height);figures[role].root.userData.baseScale=height;}
  }
  for(let y=356;y<=700;y+=34){
    for(const x of [185,255,325,395,605,675,745,815]){
      const i=congregation.length;
      const colors=['#6d899a','#997656','#767e59','#785961','#c6ac86'];
      const figure=makeFigure(colors[i%colors.length],['#c99970','#8a5538','#deb28c'][i%3],null);
      // Deterministic mix of adults and children so every load looks the same.
      const child=i%6===3;
      const height=child?.5+(i*7%9)/100:.72+(i*13%15)/100;
      figure.root.scale.set(height,height,height);
      figure.root.userData.baseScale=height;
      congregation.push({home:[x,y],figure});
    }
  }
  makeObjects();
  const resize=()=>{
    const {width,height}=$('viewport').getBoundingClientRect();
    camera3d.aspect=width/height;
    camera3d.updateProjectionMatrix();
    renderer.setSize(width,height);
  };
  new ResizeObserver(resize).observe($('viewport'));
  resize();
  setCamera('overview');
  applySetup();
  initialiseFeatures();
  applyAppearance(readAppearance());
  for(const id of ['deacon','serverCount','lector','incense','bothKinds','crucifix','crossStand','readerCount','lectorProcession','collection','emhc','reservedCommunion',...Object.keys(APPEARANCE_DEFAULTS).map(k=>'app_'+k)])if($(id))$(id).onchange=applySetup;
  $('camera').onchange=event=>setCamera(event.target.value);
  $('resetCamera').onclick=()=>setCamera(cameraMode);
  $('play3d').onclick=()=>{
    if(!playing3d&&cur3d===STEPS.length-1&&progress3d>=1)jump(0);
    setPlaying(!playing3d);
  };
  $('previous').onclick=()=>jump(progress3d>.15?cur3d:cur3d-1);
  $('next3d').onclick=()=>jump(cur3d+1);
  $('timeline').oninput=()=>{
    const elapsed=Number($('timeline').value)/10000*TOTAL;
    let index=0;
    while(index<STEPS.length-1&&stepStart[index+1]<=elapsed)index++;
    jump(index,(elapsed-stepStart[index])/STEPS[index].dur);
  };
  document.addEventListener('keydown',event=>{
    if(['INPUT','SELECT','BUTTON','TEXTAREA','A'].includes(event.target.tagName))return;
    if(event.code==='Space'){event.preventDefault();$('play3d').click();}
    if(event.code==='ArrowRight'){event.preventDefault();jump(cur3d+1);}
    if(event.code==='ArrowLeft'){event.preventDefault();jump(progress3d>.15?cur3d:cur3d-1);}
  });
  const raycaster=new THREE.Raycaster();
  let down=null;
  renderer.domElement.addEventListener('pointerdown',event=>{down=[event.clientX,event.clientY];});
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>5||event.button!==0)return;
    const rect=renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera3d);
    if(typeof gamePick==='function'&&gamePick(raycaster,event))return;
    const hits=raycaster.intersectObjects(Object.values(figures).filter(f=>f.root.visible).map(f=>f.root),true);
    for(const hit of hits){
      let root=hit.object;
      while(root&&!root.userData.role)root=root.parent;
      if(root){
        const role=root.userData.role;
        if(!$('camera').querySelector(`option[value="${role}"]`)){
          const option=document.createElement('option');option.value=role;option.textContent='Follow '+ROLE_NAMES[role].toLowerCase();
          $('camera').appendChild(option);
        }
        setCamera(role);break;
      }
    }
  });
  $('sceneStatus').hidden=true;
  let previousTime=performance.now();
  function frame(now){
    const dt=Math.min(.1,(now-previousTime)/1000);
    previousTime=now;
    if(playing3d&&!speechBusy){
      let elapsed=stepStart[cur3d]+progress3d*STEPS[cur3d].dur+dt*Number($('rate').value);
      elapsed=Math.min(elapsed,TOTAL);
      if(typeof gameTimeLimit==='function')elapsed=Math.min(elapsed,gameTimeLimit(elapsed));
      const old=cur3d;
      elapsed=interceptSpeech(elapsed);
      while(cur3d<STEPS.length-1&&elapsed>=stepStart[cur3d+1])cur3d++;
      progress3d=(elapsed-stepStart[cur3d])/STEPS[cur3d].dur;
      if(old!==cur3d)showStep();
      if(elapsed>=TOTAL&&!speechBusy)setPlaying(false);
    }
    renderFrame(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

try{
  initialise();
}catch(error){
  console.error('3D Mass could not start:',error);
  $('sceneStatus').hidden=false;
  $('sceneStatus').textContent='Unable to start the 3D scene: '+error.message+' Use the original floor-plan view, or try a browser with WebGL enabled.';
  $('play3d').disabled=true;
}
