#!/usr/bin/env node
'use strict';
// Parish intake helper. See docs/PARISH-INTAKE.md. Works offline; never touches source/ files.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const Intake=require('./parish-intake.js');

const ROOT=__dirname;
const PARISHES=process.env.PARISH_INTAKE_DIR?path.resolve(process.env.PARISH_INTAKE_DIR):path.join(ROOT,'parishes');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(ROOT,'mass-parishes.js'),'utf8')+'\nthis.ChurchProfiles=ChurchProfiles;',context);
const Profiles=context.ChurchProfiles;

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const dir=id=>path.join(PARISHES,id);
const short=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,8);
const parishIds=()=>fs.existsSync(PARISHES)?fs.readdirSync(PARISHES,{withFileTypes:true})
  .filter(d=>d.isDirectory()&&/^[a-z]/.test(d.name)&&fs.existsSync(path.join(PARISHES,d.name,'spec.json'))).map(d=>d.name).sort():[];
function load(id){
  if(!/^[a-z][a-z0-9-]{0,63}$/.test(id||''))throw new Error('Parish id must be a lowercase slug.');
  const base=dir(id);
  const decisionsFile=path.join(base,'review','decisions.json');
  return {base,spec:readJson(path.join(base,'spec.json')),manifest:readJson(path.join(base,'manifest.json')),
    decisions:fs.existsSync(decisionsFile)?readJson(decisionsFile):[]};
}

function template(id,name){
  if(!/^[a-z][a-z0-9-]{0,63}$/.test(id||''))throw new Error('Usage: template <parish-id> "<Parish name>"');
  const base=dir(id);
  if(fs.existsSync(path.join(base,'spec.json')))throw new Error(id+' already exists.');
  for(const sub of ['source','derived','review'])fs.mkdirSync(path.join(base,sub),{recursive:true});
  writeJson(path.join(base,'spec.json'),Intake.emptySpec(id,name||id));
  writeJson(path.join(base,'manifest.json'),{manifestVersion:1,parish:id,sourceRoot:null,items:[]});
  writeJson(path.join(base,'review','decisions.json'),[]);
  console.log('Created '+path.relative(ROOT,base));
}

function check(ids){
  let failures=0;
  for(const id of ids.length?ids:parishIds()){
    const errors=[];
    try{
      const {base,spec,manifest}=load(id);
      errors.push(...Intake.validateSpec(spec).map(e=>'spec: '+e));
      errors.push(...Intake.validateManifest(manifest).map(e=>'manifest: '+e));
      if(spec.id!==id||manifest.parish!==id)errors.push('spec.id and manifest.parish must equal the folder name.');
      const itemIds=new Set((manifest.items||[]).map(i=>i.id));
      for(const card of spec.cards||[])if(!itemIds.has(card))errors.push('spec card "'+card+'" is not in the manifest.');
      for(const item of manifest.items||[]){
        const file=path.join(base,item.file||'');
        if(!fs.existsSync(file)){errors.push(item.id+': missing '+item.file);continue;}
        const sum=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        if(sum!==item.sha256)errors.push(item.id+': checksum differs from manifest (source must not change).');
        if(item.derived&&!fs.existsSync(path.join(base,item.derived)))errors.push(item.id+': missing '+item.derived);
      }
      const queueFile=path.join(base,'review','queue.json');
      if(fs.existsSync(queueFile))for(const q of readJson(queueFile))errors.push(...Intake.validateQueueItem(q).map(e=>'queue '+q.id+': '+e));
    }catch(error){errors.push(error.message);}
    failures+=errors.length;
    console.log((errors.length?'FAIL ':'ok   ')+id+(errors.length?'\n  - '+errors.join('\n  - '):''));
  }
  if(failures)process.exitCode=1;
}

function aim(id,tolerance,maxDistance){
  const {spec,manifest}=load(id);
  const results=manifest.items.filter(i=>i.kind==='streetview'||i.kind==='exterior-photo')
    .map(i=>({id:i.id,...Intake.aimCheck(i,spec.location,tolerance?Number(tolerance):45,maxDistance?Number(maxDistance):150)}));
  console.log(JSON.stringify(results,null,2));
}

function draft(id){
  const {base,spec}=load(id);
  const errors=Intake.validateSpec(spec);
  if(errors.length)throw new Error('Fix spec.json first:\n  - '+errors.join('\n  - '));
  const {profile,report}=Intake.specToProfile(spec,Profiles);
  writeJson(path.join(base,'profile.draft.json'),profile);
  writeJson(path.join(base,'profile-report.json'),report);
  console.log((report.valid?'valid':'INVALID')+' draft written; '+report.clamped.length+' clamped, '+
    report.missing.length+' missing, '+report.limitations.length+' limitations.');
}

const KEY_FIELDS=['interior.naveLength','interior.naveWidth','interior.seatingStyle','interior.firstPew','interior.lastPew',
  'fixtures.altar.across','fixtures.altar.depth','fixtures.ambo.across','fixtures.ambo.depth','fixtures.chair.across',
  'fixtures.chair.depth','fixtures.tabernacle.across','fixtures.tabernacle.depth','interior.sacristySide',
  'footprint.length','footprint.width','walls.colour','roof.colour','roof.form','belfry.type'];
function buildQueue(id){
  const {base,spec,manifest,decisions}=load(id);
  const decided=new Set(decisions.map(d=>d.id));
  const queue=[];
  const add=item=>{if(!decided.has(item.id))queue.push({ref:null,image:null,details:null,reasons:[],...item,parish:id});};
  for(const item of manifest.items){
    const doubtful=item.status!=='accepted'||item.confidence<0.8;
    if(!doubtful||item.review)continue;
    const image=/\.(jpe?g|png|webp|gif)$/i.test(item.derived||item.file)?'parishes/'+id+'/'+(item.derived||item.file):null;
    add({id:id+':'+item.id,type:'image',title:item.kind+' - '+item.id,
      question:item.kind==='streetview'||item.kind==='exterior-photo'?'Does this clearly show this parish church?':
        item.kind==='interior'?'Is this interior from this church and is the view label right ('+(item.view||'unknown')+')?':
        'Is this source usable for this parish?',
      image,suggestion:item.status==='excluded'?'reject':item.status==='flagged'?'check':'accept',
      confidence:item.confidence,reasons:item.reasons,details:item.notes,ref:item.id});
  }
  for(const c of spec.conflicts.filter(c=>c.status==='open')){
    add({id:id+':conflict-'+c.id,type:'conflict',title:'Conflict: '+c.field,
      question:'Accept the chosen value '+JSON.stringify(c.chosen)+' for '+c.field+'?',
      suggestion:'check',confidence:null,reasons:['conflict'],
      details:c.candidates.map(x=>x.source+(x.ref?' ('+x.ref+')':'')+': '+JSON.stringify(x.value)).join('; ')+'. Reason: '+c.reason,ref:c.id});
  }
  const gaps=KEY_FIELDS.filter(f=>spec.values[f]?.value===null);
  const low=KEY_FIELDS.filter(f=>spec.values[f]?.confidence==='low');
  if(gaps.length||low.length)add({id:id+':gaps-'+short([gaps,low]),type:'gap',title:'Missing or weak key measurements',
    question:'Accept that these stay missing or low-confidence for now? Reject to request a site visit or new photos.',
    suggestion:'check',confidence:null,reasons:[],details:(gaps.length?'Missing: '+gaps.join(', ')+'. ':'')+(low.length?'Low confidence: '+low.join(', ')+'.':'')});
  const reportFile=path.join(base,'profile-report.json');
  if(fs.existsSync(reportFile)){
    const r=readJson(reportFile);
    if(r.clamped.length||r.limitations.length||r.errors.length)add({id:id+':profile-'+short(r),type:'profile',
      title:'Draft training layout adjustments',question:'Accept the draft profile with these adjustments?',
      suggestion:r.valid?'check':'reject',confidence:null,reasons:[],
      details:[...r.errors.map(e=>'Error: '+e),...r.clamped.map(c=>c.field+' '+c.wanted+' -> '+c.used),...r.limitations].join('; ')});
  }
  writeJson(path.join(base,'review','queue.json'),queue);
  return queue;
}

function index(){
  const items=[];
  for(const id of parishIds()){
    const spec=readJson(path.join(dir(id),'spec.json'));
    for(const q of buildQueue(id))items.push({...q,parishName:spec.name});
  }
  const body='// Generated by `node parish-intake.cjs index`. Do not edit by hand.\n'+
    'window.PARISH_REVIEW_INDEX='+JSON.stringify({generated:new Date().toISOString(),items},null,1)+';\n';
  fs.mkdirSync(PARISHES,{recursive:true});
  fs.writeFileSync(path.join(PARISHES,'review-index.js'),body);
  console.log(items.length+' review items from '+parishIds().length+' parishes -> parishes/review-index.js');
}

function apply(file){
  const data=readJson(file);
  const errors=Intake.validateDecisions(data);
  if(errors.length)throw new Error(errors.join('\n'));
  const byParish={};
  for(const d of data.decisions){const id=d.id.split(':')[0];(byParish[id]||=[]).push(d);}
  for(const [id,list] of Object.entries(byParish)){
    const {base,spec,manifest,decisions}=load(id);
    for(const d of list){
      const ref=d.id.slice(id.length+1);
      const item=manifest.items.find(i=>i.id===ref);
      const review={decision:d.decision,comment:d.comment,decided:d.decided};
      if(item){item.review=review;item.status=d.decision==='accept'?'accepted':'excluded';}
      const conflict=ref.startsWith('conflict-')&&spec.conflicts.find(c=>c.id===ref.slice(9));
      if(conflict)conflict.status=d.decision==='accept'?'resolved':'rejected';
      decisions.push(d);
    }
    writeJson(path.join(base,'manifest.json'),manifest);
    writeJson(path.join(base,'spec.json'),spec);
    writeJson(path.join(base,'review','decisions.json'),decisions);
    console.log(id+': applied '+list.length+' decisions');
  }
  index();
}

const [command,...args]=process.argv.slice(2);
const commands={template:()=>template(args[0],args[1]),check:()=>check(args),aim:()=>aim(...args),
  draft:()=>draft(args[0]),queue:()=>console.log(buildQueue(args[0]).length+' open items'),index,apply:()=>apply(args[0])};
try{
  if(!commands[command]){
    console.log('Usage: node parish-intake.cjs <template id "Name"|check [id...]|aim id [deg] [m]|draft id|queue id|index|apply decisions.json>');
    process.exitCode=command?1:0;
  }else commands[command]();
}catch(error){console.error(error.message);process.exitCode=1;}
