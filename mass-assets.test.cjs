const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {clipKey,clipFile}=require('./audio-names.cjs');
process.chdir(__dirname);
const read=file=>fs.readFileSync(file,'utf8');
for(const html of ['mass-animation.html','mass-3d.html','mass-game.html']){
  for(const match of read(html).matchAll(/(?:src|href)="([^"]+)"/g)){
    const asset=match[1];
    if(!asset.startsWith('#')&&!/^https?:/.test(asset)){
      assert.ok(fs.existsSync(asset),html+' references missing '+asset);
    }
    for(const html of ['mass-3d.html','mass-game.html']){
      const scripts=[...read(html).matchAll(/<script\b([^>]*)src="([^"]+)"([^>]*)>/g)];
      const names=scripts.map(match=>match[2]);
      assert.ok(names.indexOf('mass-materials.js')>names.indexOf('mass-graphics.js'));
      assert.ok(names.indexOf('mass-people.js')>names.indexOf('mass-graphics.js'));
      assert.ok(names.indexOf('mass-people.js')<names.indexOf('mass-materials.js'));
      assert.ok(names.indexOf('mass-materials.js')<names.indexOf('mass-3d.js'));
      assert.ok(names.indexOf('mass-realism.js')>names.indexOf('mass-materials.js'));
      assert.ok(names.indexOf('mass-realism.js')<names.indexOf('mass-3d.js'));
      assert.ok(names.indexOf('mass-parishes.js')<names.indexOf('mass-features.js'));
      assert.ok(names.indexOf('mass-parish-editor.js')>names.indexOf('mass-materials.js'));
      assert.ok(names.indexOf('mass-parish-editor.js')<names.indexOf('mass-3d.js'));
      for(const script of scripts){
        assert.ok(!/type\s*=\s*["']module/.test(script[1]+script[3]),'classic scripts only');
        assert.ok(!/^https?:/.test(script[2]),'scripts stay local');
      }
      assert.match(read(html),/id="peopleDetail"/,'people quality selector is present');
    }
    assert.ok(!/\bfetch\s*\(|TextureLoader|https?:\/\//.test(read('mass-materials.js')),'materials need no network or local file fetch');
    assert.ok(!/\bfetch\s*\(|Loader\b|https?:\/\/|XMLHttpRequest/.test(read('mass-realism.js')),'realistic rendering needs no network or local file fetch');
    assert.ok(!/\bfetch\s*\(|Loader\b|https?:\/\//.test(read('mass-people.js')),'people models need no network or local file fetch');
    assert.ok(read('.github/workflows/checks.yml').includes('node --check mass-materials.js'));
    assert.ok(read('.github/workflows/checks.yml').includes('node --check mass-realism.js'));
    for(const file of ['mass-parishes.js','mass-parish-editor.js']){
      assert.ok(read('.github/workflows/checks.yml').includes('node --check '+file));
    }
  }
}
// The explorer omits optional Corpus globals; outdoor decoration must still build.
{
  const source=read('mass-3d.js');
  const outdoor=source.slice(source.indexOf('const CORPUS_SCENE_ROUTE='),source.indexOf('function makeObjects()'));
  for(const route of [undefined,[],[[500,1000]],[[500,1000],[500,1200]]]){
    let petals=0,groups=0;
    const context={
      THREE:{Group:class{}},
      world:point=>{assert.ok(Array.isArray(point),'outdoor geometry requires a defined point');return {x:point[0],y:0,z:point[1]};},
      box:()=>({rotation:{}}),
      sphere:()=>{petals++;return {scale:{set(){}}};},
      scene:{add(){groups++;}},objects:{}
    };
    if(route!==undefined)context.CORPUS_ROUTE=route;
    vm.runInNewContext(outdoor+'\nbuildCorpusOutdoor();',context);
    assert.equal(petals,route?.length>1?48:0);
    assert.equal(groups,3);
    assert.equal(context.objects.corpusGround.visible,false);
  }
}
const context=vm.createContext({});
vm.runInContext(read('mass-rite.js'),context);
const baseline=vm.runInContext('JSON.stringify(STEPS)',context);
const director=JSON.parse(read('docs/director-script.json'));
assert.equal(director.steps.length,41);
assert.equal(JSON.stringify(director.steps.map(({id,startSeconds,...step})=>step)),baseline);
const audio=JSON.parse(read('audio/audio-manifest.json'));
assert.equal(audio.version,1);
const manifestContext=vm.createContext({window:{}});
vm.runInContext(read('audio/audio-manifest.js'),manifestContext);
assert.equal(JSON.stringify(manifestContext.window.MASS_STATIC_AUDIO),JSON.stringify(audio));
const jobs=JSON.parse(read('audio/audio-jobs.json'));
const jobsByKey=new Map(jobs.map(job=>[clipKey(job.language,job.role,job.text),job]));
assert.equal(new Set(jobs.map(job=>job.file)).size,jobs.length,'audio filenames must be unique');
for(const job of jobs){
  assert.equal(job.file,clipFile(job.language,job.role,job.text,job.steps[0]));
}
for(const [key,relative] of Object.entries(audio.clips)){
  const [language,role,text]=JSON.parse(key);
  assert.ok(['en','la'].includes(language));
  assert.ok(['P','D','L','Ps','ppl'].includes(role));
  assert.ok(text);
  assert.equal(relative,jobsByKey.get(key)?.file,'manifest path must match its job: '+key);
  assert.ok(fs.statSync(relative).size>500);
}
const index=read('audio/index.csv').replace(/^\ufeff/,'').trim().split(/\r?\n/);
assert.equal(index.length,jobs.length+1);
for(const job of jobs)assert.ok(index.some(line=>line.startsWith(job.file+',')),'index lists '+job.file);
console.log('Validated director export, local assets and '+Object.keys(audio.clips).length+' static audio references.');

// Parish intake: formats, rule checks, draft conversion and the CLI round trip.
{
  const os=require('node:os');
  const crypto=require('node:crypto');
  const {execFileSync}=require('node:child_process');
  const Intake=require('./parish-intake.js');
  const profiles=vm.createContext({});
  vm.runInContext(read('mass-parishes.js')+'\nthis.ChurchProfiles=ChurchProfiles;',profiles);
  const spec=Intake.emptySpec('st-test','St Test');
  assert.deepEqual(Intake.validateSpec(spec),[]);
  const set=(field,value,source='card',confidence='medium')=>{Object.assign(spec.values[field],{value,source,confidence});};
  set('interior.naveWidth',20);set('interior.naveLength',25);set('interior.seatingStyle','aisles');
  set('fixtures.altar.across',0);set('fixtures.altar.depth',5.5);
  set('fixtures.ambo.across',-7);set('fixtures.ambo.depth',6.5);
  set('interior.firstPew',30);set('walls.colour','#AABBCC');set('roof.pitch',40);
  set('belfry.type','tower');set('interior.sacristySide','left');
  assert.deepEqual(Intake.validateSpec(spec),[]);
  const bad=JSON.parse(JSON.stringify(spec));
  bad.values['roof.pitch'].value=90;bad.values['walls.material'].value='glass';bad.values['roof.form'].source='card';
  bad.values.extra={};
  const badErrors=Intake.validateSpec(bad).join('\n');
  for(const text of ['roof.pitch','walls.material','is a gap','unsupported fields'])assert.match(badErrors,new RegExp(text.replace('.','\\.')));
  const {profile,report}=Intake.specToProfile(spec,profiles.ChurchProfiles);
  assert.equal(report.valid,true,report.errors.join('; '));
  assert.deepEqual(profile.fixtures.altar,[500,183]);
  assert.deepEqual(profile.fixtures.ambo,[150,216]);
  assert.equal(profile.shell.wall,'#aabbcc');
  assert.ok(report.clamped.some(c=>c.field==='seating.front'&&c.used===390));
  assert.ok(report.limitations.some(l=>/Sacristy/.test(l))&&report.limitations.some(l=>/Belfry/.test(l)));
  assert.ok(report.missing.includes('fixtures.chair.across'));
  profiles.ChurchProfiles.validate(profile);
  const church={lat:51.5,lon:-0.12};
  assert.equal(Math.round(Intake.bearing({lat:51.4995,lon:-0.12},church)),0);
  assert.equal(Intake.aimCheck({location:{lat:51.4995,lon:-0.12},heading:10},church).ok,true);
  assert.deepEqual(Intake.aimCheck({location:{lat:51.4995,lon:-0.12},heading:180},church).reasons,['wrong-side']);
  assert.deepEqual(Intake.aimCheck({location:{lat:51.4995,lon:-0.12},heading:80},church).reasons,['bearing-mismatch']);
  assert.ok(Intake.aimCheck({location:{lat:51.49,lon:-0.12},heading:0},church).reasons.includes('far-from-church'));
  assert.deepEqual(Intake.aimCheck({location:null,heading:null},church).reasons,['location-missing']);

  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'parish-intake-'));
  const run=(...args)=>execFileSync(process.execPath,['parish-intake.cjs',...args],
    {env:{...process.env,PARISH_INTAKE_DIR:tmp},encoding:'utf8'});
  try{
    run('template','st-test','St Test');
    const base=path.join(tmp,'st-test');
    const bytes=Buffer.from('not really a jpeg');
    fs.writeFileSync(path.join(base,'source','streetview-01.jpg'),bytes);
    fs.writeFileSync(path.join(base,'derived','streetview-01.jpg'),bytes);
    fs.writeFileSync(path.join(base,'source','estimate-card-01.txt'),'nave 20 x 25 m');
    const item=(id,kind,file,extra)=>({id,kind,original:file,file:'source/'+file,derived:null,
      sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(base,'source',file))).digest('hex'),
      bytes:1,captured:null,location:null,heading:null,provenance:'test',licence:'reference-only',status:'accepted',
      confidence:1,reasons:[],view:null,shows:[],notes:null,review:null,...extra});
    const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
    manifest.items.push(item('estimate-card-01','estimate-card','estimate-card-01.txt'),
      item('streetview-01','streetview','streetview-01.jpg',{derived:'derived/streetview-01.jpg',
        location:{lat:51.4995,lon:-0.12},heading:180,status:'flagged',confidence:.3,reasons:['wrong-side']}));
    fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(manifest));
    spec.cards=['estimate-card-01'];spec.location=church;
    spec.conflicts.push({id:'nave-width',field:'interior.naveWidth',candidates:[{source:'card',value:20},{source:'satellite',value:22}],
      chosen:20,reason:'test',status:'open'});
    fs.writeFileSync(path.join(base,'spec.json'),JSON.stringify(spec));
    assert.match(run('check'),/ok {3}st-test/);
    assert.deepEqual(JSON.parse(run('aim','st-test'))[0].reasons,['wrong-side']);
    assert.match(run('draft','st-test'),/^valid/);
    run('index');
    const window={};
    vm.runInNewContext(fs.readFileSync(path.join(tmp,'review-index.js'),'utf8'),{window});
    const queued=JSON.parse(JSON.stringify(window.PARISH_REVIEW_INDEX.items));
    assert.deepEqual(queued.map(q=>q.type).sort(),['conflict','gap','image','profile']);
    for(const q of queued)assert.deepEqual(Intake.validateQueueItem(Object.fromEntries(Object.entries(q).filter(([k])=>k!=='parishName'))),[]);
    assert.equal(queued.find(q=>q.type==='image').image,'parishes/st-test/derived/streetview-01.jpg');
    const decisions={decisionsVersion:1,exported:'2024-01-01T00:00:00Z',decisions:[
      {id:'st-test:streetview-01',decision:'accept',comment:'church at right edge',decided:'2024-01-01T00:00:00Z'},
      {id:'st-test:conflict-nave-width',decision:'reject',comment:'measure again',decided:'2024-01-01T00:00:00Z'}]};
    assert.deepEqual(Intake.validateDecisions(decisions),[]);
    fs.writeFileSync(path.join(tmp,'decisions.json'),JSON.stringify(decisions));
    run('apply',path.join(tmp,'decisions.json'));
    const after=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8')).items[1];
    assert.equal(after.status,'accepted');assert.equal(after.review.comment,'church at right edge');
    assert.equal(JSON.parse(fs.readFileSync(path.join(base,'spec.json'),'utf8')).conflicts[0].status,'rejected');
    const remaining=JSON.parse(fs.readFileSync(path.join(base,'review','queue.json'),'utf8')).map(q=>q.type).sort();
    assert.deepEqual(remaining,['gap','profile']);
    assert.match(run('check'),/ok/);
    fs.writeFileSync(path.join(base,'source','streetview-01.jpg'),'changed');
    assert.throws(()=>run('check'),error=>/checksum differs/.test(error.stdout));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
  const review=read('parish-review.html');
  for(const src of ['parish-intake.js','parishes/review-index.js','parish-review.js'])assert.ok(review.includes('src="'+src+'"'));
  assert.doesNotMatch(read('parish-review.js'),/innerHTML|fetch\(/);
  console.log('Validated parish intake formats, rule checks, draft conversion and review round trip.');
}
