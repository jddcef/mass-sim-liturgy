'use strict';

const PARISH_KEY='mass-parish-profile-v1',PARISH_DRAFT_KEY='mass-parish-draft-v1',PARISH_LIBRARY_KEY='mass-parish-library-v1';
const parishEditing={draft:null,before:null,legacy:null,library:[],preview:null,clock:0,clean:null,epoch:0};
const parishCopy=value=>JSON.parse(JSON.stringify(value));
function parishEditorOpen(){return !!$('parishEditor')?.open;}
function parishReport(error){
  console.error('Parish preparation:',error);
  $('parishEditorStatus').textContent=error.message;
}
function parishRead(key){
  const text=localStorage.getItem(key);
  return text?ChurchProfiles.validate(JSON.parse(text)):null;
}
function parishWrite(key,value){
  try{
    if(value===null)localStorage.removeItem(key);
    else localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(error){
    parishReport(new Error('Browser storage is unavailable. Export a profile to keep your work. '+error.message));
    return false;
  }
}
function clearParishPreview(){
  if(!parishEditing.preview)return;
  scene.remove(parishEditing.preview);
  parishEditing.preview.traverse(object=>{
    object.geometry?.dispose();
    if(object.material)object.material.dispose();
  });
  parishEditing.preview=null;
}
function anchorParishObject(object,point){
  const at=world(point);
  object.userData.parishAnchor=point.slice();
  object.userData.parishOffset=object.position.clone().sub(at).toArray();
  return object;
}
function refreshParishScene(){
  const p=ChurchProfiles.active;
  for(const group of pewGroups){
    for(const mesh of group.children){
      if(!mesh.userData.parishBase)mesh.userData.parishBase={x:mesh.position.x,z:mesh.position.z};
      const b=mesh.userData.parishBase,plan=[b.x/SCALE+500,b.z/SCALE+440];
      const mapped=ChurchProfiles.mapNave(plan);
      mesh.position.x=(mapped[0]-500)*SCALE;mesh.position.z=(mapped[1]-440)*SCALE;
      const w=mesh.geometry.parameters.width/SCALE,d=mesh.geometry.parameters.depth/SCALE;
      const left=ChurchProfiles.mapNave([plan[0]-w/2,plan[1]]);
      const right=ChurchProfiles.mapNave([plan[0]+w/2,plan[1]]);
      const front=ChurchProfiles.mapNave([plan[0],plan[1]-d/2]);
      const back=ChurchProfiles.mapNave([plan[0],plan[1]+d/2]);
      mesh.position.x=((left[0]+right[0])/2-500)*SCALE;
      mesh.position.z=((front[1]+back[1])/2-440)*SCALE;
      mesh.scale.x=(right[0]-left[0])/w;mesh.scale.z=(back[1]-front[1])/d;
    }
  }
  if(p){
    churchLayout=parishCopy(p.fixtures);
    setNaveStyle(p.seating.style);
  }
  for(const object of scene.children){
    if(object.userData.parishAnchor){
      object.position.copy(world(object.userData.parishAnchor)).add(new THREE.Vector3().fromArray(object.userData.parishOffset));
    }
  }
  if(parishExterior){
    parishExterior.visible=!!p?.shell.exterior;
    for(const mesh of parishExterior.children){
      mesh.material.color.set(p?.shell[mesh.userData.parishColour]||'#c4b69d');
    }
  }
  if(typeof game!=='undefined'&&game.doors){
    game.doors.main.forEach((pivot,i)=>{
      pivot.position.x=((p?.doors.main||500)-500)*SCALE+(i===0?-1:1)*1.275;
    });
    game.doors.sacristy.position.z=world([1222,p?.doors.sacristy||130]).z;
  }
  // The original back wall has its own cloned material, so other shared finishes stay untouched.
  const backWall=fadingWalls.find(w=>w.mesh.userData.parishBack);
  if(backWall)backWall.mesh.material.color.set(p?.shell.wall||'#c4b69d');
  fadingWalls.forEach(w=>{w.box=null;});
  refreshFurniture();
  if(featuresReady)refreshLayoutFields();
  const activeLabel=p?p.name+' (revision '+p.revision+')':'Legacy layout';
  for(const id of ['applyPreset','applyLayout','resetLayout','exportLayout','importLayout','layoutX','layoutY','app_nave','app_tabernacle']){
    if($(id))$(id).disabled=!!p;
  }
  if($('parishActive'))$('parishActive').textContent=activeLabel;
  if($('parishSetupName'))$('parishSetupName').textContent=activeLabel;
}
function useParish(value){
  ChurchProfiles.activate(value);
  if(!value&&parishEditing.legacy){
    churchLayout=parishCopy(parishEditing.legacy.layout);
    setNaveStyle(parishEditing.legacy.nave);
  }
  refreshParishScene();
  setPlaying(false);
  renderFrame();
}
function parishOptions(){
  const select=$('parishSelect');
  select.replaceChildren();
  const options=[['legacy','Legacy layout'],...ChurchProfiles.published().map(p=>[p.id,p.name])];
  options.push(...parishEditing.library.map(p=>['local:'+p.id,'Local: '+p.name]));
  const p=ChurchProfiles.active;
  const local=p&&parishEditing.library.some(item=>JSON.stringify(item)===JSON.stringify(p));
  const published=p&&ChurchProfiles.published().some(item=>JSON.stringify(item)===JSON.stringify(p));
  if(p&&!local&&!published)options.push(['current','Current selection: '+p.name]);
  for(const [value,text] of options){
    const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);
  }
  select.value=p?(local?'local:'+p.id:published?p.id:'current'):'legacy';
}
function parishChoose(){
  if(parishEditorOpen())throw new Error('Apply or cancel the working copy before selecting another church.');
  if(typeof game!=='undefined'&&game.role&&!['setup','summary'].includes(game.phase))throw new Error('Finish the current game before changing the church.');
  const id=$('parishSelect').value;
  const value=id==='legacy'?null:id==='current'?ChurchProfiles.active:id.startsWith('local:')?parishEditing.library.find(p=>p.id===id.slice(6)):ChurchProfiles.published().find(p=>p.id===id);
  if(id!=='legacy'&&!value)throw new Error('Unknown church profile.');
  if(!ChurchProfiles.active)parishEditing.legacy={layout:parishCopy(churchLayout),nave:naveStyle};
  useParish(value);
  const saved=parishWrite(PARISH_KEY,value);
  parishOptions();
  $('parishStatus').textContent=saved?'Church selection saved in this browser.':'Church selected for this visit only; browser storage failed. Export to keep a copy.';
}
function parishFields(){
  const p=parishEditing.draft;
  for(const input of $('parishForm').querySelectorAll('[data-profile]')){
    const path=input.dataset.profile.split('.');
    const value=path.reduce((object,key)=>object[key],p);
    if(input.type==='checkbox')input.checked=value;else input.value=value;
  }
  const id=$('parishObject').value;
  const pos=p.fixtures[id]||p.routes[id];
  $('parishX').value=pos?pos[0]:id==='mainDoor'?p.doors.main:1222;
  $('parishY').value=pos?pos[1]:id==='mainDoor'?882:p.doors.sacristy;
  $('parishX').disabled=id==='sacristyDoor';
  $('parishY').disabled=id==='mainDoor';
}
function parishCapture(){
  const p=parishEditing.draft;
  for(const input of $('parishForm').querySelectorAll('[data-profile]')){
    const path=input.dataset.profile.split('.'),key=path.pop();
    const object=path.reduce((item,name)=>item[name],p);
    object[key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
  }
}
function parishMove(){
  parishCapture();
  const p=parishEditing.draft,id=$('parishObject').value;
  const point=[Number($('parishX').value),Number($('parishY').value)];
  if(Object.hasOwn(p.fixtures,id))p.fixtures[id]=point;
  else if(Object.hasOwn(p.routes,id))p.routes[id]=point;
  else if(id==='mainDoor')p.doors.main=point[0];
  else p.doors.sacristy=point[1];
  parishPlan();
}
function parishPlan(){
  const p=parishEditing.draft,svg=$('parishPlan');
  const ns='http://www.w3.org/2000/svg';
  const node=(tag,attrs,text)=>{
    const n=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attrs))n.setAttribute(key,value);
    if(text)n.textContent=text;svg.append(n);return n;
  };
  svg.replaceChildren();
  node('rect',{x:40,y:12,width:920,height:830,fill:'#f4efdf',stroke:'#57544b'});
  node('rect',{x:1000,y:34,width:222,height:232,fill:'#e4ddcc',stroke:'#57544b'});
  node('path',{d:'M 975 215 L 1040 215',stroke:'#57544b','stroke-width':8,fill:'none'});
  node('line',{x1:40,y1:300,x2:960,y2:300,stroke:'#928779','stroke-width':8});
  const selected=$('parishObject').value;
  const planNames={altar:'Altar',ambo:'Ambo',chair:'Chairs',credence:'Credence',ministers:'Servers',tabernacle:'Tabernacle'};
  for(const rect of ChurchProfiles.zones(p.seating.style)){
    const a=ChurchProfiles.mapNave(rect.slice(0,2),p),b=ChurchProfiles.mapNave(rect.slice(2),p);
    node('rect',{x:a[0],y:a[1],width:b[0]-a[0],height:b[1]-a[1],fill:'#b29574'});
  }
  for(const [id,point] of Object.entries(p.fixtures)){
    node('circle',{cx:point[0],cy:point[1],r:18,fill:id===selected?'#ad4428':'#446870','data-parish-object':id});
    node('text',{x:point[0]+22,y:point[1]+6,'font-size':26},planNames[id]);
  }
  for(const [id,point] of Object.entries(p.routes)){
    const at=ChurchProfiles.mapNave(point,p);
    const inactive=p.seating.style==='full'&&!id.startsWith('centre');
    node('circle',{cx:at[0],cy:at[1],r:10,fill:id===selected?'#ad4428':inactive?'#888888':'#537f34','data-parish-object':id});
  }
  for(const [id,at] of [['mainDoor',[p.doors.main,882]],['sacristyDoor',[1222,p.doors.sacristy]]]){
    node('circle',{cx:at[0],cy:at[1],r:16,fill:id===selected?'#ad4428':'#a17620','data-parish-object':id});
  }
  try{
    const checks=ChurchProfiles.checks(p);
    const r=checks[Number($('parishRoute').value)];
    const points=[r.from,...r.path].map(at=>ChurchProfiles.mapNave(at,p).join(',')).join(' ');
    node('polyline',{points,fill:'none',stroke:'#1752ba','stroke-width':7,'pointer-events':'none'});
    $('parishRouteStatus').textContent=r.name+': connected. Blue line includes movement along a pew row. Checks cover nave aisles, not every sanctuary movement or collision.';
  }catch(error){
    $('parishRouteStatus').textContent='Not ready for preview: '+error.message;
  }
}
function previewParish(){
  parishCapture();
  const p=ChurchProfiles.validate(parishEditing.draft),routes=ChurchProfiles.checks(p);
  clearParishPreview();
  useParish(p);
  const route=routes[Number($('parishRoute').value)];
  const points=[route.from,...route.path].map(at=>world(at,.12));
  const group=new THREE.Group();
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#1752ba',depthTest:false})));
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshBasicMaterial({color:'#ad4428',depthTest:false}));
  group.add(marker);group.userData.points=points;group.userData.marker=marker;
  group.renderOrder=1000;
  scene.add(group);parishEditing.preview=group;parishEditing.clock=0;
  setCamera('overhead');
  $('parishEditorStatus').textContent='Temporary 3D preview. Apply to keep it, or Cancel to restore the previous church.';
  parishPlan();
  $('parishEditor').classList.add('parishCompact');
  $('parishToggle').textContent='Expand editor';
  $('parishToggle').focus();
}
function updateParishPreview(dt){
  const group=parishEditing.preview;
  if(!group)return;
  const points=group.userData.points;
  parishEditing.clock=(parishEditing.clock+dt*.3)%(points.length-1);
  const i=Math.floor(parishEditing.clock);
  group.userData.marker.position.copy(points[i]).lerp(points[i+1],parishEditing.clock-i);
}
function openParishEditor(){
  if(parishEditorOpen())return;
  if(typeof game!=='undefined'&&game.role&&!['setup','summary'].includes(game.phase))throw new Error('Finish the current game before editing a parish.');
  setPlaying(false);
  parishEditing.before={profile:ChurchProfiles.active?parishCopy(ChurchProfiles.active):null,
    layout:parishCopy(churchLayout),nave:naveStyle,camera:cameraMode,setupVisible:$('gameSetup')&&!$('gameSetup').hidden};
  if(!ChurchProfiles.active)parishEditing.legacy={layout:parishCopy(churchLayout),nave:naveStyle};
  parishEditing.draft=ChurchProfiles.active?parishCopy(ChurchProfiles.active):ChurchProfiles.base();
  parishEditing.epoch++;
  $('parishEditorStatus').textContent='';
  try{
    const saved=parishRead(PARISH_DRAFT_KEY);
    if(saved&&saved.id===parishEditing.draft.id){
      parishEditing.draft=saved;
      $('parishEditorStatus').textContent='Saved working copy loaded; it has not been applied.';
    }
  }catch(error){parishReport(new Error('Saved working copy could not be loaded: '+error.message));}
  parishEditing.clean=JSON.stringify(parishEditing.draft);
  if($('gameSetup'))$('gameSetup').hidden=true;
  $('parishEditor').classList.remove('parishCompact');
  $('parishToggle').textContent='Collapse editor to view scene';
  $('parishEditor').show();
  parishFields();parishPlan();$('parishName').focus();
}
function closeParishEditor(keep){
  parishEditing.epoch++;
  if(!keep){
    ChurchProfiles.activate(parishEditing.before.profile);
    churchLayout=parishCopy(parishEditing.before.layout);
    setNaveStyle(parishEditing.before.nave);
    refreshParishScene();
  }
  clearParishPreview();
  $('parishEditor').close();
  if($('gameSetup'))$('gameSetup').hidden=!parishEditing.before.setupVisible;
  setCamera(parishEditing.before.camera);
  renderFrame();
}
function applyParishDraft(){
  parishCapture();
  const p=ChurchProfiles.validate(parishEditing.draft);
  ChurchProfiles.checks(p);
  if(!parishEditing.library.some(item=>item.id===p.id)&&parishEditing.library.length>=50)throw new Error('This browser already holds 50 local church profiles. Export your work before using another browser profile.');
  useParish(p);
  parishEditing.library=parishEditing.library.filter(item=>item.id!==p.id).concat([parishCopy(p)]);
  const saved=parishWrite(PARISH_LIBRARY_KEY,parishEditing.library)&&parishWrite(PARISH_KEY,p);
  // A successfully applied profile is also the next working-copy starting point.
  if(saved)parishWrite(PARISH_DRAFT_KEY,p);
  parishOptions();
  closeParishEditor(true);
  $('parishStatus').textContent=saved?'Local profile applied and saved. Export a portable backup.':'Profile applied for this visit only; storage failed. Export a portable backup.';
}
function initialiseParishEditor(){
  const tools=$('parishTools');
  tools.innerHTML='<h2>Parish preparation</h2><label class="field">Church <select id="parishSelect"></select></label>'+
    '<button id="parishUse" type="button">Use selected church</button> <button id="parishEdit" type="button">Prepare a parish</button>'+
    '<p id="parishActive" class="small"></p><p id="parishStatus" class="small" role="status"></p>'+
    '<p class="small">Maintainer tool for the prepared rectangular shell. Finish the current game before changing church. No photos are uploaded.</p>';
  const dialog=document.createElement('dialog');
  dialog.id='parishEditor';dialog.setAttribute('aria-labelledby','parishEditorTitle');
  dialog.innerHTML='<form id="parishForm"><h2 id="parishEditorTitle">Prepare a parish</h2>'+
    '<button id="parishToggle" type="button">Collapse editor to view scene</button>'+
    '<p class="small">Reference plan: 40 units = 1 metre. Fixed rectangular shell, one sanctuary level and right-hand sacristy. This is not an architectural modeller. Door leaves stay within prepared openings; rotations and new openings are not supported.</p>'+
    '<div class="parishGrid"><label>Name <input id="parishName" data-profile="name" maxlength="100"></label>'+
    '<label>Stable church ID <input data-profile="id" maxlength="64"></label>'+
    '<label>Revision <input data-profile="revision" type="number" min="1" step="1"></label>'+
    '<label>Seating <select data-profile="seating.style"><option value="aisles">Centre and side aisles</option><option value="full">Centre aisle only</option></select></label>'+
    '<label>Wall colour <input data-profile="shell.wall" type="color"></label>'+
    '<label>Roof colour <input data-profile="shell.roof" type="color"></label>'+
    '<label><input data-profile="shell.exterior" type="checkbox"> Show exterior shell</label></div>'+
    '<details><summary>Pew block boundaries (plan units)</summary><div class="parishGrid">'+
    [['left',130,200],['leftEnd',410,455],['right',545,590],['rightEnd',800,870],['front',350,390],['back',680,715]].map(([id,min,max])=>
      '<label>'+({left:'Left outer',leftEnd:'Left inner',right:'Right inner',rightEnd:'Right outer',front:'First row',back:'Last row'})[id]+
      ' <input data-profile="seating.'+id+'" type="number" min="'+min+'" max="'+max+'" step="1"></label>').join('')+
    '</div><p class="small">Edges describe the side-aisle template; centre-aisle-only seating extends the outer benches towards the walls. Row count stays fixed. Seats, people and aisle routes deform together.</p></details>'+
    '<label class="field">Furniture, door or waypoint <select id="parishObject"></select></label>'+
    '<div class="parishGrid"><label>Reference X <input id="parishX" type="number" step="1"></label>'+
    '<label>Reference depth <input id="parishY" type="number" step="1"></label></div>'+
    '<button id="parishMove" type="button">Update position</button>'+
    '<p class="small">Waypoints use reference-plan coordinates; the plan shows their transformed position. Sanctuary furniture uses plan coordinates directly. Green points are aisle waypoints; gold points are doors. Centre-aisle-only seating ignores the grey side waypoints.</p>'+
    '<label class="field">Route preview <select id="parishRoute"></select></label>'+
    '<svg id="parishPlan" viewBox="0 0 1270 990" role="img" aria-label="Parish floor plan and selected training route"></svg>'+
    '<p id="parishRouteStatus" class="small"></p>'+
    '<div class="parishActions"><button id="parishPreview" type="button">Preview in 3D</button>'+
    '<button id="parishSave" type="button">Save working copy</button>'+
    '<button id="parishReset" type="button">Reset draft to published</button>'+
    '<button id="parishExport" type="button">Export full profile</button></div>'+
    '<label class="field">Import full profile JSON <input id="parishImport" type="file" accept=".json,application/json"></label>'+
    '<p class="small">Import only replaces this working copy. Apply changes your local church, not the published profile. Export downloads a file; send it manually for review. New photos/models travel separately. User patch export is planned, not implemented.</p>'+
    '<p id="parishEditorStatus" role="status"></p>'+
    '<div class="parishActions parishFinish"><button id="parishApply" type="submit">Apply locally</button><button id="parishCancel" type="button">Cancel / discard unsaved edits</button></div></form>';
  document.body.append(dialog);
  const guard=fn=>(...args)=>{try{return fn(...args);}catch(error){parishReport(error);$('parishStatus').textContent=error.message;}};
  $('parishForm').onsubmit=event=>{event.preventDefault();guard(applyParishDraft)();};
  $('parishForm').addEventListener('change',event=>{
    if(event.target.matches('[data-profile]')){parishCapture();parishPlan();}
  });
  $('parishForm').addEventListener('input',event=>{
    if(event.target.id==='parishX'||event.target.id==='parishY')parishMove();
  });
  const objectSelect=$('parishObject');
  const objectNames={...ChurchProfiles.names,mainDoor:'Main doors (centre X)',sacristyDoor:'Sacristy service door (depth)',
    ...Object.fromEntries(Object.keys(ChurchProfiles.base().routes).map(id=>[id,'Waypoint: '+id]))};
  for(const [value,text] of Object.entries(objectNames)){
    const option=document.createElement('option');option.value=value;option.textContent=text;objectSelect.append(option);
  }
  objectSelect.onchange=()=>{parishFields();parishPlan();};
  for(const [i,route] of ChurchProfiles.checks(ChurchProfiles.base()).entries()){
    const option=document.createElement('option');option.value=i;option.textContent=route.name;$('parishRoute').append(option);
  }
  $('parishRoute').onchange=parishPlan;
  $('parishPlan').onclick=event=>{
    const id=event.target.dataset.parishObject;
    if(id){objectSelect.value=id;parishFields();parishPlan();}
  };
  $('parishMove').onclick=guard(parishMove);
  $('parishPreview').onclick=guard(previewParish);
  $('parishToggle').onclick=()=>{
    const compact=dialog.classList.toggle('parishCompact');
    $('parishToggle').textContent=compact?'Expand editor':'Collapse editor to view scene';
  };
  $('parishSave').onclick=guard(()=>{
    parishCapture();
    const p=ChurchProfiles.validate(parishEditing.draft);
    if(parishWrite(PARISH_DRAFT_KEY,p)){
      parishEditing.clean=JSON.stringify(p);
      $('parishEditorStatus').textContent='Working copy saved in this browser; not applied. Export for a portable copy.';
    }
  });
  $('parishReset').onclick=()=>{
    parishEditing.epoch++;
    parishEditing.draft=ChurchProfiles.published().find(p=>p.id===parishEditing.draft.id)||ChurchProfiles.base();
    parishFields();parishPlan();
    $('parishEditorStatus').textContent='Draft reset to the published template. Preview or Apply to use it; saved copies are unchanged.';
  };
  $('parishExport').onclick=guard(()=>{
    parishCapture();const p=ChurchProfiles.validate(parishEditing.draft);
    downloadJSON(p.id+'-r'+p.revision+'.json',p);
    $('parishEditorStatus').textContent='Profile download requested. Keep the exported file for backup or manual review.';
  });
  $('parishImport').onchange=async event=>{
    const file=event.target.files[0];
    if(!file)return;
    const epoch=++parishEditing.epoch;
    try{
      if(file.size>65536)throw new Error('Church profiles must be at most 64 KB.');
      const p=ChurchProfiles.validate(JSON.parse(await file.text()));
      ChurchProfiles.checks(p);
      if(epoch!==parishEditing.epoch||!parishEditorOpen())return;
      parishEditing.draft=p;parishFields();parishPlan();
      $('parishEditorStatus').textContent='Imported into the working copy only. Preview, then Apply locally if appropriate.';
    }catch(error){parishReport(error);}
    finally{event.target.value='';}
  };
  $('parishCancel').onclick=()=>closeParishEditor(false);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeParishEditor(false);});
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();closeParishEditor(false);}
  });
  $('parishEdit').onclick=guard(openParishEditor);
  if($('editParishSetup'))$('editParishSetup').onclick=guard(openParishEditor);
  $('parishUse').onclick=guard(parishChoose);
  parishEditing.legacy={layout:parishCopy(churchLayout),nave:naveStyle};
  try{
    const text=localStorage.getItem(PARISH_LIBRARY_KEY);
    if(text){
      const data=JSON.parse(text);
      if(!Array.isArray(data)||data.length>50)throw new Error('Local church library must contain at most 50 profiles.');
      const profiles=data.map(item=>ChurchProfiles.validate(item));
      if(new Set(profiles.map(p=>p.id)).size!==profiles.length)throw new Error('Local church library has duplicate IDs.');
      parishEditing.library=profiles;
    }
    const saved=parishRead(PARISH_KEY);
    if(saved){
      useParish(saved);
    }
  }catch(error){parishReport(new Error('Saved parish could not be loaded: '+error.message));$('parishStatus').textContent=$('parishEditorStatus').textContent;}
  parishOptions();refreshParishScene();
  window.addEventListener('beforeunload',event=>{
    if(!parishEditorOpen())return;
    parishCapture();
    if(JSON.stringify(parishEditing.draft)!==parishEditing.clean){
      event.preventDefault();event.returnValue='';
    }
  });
}
