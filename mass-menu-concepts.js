'use strict';

// Move the existing controls so layout changes retain values and event handlers.
window.SetupMenus=(()=>{
  const form=document.getElementById('setupForm');
  const fieldsets=Array.from(form.children).filter(node=>node.tagName==='FIELDSET');
  const roles=document.getElementById('roleCards');
  const roleCards=Array.from(roles.children);
  const celebration=fieldsets[2],gameOptions=fieldsets[3];
  const options=celebration.querySelector('.optionGrid');
  const optionNodes=Array.from(options.children);
  const gameGrid=gameOptions.querySelector('.optionGrid');
  const gameNodes=Array.from(gameGrid.children);
  const gameAnchor=document.createComment('Original game options position');
  gameOptions.before(gameAnchor);
  const make=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text)node.textContent=text;
    return node;
  };
  const layouts={
    stacks:['Card stacks','Browse five role families. Open a stack, pick a role, and keep the rest tucked away.'],
    dashboard:['Dashboard','A role library on the left, your celebration and involvement on the right.'],
    steps:['Step by step','One decision at a time: your role, your involvement, then your celebration.'],
    classic:['Original menu','The existing long form, for comparison. No choices are lost when switching layouts.']
  };
  const families=[
    ['Ordained ministers','Priest and Deacon',['P','D'],'vestment'],
    ['Altar & procession','Servers and bearers',['S','X','C1','T','MB','CB'],'candle'],
    ['Word & Communion','Readers and EMHC',['L','L2','E'],'book'],
    ['Support & coordination','Preparation and practical duties',['MC','SAC','U','AV'],'sacristy'],
    ['Congregation','Take part from the pews',['PEW'],'people']
  ];
  const toolbar=make('details','menuConcepts');
  toolbar.append(make('summary','','Menu layout'));
  const pickerLabel=make('label','','Try a menu layout');
  const picker=make('select');
  picker.id='menuConcept';
  Object.entries(layouts).forEach(([value,[text]])=>{
    const option=make('option','',text);
    option.value=value;picker.append(option);
  });
  pickerLabel.append(picker);
  const description=make('p','menuDescription');
  description.id='menuDescription';
  picker.setAttribute('aria-describedby',description.id);
  toolbar.append(pickerLabel,description);
  form.prepend(toolbar);
  const intro=form.querySelector('h2 + p');
  const originalIntro=intro.textContent;
  const body=make('div','menuBody');
  fieldsets[0].before(body);
  const groupNav=make('nav','menuFamilyNav');
  groupNav.setAttribute('aria-label','Role families');
  const groups=families.map(([title,subtitle,ids,icon],index)=>{
    const detail=make('details','menuRoleGroup');
    detail.name='setup-role-family';
    const summary=make('summary');
    const badge=make('span','menuFamilyIcon');
    badge.innerHTML=GameIcons.svg(icon);
    const heading=make('span','menuFamilyHeading');
    const count=make('small','menuFamilyCount');
    heading.append(make('strong','',title),make('small','',subtitle));
    summary.append(badge,heading,count);
    const cards=make('div','cards menuGroupCards');
    detail.append(summary,cards);
    summary.addEventListener('click',event=>{
      if(layout==='dashboard')event.preventDefault();
    });
    const button=make('button','','');
    button.type='button';
    button.append(make('strong','',title),make('small','',subtitle));
    button.addEventListener('click',()=>{activeFamily=index;refreshGroups();});
    groupNav.append(button);
    return {detail,summary,cards,count,button,ids};
  });
  const familyNote=make('p','small menuFamilyNote','Browsing groups, not ranks. All take part in the celebration.');
  const selected=make('div','menuSelection');
  const selectedName=make('strong');
  const selectedBlurb=make('p');
  selected.append(make('small','menuEyebrow','YOUR ROLE'),selectedName,selectedBlurb);
  selected.setAttribute('aria-live','polite');
  const involvement=[
    ['watch','eye','Just watch','No questions; your duties happen automatically.'],
    ['guided','guide','Follow a hint','The right action is highlighted. Click to continue.'],
    ['choice','choices','Choose an answer','Pick from a few answers, with two tries.'],
    ['timed','timer','Beat the clock','Answer choices with a countdown.'],
    ['expert','target','Find it yourself','No hints: select places, people and book passages.']
  ];
  involvement.forEach(([id,icon,title,text])=>{
    const card=form.querySelector(`#levelCards input[value="${id}"]`).closest('label');
    Array.from(card.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
    const symbol=make('span','menuLevelIcon');
    symbol.setAttribute('aria-hidden','true');
    symbol.innerHTML=GameIcons.svg(icon);
    card.querySelector('strong').before(symbol);
    card.append(make('b','menuLevelTag',title),make('small','menuLevelHelp',text));
  });
  const difficulty=make('details','menuAdvanced menuDifficulty');
  difficulty.append(make('summary','','Challenge & assistance'));
  const difficultyGrid=make('div','optionGrid');
  difficulty.append(make('p','small','Adjust the number of questions, extra duties and answer aids. Watch has no questions, but extra preparation tasks can still lengthen a run.'),difficultyGrid);
  const difficultyNames=['detail','lapses','openChurch','symbols'];
  const difficultyNodes=difficultyNames.map(name=>form.elements[name].closest('label'));
  const decisionLabel=form.elements.detail.closest('label');
  decisionLabel.append(make('small','menuSettingHelp','Key moments asks less often; Every duty adds more questions.'));
  form.elements.lapses.closest('label').append(make('small','menuSettingHelp','Extra reminders to spot, for Priest, Deacon and M.C.'));
  form.elements.openChurch.closest('label').append(make('small','menuSettingHelp','Adds opening and preparation tasks for the Sacristan.'));
  form.elements.symbols.closest('label').append(make('small','menuSettingHelp','Visual answer aids; turn off for less assistance.'));
  const advanced=make('details','menuAdvanced');
  advanced.append(make('summary','','Fine-tune celebration & church'));
  const advancedGrid=make('div','optionGrid');
  advanced.append(advancedGrid);
  const preferences=make('details','menuAdvanced');
  preferences.append(make('summary','','Sound & camera preferences'));
  const preferenceGrid=make('div','optionGrid');
  preferences.append(make('p','small','Presentation preferences, separate from the challenge settings.'),preferenceGrid);
  const contextual=make('section','menuContext');
  contextual.append(make('h3','','This celebration'));
  const contextNote=make('p','small');
  const contextGrid=make('div','optionGrid');
  contextual.append(contextNote,contextGrid);
  const specialNodes=[...SETUP_CELEBRATION_FLAGS,...SETUP_CORPUS_FLAGS].map(name=>form.elements[name].closest('label'));
  const seasonalBrowser=make('div','menuCelebrations');
  seasonalBrowser.append(make('h3','','Through the liturgical year'),make('p','small','Colour tints are browsing cues, not automatic vestment choices. Only existing celebrations are playable.'));
  const seasonGrid=make('div','menuSeasonGrid');
  const otherGrid=make('div','menuSeasonGrid');
  seasonalBrowser.append(seasonGrid,make('h3','','Other celebrations & rites'),otherGrid);
  const presetSelect=document.getElementById('gamePreset');
  const presetValue=presetSelect.value;
  const presetOptions=new Map(Array.from(presetSelect.options).map(option=>[option.value,option]));
  presetSelect.replaceChildren();
  const seasonGroups=SETUP_CELEBRATION_GROUPS.map((group,index)=>{
    const detail=make('details',`menuSeason menuTint-${group.colour}`);
    const summary=make('summary');
    summary.append(make('strong','',group.name),make('small','',group.presets.length?`${group.presets.length} available`:'Not yet available'));
    detail.append(summary);
    if(group.note)detail.append(make('p','small',group.note));
    const optgroup=make('optgroup');
    optgroup.label=group.name;
    const buttons=group.presets.map(id=>{
      optgroup.append(presetOptions.get(id));
      const button=make('button','menuCelebrationPick',GAME_PRESETS[id].name);
      button.type='button';
      button.dataset.preset=id;
      if(id==='holyThursday'||id==='goodFriday')button.classList.add(id==='holyThursday'?'menuTint-white':'menuTint-red');
      button.addEventListener('click',()=>{
        presetSelect.value=id;
        presetSelect.dispatchEvent(new Event('change',{bubbles:true}));
      });
      detail.append(button);
      return button;
    });
    if(group.presets.length)presetSelect.append(optgroup);
    (index<7?seasonGrid:otherGrid).append(detail);
    return {detail,buttons,group};
  });
  presetSelect.append(presetOptions.get('custom'));
  presetSelect.value=presetValue;
  let contextPreset=GAME_PRESETS[presetValue]?presetValue:null;
  function refreshCelebration(id){
    if(id&&GAME_PRESETS[id])contextPreset=id;
    const current=presetSelect.value;
    const values=formValues();
    const rite=values.rite||GAME_PRESETS[current]?.fields.rite||'mass';
    const flags=setupCelebrationFlags({...values,rite},contextPreset);
    specialNodes.forEach(node=>{node.hidden=!flags.includes(node.querySelector('input').name);});
    contextual.hidden=flags.length===0;
    contextNote.textContent=current==='custom'?'Customised celebration: only its relevant features are shown. Choose another celebration above to change its type.':GAME_PRESETS[current]?.name||'Your own choice of options.';
    seasonGroups.forEach(({detail,buttons,group})=>{
      detail.classList.toggle('hasSelection',group.presets.includes(current));
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===current)));
    });
  }
  function groupAdvancedOptions(){
    advancedGrid.replaceChildren();
    contextGrid.replaceChildren(...specialNodes);
    let section;
    for(const node of optionNodes.slice(optionNodes.findIndex(node=>node.classList.contains('optionHead')))){
      if(specialNodes.includes(node))continue;
      if(node.classList.contains('optionHead')){
        section=make('section','menuSettingsSection');
        const grid=make('div','optionGrid');
        section.append(node,grid);
        advancedGrid.append(section);
      }else section.querySelector('.optionGrid').append(node);
    }
    advancedGrid.prepend(contextual);
    difficultyGrid.replaceChildren(...difficultyNodes);
    preferenceGrid.replaceChildren(...gameNodes.filter(node=>!difficultyNodes.includes(node)));
    fieldsets[1].append(difficulty);
  }
  const stepNav=make('nav','menuSteps');
  stepNav.setAttribute('aria-label','Setup steps');
  const stepButtons=['Your role','Involvement','Celebration'].map((title,index)=>{
    const button=make('button','',`${index+1}. ${title}`);
    button.type='button';
    button.addEventListener('click',()=>showStep(index,true));
    stepNav.append(button);
    return button;
  });
  body.before(stepNav);
  const actions=form.querySelector('.sheetActions');
  const back=make('button','','Back'),next=make('button','','Next');
  back.type=next.type='button';
  back.addEventListener('click',()=>showStep(step-1,true));
  next.addEventListener('click',()=>showStep(step+1,true));
  actions.prepend(back,next);
  const start=document.getElementById('startGame');
  let layout='classic',step=0,activeFamily=0;
  const chosenRole=()=>form.querySelector('input[name="role"]:checked')?.value||'P';
  function refreshGroups(){
    groups.forEach((group,index)=>{
      const chosen=group.ids.includes(chosenRole());
      group.count.textContent=chosen?'Selected':`${group.ids.length} ${group.ids.length===1?'role':'roles'}`;
      group.detail.classList.toggle('hasSelection',chosen);
      group.button.setAttribute('aria-pressed',String(activeFamily===index));
      group.detail.hidden=layout==='dashboard'&&index!==activeFamily;
      if(layout==='dashboard')group.summary.tabIndex=-1;
      else group.summary.removeAttribute('tabindex');
      if(layout==='dashboard')group.detail.open=index===activeFamily;
    });
  }
  function refreshSelection(){
    const card=roleCards.find(node=>node.querySelector('input').value===chosenRole());
    selectedName.textContent=card.querySelector('strong').textContent;
    selectedBlurb.textContent=Array.from(card.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('');
    refreshGroups();
  }
  function showStep(index,focus=false){
    step=Math.max(0,Math.min(2,index));
    fieldsets.slice(0,3).forEach((fieldset,i)=>{fieldset.hidden=layout==='steps'&&i!==step;});
    stepButtons.forEach((button,i)=>{
      if(i===step)button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    back.hidden=layout!=='steps'||step===0;
    next.hidden=layout!=='steps'||step===2;
    start.hidden=layout==='steps'&&step!==2;
    if(focus&&layout==='steps'){
      fieldsets[step].tabIndex=-1;
      fieldsets[step].focus();
      form.scrollTop=0;
    }
  }
  function applyLayout(value){
    layout=Object.hasOwn(layouts,value)?value:'stacks';
    picker.value=layout;
    form.dataset.menu=layout;
    description.textContent=layouts[layout][1];
    const classic=layout==='classic';
    intro.textContent=classic?originalIntro:'Choose your role, involvement and celebration. The detailed settings are optional.';
    groupNav.hidden=layout!=='dashboard';
    familyNote.hidden=selected.hidden=classic;
    stepNav.hidden=layout!=='steps';
    if(classic){
      roles.className='cards';
      roles.replaceChildren(...roleCards);
      options.replaceChildren(...optionNodes);
      specialNodes.forEach(node=>{node.hidden=false;});
      gameGrid.replaceChildren(...gameNodes);
      gameAnchor.after(gameOptions);
      body.after(...fieldsets);
      advanced.remove();preferences.remove();difficulty.remove();seasonalBrowser.remove();
    }else{
      body.append(...fieldsets.slice(0,3));
      roles.className='menuRoleFamilies';
      roles.replaceChildren(groupNav,...groups.map(group=>group.detail));
      groups.forEach(group=>{
        group.cards.replaceChildren(...group.ids.map(id=>roleCards.find(card=>card.querySelector('input').value===id)));
        group.detail.open=group.ids.includes(chosenRole());
      });
      roles.after(familyNote,selected);
      const firstHeading=optionNodes.findIndex(node=>node.classList.contains('optionHead'));
      options.replaceChildren(...optionNodes.slice(0,firstHeading));
      options.before(seasonalBrowser);
      groupAdvancedOptions();
      celebration.append(advanced,preferences);
      gameOptions.remove();
    }
    activeFamily=Math.max(0,groups.findIndex(group=>group.ids.includes(chosenRole())));
    refreshSelection();
    if(!classic)refreshCelebration();
    showStep(step);
  }
  picker.addEventListener('change',event=>{
    event.stopPropagation();
    applyLayout(picker.value);
  });
  form.addEventListener('change',event=>{
    if(event.target.name==='role'||event.target.name==='level')refreshSelection();
    if(layout!=='classic')refreshCelebration();
  });
  // Enter on an early wizard page advances rather than silently starting a game.
  form.addEventListener('submit',event=>{
    if(layout==='steps'&&step<2){
      event.preventDefault();event.stopImmediatePropagation();
      showStep(step+1,true);
    }
  },true);
  applyLayout(new URLSearchParams(location.search).get('menu')||'stacks');
  return {showCelebration:()=>showStep(2),refresh:id=>{
    if(layout!=='classic')refreshCelebration(id);
    else if(GAME_PRESETS[id])contextPreset=id;
  }};
})();
