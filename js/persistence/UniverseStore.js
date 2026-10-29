/**
 * Photo Sphere Studio 3D - Persistencia local
 * UniverseStore: biblioteca de universos guardados en el navegador (IndexedDB, sin servidor)
 * más utilidades de exportación / importación a archivos JSON.
 */

const DB_NAME = 'photo-sphere-studio';
const DB_VERSION = 1;
const META = 'universes';
const DATA = 'universeData';

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción cancelada'));
  });
}

export function newUniverseId() {
  return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export class UniverseStore {
  constructor() {
    this.dbPromise = null;
  }

  get available() {
    return typeof indexedDB !== 'undefined';
  }

  open() {
    if (!this.available) return Promise.reject(new Error('IndexedDB no disponible'));
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          this.dbPromise = null;
          reject(req.error);
        };
      });
    }
    return this.dbPromise;
  }

  /** Lista de metadatos (sin cargar fotos), del más reciente al más antiguo. */
  async list() {
    const db = await this.open();
    const all = await promisify(db.transaction(META).objectStore(META).getAll());
    return all.sort((a, b) => b.savedAt - a.savedAt);
  }

  async getMeta(id) {
    const db = await this.open();
    return promisify(db.transaction(META).objectStore(META).get(id));
  }

  async load(id) {
    const db = await this.open();
    const rec = await promisify(db.transaction(DATA).objectStore(DATA).get(id));
    return rec ? rec.data : null;
  }

  /**
   * @param {string} id
   * @param {Object} data - universo serializado
   * @param {Object} meta - { name, thumb }
   */
  async save(id, data, meta = {}) {
    const db = await this.open();
    const prev = await this.getMeta(id);
    const now = Date.now();
    const record = {
      id,
      name: meta.name || data.name || 'Universo',
      createdAt: prev ? prev.createdAt : now,
      savedAt: now,
      spheres: data.spheres.length,
      photos: data.spheres.reduce((n, s) => n + (s.images ? s.images.length : 0), 0),
      size: estimateSize(data),
      thumb: meta.thumb !== undefined ? meta.thumb : (prev ? prev.thumb : null)
    };
    const tx = db.transaction([META, DATA], 'readwrite');
    tx.objectStore(META).put(record);
    tx.objectStore(DATA).put({ id, data });
    await txDone(tx);
    return record;
  }

  async remove(id) {
    const db = await this.open();
    const tx = db.transaction([META, DATA], 'readwrite');
    tx.objectStore(META).delete(id);
    tx.objectStore(DATA).delete(id);
    await txDone(tx);
  }

  async rename(id, name) {
    const db = await this.open();
    const meta = await this.getMeta(id);
    if (!meta) return;
    meta.name = name;
    const dataRec = await promisify(db.transaction(DATA).objectStore(DATA).get(id));
    const tx = db.transaction([META, DATA], 'readwrite');
    tx.objectStore(META).put(meta);
    if (dataRec) {
      dataRec.data.name = name;
      tx.objectStore(DATA).put(dataRec);
    }
    await txDone(tx);
  }
}

function estimateSize(data) {
  let n = 2000 * data.spheres.length;
  data.spheres.forEach(s => (s.images || []).forEach(i => { n += (i.src || '').length; }));
  return n;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Descarga el universo como archivo .json. */
export function downloadUniverse(data, name) {
  const safe = (name || 'universo').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'universo';
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.universe.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Lee y valida un archivo JSON de universo. */
export async function readUniverseFile(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('El archivo no es un JSON válido');
  }
  if (!data || data.format !== 'photo-sphere-studio' || !Array.isArray(data.spheres)) {
    throw new Error('El archivo no es un universo de Photo Sphere Studio');
  }
  if (data.spheres.length === 0) throw new Error('El universo no contiene esferas');
  return data;
}
