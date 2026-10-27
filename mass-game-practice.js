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
    byId('practiceRoom').classList.remove('handsOn','visualPractice');
    byId('practiceScene').setAttribute('aria-label','Practice church view');
    byId('practiceContent').replaceChildren();byId('practiceMarkers').replaceChildren();
    byId('practiceLeaders').replaceChildren();announce('');
  }
  function menu(){
    round=null;clear();
    byId('practiceTitle').textContent='Practice room';
    const content=byId('practiceContent');
    content.append(node('p','Optional exercises with untimed alternatives. Completion and 1-3 performance stars are separate from The Path. Illustrative, not an approved ceremonial.'));
    content.append(node('p','Preparation and procession support only the four ordinary Mass arrangements listed here, not special rites or celebrations with a Bishop. M.C. inspection covers only the labelled pre-Mass preparation set. These are not complete sacristan or ceremonial courses.'));
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
      parent:renderer.domElement.parentNode,next:renderer.domElement.nextSibling,
      setupHidden:byId('gameSetup').hidden,playing:playing3d,started:performance.now()};
    pauseGameTasks();
    setPlaying(false);
    load();opened=true;
    byId('practiceClose').textContent=saved.setupHidden?'Return to simulator':'Return to setup';
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
    byId('gameSetup').hidden=saved.setupHidden;
    const elapsed=performance.now()-saved.started;
    if(game.active)game.active.started+=elapsed;
    if(gameView.tween)gameView.tween.started+=elapsed;
    if(gameView.speaker)gameView.speaker.started+=elapsed;
    for(const key of Object.keys(game.kneel||{}))game.kneel[key]+=elapsed/1000;
    resumeGameTasks();
    if(saved.playing)setPlaying(true);
    if(saved.focus?.isConnected)saved.focus.focus();
  }
  function start(id,mode='standard'){
    clear();
    round={id,seed:Date.now()+':'+(++serial),scenario:'weekday',placements:{},kits:{},wrong:0,index:0,hints:new Set()};
    byId('practiceTitle').textContent=PRACTICE_GAMES.find(game=>game[0]===id)[1];
    if(['MG10','MG11','MG12'].includes(id)){renderHandsOn(mode);return;}
    if(id==='MG06'){
      round.inspections=practiceInspectionRound(round.seed);round.answers=[];
      renderInspection();
    }else if(id==='MG01'){
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
  const pictureNames={lectionary:'Lectionary',missal:'Missal',chalice:'Chalice set',chalice2:'Second chalice',
    water:'Water cruet',wine:'Wine cruet',ciborium:'Altar breads',procCross:'Processional cross',
    altarCross:'Altar cross',procCandles:'Processional candles',gospels:'Gospels: procession',
    gospelsAltar:'Gospels: altar',thurible:'Thurible & boat',aspersory:'Holy-water set'};
  function picture(id){
    const book=colour=>'<path d="M20 22 L75 15 L83 68 L28 77Z" fill="'+colour+'"/><path d="M28 70 L80 62 L83 68 L28 77Z" fill="#fff5d5"/><path d="M45 27 L52 26 L53 38 L63 36 L64 43 L54 45 L56 59 L49 60 L47 46 L38 48 L37 41 L46 39Z" fill="#edc85d"/>';
    const cup='<path d="M27 21 H73 Q72 48 53 50 V67 H67 L73 76 H27 L33 67 H47 V50 Q28 48 27 21Z" fill="#d4aa46"/><ellipse cx="50" cy="21" rx="23" ry="6" fill="#f3d37e"/>';
    const cross='<path d="M46 9 H54 V26 H71 V34 H54 V81 H46 V34 H29 V26 H46Z" fill="#d4aa46"/>';
    const candle=x=>'<path d="M'+x+' 27 v45 h12 V27Z" fill="#fff8d8"/><path d="M'+(x+6)+' 9 Q'+(x-3)+' 22 '+(x+6)+' 25 Q'+(x+16)+' 21 '+(x+6)+' 9" fill="#e69b36"/><path d="M'+(x-4)+' 77 h20" stroke="#a27c2e" stroke-width="6"/>';
    let art;
    if(['lectionary','missal','gospels','gospelsAltar'].includes(id))art=book(id==='lectionary'?'#32716c':id==='missal'?'#b04436':'#9b742a');
    else if(['chalice','chalice2'].includes(id))art=cup+(id==='chalice'?'<path d="M60 31 L87 35 L82 59 L60 55Z" fill="#fff"/><ellipse cx="25" cy="71" rx="17" ry="5" fill="#edc85d"/>':'');
    else if(['procCross','altarCross'].includes(id))art=cross+(id==='altarCross'?'<path d="M30 81 H70" stroke="#71582d" stroke-width="7"/>':'');
    else if(id==='procCandles')art=candle(23)+candle(65);
    else if(id==='water'||id==='wine')art='<path d="M39 12 H59 V29 Q75 37 74 66 Q74 78 49 78 Q25 78 26 66 Q25 38 41 29Z" fill="#d4e5e9"/><path d="M29 52 H71 V66 Q71 75 49 75 Q29 75 29 66Z" fill="'+(id==='wine'?'#9e4053':'#6eb7d5')+'"/><path d="M73 36 Q96 35 87 58 L75 60 M37 13 H62" fill="none" stroke="#688592" stroke-width="5"/>';
    else if(id==='ciborium')art=cup+'<path d="M26 20 Q50 1 74 20Z" fill="#f3d37e"/><path d="M50 1 V14 M44 7 H56" stroke="#936a20" stroke-width="4"/>';
    else if(id==='thurible')art='<path d="M36 8 L24 56 M36 8 L61 56 M36 8 V56" fill="none" stroke="#6b6864" stroke-width="2"/><path d="M20 55 H65 L57 76 H28Z M24 52 Q42 31 62 52Z" fill="#d4aa46"/><path d="M72 72 Q82 55 94 72 L88 79 H75Z" fill="#d4aa46"/>';
    else art='<path d="M22 44 Q47 25 72 44 L64 75 H30Z" fill="#a5bec7"/><path d="M35 41 Q47 15 62 42 M70 69 L84 23" fill="none" stroke="#596f79" stroke-width="6"/><ellipse cx="85" cy="20" rx="8" ry="12" fill="#a5bec7"/>';
    return '<svg viewBox="0 0 100 90" aria-hidden="true" focusable="false"><g stroke="#594a34" stroke-width="1.5" stroke-linejoin="round">'+art+'</g></svg>';
  }
  function furnishing(id,cloth=true){
    let art;
    if(id==='altar')art='<path d="M15 30 H145 V45 H15Z M32 45 V83 H49 V45 M112 45 V83 H129 V45" fill="#c6a37f"/>'+
      (cloth?'<path d="M12 27 H148 V52 L137 58 V38 H25 V58 L12 52Z" fill="#fffdf3"/>':'');
    else if(id==='ambo'||id==='bookStand')art='<path d="M42 20 L110 10 L124 33 L56 44Z M64 42 H103 V80 H64Z M49 80 H119 V88 H49Z" fill="#a87d51"/><path d="M78 48 V72 M70 56 H88" stroke="#e8cd81" stroke-width="3"/>';
    else if(id==='chair')art='<path d="M50 10 H110 V57 H50Z M44 51 H117 V64 H44Z M49 64 V86 M111 64 V86" fill="#9b493c" stroke="#77542f" stroke-width="6"/>';
    else if(id==='crossStand')art='<path d="M76 5 H84 V21 H101 V29 H84 V77 H76 V29 H59 V21 H76Z M58 80 H102 V87 H58Z" fill="#c6a04d"/>';
    else if(id==='cupboard')art='<path d="M13 5 H147 V88 H13Z" fill="#92653e"/><path d="M21 13 H139 V79 H21Z" fill="#644930"/><path d="M21 45 H139 M80 13 V79" stroke="#c6a37f" stroke-width="5"/>';
    else if(id==='sacristy')art='<path d="M22 8 H138 V15 H22Z M28 15 V86 M132 15 V86 M28 49 H132" fill="none" stroke="#92653e" stroke-width="7"/><path d="M56 20 L49 27 L36 32 L47 49 L55 43 V76 H105 V43 L113 49 L124 32 L111 27 L104 20Z" fill="#f8f3da"/>';
    else art='<path d="M15 36 H145 V46 H15Z M28 46 V86 M132 46 V86" fill="#92653e"/><path d="M17 33 H143 V39 H17Z" fill="#fff5d5"/>';
    return '<svg viewBox="0 0 160 95" aria-hidden="true" focusable="false"><g stroke="#594a34" stroke-width="1.5">'+art+'</g></svg>';
  }
  function visualBoard(label){
    byId('practiceBoard')?.remove();
    byId('practiceRoom').classList.add('handsOn','visualPractice');
    const board=node('div');board.id='practiceBoard';board.setAttribute('aria-label',label);
    byId('practiceScene').append(board);
    return board;
  }
  function renderPreparation(){
    const scrollTop=byId('practiceBoard')?.scrollTop||0;
    round.selected=null;
    const board=visualBoard('Sacristy preparation board');
    const title=node('h3','Sacristy preparation board');board.append(title);
    const grid=node('div');grid.className='practicePrepGrid';board.append(grid);
    const places=[['cupboard','Cupboard - keep unused items here'],['sacristy','Sacristy - ready to carry'],
      ['altar','Altar'],['credence','Credence'],['ambo','Ambo'],['chair','Chair'],
      ['bookStand','Book stand'],['giftTable','Gifts table'],['crossStand','Cross stand']];
    for(const [id,name] of places){
      const zone=node('section');zone.className='practiceZone';zone.dataset.place=id;
      const destination=button('',()=>placeSelected(id));destination.className='practiceDestination';
      destination.innerHTML=furnishing(id);destination.append(node('span',name));
      destination.setAttribute('aria-label','Place selected object: '+name);
      zone.append(destination);
      const shelf=node('div');shelf.className='practiceShelf';zone.append(shelf);
      for(const item of round.items.filter(item=>(round.placements[item.id]||'cupboard')===id)){
        const object=button('',()=>{
          round.selected=round.selected===item.id?null:item.id;
          for(const n of board.querySelectorAll('[data-item]'))n.setAttribute('aria-pressed',String(n.dataset.item===round.selected));
          announce(round.selected?'Picked up '+item.name+'. Choose a destination or the cupboard.':'Object put down.');
        });
        object.className='practiceObject';object.dataset.item=item.id;object.draggable=true;
        object.setAttribute('aria-pressed','false');object.setAttribute('aria-label',item.name+'; currently '+name);
        object.innerHTML=picture(item.id);object.append(node('span',pictureNames[item.id]));
        if(id!=='cupboard'){
          const result=practiceSacristyResult([item],round.placements).details[0];
          object.classList.add(result.correct?'placedRight':'placedWrong');
          object.append(node('small',result.correct?'OK':'Review'));
        }
        object.ondragstart=event=>{round.selected=item.id;event.dataTransfer.setData('text/plain',item.id);event.dataTransfer.effectAllowed='move';};
        object.ondragend=()=>{round.selected=null;};
        shelf.append(object);
      }
      zone.ondragover=event=>{if(round.selected){event.preventDefault();event.dataTransfer.dropEffect='move';}};
      zone.ondrop=event=>{event.preventDefault();placeSelected(id);};
      grid.append(zone);
    }
    board.scrollTop=scrollTop;
    function placeSelected(place){
      const item=round.items.find(item=>item.id===round.selected);
      if(!item){announce('Pick an object first, then choose its destination.');return;}
      round.placements[item.id]=place;
      const result=practiceSacristyResult([item],round.placements).details[0];
      renderPreparation();
      byId('practiceBoard').querySelector('[data-item="'+item.id+'"]').focus({preventScroll:true});
      announce((result.correct?'Correct placement. ':'Review placement. ')+result.text+'. '+(item.reason||'')+' '+result.ref);
    }
  }
  function renderInspection(){
    clear();
    const scene=round.inspections[round.index],content=byId('practiceContent');
    content.append(node('h3','Inspection '+(round.index+1)+' / '+round.inspections.length));
    content.append(node('p','Ordinary Mass, before the entrance: inspect the books, chalice and white altar cloth. Cross and two candles are already in place. Other preparation is assumed ready. This is a fixed illustrated training church, not your saved church layout.'));
    content.append(node('p','Click a misplaced object, or the furnishing missing its preparation. Tab + Enter/Space or tap also works. Some scenes are correct. Nothing is wrong merely because the Book of the Gospels is on the altar.'));
    content.append(button('Hint',()=>announce(scene.hint)));
    const nothing=button('Nothing wrong',()=>inspect('nothing'));content.append(nothing);
    const board=visualBoard('Before-Mass inspection scene');
    board.classList.add('practiceInspection');
    board.append(node('h3','Before the entrance'));
    const church=node('div');church.className='practiceChurch';board.append(church);
    const backdrop=node('div');backdrop.className='practiceChurchBack';backdrop.setAttribute('aria-hidden','true');
    backdrop.innerHTML='<svg viewBox="0 0 600 440" preserveAspectRatio="none"><path d="M0 0 H600 V440 H0Z" fill="#e4d6bc"/><path d="M0 240 H600 V440 H0Z" fill="#c7b394"/><g fill="#a8c6ce" stroke="#b09b78" stroke-width="10"><path d="M55 150 V70 Q85 0 115 70 V150Z"/><path d="M485 150 V70 Q515 0 545 70 V150Z"/></g><path d="M296 25 H304 V56 H328 V64 H304 V117 H296 V64 H272 V56 H296Z" fill="#806537"/><g fill="#fff8d8"><path d="M225 150 H233 V195 H225Z"/><path d="M367 150 H375 V195 H367Z"/></g><g fill="#c48b28"><path d="M228 136 Q218 146 228 149 Q238 145 228 136"/><path d="M370 136 Q360 146 370 149 Q380 145 370 136"/></g><path d="M0 340 H600 M0 400 H600 M200 240 L100 440 M400 240 L500 440" stroke="#ad9879" fill="none"/></svg>';
    backdrop.querySelector('svg').insertAdjacentHTML('beforeend','<g fill="#e1c29c" stroke="#e1c29c" stroke-width="4" stroke-linecap="round"><circle cx="300" cy="48" r="5"/><path d="M282 59 L300 64 L318 59 M300 64 V81 L296 101 M300 81 L304 101" fill="none"/></g>');
    church.append(backdrop);
    for(const [id,name] of [['altar','Altar'],['ambo','Ambo'],['chair','Chair'],['credence','Credence']]){
      const region=node('div');region.className='practiceScenePlace scene-'+id;region.dataset.place=id;
      const place=button('',()=>inspect(id));place.className='practiceFurnishing';place.dataset.inspect=id;
      place.innerHTML=furnishing(id,scene.cloth);place.append(node('span',name));
      place.setAttribute('aria-label','Inspect '+name+(id==='altar'?(scene.cloth?', with white cloth':', bare surface'):''));
      region.append(place);
      const props=node('div');props.className='practiceSceneObjects';region.append(props);
      for(const [item,location] of Object.entries(scene.props)){
        if(location!==id)continue;
        const object=button('',()=>inspect(item));object.dataset.inspect=item;object.className='practiceInspectObject';
        object.innerHTML=picture(item);object.append(node('span',pictureNames[item]));
        object.setAttribute('aria-label','Inspect '+pictureNames[item]+' at '+name);props.append(object);
      }
      if(id==='altar'&&scene.gospels){
        const gospel=button('',()=>inspect('gospels'));gospel.className='practiceInspectObject';gospel.dataset.inspect='gospels';
        gospel.innerHTML=picture('gospelsAltar');gospel.append(node('span','Gospels'));props.append(gospel);
      }
      church.append(region);
    }
    nothing.focus();
    function inspect(target){
      if(round.answered)return;
      round.answered=true;
      const result=practiceInspectionAnswer(scene,target);
      round.answers.push(result);
      for(const n of board.querySelectorAll('button')){
        n.disabled=true;
        if(n.dataset.inspect===result.target)n.classList.add('inspectionAnswer');
      }
      content.replaceChildren(node('h3',result.correct?'Good inspection':'Review this scene'),
        node('p',result.text+' '+result.ref),
        node('p','Only the stated preparation set is assessed; this is not a complete inspection of a church.'),
        button('Next scene',()=>{
          round.index++;round.answered=false;
          if(round.index===round.inspections.length)finish({correct:round.answers.filter(answer=>answer.correct).length,
            total:round.answers.length,details:round.answers});
          else renderInspection();
        }));
      announce((result.correct?'Correct. ':'Not this time. ')+result.text+' '+result.ref);
      content.querySelector('button').focus();
    }
  }
  function renderExercise(reset){
    const content=byId('practiceContent');content.replaceChildren();
    content.append(select('Practice scenario',PRACTICE_SCENARIOS.map(s=>[s.id,s.name]),round.scenario,value=>{
      round.scenario=value;round.seed+=':scenario';renderExercise(true);announce('Scenario changed; a new round is ready.');
    }));
    if(round.id==='MG02'){
      if(reset){round.items=practiceSacristyRound(round.scenario,round.seed);round.placements={};}
      content.append(node('p','Pick an illustrated object, then tap a destination to place it; or drag with a mouse. Tab + Enter/Space works too. Pick a placed object to move it again. Leave unnecessary items in the cupboard. A green check or red review label shows placement feedback, not a completion gate.'));
      content.append(node('p','Selected preparations only. GIRM 118a places the Missal near the chair; the credence and book stand remain accepted schematic simulator alternatives. Altar cloth, fixed candles and other preparations are assumed ready.'));
      renderPreparation();
      content.append(button('Reset board',()=>{renderExercise(true);announce('All objects returned to the cupboard.');}));
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
    byId('openPractice').onclick=open;byId('openMiniGames').onclick=open;byId('practiceClose').onclick=close;
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
