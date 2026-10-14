const fs=require('node:fs');
const path=require('node:path');
const {clipKey,legacyClipFile}=require('./audio-names.cjs');
const root=__dirname;
const jobsPath=process.argv[2]||path.join(root,'audio','audio-jobs.json');
const jobs=JSON.parse(fs.readFileSync(jobsPath,'utf8'));
const manifestPath=path.join(root,'audio','audio-manifest.json');
const previous=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
const clips={};
const languages=new Set();
const csv=value=>/[",\n]/.test(value)?'"'+value.replace(/"/g,'""')+'"':value;
const index=[['file','language','role','steps','step_title','english','text','recorded'].join(',')];
for(const job of jobs){
  const {language,role,text}=job;
  const target=path.join(root,job.file);
  // Clips from the earlier hash-only naming scheme are moved to their readable name.
  const legacy=path.join(root,legacyClipFile(language,role,text));
  if(!fs.existsSync(target)&&fs.existsSync(legacy)){
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.renameSync(legacy,target);
  }
  const recorded=fs.existsSync(target);
  if(recorded){
    if(fs.statSync(target).size<500)throw new Error('Incomplete clip: '+job.file);
    clips[clipKey(language,role,text)]=job.file;
    languages.add(language);
  }
  index.push([job.file,language,role,job.steps.join(' '),job.title,job.english,text,recorded?'yes':'no'].map(String).map(csv).join(','));
}
const manifest={
  version:1,engine:'Kokoro-82M v1.0 (int8 ONNX)',
  voices:{P:'bm_george',D:'bm_lewis',L:'bf_emma',Ps:'bf_isabella'},
  groupVoices:previous.groupVoices||['bm_george','bf_emma','am_michael','af_sarah'],
  languages:[...languages].sort(),latinExperimental:languages.has('la'),
  plannedClips:jobs.length,clips
};
const encoded=JSON.stringify(manifest,null,2);
fs.writeFileSync(manifestPath,encoded);
fs.writeFileSync(path.join(root,'audio','audio-manifest.js'),'window.MASS_STATIC_AUDIO = '+encoded+';\n');
fs.writeFileSync(path.join(root,'audio','index.csv'),'\ufeff'+index.join('\r\n')+'\r\n');
console.log(`Snapshot includes ${Object.keys(clips).length} of ${jobs.length} planned clips.`);
