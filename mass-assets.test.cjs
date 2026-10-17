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
      assert.ok(names.indexOf('mass-materials.js')<names.indexOf('mass-3d.js'));
      assert.ok(names.indexOf('mass-parishes.js')<names.indexOf('mass-features.js'));
      assert.ok(names.indexOf('mass-parish-editor.js')>names.indexOf('mass-materials.js'));
      assert.ok(names.indexOf('mass-parish-editor.js')<names.indexOf('mass-3d.js'));
      for(const script of scripts){
        assert.ok(!/type\s*=\s*["']module/.test(script[1]+script[3]),'classic scripts only');
        assert.ok(!/^https?:/.test(script[2]),'scripts stay local');
      }
    }
    assert.ok(!/\bfetch\s*\(|TextureLoader|https?:\/\//.test(read('mass-materials.js')),'materials need no network or local file fetch');
    assert.ok(read('.github/workflows/checks.yml').includes('node --check mass-materials.js'));
    for(const file of ['mass-parishes.js','mass-parish-editor.js']){
      assert.ok(read('.github/workflows/checks.yml').includes('node --check '+file));
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
