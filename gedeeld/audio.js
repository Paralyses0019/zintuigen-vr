import * as THREE from 'three';
import {smooth,random} from './util.js';

export class Sound {
  constructor() {
    this.ctx=new AudioContext();
    const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=.7;this.master.connect(c.destination);
    this.space=c.createGain();this.space.connect(this.master);
    this.reverb=c.createConvolver();this.wet=c.createGain();this.wet.gain.value=0;
    this.reverb.connect(this.wet).connect(this.space);
    this.sources=new Set();this.lastEvent=-1;
    this.ear={x:.22,y:1.6,z:.08};
    const rand=random(919);
    this.buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate);
    const data=this.buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=rand()*2-1;
    const impulse=c.createBuffer(2,c.sampleRate*3.8,c.sampleRate);
    for(let channel=0;channel<2;channel++) {
      const d=impulse.getChannelData(channel);
      for(let i=0;i<d.length;i++)d[i]=(rand()*2-1)*Math.exp(-i/(c.sampleRate*.65))*(1-Math.exp(-i/(c.sampleRate*.012)));
    }
    this.reverb.buffer=impulse;
  }
  async load(files,scene) {
    this.recordings={};this.scene=scene;this.audioGroup=new THREE.Group();scene.add(this.audioGroup);
    THREE.AudioContext.setContext(this.ctx);this.listener=new THREE.AudioListener();
    this.listener.gain.disconnect();this.listener.gain.connect(this.space);
    await Promise.all(Object.entries(files).map(async([name,data])=>{this.recordings[name]=await this.ctx.decodeAudioData(data.slice(0));}));
  }
  recording(name,x,y,z,{loop=true,volume=0,offset=0,ref=.8,duration=undefined}={}) {
    const buffer=this.recordings?.[name];if(!buffer)return null;
    const sound=new THREE.PositionalAudio(this.listener);sound.setBuffer(buffer);sound.setLoop(loop);sound.setRefDistance(ref);sound.setDistanceModel('inverse');sound.panner.panningModel='HRTF';
    sound.position.set(x,y,z);const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=18000;sound.setFilter(filter);sound.setVolume(volume);
    this.audioGroup.add(sound);sound.updateMatrixWorld(true);sound.offset=offset%buffer.duration;sound.duration=duration;sound.play();
    sound.gain.connect(this.reverb);this.spatialSounds??=[];this.spatialSounds.push(sound);
    return {sound,gain:sound.gain,filter,p:sound.panner};
  }
  tap(position,volume=.09) {
    const name=this.recordings.drop?'drop':'wind';
    const r=this.recording(name,position.x,position.y,position.z,{loop:false,volume,offset:0,ref:.3,duration:.16});

  }
  warmth(position,amount) {
    this.handWarmth=amount;
    if(this.close?.sound){this.close.sound.position.copy(position);this.close.sound.updateMatrixWorld(true);}
  }
  resume(){return this.ctx.resume();}
  spatial(x,y,z,direct=false) {
    const sound=new THREE.PositionalAudio(this.listener);
    sound.setRefDistance(2);sound.setDistanceModel('inverse');sound.position.set(x,y,z);sound.updateMatrixWorld(true);
    const p=sound.panner;p.panningModel='HRTF';p._spatialSound=sound;
    sound.gain.disconnect();sound.gain.connect(direct?this.master:this.space);
    if(!direct)sound.gain.connect(this.reverb);
    this.procedural??=new Set();this.procedural.add(sound);
    return p;
  }
  track(source,nodes=[]) {
    this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);source.disconnect();nodes.forEach(n=>{n.disconnect();if(n._spatialSound){n._spatialSound.gain.disconnect();this.procedural.delete(n._spatialSound);}});};
  }
  noise(x,y,z,frequency=700) {
    const c=this.ctx,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),p=this.spatial(x,y,z);
    source.buffer=this.buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.value=0;
    source.connect(filter).connect(gain).connect(p);this.track(source,[filter,gain,p]);source.start();
    return {gain,filter,p};
  }
  tone(freq,duration,x,y,z,volume=.15,type='sine') {
    const c=this.ctx,osc=c.createOscillator(),g=c.createGain(),p=this.spatial(x,y,z),now=c.currentTime;
    osc.type=type;osc.frequency.value=freq;
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.025);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(g).connect(p);this.track(osc,[g,p]);osc.start();osc.stop(now+duration+.02);
  }
  burst(x,y,z,duration=.2,volume=.2,frequency=1500,{direct=false,attack=.01,endFrequency=frequency}={}) {
    const c=this.ctx,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=this.spatial(x,y,z,direct),now=c.currentTime;
    src.buffer=this.recordings?.fire||this.recordings?.wind||this.buffer;src.loop=true;f.type='bandpass';f.Q.value=.65;
    f.frequency.setValueAtTime(frequency,now);f.frequency.exponentialRampToValueAtTime(endFrequency,now+duration);
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+attack);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    src.connect(f).connect(g).connect(p);this.track(src,[f,g,p]);src.start();src.stop(now+duration+.02);
  }
  start(id,timeline) {
    this.id=id;
    this.wind=this.recording('wind',-4,2,-5,{ref:3})||this.noise(-4,2,-5,500);
    this.rain=this.recording('rain',2,3,-3,{ref:2})||this.noise(2,5,-3,5000);
    this.close=this.recording(id===1?'fire':id===2?'crickets':'wind',0,1,-.45,{ref:.6})||this.noise(0,1,-.45,900);
    const layerName=id===1?'rain':id===2?'crickets':id===3?'drop':'wind';
    this.roof=id===1?this.recording('roof',0,2.35,-.1,{ref:1.5}):null;
    this.middle=Array.from({length:5},(_,i)=>this.recording(layerName,Math.sin(i*1.256)*2.6,.5+(i%3)*1.1,Math.cos(i*1.256)*2.6,{offset:i*3.7,ref:1.6})).filter(Boolean);
    const bedName=id===1?'rain-bed':id===2?'crickets-bed':'wind-bed';
    if(this.recordings[bedName]) {const src=this.ctx.createBufferSource();src.buffer=this.recordings[bedName];src.loop=true;this.bed=this.ctx.createGain();this.bedFilter=this.ctx.createBiquadFilter();this.bedFilter.type='lowpass';this.bed.gain.value=0;src.connect(this.bedFilter).connect(this.bed).connect(this.space);this.track(src,[this.bed,this.bedFilter]);src.start();}
    this.drone=this.ctx.createOscillator();this.dg=this.ctx.createGain();this.dp=this.spatial(0,1,-4);
    this.drone.frequency.value=id===0?62:95;this.dg.gain.value=0;
    this.drone.connect(this.dg).connect(this.dp);this.track(this.drone,[this.dg,this.dp]);this.drone.start();
    this.wet.gain.value=id===3?.55:.08;
    if(id===1)for(const second of [16,35,50,63,73])timeline.at(second,()=>{
      this.recording('thunder',-14,4,-24,{loop:false,volume:.6,ref:12});
      this.tone(44,3.2,-14,4,-24,.17);
    });
    if(id===3) {
      timeline.at(67,()=>this.recording('door',-2,1,8,{loop:false,volume:.6,ref:3}));
      timeline.at(92,()=>this.burst(this.ear.x,this.ear.y,this.ear.z,.5,.15,1100,{direct:true,attack:.06,endFrequency:650}));
    }
  }
  set(node,value){node.gain.setTargetAtTime(Math.max(0,value),this.ctx.currentTime,.12);}
  listen(position,forward,up) {
    this.ear={
      x:position.x+.22*(forward.y*up.z-forward.z*up.y)-forward.x*.04,
      y:position.y+.22*(forward.z*up.x-forward.x*up.z)-forward.y*.04,
      z:position.z+.22*(forward.x*up.y-forward.y*up.x)-forward.z*.04
    };
    const l=this.ctx.listener;
    if(l.positionX) {
      for(const [prefix,v] of [['position',position],['forward',forward],['up',up]]) {
        l[prefix+'X'].value=v.x;l[prefix+'Y'].value=v.y;l[prefix+'Z'].value=v.z;
      }
    } else {l.setPosition(position.x,position.y,position.z);l.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);}
  }
  update(t) {
    const id=this.id,now=this.ctx.currentTime;
    this.spatialSounds=this.spatialSounds?.filter(sound=>{if(sound.isPlaying)return true;sound.disconnect();sound.gain.disconnect();this.audioGroup.remove(sound);return false;})||[];
    const end=[150,155,150,140][id],fade=1-smooth(end-15,end,t);
    const warm=id===1?smooth(75,95,t):0;
    if(this.roof){this.set(this.roof.gain,.12*warm*fade);this.roof.filter.frequency.setTargetAtTime(1700,now,.3);}
    const layer=id===1?smooth(40,60,t)*(1-.7*warm):id===0?.15+.85*smooth(20,64,t):id===3?(t<40?.1:0):.4;
    this.middle?.forEach(r=>{this.set(r.gain,.075*layer*fade);r.filter.frequency.setTargetAtTime(16000-15000*warm,now,.25);});
    if(this.bed){this.set(this.bed,.035*layer*fade);this.bedFilter.frequency.setTargetAtTime(18000-17000*warm,now,.25);}
    if(id===2)this.set(this.close.gain,.035*fade);
    if(id===0) {
      this.set(this.close.gain,.025*smooth(60,64,t)*fade);
      this.set(this.wind.gain,(.02+.2*smooth(20,60,t))*(1-smooth(130,150,t)));
      this.set(this.dg,.04*fade);
      this.drone.frequency.setTargetAtTime(62+70*smooth(20,60,t)-70*smooth(130,148,t),now,.3);
    }
    if(id===1) {
      const warm=smooth(75,95,t);
      this.set(this.wind.gain,(.04+.12*smooth(0,40,t))*(1-.85*warm)*fade);
      this.set(this.rain.gain,.2*smooth(40,60,t)*(1-.65*warm)*fade);
      this.rain.filter.frequency.setTargetAtTime(5000-4400*warm,now,.3);
      this.set(this.close.gain,.16*warm*(1+.5*(this.handWarmth||0))*(1-smooth(145,155,t)));
      this.set(this.dg,.03*warm*fade*(.92+.08*Math.sin(t*.55)));
      const k=Math.floor(t*3);
      if(k!==this.lastEvent) {
        this.lastEvent=k;
        if(!this.recordings.fire&&warm&&(k%3===0||k%7===0)&&t<154)this.burst(.15*Math.sin(k),.4,-1.65,.06+.02*(k%3),.045*warm*(1-smooth(147,155,t))+.0001,900+(k%5)*500);
      }
    }
    if(id===2) {
      this.set(this.wind.gain,.025*fade);this.set(this.dg,.008*fade);
      const k=Math.floor(t*2);
      if(k!==this.lastEvent){this.lastEvent=k;if(!this.recordings.crickets&&k%5===0)this.tone(2300+(k%4)*190,.09,3,1,-3,.012*fade+.0001);}
    }
    if(id===3) {
      // Gate both dry sound and reverb: no lingering tail during 01:30–01:32.
      this.space.gain.setValueAtTime(t>=90&&t<95?0:fade,now);
      this.wet.gain.setTargetAtTime(t>=95?.08:.55,now,.6);
      this.set(this.wind.gain,t<90?.018:0);this.set(this.dg,t>=95?.025*fade:0);
      const k=Math.floor(t*1.6);
      if(k!==this.lastEvent) {
        this.lastEvent=k;
        if(t<40&&k%8===0)this.recording('drop',k%16?-4:4,2,k%16?-7:-3,{loop:false,volume:.18,ref:2});
        if(t>=40&&t<89.8&&k%2===0&&t>(this.retreatUntil||0)) {
          // Last approach ends behind the listener (positive z), without moving the camera.
          const angle=(t-90)*.27,dist=6-5.3*smooth(40,90,t);
          this.recording('steps',Math.sin(angle)*dist,.9,Math.cos(angle)*dist,{loop:false,volume:.18,ref:1,offset:(k%8)*1.3,duration:.65});
        }
      }
    }
  }
  peak(id) {
    if(id===0){this.recording('door',0,1,-1,{loop:false,volume:.5,ref:1});this.tone(180,.9,0,2,-1,.25,'triangle');}
    if(id===1){this.burst(.12,1.05,-.48,.3,.22,1800);this.tone(390,.8,.12,1.05,-.48,.16);}
    if(id===2)this.tone(1200,.35,.3,1.3,-.5,.18);
  }
  dropStart(position) {
    if(this.falling?.sound.isPlaying)this.falling.sound.stop();
    this.falling=this.recording('wind',position.x,position.y,position.z,{volume:.25,ref:1.2});
  }
  dropMove(position,elapsed) {
    if(!this.falling)return;
    this.falling.sound.position.copy(position);this.falling.sound.updateMatrixWorld(true);
    this.falling.filter.frequency.setTargetAtTime(Math.max(120,6000*Math.exp(-elapsed)),this.ctx.currentTime,.1);
    this.falling.sound.setPlaybackRate(Math.max(.4,1-elapsed*.12));
  }
  dropLand() {
    if(this.falling?.sound.isPlaying)this.falling.sound.stop();this.falling=null;
    this.recording('door',0,-85,-2,{loop:false,volume:1,ref:10,duration:1});
    this.tone(90,1.5,0,-85,-2,.12);
  }
  reach(hands,t) {
    if(this.id!==3||t<40||t>=90)return;
    const angle=(t-90)*.27,dist=6-5.3*smooth(40,90,t);
    this.movingPosition=new THREE.Vector3(Math.sin(angle)*dist,.9,Math.cos(angle)*dist);
    if(hands.some(h=>h.position.distanceTo(this.movingPosition)<.8)){this.retreatUntil=t+2;for(const s of this.spatialSounds||[])if(s.buffer===this.recordings.steps&&s.isPlaying)s.stop();}
  }
  fall(){this.tone(50,1,0,0,-1,.35);this.burst(0,-1,-1,1.2,.3,650,{endFrequency:80});}
  stop(){
    for(const r of this.spatialSounds||[]){if(r.isPlaying)r.stop();r.disconnect();r.gain.disconnect();}
    this.spatialSounds=[];if(this.audioGroup)this.scene.remove(this.audioGroup);
    for(const sound of this.procedural||[]){sound.panner.disconnect();sound.gain.disconnect();}this.procedural?.clear();
    if(this.ctx.state==='closed')return;
    for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();return this.ctx.close();}
}
