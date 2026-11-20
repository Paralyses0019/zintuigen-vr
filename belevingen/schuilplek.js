import * as THREE from 'three';
import {smooth,random} from '../gedeeld/util.js';
import {atmosphere,particles,veil,rain,warmCore} from '../gedeeld/licht.js';
import {interactions} from '../gedeeld/interactie.js';
import {material,environment,box} from '../gedeeld/assets.js';

export function schuilplek({scene,assets,hands,audio,requestPeak}) {
 const group=new THREE.Group();
 const air=atmosphere(scene,group,{top:0x01030a,horizon:0x081627,density:.035});
 const sky=environment(scene,group,assets,{intensity:.16});
 const mud=material(assets,'brown_mud',{roughness:.24,metalness:.12,color:0x7c8794});
 const iron=material(assets,'metal_plate',{metalness:.8,roughness:.5,color:0x37302a});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),mud);ground.rotation.x=-Math.PI/2;ground.position.y=0;group.add(ground);
 // Repeat by geometry UVs, so one texture set remains shared across all surfaces.
 ground.geometry.attributes.uv.array.forEach((v,i,a)=>a[i]=v*30);
 const rainUniforms=rain(group,air);
 const shelter=new THREE.Group(),poles=new THREE.Group();group.add(shelter,poles);
 const clock={value:0};
 // Rain on the canvas runs along each panel's own downhill direction (local space),
 // so walls stream down and the roof panels stream from the ridge to the eave.
 const canvasMats=[];
 function canvasMaterial(flow,across) {
   const m=material(assets,'rough_linen',{color:0xffe5b6,side:THREE.DoubleSide,transparent:true,opacity:.89,emissive:0xffa660});
   const uFlow={value:new THREE.Vector3(...flow)},uAcross={value:new THREE.Vector3(...across)};
   m.onBeforeCompile=shader=>{
     Object.assign(shader.uniforms,{rainTime:clock,uFlow,uAcross});
     shader.vertexShader=`varying vec3 vRainLocal;
`+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
vRainLocal=position;`);
     shader.fragmentShader=`uniform float rainTime;uniform vec3 uFlow,uAcross;varying vec3 vRainLocal;
`+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
       float ac=dot(vRainLocal,uAcross),al=dot(vRainLocal,uFlow);
       float col=floor(ac*22.),h=fract(sin(col*12.9898)*43758.5453),h2=fract(h*91.7);
       float wob=fract(ac*22.)-.5+.12*sin(al*9.+h*20.);
       float seg=fract(al*(.9+h2*.8)-rainTime*(.5+h*1.1)+h*7.);
       float streak=exp(-40.*wob*wob)*smoothstep(.0,.04,seg)*(1.-smoothstep(.04,.22+h2*.25,seg))*step(.72,h);
       vec2 g=vec2(ac,al)*9.,cell=floor(g);
       float r=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453),r2=fract(r*57.3),r3=fract(r*13.1);
       vec2 f=fract(g)-vec2(.2+.6*r2,.2+.6*r3);
       float ph=fract(rainTime*(.8+r2)+r*9.);
       float hit=exp(-dot(f,f)*(700.-560.*ph))*(1.-ph)*step(.62,r);
       diffuseColor.rgb*=1.-.42*streak-.4*hit;`);
   };
   m.customProgramCacheKey=()=>'tentregen';
   canvasMats.push(m);return m;
 }
 const ridge=2.34,eave=1.18,half=.82,depth=.86;
 const wallMat=canvasMaterial([0,-1,0],[0,0,1]),endMat=canvasMaterial([0,-1,0],[1,0,0]);
 for(const side of [-1,1]){
   box(shelter,wallMat,.016,eave,2*depth,side*half,eave/2,0);
   const slope=Math.hypot(half,ridge-eave);
   const roof=box(shelter,canvasMaterial([side,0,0],[0,0,1]),slope,.018,depth*2,side*half/2,(ridge+eave)/2,0);
   roof.rotation.z=-side*Math.atan2(ridge-eave,half);
   for(const z of [-depth,depth]){
     box(poles,iron,.022,eave,.022,side*half,eave/2,z);
     const spar=box(poles,iron,slope,.026,.026,side*half/2,(ridge+eave)/2,z);
     spar.rotation.z=roof.rotation.z;
   }
 }
 for(const z of [-depth,depth]){
   const shape=new THREE.Shape();shape.moveTo(-half,0);shape.lineTo(-half,eave);shape.lineTo(0,ridge);
   shape.lineTo(half,eave);shape.lineTo(half,0);
   const end=new THREE.Mesh(new THREE.ShapeGeometry(shape),endMat);end.position.z=z;shelter.add(end);
 }
 const plaidMat=material(assets,'fabric_pattern_05',{color:0xffddbc});
 const plaid=box(group,plaidMat,.65,.045,.48,-.31,.023,-.3);
 const mugMat=new THREE.MeshStandardMaterial({color:0x8a6b50,side:THREE.DoubleSide});
 const mug=new THREE.Group();mug.position.set(.34,.075,-.33);group.add(mug);
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.062,.05,.15,24,1,true),mugMat);mug.add(cup);
 const tea=new THREE.Mesh(new THREE.CircleGeometry(.057,24),new THREE.MeshStandardMaterial({color:0x482711}));
 tea.rotation.x=-Math.PI/2;tea.position.y=.058;mug.add(tea);
 const loop=new THREE.Mesh(new THREE.TorusGeometry(.044,.009,6,16),mugMat);loop.position.x=.065;mug.add(loop);
 const steam=particles(mug,air,12,{size:.06,color:0xe0d3c6});
 const lantern=new THREE.Group();lantern.name="lantaarn";lantern.position.set(0,.15,-.45);group.add(lantern);
 box(lantern,iron,.18,.035,.18,0,-.13,0);box(lantern,iron,.2,.04,.2,0,.15,0);
 for(const x of [-.075,.075])for(const z of [-.075,.075])box(lantern,iron,.012,.27,.012,x,0,z);
 const handleMat=iron.clone();
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.075,.008,5,18,Math.PI),handleMat);handle.position.y=.17;lantern.add(handle);
 const glow=new THREE.Group();glow.position.set(0,-.95,1.5);lantern.add(glow);const flame=warmCore(glow);
 // warmCore's local source is translated into the lantern glass; compact flame and halo.
 glow.scale.setScalar(.24);glow.position.set(0,-.228,.36);
 const light=new THREE.PointLight(0xff963d,0,4,2);lantern.add(light);
 const cold=new THREE.HemisphereLight(0x7b9ac9,0x080a10,.22);group.add(cold);
 const splashes=particles(group,air,180,{size:.025,color:0xa5c6df,seed:71});splashes.uniforms.uTwinkle.value=0;
 const rand=random(217),splashBase=Array.from({length:180},()=>[(rand()-.5)*8,(rand()-.5)*8,rand()]);
 const DROPS=160,handDrops=particles(group,air,DROPS,{size:.011,color:0xd2e4ff,seed:93});handDrops.uniforms.uTwinkle.value=0;
 const dropVel=new Float32Array(DROPS*3),dropLife=new Float32Array(DROPS);let dropNext=0;
 for(let i=0;i<DROPS;i++)handDrops.positions[i*3+1]=-5;
 const joints=['wrist','thumb-tip','thumb-phalanx-distal','index-finger-tip','middle-finger-tip','ring-finger-tip','pinky-finger-tip',
  'index-finger-phalanx-proximal','middle-finger-phalanx-proximal','ring-finger-phalanx-proximal','pinky-finger-phalanx-proximal',
  'index-finger-metacarpal','middle-finger-metacarpal','ring-finger-metacarpal','pinky-finger-metacarpal'];
 const hit=new THREE.Vector3(),rainRate=new WeakMap();
 const dust=particles(group,air,110,{size:.015,bounds:[1.5,2.2,1.5],color:0xffc077});
 const clouds=veil(group,air,{width:70,height:18,color:0x0b1829,opacity:.3});clouds.position.set(0,9,-23);
 let lastTap=-1,previous=null,primed=false;
 const grabs=interactions(hands,audio),lampWorld=new THREE.Vector3();
 grabs.add(lantern,handleMat,{height:.21,floor:.15,gravity:true,onGrab(){primed=true;}});
 const cupTarget=grabs.add(mug,mugMat,{floor:.075,gravity:true});
 const blanketTarget=grabs.add(plaid,plaidMat,{floor:.023,gravity:true});
 return {group,update(t) {
  const dt=previous===null?0:Math.min(.08,t-previous);previous=t;
  const grown=smooth(40,50,t),fade=1-smooth(80,90,t),wet=1;
  air.update(t,fade);clock.value=t;sky.material.color.setScalar(.19*fade);scene.environmentIntensity=.22*fade;
  air.uniforms.uFlash.value=[3,14,22].reduce((v,at)=>v+Math.exp(-Math.pow((t-at)/.15,2)),0);
  poles.visible=shelter.visible=t>=40;
  poles.scale.y=Math.max(.001,smooth(40,46,t));shelter.scale.y=Math.max(.001,grown);
  shelter.scale.x=.68+.32*grown;
  for(const m of canvasMats){m.emissiveIntensity=grown*.16*fade;m.opacity=.78+.15*grown;}
  mug.visible=cupTarget.enabled=plaid.visible=blanketTarget.enabled=grown>.4;
  steam.uniforms.uOpacity.value=.22;
  for(let i=0;i<12;i++){
   const age=(t*.6+i/12)%1;
   steam.positions.set([.018*Math.sin(i+t+age*4),.075+age*.21,.015*Math.cos(age*7+i)],i*3);
  }
  steam.geometry.attributes.position.needsUpdate=true;
  grabs.update(dt);
  if(primed&&t<25){handleMat.emissive.setHex(0xff913a);handleMat.emissiveIntensity=.24+.1*Math.sin(5*t);}
  if(primed&&t>=12&&t<40)requestPeak();
  const lit=t>=40;glow.visible=lit||primed;flame.update(t,(lit?1:.22)*fade);
  glow.scale.y=.24*(1+.12*Math.sin(t*19)+.06*Math.sin(t*31));
  const hs=hands();lampWorld.copy(lantern.position);let warmth=0;
  for(const h of hs)warmth=Math.max(warmth,1-smooth(.08,.25,h.position.distanceTo(lampWorld)));
  light.intensity=(lit?3.6:primed?.12:0)*fade*(1+.25*warmth+.08*Math.sin(t*23));audio.warmth(lampWorld,warmth);
  rainUniforms.uOpacity.value=wet*.55;
  // Keep falling drops outside the completed roof (shader mask below is shared).
  rainUniforms.uShelter.value=grown;
  splashes.uniforms.uOpacity.value=wet*.7;
  for(let i=0;i<180;i++) {
   const [x,z,phase]=splashBase[i],age=(t*2+phase)%1,inside=Math.abs(x)<.85&&z>-.95&&z<.85;
   splashes.positions[i*3]=x;splashes.positions[i*3+1]=inside&&grown>.5?-2:.012+Math.sin(age*Math.PI)*.07;
   splashes.positions[i*3+2]=z;
  }
  splashes.geometry.attributes.position.needsUpdate=true;
  handDrops.uniforms.uOpacity.value=wet;
  // Rain hits the whole hand: random joints (or around a controller), each hit splashes.
  for(const h of hs){
   const p=h.position,outside=grown<.8||Math.abs(p.x)>half||Math.abs(p.z)>depth||p.y>ridge-Math.abs(p.x)*(ridge-eave)/half;
   if(!outside||wet<.1)continue;
   let acc=(rainRate.get(h)||0)+dt*16;
   while(acc>=1){
    acc--;
    const joint=h.source?.hand&&h.hand?.joints?.[joints[Math.floor(rand()*joints.length)]];
    if(joint?.visible)joint.getWorldPosition(hit).y+=.008;else hit.set(p.x+(rand()-.5)*.08,p.y+.02+rand()*.03,p.z+(rand()-.5)*.08);
    for(let k=0;k<4;k++){
     const i=dropNext++%DROPS;
     handDrops.positions.set([hit.x,hit.y,hit.z],i*3);
     const a=rand()*Math.PI*2,sp=.25+rand()*.5;
     dropVel.set([Math.cos(a)*sp,.35+rand()*.55,Math.sin(a)*sp],i*3);dropLife[i]=.25+rand()*.25;
    }
    if(t-lastTap>.07){audio.tap(hit,.018+rand()*.03);h.pulse?.(.05+rand()*.06,18);lastTap=t;}
   }
   rainRate.set(h,acc);
  }
  for(let i=0;i<DROPS;i++){
   if(dropLife[i]<=0)continue;
   dropLife[i]-=dt;dropVel[i*3+1]-=9.8*dt;
   if(dropLife[i]<=0){handDrops.positions[i*3+1]=-5;continue;}
   for(let k=0;k<3;k++)handDrops.positions[i*3+k]+=dropVel[i*3+k]*dt;
  }
  handDrops.geometry.attributes.position.needsUpdate=true;dust.uniforms.uOpacity.value=grown*.45;
  clouds.position.x=Math.sin(t*.02)*5;
  cold.intensity=.34*fade;
 }};
}
