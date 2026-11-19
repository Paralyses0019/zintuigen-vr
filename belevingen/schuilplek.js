import * as THREE from 'three';
import {smooth,random} from '../gedeeld/util.js';
import {atmosphere,particles,veil,rain,warmCore} from '../gedeeld/licht.js';
import {material,environment,box} from '../gedeeld/assets.js';

export function schuilplek({scene,assets,hands,audio}) {
 const group=new THREE.Group();
 const air=atmosphere(scene,group,{top:0x01030a,horizon:0x081627,density:.035});
 const sky=environment(scene,group,assets,{intensity:.16});
 const mud=material(assets,'brown_mud',{roughness:.24,metalness:.12,color:0x7c8794});
 const wood=material(assets,'rough_wood',{color:0x9e7954,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const iron=material(assets,'metal_plate',{metalness:.8,roughness:.5,color:0x37302a});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),mud);ground.rotation.x=-Math.PI/2;ground.position.y=0;group.add(ground);
 // Repeat by geometry UVs, so one texture set remains shared across all surfaces.
 ground.geometry.attributes.uv.array.forEach((v,i,a)=>a[i]=v*30);
 const rainUniforms=rain(group,air);
 const shelter=new THREE.Group();group.add(shelter);const pieces=[];
 for(const x of [-.78,.78])for(const z of [-.65,.7])pieces.push(box(shelter,wood,.09,2.35,.09,x,1.175,z));
 for(let i=0;i<10;i++) {
  pieces.push(box(shelter,wood,1.65,.14,.055,0,.18+i*.155,.76));
  for(const x of [-.8,.8])pieces.push(box(shelter,wood,.055,.14,1.6,x,.18+i*.155,-.05));
 }
 // A low pitched roof frames the cold opening directly ahead.
 for(const x of [-.45,.45]){const roof=box(shelter,wood,.96,.065,1.6,x,2.43,.05);roof.rotation.z=x<0?.2:-.2;pieces.push(roof);}
 const floor=box(shelter,wood,1.55,.04,1.55,0,-.02,-.05);pieces.unshift(floor);
 // One instanced draw for the complete timber structure, including its staged build.
 const structure=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),wood,pieces.length);
 structure.frustumCulled=false;
 for(const piece of pieces){const d=piece.geometry.parameters;piece.userData.dimensions=new THREE.Vector3(d.width,d.height,d.depth);piece.geometry.dispose();}
 shelter.clear();shelter.add(structure);
 const matrix=new THREE.Matrix4(),size=new THREE.Vector3();
 const lantern=new THREE.Group();lantern.position.set(.12,1.05,-.48);group.add(lantern);
 box(lantern,iron,.18,.035,.18,0,-.13,0);box(lantern,iron,.2,.04,.2,0,.15,0);
 for(const x of [-.075,.075])for(const z of [-.075,.075])box(lantern,iron,.012,.27,.012,x,0,z);
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.075,.008,5,18,Math.PI),iron);handle.position.y=.17;lantern.add(handle);
 const glow=new THREE.Group();glow.position.set(0,-.95,1.5);lantern.add(glow);const flame=warmCore(glow);
 // warmCore's local source is translated into the lantern glass; compact flame and halo.
 glow.scale.setScalar(.24);glow.position.set(0,-.228,.36);
 const light=new THREE.PointLight(0xff963d,0,4,2);lantern.add(light);
 const cold=new THREE.HemisphereLight(0x7b9ac9,0x080a10,.22);group.add(cold);
 const splashes=particles(group,air,180,{size:.025,color:0xa5c6df,seed:71});splashes.uniforms.uTwinkle.value=0;
 const rand=random(217),splashBase=Array.from({length:180},()=>[(rand()-.5)*8,(rand()-.5)*8,rand()]);
 const handDrops=particles(group,air,24,{size:.018,color:0xc1d8ff});handDrops.uniforms.uTwinkle.value=0;
 const dust=particles(group,air,110,{size:.015,bounds:[1.5,2.2,1.5],color:0xffc077});
 const clouds=veil(group,air,{width:70,height:18,color:0x0b1829,opacity:.3});clouds.position.set(0,9,-23);
 let holder=null,lastTap=-1;const lampWorld=new THREE.Vector3();
 return {group,update(t) {
  const grown=smooth(75,95,t),fade=1-smooth(140,155,t),wet=smooth(40,57,t);
  air.update(t,fade);sky.material.color.setScalar(.15*fade);scene.environmentIntensity=.16*fade;mud.color.setRGB(.2*fade,.25*fade,.3*fade);
  air.uniforms.uFlash.value=[48,61,71].reduce((v,at)=>v+Math.exp(-Math.pow((t-at)/.12,2)),0);
  pieces.forEach((p,i)=>{const build=smooth(75+i*.35,78+i*.35,t);size.copy(p.userData.dimensions);size.y*=Math.max(.00001,build);matrix.compose(p.position,p.quaternion,size);structure.setMatrixAt(i,matrix);});
  structure.visible=t>=75;structure.instanceMatrix.needsUpdate=true;
  lantern.visible=t>=75;flame.update(t,fade);glow.scale.y=.24*(1+.12*Math.sin(t*19)+.06*Math.sin(t*31));
  const hs=hands();if(holder&&(!hs.includes(holder)||!holder.pinch))holder=null;
  if(t>=75&&!holder)holder=hs.find(h=>h.pinch&&h.position.distanceTo(lantern.position)<.15)||null;
  if(holder)lantern.position.copy(holder.position).add(new THREE.Vector3(0,-.07,0));
  else {lantern.position.lerp(new THREE.Vector3(.12,1.05,-.48),.06);}
  lantern.getWorldPosition(lampWorld);let warmth=0;
  for(const h of hs)warmth=Math.max(warmth,1-smooth(.12,.5,h.position.distanceTo(lampWorld)));
  light.intensity=(t>=75?3.2:0)*fade*(1+.08*Math.sin(t*23)+.04*Math.sin(t*37));audio.warmth(lampWorld,warmth);
  rainUniforms.uOpacity.value=wet*.55;
  // Keep falling drops outside the completed roof (shader mask below is shared).
  rainUniforms.uShelter.value=grown;
  splashes.uniforms.uOpacity.value=wet*.7;
  for(let i=0;i<180;i++) {
   const [x,z,phase]=splashBase[i],age=(t*2+phase)%1,inside=Math.abs(x)<.85&&z>-.95&&z<.85;
   splashes.positions.set([x,inside&&grown>.5?-2:.012+Math.sin(age*Math.PI)*.07,z],i*3);
  }
  splashes.geometry.attributes.position.needsUpdate=true;
  handDrops.uniforms.uOpacity.value=wet;
  for(let i=0;i<24;i++) {
   const h=hs[i%Math.max(1,hs.length)],outside=h&&(grown<.8||Math.abs(h.position.x)>.72||h.position.z<-.75||h.position.z>.7);
   const age=(t*4+i*.17)%1;
   handDrops.positions.set(outside?[h.position.x+Math.sin(i*4)*age*.07,h.position.y+.025-age*.08,h.position.z+Math.cos(i*3)*age*.07]:[0,-5,0],i*3);
   if(outside&&wet>.1&&t-lastTap>.22){audio.tap(h.position,.045);lastTap=t;}
  }
  handDrops.geometry.attributes.position.needsUpdate=true;dust.uniforms.uOpacity.value=grown*.45;
  clouds.position.x=Math.sin(t*.02)*5;
  wood.color.setRGB(.65*fade,.45*fade,.27*fade);cold.intensity=.22*fade;
 }};
}
