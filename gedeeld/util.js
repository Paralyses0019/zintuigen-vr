import * as THREE from 'three';

export const clamp = (x) => Math.max(0, Math.min(1, x));
export function smooth(a, b, t) {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}
export function random(seed = 1337) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function plane(group, w, h, color, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({color, side: THREE.DoubleSide}));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  group.add(mesh);
  return mesh;
}
export function dispose(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of o.material ? [].concat(o.material) : []) {
      materials.add(m);
      for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
    }
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  textures.forEach(t => t.dispose());
}
