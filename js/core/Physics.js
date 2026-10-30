/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * Physics: Hierarchical Solar System & Anti-Collision Relaxation Engine
 */

export class Physics {
  /**
   * @param {Object} THREE - Three.js global namespace
   */
  constructor(THREE = window.THREE) {
    this.THREE = THREE;
    // Reusable vector math helpers to prevent GC churn in physics loop
    this._delta = new this.THREE.Vector3();
    this._push = new this.THREE.Vector3();
  }

  /**
   * Recalculates non-colliding positions and orbital lane separations.
   * Handles root stars (stellar systems) and sibling planetary orbits.
   * @param {Array<SphereEntity>} spheres - Active spheres in the studio
   * @param {string} layoutMode - 'organic' | 'orbit' | 'line' | 'constellation'
   * @param {number} margin - Minimum Euclidean safety distance between sphere perimeters
   */
  recalculateLayout(spheres, layoutMode = 'organic', margin = 50, reset = false) {
    if (!spheres || spheres.length === 0) return;

    // 1. Separar esferas raíz (soles / centros) de los cuerpos en órbita jerárquica
    const sphereMap = new Map();
    spheres.forEach(s => sphereMap.set(s.id, s));

    const rootSpheres = spheres.filter(s => !s.parentId || !sphereMap.has(s.parentId));
    const childSpheres = spheres.filter(s => s.parentId && sphereMap.has(s.parentId));

    // Primero los carriles orbitales (fijan orbitRadius y minPeriapsis), luego el alcance de cada sistema
    this.relaxSiblingOrbits(childSpheres, sphereMap, margin);

    // Radio envolvente de cada sistema (estrella + todo lo que la orbita)
    this.computeExtents(spheres, sphereMap);
    rootSpheres.forEach(s => { s.layoutRadius = s.systemExtent; });

    // 2. Disponer las esferas raíz. En modo "custom" mandan las posiciones del usuario.
    const custom = layoutMode === 'custom';
    this._custom = custom;

    if (custom) {
      this.layoutCustom(rootSpheres, margin);
    } else if (rootSpheres.length === 1) {
      rootSpheres[0].targetPos.set(0, 0, 0);
      if (rootSpheres[0].position.lengthSq() === 0) rootSpheres[0].position.set(0, 0, 0);
    } else if (rootSpheres.length > 1) {
      switch (layoutMode) {
        case 'orbit':
          this.layoutOrbit(rootSpheres, margin);
          break;
        case 'line':
          this.layoutLine(rootSpheres, margin);
          break;
        case 'constellation':
          this.layoutConstellation(rootSpheres, margin);
          break;
        case 'spiral':
          this.layoutSpiral(rootSpheres, margin);
          break;
        case 'organic':
        default:
          this.layoutOrganic(rootSpheres, margin, reset);
          break;
      }
    }

    // 3. Evitar solapes entre sistemas completos
    this.relaxRootSystems(rootSpheres, margin);


    // Inicializar vectores de posición para cuerpos recién nacidos
    spheres.forEach(s => {
      if (s.position.lengthSq() === 0) {
        s.position.copy(s.targetPos);
      }
    });
  }

  /** Alcance (distancia máxima desde el centro) de cada cuerpo incluyendo sus órbitas descendientes. */
  computeExtents(spheres, sphereMap) {
    const kids = new Map();
    spheres.forEach(s => {
      if (s.parentId && sphereMap.has(s.parentId)) {
        if (!kids.has(s.parentId)) kids.set(s.parentId, []);
        kids.get(s.parentId).push(s);
      }
    });
    const visit = (s, depth) => {
      let reach = s.radius;
      if (depth < 8) {
        (kids.get(s.id) || []).forEach(c => {
          const orbit = c.orbitRadius * (1 + Math.min(c.orbitEccentricity || 0, 0.95));
          reach = Math.max(reach, orbit + visit(c, depth + 1));
        });
      }
      s.systemExtent = reach;
      return reach;
    };
    spheres.forEach(s => { if (!s.parentId || !sphereMap.has(s.parentId)) visit(s, 0); });
  }

  /**
   * Modo personalizado: las posiciones elegidas por el usuario se respetan.
   * Los sistemas nuevos se colocan justo fuera de los existentes.
   */
  layoutCustom(roots, margin) {
    const placed = roots.filter(s => s.manualPos);
    placed.forEach(s => s.targetPos.copy(s.manualPos));

    roots.filter(s => !s.manualPos).forEach((s, i) => {
      if (placed.length === 0) {
        s.targetPos.set(0, 0, 0);
      } else {
        let bound = 0;
        placed.forEach(p => { bound = Math.max(bound, p.targetPos.length() + p.layoutRadius); });
        const angle = (placed.length + i) * 2.399963;
        const d = bound + s.layoutRadius + margin;
        s.targetPos.set(Math.cos(angle) * d, 0, Math.sin(angle) * d);
      }
      s.manualPos = s.targetPos.clone();
      s.position.copy(s.targetPos);
      placed.push(s);
    });
  }

  /**
   * Asegura que dos sistemas raíz no se solapen teniendo en cuenta la extensión de sus planetas.
   */
  relaxRootSystems(rootSpheres, margin) {
    if (rootSpheres.length < 2) return;
    const systemExtent = new Map(rootSpheres.map(r => [r.id, r.layoutRadius]));
    const fixed = (s) => this._custom && !!s.manualPos;
    for (let k = 0; k < 20; k++) {
      for (let i = 0; i < rootSpheres.length; i++) {
        for (let j = i + 1; j < rootSpheres.length; j++) {
          const a = rootSpheres[i];
          const b = rootSpheres[j];

          this._delta.subVectors(b.targetPos, a.targetPos);
          let dist = this._delta.length();
          const reqDist = systemExtent.get(a.id) + systemExtent.get(b.id) + margin * 0.8;

          if (dist < 0.001) {
            this._delta.set((Math.random() - 0.5) || 1, 0, (Math.random() - 0.5) || 1).normalize();
            dist = 0.001;
          }

          if (dist < reqDist) {
            const overlap = reqDist - dist;
            const wa = fixed(a) ? 0 : 1;
            const wb = fixed(b) ? 0 : 1;
            if (wa + wb === 0) continue;
            this._push.copy(this._delta).normalize().multiplyScalar(overlap);
            a.targetPos.addScaledVector(this._push, -wa / (wa + wb));
            b.targetPos.addScaledVector(this._push, wb / (wa + wb));
          }
        }
      }
    }
  }

  /**
   * Previene colisiones entre hermanos del mismo padre:
   * Ajusta carriles orbitales (orbitRadius) para que no compartan la misma órbita en conflicto.
   */
  relaxSiblingOrbits(childSpheres, sphereMap, margin) {
    if (childSpheres.length === 0) return;

    // Agrupar por parentId
    const families = new Map();
    childSpheres.forEach(child => {
      if (!families.has(child.parentId)) {
        families.set(child.parentId, []);
      }
      families.get(child.parentId).push(child);
    });

    families.forEach((siblings, parentId) => {
      const parent = sphereMap.get(parentId);
      if (!parent) return;

      // Cada órbita es independiente: solo se garantiza la distancia mínima a la superficie del padre.
      // Las órbitas de hermanos pueden cruzarse; no se empujan unas a otras al editarlas.
      siblings.forEach(child => {
        const minDistanceToParent = parent.radius + child.radius + Math.max(20, margin * 0.4);
        child.minPeriapsis = minDistanceToParent;
        if (child.orbitRadius < minDistanceToParent) {
          child.orbitRadius = minDistanceToParent;
        }
      });
    });
  }

  /**
   * Orbit Mode: Distribuye esferas raíz en anillo circular.
   */
  layoutOrbit(spheres, margin) {
    let sumRadii = 0;
    spheres.forEach(s => { sumRadii += this.lr(s); });
    const avgR = sumRadii / spheres.length;
    const minPerimeter = spheres.length * (avgR * 2 + margin);
    const orbRadius = Math.max(140, minPerimeter / (2 * Math.PI));

    spheres.forEach((s, i) => {
      const angle = (i / spheres.length) * Math.PI * 2;
      s.targetPos.set(
        Math.cos(angle) * orbRadius,
        Math.sin(angle * 2) * (margin * 0.15),
        Math.sin(angle) * orbRadius
      );
    });
  }

  lr(s) {
    return s.layoutRadius || s.radius;
  }

  /**
   * Line Mode: Dispone esferas raíz en fila horizontal planetaria.
   */
  layoutLine(spheres, margin) {
    let totalW = 0;
    for (let i = 0; i < spheres.length - 1; i++) {
      totalW += this.lr(spheres[i]) + this.lr(spheres[i + 1]) + margin;
    }

    let curX = -totalW / 2;
    spheres.forEach((s, i) => {
      if (i > 0) curX += this.lr(spheres[i - 1]) + this.lr(s) + margin;
      s.targetPos.set(curX, 0, 0);
    });
  }

  /**
   * Constellation Mode: un sistema central con el resto en capas a su alrededor.
   */
  layoutConstellation(spheres, margin) {
    spheres.forEach((s, i) => {
      if (i === 0) {
        s.targetPos.set(0, 0, 0);
      } else {
        const angle = ((i - 1) / (spheres.length - 1)) * Math.PI * 2;
        const dist = (this.lr(spheres[0]) + this.lr(s) + margin) * (i % 2 === 0 ? 1.15 : 1.6);
        s.targetPos.set(
          Math.cos(angle) * dist,
          Math.sin(angle) * (dist * 0.4),
          Math.sin(angle * 1.5) * (dist * 0.7)
        );
      }
    });
    this.relaxCollisions(spheres, margin, 18);
  }

  /**
   * Spiral Mode: brazo de galaxia en espiral.
   */
  layoutSpiral(spheres, margin) {
    let dist = 0;
    spheres.forEach((s, i) => {
      if (i > 0) dist += this.lr(spheres[i - 1]) + this.lr(s) + margin;
      const angle = i === 0 ? 0 : Math.sqrt(dist) * 0.35 * 2.2;
      s.targetPos.set(Math.cos(angle) * dist * 0.75, 0, Math.sin(angle) * dist * 0.75);
    });
    this.relaxCollisions(spheres, margin, 18);
  }

  /**
   * Organic Mode: repulsión libre. Con reset reparte los sistemas en espiral áurea desde cero.
   */
  layoutOrganic(spheres, margin, reset = false) {
    let dist = 0;
    spheres.forEach((s, idx) => {
      if (idx > 0 && (reset || s.targetPos.lengthSq() === 0)) {
        const prev = spheres[idx - 1];
        dist += this.lr(prev) + this.lr(s) + margin;
        const angle = idx * 2.399963;
        s.targetPos.set(
          Math.cos(angle) * dist * 0.8,
          (Math.random() - 0.5) * margin * 0.6,
          Math.sin(angle) * dist * 0.8
        );
      } else if (idx === 0 && reset) {
        s.targetPos.set(0, 0, 0);
      }
    });
    this.relaxCollisions(spheres, margin, 25);
  }

  /**
   * Algoritmo iterativo de relajación euclidiana:
   * Garantiza distancia >= radiusA + radiusB + margin para cada par.
   */
  relaxCollisions(spheres, margin, iterations = 25) {
    const count = spheres.length;
    if (count < 2) return;

    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = spheres[i];
          const b = spheres[j];

          this._delta.subVectors(b.targetPos, a.targetPos);
          let dist = this._delta.length();
          const reqDist = this.lr(a) + this.lr(b) + margin;

          if (dist < 0.001) {
            this._delta.set(
              (Math.random() - 0.5) || 1,
              (Math.random() - 0.5) * 0.2,
              (Math.random() - 0.5) || 1
            ).normalize();
            dist = 0.001;
          }

          if (dist < reqDist) {
            const overlap = reqDist - dist;
            this._push.copy(this._delta).normalize().multiplyScalar(overlap * 0.52);
            a.targetPos.sub(this._push);
            b.targetPos.add(this._push);
          }
        }
      }
    }
  }
}
