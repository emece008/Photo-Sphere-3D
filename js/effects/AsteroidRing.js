/**
 * Photo Sphere Studio 3D - Efectos
 * Anillo / cinturón de asteroides con rocas instanciadas y polvo fino, asignable a cualquier esfera (SphereFX).
 */

import { getGlowTexture } from './Particles.js';

export const RING_MAX = 3000;
export const DUST_MAX = 6000;

/** Anillo alrededor de una esfera: inner/width son múltiplos de su radio. */
export function createDefaultRing() {
  return {
    on: false, inner: 1.9, width: 1.4, count: 700, size: 1, sizeVar: 0.7, thickness: 0.2,
    dust: 800, dustSize: 1, gaps: 0, tilt: 20, node: 0, speed: 1, tumble: 1,
    color: '#a8a29e', color2: '#5c5046', colorVar: 0.5
  };
}

/** Estilos rápidos; no tocan tamaño, inclinación ni velocidad. */
export const RING_PRESETS = {
  asteroids: { color: '#a8a29e', color2: '#5c5046', colorVar: 0.6, count: 900, size: 1.3, sizeVar: 0.85, thickness: 0.45, dust: 300, dustSize: 1, gaps: 0, tumble: 1.2 },
  saturn: { color: '#eadbb8', color2: '#b99d6b', colorVar: 0.35, count: 250, size: 0.45, sizeVar: 0.5, thickness: 0.03, dust: 5000, dustSize: 0.8, gaps: 2, tumble: 0.5 },
  ice: { color: '#d9eeff', color2: '#7fb2e5', colorVar: 0.4, count: 500, size: 0.7, sizeVar: 0.7, thickness: 0.08, dust: 3500, dustSize: 0.9, gaps: 1, tumble: 0.7 },
  ember: { color: '#ffa04d', color2: '#7a2410', colorVar: 0.7, count: 700, size: 1, sizeVar: 0.8, thickness: 0.3, dust: 2500, dustSize: 1.1, gaps: 0, tumble: 1.5 }
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GAP_WIDTH = 0.045;

/** Reparte u (0..1) en el ancho del anillo dejando huecos tipo división de Cassini. */
function radialPos(u, gaps) {
  if (!gaps) return u;
  const L = 1 - gaps * GAP_WIDTH;
  const v = u * L;
  let shift = 0;
  for (let k = 0; k < gaps; k++) if (v >= ((k + 1) / (gaps + 1)) * L) shift += GAP_WIDTH;
  return v + shift;
}

function rockGeometry(THREE) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const k = 0.78 + 0.42 * (h - Math.floor(h));
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export class AsteroidRing {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.cfg = null;
    this.dirty = true;
    this.tumble = 1;

    const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
    const N = RING_MAX, M = DUST_MAX;
    this.seed = {
      u: new Float32Array(N), a: new Float32Array(N), g: new Float32Array(N), s: new Float32Array(N),
      c: new Float32Array(N), b: new Float32Array(N), ax: new Float32Array(N * 3), tr: new Float32Array(N),
      sh: new Float32Array(N * 3)
    };
    const sd = this.seed;
    for (let i = 0; i < N; i++) {
      sd.u[i] = rnd(); sd.a[i] = rnd() * Math.PI * 2;
      sd.g[i] = (rnd() + rnd() + rnd() - 1.5) / 1.5;
      sd.s[i] = rnd(); sd.c[i] = rnd(); sd.b[i] = rnd();
      const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      sd.ax[i * 3] = r * Math.cos(t); sd.ax[i * 3 + 1] = z; sd.ax[i * 3 + 2] = r * Math.sin(t);
      sd.tr[i] = (0.3 + rnd() * 1.2) * (rnd() < 0.5 ? -1 : 1);
      sd.sh[i * 3] = 0.7 + rnd() * 0.6; sd.sh[i * 3 + 1] = 0.6 + rnd() * 0.5; sd.sh[i * 3 + 2] = 0.7 + rnd() * 0.6;
    }
    this.dSeed = { u: new Float32Array(M), a: new Float32Array(M), g: new Float32Array(M), c: new Float32Array(M), b: new Float32Array(M) };
    const ds = this.dSeed;
    for (let i = 0; i < M; i++) {
      ds.u[i] = rnd(); ds.a[i] = rnd() * Math.PI * 2;
      ds.g[i] = (rnd() + rnd() + rnd() - 1.5) / 1.5;
      ds.c[i] = rnd(); ds.b[i] = rnd();
    }

    // Estado dinámico por roca / partícula de polvo
    this.ang = Float32Array.from(sd.a);
    this.rad = new Float32Array(N);
    this.yoff = new Float32Array(N);
    this.om = new Float32Array(N);
    this.size = new Float32Array(N);
    this.phase = new Float32Array(N);
    this.dAng = Float32Array.from(ds.a);
    this.dRad = new Float32Array(M);
    this.dY = new Float32Array(M);
    this.dOm = new Float32Array(M);
    this.n = 0;
    this.dn = 0;

    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';

    this.geometry = rockGeometry(THREE);
    this.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.05, flatShading: true });
    this.rocks = new THREE.InstancedMesh(this.geometry, this.material, N);
    this.rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rocks.setColorAt(0, new THREE.Color(1, 1, 1));
    this.rocks.frustumCulled = false;
    this.rocks.raycast = () => {};
    this.rocks.count = 0;

    this.dustGeo = new THREE.BufferGeometry();
    this.dustPos = new Float32Array(M * 3);
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.dustGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    this.dustMat = new THREE.PointsMaterial({
      map: getGlowTexture(THREE), size: 1, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: 0.9, depthWrite: false
    });
    this.dust = new THREE.Points(this.dustGeo, this.dustMat);
    this.dust.frustumCulled = false;
    this.dust.raycast = () => {};
    this.dust.renderOrder = 2;
    this.dustGeo.setDrawRange(0, 0);

    this.group.add(this.rocks, this.dust);
    scene.add(this.group);

    this.tmpM = new THREE.Matrix4();
    this.tmpP = new THREE.Vector3();
    this.tmpQ = new THREE.Quaternion();
    this.tmpS = new THREE.Vector3();
    this.tmpA = new THREE.Vector3();
    this.tmpC = new THREE.Color();
    this.tmpC2 = new THREE.Color();
  }

  /**
   * @param {Object} cfg - configuración del anillo
   * @param {number} unit - factor aplicado a inner/width (radio de la esfera, o 1 en el escenario)
   * @param {number} sizeUnit - tamaño de referencia de las rocas
   */
  configure(cfg, unit, sizeUnit) {
    const sd = this.seed, ds = this.dSeed;
    this.cfg = cfg;
    this.tumble = cfg.tumble;
    const inner = cfg.inner * unit;
    const width = Math.max(cfg.width * unit, 0.001);
    const vert = cfg.thickness * width * 0.5;
    const gaps = Math.round(cfg.gaps);
    const omBase = 0.15 * cfg.speed;
    const rock = sizeUnit * 0.04 * cfg.size;
    const n = this.n = Math.min(Math.round(cfg.count), RING_MAX);
    const dn = this.dn = Math.min(Math.round(cfg.dust), DUST_MAX);
    const c1 = this.tmpC.set(cfg.color), c2 = this.tmpC2.set(cfg.color2);
    const col = new this.THREE.Color();
    const cv = cfg.colorVar;

    for (let i = 0; i < n; i++) {
      const r = inner + radialPos(sd.u[i], gaps) * width;
      this.rad[i] = r;
      this.yoff[i] = sd.g[i] * vert;
      this.om[i] = omBase * Math.pow(Math.max(inner, 0.001) / r, 1.5);
      this.size[i] = rock * (1 - cfg.sizeVar * 0.8 + cfg.sizeVar * 1.6 * sd.s[i] * sd.s[i] * sd.s[i]);
      col.copy(c1).lerp(c2, sd.c[i]).multiplyScalar(1 - cv * 0.5 + cv * sd.b[i]);
      this.rocks.setColorAt(i, col);
    }
    this.rocks.count = n;
    if (this.rocks.instanceColor) this.rocks.instanceColor.needsUpdate = true;

    const colors = this.dustGeo.attributes.color.array;
    for (let i = 0; i < dn; i++) {
      const r = inner + radialPos(ds.u[i], gaps) * width;
      this.dRad[i] = r;
      this.dY[i] = ds.g[i] * vert * 0.6;
      this.dOm[i] = omBase * Math.pow(Math.max(inner, 0.001) / r, 1.5);
      col.copy(c1).lerp(c2, ds.c[i]).multiplyScalar((1 - cv * 0.5 + cv * ds.b[i]) * 1.1);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    this.dustGeo.attributes.color.needsUpdate = true;
    this.dustGeo.setDrawRange(0, dn);
    this.dustMat.size = Math.max(sizeUnit * 0.05 * cfg.dustSize, 0.01);
    this.dust.visible = dn > 0;

    this.group.rotation.x = this.THREE.MathUtils.degToRad(cfg.tilt);
    this.group.rotation.y = this.THREE.MathUtils.degToRad(cfg.node);
    this.dirty = true;
  }

  update(dt) {
    if (!this.cfg || (dt === 0 && !this.dirty)) return;
    this.dirty = false;
    const { tmpM, tmpP, tmpQ, tmpS, tmpA } = this;
    const tumble = this.tumble;
    const sd = this.seed;

    for (let i = 0; i < this.n; i++) {
      const a = this.ang[i] += this.om[i] * dt;
      const ph = this.phase[i] += sd.tr[i] * tumble * dt;
      tmpP.set(Math.cos(a) * this.rad[i], this.yoff[i], Math.sin(a) * this.rad[i]);
      tmpA.set(sd.ax[i * 3], sd.ax[i * 3 + 1], sd.ax[i * 3 + 2]);
      tmpQ.setFromAxisAngle(tmpA, ph);
      const s = this.size[i];
      tmpS.set(s * sd.sh[i * 3], s * sd.sh[i * 3 + 1], s * sd.sh[i * 3 + 2]);
      tmpM.compose(tmpP, tmpQ, tmpS);
      this.rocks.setMatrixAt(i, tmpM);
    }
    this.rocks.instanceMatrix.needsUpdate = true;

    const pos = this.dustPos;
    for (let i = 0; i < this.dn; i++) {
      const a = this.dAng[i] += this.dOm[i] * dt;
      pos[i * 3] = Math.cos(a) * this.dRad[i];
      pos[i * 3 + 1] = this.dY[i];
      pos[i * 3 + 2] = Math.sin(a) * this.dRad[i];
    }
    this.dustGeo.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.group);
    this.rocks.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
  }
}
