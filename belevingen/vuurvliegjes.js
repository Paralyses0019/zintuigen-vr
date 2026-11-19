import * as THREE from 'three';
import {smooth} from '../gedeeld/util.js';
import {atmosphere,particles,veil} from '../gedeeld/licht.js';

export function vuurvliegjes({scene,mode,handPosition}) {
  const group=new THREE.Group(), ar=mode==='ar';
  const air=atmosphere(scene,group,{top:0x010608,horizon:0x182a2b,density:.04,ar});
  // A full surrounding layer avoids the old front-only passthrough rectangle.
  const shade=new THREE.Mesh(new THREE.SphereGeometry(20,24,12),new THREE.MeshBasicMaterial({
    color:0,side:THREE.BackSide,transparent:true,opacity:0,depthWrite:false,fog:false
  }));
  shade.renderOrder=-10;group.add(shade);
  if(!ar) {
    const ground=veil(group,air,{width:80,height:80,color:0x273b38,opacity:.45,noiseScale:9});
    ground.rotation.x=-Math.PI/2;ground.position.y=-.02;
    for(let i=0;i<3;i++) {
      const mist=veil(group,air,{width:25,height:5,color:0x3a5551,opacity:.1});
      mist.position.set(0,1,-7-i*5);
    }
  }
  const flies=particles(group,air,100,{size:.16,bounds:[11,3.5,11],color:0xffc373,seed:83});
  const landed=particles(group,air,1,{size:.14,color:0xffdb94});
  landed.uniforms.uTwinkle.value=.35;
  return {group,update(t) {
    const depart=smooth(130,150,t),near=smooth(80,88,t)*(1-depart);
    // Both the tint and the insects disappear, revealing unmodified passthrough.
    air.update(t,1-depart);
    shade.material.opacity=smooth(0,30,t)*.2*(1-depart);
    flies.uniforms.uOpacity.value=smooth(30,65,t)*(1-depart);
    landed.uniforms.uOpacity.value=t>=80?(1-depart):0;
    const hand=handPosition();
    landed.positions.set([hand.x,hand.y+.025,hand.z]);landed.geometry.attributes.position.needsUpdate=true;
    for(let i=0;i<100;i++) {
      const p=i*3,ph=flies.phases[i],r=.25+(i%9)*.105;
      // Nested sine fields have smooth velocity changes and no straight-line flight.
      const a=t*.22+ph+.28*Math.sin(t*.31+ph*2);
      const farX=flies.base[p]+.55*Math.sin(t*.19+ph)+.2*Math.sin(t*.43+ph*2);
      const farY=.35+flies.base[p+1]+.25*Math.sin(t*.23+ph*3)+.12*Math.sin(t*.51+ph);
      const farZ=flies.base[p+2]+.45*Math.cos(t*.17+ph)+.22*Math.sin(t*.39+ph*3);
      flies.positions[p]=THREE.MathUtils.lerp(farX,hand.x+Math.cos(a)*r,near);
      flies.positions[p+1]=THREE.MathUtils.lerp(farY,hand.y+.45*Math.sin(ph*2+t*.29)+.08*Math.sin(a*3),near);
      flies.positions[p+2]=THREE.MathUtils.lerp(farZ,hand.z+Math.sin(a)*r,near);
    }
    flies.geometry.attributes.position.needsUpdate=true;
  }};
}
