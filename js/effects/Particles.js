/**
 * Photo Sphere Studio 3D - Efectos
 * ParticleEmitter: sistema de partículas aditivas con tamaño y color por partícula (un solo draw call).
 */

const VERT = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float scale;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(size * scale / max(-mv.z, 1.0), 0.0, 256.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = 1.0 - smoothstep(0.0, 0.5, d);
    a *= a;
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

export function hexToRgb(hex) {
  const n = parseInt((hex || '#ffffff').replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class ParticleEmitter {
  /**
   * @param {Object} THREE
   * @param {THREE.Object3D} parent - escena a la que se añade
   * @param {number} max - nº máximo de partículas vivas
   */
  constructor(THREE, parent, max = 600) {
    this.THREE = THREE;
    this.parent = parent;
    this.max = max;
    this.cursor = 0;
    this.alive = 0;

    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.siz = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.base = new Float32Array(max * 3);
    this.end = new Float32Array(max * 3);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);

    const geom = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3);
    this.colAttr = new THREE.BufferAttribute(this.col, 3);
    this.sizAttr = new THREE.BufferAttribute(this.siz, 1);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    this.sizAttr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute('position', this.posAttr);
    geom.setAttribute('color', this.colAttr);
    geom.setAttribute('size', this.sizAttr);

    this.material = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 800 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geom, this.material);
    this.points.frustumCulled = false;
    this.points.raycast = () => {};
    this.points.renderOrder = 5;
    parent.add(this.points);
  }

  /**
   * @param {number[]} p - posición [x,y,z]
   * @param {number[]} v - velocidad [x,y,z] (u/s)
   * @param {number} life - segundos
   * @param {number[]} rgb - color 0..1
   * @param {number} size - tamaño inicial (unidades de mundo)
   * @param {number} grow - factor de tamaño final (1 = constante, 0 = se encoge, >1 crece)
   * @param {number[]} [rgb2] - color final opcional (degradado a lo largo de la vida)
   */
  spawn(p, v, life, rgb, size, grow = 0, rgb2 = null) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const k = i * 3;
    this.pos[k] = p[0]; this.pos[k + 1] = p[1]; this.pos[k + 2] = p[2];
    this.vel[k] = v[0]; this.vel[k + 1] = v[1]; this.vel[k + 2] = v[2];
    this.base[k] = rgb[0]; this.base[k + 1] = rgb[1]; this.base[k + 2] = rgb[2];
    const e = rgb2 || rgb;
    this.end[k] = e[0]; this.end[k + 1] = e[1]; this.end[k + 2] = e[2];
    this.age[i] = 0;
    this.life[i] = Math.max(life, 0.01);
    this.size0[i] = size;
    this.grow[i] = grow;
    this.siz[i] = size;
    this.col[k] = rgb[0]; this.col[k + 1] = rgb[1]; this.col[k + 2] = rgb[2];
    this.alive++;
  }

  update(dt, scale) {
    this.material.uniforms.scale.value = scale;
    if (this.alive === 0 && !this.dirty) {
      this.points.visible = false;
      return;
    }
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      const life = this.life[i];
      if (life <= 0) continue;
      this.age[i] += dt;
      const t = this.age[i] / life;
      const k = i * 3;
      if (t >= 1) {
        this.life[i] = 0;
        this.col[k] = this.col[k + 1] = this.col[k + 2] = 0;
        this.siz[i] = 0;
        continue;
      }
      alive++;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const fade = (1 - t) * (1 - t);
      this.col[k] = (this.base[k] + (this.end[k] - this.base[k]) * t) * fade;
      this.col[k + 1] = (this.base[k + 1] + (this.end[k + 1] - this.base[k + 1]) * t) * fade;
      this.col[k + 2] = (this.base[k + 2] + (this.end[k + 2] - this.base[k + 2]) * t) * fade;
      this.siz[i] = this.size0[i] * (1 + (this.grow[i] - 1) * t);
    }
    this.alive = alive;
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizAttr.needsUpdate = true;
    this.points.visible = true;
    this.dirty = alive > 0;
  }

  dispose() {
    this.parent.remove(this.points);
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

let glowTex = null;

/** Textura radial suave compartida (halos, destellos y nubes). */
export function getGlowTexture(THREE) {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
