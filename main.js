import * as THREE from 'three';
import {VRButton} from './vendor/webxr/VRButton.js';
import {ARButton} from './vendor/webxr/ARButton.js';
import {Timeline} from './timeline.js';
import {Sound} from './gedeeld/audio.js';
import {dispose} from './gedeeld/util.js';
import {plank} from './belevingen/plank.js';
import {schuilplek} from './belevingen/schuilplek.js';
import {vuurvliegjes} from './belevingen/vuurvliegjes.js';
import {donker} from './belevingen/donker.js';

const experiences=[
  {name:'De plank',duration:150,peak:60,create:plank},
  {name:'Schuilplek',duration:155,peak:75,create:schuilplek},
  {name:'Vuurvliegjes in je lokaal',duration:150,peak:80,create:vuurvliegjes},
  {name:'Donker',duration:140,peak:90,create:donker}
];
const $=s=>document.querySelector(s);
const menu=$('#menu'),tiles=$('#tiles'),detail=$('#detail'),view=$('#view'),start=$('#start');
let selected=0,running=false,starting=false,timeline,world,audio,mode='desktop';
let yaw=0,pitch=0,dragging=false,lastX=0,lastY=0;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFramebufferScaleFactor(1);
renderer.xr.setFoveation(1);
view.prepend(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.05,1000);
camera.position.set(0,1.65,0);scene.add(camera);
const tracked=[];
for(let i=0;i<2;i++) {
  const hand=renderer.xr.getHand(i),controller=renderer.xr.getController(i);
  const entry={hand,controller,connected:false};
  controller.addEventListener('connected',()=>entry.connected=true);
  controller.addEventListener('disconnected',()=>entry.connected=false);
  scene.add(hand,controller);tracked.push(entry);
}
const head=new THREE.Vector3(),rotation=new THREE.Quaternion();
const forward=new THREE.Vector3(),up=new THREE.Vector3(),target=new THREE.Vector3();
function headPosition(){return head;}
function handPosition() {
  const hand=tracked.find(h=>h.hand.visible&&h.hand.joints?.['index-finger-tip']?.visible)?.hand.joints['index-finger-tip'];
  const controller=tracked.find(h=>h.connected&&h.controller.visible)?.controller;
  if(hand)return hand.getWorldPosition(target);
  if(controller)return controller.getWorldPosition(target);
  return target.set(0,-.32,-.7).applyQuaternion(rotation).add(head);
}
const durationLabel=d=>`${Math.floor(d/60)}:${String(d%60).padStart(2,'0')}`;
experiences.forEach((experience,i)=>{
  const button=document.createElement('button');button.className='tile';
  button.innerHTML=`<span>0${i+1} / ${durationLabel(experience.duration)}</span><strong>${experience.name}</strong>`;
  button.onclick=()=>choose(i);tiles.append(button);
});
function choose(i) {
  selected=i;tiles.hidden=true;detail.hidden=false;
  $('#number').textContent=`0${i+1}`;$('#title').textContent=experiences[i].name;
  $('#duration').textContent=durationLabel(experiences[i].duration);
}
$('#back').onclick=()=>{detail.hidden=true;tiles.hidden=false;};

// Keep the bundled XR entry helpers. ARButton normally chooses 'local'; this
// narrow adapter keeps both experiences in the same floor-based coordinate space.
const xrAdapter={xr:{
  setReferenceSpaceType:()=>renderer.xr.setReferenceSpaceType('local-floor'),
  setSession:session=>renderer.xr.setSession(session)
}};
const xrButtons={
  vr:VRButton.createButton(xrAdapter,{requiredFeatures:['local-floor'],optionalFeatures:['hand-tracking']}),
  ar:ARButton.createButton(xrAdapter,{requiredFeatures:['local-floor'],optionalFeatures:['hand-tracking']})
};
const hiddenButtons=document.createElement('div');hiddenButtons.hidden=true;
Object.values(xrButtons).forEach(b=>hiddenButtons.append(b));document.body.append(hiddenButtons);
let support={vr:false,ar:false};
async function ready() {
  if(navigator.xr) {
    const [vr,ar]=await Promise.all(['immersive-vr','immersive-ar'].map(type=>navigator.xr.isSessionSupported(type).catch(()=>false)));
    support={vr,ar};
  }
  // Every module is statically imported; no assets are fetched after Start.
  $('#progress').value=100;$('#loading').hidden=true;start.disabled=false;
}
ready();
start.onclick=()=>{
  if(starting||running)return;
  starting=true;start.disabled=true;
  audio=new Sound();audio.resume();
  mode=selected===2&&support.ar?'ar':support.vr?'vr':'desktop';
  renderer.xr.setReferenceSpaceType('local-floor');
  if(mode==='desktop')begin();
  else if(typeof xrButtons[mode].onclick==='function')xrButtons[mode].onclick();
  else {mode='desktop';begin();}
};
// The bundled buttons do not catch requestSession rejection. Recover the Start
// button on cancellation and offer another user-initiated attempt (VR fallback for AR).
addEventListener('unhandledrejection',event=>{
  if(!starting||running)return;
  starting=false;start.disabled=false;audio?.stop();
  if(mode==='ar')support.ar=false;
  $('#duration').textContent='Brilmodus kon niet starten. Tik opnieuw op Start.';
  console.warn('XR-start afgebroken:',event.reason);
  event.preventDefault();
});
renderer.xr.addEventListener('sessionstart',()=>{
  // Ignore automatic session offers until the user has explicitly pressed Start.
  if(!starting){renderer.xr.getSession()?.end();return;}
  begin();
});
renderer.xr.addEventListener('sessionend',()=>{if(running)finish(false);});
$('#stop').onclick=()=>finish();
function begin() {
  if(running)return;
  running=true;starting=false;menu.hidden=true;view.hidden=false;
  camera.rotation.set(0,0,0);camera.position.set(0,1.65,0);yaw=pitch=0;
  renderer.setClearColor(0x000000,mode==='ar'?0:1);
  const experience=experiences[selected];
  world=experience.create({scene,mode,headPosition,handPosition,audio});scene.add(world.group);
  const value=Number(new URLSearchParams(location.search).get('t'));
  const offset=Math.max(0,Math.min(experience.duration-.01,Number.isFinite(value)?value:0));
  timeline=new Timeline(offset);
  timeline.at(experience.peak,()=>{
    audio.peak(selected);
    if(selected===2)for(const source of renderer.xr.getSession()?.inputSources||[]) {
      source.gamepad?.hapticActuators?.[0]?.pulse(.35,100)?.catch(()=>{});
    }
  });
  audio.start(selected,timeline);renderer.setAnimationLoop(frame);
}
function finish(endSession=true) {
  if(!running)return;
  running=false;renderer.setAnimationLoop(null);audio.stop();
  scene.remove(world.group);dispose(world.group);world=null;
  scene.background=null;scene.fog=null;renderer.setClearColor(0x000000,1);
  view.hidden=true;menu.hidden=false;start.disabled=false;choose(selected);start.focus();
  if(endSession)renderer.xr.getSession()?.end();
}
function frame() {
  const t=timeline.update();
  if(t>=experiences[selected].duration){finish();return;}
  if(renderer.xr.isPresenting)renderer.xr.updateCamera(camera);
  const activeCamera=renderer.xr.isPresenting?renderer.xr.getCamera():camera;
  activeCamera.updateMatrixWorld();activeCamera.getWorldPosition(head);activeCamera.getWorldQuaternion(rotation);
  forward.set(0,0,-1).applyQuaternion(rotation);up.set(0,1,0).applyQuaternion(rotation);
  audio.listen(head,forward,up);
  world.update(t);audio.update(t);renderer.render(scene,camera);
}
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
});
view.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;});
addEventListener('pointerup',()=>dragging=false);
addEventListener('pointermove',e=>{
  if(!dragging||renderer.xr.isPresenting)return;
  yaw-=(e.clientX-lastX)*.004;pitch=Math.max(-1.4,Math.min(1.4,pitch-(e.clientY-lastY)*.004));
  camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);lastX=e.clientX;lastY=e.clientY;
});
