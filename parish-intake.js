'use strict';
// Parish intake formats: source manifest, parish spec, review queue and decisions.
// Classic script so the reviewer works from file://; Node tools load it with vm.
const ParishIntake=(()=>{
  const SOURCES=['card','satellite','streetview','interior','exterior-photo','plan-sketch','spreadsheet','estimate','reviewer'];
  const CONFIDENCE=['low','medium','high'];
  const KINDS=['satellite','streetview','interior','exterior-photo','estimate-card','plan-sketch','spreadsheet','other'];
  const STATUS=['pending','accepted','flagged','excluded'];
  const VIEWS=['entrance-to-sanctuary','sanctuary','sanctuary-left','sanctuary-right','nave-from-sanctuary',
    'side-aisle','sacristy','door','exterior-front','exterior-side','exterior-rear','detail','unknown'];
  const FIXTURES=['altar','ambo','chair','credence','ministers','tabernacle'];
  const REASONS={
    'bearing-mismatch':'Camera heading does not point at the church',
    'wrong-side':'Taken from the wrong side of the street or facing away',
    'church-not-visible':'The church is not visible',
    'other-building':'Shows a different building',
    'occluded':'Church mostly hidden (vehicles, trees, scaffolding)',
    'blurred':'Blurred or out of focus',
    'too-dark':'Too dark or overexposed to read',
    'low-resolution':'Resolution too low to be useful',
    'duplicate':'Duplicate or near-duplicate of another item',
    'location-missing':'No location or heading recorded',
    'far-from-church':'Capture point is far from the church',
    'unclear-parish':'Not certain which parish this shows',
    'interior-unknown-view':'Interior view cannot be classified',
    'people-identifiable':'Identifiable people visible',
    'number-plates':'Readable number plates visible',
    'private-notice':'Personal notices or names readable',
    'licence-unknown':'Licence or permission unknown',
    'conflict':'Sources disagree',
    'other':'Other (see notes)'
  };
  const m=(min,max)=>({unit:'m',min,max});
  const enumOf=(...values)=>({unit:'enum',values});
  const FIELDS={
    'site.facadeBearing':{unit:'deg',min:0,max:360},
    'footprint.length':m(4,200),'footprint.width':m(4,120),
    'footprint.planForm':enumOf('rectangle','cruciform','L-shape','apsed','round','other'),
    'footprint.apseDepth':m(0,40),
    'walls.material':enumOf('brick','stone','render','concrete','timber','metal','other'),
    'walls.colour':{unit:'hex'},'walls.eaveHeight':m(1,60),
    'roof.form':enumOf('gable','hip','flat','barrel','mansard','shed','other'),
    'roof.pitch':{unit:'deg',min:0,max:75},
    'roof.material':enumOf('slate','tile','metal','copper','felt','shingle','other'),
    'roof.colour':{unit:'hex'},'roof.ridgeHeight':m(1,80),
    'belfry.type':enumOf('none','bellcote','tower','spire','campanile'),
    'belfry.position':enumOf('none','front-centre','front-left','front-right','side','rear','detached'),
    'belfry.width':m(0,40),'belfry.depth':m(0,40),'belfry.height':m(0,150),
    'belfry.top':enumOf('none','flat','parapet','pyramid','spire','onion','dome','gable'),
    'belfry.spireHeight':m(0,100),
    'openings.mainDoorWidth':m(.5,12),'openings.mainDoorHeight':m(1,15),
    'openings.windowStyle':enumOf('lancet','round-arch','rectangular','rose','mixed','none'),
    'openings.windowsLeft':{unit:'count',min:0,max:60},'openings.windowsRight':{unit:'count',min:0,max:60},
    'interior.naveLength':m(4,150),'interior.naveWidth':m(4,80),'interior.naveHeight':m(2,60),
    'interior.sanctuaryDepth':m(1,40),'interior.sanctuarySteps':{unit:'count',min:0,max:20},
    'interior.seatingStyle':enumOf('aisles','full'),
    'interior.pewRowsLeft':{unit:'count',min:0,max:120},'interior.pewRowsRight':{unit:'count',min:0,max:120},
    'interior.seatingLeftOuter':m(-40,0),'interior.seatingLeftInner':m(-40,0),
    'interior.seatingRightInner':m(0,40),'interior.seatingRightOuter':m(0,40),
    'interior.firstPew':m(1,150),'interior.lastPew':m(1,150),
    'interior.mainDoorAcross':m(-40,40),
    'interior.sacristySide':enumOf('left','right','behind','none'),
    'interior.sacristyDoorDepth':m(0,40)
  };
  for(const id of FIXTURES){FIELDS['fixtures.'+id+'.across']=m(-40,40);FIELDS['fixtures.'+id+'.depth']=m(0,60);}
  const SPEC_KEYS=['specVersion','id','name','address','location','cards','values','conflicts','notes'];
  const VALUE_KEYS=['value','unit','source','confidence','ref','note'];
  const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(v);
  const optionalText=v=>v===null||typeof v==='string';
  function exact(value,keys,label,errors){
    if(!isObject(value)){errors.push(label+' must be an object.');return false;}
    const extra=Object.keys(value).filter(k=>!keys.includes(k)),missing=keys.filter(k=>!Object.hasOwn(value,k));
    if(extra.length)errors.push(label+' has unsupported fields: '+extra.join(', ')+'.');
    if(missing.length)errors.push(label+' is missing: '+missing.join(', ')+'.');
    return !extra.length&&!missing.length;
  }
  function location(value,label,errors){
    if(value===null)return;
    if(!exact(value,['lat','lon'],label,errors))return;
    if(!Number.isFinite(value.lat)||Math.abs(value.lat)>90||!Number.isFinite(value.lon)||Math.abs(value.lon)>180){
      errors.push(label+' needs a valid latitude and longitude.');
    }
  }
  function checkValue(path,entry,errors){
    const rule=FIELDS[path],label='values["'+path+'"]';
    if(!exact(entry,VALUE_KEYS,label,errors))return;
    if(entry.unit!==rule.unit)errors.push(label+' unit must be "'+rule.unit+'".');
    if(!optionalText(entry.ref)||!optionalText(entry.note))errors.push(label+' ref and note must be text or null.');
    if(entry.value===null){
      if(entry.source!==null||entry.confidence!==null)errors.push(label+' is a gap: source and confidence must be null.');
      return;
    }
    if(!SOURCES.includes(entry.source))errors.push(label+' source must be one of '+SOURCES.join(', ')+'.');
    if(!CONFIDENCE.includes(entry.confidence))errors.push(label+' confidence must be low, medium or high.');
    if(rule.unit==='enum'){if(!rule.values.includes(entry.value))errors.push(label+' must be one of '+rule.values.join(', ')+'.');}
    else if(rule.unit==='hex'){if(typeof entry.value!=='string'||!/^#[0-9a-f]{6}$/i.test(entry.value))errors.push(label+' must be a #rrggbb colour.');}
    else if(!Number.isFinite(entry.value)||entry.value<rule.min||entry.value>rule.max||
      (rule.unit==='count'&&!Number.isInteger(entry.value))){
      errors.push(label+' must be '+(rule.unit==='count'?'a whole number ':'')+'between '+rule.min+' and '+rule.max+' '+rule.unit+'.');
    }
  }
  function validateSpec(spec){
    const errors=[];
    if(!exact(spec,SPEC_KEYS,'Spec',errors))return errors;
    if(spec.specVersion!==1)errors.push('specVersion must be 1.');
    if(!slug(spec.id))errors.push('id must be a lowercase slug.');
    if(typeof spec.name!=='string'||!spec.name.trim())errors.push('name is required.');
    if(!optionalText(spec.address)||!optionalText(spec.notes))errors.push('address and notes must be text or null.');
    location(spec.location,'location',errors);
    if(!Array.isArray(spec.cards)||spec.cards.some(c=>typeof c!=='string'))errors.push('cards must list manifest item ids.');
    if(exact(spec.values,Object.keys(FIELDS),'values',errors)||isObject(spec.values)){
      for(const [path,entry] of Object.entries(spec.values))if(FIELDS[path])checkValue(path,entry,errors);
    }
    if(!Array.isArray(spec.conflicts))errors.push('conflicts must be an array.');
    else spec.conflicts.forEach((c,i)=>{
      const label='conflicts['+i+']';
      if(!exact(c,['id','field','candidates','chosen','reason','status'],label,errors))return;
      if(!slug(c.id))errors.push(label+' id must be a slug.');
      if(!FIELDS[c.field])errors.push(label+' field is unknown.');
      if(!Array.isArray(c.candidates)||c.candidates.length<2||c.candidates.some(x=>!isObject(x)||!SOURCES.includes(x.source)))
        errors.push(label+' needs at least two candidates with a known source.');
      if(typeof c.reason!=='string'||!c.reason)errors.push(label+' needs a reason.');
      if(!['open','resolved','rejected'].includes(c.status))errors.push(label+' status must be open, resolved or rejected.');
    });
    return errors;
  }
  function emptySpec(id='parish-id',name='Parish name'){
    const values={};
    for(const [path,rule] of Object.entries(FIELDS))values[path]={value:null,unit:rule.unit,source:null,confidence:null,ref:null,note:null};
    return {specVersion:1,id,name,address:null,location:null,cards:[],values,conflicts:[],notes:null};
  }
  const ITEM_KEYS=['id','kind','original','file','derived','sha256','bytes','captured','location','heading',
    'provenance','licence','status','confidence','reasons','view','shows','notes','review'];
  function validateManifest(manifest){
    const errors=[];
    if(!exact(manifest,['manifestVersion','parish','sourceRoot','items'],'Manifest',errors))return errors;
    if(manifest.manifestVersion!==1)errors.push('manifestVersion must be 1.');
    if(!slug(manifest.parish))errors.push('parish must be a lowercase slug.');
    if(!Array.isArray(manifest.items)){errors.push('items must be an array.');return errors;}
    const ids=new Set();
    manifest.items.forEach((item,i)=>{
      const label='items['+i+']';
      if(!exact(item,ITEM_KEYS,label,errors))return;
      if(!slug(item.id)||ids.has(item.id))errors.push(label+' id must be a unique slug.');
      ids.add(item.id);
      if(!KINDS.includes(item.kind))errors.push(label+' kind must be one of '+KINDS.join(', ')+'.');
      if(typeof item.file!=='string'||!item.file.startsWith('source/'))errors.push(label+' file must be under source/.');
      if(item.derived!==null&&(typeof item.derived!=='string'||!item.derived.startsWith('derived/')))errors.push(label+' derived must be under derived/ or null.');
      if(typeof item.sha256!=='string'||!/^[0-9a-f]{64}$/.test(item.sha256))errors.push(label+' needs a sha256 hex checksum.');
      if(!STATUS.includes(item.status))errors.push(label+' status must be one of '+STATUS.join(', ')+'.');
      if(!Number.isFinite(item.confidence)||item.confidence<0||item.confidence>1)errors.push(label+' confidence must be 0-1.');
      if(!Array.isArray(item.reasons)||item.reasons.some(r=>!REASONS[r]))errors.push(label+' reasons must use the documented codes.');
      if((item.status==='flagged'||item.status==='excluded')&&!item.reasons?.length)errors.push(label+' flagged or excluded items need a reason.');
      if(item.heading!==null&&(!Number.isFinite(item.heading)||item.heading<0||item.heading>=360))errors.push(label+' heading must be 0-359.9 or null.');
      if(item.view!==null&&!VIEWS.includes(item.view))errors.push(label+' view is unknown.');
      if(!Array.isArray(item.shows)||item.shows.some(f=>!FIXTURES.includes(f)))errors.push(label+' shows must list fixture ids.');
      location(item.location,label+'.location',errors);
    });
    return errors;
  }
  // Bearing from capture point to church, in degrees clockwise from north.
  function bearing(from,to){
    const r=Math.PI/180,dl=(to.lon-from.lon)*r;
    const y=Math.sin(dl)*Math.cos(to.lat*r);
    const x=Math.cos(from.lat*r)*Math.sin(to.lat*r)-Math.sin(from.lat*r)*Math.cos(to.lat*r)*Math.cos(dl);
    return (Math.atan2(y,x)/r+360)%360;
  }
  function distance(a,b){
    const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;
    const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;
    return 12742000*Math.asin(Math.sqrt(h));
  }
  // Rule check for a street-level capture; the agent still looks at the picture.
  function aimCheck(capture,church,tolerance=45,maxDistance=150){
    if(!capture?.location||capture.heading===null||capture.heading===undefined||!church)
      return {ok:null,reasons:['location-missing']};
    const want=bearing(capture.location,church),metres=distance(capture.location,church);
    const off=Math.abs(((capture.heading-want+540)%360)-180);
    const reasons=[];
    if(off>tolerance)reasons.push(off>135?'wrong-side':'bearing-mismatch');
    if(metres>maxDistance)reasons.push('far-from-church');
    return {ok:!reasons.length,bearing:Math.round(want),offBy:Math.round(off),metres:Math.round(metres),reasons};
  }
  // Spec metres to plan units: across is from the central axis (+ right when facing the altar),
  // depth is from the sanctuary back wall towards the main door.
  function specToProfile(spec,Profiles){
    const report={clamped:[],missing:[],limitations:[],errors:[]};
    const v=path=>{const e=spec.values[path];if(!e||e.value===null){report.missing.push(path);return null;}return e.value;};
    const width=v('interior.naveWidth'),length=v('interior.naveLength');
    const sx=width?1000/width:40,sy=length?830/length:40;
    if(!width||!length)report.limitations.push('Nave size missing: used 40 units per metre without fitting.');
    const draft=Profiles.base();
    draft.id=spec.id;draft.name=spec.name.slice(0,100);draft.revision=1;
    const fit=(label,n,min,max)=>{
      const out=Math.round(Math.min(max,Math.max(min,n)));
      if(out!==Math.round(n))report.clamped.push({field:label,wanted:Math.round(n),used:out});
      return out;
    };
    const wall=v('walls.colour'),roof=v('roof.colour');
    if(wall)draft.shell.wall=wall.toLowerCase();
    if(roof)draft.shell.roof=roof.toLowerCase();
    draft.shell.exterior=!!(v('footprint.length')&&v('footprint.width'));
    for(const id of FIXTURES){
      const a=v('fixtures.'+id+'.across'),d=v('fixtures.'+id+'.depth');
      if(a===null||d===null)continue;
      const altar=id==='altar';
      draft.fixtures[id]=[fit(id+'.x',500+a*sx,altar?250:100,altar?750:900),fit(id+'.depth',d*sy,altar?100:32,altar?235:260)];
    }
    const style=v('interior.seatingStyle');
    if(style)draft.seating.style=style;
    const seat=[['seatingLeftOuter','left',130,200],['seatingLeftInner','leftEnd',410,455],
      ['seatingRightInner','right',545,590],['seatingRightOuter','rightEnd',800,870]];
    for(const [field,key,min,max] of seat){const a=v('interior.'+field);if(a!==null)draft.seating[key]=fit('seating.'+key,500+a*sx,min,max);}
    const first=v('interior.firstPew'),last=v('interior.lastPew');
    if(first!==null)draft.seating.front=fit('seating.front',first*sy,350,390);
    if(last!==null)draft.seating.back=fit('seating.back',last*sy,680,715);
    const door=v('interior.mainDoorAcross');
    if(door!==null)draft.doors.main=fit('doors.main',500+door*sx,490,510);
    const side=v('interior.sacristySide'),sacristyDepth=v('interior.sacristyDoorDepth');
    if(side&&side!=='right')report.limitations.push('Sacristy is "'+side+'"; the rectangular-v1 shell only has a right-hand sacristy.');
    if(sacristyDepth!==null)draft.doors.sacristy=fit('doors.sacristy',sacristyDepth*sy,120,140);
    if(v('footprint.planForm')&&spec.values['footprint.planForm'].value!=='rectangle')
      report.limitations.push('Plan form "'+spec.values['footprint.planForm'].value+'" is drawn as a rectangle.');
    if(v('belfry.type')&&spec.values['belfry.type'].value!=='none')
      report.limitations.push('Belfry ('+spec.values['belfry.type'].value+') is recorded but not yet drawn by the shell.');
    if(v('roof.pitch')!==null)report.limitations.push('Roof pitch is recorded but the shell uses its own pitch.');
    try{Profiles.validate(draft);}catch(error){report.errors.push(error.message);}
    report.valid=!report.errors.length;
    return {profile:draft,report};
  }
  function validateQueueItem(item){
    const errors=[];
    if(!exact(item,['id','parish','type','title','question','image','suggestion','confidence','reasons','details','ref'],'Queue item',errors))return errors;
    if(typeof item.id!=='string'||!/^[a-z0-9-]+:[a-z0-9:-]+$/.test(item.id))errors.push('Queue item id must look like parish:item.');
    if(!slug(item.parish))errors.push('Queue item parish must be a slug.');
    if(!['image','conflict','gap','profile'].includes(item.type))errors.push('Queue item type is unknown.');
    if(!['accept','reject','check'].includes(item.suggestion))errors.push('Queue item suggestion must be accept, reject or check.');
    if(item.image!==null&&(typeof item.image!=='string'||!item.image.startsWith('parishes/')||item.image.includes('..')))
      errors.push('Queue item image must be a repo path under parishes/.');
    if(!Array.isArray(item.reasons)||item.reasons.some(r=>!REASONS[r]))errors.push('Queue item reasons must use documented codes.');
    if(typeof item.title!=='string'||typeof item.question!=='string')errors.push('Queue item needs a title and a question.');
    return errors;
  }
  function validateDecisions(data){
    const errors=[];
    if(!exact(data,['decisionsVersion','exported','decisions'],'Decisions',errors))return errors;
    if(data.decisionsVersion!==1)errors.push('decisionsVersion must be 1.');
    if(!Array.isArray(data.decisions))errors.push('decisions must be an array.');
    else data.decisions.forEach((d,i)=>{
      if(!exact(d,['id','decision','comment','decided'],'decisions['+i+']',errors))return;
      if(!['accept','reject'].includes(d.decision))errors.push('decisions['+i+'] must be accept or reject.');
      if(typeof d.comment!=='string')errors.push('decisions['+i+'] comment must be text.');
    });
    return errors;
  }
  return {SOURCES,CONFIDENCE,KINDS,STATUS,VIEWS,FIXTURES,REASONS,FIELDS,
    validateSpec,emptySpec,validateManifest,bearing,distance,aimCheck,specToProfile,validateQueueItem,validateDecisions};
})();
if(typeof module!=='undefined')module.exports=ParishIntake;
