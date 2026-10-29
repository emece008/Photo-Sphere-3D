/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * TourMode: viaje cinemático automático por el universo de sistemas (estrella + planetas + satélites).
 * Encadena planos aleatorios (universo, sistema, esfera, foto) con una cámara suavizada.
 */

const SHOT_WEIGHTS = { overview: 3, system: 4, sphere: 3, photo: 1 };
const TRANSITION_SECONDS = 5;

export class TourMode {
  /**
   * @param {Object} options
   * @param {Object} options.THREE
   * @param {Object} options.camera
   * @param {Object} options.controls
   * @param {Object} options.orbitEngine
   * @param {Function} options.getSpheres
   * @param {Function} options.getSpeed - multiplicador global de velocidad del universo
   * @param {Function} [options.isBlocked] - true si no debe arrancar el viaje automático (p. ej. visor abierto)
   * @param {Function} [options.onStateChange]
   * @param {Function} [options.onNotify]
   * @param {number} [options.idleMs=10000]
   */
  constructor({ THREE, camera, controls, orbitEngine, getSpheres, getSpeed, isBlocked, onStateChange, onNotify, idleMs = 10000 }) {
    this.THREE = THREE;
    this.camera = camera;
    this.controls = controls;
    this.orbitEngine = orbitEngine;
    this.getSpheres = getSpheres;
    this.getSpeed = getSpeed;
    this.isBlocked = isBlocked;
    this.onStateChange = onStateChange;
    this.onNotify = onNotify;
    this.idleMs = idleMs;

    this.running = false;
    this.idleEnabled = false;
    this.lastActivity = performance.now();
    this.shot = null;
    this.lastType = null;
    this.lastEntity = null;
    this.recent = [];
    this.savedAutoRotate = false;

    this.tmpPos = new THREE.Vector3();
    this.tmpTarget = new THREE.Vector3();
    this.tmpDir = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();
  }

  setIdleEnabled(enabled) {
    this.idleEnabled = enabled;
    this.markActivity();
  }

  markActivity() {
    this.lastActivity = performance.now();
  }

  start(announce = true) {
    if (this.running) return;
    const spheres = this.getSpheres();
    if (!spheres || spheres.length === 0) return;

    this.orbitEngine.cancelCameraTransition();
    this.running = true;
    this.shot = null;
    if (this.controls) {
      this.savedAutoRotate = this.controls.autoRotate;
      this.controls.autoRotate = false;
    }
    this.nextShot();
    if (this.onStateChange) this.onStateChange(true);
    if (announce && this.onNotify) this.onNotify('🚀 Viaje por el universo (toca la pantalla para detenerlo)');
  }

  stop(announce = false) {
    if (!this.running) {
      this.markActivity();
      return;
    }
    this.running = false;
    this.shot = null;
    if (this.controls) this.controls.autoRotate = this.savedAutoRotate;
    this.markActivity();
    if (this.onStateChange) this.onStateChange(false);
    if (announce && this.onNotify) this.onNotify('🌌 Viaje detenido');
  }

  toggle() {
    if (this.running) this.stop(true);
    else this.start();
  }

  /**
   * Avanza el viaje. Llamar cada frame después de actualizar la órbita de las esferas.
   * @param {number} dt - segundos reales desde el frame anterior
   */
  update(dt) {
    if (!this.running) {
      if (this.idleEnabled && performance.now() - this.lastActivity >= this.idleMs && !(this.isBlocked && this.isBlocked())) {
        this.start();
      }
      return;
    }

    const spheres = this.getSpheres();
    if (!spheres || spheres.length === 0) {
      this.stop();
      return;
    }

    const speed = Math.max(0.1, this.getSpeed ? this.getSpeed() : 1);
    this.shot.elapsed += dt * speed;
    if (this.shot.elapsed >= this.shot.duration || !this.shotIsValid(spheres)) {
      this.nextShot();
    }

    this.shot.eval(this.shot.elapsed, this.tmpPos, this.tmpTarget);

    // Fundido desde la pose con la que empezó el plano: sin cortes entre planos
    const p = Math.min(this.shot.elapsed / TRANSITION_SECONDS, 1);
    const w = p * p * p * (p * (p * 6 - 15) + 10);
    this.tmpPos.lerpVectors(this.shot.fromPos, this.tmpPos, w);
    this.tmpTarget.lerpVectors(this.shot.fromTarget, this.tmpTarget, w);

    const alpha = 1 - Math.exp(-dt * 3);
    this.camera.position.lerp(this.tmpPos, alpha);
    this.controls.target.lerp(this.tmpTarget, alpha);
    this.camera.lookAt(this.controls.target);
  }

  shotIsValid(spheres) {
    const e = this.shot.entity;
    return !e || spheres.includes(e);
  }

  // ---------- Selección de planos ----------

  nextShot() {
    const spheres = this.getSpheres();
    const types = Object.keys(SHOT_WEIGHTS).filter(t => t !== this.lastType);
    if (spheres.length === 1) {
      types.splice(0, types.length, ...types.filter(t => t !== 'system' && t !== 'overview'));
    }
    const total = types.reduce((a, t) => a + SHOT_WEIGHTS[t], 0);
    let r = Math.random() * total;
    let type = types[0];
    for (const t of types) {
      r -= SHOT_WEIGHTS[t];
      if (r <= 0) { type = t; break; }
    }

    let shot = this.buildShot(type, spheres);
    if (!shot) shot = this.buildShot('sphere', spheres) || this.buildShot('overview', spheres);
    shot.fromPos = this.camera.position.clone();
    shot.fromTarget = this.controls.target.clone();
    this.shot = shot;
    this.lastType = shot.type;
    this.lastEntity = shot.entity || null;
    this.recent.push(shot.entity ? shot.entity.id : shot.type);
    if (this.recent.length > 4) this.recent.shift();
  }

  buildShot(type, spheres) {
    switch (type) {
      case 'overview': return this.overviewShot(spheres);
      case 'system': return this.systemShot(spheres);
      case 'photo': return this.photoShot(spheres);
      default: return this.sphereShot(spheres);
    }
  }

  fitHalf() {
    const vHalf = (this.camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    return Math.min(vHalf, hHalf);
  }

  pickSphere(spheres, filter) {
    let pool = filter ? spheres.filter(filter) : spheres;
    const fresh = pool.filter(s => !this.recent.includes(s.id));
    if (fresh.length) pool = fresh;
    else if (pool.length > 1) pool = pool.filter(s => s !== this.lastEntity);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  orbitPoint(out, center, dist, az, el) {
    const ce = Math.cos(el);
    return out.set(
      center.x + Math.sin(az) * ce * dist,
      center.y + Math.sin(el) * dist,
      center.z + Math.cos(az) * ce * dist
    );
  }

  /** Dolly lento (acercarse o alejarse) con progreso suavizado. */
  dolly(t, duration, from, to) {
    const p = Math.min(Math.max(t / duration, 0), 1);
    const e = p * p * (3 - 2 * p);
    return from + (to - from) * e;
  }

  // ---------- Planos ----------

  overviewShot(spheres) {
    const THREE = this.THREE;
    const center = new THREE.Vector3();
    const duration = 12 + Math.random() * 4;
    const az0 = Math.random() * Math.PI * 2;
    const azSpeed = (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.04);
    const grow = Math.random() < 0.5;

    return {
      type: 'overview',
      duration,
      elapsed: 0,
      eval: (t, outPos, outTarget) => {
        const list = this.getSpheres();
        center.set(0, 0, 0);
        list.forEach(s => center.add(s.position));
        center.divideScalar(list.length);
        let maxDist = 0;
        list.forEach(s => { maxDist = Math.max(maxDist, center.distanceTo(s.position) + s.radius); });
        const base = Math.max((maxDist * 1.3) / Math.sin(this.fitHalf()), 320);
        const dist = this.dolly(t, duration, base * (grow ? 0.85 : 1.15), base * (grow ? 1.15 : 0.85));
        this.orbitPoint(outPos, center, dist, az0 + azSpeed * t, 0.32 + 0.1 * Math.sin(t * 0.25));
        outTarget.copy(center);
      }
    };
  }

  systemShot(spheres) {
    const star = this.pickSphere(spheres, s => (s.bodyType === 'star' || !s.parentId) && spheres.some(c => c.parentId === s.id));
    if (!star) return null;

    const duration = 11 + Math.random() * 4;
    const az0 = Math.random() * Math.PI * 2;
    const azSpeed = (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.05);
    const grow = Math.random() < 0.5;

    const members = () => {
      const all = this.getSpheres();
      const set = new Set([star.id]);
      let added = true;
      while (added) {
        added = false;
        all.forEach(s => {
          if (s.parentId && set.has(s.parentId) && !set.has(s.id)) { set.add(s.id); added = true; }
        });
      }
      return all.filter(s => set.has(s.id));
    };

    return {
      type: 'system',
      entity: star,
      duration,
      elapsed: 0,
      eval: (t, outPos, outTarget) => {
        let extent = star.radius;
        members().forEach(s => { extent = Math.max(extent, star.position.distanceTo(s.position) + s.radius); });
        const base = Math.max((extent * 1.35) / Math.sin(this.fitHalf()), 260);
        const dist = this.dolly(t, duration, base * (grow ? 0.9 : 1.1), base * (grow ? 1.1 : 0.9));
        this.orbitPoint(outPos, star.position, dist, az0 + azSpeed * t, 0.3 + 0.08 * Math.sin(t * 0.3));
        outTarget.copy(star.position);
      }
    };
  }

  sphereShot(spheres) {
    const entity = this.pickSphere(spheres);
    if (!entity) return null;

    const duration = 8 + Math.random() * 4;
    const az0 = Math.random() * Math.PI * 2;
    const azSpeed = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.08);
    const approach = Math.random() < 0.5;
    const scale = 1 + Math.random() * 0.7;

    return {
      type: 'sphere',
      entity,
      duration,
      elapsed: 0,
      eval: (t, outPos, outTarget) => {
        const base = Math.max((entity.radius / Math.sin(this.fitHalf())) * 4.5, 320) * scale;
        const dist = this.dolly(t, duration, base * (approach ? 1.25 : 0.9), base * (approach ? 0.9 : 1.25));
        this.orbitPoint(outPos, entity.position, dist, az0 + azSpeed * t, 0.18 + 0.1 * Math.sin(t * 0.35));
        outTarget.copy(entity.position);
      }
    };
  }

  photoShot(spheres) {
    const pool = spheres.filter(s => s.mesh && !s.celestial);
    const withPhotos = pool.filter(s => s.images && s.images.length > 0);
    const entity = this.pickSphere(withPhotos.length ? withPhotos : pool);
    if (!entity) return null;

    const cols = Math.max(1, entity.cols || 1);
    const rows = Math.max(1, entity.rows || 1);
    // Evitar celdas polares: la cámara quedaría casi vertical
    const rowChoices = [];
    for (let r = 0; r < rows; r++) {
      if (Math.abs(Math.cos(((r + 0.5) / rows) * Math.PI)) < 0.75) rowChoices.push(r);
    }
    const row = rowChoices.length ? rowChoices[Math.floor(Math.random() * rowChoices.length)] : Math.floor(rows / 2);
    const col = Math.floor(Math.random() * cols);

    // Dirección local del centro de la celda según el mapeo UV de SphereGeometry
    const phi = ((col + 0.5) / cols) * Math.PI * 2;
    const theta = ((row + 0.5) / rows) * Math.PI;
    const localDir = new this.THREE.Vector3(
      -Math.cos(phi) * Math.sin(theta),
      Math.cos(theta),
      Math.sin(phi) * Math.sin(theta)
    );

    const duration = 8 + Math.random() * 3;
    const swing = (Math.random() < 0.5 ? -1 : 1) * 0.12;
    const approach = Math.random() < 0.6;

    return {
      type: 'photo',
      entity,
      duration,
      elapsed: 0,
      eval: (t, outPos, outTarget) => {
        const dir = this.tmpDir.copy(localDir);
        entity.mesh.getWorldQuaternion(this.tmpQuat);
        dir.applyQuaternion(this.tmpQuat);
        if (Math.abs(dir.y) > 0.8) {
          dir.y = Math.sign(dir.y) * 0.8;
        }
        dir.normalize();

        // Oscilación lateral sutil alrededor de la normal de la celda
        const a = swing * Math.sin((t / duration) * Math.PI);
        const cs = Math.cos(a);
        const sn = Math.sin(a);
        const dx = dir.x * cs + dir.z * sn;
        const dz = -dir.x * sn + dir.z * cs;
        dir.x = dx;
        dir.z = dz;

        const cellW = (2 * Math.PI * entity.radius) / cols;
        const gap = Math.min(Math.max((cellW * 1.8) / (2 * Math.tan(this.fitHalf())),         entity.radius * 0.5), entity.radius * 2.2) * 1.8;
                const gapNow = Math.max(this.dolly(t, duration, gap * (approach ? 1.25 : 0.9), gap * (approach ? 0.9 : 1.25)), 140);

        outTarget.copy(entity.position).addScaledVector(dir, entity.radius);
        outPos.copy(entity.position).addScaledVector(dir, entity.radius + gapNow);
      }
    };
  }
}
