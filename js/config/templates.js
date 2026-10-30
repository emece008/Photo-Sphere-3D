/**
 * Photo Sphere Studio 3D - Plantillas de universo
 * Cada plantilla genera datos con el mismo formato que UniverseManager.serialize()
 * (sin fotos), de modo que se cargan con replaceUniverse() como cualquier universo guardado.
 */

import { getCelestialDef } from '../entities/CelestialTextures.js';
import { RING_PRESETS } from '../effects/AsteroidRing.js';

/** Esfera de catálogo con su jerarquía orbital. `orbit` en unidades del mundo, `tilt` en radianes. */
function body(id, parentId, orbit, speed, tilt = 0, extra = {}) {
  const def = getCelestialDef(id);
  return {
    id: `tpl_${id}`,
    name: def.name,
    celestial: def.id,
    radius: def.radius,
    spinSpeed: def.spin,
    shape: 'circle',
    gap: 4,
    bodyType: def.bodyType,
    parentId: parentId ? `tpl_${parentId}` : null,
    orbitRadius: orbit,
    orbitSpeed: speed,
    orbitTilt: tilt,
    fx: def.fx,
    images: [],
    ...extra
  };
}

function solarSystem() {
  // Las órbitas se separan por la extensión de cada sistema (planeta + lunas) para que nada colisione.
  // Cinturón de asteroides entre Marte y Júpiter, como efecto del propio Sol (múltiplos de su radio)
  const belt = { rings: { on: true, ...RING_PRESETS.asteroids, inner: 9.2, width: 0.9, count: 1400, dust: 700, size: 1.2 } };
  const sun = body('sun', null, 0, 0, 0, { manualPos: { x: 0, y: 0, z: 0 } });
  sun.fx = { ...sun.fx, ...belt };

  return {
    name: 'Sistema Solar',
    config: { showAllOrbitLines: true, showConstellations: true },
    spheres: [
      sun,
      body('mercury', 'sun', 150, 2.4, 0.12),
      body('venus', 'sun', 235, 1.8, 0.06),
      body('earth', 'sun', 445, 1.4),
      body('iss', 'earth', 66, 3.6, 0.9),
      body('hubble', 'earth', 80, 3.1, 0.52),
      body('gps', 'earth', 95, 2.4, 0.96),
      body('moon', 'earth', 130, 1.5, 0.09),
      body('mars', 'sun', 695, 1.1, 0.03),
      body('phobos', 'mars', 50, 2.8, 0.05),
      body('deimos', 'mars', 80, 2.0, -0.08),
      body('ceres', 'sun', 820, 0.9, 0.18),
      body('jupiter', 'sun', 1160, 0.6, 0.02),
      body('io', 'jupiter', 104, 2.6),
      body('europa', 'jupiter', 150, 2.1),
      body('ganymede', 'jupiter', 200, 1.7),
      body('callisto', 'jupiter', 254, 1.3),
      body('saturn', 'sun', 1690, 0.45, 0.04),
      body('enceladus', 'saturn', 158, 2.0),
      body('titan', 'saturn', 202, 1.2),
      body('uranus', 'sun', 1990, 0.35, 0.01),
      body('neptune', 'sun', 2160, 0.28, 0.03),
      body('triton', 'neptune', 80, 1.6, 0.3),
      body('pluto', 'sun', 2345, 0.2, 0.3),
      body('charon', 'pluto', 44, 1.4),
      body('voyager', 'sun', 2480, 0.1, 0.45)
    ]
  };
}

export const UNIVERSE_TEMPLATES = [
  {
    id: 'solar-system',
    name: 'Sistema Solar',
    icon: '☀️',
    description: 'El Sol, sus 8 planetas, Plutón y Ceres, con sus lunas principales, un cinturón de asteroides y satélites artificiales (ISS, Hubble, GPS) y la sonda Voyager 1.',
    build: solarSystem
  }
];

export function getUniverseTemplate(id) {
  return UNIVERSE_TEMPLATES.find(t => t.id === id) || null;
}
