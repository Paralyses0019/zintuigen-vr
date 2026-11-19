import * as THREE from 'three';
import {random} from './util.js';

// Custom materials need the same display conversion as three.js built-in materials.
function displayOutput(fragment) {
  const end=fragment.lastIndexOf('}');
  return fragment.slice(0,end)+'\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n'+fragment.slice(end);
}

// Shared time/fade uniforms: no render targets, textures or post-processing.
const noise = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}`;
const vertex = `varying vec2 vUv; varying vec3 vLocal; varying float vDepth;
void main(){vUv=uv; vLocal=position; vec4 p=modelViewMatrix*vec4(position,1.0);
vDepth=length(p.xyz); gl_Position=projectionMatrix*p;}`;

export function atmosphere(scene, group, {top=0x030b20, horizon=0x344758, density=.025, ar=false}={}) {
  const uniforms = {
    uTime:{value:0}, uFade:{value:1}, uFlash:{value:0},
    uTop:{value:new THREE.Color(top)}, uHorizon:{value:new THREE.Color(horizon)},
    uFog:{value:new THREE.Color(horizon)}, uDensity:{value:density}
  };
  scene.background = null;
  scene.fog = new THREE.FogExp2(horizon, density);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450,32,16), new THREE.ShaderMaterial({
    uniforms, vertexShader:vertex, side:THREE.BackSide, depthWrite:false,
    transparent:ar,
    fragmentShader:displayOutput(`varying vec3 vLocal; uniform float uTime,uFade,uFlash;
      uniform vec3 uTop,uHorizon; ${noise}
      void main(){vec3 d=normalize(vLocal); float h=smoothstep(-.12,.8,d.y);
        float n=noise(d.xz*5.0+uTime*.008)+.5*noise(d.xz*11.0-uTime*.005);
        vec3 c=mix(uHorizon,uTop,h)*(0.85+.15*n);
        c+=uFlash*vec3(.25,.32,.42)*pow(1.0-abs(d.y),3.0);
        gl_FragColor=vec4(c*uFade,${ar ? '.15*uFade' : '1.0'});}`)
  }));
  sky.renderOrder=-20;
  group.add(sky);
  return {uniforms, update(t, fade=1) {
    uniforms.uTime.value=t; uniforms.uFade.value=fade;
    scene.fog.color.copy(uniforms.uFog.value).multiplyScalar(fade);
  }};
}

// Radial alpha is evaluated per fragment, so even distant points have no square corners.
// Projection scale is updated from the actual per-eye viewport, including in XR.
export function particles(group, atmosphere, count, {color=0xffc680, size=.08, bounds=[8,4,8], seed=1337}={}) {
  const rand=random(seed), positions=new Float32Array(count*3), sizes=new Float32Array(count), phases=new Float32Array(count);
  for(let i=0;i<count;i++) {
    positions.set([(rand()-.5)*bounds[0],rand()*bounds[1],(rand()-.5)*bounds[2]],i*3);
    sizes[i]=size*(.45+rand()*1.1); phases[i]=rand()*Math.PI*2;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
  geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
  const uniforms={...atmosphere.uniforms,uColor:{value:new THREE.Color(color)},uOpacity:{value:1},uProjection:{value:700},uTwinkle:{value:1}};
  const material=new THREE.ShaderMaterial({uniforms, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:`attribute float aSize,aPhase; uniform float uProjection,uTime,uTwinkle;
      varying float vLight,vDepth;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.0); vDepth=length(p.xyz);
      float pulse=.5+.5*sin(uTime*(.65+.18*sin(aPhase))+aPhase+sin(uTime*.21+aPhase));
      vLight=mix(.85,.18+.82*pow(pulse,2.0),uTwinkle);
      gl_PointSize=clamp(aSize*uProjection/max(.15,-p.z),1.0,96.0);
      gl_Position=projectionMatrix*p;}`,
    fragmentShader:displayOutput(`uniform vec3 uColor; uniform float uOpacity,uFade,uDensity;
      varying float vLight,vDepth;
      void main(){float r=length(gl_PointCoord-.5)*2.0; if(r>=1.0)discard;
      float halo=exp(-r*r*5.5)*pow(1.0-r,1.3);
      float core=exp(-r*r*90.0);
      float fog=exp(-uDensity*uDensity*vDepth*vDepth);
      gl_FragColor=vec4(mix(uColor,vec3(1.0,.94,.78),core*.7),
        (halo*.65+core*.6)*vLight*uOpacity*uFade*fog);}`)
  });
  const points=new THREE.Points(geometry,material), viewport=new THREE.Vector4();
  points.frustumCulled=false;
  points.onBeforeRender=(renderer,scene,camera)=>{
    renderer.getCurrentViewport(viewport);
    uniforms.uProjection.value=viewport.w*camera.projectionMatrix.elements[5]*.5;
  };
  group.add(points);
  return {points,positions,base:positions.slice(),phases,uniforms,geometry};
}

// A thin noise veil, with all four edges feathered; used for clouds, ground and light ribbons.
export function veil(group, atmosphere, {width=10,height=10,color=0xffffff,opacity=.2,noiseScale=3,additive=false}={}) {
  const uniforms={...atmosphere.uniforms,uColor:{value:new THREE.Color(color)},uOpacity:{value:opacity},uNoise:{value:noiseScale}};
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.ShaderMaterial({
    uniforms,vertexShader:vertex,side:THREE.DoubleSide,transparent:true,depthWrite:false,
    blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
    fragmentShader:displayOutput(`varying vec2 vUv; varying float vDepth;
    uniform vec3 uColor,uFog; uniform float uOpacity,uTime,uFade,uDensity,uNoise; ${noise}
    void main(){vec2 edge=smoothstep(vec2(0),vec2(.18),vUv)*(1.0-smoothstep(vec2(.82),vec2(1),vUv));
      float n=noise(vUv*uNoise+vec2(uTime*.018,-uTime*.009));
      n=.65*n+.35*noise(vUv*uNoise*2.1-uTime*.012);
      float fog=1.0-exp(-uDensity*uDensity*vDepth*vDepth);
      gl_FragColor=vec4(mix(uColor,uFog,fog)*uFade,edge.x*edge.y*(.25+.75*n)*uOpacity*uFade);}`)
  }));
  group.add(mesh);
  return mesh;
}

export function dome(group, atmosphere) {
  const uniforms={...atmosphere.uniforms,uOpacity:{value:0},uColor:{value:new THREE.Color(0xffb456)}};
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),new THREE.ShaderMaterial({
    uniforms, vertexShader:`varying vec2 vUv; varying vec3 vLocal,vNormal,vView;
      void main(){vUv=uv;vLocal=position;
        vec4 p=modelViewMatrix*vec4(position,1.0);
        vNormal=normalize(normalMatrix*normal);vView=-p.xyz;
        gl_Position=projectionMatrix*p;}`,
    side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    fragmentShader:displayOutput(`varying vec2 vUv; varying vec3 vLocal,vNormal,vView;
      uniform vec3 uColor; uniform float uTime,uOpacity,uFade;
      void main(){
        float fresnel=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),3.0);
        // Antialiased meridians and two latitude rings, no filled shell.
        vec2 grid=vUv*vec2(16.0,6.0);
        vec2 distanceToLine=abs(fract(grid+.5)-.5);
        vec2 aa=max(fwidth(grid),vec2(.001));
        vec2 lines=1.0-smoothstep(aa*.35,aa*1.35,distanceToLine);
        float ribs=lines.x*(1.0-smoothstep(.88,1.0,vUv.y));
        float rings=lines.y*(1.0-smoothstep(.72,.85,vUv.y));
        float foot=1.0-smoothstep(.0,.035,vLocal.y);
        float light=max(ribs*.55,max(rings*.22,foot*.35));
        float breath=.94+.06*sin(uTime*.55);
        gl_FragColor=vec4(uColor,(light+fresnel*.16)*breath*uOpacity*uFade);}`)
  }));
  group.add(mesh);
  return mesh;
}

export function rain(group, atmosphere, count=1100) {
  const rand=random(725), positions=new Float32Array(count*6), phases=new Float32Array(count*2), ends=new Float32Array(count*2);
  for(let i=0;i<count;i++) {
    let x=(rand()-.5)*24,z=(rand()-.5)*24;
    // Keep the sheltered footprint clear; distant and overhead rain remain visible.
    // Rain can reach the player until the roof forms.
    const y=rand()*13,phase=rand()*13;
    positions.set([x,y,z,x+.055,y+.38+rand()*.35,z],i*6);
    phases.set([phase,phase],i*2); ends.set([0,1],i*2);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
  geometry.setAttribute('aEnd',new THREE.BufferAttribute(ends,1));
  const uniforms={...atmosphere.uniforms,uOpacity:{value:0},uShelter:{value:0}};
  const lines=new THREE.LineSegments(geometry,new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float aPhase,aEnd; uniform float uTime,uShelter; varying float vAlpha,vDepth;
      void main(){vec3 p=position; p.y=mod(aPhase-uTime*6.2,13.0)-1.0+aEnd*.55;
      p.x+=sin(uTime*.23)*.3; vec4 mv=modelViewMatrix*vec4(p,1);
      vDepth=length(mv.xyz);vAlpha=mix(.85,.08,aEnd);
      if(p.y<0.0 || (uShelter>.8 && abs(p.x)<.9 && p.z> -.8 && p.z<.9 && p.y<2.5))vAlpha=0.0;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:displayOutput(`uniform float uOpacity,uFade,uDensity;varying float vAlpha,vDepth;
      void main(){float fog=exp(-uDensity*uDensity*vDepth*vDepth);
      gl_FragColor=vec4(.48,.66,.79,vAlpha*uOpacity*uFade*fog);}`)
  }));
  lines.frustumCulled=false;group.add(lines);return uniforms;
}

// World-sized billboards avoid the hardware size limit of GL_POINTS.
export function warmCore(group) {
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.15,'rgba(255,255,255,.8)');
  gradient.addColorStop(.45,'rgba(255,255,255,.2)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const layers=[[2.5,0xff660d,.16],[1.25,0xff9a2e,.32],[.48,0xffbd60,.75],[.14,0xffefd0,1]];
  const sprites=layers.map(([size,color,opacity])=>{
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color,
      blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:0}));
    sprite.position.set(0,.95,-1.5);sprite.scale.set(size,size,1);group.add(sprite);
    return {sprite,size,opacity};
  });
  return {update(t,fade) {
    const lit=t>=75?fade:0,breath=.96+.04*Math.sin(t*1.7);
    for(const {sprite,size,opacity} of sprites) {
      sprite.material.opacity=opacity*lit*breath;
      sprite.scale.set(size*breath,size*breath,1);
    }
  }};
}
