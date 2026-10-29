/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * CelestialTextures: catálogo de objetos celestes y texturas procedurales equirrectangulares
 * (no requieren imágenes externas, funcionan sin conexión).
 */

export const CELESTIAL_CATALOG = [
  { id: 'sun', name: 'Sol', bodyType: 'star', icon: '☀️', radius: 85, spin: 0.3, emissive: true,
    fx: { aura: { on: true, color: '#ffb347', size: 3, intensity: 0.6, pulse: true } },
    info: 'Estrella tipo G. Contiene el 99,8 % de la masa del Sistema Solar.' },

  { id: 'mercury', name: 'Mercurio', bodyType: 'planet', icon: '⚫', radius: 22, spin: 0.4,
    info: 'El planeta más cercano al Sol y el más pequeño.' },
  { id: 'venus', name: 'Venus', bodyType: 'planet', icon: '🟡', radius: 38, spin: -0.3,
    info: 'Atmósfera densa de CO₂; el planeta más caliente.' },
  { id: 'earth', name: 'Tierra', bodyType: 'planet', icon: '🌍', radius: 40, spin: 1.0,
    info: 'Nuestro hogar: el único mundo conocido con vida.' },
  { id: 'mars', name: 'Marte', bodyType: 'planet', icon: '🔴', radius: 28, spin: 1.0,
    info: 'El planeta rojo, con casquetes polares y volcanes gigantes.' },
  { id: 'jupiter', name: 'Júpiter', bodyType: 'planet', icon: '🟠', radius: 64, spin: 1.8,
    info: 'Gigante gaseoso; su Gran Mancha Roja es una tormenta de siglos.' },
  { id: 'saturn', name: 'Saturno', bodyType: 'planet', icon: '🪐', radius: 54, spin: 1.6, ring: true,
    info: 'Famoso por sus anillos de hielo y roca.' },
  { id: 'uranus', name: 'Urano', bodyType: 'planet', icon: '🔵', radius: 44, spin: 1.2,
    info: 'Gigante helado que gira prácticamente tumbado.' },
  { id: 'neptune', name: 'Neptuno', bodyType: 'planet', icon: '🔷', radius: 43, spin: 1.2,
    info: 'El planeta más lejano, con vientos supersónicos.' },

  { id: 'moon', name: 'Luna', bodyType: 'moon', icon: '🌙', radius: 20, spin: 0.6,
    info: 'Único satélite natural de la Tierra.' },
  { id: 'io', name: 'Ío', bodyType: 'moon', icon: '🟨', radius: 20, spin: 0.8,
    info: 'La luna volcánicamente más activa del Sistema Solar.' },
  { id: 'europa', name: 'Europa', bodyType: 'moon', icon: '⚪', radius: 18, spin: 0.7,
    info: 'Luna helada de Júpiter con un océano bajo su corteza.' },
  { id: 'titan', name: 'Titán', bodyType: 'moon', icon: '🟤', radius: 24, spin: 0.6,
    info: 'La mayor luna de Saturno, con atmósfera densa y lagos de metano.' },

  // Objetos exóticos
  { id: 'pulsar', name: 'Púlsar', bodyType: 'star', exotic: true, icon: '📡', radius: 26, spin: 7, emissive: true,
    fx: { beams: { on: true, color: '#67e8f9', length: 9, tilt: 35 }, aura: { on: true, color: '#67e8f9', size: 2.6, intensity: 0.7, pulse: true } },
    info: 'Estrella de neutrones que gira a gran velocidad y barre el espacio con haces de radiación.' },
  { id: 'blackhole', name: 'Agujero negro', bodyType: 'star', exotic: true, icon: '🕳️', radius: 48, spin: 0.4, ring: 'accretion',
    fx: { aura: { on: true, color: '#ff8a3d', size: 3.4, intensity: 0.55, pulse: true } },
    info: 'Región de gravedad tan intensa que ni la luz escapa. Su disco de acreción brilla al caer la materia.' },
  { id: 'nebula', name: 'Nebulosa', bodyType: 'star', exotic: true, icon: '🌌', radius: 90, spin: 0.15, emissive: true,
    fx: { aura: { on: true, color: '#c084fc', size: 2.6, intensity: 0.45, pulse: true }, sparks: { on: true, color: '#f0abfc', rate: 18, size: 1.2 } },
    info: 'Inmensa nube de gas y polvo donde nacen las estrellas.' },
  { id: 'whitedwarf', name: 'Enana blanca', bodyType: 'star', exotic: true, icon: '⚪', radius: 24, spin: 1.5, emissive: true,
    fx: { aura: { on: true, color: '#dbeafe', size: 2.8, intensity: 0.6, pulse: false } },
    info: 'Remanente caliente y denso de una estrella como el Sol.' },
  { id: 'redgiant', name: 'Gigante roja', bodyType: 'star', exotic: true, icon: '🔴', radius: 110, spin: 0.2, emissive: true,
    fx: { aura: { on: true, color: '#ff5a36', size: 2.4, intensity: 0.55, pulse: true } },
    info: 'Estrella envejecida que se ha hinchado hasta cientos de veces el tamaño del Sol.' },
  { id: 'comet', name: 'Cometa', bodyType: 'planet', exotic: true, icon: '☄️', radius: 14, spin: 0.8,
    fx: { tail: { on: true, color: '#9bd8ff', length: 5, density: 150, size: 1 }, aura: { on: true, color: '#9bd8ff', size: 2.2, intensity: 0.45, pulse: false } },
    info: 'Bola de hielo y polvo que desarrolla una cola brillante al acercarse a su estrella.' },
  { id: 'asteroid', name: 'Asteroide', bodyType: 'moon', exotic: true, icon: '🪨', radius: 11, spin: 1.1,
    info: 'Fragmento rocoso sobrante de la formación del sistema planetario.' }
];

export function getCelestialDef(id) {
  return CELESTIAL_CATALOG.find(c => c.id === id) || null;
}

/* ---------- Ruido 3D determinista (continuo sobre la esfera, sin costuras) ---------- */

function hash3(x, y, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi, seed), hash3(xi + 1, yi, zi, seed), u),
      l(hash3(xi, yi + 1, zi, seed), hash3(xi + 1, yi + 1, zi, seed), u), v),
    l(l(hash3(xi, yi, zi + 1, seed), hash3(xi + 1, yi, zi + 1, seed), u),
      l(hash3(xi, yi + 1, zi + 1, seed), hash3(xi + 1, yi + 1, zi + 1, seed), u), v),
    w
  );
}

function fbm(x, y, z, seed, octaves = 5) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq, seed + i * 31);
    norm += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function ramp(stops, t) {
  t = clamp01(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      return mix(c0, c1, (t - p0) / (p1 - p0 || 1));
    }
  }
  return stops[stops.length - 1][1];
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Generadores de color por píxel: (x,y,z) punto unitario en la esfera ---------- */

const SHADERS = {
  earth(x, y, z) {
    const n = fbm(x * 1.7, y * 1.7, z * 1.7, 11, 6);
    let col;
    if (n < 0.5) {
      col = ramp([[0, [10, 40, 110]], [0.7, [20, 90, 170]], [1, [70, 160, 210]]], n / 0.5);
    } else {
      const e = (n - 0.5) / 0.3;
      col = ramp([[0, [210, 195, 130]], [0.12, [70, 140, 60]], [0.5, [40, 100, 45]], [0.75, [125, 105, 80]], [1, [245, 245, 245]]], e);
    }
    const ice = clamp01((Math.abs(y) - 0.86) * 18);
    col = mix(col, [240, 245, 250], ice);
    const c = fbm(x * 3.2 + 9, y * 3.2 + 4, z * 3.2 + 1, 71, 5);
    return mix(col, [255, 255, 255], clamp01((c - 0.5) * 3.2) * 0.8);
  },

  mars(x, y, z) {
    const n = fbm(x * 2.4, y * 2.4, z * 2.4, 23, 6);
    let col = ramp([[0, [110, 50, 28]], [0.5, [185, 95, 52]], [1, [220, 150, 100]]], n);
    const dark = clamp01((fbm(x * 1.3 + 5, y * 1.3, z * 1.3, 29, 4) - 0.55) * 4);
    col = mix(col, [80, 40, 30], dark * 0.55);
    return mix(col, [245, 240, 235], clamp01((Math.abs(y) - 0.9) * 25));
  },

  venus(x, y, z) {
    const wx = fbm(x * 2, y * 2, z * 2, 41, 4);
    const n = fbm(x * 2.5 + wx * 1.6, y * 6 + wx * 2, z * 2.5 + wx * 1.6, 43, 5);
    return ramp([[0, [190, 140, 70]], [0.5, [230, 195, 120]], [1, [250, 232, 185]]], n);
  },

  mercury(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3, 5, 6);
    return ramp([[0, [70, 66, 62]], [0.5, [135, 128, 120]], [1, [185, 178, 168]]], n);
  },

  moon(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3, 7, 6);
    const maria = clamp01((0.5 - fbm(x * 1.2, y * 1.2, z * 1.2, 8, 3)) * 4);
    const col = ramp([[0, [95, 95, 98]], [0.5, [155, 155, 158]], [1, [205, 205, 205]]], n);
    return mix(col, [70, 70, 76], maria * 0.7);
  },

  jupiter(x, y, z) {
    const w = fbm(x * 3, y * 5, z * 3, 61, 5);
    const t = 0.5 + 0.5 * Math.sin(y * 13 + (w - 0.5) * 5);
    const col = ramp([[0, [140, 90, 60]], [0.35, [205, 160, 120]], [0.65, [238, 222, 195]], [1, [175, 115, 78]]], t);
    const d = (fbm(x * 12, y * 22, z * 12, 63, 3) - 0.5) * 36;
    return [col[0] + d, col[1] + d, col[2] + d];
  },

  saturn(x, y, z) {
    const w = fbm(x * 2, y * 4, z * 2, 81, 4);
    const t = 0.5 + 0.5 * Math.sin(y * 17 + (w - 0.5) * 3);
    const col = ramp([[0, [190, 160, 105]], [0.5, [225, 200, 150]], [1, [240, 225, 185]]], t);
    const d = (fbm(x * 10, y * 20, z * 10, 83, 3) - 0.5) * 20;
    return [col[0] + d, col[1] + d, col[2] + d];
  },

  uranus(x, y, z) {
    const t = 0.5 + 0.5 * Math.sin(y * 9 + (fbm(x * 2, y * 3, z * 2, 91, 3) - 0.5) * 2);
    return ramp([[0, [120, 200, 210]], [1, [170, 230, 235]]], t);
  },

  neptune(x, y, z) {
    const w = fbm(x * 3, y * 6, z * 3, 101, 4);
    const t = 0.5 + 0.5 * Math.sin(y * 11 + (w - 0.5) * 4);
    const col = ramp([[0, [25, 50, 150]], [0.6, [50, 90, 210]], [1, [95, 150, 240]]], t);
    const streak = clamp01((fbm(x * 6, y * 14, z * 6, 103, 3) - 0.62) * 6);
    return mix(col, [220, 235, 255], streak * 0.5);
  },

  sun(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3, 111, 6);
    const g = fbm(x * 12, y * 12, z * 12, 113, 3);
    const t = clamp01(n * 0.9 + g * 0.35 - 0.12);
    return ramp([[0, [200, 55, 5]], [0.45, [255, 140, 20]], [0.8, [255, 205, 70]], [1, [255, 245, 190]]], t);
  },

  io(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3, 121, 5);
    let col = ramp([[0, [210, 180, 70]], [1, [245, 230, 130]]], n);
    const s = clamp01((fbm(x * 5 + 3, y * 5, z * 5, 123, 4) - 0.6) * 6);
    col = mix(col, [190, 70, 25], s);
    const dark = clamp01((fbm(x * 7, y * 7 + 2, z * 7, 125, 3) - 0.72) * 10);
    return mix(col, [40, 25, 20], dark);
  },

  europa(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3, 131, 4);
    let col = ramp([[0, [205, 195, 180]], [1, [245, 240, 232]]], n);
    const crack = 1 - clamp01(Math.abs(fbm(x * 4, y * 4, z * 4, 133, 3) - 0.5) * 38);
    col = mix(col, [150, 95, 60], crack * 0.8);
    return col;
  },

  titan(x, y, z) {
    const n = fbm(x * 2.5, y * 4, z * 2.5, 141, 4);
    return ramp([[0, [185, 115, 35]], [1, [232, 170, 80]]], n);
  }
};

Object.assign(SHADERS, {
  pulsar(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3, 201, 4);
    const pole = clamp01((Math.abs(y) - 0.7) * 3);
    return mix(ramp([[0, [60, 140, 230]], [1, [150, 210, 255]]], n), [220, 245, 255], pole);
  },

  blackhole() {
    return [3, 3, 5];
  },

  nebula(x, y, z) {
    const w = fbm(x * 1.6, y * 1.6, z * 1.6, 211, 4);
    const n = fbm(x * 2.2 + w * 1.8, y * 2.2 + w * 1.2, z * 2.2 + w * 1.8, 213, 6);
    const m = fbm(x * 3 + 7, y * 3, z * 3 + 3, 217, 4);
    let col = ramp([[0, [30, 10, 80]], [0.35, [150, 40, 170]], [0.65, [40, 130, 220]], [1, [255, 170, 230]]], n);
    col = mix(col, [255, 120, 70], clamp01((m - 0.55) * 3) * 0.7);
    const glow = clamp01((fbm(x * 6, y * 6, z * 6, 219, 3) - 0.62) * 8);
    return mix(col, [255, 255, 255], glow * 0.8);
  },

  whitedwarf(x, y, z) {
    const n = fbm(x * 4, y * 4, z * 4, 223, 4);
    return ramp([[0, [190, 210, 255]], [1, [255, 255, 255]]], n);
  },

  redgiant(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3, 227, 5);
    const cell = fbm(x * 9, y * 9, z * 9, 229, 3);
    return ramp([[0, [120, 20, 10]], [0.5, [220, 70, 25]], [1, [255, 160, 70]]], n * 0.75 + cell * 0.25);
  },

  comet(x, y, z) {
    const n = fbm(x * 3.5, y * 3.5, z * 3.5, 233, 5);
    const ice = clamp01((fbm(x * 6, y * 6, z * 6, 235, 3) - 0.62) * 6);
    return mix(ramp([[0, [40, 38, 36]], [1, [110, 104, 98]]], n), [200, 230, 245], ice * 0.8);
  },

  asteroid(x, y, z) {
    const n = fbm(x * 4, y * 4, z * 4, 241, 6);
    return ramp([[0, [60, 52, 46]], [1, [150, 136, 120]]], n);
  }
});

/* ---------- Detalles pintados encima (cráteres, tormentas) ---------- */

function paintCraters(ctx, w, h, count, seed, light) {
  const rand = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = (0.14 + rand() * 0.72) * h;
    const r = (rand() ** 2.2) * w * 0.028 + w * 0.003;
    const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${0.22 + rand() * 0.15})`);
    g.addColorStop(0.78, 'rgba(0,0,0,0.05)');
    g.addColorStop(0.92, `rgba(255,255,255,${light})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    for (const dx of [0, -w, w]) {
      ctx.beginPath();
      ctx.arc(x + dx, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintSpot(ctx, w, h, u, v, rx, ry, color, alpha) {
  ctx.save();
  ctx.translate(u * w, v * h);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(0.7, `rgba(${color},${alpha * 0.6})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const DECORATE = {
  mercury: (ctx, w, h) => paintCraters(ctx, w, h, 220, 3, 0.2),
  moon: (ctx, w, h) => paintCraters(ctx, w, h, 170, 4, 0.28),
  mars: (ctx, w, h) => paintCraters(ctx, w, h, 60, 6, 0.1),
  comet: (ctx, w, h) => paintCraters(ctx, w, h, 50, 8, 0.15),
  asteroid: (ctx, w, h) => paintCraters(ctx, w, h, 120, 9, 0.2),
  jupiter: (ctx, w, h) => paintSpot(ctx, w, h, 0.68, 0.62, w * 0.05, h * 0.045, '176,70,40', 0.85),
  neptune: (ctx, w, h) => paintSpot(ctx, w, h, 0.3, 0.55, w * 0.04, h * 0.03, '15,30,100', 0.7)
};

/**
 * Pinta la textura equirrectangular de un objeto celeste en un canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {string} id - id del catálogo
 * @param {number} width - ancho en px (alto = width / 2)
 */
export function paintCelestialTexture(canvas, id, width = 1024) {
  const shader = SHADERS[id] || SHADERS.moon;
  const w = width;
  const h = width / 2;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let j = 0; j < h; j++) {
    const theta = ((j + 0.5) / h) * Math.PI;
    const y = Math.cos(theta);
    const sinT = Math.sin(theta);
    for (let i = 0; i < w; i++) {
      const phi = ((i + 0.5) / w) * Math.PI * 2;
      const x = -Math.cos(phi) * sinT;
      const z = Math.sin(phi) * sinT;
      const c = shader(x, y, z);
      const o = (j * w + i) * 4;
      d[o] = c[0] < 0 ? 0 : c[0] > 255 ? 255 : c[0];
      d[o + 1] = c[1] < 0 ? 0 : c[1] > 255 ? 255 : c[1];
      d[o + 2] = c[2] < 0 ? 0 : c[2] > 255 ? 255 : c[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (DECORATE[id]) DECORATE[id](ctx, w, h);
  return canvas;
}

/** Textura radial (u = distancia normalizada) para anillos: 'saturn' (hielo y roca) o 'accretion' (disco incandescente). */
export function paintRingTexture(canvas, style = 'saturn') {
  canvas.width = 512;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(512, 4);
  for (let i = 0; i < 512; i++) {
    const t = i / 511;
    let a, col;
    if (style === 'accretion') {
      const turb = 0.75 + 0.25 * Math.sin(t * 140) * Math.sin(t * 47 + 2);
      a = Math.pow(1 - t, 1.4) * turb;
      if (t < 0.03) a *= t / 0.03;
      col = ramp([[0, [255, 250, 225]], [0.2, [255, 190, 90]], [0.6, [230, 90, 30]], [1, [120, 25, 10]]], t);
    } else {
      const band = 0.5 + 0.5 * Math.sin(t * 90) * Math.sin(t * 31 + 1);
      a = 0.35 + 0.55 * band;
      if (t < 0.04 || t > 0.97) a *= 0.3;
      if (t > 0.56 && t < 0.63) a *= 0.08;
      col = mix([150, 125, 90], [235, 215, 175], t);
    }
    for (let j = 0; j < 4; j++) {
      const o = (j * 512 + i) * 4;
      img.data[o] = col[0];
      img.data[o + 1] = col[1];
      img.data[o + 2] = col[2];
      img.data[o + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
