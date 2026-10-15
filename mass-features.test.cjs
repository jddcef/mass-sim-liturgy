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
for(const file of ['mass-rite.js','mass-scenarios.js','mass-features.js','mass-speech.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context);
}
vm.runInContext(`
  let scenario=buildScenario({serverCount:3,deacon:true,lector:true,incense:true});
  let cur3d=0,progress3d=0;
  assert.deepEqual(validateLayout(LAYOUT_DEFAULTS),LAYOUT_DEFAULTS);
  for(const preset of Object.values(LAYOUT_PRESETS)){
    assert.deepEqual(validateLayout(preset.positions),preset.positions);
  }
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
  console.log('Passed layout transforms, 0-5 server training cues, language validation and speech synchronization.');
`,context);
assert.ok(canceled>0);
