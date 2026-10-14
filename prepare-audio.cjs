const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({console});
for(const file of ['mass-rite.js','mass-scenarios.js','mass-speech.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context);
}
const jobs=vm.runInContext(`
  const unique=new Map();
  for(let mask=0;mask<16;mask++){
    buildScenario({serverCount:5,deacon:!!(mask&1),lector:!!(mask&2),incense:!!(mask&4),bothKinds:!!(mask&8)});
    for(const step of STEPS)for(const [role,source] of step.say||[]){
      if(!SPEECH_ROLES.includes(role))continue;
      for(const id of ['en','la']){
        const text=speechText(source,languagePacks.get(id));
        if(text)unique.set(JSON.stringify([id,role,text]),{language:id,role,text});
      }
    }
  }
  [...unique.values()];
`,context);
const output=process.argv[2];
if(!output)throw new Error('Usage: node prepare-audio.cjs <jobs.json>');
fs.writeFileSync(output,JSON.stringify(jobs,null,2));
console.log(`Prepared ${jobs.length} distinct spoken clips.`);
