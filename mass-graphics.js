'use strict';
// Graphics detail levels shared by the 3D explorer and the game. Pure: tested in Node.
// "auto" picks Low on small or modest devices. Standard and High use local surface textures.
// Optional High-only providers can return a cleanup function for switching back down.

const GRAPHICS_KEY='massGraphics';
const GRAPHICS_PROFILES={
  low:{id:'low',name:'Low (fast, for small or older devices)',pixelRatio:1,shadows:false,shadowSize:512,crowd:.5,antialias:false,textures:false},
  standard:{id:'standard',name:'Standard (textured)',pixelRatio:2,shadows:true,shadowSize:1024,crowd:1,antialias:true,textures:true},
  high:{id:'high',name:'High (sharper textures and shadows)',pixelRatio:3,shadows:true,shadowSize:2048,crowd:1,antialias:true,textures:true}
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
