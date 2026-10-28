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
  low:{id:'low',rank:0,name:'Low (fast, for small or older devices)',pixelRatio:1,shadows:false,shadowSize:512,crowd:.5,antialias:false,textures:false},
  standard:{id:'standard',rank:1,name:'Standard (textured)',pixelRatio:2,shadows:true,shadowSize:1024,crowd:1,antialias:true,textures:true,textureSize:256},
  high:{id:'high',rank:2,name:'High (sharper textures and shadows)',pixelRatio:3,shadows:true,shadowSize:2048,crowd:1,antialias:true,textures:true,textureSize:512},
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
if(typeof module!=='undefined')module.exports={GRAPHICS_PROFILES,chooseGraphicsProfile,crowdVisible,GraphicsDetail};
