'use strict';
// Round 8 helpers for the game page: hover names, the search box with its index card, and feedback.

// ---------- hover names ----------
const HOVER_DELAY=650;
const hoverTip={timer:0,x:0,y:0,node:null};
function nameUnderPointer(clientX,clientY){
  const rect=renderer.domElement.getBoundingClientRect();
  const raycaster=new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),camera3d);
  const candidates=[];
  const add=(root,name)=>{if(root&&root.visible)candidates.push([root,name]);};
  for(const [key,figure] of Object.entries(figures)){
    if(key==='player'){add(figure.root,'You: '+roleLabel(game.role||'P'));continue;}
    add(figure.root,(key===game.role?'You: ':'')+roleLabel(key));
  }
  congregation.forEach(person=>add(person.figure.root,person.figure.root.scale.y<.62?'A child in the congregation':'Member of the congregation'));
  for(const [key,object] of Object.entries(objects))add(object,SEARCH_OBJECTS[key]?.name||key);
  for(const [key,group] of Object.entries(furnitureGroups))add(group,LAYOUT_NAMES[key]||key);
  const roots=candidates.map(([root])=>root);
  for(const hit of raycaster.intersectObjects(roots,true)){
    let node=hit.object;
    while(node){
      if(node.userData.tip)return node.userData.tip;
      const found=candidates.find(([root])=>root===node);
      if(found)return found[1];
      node=node.parent;
    }
  }
  return null;
}
function hideHoverTip(){
  clearTimeout(hoverTip.timer);
  if(hoverTip.node)hoverTip.node.hidden=true;
}
function initialiseHoverTips(){
  const canvas=renderer?.domElement;
  if(!canvas)return;
  hoverTip.node=el('div',{id:'hoverTip',role:'tooltip',hidden:true});
  $('viewport').append(hoverTip.node);
  canvas.addEventListener('pointermove',event=>{
    hideHoverTip();
    if(event.buttons||event.pointerType==='touch')return;
    hoverTip.x=event.clientX;hoverTip.y=event.clientY;
    hoverTip.timer=setTimeout(()=>{
      const name=nameUnderPointer(hoverTip.x,hoverTip.y);
      if(!name)return;
      const box=$('viewport').getBoundingClientRect();
      hoverTip.node.textContent=name;
      hoverTip.node.style.left=Math.min(hoverTip.x-box.left+14,box.width-220)+'px';
      hoverTip.node.style.top=(hoverTip.y-box.top+16)+'px';
      hoverTip.node.hidden=false;
    },HOVER_DELAY);
  });
  canvas.addEventListener('pointerleave',hideHoverTip);
  canvas.addEventListener('pointerdown',hideHoverTip);
  canvas.addEventListener('wheel',hideHoverTip,{passive:true});
}

// ---------- search ----------
const search={entries:[],open:false,saved:null,pinned:null,expanded:new Set()};
function searchRoles(){
  const keys=new Set();
  for(const key of Object.keys(figures)){
    if(key==='player')continue;
    if(scenario.visible.has(key)||(EXTRA_FIGURES[key]&&figures[key].root.visible)||key===game.role)keys.add(key);
  }
  return [...keys].map(key=>({key,name:roleLabel(key),icon:typeof ROLE_ICONS!=='undefined'?ROLE_ICONS[key]:'person'}));
}
function searchTarget(entry){
  if(entry.kind==='role'){
    const figure=entry.key===game.role&&figures.player?.root.visible?figures.player:figures[entry.key];
    if(!figure?.root.visible)return null;
    return {highlight:{figure:figure===figures.player?'player':entry.key},position:figure.root.position.clone()};
  }
  if(entry.kind==='object'){
    const object=objects[entry.key];
    if(!object?.visible)return null;
    return {highlight:{object:entry.key},position:object.getWorldPosition(new THREE.Vector3())};
  }
  return {highlight:{point:entry.at},position:world(entry.at)};
}
function previewEntry(entry){
  const target=searchTarget(entry);
  if(!target)return;
  if(!search.saved)search.saved={position:camera3d.position.clone(),target:controls.target.clone(),mode:cameraMode,follow:followPosition};
  setHighlight(target.highlight);
  focusCameraOn(target.position,entry.kind==='place'?7:5);
}
function endPreview(){
  if(search.pinned)return;
  setHighlight(null);
  const saved=search.saved;
  search.saved=null;
  if(!saved||firstPersonActive())return;
  if(saved.mode==='free'){
    gameView.tween={fromPosition:camera3d.position.clone(),fromTarget:controls.target.clone(),toPosition:saved.position,toTarget:saved.target,started:performance.now(),duration:700};
  }else setCamera(saved.mode);
  followPosition=saved.follow;
}
function indexCard(entry){
  const card=el('div',{className:'indexCard'});
  card.innerHTML='<div class="cardHead"><span class="iconWrap">'+GameIcons.svg(entry.icon,26)+'</span><strong></strong></div>';
  card.querySelector('strong').textContent=entry.name;
  const lines=[];
  const visible=!!searchTarget(entry);
  if(entry.kind==='role'&&typeof ROLE_BLURBS!=='undefined'&&ROLE_BLURBS[entry.key])lines.push(ROLE_BLURBS[entry.key]);
  if(!visible)lines.push(entry.kind==='object'?'Not out in the church at the moment (or not used in this Mass).':'Not in the church at the moment.');
  const next=game.phase==='mass'||game.phase==='setup'||game.phase==='pre'?nextUseFor(entry,STEPS,cur3d,progress3d):null;
  if(next)lines.push((next.soon?'Now, in ':'Next, at ')+next.title+': '+next.what+'.');
  else if(entry.kind!=='place')lines.push(entry.kind==='role'?'No further scripted duty in the rest of this Mass.':'Not needed again in the rest of this Mass.');
  for(const text of lines)card.append(el('p',{textContent:text}));
  return card;
}
function resultButton(entry,match){
  const button=el('button',{type:'button',className:'searchItem'+(entry.main?' main':'')});
  button.dataset.id=entry.id;
  button.insertAdjacentHTML('afterbegin','<span class="iconWrap">'+GameIcons.svg(entry.icon,18)+'</span>');
  const label=el('span');
  if(match){
    const [at,length]=match;
    label.append(entry.name.slice(0,at),el('mark',{textContent:entry.name.slice(at,at+length)}),entry.name.slice(at+length));
  }else label.textContent=entry.name;
  button.append(label);
  button.addEventListener('mouseenter',()=>previewEntry(entry));
  button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))previewEntry(entry);});
  button.addEventListener('mouseleave',endPreview);
  button.addEventListener('click',()=>pinEntry(entry));
  return button;
}
function pinEntry(entry){
  search.pinned=entry;
  const target=searchTarget(entry);
  if(target){setHighlight(target.highlight);focusCameraOn(target.position,entry.kind==='place'?7:5);}
  search.saved=null;
  renderSearch();
}
function renderSearch(){
  const panel=$('searchPanel');
  panel.replaceChildren();
  if(search.pinned){
    const card=indexCard(search.pinned);
    const close=el('button',{type:'button',className:'cardClose',textContent:'✕',title:'Close the card'});
    close.setAttribute('aria-label','Close the card');
    close.onclick=()=>{search.pinned=null;setHighlight(null);renderSearch();};
    card.prepend(close);
    panel.append(card);
  }
  const query=$('gameSearch').value;
  if(query.trim()){
    const results=searchEntries(search.entries,query);
    const list=el('div',{className:'searchResults'});
    list.setAttribute('role','listbox');
    if(!results.length)list.append(el('p',{className:'small',textContent:'Nothing matches “'+query.trim()+'”.'}));
    for(const {entry,match} of results.slice(0,14))list.append(resultButton(entry,match));
    panel.append(list);
  }
  const groups=el('div',{className:'searchCategories'});
  for(const category of SEARCH_CATEGORIES){
    const all=search.entries.filter(e=>e.cat===category.id);
    if(!all.length)continue;
    const open=search.expanded.has(category.id);
    const shown=open?all:all.filter(e=>e.main).slice(0,4);
    const group=el('section',{className:'searchCategory'});
    const head=el('h4');
    head.innerHTML='<span class="iconWrap">'+GameIcons.svg(category.icon,16)+'</span>';
    head.append(category.name);
    group.append(head);
    const row=el('div',{className:'searchRow'});
    for(const entry of shown)row.append(resultButton(entry,null));
    if(all.length>shown.length||open){
      const more=el('button',{type:'button',className:'searchMore',textContent:open?'Fewer ▴':'More ('+(all.length-shown.length)+') ▾'});
      more.setAttribute('aria-expanded',String(open));
      more.onclick=()=>{if(open)search.expanded.delete(category.id);else search.expanded.add(category.id);renderSearch();};
      row.append(more);
    }
    group.append(row);
    groups.append(group);
  }
  panel.append(groups);
}
function openSearch(){
  search.entries=buildSearchIndex(searchRoles());
  search.open=true;
  $('searchPanel').hidden=false;
  $('gameSearch').setAttribute('aria-expanded','true');
  renderSearch();
}
function closeSearch(){
  if(!search.open)return;
  search.open=false;
  search.pinned=null;
  endPreview();
  setHighlight(null);
  $('searchPanel').hidden=true;
  $('gameSearch').setAttribute('aria-expanded','false');
}
function initialiseSearch(){
  const input=$('gameSearch');
  if(!input)return;
  input.addEventListener('focus',openSearch);
  input.addEventListener('click',()=>{if(!search.open)openSearch();});
  input.addEventListener('input',()=>{if(!search.open)openSearch();else renderSearch();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeSearch();input.blur();}
    if(event.key==='Enter'){const first=searchEntries(search.entries,input.value)[0];if(first)pinEntry(first.entry);}
    if(event.key==='ArrowDown'){event.preventDefault();$('searchPanel').querySelector('button.searchItem')?.focus();}
    event.stopPropagation();
  });
  document.addEventListener('pointerdown',event=>{
    if(search.open&&!$('searchBox').contains(event.target))closeSearch();
  });
}

// ---------- feedback ----------
function feedbackContext(){
  return {page:location.pathname.split('/').pop()||'mass-game.html',role:game.role,level:game.level,phase:game.phase,
    step:STEPS[cur3d]?.title,options:game.options?{deacon:game.options.deacon,serverCount:game.options.serverCount,incense:game.options.incense,preset:game.options.preset}:null};
}
function initialiseFeedback(){
  const dialog=$('feedbackDialog');
  if(!dialog)return;
  const status=$('feedbackStatus');
  $('feedbackButton').onclick=()=>{status.textContent='';$('feedbackText').value='';dialog.showModal();$('feedbackText').focus();};
  $('feedbackCancel').onclick=()=>dialog.close();
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  $('feedbackForm').addEventListener('submit',async event=>{
    event.preventDefault();
    status.textContent='';
    const message=$('feedbackText').value.trim();
    if(!message){status.textContent='Please write a few words first.';return;}
    const payload={category:$('feedbackCategory').value,message,app:'Mass-Sim-Liturgy',...($('feedbackContext').checked?{context:JSON.stringify(feedbackContext())}:{})};
    if(FEEDBACK_ENDPOINT){
      status.textContent='Sending...';
      try{
        const response=await fetch(FEEDBACK_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
        if(!response.ok)throw new Error('The feedback service answered '+response.status+'.');
        status.textContent='Thank you, your feedback was sent anonymously.';
        $('feedbackText').value='';
        setTimeout(()=>dialog.close(),1600);
        return;
      }catch(error){status.textContent='Could not send ('+error.message+'). ';}
    }else status.textContent='Online feedback is not set up in this copy. ';
    const text=Object.entries(payload).map(([k,v])=>k+': '+v).join('\n');
    try{await navigator.clipboard.writeText(text);status.textContent+='Your note was copied to the clipboard. ';}catch{}
    const link=el('a',{textContent:'Save it as a text file',download:'mass-sim-feedback.txt',href:URL.createObjectURL(new Blob([text],{type:'text/plain'}))});
    status.append(link);
  });
}

function initialiseGameUi(){
  initialiseHoverTips();
  initialiseSearch();
  initialiseFeedback();
}
