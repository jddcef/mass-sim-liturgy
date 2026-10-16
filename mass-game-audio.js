'use strict';
// Offline sound effects synthesised with WebAudio: no files, no network.
const GameAudio=(()=>{
  let ctx=null,master=null,enabled=true;
  function ensure(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      ctx=new AC();
      master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);
    }
    if(ctx.state==='suspended')ctx.resume();
    return ctx;
  }
  function tone(freq,start,decay,gain,type='sine'){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(0,start);
    g.gain.linearRampToValueAtTime(gain,start+.004);
    g.gain.exponentialRampToValueAtTime(.0001,start+decay);
    o.connect(g).connect(master);o.start(start);o.stop(start+decay+.05);
  }
  // Inharmonic partials give a small handbell its metallic ring.
  function strike(f,at,decay,gain){
    [[1,1],[2.76,.5],[5.4,.25],[8.93,.12]].forEach(([m,a])=>tone(f*m,at,decay/Math.sqrt(m),gain*a));
  }
  function altarBell(duration=1.6){
    if(!enabled||!ensure())return;
    const now=ctx.currentTime,shakes=Math.max(3,Math.round(duration*7));
    for(let i=0;i<shakes;i++){
      const at=now+i*.14+Math.random()*.03;
      [1650,1980,2350].forEach((f,n)=>strike(f*(1+(Math.random()-.5)*.01),at+n*.012,1.1,.07));
    }
  }
  function sacristyBell(){
    if(!enabled||!ensure())return;
    const now=ctx.currentTime;
    strike(700,now,3.2,.22);strike(700,now+.9,3.2,.16);
  }
  function noiseBurst(at,length,freq,gain){
    const frames=Math.ceil(ctx.sampleRate*length),buffer=ctx.createBuffer(1,frames,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/frames,3);
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=buffer;filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=6;g.gain.value=gain;
    src.connect(filter).connect(g).connect(master);src.start(at);
  }
  // Each swing: the chains clink against the thurible bowl twice.
  function thurible(swings=3,interval=.9){
    if(!enabled||!ensure())return;
    const now=ctx.currentTime;
    for(let i=0;i<swings;i++){
      const at=now+i*interval;
      noiseBurst(at,.09,3600+Math.random()*900,.9);
      noiseBurst(at+.11,.07,4600+Math.random()*700,.6);
      tone(2900+Math.random()*300,at,.25,.03,'triangle');
    }
  }
  // A soft, slowly swelling hum marks a time of silence without breaking it.
  function silence(){
    if(!enabled||!ensure())return;
    const now=ctx.currentTime;
    for(const [f,gain] of [[196,.05],[294,.03],[392,.012]]){
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.value=f;
      g.gain.setValueAtTime(0,now);
      g.gain.linearRampToValueAtTime(gain,now+.7);
      g.gain.exponentialRampToValueAtTime(.0001,now+3.2);
      o.connect(g).connect(master);o.start(now);o.stop(now+3.3);
    }
  }
  // A key turning, then the latch.
  function unlock(){
    if(!enabled||!ensure())return;
    const now=ctx.currentTime;
    noiseBurst(now,.05,2600,.5);noiseBurst(now+.18,.06,1800,.7);tone(140,now+.18,.12,.08,'triangle');
  }
  function correct(){
    if(!enabled||!ensure())return;
    const now=ctx.currentTime;tone(660,now,.25,.08);tone(990,now+.1,.35,.08);
  }
  function wrong(){
    if(!enabled||!ensure())return;
    const now=ctx.currentTime;tone(220,now,.3,.08,'triangle');tone(185,now+.12,.35,.07,'triangle');
  }
  function tick(){
    if(!enabled||!ensure())return;
    tone(1200,ctx.currentTime,.05,.03,'square');
  }
  // Backing track for the screen operator: a soft organ-like chord loop, different for each part.
  // Illustrative only: a parish would play its own licensed recordings.
  let track=null;
  const PROGRESSIONS=[[0,5,7,0],[0,9,5,7],[0,7,9,5],[0,4,5,7],[0,5,9,7]];
  function startTrack(name='hymn'){
    stopTrack(.2);
    if(!enabled||!ensure())return;
    let hash=0;for(const c of name)hash=(hash*31+c.charCodeAt(0))>>>0;
    const root=174.6*Math.pow(2,(hash%5)/12),progression=PROGRESSIONS[hash%PROGRESSIONS.length];
    const bus=ctx.createGain();bus.gain.setValueAtTime(0,ctx.currentTime);bus.gain.linearRampToValueAtTime(.9,ctx.currentTime+1.2);bus.connect(master);
    const state={bus,name,bar:0,next:ctx.currentTime+.05,timer:null};
    const chord=(semitone,at,length)=>{
      for(const [interval,gain] of [[0,.035],[4,.022],[7,.022],[12,.014],[-12,.03]]){
        const f=root*Math.pow(2,(semitone+interval+(interval===4&&semitone%12===9?-1:0))/12);
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type=interval===-12?'sine':'triangle';o.frequency.value=f;
        g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.25);
        g.gain.setValueAtTime(gain,at+length-.3);g.gain.linearRampToValueAtTime(0,at+length);
        o.connect(g).connect(bus);o.start(at);o.stop(at+length+.05);
      }
    };
    const schedule=()=>{
      while(state.next<ctx.currentTime+2.5){
        chord(progression[state.bar%progression.length],state.next,2.2);
        state.next+=2.2;state.bar++;
      }
    };
    schedule();
    state.timer=setInterval(schedule,500);
    track=state;
  }
  function stopTrack(fade=1.5){
    if(!track)return;
    const state=track;track=null;
    clearInterval(state.timer);
    if(ctx){
      const now=ctx.currentTime;
      state.bus.gain.cancelScheduledValues(now);
      state.bus.gain.setValueAtTime(state.bus.gain.value,now);
      state.bus.gain.linearRampToValueAtTime(0,now+fade);
      setTimeout(()=>state.bus.disconnect(),(fade+3)*1000);
    }
  }
  return {ensure,altarBell,sacristyBell,thurible,silence,unlock,correct,wrong,tick,startTrack,stopTrack,
    get trackPlaying(){return track?.name||null;},
    setEnabled(v){enabled=!!v;if(!enabled)stopTrack(.2);},get enabled(){return enabled;}};
})();
