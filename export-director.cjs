const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'mass-rite.js'),'utf8'),context);
const script=vm.runInContext(`({
  version:1,
  description:'Illustrative Sunday Mass in Ordinary Time; baseline with deacon and servers.',
  units:'Positions use the canonical 1000 x 830 floor plan; duration is animation seconds, not real liturgical timing.',
  referenceStatus:'Inherited references are not independently checked against an approved Missal.',
  roles:ACTORS,initialPositions:START_POS,initialProps:START_PROPS,
  durationSeconds:TOTAL,
  steps:STEPS.map((step,id)=>({id,startSeconds:stepStart[id],...step}))
})`,context);
const target=path.join(__dirname,'docs','director-script.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(script,null,2)+'\n');
console.log(`Exported ${script.steps.length} director steps.`);
