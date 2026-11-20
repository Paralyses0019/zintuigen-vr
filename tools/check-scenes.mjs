import assert from 'node:assert/strict';
import * as THREE from 'three';
import {schuilplek} from '../belevingen/schuilplek.js';
import {plank} from '../belevingen/plank.js';
import {vuurvliegjes} from '../belevingen/vuurvliegjes.js';
import {donker} from '../belevingen/donker.js';
import {Timeline} from '../timeline.js';
import {interactions} from '../gedeeld/interactie.js';
import {input} from '../gedeeld/input.js';
import {dispose} from '../gedeeld/util.js';

globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const textures={};
for(const name of ['brown_mud','rough_wood','metal_plate','rough_linen','fabric_pattern_05'])
  textures[name]={color:new THREE.Texture(),normal:new THREE.Texture(),roughness:new THREE.Texture()};
const assets={textures,sky:new THREE.Texture(),environment:new THREE.Texture()};
for(const [create,peak,end] of [[plank,23,90],[schuilplek,40,90],[vuurvliegjes,45,90],[donker,45,80]]){
  for(const mode of ['desktop','ar'])for(const active of [false,true]){
    let triggered=null,shift=0,rings=0,drops=0,pulses=0;
    const scene=new THREE.Scene(),head=new THREE.Vector3(0,1.65,0),forward=new THREE.Vector3(0,0,-1);
    const h={position:new THREE.Vector3(1,.6,0),open:false,pinch:false,speed:0,pulse(){pulses++;}};
    const audio={tap(){},tone(){rings++;},burst(){},recording(){},darkBuzz(){},warmth(){},moveSwarm(){},dropStart(){drops++;},dropMove(){}};
    let elapsed=0;
    const world=create({scene,assets,hands:()=>[h],headPosition:()=>head,forward,mode,
      handPosition:()=>h.position,audio,requestPeak(){assert.equal(triggered,null);triggered=elapsed;shift=peak-elapsed;}});
    scene.add(world.group);
    let bent=false,caught=false,released=false,held=false,grounded=false,roof=false,hidden=false,peripheral=false;
    for(let frame=0;frame<=90*30;frame++){
      elapsed=frame/30;const t=elapsed+shift;if(t>=end)break;
      if(create===plank){
        if(active&&elapsed>=20&&elapsed<20.5)h.position.set(.34,1.13,-.47);
        if(t>26)head.x=.18;
        if(t>27&&t<28){h.position.set(0,.065,-.42);h.pinch=true;}
        if(t>=28){h.position.y=1.1;h.pinch=t<29;}
      }
      if(create===schuilplek){
        if(active&&elapsed>=26&&elapsed<26.5){h.position.set(0,.36,-.45);h.pinch=true;}
        if(active&&elapsed>=26.5){h.position.set(.27,1.26,-.48);h.pinch=elapsed<28;}
      }
      if(create===vuurvliegjes){h.open=active&&elapsed>28;h.pinch=t>=49&&t<50;h.open&&=!h.pinch;}
      if(create===donker&&active&&elapsed>=40){h.position.copy(head);h.speed=.2;}
      world.update(t);
      if(create===plank){
        const beam=world.group.children.find(o=>o.geometry?.parameters?.depth===4.4);
        bent||=beam.position.y<-.079;
        if(t>18)assert.equal(world.group.getObjectByName('stad').position.y,0);
      }
      if(create===schuilplek){
        const lamp=world.group.getObjectByName('lantaarn');
        held||=lamp.position.y>1;grounded||=held&&lamp.position.y===.15;
        if(t>51)roof=lamp.children.find(o=>o.isPointLight).intensity>0||roof;
      }
      if(create===vuurvliegjes){
        assert(world.group.children.some(o=>o.geometry?.attributes.position.count===216));
        const intensity=world.group.children.find(o=>o.isPointLight).intensity;
        caught||=t>=49&&intensity>.5;released||=caught&&t>50&&intensity<.2;
      }
      if(create===donker){
        const mesh=world.group.children[0];
        if(t>4&&t<6)forward.copy(mesh.position).sub(head).add(new THREE.Vector3(0,.45,0)).normalize();
        if(t>6&&t<8)forward.copy(head).sub(mesh.position).normalize();
        hidden||=t>5&&t<6&&mesh.material.uniforms.alpha.value===0;
        peripheral||=t>7&&t<8&&mesh.material.uniforms.alpha.value>.25;
      }
      if(frame%90===0){
        scene.updateMatrixWorld(true);
        world.group.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));
          if(o.geometry?.attributes.position)assert(o.geometry.attributes.position.array.every(Number.isFinite));});
      }
    }
    assert.equal(triggered!==null,active);assert(elapsed>=75&&elapsed<=100);
    if(active)assert(triggered>=20&&triggered<=45);
    if(create===plank){assert(bent);assert.equal(drops,1);}
    if(create===schuilplek){assert(roof);if(active)assert(held&&grounded);}
    if(create===vuurvliegjes){assert(caught&&released&&rings&&pulses);}
    if(create===donker)assert(hidden&&peripheral);
    dispose(world.group);
    console.log(create.name,mode,active?'actie':'vangnet','piek',triggered??peak,'einde',elapsed);
  }
}
for(const peak of [23,40,45]){
  let calls=0;const timeline=new Timeline(peak);timeline.at(peak,()=>calls++);
  timeline.update();timeline.trigger(peak);timeline.update();assert.equal(calls,1);
  const later=new Timeline(peak+1);later.at(peak,()=>calls++);later.update();assert.equal(calls,1);
  const early=new Timeline(20);early.at(peak,()=>calls++);early.update();early.trigger(peak);early.trigger(peak);assert.equal(calls,2);
}
// Exercise the production input adapter with XR joint poses, button events and desktop keys.
const keys={};globalThis.addEventListener=(name,fn)=>keys[name]=fn;
const parts=()=>[new THREE.Group(),new THREE.Group()];
const hands=parts(),grips=parts(),controls=parts();
const xr={isPresenting:true,getHand:i=>hands[i],getControllerGrip:i=>grips[i],getController:i=>controls[i]};
const scene=new THREE.Scene(),reader=input({xr},scene,new THREE.Vector3(),new THREE.Quaternion());
const controller=controls[0],connect=data=>controller.dispatchEvent({type:'connected',data});
connect({});controller.dispatchEvent({type:'selectstart'});reader.update(1);assert(reader.hands()[0].pinch);
controller.dispatchEvent({type:'squeezestart'});controller.dispatchEvent({type:'selectend'});reader.update(2);assert(reader.hands()[0].pinch);
controller.dispatchEvent({type:'squeezeend'});reader.update(3);assert(reader.hands()[0].open);
connect({hand:true});const joints=hands[0].joints={};
for(const [name,z] of Object.entries({'index-finger-tip':.16,'thumb-tip':.15,wrist:0,'middle-finger-tip':.17,'middle-finger-metacarpal':.03,'middle-finger-phalanx-proximal':.08})){
  joints[name]=new THREE.Group();joints[name].position.z=z;
}
reader.update(4);assert(reader.hands()[0].pinch);
joints['thumb-tip'].position.x=.1;joints['middle-finger-tip'].position.z=.065;reader.update(5);assert(reader.hands()[0].pinch);
joints['middle-finger-tip'].position.z=.17;reader.update(6);assert(reader.hands()[0].open);
xr.isPresenting=false;keys.keydown({code:'KeyG',preventDefault(){}});reader.update(7);
const grabs=interactions(reader.hands,{tap(){}}),object=new THREE.Group(),mat=new THREE.MeshStandardMaterial();
const a=grabs.add(object,mat);grabs.update(.02);assert.equal(a.holder,reader.hands()[0]);
keys.keyup({code:'KeyG'});reader.update(8);grabs.update(.02);assert.equal(a.holder,null);
console.log('Invoer, gelijktijdige knoppen, desktop G en piekcues OK.');


const testHand={position:new THREE.Vector3(),pinch:true};
let ticks=0;
const distances=interactions(()=>[testHand],{tap(){ticks++;}});
const target=distances.add(new THREE.Group(),new THREE.MeshStandardMaterial());
testHand.position.x=.301;distances.update(0);assert.equal(ticks,0);
testHand.position.x=.3;distances.update(0);assert.equal(ticks,1);assert(target.near);
testHand.position.x=.201;distances.update(0);assert.equal(target.holder,null);
testHand.position.x=.2;distances.update(0);assert.equal(target.holder,testHand);
console.log('Nadering 30 cm en pakgrens 20 cm OK.');
