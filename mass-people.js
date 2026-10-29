'use strict';
// Procedural people for the 3D church: smooth skinned bodies whose shoulders, elbows, wrists, hips and
// knees really bend, with varied faces, hair and clothes, all generated from a seed at run time.
// No model files, no images and no network, so file:// keeps working. Each People level adds real
// CPU/GPU work (more triangles, more materials or more shadows):
//   Blocks   - flat cuboids, plain vertex lighting, no surface details or figure shadows.
//   Simple   - smooth low-poly bodies with bending joints and plain colours.
//   Natural  - faces, ears, thumbs, hair styles, collars, belts, cuffs and painted details.
//   Detailed - separate fingers, eyelids, locks of hair, beards, cloth folds and metallic gold trims.
//   Lifelike - skin, cloth and hair materials with fine surface relief, crowd shadows and breathing.
// By default the level follows the Detail setting (PEOPLE_FOR_DETAIL); the People menu can override it.

const PEOPLE_KEY='massPeople';
const PEOPLE_LEVELS={
  blocks:{id:'blocks',rank:-1,name:'Blocks (fastest, plain cuboids)',blocks:true,buckets:'one',idle:false,crowdShadows:false},
  simple:{id:'simple',rank:0,name:'Simple (low-poly)',around:8,torso:10,head:[10,8],along:1,hand:'mitten',features:0,buckets:'one',idle:false,crowdShadows:false},
  natural:{id:'natural',rank:1,name:'Natural (faces, hands, hair styles and clothes)',around:12,torso:16,head:[20,16],along:2,hand:'thumb',features:1,buckets:'one',idle:false,crowdShadows:false},
  detailed:{id:'detailed',rank:2,name:'Detailed (fingers, locks of hair, folds; more graphics work)',around:18,torso:24,head:[32,24],along:3,hand:'fingers',features:2,buckets:'gold',idle:false,crowdShadows:false},
  lifelike:{id:'lifelike',rank:3,name:'Lifelike (skin, cloth and hair materials, shadows, gentle movement; strong graphics card)',around:24,torso:32,head:[48,36],along:4,hand:'fingers',features:3,buckets:'all',idle:true,crowdShadows:true}
};
// People level used when the People menu is on Auto, keyed by the Detail level (mass-graphics.js).
const PEOPLE_FOR_DETAIL={low:'blocks',standard:'natural',high:'natural',ultra:'detailed',realistic:'lifelike',cinematic:'lifelike'};

function choosePeopleLevel(choice='auto',graphicsProfile){
  if(PEOPLE_LEVELS[choice])return PEOPLE_LEVELS[choice];
  const detail=typeof graphicsProfile==='string'?graphicsProfile:graphicsProfile?.id;
  return PEOPLE_LEVELS[PEOPLE_FOR_DETAIL[detail]]||PEOPLE_LEVELS.natural;
}

const PeopleDetail={
  storedChoice(){
    try{const value=typeof localStorage!=='undefined'&&localStorage.getItem(PEOPLE_KEY);return value&&(value==='auto'||PEOPLE_LEVELS[value])?value:'auto';}catch{return 'auto';}
  },
  store(choice){try{localStorage.setItem(PEOPLE_KEY,choice);}catch{}},
  level(choice=this.storedChoice(),graphicsProfile){return choosePeopleLevel(choice,graphicsProfile);}
};

// FNV-1a hash of any seed value, then mulberry32: the same seed always gives the same person.
function peopleSeed(value){
  const text=String(value??'');let hash=2166136261;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function peopleRandom(seed){
  let state=peopleSeed(seed);
  return()=>{
    state=(state+0x6D2B79F5)>>>0;let t=state;
    t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);
    return((t^t>>>14)>>>0)/4294967296;
  };
}

const PEOPLE_SKINS=['#f3d6c3','#ebc5a8','#e0b393','#d29f7c','#c08a64','#a87250','#8d5a3b','#6e4430','#523222'];
const PEOPLE_HAIR_COLOURS={black:'#1d1714',darkBrown:'#3a2618',brown:'#5b3b24',lightBrown:'#8a6440',blond:'#b8955a',
  auburn:'#7a3a22',red:'#9a4a2a',grey:'#9a958e',white:'#d8d4cc',darkGrey:'#5e5a56'};
const PEOPLE_EYES=['#3b2416','#5a3a22','#6b5a2e','#4f6b3a','#4a6f96','#6c7a82'];
const PEOPLE_HAIR_STYLES={
  male:['short','sidePart','buzz','curly','short','sidePart','afro'],
  female:['bob','long','ponytail','bun','pixie','curly','long','afro'],
  boy:['short','curly','buzz','sidePart'],girl:['ponytail','long','bob','pixie','curly'],
  clergy:['short','sidePart','buzz','short']
};
const PEOPLE_CLOTHES={
  suit:['#1f2a3a','#2b2b2e','#3a3f45','#4a3b2c','#1c1c1f','#5a5f66'],
  knit:['#7a2f2f','#2f4f6f','#5f6b3a','#8a7a5a','#3a5a4a','#6b4a6b','#b0a48a','#40465a'],
  shirt:['#f4f1ea','#dce6f0','#efe3d0','#e8d0d6','#cfd8c4','#f0e2b6','#c9d3e6'],
  dress:['#2f3f6f','#7a2a3a','#3f6b5a','#8a6a9a','#b0503a','#2a2a2a','#6a7f9a','#a08a5a'],
  trousers:['#2a2c33','#3a3a3e','#4a4f5a','#5a4a3a','#3a4a66','#7a6f5a'],
  tie:['#7a1f2a','#1f3a6a','#3a5a3a','#6a5a2a','#4a2a5a','#8a8a8a'],
  shoes:['#1a1614','#3a2416','#5a3a22','#2a2a30'],
  kids:['#c84a3a','#3a7ac8','#4aa05a','#e0b030','#8a5ac0','#f0f0f0','#3ab0b0'],
  frames:['#2a2622','#b8963c','#a8acb0','#5a3a22']
};
const PEOPLE_BUILDS=[
  {name:'slim',w:.92,d:.92,shoulder:1,belly:1,share:.25},
  {name:'average',w:1,d:1,shoulder:1,belly:1,share:.4},
  {name:'broad',w:1.02,d:1.02,shoulder:1.06,belly:1,share:.2},
  {name:'heavy',w:1.1,d:1.08,shoulder:1.03,belly:1.2,share:.15}
];

// Everyday clothes. `main` is the outer garment, which takes a role's colour (recolour).
function peopleOutfit(random,pick,sex,age,colour){
  const young=age==='child'||age==='youth';
  let kind;
  if(young)kind=sex==='female'?pick(['dress','tshirtSkirt','tshirtTrousers','blouseSkirt']):pick(['tshirtTrousers','tshirtShorts','shirtTrousers','sweater']);
  else if(sex==='male')kind=random()<.35?'suit':pick(['sweater','shirt','cardigan']);
  else kind=random()<.35?'dress':pick(['blouseSkirt','blouseTrousers','cardiganSkirt','suit']);
  const list=kind==='suit'?PEOPLE_CLOTHES.suit:kind==='dress'?PEOPLE_CLOTHES.dress:/sweater|cardigan/.test(kind)?PEOPLE_CLOTHES.knit
    :/^tshirt/.test(kind)?PEOPLE_CLOTHES.kids:PEOPLE_CLOTHES.shirt;
  const main=colour||pick(list);
  const skirt=/Skirt$/.test(kind)||kind==='suit'&&sex==='female'&&random()<.5;
  const second=skirt?pick(PEOPLE_CLOTHES.dress):pick(PEOPLE_CLOTHES.trousers);
  return {
    kind,main,second,skirt,
    shirt:kind==='cardigan'||kind==='sweater'||kind==='suit'||kind==='cardiganSkirt'?pick(PEOPLE_CLOTHES.shirt):main,
    tie:kind==='suit'&&sex==='male'&&random()<.75?pick(PEOPLE_CLOTHES.tie):'',
    shoes:pick(PEOPLE_CLOTHES.shoes),
    hem:kind==='dress'||skirt?(young?.42:.36+random()*.14):0,
    sleeves:/^tshirt/.test(kind)||kind==='dress'&&random()<.5||/^blouse/.test(kind)&&random()<.3?'short':'long'
  };
}

// A complete, JSON-safe description of one person. options: {seed, role, vest, colour, child, age, sex}.
// vest: 'chasuble' (Priest), 'dalmatic' (Deacon), 'alb' (servers), 'cassock', or 'lay'.
function peopleAppearance(options={}){
  const seed=peopleSeed(options.seed??0),random=peopleRandom(seed);
  const pick=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
  const role=options.role||'',vest=options.vest||'lay';
  const clergy=vest==='chasuble'||vest==='dalmatic'||role==='P'||role==='D';
  let age=options.age||(options.child?'child':role==='C1'||role==='C2'?'youth':'adult');
  const sex=options.sex||(clergy?'male':random()<.5?'female':'male');
  if(age==='adult'&&random()<(clergy?.3:.22))age='elder';
  const skinIndex=Math.min(PEOPLE_SKINS.length-1,Math.floor(random()*PEOPLE_SKINS.length));
  const dark=skinIndex>=5,H=PEOPLE_HAIR_COLOURS;
  let hairColour;
  if(age==='elder'&&random()<.8)hairColour=pick([H.grey,H.white,H.darkGrey,H.grey]);
  else if(dark)hairColour=random()<.7?H.black:H.darkBrown;
  else{
    const roll=random();
    hairColour=roll<.15?H.black:roll<.4?H.darkBrown:roll<.65?H.brown:roll<.8?H.lightBrown:roll<.92?H.blond:roll<.97?H.auburn:H.red;
  }
  const young=age==='child'||age==='youth';
  let style=clergy?pick(PEOPLE_HAIR_STYLES.clergy):young?pick(sex==='female'?PEOPLE_HAIR_STYLES.girl:PEOPLE_HAIR_STYLES.boy)
    :pick(PEOPLE_HAIR_STYLES[sex]);
  if(style==='afro'&&!dark)style=sex==='female'?'curly':'short';
  if(sex==='male'&&age==='elder'&&random()<.5)style='balding';
  const beard=sex==='male'&&!young&&random()<.2?pick(['full','goatee','moustache','stubble']):'';
  const glasses=!young&&random()<(age==='elder'?.4:.15)?pick(PEOPLE_CLOTHES.frames):'';
  let build=PEOPLE_BUILDS[1];
  if(!young){let roll=random();for(const b of PEOPLE_BUILDS){roll-=b.share;if(roll<0){build=b;break;}}}
  else if(random()<.4)build=PEOPLE_BUILDS[0];
  let outfit;
  if(vest==='chasuble'||vest==='dalmatic')outfit={kind:vest,main:options.colour||'#2e7d32',robe:'#f7f5ef',second:'#2a2a2e',shoes:'#1a1614'};
  else if(vest==='alb'||vest==='cassock')outfit={kind:vest,main:options.colour||(vest==='alb'?'#f4f2ea':'#1d1d22'),second:'#2a2a2e',shoes:pick(PEOPLE_CLOTHES.shoes)};
  else outfit=peopleOutfit(random,pick,sex,age,options.colour);
  return {
    seed,role,vest,sex,age,skin:PEOPLE_SKINS[skinIndex],dark,
    hair:{style,colour:hairColour},eyes:dark?pick(PEOPLE_EYES.slice(0,2)):pick(PEOPLE_EYES),
    beard,glasses,build:{name:build.name,w:build.w,d:build.d,shoulder:build.shoulder,belly:build.belly},
    outfit,joined:random()<.4,phase:random()*100
  };
}

const PeopleModels=(()=>{
  let THREE=typeof globalThis!=='undefined'?globalThis.THREE:undefined;
  let environment=null;
  const three=()=>THREE||(THREE=globalThis.THREE);
  const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const gauss=(d,s)=>Math.exp(-d*d/(2*s*s));
  const wrap=a=>{a%=2*Math.PI;return a>Math.PI?a-2*Math.PI:a<-Math.PI?a+2*Math.PI:a;};
  // Smooth (Catmull-Rom style Hermite) interpolation through table rows [y, value1, value2, ...].
  function curve(rows){
    const n=rows.length,m=rows[0].length;
    const tangents=rows.map((row,k)=>{
      const a=rows[Math.max(0,k-1)],b=rows[Math.min(n-1,k+1)];
      return row.map((_,c)=>c?(b[c]-a[c])/((b[0]-a[0])||1):0);
    });
    return(y,out=[])=>{
      if(y<=rows[0][0]){for(let c=1;c<m;c++)out[c-1]=rows[0][c];return out;}
      if(y>=rows[n-1][0]){for(let c=1;c<m;c++)out[c-1]=rows[n-1][c];return out;}
      let k=0;while(rows[k+1][0]<y)k++;
      const r0=rows[k],r1=rows[k+1],h=r1[0]-r0[0],t=(y-r0[0])/h,t2=t*t,t3=t2*t;
      const h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=3*t2-2*t3,h11=t3-t2;
      for(let c=1;c<m;c++)out[c-1]=h00*r0[c]+h10*h*tangents[k][c]+h01*r1[c]+h11*h*tangents[k+1][c];
      return out;
    };
  }

  // Colours are authored in sRGB and converted to linear, as the textured church surfaces are.
  const linear=new Map();
  function lin(hex){
    const key=typeof hex==='number'?hex:String(hex||'#808080');let c=linear.get(key);if(c)return c;
    const n=typeof hex==='number'?hex:parseInt(key.replace('#',''),16)||0;
    const f=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);};
    c=[f(n>>16&255),f(n>>8&255),f(n&255)];linear.set(key,c);return c;
  }
  const mixC=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  const scaleC=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
  // Material kinds of a vertex, and the material buckets each level merges them into.
  const SKIN=0,CLOTH=1,HAIR=2,GOLD=3;
  const BUCKET_NAMES={one:['main','main','main','main'],gold:['main','main','main','gold'],all:['skin','cloth','hair','gold']};
  const slot=(hex,kind=CLOTH,extra={})=>({c:Array.isArray(hex)?hex:lin(hex),kind,gloss:0,off:0,main:false,...extra});

  // Skeleton, in model space (metres, figure facing +z, its left = +x). Bind pose: arms hanging straight.
  const BONES=['hips','spine','chest','neck','head','clavL','armL','foreL','handL','fingL','clavR','armR','foreR','handR','fingR',
    'thighL','shinL','footL','thighR','shinR','footR'];
  const PARENT=[-1,0,1,2,3,2,5,6,7,8,2,10,11,12,13,0,15,16,0,18,19];
  const B=Object.fromEntries(BONES.map((name,i)=>[name,i]));
  const SIDE={1:{clav:5,arm:6,fore:7,hand:8,fing:9,thigh:15,shin:16,foot:17},[-1]:{clav:10,arm:11,fore:12,hand:13,fing:14,thigh:18,shin:19,foot:20}};
  function rig(app){
    const female=app.sex==='female',build=app.build||{};
    const sx=(female?.17:.185)*(build.shoulder||1)*Math.sqrt(build.w||1),hx=female?.095:.09;
    const P=[[0,.98,0],[0,1.1,0],[0,1.3,0],[0,1.5,0],[0,1.6,0]];
    for(const m of [1,-1]){
      const s=SIDE[m];
      P[s.clav]=[m*.025,1.47,0];P[s.arm]=[m*sx,1.465,0];P[s.fore]=[m*sx,1.165,0];P[s.hand]=[m*sx,.915,0];P[s.fing]=[m*sx,.81,0];
      P[s.thigh]=[m*hx,.93,0];P[s.shin]=[m*hx,.51,0];P[s.foot]=[m*hx,.08,0];
    }
    return {P,sx,hx,shoulderY:1.465,elbowY:1.165,wristY:.915,knuckleY:.81};
  }

  // One reusable vertex: a part function fills it for each grid point.
  const V={x:0,y:0,z:0,r:1,g:1,b:1,gloss:0,bucket:CLOTH,skip:false,u:0,v:0,main:0,n:0,hx:0,hy:0,hz:0,bones:new Uint8Array(8),weights:new Float32Array(8),
    reset(){this.x=this.y=this.z=0;this.r=this.g=this.b=1;this.gloss=0;this.bucket=CLOTH;this.skip=false;this.u=this.v=0;this.main=0;this.n=0;this.hx=this.hy=this.hz=0;},
    at(x,y,z){this.x=x;this.y=y;this.z=z;return this;},
    paint(s,k=1){k*=s.tone||1;const c=s.c;this.r=c[0]*k;this.g=c[1]*k;this.b=c[2]*k;this.bucket=s.kind;this.gloss=s.gloss||0;this.main=s.main?k:0;return this;},
    colour(c,kind,gloss=0){this.r=c[0];this.g=c[1];this.b=c[2];this.bucket=kind;this.gloss=gloss;this.main=0;return this;},
    bone(index,w){
      if(!(w>1e-4))return this;
      for(let i=0;i<this.n;i++)if(this.bones[i]===index){this.weights[i]+=w;return this;}
      if(this.n<8){this.bones[this.n]=index;this.weights[this.n++]=w;}
      return this;
    }
  };
  // Keeps the four strongest bones, as bytes that add up to exactly 255.
  function packSkin(SI,SW,o){
    let n=V.n;if(!n){V.bones[0]=B.hips;V.weights[0]=1;n=1;}
    const k=Math.min(4,n);
    for(let a=0;a<k;a++){
      let best=a;for(let b=a+1;b<n;b++)if(V.weights[b]>V.weights[best])best=b;
      if(best!==a){const bi=V.bones[a],bw=V.weights[a];V.bones[a]=V.bones[best];V.weights[a]=V.weights[best];V.bones[best]=bi;V.weights[best]=bw;}
    }
    let sum=0;for(let a=0;a<k;a++)sum+=V.weights[a];
    let total=0;
    for(let a=0;a<4;a++){
      if(a<k){const q=Math.round(V.weights[a]/sum*255);SI[o+a]=V.bones[a];SW[o+a]=q;total+=q;}else{SI[o+a]=0;SW[o+a]=0;}
    }
    SW[o]+=255-total;
  }

  const BLOCK_FACES=[
    [[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],
    [[-1,0,0],[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],
    [[0,1,0],[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],
    [[0,-1,0],[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],
    [[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
    [[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]]
  ];
  // Collects triangles per mesh key 'region|layer|bucket'.
  class Build{
    constructor(level){
      this.level=level;this.uv=level.buckets==='all';this.names=BUCKET_NAMES[level.buckets]||BUCKET_NAMES.one;
      this.out=new Map();this.key='body|base';this.triangles=0;
    }
    target(kind){
      const key=this.key+'|'+this.names[kind];let o=this.out.get(key);
      if(!o){o={key,pos:[],nrm:[],col:[],si:[],sw:[],gl:[],uv:[],idx:[],main:[],shade:[],count:0};this.out.set(key,o);}
      return o;
    }
    block(centre,size,paint,bone){
      const o=this.target(paint.kind);
      for(const [normal,corners] of BLOCK_FACES){
        const start=o.count;
        for(const corner of corners){
          const index=o.count++;
          o.pos.push(...centre.map((v,k)=>v+corner[k]*size[k]/2));
          o.nrm.push(...normal.map(v=>v*127));
          o.col.push(...paint.c.map(v=>Math.round(clamp(v,0,1)*65535)));
          o.si.push(bone,0,0,0);o.sw.push(255,0,0,0);o.gl.push(0);
          if(paint.main){o.main.push(index);o.shade.push(1);}
        }
        o.idx.push(start,start+1,start+2,start,start+2,start+3);
      }
      this.triangles+=12;
    }
    // rows x cols quads; fn(V, s, t, i, j) with s=i/rows, t=j/cols. Closed grids repeat column 0 at t=1.
    // Normals: area-weighted, averaged across the seam, poles and zero-height colour borders; facing
    // outwards from each ring's centre unless opt.flip says otherwise.
    grid(rows,cols,fn,opt={}){
      const closed=opt.closed!==false,R=rows+1,C=cols+1,N=R*C;
      const P=new Float64Array(N*3),Nm=new Float64Array(N*3),K=new Float32Array(N*3),G=new Float32Array(N),BK=new Uint8Array(N);
      const SK=new Uint8Array(N),M=new Float32Array(N),SI=new Uint8Array(N*4),SW=new Uint8Array(N*4),UV=this.uv?new Float32Array(N*2):null;
      const H=opt.hint?new Float32Array(N*3):null;
      for(let i=0;i<R;i++)for(let j=0;j<C;j++){
        const n=i*C+j;V.reset();fn(V,i/rows,j/cols,i,j);
        P[n*3]=V.x;P[n*3+1]=V.y;P[n*3+2]=V.z;K[n*3]=V.r;K[n*3+1]=V.g;K[n*3+2]=V.b;
        G[n]=V.gloss;BK[n]=V.bucket;SK[n]=V.skip?1:0;M[n]=V.main;
        if(UV){UV[n*2]=V.u;UV[n*2+1]=V.v;}
        if(H){H[n*3]=V.hx;H[n*3+1]=V.hy;H[n*3+2]=V.hz;}
        packSkin(SI,SW,n*4);
      }
      const face=(a,b,c,add)=>{
        const ax=P[a*3],ay=P[a*3+1],az=P[a*3+2];
        const ux=P[b*3]-ax,uy=P[b*3+1]-ay,uz=P[b*3+2]-az,vx=P[c*3]-ax,vy=P[c*3+1]-ay,vz=P[c*3+2]-az;
        const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
        if(add){
          Nm[a*3]+=nx;Nm[a*3+1]+=ny;Nm[a*3+2]+=nz;Nm[b*3]+=nx;Nm[b*3+1]+=ny;Nm[b*3+2]+=nz;Nm[c*3]+=nx;Nm[c*3+1]+=ny;Nm[c*3+2]+=nz;
        }
        return nx*nx+ny*ny+nz*nz;
      };
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*C+j,b=a+C;face(a,b,b+1,true);face(a,b+1,a+1,true);}
      const join=(a,b)=>{for(let k=0;k<3;k++){const s=Nm[a*3+k]+Nm[b*3+k];Nm[a*3+k]=s;Nm[b*3+k]=s;}};
      const same=(a,b)=>Math.abs(P[a*3]-P[b*3])<1e-7&&Math.abs(P[a*3+1]-P[b*3+1])<1e-7&&Math.abs(P[a*3+2]-P[b*3+2])<1e-7;
      if(closed)for(let i=0;i<R;i++)join(i*C,i*C+cols);
      for(let i=0;i<R;i++){
        let pole=true;for(let j=1;j<C&&pole;j++)pole=same(i*C,i*C+j);
        if(!pole)continue;
        let x=0,y=0,z=0;for(let j=0;j<C;j++){const n=i*C+j;x+=Nm[n*3];y+=Nm[n*3+1];z+=Nm[n*3+2];}
        for(let j=0;j<C;j++){const n=i*C+j;Nm[n*3]=x;Nm[n*3+1]=y;Nm[n*3+2]=z;}
      }
      for(let i=0;i<rows;i++){
        let border=true;for(let j=0;j<C&&border;j++)border=same(i*C+j,(i+1)*C+j);
        if(border)for(let j=0;j<C;j++)join(i*C+j,(i+1)*C+j);
      }
      let flip=opt.flip;
      if(flip===undefined&&H){
        let sum=0;for(let n=0;n<N;n++)sum+=Nm[n*3]*H[n*3]+Nm[n*3+1]*H[n*3+1]+Nm[n*3+2]*H[n*3+2];
        flip=sum<0;
      }
      if(flip===undefined){
        let sum=0;const centre=opt.centre;
        for(let i=0;i<R;i++){
          let cx=0,cy=0,cz=0;
          if(centre)[cx,cy,cz]=centre;
          else{for(let j=0;j<C;j++){const n=i*C+j;cx+=P[n*3];cy+=P[n*3+1];cz+=P[n*3+2];}cx/=C;cy/=C;cz/=C;}
          for(let j=0;j<C;j++){const n=i*C+j;sum+=Nm[n*3]*(P[n*3]-cx)+Nm[n*3+1]*(P[n*3+1]-cy)+Nm[n*3+2]*(P[n*3+2]-cz);}
        }
        flip=sum<0;
      }
      const remap=new Int32Array(N*4).fill(-1),targets=[null,null,null,null];
      const emit=(o,kind,n)=>{
        const key=kind*N+n;let index=remap[key];if(index>=0)return index;
        index=o.count++;remap[key]=index;
        o.pos.push(P[n*3],P[n*3+1],P[n*3+2]);
        const nx=Nm[n*3],ny=Nm[n*3+1],nz=Nm[n*3+2],s=(flip?-127:127)/(Math.hypot(nx,ny,nz)||1);
        o.nrm.push(Math.round(nx*s),Math.round(ny*s),Math.round(nz*s));
        o.col.push(Math.round(clamp(K[n*3],0,1)*65535),Math.round(clamp(K[n*3+1],0,1)*65535),Math.round(clamp(K[n*3+2],0,1)*65535));
        o.si.push(SI[n*4],SI[n*4+1],SI[n*4+2],SI[n*4+3]);o.sw.push(SW[n*4],SW[n*4+1],SW[n*4+2],SW[n*4+3]);
        o.gl.push(Math.round(clamp(G[n],0,1)*255));
        if(UV)o.uv.push(UV[n*2],UV[n*2+1]);
        if(M[n]>0){o.main.push(index);o.shade.push(M[n]);}
        return index;
      };
      const triangle=(a,b,c)=>{
        if(SK[a]&&SK[b]&&SK[c])return;
        if(face(a,b,c,false)<1e-16)return;
        const kind=BK[a],o=targets[kind]||(targets[kind]=this.target(kind));
        if(flip)o.idx.push(emit(o,kind,a),emit(o,kind,c),emit(o,kind,b));
        else o.idx.push(emit(o,kind,a),emit(o,kind,b),emit(o,kind,c));
        this.triangles++;
      };
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*C+j,b=a+C;triangle(a,b,b+1);triangle(a,b+1,a+1);}
    }
  }

  // Collected parts -> BufferGeometries, one per region|layer|bucket, with the vertices that take the main colour.
  function finish(build){
    const T=three(),parts=[];
    for(const o of build.out.values()){
      if(!o.idx.length)continue;
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.BufferAttribute(new Float32Array(o.pos),3));
      g.setAttribute('normal',new T.BufferAttribute(new Int8Array(o.nrm),3,true));
      g.setAttribute('color',new T.BufferAttribute(new Uint16Array(o.col),3,true));
      g.setAttribute('skinIndex',new T.BufferAttribute(new Uint8Array(o.si),4));
      g.setAttribute('skinWeight',new T.BufferAttribute(new Uint8Array(o.sw),4,true));
      if(build.level.rank>0)g.setAttribute('gloss',new T.BufferAttribute(new Uint8Array(o.gl),1,true));
      if(build.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(o.uv),2));
      g.setIndex(new T.BufferAttribute(o.count>65535?new Uint32Array(o.idx):new Uint16Array(o.idx),1));
      const [region,layer,bucket]=o.key.split('|');
      parts.push({region,layer,bucket,geometry:g,main:Uint32Array.from(o.main),shade:Float32Array.from(o.shade)});
    }
    return parts;
  }

  function makeBones(info){
    const T=three(),bones=BONES.map(name=>{const bone=new T.Bone();bone.name=name;return bone;});
    const rest=BONES.map((_,i)=>{const p=info.P[i],q=PARENT[i]<0?[0,0,0]:info.P[PARENT[i]];return [p[0]-q[0],p[1]-q[1],p[2]-q[2]];});
    bones.forEach((bone,i)=>{bone.position.fromArray(rest[i]);if(PARENT[i]>=0)bones[PARENT[i]].add(bone);});
    const skeleton=new T.Skeleton(bones,info.P.map(p=>new T.Matrix4().makeTranslation(-p[0],-p[1],-p[2])));
    return {bones,skeleton,rest};
  }

  // Body cross-sections: y, half-width, front depth, back depth (metres, before the figure's scale).
  const MALE=curve([[.8,.135,.095,.105],[.86,.165,.11,.13],[.93,.17,.11,.125],[1,.16,.105,.11],[1.06,.148,.1,.1],[1.14,.15,.108,.105],
    [1.22,.158,.118,.112],[1.3,.165,.122,.115],[1.37,.17,.118,.115],[1.42,.172,.105,.11],[1.46,.165,.09,.095],[1.49,.142,.074,.084],
    [1.515,.105,.064,.07],[1.54,.07,.058,.06],[1.57,.06,.055,.057],[1.63,.057,.053,.056],[1.7,.055,.05,.054]]);
  const FEMALE=curve([[.8,.14,.1,.115],[.86,.172,.112,.135],[.93,.178,.11,.13],[1,.162,.1,.112],[1.06,.13,.092,.095],[1.14,.136,.1,.1],
    [1.22,.146,.108,.104],[1.3,.152,.11,.106],[1.37,.156,.104,.104],[1.42,.158,.094,.1],[1.46,.15,.082,.088],[1.49,.13,.068,.078],
    [1.515,.095,.06,.066],[1.54,.064,.054,.056],[1.57,.055,.051,.053],[1.63,.053,.05,.052],[1.7,.052,.047,.05]]);
  // Returns (theta, y, offset) -> point on the body (theta 0 = front, +pi/2 = the figure's left) and its outward direction.
  function bodyShape(app){
    const table=app.sex==='female'?FEMALE:MALE,build=app.build||{},w=build.w||1,d=build.d||1;
    const broad=(build.shoulder||1)-1,belly=(build.belly||1)-1,row=[],out={x:0,z:0,nx:0,nz:1};
    const bust=app.sex!=='female'||app.age==='child'?0:app.age==='youth'?.024:.038;
    return(theta,y,off=0)=>{
      table(clamp(y,.8,1.7),row);
      const close=y<.8?Math.sqrt(clamp((y-.77)/.03,0,1)):y>1.7?Math.sqrt(clamp((1.72-y)/.02,0,1)):1;
      const a=row[0]*w*(1+broad*smooth(1.28,1.4,y)*smooth(1.53,1.46,y))*close;
      const s=Math.sin(theta),c=Math.cos(theta),depth=(c>=0?row[1]*(1+belly*gauss(y-1.08,.1)):row[2])*d*close;
      let nx=s*depth,nz=c*a;const l=Math.hypot(nx,nz);
      if(l>1e-9){nx/=l;nz/=l;}else{nx=s;nz=c;}
      let x=a*s,z=depth*c;
      if(bust&&c>0){const g=bust*(gauss(x-.078,.045)+gauss(x+.078,.045))*gauss(y-1.27,.055)*c;x+=nx*g;z+=nz*g;}
      off*=close;out.x=x+nx*off;out.z=z+nz*off;out.nx=nx;out.nz=nz;
      return out;
    };
  }
  const aroundTheta=(t,k=.35)=>2*Math.PI*t-k*Math.sin(2*Math.PI*t);

  // Torso skinning: thighs carry the lap, then hips, spine, chest, neck and head up the body; the clavicles lift the shoulders.
  function torsoWeights(V,x,y){
    const sL=smooth(-.06,.06,x),low=.6*smooth(.92,.77,y);
    V.bone(B.thighL,low*sL).bone(B.thighR,low*(1-sL));
    const rest=1-low,spine=smooth(.97,1.12,y),chest=smooth(1.18,1.36,y),neck=smooth(1.5,1.58,y),head=smooth(1.64,1.71,y);
    const clav=.45*smooth(.09,.16,Math.abs(x))*gauss(y-1.45,.045)*(chest-neck);
    V.bone(B.hips,rest*(1-spine)).bone(B.spine,rest*(spine-chest)).bone(B.chest,rest*(chest-neck-clav))
      .bone(x>=0?B.clavL:B.clavR,rest*clav).bone(B.neck,rest*(neck-head)).bone(B.head,rest*head);
  }

  // The torso and neck as one loft from the crotch (pole at y .77) to inside the head (pole at y 1.72).
  // bands, bottom to top: {to: y or fn(theta), slot}. Each border repeats its row, so colours stay crisp.
  function torso(ctx,bands){
    const {b,shape}=ctx,level=b.level,step=.14/(level.along+.5),rows=[];
    let from=()=>.77;
    bands.forEach((band,k)=>{
      const to=typeof band.to==='function'?band.to:(()=>band.to),start=from;
      const cap=k===0?'bottom':k===bands.length-1?'top':'';
      let span=0;for(const th of [0,1.2,Math.PI/2,2.2,Math.PI])span=Math.max(span,Math.abs(to(th)-start(th)));
      const n=Math.max(cap?level.along+1:1,Math.round(span/step));
      for(let i=0;i<=n;i++)rows.push({from:start,to,s:i/n,cap,slot:band.slot});
      from=to;
    });
    b.grid(rows.length-1,level.torso,(V,_,t,i)=>{
      const r=rows[i],theta=aroundTheta(t),e=r.cap==='bottom'?r.s*r.s:r.cap==='top'?1-(1-r.s)*(1-r.s):r.s;
      const y=lerp(r.from(theta),r.to(theta),e),p=shape(theta,y,r.slot.off);
      V.at(p.x,y,p.z).paint(r.slot,r.slot.shade?r.slot.shade(theta,y,p.x):1);
      if(b.uv){V.u=theta*.16;V.v=y;}
      torsoWeights(V,p.x,y);
    });
  }

  // A thin raised patch on a surface: surf(u 0..1 across, s 0..1 along) -> {x,y,z,nx,ny,nz}; the edges step down to the surface.
  // paint(V, u, s, p) and weights(V, p) see the surface point p.
  function patch(ctx,rows,cols,surf,paint,weights,lift=.004){
    ctx.b.grid(rows,cols+2,(V,s,_,i,j)=>{
      const edge=j===0||j===cols+2,u=clamp((j-1)/cols,0,1),p=surf(u,s),h=edge?0:lift;
      V.at(p.x+p.nx*h,p.y+(p.ny||0)*h,p.z+p.nz*h);V.hx=p.nx;V.hy=p.ny||0;V.hz=p.nz;
      paint(V,u,s,p);weights(V,p);
    },{closed:false,hint:true});
  }

  // Legs below a garment: hips and thighs carry the cloth down to the knees, the shins below.
  function lapWeights(V,x,y){
    if(y>=.93){torsoWeights(V,x,y);return;}
    const sL=smooth(-.04,.04,x),leg=smooth(.93,.75,y),shin=smooth(.58,.45,y);
    V.bone(B.hips,1-leg).bone(B.thighL,leg*(1-shin)*sL).bone(B.thighR,leg*(1-shin)*(1-sL))
      .bone(B.shinL,leg*shin*sL).bone(B.shinR,leg*shin*(1-sL));
  }

  // Robes, dresses and skirts: a tube from inside the waist to the hem, folded in and up at the hem.
  // spec: {top, hem, a, b (hem half-width, half-depth), off, slot, floor(theta,y) optional minimum radius,
  // fold (fold depth factor, default 1), weights(V,x,y,theta) optional}. skirtPoint gives the smooth surface without folds, so trims and outer
  // garments can follow it.
  function skirtPoint(ctx,spec,theta,y,out={x:0,z:0,r:0,u:0}){
    const s=Math.sin(theta),c=Math.cos(theta),u=clamp((spec.top-y)/(spec.top-spec.hem),0,1),f=Math.pow(u,1.25);
    const top=ctx.shape(theta,spec.top,spec.off),tx=top.x,tz=top.z,body=ctx.shape(theta,clamp(y,.88,spec.top),spec.off);
    let x=lerp(tx,spec.a*s,f),z=lerp(tz,spec.b*c,f),r=Math.hypot(x,z)||1e-6;
    let floor=Math.hypot(body.x,body.z);if(spec.floor)floor=Math.max(floor,spec.floor(theta,y));
    if(r<floor){x*=floor/r;z*=floor/r;r=floor;}
    out.x=x;out.z=z;out.r=r;out.u=u;return out;
  }
  const foldDepth=(level,u)=>.03*level.features/3*Math.pow(u,1.3);
  const foldWave=(k,theta,phase)=>k?Math.sin(k*theta+phase+Math.sin(2*theta+phase)):0;
  function skirt(ctx,spec){
    const {b,app}=ctx,level=b.level,k=[0,6,10,14][level.features]||0,cols=Math.max(level.torso,4*k);
    const n=Math.max(2,Math.round((spec.top-spec.hem)/(.14/(level.along+.5)))),phase=(app.seed%997)/97;
    const band=Math.min(.1,(spec.top-spec.hem)*.4),p={x:0,z:0,r:0,u:0};
    b.grid(n+3,cols,(V,_,t,i)=>{
      const theta=aroundTheta(t,.2);
      let y,inset=0;
      if(i===0){y=spec.top;inset=.015;}
      else if(i<=n+1)y=lerp(spec.top,spec.hem,(i-1)/n);
      else{y=spec.hem;inset=.008;}
      skirtPoint(ctx,spec,theta,y,p);
      if(i===n+3)y+=band;
      const u=p.u,wave=foldWave(k,theta,phase),fk=spec.fold??1,fold=foldDepth(level,u)*fk*(.5+.5*wave),scale=(p.r+fold-inset)/p.r;
      V.at(p.x*scale,y,p.z*scale).paint(spec.slot,(i>n+1?.55:1)*(1-.28*u*fk*level.features/3*(.5-.5*wave)));
      if(b.uv){V.u=theta*.2;V.v=y;}
      if(spec.weights)spec.weights(V,p.x*scale,y,theta);else lapWeights(V,p.x*scale,y);
    });
    return {k,phase};
  }

  // Legs (y 1.0 to the ankle): y, half-width, front depth, back depth. The top sits inside the hips.
  const LEG=[[1,0,0,0],[.985,.04,.045,.045],[.95,.062,.07,.075],[.9,.068,.08,.085],[.86,.074,.08,.086],[.82,.078,.078,.084],
    [.72,.07,.068,.074],[.62,.06,.057,.06],[.56,.052,.05,.052],[.51,.048,.05,.048],[.47,.049,.046,.054],[.4,.053,.045,.062],
    [.33,.049,.042,.056],[.25,.042,.038,.044],[.17,.036,.034,.037],[.11,.033,.033,.035],[.085,.032,.032,.034],[.06,0,0,0]];
  const LEG_SHAPE=curve(LEG.slice(1,-1).reverse());
  // spec: {slot (above `end`, or the whole leg), off, end (y where the cloth ends, 0 = none), hem (trouser hem folded
  // inside, the leg below is hidden by the shoe), straight (trousers fall straight below the knee), top (y of the top pole)}.
  function legs(ctx,spec){
    const {b,rig,S}=ctx,level=b.level,top=spec.top??1,end=spec.end||0,off=spec.off||0,ys=[],rows=[];
    let prev=null;
    for(const row of LEG){
      const y=row[0];if(y>top+1e-6)continue;
      if(prev!==null)for(let q=1;q<level.along;q++)ys.push(lerp(prev,y,q/level.along));
      ys.push(y);prev=y;
    }
    if(ys[0]<top-1e-6)ys.unshift(top);
    for(let k=0;k<ys.length;k++){
      const y=ys[k];
      if(end&&k&&ys[k-1]>end&&y<=end){
        if(spec.hem){rows.push({y:end,cloth:1,off},{y:end,cloth:1,off:off-.01},{y:end+.03,cloth:1,off:off-.012});break;}
        rows.push({y:end,cloth:1,off},{y:end,cloth:1,off:0},{y:end,cloth:0,off:0});
      }
      const cloth=!end||y>end?1:0;
      rows.push({y,cloth,off:cloth?off:0,pole:k===0||y<=.06+1e-9});
    }
    const row=[];
    for(const m of [1,-1]){
      const side=SIDE[m];
      b.grid(rows.length-1,level.around,(V,_,t,i)=>{
        const r=rows[i],theta=aroundTheta(t,.15),s=Math.sin(theta),c=Math.cos(theta);
        let rx=0,rz=0;
        if(!r.pole){
          LEG_SHAPE(r.y,row);rx=row[0]+r.off;rz=(c>=0?row[1]:row[2])+r.off;
          if(r.cloth&&spec.straight&&r.y<.56){const d=off-r.off;rx=Math.max(rx,.062-d);rz=Math.max(rz,(c>=0?.062:.072)-d);}
        }
        V.at(m*(rig.hx+rx*s),r.y,rz*c).paint(r.cloth?spec.slot:S.skin);
        if(b.uv){V.u=theta*.06;V.v=r.y;}
        const hips=.7*smooth(.9,1,r.y),shin=smooth(.55,.47,r.y),foot=smooth(.12,.07,r.y);
        V.bone(B.hips,hips).bone(side.thigh,(1-hips)*(1-shin)).bone(side.shin,(1-hips)*shin*(1-foot)).bone(side.foot,(1-hips)*shin*foot);
      });
    }
  }

  // Shoes: a loft from heel to toe with a flat sole, toes turned slightly out. Sections: z, half-width, height.
  const SHOE=[[-.07,0,.035],[-.06,.03,.066],[-.035,.038,.074],[.02,.043,.07],[.07,.046,.06],[.13,.05,.045],[.175,.044,.034],[.2,.032,.024],[.215,0,.014]];
  function shoes(ctx){
    const {b,rig,S}=ctx,level=b.level,sole=slot('#1a1410',CLOTH,{gloss:.15});
    for(const m of [1,-1]){
      const side=SIDE[m],turn=m*.12,cs=Math.cos(turn),sn=Math.sin(turn);
      b.grid(SHOE.length-1,Math.max(8,level.around),(V,_,t,i)=>{
        const [z,w,h]=SHOE[i],phi=2*Math.PI*t,sp=Math.sin(phi),cp=Math.cos(phi);
        const x=w*Math.sign(sp)*Math.pow(Math.abs(sp),.8);
        const y=w?(cp>=0?h/2*(1-Math.pow(cp,.35)):h/2*(1-cp)):h;
        V.at(m*rig.hx+x*cs+z*sn,y,-x*sn+z*cs).paint(y<.012&&level.rank?sole:S.shoe);
        if(b.uv){V.u=phi*.04;V.v=z;}
        const shin=.35*smooth(.05,.08,y)*smooth(.05,-.02,z);
        V.bone(side.foot,1-shin).bone(side.shin,shin);
      });
    }
  }

  // A round tube through points [x,y,z] (model space), with optional rounded caps. radius: a number, an array (one per
  // point) or fn(s, i) with s the arc length 0..1. paint(V, s, i, dir) and weights(V, s, i) run for every vertex; dir is
  // the unit offset from the centre line. opt: {caps, loop (the last point repeats the first), up (preferred first normal)}.
  function tube(ctx,pts,radius,cols,paint,weights,opt={}){
    const n=pts.length,loop=!!opt.loop,len=[0],T=[],N=[],D=[];
    for(let i=1;i<n;i++){const p=pts[i],q=pts[i-1];len.push(len[i-1]+Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]));}
    const total=len[n-1]||1;
    const R=i=>typeof radius==='number'?radius:Array.isArray(radius)?radius[i]:radius(len[i]/total,i);
    const perp=(u,t)=>{
      const k=u[0]*t[0]+u[1]*t[1]+u[2]*t[2],x=u[0]-k*t[0],y=u[1]-k*t[1],z=u[2]-k*t[2],l=Math.hypot(x,y,z);
      return l>1e-6?[x/l,y/l,z/l]:null;
    };
    for(let i=0;i<n;i++){
      const a=pts[loop&&i===0?n-2:Math.max(0,i-1)],c=pts[loop&&i===n-1?1:Math.min(n-1,i+1)];
      const x=c[0]-a[0],y=c[1]-a[1],z=c[2]-a[2],l=Math.hypot(x,y,z)||1,t=[x/l,y/l,z/l];T.push(t);
      const nn=perp(i?N[i-1]:opt.up||[0,0,1],t)||perp([0,1,0],t)||perp([1,0,0],t)||[1,0,0];N.push(nn);
      D.push([t[1]*nn[2]-t[2]*nn[1],t[2]*nn[0]-t[0]*nn[2],t[0]*nn[1]-t[1]*nn[0]]);
    }
    if(loop){N[n-1]=N[0];D[n-1]=D[0];}
    const rows=[],ring=(i,k,r)=>{const p=pts[i],t=T[i];return {c:[p[0]+t[0]*k,p[1]+t[1]*k,p[2]+t[2]*k],i,r,s:len[i]/total};};
    if(opt.caps){const r=R(0);rows.push(ring(0,-.9*r,0),ring(0,-.55*r,.84*r));}
    for(let i=0;i<n;i++)rows.push(ring(i,0,R(i)));
    if(opt.caps){const r=R(n-1);rows.push(ring(n-1,.55*r,.84*r),ring(n-1,.9*r,0));}
    const dir=[0,0,0];
    ctx.b.grid(rows.length-1,cols,(V,_,t,k)=>{
      const row=rows[k],q=2*Math.PI*t,cq=Math.cos(q),sq=Math.sin(q),nn=N[row.i],bb=D[row.i];
      for(let e=0;e<3;e++)dir[e]=nn[e]*cq+bb[e]*sq;
      V.at(row.c[0]+dir[0]*row.r,row.c[1]+dir[1]*row.r,row.c[2]+dir[2]*row.r);
      paint(V,row.s,row.i,dir);
      if(ctx.b.uv){V.u=t;V.v=row.s*total;}
      weights(V,row.s,row.i);
    });
  }

  // Arms hang from the shoulder joint (y 1.465) to inside the hand. Stations: drop below the shoulder, half-width (x),
  // half-depth (z) and the lowest level rank that uses the row. The forearm swells below the elbow and flattens to the wrist.
  const ARM=[[.03,0,0,0],[.02,.035,.038,1],[.01,.046,.05,0],[0,.051,.055,1],[-.06,.047,.05,0],[-.14,.042,.047,1],[-.22,.039,.042,0],
    [-.28,.036,.038,1],[-.3,.035,.037,0],[-.33,.04,.04,1],[-.4,.039,.037,0],[-.47,.034,.032,1],[-.52,.026,.029,0],[-.55,.019,.028,1],
    [-.57,.017,.026,0],[-.585,0,0,0]];
  const ARM_SHAPE=curve(ARM.slice(1,-1).map(row=>row.slice(0,3)).reverse());
  // sleeves, from the shoulder down: [{to: y, slot, off, loose (smallest half-width of the cloth)}]; bare skin below the last.
  // Each sleeve end steps in to the next layer and then changes colour, so cuffs and hems read as real edges.
  function arms(ctx,sleeves=[]){
    const {b,rig,S,app}=ctx,level=b.level,top=rig.shoulderY,build=app.build||{};
    const scale=(app.sex==='female'?.9:1)*(1+((build.w||1)-1)*.8),ys=[],rows=[],row=[];
    let prev=null;
    for(const st of ARM){
      if(st[3]>level.rank)continue;
      if(prev!==null&&prev-st[0]>.05)for(let q=1;q<level.along;q++)ys.push(lerp(prev,st[0],q/level.along));
      ys.push(st[0]);prev=st[0];
    }
    const segs=sleeves.filter(s=>s.to<top).map(s=>({to:s.to-top,slot:s.slot,off:s.off||0,loose:s.loose??.03}))
      .concat({to:-Infinity,slot:S.skin,off:0,skin:true});
    let seg=0;
    ys.forEach((dy,i)=>{
      let at=0;while(dy<segs[at].to)at++;
      for(;seg<at;seg++){const y=segs[seg].to;rows.push({dy:y,paint:seg,shape:seg},{dy:y,paint:seg,shape:seg+1},{dy:y,paint:seg+1,shape:seg+1});}
      rows.push({dy,paint:at,shape:at,pole:i===0||i===ys.length-1});
    });
    const crease=level.features>=2;
    for(const m of [1,-1]){
      const side=SIDE[m],x0=m*rig.sx;
      b.grid(rows.length-1,level.around,(V,_,t,i)=>{
        const r=rows[i],theta=2*Math.PI*t,s=Math.sin(theta),c=Math.cos(theta),sg=segs[r.shape];
        let dy=r.dy,rx=0,rz=0;
        if(r.pole){if(i===0)dy+=sg.off*.6;}
        else{
          ARM_SHAPE(dy,row);rx=row[0]*scale;rz=row[1]*scale;
          if(!sg.skin){rx=Math.max(rx,sg.loose)+sg.off;rz=Math.max(rz,sg.loose+.002)+sg.off;}
        }
        const paint=segs[r.paint];
        V.at(x0+m*rx*s,top+dy,rz*c).paint(paint.slot,crease&&!paint.skin?1-.18*gauss(dy+.31,.025)*smooth(.2,.9,c):1);
        if(b.uv){V.u=theta*.05;V.v=top+dy;}
        const cl=.5*smooth(-.02,.05,dy),f=smooth(-.26,-.34,dy),h=.5*smooth(-.49,-.55,dy);
        V.bone(side.clav,cl).bone(side.arm,(1-cl)*(1-f)).bone(side.fore,(1-cl)*f*(1-h)).bone(side.hand,(1-cl)*f*h);
      });
    }
  }

  // Hands, in a frame along the hand: a down from the wrist, w across (+z, the thumb side as the arm hangs), d through
  // the hand (+ is the back of the hand, facing outwards). Rows: a, half-width, half-thickness. Simple has a mitten,
  // Natural adds a thumb, Detailed and Lifelike have a palm with four fingers (Lifelike adds nails).
  const MITTEN=[[-.012,0,0],[0,.028,.019],[.05,.04,.018],[.105,.043,.015],[.16,.038,.011],[.178,.03,.0095],[.19,0,0]];
  const PALM=[[-.012,0,0],[0,.028,.019],[.05,.04,.018],[.105,.043,.015],[.118,.036,.012],[.125,0,0]];
  const FINGERS=[[.03,.075],[.01,.085],[-.01,.08],[-.03,.062]];
  function hands(ctx){
    const {b,rig,S,app}=ctx,level=b.level,rank=level.rank,cols=[8,12,12,16][rank],table=rank>=2?PALM:MITTEN;
    const shape=curve(table.slice(1,-1)),split=Math.min(level.along,3),rows=[];
    table.forEach((row,i)=>{
      rows.push(row);
      if(i>0&&i<table.length-2)for(let q=1;q<split;q++){const a=lerp(row[0],table[i+1][0],q/split);rows.push([a,...shape(a)]);}
    });
    const skin=S.skin.c,palm=mixC(skin,lin('#eab8a2'),app.dark?.45:.15),nail=mixC(skin,lin('#f7ded6'),.6);
    // back: how much the surface faces the back of the hand (1) or the palm (-1).
    const tint=(V,back)=>{if(rank)V.colour(mixC(skin,palm,smooth(.1,-.6,back)),SKIN);else V.paint(S.skin);};
    const weigh=(V,side,finger)=>{
      const a=rig.wristY-V.y,hw=lerp(.5,1,smooth(-.012,.04,a)),wf=finger?smooth(.09,.125,a):0;
      V.bone(side.fore,1-hw).bone(side.hand,hw*(1-wf)).bone(side.fing,hw*wf);
    };
    const tipCols=rank>=3?8:6,along=rank>=3?[0,.35,.65,.82,1]:[0,.4,.75,1];
    for(const m of [1,-1]){
      const side=SIDE[m],at=(a,w,d)=>[m*(rig.sx+d),rig.wristY-a,w];
      b.grid(rows.length-1,cols,(V,_,t,i)=>{
        const [a,W,D]=rows[i],phi=2*Math.PI*t,s=Math.sin(phi),c=Math.cos(phi);
        const p=at(a,W*Math.sign(s)*Math.pow(Math.abs(s),.8),D*Math.sign(c)*Math.pow(Math.abs(c),.8));
        V.at(p[0],p[1],p[2]);tint(V,c);
        if(b.uv){V.u=t*.15;V.v=a;}
        weigh(V,side,true);
      });
      if(rank>=1){
        // The thumb leaves the palm forwards, downwards and towards the palm side.
        const pts=[],n=rank+2,dir=[.7625,.4575,-.4575];
        for(let q=0;q<n;q++){const s=q/(n-1),l=.065*s;pts.push(at(.02+dir[0]*l,.03+dir[1]*l,-.008+dir[2]*l-.004*s*s));}
        tube(ctx,pts,s=>lerp(.011,.009,s),tipCols,(V,s,_,d)=>{
          const back=(d[0]*m+d[2])*.7071;
          if(rank>=3&&s>.75&&back>.55)V.colour(nail,SKIN,.7);else tint(V,back);
        },V=>weigh(V,side,false),{caps:true,up:[m,0,0]});
      }
      if(rank>=2)for(const [w,length] of FINGERS){
        const pts=along.map(s=>at(.1+length*s,w*(1+.15*s),-.012*s*s));
        tube(ctx,pts,s=>lerp(.0085,.007,s),tipCols,(V,s,_,d)=>{
          const back=d[0]*m;
          if(rank>=3&&s>.8&&back>.5)V.colour(nail,SKIN,.7);else tint(V,back);
        },V=>weigh(V,side,true),{caps:true,up:[m,0,0]});
      }
    }
  }

  // Head: a lathe around the axis z -.01, with v = y - 1.76. Rows: v, half-width, front depth, back depth.
  const HEAD_Y=1.76,HEAD_Z=-.01;
  const HEAD=curve([[-.125,.04,.03,.042],[-.113,.036,.045,.046],[-.105,.034,.068,.048],[-.095,.046,.08,.053],[-.08,.058,.086,.06],
    [-.06,.067,.091,.072],[-.04,.073,.095,.084],[-.02,.077,.096,.093],[0,.079,.092,.099],[.02,.079,.094,.101],[.05,.076,.088,.099],
    [.08,.066,.074,.088],[.1,.052,.055,.068],[.115,.03,.03,.038]]);
  // How far the nose stands out of the face, by v.
  const NOSE=curve([[-.044,0],[-.036,.016],[-.028,.026],[-.015,.013],[0,.004],[.012,0]]);
  // Head rows: s 0..1 from the crown to under the chin, with more rows over the face.
  const headV=s=>s<.3?lerp(.122,.05,s/.3):s<.85?lerp(.05,-.105,(s-.3)/.55):lerp(-.105,-.135,(s-.85)/.15);
  const headWeights=(V,v)=>{const k=.5*smooth(-.1,-.135,v);V.bone(B.head,1-k).bone(B.neck,k);};
  const hairWeights=V=>{const h=smooth(1.52,1.64,V.y),c=smooth(1.5,1.38,V.y)*(1-h);V.bone(B.head,h).bone(B.chest,c).bone(B.neck,1-h-c);};
  // Returns (theta, v, off, plain) -> the point on the head (with the face unless plain), moved `off` outwards, and that
  // direction. Face features are bumps no narrower than the grid can show, so coarse levels stay smooth instead of spiky.
  function headShape(app,level){
    const female=app.sex==='female',aK=female?.96:1,noseK=(female?.8:1)*(app.age==='child'?.6:1);
    const [cols,rows]=level.head,spX=.27/cols,spV=.155/(.55*rows),face=level.features>0;
    const spot=(x,v,amp,sx,sv)=>{const ex=Math.max(sx,.6*spX),ev=Math.max(sv,.6*spV);return {x,v,amp:amp*Math.sqrt(sx/ex*sv/ev),ex,ev};};
    const spots=face?[
      spot(.013,-.034,.006*noseK,.006,.006),spot(-.013,-.034,.006*noseK,.006,.006),
      spot(.035,.02,.006,.015,.008),spot(-.035,.02,.006,.015,.008),
      spot(.032,.002,-.012,.014,.01),spot(-.032,.002,-.012,.014,.01),
      spot(.05,-.02,.006,.02,.02),spot(-.05,-.02,.006,.02,.02),
      spot(0,-.06,.006,.02,.005),spot(0,-.072,.006,.02,.005),spot(0,-.066,-.003,.02,.003),
      spot(0,-.095,.006,.02,.01)
    ]:[];
    const row=[],nose=[],out={x:0,y:0,z:0,nx:0,ny:1,nz:0};
    const at=(theta,v,off=0,plain=false)=>{
      HEAD(clamp(v,-.125,.115),row);
      const close=v>.115?Math.sqrt(clamp((.122-v)/.007,0,1)):v<-.125?Math.sqrt(clamp((v+.135)/.01,0,1)):1;
      const s=Math.sin(theta),c=Math.cos(theta),x=row[0]*aK*close*s,z=HEAD_Z+(c>=0?row[1]:row[2])*close*c;
      let nx=x,ny=v-.015,nz=z-HEAD_Z;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
      let h=off;
      if(!plain&&face&&c>.3){
        const ns=lerp(.007,.016,smooth(0,-.03,v)),ne=Math.max(ns,.6*spX);
        let f=NOSE(v,nose)[0]*noseK*Math.sqrt(ns/ne)*gauss(x,ne);
        for(const p of spots)f+=p.amp*gauss(x-p.x,p.ex)*gauss(v-p.v,p.ev);
        h+=f*smooth(.3,.8,c);
      }
      out.x=x+nx*h;out.y=HEAD_Y+v+ny*h;out.z=z+nz*h;out.nx=nx;out.ny=ny;out.nz=nz;
      return out;
    };
    at.aK=aK;
    return at;
  }

  // Where a beard grows (0..1) at head position (theta, v); x is the point's width. The lips always stay clear.
  function beardMask(style,theta,v,x){
    if(!style)return 0;
    const ax=Math.abs(x),lips=1-smooth(.03,.022,ax)*smooth(-.052,-.058,v)*smooth(-.082,-.076,v);
    const tache=smooth(.034,.026,ax)*smooth(-.04,-.046,v)*smooth(-.062,-.056,v);
    let k;
    if(style==='moustache')k=tache;
    else if(style==='goatee')k=Math.max(tache,smooth(.032,.024,ax)*smooth(-.058,-.064,v)*smooth(-.14,-.125,v));
    else{const line=lerp(-.035,.008,smooth(.7,1.5,Math.abs(theta)));k=Math.max(tache,smooth(line+.006,line-.008,v)*smooth(1.85,1.65,Math.abs(theta))*smooth(-.14,-.125,v));}
    return k*lips;
  }

  // The face: skin with painted lips and brows (Natural+), blush and soft eye shadows (Detailed+), stubble or a painted
  // beard where Detailed+ would grow a real one.
  function head(ctx){
    const {b,app,S}=ctx,level=b.level,rank=level.rank,[cols,rows]=level.head,at=ctx.headAt;
    const skin=S.skin.c,hairC=S.hair.c,lips=mixC(skin,lin('#a8423e'),.3),blush=mixC(skin,lin('#d9806c'),.6);
    const brow=mixC(hairC,lin('#1e1712'),.35),beard=app.beard,beardK=beard==='stubble'?.3:rank<=1?.75:.4;
    b.grid(rows,cols,(V,s,t)=>{
      const v=headV(s),theta=2*Math.PI*t-.45*Math.sin(2*Math.PI*t),p=at(theta,v);
      V.at(p.x,p.y,p.z);
      let c=skin;
      if(rank){
        const ax=Math.abs(p.x),front=smooth(.3,.8,Math.cos(theta));
        c=mixC(c,lips,front*smooth(.027,.015,ax)*gauss(v+.066,.0075));
        const bu=clamp((ax-.015)/.04,0,1),bv=.0225+.004*Math.sin(Math.PI*bu);
        c=mixC(c,brow,(rank===1?.85:.45)*front*smooth(.012,.017,ax)*smooth(.06,.054,ax)*gauss(v-bv,.0035));
        if(rank>=2){
          c=mixC(c,blush,.14*front*gauss(ax-.05,.018)*gauss(v+.03,.018));
          c=scaleC(c,1-.1*front*gauss(ax-.032,.012)*gauss(v-.004,.01));
        }
      }
      if(beard&&(rank||beard==='full'||beard==='goatee')){const k=beardMask(beard,wrap(theta),v,p.x);if(k>0)c=mixC(c,hairC,beardK*k);}
      V.colour(c,SKIN);
      if(b.uv){V.u=theta*.08;V.v=v;}
      headWeights(V,v);
    });
  }

  // Ears (Natural+): leaning back slightly, with a hollow on the outer side from Detailed. Hidden under long hair.
  function ears(ctx){
    const {b,S,level}=ctx,rank=level.rank;
    if(!rank||ctx.style.covers)return;
    const at=ctx.headAt,a=at(Math.PI/2,-.005,0,true).x,rows=[6,8,10][rank-1],cols=[8,10,12][rank-1];
    const colour=mixC(S.skin.c,lin('#c47466'),.1),lean=.22,cl=Math.cos(lean),sl=Math.sin(lean);
    for(const m of [1,-1]){
      const cx=m*(a+.005),cy=HEAD_Y-.005,cz=-.015;
      b.grid(rows,cols,(V,s,t)=>{
        const phi=Math.PI*s,psi=2*Math.PI*t,sp=Math.sin(phi),ey=.03*Math.cos(phi),ez=.02*sp*Math.sin(psi);
        let ex=.012*sp*Math.cos(psi);
        if(rank>=2&&ex>0)ex*=1-.6*gauss(ey/.03+.1,.35)*gauss(ez/.02,.45);
        V.at(cx+m*ex,cy+ey*cl+ez*sl,cz-ey*sl+ez*cl).colour(colour,SKIN);
        if(b.uv){V.u=psi*.01;V.v=ey;}
        V.bone(B.head,1);
      });
    }
  }

  // Eyes: dark dots on Simple; from Natural eyeballs with iris and pupil (crisp edges from repeated rows), and from
  // Detailed upper eyelids with lashes (Lifelike adds lower lids).
  function eyes(ctx){
    const {b,app,level,S}=ctx,rank=level.rank,at=ctx.headAt,ex=.032*at.aK,zp=at(Math.asin(.032/.079),0,0,true).z;
    if(!rank){
      const dot=lin('#241a14');
      for(const m of [1,-1])b.grid(3,6,(V,s,t)=>{
        const a=Math.PI*s,q=2*Math.PI*t,sa=Math.sin(a);
        V.at(m*ex+.008*sa*Math.sin(q),HEAD_Y+.002+.008*sa*Math.cos(q),zp-.004+.008*Math.cos(a)).colour(dot,SKIN);
        V.bone(B.head,1);
      });
      return;
    }
    const cy=HEAD_Y,cz=zp-.016,iris=lin(app.eyes||'#4a3524'),white=lin('#e8e4dc'),pupil=lin('#0c0a09');
    // [polar angle from the front, part: 0 pupil, 1 iris, 2 white]
    const ROWS=[[0,0],[.12,0],[.25,0],[.25,1],[.38,1],[.5,1],[.5,2],[.75,2],[1.05,2],[1.45,2],[2.1,2],[Math.PI,2]];
    const rows=rank===1?ROWS.filter((_,i)=>![1,4,7,9].includes(i)):ROWS,cols=[0,10,14,18][rank];
    const lidC=mixC(S.skin.c,lin('#b06a5c'),.12),lash=mixC(S.hair.c,lin('#120d0a'),.7),n=rank>=3?6:4;
    for(const m of [1,-1]){
      const cx=m*ex;
      b.grid(rows.length-1,cols,(V,_,t,i)=>{
        const [a,part]=rows[i],q=2*Math.PI*t,sa=Math.sin(a);
        V.at(cx+.012*sa*Math.sin(q),cy+.012*sa*Math.cos(q),cz+.012*Math.cos(a));
        const c=part===0?pupil:part===1?(rank>=2?scaleC(iris,1.15-.5*Math.pow((a-.25)/.25,2)):iris):scaleC(white,a>1.3?.82:1);
        V.colour(c,SKIN,1);
        V.bone(B.head,1);
      },{centre:[cx,cy,cz]});
      if(rank<2)continue;
      // A lid is the front half of a cap over the eyeball from the top (or bottom) down to `end`, tucked back to the
      // eyeball at its edge. Its open sides end inside the head.
      const lid=(up,end,edge)=>b.grid(n+1,cols>>1,(V,_,t,i)=>{
        const inner=i>n,a=inner?end:end*i/n,q=Math.PI*(t-.5),r=inner?.0121:.0135,sa=Math.sin(a);
        V.at(cx+r*sa*Math.sin(q),cy+up*r*Math.cos(a),cz+r*sa*Math.cos(q)).colour(i>=n?edge:lidC,SKIN);
        V.bone(B.head,1);
      },{closed:false,centre:[cx,cy,cz]});
      lid(1,1.15,lash);
      if(rank>=3)lid(-1,1.05,mixC(lidC,lash,.4));
    }
  }

  // Eyebrows (Detailed+): thin raised strips over the brow ridge, thicker towards the nose.
  function brows(ctx){
    const {level,S}=ctx;if(level.rank<2)return;
    const at=ctx.headAt,colour=mixC(S.hair.c,lin('#1e1712'),.35),cols=level.rank>=3?10:6;
    for(const m of [1,-1])patch(ctx,2,cols,(u,s)=>{
      const theta=m*lerp(.19,.78,u),v=lerp(.019+.002*u,.026-.002*u,s)+.004*Math.sin(Math.PI*u);
      return at(theta,v);
    },V=>V.colour(colour,HAIR,.1),V=>V.bone(B.head,1),.0025);
  }

  // Hair styles. end: rows [|theta|, v] where the hair ends (theta 0 = the forehead, pi = the nape); thick: [at the
  // crown, at the ends]; hang 0..1: how much the hair falls straight down from the widest part of the head instead of
  // following it in. Flags: taper (thinner towards the ends), part (side parting, radians from the front), curl (bump
  // height), covers (hides the ears), tail (ponytail), bun, bald (bare crown).
  const UP_END=[[0,.06],[.7,.022],[1.5,.01],[1.9,-.05],[3.15,-.08]];
  const HAIR_STYLES={
    short:{end:[[0,.055],[.7,.02],[1.5,.025],[1.9,-.04],[3.15,-.075]],thick:[.012,.006],hang:0,taper:true},
    buzz:{end:[[0,.06],[.7,.025],[1.5,.025],[1.9,-.04],[3.15,-.075]],thick:[.003,.003],hang:0},
    sidePart:{end:[[0,.05],[.7,.02],[1.5,.025],[1.9,-.04],[3.15,-.075]],thick:[.016,.007],hang:0,taper:true,part:.45},
    curly:{end:[[0,.05],[.7,.015],[1.5,.012],[1.9,-.045],[3.15,-.08]],thick:[.02,.014],hang:.3,curl:.01},
    afro:{end:[[0,.045],[.7,.01],[1.5,-.03],[3.15,-.07]],thick:[.06,.05],hang:.6,curl:.006,covers:true},
    bob:{end:[[0,.035],[.5,.03],[.9,-.06],[1.5,-.1],[3.15,-.09]],thick:[.016,.012],hang:.9,covers:true},
    long:{end:[[0,.055],[.5,.04],[.8,-.05],[1.2,-.15],[1.6,-.22],[2.4,-.35],[3.15,-.46]],thick:[.016,.014],hang:1,covers:true},
    pixie:{end:[[0,.05],[.7,.012],[1.5,-.01],[3.15,-.07]],thick:[.014,.008],hang:.2,taper:true},
    ponytail:{end:UP_END,thick:[.007,.005],hang:0,taper:true,tail:true},
    bun:{end:UP_END,thick:[.007,.005],hang:0,taper:true,bun:true},
    balding:{end:[[0,.03],[.9,.03],[1.3,0],[1.6,-.01],[1.9,-.045],[3.15,-.075]],thick:[.007,.005],hang:0,taper:true,bald:true}
  };
  for(const style of Object.values(HAIR_STYLES))style.endAt=curve(style.end);

  // Hair: one closed shell from the crown down to the style's hairline, folded back up inside so that hanging hair has an
  // underside; inner points inside the head or body are dropped. Natural adds streaks, curls and partings; Detailed adds
  // locks (thicker clumps and a scalloped edge).
  function hair(ctx){
    const {b,app,S,level,style}=ctx,rank=level.rank,at=ctx.headAt,cols=level.head[0],n=[6,12,18,26][rank],R=n+1;
    const random=peopleRandom(app.seed+':hair'),phase=random()*2*Math.PI,side=random()<.5?1:-1,locks=Math.round(cols/4);
    const hairC=S.hair.c,scalp=mixC(S.skin.c,hairC,.25),streak=new Float32Array(cols),row=[];
    for(let j=0;j<cols;j++)streak[j]=rank?.9+.2*random():1;
    // Per column j and row i (crown to hairline): outer and inner points, outward direction, hidden inner points, parting.
    const N=cols*R,O=new Float32Array(N*3),I=new Float32Array(N*3),D=new Float32Array(N*2),hide=new Uint8Array(N),parted=new Float32Array(N);
    for(let j=0;j<cols;j++){
      const theta=2*Math.PI*j/cols,abs=Math.abs(wrap(theta));
      let end=style.endAt(abs,row)[0];
      if(rank>=2)end-=(style.hang+.2)*.01*(.5+.5*Math.sin(locks*theta+phase));
      const top=style.bald?Math.max(end,lerp(.035,.08,smooth(.9,2.4,abs))):.122;
      let dx=Math.sin(theta),dz=Math.cos(theta),run=0;
      for(let i=0;i<R;i++){
        const s=i/n,v=lerp(top,end,s),f=smooth(0,.15,s),k=j*R+i;
        let th=lerp(style.thick[0],style.thick[1],s);
        if(style.taper)th*=1-.6*smooth(.75,1,s);
        const pk=style.part?gauss(wrap(theta-side*style.part),.06)*smooth(.05,.3,s)*smooth(1,.85,s):0;
        th*=1-.7*pk;parted[k]=pk;
        if(style.curl&&rank)th+=style.curl*(.5+.5*f*Math.sin(9*theta+phase)*Math.cos(11*Math.PI*s+phase));
        if(rank>=2)th*=1+.25*f*Math.sin(locks*theta+phase+3*s);
        if(style.bald)th*=smooth(0,.3,s);
        let ox=0,oy=HEAD_Y+v,oz=HEAD_Z,inside=0;
        if(v>=-.135){
          const p=at(theta,v,0,true);inside=Math.hypot(p.x,p.z-HEAD_Z);
          ox=p.x+p.nx*th;oy=p.y+p.ny*th;oz=p.z+p.nz*th;
        }
        let rho=Math.hypot(ox,oz-HEAD_Z);
        if(rho>1e-5){dx=ox/rho;dz=(oz-HEAD_Z)/rho;}
        if(v<.01)rho=lerp(rho,Math.max(rho,run),style.hang);
        run=Math.max(run,rho);
        if(oy<1.72){const q=ctx.shape(theta,oy,0);inside=Math.max(inside,Math.hypot(q.x,q.z-HEAD_Z));}
        if(oy<1.56)rho=Math.max(rho,inside+.015);
        const ri=Math.max(0,rho-Math.max(th,.008));
        O[k*3]=dx*rho;O[k*3+1]=oy;O[k*3+2]=HEAD_Z+dz*rho;
        I[k*3]=dx*ri;I[k*3+1]=oy+(i===n?.004:0);I[k*3+2]=HEAD_Z+dz*ri;
        D[k*2]=dx;D[k*2+1]=dz;hide[k]=ri<inside+.001?1:0;
      }
    }
    b.grid(2*R-1,cols,(V,_,t,i,j)=>{
      const jj=j%cols,outer=i<R,r=outer?i:2*R-1-i,k=jj*R+r,s=r/n,src=outer?O:I,dir=outer?1:-1;
      V.at(src[k*3],src[k*3+1],src[k*3+2]);V.hx=D[k*2]*dir;V.hy=.3*dir;V.hz=D[k*2+1]*dir;
      if(!outer&&hide[k])V.skip=true;
      let c=scaleC(hairC,(.75+.25*s)*streak[jj]*(outer?1:.55));
      if(rank&&parted[k])c=mixC(c,scalp,.6*parted[k]);
      V.colour(c,HAIR,.35);
      if(b.uv){V.u=t*6;V.v=s*1.5;}
      hairWeights(V);
    },{hint:true});
    if(style.tail){
      // A ponytail tied high at the back, falling against the back of the head and neck.
      const pts=[[1.815,.014],[1.8,.02],[1.76,.025],[1.7,.023],[1.64,.018],[1.58,.011],[1.54,.006]].map(([y,r])=>{
        const v=y-HEAD_Y,head=v>=-.135?-at(Math.PI,v,0,true).z:0,neck=-ctx.shape(Math.PI,y,0).z;
        return [0,y,-(Math.max(head,neck)+r+.004)];
      });
      tube(ctx,pts,[.014,.02,.025,.023,.018,.011,.006],[6,8,10,12][rank],(V,s,_,d)=>{
        const w=rank?1+.1*Math.sin(5*Math.atan2(d[0],d[2])+phase):1;
        V.colour(scaleC(hairC,(.8+.2*s)*w),HAIR,.35);
      },hairWeights,{caps:true});
    }
    if(style.bun){
      const cz=at(Math.PI,.045,0,true).z-.022;
      b.grid([4,6,8,10][rank],[6,10,14,18][rank],(V,s,t)=>{
        const a=Math.PI*s,q=2*Math.PI*t,sa=Math.sin(a),w=rank>=2?1+.08*sa*Math.sin(3*q+10*a+phase):1;
        V.at(.042*w*sa*Math.cos(q),1.805+.036*w*sa*Math.sin(q),cz-.03*Math.cos(a)).colour(scaleC(hairC,.85+.15*w),HAIR,.35);
        hairWeights(V);
      });
    }
  }

  // Beards and moustaches (Detailed+): a shell over the face as thick as the beard mask, dropped where there is no hair.
  // More rows around the mouth, where moustaches need them.
  const beardV=s=>s<.2?lerp(.015,-.03,s/.2):s<.7?lerp(-.03,-.075,(s-.2)/.5):lerp(-.075,-.135,(s-.7)/.3);
  function beard(ctx){
    const {b,app,S,level}=ctx,style=app.beard,rank=level.rank;
    if(rank<2||!style||style==='stubble')return;
    const at=ctx.headAt,full=style==='full',hairC=S.hair.c;
    b.grid(rank>=3?18:12,rank>=3?28:20,(V,s,t)=>{
      const u=2*t-1,theta=1.9*Math.sign(u)*Math.pow(Math.abs(u),1.3),v=beardV(s);
      const mask=beardMask(style,theta,v,at(theta,v,0,true).x);
      let th=(full?.009:.007)*mask-.002;
      if(full)th+=.006*mask*gauss(v+.11,.02)*smooth(.6,.9,Math.cos(theta));
      const p=at(theta,v,th);
      V.at(p.x,p.y,p.z);V.hx=p.nx;V.hy=p.ny;V.hz=p.nz;V.skip=th<=0;
      V.colour(scaleC(hairC,.8+.2*mask),HAIR,.25);
      if(b.uv){V.u=t*3;V.v=v*8;}
      headWeights(V,v);
    },{closed:false,hint:true});
  }

  // Glasses (Natural+): thin rims standing clear of the brows and nose, a bridge, and arms back over the ears.
  function glasses(ctx){
    const {app,level}=ctx,rank=level.rank,frame=app.glasses;
    if(!rank||!frame)return;
    const at=ctx.headAt,aK=at.aK,metal=frame==='#b8963c'||frame==='#a8acb0',c=lin(frame),kind=metal?GOLD:CLOTH;
    const cols=rank+3,n=[0,12,16,20][rank],side=at(Math.PI/2,.005,0,true).x;
    const paint=V=>V.colour(c,kind,.6),weights=V=>V.bone(B.head,1);
    for(const m of [1,-1]){
      const rim=[];
      for(let q=0;q<=n;q++){const f=2*Math.PI*q/n,e=(1+Math.cos(f))/2;rim.push([m*aK*(.033+.024*Math.cos(f)),1.762+.017*Math.sin(f),.09-.012*e*e]);}
      tube(ctx,rim,.0018,cols,paint,weights,{loop:true});
      tube(ctx,[[m*aK*.057,1.763,.078],[m*(side+.004),1.766,.045],[m*(side+.007),1.768,-.01],[m*(side+.005),1.75,-.032]],.0018,cols,paint,weights,{caps:true});
    }
    tube(ctx,[[-aK*.009,1.763,.09],[0,1.768,.093],[aK*.009,1.763,.09]],.0018,cols,paint,weights);
  }

  // ---- Clothes -------------------------------------------------------------------------------------------------------
  // A person's colour slots. `main` (the outer garment) takes a role colour when recoloured; the rest keep their own.
  function slots(app){
    const o=app.outfit||{},main=slot(o.main||'#5a5f66',CLOTH,{main:true});
    const own=(hex,fallback)=>hex&&hex===o.main?main:slot(hex||fallback);
    return {
      main,skin:slot(app.skin||'#e0b393',SKIN),hair:slot(app.hair?.colour||'#3a2618',HAIR,{gloss:.35}),
      shoe:slot(o.shoes||'#1a1614',CLOTH,{gloss:.45}),
      robe:o.kind==='alb'||o.kind==='cassock'?main:slot(o.robe||'#f7f5ef'),
      second:own(o.second,'#2a2c33'),shirt:own(o.shirt,'#f4f1ea'),tie:slot(o.tie||'#7a1f2a',CLOTH,{gloss:.2}),
      belt:slot('#2a1c12',CLOTH,{gloss:.5}),gold:slot('#d7b565',GOLD,{gloss:.8}),veil:slot('#fbf8ef')
    };
  }
  // The same colour worn at another distance from the body (extra: tone, gloss...).
  const worn=(s,off,extra)=>({...s,off,...extra});
  // Parts built next go to this mesh region (head, body or limbs) and layer (base, mass, cope, veil, vimp).
  const into=(ctx,region,layer='base')=>{ctx.b.key=region+'|'+layer;};
  const fnOf=v=>typeof v==='function'?v:()=>v;
  // A neckline at least `gap` above another one, so torso bands stay in order all the way round.
  const above=(f,low,gap=.008)=>{const F=fnOf(f),L=fnOf(low);return theta=>Math.max(F(theta),L(theta)+gap);};
  // Necklines as height by angle: a V from `front` up to `side` at angle `width`, then round to `back`; a rounded scoop.
  const vNeck=(front,side,width=.9,back=side+.02)=>theta=>{
    const a=Math.abs(wrap(theta));
    return a<width?lerp(front,side,Math.pow(a/width,1.2)):lerp(side,back,smooth(width,Math.PI,a));
  };
  const scoop=(front,side,back=side)=>theta=>{
    const a=Math.abs(wrap(theta));
    return lerp(front,side,smooth(0,1.1,a))+(back-side)*smooth(1.1,Math.PI,a);
  };

  // The point on the body (or on a garment `off` from it) at width x and height y, on the front (or the back).
  function bodyAt(ctx,x,y,off=0,back=false){
    const shape=ctx.shape,half=shape(Math.PI/2,y,off).x||1e-6;
    let theta=Math.asin(clamp(x/half,-1,1));
    if(back)theta=Math.PI-theta;
    for(let k=0;k<3;k++){
      const f=shape(theta,y,off).x-x,d=(shape(theta+1e-3,y,off).x-shape(theta-1e-3,y,off).x)/2e-3;
      if(Math.abs(d)>1e-6)theta-=clamp(f/d,-.3,.3);
    }
    const p=shape(theta,y,off);
    return {x:p.x,y,z:p.z,nx:p.nx,ny:0,nz:p.nz,theta};
  }
  // A point on a skirt as skirt() folds it (spec and the {k, phase} it returned), lifted outwards: buttons and trims.
  function skirtAt(ctx,spec,folds,theta,y,lift=0){
    const p=skirtPoint(ctx,spec,theta,y),wave=foldWave(folds.k,theta,folds.phase);
    const r=p.r+foldDepth(ctx.level,p.u)*(spec.fold??1)*(.5+.5*wave)+lift,nx=p.x/p.r,nz=p.z/p.r;
    return {x:nx*r,y,z:nz*r,nx,ny:0,nz,theta};
  }
  // A button: a low dome standing on the surface at p (with its normal nx, ny, nz). weights(V) skins every vertex.
  function stud(ctx,p,r,paint,weights,h=.45){
    const nx=p.nx,ny=p.ny||0,nz=p.nz,l=Math.hypot(nx,nz)||1,ax=-nz/l,az=nx/l,bx=ny*az,by=nz*ax-nx*az,bz=-ny*ax;
    const rings=[[r,-.0005],[.75*r,.8*h*r],[0,h*r]];
    ctx.b.grid(2,ctx.level.rank>=3?8:6,(V,_,t,i)=>{
      const [rad,up]=rings[i],q=2*Math.PI*t,c=Math.cos(q)*rad,s=Math.sin(q)*rad;
      V.at(p.x+ax*c+bx*s+nx*up,p.y+by*s+ny*up,p.z+az*c+bz*s+nz*up);
      V.hx=nx;V.hy=ny;V.hz=nz;paint(V);weights(V);
    },{hint:true});
  }
  const button=(ctx,p,r,s,weights)=>stud(ctx,p,r,V=>V.paint(s),weights||(V=>torsoWeights(V,p.x,p.y)));

  // Long robes: like lapWeights, but the split between the legs softens towards the hem, so the cloth stretches across
  // from knee to knee instead of tearing apart when a leg moves.
  function robeWeights(V,x,y){
    if(y>=.93){torsoWeights(V,x,y);return;}
    const w=lerp(.04,.15,smooth(.85,.35,y)),sL=smooth(-w,w,x),leg=.85*smooth(.93,.75,y),shin=smooth(.58,.45,y);
    V.bone(B.hips,1-leg).bone(B.thighL,leg*(1-shin)*sL).bone(B.thighR,leg*(1-shin)*(1-sL))
      .bone(B.shinL,leg*shin*sL).bone(B.shinR,leg*shin*(1-sL));
  }

  // A tie (all levels): the knot under the collar, then the blade widening down to its point.
  function tie(ctx){
    const {S,level}=ctx,rank=level.rank;
    patch(ctx,[4,8,10,14][rank],rank>=2?3:2,(u,s)=>{
      const x0=2*u-1,y=lerp(1.535,1.1+.03*Math.abs(x0),s),knot=smooth(1.5,1.507,y);
      const w=knot*.014+(1-knot)*lerp(.011,.03,smooth(1.495,1.16,y));
      return bodyAt(ctx,x0*w,y,.006+.007*knot*Math.sqrt(1-x0*x0));
    },(V,u,s)=>V.paint(S.tie,1-.12*smooth(.15,0,s)),(V,p)=>torsoWeights(V,p.x,p.y),.004);
  }
  // A strip lying along both edges of a V neckline (lapels, cardigan bands), from the edge w(s) metres across the
  // garment, s 0..1 from y0 up to y1. neck: [front, side, width] as given to vNeck.
  function vStrip(ctx,[front,side,width],off,y0,y1,w,rows,cols,paint,lift=.003){
    const shape=ctx.shape;
    for(const m of [1,-1])patch(ctx,rows,cols,(u,s)=>{
      const y=lerp(y0,y1,s),e=width*Math.pow(clamp((y-front)/(side-front),0,1),1/1.2);
      const a=shape(e+.01,y,off),ax=a.x,az=a.z,c=shape(e-.01,y,off),speed=Math.hypot(ax-c.x,az-c.z)/.02||1;
      const p=shape(m*(e+w(s)*u/speed),y,off);
      return {x:p.x,y,z:p.z,nx:p.nx,ny:0,nz:p.nz};
    },paint,(V,p)=>torsoWeights(V,p.x,p.y),lift);
  }
  // A shirt or blouse collar (Natural+): a band standing round the back of the neck that turns down and lies on the
  // chest towards its points. gap: half the opening at the front (radians); base/top: its edges at the back;
  // point/tipTop: its edges at the points.
  function collar(ctx,{gap,base,top,point,tipTop,slot:s,off=.006,lift=.006}){
    const {shape,level}=ctx,cols=[0,10,14,20][level.rank];
    if(!cols)return;
    patch(ctx,3,cols,(u,sv)=>{
      const theta=lerp(gap,2*Math.PI-gap,u),a=Math.abs(wrap(theta)),i=Math.round(sv*3);
      const lo=lerp(point,base,smooth(gap,gap+.6,a)),hi=lerp(tipTop,top,smooth(gap,gap+.4,a));
      const y=[lo,lo,hi,hi-.005][i],p=shape(theta,lerp(y,Math.max(y,1.53),smooth(gap+.3,gap+.9,a)),off+[-lift,0,0,.002][i]);
      return {x:p.x,y,z:p.z,nx:p.nx,ny:0,nz:p.nz};
    },(V,u,sv)=>V.paint(s,1-.1*(1-sv)),(V,p)=>torsoWeights(V,p.x,p.y),lift);
  }
  // A belt buckle (Detailed+).
  function buckle(ctx){
    if(ctx.level.rank<2)return;
    const s=slot('#b8b4a8',GOLD,{gloss:.8});
    patch(ctx,1,2,(u,sv)=>bodyAt(ctx,lerp(-.022,.022,u),lerp(1.004,1.031,sv),.016),V=>V.paint(s),(V,p)=>torsoWeights(V,p.x,p.y),.003);
  }
  // Half-width and the larger half-depth of the hips: skirts and coat tails must clear them.
  function hips(ctx){
    const shape=ctx.shape,a=shape(Math.PI/2,.93,0).x,f=shape(0,.93,0).z,bk=-shape(Math.PI,.93,0).z;
    return {a,b:Math.max(f,bk)};
  }
  // A skirt from the waist to `hem`; long skirts flare more and drape between the legs like robes.
  function skirtSpec(ctx,hem,s,top=1.02){
    const h=hips(ctx),long=smooth(.6,.1,hem);
    return {top,hem,a:h.a+.035+.06*long,b:h.b+.03+.04*long,off:s.off||.012,slot:s,weights:hem<.2?robeWeights:undefined};
  }
  // Coat tails (jackets, long cardigans): hanging nearly straight over the hips, and over `lower` (a skirt) if given.
  function coatSpec(ctx,hem,s,fold,lower,top=1.02){
    const h=hips(ctx),spec={top,hem,a:h.a+.035,b:h.b+.03,off:s.off,slot:s,fold};
    if(lower)spec.floor=(theta,y)=>{const p=skirtPoint(ctx,lower,theta,y);return p.r+foldDepth(ctx.level,p.u)*(lower.fold??1)+.007;};
    return spec;
  }
  const TROUSERS={end:.085,hem:true,straight:true};

  // Tops and bottoms: a blouse or T-shirt over a skirt, trousers or shorts.
  function separates(ctx,top,bottom){
    const {S,app}=ctx,o=app.outfit,lower=worn(S.second,.012),tee=top==='tshirt';
    const shirt=worn(S.main,tee?.014:.006),short=tee||o.sleeves==='short';
    const neck=tee?scoop(1.505,1.51,1.52):theta=>lerp(1.46,1.53,smooth(0,.6,Math.abs(wrap(theta))));
    const bands=[];
    if(tee)bands.push({to:bottom==='skirt'?.98:.92,slot:worn(S.second,.01)});
    else if(bottom==='skirt')bands.push({to:1,slot:lower});
    else bands.push({to:1,slot:lower},{to:1.035,slot:worn(S.belt,.016)});
    bands.push({to:neck,slot:shirt},{to:1.72,slot:S.skin});
    into(ctx,'body');
    torso(ctx,bands);
    if(bottom==='skirt')skirt(ctx,skirtSpec(ctx,o.hem||.42,lower,tee?1:1.02));
    if(!tee){
      collar(ctx,{gap:.35,base:1.51,top:1.54,point:1.46,tipTop:1.5,slot:shirt});
      if(bottom!=='skirt')buckle(ctx);
    }
    into(ctx,'limbs');
    arms(ctx,short?[{to:1.31,slot:shirt,off:tee?.014:.008,loose:.052}]
      :[{to:.975,slot:shirt,off:.006,loose:.04},{to:.935,slot:shirt,off:.009,loose:.03}]);
    legs(ctx,bottom==='skirt'?{slot:S.skin}:bottom==='shorts'?{slot:worn(S.second,.01),off:.01,end:.6}:{slot:lower,off:.012,...TROUSERS});
    shoes(ctx);
  }

  // Albs and cassocks: a robe from the neck to the ankles with sleeves to the wrists; dark trousers and shoes show below.
  // The robe's skirt is kept in ctx.robe, so vestments can hang over it.
  function robeBase(ctx,buttons){
    const {S,level}=ctx,robe=worn(S.robe,.01);
    into(ctx,'body');
    torso(ctx,[{to:scoop(1.5,1.51,1.53),slot:robe},{to:1.72,slot:S.skin}]);
    const spec={top:1,hem:.08,a:.28,b:.22,off:.012,slot:worn(S.robe,.012),weights:robeWeights};
    ctx.robe={spec,...skirt(ctx,spec)};
    if(buttons&&level.rank>=2){
      const s=worn(S.robe,0,{tone:.8,gloss:.5});
      for(let y=1.48;y>.24;y-=.045){
        if(y>=1)button(ctx,bodyAt(ctx,0,y,.01),.005,s);
        else{const p=skirtAt(ctx,spec,ctx.robe,0,y);button(ctx,p,.005,s,V=>robeWeights(V,p.x,p.y));}
      }
    }
    into(ctx,'limbs');
    arms(ctx,[{to:.93,slot:robe,off:.012,loose:.045}]);
    legs(ctx,{top:.3,slot:worn(S.second,.006),off:.006});
    shoes(ctx);
  }

  // Every outfit kind (peopleOutfit and peopleAppearance), building torso, skirts and trims (body) and arms, legs and shoes
  // (limbs). Natural adds collars and lapels, Detailed buttons and buckles.
  const OUTFITS={
    suit(ctx){
      const {S,app,level}=ctx,o=app.outfit,rank=level.rank,female=app.sex==='female';
      const neck=female?[1.2,1.49,.85,1.51]:[1.12,1.5,.9,1.52],V0=vNeck(...neck);
      const jacket=worn(S.main,.014),shirt=worn(S.shirt,.006),lower=worn(S.second,.012);
      into(ctx,'body');
      torso(ctx,[{to:1,slot:lower},{to:V0,slot:jacket},{to:female?above(V0,scoop(1.45,1.5,1.52)):1.545,slot:shirt},{to:1.72,slot:S.skin}]);
      let low=null;
      if(o.skirt){low=skirtSpec(ctx,o.hem||.42,lower);skirt(ctx,low);}
      const coat=coatSpec(ctx,.8,jacket,.25,low),folds=skirt(ctx,coat);
      if(o.tie)tie(ctx);
      if(rank>=1){
        vStrip(ctx,neck,.014,neck[0]+.01,neck[1]-.01,s=>.05*smooth(0,.6,s)*(1-.45*smooth(.78,.84,s)),[0,6,9,12][rank],rank>=2?3:2,
          V=>V.paint(S.main,.9));
        if(!female)collar(ctx,{gap:.14,base:1.505,top:1.55,point:1.488,tipTop:1.528,slot:shirt});
      }
      if(rank>=2){
        const s=slot('#1c1a18',CLOTH,{gloss:.5});
        for(const y of [neck[0]-.03,neck[0]-.12]){
          if(y>=1.015)button(ctx,bodyAt(ctx,0,y,.014),.009,s);
          else{const p=skirtAt(ctx,coat,folds,0,y);button(ctx,p,.009,s,V=>lapWeights(V,p.x,p.y));}
        }
      }
      into(ctx,'limbs');
      arms(ctx,[{to:.955,slot:jacket,off:.014,loose:.036},{to:.94,slot:shirt,off:.006,loose:.032}]);
      legs(ctx,o.skirt?{slot:S.skin}:{slot:lower,off:.012,...TROUSERS});
      shoes(ctx);
    },
    shirt(ctx){
      const {S,level}=ctx,shirt=worn(S.shirt,.006),lower=worn(S.second,.012);
      into(ctx,'body');
      torso(ctx,[{to:1,slot:lower},{to:1.035,slot:worn(S.belt,.016)},
        {to:theta=>lerp(1.44,1.53,smooth(0,.7,Math.abs(wrap(theta)))),slot:shirt},{to:1.72,slot:S.skin}]);
      collar(ctx,{gap:.3,base:1.515,top:1.55,point:1.455,tipTop:1.5,slot:shirt});
      if(level.rank>=2){
        const s=slot('#ece8de',CLOTH,{gloss:.6});
        for(const y of [1.4,1.32,1.24,1.16,1.08])button(ctx,bodyAt(ctx,0,y,.006),.0045,s);
        buckle(ctx);
      }
      into(ctx,'limbs');
      arms(ctx,[{to:.975,slot:shirt,off:.006,loose:.04},{to:.935,slot:shirt,off:.009,loose:.03}]);
      legs(ctx,{slot:lower,off:.012,...TROUSERS});
      shoes(ctx);
    },
    sweater(ctx){
      const {S}=ctx,knit=worn(S.main,.016),lower=worn(S.second,.012),shirt=worn(S.shirt,.006);
      into(ctx,'body');
      torso(ctx,[{to:.93,slot:lower},{to:.98,slot:worn(S.main,.018,{tone:.86})},{to:scoop(1.49,1.5,1.515),slot:knit},
        {to:scoop(1.51,1.52,1.535),slot:worn(S.main,.02,{tone:.86})},{to:1.55,slot:shirt},{to:1.72,slot:S.skin}]);
      collar(ctx,{gap:.25,base:1.515,top:1.555,point:1.495,tipTop:1.53,off:.014,lift:.008,slot:shirt});
      into(ctx,'limbs');
      arms(ctx,[{to:.975,slot:knit,off:.016,loose:.04},{to:.935,slot:worn(S.main,.012,{tone:.86}),off:.012,loose:.028}]);
      legs(ctx,{slot:lower,off:.012,...TROUSERS});
      shoes(ctx);
    },
    cardigan(ctx){
      const {S,app,level}=ctx,o=app.outfit,rank=level.rank,skirted=o.kind==='cardiganSkirt';
      const neck=[1.22,1.47,.8,1.49],V0=vNeck(...neck),knit=worn(S.main,.02),shirt=worn(S.shirt,.006),lower=worn(S.second,.012);
      into(ctx,'body');
      torso(ctx,[{to:skirted?1:.9,slot:lower},{to:V0,slot:knit},{to:above(V0,1.53),slot:shirt},{to:1.72,slot:S.skin}]);
      collar(ctx,{gap:.3,base:1.515,top:1.55,point:1.455,tipTop:1.5,slot:shirt});
      let coat=null,folds=null;
      if(skirted){
        const low=skirtSpec(ctx,o.hem||.42,lower);skirt(ctx,low);
        coat=coatSpec(ctx,.86,worn(S.main,.024),.3,low,1.04);folds=skirt(ctx,coat);
      }
      if(rank>=1){
        const band=V=>V.paint(knit,.9),y0=skirted?1.03:.9;
        vStrip(ctx,neck,.02,neck[0]+.005,neck[1]-.005,()=>.012,[0,6,9,12][rank],1,band);
        patch(ctx,[0,4,6,8][rank],1,(u,s)=>bodyAt(ctx,lerp(-.011,.011,u),lerp(y0,neck[0]+.005,s),.02),band,(V,p)=>torsoWeights(V,p.x,p.y),.003);
        if(skirted)patch(ctx,[0,3,4,5][rank],1,(u,s)=>skirtAt(ctx,coat,folds,lerp(-.06,.06,u),lerp(.86,1.035,s)),band,
          (V,p)=>lapWeights(V,p.x,p.y),.003);
      }
      if(rank>=2){
        const s=slot('#2a2420',CLOTH,{gloss:.5});
        for(const y of skirted?[1.2,1.13,1.06]:[1.2,1.13,1.06,.99])button(ctx,bodyAt(ctx,0,y,.023),.006,s);
      }
      into(ctx,'limbs');
      arms(ctx,[{to:.95,slot:knit,off:.02,loose:.042},{to:.93,slot:worn(S.main,.016,{tone:.86}),off:.016,loose:.03}]);
      legs(ctx,skirted?{slot:S.skin}:{slot:lower,off:.012,...TROUSERS});
      shoes(ctx);
    },
    dress(ctx){
      const {S,app}=ctx,o=app.outfit,dress=worn(S.main,.008);
      into(ctx,'body');
      torso(ctx,[{to:scoop(1.43,1.49,1.5),slot:dress},{to:1.72,slot:S.skin}]);
      skirt(ctx,skirtSpec(ctx,o.hem||.4,worn(S.main,.012)));
      into(ctx,'limbs');
      arms(ctx,o.sleeves==='short'?[{to:1.31,slot:dress,off:.008,loose:.052}]:[{to:.94,slot:dress,off:.008,loose:.038}]);
      legs(ctx,{slot:S.skin});
      shoes(ctx);
    },
    blouseSkirt:ctx=>separates(ctx,'blouse','skirt'),
    blouseTrousers:ctx=>separates(ctx,'blouse','trousers'),
    tshirtTrousers:ctx=>separates(ctx,'tshirt','trousers'),
    tshirtShorts:ctx=>separates(ctx,'tshirt','shorts'),
    tshirtSkirt:ctx=>separates(ctx,'tshirt','skirt'),
    alb:ctx=>robeBase(ctx,false),
    cassock:ctx=>robeBase(ctx,true)
  };
  OUTFITS.shirtTrousers=OUTFITS.shirt;
  OUTFITS.cardiganSkirt=OUTFITS.cardigan;
  function clothe(ctx){(OUTFITS[ctx.app.outfit?.kind]||OUTFITS.shirt)(ctx);}

  // ---- Vestments -----------------------------------------------------------------------------------------------------
  const TAU=2*Math.PI,VIMP_ROLES=['MB','CB'];
  // Distance from the body's axis to its surface (moved `off` outwards) in the direction phi (0 = front, pi/2 = the left).
  function bodyRadius(ctx,phi,y,off=0){
    const shape=ctx.shape,yy=clamp(y,.8,1.7),a=shape(Math.PI/2,yy,0).x,c=Math.cos(phi);
    const d=c>=0?shape(0,yy,0).z:-shape(Math.PI,yy,0).z,p=shape(Math.atan2(d*Math.sin(phi),a*c),yy,off);
    return Math.hypot(p.x,p.z);
  }
  // How far out a hanging arm in its sleeve (plus clearance c) reaches in the direction phi at height y; 0 if it is not there.
  function armRadius(ctx,phi,y,c=0){
    const top=ctx.rig.shoulderY,r0=.068+c,h=.04+c;
    if(y>top+h||y<.7)return 0;
    const r=y>top?r0*Math.sqrt(Math.max(0,1-((y-top)/h)**2)):r0,cx=ctx.rig.sx+.06*Math.max(0,top-y);
    const s=cx*Math.abs(Math.sin(phi)),disc=s*s-cx*cx+r*r;
    return disc<0?0:s+Math.sqrt(disc);
  }
  // Scales every bone weight given so far, to make room for more.
  const keep=(V,k)=>{for(let i=0;i<V.n;i++)V.weights[i]*=k;};
  // The robe's outside with its deepest folds, plus `gap`: the least radius of anything hanging over it.
  function robeFloor(ctx,gap=.012){
    const robe=ctx.robe;if(!robe)return()=>0;
    const spec=robe.spec,p={x:0,z:0,r:0,u:0};
    return(phi,y)=>{
      if(y>spec.top)return 0;
      skirtPoint(ctx,spec,Math.atan2(spec.b*Math.sin(phi),spec.a*Math.cos(phi)),y,p);
      return p.r+foldDepth(ctx.level,p.u)*(spec.fold??1)+gap;
    };
  }

  // An outer garment hanging from the shoulders (chasuble, dalmatic, cope, humeral veil). It drapes like cloth: at each angle
  // its radius never shrinks going down, so it falls from the shoulders and arms over the body and `floor` instead of
  // clinging to the waist. spec: {top, hem (heights, or fn(phi)), lines (more band borders, fn(phi)), profile (rows [y,
  // half-width, half-depth]: the cut), clear (from the body and arms), floor(phi, y) (a least radius), gap(y) (half the
  // opening at the front, radians, for open garments), fold, flat(phi, y) (fold factor), armK (how much the sides follow
  // the arms), slot, paint(V, band, phi, y, shade), weights(V, x, y), cols}.
  // Returns at(phi, y, lift): the point on the outside, with at.weights(V, p), at.outer(phi, y) (its greatest radius
  // there, 0 where it is not), at.top, at.hem and at.gap, so trims can lie on it and other garments hang over it.
  function shell(ctx,spec){
    const {b,app,level,shape}=ctx,features=level.features,k=[0,6,10,14][features]||0;
    const cols=spec.cols||Math.max(16,level.torso,4*k),open=!!spec.gap,gap=fnOf(spec.gap||0);
    const top=fnOf(spec.top),hem=fnOf(spec.hem),lines=(spec.lines||[]).map(fnOf),clear=spec.clear??.02;
    const fk=spec.fold??1,flat=spec.flat||(()=>1),armK=spec.armK??.6,floor=spec.floor||(()=>0);
    const phase=(app.seed%997)/97+1.7,profile=curve(spec.profile),row=[],weights=spec.weights||robeWeights;
    const paint=spec.paint||((V,band,phi,y,shade)=>V.paint(spec.slot,shade));
    const phiOf=(t,y)=>{if(!open)return TAU*t;const g=gap(y);return lerp(g,TAU-g,t);};
    // The drape: per column, the greatest support (body, arms, floor) from the neck down. Half-way columns count too,
    // divided by the cosine of the half step, so the flat faces between columns clear them as well.
    let low=1.62;for(let q=0;q<24;q++)low=Math.min(low,hem(TAU*q/24));
    const Y0=1.62,DY=.0125,NY=Math.max(2,Math.ceil((Y0-Math.max(.02,low-.04))/DY)+1),NJ=2*cols;
    const SUP=new Float32Array((NJ+1)*NY),H=new Float32Array((cols+1)*NY);
    for(let i=0;i<NY;i++){
      const y=Y0-i*DY,yy=clamp(y,.8,1.7),a=shape(Math.PI/2,yy,0).x,df=shape(0,yy,0).z,db=-shape(Math.PI,yy,0).z;
      for(let jj=0;jj<=NJ;jj++){
        const phi=phiOf(jj/NJ,y),c=Math.cos(phi),p=shape(Math.atan2((c>=0?df:db)*Math.sin(phi),a*c),yy,clear);
        SUP[jj*NY+i]=Math.max(Math.hypot(p.x,p.z),armRadius(ctx,phi,y,clear),floor(phi,y));
      }
    }
    for(let j=0;j<=cols;j++){
      let run=0;
      for(let i=0;i<NY;i++){
        const y=Y0-i*DY,c=Math.cos((open?TAU-2*gap(y):TAU)/NJ),l=2*j-1,r=2*j+1;
        const left=l>=0?l:open?-1:NJ-1,right=r<=NJ?r:open?-1:1;
        let s=SUP[2*j*NY+i];
        if(left>=0)s=Math.max(s,SUP[left*NY+i]/c);
        if(right>=0)s=Math.max(s,SUP[right*NY+i]/c);
        run=Math.max(run,s);H[j*NY+i]=run;
      }
    }
    const hangAt=(j,y)=>{const f=clamp((Y0-y)/DY,0,NY-1),i=Math.min(NY-2,Math.floor(f));return lerp(H[j*NY+i],H[j*NY+i+1],f-i);};
    const ellipse=(phi,y)=>{profile(y,row);const s=Math.sin(phi)/row[0],c=Math.cos(phi)/row[1];return 1/Math.sqrt(s*s+c*c);};
    // Column j at height y: its angle, radius without (base) and with folds (r), and the folds' shading.
    const pt=(j,y,o)=>{
      const phi=phiOf(j/cols,y),T=top(phi),u=clamp((T-y)/((T-hem(phi))||1),0,1),f=fk*flat(phi,y),wave=foldWave(k,phi,phase);
      o.phi=phi;o.u=u;o.base=Math.max(hangAt(j,y),ellipse(phi,y));o.r=o.base+foldDepth(level,u)*f*(.5+.5*wave);
      o.shade=1-.28*u*f*features/3*(.5-.5*wave);o.x=o.r*Math.sin(phi);o.z=o.r*Math.cos(phi);return o;
    };
    const weigh=(V,phi,x,y)=>{
      weights(V,x,y);
      const sn=Math.sin(phi),sigma=armK*smooth(.4,.92,Math.abs(sn))*smooth(1.5,1.4,y);
      if(sigma>1e-3){
        keep(V,1-sigma);
        const side=SIDE[sn>=0?1:-1],f=smooth(1.24,1.12,y);
        V.bone(side.arm,sigma*(1-f)).bone(side.fore,sigma*f);
      }
    };
    // Rows: the neckline tucked in to the body, the bands between top, lines and hem (each border twice, for crisp colours),
    // then the hem folded in and its lining turned up inside.
    const step=.14/(level.along+.5),bounds=[top,...lines,hem],last=bounds.length-2,rows=[{lip:true,band:0}];
    for(let L=0;L<=last;L++){
      const A=bounds[L],Z=bounds[L+1];
      let span=0;for(let q=0;q<12;q++){const phi=TAU*q/12;span=Math.max(span,Math.abs(A(phi)-Z(phi)));}
      const n=Math.max(L===0?level.along+1:1,Math.round(span/step));
      for(let i=0;i<=n;i++)rows.push({from:A,to:Z,s:L===0?Math.pow(i/n,1.6):i/n,band:L});
    }
    rows.push({hemRow:true,band:last},{up:true,band:last});
    const rowY=(r,phi)=>r.lip?top(phi):r.hemRow?hem(phi):r.up?hem(phi)+Math.min(.08,(top(phi)-hem(phi))*.3):lerp(r.from(phi),r.to(phi),r.s);
    const o={};
    b.grid(rows.length-1,cols,(V,_,t,i,j)=>{
      const r=rows[i];
      let y=rowY(r,phiOf(t,1));
      if(open)y=rowY(r,phiOf(t,y));
      pt(j,y,o);
      let rad=o.r,shade=o.shade;
      if(r.lip)rad=Math.min(o.r-.004,bodyRadius(ctx,o.phi,y,0)-.002);
      else if(r.hemRow)rad-=.008;
      else if(r.up){rad-=.008;shade*=.55;}
      const s=Math.sin(o.phi),c=Math.cos(o.phi);
      V.at(rad*s,y,rad*c);V.hx=s;V.hz=c;
      paint(V,r.band,o.phi,y,shade);
      if(b.uv){V.u=o.phi*.25;V.v=y;}
      weigh(V,o.phi,rad*s,y);
    },{closed:!open,hint:true});
    const A={},Bq={};
    const tOf=(phi,y)=>{
      if(!open)return((phi/TAU)%1+1)%1;
      const g=gap(y),a=(phi%TAU+TAU)%TAU;return clamp((a-g)/(TAU-2*g),0,1);
    };
    function at(phi,y,lift=0){
      const f=tOf(phi,y)*cols,j=Math.min(cols-1,Math.floor(f)),w=f-j;
      pt(j,y,A);pt(j+1,y,Bq);
      const x=lerp(A.x,Bq.x,w),z=lerp(A.z,Bq.z,w),tx=Bq.x-A.x,tz=Bq.z-A.z,l=Math.hypot(tx,tz)||1;
      let nx=-tz/l,nz=tx/l;if(nx*x+nz*z<0){nx=-nx;nz=-nz;}
      return {x:x+nx*lift,y,z:z+nz*lift,nx,ny:0,nz,phi,shade:lerp(A.shade,Bq.shade,w)};
    }
    at.weights=(V,p)=>weigh(V,p.phi,p.x,p.y);
    at.outer=(phi,y)=>{
      if(open){const g=gap(y),a=(phi%TAU+TAU)%TAU;if(a<g||a>TAU-g)return 0;}
      if(y>top(phi)||y<hem(phi))return 0;
      const f=tOf(phi,y)*cols,j=Math.min(cols-1,Math.floor(f));
      pt(j,y,A);pt(j+1,y,Bq);
      return Math.max(A.base,Bq.base)+foldDepth(level,Math.max(A.u,Bq.u))*fk;
    };
    at.top=top;at.hem=hem;at.gap=gap;
    return at;
  }
  // The angle at which a shell's outside passes width x at height y, on its front (or back).
  function shellX(at,x,y,back){
    let phi=back?Math.PI-x/.2:x/.2;
    for(let k=0;k<4;k++){const p=at(phi,y);if(Math.abs(p.z)>1e-3)phi-=clamp((p.x-x)/p.z,-.3,.3);}
    return phi;
  }
  // A vertical band on a shell (orphreys, clavi) between widths x0 and x1, from the neckline down to `bottom` above the hem.
  function column(ctx,at,x0,x1,back,s,rows,cols,bottom=.012,lift=.004){
    const top=at.top,hem=at.hem;
    patch(ctx,rows,cols,(u,v)=>{
      const x=lerp(x0,x1,u);
      let phi=shellX(at,x,1.45,back),y0=top(phi)-.006;
      phi=shellX(at,x,y0,back);y0=top(phi)-.006;
      const y1=hem(shellX(at,x,.7,back))+bottom,y=lerp(y0,y1,Math.pow(v,1.3));
      return at(shellX(at,x,y,back),y);
    },(V,u,v,p)=>V.paint(s,p.shade),at.weights,lift);
  }

  // The chasuble (Priest): a full, bell-shaped vestment falling over the arms, with a gold column orphrey front and back.
  function chasuble(ctx){
    const {S,level}=ctx,rank=level.rank;
    const at=shell(ctx,{top:scoop(1.48,1.535,1.52),hem:phi=>.42+.43*Math.sin(phi)**2,floor:robeFloor(ctx),armK:.6,slot:S.main,
      profile:[[.4,.3,.2],[.9,.29,.165],[1.2,.27,.14],[1.4,.2,.11],[1.5,.12,.08],[1.53,.075,.07]],
      flat:phi=>smooth(.25,.6,Math.abs(wrap(phi)))*smooth(.25,.6,Math.abs(wrap(phi-Math.PI)))});
    for(const back of [false,true])column(ctx,at,-.055,.055,back,S.gold,[10,16,24,32][rank],rank>=3?3:2);
    return at;
  }
  // The dalmatic (Deacon): a straighter tunic, open at the sides, with two gold bands (clavi) and a gold band above the hem.
  function dalmatic(ctx){
    const {S,level}=ctx,rank=level.rank,hem=phi=>lerp(.55,1.12,smooth(.82,.97,Math.abs(Math.sin(phi))));
    const at=shell(ctx,{top:scoop(1.49,1.535,1.52),hem,lines:[phi=>hem(phi)+.1,phi=>hem(phi)+.06],fold:.6,armK:.7,
      floor:robeFloor(ctx),profile:[[.5,.27,.19],[.9,.27,.17],[1.2,.26,.14],[1.4,.2,.11],[1.5,.12,.08],[1.53,.075,.07]],
      flat:phi=>smooth(.4,.7,Math.abs(wrap(phi)))*smooth(.4,.7,Math.abs(wrap(phi-Math.PI))),
      paint:(V,band,phi,y,shade)=>V.paint(band===1?S.gold:S.main,shade)});
    for(const back of [false,true])for(const m of [1,-1])column(ctx,at,m*.06,m*.1,back,S.gold,[10,16,24,32][rank],rank>=3?2:1,.1);
    return at;
  }
  // The cope (Exposition and Benediction): a long cape open at the front and held on the chest by a clasp (morse), with gold
  // orphreys down the front edges and round the neck, and a shield (hood) on the back.
  function cope(ctx){
    const {S,level}=ctx,rank=level.rank,top=1.535,hem=.1,gap=y=>lerp(.42,.12,smooth(.15,1.38,y)),gold=S.gold;
    const at=shell(ctx,{top,hem,gap,clear:.026,floor:robeFloor(ctx,.02),armK:.7,slot:S.main,
      profile:[[.1,.34,.27],[.9,.31,.2],[1.2,.28,.15],[1.4,.21,.12],[1.5,.13,.09],[1.535,.085,.08]],
      flat:(phi,y)=>{const a=Math.abs(wrap(phi)),g=gap(y);return smooth(g+.3,g+.7,a)*lerp(1,smooth(.7,1,Math.PI-a),smooth(.9,1.05,y));}});
    const rows=[10,16,24,32][rank],paint=(V,u,s,p)=>V.paint(gold,p.shade);
    for(const m of [1,-1])patch(ctx,rows,rank>=3?3:2,(u,s)=>{
      const y=lerp(top-.006,hem+.012,s),g=gap(y),e=at(m>0?g:TAU-g,y),w=u*.09/(Math.hypot(e.x,e.z)||.1);
      return at(m>0?g+w:TAU-g-w,y);
    },paint,at.weights,.005);
    if(rank>=1)patch(ctx,2,[0,12,18,24][rank],(u,s)=>{const y=lerp(top-.006,top-.06,s),g=gap(y);return at(lerp(g,TAU-g,u),y);},
      paint,at.weights,.006);
    const onShield=(w,d,q)=>{const a=lerp(-Math.PI/2,Math.PI/2,q),x=w*Math.sin(a),y=1.47-d*Math.cos(a);return at(shellX(at,x,y,true),y);};
    patch(ctx,[3,5,8,12][rank],[6,10,14,20][rank],(u,s)=>onShield(s*.17,s*.47,u),(V,u,s,p)=>V.paint(S.main,p.shade*.94),at.weights,.005);
    if(rank>=1)patch(ctx,[0,10,16,24][rank],rank>=3?2:1,(u,s)=>{const k=.025*(1-u);return onShield(.17-k,.47-k,s);},paint,at.weights,.007);
    // The morse bridges the two edges on the chest; Detailed and up set a jewel in it.
    const zE=at(gap(1.35),1.35).z+.006;
    patch(ctx,2,rank>=2?4:2,(u,s)=>{const x=lerp(-.05,.05,u),l=Math.hypot(6*x,1);return {x,y:lerp(1.32,1.38,s),z:zE-3*x*x,nx:6*x/l,ny:0,nz:1/l,phi:0};},
      V=>V.paint(gold),at.weights,.003);
    if(rank>=2){
      const jewel=slot('#9a1f2f',GOLD,{gloss:.9});
      stud(ctx,{x:0,y:1.35,z:zE+.003,nx:0,ny:0,nz:1},.011,V=>V.paint(jewel),V=>at.weights(V,{phi:0,x:0,y:1.35}),.6);
    }
    return at;
  }
  // The front of the figure as a height field z(x, y), for things lying on it and hanging from the chest (stoles): the body
  // (over the alb) above the waist, below it the robe with its deepest folds, and never falling back in under the chest.
  function frontHang(ctx){
    const robe=ctx.robe,X0=-.22,DX=.01,NX=45,Y1=1.54,DH=.02,NH=63,Z=new Float32Array(NX*NH),line=new Float32Array(98),p={x:0,z:0,r:0,u:0};
    for(let i=0;i<NH;i++){
      const y=Y1-i*DH,o=i*NX;
      if(y>=.99||!robe)for(let q=0;q<NX;q++)Z[o+q]=bodyAt(ctx,X0+q*DX,y,.016).z;
      else{
        const spec=robe.spec;
        for(let q=0;q<49;q++){
          skirtPoint(ctx,spec,lerp(-1.3,1.3,q/48),y,p);
          const k=(p.r+foldDepth(ctx.level,p.u)*(spec.fold??1)+.006)/p.r;line[2*q]=p.x*k;line[2*q+1]=p.z*k;
        }
        for(let q=0,e=0;q<NX;q++){
          const x=X0+q*DX;
          while(e<47&&line[2*e+2]<x)e++;
          const xa=line[2*e],xb=line[2*e+2];
          Z[o+q]=x<=xa?line[2*e+1]:x>=xb?line[2*e+3]:lerp(line[2*e+1],line[2*e+3],(x-xa)/(xb-xa));
        }
      }
      if(y<1.32&&i)for(let q=0;q<NX;q++)Z[o+q]=Math.max(Z[o+q],Z[o-NX+q]);
    }
    const zAt=(x,y)=>{
      const fx=clamp((x-X0)/DX,0,NX-1),fy=clamp((Y1-y)/DH,0,NH-1),ix=Math.min(NX-2,Math.floor(fx)),iy=Math.min(NH-2,Math.floor(fy));
      const wx=fx-ix,wy=fy-iy,o=iy*NX+ix;
      return lerp(lerp(Z[o],Z[o+1],wx),lerp(Z[o+NX],Z[o+NX+1],wx),wy);
    };
    return(x,y,lift=0)=>{
      const z=zAt(x,y),dx=(zAt(x+.005,y)-zAt(x-.005,y))/.01,dy=(zAt(x,y+.005)-zAt(x,y-.005))/.01,l=Math.hypot(dx,dy,1);
      const nx=-dx/l,ny=-dy/l,nz=1/l;
      return {x:x+nx*lift,y:y+ny*lift,z:z+nz*lift,nx,ny,nz};
    };
  }
  // The stole, seen in front where the cope is open: the Priest's hangs from the neck down both sides, with gold ends and
  // crosses; the Deacon's runs from the left shoulder across to the right hip, where its ends hang.
  function stole(ctx,deacon){
    const {S,level}=ctx,rank=level.rank,hang=frontHang(ctx),gold=V=>V.paint(S.gold),weights=(V,p)=>robeWeights(V,p.x,p.y);
    const cloth=(V,u)=>V.paint(S.main,rank?1-.12*(2*u-1)**2:1),rows=[8,14,20,26][rank],cols=rank>=2?3:2;
    if(!deacon){
      for(const m of [1,-1]){
        const cx=y=>m*lerp(.068,.092,smooth(1.5,.6,y)),w=y=>lerp(.062,.09,smooth(.66,.52,y));
        patch(ctx,rows,cols,(u,s)=>{const y=lerp(1.53,.5,s);return hang(cx(y)+(u-.5)*w(y),y);},cloth,weights,.004);
        if(rank>=1)patch(ctx,1,2,(u,s)=>{const y=lerp(.535,.505,s);return hang(cx(y)+(u-.5)*w(y),y,.004);},gold,weights,.003);
        if(rank>=2){
          const x0=cx(.62);
          patch(ctx,2,1,(u,s)=>hang(x0+(u-.5)*.012,lerp(.65,.59,s),.004),gold,weights,.003);
          patch(ctx,1,2,(u,s)=>hang(x0+(u-.5)*.04,lerp(.638,.626,s),.004),gold,weights,.0035);
        }
      }
      return;
    }
    const A=[.12,1.47],dx=-.25,dy=-.49,L=Math.hypot(dx,dy),px=-dy/L,py=dx/L;
    patch(ctx,rows,cols,(u,s)=>{const k=(u-.5)*.07;return hang(A[0]+dx*s+px*k,A[1]+dy*s+py*k);},cloth,weights,.004);
    patch(ctx,Math.max(2,rows>>1),cols,(u,s)=>hang(lerp(-.13,-.14,s)+(u-.5)*.075,lerp(1,.68,s)),cloth,weights,.006);
    if(rank>=1)patch(ctx,1,2,(u,s)=>hang(-.14+(u-.5)*.075,lerp(.715,.685,s),.006),gold,weights,.003);
  }
  // The humeral veil (Benediction) or a server's vimp: a cape round the shoulders whose ends wrap the arms and hands.
  // under: the shells it must hang over.
  function humeral(ctx,layer,under){
    const {S,level,rig}=ctx;
    into(ctx,'body',layer);
    shell(ctx,{top:1.535,hem:1.15,gap:.9,clear:.03,fold:.5,armK:.5,slot:S.veil,
      profile:[[1.15,.3,.2],[1.4,.28,.16],[1.46,.26,.14],[1.5,.17,.11],[1.535,.085,.085]],
      floor:under.length?(phi,y)=>{let r=0;for(const at of under)r=Math.max(r,at.outer(phi,y));return r?r+.01:0;}:null});
    into(ctx,'limbs',layer);
    for(const m of [1,-1]){
      const side=SIDE[m],x=m*rig.sx;
      tube(ctx,[[x,1.4,0],[x,1.05,0],[x,.7,0]],s=>lerp(.07,.075,s),Math.max(8,level.around),V=>V.paint(S.veil),V=>{
        const dy=V.y-rig.shoulderY,cl=.5*smooth(-.02,.05,dy),f=smooth(-.26,-.34,dy),h=smooth(-.5,-.58,dy);
        V.bone(side.clav,cl).bone(side.arm,(1-cl)*(1-f)).bone(side.fore,(1-cl)*f*(1-h)).bone(side.hand,(1-cl)*f*h);
      },{caps:true});
    }
  }
  // Vestments over the alb: the chasuble or dalmatic (layer mass), the cope with the stole showing under it (layer cope) and
  // the humeral veil (layer veil). The runtime shows the layers each rite needs.
  function vested(ctx,garment){
    robeBase(ctx,false);
    into(ctx,'body','mass');const mass=garment(ctx);
    into(ctx,'body','cope');const cloak=cope(ctx);
    ctx.mass=mass;ctx.cloak=cloak;
    stole(ctx,ctx.app.outfit.kind==='dalmatic');
    humeral(ctx,'veil',[mass,cloak]);
  }
  OUTFITS.chasuble=ctx=>vested(ctx,chasuble);
  OUTFITS.dalmatic=ctx=>vested(ctx,dalmatic);
  OUTFITS.alb=ctx=>{robeBase(ctx,false);if(VIMP_ROLES.includes(ctx.app.role))humeral(ctx,'vimp',[]);};

  const materialCache=new Map(),sharedMaterials=new WeakSet(),materialList=new Set();
  const normalMaps=new Map();
  function normalMap(kind,repeat){
    const T=three(),key=kind+':'+repeat;
    if(normalMaps.has(key))return normalMaps.get(key);
    const size=128,data=new Uint8Array(size*size*4),height=new Float32Array(size*size),seed=kind==='skin'?517:kind==='cloth'?811:1093;
    const rnd=peopleRandom(seed);
    const pores=[];
    if(kind==='skin')for(let i=0;i<420;i++)pores.push([rnd()*size,rnd()*size,1+rnd()*2,rnd()]);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      let h=0;
      if(kind==='skin'){
        h=.5+.09*Math.sin(x*.71+y*.37)+.07*Math.sin(x*.19-y*.53);
        for(const p of pores){const dx=Math.min(Math.abs(x-p[0]),size-Math.abs(x-p[0])),dy=Math.min(Math.abs(y-p[1]),size-Math.abs(y-p[1])),d=Math.hypot(dx,dy);h-=.19*Math.exp(-d*d/(2*p[2]*p[2]));}
      }else if(kind==='cloth'){
        const a=Math.abs(Math.sin(x*Math.PI/8)),b=Math.abs(Math.sin(y*Math.PI/8));
        h=.32+.35*Math.max(a,b)+.12*a*b;
      }else h=.5+.27*Math.sin(x*.29+Math.sin(y*.08)*.7)+.09*Math.sin(x*.61);
      height[y*size+x]=clamp(h,0,1);
    }
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const xm=(x+size-1)%size,xp=(x+1)%size,ym=(y+size-1)%size,yp=(y+1)%size;
      const nx=-(height[y*size+xp]-height[y*size+xm])*1.2,ny=-(height[yp*size+x]-height[ym*size+x])*1.2;
      const inv=1/Math.hypot(nx,ny,1),i=(y*size+x)*4;
      data[i]=Math.round((nx*inv*.5+.5)*255);data[i+1]=Math.round((ny*inv*.5+.5)*255);
      data[i+2]=Math.round((inv*.5+.5)*255);data[i+3]=255;
    }
    const tex=new T.DataTexture(data,size,size,T.RGBAFormat);
    tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;
    tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;
    tex.repeat.set(repeat,repeat);tex.needsUpdate=true;
    normalMaps.set(key,tex);return tex;
  }
  function material(level,bucket){
    const T=three(),key=level.rank+':'+bucket;
    if(materialCache.has(key))return materialCache.get(key);
    const gold=bucket==='gold',kind=bucket==='skin'?'skin':bucket==='hair'?'hair':'cloth';
    const m=level.blocks?new T.MeshLambertMaterial({vertexColors:true,skinning:true}):new T.MeshStandardMaterial({vertexColors:true,skinning:true,side:T.DoubleSide,
      roughness:gold?.35:bucket==='skin'?.55:bucket==='hair'?.45:.85,
      metalness:gold?.35:0});
    m.userData.peopleRank=level.rank;m.userData.peopleBucket=bucket;
    if(level.rank===3&&!gold)m.normalMap=normalMap(kind,kind==='skin'?14:kind==='hair'?9:22);
    if(level.rank>=2)m.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float gloss;\nvarying float vPeopleGloss;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvPeopleGloss=gloss;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vPeopleGloss;')
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=1.0-0.7*vPeopleGloss;');
    };
    if(level.rank>=2)m.customProgramCacheKey=()=>'people-gloss';
    sharedMaterials.add(m);materialList.add(m);materialCache.set(key,m);return m;
  }
  function setEnvironment(tex){
    environment=tex||null;
    for(const m of materialList){
      const gold=m.userData.peopleBucket==='gold';
      const use=!!environment&&(gold||m.userData.peopleRank>=2);
      const changed=!!m.envMap!==use;
      m.envMap=use?environment:null;
      if(gold){m.metalness=environment?.8:.35;m.envMapIntensity=.8;}
      else if(use)m.envMapIntensity=.25;
      if(changed)m.needsUpdate=true;
    }
  }
  function buildBlocks(app,level){
    const b=new Build(level),ctx={b,app,rig:rig(app),S:slots(app),level},S=ctx.S;
    const robed=app.vest!=='lay',vested=app.vest==='chasuble'||app.vest==='dalmatic';
    const robe=robed?S.robe:S.main,leg=robed?S.robe:app.outfit.skirt||app.outfit.kind==='dress'?S.main:S.second;
    const block=(region,layer,centre,size,paint,bone)=>{
      into(ctx,region,layer);b.block(centre,size,paint,bone);
    };
    block('body','base',[0,1.27,0],[.33,.46,.22],robe,B.chest);
    block('body','base',[0,.98,0],[.31,.16,.22],leg,B.hips);
    block('head','base',[0,1.56,0],[.075,.1,.075],S.skin,B.neck);
    block('head','base',[0,1.735,.015],[.18,.24,.17],S.skin,B.head);
    block('head','base',[0,1.845,.01],[.19,.045,.18],S.hair,B.head);
    for(const m of [1,-1]){
      const s=SIDE[m],sleeve=vested?S.robe:S.main;
      block('limbs','base',[m*ctx.rig.sx,1.315,0],[.095,.3,.11],sleeve,s.arm);
      block('limbs','base',[m*ctx.rig.sx,1.04,0],[.08,.25,.09],sleeve,s.fore);
      block('limbs','base',[m*ctx.rig.sx,.86,.01],[.07,.11,.06],S.skin,s.hand);
      block('limbs','base',[m*ctx.rig.hx,.72,0],[robed?.17:.12,.42,.15],leg,s.thigh);
      block('limbs','base',[m*ctx.rig.hx,.295,0],[robed?.17:.1,.43,.14],leg,s.shin);
      block('limbs','base',[m*ctx.rig.hx,.045,.045],[.11,.08,.23],S.shoe,s.foot);
      if(VIMP_ROLES.includes(app.role)||vested){
        block('limbs',vested?'veil':'vimp',[m*ctx.rig.sx,1.315,.065],[.11,.3,.035],S.veil,s.arm);
        block('limbs',vested?'veil':'vimp',[m*ctx.rig.sx,1.04,.065],[.1,.25,.035],S.veil,s.fore);
      }
    }
    if(robed){
      block('body','cincture',[0,1.02,0],[.35,.025,.24],slot('#f4f2ea',CLOTH,{main:true}),B.spine);
      block('body','pectoral',[0,1.33,.125],[.012,.11,.012],S.gold,B.chest);
      block('body','pectoral',[0,1.35,.125],[.065,.012,.012],S.gold,B.chest);
    }
    if(vested){
      block('body','mass',[0,1.275,0],[.42,.48,.27],S.main,B.chest);
      block('body','mass',[0,.84,0],[.43,.39,.29],S.main,B.hips);
      block('body','cope',[0,1.27,-.11],[.44,.5,.13],S.main,B.chest);
      block('body','cope',[0,.66,-.1],[.46,.75,.13],S.main,B.hips);
      block('head','bishop',[0,1.97,.01],[.2,.23,.18],S.veil,B.head);
    }
    return {parts:finish(b),ctx,triangles:b.triangles};
  }
  function buildParts(app,level){
    if(level.blocks)return buildBlocks(app,level);
    const b=new Build(level),ctx={b,app,rig:rig(app),S:slots(app),shape:bodyShape(app),headAt:headShape(app,level),
      level,style:HAIR_STYLES[app.hair?.style]||HAIR_STYLES.short};
    clothe(ctx);into(ctx,'limbs');hands(ctx);
    into(ctx,'head');head(ctx);ears(ctx);eyes(ctx);brows(ctx);hair(ctx);beard(ctx);glasses(ctx);
    accessories(ctx);
    return {parts:finish(b),ctx,triangles:b.triangles};
  }
  function levelOf(value){
    if(value&&typeof value==='object'&&Number.isFinite(value.rank))return value;
    return PEOPLE_LEVELS[value]||PEOPLE_LEVELS.natural;
  }
  function hexOf(value){
    if(typeof value==='number')return '#'+(value>>>0).toString(16).padStart(6,'0').slice(-6);
    if(typeof value==='string'&&/^#?[0-9a-f]{6}$/i.test(value))return value[0]==='#'?value:'#'+value;
    return '#808080';
  }

  function cross(ctx,layer,cx,cy,cz,h,w,r,weights){
    const {S}=ctx,cols=4;
    into(ctx,'body',layer);
    const paint=V=>V.paint(S.gold),bone=weights||((V)=>V.bone(B.chest,1));
    tube(ctx,[[cx,cy-h/2,cz],[cx,cy+h/2,cz]],r,cols,paint,bone,{caps:true});
    tube(ctx,[[cx-w/2,cy+.18*h,cz],[cx+w/2,cy+.18*h,cz]],r,cols,paint,bone,{caps:true});
  }
  function necklace(ctx,layer,yTop,r,shells){
    const {S,level,shape}=ctx,n=[0,16,24,32][level.rank];
    if(!n)return;
    into(ctx,'body',layer);
    const pts=[];
    for(let i=0;i<=n;i++){
      const theta=TAU*i/n,y=lerp(yTop,1.525,smooth(0,1.3,Math.abs(wrap(theta))));
      const body=shape(theta,y,.014+r);let p={x:body.x,y,z:body.z};
      for(const at of shells||[])if(y<=at.top(theta)&&y>=at.hem(theta)){
        const q=at(theta,y,.002+r);
        if(!Number.isFinite(q.x)||!Number.isFinite(q.y)||!Number.isFinite(q.z))continue;
        if(Math.hypot(q.x,q.z)>Math.hypot(p.x,p.z))p=q;
      }
      pts.push([p.x,p.y,p.z]);
    }
    tube(ctx,pts,r,4,V=>V.paint(S.gold),V=>V.bone(B.chest,.7).bone(B.spine,.3),{caps:false,loop:true});
  }
  function cincture(ctx){
    if(ctx.app.outfit.kind!=='alb')return;
    const {S,level}=ctx,r=[.008,.007,.006,.006][level.rank],n=Math.max(12,level.torso),floor=ctx.robe&&ctx.robe.spec;
    if(!floor)return;
    const at=robeFloor(ctx,.003),points=[];
    for(let i=0;i<=n;i++){
      const phi=TAU*i/n,y=1.02,outer=Math.max(bodyRadius(ctx,phi,y,.012),at(phi,.995));
      points.push([outer*Math.sin(phi),y,outer*Math.cos(phi)]);
    }
    into(ctx,'body','cincture');
    const white=slot('#f4f2ea',CLOTH,{main:true});
    tube(ctx,points,r,n,V=>V.paint(white,.88+.12*Math.sin(TAU*V.u)),V=>V.bone(B.hips,.55).bone(B.spine,.45),{loop:true});
    for(const phi of [.55,.68]){
      const outer=Math.max(bodyRadius(ctx,phi,1.02,.012),at(phi,.995));
      const p=[outer*Math.sin(phi),1.02,outer*Math.cos(phi)];
      const end=[];
      for(let j=0;j<=5;j++){const s=j/5,y=lerp(1.015,.56,s),d=Math.max(bodyRadius(ctx,phi,y,.012),at(phi,y))+r;
        end.push([Math.sin(phi)*d,y,Math.cos(phi)*d]);}
      tube(ctx,end,r*.72,Math.max(8,n>>1),V=>V.paint(white),V=>V.bone(B.spine,.6).bone(B.hips,.4),{caps:true});
      if(level.rank>=2)tube(ctx,[end[end.length-1], [end[end.length-1][0],.535,end[end.length-1][2]]],.013,8,
        V=>V.paint(white),V=>V.bone(B.hips,1),{caps:true});
    }
  }
  function pectoral(ctx){
    if(ctx.app.role!=='S')return;
    const {level,shape}=ctx,r=.004;
    const p=shape(0,1.3,.016);
    if(level.rank>=1)necklace(ctx,'pectoral',1.47,.0025,[]);
    cross(ctx,'pectoral',0,1.3,p.z+r,.06,.04,r,V=>V.bone(B.chest,1));
  }
  function bishop(ctx){
    if(!['chasuble','dalmatic'].includes(ctx.app.outfit.kind))return;
    const {S,level,style,headAt}=ctx,rows=[3,4,6,8][level.rank]+1,cols=level.head[0];
    into(ctx,'head','bishop');
    const thick=style.bald?.003:style.thick[0]*1.3+(style.curl||0)+.003;
    const purple=slot('#7b2a6e',CLOTH,{main:true});
    bishopCap(ctx,rows,cols,thick,purple,headAt);
    const mass=ctx.mass,cloak=ctx.cloak;
    if(mass)cross(ctx,'bishopMass',0,1.24,mass(0,1.24,.008).z,.09,.06,.0055,V=>V.bone(B.chest,1));
    cross(ctx,'bishopCope',0,1.24,ctx.shape(0,1.24,.021).z,.09,.06,.0055,V=>V.bone(B.chest,1));
    necklace(ctx,'bishopMass',1.46,.0025,mass?[mass]:[]);
    necklace(ctx,'bishopCope',1.46,.0025,cloak?[cloak]:[]);
  }
  function bishopCap(ctx,rows,cols,thick,purple,headAt){
    ctx.b.grid(rows,cols,(V,s,t,i)=>{
      const v=lerp(.122,.07,s),offset=lerp(thick,thick*.4,smooth(.78,1,s));
      const p=headAt(TAU*t,v,offset);
      V.at(p.x,p.y,p.z).paint(purple,.92+.08*Math.sin(TAU*t*4)).bone(B.head,1);
      V.hx=p.nx;V.hy=p.ny;V.hz=p.nz;
    },{hint:true});
  }
  function accessories(ctx){
    cincture(ctx);pectoral(ctx);bishop(ctx);
  }

  const propMaterials={};
  function propMaterial(name,colour,kind='standard'){
    const T=three();if(propMaterials[name])return propMaterials[name];
    const m=kind==='basic'?new T.MeshBasicMaterial({color:colour}):new T.MeshStandardMaterial({color:colour,roughness:.8});
    propMaterials[name]=m;return m;
  }
  function handProp(type){
    const T=three(),g=new T.Group();
    if(type==='candle'){
      const wax=new T.Mesh(new T.CylinderGeometry(.011,.011,.24,10),propMaterial('wax','#f7f1df'));
      wax.position.y=.06;g.add(wax);
      const guard=new T.Mesh(new T.CylinderGeometry(.04,.04,.002,16),propMaterial('drip','#f4e5c5'));
      guard.position.y=.035;g.add(guard);
      const flame=new T.Mesh(new T.SphereGeometry(.016,8,6),propMaterial('flame','#ffc84a','basic'));
      flame.position.y=.205;flame.scale.set(1,1.7,1);flame.userData.flame=true;g.add(flame);g.userData.flame=flame;
    }else{
      const stem=new T.Mesh(new T.CylinderGeometry(.005,.006,.42,6),propMaterial('palm-stem','#3d7137'));
      stem.position.y=.08;g.add(stem);
      const frond=new T.Mesh(new T.ConeGeometry(.07,.32,4),propMaterial('palm-leaf','#4e8a47'));
      frond.material.side=T.DoubleSide;frond.position.y=.36;frond.scale.z=.3;g.add(frond);
    }
    g.position.set(.03,-.075,0);g.visible=false;return g;
  }
  function defineToggle(figure,name,layer){
    let value=!!figure.shown[layer];
    const control={get visible(){return value;},set visible(v){v=!!v;if(v===value)return;value=v;figure.shown[layer]=v;showLayers(figure);}};
    Object.defineProperty(figure,name,{enumerable:true,configurable:true,get(){return control;}});
    return control;
  }
  function showLayers(figure){
    for(const mesh of figure.meshes){
      const layer=mesh.userData.peopleLayer;
      if(layer==='base')mesh.visible=true;
      else if(layer==='mass')mesh.visible=!figure.shown.cope;
      else if(layer==='bishopMass')mesh.visible=figure.shown.bishop&&!figure.shown.cope;
      else if(layer==='bishopCope')mesh.visible=figure.shown.bishop&&figure.shown.cope;
      else mesh.visible=!!figure.shown[layer];
    }
  }
  const noop=()=>{};
  const BOXES={stand:[-.3,0,-.25,.3,1.92,.3],sit:[-.3,0,-.4,.3,1.5,.62],kneel:[-.3,0,-.5,.3,1.5,.35]};
  function hitTest(raycaster,intersects){
    const T=three(),inverse=new T.Matrix4(),localRay=new T.Ray(),box=new T.Box3(),point=new T.Vector3();
    inverse.copy(this.matrixWorld).invert();localRay.copy(raycaster.ray).applyMatrix4(inverse);
    const boxData=this.userData.peopleBox||BOXES.stand;
    box.min.set(boxData[0],boxData[1],boxData[2]);box.max.set(boxData[3],boxData[4],boxData[5]);
    const p=localRay.intersectBox(box,point);if(!p)return;
    const world=p.clone().applyMatrix4(this.matrixWorld),distance=world.distanceTo(raycaster.ray.origin);
    if(distance<raycaster.near||distance>raycaster.far)return;
    intersects.push({distance,point:world,object:this});
  }
  function createFigure(options={}){
    const T=three(),app=options.app||peopleAppearance(options),level=levelOf(options.level||PEOPLE_LEVELS.natural);
    const root=new T.Group();root.name='person';
    const groups={body:new T.Group(),limbs:new T.Group(),head:new T.Group()};
    for(const group of Object.values(groups))root.add(group);
    const info=makeBones(rig(app));root.add(info.bones[0]);
    const figure={root,head:groups.head,body:groups.body,limbs:groups.limbs,headBone:info.bones[B.head],
      torso:info.bones[B.spine],chest:info.bones[B.chest],arms:[info.bones[B.armR],info.bones[B.armL]],
      legs:[info.bones[B.thighR],info.bones[B.thighL]],role:app.role,crowd:!!options.crowd,castShadow:options.castShadow===undefined?!options.crowd:!!options.castShadow,
      colour:hexOf(app.outfit.main),cinctureColour:'#f4f2ea',
      shown:{cope:false,veil:false,vimp:VIMP_ROLES.includes(app.role),cincture:true,pectoral:false,bishop:false},
      meshes:[],parts:[],level,target:level,triangles:0,app,skeleton:info.skeleton,bones:info.bones,rest:info.rest,disposed:false};
    figure._rig=rig(app);
    root.userData.role=figure.role;root.userData.peopleBox=BOXES.stand;root.raycast=hitTest;
    for(const name of ['cope','veil','vimp','bishop','pectoral','cincture'])defineToggle(figure,name,name);
    figure.cincture.setColour=hex=>{figure.cinctureColour=hexOf(hex);paintLayer(figure,'cincture',figure.cinctureColour);};
    figure.handCandle=handProp('candle');figure.handPalm=handProp('palm');
    info.bones[B.handR].add(figure.handCandle,figure.handPalm);
    rebuild(figure,level);
    return figure;
  }

  function clear(figure){
    for(const mesh of figure.meshes){
      mesh.parent&&mesh.parent.remove(mesh);mesh.geometry.dispose();
      const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      for(const m of mats)if(m&&!sharedMaterials.has(m)){
        if(m.userData?.fadeMaterial&&!sharedMaterials.has(m.userData.fadeMaterial))m.userData.fadeMaterial.dispose();
        if(m.userData?.solidMaterial&&!sharedMaterials.has(m.userData.solidMaterial))m.userData.solidMaterial.dispose();
        m.dispose();
      }
    }
    figure.meshes.length=0;figure.parts.length=0;
  }
  function rebuild(figure,value){
    if(figure.disposed)return figure;
    const T=three(),level=levelOf(value),built=buildParts(figure.app,level);
    clear(figure);figure.level=figure.target=level;figure.parts=built.parts;figure.triangles=built.triangles;
    const region={body:figure.body,limbs:figure.limbs,head:figure.head};
    for(const part of figure.parts){
      const mesh=new T.SkinnedMesh(part.geometry,material(level,part.bucket));
      mesh.geometry.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.3);
      mesh.bind(figure.skeleton,new T.Matrix4());
      mesh.raycast=noop;mesh.castShadow=!level.blocks&&figure.castShadow&&(!figure.crowd||level.crowdShadows);mesh.receiveShadow=!level.blocks;
      mesh.userData.peopleLayer=part.layer;mesh.userData.peoplePart=part;
      region[part.region].add(mesh);figure.meshes.push(mesh);
    }
    showLayers(figure);recolour(figure,figure.colour);
    if(figure.cinctureColour!=='#f4f2ea')paintLayer(figure,'cincture',figure.cinctureColour);
    return figure;
  }
  function paintLayer(figure,layer,hex){
    const c=lin(hexOf(hex));
    for(const mesh of figure.meshes){
      const part=mesh.userData.peoplePart;if(part.layer!==layer)continue;
      const a=part.geometry.attributes.color.array;
      for(let i=0;i<part.main.length;i++){
        const k=part.main[i],s=part.shade[i];a[k*3]=Math.round(clamp(c[0]*s,0,1)*65535);
        a[k*3+1]=Math.round(clamp(c[1]*s,0,1)*65535);a[k*3+2]=Math.round(clamp(c[2]*s,0,1)*65535);
      }
      part.geometry.attributes.color.needsUpdate=true;
    }
  }
  function recolour(figure,hex){
    figure.colour=hexOf(hex);
    for(const mesh of figure.meshes){
      const part=mesh.userData.peoplePart;if(part.layer==='cincture')continue;
      const c=lin(figure.colour),a=part.geometry.attributes.color.array;
      for(let i=0;i<part.main.length;i++){
        const k=part.main[i],s=part.shade[i];a[k*3]=Math.round(clamp(c[0]*s,0,1)*65535);
        a[k*3+1]=Math.round(clamp(c[1]*s,0,1)*65535);a[k*3+2]=Math.round(clamp(c[2]*s,0,1)*65535);
      }
      part.geometry.attributes.color.needsUpdate=true;
    }
    return figure;
  }
  const queue=[];
  function schedule(figure,value){
    if(!figure||figure.disposed)return;
    figure.target=levelOf(value);
    if(figure.root.userData.gfxHidden)return;
    if(!queue.includes(figure))queue.push(figure);
    queue.sort((a,b)=>(a.crowd?1:0)-(b.crowd?1:0));
  }
  function pump(budget=8){
    let used=0;
    while(queue.length&&(used===0||used<budget)){
      const figure=queue.shift();if(!figure||figure.disposed||figure.root.userData.gfxHidden||figure.level===figure.target)continue;
      rebuild(figure,figure.target);used++;
    }
    return used;
  }
  function pending(){return queue.length;}
  function dispose(figure){
    if(!figure||figure.disposed)return;
    const i=queue.indexOf(figure);if(i>=0)queue.splice(i,1);
    clear(figure);figure.skeleton.dispose();figure.disposed=true;
  }

  const T3=three();
  const temp={v:new T3.Vector3(),a:new T3.Vector3(),b:new T3.Vector3(),c:new T3.Vector3(),d:new T3.Vector3(),
    e0:new T3.Vector3(),e1:new T3.Vector3(),e2:new T3.Vector3(),e3:new T3.Vector3(),e4:new T3.Vector3(),
    q:new T3.Quaternion(),q2:new T3.Quaternion(),q3:new T3.Quaternion(),q4:new T3.Quaternion(),identity:new T3.Quaternion(),
    matrix:new T3.Matrix4(),e:new T3.Euler(),W:[0,0,0]};
  const POSES={
    prayer:[[.028,1.2,.2],[-.05,.8,.6],[-1,0,0],.05],
    clasped:[[.05,1,.17],[-.8,-.4,.3],[-.2,.4,-1],.6],
    relaxed:[[.2,.93,.04],[.05,-1,.12],[-1,0,.15],.3],
    orans:[[.5,1.4,.26],[.35,.85,.3],[-.25,.1,1],.1],
    raises:[[.06,1.8,.3],[-.2,.9,.4],[-1,0,0],.3],
    shows:[[.07,1.45,.38],[-.25,.6,.75],[-1,0,0],.3],
    extended:[[.12,1.22,.45],[0,-.25,1],[0,-1,0],.1],
    altar:[[.09,1.15,.38],[-.25,-.35,.9],[-.5,-.85,0],.5],
    carry:[[.09,1.2,.26],[-.35,0,.95],[-.3,.95,0],.4],
    lap:[[.12,1.03,.24],[-.15,-.3,1],[0,-1,0],.35],
    breast:[[.05,1.25,.2],[-.9,.3,0],[0,0,-1],.1],
    hold:[[.16,1.12,.3],[-.25,-.05,1],[-1,0,-.15],1.2],
    shake:[[.17,1.1,.42],[0,-.1,1],[-1,0,0],.3]
  };
  const BLESS_PATH=[[-.14,1.55,.38],[-.14,1.2,.38],[.02,1.37,.38],[-.3,1.37,.38],[-.14,1.55,.38]];
  const BLESS_TIMES=[0,.35,.45,.8,1],BLESS_DIR=[0,.95,.3],BLESS_NORMAL=[.7,0,.7];
  const SIGN_PATH=[[-.03,1.64,.21],[-.03,1.2,.24],[.06,1.32,.24],[-.12,1.32,.24],[-.03,1.64,.21]];
  const SIGN_DIRS=[[0,.75,-.66],[0,.6,-.8],[.35,.6,-.7],[-.2,.6,-.75]],SIGN_NORMAL=[0,0,-1];
  function rot(bone,x=0,y=0,z=0,order='XYZ'){
    temp.e.set(x,y,z,order);bone.quaternion.setFromEuler(temp.e);
  }
  function aim(figure,m,W,D,N,curl){
    const side=SIDE[m],bones=figure.bones,rest=figure.rest;
    const clav=bones[side.clav],arm=bones[side.arm],fore=bones[side.fore],hand=bones[side.hand];
    const qC=temp.q.copy(clav.quaternion),start=temp.v.fromArray(rest[side.clav]);
    start.add(temp.a.fromArray(rest[side.arm]).applyQuaternion(qC));
    const target=temp.b.set(m*W[0],W[1]-1.3,W[2]);
    const direction=temp.c.subVectors(target,start),distance=clamp(direction.length(),.12,.548);
    if(direction.lengthSq()<1e-10)direction.set(0,-1,0);else direction.normalize();
    target.copy(start).addScaledVector(direction,distance);
    const pole=temp.d.set(m*.5,-1,-.35).addScaledVector(direction,-temp.d.dot(direction));
    if(pole.lengthSq()<1e-8)pole.set(0,0,1).addScaledVector(direction,-direction.z);
    pole.normalize();
    const L1=.3,L2=.25,a=(L1*L1-L2*L2+distance*distance)/(2*distance),h=Math.sqrt(Math.max(0,L1*L1-a*a));
    const elbow=temp.e0.copy(start).addScaledVector(direction,a).addScaledVector(pole,h);
    const up=temp.e1.subVectors(elbow,start).normalize().negate();
    const z=temp.e2.copy(pole).addScaledVector(up,-pole.dot(up));
    if(z.lengthSq()<1e-8)z.set(0,0,1).addScaledVector(up,-up.z);
    z.normalize();const x=temp.e3.crossVectors(up,z).normalize();
    temp.matrix.makeBasis(x,up,z);const qUpper=temp.q2.setFromRotationMatrix(temp.matrix);
    arm.quaternion.copy(qC).invert().multiply(qUpper);

    const foreDirection=temp.e4.subVectors(target,elbow).normalize();
    const foreUp=temp.e1.copy(foreDirection).negate();
    const foreZ=temp.e2.copy(pole).addScaledVector(foreUp,-pole.dot(foreUp)).normalize();
    const foreX=temp.e3.crossVectors(foreUp,foreZ).normalize();
    temp.matrix.makeBasis(foreX,foreUp,foreZ);const qFore=temp.q3.setFromRotationMatrix(temp.matrix);
    fore.quaternion.copy(qUpper).invert().multiply(qFore);

    const handY=temp.e1.set(-m*D[0],-D[1],-D[2]).normalize();
    const handX=temp.e2.set(-m*N[0],-N[1],-N[2]).addScaledVector(handY,temp.e2.dot(handY)*-1);
    if(handX.lengthSq()<1e-8)handX.set(1,0,0).addScaledVector(handY,-handY.x);
    handX.normalize();const handZ=temp.e3.crossVectors(handX,handY).normalize();
    handX.crossVectors(handY,handZ).normalize();
    temp.matrix.makeBasis(handX,handY,handZ);const qHand=temp.q4.setFromRotationMatrix(temp.matrix);
    const relative=temp.identity.copy(qFore).invert().multiply(qHand);
    const angle=2*Math.acos(clamp(Math.abs(relative.w),0,1));
    if(angle>1.45){temp.q.identity();relative.slerp(temp.q,1-1.45/angle);}
    hand.quaternion.copy(qFore).multiply(relative);
    rot(bones[side.fing],0,0,-m*curl);
  }
  function pose(figure,posture='stand',action='',phase=0,walking=false,orans=false,extra={}){
    if(!figure||figure.disposed)return;
    const T=three(),root=figure.root,scale=root.scale.y||1,b=figure.bones,rest=figure.rest,app=figure.app;
    for(let i=0;i<b.length;i++){b[i].position.fromArray(rest[i]);b[i].quaternion.identity();}
    const sitting=/sit/i.test(action)||posture==='sit',genuflect=/genuflect/i.test(action),kneeling=posture==='kneel'||/kneels/i.test(action);
    if(sitting){
      b[B.hips].position.y=(extra.seat??.535)/scale+.13;b[B.hips].position.z=-(extra.back??(extra.pew?.28:.05))/scale;
      for(const m of [1,-1]){
        const s=SIDE[m],hipY=b[B.hips].position.y-.05;
        const delta=Math.asin(clamp((hipY-.08-.43)/.42,0,1)),knee=hipY-.42*Math.sin(delta),gamma=Math.acos(clamp((knee-.08)/.43,0,1));
        rot(b[s.thigh],-(Math.PI/2-delta),0,m*.06);rot(b[s.shin],Math.PI/2-delta-gamma,0,-m*.06);rot(b[s.foot],gamma);
      }
    }else if(genuflect){
      b[B.hips].position.y=.55;b[B.hips].position.z=-(extra.back||0)/scale;
      rot(b[B.thighL],-Math.PI/2);rot(b[B.shinL],Math.PI/2);
      rot(b[B.thighR],.08);rot(b[B.shinR],1.67);rot(b[B.footR],.31);
      rot(b[B.neck],.08);rot(b[B.head],.1);
    }else if(kneeling){
      const kn=(extra.kneeler||0)/scale,tilt=Math.asin(clamp(kn/.43,0,.8));
      b[B.hips].position.y=kn+.53;b[B.hips].position.z=-(extra.back||0)/scale;
      for(const m of [1,-1]){const s=SIDE[m];rot(b[s.thigh],0,0,m*.03);rot(b[s.shin],Math.PI/2-tilt);rot(b[s.foot],1.25);}
    }else if(walking){
      for(const m of [1,-1]){
        const s=SIDE[m],ph=9*phase+(m>0?0:Math.PI),c=Math.cos(ph);
        rot(b[s.thigh],-.35*Math.sin(ph));rot(b[s.shin],.55*Math.max(0,c));rot(b[s.foot],-.2*Math.max(0,c));
      }
      b[B.hips].position.y-=.015*Math.abs(Math.cos(9*phase));
    }
    const bow=/bow|kisses/i.test(action),slight=/slight|head/i.test(action);
    if(bow){rot(b[B.hips],.3);rot(b[B.spine],.15);rot(b[B.chest],.1);rot(b[B.neck],.05);}
    else if(slight){rot(b[B.neck],.1);rot(b[B.head],.12);}
    if(extra.peace){rot(b[B.spine],0,.15*Math.sign(extra.peace),0,'YXZ');rot(b[B.chest],0,.2*Math.sign(extra.peace),0,'YXZ');}
    if(figure.level.idle){
      const t=phase+(app.phase||0);b[B.chest].rotation.x+=.012*Math.sin(1.6*t);b[B.hips].rotation.z=.008*Math.sin(.6*t);
      if(app.vest==='lay'&&!action)b[B.head].rotation.y=.12*Math.sin(.23*t);
    }
    const table=POSES;
    table.relaxed[0][0]=figure._rig?.sx+.02||.2;
    table.hold[0][1]=sitting?1.08:1.12;
    table.shake[0][1]=1.1+.025*Math.sin(12*phase);
    const robed=app.vest!=='lay',blessing=/blesses/i.test(action),signing=/signs|Cross/i.test(action);
    let key=orans?'orans':/raises/.test(action)?'raises':/shows/.test(action)?'shows':/extended over/.test(action)?'extended':
      /pours|purifies|arranges|prepares|breaks|incenses/.test(action)?'altar':blessing?'bless':signing?'sign':
      extra.peace?'shake':extra.carry?'carry':sitting?'lap':walking&&!robed?'relaxed':
      robed||kneeling||genuflect?'prayer':app.joined?'prayer':app.phase<50?'clasped':'relaxed';
    if(extra.handCandle||extra.handPalm)key='hold';
    const cycle=((phase%3)+3)%3/3;
    for(const m of [1,-1]){
      let p=table[key]||table.prayer;
      if((key==='hold'||key==='shake')&&m>0)p=table.relaxed;
      if((key==='bless'||key==='sign')&&m>0)p=table.breast;
      let W=p[0],D=p[1],N=p[2],curl=p[3];
      if(key==='bless'&&m<0){
        let segment=0;
        while(segment<BLESS_TIMES.length-2&&cycle>BLESS_TIMES[segment+1])segment++;
        const t=smooth(0,1,(cycle-BLESS_TIMES[segment])/(BLESS_TIMES[segment+1]-BLESS_TIMES[segment]));
        const point=BLESS_PATH[segment],next=BLESS_PATH[segment+1];
        W=temp.W;W[0]=m*lerp(point[0],next[0],t);W[1]=lerp(point[1],next[1],t);W[2]=lerp(point[2],next[2],t);
        D=BLESS_DIR;N=BLESS_NORMAL;curl=.1;
      }else if(key==='sign'&&m<0){
        const span=cycle*4,segment=Math.min(3,Math.floor(span)),t=smooth(0,1,span-segment);
        const point=SIGN_PATH[segment],next=SIGN_PATH[segment+1];
        W=temp.W;W[0]=m*lerp(point[0],next[0],t);W[1]=lerp(point[1],next[1],t);W[2]=lerp(point[2],next[2],t);
        D=SIGN_DIRS[segment];N=SIGN_NORMAL;curl=.1;
      }
      aim(figure,m,W,D,N,curl);
    }
    const propActive=!!(extra.handCandle||extra.handPalm);
    figure.handCandle.visible=!!extra.handCandle;figure.handPalm.visible=!!extra.handPalm;
    if(propActive){
      const right=b[B.handR],q=right.getWorldQuaternion(temp.q).invert();
      figure.handCandle.quaternion.copy(q);figure.handPalm.quaternion.copy(q);
    }
    root.userData.peopleBox=sitting?BOXES.sit:kneeling||genuflect?BOXES.kneel:BOXES.stand;
  }
  return {levels:PEOPLE_LEVELS,appearance:peopleAppearance,buildParts,createFigure,pose,recolour,setColour:recolour,rebuild,schedule,pump,pending,dispose,setEnvironment,BONES,SIDE,EYE:[0,1.76,.1],SEAT:.535,BOXES};
})();
if(typeof module!=='undefined')module.exports={PeopleModels,PEOPLE_LEVELS,PEOPLE_FOR_DETAIL,choosePeopleLevel,PeopleDetail,peopleAppearance,peopleSeed,peopleRandom};
