'use strict';

// Profiles describe a prepared shell, not arbitrary architectural geometry.
const ChurchProfiles=(()=>{
  const VERSION=1;
  const fixtures={
    altar:[500,170],ambo:[200,245],chair:[500,58],
    credence:[866,130],ministers:[700,55],tabernacle:[137,85]
  };
  const names={altar:'Altar',ambo:'Ambo',chair:'Celebrant and deacon chairs',
    credence:'Credence',ministers:'Servers',tabernacle:'Tabernacle'};
  const base={
    schemaVersion:VERSION,id:'generic-church',revision:1,name:'Generic training church',
    shell:{id:'rectangular-v1',wall:'#c4b69d',roof:'#70564c',exterior:false},
    fixtures,
    seating:{style:'aisles',left:150,leftEnd:450,right:550,rightEnd:850,front:350,back:715},
    doors:{main:500,sacristy:130},
    routes:{leftFront:[110,330],leftBack:[110,740],centreFront:[500,330],
      centreBack:[500,740],rightFront:[890,330],rightBack:[890,740]}
  };
  const bundled=[base];
  let active=null;
  const copy=value=>JSON.parse(JSON.stringify(value));
  function keys(value,expected,label){
    if(!value||typeof value!=='object'||Array.isArray(value)||
      Object.keys(value).length!==expected.length||expected.some(key=>!Object.hasOwn(value,key))){
      throw new Error(label+' has missing or unsupported fields.');
    }
  }
  function number(value,min,max,label){
    if(!Number.isFinite(value)||value<min||value>max)throw new Error(label+' must be between '+min+' and '+max+'.');
  }
  function point(value,label){
    if(!Array.isArray(value)||value.length!==2)throw new Error(label+' needs two coordinates.');
    number(value[0],100,900,label+' X');number(value[1],32,260,label+' depth');
  }
  function validate(value){
    keys(value,Object.keys(base),'Profile');
    if(value.schemaVersion!==VERSION)throw new Error('Unsupported church profile version.');
    if(typeof value.id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(value.id))throw new Error('Church ID must be a lowercase slug (up to 64 characters).');
    if(!Number.isSafeInteger(value.revision)||value.revision<1)throw new Error('Revision must be a positive integer.');
    if(typeof value.name!=='string'||!value.name.trim()||value.name.length>100)throw new Error('Church name needs 1-100 characters.');
    keys(value.shell,Object.keys(base.shell),'Shell');
    if(value.shell.id!=='rectangular-v1')throw new Error('This editor supports only the prepared rectangular-v1 shell.');
    for(const key of ['wall','roof'])if(typeof value.shell[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(value.shell[key]))throw new Error('Use a six-digit hex colour for '+key+'.');
    if(typeof value.shell.exterior!=='boolean')throw new Error('Exterior shell must be on or off.');
    keys(value.fixtures,Object.keys(fixtures),'Furniture');
    for(const [id,p] of Object.entries(value.fixtures))point(p,names[id]);
    for(const [id,p] of Object.entries(value.fixtures)){
      if(id!=='altar'&&Math.hypot(p[0]-value.fixtures.altar?.[0],p[1]-value.fixtures.altar?.[1])<100){
        throw new Error('Keep '+names[id]+' at least 100 plan units from the altar.');
      }
    }
    number(value.fixtures.altar[0],250,750,'Altar X');
    number(value.fixtures.altar[1],100,235,'Altar depth');
    const other=Object.entries(value.fixtures).filter(([id])=>id!=='altar');
    for(let i=0;i<other.length;i++)for(let j=0;j<i;j++){
      if(Math.hypot(other[i][1][0]-other[j][1][0],other[i][1][1]-other[j][1][1])<80){
        throw new Error('Keep '+names[other[i][0]]+' and '+names[other[j][0]]+' at least 80 plan units apart.');
      }
    }
    keys(value.seating,Object.keys(base.seating),'Seating');
    const s=value.seating;
    if(!['aisles','full'].includes(s.style))throw new Error('Unknown seating style.');
    number(s.left,130,200,'Left pew outer edge');number(s.leftEnd,410,455,'Left pew inner edge');
    number(s.right,545,590,'Right pew inner edge');number(s.rightEnd,800,870,'Right pew outer edge');
    number(s.front,350,390,'First pew depth');number(s.back,680,715,'Last pew depth');
    keys(value.doors,['main','sacristy'],'Doors');
    number(value.doors.main,490,510,'Main door centre');
    number(value.doors.sacristy,120,140,'Sacristy service door depth');
    keys(value.routes,Object.keys(base.routes),'Route waypoints');
    for(const [id,p] of Object.entries(value.routes)){
      if(!Array.isArray(p)||p.length!==2)throw new Error('Invalid waypoint '+id+'.');
      const range=id.startsWith('left')?[90,125]:id.startsWith('right')?[875,920]:[480,520];
      number(p[0],...range,id+' X');
      number(p[1],...(id.endsWith('Front')?[315,335]:[735,780]),id+' depth');
    }
    return copy(value);
  }
  function interpolate(n,from,to){
    if(n<=from[0]||n>=from[from.length-1])return n;
    const i=from.findIndex((v,j)=>j&&n<=v);
    return to[i-1]+(n-from[i-1])*(to[i]-to[i-1])/(from[i]-from[i-1]);
  }
  function mapNave(p,profile=active,inverse=false){
    if(!profile)return p.slice();
    const s=profile.seating;
    const xs=[0,150,450,550,850,1000],xt=[0,s.left,s.leftEnd,s.right,s.rightEnd,1000];
    const ys=[300,350,715,800],yt=[300,s.front,s.back,800];
    const y=interpolate(p[1],inverse?yt:ys,inverse?ys:yt);
    const depth=inverse?y:p[1];
    const weight=Math.max(0,Math.min(1,(depth-300)/50,(800-depth)/85));
    // Blend the horizontal map at the sanctuary boundary; the inverse uses the same knots.
    const blended=xt.map((v,i)=>xs[i]+weight*(v-xs[i]));
    return [interpolate(p[0],inverse?blended:xs,inverse?xs:blended),y];
  }
  function zones(style=active?.seating.style||'aisles'){
    return style==='full'?[[60,350,450,715],[550,350,940,715]]:[[150,350,450,715],[550,350,850,715]];
  }
  function crosses(a,b,rect){
    let lo=0,hi=1;
    for(let axis=0;axis<2;axis++){
      const d=b[axis]-a[axis],min=rect[axis]+.01,max=rect[axis+2]-.01;
      if(Math.abs(d)<1e-9){if(a[axis]<=min||a[axis]>=max)return false;}
      else{
        let t1=(min-a[axis])/d,t2=(max-a[axis])/d;
        if(t1>t2)[t1,t2]=[t2,t1];
        lo=Math.max(lo,t1);hi=Math.min(hi,t2);
        if(lo>=hi)return false;
      }
    }
    return hi>0&&lo<1;
  }
  function route(from,to,profile=active){
    if(!profile)throw new Error('Select a church profile before routing.');
    const rects=zones(profile.seating.style);
    const inside=(p,r)=>p[0]>r[0]&&p[0]<r[2]&&p[1]>r[1]&&p[1]<r[3];
    const escape=p=>{
      const rect=rects.find(r=>inside(p,r));
      if(!rect)return p.slice();
      const candidates=profile.seating.style==='full'?[500]:[110,500,890];
      const x=candidates.reduce((best,n)=>Math.abs(n-p[0])<Math.abs(best-p[0])?n:best);
      return [x,p[1]];
    };
    const start=escape(from),end=escape(to);
    const points=[start,end,...Object.entries(profile.routes)
      .filter(([id])=>profile.seating.style!=='full'||id.startsWith('centre')).map(([,p])=>p)];
    const dist=points.map(()=>Infinity),prev=points.map(()=>-1),visited=new Set();
    dist[0]=0;
    for(let count=0;count<points.length;count++){
      let at=-1;
      for(let i=0;i<points.length;i++)if(!visited.has(i)&&(at<0||dist[i]<dist[at]))at=i;
      if(at<0||!Number.isFinite(dist[at]))break;
      if(at===1)break;
      visited.add(at);
      for(let i=0;i<points.length;i++){
        if(i===at||rects.some(r=>crosses(points[at],points[i],r)))continue;
        const a=mapNave(points[at],profile),b=mapNave(points[i],profile);
        const next=dist[at]+Math.hypot(a[0]-b[0],a[1]-b[1]);
        if(next<dist[i]){dist[i]=next;prev[i]=at;}
      }
    }
    if(!Number.isFinite(dist[1]))throw new Error('No connected aisle route between these places.');
    const result=[];
    for(let i=1;i>=0;i=prev[i]){result.unshift(points[i].slice());if(i===0)break;}
    if(start[0]===from[0]&&start[1]===from[1])result.shift();
    if(end[0]!==to[0]||end[1]!==to[1])result.push(to.slice());
    return result.length?result:[to.slice()];
  }
  function checks(profile){
    const p=validate(profile);
    const routes=[
      {name:'Entrance to sanctuary',from:[500,795],to:[500,300]},
      {name:'Left reader seat to sanctuary',from:[395,368],to:[420,300]},
      {name:'Right pew to sanctuary',from:[735,402],to:[620,300]},
      {name:'Rear nave to sacristy approach',from:[500,770],to:[945,300]}
    ];
    return routes.map(r=>({...r,path:route(r.from,r.to,p)}));
  }
  return {
    VERSION,base:()=>copy(base),names,validate,mapNave,zones,crosses,route,checks,
    get active(){return active;},
    activate(value){active=value===null?null:validate(value);return active;},
    published:()=>bundled.map(validate)
  };
})();
