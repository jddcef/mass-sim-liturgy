const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {clipFile}=require('./audio-names.cjs');
const context=vm.createContext({console});
for(const file of ['mass-rite.js','mass-scenarios.js','mass-speech.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context);
}
const jobs=vm.runInContext(`
  const unique=new Map();
  // Optional elements that change what is spoken; each is tried on top of every core combination.
  const variants=[{},{introductory:'C'},{introductory:'sprinkling'},{solemnBlessing:true},{readerCount:2},{deaconCommunion:false},{emhc:true,reservedCommunion:true}];
  for(let mask=0;mask<16;mask++)for(const variant of variants){
    buildScenario({serverCount:5,deacon:!!(mask&1),lector:!!(mask&2),incense:!!(mask&4),bothKinds:!!(mask&8),...variant});
    for(const step of STEPS)for(const [sayRole,source] of step.say||[]){
      if(!SPEECH_ROLES.includes(sayRole))continue;
      // Matches staticClip(): a second reader uses the reader's voice and an EMHC the Priest's.
      const role=sayRole==='L2'?'L':sayRole==='E'?'P':sayRole;
      const english=speechText(source,languagePacks.get('en'));
      for(const id of ['en','la']){
        const text=speechText(source,languagePacks.get(id));
        if(!text)continue;
        const key=JSON.stringify([id,role,text]);
        const job=unique.get(key)||{language:id,role,text,english,steps:[],title:step.title};
        if(source.startsWith('(quietly)')||source.startsWith('(low voice)'))job.quiet=true;
        if(!job.steps.includes(step.key+1))job.steps.push(step.key+1);
        if(Math.min(...job.steps)===step.key+1)job.title=step.title;
        unique.set(key,job);
      }
    }
  }
  [...unique.values()];
`,context);
for(const job of jobs){
  job.steps.sort((a,b)=>a-b);
  job.file=clipFile(job.language,job.role,job.text,job.steps[0]);
}
jobs.sort((a,b)=>a.steps[0]-b.steps[0]||a.file.localeCompare(b.file));
if(new Set(jobs.map(job=>job.file)).size!==jobs.length)throw new Error('Duplicate audio filenames');
const output=process.argv[2];
if(!output)throw new Error('Usage: node prepare-audio.cjs <jobs.json>');
fs.writeFileSync(output,JSON.stringify(jobs,null,2));
console.log(`Prepared ${jobs.length} distinct spoken clips.`);
