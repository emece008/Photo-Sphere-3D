/**
 * Photo Sphere Studio 3D - Efectos
 * SceneFX: espectáculos de escenario (lluvia de cometas, nebulosas, supernovas)
 * que se disparan cada cierto tiempo o con el botón "Probar".
 */

import { ParticleEmitter, getGlowTexture, hexToRgb } from './Particles.js';
import { SphereFXRig, anyFxOn } from './SphereFX.js';

export function createDefaultSceneFx() {
  return {
    comets: { on: false, interval: 40, count: 6, color: '#9bd8ff' },
    nebula: { on: false, interval: 60, size: 1, color: '#a855f7' },
    supernova: { on: false, interval: 90, size: 1, color: '#fb923c' }
  };
}

const rand = (a, b) => a + Math.random() * (b - a);

export class SceneFX {
  /**
   * @param {Object} THREE
   * @param {SceneManager} sceneManager
   * @param {Object} config - config global (usa config.sceneFx y config.universeSpeed)
   */
  constructor(THREE, sceneManager, config) {
    this.THREE = THREE;
    this.sm = sceneManager;
    this.config = config;
    if (!config.sceneFx) config.sceneFx = createDefaultSceneFx();

    this.active = [];
    this.trails = new ParticleEmitter(THREE, sceneManager.scene, 3000);
    this.bursts = new ParticleEmitter(THREE, sceneManager.scene, 1500);
    this.timers = {};
    Object.keys(config.sceneFx).forEach(k => this.resetTimer(k));
    this.cloudTextures = [];
    this.size = new THREE.Vector2();
  }

  resetTimer(type) {
    const cfg = this.config.sceneFx[type];
    this.timers[type] = cfg.interval * rand(0.8, 1.2);
  }

  /** Dirección y tamaño de visión actuales de la cámara. */
  view() {
    const cam = this.sm.camera;
    const m = cam.matrixWorld;
    const right = new this.THREE.Vector3().setFromMatrixColumn(m, 0).normalize();
    const up = new this.THREE.Vector3().setFromMatrixColumn(m, 1).normalize();
    const fwd = cam.getWorldDirection(new this.THREE.Vector3());
    const tanH = Math.tan(this.THREE.MathUtils.degToRad(cam.fov / 2));
    return { cam, right, up, fwd, tanH, aspect: cam.aspect };
  }

  trigger(type) {
    const cfg = this.config.sceneFx[type];
    if (!cfg) return;
    const v = this.view();
    if (type === 'comets') this.spawnComets(cfg, v);
    else if (type === 'nebula') this.spawnNebula(cfg, v);
    else if (type === 'supernova') this.spawnSupernova(cfg, v);
  }

  spawnComets(cfg, v) {
    const { THREE } = this;
    const base = hexToRgb(cfg.color);
    const dirSign = Math.random() < 0.5 ? 1 : -1;
    const tilt = rand(0.25, 0.6);
    for (let i = 0; i < cfg.count; i++) {
      const D = rand(500, 1500);
      const halfW = D * v.tanH * v.aspect;
      const halfH = D * v.tanH;
      const startX = -dirSign * halfW * rand(1.05, 1.5);
      const startY = rand(-0.2, 1) * halfH;
      const start = v.cam.position.clone()
        .addScaledVector(v.fwd, D)
        .addScaledVector(v.right, startX)
        .addScaledVector(v.up, startY);
      const dir = v.right.clone().multiplyScalar(dirSign).addScaledVector(v.up, -tilt).normalize();
      const speed = halfW * rand(0.9, 1.5);
      const headSize = D * rand(0.03, 0.05);
      const head = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getGlowTexture(THREE),
        color: new THREE.Color(base[0], base[1], base[2]).lerp(new THREE.Color(1, 1, 1), 0.5),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      head.raycast = () => {};
      head.scale.setScalar(headSize * 2);
      head.position.copy(start);
      head.visible = false;
      this.sm.scene.add(head);

      const comet = {
        delay: i * rand(0.25, 0.7),
        age: 0,
        max: (halfW * 3) / speed,
        pos: start,
        last: start.clone(),
        update: (dt) => {
          if (comet.delay > 0) { comet.delay -= dt; return false; }
          comet.age += dt;
          comet.last.copy(comet.pos);
          comet.pos.addScaledVector(dir, speed * dt);
          head.visible = true;
          head.position.copy(comet.pos);
          const dist = comet.last.distanceTo(comet.pos);
          const step = headSize * 0.35;
          const n = Math.min(Math.ceil(dist / step), 12);
          for (let k = 0; k < n; k++) {
            const f = k / n;
            const p = comet.last.clone().lerp(comet.pos, f);
            this.trails.spawn(
              [p.x + rand(-1, 1) * headSize * 0.15, p.y + rand(-1, 1) * headSize * 0.15, p.z + rand(-1, 1) * headSize * 0.15],
              [0, 0, 0],
              rand(0.9, 1.5),
              base,
              headSize * 0.75,
              0.1
            );
          }
          return comet.age > comet.max;
        },
        dispose: () => {
          this.sm.scene.remove(head);
          head.material.dispose();
        }
      };
      this.active.push(comet);
    }
  }

  getCloudTexture() {
    if (this.cloudTextures.length < 3) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      for (let i = 0; i < 18; i++) {
        const r = rand(14, 40);
        const x = 64 + rand(-30, 30);
        const y = 64 + rand(-30, 30);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${rand(0.15, 0.4)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
      const fade = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, 128, 128);
      this.cloudTextures.push(new this.THREE.CanvasTexture(c));
    }
    return this.cloudTextures[Math.floor(Math.random() * this.cloudTextures.length)];
  }

  placeInView(v, dMin, dMax) {
    const D = rand(dMin, dMax);
    return {
      D,
      pos: v.cam.position.clone()
        .addScaledVector(v.fwd, D)
        .addScaledVector(v.right, rand(-0.5, 0.5) * D * v.tanH * v.aspect)
        .addScaledVector(v.up, rand(-0.45, 0.45) * D * v.tanH)
    };
  }

  spawnNebula(cfg, v) {
    const { THREE } = this;
    const { D, pos } = this.placeInView(v, 1100, 2000);
    const R = D * 0.2 * cfg.size;
    const base = new THREE.Color(cfg.color);
    const duration = 16;
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const hsl = {};
      base.getHSL(hsl);
      const col = new THREE.Color().setHSL((hsl.h + rand(-0.08, 0.08) + 1) % 1, Math.min(1, hsl.s * rand(0.8, 1.1)), Math.min(0.8, hsl.l * rand(0.8, 1.25)));
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.getCloudTexture(),
        color: col,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        rotation: rand(0, Math.PI * 2)
      }));
      sprite.raycast = () => {};
      const off = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(R * 0.6);
      sprite.position.copy(pos).add(off);
      const s0 = R * rand(0.7, 1.3);
      sprite.scale.setScalar(s0);
      sprite.userData = { s0, spin: rand(-0.06, 0.06), peak: rand(0.35, 0.7), off };
      this.sm.scene.add(sprite);
      puffs.push(sprite);
    }
    let age = 0;
    this.active.push({
      update: (dt) => {
        age += dt;
        const t = age / duration;
        const env = Math.sin(Math.PI * Math.min(t, 1));
        puffs.forEach(p => {
          p.material.opacity = p.userData.peak * env;
          p.scale.setScalar(p.userData.s0 * (1 + t * 0.6));
          p.position.copy(pos).addScaledVector(p.userData.off, 1 + t * 0.5);
          p.material.rotation += p.userData.spin * dt;
        });
        return t >= 1;
      },
      dispose: () => puffs.forEach(p => {
        this.sm.scene.remove(p);
        p.material.dispose();
      })
    });
  }

  spawnSupernova(cfg, v) {
    const { THREE } = this;
    const { D, pos } = this.placeInView(v, 900, 1600);
    const R = D * 0.4 * cfg.size;
    const rgb = hexToRgb(cfg.color);
    const col = new THREE.Color(rgb[0], rgb[1], rgb[2]);

    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTexture(THREE),
      color: new THREE.Color(1, 1, 1).lerp(col, 0.35),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    flash.raycast = () => {};
    flash.position.copy(pos);
    this.sm.scene.add(flash);

    const remnant = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTexture(THREE),
      color: col,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    remnant.raycast = () => {};
    remnant.position.copy(pos);
    this.sm.scene.add(remnant);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 96),
      new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    ring.raycast = () => {};
    ring.position.copy(pos);
    ring.lookAt(v.cam.position);
    this.sm.scene.add(ring);

    const white = [1, 1, 1];
    for (let i = 0; i < 380; i++) {
      const u = rand(-1, 1);
      const a = rand(0, Math.PI * 2);
      const r = Math.sqrt(1 - u * u);
      const sp = (R / 3) * rand(0.25, 1.1);
      this.bursts.spawn(
        [pos.x, pos.y, pos.z],
        [r * Math.cos(a) * sp, u * sp, r * Math.sin(a) * sp],
        rand(2.2, 4),
        Math.random() < 0.3 ? white : rgb,
        D * rand(0.008, 0.02),
        0.2
      );
    }

    let age = 0;
    this.active.push({
      update: (dt) => {
        age += dt;
        const tf = Math.min(age / 0.9, 1);
        flash.scale.setScalar(R * 1.6 * (0.2 + tf));
        flash.material.opacity = (1 - tf) * (1 - tf);
        const tr = Math.min(age / 4, 1);
        ring.scale.setScalar(R * (0.05 + tr));
        ring.material.opacity = (1 - tr) * 0.9;
        const te = Math.min(age / 7, 1);
        remnant.scale.setScalar(R * (0.35 + 0.4 * te));
        remnant.material.opacity = Math.min(age / 0.4, 1) * (1 - te) * 0.5;
        return age >= 7;
      },
      dispose: () => {
        this.sm.scene.remove(flash, remnant, ring);
        flash.material.dispose();
        remnant.material.dispose();
        ring.geometry.dispose();
        ring.material.dispose();
      }
    });
  }

  /**
   * @param {number} rawDt - segundos reales (limitado)
   * @param {SphereEntity[]} spheres
   */
  update(rawDt, spheres) {
    const speed = this.config.universeSpeed ?? 1;
    const dt = rawDt * speed;
    const cfgs = this.config.sceneFx;

    for (const type of Object.keys(cfgs)) {
      const cfg = cfgs[type];
      if (!cfg.on) continue;
      if (this.timers[type] > cfg.interval * 1.2) this.timers[type] = cfg.interval * 1.2;
      this.timers[type] -= rawDt;
      if (this.timers[type] <= 0) {
        this.trigger(type);
        this.resetTimer(type);
      }
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].update(rawDt)) {
        this.active[i].dispose();
        this.active.splice(i, 1);
      }
    }

    this.sm.renderer.getDrawingBufferSize(this.size);
    const scale = this.size.y / (2 * Math.tan(this.THREE.MathUtils.degToRad(this.sm.camera.fov / 2)));
    this.trails.update(rawDt, scale);
    this.bursts.update(rawDt, scale);

    for (const s of spheres) {
      if (!s.mesh) continue;
      if (!s.fxRig && anyFxOn(s.fx)) s.fxRig = new SphereFXRig(this.THREE, s, this.sm.scene);
      if (!s.fxRig) continue;
      if (s.fxDirty) {
        s.fxRig.sync();
        s.fxDirty = false;
      }
      s.fxRig.update(dt, scale, spheres);
      if (s.fxRig.idle) {
        s.fxRig.dispose();
        s.fxRig = null;
      }
    }
  }
}
