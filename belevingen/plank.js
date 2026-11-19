import * as THREE from 'three';
import {smooth,plane,random} from '../gedeeld/util.js';
import {atmosphere,particles,veil} from '../gedeeld/licht.js';

export function plank({scene,headPosition,audio}) {
  const group=new THREE.Group();
  const air=atmosphere(scene,group,{top:0x000107,horizon:0x09172e,density:.0012});
  const surfaces=[];
  function panel(w,h,color,x,y,z,ry=0) {
    const p=plane(group,w,h,color,x,y,z,ry);surfaces.push({mesh:p,color:p.material.color.clone()});return p;
  }
  const floor=panel(2,2,0x090d12,0,0,0);floor.rotation.x=-Math.PI/2;
  panel(2,3,0x04070c,-1,1.5,0,Math.PI/2);
  panel(2,3,0x04070c,1,1.5,0,Math.PI/2);
  panel(2,3,0x030509,0,1.5,1,Math.PI);
  const ceiling=panel(2,2,0x020408,0,3,0);ceiling.rotation.x=Math.PI/2;
  const left=panel(1,3,0x080d15,-.5,1.5,-1),right=panel(1,3,0x080d15,.5,1.5,-1);
  const board=panel(.3,4,0xb6a18a,0,0,-3);board.rotation.x=-Math.PI/2;
  // Seeded longitudinal grain and joins: one small, locally generated texture.
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;
  const ctx=canvas.getContext('2d'),grain=random(812);
  ctx.fillStyle='#75634f';ctx.fillRect(0,0,128,512);
  for(let i=0;i<420;i++) {
    const x=grain()*128,y=grain()*512;
    ctx.strokeStyle=`rgba(${grain()>.5?'222,191,144':'25,17,11'},${.04+grain()*.18})`;
    ctx.lineWidth=.4+grain()*1.2;ctx.beginPath();ctx.moveTo(x,y);
    ctx.bezierCurveTo(x+grain()*3,y+45,x-2,y+90,x+1,y+160);ctx.stroke();
  }
  ctx.fillStyle='rgba(12,8,5,.6)';ctx.fillRect(42,0,1,512);ctx.fillRect(85,0,1,512);
  const grainTexture=new THREE.CanvasTexture(canvas);grainTexture.colorSpace=THREE.SRGBColorSpace;
  board.material.map=grainTexture;
  const edges=[];
  for(const x of [-.148,.148]) {
    const edge=panel(.008,4,0xffdbaa,x,.003,-3);edge.rotation.x=-Math.PI/2;edges.push(edge);
  }
  // Individually seeded streets: 6,400 lights, varied heights and block gaps.
  const city=particles(group,air,6400,{size:2.1,color:0xffbd76,seed:36});
  city.points.renderOrder=-5;
  city.uniforms.uTwinkle.value=.12;
  city.uniforms.uColor.value.multiplyScalar(2);
  const rand=random(51);
  for(let i=0;i<6400;i++) {
    const x=i%80,z=Math.floor(i/80),street=(x%8===0||z%8===0);
    city.positions.set([(x-40)*5+(rand()-.5)*1.7,-180+(street?0:rand()*24),(z-40)*5-30+(rand()-.5)*1.7],i*3);
  }
  city.geometry.attributes.position.needsUpdate=true;
  // Long roads share the city's world space: perspective converges below the horizon.
  const roads=[];
  for(const x of [-120,-40,40,120]) {
    const road=panel(.7,440,0xffb66b,x,-179,-30);road.rotation.x=-Math.PI/2;roads.push(road);
  }
  for(const z of [-150,-70,10,90]) {
    const road=panel(400,.7,0xe7ae74,0,-178.9,z);road.rotation.x=-Math.PI/2;roads.push(road);
  }
  roads.forEach(road=>{road.renderOrder=-5;road.material.transparent=true;road.material.opacity=.72;road.material.depthWrite=false;});
  // Three separate cloud altitudes leave moving sightlines down to the city.
  const clouds=[];
  for(let i=0;i<6;i++) {
    const cloud=veil(group,air,{width:105,height:85,color:0x243952,opacity:.18,noiseScale:5});
    cloud.renderOrder=-4;
    cloud.rotation.x=-Math.PI/2;cloud.position.set((i%2?1:-1)*48,-22-Math.floor(i/2)*32,-35-Math.floor(i/2)*12);clouds.push(cloud);
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
  let lastFall=-10;
  return {group,update(t) {
    const fade=1-smooth(136,150,t);
    air.update(t,fade);
    const pos=headPosition();
    if(t>64&&t<130&&pos.z< -1&&Math.abs(pos.x)>.25&&t-lastFall>5) {audio.fall();lastFall=t;}
    const guard=1-smooth(2.5,4,t-lastFall);
    const open=smooth(60,64,t)*(1-smooth(130,136,t))*(1-guard);
    left.position.x=-.5-open;right.position.x=.5+open;
    board.visible=t>=60&&guard<.5;edges.forEach(e=>e.visible=board.visible);
    const ascent=smooth(20,28,t)*(1-smooth(58,60,t));
    strips.forEach((s,i)=>{
      s.position.y=((i*.43-t*(t<130?1.3:-.85))%4+4)%4-.5;
      s.material.uniforms.uOpacity.value=.12+.65*(ascent+smooth(130,138,t))*(.9+.1*Math.sin(t*.8));
    });
    clouds.forEach((c,i)=>c.position.x=(i%2?1:-1)*48+Math.sin(t*.014+i)*12);
    surfaces.forEach(({mesh,color})=>mesh.material.color.copy(color).multiplyScalar(fade));
  }};
}
