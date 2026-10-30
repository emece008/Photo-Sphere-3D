/**
 * Photo Sphere Studio 3D - Efectos
 * SphereFX: efectos configurables por esfera (halo, cola de cometa, chispas y haces de púlsar).
 */

import { ParticleEmitter, getGlowTexture, hexToRgb } from './Particles.js';
import { AsteroidRing, createDefaultRing } from './AsteroidRing.js';

export function createDefaultFx() {
  return {
    rings: createDefaultRing(),
    aura: { on: false, color: '#7dd3fc', size: 2.8, intensity: 0.7, pulse: false, speed: 3 },
    tail: { on: false, color: '#7dd3fc', length: 4, density: 70, size: 1, follow: true, life: 1, spread: 1, gradient: false, color2: '#3b6fd8' },
    sparks: { on: false, color: '#fde68a', rate: 25, size: 1, life: 1, speed: 1 },
    beams: { on: false, color: '#67e8f9', length: 7, tilt: 35, width: 0.3, opacity: 0.4, sweep: 0 }
  };
}

/** Mezcla una configuración parcial sobre los valores por defecto. */
export function mergeFx(partial) {
  const fx = createDefaultFx();
  if (partial) {
    for (const key of Object.keys(fx)) {
      if (partial[key]) Object.assign(fx[key], partial[key]);
    }
  }
  return fx;
}

export function anyFxOn(fx) {
  return !!fx && Object.values(fx).some(e => e && e.on);
}

export const FX_PRESETS = {
  none: {},
  comet: { tail: { on: true, color: '#9bd8ff', length: 5, density: 150, size: 1 }, aura: { on: true, color: '#9bd8ff', size: 2.2, intensity: 0.45, pulse: false } },
  glow: { aura: { on: true, color: '#fbbf24', size: 3.2, intensity: 0.75, pulse: true } },
  sparkle: { sparks: { on: true, color: '#fde68a', rate: 40, size: 1 }, aura: { on: true, color: '#fde68a', size: 2.2, intensity: 0.4, pulse: true } },
  pulsar: { beams: { on: true, color: '#67e8f9', length: 9, tilt: 35 }, aura: { on: true, color: '#67e8f9', size: 2.6, intensity: 0.7, pulse: true } }
};

const tmp = [0, 0, 0];

export class SphereFXRig {
  constructor(THREE, sphere, scene) {
    this.THREE = THREE;
    this.sphere = sphere;
    this.scene = scene;
    this.time = Math.random() * 10;
    this.accTail = 0;
    this.accSparks = 0;
    this.aura = null;
    this.beams = null;
    this.ring = null;
    this.tail = null;
    this.sparks = null;
    this.sync();
  }

  sync() {
    const { THREE } = this;
    const s = this.sphere;
    const fx = s.fx;
    const mesh = s.mesh;

    this.clearAura();
    this.clearBeams();

    if (fx.aura.on) {
      const mat = new THREE.SpriteMaterial({
        map: getGlowTexture(THREE),
        color: new THREE.Color(fx.aura.color),
        transparent: true,
        opacity: fx.aura.intensity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.aura = new THREE.Sprite(mat);
      this.aura.raycast = () => {};
      this.aura.renderOrder = 4;
      this.aura.scale.setScalar(s.radius * 2 * fx.aura.size);
      mesh.add(this.aura);
    }

    if (fx.beams.on) {
      const len = s.radius * fx.beams.length;
      const base = s.radius * fx.beams.width;
      const col = new THREE.Color(fx.beams.color);
      const group = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const g = new THREE.ConeGeometry(base, len, 24, 1, true);
        g.rotateX(Math.PI);
        g.translate(0, len / 2, 0);
        const colors = [];
        const p = g.attributes.position;
        for (let v = 0; v < p.count; v++) {
          const k = 1 - p.getY(v) / len;
          colors.push(col.r * k, col.g * k, col.b * k);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: fx.beams.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        }));
        m.raycast = () => {};
        if (i === 1) m.rotation.z = Math.PI;
        group.add(m);
      }
      group.rotation.order = 'YXZ';
      group.rotation.x = THREE.MathUtils.degToRad(fx.beams.tilt);
      this.beamAngle = this.beamAngle || 0;
      group.rotation.y = this.beamAngle;
      this.beams = group;
      mesh.add(group);
    }

    if (fx.rings.on) {
      if (!this.ring) {
        this.ring = new AsteroidRing(THREE, this.scene);
        this.ring.group.position.copy(mesh.position);
      }
      this.ring.configure(fx.rings, s.radius, s.radius);
    } else {
      this.clearRing();
    }

    if (fx.tail.on && !this.tail) this.tail = new ParticleEmitter(THREE, this.scene, 3000);
    if (fx.sparks.on && !this.sparks) this.sparks = new ParticleEmitter(THREE, this.scene, 900);
  }

  clearAura() {
    if (!this.aura) return;
    this.sphere.mesh.remove(this.aura);
    this.aura.material.dispose();
    this.aura = null;
  }

  clearRing() {
    if (!this.ring) return;
    this.ring.dispose();
    this.ring = null;
  }

  clearBeams() {
    if (!this.beams) return;
    this.sphere.mesh.remove(this.beams);
    this.beams.children.forEach(m => {
      m.geometry.dispose();
      m.material.dispose();
    });
    this.beams = null;
  }

  update(dt, scale, spheres) {
    const s = this.sphere;
    const fx = s.fx;
    if (!s.mesh) return;
    this.time += dt;
    const pos = s.mesh.position;

    if (this.aura) {
      const w = this.time * fx.aura.speed;
      const pulse = fx.aura.pulse ? 0.75 + 0.25 * Math.sin(w) : 1;
      this.aura.material.opacity = fx.aura.intensity * pulse;
      this.aura.scale.setScalar(s.radius * 2 * fx.aura.size * (fx.aura.pulse ? 0.96 + 0.04 * Math.sin(w) : 1));
    }

    if (this.ring) {
      this.ring.group.position.copy(pos);
      this.ring.update(dt);
    }

    if (this.beams && fx.beams.sweep) {
      this.beamAngle += fx.beams.sweep * dt;
      this.beams.rotation.y = this.beamAngle;
    }

    if (fx.tail.on && this.tail && dt > 0) {
      // Por defecto la cola va detrás de la esfera, en sentido contrario a su movimiento real
      let dx = 1, dy = 0.25, dz = 0;
      const lp = this.lastPos;
      let moving = false;
      if (fx.tail.follow && lp) {
        const vx = pos.x - lp[0], vy = pos.y - lp[1], vz = pos.z - lp[2];
        const vl = Math.hypot(vx, vy, vz);
        if (vl / dt > 0.5) {
          moving = true;
          dx = -vx / vl; dy = -vy / vl; dz = -vz / vl;
        }
      }
      if (fx.tail.follow) {
        if (moving) {
          if (!this.tailDir) this.tailDir = [dx, dy, dz];
          const k = Math.min(1, dt * 8);
          const d = this.tailDir;
          d[0] += (dx - d[0]) * k; d[1] += (dy - d[1]) * k; d[2] += (dz - d[2]) * k;
        }
        if (this.tailDir) {
          const l = Math.hypot(...this.tailDir) || 1;
          dx = this.tailDir[0] / l; dy = this.tailDir[1] / l; dz = this.tailDir[2] / l;
        } else {
          dx = 1; dy = 0.25; dz = 0;
        }
      } else {
        const par = s.parentId ? spheres.find(o => o.id === s.parentId) : null;
        if (par && par.mesh) {
          dx = pos.x - par.mesh.position.x;
          dy = pos.y - par.mesh.position.y;
          dz = pos.z - par.mesh.position.z;
        }
        const l = Math.hypot(dx, dy, dz) || 1;
        dx /= l; dy /= l; dz /= l;
      }
      const speed = s.radius * fx.tail.length * 0.8 / fx.tail.life;
      const rgb = hexToRgb(fx.tail.color);
      const rgb2 = fx.tail.gradient ? hexToRgb(fx.tail.color2) : null;
      this.accTail += fx.tail.density * dt;
      const tsize = s.radius * 0.45 * fx.tail.size;
      const moved = lp ? Math.hypot(pos.x - lp[0], pos.y - lp[1], pos.z - lp[2]) : 0;
      let n = Math.min(Math.max(Math.floor(this.accTail), Math.ceil(moved / (tsize * 0.6))), 60);
      const total = n;
      this.accTail -= Math.floor(this.accTail);
      while (n-- > 0) {
        const j = s.radius * 0.3 * fx.tail.spread;
        const f = lp && total > 1 ? n / total : 0;
        const bx = pos.x - (pos.x - (lp ? lp[0] : pos.x)) * f;
        const by = pos.y - (pos.y - (lp ? lp[1] : pos.y)) * f;
        const bz = pos.z - (pos.z - (lp ? lp[2] : pos.z)) * f;
        tmp[0] = bx + dx * s.radius * 0.9 + (Math.random() - 0.5) * j;
        tmp[1] = by + dy * s.radius * 0.9 + (Math.random() - 0.5) * j;
        tmp[2] = bz + dz * s.radius * 0.9 + (Math.random() - 0.5) * j;
        const sp = speed * (0.8 + Math.random() * 0.4);
        const jit = sp * 0.08 * fx.tail.spread;
        this.tail.spawn(
          tmp,
          [dx * sp + (Math.random() - 0.5) * jit, dy * sp + (Math.random() - 0.5) * jit, dz * sp + (Math.random() - 0.5) * jit],
          (1.6 + Math.random() * 0.6) * fx.tail.life,
          rgb,
          tsize,
          0.45,
          rgb2
        );
      }
    }
    this.lastPos = [pos.x, pos.y, pos.z];

    if (fx.sparks.on && this.sparks && dt > 0) {
      const rgb = hexToRgb(fx.sparks.color);
      this.accSparks += fx.sparks.rate * dt;
      let n = Math.min(Math.floor(this.accSparks), 30);
      this.accSparks -= Math.floor(this.accSparks);
      while (n-- > 0) {
        const u = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const ux = r * Math.cos(a), uy = u, uz = r * Math.sin(a);
        tmp[0] = pos.x + ux * s.radius * 1.02;
        tmp[1] = pos.y + uy * s.radius * 1.02;
        tmp[2] = pos.z + uz * s.radius * 1.02;
        const sp = s.radius * (0.35 + Math.random() * 0.6) * fx.sparks.speed;
        this.sparks.spawn(tmp, [ux * sp, uy * sp, uz * sp], (1.2 + Math.random() * 0.8) * fx.sparks.life, rgb, s.radius * 0.11 * fx.sparks.size, 0.3);
      }
    }

    if (this.tail) {
      this.tail.update(dt, scale);
      if (!fx.tail.on && this.tail.alive === 0) { this.tail.dispose(); this.tail = null; }
    }
    if (this.sparks) {
      this.sparks.update(dt, scale);
      if (!fx.sparks.on && this.sparks.alive === 0) { this.sparks.dispose(); this.sparks = null; }
    }
  }

  get idle() {
    return !anyFxOn(this.sphere.fx) && !this.tail && !this.sparks;
  }

  dispose() {
    this.clearAura();
    this.clearBeams();
    this.clearRing();
    if (this.tail) this.tail.dispose();
    if (this.sparks) this.sparks.dispose();
    this.tail = this.sparks = null;
  }
}
