const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=__dirname;
const jobsPath=process.argv[2]||path.join(root,'audio','audio-jobs.json');
const jobs=JSON.parse(fs.readFileSync(jobsPath,'utf8'));
const clips={};
const languages=new Set();
for(const {language,role,text} of jobs){
  const key=JSON.stringify([language,role,text]);
  const filename=crypto.createHash('sha256').update(key).digest('hex').slice(0,20)+'.mp3';
  const target=path.join(root,'audio',filename);
  if(!fs.existsSync(target))continue;
  if(fs.statSync(target).size<500)throw new Error('Incomplete clip: '+filename);
  clips[key]='audio/'+filename;
  languages.add(language);
}
const manifest={
  version:1,engine:'Kokoro-82M v1.0 (int8 ONNX)',
  voices:{P:'bm_george',D:'bm_lewis',L:'bf_emma',Ps:'bf_isabella'},
  groupVoices:['bm_george','bm_lewis','bf_emma','bf_isabella','af_sarah','am_michael'],
  languages:[...languages].sort(),latinExperimental:languages.has('la'),
  plannedClips:jobs.length,clips
};
const encoded=JSON.stringify(manifest,null,2);
fs.writeFileSync(path.join(root,'audio','audio-manifest.json'),encoded);
fs.writeFileSync(path.join(root,'audio','audio-manifest.js'),'window.MASS_STATIC_AUDIO = '+encoded+';\n');
console.log(`Snapshot includes ${Object.keys(clips).length} of ${jobs.length} planned clips.`);
