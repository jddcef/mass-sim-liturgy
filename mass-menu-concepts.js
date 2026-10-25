'use strict';

// Layout experiments move the existing controls, never copy or replace their values.
window.SetupMenus=(()=>{
  const form=document.getElementById('setupForm');
  const fieldsets=Array.from(form.children).filter(node=>node.tagName==='FIELDSET');
  const roles=document.getElementById('roleCards');
  const roleCards=Array.from(roles.children);
  const celebration=fieldsets[2],gameOptions=fieldsets[3];
  const options=celebration.querySelector('.optionGrid');
  const optionNodes=Array.from(options.children);
  const gameAnchor=document.createComment('Original game options position');
  gameOptions.before(gameAnchor);
  const make=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text)node.textContent=text;
    return node;
  };
  const layouts={
    stacks:['A. Card stacks','Browse five role families. Open a stack, pick a role, and keep the rest tucked away.'],
    dashboard:['B. Dashboard','A role library on the left, your celebration and involvement on the right.'],
    steps:['C. Step by step','One decision at a time: your role, your involvement, then your celebration.'],
    classic:['Original menu','The existing long form, for comparison. No choices are lost when switching layouts.']
  };
  const families=[
    ['Ordained ministers','Priest and Deacon',['P','D'],'vestment'],
    ['Altar & procession','Servers and bearers',['S','X','C1','T','MB','CB'],'candle'],
    ['Word & Communion','Readers and EMHC',['L','L2','E'],'book'],
    ['Support & coordination','Preparation and practical duties',['MC','SAC','U','AV'],'sacristy'],
    ['Congregation','Take part from the pews',['PEW'],'people']
  ];
  const toolbar=make('div','menuConcepts');
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
  toolbar.append(make('span','menuEyebrow','DESIGN PREVIEW'),pickerLabel,description);
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
  const levelNote=make('p','menuLevelNote');
  levelNote.setAttribute('aria-live','polite');
  document.getElementById('levelCards').after(levelNote);
  const advanced=make('details','menuAdvanced');
  advanced.append(make('summary','','Fine-tune celebration & church'));
  const advancedGrid=make('div','optionGrid');
  advanced.append(advancedGrid);
  const preferences=make('details','menuAdvanced');
  preferences.append(make('summary','','Game, sound & camera options'));
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
    levelNote.textContent=GAME_LEVELS[form.elements.level.value||'choice'].blurb;
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
    layout=Object.hasOwn(layouts,value)?value:'classic';
    picker.value=layout;
    form.dataset.menu=layout;
    description.textContent=layouts[layout][1];
    const classic=layout==='classic';
    intro.textContent=classic?originalIntro:'Choose your role, involvement and celebration. The detailed settings are optional.';
    groupNav.hidden=layout!=='dashboard';
    familyNote.hidden=selected.hidden=classic;
    levelNote.hidden=classic||layout==='steps';
    stepNav.hidden=layout!=='steps';
    if(classic){
      roles.className='cards';
      roles.replaceChildren(...roleCards);
      options.replaceChildren(...optionNodes);
      gameAnchor.after(gameOptions);
      body.after(...fieldsets);
      advanced.remove();preferences.remove();
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
      advancedGrid.replaceChildren(...optionNodes.slice(firstHeading));
      celebration.append(advanced,preferences);
      preferences.append(gameOptions);
    }
    activeFamily=Math.max(0,groups.findIndex(group=>group.ids.includes(chosenRole())));
    refreshSelection();
    showStep(step);
  }
  picker.addEventListener('change',event=>{
    event.stopPropagation();
    applyLayout(picker.value);
  });
  form.addEventListener('change',event=>{
    if(event.target.name==='role'||event.target.name==='level')refreshSelection();
  });
  // Enter on an early wizard page advances rather than silently starting a game.
  form.addEventListener('submit',event=>{
    if(layout==='steps'&&step<2){
      event.preventDefault();event.stopImmediatePropagation();
      showStep(step+1,true);
    }
  },true);
  applyLayout(new URLSearchParams(location.search).get('menu')||'classic');
  return {showCelebration:()=>showStep(2)};
})();
