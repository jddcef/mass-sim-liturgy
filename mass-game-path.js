'use strict';
// The Path: a map of the celebrations of the liturgical year and the player's seniority.
// Rules and data live in mass-game-logic.js (CELEBRATIONS, SENIORITY_RANKS, recordCelebration).
// This file only draws them. It needs a #pathModal sheet in the page.

const PathView=(()=>{
  const KEY='massGameProgress';
  const SVG_NS='http://www.w3.org/2000/svg';
  // Ring colours for the liturgical colours; white is drawn in gold so it shows on parchment.
  const RING={green:'#3f7d4f',white:'#c9a64a',red:'#a8322b',purple:'#6a3d8f',rose:'#d58aa4'};
  let selected=null,onPrepare=null;

  function load(){
    try{return normaliseProgress(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return emptyProgress();}
  }
  function save(progress){
    try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{}
  }
  // Records a finished game; returns the logic result (or null when not on the path).
  function record(result){
    const outcome=recordCelebration(load(),result);
    if(outcome)save(outcome.progress);
    return outcome;
  }
  const node=(tag,attrs={},parent)=>{
    const n=document.createElementNS(SVG_NS,tag);
    for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
    if(parent)parent.append(n);
    return n;
  };
  const html=(tag,props={},children=[])=>{
    const n=document.createElement(tag);
    for(const [k,v] of Object.entries(props)){if(k==='dataset')Object.assign(n.dataset,v);else n[k]=v;}
    n.append(...children);
    return n;
  };
  function statusText(c,status){
    if(!status.available)return 'In preparation';
    return MARK_NAMES[status.mark];
  }
  function rankLine(progress){
    const rank=seniorityFor(progress),next=nextRank(progress);
    let text='Seniority: '+rank.name+'. '+rank.blurb;
    if(next){
      const names=next.missing.map(id=>celebrationById(id).name);
      text+=' Next: '+next.rank.name+(names.length?' (serve '+names.join(', ')+')':'')+(next.ready?'.':', when those celebrations are ready.');
    }
    return text;
  }
  function curve(a,b){
    const my=(a[1]+b[1])/2;
    return 'M'+a[0]+' '+a[1]+' C'+a[0]+' '+my+' '+b[0]+' '+my+' '+b[0]+' '+b[1];
  }
  function drawMap(progress,recommended){
    const svg=node('svg',{viewBox:'0 0 1000 1200',class:'pathSvg',role:'group','aria-label':'Map of the celebrations'});
    // Branch captions.
    const captions=[['devotion',985,140,'end'],['seasonal',150,520,'middle'],['pontifical',760,740,'middle'],['triduum',500,955,'middle']];
    for(const [b,x,y,anchor] of captions){
      const t=node('text',{x,y,class:'pathBranch','text-anchor':anchor},svg);
      t.textContent=PATH_BRANCHES[b].name;
    }
    node('rect',{x:200,y:972,width:600,height:205,rx:30,class:'pathTriduum'},svg);
    const edges=node('g',{class:'pathEdges'},svg);
    for(const c of CELEBRATIONS){
      for(const id of c.after){
        const from=celebrationById(id);
        const main=(from.branch==='main'||from.branch==='triduum')&&(c.branch==='main'||c.branch==='triduum');
        const done=celebrationStatus(progress,id).mark!=='none'&&celebrationStatus(progress,c.id).mark!=='none';
        node('path',{d:curve(from.at,c.at),class:'pathEdge'+(main?' main':'')+(celebrationAvailable(c)?'':' future')+(done?' done':'')},edges);
      }
    }
    for(const c of CELEBRATIONS){
      const status=celebrationStatus(progress,c.id);
      const g=node('g',{class:'pathNode mark-'+status.mark+(status.available?'':' future')+(recommended&&recommended.id===c.id?' recommended':'')+(selected===c.id?' selected':''),
        transform:'translate('+c.at[0]+' '+c.at[1]+')',tabindex:'0',role:'button','data-id':c.id,
        'aria-label':c.name+', '+c.precedence+': '+statusText(c,status)},svg);
      if(recommended&&recommended.id===c.id)node('circle',{r:56,class:'pathHalo'},g);
      node('circle',{r:44,class:'pathDisc',stroke:RING[c.colour]||'#8a7b60'},g);
      const icon=node('g',{transform:'translate(-24 -24) scale(2)',class:'pathIcon'},g);
      node('path',{d:GameIcons.PATHS[c.icon]},icon);
      if(c.station&&c.branch==='main'){
        node('circle',{cx:32,cy:-32,r:14,class:'pathStation'},g);
        const n=node('text',{x:32,y:-27,'text-anchor':'middle',class:'pathStationText'},g);n.textContent=String(c.station);
      }
      if(status.mark==='served'||status.mark==='distinction'){
        const tick=node('text',{x:-34,y:-24,'text-anchor':'middle',class:'pathTick'},g);tick.textContent=status.mark==='distinction'?'★':'✓';
      }
      const name=node('text',{y:66,'text-anchor':'middle',class:'pathName'},g);name.textContent=c.name;
      const sub=node('text',{y:88,'text-anchor':'middle',class:'pathSub'},g);sub.textContent=statusText(c,status);
    }
    svg.addEventListener('click',event=>{
      const g=event.target.closest('.pathNode');
      if(g)select(g.dataset.id);
    });
    svg.addEventListener('keydown',event=>{
      const g=event.target.closest('.pathNode');
      if(g&&(event.key==='Enter'||event.key===' ')){event.preventDefault();select(g.dataset.id);}
    });
    return svg;
  }
  function drawList(progress,recommended){
    const order=[...CELEBRATIONS].sort((a,b)=>{
      const rank=c=>c.branch==='triduum'?2:c.branch==='main'?0:1;
      return rank(a)-rank(b)||(a.station||0)-(b.station||0)||a.at[1]-b.at[1];
    });
    let branch=null;
    const items=[];
    for(const c of order){
      if(c.branch!==branch){branch=c.branch;items.push(html('li',{className:'pathListHead',textContent:PATH_BRANCHES[branch].name}));}
      const status=celebrationStatus(progress,c.id);
      const button=html('button',{type:'button',className:'pathListItem mark-'+status.mark+(status.available?'':' future')+(recommended&&recommended.id===c.id?' recommended':''),dataset:{id:c.id}},[
        html('span',{className:'pathSwatch',style:'border-color:'+(RING[c.colour]||'#8a7b60')}),
        html('strong',{textContent:(c.station&&c.branch==='main'?c.station+'. ':'')+c.name}),
        html('small',{textContent:' '+statusText(c,status)+(recommended&&recommended.id===c.id?' · recommended next':'')})]);
      button.onclick=()=>select(c.id);
      items.push(html('li',{},[button]));
    }
    return items;
  }
  function select(id){
    selected=id;
    const c=celebrationById(id),progress=load(),status=celebrationStatus(progress,id);
    const parts=[html('h3',{textContent:c.name}),html('p',{className:'small',textContent:c.precedence+' · '+PATH_BRANCHES[c.branch].name}),html('p',{textContent:c.blurb})];
    if(status.available){
      parts.push(html('p',{className:'small',textContent:'Your mark: '+MARK_NAMES[status.mark]+(status.best?' (best '+status.best+'%)':'')+'.'}));
      if(status.triedRoles.length)parts.push(html('p',{className:'small',textContent:'Roles tried: '+status.triedRoles.map(r=>GAME_ROLES[r].name+(status.servedRoles.includes(r)?' ✓':'')).join(', ')+'.'}));
      const button=html('button',{type:'button',className:'primary',textContent:'Prepare this celebration'});
      button.onclick=()=>{close();if(onPrepare)onPrepare(c);};
      parts.push(button);
    }else{
      parts.push(html('p',{className:'small future',textContent:'In preparation: not yet in the simulator.'}));
    }
    $('pathDetail').replaceChildren(...parts);
    for(const g of document.querySelectorAll('#pathMap .pathNode'))g.classList.toggle('selected',g.dataset.id===id);
  }
  function render(){
    const progress=load(),recommended=nextRecommended(progress);
    $('pathRank').textContent=rankLine(progress);
    $('pathMap').replaceChildren(drawMap(progress,recommended));
    $('pathList').replaceChildren(...drawList(progress,recommended));
    select(selected||recommended?.id||'feria');
  }
  function open(){
    render();
    $('pathModal').hidden=false;
    $('pathClose').focus({preventScroll:true});
  }
  function close(){$('pathModal').hidden=true;}
  function initialise(prepare){
    onPrepare=prepare;
    $('pathClose').onclick=close;
    $('pathModal').addEventListener('click',event=>{if(event.target.id==='pathModal')close();});
  }
  const isOpen=()=>!$('pathModal').hidden;
  return {load,record,open,close,initialise,isOpen,rankLine};
})();
