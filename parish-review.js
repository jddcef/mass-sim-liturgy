'use strict';
// Bulk reviewer for parish intake items. Reads window.PARISH_REVIEW_INDEX; saves decisions in localStorage.
const ParishReview=(()=>{
  const KEY='parish-review-decisions-v1';
  const $=id=>document.getElementById(id);
  const index=window.PARISH_REVIEW_INDEX||null;
  const items=Array.isArray(index?.items)?index.items:[];
  let decisions={};
  try{decisions=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{decisions={};}
  let list=[],pos=0;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(decisions));}catch{}};
  const reason=code=>ParishIntake.REASONS[code]||code;
  function filtered(){
    const p=$('fParish').value,t=$('fType').value,s=$('fSuggestion').value,state=$('fState').value;
    return items.filter(i=>(!p||i.parish===p)&&(!t||i.type===t)&&(!s||i.suggestion===s)&&
      (!state||(state==='open')===!decisions[i.id]));
  }
  function progress(){
    const done=items.filter(i=>decisions[i.id]).length;
    $('progress').textContent=index?done+' of '+items.length+' decided'+(index.generated?' - index built '+index.generated.slice(0,10):''):'';
  }
  function sheet(){
    list=filtered();
    const box=$('sheet');box.replaceChildren();
    $('step').hidden=true;box.hidden=false;
    $('empty').hidden=!!list.length;
    $('empty').textContent=!index?'No review index found. Run "node parish-intake.cjs index" first (see docs/PARISH-INTAKE.md).':
      'Nothing matches these filters.';
    list.forEach((item,i)=>{
      const card=document.createElement('button');
      card.type='button';card.className='card '+item.suggestion+(decisions[item.id]?' decided '+decisions[item.id].decision:'');
      if(item.image){const img=document.createElement('img');img.loading='lazy';img.src=item.image;img.alt='';card.append(img);}
      else{const tag=document.createElement('span');tag.className='tag';tag.textContent=item.type;card.append(tag);}
      const title=document.createElement('strong');title.textContent=item.title;
      const meta=document.createElement('span');
      meta.textContent=(item.parishName||item.parish)+' - agent: '+item.suggestion+
        (decisions[item.id]?' - you: '+decisions[item.id].decision:'');
      card.append(title,meta);
      card.addEventListener('click',()=>{list=filtered();pos=i;step();});
      box.append(card);
    });
    progress();
  }
  function step(){
    if(!list.length){sheet();return;}
    pos=Math.max(0,Math.min(pos,list.length-1));
    const item=list[pos],mine=decisions[item.id];
    $('sheet').hidden=true;$('step').hidden=false;$('empty').hidden=true;
    $('sPos').textContent='Item '+(pos+1)+' of '+list.length;
    $('sTitle').textContent=item.title;
    $('sParish').textContent=item.parishName?item.parishName+' ('+item.parish+')':item.parish;
    $('sQuestion').textContent=item.question;
    $('sSuggestion').textContent='Agent suggests: '+item.suggestion+
      (Number.isFinite(item.confidence)?' (confidence '+Math.round(item.confidence*100)+'%)':'');
    $('sReasons').replaceChildren(...item.reasons.map(code=>{const li=document.createElement('li');li.textContent=reason(code);return li;}));
    $('sDetails').textContent=item.details||'';
    $('sImg').hidden=!item.image;$('sNoImg').hidden=!!item.image;
    if(item.image)$('sImg').src=item.image;else $('sImg').removeAttribute('src');
    $('sComment').value=mine?.comment||'';
    $('sDecision').textContent=mine?'Your decision: '+mine.decision+(mine.comment?' - "'+mine.comment+'"':''):'';
    progress();
  }
  function decide(decision){
    const item=list[pos];if(!item)return;
    decisions[item.id]={decision,comment:$('sComment').value.trim(),decided:new Date().toISOString()};
    save();
    const next=list.findIndex((x,i)=>i>pos&&!decisions[x.id]);
    if(next>=0)pos=next;
    else if(pos<list.length-1)pos++;
    else{sheet();return;}
    step();
  }
  function exportDecisions(){
    const known=new Set(items.map(i=>i.id));
    const data={decisionsVersion:1,exported:new Date().toISOString(),
      decisions:Object.entries(decisions).filter(([id])=>known.has(id)).map(([id,d])=>({id,...d}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='parish-review-decisions.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function init(){
    for(const id of [...new Set(items.map(i=>i.parish))].sort()){
      const o=document.createElement('option');o.value=id;o.textContent=items.find(i=>i.parish===id).parishName||id;$('fParish').append(o);
    }
    for(const id of ['fParish','fType','fSuggestion','fState'])$(id).addEventListener('change',sheet);
    $('startBtn').addEventListener('click',()=>{list=filtered();pos=0;step();});
    $('acceptBtn').addEventListener('click',()=>decide('accept'));
    $('rejectBtn').addEventListener('click',()=>decide('reject'));
    $('skipBtn').addEventListener('click',()=>{if(pos<list.length-1){pos++;step();}else sheet();});
    $('backBtn').addEventListener('click',()=>{if(pos>0){pos--;step();}});
    $('sheetBtn').addEventListener('click',sheet);
    $('exportBtn').addEventListener('click',exportDecisions);
    $('clearBtn').addEventListener('click',()=>{
      if(confirm('Clear all saved review decisions in this browser? Export them first if you need them.')){decisions={};save();sheet();}
    });
    document.addEventListener('keydown',event=>{
      if($('step').hidden)return;
      const typing=event.target===$('sComment');
      if(typing){
        if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();decide('accept');}
        else if(event.key==='Escape')$('sComment').blur();
        return;
      }
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      const key=event.key.toLowerCase();
      const map={a:()=>decide('accept'),r:()=>decide('reject'),s:()=>$('skipBtn').click(),arrowright:()=>$('skipBtn').click(),
        b:()=>$('backBtn').click(),arrowleft:()=>$('backBtn').click(),escape:sheet,c:()=>$('sComment').focus()};
      if(map[key]){event.preventDefault();map[key]();}
    });
    sheet();
  }
  return {init,get decisions(){return decisions;},filtered};
})();
ParishReview.init();
