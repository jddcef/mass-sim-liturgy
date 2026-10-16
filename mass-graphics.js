'use strict';
// Graphics detail levels shared by the 3D explorer and the game. Pure: tested in Node.
// "auto" picks Low on small or modest devices. "High" reserves a hook for richer textures later:
// a texture pack can register with GraphicsDetail.addTextureProvider(fn) and is only called on High.

const GRAPHICS_KEY='massGraphics';
const GRAPHICS_PROFILES={
  low:{id:'low',name:'Low (fast, for small or older devices)',pixelRatio:1,shadows:false,shadowSize:512,crowd:.5,antialias:false,textures:false},
  standard:{id:'standard',name:'Standard',pixelRatio:2,shadows:true,shadowSize:1024,crowd:1,antialias:true,textures:false},
  high:{id:'high',name:'High (sharper; extra textures when installed)',pixelRatio:3,shadows:true,shadowSize:2048,crowd:1,antialias:true,textures:true}
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
  addTextureProvider(fn){this.providers.push(fn);},
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
