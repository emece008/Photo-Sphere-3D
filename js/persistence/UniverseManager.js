/**
 * Photo Sphere Studio 3D - Persistencia local
 * UniverseManager: serializa el universo actual, lo guarda / abre / exporta / importa
 * y controla el estado "sin guardar".
 */

import { UniverseStore, newUniverseId, downloadUniverse, readUniverseFile } from './UniverseStore.js';

const FORMAT_VERSION = 1;
const LS_LAST = 'pss:lastUniverse';
const LS_AUTOSAVE = 'pss:autosave';

const CONFIG_KEYS = [
  'sphereMargin', 'layoutMode', 'showConstellations', 'showAllOrbitLines', 'autoRotate',
  'rotateSpeed', 'universeSpeed', 'bgColor', 'lightIntensity', 'roughness', 'metalness',
  'wireframe', 'showStars', 'tourSpeed', 'sceneFx'
];

const SPHERE_KEYS = [
  'id', 'name', 'radius', 'spinSpeed', 'cols', 'rows', 'tileW', 'tileH', 'gap', 'shape', 'shapeScale',
  'strokeWidth', 'strokeColor', 'gridColor', 'gridTransparent', 'bodyType', 'parentId', 'orbitRadius', 'orbitSpeed',
  'orbitTilt', 'orbitEccentricity', 'orbitNode', 'orbitPeriapsis', 'orbitAngle', 'showOrbitLine', 'celestial', 'manualPos'
];

function imageToDataUrl(img) {
  if (img.src && img.src.startsWith('data:')) return img.src;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.92);
}

export class UniverseManager {
  constructor(app) {
    this.app = app;
    this.store = new UniverseStore();
    this.currentId = null;
    this.name = 'Universo sin título';
    this.savedSignature = null;
    this.dirty = false;
    this.busy = false;
    this.autosave = localStorage.getItem(LS_AUTOSAVE) !== '0';
    this.dirtySince = 0;
    this.listeners = [];
    this.dataUrlCache = new WeakMap();
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  emitChange() {
    this.listeners.forEach(fn => fn(this));
  }

  setAutosave(on) {
    this.autosave = !!on;
    localStorage.setItem(LS_AUTOSAVE, on ? '1' : '0');
    this.emitChange();
  }

  /** Serializa el universo completo (config + esferas + fotos). */
  serialize() {
    const app = this.app;
    const config = {};
    CONFIG_KEYS.forEach(k => {
      if (app.config[k] !== undefined) config[k] = JSON.parse(JSON.stringify(app.config[k]));
    });
    return {
      format: 'photo-sphere-studio',
      version: FORMAT_VERSION,
      name: this.name,
      savedAt: new Date().toISOString(),
      config,
      activeId: app.activeSphere ? app.activeSphere.id : null,
      spheres: app.spheres.map(s => {
        const o = {};
        SPHERE_KEYS.forEach(k => { o[k] = s[k]; });
        o.manualPos = s.manualPos ? { x: s.manualPos.x, y: s.manualPos.y, z: s.manualPos.z } : null;
        o.fx = JSON.parse(JSON.stringify(s.fx));
        o.images = s.images.map(img => {
          let src = this.dataUrlCache.get(img);
          if (!src) {
            src = imageToDataUrl(img);
            this.dataUrlCache.set(img, src);
          }
          return { src, title: img.dataset.title || '', filename: img.dataset.filename || '' };
        });
        return o;
      })
    };
  }

  /** Firma ligera (sin recodificar fotos) para detectar cambios sin guardar. */
  signature() {
    const app = this.app;
    const cfg = {};
    CONFIG_KEYS.forEach(k => { cfg[k] = app.config[k]; });
    return JSON.stringify([
      cfg,
      app.spheres.map(s => [
        SPHERE_KEYS.filter(k => k !== 'orbitAngle').map(k => s[k]),
        s.fx,
        s.images.map(i => i.src.length + i.src.slice(-16))
      ])
    ]);
  }

  markSaved() {
    this.savedSignature = this.signature();
    this.dirty = false;
    this.dirtySince = 0;
    this.emitChange();
  }

  /** Se llama periódicamente: actualiza el estado "sin guardar" y guarda solo si procede. */
  tick() {
    if (this.busy || !this.app.spheres.length) return;
    const dirty = this.signature() !== this.savedSignature;
    if (dirty !== this.dirty) {
      this.dirty = dirty;
      this.dirtySince = dirty ? Date.now() : 0;
      this.emitChange();
    }
    if (dirty && this.autosave && Date.now() - this.dirtySince > 1000) {
      this.save({ silent: true });
    }
  }

  /** Guarda de inmediato si hay cambios y el guardado automático está activo (al cerrar o recargar). */
  flush() {
    if (this.busy || !this.autosave || !this.store.available || !this.app.spheres.length) return;
    if (this.signature() !== this.savedSignature) this.save({ silent: true });
  }

  captureThumb() {
    try {
      const src = this.app.sceneManager.renderer.domElement;
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = Math.round(256 * (src.height / src.width)) || 144;
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    } catch (e) {
      return null;
    }
  }

  async list() {
    return this.store.list();
  }

  /**
   * Guarda el universo. Con `asNew` crea una entrada nueva en la biblioteca.
   */
  async save({ asNew = false, name, silent = false } = {}) {
    if (this.busy) return null;
    this.busy = true;
    try {
      if (name !== undefined && name.trim()) this.name = name.trim();
      if (asNew || !this.currentId) this.currentId = newUniverseId();
      const data = this.serialize();
      await this.store.save(this.currentId, data, { name: this.name, thumb: this.captureThumb() });
      localStorage.setItem(LS_LAST, this.currentId);
      this.busy = false;
      this.markSaved();
      if (!silent) this.app.uiManager.notify(`💾 Universo "${this.name}" guardado`);
      return this.currentId;
    } catch (e) {
      console.error(e);
      this.app.uiManager.notify('⚠️ No se pudo guardar: ' + (e && e.message ? e.message : 'error de almacenamiento'), 4500);
      return null;
    } finally {
      this.busy = false;
    }
  }

  async open(id) {
    const data = await this.store.load(id);
    if (!data) {
      this.app.uiManager.notify('⚠️ No se encontró ese universo');
      return false;
    }
    const meta = await this.store.getMeta(id);
    await this.apply(data, { id, name: meta ? meta.name : data.name });
    localStorage.setItem(LS_LAST, id);
    this.app.uiManager.notify(`📂 Universo "${this.name}" abierto`);
    return true;
  }

  async apply(data, { id = null, name } = {}) {
    this.busy = true;
    try {
      await this.app.replaceUniverse(data);
      this.currentId = id;
      this.name = name || data.name || 'Universo sin título';
    } finally {
      this.busy = false;
    }
    this.markSaved();
  }

  async createNew(name = 'Universo sin título') {
    await this.apply(this.app.buildBlankUniverse(), { id: null, name });
    localStorage.removeItem(LS_LAST);
    this.dirty = true;
    this.savedSignature = null;
    this.emitChange();
    this.app.uiManager.notify('✨ Nuevo universo creado');
  }

  async remove(id) {
    await this.store.remove(id);
    if (this.currentId === id) {
      this.currentId = null;
      this.savedSignature = null;
      this.dirty = true;
      if (localStorage.getItem(LS_LAST) === id) localStorage.removeItem(LS_LAST);
      this.emitChange();
    }
  }

  async rename(id, name) {
    await this.store.rename(id, name);
    if (this.currentId === id) {
      this.name = name;
      this.emitChange();
    }
  }

  exportCurrent() {
    downloadUniverse(this.serialize(), this.name);
    this.app.uiManager.notify('📤 Universo exportado a JSON');
  }

  async exportSaved(id) {
    const data = await this.store.load(id);
    const meta = await this.store.getMeta(id);
    if (data) downloadUniverse(data, meta ? meta.name : data.name);
  }

  /** Importa un archivo JSON a la biblioteca y lo abre. */
  async importFile(file) {
    try {
      const data = await readUniverseFile(file);
      const id = newUniverseId();
      const name = data.name || file.name.replace(/\.universe\.json$|\.json$/i, '');
      data.name = name;
      await this.store.save(id, data, { name, thumb: null });
      await this.apply(data, { id, name });
      localStorage.setItem(LS_LAST, id);
      this.app.uiManager.notify(`📥 Universo "${name}" importado`);
      return true;
    } catch (e) {
      this.app.uiManager.notify('⚠️ ' + (e && e.message ? e.message : 'No se pudo importar'), 4500);
      return false;
    }
  }

  /** Reabre el último universo usado. Devuelve false si no hay ninguno. */
  async restoreLast() {
    if (!this.store.available) return false;
    try {
      const id = localStorage.getItem(LS_LAST);
      if (!id || !(await this.store.getMeta(id))) return false;
      const data = await this.store.load(id);
      const meta = await this.store.getMeta(id);
      await this.apply(data, { id, name: meta.name });
      return true;
    } catch (e) {
      console.warn('No se pudo restaurar el último universo', e);
      return false;
    }
  }
}
