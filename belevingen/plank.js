import * as THREE from 'three';
import {smooth,plane} from '../gedeeld/util.js';
import {material,environment,box} from '../gedeeld/assets.js';
import {atmosphere,veil} from '../gedeeld/licht.js';

import {plankStad,plankStadsGeluid} from '../gedeeld/plank-stad.js';

export function plank({scene,headPosition,audio,assets,hands}) {
  const group=new THREE.Group();
  const air=atmosphere(scene,group,{top:0x000107,horizon:0x09172e,density:.0028});
  environment(scene,group,assets,{sky:false,intensity:.4});
  // Keep the ground-bearing panorama out of the background. A warm, low horizon
  // sits beneath the blue night; the same fog hides the camera's 1 km far clip.
  const sky=group.children.find(o=>o.renderOrder===-20);
  sky.material.fragmentShader=sky.material.fragmentShader.replace(
    'c+=uFlash', 'c+=vec3(.027,.009,.002)*exp(-pow((d.y+.07)*13.,2.)); c+=uFlash');
  const city=plankStad(group,air),citySound=plankStadsGeluid(audio);
  const steel=material(assets,'metal_plate',{metalness:.85,roughness:.62,color:0x71808e,side:THREE.DoubleSide});
  const wood=material(assets,'rough_wood',{color:0xa59073,side:THREE.DoubleSide});
  group.add(new THREE.HemisphereLight(0x8db2dc,0x101827,.6));
  const ceilingLight=new THREE.PointLight(0xb6d5ed,6,5);ceilingLight.position.set(0,2.6,0);group.add(ceilingLight);
  const surfaces=[];
  function panel(w,h,color,x,y,z,ry=0) {
    const p=plane(group,w,h,color,x,y,z,ry);surfaces.push({mesh:p,color:p.material.color.clone()});return p;
  }
  const floorLeft=box(group,steel,.8,.08,2,-.6,-.04,0);
  const floorRight=box(group,steel,.8,.08,2,.6,-.04,0);
  const floorBack=box(group,steel,.4,.08,.8,0,-.04,.6);
  panel(2,3,0x04070c,-1,1.5,0,Math.PI/2);
  panel(2,3,0x04070c,1,1.5,0,Math.PI/2);
  panel(2,3,0x030509,0,1.5,1,Math.PI);
  const ceiling=panel(2,2,0x020408,0,3,0);ceiling.rotation.x=Math.PI/2;
  const left=panel(1,3,0x080d15,-.5,1.5,-1),right=panel(1,3,0x080d15,.5,1.5,-1);
  const board=box(group,wood,.4,.12,4.4,0,-.06,-2);
  // Lift wall surfaces use the same photographed brushed metal set.
  surfaces.forEach(({mesh})=>{mesh.material.dispose();mesh.material=steel;});
  const edges=[];
  for(const x of [-.198,.198]) {
    const edge=panel(.008,4.4,0xffdbaa,x,.003,-2);edge.rotation.x=-Math.PI/2;edges.push(edge);
  }
  const strips=[];
  for(let i=0;i<16;i++) {
    const strip=veil(group,air,{width:.055,height:1.35,color:0x9ccce2,opacity:.5,additive:true});
    strip.rotation.y=Math.PI/2;strip.position.set(i%2?-.992:.992,(i%4)*.8,-.7+Math.floor(i/4)*.44);strips.push(strip);
  }
  // Four constant corner LEDs stay readable from the desktop start direction too.
  for(const x of [-.985,.985]) for(const z of [-.98,.98]) {
    panel(.012,2.95,0x91badb,x,1.5,z);
    const seam=veil(group,air,{width:.11,height:2.98,color:0x659ed0,opacity:.18,additive:true});
    seam.position.set(x,1.5,z+.001);
  }
  const threshold=panel(1.96,.012,0xb7dbeb,0,.004,-.97);threshold.rotation.x=-Math.PI/2;
  // Loose nut rests on the beam, 42 cm ahead: reach down without walking forward.

  const nut=new THREE.Mesh(new THREE.TorusGeometry(.045,.016,6,6),steel);nut.rotation.x=Math.PI/2;nut.position.set(0,.065,-.42);group.add(nut);
  let holder=null,droppedAt=null,lastTime=null,lastWarning=-10;
  const release=new THREE.Vector3(),velocity=new THREE.Vector3(),origin=new THREE.Vector3(0,.065,-.42);
  return {group,update(t) {
    const fade=1-smooth(136,150,t);air.update(t,fade);city.update(t);citySound.update(t);scene.environmentIntensity=.4*fade;
    const open=smooth(60,64,t)*(1-smooth(130,136,t));
    left.position.x=-.5-open;right.position.x=.5+open;
    floorLeft.position.x=-.6-open*1.8;floorRight.position.x=.6+open*1.8;floorBack.position.z=.6+open*1.8;
    threshold.visible=open<.15;
    const head=headPosition();
    if(open>.95&&Math.abs(head.x)>.25&&head.z<.2&&t-lastWarning>5){audio.fall();lastWarning=t;}
    board.visible=true;edges.forEach(e=>e.visible=t>=60);nut.visible=t>=60&&t<130;
    const dt=lastTime===null?0:Math.min(.05,Math.max(0,t-lastTime));lastTime=t;
    const hs=hands();
    if(t>=60&&t<130) {
      if(holder) {
        if(hs.includes(holder)&&holder.pinch){nut.position.copy(holder.position);velocity.set(.15,0,-.1);}
        else {holder=null;droppedAt=t;release.copy(nut.position);audio.dropStart(nut.position);if(audio.falling)audio.falling.sound.setRefDistance(18);}
      } else if(droppedAt===null) {
        const h=hs.find(h=>h.position.distanceTo(nut.position)<.13);
        if(h){if(h.pinch)holder=h;else{droppedAt=t;velocity.set(.35,0,-.4);release.copy(nut.position);audio.dropStart(nut.position);if(audio.falling)audio.falling.sound.setRefDistance(18);}}
      }
      if(droppedAt!==null) {
        const elapsed=t-droppedAt;
        nut.position.copy(release).addScaledVector(velocity,elapsed);
        nut.position.y-=4.905*elapsed*elapsed;nut.rotation.z+=dt*6;
        audio.dropMove(nut.position,elapsed);
        // No old-ground impact: vanish at 300 m, then offer the next nut.
        if(nut.position.y<=-300){
          if(audio.falling?.sound.isPlaying)audio.falling.sound.stop();
          audio.falling=null;nut.position.copy(origin);droppedAt=null;velocity.set(0,0,0);
        }
      }
    }
    if(t>=130&&audio.falling){if(audio.falling.sound.isPlaying)audio.falling.sound.stop();audio.falling=null;}
    const ascent=smooth(20,28,t)*(1-smooth(58,60,t));
    strips.forEach((s,i)=>{
      s.position.y=((i*.43-t*(t<130?1.3:-.85))%4+4)%4-.5;
      s.material.uniforms.uOpacity.value=.12+.65*(ascent+smooth(130,138,t))*(.9+.1*Math.sin(t*.8));
    });
    surfaces.forEach(({mesh,color})=>{if(mesh.material!==steel)mesh.material.color.copy(color).multiplyScalar(fade);});
    steel.color.setRGB(.17*fade,.2*fade,.24*fade);wood.color.setRGB(.6*fade,.45*fade,.3*fade);ceilingLight.intensity=6*fade;
  }};
}
