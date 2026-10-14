const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
process.chdir(__dirname);
const read=file=>fs.readFileSync(file,'utf8');
for(const html of ['mass-animation.html','mass-3d.html']){
  for(const match of read(html).matchAll(/(?:src|href)="([^"]+)"/g)){
    const asset=match[1];
    if(!asset.startsWith('#')&&!/^https?:/.test(asset)){
      assert.ok(fs.existsSync(asset),html+' references missing '+asset);
    }
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
for(const [key,relative] of Object.entries(audio.clips)){
  const [language,role,text]=JSON.parse(key);
  assert.ok(['en','la'].includes(language));
  assert.ok(['P','D','L','Ps','ppl'].includes(role));
  assert.ok(text);
  const expected=crypto.createHash('sha256').update(key).digest('hex').slice(0,20)+'.mp3';
  assert.equal(path.basename(relative),expected);
  assert.ok(fs.statSync(relative).size>500);
}
console.log('Validated director export, local assets and '+Object.keys(audio.clips).length+' static audio references.');
