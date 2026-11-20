import * as THREE from 'three';
import {preloadInput} from './input.js';
import {RGBELoader} from '../vendor/loaders/RGBELoader.js';

export const packs=[
 {materials:['rough_wood','metal_plate'],sky:'rogland_moonlit_night',sounds:['wind','wind-bed','door']},
 {materials:['brown_mud','rough_linen','fabric_pattern_05','metal_plate'],sky:'approaching_storm',sounds:['rain','rain-bed','wind','fire','drop','roof','thunder']},
 {materials:[],sky:'rogland_moonlit_night',sounds:['crickets','crickets-bed','wind']},
 {materials:[],sounds:['drop','steps','door','wind','wind-bed']}
];
export async function loadAssets(id,renderer,progress) {
 await preloadInput(n=>progress(n*.2));
 const pack=packs[id],textures={},audio={},owned=[];let completed=0;
 const total=pack.materials.length*3+(pack.sky?2:0)+pack.sounds.length;
 const done=()=>progress(20+ ++completed/total*80);
 const texture=async(path,hdr=false)=>{const t=await (hdr?new RGBELoader():new THREE.TextureLoader()).loadAsync(path);t.userData.shared=true;owned.push(t);done();return t;};
 for(const name of pack.materials) {
  textures[name]={};
  await Promise.all(['color','normal','roughness'].map(async key=>{
   const t=await texture(`assets/${name}/${key}.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   if(key==='color')t.colorSpace=THREE.SRGBColorSpace;textures[name][key]=t;
  }));
 }
 let sky,environment,pmrem;
 if(pack.sky) {
  sky=await texture(`assets/${pack.sky}/sky.jpg`);sky.colorSpace=THREE.SRGBColorSpace;sky.mapping=THREE.EquirectangularReflectionMapping;
  const hdr=await texture(`assets/${pack.sky}/environment.hdr`,true);hdr.mapping=THREE.EquirectangularReflectionMapping;
  const gen=new THREE.PMREMGenerator(renderer);pmrem=gen.fromEquirectangular(hdr);environment=pmrem.texture;gen.dispose();
 }
 await Promise.all(pack.sounds.map(async name=>{const r=await fetch(`assets/audio/${name}.ogg`);if(!r.ok)throw Error(name+' HTTP '+r.status);audio[name]=await r.arrayBuffer();done();}));
 return {textures,audio,sky,environment,dispose(){owned.forEach(t=>t.dispose());pmrem?.dispose();}};
}
export function material(assets,name,options={}) {
 const m=assets.textures[name];return new THREE.MeshStandardMaterial({map:m.color,normalMap:m.normal,roughnessMap:m.roughness,roughness:1,...options});
}
export function environment(scene,group,assets,{sky=true,intensity=.25}={}) {
 scene.environment=assets.environment||null;scene.environmentIntensity=intensity;
 if(sky&&assets.sky) {
  // Replace only the procedural sky, retain its fog and shared particle uniforms.
  const old=group.children.find(o=>o.renderOrder===-20);if(old)old.visible=false;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(440,32,16),new THREE.MeshBasicMaterial({map:assets.sky,side:THREE.BackSide,color:0x485b75,fog:false,depthWrite:false}));
  dome.renderOrder=-21;group.add(dome);return dome;
 }
 return null;
}
export function box(group,material,w,h,d,x,y,z) {
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
