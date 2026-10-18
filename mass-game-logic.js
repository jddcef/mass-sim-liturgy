'use strict';
// Pure game rules for the Holy Mass simulator. No DOM access: tested in Node.

const GAME_LEVELS={
  watch:{id:'watch',name:'Watch',blurb:'No questions: watch the whole Mass from your role while every duty is done for you. You can switch questions back on at any time.',options:1,timer:0,attempts:1,watch:true},
  guided:{id:'guided',name:'Guided',blurb:'The next duty is highlighted. Click "Do it" and you are moved along.',options:1,timer:0,attempts:1},
  choice:{id:'choice',name:'Choice',blurb:'Pick the right action, words or place from a few options.',options:4,timer:0,attempts:2},
  timed:{id:'timed',name:'Timed',blurb:'As Choice, but each decision has a countdown.',options:4,timer:12,attempts:2},
  expert:{id:'expert',name:'Expert',blurb:'No hints. Click where to go, find the words in your book, choose from every action.',options:0,timer:0,attempts:2}
};
// Watch behaves like Guided whenever questions are switched back on.
const isGuided=level=>level==='guided'||level==='watch';

const GAME_ROLES={
  P:{name:'Priest',actor:'P',sayRole:'P',start:'sacristy',book:'Roman Missal',nudges:true},
  D:{name:'Deacon',actor:'D',sayRole:'D',start:'sacristy',book:'Book of the Gospels',nudges:true},
  S:{name:'Server (book, bell and vessels)',actor:'S',start:'sacristy'},
  X:{name:'Cross-bearer',actor:'X',start:'sacristy'},
  C1:{name:'Candle-bearer',actor:'C1',start:'sacristy'},
  T:{name:'Thurifer',actor:'T',start:'sacristy'},
  MB:{name:'Mitre-bearer',actor:'MB',start:'sacristy'},
  CB:{name:'Crozier-bearer',actor:'CB',start:'sacristy'},
  L:{name:'Lector',actor:'L',sayRole:'L',start:'sacristy',book:'Lectionary'},
  L2:{name:'Second reader',actor:'L2',sayRole:'L2',start:'pew',book:'Lectionary'},
  U:{name:'Collection usher',actor:'U',start:'pew'},
  E:{name:'Extraordinary minister of Holy Communion',actor:'E',sayRole:'E',start:'pew',book:'Communion ministry card'},
  MC:{name:'Master of Ceremonies',actor:null,start:'sacristy',director:true,nudges:true},
  SAC:{name:'Sacristan',actor:null,start:'sacristy'},
  PEW:{name:'Member of the congregation',actor:null,sayRole:'ppl',start:'outside',book:'Pew missal'},
  AV:{name:'Screen operator',actor:null,start:'desk'}
};

const GAME_DEFAULT_OPTIONS={
  deacon:true,lector:true,serverCount:5,incense:true,bothKinds:false,
  gloria:true,creed:true,secondReading:true,introductory:'A',music:'sung',
  solemnBlessing:false,giftsProcession:true,eucharisticPrayer:'II',
  bells:{start:true,epiclesis:true,elevation:true},
  readerCount:1,lectorProcession:false,collection:true,emhc:false,reservedCommunion:true,deaconCommunion:true,openChurch:true,
  crucifix:'wall',crossStand:'right',projector:false,bishop:false,
  lapses:true,detail:'key',symbols:true,seed:1,
  rite:'mass',minister:'lay'
};

// Plan coordinates beyond the 1000x830 church: the sacristy annex lies past the right wall.
const SACRISTY=[1110,150];
const OUTSIDE=[500,960];
const MC_HOME=[578,46];
const MC_START=[535,795];
const SACRISTAN_SEAT=[905,745];
const AV_DESK=[860,792];
const PEW_ZONE=[[150,350,450,715],[550,350,850,715]];

const GAME_PLACES=[
  {id:'avDesk',name:"the screen operator's desk at the back",at:AV_DESK,r:30},
  {id:'sacristy',name:'the sacristy',at:SACRISTY,r:115},
  {id:'outside',name:'outside the church doors',at:OUTSIDE,r:60},
  {id:'stoup',name:'the holy-water stoup by the door',at:[440,866],r:28},
  {id:'giftTable',name:'the gift table at the back',at:[621,770],r:35},
  {id:'procession',name:'the back of the church (procession line)',at:[500,770],r:55},
  {id:'chair',name:"the celebrant's chair",at:[500,58],r:22},
  {id:'deaconChair',name:"the Deacon's seat",at:[450,62],r:18},
  {id:'bookStand',name:'beside the chair, holding the Missal',at:[542,82],r:16},
  {id:'serverBench',name:"the servers' bench",at:[720,58],r:95},
  {id:'altarP',name:"the Priest's place at the altar",at:[500,122],r:22},
  {id:'altarD',name:"the Deacon's place at the altar",at:[452,122],r:26},
  {id:'altarFront',name:'in front of the altar, to reverence it',at:[500,258],r:45},
  {id:'altarRight',name:'the right-hand side of the altar',at:[618,116],r:30},
  {id:'altarLeft',name:'the left-hand side of the altar',at:[392,150],r:30},
  {id:'crossStand',name:'the stand for the processional cross',at:[670,142],r:14},
  {id:'altar',name:'the altar',at:[500,170],r:60},
  {id:'credence',name:'the credence table',at:[858,125],r:55},
  {id:'washStand',name:'the washing stand beside the altar',at:[640,150],r:28},
  {id:'ambo',name:'the ambo',at:[200,222],r:65},
  {id:'tabernacle',name:'the tabernacle',at:[137,85],r:45},
  {id:'communion',name:'the Communion station at the sanctuary step',at:[500,292],r:28},
  {id:'sanctuaryStep',name:'the sanctuary step',at:[660,245],r:40},
  {id:'readerSeat',name:"the readers' places with the congregation",at:HOME.L,r:70},
  {id:'usherSeat',name:"the usher's place in the congregation",at:HOME.U,r:25},
  {id:'emhcSeat',name:"the EMHC's place in the congregation",at:HOME.E,r:25},
  {id:'aisle',name:'the central aisle',at:[500,520],r:45},
  {id:'door',name:'the church door',at:[500,860],r:40},
  {id:'sacristyDoor',name:'the outside door of the sacristy',at:[1250,150],r:30},
  {id:'mainDoors',name:'the main doors, from the inside',at:[500,805],r:30},
  {id:'sanctuaryDoor',name:'inside the church by the sacristy door',at:[948,222],r:40}
];

function hashString(text){
  let h=2166136261;
  for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
}
function seededRandom(seed){
  let a=hashString(seed)||1;
  return ()=>{
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function shuffled(list,random){
  const copy=[...list];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

function serverTeam(count){
  return [[],['S'],['S','X'],['S','C1','C2'],['S','X','C1','C2'],['S','X','C1','C2','T']][count]||[];
}

// Makes the celebration consistent with the chosen role (the role must exist in it).
function normaliseGameOptions(role,raw={}){
  const o={...GAME_DEFAULT_OPTIONS,...raw,bells:{...GAME_DEFAULT_OPTIONS.bells,...(raw.bells||{})}};
  const notes=[];
  if(!GAME_ROLES[role])throw new RangeError('Unknown role '+role);
  if(o.rite==='exposition')return normaliseExposition(role,o,notes);
  o.rite='mass';
  o.serverCount=Math.max(0,Math.min(5,Number(o.serverCount)||0));
  if(role==='D'&&!o.deacon){o.deacon=true;notes.push('A Deacon was added because you are playing the Deacon.');}
  if(role==='L'&&!o.lector){o.lector=true;notes.push('A lay lector was added because you are playing the lector.');}
  if(role==='L2'){o.lector=true;o.readerCount=2;notes.push('Two readers are selected for the second-reader role.');}
  if(role==='U')o.collection=true;
  if(role==='AV'&&!o.projector){o.projector=true;notes.push('A projector and screen were added because you are the screen operator.');}
  o.projector=!!o.projector;
  if(role==='E'){o.emhc=true;notes.push('An authorised EMHC assists when genuinely needed; this is not assumed at every Mass.');}
  o.readerCount=Number(o.readerCount)===2?2:1;
  if(role==='L2'&&!o.secondReading){o.secondReading=true;notes.push('Second Reading enabled for the second reader.');}
  const minimum={S:1,X:2,C1:3,T:5}[role];
  if(minimum&&o.serverCount<minimum){o.serverCount=minimum;notes.push('Server count raised to '+minimum+' so that your role exists.');}
  if(role==='X'&&o.serverCount===3){o.serverCount=4;notes.push('Server count raised to 4: with three servers there is no cross-bearer.');}
  if(role==='T'&&!o.incense){o.incense=true;notes.push('Incense switched on because you are the thurifer.');}
  if(o.incense&&o.serverCount===0){o.incense=false;notes.push('Incense needs at least one server here, so it was switched off.');}
  o.bishop=!!o.bishop;
  if((role==='MB'||role==='CB')&&!o.bishop){o.bishop=true;notes.push('The Bishop presides, because you are one of his bearers.');}
  if(o.bishop){
    if(!o.deacon){o.deacon=true;notes.push('A Deacon assists the Bishop (Pontificales ritus 6).');}
    if(!o.lector){o.lector=true;notes.push('A lay reader proclaims the readings while the Bishop presides from the cathedra.');}
    if(o.serverCount<1){o.serverCount=1;notes.push('A server holds the book before the Bishop (Pontificales ritus 2).');}
  }
  if(o.bothKinds&&!o.deacon){o.bothKinds=false;notes.push('Communion under both kinds needs the Deacon in this simulator, so it was switched off.');}
  if(o.serverCount===0&&(o.bells.epiclesis||o.bells.elevation)){
    o.bells={...o.bells,epiclesis:false,elevation:false};
    notes.push('No servers: the altar bell is not rung.');
  }
  if(!['A','C','sprinkling'].includes(o.introductory))o.introductory='A';
  if(!['key','all'].includes(o.detail))o.detail='key';
  if(!GAME_LEVELS[o.level])o.level='choice';
  if(typeof CRUCIFIX_PLACES!=='undefined'&&!CRUCIFIX_PLACES[o.crucifix])o.crucifix='wall';
  if(typeof CROSS_STANDS!=='undefined'&&!CROSS_STANDS[o.crossStand])o.crossStand='right';
  return {options:o,notes};
}

// Exposition (mass-rite-exposition.js): a Priest or Deacon gives Benediction; a lay minister exposes and
// reposes only (HCWEOM 91; CIC 943). Up to two servers: a server, and a thurifer when incense is used.
const EXPOSITION_ROLES={lay:['E','S','T','PEW'],priest:['P','S','T','PEW'],deacon:['D','S','T','PEW']};
function normaliseExposition(role,o,notes){
  o.minister=EXPOSITION_ROLES[o.minister]?o.minister:'lay';
  if(!EXPOSITION_ROLES[o.minister].includes(role)){
    const names=EXPOSITION_ROLES[o.minister].map(r=>GAME_ROLES[r].name).join(', ');
    throw new RangeError('The '+GAME_ROLES[role].name+' has no part in this celebration. Choose one of: '+names+'.');
  }
  o.serverCount=Math.max(0,Math.min(2,Number(o.serverCount)||0));
  if(role==='S'&&o.serverCount<1){o.serverCount=1;notes.push('A server was added because you are playing the server.');}
  if(role==='T'){
    if(o.serverCount<2){o.serverCount=2;notes.push('Two servers are needed so that there is a thurifer.');}
    if(!o.incense){o.incense=true;notes.push('Incense switched on because you are the thurifer.');}
  }
  if(o.incense&&o.serverCount<2){o.incense=false;notes.push('Incense needs a thurifer (two servers) here, so it was switched off.');}
  Object.assign(o,{deacon:o.minister==='deacon',bishop:false,lector:false,bothKinds:false,collection:false,projector:false,emhc:o.minister==='lay',readerCount:1,lectorProcession:false,
    music:'sung',bells:{start:false,epiclesis:false,elevation:false}});
  if(role==='E')notes.push('Only an instituted acolyte or an authorised extraordinary minister may expose the Blessed Sacrament, when no Priest or Deacon is available; they do not give the blessing.');
  if(!['key','all'].includes(o.detail))o.detail='key';
  if(!GAME_LEVELS[o.level])o.level='choice';
  if(typeof CRUCIFIX_PLACES!=='undefined'&&!CRUCIFIX_PLACES[o.crucifix])o.crucifix='wall';
  if(typeof CROSS_STANDS!=='undefined'&&!CROSS_STANDS[o.crossStand])o.crossStand='right';
  return {options:o,notes};
}
const isDevotionRite=options=>!!options&&options.rite!==undefined&&options.rite!=='mass';

function scenarioRequest(options){
  const keys=['deacon','lector','serverCount','incense','bothKinds','gloria','creed','secondReading','introductory','music','solemnBlessing','giftsProcession','eucharisticPrayer','bells','crucifix','crossStand','readerCount','lectorProcession','collection','emhc','reservedCommunion','deaconCommunion','openChurch','projector','rite','minister','bishop'];
  return Object.fromEntries(keys.map(k=>[k,k==='bells'?{...options.bells}:options[k]]));
}

// Celebration presets for the setup sheet. Field names match the form; editing any field afterwards
// makes the choice "custom". Weekday: no Gloria or Creed outside feasts and solemnities (GIRM 53, 68),
// and usually said, with no servers (judgement call: a quiet weekday Mass for the Priest to practise).
const GAME_PRESETS={
  sunday:{name:'Sunday Mass',blurb:'Sung, Deacon, four servers (cross and candles), no incense, Gloria and Creed, two readings.',fields:{
    deacon:true,serverCount:'4',lector:true,readerCount:'1',lectorProcession:false,collection:true,emhc:false,reservedCommunion:true,deaconCommunion:true,
    incense:false,bothKinds:false,gloria:true,creed:true,secondReading:true,giftsProcession:true,solemnBlessing:false,introductory:'A',music:'sung',eucharisticPrayer:'II',
    bellStart:true,bellEpiclesis:true,bellElevation:true,bishop:false}},
  sundayIncense:{name:'Sunday Mass with incense',blurb:'Sung, Deacon, five servers with a thurifer, incense, Gloria and Creed, two readings.',fields:{
    deacon:true,serverCount:'5',lector:true,readerCount:'1',lectorProcession:false,collection:true,emhc:false,reservedCommunion:true,deaconCommunion:true,
    incense:true,bothKinds:false,gloria:true,creed:true,secondReading:true,giftsProcession:true,solemnBlessing:false,introductory:'A',music:'sung',eucharisticPrayer:'II',
    bellStart:true,bellEpiclesis:true,bellElevation:true,bishop:false}},
  weekday:{name:'Weekday Mass',blurb:'Said, no servers or Deacon, no Gloria or Creed, one reading: practice for the Priest.',fields:{
    deacon:false,serverCount:'0',lector:false,readerCount:'1',lectorProcession:false,collection:false,emhc:false,reservedCommunion:true,deaconCommunion:true,
    incense:false,bothKinds:false,gloria:false,creed:false,secondReading:false,giftsProcession:false,solemnBlessing:false,introductory:'A',music:'said',eucharisticPrayer:'II',
    bellStart:false,bellEpiclesis:false,bellElevation:false,bishop:false}},
  solemnity:{name:'Solemnity',blurb:'As Sunday, with the Roman Canon and a Solemn Blessing.',fields:{
    deacon:true,serverCount:'5',lector:true,readerCount:'2',lectorProcession:false,collection:true,emhc:false,reservedCommunion:true,deaconCommunion:true,
    incense:true,bothKinds:false,gloria:true,creed:true,secondReading:true,giftsProcession:true,solemnBlessing:true,introductory:'A',music:'sung',eucharisticPrayer:'I',
    bellStart:true,bellEpiclesis:true,bellElevation:true,bishop:false}},
  pontifical:{name:'Mass with the Bishop',blurb:'As a solemnity, with the Bishop presiding: mitre- and crozier-bearers in vimps, the homily from the cathedra and the pontifical blessing.',fields:{
    deacon:true,serverCount:'5',lector:true,readerCount:'2',lectorProcession:false,collection:true,emhc:false,reservedCommunion:true,deaconCommunion:true,
    incense:true,bothKinds:false,gloria:true,creed:true,secondReading:true,giftsProcession:true,solemnBlessing:false,introductory:'A',music:'sung',eucharisticPrayer:'I',
    bellStart:true,bellEpiclesis:true,bellElevation:true,bishop:true}},
  // Exposition presets: "rite" and "minister" are not form fields; the preset choice carries them.
  adorationLay:{name:'Adoration (lay-led)',blurb:'An authorised lay minister exposes the Blessed Sacrament for adoration and reposes it; no blessing.',fields:{
    rite:'exposition',minister:'lay',serverCount:'1',incense:false}},
  benediction:{name:'Exposition and Benediction',blurb:'The Priest in cope exposes the Blessed Sacrament, incenses it, and blesses the people with the monstrance.',fields:{
    rite:'exposition',minister:'priest',serverCount:'2',incense:true}},
  benedictionDeacon:{name:'Exposition and Benediction (Deacon)',blurb:'The Deacon in cope exposes the Blessed Sacrament, incenses it, and blesses the people with the monstrance.',fields:{
    rite:'exposition',minister:'deacon',serverCount:'2',incense:true}}
};
// The form fields a preset controls; a preset is "current" only while all of them still match.
function applyPreset(id,current={}){
  const preset=GAME_PRESETS[id];
  return preset?{...current,...preset.fields,preset:id}:{...current,preset:'custom'};
}
function matchingPreset(values){
  const rite=values.rite||'mass';
  for(const [id,preset] of Object.entries(GAME_PRESETS)){
    if((preset.fields.rite||'mass')!==rite)continue;
    if(Object.entries(preset.fields).every(([k,v])=>values[k]===undefined||String(values[k])===String(v)))return id;
  }
  return 'custom';
}
// The preset a game's final options amount to, in the setup form's field names. When the role
// forced a change (for example the Thurifer switches incense on), the options may match another
// preset; if they match none, the celebration chosen in the form is credited.
function presetForOptions(options,chosen){
  const fields={deacon:options.deacon,serverCount:String(options.serverCount),lector:options.lector,readerCount:String(options.readerCount),
    lectorProcession:options.lectorProcession,collection:options.collection,emhc:options.emhc,reservedCommunion:options.reservedCommunion,deaconCommunion:options.deaconCommunion,
    incense:options.incense,bothKinds:options.bothKinds,gloria:options.gloria,creed:options.creed,secondReading:options.secondReading,giftsProcession:options.giftsProcession,
    solemnBlessing:options.solemnBlessing,introductory:options.introductory,music:options.music,eucharisticPrayer:options.eucharisticPrayer,
    bellStart:options.bells?.start,bellEpiclesis:options.bells?.epiclesis,bellElevation:options.bells?.elevation,
    bishop:isDevotionRite(options)?undefined:!!options.bishop,
    rite:options.rite||'mass',minister:isDevotionRite(options)?options.minister:undefined};
  const id=matchingPreset(fields);
  if(id!=='custom')return id;
  return GAME_PRESETS[chosen]&&(GAME_PRESETS[chosen].fields.rite||'mass')===fields.rite?chosen:'custom';
}

// ---------- the Path: celebrations and seniority ----------
// The path orders celebrations by liturgical precedence and ceremonial demand. Every celebration
// that exists in the simulator can be played at any time ("soft" progression); the path only
// recommends an order and awards seniority. `preset` links a celebration to GAME_PRESETS;
// celebrations without one are "in preparation". `at` is a point on the 1000x1200 path map and
// `colour` is the liturgical colour of the day (GIRM 346).
const PATH_BRANCHES={
  main:{name:'The Mass through the year'},
  devotion:{name:'Eucharistic worship outside Mass'},
  seasonal:{name:'Rites of the seasons'},
  pontifical:{name:'With the Bishop'},
  triduum:{name:'The Sacred Paschal Triduum'}
};
const CELEBRATIONS=[
  {id:'feria',name:'Weekday Mass',precedence:'Feria',branch:'main',station:1,preset:'weekday',colour:'green',icon:'book',at:[500,80],after:[],
    blurb:'A quiet said Mass on a weekday: no Gloria or Creed, one reading. The place to learn the order of Mass.'},
  {id:'dominica',name:'Sunday Mass',precedence:"The Lord's Day",branch:'main',station:2,preset:'sunday',colour:'green',icon:'cross',at:[330,215],after:['feria'],
    blurb:'The parish Sunday Mass: sung, with Deacon, readers, cross and candles, Gloria and Creed.'},
  {id:'dominicaIncense',name:'Sunday Mass with incense',precedence:"The Lord's Day, solemnly",branch:'main',station:3,preset:'sundayIncense',colour:'green',icon:'thurible',at:[600,345],after:['dominica'],
    blurb:'Sunday with a thurifer: incense at the entrance, the Gospel, the gifts and the elevations.'},
  {id:'solemnity',name:'Solemnity',precedence:'Solemnity',branch:'main',station:4,preset:'solemnity',colour:'white',icon:'chalice',at:[390,480],after:['dominicaIncense'],
    blurb:'A great feast: the Roman Canon and a Solemn Blessing, with the full team of servers.'},
  {id:'pontifical',name:'Mass with the Bishop',precedence:'Pontifical Mass',branch:'main',station:5,preset:'pontifical',colour:'white',icon:'mitre',at:[610,630],after:['solemnity'],
    blurb:'The Bishop presides: mitre- and crozier-bearers wearing vimps, a server holding the book, the homily from the cathedra and the pontifical blessing.'},
  {id:'nativity',name:'Christmas Mass',precedence:'Solemnity of the Nativity',branch:'main',station:6,colour:'white',icon:'candle',at:[390,790],after:['pontifical'],
    blurb:'Mass during the Night: the Christmas Proclamation, all kneel at "and by the Holy Spirit was incarnate", the blessing of the crib.'},
  {id:'holyThursday',name:'Holy Thursday',precedence:'Evening Mass of the Lord\u2019s Supper',branch:'triduum',station:7,colour:'white',icon:'tabernacle',at:[300,1070],after:['nativity','palmSunday','corpusChristi','confirmation'],
    blurb:'Bells at the Gloria then silence, the washing of feet, the transfer of the Blessed Sacrament to the altar of repose, the stripping of the altar.'},
  {id:'goodFriday',name:'Good Friday',precedence:'Celebration of the Passion of the Lord',branch:'triduum',station:7,colour:'red',icon:'crucifix',at:[500,1070],after:['holyThursday'],
    blurb:'Prostration in silence, the Passion, the Solemn Intercessions, the Adoration of the Cross and Communion from the reserved Sacrament.'},
  {id:'easterVigil',name:'Easter Vigil',precedence:'The Easter Vigil in the Holy Night',branch:'triduum',station:7,colour:'white',icon:'candle',at:[700,1070],after:['goodFriday'],
    blurb:'The new fire, the Paschal candle and the Exsultet, the readings, the Gloria with bells, Baptism and the renewal of promises.'},
  {id:'adorationLay',name:'Adoration (lay-led)',precedence:'Exposition without Benediction',branch:'devotion',colour:'white',icon:'tabernacle',at:[820,225],after:['dominica'],
    preset:'adorationLay',blurb:'An authorised lay minister exposes the Blessed Sacrament and later reposes it, without giving the blessing.'},
  {id:'benediction',name:'Exposition and Benediction',precedence:'Exposition, Adoration and Benediction',branch:'devotion',colour:'white',icon:'bless',at:[820,420],after:['adorationLay','dominicaIncense'],
    preset:'benediction',alsoPresets:['benedictionDeacon'],blurb:'The Priest or Deacon in cope and humeral veil, incense, hymns, and the blessing with the monstrance.'},
  {id:'corpusChristi',name:'Corpus Christi procession',precedence:'Eucharistic procession',branch:'devotion',colour:'white',icon:'walk',at:[820,600],after:['benediction'],
    blurb:'Outside the church: the canopy, torches, flower petals and bells, with Benediction at the altars on the way.'},
  {id:'confirmation',name:'Confirmation Mass',precedence:'Pontifical Mass with Confirmation',branch:'pontifical',colour:'red',icon:'bless',at:[760,820],after:['pontifical'],
    blurb:'The Bishop confirms: the candidates and sponsors, the chrism, and the Bishop\u2019s ministers.'},
  {id:'candlemas',name:'Candlemas',precedence:'Presentation of the Lord',branch:'seasonal',colour:'white',icon:'candle',at:[140,565],after:['solemnity'],
    blurb:'The blessing of candles and the procession into the church.'},
  {id:'ashWednesday',name:'Ash Wednesday',precedence:'Beginning of Lent',branch:'seasonal',colour:'purple',icon:'sprinkler',at:[140,710],after:['candlemas'],
    blurb:'The blessing and giving of ashes after the homily; no Gloria or Alleluia.'},
  {id:'palmSunday',name:'Palm Sunday',precedence:'Palm Sunday of the Passion of the Lord',branch:'seasonal',colour:'red',icon:'walk',at:[140,855],after:['ashWednesday'],
    blurb:'The blessing of palms, the procession, and the Passion read in parts.'}
];
// Seniority, in the manner of an altar servers' guild. A rank needs every listed celebration to
// have been "served" (in any role). Ranks that depend on celebrations still in preparation wait.
const SENIORITY_RANKS=[
  {id:'aspirant',name:'Aspirant',needs:[],blurb:'Welcome to the sacristy.'},
  {id:'server',name:'Server',needs:['feria'],blurb:'You know the order of Mass.'},
  {id:'senior',name:'Senior Server',needs:['dominica','dominicaIncense'],blurb:'You can serve the Sunday Mass, with or without incense.'},
  {id:'head',name:'Head Server',needs:['solemnity'],blurb:'You can lead the servers on a solemnity.'},
  {id:'mc',name:'Master of Ceremonies',needs:['pontifical','nativity'],blurb:'You can direct a Mass with the Bishop and the Christmas liturgy.'},
  {id:'triduum',name:'Master of Ceremonies of the Triduum',needs:['holyThursday','goodFriday','easterVigil'],blurb:'You have served the summit of the liturgical year.'}
];
// Marks for one celebration, from any role: attended (watched or guided), served (answered at
// Choice or harder with at least SERVED_PERCENT), served with distinction (Timed or Expert, 90%+).
const SERVED_PERCENT=70,DISTINCTION_PERCENT=90;
const MARKS=['none','attended','served','distinction'];
const MARK_NAMES={none:'Not yet',attended:'Attended',served:'Served',distinction:'Served with distinction'};
const PROGRESS_VERSION=1;
const celebrationById=id=>CELEBRATIONS.find(c=>c.id===id)||null;
const celebrationAvailable=c=>!!(c&&c.preset&&GAME_PRESETS[c.preset]);
function celebrationForPreset(presetId){
  return CELEBRATIONS.find(c=>c.preset&&(c.preset===presetId||(c.alsoPresets||[]).includes(presetId)))||null;
}
function emptyProgress(){return {_v:PROGRESS_VERSION,celebrations:{}};}
function normaliseProgress(raw){
  const progress=emptyProgress();
  if(!raw||typeof raw!=='object'||typeof raw.celebrations!=='object'||!raw.celebrations)return progress;
  for(const [id,entry] of Object.entries(raw.celebrations)){
    if(!celebrationById(id)||!entry||typeof entry.roles!=='object')continue;
    const roles={};
    for(const [role,r] of Object.entries(entry.roles)){
      if(!GAME_ROLES[role]||!r)continue;
      roles[role]={mark:MARKS.includes(r.mark)?r.mark:'none',best:Math.max(0,Math.min(100,Number(r.best)||0)),plays:Math.max(0,Number(r.plays)||0)};
    }
    progress.celebrations[id]={roles};
  }
  return progress;
}
function markFor(result){
  if(result.watched||isGuided(result.level)||!GAME_LEVELS[result.level])return 'attended';
  const percent=Number(result.percent)||0;
  if(percent>=DISTINCTION_PERCENT&&(result.level==='timed'||result.level==='expert'))return 'distinction';
  return percent>=SERVED_PERCENT?'served':'attended';
}
const betterMark=(a,b)=>MARKS.indexOf(a)>=MARKS.indexOf(b)?a:b;
// Records a finished celebration. Returns {progress, entry, celebration, rankBefore, rankAfter}, or
// null when the celebration is not on the path (for example "Custom" options).
function recordCelebration(progress,result){
  const celebration=celebrationById(result.celebration)||celebrationForPreset(result.preset);
  if(!celebration||!celebrationAvailable(celebration)||!GAME_ROLES[result.role])return null;
  const next=normaliseProgress(progress);
  const rankBefore=seniorityFor(next);
  const entry=next.celebrations[celebration.id]||(next.celebrations[celebration.id]={roles:{}});
  const old=entry.roles[result.role]||{mark:'none',best:0,plays:0};
  const mark=markFor(result);
  const scored=!result.watched&&!isGuided(result.level);
  entry.roles[result.role]={mark:betterMark(old.mark,mark),best:scored?Math.max(old.best,Number(result.percent)||0):old.best,plays:old.plays+1};
  return {progress:next,mark,entry,celebration,rankBefore,rankAfter:seniorityFor(next)};
}
function celebrationStatus(progress,id){
  const celebration=celebrationById(id);
  const entry=progress?.celebrations?.[id];
  let mark='none',best=0;
  const roles=[];
  for(const [role,r] of Object.entries(entry?.roles||{})){
    mark=betterMark(mark,r.mark);best=Math.max(best,r.best||0);
    if(MARKS.indexOf(r.mark)>=MARKS.indexOf('served'))roles.push(role);
  }
  return {id,available:celebrationAvailable(celebration),mark,best,servedRoles:roles,triedRoles:Object.keys(entry?.roles||{})};
}
const isServed=(progress,id)=>MARKS.indexOf(celebrationStatus(progress,id).mark)>=MARKS.indexOf('served');
function seniorityFor(progress){
  let rank=SENIORITY_RANKS[0];
  for(const r of SENIORITY_RANKS){
    if(r.needs.every(id=>isServed(progress,id)))rank=r;else break;
  }
  return rank;
}
// The next rank and what it still needs (null at the top).
function nextRank(progress){
  const current=SENIORITY_RANKS.indexOf(seniorityFor(progress));
  const rank=SENIORITY_RANKS[current+1];
  if(!rank)return null;
  const missing=rank.needs.filter(id=>!isServed(progress,id));
  return {rank,missing,ready:missing.every(id=>celebrationAvailable(celebrationById(id)))};
}
// The recommended next celebration: the first playable one on the main line not yet served,
// then the side branches; null when everything playable is served.
function nextRecommended(progress){
  const playable=CELEBRATIONS.filter(celebrationAvailable);
  const order=[...playable.filter(c=>c.branch==='main'||c.branch==='triduum'),...playable.filter(c=>c.branch!=='main'&&c.branch!=='triduum')];
  return order.find(c=>!isServed(progress,c.id))||null;
}

// Roles that can be taken over during Mass: anyone present in this celebration, plus the
// M.C., sacristan and a parishioner (who are always there) and the screen operator with a projector.
// The celebrant's title: the Bishop when he presides.
function gameRoleName(role,options){
  return role==='P'&&options?.bishop?'Bishop':GAME_ROLES[role]?.name||role;
}
function switchableRoles(visible,options={}){
  const roles=Object.keys(GAME_ROLES).filter(role=>{
    const actor=GAME_ROLES[role].actor;
    if(actor)return visible.has(actor);
    if(role==='AV')return !!options.projector;
    return true;
  });
  if(isDevotionRite(options))return roles.filter(role=>(EXPOSITION_ROLES[options.minister]||[]).includes(role));
  return roles;
}
// After a role switch, everything already past is done; the new role's duties start from now.
function stopsFrom(stops,elapsed){
  for(const stop of stops)stop.done=stop.time<elapsed-1e-4;
  return stops.filter(stop=>!stop.done);
}

// Screen operator: slides and backing tracks. Parts with a "track" need the music started;
// "acapella" parts only need the lyrics slide; said parts show a slide of the people's words.
// Which parts use a track is a judgement call: parishes vary widely.
const MEDIA_PARTS=[
  {key:0,id:'entrance',title:'Entrance hymn',sung:'track',hymn:true},
  {key:5,id:'confiteor',title:'I confess (Confiteor)',sung:'slide',said:'slide'},
  {key:6,id:'kyrie',title:'Kyrie',sung:'acapella',said:'slide'},
  {key:7,id:'gloria',title:'Gloria',sung:'track',said:'slide'},
  {key:10,id:'psalm',title:'Responsorial Psalm',sung:'acapella',said:'slide'},
  {key:12,id:'alleluia',title:'Gospel Acclamation',sung:'track',said:'slide'},
  {key:15,id:'creed',title:'Creed',sung:'slide',said:'slide'},
  {key:17,id:'offertory',title:'Offertory hymn',sung:'track',hymn:true},
  {key:24,id:'sanctus',title:'Sanctus (Holy, Holy, Holy)',sung:'track',said:'slide'},
  {key:28,id:'mystery',title:'The Mystery of Faith',sung:'track',said:'slide'},
  {key:30,id:'amen',title:'Great Amen',sung:'acapella'},
  {key:31,id:'pater',title:"Lord's Prayer",sung:'acapella',said:'slide'},
  {key:33,id:'agnus',title:'Agnus Dei (Lamb of God)',sung:'track',said:'slide'},
  {key:35,id:'communion',title:'Communion hymn',sung:'track',hymn:true},
  {key:39,id:'recessional',title:'Recessional hymn',sung:'track',hymn:true}
];
// Seconds of warning before a part, then the window (in seconds) to start it.
const MEDIA_WINDOW={watch:0,guided:0,choice:10,timed:6,expert:6};
const MEDIA_WARNING=8;
function deriveMediaCues(steps=STEPS,startTimes,options={},detail='key'){
  if(!options.projector)return [];
  const sung=options.music!=='said';
  const cues=[];
  let clock=0;
  steps.forEach((step,i)=>{
    const start=startTimes?startTimes[i]:clock;
    clock=start+step.dur;
    let part=MEDIA_PARTS.find(p=>p.key===step.key);
    if(part&&step.key===5&&options.introductory==='sprinkling')part={key:5,id:'asperges',title:'Asperges / Vidi aquam',sung:'track',said:'slide'};
    else if(part&&step.key===5&&options.introductory==='C')part={key:5,id:'invocations',title:'Lord, have mercy (invocations)',sung:'slide',said:'slide'};
    if(!part)return;
    const mode=sung?part.sung:part.said;
    if(!mode)return;
    const span=chantSpan(steps,i,startTimes,start);
    const base={step:i,key:step.key,title:part.title,part:part.id,ref:step.ref};
    cues.push({...base,id:'media:'+part.id+':start',action:'start',mode,time:part.hymn&&span?span.start:start,hymn:!!part.hymn});
    // A track is faded out when its chant ends (the entrance chant runs on through the reverence
    // and incensation, ending before the Sign of the Cross); at "key" detail only hymns ask for it.
    if(mode==='track'&&(part.hymn||detail==='all')){
      const end=span?span.end:start+step.dur;
      const last=span?span.last:i;
      cues.push({...base,step:last,key:steps[last].key,id:'media:'+part.id+':stop',action:'stop',mode,time:end-Math.min(.4,steps[last].dur*.03),hymn:!!part.hymn});
    }
  });
  return cues;
}
// Where the people's sung line (♪) of step i starts and, continuing through following steps, ends.
function chantSpan(steps,i,startTimes,start){
  const startOf=j=>{if(startTimes)return startTimes[j];let t=start;for(let k=i;k<j;k++)t+=steps[k].dur;return t;};
  const sung=step=>(step.say||[]).find(line=>line[0]==='ppl'&&/♪/.test(line[1]));
  const first=sung(steps[i]);
  if(!first)return null;
  let last=i,line=first;
  while(last+1<steps.length){
    const next=sung(steps[last+1]);
    if(!next||next[1]!==first[1]||next[2]>.05||line[3]<.97)break;
    last++;line=next;
  }
  return {start:start+first[2]*steps[i].dur,end:startOf(last)+line[3]*steps[last].dur,last};
}
const MEDIA_ACTIONS={
  track:part=>'▶ Play the '+part+' backing track with its lyrics',
  acapella:part=>'Show the '+part+' lyrics only (sung unaccompanied)',
  slide:part=>'Show the '+part+' words on the screen'
};
function mediaDecision(cue,level,seed=1,all=[]){
  const random=seededRandom('media|'+seed+'|'+cue.id);
  const rules=GAME_LEVELS[level]||GAME_LEVELS.choice;
  const window=MEDIA_WINDOW[level]??10;
  const base={id:cue.id,kind:'media',title:cue.title,ref:cue.mode==='track'?'Judgement call (parish music practice); GIRM 39-41':'GIRM 39-41; judgement call',
    level,attempts:rules.attempts,input:'options',timer:window,duty:cue,cue};
  if(cue.action==='stop'){
    const correct='■ Fade out the '+cue.title+' track now';
    const options=[correct,'Leave it playing into the next part','Turn the volume up','Skip to the next slide and leave the music'].map(label=>({label,correct:label===correct}));
    return {...base,prompt:cue.title+' is ending. What do you do with the music?',correct,options:isGuided(level)?options.slice(0,1):shuffled(options,random).slice(0,rules.options||4),
      explain:'Fade the track gently as the part ends, so it does not run over the next prayer.'};
  }
  const correct=MEDIA_ACTIONS[cue.mode](cue.title);
  const others=all.filter(c=>c.action==='start'&&c.part!==cue.part).map(c=>MEDIA_ACTIONS[c.mode](c.title));
  const wrongMode=Object.entries(MEDIA_ACTIONS).filter(([mode])=>mode!==cue.mode).map(([,f])=>f(cue.title));
  const pool=[...wrongMode,...shuffled(others,random).slice(0,3),'Wait: nothing to start yet'];
  const want=level==='expert'?6:(rules.options||4)-1;
  const options=isGuided(level)?[{label:correct,correct:true}]:shuffled([correct,...pickDistractors(correct,pool,want,random)],random).map(label=>({label,correct:label===correct}));
  const how={track:'it is accompanied, so the backing track starts with the lyrics',acapella:'it is sung unaccompanied, so show the lyrics but no track',slide:'the people say it, so show the words only'}[cue.mode];
  return {...base,prompt:'Up next: '+cue.title+'. Start it now.',correct,options,explain:cue.title+': '+how+'.'};
}

function placeFor(point,role){
  if(role&&HOME[role]&&distance(point,HOME[role])<8)return {id:'home',name:'your own seat',at:HOME[role],r:12};
  let best=null;
  for(const place of GAME_PLACES){
    const d=distance(point,place.at);
    if(d<=place.r&&(!best||d/place.r<best.d))best={place,d:d/place.r};
  }
  if(best)return best.place;
  if(point[1]>=232&&point[1]<300)return {id:'sanctuaryFoot',name:'your place in line at the foot of the sanctuary',at:point,r:30};
  if(point[1]<232&&distance(point,[500,140])<140)return {id:'nearAltar',name:'your place close to the altar',at:point,r:25};
  if(point[1]<295)return {id:'sanctuary',name:'a place in the sanctuary',at:point,r:30};
  if(point[1]>840)return {id:'door',name:'the church door',at:[500,860],r:40};
  return {id:'nave',name:'a place in the nave',at:point,r:40};
}
// 'aisles' keeps side aisles by the walls; 'full' runs the benches to the walls (centre aisle only).
let pewLayout='aisles';
function setPewLayout(style){
  pewLayout=style==='full'?'full':'aisles';
  PEW_ZONE.splice(0,PEW_ZONE.length,...(pewLayout==='full'?[[60,350,450,715],[550,350,940,715]]:[[150,350,450,715],[550,350,850,715]]));
  return pewLayout;
}
function inPews(point){
  return PEW_ZONE.some(([l,t,r,b])=>point[0]>=l&&point[0]<=r&&point[1]>=t&&point[1]<=b);
}

// Straight lines, but through an aisle rather than across pews.
function routeBetween(from,to){
  if(typeof ChurchProfiles!=='undefined'&&ChurchProfiles.active)return ChurchProfiles.route(from,to);
  const crossesPews=[from,to].some(inPews)||
    (Math.max(from[1],to[1])>350&&Math.min(from[1],to[1])<715&&
     !(Math.abs(from[0]-500)<45&&Math.abs(to[0]-500)<45)&&
     !(pewLayout==='aisles'&&from[0]>870&&to[0]>870)&&!(pewLayout==='aisles'&&from[0]<130&&to[0]<130));
  if(!crossesPews)return [to];
  const middle=(from[0]+to[0])/2;
  const aisle=pewLayout==='full'?500:middle<300?110:middle>700?890:500;
  const top=Math.min(from[1],to[1]);
  const startY=inPews(from)?from[1]:Math.max(350,Math.min(715,from[1]));
  const endY=inPews(to)?to[1]:Math.max(345,Math.min(720,to[1]));
  void top;
  return [[aisle,startY],[aisle,endY],to];
}

const GENERIC_ACTS=['genuflects to the tabernacle','sits down','kneels','bows to the altar','rings the bell','incenses the altar','picks up the Missal','extends hands','lights a candle','returns to the sacristy'];
const PLACE_DISTRACTORS=['altarFront','chair','credence','ambo','altar','altarP','washStand','serverBench','communion','tabernacle','bookStand','sanctuaryStep','aisle','readerSeat'];

// Every duty of one role in the current STEPS, in order.
function deriveDuties(role,steps=STEPS,options={}){
  const info=GAME_ROLES[role]||{};
  const actor=info.actor===undefined?role:info.actor;
  const sayRole=info.sayRole||(actor&&['P','D','L','Ps'].includes(actor)?actor:null);
  const duties=[];
  let lastSay=null;
  steps.forEach((step,i)=>{
    const base={step:i,key:step.key,title:step.title,part:step.part,ref:step.ref,role};
    if(role==='P'&&step.key===14&&!(step.homilyPlaces?.length===1)){
      duties.push({...base,type:'homily',t:0,end:.28,to:AMBO,targets:[AMBO,CHAIR],text:'choose the ambo or the chair for the homily',answer:"the ambo or the celebrant's chair"});
    }
    if(actor){
      const groups=[];
      for(const seg of segs(step.mv?.[actor])){
        if(role==='P'&&step.key===14)continue;
        const last=groups[groups.length-1];
        if(last&&seg.a-last.b<.035){last.b=seg.b;last.to=seg.p[seg.p.length-1];}
        else groups.push({a:seg.a,b:seg.b,to:seg.p[seg.p.length-1]});
      }
      for(const g of groups){
        const from=actorAt(i,actor,g.a);
        if(distance(from,g.to)<20)continue;
        const place=placeFor(g.to,actor);
        duties.push({...base,type:'move',t:g.a,end:g.b,from,to:g.to,place:place.id,text:'go to '+place.name,answer:place.name});
      }
      for(const [text,a,b] of step.acts?.[actor]||[]){
        if(!text)continue;
        duties.push({...base,type:'act',t:a,end:b,text,answer:text});
      }
      if(actor==='S'&&step.key!==0){
        for(const [a,b] of step.bell||[]){
          const covered=(step.acts?.S||[]).some(([text,x,y])=>/bell/.test(text)&&a>=x-.01&&a<=y);
          if(!covered)duties.push({...base,type:'act',t:a,end:b,text:'rings the bell',answer:'rings the bell'});
        }
      }
    }
    if(role==='SAC'&&step.key===0&&(step.bell||[]).length){
      duties.push({...base,type:'act',t:0,end:step.bell[0][1],text:'rings the sacristy bell as the procession sets out',answer:'rings the sacristy bell as the procession sets out'});
    }
    if(sayRole){
      for(const [who,text,a,b] of step.say||[]){
        if(who!==sayRole)continue;
        // A chant that simply continues into the next step is one duty, not several.
        if(lastSay&&lastSay.text===text&&lastSay.step>=i-1){lastSay.step=i;continue;}
        const duty={...base,type:'say',t:a,end:b,text,answer:text};
        duties.push(duty);lastSay={text,step:i};
      }
    }
    if(role==='PEW'){
      let previous=i>0?postureList(i-1).slice(-1)[0][0]:'stand';
      for(const [name,t] of postureList(i)){
        if(name!==previous)duties.push({...base,type:'posture',t,end:Math.min(1,t+.08),text:name,answer:name});
        previous=name;
      }
    }
  });
  duties.sort((x,y)=>x.step-y.step||x.t-y.t||(x.type==='posture'?-1:0));
  duties.forEach((d,n)=>{d.id=role+':'+d.step+':'+d.type+':'+n;});
  return duties;
}

// Which duties become interactive decisions: key moments only, or every duty.
function selectDecisionDuties(duties,detail='key'){
  if(detail==='all')return duties.slice();
  // Keep a gesture and a spoken line as well as the moves at each key moment.
  const seen=new Set();
  return duties.filter(d=>{
    if(d.type==='move'||d.type==='posture')return true;
    if(d.key===20&&/incenses the Priest|incenses the people/.test(d.text))return true;
    const key=d.step+':'+d.type;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}

function sayPool(sayRole){
  const lines=[];
  for(const source of [STEPS,ORIGINAL_STEPS]){
    source.forEach((step,i)=>{
      for(const [who,text] of step.say||[])if(who===sayRole)lines.push({text,step:i,key:step.key??i});
    });
  }
  return lines;
}
function actPool(actor){
  const acts=[];
  for(const step of ORIGINAL_STEPS.concat(STEPS)){
    for(const [text] of step.acts?.[actor]||[])if(text)acts.push(text);
  }
  return [...new Set([...acts,...GENERIC_ACTS])];
}

function pickDistractors(correct,pool,count,random,avoid=[]){
  const banned=new Set([correct,...avoid].map(x=>String(x).toLowerCase()));
  const result=[];
  for(const item of shuffled([...new Set(pool)],random)){
    if(result.length>=count)break;
    if(banned.has(String(item).toLowerCase()))continue;
    banned.add(String(item).toLowerCase());
    result.push(item);
  }
  return result;
}

function decisionTimer(level,kind){
  if(level!=='timed')return 0;
  return {move:12,act:10,say:14,posture:8,cue:10,nudge:12,task:12,place:12}[kind]||12;
}

// Turns one duty into a decision for the chosen level.
function buildDecision(duty,level,seed=1,allDuties=[]){
  const random=seededRandom(seed+'|'+duty.id);
  const rules=GAME_LEVELS[level]||GAME_LEVELS.choice;
  const prompt={move:'Where do you go now?',act:'What do you do now?',say:duty.role==='PEW'?'What do you say or sing now?':'What do you say now?',posture:'What posture now?'}[duty.type];
  const simultaneous=allDuties.filter(d=>d.step===duty.step&&d.type===duty.type&&Math.abs(d.t-duty.t)<.12).map(d=>d.answer);
  const decision={id:duty.id,kind:duty.type,duty,prompt,correct:duty.answer,timer:decisionTimer(level,duty.type),ref:duty.ref,title:duty.title,level,attempts:rules.attempts,input:'options',options:[]};
  const want=rules.options?rules.options-1:0;
  let distractors=[];
  if(duty.type==='move'){
    decision.target=duty.to;
    const altarFamily=new Set(['altar','altarP','altarD','altarFront','altarRight','altarLeft']);
    const near=PLACE_DISTRACTORS.map(id=>GAME_PLACES.find(p=>p.id===id)).filter(p=>p&&p.id!==duty.place&&distance(p.at,duty.to)>100&&
      !(altarFamily.has(duty.place)&&altarFamily.has(p.id))&&!(duty.to[1]<232&&distance(duty.to,[500,140])<140&&altarFamily.has(p.id)));
    distractors=shuffled(near,random).slice(0,want).map(p=>({label:p.name,at:p.at}));
    if(level==='expert')decision.input='floor';
  }else if(duty.type==='homily'){
    decision.kind='move';
    decision.prompt='Where will you preach the homily? Either place is permitted.';
    decision.targets=duty.targets;
    decision.target=AMBO;
    decision.correctValues=['the ambo',"the celebrant's chair"];
    decision.options=[{label:'the ambo',at:AMBO,correct:true},{label:"the celebrant's chair",at:CHAIR,correct:true}];
    if(level==='expert')decision.input='floor';
    return decision;
  }else if(duty.type==='posture'){
    distractors=['stand','sit','kneel'].filter(x=>x!==duty.answer).slice(0,Math.min(2,want)).map(label=>({label}));
  }else if(duty.type==='say'){
    const sayRole=GAME_ROLES[duty.role]?.sayRole||duty.role;
    const pool=sayPool(sayRole).filter(l=>Math.abs(l.step-duty.step)<=6).map(l=>l.text);
    distractors=pickDistractors(duty.answer,pool.length>3?pool:sayPool(sayRole).map(l=>l.text),want,random,simultaneous).map(label=>({label}));
    if(level==='expert')decision.input='book';
  }else{
    const actor=GAME_ROLES[duty.role]?.actor||duty.role;
    const pool=actPool(actor);
    if(level==='expert'){
      decision.input='palette';
      distractors=pickDistractors(duty.answer,pool,11,random,simultaneous).map(label=>({label}));
    }else distractors=pickDistractors(duty.answer,pool,want,random,simultaneous).map(label=>({label}));
  }
  const correctOption={label:duty.answer,correct:true,...(duty.type==='move'?{at:duty.to}:{})};
  decision.options=isGuided(level)?[correctOption]:shuffled([correctOption,...distractors.map(d=>({...d,correct:false}))],random);
  if(duty.type==='posture'&&!isGuided(level))decision.options=['stand','sit','kneel'].map(label=>({label,correct:label===duty.answer}));
  return decision;
}

const MOVE_TOLERANCE=45;
function checkAnswer(decision,answer){
  if(decision.kind==='move'&&Array.isArray(answer)){
    return (decision.targets||[decision.target]).some(target=>distance(answer,target)<=MOVE_TOLERANCE);
  }
  if(decision.correctValues)return decision.correctValues.includes(answer);
  if(decision.kind==='cue'||decision.kind==='nudge')return decision.correctRoles.includes(answer);
  if(decision.kind==='task'&&decision.validIds)return decision.validIds.includes(answer);
  if(decision.kind==='place'){
    if(Array.isArray(answer))return decision.places.some(id=>{const p=GAME_PLACES.find(x=>x.id===id);return p&&distance(answer,p.at)<=Math.max(p.r,35);});
    return decision.places.includes(answer)||decision.options.some(o=>o.correct&&o.label===answer);
  }
  if(decision.kind==='pew')return Array.isArray(answer)&&inPews(answer);
  return String(answer).trim().toLowerCase()===String(decision.correct).trim().toLowerCase();
}

const SCORE_RULES={first:100,retry:40,expert:150,expertRetry:60,timeBonus:50,nudge:80,lateNudge:0,wrongNudge:-20};
function createScoreboard(){
  return {points:0,possible:0,decisions:0,correct:0,firstTry:0,wrong:0,timeouts:0,lapsesCaught:0,lapsesMissed:0,log:[]};
}
// One finished decision. attempt is 1-based; remaining is the timer fraction left (0-1).
function scoreDecision({level,correct,attempt=1,remaining=0,timedOut=false}){
  if(timedOut||!correct)return 0;
  const expert=level==='expert';
  let points=attempt<=1?(expert?SCORE_RULES.expert:SCORE_RULES.first):(expert?SCORE_RULES.expertRetry:SCORE_RULES.retry);
  if(level==='timed'&&attempt<=1)points+=Math.round(SCORE_RULES.timeBonus*Math.max(0,Math.min(1,remaining)));
  if(isGuided(level))points=Math.round(points/4);
  return points;
}
function maxScore(level){
  const base=level==='expert'?SCORE_RULES.expert:SCORE_RULES.first;
  return isGuided(level)?Math.round(base/4):base+(level==='timed'?SCORE_RULES.timeBonus:0);
}
function recordResult(board,decision,result){
  const points=decision.kind==='nudge'
    ?(result.correct?SCORE_RULES.nudge:0)
    :scoreDecision({level:decision.level,...result});
  board.points+=points;
  board.possible+=decision.kind==='nudge'?SCORE_RULES.nudge:maxScore(decision.level);
  board.decisions++;
  if(result.correct){board.correct++;if((result.attempt||1)<=1)board.firstTry++;}
  else if(result.timedOut)board.timeouts++;
  else board.wrong++;
  if(decision.kind==='nudge'){if(result.correct)board.lapsesCaught++;else board.lapsesMissed++;}
  board.log.push({id:decision.id,title:decision.title,kind:decision.kind,prompt:decision.prompt,correct:result.correct,answer:result.answer,expected:decision.correct,ref:decision.ref,points,timedOut:!!result.timedOut,attempt:result.attempt||1});
  return points;
}
function penalise(board,points,reason,ref){
  board.points+=points;
  board.log.push({title:reason,kind:'penalty',correct:false,points,ref});
}
function gradeBoard(board){
  const percent=board.possible?Math.max(0,Math.round(board.points/board.possible*100)):0;
  const verdict=percent>=90?'Exemplary: ready to serve at a solemn Mass.':percent>=75?'Well done: a few points to revise.':percent>=50?'Good start: practise the marked steps.':'Keep practising with Guided involvement.';
  return {percent,verdict};
}

// NPC lapses that a Priest, Deacon or M.C. must notice and correct.
const LAPSE_COUNTS={watch:0,guided:2,choice:3,timed:3,expert:4};
function lapseCandidates(playerRole,visible,steps=STEPS){
  const roles=['D','S','X','C1','C2','T','MB','CB','L','L2','Ps','U','E'].filter(r=>visible.has(r)&&r!==playerRole);
  const result=[];
  for(const role of roles){
    for(const duty of deriveDuties(role,steps)){
      if(duty.type==='say'||duty.text==='kneels'||/^kneels/.test(duty.text))continue;
      if(duty.key===0||duty.key===40||duty.key===1)continue;
      result.push({...duty,role});
    }
  }
  return result.sort((a,b)=>a.step-b.step||a.t-b.t);
}
function planLapses({playerRole,level='choice',enabled=true,seed=1,visible,steps=STEPS,avoid=[]}){
  if(!enabled||GAME_LEVELS[level]?.watch||!GAME_ROLES[playerRole]?.nudges)return [];
  const random=seededRandom('lapse|'+seed);
  const avoidIds=new Set(avoid.map(d=>d.step+':'+d.t.toFixed(3)));
  const pool=lapseCandidates(playerRole,visible,steps).filter(d=>!avoidIds.has(d.step+':'+d.t.toFixed(3)));
  const count=Math.min(pool.length,(LAPSE_COUNTS[level]??3)+(playerRole==='MC'?2:0));
  const chosen=[];
  for(let n=0;n<count;n++){
    const from=Math.floor(n*pool.length/count), to=Math.floor((n+1)*pool.length/count);
    const options=pool.slice(from,to).filter(d=>!chosen.some(c=>Math.abs(c.step-d.step)<2));
    if(!options.length)continue;
    const duty=options[Math.floor(random()*options.length)];
    const kind=playerRole==='MC'&&chosen.length%2===1?'wrong':'missed';
    chosen.push({id:'lapse:'+duty.id,role:duty.role,step:duty.step,key:duty.key,t:duty.t,kind,duty,ref:duty.ref,title:duty.title,
      wrongAction:kind==='wrong'?'sits down instead':'looks away',
      expected:duty.text});
  }
  return chosen;
}
function lapseRecoverySeconds(level){
  return {watch:0,guided:0,choice:20,timed:12,expert:20}[level]??20;
}
function nudgeDecision(lapse,level,visible){
  const correctRoles=lapse.role==='C1'||lapse.role==='C2'?[lapse.role]:[lapse.role];
  const ministers=[...visible].filter(r=>!['P','ppl','G1','G2'].includes(r));
  return {id:lapse.id,kind:'nudge',prompt:'Who needs a reminder? Due now: '+lapse.expected+'.',correctRoles,correct:ROLE_NAMES[lapse.role],
    ref:lapse.ref,title:lapse.title,level,timer:lapseRecoverySeconds(level),attempts:3,input:level==='expert'?'figure':'options',
    options:ministers.map(r=>({label:ROLE_NAMES[r]+(ministers.filter(o=>ROLE_NAMES[o]===ROLE_NAMES[r]).length>1?' '+(ministers.filter(o=>ROLE_NAMES[o]===ROLE_NAMES[r]).indexOf(r)+1):''),role:r,correct:correctRoles.includes(r)})),lapse};
}

// The M.C. cues ministers before their duties.
function deriveCues(visible,steps=STEPS,detail='key'){
  const roles=['D','S','X','C1','C2','T','MB','CB','L','L2','Ps','U','E'].filter(r=>visible.has(r));
  const all=[];
  for(const role of roles){
    for(const duty of deriveDuties(role,steps)){
      if(duty.type==='say'||/^kneels/.test(duty.text)||duty.text==='profound bow'||duty.text==='bows')continue;
      if(duty.key===40)continue;
      all.push({...duty,role});
    }
  }
  all.sort((a,b)=>a.step-b.step||a.t-b.t);
  const cues=[];
  for(const duty of all){
    const same=cues.find(c=>c.step===duty.step&&Math.abs(c.t-duty.t)<.04&&c.type===duty.type&&(c.text===duty.text||c.type==='move'));
    if(same){if(!same.correctRoles.includes(duty.role))same.correctRoles.push(duty.role);continue;}
    if(detail==='key'&&cues.some(c=>c.step===duty.step)&&
      !(duty.key===20&&/incenses the Priest/.test(duty.text)))continue;
    cues.push({...duty,correctRoles:[duty.role]});
  }
  return cues;
}
function describeCue(duty){
  if(duty.type==='move')return 'Someone must now go to '+placeFor(duty.to,duty.role).name.replace('your own seat','their seat')+'.';
  return 'Due now: "'+duty.text+'".';
}
function cueDecision(cue,level,visible,seed=1){
  const random=seededRandom('cue|'+seed+'|'+cue.id);
  const ministers=[...visible].filter(r=>!['P','ppl','G1','G2'].includes(r));
  let options=ministers.map(r=>({label:ROLE_NAMES[r]+(r.startsWith('C')?' ('+r+')':''),role:r,correct:cue.correctRoles.includes(r)}));
  if(isGuided(level))options=options.filter(o=>o.correct).slice(0,1);
  else if(level!=='expert'){
    const right=options.filter(o=>o.correct).slice(0,1);
    options=shuffled([...right,...shuffled(options.filter(o=>!o.correct),random).slice(0,3)],random);
  }
  return {id:'cue:'+cue.id,kind:'cue',prompt:'Cue the right minister. '+describeCue(cue),correctRoles:cue.correctRoles,correct:cue.correctRoles.map(r=>ROLE_NAMES[r]).join(' or '),
    ref:cue.ref,title:cue.title,level,timer:decisionTimer(level,'cue'),attempts:GAME_LEVELS[level].attempts,input:level==='expert'?'figure':'options',options,duty:cue};
}

// Sacristan: items to set out before Mass (GIRM 105, 117-118) and to put away after it.
function sacristanSetup(options,team=serverTeam(options.serverCount)){
  const has=r=>team.includes(r);
  const ep=options.eucharisticPrayer||'II';
  const items=[
    {id:'altarCloth',name:'White cloth on the altar',place:'altar',needed:true,ref:'GIRM 117, 304'},
    {id:'altarCandles',name:'Candles on or near the altar, lit',place:'altar',needed:true,ref:'GIRM 117, 307'},
    {id:'altarCross',name:'Cross set up on its stand near the altar',place:['crossStand','altar'],needed:!has('X'),ref:'GIRM 117, 122, 308',reason:'Without a cross-bearer the cross is already in place beside the altar.'},
    {id:'procCross',name:'Processional cross ready in the sacristy',place:'sacristy',needed:has('X'),ref:'GIRM 120b, 122',reason:'It is carried in the procession and then placed near the altar.'},
    {id:'procCandles',name:'Two processional candles ready, lit',place:'sacristy',needed:has('C1'),ref:'GIRM 117, 120b'},
    {id:'gospels',name:'Book of the Gospels ready for the procession',place:'sacristy',needed:options.deacon||options.lector&&options.lectorProcession,ref:'GIRM 117, 120d, 172, 194',reason:'Carried by the Deacon (or by a lector who joins the procession if there is no Deacon).'},
    {id:'gospelsAltar',name:'Book of the Gospels placed on the altar',place:'altar',needed:!options.deacon&&!(options.lector&&options.lectorProcession),ref:'GIRM 117',reason:'With nobody to carry it, it may be placed on the altar beforehand.'},
    {id:'lectionary',name:'Lectionary on the ambo, marked',place:'ambo',needed:true,ref:'GIRM 118b'},
    {id:'missal',name:'Roman Missal marked (Collect, Preface, EP '+ep+(options.solemnBlessing?', Solemn Blessing':'')+')',place:['credence','chair','bookStand'],needed:true,ref:'GIRM 118a'},
    {id:'chalice',name:'Chalice with purificator, paten and pall',place:'credence',needed:true,ref:'GIRM 118c'},
    {id:'corporal',name:'Corporal',place:'credence',needed:true,ref:'GIRM 118c'},
    {id:'water',name:'Cruet of water',place:'credence',needed:true,ref:'GIRM 118c'},
    {id:'lavabo',name:'Lavabo bowl, jug and towel',place:'credence',needed:true,ref:'GIRM 118c'},
    {id:'commPlate',name:'Communion plate for the faithful',place:'credence',needed:true,ref:'GIRM 118c'},
    {id:'wine',name:'Cruet of wine',place:options.giftsProcession?'giftTable':'credence',needed:true,ref:options.giftsProcession?'GIRM 73, 118c':'GIRM 118c',reason:options.giftsProcession?'The faithful bring it up in the procession of the gifts.':'No procession of the gifts today.'},
    {id:'ciborium',name:'Ciborium with altar breads',place:options.giftsProcession?'giftTable':'credence',needed:true,ref:options.giftsProcession?'GIRM 73, 118c':'GIRM 118c'},
    {id:'emhcVessel',name:'Additional ciborium for the authorised EMHC',place:'credence',needed:!!options.emhc,ref:'GIRM 118c, 162'},
    {id:'collectionBasket',name:'Collection basket ready for the usher',place:'giftTable',needed:!!options.collection,ref:'GIRM 105c'},
    {id:'chalice2',name:'Second chalice for Communion under both kinds',place:'credence',needed:!!options.bothKinds,ref:'GIRM 118c, 285a'},
    {id:'aspersory',name:'Holy-water vessel and sprinkler',place:'credence',needed:options.introductory==='sprinkling',ref:'GIRM 51; Missal App. II'},
    {id:'thurible',name:'Thurible with lit charcoal, and boat with incense',place:'sacristy',needed:!!options.incense,ref:'GIRM 120a, 276'},
    {id:'altarBell',name:'Altar bell at the sanctuary step',place:'sanctuaryStep',needed:!!(options.bells.epiclesis||options.bells.elevation),ref:'GIRM 150 (local custom)'},
    {id:'sacristyBell',name:'Sacristy bell by the door',place:'sacristy',needed:!!options.bells.start,ref:'Local custom'},
    {id:'vestP',name:'Vestments for the Priest (alb, stole, chasuble)',place:'sacristy',needed:true,ref:'GIRM 337'},
    {id:'vestD',name:'Vestments for the Deacon (alb, stole, dalmatic)',place:'sacristy',needed:!!options.deacon,ref:'GIRM 338'},
    {id:'insignia',name:'The Bishop\u2019s mitre and pastoral staff',place:'sacristy',needed:!!options.bishop,ref:'Pontificales ritus 18-19; CB 128',reason:'The Bishop vests in the sacristy and wears them in the procession.'},
    {id:'vimps',name:'Two vimps for the mitre- and crozier-bearers',place:'sacristy',needed:!!options.bishop,ref:'Custom (Elliot, Ceremonies Explained for Servers)',reason:'The bearers hold the insignia through the vimps, not with bare hands.'},
    {id:'vestS',name:'Albs or cassock and surplice for '+team.length+' server'+(team.length===1?'':'s'),place:'sacristy',needed:team.length>0,ref:'GIRM 339'},
    {id:'lamp',name:'Sanctuary lamp burning before the tabernacle',place:'tabernacle',needed:true,ref:'GIRM 316'},
    {id:'hosts',name:'Bring consecrated hosts out of the tabernacle onto the altar',place:'altar',needed:false,trap:true,ref:'GIRM 85',reason:'Not a sacristan task, and the faithful should ideally receive hosts consecrated at the same Mass.'}
  ];
  return items.map(item=>({...item,places:[].concat(item.place)}));
}
function sacristanPackAway(options,team=serverTeam(options.serverCount)){
  const has=r=>team.includes(r);
  return [
    {id:'candlesOut',name:'Extinguish the altar candles',place:'altar',needed:true,ref:'Judgement call (after the ministers leave)'},
    {id:'procBack',name:'Return the processional cross and candles to the sacristy',place:'sacristy',needed:has('X')||has('C1'),ref:'GIRM 105'},
    {id:'booksBack',name:'Return the Missal, Lectionary and Book of the Gospels',place:'sacristy',needed:true,ref:'GIRM 105'},
    {id:'vessels',name:'Wash the chalice, paten and ciborium (already purified at Mass)',place:'sacristy',needed:true,ref:'GIRM 163, 183, 279'},
    {id:'linens',name:'Purificators, corporal and towel to the linen basket',place:'sacristy',needed:true,ref:'GIRM 105'},
    {id:'cruets',name:'Rinse and put away the cruets',place:'sacristy',needed:true,ref:'GIRM 105'},
    {id:'thuribleOut',name:'Empty the thurible safely into the sand or ash bucket',place:'sacristy',needed:!!options.incense,ref:'Judgement call (fire safety)'},
    {id:'aspersoryBack',name:'Return the holy-water vessel and sprinkler',place:'sacristy',needed:options.introductory==='sprinkling',ref:'GIRM 105'},
    {id:'bellBack',name:'Put the altar bell away',place:'sacristy',needed:!!(options.bells.epiclesis||options.bells.elevation),ref:'GIRM 105'},
    {id:'giftTable',name:'Clear the gift table',place:'giftTable',needed:!!options.giftsProcession,ref:'GIRM 105'},
    {id:'vestments',name:'Hang up the vestments',place:'sacristy',needed:true,ref:'GIRM 105'},
    {id:'dustCover',name:'Put the dust cover on the altar cloth',place:'altar',needed:true,ref:'Local custom'},
    {id:'lampOut',name:'Extinguish the sanctuary lamp',place:'tabernacle',needed:false,trap:true,ref:'GIRM 316',reason:'It burns permanently while the Blessed Sacrament is reserved.'},
    {id:'hostsAway',name:'Move the remaining hosts into the tabernacle yourself',place:'tabernacle',needed:false,trap:true,ref:'GIRM 163',reason:'The Priest or Deacon reserves the Blessed Sacrament during Mass.'},
    {id:'pourAway',name:'Pour the remaining Precious Blood down the sink',place:'sacristy',needed:false,trap:true,ref:'GIRM 163, 182',reason:'What remains is consumed at the altar, never poured away.'},
    {id:'charcoalBin',name:'Tip the lit charcoal into the rubbish bin',place:'sacristy',needed:false,trap:true,ref:'Judgement call (fire safety)',reason:'Lit charcoal goes into a sand or ash bucket.'}
  ].map(item=>({...item,places:[].concat(item.place)}));
}
// Sacristan training: opening a locked church before anyone else arrives. The order is common
// parish practice (judgement call): in through the sacristy, then the main doors from inside.
const SACRISTAN_ARRIVAL=[1320,260];
const CUPBOARD=[1180,190];
function sacristanOpening(){
  const ref='Judgement call (common parish practice; GIRM 105)';
  const place=id=>GAME_PLACES.find(p=>p.id===id);
  const opt=(id,correct)=>({label:place(id).name,correct,at:place(id).at});
  return [
    {id:'unlock',kind:'place',prompt:'You are the first to arrive and the church is locked. Which door do you unlock?',ref,places:['sacristyDoor'],target:place('sacristyDoor').at,correct:place('sacristyDoor').name,
      explain:'Let yourself in by the sacristy; the main doors are opened from inside.',options:[opt('sacristyDoor',true),opt('outside',false),opt('door',false)]},
    {id:'enter',kind:'place',prompt:'The sacristy door is open. Where do you go?',ref,places:['sacristy'],target:SACRISTY,correct:place('sacristy').name,
      options:[opt('sacristy',true),opt('altar',false),opt('ambo',false)]},
    {id:'lights',kind:'task',prompt:'You are in the sacristy. What do you do first?',ref:'GIRM 316; judgement call',correct:'Switch on the lights and check the sanctuary lamp is burning',
      explain:'The sanctuary lamp burns while the Blessed Sacrament is reserved; if it has gone out, relight it.',
      options:['Switch on the lights and check the sanctuary lamp is burning','Ring the sacristy bell','Light the altar candles straight away'].map((label,i)=>({label,correct:i===0}))},
    {id:'openMain',kind:'place',prompt:'Now open the main doors so the faithful can come in.',ref,places:['mainDoors'],target:place('mainDoors').at,correct:place('mainDoors').name,
      explain:'From inside, so the church is never left open and empty.',options:[opt('mainDoors',true),opt('outside',false),opt('credence',false)]}
  ];
}
// Order for taking things out of the cupboard: vestments first (they stay in the sacristy),
// then the altar, then the credence and the rest. Items not needed stay in the cupboard.
function cupboardOrder(items){
  const rank=item=>item.places[0]==='sacristy'?0:item.places[0]==='altar'?1:item.places[0]==='credence'?2:3;
  return items.map((item,i)=>({item,i})).sort((a,b)=>rank(a.item)-rank(b.item)||a.i-b.i).map(x=>x.item);
}
// Seconds before a visual hint shows where the next thing goes.
function hintDelay(level){return level==='guided'?0:level==='expert'?12:6;}
function checklistScore(items,done){
  const chosen=new Set(done);
  let correct=0,missed=0,traps=0,extra=0;
  for(const item of items){
    if(item.needed&&chosen.has(item.id))correct++;
    else if(item.needed)missed++;
    else if(chosen.has(item.id))(item.trap?traps++:extra++);
  }
  const needed=items.filter(i=>i.needed).length;
  return {correct,missed,traps,extra,needed,complete:missed===0,points:correct*50-traps*60-extra*20,possible:needed*50};
}

// Bells and thurible clinks with absolute times.
function deriveSoundCues(steps=STEPS,startTimes){
  const cues=[];
  let clock=0;
  steps.forEach((step,i)=>{
    const start=startTimes?startTimes[i]:clock;
    clock=start+step.dur;
    for(const [a,b] of step.bell||[]){
      cues.push({type:step.key===0?'sacristyBell':'bell',step:i,key:step.key,time:start+a*step.dur,until:start+b*step.dur});
    }
    for(const [,text,a,b] of step.say||[]){
      if(/^\((?:brief silence|silence|silent prayer|sacred silence)\)$/i.test(text))cues.push({type:'silence',step:i,key:step.key,time:start+a*step.dur,until:start+b*step.dur});
    }
    for(const [actor,acts] of Object.entries(step.acts||{})){
      for(const [text,a,b] of acts){
        if(!/incens/i.test(text||''))continue;
        const match=/\((\d+)\s*swings?\)/.exec(text);
        const swings=match?Number(match[1]):(/altar|gifts|offerings/i.test(text)?6:3);
        cues.push({type:'thurible',step:i,key:step.key,actor,time:start+a*step.dur,until:start+b*step.dur,swings});
      }
    }
  });
  return cues.sort((a,b)=>a.time-b.time);
}

// The sacristy bell cue that should sound when a question opens just before the procession moves off.
function preProcessionBell(cues,stopTime,firstStepEnd=Infinity){
  if(!(stopTime<firstStepEnd))return null;
  return (cues||[]).find(c=>c.type==='sacristyBell'&&c.key===0&&!c.rung&&stopTime<=c.until+1e-6)||null;
}
// After going back in time, bells from then on may ring again.
function rewindCues(cues,time){
  for(const cue of cues||[])if(cue.time>=time-1e-6)cue.rung=false;
}

// The player's book: today's texts plus omitted ones, grouped by part.
function buildBook(sayRole,steps=STEPS){
  const used=new Set(steps.map(s=>s.key));
  const pages=[];
  // Rites other than Mass have string keys: their book holds only their own texts.
  const source=typeof steps[0]?.key==='string'?steps:ORIGINAL_STEPS;
  if(source===steps){
    for(const step of steps){
      const lines=(step.say||[]).filter(([who])=>who===sayRole).map(([,text])=>text);
      if(!lines.length)continue;
      let page=pages.find(p=>p.part===step.part);
      if(!page){page={part:step.part,sections:[]};pages.push(page);}
      page.sections.push({key:step.key,title:step.title,ref:step.ref,lines,today:true,note:''});
    }
    return pages;
  }
  ORIGINAL_STEPS.forEach((step,key)=>{
    const today=steps.find(s=>s.key===key);
    const source=today||step;
    const lines=(source.say||[]).filter(([who])=>who===sayRole).map(([,text])=>text);
    if(!lines.length)return;
    let page=pages.find(p=>p.part===source.part);
    if(!page){page={part:source.part,sections:[]};pages.push(page);}
    page.sections.push({key,title:source.title,ref:source.ref,lines,today:used.has(key),note:used.has(key)?'':'(when prescribed / not used today)'});
  });
  return pages;
}
function findInBook(book,text){
  for(let p=0;p<book.length;p++)for(const s of book[p].sections)if(s.lines.includes(text))return {page:p,key:s.key};
  return null;
}

// What each role does before the procession.
function preMassTasks(role,options,team=serverTeam(options.serverCount),startPos){
  const tasks=[];
  const vest=(ref,correct,wrong)=>tasks.push({id:'vest',kind:'task',prompt:'Vest for Mass. What do you put on?',ref,options:shuffled([correct,...wrong],seededRandom(role+'vest')).map(label=>({label,correct:label===correct})),correct});
  if(role==='P')vest('GIRM 337','Alb, stole and chasuble',['Alb and dalmatic','Cassock and surplice only','Cope over a surplice']);
  if(role==='D')vest('GIRM 338, 340','Alb, diagonal stole and dalmatic',['Alb, stole and chasuble','Cassock and surplice only','Alb with the stole around the neck']);
  if(role==='MB'||role==='CB')vest('GIRM 339; custom (Elliot, Ceremonies Explained for Servers)','Alb (or cassock and surplice), with a white vimp over the shoulders',['Dalmatic','Stole over the alb','Cope']);
  if(['S','X','C1','T'].includes(role))vest('GIRM 339','Alb (or cassock and surplice)',['Dalmatic','Stole over the alb','Chasuble']);
  if(role==='L'||role==='L2')tasks.push({id:'prepare',kind:'task',prompt:'Before Mass, what should you check?',ref:'GIRM 118b; 196',correct:'Find and read through today\'s reading in the Lectionary',options:[
    'Find and read through today\'s reading in the Lectionary','Mark the Preface in the Missal','Light the thurible','Put on a stole'].map(label=>({label,correct:label.startsWith('Find')}))});
  const carry={MB:['Nothing: the Bishop wears the mitre in the procession','CB 128; Pontificales ritus 18'],CB:['Nothing: the Bishop carries the pastoral staff in the procession','CB 128; Pontificales ritus 19'],D:['Book of the Gospels','GIRM 172'],X:['Processional cross','GIRM 120b'],C1:['A lit processional candle','GIRM 120b'],T:['Thurible with burning incense','GIRM 120a, 276'],L:options.deacon||!options.lectorProcession?null:['Book of the Gospels (slightly elevated)','GIRM 194']}[role];
  if(carry){
    const pool=['Book of the Gospels','Processional cross','A lit processional candle','Thurible with burning incense','The Roman Missal','The chalice','Nothing'];
    const correct=carry[0];
    const options2=shuffled([correct,...pool.filter(x=>!correct.startsWith(x)&&!x.startsWith(correct)).slice(0,3)],seededRandom(role+'carry'));
    tasks.push({id:'carry',kind:'task',prompt:'What do you carry in the procession?',ref:carry[1],correct,options:options2.map(label=>({label,correct:label===correct}))});
  }
  if(role==='MC'){
    const order=procOrder(options,team);
    const wrong1=[...order].reverse().join(' → ');
    const wrong2=order.filter(x=>x!=='Priest').concat([]).join(' → ').replace(/^/,'Priest → ');
    tasks.push({id:'order',kind:'task',prompt:'Line up the procession. Which order is correct?',ref:'GIRM 120, 172',correct:order.join(' → '),options:shuffled([order.join(' → '),wrong1,wrong2],seededRandom('mcorder')).map(label=>({label,correct:label===order.join(' → ')}))});
    tasks.push({id:'credence',kind:'task',prompt:'Final check of the credence table. What must be there?',ref:'GIRM 118c',correct:'Chalice, corporal, purificator, water, lavabo set',options:[
      'Chalice, corporal, purificator, water, lavabo set','The Book of the Gospels','The thurible','The Lectionary'].map(label=>({label,correct:label.startsWith('Chalice')}))});
  }
  if(role==='E'||role==='U')tasks.push({id:'prepare',kind:'task',prompt:'Check your ministry before Mass.',ref:role==='E'?'GIRM 162':'GIRM 105c',
    correct:role==='E'?'Confirm authorisation and the Communion station; wait in your pew':'Prepare the collection basket and wait in your pew',
    options:(role==='E'?['Confirm authorisation and the Communion station; wait in your pew','Take a ciborium from the altar yourself','Purify the chalice yourself']:
      ['Prepare the collection basket and wait in your pew','Put collection money on the altar','Begin the collection during the Gospel']).map((label,i)=>({label,correct:i===0}))});
  if(['L','L2','U','E'].includes(role)&&!(role==='L'&&options.lectorProcession)){
    const place=role==='U'?'usherSeat':role==='E'?'emhcSeat':'readerSeat';
    const seat=GAME_PLACES.find(p=>p.id===place);
    tasks.push({id:'line',kind:'place',prompt:'Wait in your place with the congregation.',ref:'GIRM 43; parish seating custom',
      target:HOME[role],places:[place],correct:seat.name,options:[{label:seat.name,correct:true},{label:'the back of the church (procession line)',correct:false},{label:'the altar',correct:false}]});
    return tasks;
  }
  if(role==='AV'){
    tasks.push({id:'prepare',kind:'task',prompt:'Before Mass, how do you prepare the screen?',ref:'Judgement call (parish practice); GIRM 39-41 on singing',
      correct:"Load today's slides and backing tracks in the order of Mass and test the sound",options:shuffled([
        "Load today's slides and backing tracks in the order of Mass and test the sound",'Play music loudly while people pray before Mass','Leave the projector off until the Gospel','Put the slides in alphabetical order'],seededRandom('avprep')).map(label=>({label,correct:label.startsWith('Load')}))});
    const desk=GAME_PLACES.find(p=>p.id==='avDesk');
    tasks.push({id:'line',kind:'place',prompt:'Go to the operator desk.',ref:'Judgement call (parish practice)',target:AV_DESK,places:['avDesk'],correct:desk.name,
      options:shuffled([{label:desk.name,correct:true},{label:'the credence table',correct:false},{label:'the ambo',correct:false},{label:'the back of the church (procession line)',correct:false}],seededRandom('avline'))});
    return tasks;
  }
  if(role==='PEW'){
    tasks.push({id:'stoup',kind:'place',prompt:'You arrive at the church. Where do you go first?',ref:'Custom: signing oneself with holy water on entering',places:['stoup'],correct:'the holy-water stoup by the door',
      options:[{label:'the holy-water stoup by the door',correct:true},{label:"the celebrant's chair",correct:false},{label:'the credence table',correct:false}]});
    tasks.push({id:'reverence',kind:'task',prompt:'Before entering your pew, what do you do?',ref:'GIRM 274 (by analogy); custom',correct:'Genuflect toward the tabernacle',options:[
      'Genuflect toward the tabernacle','Ring the altar bell','Bow to the ambo','Light a candle on the altar'].map(label=>({label,correct:label.startsWith('Genuflect')}))});
    tasks.push({id:'pew',kind:'pew',prompt:'Find a place in a pew.',ref:'Judgement call',correct:'any pew',options:[]});
  }else if(role!=='SAC'&&startPos&&startPos[1]<300){
    // Ministers who do not walk in the procession wait in the sanctuary.
    const place=GAME_PLACES.find(p=>p.id!=='altar'&&distance(startPos,p.at)<=p.r)||GAME_PLACES.find(p=>p.id==='serverBench');
    tasks.push({id:'line',kind:'place',prompt:'You do not walk in the procession. Where do you wait for it?',ref:'GIRM 120 (judgement call: this server waits in the sanctuary)',target:startPos,places:[place.id],correct:place.name,
      options:shuffled([{label:place.name,correct:true},{label:'the back of the church (procession line)',correct:false},{label:'the ambo',correct:false},{label:"the celebrant's chair",correct:false}],seededRandom(role+'line'))});
  }else if(role!=='SAC'){
    const target=startPos||(role==='MC'?MC_START:[500,770]);
    tasks.push({id:'line',kind:'place',prompt:'Go to your place in the entrance procession at the back of the church.',ref:'GIRM 120',target,places:['procession'],correct:'the back of the church (procession line)',
      options:shuffled([{label:'the back of the church (procession line)',correct:true},{label:"the celebrant's chair",correct:false},{label:'the credence table',correct:false},{label:'the ambo',correct:false}],seededRandom(role+'line'))});
  }
  return tasks;
}
// After the recession: back to the sacristy, then one closing task.
function postMassTasks(role,options){
  const tasks=[];
  if(['L','L2','U','E'].includes(role)&&!(role==='L'&&options.lectorProcession)){
    const correct=role==='U'?'Secure the collection according to parish procedures':role==='E'?'Leave the vessels for the Priest, Deacon or instituted acolyte to purify':'Check that the Lectionary is put away if that is your task';
    return [{id:'close',kind:'task',prompt:'After the exit procession, what is your closing task?',ref:'GIRM 105, 162, 196, 279; local practice',correct,
      options:[correct,'Leave during the final blessing','Take sacred vessels home'].map((label,i)=>({label,correct:i===0}))}];
  }
  if(role==='AV'){
    const correct='Fade out, show a blank or welcome slide, then shut down the projector';
    return [{id:'close',kind:'task',prompt:'The recessional hymn has ended. What do you do?',ref:'Judgement call (parish practice)',correct,
      options:shuffled([correct,'Leave the last hymn looping','Switch off mid-verse as the Priest reaches the door','Start the next Mass\'s slides now'],seededRandom('avclose')).map(label=>({label,correct:label===correct}))}];
  }
  if(role==='PEW'){
    tasks.push({id:'leave',kind:'task',prompt:'Mass has ended. When do you leave?',ref:'GIRM 90, 169 (judgement call on custom)',correct:'After the ministers have gone out (and the hymn has ended)',
      options:shuffled(['After the ministers have gone out (and the hymn has ended)','Straight after receiving Communion','During the final Blessing','Before the Dismissal, to beat the traffic'],seededRandom('pewleave')).map(label=>({label,correct:label.startsWith('After the ministers')}))});
    return tasks;
  }
  if(role==='SAC')return tasks;
  tasks.push({id:'where',kind:'place',prompt:'The procession has left the church. Where do you go?',ref:'GIRM 169, 186',places:['sacristy'],correct:'the sacristy',
    options:shuffled([{label:'the sacristy',correct:true},{label:'the altar',correct:false},{label:'the ambo',correct:false},{label:"the celebrant's chair",correct:false}],seededRandom(role+'where'))});
  const close={
    P:['Bow to the cross with the ministers, then take off the vestments','Count the collection','Pour away what remains in the chalice','Leave the vestments on the altar'],
    D:['Bow to the cross, then help put the Book of the Gospels away and unvest','Consume the remaining hosts in the sacristy','Extinguish the sanctuary lamp','Leave straight away in the dalmatic'],
    MC:['Bow to the cross, thank the ministers and check that everything is put away','Ring the altar bell again','Relight the candles for the next Mass','Leave the books open on the ambo'],
    L:['Bow to the cross with the others, then return the Lectionary if it is your job','Take the Lectionary home','Leave the Book of the Gospels on the floor','Ring the sacristy bell']
  }[role]||['Bow to the cross, put your item away safely and hang up your alb'+(options.incense&&role==='T'?' (charcoal into the sand bucket)':''),'Leave the thurible on the altar','Keep the alb on and go home','Blow out the sanctuary lamp'];
  tasks.push({id:'sacristy',kind:'task',prompt:'In the sacristy: what now?',ref:role==='MC'?'GIRM 106; CB 34-36 (judgement call)':'GIRM 105; custom',correct:close[0],
    options:shuffled(close,seededRandom(role+'close')).map(label=>({label,correct:label===close[0]}))});
  return tasks;
}
// Exposition: before and after (HCWEOM 91-92, 100).
function devotionPreTasks(role,options,startPos){
  if(role==='PEW')return preMassTasks('PEW',options);
  const tasks=[];
  const choose=(id,prompt,ref,correct,wrong)=>tasks.push({id,kind:'task',prompt,ref,correct,
    options:shuffled([correct,...wrong],seededRandom(role+id+'exp')).map(label=>({label,correct:label===correct}))});
  if(role==='P'||role==='D')choose('vest','Vest for Exposition and Benediction. What do you put on?','HCWEOM 92','Alb (or cassock and surplice), white stole and white cope',
    [role==='P'?'Alb, stole and chasuble':'Alb, stole and chasuble, as for Mass','Alb, diagonal stole and dalmatic','Cassock only, without a stole']);
  if(role==='D')choose('bless','May you, as Deacon, give the blessing with the monstrance?','HCWEOM 91, 99; CIC 943',
    'Yes: the Priest or Deacon is the ordinary minister, and blesses with the humeral veil',
    ['No: only a Priest may give Benediction','Only if the Bishop is present','Yes, but without the humeral veil']);
  if(role==='S'||role==='T')choose('vest','Vest to serve. What do you put on?','Custom; GIRM 339 by analogy','Alb (or cassock and surplice)',['Stole over the alb','Cope','Chasuble']);
  if(role==='T')choose('carry','What do you carry in?','HCWEOM 93','Thurible with burning incense',['The monstrance','The processional cross','Nothing']);
  if(role==='S')choose('prepare','What must be ready in the sanctuary?','HCWEOM 92, 99; custom',
    options.minister!=='lay'?'The humeral veil, and the bell if the parish rings it at the blessing':'Seats and the book of prayers for the adoration',
    ['The chalice and cruets','The Book of the Gospels on the altar','The collection baskets']);
  if(role==='E')choose('prepare','Before the exposition, what must be true?','HCWEOM 91; CIC 943',
    'I am authorised; I may expose and repose the Sacrament but not bless with it',
    ['I will bless the people with the monstrance at the end','I may leave the Sacrament exposed with nobody present','Anyone in the pew may expose the Sacrament']);
  const place=GAME_PLACES.find(p=>p.id==='sanctuaryDoor');
  tasks.push({id:'line',kind:'place',prompt:'Where do you wait until it is time to begin?',ref:'Judgement call',target:startPos||place.at,places:[place.id],correct:place.name,
    options:shuffled([{label:place.name,correct:true},{label:'the back of the church (procession line)',correct:false},{label:'the ambo',correct:false},{label:"the celebrant's chair",correct:false}],seededRandom(role+'expline'))});
  return tasks;
}
function devotionPostTasks(role,options){
  if(role==='PEW'){
    const correct='After the reposition, when the ministers have gone out';
    return [{id:'leave',kind:'task',prompt:'The Blessed Sacrament has been reposed. When do you leave?',ref:'HCWEOM 100 (judgement call on custom)',correct,
      options:shuffled([correct,'As soon as the Sacrament is exposed','During the blessing','Before the reposition, to beat the traffic'],seededRandom('pewexpleave')).map(label=>({label,correct:label===correct}))}];
  }
  const tasks=[{id:'where',kind:'place',prompt:'The ministers have left the church. Where do you go?',ref:'HCWEOM 100',places:['sacristy'],correct:'the sacristy',
    options:shuffled([{label:'the sacristy',correct:true},{label:'the altar',correct:false},{label:'the ambo',correct:false},{label:"the celebrant's chair",correct:false}],seededRandom(role+'expwhere'))}];
  const close={
    P:'Take off the cope, humeral veil and stole and put them away',
    D:'Take off the cope, humeral veil and stole and put them away',
    E:'Make sure the tabernacle is locked and the key is returned to its safe place',
    S:'Put the humeral veil and bell away and hang up your alb',
    T:'Put the charcoal safely in the sand bucket and hang up your alb'}[role];
  const wrong=['Leave the tabernacle key in the door','Leave the monstrance on the altar for next time','Keep the vestments on and go home'];
  tasks.push({id:'sacristy',kind:'task',prompt:'In the sacristy: what now?',ref:role==='E'?'CIC 938 §5; custom':'Custom',correct:close,
    options:shuffled([close,...wrong],seededRandom(role+'expclose')).map(label=>({label,correct:label===close}))});
  return tasks;
}
function procOrder(options,team){
  const order=[];
  if(team.includes('T'))order.push('Thurifer');
  if(team.includes('X'))order.push(team.includes('C1')?'Cross between candles':'Cross-bearer');
  else if(team.includes('C1'))order.push('Candle-bearers');
  if(team.includes('S'))order.push('Server');
  if(options.lector&&options.lectorProcession)order.push('Lector');
  if(options.deacon)order.push('Deacon');
  order.push(options.bishop?'Bishop':'Priest');
  if(options.bishop)order.push('Mitre- and crozier-bearers');
  return order;
}

// Points the cross-stand place (and the spot for incensing the cross) at the chosen layout.
function setCrossPlaces(options={}){
  const stand=typeof CROSS_STANDS!=='undefined'?(CROSS_STANDS[options.crossStand]||CROSS_STANDS.right).at:[670,126];
  const crossStand=GAME_PLACES.find(p=>p.id==='crossStand');
  crossStand.at=[stand[0],stand[1]+16];
  const index=GAME_PLACES.findIndex(p=>p.id==='beforeCross');
  if(index>=0)GAME_PLACES.splice(index,1);
  if(typeof incensedCross==='undefined')return null;
  const cross=incensedCross({crucifix:options.crucifix||'wall',crossStand:options.crossStand||'right'});
  // Listed first so that it wins over the nearby washing stand or altar corners.
  GAME_PLACES.unshift({id:'beforeCross',name:cross.kind==='crucifix'?'in front of the altar, facing the crucifix':'before the processional cross, to incense it',at:cross.stop,r:20});
  return cross;
}

// The answer given on the player's behalf when questions are switched off.
function autoAnswer(decision){
  if(decision.input==='checklist')return (decision.items||[]).filter(i=>i.needed).map(i=>i.id);
  if(decision.kind==='pew')return 'auto';
  if(decision.correctRoles?.length)return decision.correctRoles[0];
  if((decision.kind==='move'||decision.kind==='place')&&decision.target)return decision.target.slice();
  const option=[...(decision.options||[]),...(decision.extraOptions||[])].find(o=>o.correct);
  if(option)return option.role??option.value??option.label;
  return decision.correct;
}
function nextTimerAllowance(current,timedOut){return timedOut?Math.min(30,current+5):current;}
function nextQuestionStop(stops,current,requested){
  const next=stops.find(stop=>!stop.done&&stop.time>current+1e-4);
  if(!next)return null;
  // Seeking never skips an unanswered decision: snap to the first upcoming stop.
  return requested>current?next:null;
}
// ---------- search index (round 8) ----------
const SEARCH_CATEGORIES=[
  {id:'roles',name:'Roles',icon:'person'},
  {id:'vessels',name:'Sacred vessels',icon:'chalice'},
  {id:'books',name:'Books',icon:'book'},
  {id:'processional',name:'Processional items and bell',icon:'cross'},
  {id:'gifts',name:'Gifts and collection',icon:'cruets'},
  {id:'linens',name:'Linens',icon:'linen'},
  {id:'places',name:'Furniture and places',icon:'altar'}
];
const SEARCH_OBJECTS={
  chalice:{name:'Chalice',cat:'vessels',icon:'chalice',main:true,also:'cup precious blood'},
  ciborium:{name:'Ciborium',cat:'vessels',icon:'ciborium',main:true,also:'hosts communion'},
  ciborium2:{name:'Ciborium of reserved hosts',cat:'vessels',icon:'ciborium',also:'tabernacle reserved sacrament'},
  ewer:{name:'Lavabo ewer, bowl and towel',cat:'vessels',icon:'lavabo',main:true,also:'washing of hands'},
  missal:{name:'Roman Missal',cat:'books',icon:'book',main:true,also:'sacramentary prayers'},
  gospels:{name:'Book of the Gospels',cat:'books',icon:'gospels',main:true,also:'evangeliary'},
  cross:{name:'Processional cross',cat:'processional',icon:'cross',main:true,also:'crucifix'},
  cand1:{name:'Processional candle (first)',cat:'processional',icon:'candle',main:true,also:'acolyte candles torch'},
  cand2:{name:'Processional candle (second)',cat:'processional',icon:'candle',also:'acolyte candles torch'},
  thurible:{name:'Thurible',cat:'processional',icon:'thurible',main:true,also:'incense censer'},
  bell:{name:'Altar bell',cat:'processional',icon:'bell',also:'sanctus bells'},
  bread:{name:'Bread for the offertory',cat:'gifts',icon:'host',main:true,also:'hosts gifts'},
  wine:{name:'Wine and water cruets',cat:'gifts',icon:'cruets',main:true,also:'gifts'},
  collection:{name:'Collection basket',cat:'gifts',icon:'collection',main:true,also:'offering money'},
  corporal:{name:'Corporal',cat:'linens',icon:'linen',main:true,also:'altar linen'}
};
const SEARCH_PLACES={altar:['altar',true],ambo:['ambo',true],chair:['chair',true],credence:['credence',true],tabernacle:['tabernacle',true],
  crossStand:['cross',false],serverBench:['chair',false],washStand:['lavabo',false],sanctuaryStep:['walk',false],giftTable:['cruets',false],
  sacristy:['sacristy',false],stoup:['water',false],avDesk:['screen',false],door:['door',false]};

// Entries for the search box: roles present in this Mass, objects and furniture.
function buildSearchIndex(roles){
  const entries=[];
  for(const {key,name,icon} of roles||[])entries.push({id:'role:'+key,kind:'role',key,name,cat:'roles',icon:icon||'person',main:['P','D','S','MC','SAC','L'].includes(key),keywords:name.toLowerCase()});
  for(const [key,o] of Object.entries(SEARCH_OBJECTS))entries.push({id:'object:'+key,kind:'object',key,name:o.name,cat:o.cat,icon:o.icon,main:!!o.main,keywords:(o.name+' '+(o.also||'')).toLowerCase()});
  for(const [key,[icon,main]] of Object.entries(SEARCH_PLACES)){
    const place=GAME_PLACES.find(p=>p.id===key);
    if(!place)continue;
    const name=place.name.replace(/^the /,'');
    entries.push({id:'place:'+key,kind:'place',key,name:name[0].toUpperCase()+name.slice(1),cat:'places',icon,main,keywords:name.toLowerCase(),at:place.at,r:place.r});
  }
  return entries;
}

// Ranks matches: name prefix, word prefix, name substring, then keyword substring.
function searchEntries(entries,query){
  const q=String(query||'').trim().toLowerCase();
  if(!q)return [];
  const out=[];
  for(const entry of entries){
    const name=entry.name.toLowerCase();
    const at=name.indexOf(q);
    let rank=at===0?0:at>0&&/[\s(,'-]/.test(name[at-1])?1:at>0?2:entry.keywords.includes(q)?3:-1;
    if(rank<0)continue;
    out.push({entry,rank,match:at>=0?[at,q.length]:null});
  }
  return out.sort((a,b)=>a.rank-b.rank||(b.entry.main-a.entry.main)||a.entry.name.localeCompare(b.entry.name));
}

// What the role does next, or when the object/place is next used, from the current point.
function nextUseFor(entry,steps,index,progress){
  const list=x=>!x?[]:Array.isArray(x)?x:[x];
  const label=role=>(typeof ACTORS!=='undefined'&&ACTORS[role]?.name.split(/[,(]/)[0].trim())||role;
  for(let i=Math.max(0,index);i<steps.length;i++){
    const step=steps[i],after=i===index?progress:-1;
    if(entry.kind==='role'){
      const act=(step.acts?.[entry.key]||[]).find(([text,a])=>text&&a>after&&!/^(stands|sits|kneels)$/.test(text));
      const line=(step.say||[]).find(([role,,a])=>role===entry.key&&a>after);
      const move=list(step.mv?.[entry.key]).find(s=>s.a>after);
      const t=Math.min(act?act[1]:2,line?line[2]:2,move?move.a:2);
      if(t>1)continue;
      const what=act&&act[1]===t?act[0]:line&&line[2]===t?'says “'+line[1]+'”':'moves to '+placeFor(move.p[move.p.length-1],entry.key).name.replace(/^your /,'their ');
      return {step:i,title:step.title,what,soon:i===index};
    }
    if(entry.kind==='object'){
      const use=(step.props?.[entry.key]||[]).find(u=>(u.t??u.a)>after);
      if(!use)continue;
      const what=use.by?'taken by the '+label(use.by).toLowerCase():'placed at '+placeFor(use.at).name;
      return {step:i,title:step.title,what,soon:i===index};
    }
    if(entry.kind==='place'){
      for(const [role,segments] of Object.entries(step.mv||{})){
        const move=list(segments).find(s=>s.a>after&&Math.hypot(s.p[s.p.length-1][0]-entry.at[0],s.p[s.p.length-1][1]-entry.at[1])<=entry.r);
        if(move)return {step:i,title:step.title,what:'the '+label(role).toLowerCase()+' goes there',soon:i===index};
      }
    }
  }
  return null;
}
if(typeof module!=='undefined')module.exports={GAME_LEVELS,normaliseExposition,EXPOSITION_ROLES,isDevotionRite,devotionPreTasks,devotionPostTasks,isGuided,setCrossPlaces,autoAnswer,GAME_ROLES,GAME_PLACES,normaliseGameOptions,deriveDuties,buildDecision,checkAnswer,scoreDecision,planLapses,deriveCues,sacristanSetup,sacristanPackAway,sacristanOpening,cupboardOrder,hintDelay,SACRISTAN_ARRIVAL,CUPBOARD,deriveSoundCues,preProcessionBell,rewindCues,buildBook,preMassTasks,postMassTasks,setPewLayout,inPews,routeBetween,buildSearchIndex,searchEntries,nextUseFor,SEARCH_CATEGORIES,SEARCH_OBJECTS,GAME_PRESETS,applyPreset,matchingPreset,presetForOptions,PATH_BRANCHES,CELEBRATIONS,SENIORITY_RANKS,MARK_NAMES,SERVED_PERCENT,DISTINCTION_PERCENT,celebrationById,celebrationAvailable,celebrationForPreset,emptyProgress,normaliseProgress,markFor,recordCelebration,celebrationStatus,seniorityFor,nextRank,nextRecommended};
