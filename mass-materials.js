'use strict';
// Project-generated, periodic surface recipes. No image loads, including on file://.
const SURFACE_FINISHES={
  marble:{roughness:.34,metalness:0,bump:.012,period:1.5},
  sandstone:{roughness:.88,metalness:0,bump:.018,period:1.5},
  terracotta:{roughness:.8,metalness:0,bump:.014,period:1.5},
  slate:{roughness:.72,metalness:0,bump:.012,period:1.5},
  stone:{roughness:.86,metalness:0,bump:.01,period:1.5},
  wood:{roughness:.57,metalness:0,bump:.0015,period:1},
  gold:{roughness:.28,metalness:.72,bump:0,period:1},
  silver:{roughness:.32,metalness:.8,bump:0,period:1}
};
function surfaceTextureSize(profile){
  return profile.textures?(profile.id==='high'?512:256):0;
}
function surfaceNoise(u,v,cells,seed,rows=cells){
  const x=u*cells,y=v*rows,ix=Math.floor(x),iy=Math.floor(y);
  const hash=(a,b)=>{
    a=((a%cells)+cells)%cells;b=((b%rows)+rows)%rows;
    let n=Math.imul(a+seed,374761393)^Math.imul(b+seed,668265263);
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  };
  const fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=hash(ix,iy)*(1-sx)+hash(ix+1,iy)*sx;
  const b=hash(ix,iy+1)*(1-sx)+hash(ix+1,iy+1)*sx;
  return a*(1-sy)+b*sy;
}
function surfaceSample(kind,u,v){
  if(!SURFACE_FINISHES[kind])throw new Error('Unknown surface finish: '+kind);
  const tau=Math.PI*2;
  const grain=Math.sin(tau*(37*u+23*v))*Math.sin(tau*(19*u-31*v));
  const cloud=surfaceNoise(u,v,4,17)*2-1;
  const edge=Math.min(u-Math.floor(u),1-(u-Math.floor(u)),v-Math.floor(v),1-(v-Math.floor(v)));
  const joint=edge<.007;
  let value=1,height=.5;
  if(kind==='marble'){
    const warp=cloud*1.8+(surfaceNoise(u,v,8,29)-.5)*.8+(surfaceNoise(u,v,16,7)-.5)*.25;
    const vein=Math.pow(1-Math.abs(Math.sin(tau*(u+v)+warp)),18);
    const fine=Math.pow(1-Math.abs(Math.sin(tau*(3*u-2*v)+warp)),32);
    value=.98+.025*cloud-.16*vein-.04*fine;
    height=.6-.1*vein;
  }else if(kind==='wood'){
    const rings=Math.sin(tau*23*v+2.4*cloud+.5*Math.sin(tau*3*u));
    const fibres=surfaceNoise(u,v,8,31,64);
    value=.92+.035*rings+.02*grain+.035*cloud+.035*(fibres-.5);
    height=.5+.08*rings+.03*grain;
  }else{
    value=.94+.045*cloud+.035*grain;
    height=.55+.12*grain+.08*cloud;
    if(kind==='slate'){value+=.05*(surfaceNoise(u,v,4,43,16)-.5);height+=.08*cloud;}
    if(kind==='terracotta')value+=.025*Math.sin(tau*(3*u+2*v));
  }
  if(joint&&['marble','sandstone','terracotta','slate'].includes(kind)){
    value=kind==='slate'?.65:.72;height=.18;
  }
  return {value:Math.max(0,Math.min(1,value)),height:Math.max(0,Math.min(1,height))};
}
const ChurchMaterials={
  profile:{id:'low',textures:false},
  renderer:null,environment:null,
  textures:new Map(),materials:new Map(),bases:new WeakMap(),
  assign(object,kind,base=this.bases.get(object)||object.material){
    if(!SURFACE_FINISHES[kind])throw new Error('Unknown surface finish: '+kind);
    this.bases.set(object,base);
    object.userData.surfaceType=kind;
    this.mapGeometry(object,kind);
    this.apply(object);
    return object;
  },
  mapGeometry(object,kind){
    const geometry=object.geometry;
    if(geometry.userData.surfaceUV)return;
    if(geometry.type==='BoxGeometry'){
      const pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
      const period=SURFACE_FINISHES[kind].period;
      const p=geometry.parameters;
      for(let i=0;i<uv.count;i++){
        const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i));
        let a,b,al,bl;
        if(nx>.5){a=pos.getZ(i);b=pos.getY(i);al=p.depth;bl=p.height;}
        else if(ny>.5){a=pos.getX(i);b=pos.getZ(i);al=p.width;bl=p.depth;}
        else{a=pos.getX(i);b=pos.getY(i);al=p.width;bl=p.height;}
        // Grain runs along the longest dimension of each wooden face.
        if(kind==='wood'&&bl>al)[a,b]=[b,a];
        uv.setXY(i,a/period,b/period);
      }
      uv.needsUpdate=true;
    }
    geometry.userData.surfaceUV=true;
  },
  texture(kind,size){
    const key=kind+':'+size;
    if(this.textures.has(key))return this.textures.get(key);
    const colour=document.createElement('canvas'),height=document.createElement('canvas');
    colour.width=colour.height=height.width=height.height=size;
    const ctx=colour.getContext('2d'),hctx=height.getContext('2d');
    const image=ctx.createImageData(size,size),relief=hctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const sample=surfaceSample(kind,(x+.5)/size,(y+.5)/size),i=(y*size+x)*4;
      image.data[i]=image.data[i+1]=image.data[i+2]=Math.round(sample.value*255);
      relief.data[i]=relief.data[i+1]=relief.data[i+2]=Math.round(sample.height*255);
      image.data[i+3]=relief.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);hctx.putImageData(relief,0,0);
    const map=new THREE.CanvasTexture(colour),bump=new THREE.CanvasTexture(height);
    map.encoding=THREE.sRGBEncoding;
    for(const texture of [map,bump]){
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
    }
    const result={map,bump};
    this.textures.set(key,result);
    return result;
  },
  reflection(){
    if(this.environment)return this.environment.texture;
    const faces=[];
    for(let i=0;i<6;i++){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
      const ctx=canvas.getContext('2d');
      const gradient=ctx.createLinearGradient(0,0,0,64);
      gradient.addColorStop(0,i===3?'#766b59':'#e6dfcf');
      gradient.addColorStop(.55,'#b6b2a9');gradient.addColorStop(1,'#655c4d');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
      if(i!==3){ctx.fillStyle='#fff8e7';ctx.fillRect(10,6,10,30);ctx.fillRect(43,6,10,30);}
      faces.push(canvas);
    }
    const cube=new THREE.CubeTexture(faces);cube.encoding=THREE.sRGBEncoding;cube.needsUpdate=true;
    const generator=new THREE.PMREMGenerator(this.renderer);
    this.environment=generator.fromCubemap(cube);
    generator.dispose();cube.dispose();
    return this.environment.texture;
  },
  apply(object){
    const kind=object.userData.surfaceType;
    if(!kind)return;
    const base=this.bases.get(object),size=surfaceTextureSize(this.profile);
    let target=base;
    if(size){
      const key=kind+':'+base.uuid+':'+size;
      if(!this.materials.has(key)){
        const finish=SURFACE_FINISHES[kind],m=base.clone();
        m.color.convertSRGBToLinear();
        m.roughness=finish.roughness;m.metalness=finish.metalness;
        m.envMap=this.reflection();m.envMapIntensity=finish.metalness?.8:.25;
        if(finish.bump){
          const textures=this.texture(kind,size);
          m.map=textures.map;m.bumpMap=textures.bump;m.bumpScale=finish.bump;
        }
        this.materials.set(key,m);
      }
      target=this.materials.get(key);
    }
    const fade=object.userData.fadeMaterial;
    if(fade){
      fade.copy(target);fade.transparent=true;fade.opacity=.22;fade.depthWrite=false;fade.needsUpdate=true;
      object.userData.solidMaterial=target;
    }
    if(object.material!==fade)object.material=target;
  },
  configure(scene,renderer,profile){
    this.renderer=renderer;this.profile=profile;
    scene.traverse(object=>{if(object.userData.surfaceType)this.apply(object);});
  }
};
function finishSurface(object,kind,base){return ChurchMaterials.assign(object,kind,base);}
if(typeof module!=='undefined')module.exports={SURFACE_FINISHES,surfaceTextureSize,surfaceSample,ChurchMaterials};
