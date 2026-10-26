'use strict';
// Optional exercises use their own state; the celebration is never rebuilt.
const PracticeRoom=(()=>{
  let opened=false,saved=null,round=null,serial=0,records,storageError='',lastFrame=0,lastPaint=0;
  const byId=id=>document.getElementById(id);
  const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
  function button(text,action){
    const n=node('button',text);n.type='button';n.onclick=action;return n;
  }
  function select(label,values,value,change){
    const wrap=node('label',label+' '),input=node('select');
    for(const [id,name] of values){const option=node('option',name);option.value=id;input.append(option);}
    input.value=value;input.onchange=()=>change(input.value);wrap.append(input);return wrap;
  }
  function load(){
    storageError='';
    try{records=normalisePracticeRecords(JSON.parse(localStorage.getItem(PRACTICE_STORAGE_KEY)));}
    catch(error){records=normalisePracticeRecords(null);storageError='Practice records could not be loaded: '+error.message;}
  }
  function announce(text){byId('practiceFeedback').textContent=text;}
  function clear(){
    byId('practiceBoard')?.remove();
    byId('practiceRoom').classList.remove('handsOn');
    byId('practiceScene').setAttribute('aria-label','Practice church view');
    byId('practiceContent').replaceChildren();byId('practiceMarkers').replaceChildren();
    byId('practiceLeaders').replaceChildren();announce('');
  }
  function menu(){
    round=null;clear();
    byId('practiceTitle').textContent='Practice room';
    const content=byId('practiceContent');
    content.append(node('p','Optional exercises with untimed alternatives. Completion and 1-3 performance stars are separate from The Path. Illustrative, not an approved ceremonial.'));
    content.append(node('p','Preparation and procession support only the four ordinary Mass arrangements listed here, not special rites or celebrations with a Bishop. Preparation is a selected cupboard checklist, not a complete sacristan course.'));
    for(const [id,title] of PRACTICE_GAMES){
      const record=records.games[id];
      content.append(button(id+' '+title+(record?' - '+record.completed+' completed, best '+record.stars+'/3 stars':''),()=>start(id)));
    }
    if(storageError)announce(storageError);
  }
  function open(){
    if(opened)return;
    saved={focus:document.activeElement,position:camera3d.position.clone(),target:controls.target.clone(),
      mode:cameraMode,cameraSelect:byId('camera').value,follow:followPosition,fov:camera3d.fov,enabled:controls.enabled,
      damping:controls.enableDamping,
      parent:renderer.domElement.parentNode,next:renderer.domElement.nextSibling};
    load();opened=true;
    byId('gameSetup').hidden=true;byId('practiceRoom').hidden=false;
    // Block unrelated UI without altering its hidden state, handlers or settings.
    saved.inert=[...document.body.children].filter(n=>n!==byId('practiceRoom')&&n.tagName!=='SCRIPT')
      .map(n=>[n,n.inert]);
    for(const [n] of saved.inert)n.inert=true;
    byId('practiceScene').append(renderer.domElement);
    controls.enabled=true;controls.enableDamping=false;camera3d.fov=45;setCamera('overview');
    menu();byId('practiceClose').focus();
  }
  function close(){
    if(!opened)return;
    opened=false;round=null;clear();byId('practiceRoom').hidden=true;
    byId('practiceMarkers').replaceChildren();
    byId('practiceLeaders').replaceChildren();
    for(const [n,inert] of saved.inert)n.inert=inert;
    saved.parent.insertBefore(renderer.domElement,saved.next);
    const viewport=byId('viewport');
    renderer.setSize(viewport.clientWidth,viewport.clientHeight);
    camera3d.aspect=viewport.clientWidth/viewport.clientHeight;
    camera3d.fov=saved.fov;camera3d.updateProjectionMatrix();
    cameraMode=saved.mode;followPosition=saved.follow;
    byId('camera').value=saved.cameraSelect;controls.enabled=saved.enabled;controls.enableDamping=saved.damping;
    camera3d.position.copy(saved.position);controls.target.copy(saved.target);controls.update();
    byId('gameSetup').hidden=false;saved.focus.focus();
  }
  function start(id,mode='standard'){
    clear();
    round={id,seed:Date.now()+':'+(++serial),scenario:'weekday',placements:{},kits:{},wrong:0,index:0,hints:new Set()};
    byId('practiceTitle').textContent=PRACTICE_GAMES.find(game=>game[0]===id)[1];
    if(['MG10','MG11','MG12'].includes(id)){renderHandsOn(mode);return;}
    if(id==='MG01'){
      setCamera('overview');
      const entries=buildSearchIndex([]).filter(entry=>searchTarget(entry));
      round.targets=practiceChurchRound(entries,round.seed);
      round.candidates=entries.filter(entry=>round.targets.some(t=>t.id===entry.id));
      if(!round.targets.length){announce('No supported scene targets are visible. Return to setup and select a church view.');return;}
      renderChurch();
    }else renderExercise(true);
  }
  function renderHandsOn(mode){
    clear();lastFrame=performance.now();lastPaint=0;
    round.hand=practiceHandsOn(round.id,mode,round.seed);
    byId('practiceRoom').classList.add('handsOn');
    byId('practiceScene').setAttribute('aria-label','Virtual coordination practice board');
    const content=byId('practiceContent'),board=node('div');
    board.id='practiceBoard';board.setAttribute('role','img');
    byId('practiceScene').append(board);
    content.append(select('Controls (changing restarts this round)',[
      ['standard','Standard'],['slow','Slow'],['assisted','Assisted - untimed, manual timing steps']
    ],mode,value=>{renderHandsOn(value);announce('Round restarted with '+value+' controls.');}));
    content.append(node('p','Simulation only. No real flame, fuel, charcoal or hot equipment. Do not copy this game with real objects.'));
    if(round.id==='MG10'){
      content.append(node('p','Abstract coordination, NOT an incensation rubric or universal swing pattern. Match the shown direction when the marker reaches the centre band. Each press advances one of eight beats; wait for another pass if needed. Left/Right arrows or buttons.'));
      board.innerHTML='<div class="practicePendulum" aria-hidden="true"><div id="practiceSwing"><span class="practiceChain"></span><span class="practiceCenser"></span></div></div>';
      content.append(button('Swing left',()=>handsAction('left')),button('Swing right',()=>handsAction('right')));
    }else if(round.id==='MG11'){
      content.append(node('p','Move the symbolic lighter flame (+) to each wick (O), then choose Light wick. Arrows move reach; A/D or the balance buttons counter tilt. Balance must be within -20 to +20. At +/-75 the flame resets away from the symbolic hand zone. This target order is a game, not a ritual lighting order; Easter Candle is last.'));
      board.innerHTML='<div class="practiceField" aria-hidden="true"><span id="practiceWick">O</span><span id="practiceFlame">+</span><span class="practiceHand">Hand zone (symbolic)</span></div><div class="practiceBalance" aria-hidden="true"><span class="practiceBand"></span><span id="practiceBalanceNeedle"></span></div><div id="practiceBalanceText" aria-hidden="true"></div>';
      for(const [action,label] of [['left','Reach left'],['right','Reach right'],['up','Reach up'],['down','Reach down'],
        ['balanceLeft','Balance -10 (A)'],['balanceRight','Balance +10 (D)'],['light','Light wick (L)']])
        content.append(button(label,()=>handsAction(action)));
    }else{
      content.append(node('p','Abstract charcoal-symbol puzzle, NOT an ignition procedure. Match the symbolic glow number, then send a pulse in the centre timing band. Three symbols complete the board. Arrows adjust glow; P sends a pulse. Numbers and pulses have no real-world units or meaning.'));
      board.innerHTML='<div class="practiceCoals" aria-hidden="true"><span>1</span><span>2</span><span>3</span></div>';
      for(const [action,label] of [['less','Glow -10'],['more','Glow +10'],['pulse','Send symbolic pulse (P)']])
        content.append(button(label,()=>handsAction(action)));
    }
    if(round.id!=='MG11'){
      const meter=node('div');meter.className='practiceMeter';meter.setAttribute('aria-hidden','true');
      meter.innerHTML='<span class="practiceBand"></span><span id="practiceNeedle"></span>';board.append(meter);
      if(mode==='assisted')content.append(button('Advance marker +10 (T)',()=>handsAction('step')));
      content.append(node('p',mode==='assisted'?'Time is stopped. Advance the marker to 50, then act.':'Marker repeats every '+(mode==='slow'?'4.4':'2')+' seconds. Centre is 50; target band is '+(mode==='slow'?'32-68.':'38-62.')));
    }
    const cue=node('p');cue.id='practiceBoardCue';cue.setAttribute('aria-hidden','true');board.append(cue);
    const stats=node('p');stats.id='practiceStats';content.append(stats);
    const skip=button('Skip target',()=>handsAction('skip'));skip.id='practiceSkip';content.append(skip);
    content.append(button('Finish round now',()=>finish(practiceHandsOnResult(round.hand))),
      button('Reset round',()=>renderHandsOn(round.hand.mode)));
    paintHandsOn();content.querySelector('select').focus();
    announce('New round. '+(mode==='assisted'?'Untimed controls enabled.':'Slow or Assisted controls are available.'));
  }
  function handsAction(action){
    if(!round?.hand)return;
    round.hand=practiceHandsOnAction(round.hand,action);
    paintHandsOn();announce(round.hand.message+' '+byId('practiceStats').textContent);
  }
  function paintHandsOn(){
    const state=round.hand,board=byId('practiceBoard');
    const total=state.id==='MG10'?8:3;
    const target=state.done?'All targets visited - choose Finish round now.':
      state.id==='MG10'?'Beat '+(state.index+1)+' / 8: swing '+state.pattern[state.index]:
      state.id==='MG11'?'Candle '+(state.index+1)+' / 3: '+state.candles[state.index].name:
      'Symbol '+(state.index+1)+' / 3: target glow '+state.glows[state.index];
    const status=state.id==='MG11'?'Reach '+state.x+', '+state.y+'; balance '+Math.round(state.tilt)+'.':
      'Timing '+Math.round(state.phase*100)+' / 100.'+(state.id==='MG12'?' Glow '+state.glow+'.':'');
    byId('practiceStats').textContent=target+' '+status+' Targets visited: '+Math.min(total,state.index)+'.';
    byId('practiceBoardCue').textContent=target;
    board.setAttribute('aria-label',target+' '+status);
    byId('practiceSkip').disabled=state.done;
    if(state.id==='MG11'){
      const wick=state.candles[Math.min(state.index,2)];
      byId('practiceWick').style.left=wick.x+'%';byId('practiceWick').style.top=wick.y+'%';
      byId('practiceWick').textContent=state.done?'*':'O';
      const flame=byId('practiceFlame');
      flame.style.left=state.x+'%';flame.style.top=state.y+'%';flame.style.transform='rotate('+state.tilt+'deg)';
      byId('practiceBalanceNeedle').style.left=(state.tilt+100)/2+'%';
      byId('practiceBalanceText').textContent='Balance '+Math.round(state.tilt)+' (target -20 to +20)';
    }else{
      byId('practiceNeedle').style.left=state.phase*100+'%';
      board.querySelector('.practiceBand').style.width=state.mode==='slow'?'36%':'24%';
      if(state.id==='MG10')byId('practiceSwing').style.transform='rotate('+Math.sin(state.phase*Math.PI*2)*40+'deg)';
      else [...board.querySelectorAll('.practiceCoals span')].forEach((n,i)=>{
        n.classList.toggle('lit',state.lit.includes(i));n.classList.toggle('active',i===state.index);
        n.textContent=String(i+1)+(i<state.index&&!state.lit.includes(i)?' skipped':'');
      });
    }
  }
  function renderChurch(){
    const content=byId('practiceContent');content.replaceChildren();
    const target=round.targets[round.index];
    content.append(node('p','Find '+(round.index+1)+' of '+round.targets.length+': '+(round.expert?target.clue:target.name)));
    content.append(node('p','Choose a numbered marker on the 3D scene. Lines connect displaced markers to their targets. Tab and press Enter or Space, or tap a marker.'));
    content.append(button(round.expert?'Use Beginner named clues':'Use Expert description clues',()=>{round.expert=!round.expert;renderChurch();}));
    content.append(button('Picture hint',()=>{
      round.hints.add(target.id);
      byId('practiceHint').innerHTML=GameIcons.svg(target.icon,48);
      announce('Hint: '+target.name+'. '+target.ref);
    }));
    const hint=node('div');hint.id='practiceHint';content.append(hint);
    content.append(button('Reveal and continue',()=>{round.wrong++;found(target,true);}));
    byId('practiceMarkers').replaceChildren();
    byId('practiceLeaders').replaceChildren();
    round.candidates.forEach((entry,index)=>{
      const marker=button(String(index+1),()=>{
        if(entry.id===target.id)found(target,false);
        else{round.wrong++;announce('Not yet. That is '+entry.name+'. Try another marker.');}
      });
      marker.className='practiceMarker';marker.dataset.target=entry.id;
      marker.setAttribute('aria-label','Scene location '+(index+1));
      marker.onfocus=()=>marker.classList.add('focused');
      marker.onblur=()=>marker.classList.remove('focused');
      byId('practiceMarkers').append(marker);
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      byId('practiceLeaders').append(line);
    });
    frame();
  }
  function found(target,revealed){
    const feedback=(revealed?'Revealed: ':'Found: ')+target.name+'. '+target.clue+' '+target.ref;
    const marker=[...byId('practiceMarkers').children].find(n=>n.dataset.target===target.id);
    if(marker)marker.classList.add('correct');
    byId('practiceContent').replaceChildren(node('p',feedback),button('Continue',()=>{
      round.index++;
      if(round.index===round.targets.length)finish({correct:round.targets.length,
        total:round.targets.length+round.wrong+round.hints.size,details:[]});
      else renderChurch();
    }));
    // Lock choices until the explanation has been acknowledged.
    for(const n of byId('practiceMarkers').children)n.disabled=true;
    byId('practiceContent').querySelector('button').focus();announce(feedback);
  }
  function renderExercise(reset){
    const content=byId('practiceContent');content.replaceChildren();
    content.append(select('Practice scenario',PRACTICE_SCENARIOS.map(s=>[s.id,s.name]),round.scenario,value=>{
      round.scenario=value;round.seed+=':scenario';renderExercise(true);announce('Scenario changed; a new round is ready.');
    }));
    if(round.id==='MG02'){
      if(reset){round.items=practiceSacristyRound(round.scenario,round.seed);round.placements={};}
      content.append(node('p','Choose what to set out and where. Leave unnecessary items in the cupboard. GIRM 118a places the Missal by the chair; credence/book-stand answers are accepted as schematic simulator alternatives. This is a selected checklist, not every preparation duty.'));
      for(const item of round.items){
        const row=node('div');row.className='practiceRow';
        row.append(select(item.name,[['cupboard','Leave in cupboard'],...['sacristy','altar','credence','ambo','chair','bookStand','giftTable','crossStand']
          .map(id=>[id,GAME_PLACES.find(p=>p.id===id).name])],round.placements[item.id]||'cupboard',value=>{round.placements[item.id]=value;}));
        content.append(row);
      }
      content.append(button('Finish preparation',()=>finish(practiceSacristyResult(round.items,round.placements))));
    }else{
      if(reset){
        round.procession=practiceProcessionRound(round.scenario,round.seed);
        round.order=round.procession.available.map(r=>r.id);round.kits={};
      }
      content.append(node('p','Front of procession first. Move the groups and assign their carried objects. The cross and two candles share one rank, not three single-file positions. Spacing and the unladen server arrangement are schematic (GIRM 120, 172, 188, 194).'));
      round.order.forEach((id,index)=>{
        const rank=round.procession.ranks.find(r=>r.id===id),row=node('div');
        row.className='practiceRow';row.append(node('strong',(index+1)+'. '+rank.name+' '));
        for(const [delta,label] of [[-1,'Move earlier'],[1,'Move later']]){
          const move=button(label,()=>{
            const other=index+delta;
            [round.order[index],round.order[other]]=[round.order[other],round.order[index]];
            renderExercise(false);
            byId('practiceContent').querySelector('[data-rank="'+id+'"]').focus();
          });
          move.disabled=index+delta<0||index+delta>=round.order.length;
          move.setAttribute('aria-label',label+': '+rank.name);row.append(move);
        }
        const kit=select('Carried objects for '+rank.name,[['','Choose objects'],...round.procession.kits.map(k=>[k,k])],
          round.kits[id]||'',value=>{round.kits[id]=value;});
        kit.querySelector('select').dataset.rank=id;row.append(kit);content.append(row);
      });
      content.append(button('Finish procession',()=>finish(practiceProcessionResult(round.procession.ranks,round.order,round.kits))));
    }
  }
  function finish(result){
    const stars=practiceStars(result.correct,result.total),id=round.id,mode=round.hand?.mode||'standard';
    records=recordPractice(records,id,stars);
    try{localStorage.setItem(PRACTICE_STORAGE_KEY,JSON.stringify(records));}
    catch(error){storageError='Completed this round, but practice records could not be saved: '+error.message;}
    clear();round=null;
    const content=byId('practiceContent');
    content.append(node('h3','Round completed - '+stars+'/3 stars'));
    content.append(node('p',result.correct+' / '+result.total+' accuracy points. Completion has no passing-score gate. '+(storageError||'Practice record saved separately.')));
    for(const detail of result.details)content.append(node('p',(detail.correct?'Correct: ':'Review: ')+detail.text+'. '+detail.ref));
    content.append(button('Play again',()=>start(id,mode)),button('Choose another game',menu));
    content.querySelector('button').focus();announce('Round completed. '+stars+' of 3 stars.');
  }
  function frame(){
    if(!opened)return;
    const surface=byId('practiceScene'),width=surface.clientWidth,height=surface.clientHeight;
    if(renderer.domElement.clientWidth!==width||renderer.domElement.clientHeight!==height){
      renderer.setSize(width,height);camera3d.aspect=width/height;camera3d.updateProjectionMatrix();
    }
    if(round?.hand){
      const now=performance.now(),previous=round.hand.message;
      round.hand=practiceHandsOnTick(round.hand,(now-lastFrame)/1000);lastFrame=now;
      if(previous!==round.hand.message)announce(round.hand.message);
      if(now-lastPaint>=100){paintHandsOn();lastPaint=now;}
      return;
    }
    if(round?.id!=='MG01')return;
    const rect=renderer.domElement.getBoundingClientRect();
    const placed=[];
    round.candidates.forEach((entry,index)=>{
      const marker=byId('practiceMarkers').children[index],target=searchTarget(entry);
      if(!marker||!target)return;
      const point=target.position.clone();point.y+=.8;point.project(camera3d);
      const anchorX=rect.left+(point.x+1)*rect.width/2,anchorY=rect.top+(1-point.y)*rect.height/2;
      let x=Math.max(rect.left+24,Math.min(rect.right-24,anchorX));
      let y=Math.max(rect.top+24,Math.min(rect.bottom-24,anchorY));
      const origin={x,y},candidates=[];
      for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++)candidates.push({x:origin.x+48*dx,y:origin.y+48*dy,d:dx*dx+dy*dy});
      const free=candidates.sort((a,b)=>a.d-b.d).find(p=>p.x>=rect.left+24&&p.x<=rect.right-24&&p.y>=rect.top+24&&p.y<=rect.bottom-24&&
        placed.every(other=>Math.abs(other.x-p.x)>=46||Math.abs(other.y-p.y)>=46));
      if(free){x=free.x;y=free.y;}
      placed.push({x,y});
      marker.style.left=x+'px';marker.style.top=y+'px';
      marker.hidden=point.z<-1||point.z>1;
      const line=byId('practiceLeaders').children[index];
      if(line){
        line.setAttribute('x1',anchorX);line.setAttribute('y1',anchorY);
        line.setAttribute('x2',x);line.setAttribute('y2',y);
      }
    });
  }
  function initialise(){
    byId('openPractice').onclick=open;byId('practiceClose').onclick=close;
    byId('practiceMenu').onclick=menu;
    document.addEventListener('keydown',event=>{
      if(!opened)return;
      if(event.key==='Escape'){event.preventDefault();close();}
      if(round?.hand&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&event.target.tagName!=='SELECT'){
        const keys=round.id==='MG10'?{ArrowLeft:'left',ArrowRight:'right',t:'step'}:
          round.id==='MG11'?{ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'balanceLeft',d:'balanceRight',l:'light'}:
          {ArrowLeft:'less',ArrowRight:'more',p:'pulse',t:'step'};
        const action=keys[event.key]||keys[event.key.toLowerCase()];
        if(action){event.preventDefault();if(!event.repeat||round.id==='MG11')handsAction(action);}
      }
      // Prevent celebration shortcuts while retaining native button/selection keys.
      event.stopImmediatePropagation();
      if(event.key==='Tab'){
        const focusable=[...byId('practiceRoom').querySelectorAll('button:not(:disabled),select')].filter(n=>!n.hidden);
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    },true);
  }
  return {initialise,isOpen:()=>opened,frame};
})();
