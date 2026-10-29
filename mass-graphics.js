'use strict';
// Graphics detail levels shared by the 3D explorer and the game. Pure: tested in Node.
// "auto" picks Low on small or modest devices. Standard and higher use local surface textures.
// Each level above High adds one large step in graphics cost (see mass-realism.js):
//   Ultra: 1024-pixel textures with normal and roughness maps, clear-coated marble and wood,
//          reflections captured from the church, 4096 shadows, smoother curves, glowing flames and glass.
//   Realistic: adds candlelight, window light shafts and post-processing (ambient occlusion, bloom,
//          filmic colour) on a floating-point, multisampled frame.
//   Cinematic: renders that frame at twice the width and height (supersampling) with finer occlusion.
// Optional providers for High and above can return a cleanup function for switching back down.

const GRAPHICS_KEY='massGraphics';
const ULTRA_DETAIL={shadows:true,shadowSize:4096,crowd:1,antialias:true,textures:true,textureSize:1024,
  anisotropy:16,normalMaps:true,physical:true,reflections:'scene',glow:true,smooth:true};
const GRAPHICS_PROFILES={
  low:{id:'low',rank:0,name:'Low (fast, sparse congregation)',pixelRatio:1,shadows:false,shadowSize:512,crowd:.2,antialias:false,textures:false},
  standard:{id:'standard',rank:1,name:'Standard (textured, half congregation)',pixelRatio:2,shadows:true,shadowSize:1024,crowd:.5,antialias:true,textures:true,textureSize:256},
  high:{id:'high',rank:2,name:'High (sharper textures, three-quarter congregation)',pixelRatio:3,shadows:true,shadowSize:2048,crowd:.75,antialias:true,textures:true,textureSize:512},
  ultra:{id:'ultra',rank:3,name:'Ultra (detailed materials, reflections and glow)',pixelRatio:3,...ULTRA_DETAIL,lights:0,shafts:false,post:null},
  realistic:{id:'realistic',rank:4,name:'Realistic (candlelight, ambient occlusion and bloom; strong graphics card)',pixelRatio:3,...ULTRA_DETAIL,
    lights:6,shafts:true,
    post:{msaa:4,renderScale:1,exposure:.95,vignette:.24,grain:.012,
      ao:{samples:12,scale:.5,radius:.45,bias:.025,strength:.9},
      bloom:{levels:5,threshold:1.8,knee:.5,strength:.5}}},
  cinematic:{id:'cinematic',rank:5,name:'Cinematic (supersampled; very strong graphics card)',pixelRatio:3,...ULTRA_DETAIL,
    lights:10,shafts:true,
    post:{msaa:2,renderScale:2,exposure:.95,vignette:.24,grain:.01,
      ao:{samples:24,scale:.5,radius:.45,bias:.02,strength:.95},
      bloom:{levels:6,threshold:1.8,knee:.5,strength:.55}}}
};
function chooseGraphicsProfile(choice='auto',device={}){
  if(GRAPHICS_PROFILES[choice])return GRAPHICS_PROFILES[choice];
  const memory=device.deviceMemory,cores=device.cores;
  const short=Math.min(device.width||1280,device.height||800);
  const low=(memory&&memory<=2)||(cores&&cores<=2)||short<520;
  return GRAPHICS_PROFILES[low?'low':'standard'];
}
// Which congregation members stay visible for a crowd share (deterministic, spread evenly).
function crowdVisible(index,share){
  if(share>=1)return true;
  return Math.floor((index+1)*share)>Math.floor(index*share);
}
const GRAPHICS_CHECK_CANDIDATES=[
  {detail:'low',people:'blocks'},{detail:'low',people:'simple'},
  {detail:'standard',people:'simple'},{detail:'standard',people:'natural'},
  {detail:'high',people:'natural'},{detail:'ultra',people:'detailed'},
  {detail:'realistic',people:'lifelike'},{detail:'cinematic',people:'lifelike'}
];
const GRAPHICS_FRAME_BUDGET=25;
function frameTimeSummary(samples){
  if(!samples.length||samples.some(value=>!Number.isFinite(value)||value<=0))throw new Error('Frame samples must be positive finite milliseconds.');
  const sorted=[...samples].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
  const p90=sorted[Math.ceil(sorted.length*.9)-1];
  return {median,p90,fps:1000/median,smooth:p90<=GRAPHICS_FRAME_BUDGET};
}
class GraphicsPerformanceCheck{
  constructor(candidates=GRAPHICS_CHECK_CANDIDATES){
    if(!candidates.length)throw new Error('A performance check needs at least one candidate.');
    this.candidates=candidates;this.index=0;this.stage='next';this.results=[];this.samples=[];
    this.since=0;this.preparing=0;this.last=0;
  }
  finish(reason='measured'){
    this.stage='done';
    const passed=this.results.filter(result=>result.smooth);
    return {type:'complete',recommendation:passed[passed.length-1]||this.results[0]||null,reason};
  }
  update(now,ready=true){
    if(!Number.isFinite(now))throw new Error('The performance check needs a finite frame timestamp.');
    if(this.stage==='done')return null;
    if(this.stage==='next'){
      this.stage='warm';this.since=this.preparing=now;this.samples=[];
      return {type:'candidate',candidate:this.candidates[this.index]};
    }
    if(!ready){
      if(this.stage==='sample'){
        this.stage='warm';this.samples=[];this.preparing=now;
      }
      this.since=now;
      if(now-this.preparing>20000){
        this.stage='done';return {type:'error',message:'Figure preparation took too long. Try a lower People level before checking again.'};
      }
      return null;
    }
    if(this.stage==='warm'){
      if(now-this.since<400)return null;
      this.stage='sample';this.since=this.last=now;return null;
    }
    const dt=now-this.last;this.last=now;
    if(dt>0)this.samples.push(dt);
    const elapsed=now-this.since;
    if(!this.samples.length||elapsed<800||this.samples.length<12&&elapsed<2000)return null;
    const result={...this.candidates[this.index],...frameTimeSummary(this.samples)};
    this.results.push(result);
    if(!result.smooth||this.index===this.candidates.length-1)return this.finish();
    this.index++;this.stage='next';return null;
  }
}
const GraphicsDetail={
  providers:[],
  activeProviders:new Map(),
  addTextureProvider(fn){this.providers.push(fn);},
  applyTextureProviders(context,enabled){
    if(!enabled){
      for(const cleanup of this.activeProviders.values())if(typeof cleanup==='function')cleanup();
      this.activeProviders.clear();
      return;
    }
    for(const provider of this.providers)if(!this.activeProviders.has(provider)){
      try{this.activeProviders.set(provider,provider(context));}
      catch(error){console.warn('Texture provider failed',error);}
    }
  },
  storedChoice(){
    try{return (typeof localStorage!=='undefined'&&localStorage.getItem(GRAPHICS_KEY))||'auto';}catch{return 'auto';}
  },
  store(choice){try{localStorage.setItem(GRAPHICS_KEY,choice);}catch{}},
  device(){
    if(typeof window==='undefined')return {};
    return {deviceMemory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,width:window.screen?.width||window.innerWidth,height:window.screen?.height||window.innerHeight};
  },
  profile(choice=this.storedChoice()){return chooseGraphicsProfile(choice,this.device());}
};
if(typeof module!=='undefined')module.exports={GRAPHICS_PROFILES,chooseGraphicsProfile,crowdVisible,GraphicsDetail,
  GRAPHICS_CHECK_CANDIDATES,GRAPHICS_FRAME_BUDGET,frameTimeSummary,GraphicsPerformanceCheck};
