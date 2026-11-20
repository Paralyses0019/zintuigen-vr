import * as THREE from 'three';
import {smooth,plane} from '../gedeeld/util.js';
import {material,environment,box} from '../gedeeld/assets.js';
import {atmosphere,veil} from '../gedeeld/licht.js';

import {interactions} from '../gedeeld/interactie.js';
import {plankStad,plankStadsGeluid} from '../gedeeld/plank-stad.js';

export function plank({scene,headPosition,audio,assets,hands,requestPeak}) {
  const group=new THREE.Group();
  const air=atmosphere(scene,group,{top:0x000107,horizon:0x09172e,density:.0028});
  environment(scene,group,assets,{sky:false,intensity:.4});
  // Keep the ground-bearing panorama out of the background. A warm, low horizon
  // sits beneath the blue night; the same fog hides the camera's 1 km far clip.
  const sky=group.children.find(o=>o.renderOrder===-20);
  sky.material.fragmentShader=sky.material.fragmentShader.replace(
    'c+=uFlash', 'c+=vec3(.027,.009,.002)*exp(-pow((d.y+.07)*13.,2.)); c+=uFlash');
  const district=new THREE.Group();district.name='stad';group.add(district);
  const street=new THREE.MeshStandardMaterial({color:0x26303b,roughness:.8});
  box(district,street,26,.12,60,0,-330,-12);
  const walkers=new THREE.InstancedMesh(new THREE.SphereGeometry(.1,5,4),new THREE.MeshBasicMaterial({color:0xe5ac73}),28);
  district.add(walkers);const person=new THREE.Object3D();
  const city=plankStad(district,air),citySound=plankStadsGeluid(audio);
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
  const glass=new THREE.MeshStandardMaterial({color:0xa9cbd7,transparent:true,opacity:.13,
    metalness:.55,roughness:.14,side:THREE.DoubleSide,depthWrite:false});
  surfaces.forEach(({mesh})=>{mesh.material.dispose();mesh.material=glass;});
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
  const controlMat=new THREE.MeshStandardMaterial({color:0x72aab7});
  const button=box(group,controlMat,.11,.15,.04,.34,1.13,-.47);
  // Illuminated door-open pictogram on the fixed call button.
  for(const side of [-1,1]){
    const arrow=new THREE.Mesh(new THREE.CircleGeometry(.017,3),new THREE.MeshBasicMaterial({color:0xc4f5ff}));
    arrow.rotation.z=side<0?Math.PI:0;arrow.position.set(side*.021,0,.021);button.add(arrow);
  }
  const pedestal=box(group,steel,.035,1.05,.04,.34,.54,-.47);
  const grabs=interactions(hands,audio);
  const nutMat=steel.clone();nut.material=nutMat;
  const origin=nut.position.clone();
  // A fall lasts almost eight seconds, so the replacement can already be in flight.
  const falls=Array.from({length:2},()=>{
    const mesh=nut.clone();group.add(mesh);mesh.visible=false;
    return {mesh,release:new THREE.Vector3(),start:-Infinity,sound:null};
  });
  let now=0,dropAt=-Infinity,beamAt=-Infinity,leaning=false,nextGust=32,side=1,previous=null;
  let nudged=false,baseline=null,lastWarning=-10;
  const nutTarget=grabs.add(nut,nutMat,{onRelease(){
    const fall=falls.reduce((a,b)=>a.start<b.start?a:b);
    fall.release.copy(nut.position);fall.start=dropAt=now;fall.sound=audio.dropStart(fall.release);
  }});
  const door=grabs.add(button,controlMat,{fixed:true,onGrab(){nudged=true;}});
  return {group,update(t) {
    now=t;const dt=previous===null?0:Math.min(.08,t-previous);
    const fade=1-smooth(80,90,t);air.update(t,fade);city.update(t);citySound.update(t);scene.environmentIntensity=.4*fade;
    district.position.y=330*(1-smooth(2,18,t));
    for(let i=0;i<walkers.count;i++){
      person.position.set((i%2?1:-1)*(2+i%3*.37),-328.5,5-(i*1.7+t*.45)%25);
      person.updateMatrix();walkers.setMatrixAt(i,person.matrix);
    }
    walkers.instanceMatrix.needsUpdate=true;
    if(previous!==null&&previous<2&&t>=2)hands().forEach(h=>h.pulse?.(.22,95));
    if((previous===null||previous<23)&&t>=23)hands().forEach(h=>h.pulse?.(.5,85));
    previous=t;
    const open=smooth(23,25,t)*(1-smooth(80,87,t));
    const reach=1.2+3.2*smooth(23,26,t)*(1-smooth(80,87,t));
    left.position.x=-.5-open;right.position.x=.5+open;
    floorLeft.position.x=-.6-open*1.8;floorRight.position.x=.6+open*1.8;floorBack.position.z=.6+open*1.8;
    threshold.visible=open<.15;door.enabled=t<23;
    button.position.x=pedestal.position.x=.34+open*1.8;
    button.visible=pedestal.visible=open<.98;
    const head=headPosition();
    if(!baseline)baseline=head.clone();else if(t<23)baseline.copy(head);
    const lean=Math.hypot(head.x-baseline.x,Math.min(0,head.z-baseline.z));
    if(open>.9&&lean>.15&&!leaning){
      leaning=true;beamAt=t;hands().forEach(h=>h.pulse?.(.12,35));audio.burst(0,0,-.25,.42,.22,440,{endFrequency:120});
    }
    if(lean<.12)leaning=false;
    if(open>.95&&Math.abs(head.x-baseline.x)>.25&&t-lastWarning>5){
      audio.burst(head.x,.1,head.z,.55,.14,540,{endFrequency:95});lastWarning=t;
    }
    const age=t-beamAt;
    const sag=age<1?.026*Math.sin(Math.PI*age)**2:0;
    // De balk schuift pas uit de lift als de deur opengaat, als een loopplank.
    board.scale.z=reach/4.4;board.position.z=.2-reach/2;
    board.position.y=-.06-sag;edges.forEach(e=>{e.visible=open>.1;e.position.y=.003-sag;e.scale.y=reach/4.4;e.position.z=.2-reach/2;});
    if(t>=nextGust&&t<80){
      audio.burst(side*2,1.5,-.2,1.9,.32,480,{attack:.6,endFrequency:1700});
      hands().forEach(h=>h.pulse?.(.18,80));side*=-1;nextGust=t+8+Math.random()*4;
    }
    const elapsed=t-dropAt;
    for(const fall of falls){
      const age=t-fall.start,mesh=fall.mesh;
      mesh.visible=age<Math.sqrt(2*(300+fall.release.y)/9.81)&&t<80;
      if(mesh.visible){
        mesh.position.copy(fall.release);mesh.position.y-=4.905*age*age;
        mesh.position.x+=age*.17;mesh.rotation.z=age*4;audio.dropMove(mesh.position,age,fall.sound);
      }else if(fall.sound){if(fall.sound.sound.isPlaying)fall.sound.sound.stop();fall.sound=null;}
    }
    nut.visible=nutTarget.enabled=t>=23&&t<80&&elapsed>=5;
    if(!nutTarget.holder)nut.position.copy(origin).y-=sag;
    const wasTouching=nutTarget.touch;
    grabs.update(dt);
    if(nutTarget.enabled&&nutTarget.touch&&!wasTouching&&!nutTarget.holder)nutTarget.onRelease();
    if(t>=18&&t<23&&!door.near)controlMat.emissive.setHex(0x59a4bf);
    if(t>=20&&t<23&&(nudged||door.touch))requestPeak();
    const ascent=smooth(2,4,t)*(1-smooth(16,18,t));
    strips.forEach((s,i)=>{
      s.position.y=((i*.43-t*(t<80?1.3:-.85))%4+4)%4-.5;
      s.material.uniforms.uOpacity.value=.12+.65*(ascent+smooth(80,87,t))*(.9+.1*Math.sin(t*.8));
    });
    surfaces.forEach(({mesh,color})=>{if(mesh.material!==glass)mesh.material.color.copy(color).multiplyScalar(fade);});
    steel.color.setRGB(.17*fade,.2*fade,.24*fade);wood.color.setRGB(.6*fade,.45*fade,.3*fade);ceilingLight.intensity=6*fade;
  }};
}
