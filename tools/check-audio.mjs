import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Sound} from '../gedeeld/audio.js';
class Param {
 value=0;
 setValueAtTime(v){assert(Number.isFinite(v));this.value=v;}
 setTargetAtTime(v){assert(Number.isFinite(v));this.value=v;}
 linearRampToValueAtTime(v){assert(Number.isFinite(v));this.value=v;}
 exponentialRampToValueAtTime(v){assert(Number.isFinite(v)&&v>0);this.value=v;}
}
class Node {
 constructor(){for(const n of ['gain','frequency','Q','playbackRate','detune','positionX','positionY','positionZ','orientationX','orientationY','orientationZ'])this[n]=new Param();}
 connect(n){return n;}disconnect(){}start(){}stop(){}
}
class Context {
 sampleRate=8000;currentTime=1;state='suspended';destination=new Node();listener=new Node();
 createGain(){return new Node();}createPanner(){return new Node();}createBiquadFilter(){return new Node();}createOscillator(){return new Node();}createBufferSource(){return new Node();}createConvolver(){return new Node();}
 createBuffer(channels,n,rate){return {duration:n/rate,getChannelData:()=>new Float32Array(n)};}
 decodeAudioData(){return Promise.resolve(this.createBuffer(1,240000,8000));}resume(){this.state='running';}close(){this.state='closed';}
}
globalThis.AudioContext=Context;
for(let id=0;id<4;id++) {
 const sound=new Sound(),scene=new THREE.Scene();
 await sound.load(Object.fromEntries(['rain','rain-bed','wind','wind-bed','fire','roof','crickets','crickets-bed','steps','door','drop','thunder'].map(k=>[k,new ArrayBuffer(1)])),scene);
 const cues=[];sound.start(id,{at(t,fn){cues.push([t,fn]);}});
 for(const t of [0,2,18,20,23,25,30,40,45,47,50,75,80,90]){sound.update(t);sound.peak(id);}
 for(const [,fn]of cues)fn();
 assert.equal(sound.middle.length,5);
 for(const s of sound.spatialSounds){assert.equal(s.panner.panningModel,'HRTF');assert.equal(s.getDistanceModel(),'inverse');}
 const p=new THREE.Vector3(0,.8,-.4);sound.tap(p);const fall=sound.dropStart(p);sound.dropMove(p,2,fall);sound.warmth(p,1);
 if(id===1){sound.update(35);const outdoor=sound.rain.filter.frequency.value;sound.update(55);assert(sound.rain.filter.frequency.value<outdoor);assert(sound.roof.gain.gain.value>sound.wind.gain.gain.value);}
 if(id===2){sound.moveSwarm(p);assert.equal(sound.swarm.p.positionY.value,p.y);}
 if(id===3){sound.darkBuzz(p,.01);sound.update(45);assert.equal(sound.space.gain.value,0);sound.update(47);assert(sound.space.gain.value>0);}
 sound.stop();sound.stop();assert.equal(scene.children.length,0);console.log('audio',id,'routing, finite envelopes, layers and cleanup OK (mock AudioContext)');
}
