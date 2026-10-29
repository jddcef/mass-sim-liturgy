'use strict';
// Realistic rendering for the Ultra, Realistic and Cinematic detail levels (see mass-graphics.js).
// Shaders, lights, light shafts and the reflection probe are all generated here at run time:
// no image loads, no network, and it works on file://. The pure helpers first are tested in Node.

// Emissive strength per light source: [standard frame, floating-point frame with bloom].
const REALISM_GLOW={flame:[1.1,5],lamp:[.8,3],star:[.9,3.5],window:[1.4,2]};
// Share of the room's light a glowing surface still reflects. Stained glass is seen by the daylight
// coming through it, so it keeps its colour instead of paling under the church's lamps.
const REALISM_GLOW_LIT={window:.12};
// Sources that also lend a nearby point light (Realistic and Cinematic).
const REALISM_LIGHTS={flame:{color:'#ffa552',intensity:.5},lamp:{color:'#ff6b4a',intensity:.35},star:{color:'#ffe3a0',intensity:.3}};
// The reflection probe sits on the centre line (x = 0) above the front of the nave.
const REALISM_PROBE_AT=[0,2.4,-2.5];
// Supersampling never renders more than 4K pixels beyond the screen's own size.
const REALISM_MAX_PIXELS=3840*2160;
const REALISM_GEOMETRY_ARGS={
  SphereGeometry:['radius','widthSegments','heightSegments','phiStart','phiLength','thetaStart','thetaLength'],
  CylinderGeometry:['radiusTop','radiusBottom','height','radialSegments','heightSegments','openEnded','thetaStart','thetaLength'],
  TorusGeometry:['radius','tube','radialSegments','tubularSegments','arc']
};

// Hemisphere kernel for ambient occlusion: deterministic, with more samples close to the point.
function aoKernel(count){
  const golden=Math.PI*(3-Math.sqrt(5)),gcd=(a,b)=>b?gcd(b,a%b):a;
  let stride=Math.max(1,Math.round(count*.618));
  while(gcd(stride,count)!==1)stride++;
  const kernel=[];
  for(let i=0;i<count;i++){
    const z=.15+.85*(i+.5)/count,r=Math.sqrt(1-z*z),phi=i*golden;
    const t=((i*stride)%count+.5)/count,length=.1+.9*t*t;
    kernel.push([Math.cos(phi)*r*length,Math.sin(phi)*r*length,z*length]);
  }
  return kernel;
}
// Candle brightness factor, between 0.86 and 1.14; i offsets each flame.
function candleFlicker(t,i){
  return 1+.07*Math.sin(7.3*t+1.7*i)+.045*Math.sin(13.1*t+2.9*i)+.025*Math.sin(23.7*t+.7*i);
}
// Indices of the count points nearest origin (ties keep the lower index).
function nearestIndices(points,origin,count){
  return points.map((p,i)=>[(p.x-origin.x)**2+(p.y-origin.y)**2+(p.z-origin.z)**2,i])
    .sort((a,b)=>a[0]-b[0]||a[1]-b[1]).slice(0,Math.max(0,count)).map(entry=>entry[1]);
}
// Size of the off-screen frame: scale times the drawing buffer, reduced to maxPixels but never below
// the screen itself, and never above the largest texture the graphics card allows.
function postTargetSize(width,height,scale,maxPixels=Infinity,maxTexture=Infinity){
  width=Math.max(1,width);height=Math.max(1,height);
  let factor=scale;
  if(width*height*factor*factor>maxPixels)factor=Math.max(Math.min(1,scale),Math.sqrt(maxPixels/(width*height)));
  factor=Math.min(factor,maxTexture/Math.max(width,height));
  return {width:Math.max(1,Math.floor(width*factor)),height:Math.max(1,Math.floor(height*factor)),scale:factor};
}
function linearToSRGB(c){return c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055;}
function srgbToLinear(c){return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
// The ACES filmic curve exactly as three.js r128 applies it (and as the post shader repeats it).
const REALISM_ACES_IN=[[.59719,.35458,.04823],[.076,.90834,.01566],[.0284,.13383,.83777]];
const REALISM_ACES_OUT=[[1.60475,-.53108,-.07367],[-.10208,1.10813,-.00605],[-.00327,-.07276,1.07602]];
function realismMultiply(m,v){return m.map(row=>row[0]*v[0]+row[1]*v[1]+row[2]*v[2]);}
function realismInvert(m){
  const [[a,b,c],[d,e,f],[g,h,i]]=m,A=e*i-f*h,B=f*g-d*i,C=d*h-e*g,det=a*A+b*B+c*C;
  return [[A,c*h-b*i,b*f-c*e],[B,a*i-c*g,c*d-a*f],[C,b*g-a*h,a*e-b*d]].map(row=>row.map(x=>x/det));
}
function acesFilmic(rgb,exposure=1){
  const v=realismMultiply(REALISM_ACES_IN,rgb.map(c=>c*exposure/.6));
  const f=v.map(x=>(x*(x+.0245786)-.000090537)/(x*(.983729*x+.432951)+.238081));
  return realismMultiply(REALISM_ACES_OUT,f).map(x=>Math.max(0,Math.min(1,x)));
}
// The linear colour that the post shader turns back into a given screen colour (0-1, sRGB), so a plain
// background keeps the same look when the frame goes through tone mapping (the curve inverted exactly).
function displayToLinear(rgb,exposure=1){
  const target=rgb.map(c=>Math.min(.999,srgbToLinear(Math.max(0,Math.min(1,c)))));
  const v=realismMultiply(realismInvert(REALISM_ACES_OUT),target).map(y=>{
    const a=.983729*y-1,b=.432951*y-.0245786,c=.238081*y+.000090537;
    return Math.max(0,(-b-Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a));
  });
  return realismMultiply(realismInvert(REALISM_ACES_IN),v).map(x=>Math.max(0,Math.min(64,x*.6/exposure)));
}
// Constructor arguments for a three.js geometry, in order, from its parameters.
function geometryArgs(type,p){
  const names=REALISM_GEOMETRY_ARGS[type];
  return names&&p?names.map(name=>p[name]):null;
}
// Finer constructor arguments for coarse spheres, cylinders and tori, or null to keep the geometry.
function smoothParameters(type,p){
  if(!p)return null;
  if(type==='SphereGeometry'&&p.widthSegments>=8&&p.widthSegments<24)
    return geometryArgs(type,{...p,widthSegments:24,heightSegments:Math.max(16,p.heightSegments)});
  if(type==='CylinderGeometry'&&p.radialSegments>=8&&p.radialSegments<24)
    return geometryArgs(type,{...p,radialSegments:24});
  if(type==='TorusGeometry'&&p.tubularSegments>=16&&(p.radialSegments<12||p.tubularSegments<48))
    return geometryArgs(type,{...p,radialSegments:Math.max(12,p.radialSegments),tubularSegments:Math.max(48,p.tubularSegments)});
  return null;
}
function glowIntensity(kind,hdr){
  const range=REALISM_GLOW[kind];
  return range?range[hdr?1:0]:0;
}
// Light shaft opacity: u runs across the shaft (0-1), along from the window (0) to its far end (1).
// Faint at the glass (so the window keeps its colours), strongest a third of the way, gone at the end.
function shaftAlpha(u,along){
  if(u<=0||u>=1||along<=0||along>=1)return 0;
  const rise=Math.min(1,along/.35),fade=1-Math.max(0,along-.35)/.65;
  return Math.pow(Math.sin(Math.PI*u),1.5)*rise*rise*(3-2*rise)*fade*fade;
}

const REALISM_VERTEX='varying vec2 vUv;\nvoid main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const REALISM_COMMON=`
varying vec2 vUv;
float postIGN(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
float postViewZ(float depth,mat4 proj){return -proj[3][2]/(depth*2.-1.+proj[2][2]);}
`;
// Screen-space ambient occlusion from the depth buffer, at reduced resolution.
const REALISM_AO=REALISM_COMMON+`
uniform sampler2D tDepth;
uniform mat4 uProj,uInvProj;
uniform vec2 uDepthTexel;
uniform vec3 uKernel[SAMPLES];
uniform float uRadius,uBias,uStrength;
vec3 postViewPos(vec2 at){
  vec4 v=uInvProj*vec4(at*2.-1.,texture2D(tDepth,at).r*2.-1.,1.);
  return v.xyz/v.w;
}
void main(){
  if(texture2D(tDepth,vUv).r>=1.){gl_FragColor=vec4(1.);return;}
  vec3 P=postViewPos(vUv);
  vec2 tx=vec2(uDepthTexel.x,0.),ty=vec2(0.,uDepthTexel.y);
  vec3 left=postViewPos(vUv-tx),right=postViewPos(vUv+tx),below=postViewPos(vUv-ty),above=postViewPos(vUv+ty);
  vec3 dx=abs(right.z-P.z)<abs(P.z-left.z)?right-P:P-left;
  vec3 dy=abs(above.z-P.z)<abs(P.z-below.z)?above-P:P-below;
  vec3 normal=cross(dx,dy);
  if(dot(normal,normal)<1e-14){gl_FragColor=vec4(1.);return;}
  normal=normalize(normal);
  if(dot(normal,P)>0.)normal=-normal;
  float angle=6.2831853*postIGN(gl_FragCoord.xy);
  vec3 turn=vec3(cos(angle),sin(angle),0.);
  vec3 tangent=normalize(turn-normal*dot(turn,normal));
  vec3 bitangent=cross(normal,tangent);
  float occlusion=0.;
  for(int i=0;i<SAMPLES;i++){
    vec3 k=uKernel[i];
    vec3 s=P+(tangent*k.x+bitangent*k.y+normal*k.z)*uRadius;
    vec4 clip=uProj*vec4(s,1.);
    vec2 at=clip.xy/clip.w*.5+.5;
    if(at.x<0.||at.x>1.||at.y<0.||at.y>1.)continue;
    float z=postViewZ(texture2D(tDepth,at).r,uProj);
    float range=smoothstep(0.,1.,uRadius/max(abs(P.z-z),1e-4));
    occlusion+=(z>=s.z+uBias?1.:0.)*range;
  }
  float ao=clamp(1.-uStrength*occlusion/float(SAMPLES),0.,1.);
  gl_FragColor=vec4(ao,ao,ao,1.);
}`;
// Smooths the occlusion without blurring across edges in depth.
const REALISM_BLUR=REALISM_COMMON+`
uniform sampler2D tAO,tDepth;
uniform vec2 uTexel;
uniform mat4 uProj;
void main(){
  float centre=postViewZ(texture2D(tDepth,vUv).r,uProj),sum=0.,weight=0.;
  for(int x=-2;x<2;x++)for(int y=-2;y<2;y++){
    vec2 at=vUv+(vec2(float(x),float(y))+.5)*uTexel;
    float z=postViewZ(texture2D(tDepth,at).r,uProj);
    float w=max(0.,1.-abs(z-centre)/(.04+.06*abs(centre)));
    sum+=texture2D(tAO,at).r*w;weight+=w;
  }
  float ao=weight>.001?sum/weight:texture2D(tAO,vUv).r;
  gl_FragColor=vec4(ao,ao,ao,1.);
}`;
// Bloom: keep only the brightest light (soft threshold), then blur it down and back up.
const REALISM_PREFILTER=REALISM_COMMON+`
uniform sampler2D tScene;
uniform vec2 uTexel;
uniform float uThreshold,uKnee;
vec3 tap(vec2 o){return min(texture2D(tScene,vUv+o*uTexel).rgb,vec3(64.));}
void main(){
  vec3 c=(tap(vec2(-.25,-.25))+tap(vec2(.25,-.25))+tap(vec2(-.25,.25))+tap(vec2(.25,.25)))*.25;
  float bright=max(c.r,max(c.g,c.b));
  float soft=clamp(bright-uThreshold+uKnee,0.,2.*uKnee);
  soft=soft*soft/(4.*uKnee+1e-5);
  gl_FragColor=vec4(c*max(soft,bright-uThreshold)/max(bright,1e-5),1.);
}`;
const REALISM_DOWN=REALISM_COMMON+`
uniform sampler2D tSource;
uniform vec2 uTexel;
void main(){
  vec3 c=texture2D(tSource,vUv).rgb*4.;
  c+=texture2D(tSource,vUv-uTexel).rgb+texture2D(tSource,vUv+uTexel).rgb;
  c+=texture2D(tSource,vUv+vec2(uTexel.x,-uTexel.y)).rgb+texture2D(tSource,vUv-vec2(uTexel.x,-uTexel.y)).rgb;
  gl_FragColor=vec4(c/8.,1.);
}`;
const REALISM_UP=REALISM_COMMON+`
uniform sampler2D tSource,tBase;
uniform vec2 uTexel;
void main(){
  vec2 x=vec2(uTexel.x,0.),y=vec2(0.,uTexel.y);
  vec3 c=texture2D(tSource,vUv).rgb*4.;
  c+=(texture2D(tSource,vUv+x).rgb+texture2D(tSource,vUv-x).rgb+texture2D(tSource,vUv+y).rgb+texture2D(tSource,vUv-y).rgb)*2.;
  c+=texture2D(tSource,vUv+x+y).rgb+texture2D(tSource,vUv-x-y).rgb+texture2D(tSource,vUv+x-y).rgb+texture2D(tSource,vUv-x+y).rgb;
  gl_FragColor=vec4(texture2D(tBase,vUv).rgb+c/16.,1.);
}`;
// Final picture: occlusion, bloom, filmic tone mapping, a light vignette, sRGB and fine grain.
const REALISM_COMPOSITE=REALISM_COMMON+`
uniform sampler2D tScene,tAO,tBloom;
uniform vec2 uTexel;
uniform float uExposure,uVignette,uGrain,uBloom,uAspect,uFrame;
vec3 postFit(vec3 v){return (v*(v+.0245786)-.000090537)/(v*(.983729*v+.432951)+.238081);}
vec3 postACES(vec3 c){
  const mat3 postIn=mat3(vec3(.59719,.076,.0284),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));
  const mat3 postOut=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));
  return clamp(postOut*postFit(postIn*c),0.,1.);
}
vec3 postSRGB(vec3 c){return mix(c*12.92,pow(c,vec3(.41666))*1.055-.055,step(vec3(.0031308),c));}
void main(){
#ifdef SUPERSAMPLE
  vec3 c=(texture2D(tScene,vUv+vec2(-.25,-.25)*uTexel).rgb+texture2D(tScene,vUv+vec2(.25,-.25)*uTexel).rgb
    +texture2D(tScene,vUv+vec2(-.25,.25)*uTexel).rgb+texture2D(tScene,vUv+vec2(.25,.25)*uTexel).rgb)*.25;
#else
  vec3 c=texture2D(tScene,vUv).rgb;
#endif
  c*=texture2D(tAO,vUv).r;
  c+=texture2D(tBloom,vUv).rgb*uBloom;
  c=postACES(c*uExposure/.6);
  vec2 q=(vUv-.5)*vec2(uAspect,1.)*2./length(vec2(uAspect,1.));
  c*=1.-uVignette*dot(q,q);
  c=postSRGB(c);
  c+=(postIGN(gl_FragCoord.xy+5.588238*uFrame)-.5)*uGrain;
  gl_FragColor=vec4(c,1.);
}`;

const SceneRealism=(()=>{
  let ctx=null,profile={rank:0},hdr=false,warned=false,lastScan=-1e9,sources=[],frame=0;
  const glowCache=new Map(),smoothCache=new WeakMap(),smoothed=new Map(),lights=[];
  let lightGroup=null,lightColours=null,shafts=null,probe=null,post=null,postKey='';
  const now=()=>(typeof performance!=='undefined'?performance.now():Date.now())/1000;
  const three=()=>ctx.THREE;
  function visibleInScene(object){
    for(let node=object;node;node=node.parent){
      if(!node.visible)return false;
      if(node===ctx.scene)return true;
    }
    return false;
  }
  function floatTargets(){
    const r=ctx.renderer;
    return !!(r.capabilities.isWebGL2&&r.extensions.has('EXT_color_buffer_float'));
  }

  // Glow: light sources get an emissive copy of their colour. Faded figures (mass-game-view.js) keep
  // their solid material in userData, so the glow swaps that one instead of the see-through copy.
  function shownMaterial(o){
    const fade=o.userData.fadeMaterial;
    return fade&&o.material===fade?o.userData.solidMaterial:o.material;
  }
  function replaceShown(o,from,to){
    if(o.material===from)o.material=to;
    else if(o.userData.fadeMaterial&&o.material===o.userData.fadeMaterial&&o.userData.solidMaterial===from)o.userData.solidMaterial=to;
  }
  function applyGlow(o){
    const shown=shownMaterial(o);
    const base=shown&&shown===o.userData.glowMaterial?o.userData.glowBase:shown;
    if(!base||Array.isArray(base)||!base.emissive)return;
    const kind=o.userData.glow,intensity=glowIntensity(kind,hdr),lit=REALISM_GLOW_LIT[kind]??1,key=base.uuid+':'+intensity+':'+lit;
    if(!glowCache.has(key)){
      // The colour is authored in sRGB; like the textured surfaces (mass-materials.js), convert it so the
      // glass and flames keep their saturation instead of paling through the sRGB output.
      const m=base.clone();
      m.color.convertSRGBToLinear();
      m.emissive.copy(m.color);m.emissiveIntensity=intensity;
      m.color.multiplyScalar(lit);
      glowCache.set(key,m);
    }
    const m=glowCache.get(key);
    o.userData.glowBase=base;o.userData.glowMaterial=m;
    if(shown!==m)replaceShown(o,shown,m);
  }
  function removeGlow(o){
    const m=o.userData.glowMaterial;
    if(!m)return;
    if(shownMaterial(o)===m)replaceShown(o,m,o.userData.glowBase);
    delete o.userData.glowMaterial;delete o.userData.glowBase;
  }

  // Smoother curves: each coarse sphere, cylinder or torus gets a finer twin. Geometry that was moved or
  // reshaped after it was built is left alone. Disposing the twin also disposes the original.
  function samePositions(a,b){
    const p=a.attributes.position?.array,q=b.attributes.position?.array;
    if(!p||!q||p.length!==q.length)return false;
    for(let i=0;i<p.length;i++)if(Math.abs(p[i]-q[i])>1e-6)return false;
    return true;
  }
  function smoothFor(geometry){
    if(smoothCache.has(geometry))return smoothCache.get(geometry);
    const THREE=three(),Geometry=THREE[geometry.type],args=smoothParameters(geometry.type,geometry.parameters);
    let smooth=null;
    if(args&&Geometry){
      const reference=new Geometry(...geometryArgs(geometry.type,geometry.parameters));
      if(samePositions(reference,geometry)){
        smooth=new Geometry(...args);
        smooth.userData={...geometry.userData};
        const release=()=>{smoothed.delete(smooth);smoothCache.delete(geometry);geometry.dispose();};
        smooth.addEventListener('dispose',release);
        smoothed.set(smooth,{coarse:geometry,release});
      }
      reference.dispose();
    }
    smoothCache.set(geometry,smooth);
    return smooth;
  }
  function applySmooth(o){
    if(o.geometry===o.userData.smoothGeometry)return;
    const smooth=smoothFor(o.geometry);
    if(!smooth)return;
    o.userData.coarseGeometry=o.geometry;o.userData.smoothGeometry=smooth;o.geometry=smooth;
  }
  function restoreSmoothing(){
    ctx.scene.traverse(o=>{
      const smooth=o.userData.smoothGeometry;
      if(!smooth)return;
      if(o.geometry===smooth)o.geometry=o.userData.coarseGeometry;
      delete o.userData.smoothGeometry;delete o.userData.coarseGeometry;
    });
    for(const [smooth,{coarse,release}] of smoothed){
      smooth.removeEventListener('dispose',release);smooth.dispose();smoothCache.delete(coarse);
    }
    smoothed.clear();
  }
  function scan(){
    lastScan=now();
    const found=[];
    ctx.scene.traverse(o=>{
      if(!o.isMesh||o.userData.realism)return;
      if(o.userData.glow){
        if(profile.glow)applyGlow(o);else removeGlow(o);
        if(REALISM_LIGHTS[o.userData.glow])found.push(o);
      }
      if(profile.smooth&&!o.isInstancedMesh&&!o.isSkinnedMesh&&o.geometry)applySmooth(o);
    });
    sources=found;
  }

  // Candlelight: a small pool of point lights follows the visible flames nearest the camera. The pool
  // size stays fixed while the level is on, so shaders compile once.
  function setLightCount(count){
    const THREE=count?three():null;
    if(count&&!lightGroup){
      lightGroup=new THREE.Group();lightGroup.name='Candlelight';lightGroup.userData.realism=true;
      ctx.scene.add(lightGroup);
      lightColours=Object.fromEntries(Object.entries(REALISM_LIGHTS).map(([kind,v])=>[kind,new THREE.Color(v.color)]));
    }
    while(lights.length<count){
      const light=new THREE.PointLight(REALISM_LIGHTS.flame.color,0,4.5,2);
      light.layers.enableAll();
      lights.push(light);lightGroup.add(light);
    }
    while(lights.length>count)lightGroup.remove(lights.pop());
    if(!count&&lightGroup){ctx.scene.remove(lightGroup);lightGroup=null;}
  }
  function updateLights(time){
    if(!lights.length)return;
    const THREE=three();
    const live=sources.filter(visibleInScene);
    const points=live.map(o=>o.getWorldPosition(new THREE.Vector3()));
    const order=nearestIndices(points,ctx.camera.position,lights.length);
    lights.forEach((light,n)=>{
      const k=order[n];
      if(k===undefined){light.intensity=0;return;}
      const o=live[k],kind=o.userData.glow;
      light.position.copy(points[k]);light.position.y+=.06;
      light.color.copy(lightColours[kind]);
      light.intensity=REALISM_LIGHTS[kind].intensity*(kind==='flame'?candleFlicker(time,sources.indexOf(o)):1);
    });
  }

  // Light shafts: soft additive beams slanting down from each back-wall window into the sanctuary.
  function shaftGeometry(THREE,centre,right,up,normal){
    const dir=up.clone().multiplyScalar(-.55).add(normal).normalize();
    const start=centre.clone().addScaledVector(normal,.05),end=start.clone().addScaledVector(dir,5.5);
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
    const at=(base,s)=>corners.map(([a,b])=>base.clone().addScaledVector(right,a*.5*s).addScaledVector(up,b*1.1*s));
    const near=at(start,1),far=at(end,1.25),position=[],uv=[],index=[];
    for(let e=0;e<4;e++){
      const f=(e+1)%4,base=position.length/3;
      for(const [p,u,v] of [[near[e],0,1],[near[f],1,1],[far[f],1,0],[far[e],0,0]]){position.push(p.x,p.y,p.z);uv.push(u,v);}
      index.push(base,base+1,base+2,base,base+2,base+3);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.setIndex(index);
    return geometry;
  }
  function shaftTexture(THREE){
    const w=32,h=64,data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      data[i]=data[i+1]=data[i+2]=255;
      data[i+3]=Math.round(255*shaftAlpha((x+.5)/w,1-(y+.5)/h));
    }
    const texture=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);
    texture.magFilter=texture.minFilter=THREE.LinearFilter;
    texture.needsUpdate=true;
    return texture;
  }
  function removeShafts(){
    if(!shafts)return;
    ctx.scene.remove(shafts.group);
    shafts.group.children.forEach(m=>m.geometry.dispose());
    shafts.material.dispose();shafts.texture.dispose();
    shafts=null;
  }
  function buildShafts(windows){
    removeShafts();
    const THREE=three(),group=new THREE.Group(),texture=shaftTexture(THREE);
    group.name='Window light';group.userData.realism=true;
    const material=new THREE.MeshBasicMaterial({color:'#ffe6bf',map:texture,transparent:true,opacity:.12,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
    windows.updateMatrixWorld(true);
    for(const win of windows.children){
      const centre=win.getWorldPosition(new THREE.Vector3()),turn=win.getWorldQuaternion(new THREE.Quaternion());
      const axis=(x,y,z)=>new THREE.Vector3(x,y,z).applyQuaternion(turn);
      const mesh=new THREE.Mesh(shaftGeometry(THREE,centre,axis(1,0,0),axis(0,1,0),axis(0,0,1)),material);
      mesh.raycast=()=>{};mesh.userData.realism=true;mesh.renderOrder=3;
      group.add(mesh);
    }
    ctx.scene.add(group);
    shafts={group,windows,material,texture};
  }
  function updateShafts(){
    const windows=profile.shafts&&ctx.windows?ctx.windows():null;
    if(!windows){removeShafts();return;}
    if(!shafts||shafts.windows!==windows)buildShafts(windows);
    shafts.group.visible=visibleInScene(windows);
  }

  // Reflections captured inside the church (people, labels and light shafts hidden), blurred for
  // rough surfaces with three.js's PMREM generator and handed to ChurchMaterials.
  function ensureProbe(){
    if(probe)return probe;
    const THREE=three(),float=floatTargets();
    const target=new THREE.WebGLCubeRenderTarget(256,{type:float?THREE.HalfFloatType:THREE.UnsignedByteType,
      format:THREE.RGBAFormat,encoding:float?THREE.LinearEncoding:THREE.sRGBEncoding,generateMipmaps:false,
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    const camera=new THREE.CubeCamera(.1,60,target);
    camera.position.set(...REALISM_PROBE_AT);
    probe={target,camera,generator:new THREE.PMREMGenerator(ctx.renderer),env:null,dirtyAt:-1,
      background:new THREE.Color(.5,.45,.38)};
    return probe;
  }
  function disposeProbe(){
    if(!probe)return;
    if(typeof ChurchMaterials!=='undefined'&&ChurchMaterials.sceneProbe)ChurchMaterials.setEnvironment(null);
    if(typeof PeopleModels!=='undefined')PeopleModels.setEnvironment(null);
    if(probe.env)probe.env.dispose();
    probe.target.dispose();probe.generator.dispose();
    probe=null;
  }
  function captureProbe(){
    const THREE=three(),r=ctx.renderer,scene=ctx.scene,p=ensureProbe();
    const hidden=[...(ctx.dynamic?ctx.dynamic():[]),...(ctx.overlay||[]),shafts?.group].filter(o=>o&&o.visible);
    const walls=(ctx.walls?ctx.walls():[]).map(m=>m.material).filter(m=>m&&m.opacity!==1).map(m=>[m,m.opacity,m.depthWrite]);
    const saved={background:scene.background,tone:r.toneMapping,auto:r.shadowMap.autoUpdate,needs:r.shadowMap.needsUpdate,
      x:scene.position.x,scale:scene.scale.x};
    hidden.forEach(o=>{o.visible=false;});
    walls.forEach(([m])=>{m.opacity=1;m.depthWrite=true;});
    scene.background=p.background;
    r.toneMapping=THREE.NoToneMapping;
    // One shadow update for all six faces.
    if(r.shadowMap.enabled){r.shadowMap.autoUpdate=false;r.shadowMap.needsUpdate=true;}
    // three.js r128's PMREM generator mirrors cube render targets in x, so capture a mirrored church
    // (about the probe's plane, x = 0, which also holds the sun's target).
    scene.scale.x=-saved.scale;scene.position.x=2*REALISM_PROBE_AT[0]-saved.x;
    try{p.camera.update(r,scene);}
    finally{
      scene.scale.x=saved.scale;scene.position.x=saved.x;
      scene.updateMatrixWorld(true);
      r.shadowMap.autoUpdate=saved.auto;r.shadowMap.needsUpdate=saved.needs;
      r.toneMapping=saved.tone;scene.background=saved.background;
      walls.forEach(([m,opacity,depthWrite])=>{m.opacity=opacity;m.depthWrite=depthWrite;});
      hidden.forEach(o=>{o.visible=true;});
    }
    const env=p.generator.fromCubemap(p.target.texture);
    if(typeof ChurchMaterials!=='undefined')ChurchMaterials.setEnvironment(env.texture);
    if(typeof PeopleModels!=='undefined')PeopleModels.setEnvironment(env.texture);
    if(p.env)p.env.dispose();
    p.env=env;p.dirtyAt=-1;
  }

  // Post-processing on a floating-point, multisampled frame (WebGL 2 only).
  function createPost(settings){
    const THREE=three();
    const quadGeometry=new THREE.PlaneGeometry(2,2),quad=new THREE.Mesh(quadGeometry);
    quad.frustumCulled=false;
    const quadScene=new THREE.Scene();quadScene.add(quad);
    const shader=(fragmentShader,uniforms,defines={})=>new THREE.ShaderMaterial({uniforms,defines,
      vertexShader:REALISM_VERTEX,fragmentShader,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.NoBlending});
    const v2=()=>({value:new THREE.Vector2()}),tex=()=>({value:null}),num=value=>({value});
    return {settings,quad,quadScene,quadGeometry,quadCamera:new THREE.OrthographicCamera(-1,1,1,-1,0,1),
      size:'',targets:null,drawing:new THREE.Vector2(),background:{hex:null,color:new THREE.Color()},
      ao:shader(REALISM_AO,{tDepth:tex(),uProj:num(null),uInvProj:num(null),uDepthTexel:v2(),
        uKernel:num(aoKernel(settings.ao.samples).map(k=>new THREE.Vector3(...k))),
        uRadius:num(settings.ao.radius),uBias:num(settings.ao.bias),uStrength:num(settings.ao.strength)},{SAMPLES:settings.ao.samples}),
      blur:shader(REALISM_BLUR,{tAO:tex(),tDepth:tex(),uTexel:v2(),uProj:num(null)}),
      prefilter:shader(REALISM_PREFILTER,{tScene:tex(),uTexel:v2(),uThreshold:num(settings.bloom.threshold),
        uKnee:num(settings.bloom.threshold*settings.bloom.knee)}),
      down:shader(REALISM_DOWN,{tSource:tex(),uTexel:v2()}),
      up:shader(REALISM_UP,{tSource:tex(),tBase:tex(),uTexel:v2()}),
      composite:shader(REALISM_COMPOSITE,{tScene:tex(),tAO:tex(),tBloom:tex(),uTexel:v2(),uExposure:num(settings.exposure),
        uVignette:num(settings.vignette),uGrain:num(settings.grain),uBloom:num(settings.bloom.strength/settings.bloom.levels),
        uAspect:num(1),uFrame:num(0)},settings.renderScale>1?{SUPERSAMPLE:''}:{})};
  }
  function disposeTargets(){
    if(!post?.targets)return;
    const t=post.targets;
    t.scene.depthTexture.dispose();
    for(const target of [t.scene,t.ao,t.aoBlur,...t.down,...t.up])target.dispose();
    post.targets=null;post.size='';
  }
  function disposePost(){
    if(!post)return;
    disposeTargets();
    for(const name of ['ao','blur','prefilter','down','up','composite'])post[name].dispose();
    post.quadGeometry.dispose();
    post=null;
  }
  function ensureTargets(width,height){
    const THREE=three(),r=ctx.renderer,s=post.settings,gl=r.getContext();
    const maxTexture=Math.min(r.capabilities.maxTextureSize,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    const size=postTargetSize(width,height,s.renderScale,REALISM_MAX_PIXELS,maxTexture);
    const key=width+'x'+height+':'+size.width+'x'+size.height;
    if(post.size===key)return post.targets;
    disposeTargets();
    const hdrOptions={type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,
      magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false,generateMipmaps:false};
    const scene=new THREE.WebGLMultisampleRenderTarget(size.width,size.height,{...hdrOptions,depthBuffer:true});
    scene.samples=Math.min(s.msaa,r.capabilities.maxSamples||0);
    scene.depthTexture=new THREE.DepthTexture(size.width,size.height,THREE.UnsignedIntType);
    const aoWidth=Math.max(1,Math.round(size.width*s.ao.scale)),aoHeight=Math.max(1,Math.round(size.height*s.ao.scale));
    const ldr={...hdrOptions,type:THREE.UnsignedByteType};
    const down=[],up=[];
    let w=Math.max(1,Math.ceil(width/2)),h=Math.max(1,Math.ceil(height/2));
    for(let i=0;i<s.bloom.levels;i++){
      down.push(new THREE.WebGLRenderTarget(w,h,hdrOptions));
      if(i<s.bloom.levels-1)up.push(new THREE.WebGLRenderTarget(w,h,hdrOptions));
      w=Math.max(1,Math.ceil(w/2));h=Math.max(1,Math.ceil(h/2));
    }
    post.targets={scene,size,ao:new THREE.WebGLRenderTarget(aoWidth,aoHeight,ldr),aoBlur:new THREE.WebGLRenderTarget(aoWidth,aoHeight,ldr),down,up};
    post.size=key;
    return post.targets;
  }
  // A plain colour background is drawn untouched by tone mapping, so convert it once per colour.
  function linearBackground(color){
    const cache=post.background,hex=color.getHex();
    if(cache.hex!==hex){
      cache.color.setRGB(...displayToLinear([color.r,color.g,color.b],post.settings.exposure));
      cache.hex=hex;
    }
    return cache.color;
  }
  function failedShaders(){
    return ['ao','blur','prefilter','down','up','composite'].some(name=>{
      const props=ctx.renderer.properties.get(post[name]);
      const program=props.currentProgram||props.program;
      return program?.diagnostics?.runnable===false;
    });
  }
  // shown: how much of the church the draw left visible. Highlight mode (mass-game-view.js) fades all but
  // what is on layer 1, so labels off that layer fade by the same share.
  function renderOverlay(labels,shown){
    if(!labels.some(visibleInScene))return;
    const THREE=three(),r=ctx.renderer,scene=ctx.scene,camera=ctx.camera;
    const saved={auto:r.autoClear,tone:r.toneMapping,background:scene.background,mask:camera.layers.mask,shadows:r.shadowMap.autoUpdate};
    const masks=labels.map(l=>l.layers.mask),opacities=labels.map(l=>l.material.opacity);
    labels.forEach((l,i)=>{
      if(shown<1&&!(masks[i]&2))l.material.opacity*=shown;
      l.layers.set(3);
    });
    // Labels cast no shadows, so the shadow maps need no redraw for this pass.
    r.autoClear=false;r.toneMapping=THREE.ACESFilmicToneMapping;scene.background=null;camera.layers.set(3);r.shadowMap.autoUpdate=false;
    r.setRenderTarget(null);
    try{r.render(scene,camera);}
    finally{
      r.autoClear=saved.auto;r.toneMapping=saved.tone;scene.background=saved.background;camera.layers.mask=saved.mask;
      r.shadowMap.autoUpdate=saved.shadows;
      labels.forEach((l,i)=>{l.layers.mask=masks[i];l.material.opacity=opacities[i];});
    }
  }
  function renderPost(draw){
    const r=ctx.renderer,scene=ctx.scene,camera=ctx.camera,s=post.settings;
    const drawing=r.getDrawingBufferSize(post.drawing);
    const t=ensureTargets(drawing.x,drawing.y);
    // Labels skip post-processing: they are hidden for the scene and drawn crisp on top afterwards. Hiding
    // (rather than moving layers) leaves highlight mode free to change their layers while it draws.
    const labels=(ctx.overlay||[]).filter(Boolean),hidden=labels.filter(l=>l.visible);
    hidden.forEach(l=>{l.visible=false;});
    const background=scene.background;
    if(background&&background.isColor)scene.background=linearBackground(background);
    r.setRenderTarget(t.scene);
    let shown=1;
    try{const result=draw();if(typeof result==='number')shown=result;}
    finally{
      scene.background=background;
      hidden.forEach(l=>{l.visible=true;});
    }
    // The down and up materials serve several passes per frame; three.js only re-sends the uniforms of a
    // reused material when asked to.
    const pass=(material,target)=>{post.quad.material=material;material.uniformsNeedUpdate=true;r.setRenderTarget(target);r.render(post.quadScene,post.quadCamera);};
    const depth=t.scene.depthTexture,u=name=>post[name].uniforms;
    u('ao').tDepth.value=depth;u('ao').uProj.value=camera.projectionMatrix;u('ao').uInvProj.value=camera.projectionMatrixInverse;
    u('ao').uDepthTexel.value.set(1/t.size.width,1/t.size.height);
    pass(post.ao,t.ao);
    u('blur').tAO.value=t.ao.texture;u('blur').tDepth.value=depth;u('blur').uProj.value=camera.projectionMatrix;
    u('blur').uTexel.value.set(1/t.ao.width,1/t.ao.height);
    pass(post.blur,t.aoBlur);
    u('prefilter').tScene.value=t.scene.texture;u('prefilter').uTexel.value.set(1/t.down[0].width,1/t.down[0].height);
    pass(post.prefilter,t.down[0]);
    for(let i=1;i<t.down.length;i++){
      u('down').tSource.value=t.down[i-1].texture;u('down').uTexel.value.set(1/t.down[i-1].width,1/t.down[i-1].height);
      pass(post.down,t.down[i]);
    }
    let source=t.down[t.down.length-1];
    for(let i=t.up.length-1;i>=0;i--){
      u('up').tSource.value=source.texture;u('up').tBase.value=t.down[i].texture;u('up').uTexel.value.set(1/source.width,1/source.height);
      pass(post.up,t.up[i]);
      source=t.up[i];
    }
    const c=u('composite');
    c.tScene.value=t.scene.texture;c.tAO.value=t.aoBlur.texture;c.tBloom.value=source.texture;
    c.uTexel.value.set(1/drawing.x,1/drawing.y);c.uAspect.value=drawing.x/drawing.y;c.uFrame.value=frame=(frame+1)%64;
    pass(post.composite,null);
    renderOverlay(labels,shown);
    if(!post.checked){
      post.checked=true;
      if(failedShaders()){
        console.warn('Realistic post-processing could not compile on this graphics card; showing the Ultra image instead.');
        post.failed=true;hdr=false;r.toneMapping=three().ACESFilmicToneMapping;lastScan=-1e9;
      }
    }
  }

  return {
    // ctx: {scene, renderer, camera, THREE, overlay (label sprites), windows(), walls(), dynamic()}.
    configure(context,next){
      ctx=context;profile=next||{rank:0};
      const THREE=ctx.THREE,on=(profile.rank||0)>=3;
      if(!on||!profile.glow){ctx.scene.traverse(o=>{if(o.isMesh)removeGlow(o);});}
      if(!on){for(const m of glowCache.values())m.dispose();glowCache.clear();}
      if(!on||!profile.smooth)restoreSmoothing();
      if(!on||profile.reflections!=='scene')disposeProbe();
      setLightCount(on?profile.lights||0:0);
      if(!on||!profile.shafts)removeShafts();
      const key=on&&profile.post?JSON.stringify(profile.post):'';
      if(key!==postKey){disposePost();postKey=key;}
      hdr=false;
      if(on&&profile.post){
        if(!floatTargets()){
          if(!warned){warned=true;console.info('Realistic post-processing needs WebGL 2 with floating-point frames; showing the Ultra image instead.');}
        }else{
          if(!post)post=createPost(profile.post);
          hdr=!post.failed;
        }
      }
      ctx.renderer.toneMapping=hdr?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;
      if(!on)return;
      scan();
      if(profile.reflections==='scene')ensureProbe().dirtyAt=now()-1;
    },
    active(){return !!ctx&&(profile.rank||0)>=3;},
    // Call after the church changes: rescans for new light sources and, with probe, re-captures reflections.
    refresh(options={}){
      if(!this.active())return;
      lastScan=-1e9;
      if(options.probe&&probe)probe.dirtyAt=now();
    },
    render(draw){
      const time=now();
      if(time-lastScan>1)scan();
      updateLights(time);
      updateShafts();
      if(hdr&&post)renderPost(draw);else draw();
      if(probe&&probe.dirtyAt>=0&&time-probe.dirtyAt>.25)captureProbe();
    }
  };
})();
if(typeof module!=='undefined')module.exports={REALISM_GLOW,REALISM_MAX_PIXELS,aoKernel,candleFlicker,nearestIndices,postTargetSize,
  linearToSRGB,srgbToLinear,acesFilmic,displayToLinear,geometryArgs,smoothParameters,glowIntensity,shaftAlpha};
