import * as THREE from 'three';
import {mergeGeometries,mergeVertices} from '../vendor/utils/BufferGeometryUtils.js';
import {smooth,random} from '../gedeeld/util.js';

// Donker: je ziet alleen wat je hoort. Elk geluid (een druppel, een voetstap,
// jouw eigen knip of klap) stuurt een echo-ring door de hal en tekent heel even
// de ruimte. Schimmen bewegen alleen als het stil is: bij elke echo staan ze
// dichterbij. Hoe vaker jij geluid maakt, hoe sneller ze komen.

const MAX=14;
const vertexShader=`varying vec3 vWorld,vNormal;
void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vNormal=normalize(mat3(modelMatrix)*normal);
gl_Position=projectionMatrix*viewMatrix*w;}`;
const fragmentShader=`varying vec3 vWorld,vNormal;
uniform vec4 uPulse[${MAX}];uniform float uStrength[${MAX}];uniform vec3 uColor[${MAX}];
uniform float uTime,uDawn,uGain,uOutline,uSelf;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 vec3 n=normalize(vNormal)*(gl_FrontFacing?1.:-1.),v=normalize(cameraPosition-vWorld);
 float rim=pow(1.-abs(dot(n,v)),2.);
 float grain=.55+.45*noise(vWorld*7.)*noise(vWorld*1.3+3.);
 vec3 c=vec3(0.);
 for(int i=0;i<${MAX};i++){
  float age=uTime-uPulse[i].w;
  if(age<0.||age>4.)continue;
  float s=uStrength[i],d=distance(vWorld,uPulse[i].xyz),r=age*6.5,reach=2.+s*11.;
  float range=(1.-smoothstep(reach*.45,reach,d))/(1.+d*.18);
  float ring=exp(-pow((d-r)/(.12+age*.05),2.));
  float trail=d<r?exp(-(r-d)*.9)*.32:0.;
  c+=uColor[i]*(ring*2.+trail*1.5)*range*s*exp(-age*.85);
 }
 float smoke=noise(vWorld*vec3(6.,3.,6.)+vec3(0.,-uTime*.7,0.));
 c*=grain*mix(1.,(.08+2.4*rim)*(.5+smoke),uOutline);
 c+=uSelf*vec3(.26,.34,.5)*(.01+rim*1.8)*smoke*smoke*1.6*smoothstep(0.,.9,vWorld.y);
 c+=uDawn*vec3(.16,.105,.06)*(.45+.55*max(n.y,0.)+.3*rim)*grain;
 gl_FragColor=vec4(c*uGain,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

function echoMaterial(shared,{outline=0,gain=1}={}) {
  return new THREE.ShaderMaterial({vertexShader,fragmentShader,
    uniforms:{...shared,uGain:{value:gain},uOutline:{value:outline},uSelf:{value:0}}});
}

// Een lange, smalle gestalte uit zachte vormen: te lange armen, licht voorover.
function figureGeometry() {
  const parts=[];
  const add=(g,x,y,z,sx=1,sy=1,sz=1,rz=0,rx=0)=>{g.scale(sx,sy,sz);g.rotateX(rx);g.rotateZ(rz);g.translate(x,y,z);parts.push(g);};
  add(new THREE.SphereGeometry(.105,20,14),0,1.72,.05,1,1.18,1.05);
  add(new THREE.CapsuleGeometry(.045,.1,4,10),0,1.56,.03);
  add(new THREE.CapsuleGeometry(.16,.5,6,16),0,1.2,0,1.25,1,.68,0,.12);
  add(new THREE.CapsuleGeometry(.13,.3,6,14),0,.86,0,1.2,1,.7);
  for(const s of [-1,1]){
    add(new THREE.CapsuleGeometry(.045,.68,4,10),s*.27,1.02,.06,1,1,1,s*.07,.1);
    add(new THREE.CapsuleGeometry(.065,.78,4,10),s*.1,.42,0);
  }
  const g=mergeVertices(mergeGeometries(parts.map(p=>{p.deleteAttribute('uv');p.deleteAttribute('normal');return p.toNonIndexed();})),.004);
  g.computeVertexNormals();return g;
}

// De schim als stofwolk: punten verdeeld over het lijf (naar oppervlakte), die
// langzaam opstijgen en aan de randen uitrafelen. Alleen echo's en de eigen
// gloed achter je maken ze zichtbaar.
function dustGeometry(body,count=7000,seed=7) {
  const rand=random(seed),pos=body.attributes.position,nor=body.attributes.normal,index=body.index.array;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3(),tmp=new THREE.Vector3();
  const areas=[];let total=0;
  for(let i=0;i<index.length;i+=3){
    a.fromBufferAttribute(pos,index[i]);b.fromBufferAttribute(pos,index[i+1]);c.fromBufferAttribute(pos,index[i+2]);
    total+=tmp.subVectors(b,a).cross(n.subVectors(c,a)).length()/2;areas.push(total);
  }
  const position=new Float32Array(count*3),normal=new Float32Array(count*3),seeds=new Float32Array(count);
  for(let k=0;k<count;k++){
    const r=rand()*total;let lo=0,hi=areas.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(areas[mid]<r)lo=mid+1;else hi=mid;}
    const i=lo*3;let u=rand(),v=rand();if(u+v>1){u=1-u;v=1-v;}
    a.fromBufferAttribute(pos,index[i]);b.fromBufferAttribute(pos,index[i+1]);c.fromBufferAttribute(pos,index[i+2]);
    tmp.copy(a).multiplyScalar(1-u-v).addScaledVector(b,u).addScaledVector(c,v);
    n.fromBufferAttribute(nor,index[i]).multiplyScalar(1-u-v).addScaledVector(c.fromBufferAttribute(nor,index[i+2]),v)
      .addScaledVector(b.fromBufferAttribute(nor,index[i+1]),u).normalize();
    // Een deel zweeft los van het lijf: de rand van de schim is nooit scherp.
    tmp.addScaledVector(n,(rand()-.3)*.035*(1+3*rand()**4));
    position.set(tmp.toArray(),k*3);normal.set(n.toArray(),k*3);seeds[k]=rand();
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(position,3));
  g.setAttribute('aNormal',new THREE.BufferAttribute(normal,3));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  return g;
}
function dustMaterial(shared,gain) {
  const uniforms={...shared,uGain:{value:gain},uOutline:{value:1},uSelf:{value:0},uProjection:{value:700}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float aSeed;attribute vec3 aNormal;
    uniform vec4 uPulse[${MAX}];uniform float uStrength[${MAX}];uniform vec3 uColor[${MAX}];
    uniform float uTime,uGain,uSelf,uProjection;varying vec3 vColor;
    void main(){
      float speed=.04+.1*fract(aSeed*13.7),life=fract(aSeed*7.31+uTime*speed);
      float wisp=step(.8,fract(aSeed*31.3));
      vec3 p=position+aNormal*(.006+.06*wisp*life);
      p+=vec3(sin(uTime*.7+aSeed*40.)*.014,life*(.03+.32*wisp),cos(uTime*.6+aSeed*25.)*.014);
      float live=sin(life*3.14159);
      vec3 w=(modelMatrix*vec4(p,1.)).xyz;
      vec3 c=vec3(0.);
      for(int i=0;i<${MAX};i++){
        float age=uTime-uPulse[i].w;if(age<0.||age>4.)continue;
        float s=uStrength[i],d=distance(w,uPulse[i].xyz),r=age*6.5,reach=2.+s*11.;
        float range=(1.-smoothstep(reach*.45,reach,d))/(1.+d*.18);
        float ring=exp(-pow((d-r)/(.18+age*.08),2.));
        float trail=d<r?exp(-(r-d)*.55)*.5:0.;
        c+=uColor[i]*(ring*2.2+trail*1.4)*range*s*exp(-age*.7);
      }
      c+=uSelf*vec3(.16,.2,.3)*(.25+.75*fract(aSeed*91.));
      vColor=c*uGain*live*(1.-.5*wisp);
      vec4 mv=viewMatrix*vec4(w,1.);
      gl_PointSize=clamp((.005+.007*fract(aSeed*5.3))*uProjection/max(.1,-mv.z),1.6,14.);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader:`varying vec3 vColor;
    void main(){float r=length(gl_PointCoord-.5)*2.;if(r>=1.)discard;
      gl_FragColor=vec4(vColor*exp(-r*r*2.5)*.8,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  return material;
}
function dustFigure(geometry,material) {
  const points=new THREE.Points(geometry,material),viewport=new THREE.Vector4();
  points.frustumCulled=false;
  points.onBeforeRender=(renderer,scene,camera)=>{
    renderer.getCurrentViewport(viewport);
    material.uniforms.uProjection.value=viewport.w*camera.projectionMatrix.elements[5]*.5;
  };
  return points;
}

export function donker({scene,hands,audio,headPosition,forward,requestPeak}) {
  const group=new THREE.Group();scene.background=new THREE.Color(0);scene.fog=null;
  const rand=random(4242);
  const pulses=Array.from({length:MAX},()=>new THREE.Vector4(0,-99,0,-99));
  const shared={uPulse:{value:pulses},uStrength:{value:new Float32Array(MAX)},
    uColor:{value:Array.from({length:MAX},()=>new THREE.Color())},uTime:{value:0},uDawn:{value:0}};
  let next=0;
  const cold=new THREE.Color(.55,.72,1),warm=new THREE.Color(1,.72,.42);
  function pulse(p,strength=1,color=cold){
    const i=next++%MAX;pulses[i].set(p.x,p.y,p.z,shared.uTime.value);
    shared.uStrength.value[i]=strength;shared.uColor.value[i].copy(color);
    return {position:p.clone(),time:shared.uTime.value,strength};
  }
  const live=[];

  // De hal: 16 x 16 m, 6 m hoog, pilaren, kettingen en een stoel.
  const hall=echoMaterial(shared),detail=echoMaterial(shared,{outline:.25});
  const room=new THREE.Mesh(new THREE.BoxGeometry(16,6.2,16,24,10,24),hall);hall.side=THREE.BackSide;room.position.y=3.1;group.add(room);
  for(const x of [-4.2,0,4.2])for(const z of [-4.2,0,4.2]){
    if(x===0&&z===0)continue;
    const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,6.2,20),detail);pillar.position.set(x+(rand()-.5)*.4,3.1,z+(rand()-.5)*.4);group.add(pillar);
  }
  for(let i=0;i<5;i++){
    const len=1.2+rand()*2.6,chain=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,len,5),detail);
    chain.position.set((rand()-.5)*10,6.2-len/2,(rand()-.5)*10);group.add(chain);
  }
  const chair=new THREE.Group();chair.position.set(1.6,0,-2.3);chair.rotation.y=.7;group.add(chair);
  const leg=new THREE.BoxGeometry(.04,.45,.04);
  for(const [x,z] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){const m=new THREE.Mesh(leg,detail);m.position.set(x,.225,z);chair.add(m);}
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.46,.04,.46),detail);seat.position.y=.46;chair.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(.46,.5,.04),detail);back.position.set(0,.72,-.21);chair.add(back);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.3,.1),detail);door.position.set(-2.5,1.15,7.95);group.add(door);

  // Drie schimmen op 7 tot 8 m, voor je, rechts en achter je.
  const body=figureGeometry(),dust=dustGeometry(body);
  const figures=[[-.35,7.2],[1.9,7.8],[3.6,7.4]].map(([angle,distance])=>{
    const material=dustMaterial(shared,1.6);
    const mesh=dustFigure(dust,material);group.add(mesh);
    return {mesh,material,angle,distance,seen:false,lastSeen:-9,moved:-9,fled:-9};
  });
  const behind=dustMaterial(shared,2);
  const neckFigure=dustFigure(dust,behind);neckFigure.visible=false;group.add(neckFigure);

  // Lichtpuntjes op je vingertoppen, zodat je weet waar je handen zijn.
  const tipMaterial=new THREE.MeshBasicMaterial({color:0x9fc2ff,transparent:true,opacity:.5,depthWrite:false});
  const tips=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),tipMaterial);group.add(m);return m;});

  const drips=[[3.1,-3.7],[-5.2,1.4],[1.2,5.6],[-2.4,-5.8]].map(([x,z])=>new THREE.Vector3(x,0,z));
  const state=new WeakMap(),place=new THREE.Vector3(),tmp=new THREE.Vector3(),neck=new THREE.Vector3();
  let last=null,nextDrip=.6,nextBeat=1,secondBeat=-1,clicked=false,peaked=false,neckPulse=false,breath=false,dissolved=false,lastSlide=-9;

  function playerPulse(p,strength,h){
    clicked=true;live.push(pulse(p,strength,shared.uDawn.value>.08?warm:cold));
    audio.burst(p.x,p.y,p.z,.07,.42*strength,3400,{attack:.002,endFrequency:1700,sample:'noise'});
    audio.tone(1900,.05,p.x,p.y,p.z,.05,'triangle');h?.pulse?.(.35,30);
  }
  function figurePosition(f,head,out){
    return out.set(head.x+Math.sin(f.angle)*f.distance,0,head.z-Math.cos(f.angle)*f.distance);
  }

  return {group,update(t){
    const dt=last===null?.016:Math.min(.1,t-last);last=t;shared.uTime.value=t;
    const head=headPosition(),hs=hands();
    const fade=1-smooth(74,80,t);
    for(const m of [hall,detail,behind,...figures.map(f=>f.material)])m.uniforms.uGain.value=(m===behind?2:m.uniforms.uOutline.value===1?3.4:1)*fade;

    // Je handen: knippen, pinch of trigger is een tik; twee handen tegen elkaar is een klap.
    hs.forEach((h,i)=>{
      const s=state.get(h)||{pinch:false,at:-9};state.set(h,s);
      if(tips[i]){tips[i].visible=true;tips[i].position.copy(h.position);}
      if(h.pinch&&!s.pinch&&t-s.at>.22){playerPulse(h.position,.85,h);s.at=t;}
      s.pinch=h.pinch;
    });
    for(let i=hs.length;i<2;i++)tips[i].visible=false;
    tipMaterial.opacity=.35+.2*Math.sin(t*3);
    if(hs.length===2){
      const gap=hs[0].position.distanceTo(hs[1].position),s=state.get(hs[0]);
      if(gap<.09&&(s.gap??1)>=.09&&t-(s.clap??-9)>.3){
        playerPulse(tmp.copy(hs[0].position).lerp(hs[1].position,.5),1.4,hs[0]);hs[1].pulse?.(.35,30);s.clap=t;
      }
      s.gap=gap;
    }
    // Als de speler na een paar seconden nog niets doet: één tik vanuit de hand, als voorbeeld.
    if(!clicked&&(t>=3&&t<3.1||t>=10&&t<10.1)&&hs[0])playerPulse(hs[0].position,.7,hs[0]);

    // Druppels uit het plafond: verre, zachte echo's.
    if(t>=nextDrip&&t<70){
      const d=drips[Math.floor(rand()*drips.length)];live.push(pulse(d,.55));
      audio.recording('drop',d.x,.2,d.z,{loop:false,volume:.4,ref:2,duration:1.5});
      nextDrip=t+3.2+rand()*3.5;
    }

    if(!peaked){
      // Een schim die door een echo wordt geraakt, is gezien.
      for(const p of live)for(const f of figures){
        figurePosition(f,head,place);place.y=1.2;
        const d=p.position.distanceTo(place),reach=2+p.strength*11;
        if(d<reach*.9&&t-p.time>=d/6.5&&t-p.time<d/6.5+.2&&p.time>f.moved){f.seen=true;f.lastSeen=t;}
      }
      // Schimmen bewegen alleen in het donker, als de laatste echo uitgedoofd is.
      let closest=99;
      for(const f of figures){
        const quiet=t-f.lastSeen>2.4,lazy=t-f.moved>9;
        if(quiet&&(f.seen||lazy)&&t>4&&t-f.fled>3){
          f.distance=Math.max(1.35,f.distance*(f.seen?.68:.85));f.angle+=(rand()-.5)*.5;f.seen=false;f.moved=t;
          figurePosition(f,head,place);
          audio.recording('steps',place.x,.1,place.z,{loop:false,volume:.32,ref:1.2,offset:rand()*6,duration:.8});
          live.push(pulse(place,.16));
        }
        closest=Math.min(closest,f.distance);
        f.mesh.visible=true;figurePosition(f,head,f.mesh.position);
        f.mesh.rotation.y=Math.atan2(head.x-f.mesh.position.x,head.z-f.mesh.position.z);
        // Reik je naar een schim, dan schiet hij weg.
        f.mesh.getWorldPosition(tmp);tmp.y=1.3;
        if(hs.some(h=>h.position.distanceTo(tmp)<.5)&&t-f.fled>2){
          audio.burst(tmp.x,tmp.y,tmp.z,.5,.14,1500,{endFrequency:300});live.push(pulse(tmp,.35));
          f.distance=6.5;f.angle+=Math.PI*.7;f.fled=t;f.moved=t;
        }
        // Rustling dichtbij als er een vlak bij staat.
        if(f.distance<2.4&&t-lastSlide>3.5){audio.burst(tmp.x,1.1,tmp.z,.6,.06,2200,{attack:.15,endFrequency:700});lastSlide=t;}
      }
      // De piek: een gezien schim op armlengte, of vanzelf op 0:45.
      if(t>=25&&figures.some(f=>f.distance<1.5&&t-f.lastSeen<1))requestPeak();
      // Hartslag: sneller als ze dichterbij komen, en voelbaar in de controllers.
      const fear=1-smooth(1.4,7,closest),bpm=56+58*fear;
      if(t>=nextBeat&&t<45){
        audio.tone(52,.16,head.x,head.y-.35,head.z,.16+.14*fear);secondBeat=t+.2;nextBeat=t+60/bpm;
        hs.forEach(h=>h.pulse?.(.12+.3*fear,45));
      }
      if(secondBeat>0&&t>=secondBeat){audio.tone(44,.2,head.x,head.y-.35,head.z,.1+.1*fear);secondBeat=-1;}
    }
    if(t>=45&&!peaked){
      peaked=true;figures.forEach(f=>f.mesh.visible=false);
      // Achter je rechterschouder, gezien vanuit waar je nu kijkt.
      neck.set(-forward.z*.25-forward.x*.55,0,forward.x*.25-forward.z*.55).add(head);neck.y=0;
      neckFigure.position.copy(neck);neckFigure.rotation.y=Math.atan2(head.x-neck.x,head.z-neck.z);neckFigure.visible=true;
    }
    if(peaked){
      tmp.copy(neck);tmp.y=head.y-.05;
      if(t>=46.6&&!breath){breath=true;
        audio.burst(tmp.x,tmp.y,tmp.z,1.3,.2,1000,{direct:true,attack:.3,endFrequency:380});
        audio.burst(tmp.x,tmp.y,tmp.z,.6,.08,2600,{direct:true,attack:.1,endFrequency:900});
        hs.forEach(h=>h.pulse?.(.6,120));
      }
      if(t>=47.4&&!neckPulse){neckPulse=true;live.push(pulse(tmp,.5));}
      place.copy(neck);place.y=head.y-.4;
      if(!dissolved&&(t>=51.5||t>=48.6&&hs.some(h=>h.position.distanceTo(place)<.22))){
        dissolved=true;audio.burst(tmp.x,tmp.y,tmp.z,.8,.12,1800,{endFrequency:250});
      }
      behind.uniforms.uSelf.value=t>=47.4?smooth(47.4,48,t)*(.75+.25*Math.sin(t*9)):0;
      behind.uniforms.uGain.value=2*(dissolved?1-smooth(0,1,t-(behind.userData.gone??=t)):1);
      // Daarna komt er langzaam warm licht: de hal is leeg.
      shared.uDawn.value=smooth(52,64,t)*fade;
      if(t>=52&&t<52.1)[220,277,330,415].forEach((f,i)=>audio.tone(f,7,Math.sin(i*1.6)*2,2,Math.cos(i*1.6)*2,.05,'sine'));
    }
    for(let i=live.length-1;i>=0;i--)if(t-live[i].time>4)live.splice(i,1);
  }};
}
