'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const context=vm.createContext({assert,console});
vm.runInContext([
  'mass-rite.js',
  'mass-scenarios.js',
  'mass-game-logic.js',
  'mass-rite-corpus.js'
].map(file=>fs.readFileSync(file,'utf8')).join('\n'),context);
vm.runInContext(`
  const preset=GAME_PRESETS.corpusChristi;
  assert.equal(matchingPreset(preset.fields),'corpusChristi');
  assert.equal(celebrationAvailable(celebrationById('corpusChristi')),true);
  assert.equal(celebrationForPreset('corpusChristi').id,'corpusChristi');
  assert.equal(presetForOptions(normaliseGameOptions('P',preset.fields).options,'corpusChristi'),'corpusChristi');

  const full=normaliseGameOptions('P',preset.fields);
  const scenario=buildScenario(full.options);
  assert.equal(scenario.options.rite,'corpus');
  assert.equal(scenario.options.serverCount,5);
  assert.equal(scenario.options.incense,true);
  assert.equal(scenario.options.corpusCanopy,true);
  assert.equal(scenario.options.corpusTorches,true);
  assert.equal(scenario.options.corpusStations,true);
  assert.equal(scenario.initialProps.cross.h,false);
  assert.equal(scenario.steps[0].title,'The procession sets out');
  assert.match(scenario.steps[0].text,/After Mass/);
  assert.ok(!scenario.steps.some(step=>step.title.includes('Exposition')||step.title.includes('public adoration')));
  assert.ok(scenario.steps.some(step=>step.title==='Eucharistic Benediction and reposition'));
  assert.ok(scenario.steps.some(step=>step.title==='First outdoor station'));
  assert.deepEqual(scenario.steps.find(step=>step.title==='The procession sets out').mv.P.p,
    [[500,160],[500,820],[500,900],[560,980],[650,1080]]);
  assert.ok(scenario.steps.find(step=>step.title==='First outdoor station').blessWith);
  assert.equal(scenario.vesture.cope,true);

  const thurifer=normaliseGameOptions('T',{rite:'corpus',serverCount:1});
  assert.equal(thurifer.options.serverCount,5);
  assert.equal(thurifer.options.incense,true);
  const noIncense=buildScenario(normaliseGameOptions('P',{rite:'corpus',serverCount:5,incense:false}).options);
  assert.ok(!noIncense.steps.some(step=>step.title==='Incensation before the procession'));
  assert.ok(noIncense.steps.every(step=>(step.smoke||[]).length===0));
  assert.ok(noIncense.steps.filter(step=>step.part==='Procession').every(step=>(step.smoke||[]).length===0));
  assert.ok(buildScenario(full.options).steps.some(step=>(step.smoke||[]).length>0));
  const small=normaliseGameOptions('P',{rite:'corpus',serverCount:3});
  assert.equal(small.options.corpusCanopy,false);
  assert.equal(small.options.corpusTorches,false);
  assert.equal(buildScenario(small.options).initialProps.cross.h,false);
  assert.equal(buildScenario(normaliseGameOptions('P',{rite:'corpus',serverCount:1}).options).initialProps.cross.h,true);
  assert.ok(small.notes.some(note=>note.includes('Four servers')));
  assert.throws(()=>normaliseGameOptions('L',{rite:'corpus'}),/has no part in this celebration/);

  for(const serverCount of [0,1,2,3,4,5]){
    for(const corpusStations of [false,true]){
      const normal=normaliseGameOptions('P',{rite:'corpus',serverCount,corpusStations});
      const built=buildScenario(normal.options);
      assert.equal(built.options.serverCount,serverCount);
      assert.equal(built.options.corpusStations,corpusStations);
      assert.equal(built.visible.has('T'),serverCount===5);
      assert.equal(built.steps.some(step=>/^First|^Second|^Third outdoor station$/.test(step.title)),corpusStations);
      for(let i=0;i<built.steps.length;i++){
        const step=built.steps[i];
        for(const field of ['mv','acts','orans']){
          for(const role of Object.keys(step[field]||{}))assert.ok(built.visible.has(role),role+' is hidden in '+step.title);
        }
        for(let frame=0;frame<=20;frame++){
          const positions={};
          for(const role of Object.keys(ACTORS)){
            positions[role]=actorAt(i,role,frame/20);
            assert.ok(positions[role].every(Number.isFinite),role+' position in '+step.title);
          }
          for(const name of Object.keys(PROP_DEF)){
            const state=propAt(i,name,frame/20,positions);
            assert.ok(resolveProp(state,positions,name).every(Number.isFinite),name+' position in '+step.title);
          }
        }
      }
    }
  }
  const breviary=liturgicalBreviary({rite:'corpus',minister:'priest'});
  assert.match(breviary.title,/Corpus Christi/);
  assert.ok(breviary.specialRites.some(line=>line.includes('local custom')));
  const pre=devotionPreTasks('P',full.options,[948,222]);
  assert.ok(pre.some(task=>task.correct==='White cope over alb and stole'));
  assert.ok(devotionPostTasks('P',full.options).length);
  console.log('Corpus Christi procession options, routes, roles and Path integration passed.');
`,context);
