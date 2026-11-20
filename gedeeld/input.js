import * as THREE from 'three';
import {XRHandModelFactory} from '../vendor/webxr/XRHandModelFactory.js';
import {XRControllerModelFactory} from '../vendor/webxr/XRControllerModelFactory.js';
export function input(renderer,scene,head,rotation) {
 const factory=new XRHandModelFactory().setPath('./vendor/profiles/generic-hand/');
 const controllers=new XRControllerModelFactory().setPath('./vendor/profiles/');
 const entries=[];let previousTime;
 for(let i=0;i<2;i++) {
  const hand=renderer.xr.getHand(i),grip=renderer.xr.getControllerGrip(i),controller=renderer.xr.getController(i);
  const handModel=factory.createHandModel(hand,'mesh'),controllerModel=controllers.createControllerModel(grip);
  hand.add(handModel);grip.add(controllerModel);scene.add(hand,grip,controller);
  const e={hand,grip,controller,handModel,controllerModel,position:new THREE.Vector3(),previous:new THREE.Vector3(),pinch:false,select:false,squeeze:false,active:false,speed:0,open:true};
  controller.addEventListener('connected',event=>e.source=event.data);
  controller.addEventListener('disconnected',()=>{e.source=null;e.select=e.squeeze=false;});
  for(const type of ['select','squeeze']) {
   controller.addEventListener(type+'start',()=>e[type]=true);
   controller.addEventListener(type+'end',()=>e[type]=false);
  }
  e.pulse=(strength=.23,ms=55)=>e.source?.gamepad?.hapticActuators?.[0]?.pulse(strength,ms)?.catch(()=>{});
  entries.push(e);
 }
 const thumb=new THREE.Vector3(),wrist=new THREE.Vector3(),tip=new THREE.Vector3();
 const pointer=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),new THREE.MeshStandardMaterial({color:0xc5b9a9,roughness:.7}));scene.add(pointer);
 const desktop={position:new THREE.Vector3(),previous:new THREE.Vector3(),pinch:false,open:true,speed:0,active:true};
 let handHeight=0;
 addEventListener('keydown',e=>{if(e.code==='ArrowDown'){handHeight=Math.max(-1.3,handHeight-.08);e.preventDefault();}if(e.code==='ArrowUp'){handHeight=Math.min(.4,handHeight+.08);e.preventDefault();}if(e.code==='KeyG'&&!e.repeat){desktop.nearest=true;}if(e.code==='KeyG'||e.code==='Space'){desktop.pinch=true;e.preventDefault();}});
 addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='KeyG')desktop.pinch=false;});
 let active=[];
 return {reset(){previousTime=undefined;handHeight=0;desktop.pinch=desktop.nearest=false;},hands:()=>active,update(t,dark=false) {
  const dt=previousTime===undefined?0:Math.min(.1,Math.max(.001,t-previousTime));previousTime=t;active=[];
  for(const e of entries) {
   const joints=e.hand.joints,joint=joints?.['index-finger-tip'];
   e.active=!!(e.source&&(e.source.hand?joint?.visible&&joints['thumb-tip']?.visible&&joints.wrist?.visible&&joints['middle-finger-tip']?.visible&&joints['middle-finger-metacarpal']?.visible&&joints['middle-finger-phalanx-proximal']?.visible:e.grip.visible));
   e.handModel.visible=!dark;e.controllerModel.visible=!dark;
   if(!e.active)continue;
   e.previous.copy(e.position);
   if(e.source.hand) {
    joint.getWorldPosition(e.position);e.hand.joints['thumb-tip'].getWorldPosition(thumb);
    e.pinch=e.position.distanceTo(thumb)<.028;
    e.hand.joints.wrist.getWorldPosition(wrist);e.hand.joints['middle-finger-tip'].getWorldPosition(tip);
    const palm=e.hand.joints['middle-finger-metacarpal'];
    const knuckle=e.hand.joints['middle-finger-phalanx-proximal'];
    knuckle.getWorldPosition(thumb);
    const span=Math.max(.05,thumb.distanceTo(wrist));
    const curled=tip.distanceTo(wrist)<span*1.2;
    e.open=!e.pinch&&!curled&&tip.distanceTo(wrist)>span*1.55;
    e.pinch=e.pinch||curled;
    e.palm??=new THREE.Vector3();palm.getWorldPosition(e.palm);e.palm.lerp(thumb,.65);
    if(curled)e.position.copy(e.palm);
   } else {e.palm=null;e.grip.getWorldPosition(e.position);e.pinch=!!(e.select||e.squeeze);e.open=!e.pinch;}
   e.speed=dt?e.position.distanceTo(e.previous)/dt:0;active.push(e);
  }
  pointer.visible=!renderer.xr.isPresenting&&!dark;
  if(!renderer.xr.isPresenting) {
   desktop.previous.copy(desktop.position);desktop.position.set(0,-.35,-.48).applyQuaternion(rotation).add(head);
   desktop.position.y=Math.max(.065,desktop.position.y+handHeight);
   desktop.speed=dt?desktop.position.distanceTo(desktop.previous)/dt:0;desktop.open=!desktop.pinch;pointer.position.copy(desktop.position);active=[desktop];
  }
 }};
}

let inputReady;
export function preloadInput(progress=()=>{}) {
 if(!inputReady)inputReady=(async()=>{
  THREE.Cache.enabled=true;
  const files=['generic-hand/left.glb','generic-hand/right.glb'];
  const r=await fetch('./vendor/profiles/profilesList.json');if(!r.ok)throw Error('Controllerprofielen ontbreken');
  const profiles=await r.json();
  for(const value of Object.values(profiles)) {
   const response=await fetch('./vendor/profiles/'+value.path);if(!response.ok)throw Error(value.path);
   const profile=await response.json(),folder=value.path.slice(0,value.path.lastIndexOf('/')+1);
   for(const layout of Object.values(profile.layouts))if(layout.assetPath)files.push(folder+layout.assetPath);
  }
  const unique=[...new Set(files)];let loaded=0;
  await Promise.all(unique.map(async file=>{await new THREE.FileLoader().setResponseType('arraybuffer').loadAsync('./vendor/profiles/'+file);progress(++loaded/unique.length*100);}));
 })().catch(e=>{inputReady=null;throw e;});
 return inputReady.then(()=>progress(100));
}
