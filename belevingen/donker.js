import * as THREE from 'three';
import {smooth} from '../gedeeld/util.js';

function silhouette(group) {
  const material=new THREE.ShaderMaterial({
    uniforms:{alpha:{value:0},time:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 v;uniform float alpha,time;
    void main(){
      vec2 p=v-.5;p.x+=.017*sin(p.y*21.+time);
      float skull=length((p-vec2(0.,.31))/vec2(.135,.095));
      float coat=length((p-vec2(0.,-.065))/vec2(.31,.37));
      float smoke=1.-smoothstep(.62,1.3,min(skull,coat));
      gl_FragColor=vec4(vec3(.016),smoke*alpha*(.82+.18*sin(time+p.y*24.)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.62,1.62),material);group.add(mesh);return mesh;
}
export function donker({scene,hands,audio,headPosition,forward,requestPeak}) {
  const group=new THREE.Group();scene.background=new THREE.Color(0);scene.fog=null;
  const figures=Array.from({length:4},()=>silhouette(group));
  const fly=new THREE.Vector3(),cloth=new THREE.Vector3(),foot=new THREE.Vector3();
  const neck=new THREE.Vector3(),direction=new THREE.Vector3(),escape=new THREE.Vector3(),start=new THREE.Vector3();
  const glint=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),new THREE.MeshBasicMaterial({color:0x191818,transparent:true,opacity:.25}));
  group.add(glint);let slide=null;
  let last=null,lastBeat=-1,escaped=-10,flipped=0,lastPeak=false,vanished=false,near=false;
  return {group,update(t){
    const dt=last===null?.016:Math.min(.1,t-last);last=t;
    const head=headPosition(),hs=hands(),pre=t<45;
    const angle=t*.73+flipped,dist=.95-.69*smooth(0,43,t);
    fly.set(Math.cos(angle)*.26,.04*Math.sin(t),Math.sin(angle)*.26).add(head);
    cloth.set(Math.cos(angle+2)*.23,-.13,Math.sin(angle+2)*.23).add(head);
    foot.set(Math.cos(angle)*dist,.16,Math.sin(angle)*dist);
    const retreat=t-escaped;
    if(retreat<.45){
      fly.copy(start).lerp(escape,smooth(0,.45,retreat));
      if(slide){slide.positionX.value=fly.x;slide.positionY.value=fly.y;slide.positionZ.value=fly.z;}
    }
    if(!pre&&!lastPeak){
      lastPeak=true;neck.set(-forward.z*.16-forward.x*.17,-.12,forward.x*.16-forward.z*.17).add(head);
    }
    const beat=Math.floor(t*2);
    const sources=[fly,cloth,foot];
    figures.forEach((mesh,i)=>{
      if(i===3)mesh.position.copy(neck).y-=.45;
      else {
        const a=t*.27+flipped+i*2.1+.9,r=i===0?.64:2.3+i;
        mesh.position.set(head.x+Math.sin(a)*r,head.y-.48,head.z-Math.cos(a)*r);
        sources.push(mesh.position);
      }
      mesh.rotation.y=Math.atan2(head.x-mesh.position.x,head.z-mesh.position.z);
      direction.copy(mesh.position).sub(head);direction.y+=.45;
      const looking=direction.normalize().dot(forward)>Math.cos(25*Math.PI/180);
      if(i===3&&!pre&&looking)vanished=true;
      const show=!looking&&(i===3?!pre&&!vanished&&t<50:pre);
      const uniforms=mesh.material.uniforms;
      const nearFigure=hs.some(h=>h.position.distanceTo(mesh.position)<.3);
      const target=show?(nearFigure?.48:.32):0;
      uniforms.alpha.value+=THREE.MathUtils.clamp(target-uniforms.alpha.value,-dt*1.6,dt*1.6);
      uniforms.time.value=t;
    });
    if(pre){
      const h=hs.find(h=>h.speed>.045&&sources.some(p=>h.position.distanceTo(p)<.4));
      const closest=sources.find(p=>hs.some(h=>h.position.distanceTo(p)<=.3));
      const nearby=!!closest;
      glint.visible=nearby;
      if(nearby)glint.position.copy(closest);
      if(nearby&&!near)audio.tap(closest,.04);
      near=nearby;
      if(h&&retreat>1.35){
        const p=sources.find(p=>h.position.distanceTo(p)<.4);
        start.copy(p);escape.copy(head).multiplyScalar(2).sub(p);escaped=t;flipped+=Math.PI;
        slide=audio.burst(...p.toArray(),.45,.1,1500,{endFrequency:420});h.pulse?.(.12,40);
        if(t>=40)requestPeak();
      }
      audio.darkBuzz(fly,.018);
      if(beat!==lastBeat){
        if(beat%3===0)audio.recording('steps',...foot.toArray(),{loop:false,volume:.13,ref:.7,offset:(beat%7)*1.3,duration:.44});
        if(beat%5===1)audio.burst(...cloth.toArray(),.38,.075,2300,{endFrequency:750});
      }
    }else{
      glint.visible=false;audio.darkBuzz(fly,0);
      if(t>=47&&lastBeat<94&&(lastBeat>=0||t<47.1)){
        audio.burst(...neck.toArray(),1.1,.16,1100,{direct:true,attack:.18,endFrequency:420});
        audio.burst(...neck.toArray(),.55,.08,2600,{direct:true,attack:.08,endFrequency:900});
      }
      if(t>50&&beat!==lastBeat&&beat%7===0){
        const r=1+(t-50)*.16;audio.burst(Math.cos(angle)*r,.7,Math.sin(angle)*r,.36,.05*(1-smooth(60,80,t))+.001,800);
      }
    }
    lastBeat=beat;
  }};
}
