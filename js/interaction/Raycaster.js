/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * Raycaster: Robust Pointer Picking, BoundingRect Normalization, Double Right-Click Focus & Left-Click Config
 */

export class Raycaster {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} camera - Three.js PerspectiveCamera
   * @param {Function} getSpheres - Function returning active SphereEntity array
   * @param {Object} THREE - Three.js global namespace
   */
  constructor(canvas, camera, getSpheres, THREE = window.THREE) {
    this.canvas = canvas;
    this.camera = camera;
    this.getSpheres = getSpheres;
    this.THREE = THREE;

    this.raycaster = new this.THREE.Raycaster();
    this.mouseCoord = new this.THREE.Vector2();

    // Callbacks
    this.onSphereLeftClick = null;
    this.onSphereFocus = null;
    this.onPhotoSelect = null;
    this.onEmptyClick = null;
    this.onDragStart = null;
    this.onDragEnd = null;

    // Modo "colocar": el siguiente clic devuelve un punto 3D del espacio en lugar de seleccionar
    this.placementHandler = null;
    // Solo se pueden arrastrar cuerpos sin padre que el usuario haya desbloqueado
    this.canMoveEntity = (e) => !!(e && !e.parentId && e.unlocked);
    this.drag = null;
    this._plane = new this.THREE.Plane();
    this._normal = new this.THREE.Vector3();
    this._zero = new this.THREE.Vector3();

    // Gesture detection state
    this.touchStartPos = { x: 0, y: 0 };
    this.isTouchMove = false;
    this.lastTouchEndTime = 0;

    this.mouseDownPos = { x: 0, y: 0 };
    this.mouseDownButton = 0;
    this.isMouseDown = false;

    // Double right-click detection
    this.lastRightClickTime = 0;
    this.lastRightClickPos = { x: 0, y: 0 };

    this.initEvents();
  }

  initEvents() {
    // Prevent default context menu on 3D canvas so right click is a first-class 3D control
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.initDragEvents();

    // Touch events: un toque selecciona / abre; los gestos multitáctiles nunca cuentan como toque
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isTouchMove = false;
        this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        this.isTouchMove = true;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        this.isTouchMove = true;
      } else if (e.touches.length === 1) {
        const dx = Math.abs(e.touches[0].clientX - this.touchStartPos.x);
        const dy = Math.abs(e.touches[0].clientY - this.touchStartPos.y);
        if (dx > 12 || dy > 12) {
          this.isTouchMove = true;
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      this.lastTouchEndTime = Date.now();
      if (!this.isTouchMove && e.changedTouches.length === 1 && e.touches.length === 0) {
        const t = e.changedTouches[0];
        this.castLeftClick(t.clientX, t.clientY);
        // Evita los eventos de ratón emulados que duplicarían el clic
        if (e.cancelable) e.preventDefault();
      }
    });

    // Mouse events
    // OrbitControls cancela pointerdown, lo que suprime mousedown/mouseup: se usan eventos de puntero
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || !e.isPrimary) return;
      this.isMouseDown = true;
      this.mouseDownButton = e.button;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    // Hover feedback: change canvas cursor to pointer when over any sphere
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isMouseDown || this.drag) return;
      if (this.placementHandler) {
        this.canvas.style.cursor = 'crosshair';
        return;
      }
      const res = this.getIntersect(e.clientX, e.clientY);
      this.canvas.style.cursor = res && res.entity ? (this.canMoveEntity(res.entity) ? 'move' : 'pointer') : 'default';
    }, { passive: true });

    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || !e.isPrimary) return;
      if (!this.isMouseDown) return;
      this.isMouseDown = false;

      const dx = Math.abs(e.clientX - this.mouseDownPos.x);
      const dy = Math.abs(e.clientY - this.mouseDownPos.y);

      // Verify user clicked without dragging the camera (tolerant up to 14px)
      if (dx < 14 && dy < 14) {
        if (e.button === 0) {
          // Left Click: Select Sphere & Open Configuration
          this.castLeftClick(e.clientX, e.clientY);
        } else if (e.button === 2) {
          // Clic Derecho en esfera: Enfoca y vuela de inmediato a la esfera seleccionada
          this.castFocus(e.clientX, e.clientY);
        }
      }
    });
  }

  /** Punto 3D bajo el cursor sobre un plano horizontal (o frontal a la cámara si el ángulo es rasante). */
  planePoint(clientX, clientY, anchor, out) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    this.mouseCoord.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseCoord.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseCoord, this.camera);

    const ray = this.raycaster.ray;
    if (Math.abs(ray.direction.y) < 0.08) this.camera.getWorldDirection(this._normal);
    else this._normal.set(0, 1, 0);
    this._plane.setFromNormalAndCoplanarPoint(this._normal, anchor);

    const p = ray.intersectPlane(this._plane, out);
    if (!p || p.distanceTo(this.camera.position) > this.camera.far * 0.9) return null;
    return p;
  }

  initDragEvents() {
    const tryStart = (e, x, y) => {
      if (this.placementHandler || this.drag) return false;
      const res = this.getIntersect(x, y);
      if (!res || !this.canMoveEntity(res.entity)) return false;
      const entity = res.entity;
      const p = this.planePoint(x, y, entity.position, new this.THREE.Vector3());
      if (!p) return false;
      this.drag = { entity, offset: entity.position.clone().sub(p), startX: x, startY: y, moved: false };
      if (this.onDragStart) this.onDragStart(entity);
      e.stopImmediatePropagation();
      return true;
    };

    const move = (x, y) => {
      const d = this.drag;
      if (!d) return;
      if (Math.hypot(x - d.startX, y - d.startY) > 6) d.moved = true;
      if (!d.moved) return;
      const p = this.planePoint(x, y, d.entity.position, new this.THREE.Vector3());
      if (!p) return;
      p.add(d.offset);
      d.entity.position.copy(p);
      d.entity.targetPos.copy(p);
      if (!d.entity.manualPos) d.entity.manualPos = p.clone();
      else d.entity.manualPos.copy(p);
    };

    const end = (cancelled) => {
      const d = this.drag;
      if (!d) return;
      this.drag = null;
      if (this.onDragEnd) this.onDragEnd(d.entity, d.moved);
      if (!d.moved && !cancelled) this.castLeftClick(d.startX, d.startY);
    };

    const cap = { capture: true };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0 && e.isPrimary) tryStart(e, e.clientX, e.clientY);
    }, cap);
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (this.drag) { e.stopImmediatePropagation(); return; }
      if (Date.now() - this.lastTouchEndTime < 700) return;
      tryStart(e, e.clientX, e.clientY);
    }, cap);
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        end(true);
        return;
      }
      if (this.drag) {
        this.isTouchMove = true;
        e.stopImmediatePropagation();
      } else if (tryStart(e, e.touches[0].clientX, e.touches[0].clientY)) {
        this.isTouchMove = true;
      }
    }, cap);

    window.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => {
      if (!this.drag) return;
      if (e.cancelable) e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    window.addEventListener('pointerup', () => end(false));
    window.addEventListener('mouseup', () => end(false));
    window.addEventListener('touchend', () => end(false));
    window.addEventListener('pointercancel', () => end(true));
    window.addEventListener('touchcancel', () => end(true));
  }

  /**
   * Casts ray for Left Click: selects sphere, decodes photo UV, and opens configuration.
   */
  castLeftClick(clientX, clientY) {
    if (this.placementHandler) {
      const p = this.planePoint(clientX, clientY, this._zero, new this.THREE.Vector3());
      if (p) {
        const handler = this.placementHandler;
        this.placementHandler = null;
        this.canvas.style.cursor = 'default';
        handler(p);
      }
      return;
    }

    const res = this.getIntersect(clientX, clientY);
    if (!res || !res.entity) {
      if (this.onEmptyClick) this.onEmptyClick();
      return;
    }

    const entity = res.entity;
    let allowPhoto = true;
    if (this.onSphereLeftClick) {
      allowPhoto = this.onSphereLeftClick(entity, res.hit) !== false;
    }

    if (allowPhoto && res.uv && this.onPhotoSelect) {
      const u = res.uv.x;
      const v = 1 - res.uv.y;
      const col = Math.floor(u * entity.cols) % entity.cols;
      const row = Math.min(Math.floor(v * entity.rows), entity.rows - 1);
      const photoIndex = row * entity.cols + col;
      this.onPhotoSelect(entity, col, row, photoIndex, res.hit);
    }
  }

  /**
   * Casts ray for Double Right-Click: navigates / focuses camera directly to the sphere.
   */
  castFocus(clientX, clientY) {
    const res = this.getIntersect(clientX, clientY);
    if (!res || !res.entity) return;

    if (this.onSphereFocus) {
      this.onSphereFocus(res.entity);
    }
  }

  /**
   * Robust raycast intersection against all active sphere meshes.
   * Climbs up parent hierarchy to resolve SphereEntity reliably.
   */
  getIntersect(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;

    this.mouseCoord.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseCoord.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseCoord, this.camera);
    const spheres = this.getSpheres();
    const meshes = spheres.map(s => s.mesh).filter(Boolean);

    // Test with recursion enabled to hit outer meshes, coronas, or composite groups
    const hits = this.raycaster.intersectObjects(meshes, true);

    if (hits.length > 0) {
      for (let i = 0; i < hits.length; i++) {
        let obj = hits[i].object;
        while (obj) {
          if (obj.userData && obj.userData.entity) {
            return {
              hit: hits[i],
              entity: obj.userData.entity,
              point: hits[i].point,
              uv: hits[i].uv
            };
          }
          obj = obj.parent;
        }
      }
    }

    return null;
  }
}
