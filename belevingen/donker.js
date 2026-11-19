import * as THREE from 'three';
import {plane} from '../gedeeld/util.js';

// Image deliberately unchanged from round 1.
export function donker({scene}) {
  const group=new THREE.Group();
  scene.background=new THREE.Color(0);scene.fog=null;
  const dot=plane(group,.008,.008,0xb2a99a,0,1.65,-4);
  return {group,update(t){dot.visible=t<10;}};
}
