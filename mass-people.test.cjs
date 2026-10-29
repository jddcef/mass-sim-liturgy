'use strict';
const assert=require('node:assert/strict');
globalThis.THREE=require('./vendor/three.min.js');
const {PeopleModels,PEOPLE_LEVELS,peopleAppearance}=require('./mass-people.js');

const levels=Object.values(PEOPLE_LEVELS);
const app=peopleAppearance({seed:'bishop-test',role:'P',vest:'chasuble',colour:'#884422'});
let previous=0;
for(const level of levels){
  const {parts,triangles}=PeopleModels.buildParts(app,level);
  assert.ok(triangles>previous,level.id+' should add geometry detail');
  previous=triangles;
  assert.ok(parts.length>0);
  for(const part of parts){
    const position=part.geometry.attributes.position.array;
    for(const value of position)assert.ok(Number.isFinite(value),level.id+' generated a non-finite position');
    const weights=part.geometry.attributes.skinWeight.array;
    for(let i=0;i<weights.length;i+=4)assert.equal(weights[i]+weights[i+1]+weights[i+2]+weights[i+3],255);
    part.geometry.dispose();
  }
}

const alb=peopleAppearance({seed:'senior-server',role:'S',vest:'alb'});
const figure=PeopleModels.createFigure({app:alb,level:'natural'});
assert.equal(figure.cincture.visible,true);
figure.cincture.setColour('#b3262d');
figure.cincture.visible=false;
assert.equal(figure.cincture.visible,false);
figure.pectoral.visible=true;
figure.cope.visible=true;
PeopleModels.pose(figure,'stand','',0);
PeopleModels.pose(figure,'sit','',1,false,false,{pew:true});
PeopleModels.pose(figure,'kneel','',2);
PeopleModels.pose(figure,'stand','genuflects',3);
PeopleModels.pose(figure,'stand','',4,false,true,{handCandle:true,peace:1});
for(const [posture,action,phase,target] of [
  ['stand','blesses the people',0,[-.14,.25,.38]],
  ['stand','signs the cross',0,[-.03,.34,.21]],
  ['stand','raises the chalice',2.1],
  ['stand','extends over the altar',2.8]
]){
  PeopleModels.pose(figure,posture,action,phase);
  figure.root.updateMatrixWorld(true);
  for(const bone of figure.bones){
    for(const value of [bone.position.x,bone.position.y,bone.position.z,
      bone.quaternion.x,bone.quaternion.y,bone.quaternion.z,bone.quaternion.w]){
      assert.ok(Number.isFinite(value),action+' produced a non-finite joint transform');
    }
  }
  if(target){
    const hand=figure.bones[PeopleModels.SIDE[-1].hand].getWorldPosition(new THREE.Vector3());
    figure.chest.worldToLocal(hand);
    assert.ok(hand.distanceTo(new THREE.Vector3(...target))<1e-6,action+' wrist must reach its intended target');
  }
}
PeopleModels.schedule(figure,'lifelike');
assert.equal(PeopleModels.pending(),1);
assert.equal(PeopleModels.pump(0),1,'pump must make progress for a zero budget');
assert.equal(figure.level,PEOPLE_LEVELS.lifelike);
PeopleModels.dispose(figure);
assert.equal(PeopleModels.pending(),0);
console.log('Procedural people tiers, skinning, outfit layers and poses passed.');
