'use strict';
// Small line symbols for liturgical objects, places and actions. Pure: tested in Node.
// Drawn for this project (24x24, stroke only) so they work offline and inherit the text colour.

const GAME_ICON_PATHS={
  chalice:'M7 3h10c0 5-2 8-5 8s-5-3-5-8z M12 11v7 M8 21h8',
  ciborium:'M5 10h14c0 4-3 6-7 6s-7-2-7-6z M8 10a4 3 0 0 1 8 0 M12 5v2 M12 16v3 M8 21h8',
  host:'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16 M12 8v8 M8 12h8',
  cross:'M12 2v20 M6 8h12',
  crucifix:'M12 2v20 M6 7h12 M12 9v6 M9.5 8.5l2.5 1.5 2.5-1.5',
  candle:'M9 10h6v11H9z M12 10V8 M12 2.5c1.6 1.6 1.6 3.4 0 4.5c-1.6-1.1-1.6-2.9 0-4.5z',
  thurible:'M8 2l4 7 4-7 M12 2v7 M9 9h6v2H9z M5 11h14a7 6 0 0 1-14 0z M10 17v3h4v-3',
  boat:'M3 12h18l-3 5H6z M12 12V8 M9 8h6',
  book:'M5 4a2 2 0 0 1 2-2h12v17H7a2 2 0 0 0-2 2z M5 21V4 M9 6h7',
  gospels:'M5 3h14v18H5z M12 6v9 M9 9h6',
  lectionary:'M2 5c3-1 7-1 10 1c3-2 7-2 10-1v14c-3-1-7-1-10 1c-3-2-7-2-10-1z M12 6v14',
  bell:'M6 17v-6a6 6 0 0 1 12 0v6 M4 17h16 M10 20a2 2 0 0 0 4 0 M12 3v2',
  cruets:'M4 10h5v11H4z M6 10V6h1v4 M15 10h5v11h-5z M17 10V6h1v4',
  water:'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  lavabo:'M3 14h12a6 4 0 0 1-12 0z M15 5h4l-1 6h-4z M14 5h-2',
  linen:'M4 6h16v12H4z M4 10h16 M10 6v12',
  altar:'M3 9h18 M5 9v11 M19 9v11 M3 20h18 M12 3v4 M10 5h4',
  ambo:'M6 9h12l-2 12H8z M5 9l2-4h10l2 4',
  chair:'M7 3h10v9H7z M5 12h14v3H5z M7 15v6 M17 15v6',
  credence:'M3 12h18 M5 12v9 M19 12v9 M8 12V8h2v4 M13 12V7h3v5',
  tabernacle:'M5 9h14v12H5z M4 9l8-6 8 6 M12 12v6 M9 15h6',
  lamp:'M8 8h8l-1 7H9z M12 3v5 M12 15v3 M10 21h4 M12 10c.8.6.8 1.6 0 2.2c-.8-.6-.8-1.6 0-2.2z',
  sprinkler:'M12 3a3 3 0 1 1 0 6a3 3 0 1 1 0-6 M12 9v12 M7 5L5 3 M17 5l2-2 M6 9H3 M18 9h3',
  vestment:'M12 3L5 7v14h14V7z M9 4.5c1 2 5 2 6 0 M12 7v14',
  door:'M5 21V10a7 7 0 0 1 14 0v11z M14 15h.01 M3 21h18',
  pew:'M3 10h18 M3 14h18 M5 14v6 M19 14v6 M3 5v9',
  person:'M12 3a3 3 0 1 1 0 6a3 3 0 1 1 0-6 M6 21v-5a6 5 0 0 1 12 0v5',
  people:'M8 4a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5 M16 4a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5 M3 20v-4a5 4 0 0 1 10 0v4 M11 20v-4a5 4 0 0 1 10 0',
  bow:'M7 4a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5 M9 9l6 4 M15 13v8 M15 21h3 M11 11l-1 4',
  kneel:'M12 3a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5 M12 8v6H7v7 M12 14h5 M12 10l-4 2',
  stand:'M12 3a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5 M12 8v8 M8 11h8 M12 16l-3 5 M12 16l3 5',
  sit:'M9 3a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5 M9 8v6h6v7 M5 14h4 M5 11h6',
  walk:'M10 3a2 2 0 1 1 0 4a2 2 0 1 1 0-4 M10 7l-2 7 M10 7l4 6 M8 14l-3 7 M12 14l2 7 M9 10l5-1',
  speak:'M4 5h16v10H9l-5 4z',
  sing:'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0 M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  bless:'M12 3v8 M8 6.5h8 M6 21c0-4 2.5-7 6-7s6 3 6 7',
  kiss:'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  raise:'M12 21V8 M7 12l5-5 5 5 M8 3h8',
  sacristy:'M4 3h16v18H4z M12 3v18 M10 12h.01 M14 12h.01',
  church:'M12 2v4 M10 4h4 M5 21V11l7-5 7 5v10z M10 21v-5h4v5',
  check:'M5 12l5 5 9-10',
  none:'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16 M6.5 6.5l11 11',
  collection:'M3 10h18l-3 11H6z M7 10V6a5 5 0 0 1 10 0v4 M9 14h6 M12 12v6',
  screen:'M3 4h18v12H3z M12 16v3 M8 21h8 M7 8h10 M7 11h7',
  play:'M7 4l13 8-13 8z',
  stop:'M6 6h12v12H6z',
  monstrance:'M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8 M12 1v2 M12 13v2 M5 8H3 M21 8h-2 M7 3l1.5 1.5 M17 3l-1.5 1.5 M7 13l1.5-1.5 M17 13l-1.5-1.5 M12 15v4 M8 21h8 M10 19h4',
  calendar:'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M8 14h3v3H8z',
  speaker:'M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11',
  graphics:'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6'
};

// Ordered: the first matching rule wins, so specific phrases come before general words.
const GAME_ICON_RULES=[
  [/not needed|leave it|nothing to do/,'none',null],
  [/fade out/,'stop',null],
  [/backing track/,'play',null],
  [/lyrics|words on the screen|slide/,'screen',null],
  [/collection|money|usher|other offerings/,'collection',{prop:'collection'}],
  [/^do it now/,'check',null],
  [/sign of the cross|blesses|blessing|signs (himself|the)|makes the sign/,'bless',null],
  [/incens.*(crucifix|cross)/,'thurible',{cross:true}],
  [/incens.*\baltar\b/,'thurible',{place:'altar'}],
  [/thurible|incens|\bboat\b/,'thurible',{prop:'thurible'}],
  [/crucifix/,'crucifix',{cross:true}],
  [/processional cross|cross-bearer|stand for the .*cross/,'cross',{prop:'cross'}],
  [/\bcross\b/,'cross',{cross:true}],
  [/chalice/,'chalice',{prop:'chalice'}],
  [/ciborium|altar breads|communion plate/,'ciborium',{prop:'bread'}],
  [/paten|\bhosts?\b|\bbread\b/,'host',{prop:'bread'}],
  [/lavabo|washes|washing|towel/,'lavabo',{place:'washStand'}],
  [/cruet|\bwine\b/,'cruets',{prop:'wine'}],
  [/sprinkl|aspersory/,'sprinkler',null],
  [/stoup|holy water|holy-water/,'water',{place:'stoup'}],
  [/\bwater\b/,'water',{prop:'ewer'}],
  [/corporal|purificator|\bpall\b|cloth|linen/,'linen',{prop:'corporal'}],
  [/gospel/,'gospels',{prop:'gospels'}],
  [/lectionary|reading|psalm/,'lectionary',{place:'ambo'}],
  [/missal|\bbook\b/,'book',{prop:'missal'}],
  [/candle/,'candle',{prop:'cand1'}],
  [/\bbell\b/,'bell',{place:'sanctuaryStep'}],
  [/tabernacle/,'tabernacle',{place:'tabernacle'}],
  [/\blamp\b/,'lamp',{place:'tabernacle'}],
  [/\bambo\b/,'ambo',{place:'ambo'}],
  [/credence/,'credence',{place:'credence'}],
  [/gift table/,'credence',{place:'giftTable'}],
  [/vest|\balbs?\b|stole|chasuble|dalmatic|surplice|cassock/,'vestment',null],
  [/sacristy|cupboard/,'sacristy',{place:'sacristy'}],
  [/\bkiss/,'kiss',{place:'altar'}],
  [/genuflect|kneel/,'kneel',null],
  [/\bbow/,'bow',null],
  [/raises|elevat|shows/,'raise',null],
  [/\bchair\b|\bseat\b|\bsits?\b/,'chair',{place:'chair'}],
  [/\baltar\b/,'altar',{place:'altar'}],
  [/\bpews?\b|congregation|the faithful|the people/,'people',{place:'aisle'}],
  [/\bdoors?\b|outside|leave|church/,'door',{place:'door'}],
  [/procession|\bline\b|\bgo(es)? to\b|walks?\b|returns/,'walk',null],
  [/^stand$|\bstands up\b/,'stand',null],
  [/^sit$/,'sit',null]
];

function gameIconRule(text){
  const lower=String(text||'').toLowerCase();
  return GAME_ICON_RULES.find(([pattern])=>pattern.test(lower))||null;
}
// kind: a decision kind ('say' gives a speech or chant symbol) or undefined.
function iconFor(text,kind){
  const lower=String(text||'').toLowerCase();
  if(kind==='say'||kind==='book')return /♪|sung|sings|chant/.test(lower)?'sing':'speak';
  if(kind==='posture'&&GAME_ICON_PATHS[lower])return lower;
  if(kind==='role'||kind==='nudge'||kind==='cue')return 'person';
  return gameIconRule(lower)?.[1]||null;
}
// What the text points at in the church: {prop}, {place} or {cross:true} (the cross to be incensed).
function targetFor(text){
  const rule=gameIconRule(text);
  return rule&&rule[2]?{...rule[2]}:null;
}
function iconSvg(name,size=18){
  const d=GAME_ICON_PATHS[name];
  if(!d)return '';
  return '<svg class="icon" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg>';
}

const GameIcons={PATHS:GAME_ICON_PATHS,RULES:GAME_ICON_RULES,iconFor,targetFor,svg:iconSvg};
if(typeof module!=='undefined')module.exports=GameIcons;
