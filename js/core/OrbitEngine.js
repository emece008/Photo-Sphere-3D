/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * OrbitEngine: Planetary Orbits, Hierarchical Solar Systems & Gravitational Inertia
 */

export class OrbitEngine {
  /**
   * @param {Object} THREE - Three.js global namespace
   */
  constructor(THREE = window.THREE) {
    this.THREE = THREE;

    // Flight and camera animation state
    this.focusedEntity = null;
    this.isFlying = false;
    this.flightStartTime = 0;
    this.flightDuration = 1000;
    this.flightStartCamPos = null;
    this.flightStartTarget = null;
    this.flightCamOffset = null;
    this.lastEntityPos = null;

    // Global overview framing
    this.isFlyingTarget = false;
    this.targetFlightStart = 0;
    this.targetFlightDuration = 1000;
    this.destCamPos = null;
    this.destLookAt = null;
  }

  /**
   * Updates all planetary kinematics, hierarchical orbits, axial spins, and camera transitions.
   * Called on every frame inside the animation loop.
   * @param {Array<SphereEntity>} spheres
   * @param {Object} controls - OrbitControls instance
   * @param {Object} camera - PerspectiveCamera instance
   * @param {Object} constellationLines - LineSegments instance (optional)
   * @param {Object} studioConfig - Studio global config
   * @param {number} delta - Frame delta time (seconds)
   */
  update(spheres, controls, camera, constellationLines, studioConfig, delta = 0.016) {
    const autoRotate = studioConfig.autoRotate;
    const universeSpeed = studioConfig && studioConfig.universeSpeed !== undefined ? studioConfig.universeSpeed : 1.0;
    const sphereMap = new Map();
    spheres.forEach(s => sphereMap.set(s.id, s));

    // Sincronizar velocidad de giro de la cámara orbital
    if (controls && controls.autoRotate) {
      controls.autoRotateSpeed = (studioConfig.rotateSpeed || 0.8) * universeSpeed * 2.0;
    }

    // Helper to calculate hierarchy depth (0 = Star/Root, 1 = Planet, 2 = Moon/Satellite)
    const getDepth = (sphere, visited = new Set()) => {
      if (!sphere || !sphere.parentId || !sphereMap.has(sphere.parentId) || visited.has(sphere.id)) {
        return 0;
      }
      visited.add(sphere.id);
      return 1 + getDepth(sphereMap.get(sphere.parentId), visited);
    };

    // Sort topologically so parent positions are updated before children calculate relative orbits
    const sortedSpheres = [...spheres].sort((a, b) => getDepth(a) - getDepth(b));

    for (let i = 0; i < sortedSpheres.length; i++) {
      const s = sortedSpheres[i];
      const hasParent = s.parentId && sphereMap.has(s.parentId);

      if (!hasParent) {
        // Estrella raíz / Cuerpo libre: sigue la simulación espacial física
        s.position.lerp(s.targetPos, 0.08);
        if (s.orbitLine) {
          s.orbitLine.visible = false;
        }
      } else {
        // Planeta o Luna en órbita jerárquica de su cuerpo padre
        const parent = sphereMap.get(s.parentId);

        // Avanzar el acumulador de ángulo orbital de traslación multiplicado por la velocidad general
        if (autoRotate) {
          s.orbitAngle += s.orbitSpeed * 0.015 * universeSpeed;
        }

        // Cálculo de posición relativa 3D considerando radio e inclinación del plano orbital
        s.orbitOffset(s.orbitAngle, this._off || (this._off = new this.THREE.Vector3()));
        const relX = this._off.x;
        const relY = this._off.y;
        const relZ = this._off.z;

        s.targetPos.set(
          parent.position.x + relX,
          parent.position.y + relY,
          parent.position.z + relZ
        );

        // Seguimiento fluido del padre con inercia
        s.position.copy(s.targetPos);

        // Actualizar centro del anillo de la órbita (THREE.LineLoop) en la posición del padre
        s.updateOrbitLinePosition(parent.position, studioConfig.showAllOrbitLines);
      }

      // Sincronizar posición de malla 3D y rotación axial propia con el multiplicador de velocidad
      if (s.mesh) {
        s.mesh.position.copy(s.position);
        if (autoRotate) {
          s.mesh.rotation.y += 0.0035 * s.spinSpeed * universeSpeed;
        }
      }
    }

    // 2. Actualizar filamentos dinámicos de constelación si están activos
    if (constellationLines && constellationLines.geometry && constellationLines.userData.pairs) {
      const attr = constellationLines.geometry.attributes.position;
      if (attr) {
        let idx = 0;
        constellationLines.userData.pairs.forEach(([a, b]) => {
          attr.setXYZ(idx++, a.position.x, a.position.y, a.position.z);
          attr.setXYZ(idx++, b.position.x, b.position.y, b.position.z);
        });
        attr.needsUpdate = true;
      }
    }

    // 3. Vuelo cinematográfico y seguimiento continuo de cámara
    if (controls && camera) {
      // Caso A: Viaje / Vuelo activo hacia la esfera seleccionada
      if (this.isFlying && this.focusedEntity) {
        const elapsed = performance.now() - this.flightStartTime;
        const progress = Math.min(elapsed / this.flightDuration, 1.0);
        // Easing cúbico in-out para arranque suave, vuelo veloz y desaceleración elegante
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        controls.target.lerpVectors(this.flightStartTarget, this.focusedEntity.position, ease);

        const destCamPos = this.focusedEntity.position.clone().add(this.flightCamOffset);
        camera.position.lerpVectors(this.flightStartCamPos, destCamPos, ease);
        camera.lookAt(controls.target);

        if (progress >= 1.0) {
          this.isFlying = false;
          controls.target.copy(this.focusedEntity.position);
          this.lastEntityPos = this.focusedEntity.position.clone();
        }
      }
      // Caso B: Seguimiento fluido de la esfera mientras orbita en tiempo real
      else if (!this.isFlying && this.focusedEntity) {
        if (this.lastEntityPos) {
          const delta = new this.THREE.Vector3().subVectors(this.focusedEntity.position, this.lastEntityPos);
          controls.target.add(delta);
          camera.position.add(delta);
          this.lastEntityPos.copy(this.focusedEntity.position);
        } else {
          this.lastEntityPos = this.focusedEntity.position.clone();
        }
      }
      // Caso C: Vuelo hacia encuadre global matemático (Modo Zen / Reset)
      else if (this.isFlyingTarget && this.destCamPos && this.destLookAt) {
        // El punto de partida se captura aquí: setCameraTarget no tiene acceso a cámara/controles
        if (!this.flightStartCamPos || !this.flightStartTarget || this.pendingTargetStart) {
          this.flightStartCamPos = camera.position.clone();
          this.flightStartTarget = controls.target.clone();
          this.targetFlightStart = performance.now();
          this.pendingTargetStart = false;
        }
        const elapsed = performance.now() - this.targetFlightStart;
        const progress = Math.min(elapsed / this.targetFlightDuration, 1.0);
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        controls.target.lerpVectors(this.flightStartTarget, this.destLookAt, ease);
        camera.position.lerpVectors(this.flightStartCamPos, this.destCamPos, ease);
        camera.lookAt(controls.target);

        if (progress >= 1.0) {
          this.isFlyingTarget = false;
          controls.target.copy(this.destLookAt);
        }
      }
    }
  }

  /**
   * Inicia un vuelo de cámara cinemático hacia la esfera seleccionada.
   * Centra la vista y mantiene el seguimiento suave de su traslación orbital.
   * @param {SphereEntity} entity
   * @param {Object} camera
   * @param {Object} controls
   * @param {number} [durationMs=1000]
   */
  focusOnSphere(entity, camera, controls, durationMs = 1000) {
    if (!entity || !camera || !controls) return;
    this.focusedEntity = entity;
    this.isFlyingTarget = false;
    this.isFlying = true;
    this.flightStartTime = performance.now();
    this.flightDuration = durationMs;
    this.flightStartCamPos = camera.position.clone();
    this.flightStartTarget = controls.target.clone();

    // Distancia de encuadre: la esfera ocupa ~35% del lado menor de la vista (válido en retrato y paisaje)
    const vHalf = (camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const fitHalf = Math.min(vHalf, hHalf);
    const dist = Math.max((entity.radius / Math.sin(fitHalf)) * 2.3, 180);

    // Conservar acimut de la cámara actual respecto al objetivo o usar ángulo por defecto
    const dir = new this.THREE.Vector3().subVectors(camera.position, controls.target);
    dir.y = 0;
    if (dir.lengthSq() < 1e-4) {
      dir.set(0, 0, 1);
    } else {
      dir.normalize();
    }

    // Offset elevado (ángulo cinemático para admirar la geometría y fotos)
    this.flightCamOffset = new this.THREE.Vector3(
      dir.x * dist,
      entity.radius * 0.4 + dist * 0.18,
      dir.z * dist
    );
  }

  /**
   * Vuelo hacia coordenadas fijas calculadas (p. ej. encuadre de todo el sistema en Modo Zen).
   * @param {Object} camPos - Vector3 posición deseada de cámara
   * @param {Object} lookAt - Vector3 punto de mira deseado
   * @param {number} [durationMs=1100]
   */
  setCameraTarget(camPos, lookAt, durationMs = 1100) {
    this.focusedEntity = null;
    this.lastEntityPos = null;
    this.isFlying = false;
    this.isFlyingTarget = true;
    this.pendingTargetStart = true;
    this.targetFlightStart = performance.now();
    this.targetFlightDuration = durationMs;
    this.destCamPos = camPos.clone();
    this.destLookAt = lookAt.clone();
  }

  /**
   * Cancela la animación de vuelo o el seguimiento estricto.
   */
  cancelCameraTransition() {
    this.isFlying = false;
    this.isFlyingTarget = false;
    this.focusedEntity = null;
    this.lastEntityPos = null;
  }
}
