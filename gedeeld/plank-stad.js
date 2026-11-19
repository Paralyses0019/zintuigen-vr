import * as THREE from 'three';
import {random,smooth} from './util.js';
import {veil} from './licht.js';

// Original CC0 city. All dimensions are metres; no photographic ground/sky map.
export function plankStad(group,air) {
  const rand=random(5105),blocks=[];
  for(let x=-1470;x<=1470;x+=70)for(let z=-1470;z<=1470;z+=70) {
    if(Math.hypot(x,z)>1480||(x===0&&z===0))continue;
    const h=5+75*Math.pow(rand(),1.6);
    blocks.push([x,-330+h/2,z,30+rand()*19,h,30+rand()*19]);
  }
  // Flank the sightline, leaving the beam and falling nut above an open street.
  blocks.push([-31,-240,-29,20,180,24],[33,-245,-45,24,170,22]);
  const uniforms={...air.uniforms};
  const buildings=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.ShaderMaterial({
    uniforms,
    vertexShader:`varying vec3 vWorld,vNormal; varying float vDepth;
      void main(){vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);
        vWorld=w.xyz;vNormal=normal;vec4 p=viewMatrix*w;vDepth=length(p.xyz);
        gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 vWorld,vNormal;varying float vDepth;
      uniform float uDensity,uFade;uniform vec3 uFog;
      void main(){
        vec2 grid=vec2(abs(vNormal.x)>.5?vWorld.z:vWorld.x,vWorld.y)/vec2(3.6,3.2);
        vec2 cell=floor(grid),f=fract(grid),aa=max(fwidth(grid),vec2(.001));
        vec2 window=smoothstep(vec2(.18)-aa,vec2(.18)+aa,f)*(1.-smoothstep(vec2(.72)-aa,vec2(.72)+aa,f));
        float seed=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
        float lit=step(.43,seed)*window.x*window.y*(1.-abs(vNormal.y));
        // Subpixel windows average out rather than sparkling at the city edge.
        lit*=1.-smoothstep(.5,1.8,max(aa.x,aa.y));
        vec3 c=vec3(.009,.014,.023)+lit*mix(vec3(.7,.31,.085),vec3(.8,.87,1.),step(.89,seed));
        float fog=1.-exp(-uDensity*uDensity*vDepth*vDepth);
        gl_FragColor=vec4(mix(c,uFog,fog)*uFade,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }),blocks.length);
  buildings.name='plank-city-buildings';
  const dummy=new THREE.Object3D();
  blocks.forEach(([x,y,z,w,h,d],i)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();buildings.setMatrixAt(i,dummy.matrix);});
  buildings.computeBoundingSphere();group.add(buildings);

  // One GPU-animated Points draw: straight lanes halfway between building rows.
  const count=1800,positions=new Float32Array(count*3),routes=new Float32Array(count*4);
  for(let i=0;i<count;i++) {
    const lane=Math.floor(rand()*29)-14,direction=i%2?1:-1;
    routes.set([lane*70+35+direction*3,rand()*2800,8+rand()*15,direction],i*4);
    positions[i*3]=i%4<2?0:1;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aRoute',new THREE.BufferAttribute(routes,4));
  const trafficUniforms={...air.uniforms,uProjection:{value:700}};
  const traffic=new THREE.Points(geometry,new THREE.ShaderMaterial({
    uniforms:trafficUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec4 aRoute;uniform float uTime,uProjection;
      varying float vDepth,vDirection,vEdge;
      void main(){float along=mod(aRoute.y+uTime*aRoute.z*aRoute.w,2800.)-1400.;
        vec3 w=position.x<.5?vec3(aRoute.x,-329.,along):vec3(along,-329.,aRoute.x);
        vEdge=1.-smoothstep(1350.,1480.,length(w.xz));
        vec4 p=modelViewMatrix*vec4(w,1.);vDepth=length(p.xyz);vDirection=aRoute.w;
        gl_PointSize=clamp(2.8*uProjection/max(1.,-p.z),1.,18.);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform float uFade,uDensity;varying float vDepth,vDirection,vEdge;
      void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
        float a=exp(-r*r*4.)*(1.-r)*exp(-uDensity*uDensity*vDepth*vDepth);
        vec3 c=vDirection>0.?vec3(1.,.84,.48):vec3(1.,.035,.008);
        gl_FragColor=vec4(c*2.,a*uFade*vEdge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  traffic.name='plank-city-traffic';traffic.frustumCulled=false;traffic.renderOrder=-6;
  const viewport=new THREE.Vector4();
  traffic.onBeforeRender=(renderer,scene,camera)=>{renderer.getCurrentViewport(viewport);trafficUniforms.uProjection.value=viewport.w*camera.projectionMatrix.elements[5]*.5;};
  group.add(traffic);
  const clouds=[-120,-65].map((y,i)=>{
    const cloud=veil(group,air,{width:850,height:850,color:0x253449,opacity:i?.24:.48,noiseScale:9});
    cloud.name='plank-cloud';cloud.rotation.x=-Math.PI/2;cloud.position.set(0,y,-80);
    cloud.renderOrder=-4+i;return cloud;
  });
  return {update(t){clouds.forEach((c,i)=>{c.position.x=Math.sin(t*.008+i)*75;c.position.z=-80+Math.cos(t*.006+i)*50;});}};
}

// Uses Sound's tracked sources, so stopping/restarting also closes these nodes.
export function plankStadsGeluid(audio) {
  if(!audio.ctx)return {update(){}}; // CPU scene checks have no AudioContext.
  const c=audio.ctx,rumble=audio.noise(25,-330,-40,520);
  rumble.p.refDistance=120;
  const osc=c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain(),p=audio.spatial(-80,-330,-90);
  osc.type='triangle';filter.type='lowpass';filter.frequency.value=650;p.refDistance=120;gain.gain.value=0;
  osc.connect(filter).connect(gain).connect(p);audio.track(osc,[filter,gain,p]);osc.start();
  return {update(t){
    const level=smooth(58,65,t)*(1-smooth(130,145,t));
    audio.set(rumble.gain,.055*level*(.85+.15*Math.sin(t*.43)));
    const phase=(t-71+32)%32,envelope=smooth(0,2,phase)*(1-smooth(6,9,phase));
    audio.set(gain,.012*level*envelope);
    osc.frequency.setTargetAtTime(430+120*Math.sin(t*2.8),c.currentTime,.08);
  }};
}
