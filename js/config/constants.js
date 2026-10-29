/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * Configuration Constants & Presets
 */

export const DEFAULT_STUDIO_CONFIG = {
  sphereMargin: 50,          // Separación anti-colisión
  layoutMode: 'organic',     // 'custom' | 'organic' | 'orbit' | 'line' | 'constellation' | 'spiral'
  showConstellations: true,
  showAllOrbitLines: true,   // Mostrar / ocultar todas las líneas de órbita
  autoRotate: true,
  rotateSpeed: 0.8,
  universeSpeed: 1.0,        // Multiplicador de velocidad global de traslación y rotación
  bgColor: '#080a11',
  lightIntensity: 1.0,
  roughness: 0.3,
  metalness: 0.08,
  wireframe: false,
  showStars: true
};

export const SPEED_PRESETS = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0];

export const DEFAULT_SPHERE_CONFIG = {
  radius: 60,
  spinSpeed: 1.0,
  cols: 12,
  rows: 6,
  tileW: 200,
  tileH: 140,
  gap: 4,
  shape: 'rect',
  shapeScale: 1.0,
  strokeWidth: 0,
  strokeColor: '#00f0ff',
  gridColor: '#080a11',
  // Jerarquía Orbital
  parentId: null,
  bodyType: 'star', // 'star' | 'planet' | 'moon'
  orbitRadius: 150,
  orbitSpeed: 0.7,
  orbitTilt: 0, // en radianes
  orbitAngle: 0,
  showOrbitLine: true
};

export const CELESTIAL_PRESETS = {
  star: {
    type: 'star',
    label: '⭐ Estrella (Centro)',
    description: 'Centro gravitatorio del sistema estelar (No orbita)',
    defaultRadius: 85,
    spinSpeed: 0.5,
    orbitRadius: 0,
    orbitSpeed: 0,
    emissiveIntensity: 0.12,
    color: '#38bdf8'
  },
  planet: {
    type: 'planet',
    label: '🪐 Planeta',
    description: 'Cuerpo mayor que orbita directamente alrededor de una Estrella',
    defaultRadius: 48,
    spinSpeed: 1.0,
    orbitRadius: 220,
    orbitSpeed: 0.8,
    emissiveIntensity: 0.0,
    color: '#00f0ff'
  },
  moon: {
    type: 'moon',
    label: '🌙 Satélite',
    description: 'Cuerpo menor que orbita alrededor de un Planeta o Estrella',
    defaultRadius: 22,
    spinSpeed: 1.6,
    orbitRadius: 65,
    orbitSpeed: 2.2,
    emissiveIntensity: 0.0,
    color: '#c084fc'
  }
};

export const PALETTES = [
  ['#0f2027', '#203a43', '#2c5364', 'Aurora'],
  ['#134e5e', '#71b280', '#56ab2f', 'Amazonas'],
  ['#ff416c', '#ff4b2b', '#801336', 'Atardecer'],
  ['#3a1c71', '#d76d77', '#ffaf7b', 'Nebulosa'],
  ['#232526', '#414345', '#1e3c72', 'Pacífico'],
  ['#fc466b', '#3f5efb', '#11998e', 'Ciberpunk'],
  ['#e65c00', '#f9d423', '#d35400', 'Solar'],
  ['#00c6ff', '#0072ff', '#000428', 'Abismo']
];

export const SHAPES = [
  { id: 'rect', label: 'Rectángulo' },
  { id: 'rounded', label: 'Borde Suave' },
  { id: 'circle', label: 'Círculo' },
  { id: 'hexagon', label: 'Hexágono' },
  { id: 'octagon', label: 'Octógono' },
  { id: 'diamond', label: 'Diamante' },
  { id: 'triangle', label: 'Triángulo ▲' },
  { id: 'triangle-inv', label: 'Triángulo ▼' },
  { id: 'star', label: 'Estrella ★' }
];

export const THEMES = [
  { id: 'space', name: 'Espacio', bg: '#080a11', grid: '#000000', border: 'border-white/20' },
  { id: 'cyber', name: 'Cyber', bg: '#0d162f', grid: '#00f0ff', border: 'border-cyan-400/40' },
  { id: 'nebula', name: 'Nebulosa', bg: '#1f0f29', grid: '#8b5cf6', border: 'border-violet-500/40' },
  { id: 'studio', name: 'Estudio', bg: '#cbd5e1', grid: '#ffffff', border: 'border-slate-300', textDark: true }
];

export const LIMITS = {
  radius: { min: 30, max: 130, step: 2 },
  spin: { min: -3, max: 3, step: 0.2 },
  shapeScale: { min: 40, max: 100, step: 2 },
  strokeWidth: { min: 0, max: 10, step: 1 },
  cols: { min: 6, max: 24, step: 1 },
  rows: { min: 3, max: 12, step: 1 },
  gap: { min: 0, max: 20, step: 1 },
  margin: { min: 15, max: 250, step: 5 },
  light: { min: 0.2, max: 2.5, step: 0.1 },
  roughness: { min: 0.0, max: 1.0, step: 0.05 },
  orbitRadius: { min: 50, max: 600, step: 5 },
  orbitSpeed: { min: -4.0, max: 4.0, step: 0.1 },
  orbitTilt: { min: -90, max: 90, step: 1 }
};
