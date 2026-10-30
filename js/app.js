/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * Main Application Orchestrator & System Initializer
 */

import { DEFAULT_STUDIO_CONFIG, LIMITS, CELESTIAL_PRESETS, SPEED_PRESETS } from './config/constants.js';
import { SceneManager } from './core/SceneManager.js';
import { OrbitEngine } from './core/OrbitEngine.js';
import { Physics } from './core/Physics.js';
import { SphereEntity } from './entities/SphereEntity.js';
import { getCelestialDef } from './entities/CelestialTextures.js';
import { SceneFX, createDefaultSceneFx } from './effects/SceneFX.js';
import { UniverseManager } from './persistence/UniverseManager.js';
import { FX_PRESETS, mergeFx } from './effects/SphereFX.js';
import { UIManager } from './ui/UIManager.js';
import { ZenMode } from './ui/ZenMode.js';
import { TourMode } from './ui/TourMode.js';
import { Lightbox } from './ui/Lightbox.js';
import { initNumberFields } from './ui/NumberFields.js';
import { Raycaster } from './interaction/Raycaster.js';
import { ImageLoader } from './interaction/ImageLoader.js';

let planetCounter = 0;
let moonCounter = 0;
let starCounter = 1;

export class PhotoSphereApp {
  constructor() {
    this.THREE = window.THREE;
    this.config = { ...DEFAULT_STUDIO_CONFIG };
    this.spheres = [];
    this.activeSphere = null;

    // Subsystems
    this.sceneManager = null;
    this.orbitEngine = null;
    this.physics = null;
    this.uiManager = null;
    this.zenMode = null;
    this.lightbox = null;
    this.raycaster = null;
    this.imageLoader = null;

    this.clock = new this.THREE.Clock();
  }

  /**
   * Initializes the complete 3D studio application.
   */
  async init() {
    const canvas = document.getElementById('webgl-canvas');

    // 1. Core graphics & physics engines
    this.sceneManager = new SceneManager(canvas, this.config, this.THREE);
    this.orbitEngine = new OrbitEngine(this.THREE);
    this.physics = new Physics(this.THREE);
    this.effects = new SceneFX(this.THREE, this.sceneManager, this.config);

    // 2. UI Subsystem
    this.uiManager = new UIManager();
    this.uiManager.syncSceneFxControls(this.config.sceneFx);
    this.uiManager.onDrawerToggle = () => this.updateDrawerViewShift();
    window.addEventListener('resize', () => this.updateDrawerViewShift(false));

    // 3. Modals & Zen Mode
    this.lightbox = new Lightbox({
      modal: this.uiManager.dom.lightboxModal,
      img: this.uiManager.dom.lightboxImg,
      title: this.uiManager.dom.lightboxTitle,
      meta: this.uiManager.dom.lightboxMeta,
      closeBtn: this.uiManager.dom.btnCloseLightbox,
      prevBtn: this.uiManager.dom.lightboxPrev,
      nextBtn: this.uiManager.dom.lightboxNext,
      playBtn: this.uiManager.dom.lightboxPlay,
      playLabel: this.uiManager.dom.lightboxPlayLabel,
      counter: this.uiManager.dom.lightboxCounter
    });

    this.tour = new TourMode({
      THREE: this.THREE,
      camera: this.sceneManager.camera,
      controls: this.sceneManager.controls,
      orbitEngine: this.orbitEngine,
      getSpheres: () => this.spheres,
      getSpeed: () => this.config.tourSpeed ?? 1,
      isBlocked: () => this.lightbox.isOpen,
      onStateChange: (running) => this.uiManager.syncTourState(running),
      onNotify: (msg) => this.uiManager.notify(msg)
    });

    // Actividad del usuario: reinicia el contador de inactividad y cualquier interacción detiene el viaje
    const markActivity = () => this.tour.markActivity();
    ['pointermove', 'keydown', 'wheel', 'touchstart', 'pointerdown'].forEach(ev => {
      window.addEventListener(ev, markActivity, { passive: true });
    });
    const stopTourOnInput = () => { if (this.tour.running) this.tour.stop(); };
    ['pointerdown', 'wheel', 'touchstart'].forEach(ev => {
      canvas.addEventListener(ev, stopTourOnInput, { passive: true });
    });
    window.addEventListener('keydown', stopTourOnInput);

    this.zenMode = new ZenMode({
      sideDock: this.uiManager.dom.zenDock,
      closeSideDock: () => this.uiManager.toggleZenDock(false),
      onZenChange: (active) => {
        this.tour.setIdleEnabled(active);
        if (!active) this.tour.stop();
      },
      header: this.uiManager.dom.header,
      pillsBar: this.uiManager.dom.celestialPillsBar,
      quickBar: this.uiManager.dom.quickBar,
      bottomBar: this.uiManager.dom.bottomPhotoBar,
      exitBtn: this.uiManager.dom.btnExitCleanMode,
      zenMenu: this.uiManager.dom.zenMenu,
      closeZenMenu: () => this.uiManager.toggleZenMenu(false),
      closeDrawer: () => this.uiManager.toggleDrawer(false),
      getSpheres: () => this.spheres,
      camera: this.sceneManager.camera,
      controls: this.sceneManager.controls,
      orbitEngine: this.orbitEngine,
      onNotify: (msg) => this.uiManager.notify(msg),
      THREE: this.THREE
    });

    // 4. Interaction (Raycasting & File Loading)
    this.raycaster = new Raycaster(
      canvas,
      this.sceneManager.camera,
      () => this.spheres,
      this.THREE
    );

    // Doble Clic Derecho (o doble toque táctil): Navega / Enfoca directamente la cámara en esa esfera
    // Funciona fluidamente tanto en Vista Normal como en Vista Zen
    this.raycaster.onSphereFocus = (entity) => {
      this.selectAndFlyToSphere(entity);
    };

    // Clic / toque en una esfera (Vista Normal y Zen), en dos pasos:
    // 1) Si no está centrada: solo se selecciona y se centra la vista.
    // 2) Si ya está centrada: el mismo clic abre la foto pulsada.
    this.raycaster.onSphereLeftClick = (entity) => {
      const isCentered =
        this.activeSphere === entity &&
        this.orbitEngine.focusedEntity === entity &&
        !this.orbitEngine.isFlying;

      if (!isCentered) {
        this.selectAndFlyToSphere(entity);
        return false;
      }
      const def = getCelestialDef(entity.celestial);
      if (def) {
        this.uiManager.notify(`${def.icon} ${def.name}: ${def.info}`);
        return false;
      }
      return isCentered;
    };

    // Clic en el espacio vacío: se suelta el enfoque y vuelve la navegación libre
    this.raycaster.onEmptyClick = () => {
      if (this.orbitEngine.focusedEntity || this.orbitEngine.isFlying) {
        this.orbitEngine.cancelCameraTransition();
        this.uiManager.notify('🌌 Vista libre');
      }
    };

    this.raycaster.onPhotoSelect = (entity, col, row, photoIndex) => {
      this.lightbox.show(entity, col, row, photoIndex);
    };

    this.raycaster.onDragStart = () => {
      this.tour.stop();
      this.orbitEngine.cancelCameraTransition();
      this.enterCustomLayout();
    };

    this.raycaster.onDragEnd = (entity) => this.uiManager.syncMoveControls(entity);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.raycaster.placementHandler) this.cancelPlacement();
    });

    this.imageLoader = new ImageLoader({
      fileInput: this.uiManager.dom.imageInput,
      dropTarget: document.body,
      onImagesLoaded: (newImages) => {
        if (!this.activeSphere) return;
        if (this.activeSphere.celestial) {
          this.uiManager.notify('Esta esfera es un objeto celeste. Conviértela en esfera de fotos desde el panel para añadir imágenes.');
          return;
        }
        newImages.forEach(img => this.activeSphere.images.push(img));
        this.activeSphere.renderCanvasTexture();
        this.uiManager.syncPhotosCount(this.activeSphere);
      },
      onNotify: (msg) => this.uiManager.notify(msg)
    });

    // 5. Connect UI & System Events
    this.bindUIEvents();

    // 6. Spawn initial complete Solar System: Sol Alfa -> Planeta Terra -> Luna Selene
    this.spawnInitialSolarSystem();

    // 7. Initialize kinematic positions and frame the universe so all celestial bodies and orbits are in view
    this.orbitEngine.update(this.spheres, this.sceneManager.controls, this.sceneManager.camera, null, this.config, 0.016);
    this.zenMode.frameAllSpheres();

    // 8. Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }

    initNumberFields();

    // 9. Persistencia local: biblioteca de universos
    this.universe = new UniverseManager(this);
    this.uiManager.initUniversePanel(this.universe);
    this.universe.markSaved();
    await this.universe.restoreLast();
    setInterval(() => this.universe.tick(), 2000);
    window.addEventListener('beforeunload', (e) => {
      if (this.universe.autosave) {
        this.universe.flush();
      } else if (this.universe.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    window.addEventListener('pagehide', () => this.universe.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.universe.flush();
    });
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.universe.save();
      }
    });
  }

  /** Universo mínimo: una sola estrella. */
  buildBlankUniverse() {
    return {
      spheres: [{ name: 'Estrella Alfa', radius: 85, shape: 'circle', bodyType: 'star', parentId: null, spinSpeed: 0.4, images: [] }]
    };
  }

  /** Aplica la configuración guardada y sincroniza controles de la interfaz. */
  applyStudioConfig(saved = {}) {
    const cfg = this.config;
    const dom = this.uiManager.dom;
    const sm = this.sceneManager;
    Object.keys(saved).forEach(k => { if (k !== 'sceneFx') cfg[k] = saved[k]; });

    const defaults = createDefaultSceneFx();
    Object.keys(defaults).forEach(t => {
      defaults[t] = { ...defaults[t], ...((saved.sceneFx || {})[t] || {}) };
    });
    cfg.sceneFx = defaults;
    Object.keys(defaults).forEach(t => this.effects.resetTimer(t));
    this.effects.active.forEach(a => a.dispose && a.dispose());
    this.effects.active.length = 0;
    this.uiManager.syncSceneFxControls(cfg.sceneFx);

    this.setUniverseSpeed(cfg.universeSpeed ?? 1, false);
    this.uiManager.syncTourSpeed(cfg.tourSpeed ?? 1);
    sm.setBackgroundColor(cfg.bgColor);
    dom.pickerBgColor.value = cfg.bgColor;
    document.body.style.backgroundColor = cfg.bgColor;
    sm.updateLightIntensity(cfg.lightIntensity);
    dom.sliderLightIntensity.value = cfg.lightIntensity;
    dom.lblLightIntensity.textContent = Number(cfg.lightIntensity).toFixed(1);
    sm.setStarsVisible(cfg.showStars);
    dom.chkStars.checked = !!cfg.showStars;
    dom.sliderRoughness.value = cfg.roughness;
    dom.lblRoughness.textContent = Number(cfg.roughness).toFixed(2);
    dom.chkWireframe.checked = !!cfg.wireframe;
    dom.sliderSpaceMargin.value = cfg.sphereMargin;
    dom.lblSpaceMargin.textContent = `${cfg.sphereMargin} u`;
    dom.layoutModeBtns.forEach(b => {
      const on = b.dataset.mode === cfg.layoutMode;
      b.classList.toggle('border-cyan-400/80', on);
      b.classList.toggle('text-cyan-300', on);
    });
    dom.chkConstellations.checked = !!cfg.showConstellations;
    if (dom.chkAllOrbitLines) dom.chkAllOrbitLines.checked = !!cfg.showAllOrbitLines;
    this.uiManager.setAllOrbitLinesButtonState(!!(cfg.showAllOrbitLines && cfg.showConstellations));
    if (sm.controls) sm.controls.autoRotate = !!cfg.autoRotate;
    this.uiManager.setSpinButtonState(!!cfg.autoRotate);
  }

  /** Sustituye todo el universo actual por el de `data` (serializado). */
  async replaceUniverse(data) {
    this.tour.stop();
    this.orbitEngine.cancelCameraTransition();
    this.lightbox.close();

    // Cargar fotos antes de tocar la escena
    const loaded = await Promise.all((data.spheres || []).map(async (o) => {
      const images = await Promise.all((o.images || []).map(item => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          img.dataset.title = item.title || '';
          img.dataset.filename = item.filename || '';
          resolve(img);
        };
        img.onerror = () => resolve(null);
        img.src = item.src;
      })));
      return { ...o, images: images.filter(Boolean) };
    }));

    this.spheres.forEach(s => {
      this.sceneManager.scene.remove(s.mesh);
      s.dispose(this.sceneManager.scene);
    });
    this.spheres = [];
    this.activeSphere = null;

    this.applyStudioConfig(data.config || {});

    loaded.forEach(o => {
      const s = new SphereEntity(o, this.THREE, this.config);
      this.spheres.push(s);
      this.sceneManager.scene.add(s.mesh);
      s.updateMaterial(this.config.roughness, this.config.wireframe);
    });

    this.activeSphere = this.spheres.find(s => s.id === data.activeId) || this.spheres[0];
    // El layout fija minPeriapsis/radios, necesarios para dibujar bien las órbitas
    this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
    this.refreshAllUniverseVisuals();
    this.orbitEngine.update(this.spheres, this.sceneManager.controls, this.sceneManager.camera, null, this.config, 0.016);
    this.uiManager.syncSphereControls(this.activeSphere, this.spheres);
    this.uiManager.syncPhotosCount(this.activeSphere);
    this.zenMode.frameAllSpheres();
  }

  /** Pantalla completa (oculta la barra de URL). En iPhone, que no la soporta, guía a "Añadir a inicio". */
  initFullscreenButton() {
    const btn = document.getElementById('btn-quick-fullscreen');
    if (!btn) return;
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || window.navigator.standalone;

    if (standalone) { btn.classList.add('hidden'); return; }

    const sync = () => {
      document.getElementById('icon-fs-on').classList.toggle('hidden', isFs());
      document.getElementById('icon-fs-off').classList.toggle('hidden', !isFs());
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);

    btn.addEventListener('click', () => {
      if (!request) {
        this.uiManager.notify('📱 En iPhone: Compartir → "Añadir a pantalla de inicio" para abrirlo como app a pantalla completa', 6000);
        return;
      }
      if (isFs()) {
        exit.call(document);
      } else {
        const p = request.call(root, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => this.uiManager.notify('No se pudo activar la pantalla completa'));
      }
    });
  }

  /**
   * Spawns a preconfigured, beautifully balanced Solar System demonstration.
   */
  spawnInitialSolarSystem() {
    // 1. Central radiant star (Sun)
    const sun = new SphereEntity(
      {
        name: 'Sol Alfa',
        radius: 85,
        shape: 'circle',
        parentId: null,
        bodyType: 'star',
        spinSpeed: 0.4
      },
      this.THREE,
      this.config
    );
    this.registerSphere(sun);

    // 2. Planet orbiting the Sun
    planetCounter++;
    const planet = new SphereEntity(
      {
        name: 'Planeta Terra',
        radius: 46,
        shape: 'rounded',
        parentId: sun.id,
        bodyType: 'planet',
        orbitRadius: 230,
        orbitSpeed: 0.75,
        orbitTilt: 0.12,
        spinSpeed: 1.0
      },
      this.THREE,
      this.config
    );
    this.registerSphere(planet);

    // 3. Satellite orbiting the Planet
    moonCounter++;
    const moon = new SphereEntity(
      {
        name: 'Satélite Selene',
        radius: 20,
        shape: 'hexagon',
        parentId: planet.id,
        bodyType: 'moon',
        orbitRadius: 65,
        orbitSpeed: 2.2,
        orbitTilt: 0.35,
        spinSpeed: 1.6
      },
      this.THREE,
      this.config
    );
    this.registerSphere(moon);

    this.setActiveSphere(sun);
  }

  /**
   * Refreshes all 3D orbital trajectory lines and constellation filaments across the universe.
   * Ensures clean disposal of orphaned trajectories on type or hierarchy modifications.
   */
  refreshAllUniverseVisuals() {
    this.spheres.forEach(s => {
      s.createOrUpdateOrbitLine(this.sceneManager.scene, this.config.showAllOrbitLines);
    });
    this.sceneManager.rebuildConstellationLines(this.spheres);
  }

  /**
   * Registers a newly constructed SphereEntity into the 3D scene and physics universe.
   */
  registerSphere(sphere) {
    this.spheres.push(sphere);
    this.sceneManager.scene.add(sphere.mesh);
    this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
    this.refreshAllUniverseVisuals();
    this.uiManager.syncSphereControls(this.activeSphere, this.spheres);
  }

  /**
   * Deletes a sphere with strict resource disposal to prevent WebGL memory leaks.
   * Re-parents any orphaned child spheres to the root universe safely.
   */
  deleteSphere(sphere) {
    if (this.spheres.length <= 1) {
      this.uiManager.notify('Se requiere al menos 1 esfera en el universo');
      return;
    }

    const idx = this.spheres.indexOf(sphere);
    if (idx !== -1) {
      // Re-parent orphan children so they become independent root stars
      this.spheres.forEach(s => {
        if (s.parentId === sphere.id) {
          s.parentId = null;
          s.setBodyType('star', this.sceneManager.scene);
        }
      });

      this.sceneManager.scene.remove(sphere.mesh);
      sphere.dispose(this.sceneManager.scene);
      this.spheres.splice(idx, 1);

      if (this.activeSphere === sphere) {
        this.setActiveSphere(this.spheres[Math.max(0, idx - 1)]);
      }

      this.refreshAllUniverseVisuals();
      this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
      this.uiManager.syncSphereControls(this.activeSphere, this.spheres);
      this.uiManager.notify('Esfera eliminada');
    }
  }

  /**
   * Sets the active sphere for inspector controls.
   */
  setActiveSphere(sphere) {
    if (!sphere) return;
    this.activeSphere = sphere;
    this.uiManager.syncSphereControls(this.activeSphere, this.spheres);
  }

  /**
   * Establece la esfera activa y ejecuta de inmediato el vuelo cinemático para encuadrarla.
   * Centraliza la navegación desde selector en cabecera, pills, inspector y clics 3D.
   * @param {SphereEntity} sphere
   * @param {boolean} [showToast=true]
   */
  selectAndFlyToSphere(sphere, showToast = true) {
    if (!sphere) return;
    this.tour.stop();
    this.setActiveSphere(sphere);
    this.orbitEngine.focusOnSphere(sphere, this.sceneManager.camera, this.sceneManager.controls);
    if (showToast) {
      const role = sphere.bodyType === 'star' ? '⭐ Estrella' : (sphere.bodyType === 'moon' ? '🌙 Satélite' : '🪐 Planeta');
      this.uiManager.notify(`🚀 Viajando a ${role}: ${sphere.name}`);
    }
  }

  /**
   * Creates a new Planet orbiting the selected Star (or the first available Star).
   */
  createPlanet(targetStar = null, extra = {}) {
    let parentStar = targetStar;
    if (!parentStar) {
      parentStar = this.activeSphere && (!this.activeSphere.parentId || this.activeSphere.bodyType === 'star')
        ? this.activeSphere
        : this.spheres.find(s => !s.parentId || s.bodyType === 'star');
    }

    if (!parentStar) {
      this.createStar();
      parentStar = this.activeSphere;
    }

    planetCounter++;
    const siblingPlanets = this.spheres.filter(s => s.parentId === parentStar.id);
    const orbitDistance = 180 + (siblingPlanets.length * 55);

    const planet = new SphereEntity(
      {
        name: `Planeta #${planetCounter}`,
        radius: 46,
        bodyType: 'planet',
        parentId: parentStar.id,
        orbitRadius: orbitDistance,
        orbitSpeed: 0.65 + (Math.random() * 0.4),
        orbitTilt: (Math.random() - 0.5) * 0.35,
        shape: 'rounded',
        gap: 4,
        ...extra
      },
      this.THREE,
      this.config
    );

    this.registerSphere(planet);
    this.setActiveSphere(planet);
    this.orbitEngine.focusOnSphere(planet, this.sceneManager.camera, this.sceneManager.controls);
    this.uiManager.notify(`${planet.getTypeIcon()} ¡${planet.name} añadido a la órbita de ${parentStar.name}!`);
  }

  /**
   * Creates a new Satellite orbiting the selected Planet (or Star).
   */
  createMoon(targetPlanet = null, extra = {}) {
    let parentPlanet = targetPlanet;
    if (!parentPlanet) {
      parentPlanet = this.activeSphere && this.activeSphere.bodyType === 'planet'
        ? this.activeSphere
        : this.spheres.find(s => s.bodyType === 'planet');
    }

    if (!parentPlanet) {
      this.createPlanet();
      parentPlanet = this.activeSphere;
    }

    moonCounter++;
    const siblingMoons = this.spheres.filter(s => s.parentId === parentPlanet.id);
    const hostR = parentPlanet.ring ? parentPlanet.radius * 2.45 : parentPlanet.radius;
    const baseDistance = parentPlanet.celestial ? Math.max(55, hostR * 1.2 + 20) : 55;
    const orbitDistance = baseDistance + (siblingMoons.length * 24);

    const moon = new SphereEntity(
      {
        name: `Satélite #${moonCounter}`,
        radius: 20,
        bodyType: 'moon',
        parentId: parentPlanet.id,
        orbitRadius: orbitDistance,
        orbitSpeed: 1.8 + (Math.random() * 0.8),
        orbitTilt: (Math.random() - 0.5) * 0.5,
        shape: 'circle',
        gap: 3,
        ...extra
      },
      this.THREE,
      this.config
    );

    this.registerSphere(moon);
    this.setActiveSphere(moon);
    this.orbitEngine.focusOnSphere(moon, this.sceneManager.camera, this.sceneManager.controls);
    this.uiManager.notify(`${moon.getTypeIcon()} ¡${moon.name} añadido a la órbita de ${parentPlanet.name}!`);
  }

  /** Pasa a distribución personalizada conservando la posición actual de cada sistema. */
  enterCustomLayout(silent = false) {
    if (this.config.layoutMode !== 'custom') {
      const ids = new Set(this.spheres.map(s => s.id));
      this.spheres.forEach(s => {
        if (!s.parentId || !ids.has(s.parentId)) {
          s.manualPos = s.position.clone();
          s.targetPos.copy(s.manualPos);
        }
      });
      this.config.layoutMode = 'custom';
      if (!silent) this.uiManager.notify('✋ Distribución personalizada');
    }
    this.uiManager.dom.layoutModeBtns.forEach(b => {
      const on = b.dataset.mode === 'custom';
      b.classList.toggle('border-cyan-400/80', on);
      b.classList.toggle('text-cyan-300', on);
    });
  }

  /** Espera un clic en el espacio y crea allí una estrella nueva. */
  startPlaceStar() {
    this.uiManager.toggleDrawer(false);
    this.tour.stop();
    this.raycaster.placementHandler = (p) => {
      this.enterCustomLayout();
      this.createStar({ manualPos: { x: p.x, y: p.y, z: p.z } });
    };
    this.raycaster.canvas.style.cursor = 'crosshair';
    this.uiManager.notify('📍 Haz clic en el espacio para colocar la estrella (Esc cancela)');
  }

  cancelPlacement() {
    this.raycaster.placementHandler = null;
    this.raycaster.canvas.style.cursor = 'default';
    this.uiManager.notify('Colocación cancelada');
  }

  /**
   * Creates a new independent Star at the center of its own stellar system.
   */
  createStar(extra = {}) {
    starCounter++;
    const star = new SphereEntity(
      {
        name: `Estrella #${starCounter}`,
        radius: 85,
        bodyType: 'star',
        parentId: null,
        orbitRadius: 0,
        orbitSpeed: 0,
        shape: 'circle',
        gap: 4,
        ...extra
      },
      this.THREE,
      this.config
    );

    this.registerSphere(star);
    this.setActiveSphere(star);
    this.orbitEngine.focusOnSphere(star, this.sceneManager.camera, this.sceneManager.controls);
    this.uiManager.notify(`${star.getTypeIcon()} ¡Nuevo centro gravitatorio creado: ${star.name}!`);
  }

  /**
   * Crea un objeto celeste del catálogo (Tierra, Marte, Saturno...) con su textura procedural.
   * @param {string} id
   */
  createCelestial(id) {
    const def = getCelestialDef(id);
    if (!def) return;
    const extra = {
      name: def.name,
      celestial: def.id,
      radius: def.radius,
      spinSpeed: def.spin,
      fx: def.fx
    };
    if (def.bodyType === 'star') this.createStar(extra);
    else if (def.bodyType === 'moon') this.createMoon(null, extra);
    else this.createPlanet(null, extra);
  }

  /**
   * Duplicates the active sphere with full settings, images, and orbital parameters.
   */
  duplicateCurrentSphere() {
    if (!this.activeSphere) return;
    const a = this.activeSphere;
    const dup = new SphereEntity(
      {
        name: `${a.name} (Copia)`,
        radius: a.radius,
        cols: a.cols,
        rows: a.rows,
        gap: a.gap,
        shape: a.shape,
        shapeScale: a.shapeScale,
        strokeWidth: a.strokeWidth,
        strokeColor: a.strokeColor,
        gridColor: a.gridColor,
        gridTransparent: a.gridTransparent,
        spinSpeed: a.spinSpeed,
        bodyType: a.bodyType,
        parentId: a.parentId,
        orbitRadius: a.parentId ? a.orbitRadius + 35 : 0,
        orbitSpeed: a.orbitSpeed,
        orbitTilt: a.orbitTilt,
        orbitEccentricity: a.orbitEccentricity,
        orbitNode: a.orbitNode,
        orbitPeriapsis: a.orbitPeriapsis,
        showOrbitLine: a.showOrbitLine,
        celestial: a.celestial,
        fx: JSON.parse(JSON.stringify(a.fx)),
      },
      this.THREE,
      this.config
    );
    this.registerSphere(dup);
    this.setActiveSphere(dup);
    this.orbitEngine.focusOnSphere(dup, this.sceneManager.camera, this.sceneManager.controls);
    this.uiManager.notify('Esfera duplicada con éxito');
  }

  /** Recentra la vista en la zona libre que deja el panel abierto. */
  updateDrawerViewShift(animate = true) {
    const ui = this.uiManager;
    const drawer = ui && ui.dom.mainDrawer;
    if (!drawer || !this.sceneManager) return;
    let x = 0;
    let y = 0;
    if (ui.isDrawerOpen) {
      // Panel lateral si no ocupa todo el ancho (escritorio o móvil horizontal); si no, hoja inferior
      if (drawer.offsetWidth < window.innerWidth * 0.9) {
        const left = drawer.getBoundingClientRect().left;
        x = (window.innerWidth - (left > 0 ? left : window.innerWidth - drawer.offsetWidth)) / 2;
      } else y = drawer.offsetHeight / 2;
    }
    this.sceneManager.setViewShift(x, y, animate);
  }

  /**
   * Fija el multiplicador global de velocidad (traslación orbital, giro axial y cámara).
   */
  setUniverseSpeed(speed, notify = true) {
    const v = Math.min(Math.max(Number.isFinite(speed) ? speed : 1, 0.1), 5);
    this.config.universeSpeed = v;
    this.uiManager.syncUniverseSpeed(v);
    if (notify) this.uiManager.notify(`⚡ Velocidad del universo: ${parseFloat(v.toFixed(2))}x`);
  }

  /**
   * Toggles visibility of all 3D orbital trajectory rings AND cosmic connection lines simultaneously.
   * @param {boolean} [forceState]
   */
  toggleCosmicLines(forceState) {
    const nextState = forceState !== undefined ? forceState : !this.config.showAllOrbitLines;
    this.config.showAllOrbitLines = nextState;
    this.config.showConstellations = nextState;

    this.refreshAllUniverseVisuals();
    this.uiManager.setAllOrbitLinesButtonState(nextState);
    this.uiManager.notify(
      nextState ? '🌌 Guías Cósmicas (Órbitas y Conexiones): Visibles' : '🌌 Guías Cósmicas: Ocultas'
    );
  }

  /**
   * Binds user interactions and UI control handlers.
   */
  bindUIEvents() {
    const dom = this.uiManager.dom;

    // Sphere Selection and Navigation Callbacks
    this.uiManager.on('selectSphere', (s) => {
      this.selectAndFlyToSphere(s);
    });

    this.uiManager.on('selectSphereById', (id) => {
      const s = this.spheres.find(item => item.id === id);
      if (s) {
        this.selectAndFlyToSphere(s);
      }
    });

    this.uiManager.on('travelToActiveSphere', () => {
      if (this.activeSphere) {
        this.selectAndFlyToSphere(this.activeSphere);
      }
    });

    this.uiManager.on('cycleSphere', (direction) => {
      if (!this.spheres || this.spheres.length === 0) return;
      if (this.spheres.length === 1) {
        this.selectAndFlyToSphere(this.spheres[0]);
        return;
      }
      let curIdx = this.spheres.indexOf(this.activeSphere);
      if (curIdx === -1) curIdx = 0;
      const nextIdx = (curIdx + direction + this.spheres.length) % this.spheres.length;
      const target = this.spheres[nextIdx];
      this.selectAndFlyToSphere(target);
    });

    this.uiManager.on('focusSphere', (s) => {
      this.selectAndFlyToSphere(s);
    });

    this.uiManager.on('deleteSphere', (s) => this.deleteSphere(s));

    // Edición de nombre: mantiene de forma limpia el tipo celestial con el nuevo nombre
    this.uiManager.on('updateSphereName', (newName) => {
      if (!this.activeSphere) return;
      this.activeSphere.setName(newName);
      this.uiManager.syncSphereNamesOnly(this.activeSphere, this.spheres);
    });

    this.uiManager.on('createPlanetForStar', (star) => {
      this.createPlanet(star);
    });

    this.uiManager.on('createMoonForPlanet', (planet) => {
      this.createMoon(planet);
    });

    this.uiManager.on('createCelestial', (id) => this.createCelestial(id));

    this.uiManager.on('fxChange', ({ effect, key, value }) => {
      const s = this.activeSphere;
      if (!s || !s.fx[effect]) return;
      s.fx[effect][key] = value;
      s.fxDirty = true;
    });

    this.uiManager.on('fxPreset', (name) => {
      const s = this.activeSphere;
      if (!s || !FX_PRESETS[name]) return;
      s.fx = mergeFx(FX_PRESETS[name]);
      s.fxDirty = true;
      this.uiManager.syncFxControls(s);
    });

    this.uiManager.on('sceneFxChange', ({ type, key, value }) => {
      const cfg = this.config.sceneFx[type];
      if (!cfg) return;
      cfg[key] = value;
    });

    this.uiManager.on('sceneFxTest', (type) => {
      this.effects.trigger(type);
    });

    this.uiManager.on('convertToPhotoSphere', () => {
      const s = this.activeSphere;
      if (!s || !s.celestial) return;
      s.setCelestial(null);
      this.uiManager.syncSphereControls(s, this.spheres);
      this.uiManager.syncPhotosCount(s);
      this.uiManager.notify('📷 Ahora es una esfera de fotos');
    });

    // Hierarchical Creation Buttons
    if (dom.btnAddPlanet) dom.btnAddPlanet.addEventListener('click', () => this.createPlanet());
    if (dom.btnAddMoon) dom.btnAddMoon.addEventListener('click', () => this.createMoon());
    if (dom.btnAddStar) dom.btnAddStar.addEventListener('click', () => this.createStar());
    const btnPlaceStar = document.getElementById('btn-place-star');
    if (btnPlaceStar) btnPlaceStar.addEventListener('click', () => this.startPlaceStar());

    const btnToggleMove = document.getElementById('btn-toggle-move');
    if (btnToggleMove) {
      btnToggleMove.addEventListener('click', () => {
        const a = this.activeSphere;
        if (!a || a.parentId) return;
        a.unlocked = !a.unlocked;
        this.uiManager.syncMoveControls(a);
        this.uiManager.notify(a.unlocked ? '🔓 Arrastra la estrella por la pantalla para moverla' : '🔒 Posición bloqueada');
      });
    }
    const btnAutoPlace = document.getElementById('btn-auto-place');
    if (btnAutoPlace) {
      btnAutoPlace.addEventListener('click', () => {
        const a = this.activeSphere;
        if (!a || !a.manualPos) return;
        a.manualPos = null;
        this.uiManager.syncMoveControls(a);
        this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
        this.uiManager.notify('✨ Estrella recolocada automáticamente');
      });
    }

    // FAB Quick Add: abre el panel con el menú Crear (fotos u objeto celeste)
    dom.btnQuickAdd.addEventListener('click', (e) => {
      e.stopPropagation();
      this.uiManager.toggleDrawer(true);
      if (this.uiManager.setCreateMenuOpen) this.uiManager.setCreateMenuOpen(true);
    });

    // Selector y Cambiador de Tipo Celestial (Estrella | Planeta | Satélite)
    dom.btnBodyTypes.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.activeSphere) return;
        const targetType = btn.dataset.type;
        const preset = CELESTIAL_PRESETS[targetType];
        if (!preset) return;

        // Actualizar tipo y nombre de forma consistente
        this.activeSphere.setBodyType(targetType, this.sceneManager.scene);
        this.activeSphere.setRadius(preset.defaultRadius);
        this.activeSphere.spinSpeed = preset.spinSpeed;

        if (targetType === 'star') {
          // Desconectar de cualquier padre: Se convierte en Centro Gravitacional Autónomo
          this.activeSphere.parentId = null;
          this.activeSphere.orbitRadius = 0;
          this.activeSphere.orbitSpeed = 0;
          this.activeSphere.removeOrbitLine(this.sceneManager.scene);
        } else if (targetType === 'planet') {
          // Asignar primera estrella disponible si no tiene una
          const parentObj = this.spheres.find(s => s.id === this.activeSphere.parentId);
          if (!parentObj || parentObj.bodyType !== 'star') {
            const firstStar = this.spheres.find(s => s !== this.activeSphere && (s.bodyType === 'star' || !s.parentId));
            this.activeSphere.parentId = firstStar ? firstStar.id : null;
          }
          if (this.activeSphere.orbitRadius < 120) this.activeSphere.orbitRadius = 220;
          this.activeSphere.orbitSpeed = 0.8;
          this.activeSphere.showOrbitLine = true;
        } else if (targetType === 'moon') {
          // Asignar primer planeta disponible (o estrella)
          const parentObj = this.spheres.find(s => s.id === this.activeSphere.parentId);
          if (!parentObj || parentObj.bodyType === 'moon') {
            const firstPlanet = this.spheres.find(s => s !== this.activeSphere && s.bodyType === 'planet');
            if (firstPlanet) {
              this.activeSphere.parentId = firstPlanet.id;
            } else {
              const firstStar = this.spheres.find(s => s !== this.activeSphere && (s.bodyType === 'star' || !s.parentId));
              if (firstStar) this.activeSphere.parentId = firstStar.id;
            }
          }
          this.activeSphere.orbitRadius = 65;
          this.activeSphere.orbitSpeed = 2.0;
          this.activeSphere.showOrbitLine = true;
        }

        // Reconstrucción limpia y completa de todas las guías cósmicas
        this.refreshAllUniverseVisuals();
        this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
        this.uiManager.syncSphereControls(this.activeSphere, this.spheres);
        this.uiManager.notify(`Tipo actualizado a: ${preset.label} (${this.activeSphere.name})`);
      });
    });

    // Header & Quick Action Buttons
    dom.btnResetCam.addEventListener('click', () => {
      this.tour.stop();
      this.zenMode.frameAllSpheres();
    });

    dom.btnCleanView.addEventListener('click', () => { this.tour.stop(); this.zenMode.toggle(true); });
    dom.btnPanelCleanView.addEventListener('click', () => { this.tour.stop(); this.zenMode.toggle(true); });

    // Viaje rápido por el universo (vista normal y menú lateral Zen)
    [dom.btnQuickTour, dom.btnZenTour].forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.tour.toggle());
    });

    dom.btnQuickRepel.addEventListener('click', () => {
      this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
      this.uiManager.notify('Separación recalculada');
    });

    this.initFullscreenButton();

    // Botón Rápido Mostrar/Ocultar Guías Cósmicas (Órbitas y Conexiones)
    if (dom.btnQuickOrbitLines) {
      dom.btnQuickOrbitLines.addEventListener('click', () => this.toggleCosmicLines());
    }

    if (dom.chkAllOrbitLines) {
      dom.chkAllOrbitLines.addEventListener('change', (e) => {
        this.toggleCosmicLines(e.target.checked);
      });
    }

    // Velocidad general del universo: botón rápido (cicla presets), slider y presets del panel
    this.setUniverseSpeed(this.config.universeSpeed, false);

    [dom.btnQuickSpeed, dom.btnZenSpeed].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        const cur = this.config.universeSpeed;
        const next = SPEED_PRESETS.find(v => v > cur + 0.001) ?? SPEED_PRESETS[0];
        this.setUniverseSpeed(next);
      });
    });
    // Velocidad del viaje cinemático (independiente de la del universo)
    this.config.tourSpeed = this.config.tourSpeed ?? 1;
    this.uiManager.syncTourSpeed(this.config.tourSpeed);
    if (dom.btnZenTourSpeed) {
      dom.btnZenTourSpeed.addEventListener('click', () => {
        const cur = this.config.tourSpeed;
        const next = SPEED_PRESETS.find(v => v > cur + 0.001) ?? SPEED_PRESETS[0];
        this.config.tourSpeed = next;
        this.uiManager.syncTourSpeed(next);
        this.uiManager.notify(`🚀 Velocidad del viaje: ${next}x`);
      });
    }
    if (dom.sliderUniverseSpeed) {
      dom.sliderUniverseSpeed.addEventListener('input', (e) => {
        this.setUniverseSpeed(parseFloat(e.target.value), false);
      });
    }
    (dom.btnSpeedPresets || []).forEach(btn => {
      btn.addEventListener('click', () => this.setUniverseSpeed(parseFloat(btn.dataset.speed)));
    });

    dom.btnQuickSpin.addEventListener('click', () => {
      this.config.autoRotate = !this.config.autoRotate;
      if (this.sceneManager.controls) {
        this.sceneManager.controls.autoRotate = this.config.autoRotate;
      }
      this.uiManager.setSpinButtonState(this.config.autoRotate);
    });

    dom.btnQuickCamera.addEventListener('click', () => {
      const dataUrl = this.sceneManager.captureScreenshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `photosphere-${Date.now()}.png`;
      a.click();
      this.uiManager.notify('Captura HD descargada con éxito');
    });

    dom.btnFocusCurrent.addEventListener('click', () => {
      if (this.activeSphere) {
        this.orbitEngine.focusOnSphere(this.activeSphere, this.sceneManager.camera, this.sceneManager.controls);
      }
    });

    // Ver imágenes / muestras de la esfera seleccionada
    if (dom.btnViewSpherePhotos) {
      dom.btnViewSpherePhotos.addEventListener('click', () => {
        if (!this.activeSphere) return;
        this.uiManager.openPhotosModal(this.activeSphere, (idx) => {
          const col = idx % this.activeSphere.cols;
          const row = Math.floor(idx / this.activeSphere.cols);
          this.lightbox.show(this.activeSphere, col, row, idx);
        });
      });
    }

    dom.btnDupCurrent.addEventListener('click', () => this.duplicateCurrentSphere());
    dom.btnDelCurrent.addEventListener('click', () => {
      if (this.activeSphere) this.deleteSphere(this.activeSphere);
    });

    // Space & Anti-collision margin
    dom.sliderSpaceMargin.addEventListener('input', (e) => {
      this.config.sphereMargin = parseInt(e.target.value, 10);
      dom.lblSpaceMargin.textContent = `${this.config.sphereMargin} u`;
      this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
    });

    // Layout modes
    dom.layoutModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.layoutModeBtns.forEach(b => b.classList.remove('border-cyan-400/80', 'text-cyan-300'));
        btn.classList.add('border-cyan-400/80', 'text-cyan-300');
        const mode = btn.dataset.mode;
        if (mode === 'custom') {
          this.enterCustomLayout(true);
        } else {
          this.config.layoutMode = mode;
        }
        // Un preset reorganiza todo desde cero, descartando posiciones manuales
        this.spheres.forEach(s => { if (mode !== 'custom') s.manualPos = null; });
        this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin, mode !== 'custom');
        this.sceneManager.rebuildConstellationLines(this.spheres);
        if (this.activeSphere) this.uiManager.syncMoveControls(this.activeSphere);
        this.uiManager.notify(`Modo: ${btn.querySelector('div').innerText.trim()}`);
      });
    });

    dom.chkConstellations.addEventListener('change', (e) => {
      this.config.showConstellations = e.target.checked;
      this.sceneManager.rebuildConstellationLines(this.spheres);
      this.uiManager.setAllOrbitLinesButtonState(this.config.showAllOrbitLines && this.config.showConstellations);
    });

    // Sphere dimension & rotation sliders
    dom.sliderSphereRadius.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      const r = parseInt(e.target.value, 10);
      this.activeSphere.setRadius(r);
      dom.lblSphereRadius.textContent = `${r} u`;
      this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
      this.uiManager.renderSpheresList(this.spheres, this.activeSphere);
    });

    dom.sliderSphereSpin.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.spinSpeed = parseFloat(e.target.value);
      dom.lblSphereSpin.textContent = `${this.activeSphere.spinSpeed.toFixed(1)}x`;
    });

    // ==========================================
    // Jerarquía Orbital (Sistema Solar / Padre-Hijo)
    // ==========================================
    if (dom.sphereParent) {
      dom.sphereParent.addEventListener('change', (e) => {
        if (!this.activeSphere) return;
        const newParentId = e.target.value || null;

        if (!newParentId) {
          // Desconectado de órbita: Se convierte en Estrella Autónoma
          this.activeSphere.parentId = null;
          this.activeSphere.setBodyType('star', this.sceneManager.scene);
          this.activeSphere.orbitRadius = 0;
          this.activeSphere.orbitSpeed = 0;
          this.activeSphere.setRadius(CELESTIAL_PRESETS.star.defaultRadius);
          this.activeSphere.removeOrbitLine(this.sceneManager.scene);
          this.uiManager.notify(`⭐ ${this.activeSphere.name} convertida en Estrella (Centro Autónomo)`);
        } else {
          this.activeSphere.parentId = newParentId;
          const parent = this.spheres.find(s => s.id === newParentId);

          if (parent) {
            if (parent.bodyType === 'star') {
              if (this.activeSphere.bodyType === 'star') {
                this.activeSphere.setBodyType('planet', this.sceneManager.scene);
                this.activeSphere.setRadius(CELESTIAL_PRESETS.planet.defaultRadius);
                this.activeSphere.orbitRadius = 220;
              }
              this.uiManager.notify(`🪐 ${this.activeSphere.name} orbitando Estrella: ${parent.name}`);
            } else {
              // Si orbita un planeta, asignar como satélite
              if (this.activeSphere.bodyType !== 'moon') {
                this.activeSphere.setBodyType('moon', this.sceneManager.scene);
                this.activeSphere.setRadius(CELESTIAL_PRESETS.moon.defaultRadius);
                this.activeSphere.orbitRadius = 65;
              }
              this.uiManager.notify(`🌙 ${this.activeSphere.name} orbitando Planeta: ${parent.name}`);
            }
          }
        }

        // Reconstrucción completa y limpia de líneas orbitales y conexiones
        this.refreshAllUniverseVisuals();
        this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
        this.uiManager.syncSphereControls(this.activeSphere, this.spheres);
      });
    }

    if (dom.sliderOrbitRadius) {
      dom.sliderOrbitRadius.addEventListener('input', (e) => {
        if (!this.activeSphere) return;
        this.activeSphere.orbitRadius = parseInt(e.target.value, 10);
        dom.lblOrbitRadius.textContent = `${this.activeSphere.orbitRadius} u`;
        this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
        this.spheres.forEach(s => {
          if (s.parentId === this.activeSphere.parentId) s.createOrUpdateOrbitLine(this.sceneManager.scene, this.config.showAllOrbitLines);
        });
      });
    }

    if (dom.sliderOrbitSpeed) {
      dom.sliderOrbitSpeed.addEventListener('input', (e) => {
        if (!this.activeSphere) return;
        this.activeSphere.orbitSpeed = parseFloat(e.target.value);
        dom.lblOrbitSpeed.textContent = `${this.activeSphere.orbitSpeed.toFixed(1)}x`;
      });
    }

    if (dom.sliderOrbitTilt) {
      dom.sliderOrbitTilt.addEventListener('input', (e) => {
        if (!this.activeSphere) return;
        const deg = parseInt(e.target.value, 10);
        this.activeSphere.orbitTilt = (deg * Math.PI) / 180;
        dom.lblOrbitTilt.textContent = `${deg}°`;
        this.activeSphere.createOrUpdateOrbitLine(this.sceneManager.scene, this.config.showAllOrbitLines);
      });
    }

    const bindOrbitSlider = (slider, label, apply, fmt) => {
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        if (!this.activeSphere) return;
        const v = parseFloat(e.target.value);
        apply(this.activeSphere, v);
        label.textContent = fmt(v);
        this.physics.recalculateLayout(this.spheres, this.config.layoutMode, this.config.sphereMargin);
        this.activeSphere.createOrUpdateOrbitLine(this.sceneManager.scene, this.config.showAllOrbitLines);
      });
    };
    const toRad = (d) => (d * Math.PI) / 180;
    bindOrbitSlider(dom.sliderOrbitEcc, dom.lblOrbitEcc, (s, v) => { s.orbitEccentricity = v; }, v => v.toFixed(2));
    bindOrbitSlider(dom.sliderOrbitPeri, dom.lblOrbitPeri, (s, v) => { s.orbitPeriapsis = toRad(v); }, v => `${v}°`);
    bindOrbitSlider(dom.sliderOrbitNode, dom.lblOrbitNode, (s, v) => { s.orbitNode = toRad(v); }, v => `${v}°`);

    if (dom.chkOrbitLine) {
      dom.chkOrbitLine.addEventListener('change', (e) => {
        if (!this.activeSphere) return;
        this.activeSphere.showOrbitLine = e.target.checked;
        this.activeSphere.createOrUpdateOrbitLine(this.sceneManager.scene, this.config.showAllOrbitLines);
      });
    }

    // Mosaic & Cell shapes
    dom.shapeSelectors.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.activeSphere) return;
        dom.shapeSelectors.forEach(b => b.classList.remove('border-cyan-400/80', 'text-cyan-300'));
        btn.classList.add('border-cyan-400/80', 'text-cyan-300');
        this.activeSphere.shape = btn.dataset.shape;
        this.activeSphere.renderCanvasTexture();
        this.uiManager.renderSpheresList(this.spheres, this.activeSphere);
      });
    });

    dom.sliderShapeScale.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      const val = parseInt(e.target.value, 10);
      this.activeSphere.shapeScale = val / 100;
      dom.lblShapeScale.textContent = `${val}%`;
      this.activeSphere.renderCanvasTexture();
    });

    dom.sliderShapeStroke.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.strokeWidth = parseInt(e.target.value, 10);
      dom.lblShapeStroke.textContent = `${this.activeSphere.strokeWidth} px`;
      this.activeSphere.renderCanvasTexture();
    });

    dom.pickerStrokeColor.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.strokeColor = e.target.value;
      dom.lblStrokeVal.textContent = e.target.value;
      this.activeSphere.renderCanvasTexture();
    });

    dom.sliderGridCols.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.cols = parseInt(e.target.value, 10);
      dom.lblGridCols.textContent = this.activeSphere.cols;
      this.activeSphere.renderCanvasTexture();
      this.uiManager.renderSpheresList(this.spheres, this.activeSphere);
    });

    dom.sliderGridRows.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.rows = parseInt(e.target.value, 10);
      dom.lblGridRows.textContent = this.activeSphere.rows;
      this.activeSphere.renderCanvasTexture();
      this.uiManager.renderSpheresList(this.spheres, this.activeSphere);
    });

    dom.sliderCellGap.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.gap = parseInt(e.target.value, 10);
      dom.lblCellGap.textContent = `${this.activeSphere.gap} px`;
      this.activeSphere.renderCanvasTexture();
    });

    dom.pickerGridColor.addEventListener('input', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.gridColor = e.target.value;
      dom.lblGridVal.textContent = e.target.value;
      this.activeSphere.renderCanvasTexture();
    });

    dom.chkGridTransparent.addEventListener('change', (e) => {
      if (!this.activeSphere) return;
      this.activeSphere.gridTransparent = e.target.checked;
      dom.pickerGridColor.disabled = e.target.checked;
      this.activeSphere.renderCanvasTexture();
    });

    // Scene & Environment
    const applyBackground = (color) => {
      this.sceneManager.setBackgroundColor(color);
      dom.pickerBgColor.value = color;
      document.body.style.backgroundColor = color;
    };

    dom.pickerBgColor.addEventListener('input', (e) => applyBackground(e.target.value));

    dom.themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        applyBackground(btn.dataset.bg);
        if (this.activeSphere) {
          this.activeSphere.gridColor = btn.dataset.grid;
          dom.pickerGridColor.value = btn.dataset.grid;
          dom.lblGridVal.textContent = btn.dataset.grid;
          this.activeSphere.renderCanvasTexture();
        }
      });
    });

    dom.sliderLightIntensity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.sceneManager.updateLightIntensity(val);
      dom.lblLightIntensity.textContent = val.toFixed(1);
    });

    dom.sliderRoughness.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.config.roughness = val;
      dom.lblRoughness.textContent = val.toFixed(2);
      this.spheres.forEach(s => s.updateMaterial(this.config.roughness, this.config.wireframe));
    });

    dom.chkWireframe.addEventListener('change', (e) => {
      this.config.wireframe = e.target.checked;
      this.spheres.forEach(s => s.updateMaterial(this.config.roughness, this.config.wireframe));
    });

    dom.chkStars.addEventListener('change', (e) => {
      this.sceneManager.setStarsVisible(e.target.checked);
    });

    // Photos Gallery Modal
    dom.btnOpenPhotos.addEventListener('click', () => {
      if (!this.activeSphere) return;
      this.uiManager.openPhotosModal(this.activeSphere, (idx) => {
        const col = idx % this.activeSphere.cols;
        const row = Math.floor(idx / this.activeSphere.cols);
        this.lightbox.show(this.activeSphere, col, row, idx);
      });
    });

    dom.btnClosePhotosModal.addEventListener('click', () => {
      this.uiManager.closePhotosModal();
    });

    dom.btnResetToSamplePhotos.addEventListener('click', () => {
      if (!this.activeSphere) return;
      this.activeSphere.images = [];
      this.activeSphere.renderCanvasTexture();
      this.uiManager.syncPhotosCount(this.activeSphere);
      this.uiManager.renderThumbnailsGrid(this.activeSphere, (idx) => {
        const col = idx % this.activeSphere.cols;
        const row = Math.floor(idx / this.activeSphere.cols);
        this.lightbox.show(this.activeSphere, col, row, idx);
      });
      this.uiManager.notify('Muestras procedurales restauradas');
    });
  }

  /**
   * Main animation loop.
   */
  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // 1. Advance physics and hierarchical solar system orbits
    this.orbitEngine.update(
      this.spheres,
      this.sceneManager.controls,
      this.sceneManager.camera,
      this.sceneManager.constellationLines,
      this.config,
      delta
    );

    // 1b. Viaje cinemático / inactividad en Vista Zen
    this.tour.update(Math.min(delta, 0.1));

    // 1c. Efectos de esferas y de escenario
    this.effects.update(Math.min(delta, 0.1), this.spheres);

    this.boundsTimer = (this.boundsTimer || 0) + delta;
    this.sceneManager.fitUniverseBounds(this.spheres, Math.min(delta, 0.1));

    // 2. Update controls
    if (this.sceneManager.controls) {
      this.sceneManager.controls.update();
    }

    // 3. Render 3D frame
    this.sceneManager.renderer.render(
      this.sceneManager.scene,
      this.sceneManager.camera
    );
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new PhotoSphereApp();
  window.app.init();
});
