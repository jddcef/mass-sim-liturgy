'use strict';

const LATIN_TEXTS={
  'In the name of the Father, and of the Son, and of the Holy Spirit.':'In nomine Patris, et Filii, et Spiritus Sancti.',
  'Amen.':'Amen.',
  'The Lord be with you.':'Dominus vobiscum.',
  'And with your spirit.':'Et cum spiritu tuo.',
  'Let us pray.':'Oremus.',
  'Kyrie, eleison.':'Kyrie, eleison.',
  'Christe, eleison.':'Christe, eleison.',
  'The word of the Lord.':'Verbum Domini.',
  'Thanks be to God.':'Deo gratias.',
  'Glory to you, O Lord.  (✠ ✠ ✠)':'Gloria tibi, Domine.',
  'The Gospel of the Lord.':'Verbum Domini.',
  'Praise to you, Lord Jesus Christ.':'Laus tibi, Christe.',
  'Lord, hear our prayer.':'Te rogamus, audi nos.',
  'Blessed be God for ever.':'Benedictus Deus in saecula.',
  'Lift up your hearts.':'Sursum corda.',
  'We lift them up to the Lord.':'Habemus ad Dominum.',
  'Let us give thanks to the Lord our God.':'Gratias agamus Domino Deo nostro.',
  'It is right and just.':'Dignum et iustum est.',
  'The mystery of faith.':'Mysterium fidei.',
  'We proclaim your Death, O Lord, and profess your Resurrection until you come again.':'Mortem tuam annuntiamus, Domine, et tuam resurrectionem confitemur, donec venias.',
  'The peace of the Lord be with you always.':'Pax Domini sit semper vobiscum.',
  'Let us offer each other the sign of peace.':'Offerte vobis pacem.',
  'The Body of Christ.':'Corpus Christi.',
  'The Blood of Christ.':'Sanguis Christi.',
  'Go forth, the Mass is ended.':'Ite, missa est.',
  '♪ Amen. ♪':'Amen.',
  '♪ Holy, Holy, Holy Lord God of hosts… Hosanna in the highest. ♪':'Sanctus, Sanctus, Sanctus Dominus Deus Sabaoth. Hosanna in excelsis.',
  '♪ Lamb of God, you take away the sins of the world… grant us peace. ♪':'Agnus Dei, qui tollis peccata mundi, dona nobis pacem.'
};
const languagePacks=new Map([
  ['en',{version:1,id:'en',name:'English (script excerpts)',lang:'en',texts:null}],
  ['la',{version:1,id:'la',name:'Latin (partial responses)',lang:'la',texts:LATIN_TEXTS}]
]);
const SPEECH_ROLES=['P','D','L','L2','Ps','E','ppl'];
const QUIET_CUE=/^\((?:quietly|low voice)\)/i;
let speechBusy=false,speechGeneration=0,speechUtterance=null,speechTimer=null,speechWindowEnd=null;
let spokenCaption='',localVoices=[];
const spokenCues=new Set();
const voiceSelections=new Map();
let speechInitialised=false;
let recording=null;

function staticClip(text,role){
  const manifest=window.MASS_STATIC_AUDIO;
  if(!manifest||manifest.version!==1)return null;
  const voiceRole=role==='L2'?'L':role==='E'?'P':role;
  return manifest.clips[JSON.stringify([selectedPack().id,voiceRole,text])]||null;
}

function useStaticAudio(){
  return $('audioSource')?.value==='static';
}

function validateLanguagePack(pack){
  if(!pack||pack.version!==1)throw new Error('Language pack must have version: 1.');
  if(typeof pack.id!=='string'||!/^[a-zA-Z0-9-]{2,35}$/.test(pack.id)||pack.id==='en'||pack.id==='la'){
    throw new Error('Use a unique language-pack id (not en or la), such as la-parish.');
  }
  if(typeof pack.name!=='string'||!pack.name.trim()||pack.name.length>100)throw new Error('A language pack needs a name of 1-100 characters.');
  if(typeof pack.lang!=='string'||!/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(pack.lang))throw new Error('Use a language tag such as en-ZA, la or af.');
  if(!pack.texts||typeof pack.texts!=='object'||Array.isArray(pack.texts))throw new Error('Provide a texts object mapping the original caption to translated words.');
  const entries=Object.entries(pack.texts);
  if(entries.length>500)throw new Error('A pack may have at most 500 captions.');
  const texts={};
  for(const [source,translation] of entries){
    if(!source||source.length>3000||typeof translation!=='string'||translation.length>5000){
      throw new Error('Captions and translations must be bounded strings.');
    }
    if(['__proto__','constructor','prototype'].includes(source))throw new Error('Invalid caption key.');
    if(translation.trim())texts[source]=translation.trim();
  }
  if(!Object.keys(texts).length)throw new Error('Add at least one non-empty translated caption.');
  return {version:1,id:pack.id,name:pack.name.trim(),lang:pack.lang,texts};
}

function cleanEnglishSpeech(text){
  if(/^\s*♪\s*(?:Entrance Chant|Offertory Chant|Communion Chant|Closing hymn)\s*♪\s*$/i.test(text))return null;
  const cleaned=text.replace(/^\((?:quietly|low voice)\)\s*/i,'').replace(/\([^)]*\)/g,'').replace(/[✠…♪]/g,' ').replace(/\s+/g,' ').trim();
  if(text.startsWith('(')&&!/^\((?:quietly|low voice)\)/i.test(text))return null;
  return cleaned||null;
}

function speechText(source,pack){
  if(pack.id==='en')return cleanEnglishSpeech(source);
  return Object.hasOwn(pack.texts,source)?pack.texts[source]:null;
}

function selectedPack(){
  return languagePacks.get($('speechLanguage').value)||languagePacks.get('en');
}

function voiceKey(voice){return voice.voiceURI+'|'+voice.lang+'|'+voice.name;}
function selectedVoice(role){
  const select=$('voice-'+role);
  return select?localVoices.find(v=>voiceKey(v)===select.value):null;
}

function resetSpeech(){
  speechGeneration++;
  speechBusy=false;
  speechWindowEnd=null;
  spokenCaption='';
  spokenCues.clear();
  if(speechTimer!==null){clearTimeout(speechTimer);speechTimer=null;}
  if(speechUtterance&&window.speechSynthesis)window.speechSynthesis.cancel();
  speechUtterance=null;
  if(recording){
    recording.onended=null;recording.onerror=null;
    recording.pause();
    recording.removeAttribute('src');
    recording.load();
    recording=null;
  }
}

// Ends the line being spoken now and lets the timeline continue (the skip button).
function skipSpeech(){
  if(!speechBusy&&!recording&&!speechUtterance)return false;
  const generation=speechGeneration;
  if(speechUtterance&&window.speechSynthesis)window.speechSynthesis.cancel();
  if(recording){recording.onended=null;recording.onerror=null;recording.pause();}
  finishSpeech(generation);
  return true;
}

function finishSpeech(generation){
  if(generation!==speechGeneration)return;
  speechBusy=false;
  speechUtterance=null;
  recording=null;
  spokenCaption='';
  if(speechTimer!==null){clearTimeout(speechTimer);speechTimer=null;}
}

function playRecording(text,role,holdTimeline,quiet){
  const path=staticClip(text,role);
  if(!path){
    $('speechStatus').textContent='No pre-generated recording for '+ROLE_NAMES[role]+' in '+selectedPack().name+'. Choose live voices or generate a matching audio pack. This cue is skipped.';
    return false;
  }
  const generation=speechGeneration;
  const audio=new Audio(path);
  recording=audio;
  audio.playbackRate=Number($('speechRate').value);
  if(quiet)audio.volume=.55;
  speechBusy=holdTimeline;
  spokenCaption=ROLE_NAMES[role]+': '+text;
  const failed=message=>{
    if(generation!==speechGeneration)return;
    audio.pause();
    finishSpeech(generation);
    $('speechStatus').textContent=message;
    console.error(message);
  };
  audio.onended=()=>finishSpeech(generation);
  audio.onerror=()=>failed('Recording could not be loaded: '+path+'. Keep the audio folder beside the page. The cue was skipped.');
  speechTimer=setTimeout(()=>failed('Recording timed out: '+path+'. The cue was skipped.'),Math.max(20000,text.length*180/audio.playbackRate));
  audio.play().catch(error=>failed('Recording playback failed: '+error.message+'. Use Play or the voice-test button to allow audio.'));
  return true;
}

function speakText(text,role,holdTimeline,quiet){
  if(useStaticAudio())return playRecording(text,role,holdTimeline,quiet);
  const voice=selectedVoice(role);
  if(!voice){
    $('speechStatus').textContent='No local voice selected for '+ROLE_NAMES[role]+'. Choose a voice for this language; the cue is not spoken.';
    return false;
  }
  const generation=speechGeneration;
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.voice=voice;utterance.lang=voice.lang;
  utterance.rate=Number($('speechRate').value);
  if(quiet){utterance.volume=.45;utterance.pitch=.9;}
  speechBusy=holdTimeline;
  speechUtterance=utterance;
  spokenCaption=ROLE_NAMES[role]+': '+text;
  utterance.onend=()=>finishSpeech(generation);
  utterance.onerror=event=>{
    if(generation!==speechGeneration)return;
    finishSpeech(generation);
    if(!['canceled','interrupted'].includes(event.error)){
      $('speechStatus').textContent='Speech failed: '+event.error+'. Playback continues without that cue.';
      console.error('Speech synthesis failed:',event.error);
    }
  };
  // Engines can fail to dispatch onend; release the timeline and report it.
  speechTimer=setTimeout(()=>{
    if(generation!==speechGeneration)return;
    window.speechSynthesis.cancel();
    finishSpeech(generation);
    $('speechStatus').textContent='Speech engine timed out. Playback continues; try another local voice.';
  },Math.max(15000,text.length*150/utterance.rate));
  try{window.speechSynthesis.speak(utterance);}catch(error){
    finishSpeech(generation);reportFeature('speechStatus',error);return false;
  }
  return true;
}

function interceptSpeech(nextElapsed){
  if(!speechInitialised||!$('speechEnabled').checked)return nextElapsed;
  const now=stepStart[cur3d]+progress3d*STEPS[cur3d].dur;
  // The timeline was held while the line was spoken, so its caption window is already used up:
  // continue from the end of that window (at most a few seconds) instead of replaying it in silence.
  if(speechWindowEnd!==null){
    let target=Math.min(speechWindowEnd,now+4,TOTAL);
    speechWindowEnd=null;
    if(typeof gameTimeLimit==='function')target=Math.min(target,gameTimeLimit(target));
    if(target>nextElapsed)nextElapsed=target;
  }
  const pack=selectedPack();
  for(let i=cur3d;i<STEPS.length;i++){
    if(stepStart[i]>nextElapsed)break;
    const step=STEPS[i];
    const events=(step.say||[]).map(([role,source,a,b],index)=>({role,source,a,b,index})).sort((a,b)=>a.a-b.a);
    for(const event of events){
      const start=stepStart[i]+event.a*step.dur;
      const end=stepStart[i]+event.b*step.dur;
      if(start>nextElapsed||end<now)continue;
      const id=[step.key,event.index,event.role,pack.id].join(':');
      if(spokenCues.has(id))continue;
      // The game holds a line until the player has answered the question that comes before it.
      if(typeof speechHeld==='function'&&speechHeld(start))return nextElapsed;
      spokenCues.add(id);
      const text=speechText(event.source,pack);
      if(!text)continue;
      if(!SPEECH_ROLES.includes(event.role))continue;
      if(speakText(text,event.role,true,QUIET_CUE.test(event.source))){speechWindowEnd=end;return Math.max(now,start);}
    }
  }
  return nextElapsed;
}

function speechCaption(events){
  if(spokenCaption)return spokenCaption;
  if(!speechInitialised)return events.map(([role,text])=>ROLE_NAMES[role]+': '+text).join(' | ');
  const pack=selectedPack();
  return events.map(([role,source])=>{
    if(pack.id==='en')return ROLE_NAMES[role]+': '+source;
    const translation=speechText(source,pack);
    return ROLE_NAMES[role]+': '+(translation||'[No translation in '+pack.name+']');
  }).join(' | ');
}

function refreshSpeechStatus(){
  if(!speechInitialised)return;
  const pack=selectedPack();
  const words=STEPS.flatMap(step=>step.say||[]);
  const sources=new Set(words.map(([,text])=>text));
  const count=[...sources].filter(text=>speechText(text,pack)).length;
  const voiceCount=localVoices.length;
  if(useStaticAudio()){
    const translated=words.map(([role,source])=>({role,text:speechText(source,pack)})).filter(c=>c.text);
    const unique=new Map(translated.map(c=>[JSON.stringify([c.role,c.text]),c]));
    const included=[...unique.values()].filter(c=>staticClip(c.text,c.role)).length;
    const experimental=pack.id==='la'&&window.MASS_STATIC_AUDIO?.latinExperimental;
    const groupSize=window.MASS_STATIC_AUDIO?.groupVoices?.length;
    $('speechStatus').textContent=included+' of '+unique.size+' spoken role/text combinations have static recordings. '+
      (groupSize?'Congregation clips mix '+groupSize+' distinct synthetic voices. ':'')+
      (experimental?'Latin pronunciation is experimental: Latin phonemes with English-trained voices. Review before training use.':'')+
      (!window.MASS_STATIC_AUDIO?' Audio manifest unavailable; generate the static pack first.':'');
    return;
  }
  $('speechStatus').textContent=count+' of '+sources.size+' distinct captions have spoken wording in '+pack.name+
    '. '+voiceCount+' local voices available. '+(pack.lang==='la'?'A Latin voice may not be installed; choosing another voice does not guarantee Latin pronunciation.':'');
}

function refreshVoiceChoices(){
  const pack=selectedPack();
  for(const role of SPEECH_ROLES){
    const select=$('voice-'+role);
    select.disabled=useStaticAudio();
    const saved=voiceSelections.get(pack.id+':'+role);
    const old=select.value;
    select.replaceChildren();
    const empty=document.createElement('option');
    empty.value='';empty.textContent='Choose a local voice';
    select.appendChild(empty);
    localVoices.forEach(voice=>{
      const option=document.createElement('option');
      option.value=voiceKey(voice);option.textContent=voice.name+' ('+voice.lang+')';
      select.appendChild(option);
    });
    const matching=localVoices.find(v=>v.lang.split('-')[0].toLowerCase()===pack.lang.split('-')[0].toLowerCase());
    select.value=localVoices.some(v=>voiceKey(v)===saved)?saved:matching?voiceKey(matching):'';
    if(saved===undefined&&old&&localVoices.some(v=>voiceKey(v)===old)&&pack.id==='en')select.value=old;
  }
  refreshSpeechStatus();
}

function refreshLanguages(){
  const previous=$('speechLanguage').value;
  $('speechLanguage').replaceChildren();
  for(const pack of languagePacks.values()){
    const option=document.createElement('option');option.value=pack.id;option.textContent=pack.name;
    $('speechLanguage').appendChild(option);
  }
  if(languagePacks.has(previous))$('speechLanguage').value=previous;
}

function initialiseSpeech(){
  speechInitialised=true;
  for(const role of SPEECH_ROLES){
    const field=document.createElement('label');
    field.className='field';
    field.textContent=ROLE_NAMES[role]+' voice';
    const select=document.createElement('select');select.id='voice-'+role;
    select.onchange=()=>{
      resetSpeech();
      voiceSelections.set(selectedPack().id+':'+role,select.value);
      refreshSpeechStatus();
    };
    field.appendChild(select);$('voiceChoices').appendChild(field);
  }
  try{
    const stored=JSON.parse(localStorage.getItem('mass-language-packs-v1')||'[]');
    if(!Array.isArray(stored))throw new Error('Invalid saved language packs.');
    stored.forEach(value=>{const pack=validateLanguagePack(value);languagePacks.set(pack.id,pack);});
  }catch(error){reportFeature('speechStatus',new Error('Saved languages could not be loaded: '+error.message));}
  refreshLanguages();
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){
    $('audioSource').querySelector('option[value="browser"]').disabled=true;
    $('audioSource').value='static';
    refreshVoiceChoices();
  }else{
    const update=()=>{
      localVoices=window.speechSynthesis.getVoices().filter(voice=>voice.localService);
      refreshVoiceChoices();
    };
    update();
    window.speechSynthesis.addEventListener('voiceschanged',update);
  }
  $('speechEnabled').onchange=()=>{resetSpeech();refreshSpeechStatus();};
  $('audioSource').onchange=()=>{resetSpeech();refreshVoiceChoices();};
  $('speechLanguage').onchange=()=>{resetSpeech();refreshVoiceChoices();renderFrame();};
  $('speechRate').onchange=resetSpeech;
  $('testVoice').onclick=()=>{
    setPlaying(false);
    const pack=selectedPack();
    const text=speechText('The Lord be with you.',pack)||Object.values(pack.texts||{})[0];
    if(text)speakText(text,'P',false);
    else $('speechStatus').textContent='This language pack has no text to test.';
  };
  $('testGroup').onclick=()=>{
    setPlaying(false);
    const text=speechText('And with your spirit.',selectedPack());
    if(text)speakText(text,'ppl',false);
    else $('speechStatus').textContent='This language has no translation for the congregation test.';
  };
  if(window.MASS_STATIC_AUDIO?.version===1){
    $('audioSource').value='static';
    refreshVoiceChoices();
  }
  $('exportLanguage').onclick=()=>{
    const pack=selectedPack(),texts={};
    for(const step of STEPS)for(const [,source] of step.say||[]){
      if(cleanEnglishSpeech(source)||Object.hasOwn(LATIN_TEXTS,source)){
        texts[source]=pack.id==='en'?cleanEnglishSpeech(source):speechText(source,pack)||'';
      }
    }
    downloadJSON('mass-language-template.json',{version:1,id:pack.id+'-parish',name:pack.name+' - parish',lang:pack.lang,texts});
  };
  $('importLanguage').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(file.size>500000)throw new Error('Language packs must be smaller than 500 KB.');
      const pack=validateLanguagePack(JSON.parse(await file.text()));
      resetSpeech();languagePacks.set(pack.id,pack);
      refreshLanguages();$('speechLanguage').value=pack.id;refreshVoiceChoices();
      try{
        localStorage.setItem('mass-language-packs-v1',JSON.stringify([...languagePacks.values()].filter(p=>!['en','la'].includes(p.id))));
      }catch(error){reportFeature('speechStatus',new Error('Language imported, but not saved in browser storage. Keep your JSON file. '+error.message));}
    }catch(error){reportFeature('speechStatus',error);}
    event.target.value='';
  };
  window.addEventListener('pagehide',resetSpeech);
}
