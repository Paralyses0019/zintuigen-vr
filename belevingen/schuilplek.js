import * as THREE from 'three';
import {smooth} from '../gedeeld/util.js';
import {atmosphere, particles, veil, dome, rain, warmCore} from '../gedeeld/licht.js';

export function schuilplek({scene}) {
  const group=new THREE.Group();
  const air=atmosphere(scene,group,{top:0x01030a,horizon:0x0b1b32,density:.035});
  const ground=veil(group,air,{width:110,height:110,color:0x08121e,opacity:.65,noiseScale:12});
  ground.rotation.x=-Math.PI/2;ground.position.y=-.025;
  const rainUniforms=rain(group,air);
  const shelter=dome(group,air);shelter.position.set(0,0,-.35);
  const pool=veil(group,air,{width:4.8,height:4.8,color:0xffa44c,opacity:0,additive:true});
  pool.rotation.x=-Math.PI/2;pool.position.set(0,.008,-.5);
  const fire=warmCore(group);
  // Local amber haze only inside the shelter; global fog stays cold.
  const innerMist=veil(group,air,{width:3.8,height:1.8,color:0xffa44c,opacity:0,additive:true});
  innerMist.position.set(0,.95,-2.1);
  const dust=particles(group,air,280,{size:.035,bounds:[4.5,2.6,4.5],color:0xffcd8c});
  const mist=[];
  for(let i=0;i<3;i++) {
    const layer=veil(group,air,{width:32,height:5,color:0x17314e,opacity:.12});
    layer.position.set((i-1)*4,1.5+i*.8,-8-i*6);mist.push(layer);
  }
  return {group,update(t) {
    const grown=smooth(75,95,t), fade=1-smooth(140,155,t);
    air.update(t,fade);
    air.uniforms.uFlash.value=[48,61,71].reduce((v,at)=>v+Math.exp(-Math.pow((t-at)/.12,2))*.8+Math.exp(-Math.pow((t-at-.3)/.07,2))*.3,0);
    shelter.scale.set(2.9*(.04+.96*grown),2.65*(.04+.96*grown),3.1*(.04+.96*grown));
    shelter.material.uniforms.uOpacity.value=grown*.65;
    pool.material.uniforms.uOpacity.value=grown*.13;
    fire.update(t,fade);
    innerMist.material.uniforms.uOpacity.value=grown*.035;
    rainUniforms.uOpacity.value=smooth(40,57,t)*(.42-.28*grown);
    dust.uniforms.uOpacity.value=grown*.7;
    for(let i=0;i<dust.phases.length;i++) {
      const p=i*3,ph=dust.phases[i];
      dust.positions[p]=dust.base[p]+.12*Math.sin(t*.18+ph)+.05*Math.sin(t*.47+ph*2);
      dust.positions[p+1]=dust.base[p+1]+.1*Math.sin(t*.13+ph*3);
      dust.positions[p+2]=dust.base[p+2]+.12*Math.cos(t*.15+ph);
    }
    dust.geometry.attributes.position.needsUpdate=true;
    mist.forEach((m,i)=>m.position.x=(i-1)*4+Math.sin(t*.025+i)*2);
  }};
}
