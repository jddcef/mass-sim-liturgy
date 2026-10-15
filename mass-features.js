'use strict';

const LAYOUT_DEFAULTS={
  altar:[500,170],ambo:[200,245],chair:[500,58],
  credence:[866,130],ministers:[700,55],tabernacle:[137,85]
};
const LAYOUT_ZONES={
  altar:[350,690,100,275],ambo:[140,280,175,285],
  chair:[425,580,25,95],credence:[810,930,100,185],
  ministers:[615,805,25,90],tabernacle:[110,165,60,115]
};
const LAYOUT_NAMES={altar:'Altar',ambo:'Ambo',chair:'Celebrant and deacon chairs',credence:'Credence table',ministers:'Servers\' bench',tabernacle:'Tabernacle'};
const LAYOUT_PRESETS={
  standard:{name:'Central altar / left ambo',positions:LAYOUT_DEFAULTS},
  mirrored:{name:'Central altar / right ambo',positions:{
    altar:[500,170],ambo:[800,245],chair:[500,58],
    credence:[200,130],ministers:[300,55],tabernacle:[863,85]
  }},
  compact:{name:'Compact chapel sanctuary',positions:{
    altar:[500,190],ambo:[320,235],chair:[500,65],
    credence:[740,180],ministers:[685,65],tabernacle:[180,85]
  }},
  broad:{name:'Broad sanctuary / side chair',positions:{
    altar:[500,185],ambo:[220,225],chair:[320,65],
    credence:[830,160],ministers:[700,55],tabernacle:[150,85]
  }},
  axial:{name:'Central tabernacle / side chair',positions:{
    altar:[500,205],ambo:[200,245],chair:[320,65],
    credence:[866,130],ministers:[700,55],tabernacle:[500,55]
  }}
};
let churchLayout=structuredClone(LAYOUT_DEFAULTS);
const furnitureGroups={};
let trainingRole=null;
let featuresReady=false;

function validateLayout(value){
  if(!value||typeof value!=='object')throw new Error('A layout must contain furniture positions.');
  const result={};
  for(const name of Object.keys(LAYOUT_DEFAULTS)){
    const p=value[name];
    if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))throw new Error('Invalid position for '+name+'.');
    if(p[0]<100||p[0]>900||p[1]<35||p[1]>260)throw new Error('Keep '+name+' within the sanctuary (X 100-900, depth 35-260).');
    result[name]=p.slice();
  }
  for(const name of ['ambo','chair','credence','ministers','tabernacle']){
    if(Math.hypot(result[name][0]-result.altar[0],result[name][1]-result.altar[1])<100){
      throw new Error('Keep '+name+' at least 100 layout units from the altar for clearance.');
    }
  }
  return result;
}

function layoutPoint(point){
  let weightSum=0,dx=0,dy=0;
  const full=[];
  for(const [name,[left,right,top,bottom]] of Object.entries(LAYOUT_ZONES)){
    const distance=Math.hypot(Math.max(left-point[0],0,point[0]-right),Math.max(top-point[1],0,point[1]-bottom));
    const weight=1-ease(distance/45);
    if(weight===1)full.push(name);
    if(weight>0){
      weightSum+=weight;
      dx+=weight*(churchLayout[name][0]-LAYOUT_DEFAULTS[name][0]);
      dy+=weight*(churchLayout[name][1]-LAYOUT_DEFAULTS[name][1]);
    }
  }
  if(full.length){
    const name=full[0];
    return [point[0]+churchLayout[name][0]-LAYOUT_DEFAULTS[name][0],point[1]+churchLayout[name][1]-LAYOUT_DEFAULTS[name][1]];
  }
  const divisor=Math.max(1,weightSum);
  return [point[0]+dx/divisor,point[1]+dy/divisor];
}

function collectFurniture(name,firstIndex){
  const group=new THREE.Group();
  const children=scene.children.slice(firstIndex);
  children.forEach(child=>group.add(child));
  scene.add(group);
  furnitureGroups[name]=group;
}

function refreshFurniture(){
  for(const [name,group] of Object.entries(furnitureGroups)){
    const p=churchLayout[name],base=LAYOUT_DEFAULTS[name];
    group.position.set((p[0]-base[0])*SCALE,0,(p[1]-base[1])*SCALE);
  }
  for(const sprite of sceneLabels){
    if(sprite.userData.fixture){
      sprite.position.copy(world(sprite.userData.canonical,1.95));
    }
    if($('layoutPreset')){
      const match=Object.entries(LAYOUT_PRESETS).find(([,preset])=>
        Object.keys(LAYOUT_DEFAULTS).every(key=>preset.positions[key].every((n,i)=>n===churchLayout[key][i])));
      $('layoutPreset').value=match?match[0]:'custom';
    }
  }
}

function reportFeature(id,error){
  console.error(id,error);
  $(id).textContent=error.message;
}

function downloadJSON(filename,data){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function refreshLayoutFields(){
  const p=churchLayout[$('layoutItem').value];
  $('layoutX').value=p[0];$('layoutY').value=p[1];
}

function commitLayout(candidate){
  const validated=validateLayout(candidate);
  setPlaying(false);
  churchLayout=validated;
  if($('app_tabernacle'))$('app_tabernacle').value='custom';
  refreshFurniture();
  refreshLayoutFields();
  renderFrame();
  setCamera(cameraMode);
  try{
    localStorage.setItem('mass-church-layout-v1',JSON.stringify(churchLayout));
    $('layoutStatus').textContent='Layout saved in this browser.';
  }catch(error){
    reportFeature('layoutStatus',new Error('Layout applied, but browser storage is unavailable. Export it to keep a copy. '+error.message));
  }
}

function serverDuties(role){
  const duties=[];
  STEPS.forEach((step,index)=>{
    for(const [text,a,b] of step.acts?.[role]||[]){
      if(text)duties.push({text,index,a,b,type:'gesture'});
    }
    for(const movement of segs(step.mv?.[role])){
      const end=movement.p[movement.p.length-1];
      duties.push({text:'Move to '+destinationName(end)+'.',index,a:movement.a,b:movement.b,type:'movement'});
    }
    for(const [name,events] of Object.entries(step.props||{})){
      for(const event of events){
        if(event.by===role)duties.push({text:'Take or carry '+name.replace('cand','candle ')+'.',index,a:event.t,b:Math.min(1,event.t+.08),type:'object'});
      }
    }
    if(role==='S'){
      for(const [a,b] of step.bell||[])duties.push({text:'Ring the bell.',index,a,b,type:'gesture'});
    }
  });
  return duties.sort((a,b)=>a.index-b.index||a.a-b.a||a.text.localeCompare(b.text));
}

function destinationName(p){
  if(p[1]>830)return 'the exit';
  if(p[1]>300)return 'the aisle or nave';
  if(p[0]<280)return 'the ambo';
  if(p[0]>800)return 'the credence table';
  if(p[1]<95)return 'the seats in the sanctuary';
  return 'the altar area';
}

let trainingDuties=[];
function refreshTraining(){
  const previous=$('trainingServer').value;
  const team=scenario.team;
  $('trainingServer').replaceChildren();
  team.forEach((role,i)=>{
    const option=document.createElement('option');
    option.value=role;
    option.textContent='Server '+(i+1)+' - '+(role==='T'&&!scenario.options.incense?'Assistant':ROLE_NAMES[role]);
    $('trainingServer').appendChild(option);
  });
  if(team.includes(previous))$('trainingServer').value=previous;
  $('trainingEnabled').disabled=!team.length;
  $('trainingServer').disabled=!team.length;
  if(!team.length)$('trainingEnabled').checked=false;
  chooseTrainingServer();
}

function chooseTrainingServer(){
  trainingRole=$('trainingEnabled').checked?$('trainingServer').value:null;
  trainingDuties=trainingRole?serverDuties(trainingRole):[];
  if(trainingRole){
    if(!$('camera').querySelector(`option[value="${trainingRole}"]`)){
      const option=document.createElement('option');
      option.value=trainingRole;option.textContent='Follow '+ROLE_NAMES[trainingRole].toLowerCase();
      $('camera').appendChild(option);
    }
    setCamera(trainingRole);
  }
  updateTraining();
}

function updateTraining(){
  if(!featuresReady)return;
  const panel=$('trainingOverlay');
  panel.hidden=!trainingRole;
  if(!trainingRole){
    $('trainingNow').textContent=scenario.options.servers?'Enable training to follow a server and see their duties.':'Add a server to use training mode.';
    $('trainingNext').textContent='';
    $('nextDuty').disabled=true;
    return;
  }
  const now=trainingDuties.filter(d=>d.index===cur3d&&progress3d>=d.a&&progress3d<=d.b);
  const next=trainingDuties.find(d=>d.index>cur3d||(d.index===cur3d&&d.a>progress3d+.0001));
  const current=now.map(d=>d.text).join(' / ')||'Wait in place and attend to the rite.';
  const upcoming=next?STEPS[next.index].title+': '+next.text:'No further duties in this celebration.';
  $('trainingNow').textContent=current;
  $('trainingNext').textContent=upcoming;
  panel.textContent=$('trainingServer').selectedOptions[0].textContent+' | Now: '+current+' | Next: '+upcoming;
  $('nextDuty').disabled=!next;
}

function initialiseFeatures(){
  featuresReady=true;
  for(const [key,preset] of Object.entries(LAYOUT_PRESETS)){
    const option=document.createElement('option');option.value=key;option.textContent=preset.name;
    $('layoutPreset').appendChild(option);
  }
  const custom=document.createElement('option');custom.value='custom';custom.textContent='Custom arrangement';custom.disabled=true;
  $('layoutPreset').appendChild(custom);
  $('applyPreset').onclick=()=>{
    const preset=LAYOUT_PRESETS[$('layoutPreset').value];
    if(!preset)return;
    try{commitLayout(structuredClone(preset.positions));}catch(error){reportFeature('layoutStatus',error);}
  };
  try{
    const saved=localStorage.getItem('mass-church-layout-v1');
    if(saved){churchLayout=validateLayout(JSON.parse(saved));refreshFurniture();}
  }catch(error){reportFeature('layoutStatus',new Error('Saved layout could not be loaded: '+error.message));}
  for(const [name,title] of Object.entries(LAYOUT_NAMES)){
    const option=document.createElement('option');option.value=name;option.textContent=title;
    $('layoutItem').appendChild(option);
  }
  refreshLayoutFields();
  refreshFurniture();
  $('layoutItem').onchange=refreshLayoutFields;
  $('applyLayout').onclick=()=>{
    const candidate=structuredClone(churchLayout);
    candidate[$('layoutItem').value]=[Number($('layoutX').value),Number($('layoutY').value)];
    try{commitLayout(candidate);}catch(error){reportFeature('layoutStatus',error);}
  };
  $('resetLayout').onclick=()=>commitLayout(structuredClone(LAYOUT_DEFAULTS));
  $('exportLayout').onclick=()=>downloadJSON('church-layout.json',churchLayout);
  $('importLayout').onchange=async event=>{
    const file=event.target.files[0];
    if(!file)return;
    try{
      if(file.size>20000)throw new Error('Layout files must be smaller than 20 KB.');
      commitLayout(JSON.parse(await file.text()));
    }catch(error){reportFeature('layoutStatus',error);}
    event.target.value='';
  };
  $('trainingEnabled').onchange=chooseTrainingServer;
  $('trainingServer').onchange=chooseTrainingServer;
  $('nextDuty').onclick=()=>{
    const next=trainingDuties.find(d=>d.index>cur3d||(d.index===cur3d&&d.a>progress3d+.0001));
    if(next){setPlaying(false);jump(next.index,next.a);}
  };
  refreshTraining();
  initialiseSpeech();
}
