/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * SphereEntity: 3D Mesh, Lifecycle, Physical Dimensions & Hierarchical Orbit Properties
 */

import { DEFAULT_SPHERE_CONFIG, CELESTIAL_PRESETS } from '../config/constants.js';
import { TextureBaker } from './TextureBaker.js';
import { getCelestialDef, paintRingTexture } from './CelestialTextures.js';
import { mergeFx } from '../effects/SphereFX.js';

let sphereCounter = 0;

export class SphereEntity {
  /**
   * @param {Object} opts - Sphere initial configuration
   * @param {Object} THREE - Three.js global namespace
   * @param {Object} sceneConfig - Global studio lighting & material configuration
   */
  constructor(opts = {}, THREE = window.THREE, sceneConfig = {}) {
    sphereCounter++;
    this.THREE = THREE;
    this.sceneConfig = sceneConfig;

    this.id = opts.id || `sphere_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.name = opts.name || `Esfera #${sphereCounter}`;

    // Jerarquía Orbital (Sistema Solar: Estrella -> Planeta -> Luna)
    this.parentId = opts.parentId !== undefined ? opts.parentId : DEFAULT_SPHERE_CONFIG.parentId;
    this.bodyType = opts.bodyType || (this.parentId ? 'planet' : 'star');

    // Preset base según tipo de cuerpo
    const preset = CELESTIAL_PRESETS[this.bodyType] || CELESTIAL_PRESETS.star;
    this.radius = opts.radius || preset.defaultRadius;
    this.spinSpeed = opts.spinSpeed !== undefined ? opts.spinSpeed : preset.spinSpeed;

    // Nombre personalizado con prefijo de tipo garantizado
    this.rawName = '';
    this.setName(opts.name || `Cuerpo #${sphereCounter}`);

    // Grid layout & geometry
    this.cols = opts.cols || DEFAULT_SPHERE_CONFIG.cols;
    this.rows = opts.rows || DEFAULT_SPHERE_CONFIG.rows;
    this.tileW = opts.tileW || DEFAULT_SPHERE_CONFIG.tileW;
    this.tileH = opts.tileH || DEFAULT_SPHERE_CONFIG.tileH;
    this.gap = opts.gap !== undefined ? opts.gap : DEFAULT_SPHERE_CONFIG.gap;
    this.shape = opts.shape || DEFAULT_SPHERE_CONFIG.shape;
    this.shapeScale = opts.shapeScale !== undefined ? opts.shapeScale : DEFAULT_SPHERE_CONFIG.shapeScale;
    this.strokeWidth = opts.strokeWidth !== undefined ? opts.strokeWidth : DEFAULT_SPHERE_CONFIG.strokeWidth;
    this.strokeColor = opts.strokeColor || (this.bodyType === 'star' ? '#38bdf8' : (this.bodyType === 'moon' ? '#c084fc' : '#00f0ff'));
    this.gridColor = opts.gridColor || DEFAULT_SPHERE_CONFIG.gridColor;
    this.gridTransparent = !!opts.gridTransparent;

    this.orbitRadius = opts.orbitRadius !== undefined ? opts.orbitRadius : preset.orbitRadius;
    this.orbitSpeed = opts.orbitSpeed !== undefined ? opts.orbitSpeed : preset.orbitSpeed;
    this.orbitTilt = opts.orbitTilt !== undefined ? opts.orbitTilt : DEFAULT_SPHERE_CONFIG.orbitTilt;
    this.orbitEccentricity = opts.orbitEccentricity || 0;
    this.orbitNode = opts.orbitNode || 0;
    this.orbitPeriapsis = opts.orbitPeriapsis || 0;
    this.orbitAngle = opts.orbitAngle !== undefined ? opts.orbitAngle : Math.random() * Math.PI * 2;
    this.showOrbitLine = opts.showOrbitLine !== undefined ? opts.showOrbitLine : DEFAULT_SPHERE_CONFIG.showOrbitLine;
    this.orbitLine = null;

    // Orbital positioning vectors
    this.targetPos = new this.THREE.Vector3(0, 0, 0);
    this.position = new this.THREE.Vector3(0, 0, 0);

    // Posición libre elegida por el usuario (solo cuerpos sin padre); null = colocación automática
    this.manualPos = null;
    this.unlocked = false;
    if (opts.manualPos) {
      this.manualPos = new this.THREE.Vector3(opts.manualPos.x, opts.manualPos.y, opts.manualPos.z);
      this.position.copy(this.manualPos);
      this.targetPos.copy(this.manualPos);
    }
    // Photos collection
    this.images = opts.images ? [...opts.images] : [];

    // Objeto celeste con textura procedural (null = esfera de fotos)
    this.celestial = opts.celestial || null;
    this.ring = null;

    // Efectos visuales configurables (halo, cola, chispas, haces)
    this.fx = mergeFx(opts.fx);
    this.fxRig = null;
    this.fxDirty = false;

    // Baker & Three.js resources
    this.baker = new TextureBaker(this);
    this.mesh = null;

    this.buildThreeMesh();
  }

  /**
   * Obtiene la etiqueta textual del tipo de cuerpo celeste.
   */
  getTypePrefix() {
    if (this.bodyType === 'star') return 'Estrella';
    if (this.bodyType === 'moon') return 'Satélite';
    return 'Planeta';
  }

  /**
   * Obtiene el emoji del tipo de cuerpo celeste.
   */
  getTypeIcon() {
    const def = getCelestialDef(this.celestial);
    if (def) return def.icon;
    if (this.bodyType === 'star') return '⭐';
    if (this.bodyType === 'moon') return '🌙';
    return '🪐';
  }

  /**
   * Asigna el nombre de la esfera preservando siempre el tipo correspondiente.
   * Ej: Si el usuario ingresa 'Terra', el resultado final es 'Planeta Terra'.
   * @param {string} inputName
   */
  setName(inputName) {
    let clean = (inputName || '').trim();
    if (!clean) {
      clean = this.rawName || 'Cuerpo';
    }

    // Remover posibles prefijos existentes para extraer el nombre base
    const prefixRegex = /^(Estrella|Sol|Planeta|Sat[eé]lite|Luna)\s+/i;
    if (prefixRegex.test(clean)) {
      this.rawName = clean.replace(prefixRegex, '').trim() || clean;
    } else {
      this.rawName = clean;
    }

    const typePrefix = this.getTypePrefix();
    // Si la cadena ya contenía el prefijo exacto, conservarla; sino anteponer el tipo
    if (clean.toLowerCase().startsWith(typePrefix.toLowerCase())) {
      this.name = clean;
    } else {
      this.name = `${typePrefix} ${this.rawName}`;
    }
  }

  /**
   * Builds the 3D Sphere geometry and PBR material.
   * Sin escudos de atmósfera ni tintes azules para mantener fotos 100% nítidas y limpias.
   */
  buildThreeMesh() {
    const texture = this.baker.createTexture(this.THREE);

    const geom = new this.THREE.SphereGeometry(this.radius, 48, 48);
    const isMoon = this.bodyType === 'moon';

    const mat = new this.THREE.MeshStandardMaterial({
      map: texture,
      roughness: isMoon ? 0.65 : (this.sceneConfig.roughness !== undefined ? this.sceneConfig.roughness : 0.3),
      metalness: this.sceneConfig.metalness !== undefined ? this.sceneConfig.metalness : 0.08,
      wireframe: !!this.sceneConfig.wireframe,
      emissive: new this.THREE.Color(0x000000),
      emissiveIntensity: 0.0
    });

    this.mesh = new this.THREE.Mesh(geom, mat);
    this.mesh.userData = { entity: this };
    this.applyCelestialLook();
  }

  /**
   * Ajusta material y anillo según sea esfera de fotos u objeto celeste.
   */
  applyCelestialLook() {
    if (!this.mesh) return;
    const mat = this.mesh.material;
    const def = getCelestialDef(this.celestial);

    if (def && def.emissive) {
      mat.emissive = new this.THREE.Color(0xffffff);
      mat.emissiveMap = mat.map;
      mat.emissiveIntensity = 0.95;
    } else {
      mat.emissive = new this.THREE.Color(0x000000);
      mat.emissiveMap = null;
      mat.emissiveIntensity = 0.0;
    }
    if (def) {
      mat.roughness = 0.9;
      mat.metalness = 0.0;
    }
    const see = !def && this.gridTransparent;
    mat.transparent = see;
    mat.alphaTest = see ? 0.5 : 0;
    mat.side = see ? this.THREE.DoubleSide : this.THREE.FrontSide;
    mat.needsUpdate = true;
    this.syncRing(def);
  }

  syncRing(def) {
    if (this.ring) {
      this.mesh.remove(this.ring);
      this.ring.geometry.dispose();
      if (this.ring.material.map) this.ring.material.map.dispose();
      this.ring.material.dispose();
      this.ring = null;
    }
    if (!def || !def.ring) return;

    const accretion = def.ring === 'accretion';
    const inner = this.radius * (accretion ? 1.2 : 1.35);
    const outer = this.radius * (accretion ? 3.6 : 2.45);
    const geom = new this.THREE.RingGeometry(inner, outer, 128, 1);
    const pos = geom.attributes.position;
    const uv = geom.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    const tex = new this.THREE.CanvasTexture(paintRingTexture(document.createElement('canvas'), accretion ? 'accretion' : 'saturn'));
    const mat = new this.THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: this.THREE.DoubleSide,
      depthWrite: false,
      blending: accretion ? this.THREE.AdditiveBlending : this.THREE.NormalBlending
    });
    this.ring = new this.THREE.Mesh(geom, mat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.userData = { entity: this };
    this.mesh.add(this.ring);
  }

  /**
   * Convierte la esfera en un objeto celeste (id) o de vuelta en esfera de fotos (null).
   * @param {string|null} id
   */
  setCelestial(id, applyPresetFx = false) {
    this.celestial = id || null;
    const def = getCelestialDef(id);
    if (applyPresetFx && def && def.fx) {
      this.fx = mergeFx(def.fx);
      this.fxDirty = true;
    }
    this.baker.render();
    this.applyCelestialLook();
  }

  /**
   * Actualiza el tipo celestial (star | planet | moon) con sus propiedades físicas y visuales.
   * Reajusta el prefijo del nombre y elimina inmediatamente órbitas huérfanas si es estrella.
   */
  get isBlackHole() {
    return this.celestial === 'blackhole';
  }

  setBodyType(newType, scene = null, keepParent = false) {
    this.bodyType = newType;
    this.setName(this.rawName);

    if (newType === 'star' && !(keepParent && this.parentId)) {
      this.parentId = null;
      this.orbitRadius = 0;
      this.orbitSpeed = 0;
      this.removeOrbitLine(scene);
    }

    if (this.mesh && this.mesh.material) {
      this.mesh.material.roughness = this.celestial ? 0.9 : (newType === 'moon' ? 0.65 : 0.3);
      this.applyCelestialLook();
    }
  }

  /**
   * Remueve y destruye de forma segura la línea de órbita 3D en la GPU.
   * @param {THREE.Scene} [scene]
   */
  removeOrbitLine(scene) {
    if (this.orbitLine) {
      if (scene) {
        scene.remove(this.orbitLine);
      } else if (this.orbitLine.parent) {
        this.orbitLine.parent.remove(this.orbitLine);
      }
      if (this.orbitLine.geometry) {
        this.orbitLine.geometry.dispose();
      }
      if (this.orbitLine.material) {
        this.orbitLine.material.dispose();
      }
      this.orbitLine = null;
    }
  }

  /**
   * Posición relativa al padre (que ocupa un foco de la elipse) para un ángulo orbital.
   * Orden: elipse en su plano -> giro del periapsis -> inclinación -> giro del nodo (eclíptica).
   */
  orbitOffset(angle, out) {
    const a = this.orbitRadius;
    // La excentricidad se limita para que el periapsis nunca atraviese al cuerpo padre
    const maxE = a > 0 ? Math.max(0, 1 - (this.minPeriapsis || 0) / a) : 0;
    const e = Math.min(Math.max(this.orbitEccentricity, 0), 0.95, maxE);
    const b = a * Math.sqrt(1 - e * e);
    const x0 = a * (Math.cos(angle) - e);
    const z0 = b * Math.sin(angle);

    const cp = Math.cos(this.orbitPeriapsis);
    const sp = Math.sin(this.orbitPeriapsis);
    const x1 = x0 * cp + z0 * sp;
    const z1 = -x0 * sp + z0 * cp;

    const y2 = z1 * Math.sin(this.orbitTilt);
    const z2 = z1 * Math.cos(this.orbitTilt);

    const cn = Math.cos(this.orbitNode);
    const sn = Math.sin(this.orbitNode);
    return out.set(x1 * cn + z2 * sn, y2, -x1 * sn + z2 * cn);
  }

  /**
   * Creates or updates the visual 3D orbital trajectory ring (THREE.LineLoop).
   * Reconstruye de forma limpia la elipse ante cambios de radio, inclinación o tipo.
   * @param {THREE.Scene} scene
   * @param {boolean} [globalShowAll=true]
   */
  createOrUpdateOrbitLine(scene, globalShowAll = true) {
    if (!scene) return;

    // Si es estrella, no tiene padre o su radio es 0: destruir rastro viejo inmediatamente
    // Una estrella con padre solo puede estar orbitando un agujero negro
    if (!this.parentId || this.orbitRadius <= 0) {
      this.removeOrbitLine(scene);
      return;
    }

    // Si el usuario u operador global ocultó las líneas, ocultar visibilidad sin destruir objeto
    if (!this.showOrbitLine || !globalShowAll) {
      if (this.orbitLine) {
        this.orbitLine.visible = false;
      }
      return;
    }

    const segments = 160;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      points.push(this.orbitOffset((i / segments) * Math.PI * 2, new this.THREE.Vector3()));
    }

    // Color diferenciado: Cian para órbitas planetarias, Violeta/Lavanda para lunas
    const lineColor = this.bodyType === 'moon' ? 0xc084fc : (this.bodyType === 'star' ? 0xfbbf24 : 0x00f0ff);
    const lineOpacity = this.bodyType === 'moon' ? 0.45 : (this.bodyType === 'star' ? 0.4 : 0.32);

    if (!this.orbitLine) {
      const geom = new this.THREE.BufferGeometry().setFromPoints(points);
      const mat = new this.THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: lineOpacity,
        depthWrite: false
      });
      this.orbitLine = new this.THREE.LineLoop(geom, mat);
      scene.add(this.orbitLine);
    } else {
      this.orbitLine.geometry.dispose();
      this.orbitLine.geometry = new this.THREE.BufferGeometry().setFromPoints(points);
      this.orbitLine.material.color.setHex(lineColor);
      this.orbitLine.material.opacity = lineOpacity;
    }

    this.orbitLine.visible = true;
  }

  /**
   * Updates the position of the orbit line to center it at its parent body.
   * @param {THREE.Vector3} parentPos
   * @param {boolean} [globalShowAll=true]
   */
  updateOrbitLinePosition(parentPos, globalShowAll = true) {
    if (!this.parentId || !this.showOrbitLine || !globalShowAll) {
      if (this.orbitLine) {
        this.orbitLine.visible = false;
      }
      return;
    }

    if (this.orbitLine && parentPos) {
      this.orbitLine.position.copy(parentPos);
      this.orbitLine.visible = true;
    }
  }

  /**
   * Dynamically resizes the sphere radius without recreating materials.
   * Disposes of old geometry to prevent memory leaks.
   * @param {number} newRadius
   */
  setRadius(newRadius) {
    if (newRadius === this.radius) return;
    this.radius = newRadius;
    if (this.mesh && this.mesh.geometry) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new this.THREE.SphereGeometry(this.radius, 48, 48);
    }
    if (this.ring) this.syncRing(getCelestialDef(this.celestial));
    this.fxDirty = true;
  }

  /**
   * Re-bakes the high-resolution texture.
   */
  renderCanvasTexture() {
    this.baker.render();
    this.applyCelestialLook();
  }

  /**
   * Updates material parameters (roughness, wireframe, etc.).
   */
  updateMaterial(roughness, wireframe) {
    if (!this.mesh || !this.mesh.material) return;
    if (roughness !== undefined && this.bodyType !== 'star') {
      this.mesh.material.roughness = roughness;
    }
    if (wireframe !== undefined) this.mesh.material.wireframe = wireframe;
  }

  /**
   * Disposes of all GPU resources (geometry, material, texture, canvas, orbit line).
   */
  dispose(scene = null) {
    this.removeOrbitLine(scene);
    if (this.fxRig) {
      this.fxRig.dispose();
      this.fxRig = null;
    }

    if (this.mesh) {
      this.syncRing(null);
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        if (this.mesh.material.map) {
          this.mesh.material.map.dispose();
        }
        this.mesh.material.dispose();
      }
      this.mesh.userData = null;
      this.mesh = null;
    }

    if (this.baker) {
      this.baker.dispose();
      this.baker = null;
    }
    this.images = [];
  }
}
