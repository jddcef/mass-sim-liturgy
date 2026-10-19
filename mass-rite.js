// ---------- geometry ----------
const ALT_P=[500,122], ALT_D=[452,122], CHAIR=[500,58], DCHAIR=[450,62], AMBO=[200,222];
const HOME={P:CHAIR,D:DCHAIR,X:[640,55],C1:[680,55],C2:[720,55],T:[760,55],S:[805,78],L:[395,368],L2:[365,368],Ps:[335,368],U:[875,745],E:[735,402],G1:[600,745],G2:[640,745],MB:[372,62],CB:[408,62],K:[605,368],SP:[675,368]};
const M=(p,a=0,b=0.6)=>({p,a,b});

const ACTORS={
  P:{name:'Priest (celebrant), green chasuble',fill:'#2e7d4f',stroke:'#d4a72c',r:13,txt:'#fff'},
  D:{name:'Deacon, dalmatic',fill:'#5fae7c',stroke:'#2a5a3a',r:12,txt:'#fff'},
  X:{name:'Cross-bearer',fill:'#fbfbf6',stroke:'#555',r:10,txt:'#333'},
  C1:{name:'Candle-bearer',fill:'#fbfbf6',stroke:'#555',r:10,txt:'#333',lab:'C'},
  C2:{name:'Candle-bearer',fill:'#fbfbf6',stroke:'#555',r:10,txt:'#333',lab:'C'},
  T:{name:'Thurifer (incense)',fill:'#fbfbf6',stroke:'#555',r:10,txt:'#333'},
  S:{name:'Altar server (also rings the bell)',fill:'#fbfbf6',stroke:'#555',r:10,txt:'#333'},
  L:{name:'Lector',fill:'#4f7fa8',stroke:'#244',r:10,txt:'#fff'},
  L2:{name:'Second reader',fill:'#658bab',stroke:'#244',r:10,txt:'#fff'},
  Ps:{name:'Psalmist / cantor',fill:'#7b68a6',stroke:'#334',r:10,txt:'#fff'},
  U:{name:'Collection usher',fill:'#8a6540',stroke:'#444',r:10,txt:'#fff'},
  E:{name:'Extraordinary minister of Holy Communion',fill:'#738d80',stroke:'#444',r:10,txt:'#fff'},
  G1:{name:'Gift-bearer (one of the faithful)',fill:'#9aa86b',stroke:'#444',r:9,txt:'#fff',lab:'G'},
  G2:{name:'Gift-bearer (one of the faithful)',fill:'#9aa86b',stroke:'#444',r:9,txt:'#fff',lab:'G'},
  // Mass with the Bishop only (mass-scenarios.js applyBishop): servers in vimps who carry the insignia.
  MB:{name:'Mitre-bearer (server in a vimp)',fill:'#fbfbf6',stroke:'#555',r:10,txt:'#333',only:'bishop'},
  CB:{name:'Crozier-bearer (server in a vimp)',fill:'#fbfbf6',stroke:'#555',r:10,txt:'#333',only:'bishop'},
  // Confirmation within Mass only (mass-scenarios.js applyConfirmation): one pair stands for every candidate and sponsor.
  K:{name:'Candidate for Confirmation',fill:'#b5524c',stroke:'#5a2624',r:9,txt:'#fff',only:'confirmation'},
  SP:{name:'Sponsor',fill:'#6b6f86',stroke:'#333',r:9,txt:'#fff',only:'confirmation'},
};

// ---------- the rite: steps ----------
const STEPS=[
// ===== INTRODUCTORY RITES =====
{part:'Introductory Rites',title:'Entrance Procession',dur:11,posture:'stand',
 text:'When the people are gathered, the Priest and ministers go to the altar while the Entrance Chant is sung. The thurifer goes first with a smoking thurible. Next comes a minister carrying the cross, between two ministers with lighted candles, then the lector. The Deacon carries the Book of the Gospels slightly raised, and the Priest comes last.',
 ref:'Order of Mass 1; GIRM 47–48, 119–121, 172',
 mv:{T:M([[500,310],[740,265]],0,.55),C2:M([[530,310],[690,265]],.04,.62),X:M([[500,310],[640,265]],.04,.64),C1:M([[470,310],[360,265]],.04,.62),
     L:M([[500,310],[420,262]],.1,.72),D:M([[500,310],[470,250]],.13,.8),P:M([[500,310],[530,250]],.16,.86)},
 say:[['ppl','♪ Entrance Chant ♪',.03,1]],smoke:[['T',0,1]]},
{part:'Introductory Rites',title:'Reverence to the Altar',dur:11,posture:'stand',
 text:'At the altar the Priest, the Deacon and the ministers make a profound bow. The cross bearing the figure of Christ crucified is set up near the altar, and the candles are placed by it. The Deacon lays the Book of the Gospels on the altar. Then the Priest and Deacon venerate the altar with a kiss.',
 ref:'Order of Mass 1; GIRM 49, 117, 122–123, 173',
 mv:{X:[M([[670,142]],.15,.33),M([[705,100],[640,55]],.45,.72)],C1:[M([[392,152]],.15,.33),M([[392,92],[680,55]],.45,.8)],
     C2:[M([[612,152]],.15,.33),M([[720,90],[720,55]],.45,.75)],T:M([[640,215]],.2,.4),L:M([[420,296],[420,322]],.25,.5),
     D:[M([[490,214]],.22,.34),M([[375,214],[375,122],ALT_D],.5,.8)],P:M([[625,240],[625,122],ALT_P],.42,.8)},
 props:{cross:[{at:[670,126],a:.33,b:.38}],cand1:[{at:[388,140],a:.33,b:.38}],cand2:[{at:[612,140],a:.33,b:.38}],gospels:[{at:[500,176],a:.35,b:.42}]},
 acts:{P:[['profound bow',0,.2],['kisses the altar',.82,1]],D:[['profound bow',0,.2],['lays the Book on the altar',.34,.44],['kisses the altar',.82,1]],L:[['profound bow',0,.2]],X:[['sets up the cross',.33,.42]]},
 say:[['ppl','♪ Entrance Chant ♪',0,1]],smoke:[['T',0,1]]},
{part:'Introductory Rites',title:'Incensing the Cross and Altar',dur:11,posture:'stand',
 text:'If incense is used, the Priest puts some into the thurible and blesses it with the Sign of the Cross, saying nothing. He incenses the cross, then walks around the altar incensing it.',
 ref:'GIRM 49, 123, 276–277',
 mv:{T:M([[628,150]],0,.14),P:[M([[640,110]],.16,.26),M([[625,215],[375,215],[375,108],ALT_P],.34,.9)]},
 props:{thurible:[{by:'P',t:.15},{by:'T',t:.94}]},
 acts:{P:[['puts incense in the thurible',0,.15],['incenses the cross',.18,.32],['incenses the altar',.35,.9]]},
 smoke:[['T',0,.15],['P',.15,.94],['T',.94,1]],say:[['ppl','♪ Entrance Chant ♪',0,1]]},
{part:'Introductory Rites',title:'Sign of the Cross',dur:8,posture:'stand',
 text:'The Priest goes to the chair. When the Entrance Chant has ended, the Priest and the faithful, all standing, make the Sign of the Cross. The Priest, facing the people, says the words and the people answer "Amen."',
 ref:'Order of Mass 1; GIRM 50, 124',
 mv:{P:M([[560,90],CHAIR],0,.35),D:M([[440,90],DCHAIR],0,.35),T:M([[760,55]],0,.4)},
 say:[['P','In the name of the Father, and of the Son, and of the Holy Spirit.',.4,.76],['ppl','Amen.',.78,1]],
 acts:{P:[['signs himself ✠',.4,.76]]}},
{part:'Introductory Rites',title:'Greeting',dur:7,posture:'stand',
 text:'The Priest extends his hands and greets the people, using one of the formulas given. The people reply.',
 ref:'Order of Mass 2; GIRM 50, 124',
 orans:{P:[[.08,.45]]},
 say:[['P','The Lord be with you.',.08,.45],['ppl','And with your spirit.',.5,.92]]},
{part:'Introductory Rites',title:'Penitential Act',dur:11,posture:'stand',
 text:'The Priest invites the faithful to the Penitential Act, and a brief silence follows. All then make a common confession. The Priest gives the absolution, which lacks the efficacy of the Sacrament of Penance.',
 ref:'Order of Mass 4–6; GIRM 51',
 say:[['P','(invites all to acknowledge their sins)',.04,.25],['ppl','(brief silence)',.27,.4],['ppl','I confess to almighty God… (all strike the breast)',.43,.72],['P','May almighty God have mercy on us, forgive us our sins, and bring us to everlasting life.',.74,.9],['ppl','Amen.',.91,1]]},
{part:'Introductory Rites',title:'Kyrie',dur:8,posture:'stand',
 text:'The Kyrie invocations follow, unless they were already part of the Penitential Act.',
 ref:'Order of Mass 7; GIRM 52',
 say:[['P','Kyrie, eleison.',.05,.2],['ppl','Kyrie, eleison.',.2,.35],['P','Christe, eleison.',.37,.52],['ppl','Christe, eleison.',.52,.67],['P','Kyrie, eleison.',.69,.83],['ppl','Kyrie, eleison.',.83,1]]},
{part:'Introductory Rites',title:'Gloria',dur:8,posture:'stand',
 text:'When it is prescribed, the Gloria is then sung or said. This applies to Sundays outside Advent and Lent, to solemnities and to feasts. The Priest or a cantor may begin it, or all may begin it together.',
 ref:'Order of Mass 8; GIRM 53',
 say:[['P','Glory to God in the highest…',.03,.22],['ppl','♪ …and on earth peace to people of good will… ♪',.24,1]]},
{part:'Introductory Rites',title:'Collect',dur:11,posture:'stand',
 text:'With hands joined, the Priest says "Let us pray," and all pray in silence for a while. Then the Priest extends his hands and says the Collect. At its end the people acclaim "Amen." A server may hold the Missal.',
 ref:'Order of Mass 9; GIRM 54, 127',
 mv:{S:[M([[850,100]],0,.08),M([[540,82]],.12,.3),M([[850,100]],.88,.96),M([[805,78]],.96,1)]},
 props:{missal:[{by:'S',t:.09},{at:[845,120],a:.95,b:.97}]},
 orans:{P:[[.4,.82]]},
 say:[['P','Let us pray.',.05,.2],['ppl','(silent prayer)',.22,.38],['P','(the Collect of the day) …through our Lord Jesus Christ…',.4,.82],['ppl','Amen.',.84,1]]},

// ===== LITURGY OF THE WORD =====
{part:'Liturgy of the Word',title:'First Reading',dur:11,posture:'sit',
 text:'The lector goes to the ambo and reads the First Reading while all sit and listen. At the end the lector acclaims "The word of the Lord," and all reply. A brief silence for meditation may follow.',
 ref:'Order of Mass 11–12; GIRM 56, 128',
 mv:{L:M([[420,296],[255,290],[255,222],AMBO],0,.25)},
 say:[['L','A reading from the Book of…',.28,.42],['L','(proclaims the reading)',.43,.74],['L','The word of the Lord.',.76,.87],['ppl','Thanks be to God.',.87,.97]]},
{part:'Liturgy of the Word',title:'Responsorial Psalm',dur:10,posture:'sit',
 text:'The psalmist or cantor sings or says the Psalm at the ambo, and the people make the response.',
 ref:'Order of Mass 13; GIRM 61, 129',
 mv:{L:M([[255,222],[275,300],[420,300],[420,322]],0,.25),Ps:M([[380,300],[250,296],[245,222],AMBO],.15,.42)},
 say:[['Ps','♪ (verse of the Psalm) ♪',.44,.6],['ppl','♪ (Response) ♪',.6,.74],['Ps','♪ (verse) ♪',.75,.87],['ppl','♪ (Response) ♪',.87,1]]},
{part:'Liturgy of the Word',title:'Second Reading',dur:10,posture:'sit',
 text:'If there is a Second Reading, a lector reads it from the ambo as before, ending with the same acclamation.',
 ref:'Order of Mass 14; GIRM 130',
 mv:{Ps:M([[250,296],[380,300],[380,322]],0,.25),L:M([[420,296],[265,286],[255,222],AMBO],.12,.38)},
 say:[['L','A reading from the Letter of Saint Paul…',.4,.52],['L','(proclaims the reading)',.53,.78],['L','The word of the Lord.',.8,.9],['ppl','Thanks be to God.',.9,1]]},
{part:'Liturgy of the Word',title:'Gospel Acclamation & Blessing of the Deacon',dur:13,posture:'stand',
 text:'All rise and sing the Alleluia, or the chant the season requires. If incense is used, the Priest puts some into the thurible. The Deacon bows profoundly before the Priest and asks for the blessing in a low voice; the Priest blesses him in a low voice. The Deacon takes the Book of the Gospels from the altar. Preceded by the thurifer and the candle-bearers, he carries it to the ambo.',
 ref:'Order of Mass 14–15; GIRM 62, 131–133, 175',
 mv:{L:M([[255,222],[275,300],[420,300],[420,322]],0,.2),T:[M([[545,82]],.04,.18),M([[620,230],[200,282]],.48,.88)],
     D:[M([[478,84]],.2,.3),M([[380,100],[380,212],[482,214]],.43,.6),M([[300,236],AMBO],.66,.9)],
     C1:M([[680,90],[360,240],[160,240]],.35,.86),C2:M([[720,90],[380,252],[240,248]],.38,.88)},
 props:{gospels:[{by:'D',t:.6}]},
 acts:{P:[['puts incense in the thurible',.07,.2],['blesses the Deacon (low voice)',.3,.43]],D:[['bows: "Your blessing, Father"',.3,.43],['takes up the Book',.58,.65]]},
 say:[['ppl','♪ Alleluia ♪',0,1]],smoke:[['T',0,1]]},
{part:'Liturgy of the Word',title:'The Gospel',dur:13,posture:'stand',
 text:'At the ambo the Deacon greets the people with hands joined. As he announces the Gospel he signs the book with his thumb, then signs himself on the forehead, lips and breast, and all do the same. He incenses the book and proclaims the Gospel. At the end he kisses the book, saying a prayer quietly.',
 ref:'Order of Mass 15–16; GIRM 60, 134, 175',
 props:{thurible:[{by:'D',t:.44},{by:'T',t:.53}]},
 acts:{D:[['signs book, forehead, lips, breast',.24,.37],['incenses the Book',.44,.53],['kisses the Book',.9,1]],P:[['turns toward the ambo',0,1]]},
 smoke:[['T',0,.44],['D',.44,.53],['T',.53,1]],
 say:[['D','The Lord be with you.',0,.12],['ppl','And with your spirit.',.12,.22],['D','A reading from the holy Gospel according to N.',.22,.34],['ppl','Glory to you, O Lord.  (✠ ✠ ✠)',.34,.44],['D','(proclaims the Gospel)',.53,.8],['D','The Gospel of the Lord.',.8,.9],['ppl','Praise to you, Lord Jesus Christ.',.9,1]]},
{part:'Liturgy of the Word',title:'Homily',dur:11,posture:'sit',
 text:'The Book of the Gospels is taken to the credence table or another fitting place. The Priest gives the Homily at the chair or the ambo; a Deacon may give it instead. A brief period of silence is then fitting.',
 ref:'Order of Mass 17; GIRM 65–66, 136, 175',
 mv:{D:[M([[300,252],[620,252],[830,165]],0,.35),M([[700,95],DCHAIR],.42,.62)],C1:M([[360,240],[680,90],[680,55]],0,.45),C2:M([[380,250],[720,90],[720,55]],.02,.47),T:M([[620,260],[760,90],[760,55]],0,.45)},
 props:{gospels:[{at:[868,146],a:.35,b:.4}]},
 acts:{P:[['preaches from the chair',.3,.86]]},
 say:[['P','(Homily)',.3,.86],['ppl','(silence)',.88,1]]},
{part:'Liturgy of the Word',title:'Profession of Faith',dur:11,posture:'stand',
 text:'On Sundays and solemnities the Creed is sung or said. At the words about the Incarnation all bow. On the Annunciation and on Christmas all genuflect.',
 ref:'Order of Mass 18–19; GIRM 67–68, 137',
 pplBow:[[.42,.62]],
 acts:{P:[['bows',.42,.62]],D:[['bows',.42,.62]]},
 say:[['ppl','I believe in one God…',.04,.4],['ppl','…and by the Holy Spirit was incarnate of the Virgin Mary, and became man.  (all bow)',.42,.62],['ppl','…and the life of the world to come. Amen.',.7,1]]},
{part:'Liturgy of the Word',title:'Universal Prayer (Prayer of the Faithful)',dur:12,posture:'stand',
 text:'Standing at the chair, the Priest introduces the prayer with hands joined. The Deacon, or a cantor, lector or lay person, announces the intentions from the ambo, and the people respond. The Priest ends with a prayer, his hands extended.',
 ref:'Order of Mass 20; GIRM 69–71, 138, 177',
 mv:{D:M([[400,110],[262,232],AMBO],.1,.3)},
 orans:{P:[[.82,.94]]},
 say:[['P','(invitation to prayer)',0,.12],['D','(intention…) We pray to the Lord.',.32,.5],['ppl','Lord, hear our prayer.',.5,.62],['D','(intention…) We pray to the Lord.',.62,.72],['ppl','Lord, hear our prayer.',.72,.82],['P','(concluding prayer)',.82,.94],['ppl','Amen.',.94,1]]},

// ===== LITURGY OF THE EUCHARIST =====
{part:'Liturgy of the Eucharist',title:'Preparation of the Altar',dur:10,posture:'sit',
 text:'The Offertory Chant begins. The Deacon and ministers bring the corporal, purificator, chalice, pall and Missal from the credence table and place them on the altar.',
 ref:'Order of Mass 21; GIRM 73–74, 139, 178',
 mv:{D:M([[262,232],[375,215],[375,122],ALT_D],0,.35),S:[M([[850,100]],0,.1),M([[640,152]],.18,.42),M([[850,100]],.62,.78),M([[805,78]],.8,.9)]},
 props:{corporal:[{by:'S',t:.11},{at:[500,168],a:.48,b:.56}],missal:[{by:'S',t:.11},{at:[570,160],a:.5,b:.58}],chalice:[{by:'S',t:.11},{at:[540,170],a:.52,b:.6}]},
 acts:{D:[['spreads the corporal',.46,.6]]},
 say:[['ppl','♪ Offertory Chant ♪',.03,1]]},
{part:'Liturgy of the Eucharist',title:'Presentation of the Gifts',dur:12,posture:'sit',
 text:'It is praiseworthy for the faithful to present the bread and wine. The Priest or the Deacon receives them at a suitable place and carries them to the altar.',
 ref:'Order of Mass 22; GIRM 73, 140',
 mv:{G1:[M([[490,748],[490,302]],.08,.5),M([[490,748],[600,745]],.68,.97)],G2:[M([[520,752],[520,306]],.1,.52),M([[520,752],[640,745]],.68,.97)],
     P:M([[620,82],[625,265],[490,272]],.2,.5),D:M([[375,210],[375,265],[522,274]],.22,.5)},
 props:{bread:[{by:'G1',t:.05},{by:'P',t:.58}],wine:[{by:'G2',t:.05},{by:'D',t:.58}]},
 acts:{G1:[['bows',.6,.67]],G2:[['bows',.6,.67]],P:[['receives the bread',.53,.62]],D:[['receives the wine',.53,.62]]},
 say:[['ppl','♪ Offertory Chant ♪',0,1]]},
{part:'Liturgy of the Eucharist',title:'Offering of the Bread and Wine',dur:13,posture:'sit',
 text:'At the altar the Priest holds the paten with the bread slightly raised and says the prayer of blessing in a low voice. The Deacon pours wine and a little water into the chalice while the Priest prays quietly. The Priest holds the chalice slightly raised, says the second prayer and places it on the corporal. If there is no singing, the people may respond aloud. The Priest then bows profoundly and prays quietly.',
 ref:'Order of Mass 23–27; GIRM 141–143, 178',
 mv:{P:M([[625,250],[625,122],ALT_P],0,.3),D:M([[375,250],[375,122],ALT_D],0,.3),S:[M([[630,150]],.4,.52),M([[850,100]],.6,.8),M([[805,78]],.88,1)]},
 props:{bread:[{at:[500,160],a:.3,b:.35}],wine:[{by:'S',t:.57},{at:[886,142],a:.8,b:.86}]},
 raise:[['host-low',.33,.5],['chalice-low',.65,.82]],
 acts:{D:[['pours wine and a little water',.5,.62]],P:[['bows profoundly',.9,1]]},
 say:[['P','(low voice) Blessed are you, Lord God of all creation…',.33,.5],['P','(quietly) By the mystery of this water and wine may we come to share in the divinity of Christ who humbled himself to share in our humanity.',.5,.63],['P','(low voice) Blessed are you… fruit of the vine…',.65,.82],['ppl','Blessed be God for ever.',.83,.95]]},
{part:'Liturgy of the Eucharist',title:'Incensing the Gifts, Altar, Priest and People',dur:14,posture:[['sit',0],['stand',.7]],
 text:'If appropriate, the Priest incenses the offerings, the cross and the altar. Then the Deacon or another minister incenses the Priest and the people.',
 ref:'Order of Mass 28; GIRM 75, 144, 178',
 mv:{T:M([[700,150],[640,150]],0,.14),P:[M([[640,112]],.3,.38),M([[625,215],[375,215],[375,110],ALT_P],.4,.62)],
     D:[M([[470,96]],.62,.66),M([[375,110],[375,262],[500,282]],.68,.8),M([[375,262],[375,122],ALT_D],.92,1)]},
 props:{thurible:[{by:'P',t:.15},{by:'D',t:.62},{by:'T',t:.91}]},
 acts:{P:[['incenses the offerings',.15,.3],['incenses the cross',.3,.38],['incenses the altar',.4,.62]],D:[['incenses the Priest',.62,.67],['incenses the people',.8,.9]]},
 smoke:[['T',0,.15],['P',.15,.62],['D',.62,.91],['T',.91,1]]},
{part:'Liturgy of the Eucharist',title:'Washing of Hands',dur:10,posture:'stand',
 text:'Standing at the side of the altar, the Priest washes his hands, saying a prayer quietly.',
 ref:'Order of Mass 28; GIRM 76, 145',
 mv:{P:[M([[600,122]],0,.2),M([ALT_P],.76,.9)],T:M([[760,100],[760,55]],0,.4),S:[M([[850,105]],0,.08),M([[642,126]],.12,.3),M([[850,105]],.72,.88),M([[805,78]],.92,1)]},
 props:{ewer:[{by:'S',t:.09},{at:[850,144],a:.88,b:.92}]},
 acts:{P:[['washes his hands',.3,.7]],S:[['pours water',.3,.7]]},
 say:[['P','(quietly) Wash me, O Lord, from my iniquity and cleanse me from my sin.',.3,.7]]},
{part:'Liturgy of the Eucharist',title:'"Pray, brethren" & Prayer over the Offerings',dur:12,posture:'stand',
 text:'Back at the middle of the altar and facing the people, the Priest extends and then joins his hands and says "Pray, brethren". The people rise and reply. With hands extended, the Priest then says the Prayer over the Offerings, and the people acclaim "Amen."',
 ref:'Order of Mass 29–30; GIRM 43, 146',
 orans:{P:[[.03,.12],[.58,.86]]},
 say:[['P','Pray, brethren, that my sacrifice and yours may be acceptable to God, the almighty Father.',.03,.3],['ppl','May the Lord accept the sacrifice at your hands for the praise and glory of his name, for our good and the good of all his holy Church.',.32,.56],['P','(Prayer over the Offerings)',.58,.86],['ppl','Amen.',.88,1]]},
{part:'Liturgy of the Eucharist',title:'Eucharistic Prayer: Preface Dialogue & Preface',dur:13,posture:'stand',
 text:'The Eucharistic Prayer begins. With hands extended, the Priest sings or says the opening dialogue, raising his hands at "Lift up your hearts." He then continues the Preface with hands extended.',
 ref:'Order of Mass 31; GIRM 78–79, 148',
 orans:{P:[[0,.1],[.2,.3],[.4,.5],[.62,1]]},
 say:[['P','The Lord be with you.',0,.1],['ppl','And with your spirit.',.1,.2],['P','Lift up your hearts.',.2,.3],['ppl','We lift them up to the Lord.',.3,.4],['P','Let us give thanks to the Lord our God.',.4,.5],['ppl','It is right and just.',.5,.6],['P','(the Preface) …as we acclaim:',.62,1]]},
{part:'Liturgy of the Eucharist',title:'Sanctus',dur:9,posture:'stand',
 text:'At the end of the Preface the Priest joins his hands. Together with the people he concludes it by singing or saying the Sanctus aloud. The ministers take their places to kneel for the consecration.',
 ref:'Order of Mass 31; GIRM 79b, 148',
 mv:{S:M([[805,160],[640,245]],.45,.85),T:M([[760,250],[360,250]],.45,.88)},
 say:[['ppl','♪ Holy, Holy, Holy Lord God of hosts… Hosanna in the highest. ♪',.03,1]],smoke:[['T',0,1]]},
{part:'Liturgy of the Eucharist',title:'Epiclesis',dur:11,posture:'kneel',
 text:'After the Sanctus the people kneel, where this is the custom. The Deacon kneels from the epiclesis until the chalice is shown. The Priest holds his hands extended over the offerings and calls down the Holy Spirit. He then joins his hands and makes the Sign of the Cross over the bread and chalice together. Shortly before the consecration a minister may ring a small bell as a signal.',
 ref:'Eucharistic Prayer (e.g. EP II); GIRM 43, 79c, 150, 179',
 mv:{D:M([[455,98]],0,.2)},
 acts:{D:[['kneels',.15,1]],S:[['kneels',0,1]],T:[['kneels',0,1]],P:[['hands extended over the offerings',.15,.55],['makes the Sign of the Cross over them ✠',.58,.78]]},
 bell:[[.82,.95]],smoke:[['T',.3,1]],
 say:[['P','(calls down the Holy Spirit upon the gifts) …that they may become for us the Body and ✠ Blood of our Lord Jesus Christ.',.15,.8]]},
{part:'Liturgy of the Eucharist',title:'Consecration: the Host',dur:12,posture:'kneel',
 text:'The words of the Lord are spoken clearly and distinctly. The Priest takes the bread, holds it slightly raised above the altar and bows slightly as he says the words of Institution. He shows the consecrated host to the people and places it again on the paten. Then he genuflects in adoration. The bell may be rung, and the host incensed, when it is shown to the people.',
 ref:'GIRM 79d, 150, 179',
 acts:{D:[['kneels',0,1]],S:[['rings the bell',.47,.7]],T:[['incenses the Host (3 swings)',.45,.7]],P:[['bows slightly, says the words',.06,.4],['shows the Host to the people',.45,.72],['genuflects',.76,.95]]},
 raise:[['host',.45,.72]],bell:[[.47,.52],[.56,.61],[.65,.7]],smoke:[['T',0,1]],
 say:[['P','…TAKE THIS, ALL OF YOU, AND EAT OF IT, FOR THIS IS MY BODY, WHICH WILL BE GIVEN UP FOR YOU.',.06,.42]]},
{part:'Liturgy of the Eucharist',title:'Consecration: the Chalice',dur:12,posture:'kneel',
 text:'In the same way the Priest takes the chalice and says the words over it. He shows the chalice to the people, places it on the corporal and genuflects in adoration. The bell may be rung and incense offered as before.',
 ref:'GIRM 79d, 150, 179',
 acts:{D:[['kneels',0,1]],S:[['rings the bell',.47,.7]],T:[['incenses the Chalice (3 swings)',.45,.7]],P:[['says the words',.06,.4],['shows the Chalice to the people',.45,.72],['genuflects',.76,.95]]},
 raise:[['chalice',.45,.72]],bell:[[.47,.52],[.56,.61],[.65,.7]],smoke:[['T',0,1]],
 say:[['P','…TAKE THIS, ALL OF YOU, AND DRINK FROM IT, FOR THIS IS THE CHALICE OF MY BLOOD…  DO THIS IN MEMORY OF ME.',.06,.42]]},
{part:'Liturgy of the Eucharist',title:'The Mystery of Faith',dur:9,posture:'kneel',
 text:'The Priest says "The mystery of faith," and the people respond with one of the acclamations. The Deacon rises.',
 ref:'Order of Mass (Eucharistic Prayers); GIRM 151, 179',
 mv:{D:M([ALT_D],0,.2)},
 acts:{S:[['kneels',0,1]],T:[['kneels',0,1]]},
 say:[['P','The mystery of faith.',.1,.28],['ppl','We proclaim your Death, O Lord, and profess your Resurrection until you come again.',.3,.85]]},
{part:'Liturgy of the Eucharist',title:'Memorial, Offering & Intercessions',dur:10,posture:'kneel',
 text:'With hands extended, the Priest continues the Eucharistic Prayer. The Church keeps the memorial of Christ, offers the spotless Victim and prays for communion in the Holy Spirit. It intercedes for the whole Church, for the living and the dead, and recalls the saints.',
 ref:'GIRM 79e–g',
 orans:{P:[[0,1]]},
 acts:{S:[['kneels',0,1]],T:[['kneels',0,1]]},
 say:[['P','(memorial and offering… for the Pope, the Bishop, all the clergy… for those who have died… with the Blessed Virgin Mary and all the Saints…)',.05,.95]]},
{part:'Liturgy of the Eucharist',title:'Concluding Doxology',dur:11,posture:'kneel',
 text:'The Priest takes the paten with the host, and the Deacon takes the chalice, and they raise them together. The Priest alone sings or says the doxology, and the people acclaim "Amen."',
 ref:'GIRM 151, 180',
 mv:{S:M([[805,160],[805,78]],.85,1),T:M([[300,250],[300,110],[760,40],[760,55]],.85,1)},
 raise:[['both',.1,.72]],
 acts:{D:[['raises the chalice',.1,.72]],P:[['raises the paten with the Host',.1,.72]]},
 say:[['P','Through him, and with him, and in him, O God, almighty Father, in the unity of the Holy Spirit, all glory and honor is yours, for ever and ever.',.1,.62],['ppl','♪ Amen. ♪',.63,.9]]},

// ===== COMMUNION RITE =====
{part:'Communion Rite',title:"The Lord's Prayer",dur:13,posture:'stand',
 text:"With hands joined, the Priest introduces the Lord's Prayer. With hands extended, he says it together with the people. He alone adds the embolism, \"Deliver us, Lord…\", and the people conclude it with the acclamation.",
 ref:'GIRM 81, 152',
 orans:{P:[[.17,.75]]},
 say:[['P',"At the Savior's command and formed by divine teaching, we dare to say:",0,.15],['ppl','Our Father, who art in heaven, hallowed be thy name…',.17,.5],['P','Deliver us, Lord, we pray, from every evil…',.52,.75],['ppl','For the kingdom, the power and the glory are yours now and for ever.',.77,1]]},
{part:'Communion Rite',title:'Rite of Peace',dur:11,posture:'stand',
 text:'With hands extended, the Priest says the prayer for peace. Facing the people, he says "The peace of the Lord be with you always." If appropriate, the Deacon invites all to offer a sign of peace. The Priest gives the sign of peace to the Deacon or a minister and stays within the sanctuary.',
 ref:'GIRM 82, 154, 181',
 orans:{P:[[0,.2]]},
 mv:{D:[M([[478,118]],.68,.74),M([ALT_D],.88,.95)]},
 acts:{P:[['sign of peace to the Deacon',.7,.86]]},
 special:{type:'peace',a:.65,b:1},
 say:[['P','Lord Jesus Christ, who said to your Apostles: Peace I leave you…',0,.2],['ppl','Amen.',.2,.27],['P','The peace of the Lord be with you always.',.28,.4],['ppl','And with your spirit.',.4,.5],['D','Let us offer each other the sign of peace.',.5,.63],['ppl','(the faithful exchange a sign of peace)',.66,1]]},
{part:'Communion Rite',title:'Fraction of the Bread — Agnus Dei',dur:11,posture:[['stand',0],['kneel',.95]],
 text:'The Priest breaks the host over the paten and places a small piece in the chalice, saying a prayer quietly. Meanwhile the Agnus Dei is sung or said. In many places the faithful kneel after it.',
 ref:'GIRM 43, 83, 155',
 acts:{P:[['breaks the Host',.1,.3],['places a particle in the chalice',.3,.42]]},
 say:[['P','(quietly) May this mingling of the Body and Blood of our Lord Jesus Christ bring eternal life to us who receive it.',.15,.42],['ppl','♪ Lamb of God, you take away the sins of the world… grant us peace. ♪',.08,.95]]},
{part:'Communion Rite',title:'"Behold the Lamb of God"',dur:12,posture:'kneel',
 text:'With hands joined, the Priest quietly says the prayer before Communion. He genuflects, takes the host and holds it slightly raised above the paten or chalice. Facing the people, he says "Behold the Lamb of God…" and then says "Lord, I am not worthy…" once, together with the people.',
 ref:'Order of Mass 132; GIRM 84, 156–157',
 acts:{P:[['private prayer (hands joined)',0,.2],['genuflects',.2,.3],['shows the Host',.32,.92]]},
 raise:[['host',.32,.92]],
 say:[['P','Behold the Lamb of God, behold him who takes away the sins of the world. Blessed are those called to the supper of the Lamb.',.33,.6],['ppl','Lord, I am not worthy that you should enter under my roof, but only say the word and my soul shall be healed.',.62,.95]]},
{part:'Communion Rite',title:'Holy Communion',dur:24,posture:'kneel',
 text:'Facing the altar, the Priest says a prayer quietly and reverently receives the Body of Christ, then the Blood. He gives Communion to the Deacon and ministers. The faithful then approach in procession. Showing each a host slightly raised, he says "The Body of Christ," and the communicant replies "Amen." Meanwhile the Communion Chant is sung.',
 ref:'Order of Mass 133–137; GIRM 86–87, 158–161, 182',
 mv:{P:[M([[625,122],[625,262],[470,292]],.22,.32),M([[625,262],[625,122],ALT_P],.92,1)],D:[M([[375,122],[375,262],[530,292]],.22,.32),M([[375,262],[375,122],ALT_D],.92,1)]},
 props:{bread:[{by:'P',t:.2},{at:[500,160],a:.985,b:1}],chalice:[{by:'D',t:.2},{at:[540,170],a:.985,b:1}]},
 acts:{P:[['receives Communion',.03,.13],['gives Communion to the Deacon',.13,.2]],D:[['receives Communion',.13,.2]]},
 special:{type:'communion',a:.33,b:.9},
 say:[['P','(quietly) May the Body of Christ keep me safe for eternal life.',.03,.13],['P','The Body of Christ.',.34,.46],['ppl','Amen.',.46,.52],['D','The Blood of Christ.',.52,.62],['ppl','♪ Communion Chant ♪',.62,.92]]},
{part:'Communion Rite',title:'Purification & Sacred Silence',dur:12,posture:'kneel',
 text:'When Communion is over, the Deacon (or the Priest) consumes any of the Blood that remains, and the hosts that remain are placed in the tabernacle. The sacred vessels are purified at the credence table or the altar. The Priest returns to the chair. A period of sacred silence may follow, or a psalm or hymn of praise may be sung.',
 ref:'Order of Mass 137–138; GIRM 88, 163–164, 183',
 mv:{P:M([[560,90],CHAIR],.15,.35),D:[M([[640,140],[838,140]],.15,.4),M([[700,95],DCHAIR],.82,.98)],S:[M([[620,152]],.18,.32),M([[850,100]],.4,.55),M([[805,78]],.7,.85)]},
 props:{chalice:[{by:'D',t:.1},{at:[888,128],a:.75,b:.8}],bread:[{by:'D',t:.1},{hide:true,t:.78}],corporal:[{by:'S',t:.34},{at:[866,120],a:.56,b:.62}]},
 acts:{D:[['purifies the vessels',.42,.75]]},
 say:[['ppl','(sacred silence)',.45,1]]},
{part:'Communion Rite',title:'Prayer after Communion',dur:9,posture:'stand',
 text:'Standing at the chair or the altar, the Priest says "Let us pray" and then, with hands extended, the Prayer after Communion. The people acclaim "Amen."',
 ref:'Order of Mass 139; GIRM 89, 165',
 orans:{P:[[.32,.8]]},
 say:[['P','Let us pray.',0,.15],['ppl','(brief silence)',.17,.3],['P','(Prayer after Communion)',.32,.8],['ppl','Amen.',.82,1]]},

// ===== CONCLUDING RITES =====
{part:'Concluding Rites',title:'Greeting & Blessing',dur:11,posture:'stand',
 text:'Brief announcements may be made if necessary. The Priest extends his hands and greets the people, then blesses them. On some days a Solemn Blessing or a Prayer over the People is used, and the Deacon may invite all to bow down for the blessing.',
 ref:'Order of Mass 140–143; GIRM 90, 166–167, 185',
 orans:{P:[[.17,.28]]},
 acts:{P:[['blesses the people ✠',.42,.75]]},
 say:[['P','(brief announcements)',0,.15],['P','The Lord be with you.',.17,.28],['ppl','And with your spirit.',.28,.38],['P','May almighty God bless you, the Father, and the Son, ✠ and the Holy Spirit.',.42,.75],['ppl','Amen.  (all sign themselves)',.77,.92]]},
{part:'Concluding Rites',title:'Dismissal & Veneration of the Altar',dur:12,posture:'stand',
 text:'With hands joined and facing the people, the Deacon dismisses them, and the people reply. The Priest and Deacon then venerate the altar with a kiss as at the beginning.',
 ref:'Order of Mass 144–145; GIRM 90, 168–169, 185–186',
 mv:{P:M([ALT_P],.45,.62),D:M([[452,95],ALT_D],.45,.62),X:M([[700,95],[670,142]],.55,.8),C1:M([[392,95],[392,152]],.55,.8),C2:M([[720,95],[612,152]],.55,.8),T:M([[760,250],[560,292]],.6,.92),L:M([[420,296],[420,266]],.7,.9)},
 props:{cross:[{by:'X',t:.86}],cand1:[{by:'C1',t:.86}],cand2:[{by:'C2',t:.86}]},
 acts:{P:[['kisses the altar',.66,.84]],D:[['kisses the altar',.66,.84]]},
 smoke:[['T',.6,1]],
 say:[['D','Go forth, the Mass is ended.',.05,.25],['ppl','Thanks be to God.',.27,.42],['ppl','♪ (a closing hymn is customary) ♪',.6,1]]},
{part:'Concluding Rites',title:'Recession',dur:13,posture:'stand',
 text:'After a profound bow with the ministers, the Priest leaves with them, in much the same way as the entrance procession.',
 ref:'GIRM 90, 169, 186',
 mv:{P:[M([[625,122],[625,250],[530,250]],0,.26)],D:[M([[375,122],[375,250],[470,250]],0,.26)],X:M([[640,265]],0,.22),C1:M([[360,265]],0,.22),C2:M([[690,265]],0,.22),T:M([[740,265]],0,.2),
     },
 acts:{P:[['profound bow',.3,.42]],D:[['profound bow',.3,.42]],X:[['',.3,.42]],L:[['profound bow',.3,.42]]},
 say:[['ppl','♪ Closing hymn ♪',0,1]],smoke:[['T',0,1]]},
];
// exit paths for the recession (staggered)
(function(){const s=STEPS[STEPS.length-1];
  const exitP=(x,a,b)=>M([[x,312],[x,860]],a,b);
  Object.assign(s.mv,{T:[s.mv.T,exitP(500,.44,.8)],X:[s.mv.X,exitP(500,.48,.86)],C1:[s.mv.C1,exitP(470,.48,.86)],C2:[s.mv.C2,exitP(530,.48,.86)],
    L:exitP(500,.53,.9),D:[s.mv.D[0],exitP(500,.56,.95)],P:[s.mv.P[0],exitP(500,.6,1)]});
})();

// ---------- initial state ----------
const START_POS={...HOME,T:[500,700],X:[500,730],C1:[470,730],C2:[530,730],L:[500,756],D:[500,782],P:[500,808],MB:[480,834],CB:[520,834]};
const PROP_DEF={
  corporal:{off:[0,-16]},missal:{off:[0,-16]},gospels:{off:[0,-16]},chalice:{off:[0,-16]},bread:{off:[0,-16]},wine:{off:[0,-16]},
  cross:{off:[0,-18]},cand1:{off:[0,-16]},cand2:{off:[0,-16]},thurible:{off:[13,8]},ewer:{off:[14,-4]},
  collection:{off:[0,-12]},ciborium:{off:[0,-16]},ciborium2:{off:[0,-16]},
  // Exposition (mass-rite-exposition.js): the monstrance and the Sacrament in its lunette.
  monstrance:{off:[0,-16]},lunette:{off:[0,-16]},
  // Mass with the Bishop: the mitre and the pastoral staff (crozier).
  mitre:{off:[0,0]},staff:{off:[-9,-4]},
  // Confirmation: the vessel of holy chrism.
  chrism:{off:[10,-8]},
  // Ash Wednesday: the vessel of blessed ashes.
  ashes:{off:[10,-6]},
  // Palm Sunday: branches of palm.
  palms:{off:[0,-16]}
};
const START_PROPS={
  corporal:{at:[866,120]},missal:{at:[845,120]},chalice:{at:[888,128]},ewer:{at:[850,144]},
  bread:{at:[612,770]},wine:{at:[632,770]},gospels:{by:'D'},cross:{by:'X'},cand1:{by:'C1'},cand2:{by:'C2'},thurible:{by:'T'},
  collection:{at:[875,745],h:true},ciborium:{at:[866,152],h:true},ciborium2:{at:[455,170],h:true},
  monstrance:{at:[500,160],h:true},lunette:{at:[137,85],h:true},
  mitre:{at:[1180,190],h:true},staff:{at:[1180,190],h:true},
  chrism:{at:[878,138],h:true},
  ashes:{at:[858,132],h:true},
  palms:{at:[440,866],h:true}
};

// ---------- math helpers ----------
const ease=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const lerp=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];
function along(pts,k){
  const seg=[];let L=0;
  for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);L+=d;}
  if(L===0)return pts[pts.length-1];
  let t=k*L;
  for(let i=0;i<seg.length;i++){ if(t<=seg[i]||i===seg.length-1) return lerp(pts[i],pts[i+1],seg[i]?Math.min(1,t/seg[i]):1); t-=seg[i]; }
}
const segs=x=>!x?[]:Array.isArray(x)?x:[x];

// ---------- state evaluation ----------
const starts=[];
function actorAt(i,a,u){
  let p=starts[i].pos[a];
  for(const s of segs(STEPS[i].mv&&STEPS[i].mv[a])){
    if(u<=s.a) return p;
    const pts=[p,...s.p];
    if(u>=s.b){p=pts[pts.length-1];continue;}
    return along(pts,ease((u-s.a)/(s.b-s.a)));
  }
  return p;
}
function resolveProp(st,pos,name){ if(st.by){const p=pos[st.by],o=PROP_DEF[name].off;return [p[0]+o[0],p[1]+o[1]];} return st.at; }
function propAt(i,name,u,pos){
  let st={...starts[i].props[name]};
  for(const e of ((STEPS[i].props||{})[name]||[])){
    if(e.by!==undefined){ if(u>=e.t) st={by:e.by,h:st.h}; }
    else if(e.hide!==undefined){ if(u>=e.t) st.h=e.hide; }
    else if(e.at){
      if(u>=e.b) st={at:e.at,h:st.h};
      else if(u>e.a){ const p0=resolveProp(st,pos,name); st={at:lerp(p0,e.at,ease((u-e.a)/(e.b-e.a))),h:st.h}; break; }
    }
  }
  return st;
}
const POST_VAL={stand:1,sit:.62,kneel:.38};
function postureList(i){const p=STEPS[i].posture;return typeof p==='string'?[[p,0]]:p;}
function postureAt(i,u){
  let prev=i>0?postureList(i-1).slice(-1)[0][0]:'stand', val=POST_VAL[prev], name=prev;
  for(const [n,t] of postureList(i)){ if(u>=t){ const k=ease((u-t)/.08); val=val+(POST_VAL[n]-val)*k; name=n; } }
  return {val,name};
}
function precompute(initialPos=START_POS, initialProps=START_PROPS){
  starts.length=0;
  let pos={...initialPos}, props={};
  for(const k in initialProps) props[k]={...initialProps[k]};
  for(let i=0;i<STEPS.length;i++){
    starts[i]={pos:{...pos},props:JSON.parse(JSON.stringify(props))};
    const np={}; for(const a in ACTORS) np[a]=actorAt(i,a,1);
    const npr={}; for(const k in PROP_DEF) npr[k]=propAt(i,k,1,np);
    pos=np; props=npr;
  }
}
let TOTAL=0;
const stepStart=[];
function rebuildTimeline(initialPos=START_POS, initialProps=START_PROPS){
  precompute(initialPos,initialProps);
  TOTAL=0;
  stepStart.length=0;
  for(const s of STEPS){stepStart.push(TOTAL);TOTAL+=s.dur;}
}
rebuildTimeline();
