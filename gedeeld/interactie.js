import * as THREE from 'three';

// Anchors are expressed in scene coordinates. The lamp uses the top of its handle.
export function interactions(hands,audio) {
  const targets=[];
  function add(object,material,{height=0,floor=0,onGrab,onRelease,gravity=false,fixed=false}={}) {
    const target={object,material,height,floor,onGrab,onRelease,gravity,fixed,
      anchor:new THREE.Vector3(),holder:null,near:false,touch:false,velocity:0,enabled:true};
    targets.push(target);
    return target;
  }
  function update(dt) {
    const hs=hands();
    for(const a of targets)a.anchor.copy(a.object.position).y+=a.height;
    for(const h of hs) {
      if(!h.nearest)continue;
      const candidates=targets.filter(a=>a.enabled&&!a.holder);
      candidates.sort((a,b)=>h.position.distanceToSquared(a.anchor)-h.position.distanceToSquared(b.anchor));
      if(candidates.length)h.position.copy(candidates[0].anchor);
      h.nearest=false;
    }
    for(const a of targets) {
      if(!a.enabled){a.holder=null;a.near=a.touch=false;continue;}
      const closest=hs.reduce((best,h)=>!best||h.position.distanceToSquared(a.anchor)<best.position.distanceToSquared(a.anchor)?h:best,null);
      const distance=closest?closest.position.distanceTo(a.anchor):Infinity;
      if(distance<=.3&&!a.near)audio.tap(a.anchor,.045);
      a.near=distance<=.3;
      a.material.emissive.setHex(a.near?0xffc675:0);
      a.material.emissiveIntensity=.25;
      if(distance<=.055&&!a.touch){audio.tap(a.anchor);closest.pulse?.();}
      a.touch=distance<=.055;
      if(a.holder&&(!hs.includes(a.holder)||!a.holder.pinch)){
        a.holder=null;a.velocity=0;a.onRelease?.();
      }
      if(!a.holder){
        const h=hs.find(h=>h.pinch&&h.position.distanceTo(a.anchor)<=.2&&!targets.some(other=>other.holder===h));
        if(h){a.holder=h;audio.tap(a.anchor,.12);h.pulse?.();a.onGrab?.(h);}
      }
      if(a.holder&&!a.fixed){a.object.position.copy(a.holder.position);a.object.position.y=Math.max(a.floor,a.object.position.y-a.height);}
      else if(a.gravity&&a.object.position.y>a.floor){
        a.velocity+=dt*3;
        a.object.position.y=Math.max(a.floor,a.object.position.y-dt*a.velocity);
        if(a.object.position.y===a.floor)audio.tap(a.object.position,.06);
      }
    }
  }
  return {add,update};
}
