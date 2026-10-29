/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * ZenMode: Immersive Clean View & Mathematical Global Universe Framing
 */

export class ZenMode {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.header
   * @param {HTMLElement} options.quickBar
   * @param {HTMLElement} options.bottomBar
   * @param {HTMLElement} options.exitBtn
   * @param {Function} options.closeDrawer
   * @param {Function} options.getSpheres
   * @param {Object} options.camera
   * @param {Object} options.controls
   * @param {Object} options.orbitEngine
   * @param {Function} options.onNotify
   * @param {Object} options.THREE
   */
  constructor({
    header,
    pillsBar,
    quickBar,
    bottomBar,
    exitBtn,
    zenMenu,
    closeZenMenu,
    sideDock,
    closeSideDock,
    onZenChange,
    closeDrawer,
    getSpheres,
    camera,
    controls,
    orbitEngine,
    onNotify,
    THREE = window.THREE
  }) {
    this.header = header;
    this.pillsBar = pillsBar;
    this.quickBar = quickBar;
    this.bottomBar = bottomBar;
    this.exitBtn = exitBtn;
    this.zenMenu = zenMenu;
    this.closeZenMenu = closeZenMenu;
    this.sideDock = sideDock;
    this.closeSideDock = closeSideDock;
    this.onZenChange = onZenChange;
    this.closeDrawer = closeDrawer;
    this.getSpheres = getSpheres;
    this.camera = camera;
    this.controls = controls;
    this.orbitEngine = orbitEngine;
    this.onNotify = onNotify;
    this.THREE = THREE;

    this.isActive = false;

    // Ensure exit button is completely hidden and non-interactive on startup
    if (this.exitBtn) {
      this.exitBtn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
      this.exitBtn.classList.remove('pointer-events-auto');
    }

    this.initEvents();
  }

  initEvents() {
    if (this.exitBtn) {
      this.exitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle(false);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.toggle(false);
      }
    });
  }

  /**
   * Toggles or sets the immersive Zen Mode state.
   * @param {boolean} [forceState]
   */
  toggle(forceState) {
    const nextState = forceState !== undefined ? forceState : !this.isActive;
    if (nextState === this.isActive) return;
    this.isActive = nextState;

    if (this.isActive) {
      if (this.closeDrawer) this.closeDrawer();

      if (this.header) this.header.classList.add('hidden', 'opacity-0', 'pointer-events-none');
      if (this.pillsBar) this.pillsBar.classList.add('hidden', 'opacity-0', 'pointer-events-none');
      if (this.quickBar) this.quickBar.classList.add('hidden', 'opacity-0', 'pointer-events-none');
      if (this.bottomBar) this.bottomBar.classList.add('hidden', 'opacity-0', 'pointer-events-none');

      if (this.exitBtn) {
        this.exitBtn.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        this.exitBtn.classList.add('pointer-events-auto');
      }

      this.frameAllSpheres();
      if (this.zenMenu) this.zenMenu.classList.remove('hidden');
      if (this.sideDock) this.sideDock.classList.remove('hidden');
      if (this.onNotify) this.onNotify('Vista Limpia activada (Presiona ESC para salir)');
    } else {
      if (this.zenMenu) this.zenMenu.classList.add('hidden');
      if (this.closeZenMenu) this.closeZenMenu();
      if (this.sideDock) this.sideDock.classList.add('hidden');
      if (this.closeSideDock) this.closeSideDock();
      if (this.header) this.header.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      if (this.pillsBar) this.pillsBar.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      if (this.quickBar) this.quickBar.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      if (this.bottomBar) this.bottomBar.classList.remove('hidden', 'opacity-0', 'pointer-events-none');

      if (this.exitBtn) {
        this.exitBtn.classList.add('hidden', 'opacity-0', 'pointer-events-none');
        this.exitBtn.classList.remove('pointer-events-auto');
      }
      if (this.onNotify) this.onNotify('Modo edición restaurado');
    }
    if (this.onZenChange) this.onZenChange(this.isActive);
  }

  /**
   * Mathematical universe framing: calculates bounding sphere enclosing all spheres
   * and smoothly transitions the camera to capture the entire galaxy without clipping.
   */
  frameAllSpheres() {
    const spheres = this.getSpheres();
    if (!spheres || spheres.length === 0) return;

    if (spheres.length === 1) {
      this.orbitEngine.focusOnSphere(spheres[0], this.camera, this.controls);
      return;
    }

    // 1. Calculate centroid
    const center = new this.THREE.Vector3();
    spheres.forEach(s => center.add(s.position));
    center.divideScalar(spheres.length);

    // 2. Calculate minimum bounding radius
    let maxDist = 0;
    spheres.forEach(s => {
      const d = center.distanceTo(s.position) + s.radius;
      if (d > maxDist) maxDist = d;
    });

    // 3. Calculate camera perspective distance based on FOV
    const vHalf = (this.camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    let reqDist = (maxDist * 1.25) / Math.sin(Math.min(vHalf, hHalf));
    reqDist = Math.max(reqDist, 280);

    const targetLookAt = center.clone();
    const targetCamPos = center.clone().add(
      new this.THREE.Vector3(0, maxDist * 0.28, reqDist)
    );

    this.orbitEngine.setCameraTarget(targetCamPos, targetLookAt);
  }
}
