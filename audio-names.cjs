const crypto=require('node:crypto');

const ROLE_NAMES={P:'priest',D:'deacon',L:'lector',Ps:'psalmist',ppl:'people'};

function clipKey(language,role,text){
  return JSON.stringify([language,role,text]);
}

function legacyClipFile(language,role,text){
  return 'audio/'+crypto.createHash('sha256').update(clipKey(language,role,text)).digest('hex').slice(0,20)+'.mp3';
}

function slug(text,max=40){
  const plain=text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return plain.slice(0,max).replace(/-+$/,'')||'clip';
}

// Step number = first use in the baseline script, so folder listings follow the Mass.
// The hash suffix ties each file to its exact wording and keeps names unique.
function clipFile(language,role,text,step){
  const hash=crypto.createHash('sha256').update(clipKey(language,role,text)).digest('hex').slice(0,8);
  const number=String(step).padStart(2,'0');
  return `audio/${language}/${number}-${ROLE_NAMES[role]}-${slug(text)}-${hash}.mp3`;
}

module.exports={ROLE_NAMES,clipKey,clipFile,legacyClipFile,slug};
