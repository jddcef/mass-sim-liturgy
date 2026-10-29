const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const nodes=new Map();
const node=id=>{
  if(!nodes.has(id))nodes.set(id,{value:'',checked:false,textContent:''});
  return nodes.get(id);
};
const utterances=[];
const recordings=[];
let canceled=0;
const voice={voiceURI:'test',name:'Test local',lang:'en-ZA',localService:true};
const context=vm.createContext({
  assert,console,structuredClone,
  $:node,setTimeout:()=>1,clearTimeout:()=>{},
  window:{speechSynthesis:{speak:u=>utterances.push(u),cancel:()=>{canceled++;}}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  utterances,voice,
  Audio:class{
    constructor(source){this.src=source;this.paused=false;recordings.push(this);}
    play(){return Promise.resolve();}
    pause(){this.paused=true;}
    removeAttribute(){this.src='';}
    load(){}
  },recordings
});
for(const file of ['mass-rite.js','mass-scenarios.js','mass-parishes.js','mass-features.js','mass-speech.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context);
}
vm.runInContext(`
  let scenario=buildScenario({serverCount:3,deacon:true,lector:true,incense:true});
  let cur3d=0,progress3d=0;
  assert.deepEqual(validateLayout(LAYOUT_DEFAULTS),LAYOUT_DEFAULTS);
  for(const preset of Object.values(LAYOUT_PRESETS)){
    assert.deepEqual(validateLayout(preset.positions),preset.positions);
    churchLayout=structuredClone(preset.positions);
    for(const p of Object.values(LAYOUT_DEFAULTS)){
      const mapped=furniturePoint(p),restored=furnitureUnpoint(mapped);
      assert.ok(Math.hypot(restored[0]-p[0],restored[1]-p[1])<.01,'fixture click inverse in '+preset.name);
    }
  }
  churchLayout=structuredClone(LAYOUT_DEFAULTS);
  for(const [name,p] of Object.entries(LAYOUT_DEFAULTS))assert.deepEqual(layoutPoint(p),p);
  const moved=structuredClone(LAYOUT_DEFAULTS);
  moved.altar=[540,180];
  churchLayout=validateLayout(moved);
  assert.deepEqual(layoutPoint([500,170]),[540,180]);
  assert.deepEqual(layoutPoint(ALT_P),[540,132]);
  assert.deepEqual(layoutPoint(ALT_D),[492,132]);
  assert.deepEqual(layoutPoint([500,600]),[500,600]);
  assert.deepEqual(layoutPoint(AMBO),AMBO);
  const invalid=structuredClone(moved);
  invalid.ambo=[540,180];
  assert.throws(()=>validateLayout(invalid));
  invalid.ambo=[Infinity,50];
  assert.throws(()=>validateLayout(invalid));
  churchLayout=structuredClone(LAYOUT_DEFAULTS);
  const profile=ChurchProfiles.base();
  assert.deepEqual(ChurchProfiles.validate(profile),profile);
  assert.deepEqual(ChurchProfiles.validate(JSON.parse(JSON.stringify(profile))),profile,'JSON round trip');
  for(const mutate of [
    p=>p.schemaVersion=2,p=>p.revision=0,p=>p.id='../bad',p=>p.name='',
    p=>p.shell.id='unknown',p=>p.shell.wall='red',p=>p.shell.exterior='yes',
    p=>p.extra=true,p=>p.fixtures.altar=[NaN,170],
    p=>p.fixtures.ambo=p.fixtures.altar.slice(),p=>delete p.fixtures.chair,
    p=>p.seating.leftEnd=600,p=>p.seating.front=200,
    p=>p.doors.main=700,p=>p.routes.leftFront=[300,500],
    p=>p.routes.centreBack=[Infinity,740],p=>p.routes.extra=[500,500]
  ]){
    const invalid=structuredClone(profile);mutate(invalid);
    assert.throws(()=>ChurchProfiles.validate(invalid));
  }
  const changed=structuredClone(profile);
  Object.assign(changed.seating,{left:190,leftEnd:420,right:580,rightEnd:820,front:385,back:685});
  changed.fixtures.altar=[540,180];
  ChurchProfiles.activate(changed);
  churchLayout=structuredClone(changed.fixtures);
  assert.deepEqual(layoutPoint([500,170]),[540,180]);
  assert.deepEqual(layoutPoint([150,350]),[190,385]);
  assert.deepEqual(layoutPoint([850,715]),[820,685]);
  assert.deepEqual(layoutPoint([1222,130]),[1222,130],'sacristy remains in its prepared shell');
  for(let y=0;y<=1000;y+=7)for(let x=0;x<=1250;x+=17){
    const mapped=ChurchProfiles.mapNave([x,y]);
    const restored=ChurchProfiles.mapNave(mapped,ChurchProfiles.active,true);
    assert.ok(Math.hypot(x-restored[0],y-restored[1])<1e-6,'seating map is invertible');
  }
  for(const style of ['aisles','full']){
    changed.seating.style=style;
    for(const r of ChurchProfiles.checks(changed)){
      assert.deepEqual(r.path[r.path.length-1],r.to);
      const path=[r.from,...r.path];
      for(let i=1;i<path.length;i++){
        const seatedStart=i===1&&ChurchProfiles.zones(style).some(z=>path[0][0]>z[0]&&path[0][0]<z[2]&&path[0][1]>z[1]&&path[0][1]<z[3]);
        if(!seatedStart)for(const z of ChurchProfiles.zones(style))assert.ok(!ChurchProfiles.crosses(path[i-1],path[i],z),'route avoids pew blocks except departing a row');
      }
    }
  }
  const prior=JSON.stringify(ChurchProfiles.active);
  const bad=structuredClone(changed);bad.seating.front=100;
  assert.throws(()=>ChurchProfiles.activate(bad));
  assert.equal(JSON.stringify(ChurchProfiles.active),prior,'rejected profile does not replace active data');
  const snapshot=ChurchProfiles.base();snapshot.name='Changed copy';
  assert.notEqual(ChurchProfiles.base().name,snapshot.name,'published data is not mutated');
  ChurchProfiles.activate(null);
  churchLayout=structuredClone(LAYOUT_DEFAULTS);
  for(let count=0;count<=5;count++){
    scenario=buildScenario({serverCount:count,deacon:true,lector:true,incense:true});
    for(const role of scenario.team){
      const duties=serverDuties(role);
      assert.ok(duties.length>0);
      assert.ok(duties.every(d=>d.a>=0&&d.b<=1&&d.a<=d.b));
      assert.ok(duties.every((d,i)=>!i||duties[i-1].index<=d.index));
    }
  }
  const pack=validateLanguagePack({version:1,id:'af-parish',name:'Afrikaans',lang:'af-ZA',texts:{'Amen.':'Amen.'}});
  assert.equal(speechText('Amen.',pack),'Amen.');
  assert.equal(speechText('The Lord be with you.',pack),null);
  assert.equal(speechText('The Lord be with you.',languagePacks.get('la')),'Dominus vobiscum.');
  assert.equal(cleanEnglishSpeech('(proclaims the reading)'),null);
  assert.equal(cleanEnglishSpeech('♪ Entrance Chant ♪'),null);
  assert.equal(cleanEnglishSpeech('♪ Amen. ♪'),'Amen.');
  assert.equal(cleanEnglishSpeech('(quietly) Wash me, O Lord…'),'Wash me, O Lord');
  assert.throws(()=>validateLanguagePack({version:1,id:'en',name:'Test',lang:'en',texts:{'Amen.':'Amen.'}}));
  assert.throws(()=>validateLanguagePack({version:1,id:'xx',name:'Test',lang:'en',texts:{'Amen.':5}}));
  assert.throws(()=>validateLanguagePack({version:1,id:'xx',name:'Test',lang:'en',texts:{}}));

  scenario=buildScenario({serverCount:3,deacon:true,lector:true,incense:true});
  speechInitialised=true;
  localVoices=[voice];
  $('speechLanguage').value='en';
  $('speechEnabled').checked=true;
  $('speechRate').value='1';
  for(const role of SPEECH_ROLES)$('voice-'+role).value=voiceKey(voice);
  cur3d=STEPS.findIndex(s=>s.key===4);
  progress3d=0;
  const proposed=stepStart[cur3d]+1;
  const held=interceptSpeech(proposed);
  assert.ok(held<proposed);
  assert.ok(speechBusy);
  assert.equal(utterances.length,1);
  assert.equal(utterances[0].text,'The Lord be with you.');
  progress3d=(held-stepStart[cur3d])/STEPS[cur3d].dur;
  utterances[0].onend();
  assert.equal(speechBusy,false);
  const greeting=STEPS[cur3d].say.find(s=>s[1]==='The Lord be with you.');
  const windowEnd=stepStart[cur3d]+greeting[3]*STEPS[cur3d].dur;
  // The spoken line's caption window was used up while the timeline was held, so it is skipped.
  assert.equal(interceptSpeech(proposed),Math.max(proposed,Math.min(windowEnd,held+4)));
  assert.equal(utterances.length,1);
  resetSpeech();
  $('speechLanguage').value='la';
  $('voice-P').value='';
  progress3d=0;
  assert.equal(interceptSpeech(proposed),proposed);
  assert.equal(utterances.length,1);
  assert.ok($('speechStatus').textContent.includes('No local voice'));
  resetSpeech();
  $('voice-P').value=voiceKey(voice);
  const heldLatin=interceptSpeech(proposed);
  assert.ok(heldLatin<proposed);
  assert.equal(utterances[1].text,'Dominus vobiscum.');
  const lateEnd=utterances[1].onend;
  resetSpeech();
  lateEnd();
  assert.equal(speechBusy,false);
  $('speechEnabled').checked=false;
  assert.equal(interceptSpeech(proposed),proposed);
  resetSpeech();
  $('audioSource').value='static';
  window.MASS_STATIC_AUDIO={version:1,clips:{}};
  window.MASS_STATIC_AUDIO.clips[JSON.stringify(['la','ppl','Et cum spiritu tuo.'])]='audio/test-group.mp3';
  assert.equal(speakText('Et cum spiritu tuo.','ppl',true),true);
  assert.equal(recordings.length,1);
  assert.equal(recordings[0].src,'audio/test-group.mp3');
  assert.ok(speechBusy);
  recordings[0].onended();
  assert.equal(speechBusy,false);
  assert.equal(speakText('Et cum spiritu tuo.','ppl',true),true);
  resetSpeech();
  assert.ok(recordings[1].paused);
  assert.equal(recording,null);
  assert.equal(speakText('No generated cue','ppl',true),false);
  assert.ok($('speechStatus').textContent.includes('No pre-generated recording'));
  window.MASS_STATIC_AUDIO.clips[JSON.stringify(['la','L','Verbum Domini.'])]='audio/test-reader.mp3';
  window.MASS_STATIC_AUDIO.clips[JSON.stringify(['la','P','Corpus Christi.'])]='audio/test-communion.mp3';
  assert.equal(staticClip('Verbum Domini.','L2'),'audio/test-reader.mp3');
  assert.equal(staticClip('Corpus Christi.','E'),'audio/test-communion.mp3');
  // Quiet (secret) prayers play softer; skipping ends the line in progress.
  assert.ok(QUIET_CUE.test('(quietly) Wash me, O Lord.'));
  assert.ok(!QUIET_CUE.test('The Lord be with you.'));
  resetSpeech();
  window.MASS_STATIC_AUDIO.clips[JSON.stringify(['la','P','Lava me.'])]='audio/test-quiet.mp3';
  assert.equal(speakText('Lava me.','P',true,true),true);
  const quiet=recordings[recordings.length-1];
  assert.ok(quiet.volume<1,'quiet line is softer');
  assert.ok(speechBusy);
  assert.equal(skipSpeech(),true);
  assert.equal(speechBusy,false);
  assert.equal(skipSpeech(),false,'nothing left to skip');
  // Chancel arch and sanctuary lamp.
  churchLayout=structuredClone(LAYOUT_DEFAULTS);
  assert.deepEqual(validateLayout({...LAYOUT_DEFAULTS,lamp:[400,40]}),{...LAYOUT_DEFAULTS,lamp:[400,40]});
  assert.throws(()=>validateLayout({...LAYOUT_DEFAULTS,lamp:[400,999]}),/sanctuary lamp/,'lamp outside the sanctuary is refused');
  assert.deepEqual(validateLayout({...LAYOUT_DEFAULTS,tabernacle:[137,32]}).tabernacle,[137,32],'wall tabernacle positions can be saved');
  churchLayout.tabernacle=[137,32];
  sanctuaryShape='open';
  assert.deepEqual(layoutAt('tabernacle'),[137,32]);
  sanctuaryShape='chancel';
  assert.deepEqual(layoutAt('tabernacle'),[165,32],'chancel walls pull side fixtures inward');
  assert.deepEqual(churchLayout.tabernacle,[137,32],'saved layout untouched');
  assert.ok(chancelBlocks([100,200],[150,150]),'walking through the left wall is blocked');
  assert.ok(!chancelBlocks([860,230],[900,230]),'right doorway is open');
  assert.ok(!chancelBlocks([945,250],[945,320]),'right arch-face door is open');
  assert.ok(!chancelBlocks([500,350],[500,100]),'central arch is open');
  for(const style of LAMP_STYLES)assert.equal(lampStyleFor(style,3),style);
  assert.ok(LAMP_STYLES.includes(lampStyleFor('auto',7)));
  assert.equal(new Set([528533,240081,268669,311917,1,5,9,13].map(seed=>lampStyleFor('auto',seed))).size>2,true,'auto varies by game');
  for(const mount of LAMP_MOUNTS){
    const p=lampPlan({lampMount:mount,lampPlace:'tabernacle'});
    assert.ok(p[0]>=LAMP_LIMITS[0]&&p[0]<=LAMP_LIMITS[1]&&p[1]>=LAMP_LIMITS[2]&&p[1]<=LAMP_LIMITS[3],mount+' lamp in the sanctuary');
    assert.ok(Math.hypot(p[0]-165,p[1]-32)<60,mount+' lamp near the tabernacle');
  }
  churchLayout.lamp=[700,150];
  assert.deepEqual(lampPlan({lampMount:'hanging',lampPlace:'custom'}),[700,150]);
  const onWall=lampWall([860,225]);
  assert.ok(onWall.at[0]===875&&(onWall.at[1]<170-17||onWall.at[1]>290+17),'wall lamp avoids the doorway');
  sanctuaryShape='open';
  assert.equal(lampWall([500,30]).at[1],18,'back wall');
  delete churchLayout.lamp;
  churchLayout=structuredClone(LAYOUT_DEFAULTS);
  console.log('Passed layout transforms, 0-5 server training cues, language validation and speech synchronization.');
`,context);
assert.ok(canceled>0);
