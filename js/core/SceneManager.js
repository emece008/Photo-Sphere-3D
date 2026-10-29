/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * SceneManager: Three.js Scene, Camera, Renderer, Lighting & Visual Environment
 */

export class SceneManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} studioConfig
   * @param {Object} THREE - Three.js global namespace
   */
  constructor(canvas, studioConfig, THREE = window.THREE) {
    this.canvas = canvas;
    this.config = studioConfig;
    this.THREE = THREE;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Lighting rig
    this.ambLight = null;
    this.lightKey = null;
    this.lightFill = null;

    // Particle field & lines
    this.starMesh = null;
    this.constellationLines = null;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(this.config.bgColor);

    // 2. Camera
    this.camera = new this.THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      60000
    );
    this.camera.position.set(0, 140, 680);

    // 3. Renderer with high-performance settings
    this.renderer = new this.THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (this.THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
    } else if (this.THREE.sRGBEncoding) {
      this.renderer.outputEncoding = this.THREE.sRGBEncoding;
    }

    if (this.THREE.ACESFilmicToneMapping) {
      this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
    }

    // 4. OrbitControls with ergonomic touch mapping
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (this.THREE.OrbitControls) {
      this.controls = new this.THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.rotateSpeed = isTouch ? 0.9 : 0.6;
      this.controls.zoomSpeed = isTouch ? 1.2 : 0.8;
      this.controls.screenSpacePanning = true;
      this.controls.autoRotate = this.config.autoRotate;
      this.controls.autoRotateSpeed = this.config.rotateSpeed;
      this.controls.minDistance = 50;
      this.controls.maxDistance = 40000;

      // Touch controls: ONE finger rotate, TWO fingers dolly/pan
      this.controls.touches = {
        ONE: this.THREE.TOUCH.ROTATE,
        TWO: this.THREE.TOUCH.DOLLY_PAN
      };
    }

    // 5. Lighting rig
    this.setupLighting();

    // 6. Cosmic stellar dust
    this.spawnStarfield();

    // 7. Bind resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', () => setTimeout(this.handleResize, 250));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.handleResize);
  }

  setupLighting() {
    this.ambLight = new this.THREE.AmbientLight(0xffffff, 0.7 * this.config.lightIntensity);
    this.scene.add(this.ambLight);

    // Warm key light
    this.lightKey = new this.THREE.DirectionalLight(0xffffff, 0.65 * this.config.lightIntensity);
    this.lightKey.position.set(120, 150, 100);
    this.scene.add(this.lightKey);

    // Cool cyber fill light
    this.lightFill = new this.THREE.DirectionalLight(0x00f0ff, 0.45 * this.config.lightIntensity);
    this.lightFill.position.set(-120, -100, -100);
    this.scene.add(this.lightFill);
  }

  updateLightIntensity(intensity) {
    this.config.lightIntensity = intensity;
    if (this.ambLight) this.ambLight.intensity = 0.7 * intensity;
    if (this.lightKey) this.lightKey.intensity = 0.65 * intensity;
    if (this.lightFill) this.lightFill.intensity = 0.45 * intensity;
  }

  setBackgroundColor(hexColor) {
    this.config.bgColor = hexColor;
    if (this.scene) {
      this.scene.background = new this.THREE.Color(hexColor);
    }
  }

  spawnStarfield() {
    // Esfera unitaria de estrellas; se escala según el tamaño del universo (ver fitUniverseBounds)
    const count = 6000;
    const geom = new this.THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = Math.cbrt(Math.random());
      pos[i] = s * Math.cos(t) * r;
      pos[i + 1] = u * r;
      pos[i + 2] = s * Math.sin(t) * r;
    }
    geom.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
    const mat = new this.THREE.PointsMaterial({
      color: 0x8b5cf6,
      size: 1.8,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.45
    });
    this.starMesh = new this.THREE.Points(geom, mat);
    this.starMesh.frustumCulled = false;
    this.starMesh.scale.setScalar(900);
    this.starScale = 900;
    this.scene.add(this.starMesh);
  }

  /**
   * Ajusta el fondo estelar, el plano lejano y el zoom máximo a todo lo que hay en pantalla:
   * objetos del universo y también la posición actual de la cámara.
   */
  fitUniverseBounds(spheres, dt = 1) {
    const THREE = this.THREE;
    this._bCenter = this._bCenter || new THREE.Vector3();
    const center = this._bCenter.set(0, 0, 0);
    if (spheres.length) {
      const min = new THREE.Vector3(Infinity, Infinity, Infinity);
      const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      const byId = new Map(spheres.map(s => [s.id, s]));
      spheres.forEach(s => {
        let r = s.radius;
        const parent = s.parentId ? byId.get(s.parentId) : null;
        if (parent) r = Math.max(r, s.orbitRadius * (1 + Math.min(s.orbitEccentricity || 0, 0.95)) + s.radius);
        const p = parent ? parent.position : s.position;
        min.min(new THREE.Vector3(p.x - r, p.y - r, p.z - r));
        max.max(new THREE.Vector3(p.x + r, p.y + r, p.z + r));
      });
      center.addVectors(min, max).multiplyScalar(0.5);
      this._bExtent = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) * 0.5;
    }
    const extent = this._bExtent || 0;
    const camDist = this.camera.position.distanceTo(center);
    const target = Math.max(900, extent * 1.6, camDist * 2);

    const k = Math.min(1, dt * 3);
    this.starScale += (target - this.starScale) * k;
    if (this.starMesh) {
      this.starMesh.scale.setScalar(this.starScale);
      this.starMesh.position.copy(center);
    }
    const far = this.starScale * 4 + camDist;
    if (Math.abs(far - this.camera.far) / this.camera.far > 0.02) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
    if (this.controls) this.controls.maxDistance = Math.max(2500, extent * 4);
  }

  setStarsVisible(visible) {
    this.config.showStars = visible;
    if (this.starMesh) {
      this.starMesh.visible = visible;
    }
  }

  rebuildConstellationLines(spheres) {
    if (this.constellationLines) {
      this.scene.remove(this.constellationLines);
      if (this.constellationLines.geometry) this.constellationLines.geometry.dispose();
      if (this.constellationLines.material) this.constellationLines.material.dispose();
      this.constellationLines = null;
    }

    if (!this.config.showConstellations || !spheres || spheres.length < 2) return;

    // Solo une cada cuerpo con aquello que orbita (su padre)
    const pairs = [];
    spheres.forEach(s => {
      const parent = s.parentId ? spheres.find(p => p.id === s.parentId) : null;
      if (parent) pairs.push([parent, s]);
    });
    if (!pairs.length) return;

    const points = [];
    pairs.forEach(([a, b]) => {
      points.push(a.position);
      points.push(b.position);
    });

    const geom = new this.THREE.BufferGeometry().setFromPoints(points);
    const mat = new this.THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });
    this.constellationLines = new this.THREE.LineSegments(geom, mat);
    this.constellationLines.userData.pairs = pairs;
    this.scene.add(this.constellationLines);
  }

  setConstellationVisibility(visible, spheres) {
    this.config.showConstellations = visible;
    if (!visible) {
      if (this.constellationLines) {
        this.scene.remove(this.constellationLines);
        if (this.constellationLines.geometry) this.constellationLines.geometry.dispose();
        if (this.constellationLines.material) this.constellationLines.material.dispose();
        this.constellationLines = null;
      }
    } else {
      this.rebuildConstellationLines(spheres);
    }
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.applyViewShift();
  }

  /**
   * Desplaza el centro de la vista (px) para que el objetivo quede en la zona no cubierta por el panel.
   * Positivo en x mueve el contenido a la izquierda; positivo en y, hacia arriba.
   */
  setViewShift(x, y, animate = true) {
    this.viewShiftTarget = { x, y };
    if (!this.viewShift) this.viewShift = { x: 0, y: 0 };
    if (!animate) {
      this.viewShift = { x, y };
      this.applyViewShift();
      return;
    }
    if (this.viewShiftRaf) return;
    const step = () => {
      const t = this.viewShiftTarget;
      this.viewShift.x += (t.x - this.viewShift.x) * 0.15;
      this.viewShift.y += (t.y - this.viewShift.y) * 0.15;
      const done = Math.abs(t.x - this.viewShift.x) < 0.5 && Math.abs(t.y - this.viewShift.y) < 0.5;
      if (done) this.viewShift = { x: t.x, y: t.y };
      this.applyViewShift();
      this.viewShiftRaf = done ? null : requestAnimationFrame(step);
    };
    this.viewShiftRaf = requestAnimationFrame(step);
  }

  applyViewShift() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = this.viewShift;
    if (s && (Math.abs(s.x) > 0.01 || Math.abs(s.y) > 0.01)) {
      this.camera.setViewOffset(w, h, s.x, s.y, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  captureScreenshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize);
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
