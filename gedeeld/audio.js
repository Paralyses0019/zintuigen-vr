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
    this.tone(560,.065,position.x,position.y,position.z,volume,'triangle');
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
  burst(x,y,z,duration=.2,volume=.2,frequency=1500,{direct=false,attack=.01,endFrequency=frequency,sample}={}) {
    const c=this.ctx,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=this.spatial(x,y,z,direct),now=c.currentTime;
    src.buffer=this.recordings?.[sample]||this.recordings?.wind||this.buffer;src.loop=true;f.type='bandpass';f.Q.value=.65;
    f.frequency.setValueAtTime(frequency,now);f.frequency.exponentialRampToValueAtTime(endFrequency,now+duration);
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+attack);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    src.connect(f).connect(g).connect(p);this.track(src,[f,g,p]);src.start();src.stop(now+duration+.02);
    return p;
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
    this.wet.gain.value=id===3?0:.045;
    if(id===1)for(const second of [3,14,22])timeline.at(second,()=>
      this.recording('thunder',-12,4,-18,{loop:false,volume:.36,ref:8,duration:2.2}));
    if(id===1)for(const second of [42,44,47,49])timeline.at(second,()=>{
      const side=second%2?-.65:.65;
      this.burst(side,1.9,-.4,.38,.08,950,{attack:.045,endFrequency:240});
    });
    if(id===2)this.swarm=this.noise(0,1,-1,2400);
    if(id===3){
      this.buzz=this.ctx.createOscillator();this.buzz.type='sawtooth';this.buzz.frequency.value=174;
      this.buzzGain=this.ctx.createGain();this.buzzGain.gain.value=0;this.buzzPan=this.spatial(0,1.6,-.2);
      this.buzz.connect(this.buzzGain).connect(this.buzzPan);this.track(this.buzz,[this.buzzGain,this.buzzPan]);this.buzz.start();
    }
  }
  moveSwarm(position){
    const p=this.swarm.p;p.positionX.value=position.x;p.positionY.value=position.y;p.positionZ.value=position.z;
  }
  darkBuzz(position,level){
    const p=this.buzzPan;p.positionX.value=position.x;p.positionY.value=position.y;p.positionZ.value=position.z;
    this.set(this.buzzGain,level);
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
    const end=id===3?80:90,fade=1-smooth(end-10,end,t);
    const warm=id===1?smooth(40,50,t):0;
    if(this.roof){this.set(this.roof.gain,.34*warm*(1-smooth(80,88,t)));this.roof.filter.frequency.setTargetAtTime(3300,now,.3);}
    const layer=id===1?1-.83*warm:id===0?.17+.4*smooth(2,18,t):id===3?0:.35;
    this.middle.forEach(r=>{this.set(r.gain,.055*layer*fade);r.filter.frequency.setTargetAtTime(14000-13100*warm,now,.25);});
    if(this.bed){this.set(this.bed,.035*layer*fade);this.bedFilter.frequency.setTargetAtTime(14000-13100*warm,now,.25);}
    if(id===0){
      const motor=smooth(2,5,t)*(1-smooth(16,20,t));
      this.set(this.wind.gain,(.035+.14*motor+.34*smooth(23,25,t))*fade);
      this.set(this.dg,(.028+.15*motor)*(1-smooth(20,23,t)));this.drone.frequency.setTargetAtTime(50+88*motor,now,.16);
    }else if(id===1){
      const storm=(1-.88*warm)*(1-smooth(80,87,t));
      this.set(this.wind.gain,.22*storm);this.set(this.rain.gain,.26*storm);
      for(const r of [this.wind,this.rain])r.filter.frequency.setTargetAtTime(6600-5900*warm,now,.2);
      this.set(this.close.gain,(t>=40?.17:0)*(1+.65*(this.handWarmth||0))*(1-smooth(84,90,t)));
    }else if(id===2){
      this.set(this.swarm.gain,.065*smooth(0,3,t)*fade);this.set(this.close.gain,.035*fade);
    }else{
      this.space.gain.setValueAtTime(t>=45&&t<47?0:fade,now);
      this.set(this.dg,t>=50?.036*fade:0);
    }
  }
  peak(id) {
    if(id===0){this.recording('door',0,1,-1,{loop:false,volume:.5,ref:1,duration:2});this.tone(78,.35,0,0,-.4,.32,'triangle');}
    if(id===1){
      const p=this.close.sound?.position||this.ear;
      this.burst(p.x,p.y,p.z,.48,.26,640,{attack:.08,endFrequency:150});
      for(const x of [-.7,.7])this.burst(x,1.6,-.25,2.4,.12,1300,{attack:.38,endFrequency:400});
    }
  }
  dropStart(position) {
    return this.recording('wind',position.x,position.y,position.z,{volume:.25,ref:18});
  }
  dropMove(position,elapsed,voice) {
    if(!voice)return;
    voice.sound.position.copy(position);voice.sound.updateMatrixWorld(true);
    voice.filter.frequency.setTargetAtTime(Math.max(120,6000*Math.exp(-elapsed)),this.ctx.currentTime,.1);
    voice.sound.setPlaybackRate(Math.max(.4,1-elapsed*.12));
  }
  stop(){
    for(const r of this.spatialSounds||[]){if(r.isPlaying)r.stop();r.disconnect();r.gain.disconnect();}
    this.spatialSounds=[];if(this.audioGroup)this.scene.remove(this.audioGroup);
    for(const sound of this.procedural||[]){sound.panner.disconnect();sound.gain.disconnect();}this.procedural?.clear();
    if(this.ctx.state==='closed')return;
    for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();return this.ctx.close();}
}
