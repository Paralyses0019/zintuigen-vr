import assert from 'node:assert/strict';
import * as THREE from 'three';
import {schuilplek} from '../belevingen/schuilplek.js';
import {plank} from '../belevingen/plank.js';
import {vuurvliegjes} from '../belevingen/vuurvliegjes.js';
import {donker} from '../belevingen/donker.js';
import {Timeline} from '../timeline.js';
import {dispose} from '../gedeeld/util.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const textures={};for(const name of ['brown_mud','rough_wood','metal_plate'])textures[name]={color:new THREE.Texture(),normal:new THREE.Texture(),roughness:new THREE.Texture()};
const assets={textures,sky:new THREE.Texture(),environment:new THREE.Texture()};
const hand={position:new THREE.Vector3(),pinch:false,speed:0,open:true};
for(const create of [schuilplek,plank,vuurvliegjes,donker])for(const mode of ['desktop','ar']) {
 hand.position.set(0,1.2,-.45);hand.pinch=false;
 const scene=new THREE.Scene();let drops=0,reaches=0;
 const audio={warmth(){},tap(){},fall(){},dropStart(){drops++;},dropMove(){},dropLand(){},reach(){reaches++;}};
 const world=create({scene,assets,mode,hands:()=>[hand],handPosition:()=>hand.position,headPosition:()=>new THREE.Vector3(0,1.65,0),audio});scene.add(world.group);
 for(const t of [0,20,40,59.99,60,64,74.99,75,80,90,92,95,130,140,149.9,154.9]) {
  world.update(t);scene.updateMatrixWorld(true);
  world.group.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.geometry?.attributes.position)assert(o.geometry.attributes.position.array.every(Number.isFinite));});
 }
 if(create===plank){
  world.update(70);const beam=world.group.children.find(o=>o.geometry?.parameters?.width===.4&&o.geometry?.parameters?.depth===4.4);
  assert.equal(beam.position.y+.06,0);assert.equal(beam.geometry.parameters.width,.4);
  const panels=world.group.children.filter(o=>o.geometry?.parameters?.width===.8&&o.geometry?.parameters?.depth===2);assert(panels.every(o=>Math.abs(o.position.x)>2));
  hand.position.set(0,.065,-.42);world.update(70.1);assert.equal(drops,1);for(let t=70.2;t<76;t+=.05)world.update(t);
 }
 if(create===schuilplek){
  hand.position.set(.12,1.05,-.48);hand.pinch=true;world.update(100);
  hand.position.set(.3,1.3,-.5);world.update(100.02);
  const lamp=world.group.children.find(o=>o.isGroup&&o.children.some(c=>c.isPointLight));
  assert(lamp);assert(lamp.position.distanceTo(new THREE.Vector3(.3,1.23,-.5))<.001);
  hand.pinch=false;world.update(100.04);assert(lamp.position.y<1.23);
 }
 if(create===vuurvliegjes){
  hand.position.set(.1,1.2,-.4);hand.pinch=false;world.update(100);hand.pinch=true;world.update(100.02);
  const light=world.group.children.find(o=>o.isPointLight);assert(light.intensity>.4);
  hand.pinch=false;world.update(100.04);assert(light.intensity<.2);
 }
 if(create===donker)assert(reaches>0);
 let draws=0;world.group.traverse(o=>{if(o.isMesh||o.isPoints||o.isLineSegments)draws++;});
 console.log(create.name,mode,'finite transforms, geometry; objects',draws);dispose(world.group);
}
for(const peak of [60,75,80,90,92]){let count=0;const t=new Timeline(peak);t.at(peak,()=>count++);t.update();t.update();assert.equal(count,1);}
console.log('Timeline peak cues run exactly once, including ?t=peak.');

