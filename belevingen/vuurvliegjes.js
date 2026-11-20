import * as THREE from 'three';
import {environment} from '../gedeeld/assets.js';
import {smooth} from '../gedeeld/util.js';
import {atmosphere,particles,veil} from '../gedeeld/licht.js';

export function vuurvliegjes({scene,mode,handPosition,headPosition,hands,assets,audio,requestPeak}) {
  const group=new THREE.Group(), ar=mode==='ar';
  const air=atmosphere(scene,group,{top:0x010608,horizon:0x182a2b,density:.04,ar});
  const sky=environment(scene,group,assets,{sky:!ar,intensity:.18});
  const handLight=new THREE.PointLight(0xffb34b,0,1.2,2);group.add(handLight);
  group.add(new THREE.HemisphereLight(0x807e9b,0x17121a,.25));
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
  const count=216;
  const flies=particles(group,air,count,{size:.105,bounds:[1.4,1.4,1.4],color:0xffc373,seed:83});
  const jewel=particles(group,air,1,{size:.13,color:0xffe2a2});
  const palmGlow=particles(group,air,1,{size:.22,color:0xffaf56});
  for(const effect of [jewel,palmGlow])effect.uniforms.uTwinkle.value=0;
  const positions=flies.positions,vel=new Float32Array(count*3);
  for(let i=0;i<count;i++){positions[i*3+1]+=.65;positions[i*3+2]-=1.9;vel[i*3]=.4;}
  const attract=new THREE.Vector3(),spark=new THREE.Vector3(),launch=new THREE.Vector3();
  const palm=h=>h?.palm||h?.position||handPosition();
  let owner=null,steady=0,last=null,phase='roam',releasedAt=0,announced=false,near=false;
  return {group,update(t){
    const dt=last===null?0:Math.min(.06,Math.max(0,t-last));last=t;
    const depart=smooth(80,90,t),fade=1-depart,hs=hands(),head=headPosition();
    air.update(t,fade);shade.material.opacity=.16*smooth(0,6,t)*fade;
    if(sky)sky.material.color.setScalar(.18*fade);
    flies.uniforms.uOpacity.value=smooth(0,2,t);
    if(owner&&!hs.includes(owner)){owner=null;phase='roam';steady=0;}
    if(phase==='roam'&&t<80){
      const h=hs.find(h=>h.open&&h.speed<.15);
      if(owner!==h){owner=h;steady=0;}
      if(h)steady+=dt;
      if(steady>=2&&t>=30&&t<45&&!announced)requestPeak();
      if((t>=45&&!announced)||(announced&&steady>=2)){
        owner=(steady>=2?h:null)||hs.reduce((a,b)=>!a||palm(b).distanceToSquared(head)<palm(a).distanceToSquared(head)?b:a,null);
        if(owner){
          phase='land';announced=true;audio.tone(1320,.55,...palm(owner).toArray(),.16);owner.pulse?.();
        }
      }
    }
    if(phase==='land'&&owner.pinch){
      phase='caught';audio.tap(palm(owner));owner.pulse?.();
    }else if(phase==='caught'&&!owner.pinch){
      phase='release';releasedAt=t;launch.copy(palm(owner));steady=0;
      audio.tone(880,.22,...launch.toArray(),.07);
    }
    if(phase==='release'&&t-releasedAt>1.5){phase='roam';owner=null;}
    const hand=palm(owner),orbit=owner&&steady>=1&&phase!=='caught'&&phase!=='release';
    palmGlow.uniforms.uOpacity.value=owner?(phase==='caught'?.9:Math.min(1,steady)*.46)*fade:0;
    palmGlow.positions.set(hand.toArray());palmGlow.geometry.attributes.position.needsUpdate=true;
    attract.set(1.45*Math.sin(t*.46),1.35+.54*Math.sin(t*.52),-.78+.85*Math.cos(t*.4));
    audio.moveSwarm(attract);
    spark.copy(hand);spark.y+=phase==='caught'?.012:.035;
    if(phase==='release')spark.copy(launch).lerp(attract,smooth(0,1.5,t-releasedAt)).y+=.38*Math.sin(Math.PI*(t-releasedAt)/1.5);
    if(t>=42&&!announced&&!owner){attract.lerp(hand,smooth(42,45,t));}
    const approaching=phase==='roam'&&orbit&&t>=28;
    if(approaching)spark.lerp(attract,1-Math.min(smooth(28,30,t),smooth(1,2,steady)));
    const close=!!owner&&spark.distanceTo(hand)<=.3&&(approaching||phase==='land');
    if(close&&!near)audio.tap(hand,.05);near=close;
    jewel.uniforms.uOpacity.value=phase==='roam'&&!approaching?0:fade;
    jewel.positions.set(spark.toArray());jewel.geometry.attributes.position.needsUpdate=true;
    handLight.position.copy(hand);handLight.intensity=owner?(phase==='caught'?.65:phase==='land'?.38:.12)*fade:0;
    // Stable cohorts sample six neighbours each. Integration is O(n) per frame.
    for(let i=0;i<count;i++){
      const p=i*3,ph=flies.phases[i],x=positions[p],y=positions[p+1],z=positions[p+2];
      const a=t*.85+ph,around=orbit&&i%3===0;
      const r=around?.18+.04*Math.sin(ph):.48;
      let ax=((around?hand.x:attract.x)+r*Math.cos(a)-x)*1.8;
      let ay=((around?hand.y:attract.y)+r*.55*Math.sin(a*1.3)-y)*1.8;
      let az=((around?hand.z:attract.z)+r*Math.sin(a)-z)*1.8;
      for(let n=1;n<=6;n++){
        const q=((i+n*17)%count)*3,dx=positions[q]-x,dy=positions[q+1]-y,dz=positions[q+2]-z;
        const d=dx*dx+dy*dy+dz*dz;
        if(d>.81)continue;
        const cohesion=d<.035?-.019/(d+.001):.08;
        ax+=dx*cohesion+.085*(vel[q]-vel[p]);ay+=dy*cohesion+.085*(vel[q+1]-vel[p+1]);
        az+=dz*cohesion+.085*(vel[q+2]-vel[p+2]);
      }
      for(const h of hs){
        const dx=x-h.position.x,dy=y-h.position.y,dz=z-h.position.z,d=dx*dx+dy*dy+dz*dz;
        if(d<(phase==='caught'?1:.018)){
          const strength=(phase==='caught'?1.2:.12)/(d+.015);
          ax+=dx*strength;ay+=dy*strength;az+=dz*strength;
        }
      }
      const damping=Math.exp(-1.65*dt);
      vel[p]=(vel[p]+ax*dt)*damping;vel[p+1]=(vel[p+1]+ay*dt)*damping;vel[p+2]=(vel[p+2]+az*dt)*damping;
      positions[p]+=vel[p]*dt;positions[p+1]+=vel[p+1]*dt;positions[p+2]+=vel[p+2]*dt;
    }
    flies.points.position.z=-depart*5;flies.geometry.attributes.position.needsUpdate=true;
  }};
}
