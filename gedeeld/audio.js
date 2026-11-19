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
  resume(){return this.ctx.resume();}
  spatial(x,y,z,direct=false) {
    const p=this.ctx.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;
    p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z;
    p.connect(direct?this.master:this.space);
    if(!direct)p.connect(this.reverb);
    return p;
  }
  track(source,nodes=[]) {
    this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
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
    src.buffer=this.buffer;src.loop=true;f.type='bandpass';f.Q.value=.65;
    f.frequency.setValueAtTime(frequency,now);f.frequency.exponentialRampToValueAtTime(endFrequency,now+duration);
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+attack);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    src.connect(f).connect(g).connect(p);this.track(src,[f,g,p]);src.start();src.stop(now+duration+.02);
  }
  start(id,timeline) {
    this.id=id;
    this.wind=this.noise(-4,2,-5,500);this.rain=this.noise(2,5,-3,5000);this.close=this.noise(0,.4,-1.65,900);
    this.drone=this.ctx.createOscillator();this.dg=this.ctx.createGain();this.dp=this.spatial(0,1,-4);
    this.drone.frequency.value=id===0?62:95;this.dg.gain.value=0;
    this.drone.connect(this.dg).connect(this.dp);this.track(this.drone,[this.dg,this.dp]);this.drone.start();
    this.wet.gain.value=id===3?.55:.08;
    if(id===1)for(const second of [16,35,50,63,73])timeline.at(second,()=>{
      this.burst(-14,4,-24,3.6,.65,150,{attack:.25,endFrequency:55});
      this.tone(44,3.2,-14,4,-24,.17);
    });
    if(id===3) {
      timeline.at(67,()=>{ // Remote hinge, then a resonant wooden door settling into its frame.
        this.burst(-2,1,8,1.7,.28,650,{attack:.12,endFrequency:180});
        this.tone(175,1.1,-2,1,8,.12,'triangle');
      });
      timeline.at(68.5,()=>{this.burst(-2,1,8,.3,.5,180);this.tone(68,1.4,-2,1,8,.2);});
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
    const end=[150,155,150,140][id],fade=1-smooth(end-15,end,t);
    if(id===0) {
      this.set(this.wind.gain,(.02+.2*smooth(20,60,t))*(1-smooth(130,150,t)));
      this.set(this.dg,.04*fade);
      this.drone.frequency.setTargetAtTime(62+70*smooth(20,60,t)-70*smooth(130,148,t),now,.3);
    }
    if(id===1) {
      const warm=smooth(75,95,t);
      this.set(this.wind.gain,(.04+.12*smooth(0,40,t))*(1-.85*warm)*fade);
      this.set(this.rain.gain,.2*smooth(40,60,t)*(1-.65*warm)*fade);
      this.rain.filter.frequency.setTargetAtTime(5000-4400*warm,now,.3);
      this.set(this.close.gain,.025*warm*(1-smooth(145,155,t)));
      this.set(this.dg,.03*warm*fade*(.92+.08*Math.sin(t*.55)));
      const k=Math.floor(t*3);
      if(k!==this.lastEvent) {
        this.lastEvent=k;
        if(warm&&(k%3===0||k%7===0)&&t<154)this.burst(.15*Math.sin(k),.4,-1.65,.06+.02*(k%3),.045*warm*(1-smooth(147,155,t))+.0001,900+(k%5)*500);
      }
    }
    if(id===2) {
      this.set(this.wind.gain,.025*fade);this.set(this.dg,.008*fade);
      const k=Math.floor(t*2);
      if(k!==this.lastEvent){this.lastEvent=k;if(k%5===0)this.tone(2300+(k%4)*190,.09,3,1,-3,.012*fade+.0001);}
    }
    if(id===3) {
      // Gate both dry sound and reverb: no lingering tail during 01:30–01:32.
      this.space.gain.setValueAtTime(t>=90&&t<95?0:fade,now);
      this.wet.gain.setTargetAtTime(t>=95?.08:.55,now,.6);
      this.set(this.wind.gain,t<90?.018:0);this.set(this.dg,t>=95?.025*fade:0);
      const k=Math.floor(t*1.6);
      if(k!==this.lastEvent) {
        this.lastEvent=k;
        if(t<40&&k%8===0)this.tone(850+(k%5)*150,.5,k%16?-4:4,2,k%16?-7:-3,.06);
        if(t>=40&&t<89.8&&k%2===0) {
          // Last approach ends behind the listener (positive z), without moving the camera.
          const angle=(t-90)*.27,dist=6-5.3*smooth(40,90,t);
          this.burst(Math.sin(angle)*dist,0,Math.cos(angle)*dist,.17,.12,450);
        }
      }
    }
  }
  peak(id) {
    if(id===0){this.burst(0,2,-1,1,.5,1200);this.tone(180,.9,0,2,-1,.25,'triangle');}
    if(id===1){this.burst(0,.42,-1.65,.3,.28,1800);this.tone(390,.8,0,.42,-1.65,.16);}
    if(id===2)this.tone(1200,.35,.3,1.3,-.5,.18);
  }
  fall(){this.tone(50,1,0,0,-1,.35);this.burst(0,-1,-1,1.2,.3,650,{endFrequency:80});}
  stop(){for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();return this.ctx.close();}
}
