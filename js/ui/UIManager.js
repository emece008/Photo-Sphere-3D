/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * UIManager: Responsive Control Drawer, Tabs, Touch Sliders & Visual State
 */

import { SHAPES, THEMES, CELESTIAL_PRESETS } from '../config/constants.js';
import { CELESTIAL_CATALOG, getCelestialDef, paintCelestialTexture } from '../entities/CelestialTextures.js';
import { createDefaultFx } from '../effects/SphereFX.js';
import { createDefaultSceneFx } from '../effects/SceneFX.js';
import { formatBytes } from '../persistence/UniverseStore.js';

export class UIManager {
  constructor() {
    // Cache DOM Elements
    this.dom = {
      // Header & Celestial Navigator
      header: document.getElementById('main-header'),
      headerSphereSelect: document.getElementById('header-sphere-select'),
      btnHeaderGoSphere: document.getElementById('btn-header-go-sphere'),
      btnPrevSphere: document.getElementById('btn-prev-sphere'),
      btnNextSphere: document.getElementById('btn-next-sphere'),
      btnResetCam: document.getElementById('btn-reset-cam'),
      celestialPillsBar: document.getElementById('celestial-pills-bar'),
      celestialPillsContainer: document.getElementById('celestial-pills-container'),

      // Quick Actions (FAB)
      quickBar: document.getElementById('quick-action-bar'),
      btnCleanView: document.getElementById('btn-clean-view'),
      btnQuickAdd: document.getElementById('btn-quick-add'),
      btnQuickRepel: document.getElementById('btn-quick-repel'),
      btnQuickOrbitLines: document.getElementById('btn-quick-orbit-lines'),
      btnQuickSpin: document.getElementById('btn-quick-spin'),
      btnQuickSpeed: document.getElementById('btn-quick-speed'),
      badgeQuickSpeed: document.getElementById('badge-quick-speed'),
      sliderUniverseSpeed: document.getElementById('slider-universe-speed'),
      lblUniverseSpeed: document.getElementById('lbl-universe-speed'),
      btnSpeedPresets: Array.from(document.querySelectorAll('.btn-speed-preset')),
      iconPause: document.getElementById('icon-pause'),
      iconPlay: document.getElementById('icon-play'),
      btnQuickCamera: document.getElementById('btn-quick-camera'),
      btnToggleMainMenu: document.getElementById('btn-toggle-main-menu'),

      // Zen Mode Exit
      btnExitCleanMode: document.getElementById('btn-exit-clean-mode'),

      // Viaje por el universo y menú lateral Zen
      btnQuickTour: document.getElementById('btn-quick-tour'),
      btnZenTour: document.getElementById('btn-zen-tour'),
      lblZenTour: document.getElementById('lbl-zen-tour'),
      btnZenSpeed: document.getElementById('btn-zen-speed'),
      badgeZenSpeed: document.getElementById('badge-zen-speed'),
      btnZenTourSpeed: document.getElementById('btn-zen-tour-speed'),
      badgeZenTourSpeed: document.getElementById('badge-zen-tour-speed'),
      zenDock: document.getElementById('zen-side-dock'),
      zenDockToggle: document.getElementById('btn-zen-dock-toggle'),
      zenDockChevron: document.getElementById('zen-dock-chevron'),

      // Bottom Photo Bar
      bottomPhotoBar: document.getElementById('bottom-photo-bar'),
      imageInput: document.getElementById('image-input'),
      btnOpenPhotos: document.getElementById('btn-open-photos'),
      badgePhotosBtn: document.getElementById('badge-photos-btn'),

      // Main Drawer / Bottom Sheet
      mainDrawer: document.getElementById('main-drawer'),
      btnCloseDrawer: document.getElementById('btn-close-drawer'),
      navTabs: document.querySelectorAll('.nav-tab'),
      tabPanes: document.querySelectorAll('.tab-pane'),

      // Tab 1: Spheres
      totalSpheresTxt: document.getElementById('total-spheres-txt'),
      btnAddPlanet: document.getElementById('btn-add-planet'),
      btnAddMoon: document.getElementById('btn-add-moon'),
      btnAddStar: document.getElementById('btn-add-star'),
      spheresListContainer: document.getElementById('spheres-list-container'),
      activeSphereIndicator: document.getElementById('active-sphere-indicator'),
      selectActiveSphere: document.getElementById('select-active-sphere'),
      btnDrawerGoSphere: document.getElementById('btn-drawer-go-sphere'),
      inputSphereName: document.getElementById('input-sphere-name'),
      lblSphereTypePrefix: document.getElementById('lbl-sphere-type-prefix'),
      badgeNamePrefix: document.getElementById('badge-name-prefix'),
      badgeNameIcon: document.getElementById('badge-name-icon'),
      badgeNameText: document.getElementById('badge-name-text'),
      roleDescriptionCard: document.getElementById('role-description-card'),
      btnBodyTypes: document.querySelectorAll('.btn-body-type'),
      sliderSphereRadius: document.getElementById('slider-sphere-radius'),
      lblSphereRadius: document.getElementById('lbl-sphere-radius'),
      sliderSphereSpin: document.getElementById('slider-sphere-spin'),
      lblSphereSpin: document.getElementById('lbl-sphere-spin'),

      // Hierarchical Solar System Orbit Controls
      containerParentSelect: document.getElementById('container-parent-select'),
      sphereParent: document.getElementById('sphere-parent'),
      descParentHelper: document.getElementById('desc-parent-helper'),
      starIndependentNotice: document.getElementById('star-independent-notice'),
      badgeHierarchyType: document.getElementById('badge-hierarchy-type'),
      containerOrbitControls: document.getElementById('container-orbit-controls'),
      sliderOrbitRadius: document.getElementById('slider-orbit-radius'),
      lblOrbitRadius: document.getElementById('lbl-orbit-radius'),
      sliderOrbitSpeed: document.getElementById('slider-orbit-speed'),
      lblOrbitSpeed: document.getElementById('lbl-orbit-speed'),
      sliderOrbitTilt: document.getElementById('slider-orbit-tilt'),
      lblOrbitTilt: document.getElementById('lbl-orbit-tilt'),
      sliderOrbitEcc: document.getElementById('slider-orbit-ecc'),
      lblOrbitEcc: document.getElementById('lbl-orbit-ecc'),
      sliderOrbitPeri: document.getElementById('slider-orbit-peri'),
      lblOrbitPeri: document.getElementById('lbl-orbit-peri'),
      sliderOrbitNode: document.getElementById('slider-orbit-node'),
      lblOrbitNode: document.getElementById('lbl-orbit-node'),
      chkOrbitLine: document.getElementById('chk-orbit-line'),

      btnViewSpherePhotos: document.getElementById('btn-view-sphere-photos'),
      btnFocusCurrent: document.getElementById('btn-focus-current'),
      btnDupCurrent: document.getElementById('btn-dup-current'),
      btnDelCurrent: document.getElementById('btn-del-current'),

      // Tab 2: Space
      btnPanelCleanView: document.getElementById('btn-panel-clean-view'),
      sliderSpaceMargin: document.getElementById('slider-space-margin'),
      lblSpaceMargin: document.getElementById('lbl-space-margin'),
      layoutModeBtns: document.querySelectorAll('.layout-mode-btn'),
      chkConstellations: document.getElementById('chk-constellations'),
      chkAllOrbitLines: document.getElementById('chk-all-orbit-lines'),

      // Tab 3: Mosaic
      shapeSelectors: document.querySelectorAll('.shape-selector'),
      sliderShapeScale: document.getElementById('slider-shape-scale'),
      lblShapeScale: document.getElementById('lbl-shape-scale'),
      sliderShapeStroke: document.getElementById('slider-shape-stroke'),
      lblShapeStroke: document.getElementById('lbl-shape-stroke'),
      pickerStrokeColor: document.getElementById('picker-stroke-color'),
      lblStrokeVal: document.getElementById('lbl-stroke-val'),
      sliderGridCols: document.getElementById('slider-grid-cols'),
      lblGridCols: document.getElementById('lbl-grid-cols'),
      sliderGridRows: document.getElementById('slider-grid-rows'),
      lblGridRows: document.getElementById('lbl-grid-rows'),
      sliderCellGap: document.getElementById('slider-cell-gap'),
      lblCellGap: document.getElementById('lbl-cell-gap'),
      pickerGridColor: document.getElementById('picker-grid-color'),
      chkGridTransparent: document.getElementById('chk-grid-transparent'),
      lblGridVal: document.getElementById('lbl-grid-val'),

      // Tab 4: Scene
      pickerBgColor: document.getElementById('picker-bg-color'),
      themeBtns: document.querySelectorAll('.theme-btn'),
      sliderLightIntensity: document.getElementById('slider-light-intensity'),
      lblLightIntensity: document.getElementById('lbl-light-intensity'),
      sliderRoughness: document.getElementById('slider-roughness'),
      lblRoughness: document.getElementById('lbl-roughness'),
      chkWireframe: document.getElementById('chk-wireframe'),
      chkStars: document.getElementById('chk-stars'),

      // Photos Gallery Modal
      photosModal: document.getElementById('photos-modal'),
      photosModalSphereName: document.getElementById('photos-modal-sphere-name'),
      btnClosePhotosModal: document.getElementById('btn-close-photos-modal'),
      btnResetToSamplePhotos: document.getElementById('btn-reset-to-sample-photos'),
      modalThumbnailsGrid: document.getElementById('modal-thumbnails-grid'),

      // Lightbox
      lightboxModal: document.getElementById('lightbox-modal'),
      lightboxImg: document.getElementById('lightbox-img'),
      lightboxTitle: document.getElementById('lightbox-title'),
      lightboxMeta: document.getElementById('lightbox-meta'),
      btnCloseLightbox: document.getElementById('btn-close-lightbox'),
      lightboxPrev: document.getElementById('btn-lightbox-prev'),
      lightboxNext: document.getElementById('btn-lightbox-next'),
      lightboxPlay: document.getElementById('btn-lightbox-play'),
      lightboxPlayLabel: document.getElementById('lightbox-play-label'),
      lightboxCounter: document.getElementById('lightbox-counter'),
      zenMenu: document.getElementById('zen-sphere-menu'),
      zenMenuToggle: document.getElementById('btn-zen-menu-toggle'),
      zenMenuList: document.getElementById('zen-sphere-list'),

      // Toast
      toastNotify: document.getElementById('toast-notify'),
      toastText: document.getElementById('toast-text')
    };

    this.isDrawerOpen = false;
    this.toastTimer = null;

    // Event listeners container
    this.handlers = {};

    this.initDrawer();
    this.initTabs();
    this.bindZenDock();
    this.initSphereSelectors();
    this.initCelestialMenu();
    this.initEffectsPanel();
  }

  /**
   * Pestaña "Efectos": controles de efectos de la esfera activa y de espectáculos del escenario.
   */
  initEffectsPanel() {
    const sphereBox = document.getElementById('fx-sphere-controls');
    const sceneBox = document.getElementById('fx-scene-controls');
    const presetBox = document.getElementById('fx-presets');
    if (!sphereBox || !sceneBox) return;

    this.fxSphereInputs = [];
    this.fxSceneInputs = [];
    const defaults = createDefaultFx();
    const sceneDefaults = createDefaultSceneFx();

    const sphereSections = [
      { key: 'aura', title: '✨ Halo / resplandor', fields: [
        { k: 'color', type: 'color', label: 'Color' },
        { k: 'size', label: 'Tamaño', min: 1.2, max: 6, step: 0.1, fmt: v => `${v.toFixed(1)}x` },
        { k: 'intensity', label: 'Intensidad', min: 0.1, max: 1, step: 0.05, fmt: v => `${Math.round(v * 100)}%` },
        { k: 'pulse', type: 'check', label: 'Pulsar suavemente' }
      ] },
      { key: 'tail', title: '☄️ Cola de cometa', fields: [
        { k: 'color', type: 'color', label: 'Color' },
        { k: 'length', label: 'Longitud', min: 1, max: 12, step: 0.5, fmt: v => `${v.toFixed(1)}x` },
        { k: 'density', label: 'Densidad', min: 10, max: 200, step: 5, fmt: v => `${v}` },
        { k: 'size', label: 'Grosor', min: 0.3, max: 3, step: 0.1, fmt: v => `${v.toFixed(1)}x` }
      ] },
      { key: 'sparks', title: '💫 Chispas', fields: [
        { k: 'color', type: 'color', label: 'Color' },
        { k: 'rate', label: 'Cantidad', min: 5, max: 120, step: 5, fmt: v => `${v}/s` },
        { k: 'size', label: 'Tamaño', min: 0.3, max: 3, step: 0.1, fmt: v => `${v.toFixed(1)}x` }
      ] },
      { key: 'beams', title: '📡 Haces de púlsar', fields: [
        { k: 'color', type: 'color', label: 'Color' },
        { k: 'length', label: 'Longitud', min: 3, max: 16, step: 0.5, fmt: v => `${v.toFixed(1)}x` },
        { k: 'tilt', label: 'Inclinación', min: 0, max: 90, step: 5, fmt: v => `${v}°` }
      ] }
    ];

    const sceneSections = [
      { key: 'comets', title: '☄️ Lluvia de cometas', fields: [
        { k: 'interval', label: 'Cada', min: 5, max: 180, step: 5, fmt: v => `${v} s` },
        { k: 'count', label: 'Cometas', min: 1, max: 20, step: 1, fmt: v => `${v}` },
        { k: 'color', type: 'color', label: 'Color' }
      ] },
      { key: 'nebula', title: '🌌 Nebulosa', fields: [
        { k: 'interval', label: 'Cada', min: 10, max: 300, step: 5, fmt: v => `${v} s` },
        { k: 'size', label: 'Tamaño', min: 0.5, max: 2.5, step: 0.1, fmt: v => `${v.toFixed(1)}x` },
        { k: 'color', type: 'color', label: 'Color' }
      ] },
      { key: 'supernova', title: '💥 Supernova', fields: [
        { k: 'interval', label: 'Cada', min: 10, max: 300, step: 5, fmt: v => `${v} s` },
        { k: 'size', label: 'Tamaño', min: 0.5, max: 2.5, step: 0.1, fmt: v => `${v.toFixed(1)}x` },
        { k: 'color', type: 'color', label: 'Color' }
      ] }
    ];

    const toggleHtml = (id) => `
      <label class="relative inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" id="${id}" class="sr-only peer">
        <div class="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00f0ff]"></div>
      </label>`;

    const build = (box, sections, store, scope, withTest) => {
      sections.forEach(sec => {
        const card = document.createElement('div');
        card.className = 'rounded-xl border border-white/10 bg-black/20 overflow-hidden';
        const onId = `fx-${scope}-${sec.key}-on`;
        card.innerHTML = `
          <div class="flex items-center justify-between gap-2 px-3 py-2">
            <span class="font-semibold text-slate-200">${sec.title}</span>
            <div class="flex items-center gap-2">
              ${withTest ? `<button type="button" data-test="${sec.key}" class="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 text-[10px] font-bold text-cyan-100">▶ Probar</button>` : ''}
              ${toggleHtml(onId)}
            </div>
          </div>
          <div class="fx-body hidden px-3 pb-3 space-y-2 border-t border-white/5 pt-2"></div>`;
        const body = card.querySelector('.fx-body');
        const onInput = card.querySelector(`#${onId}`);

        const emit = (key, value) => {
          if (scope === 'sphere') this.emit('fxChange', { effect: sec.key, key, value });
          else this.emit('sceneFxChange', { type: sec.key, key, value });
        };
        const showBody = () => body.classList.toggle('hidden', !onInput.checked);
        onInput.addEventListener('change', () => { emit('on', onInput.checked); showBody(); });

        const entry = { sec, onInput, showBody, fields: [] };
        sec.fields.forEach(f => {
          const row = document.createElement('div');
          row.className = 'flex items-center gap-2';
          const label = `<span class="text-slate-300 w-24 shrink-0">${f.label}</span>`;
          if (f.type === 'color') {
            row.innerHTML = `${label}<input type="color" class="h-7 w-12 rounded cursor-pointer bg-transparent">`;
            const input = row.querySelector('input');
            input.addEventListener('input', () => emit(f.k, input.value));
            entry.fields.push({ f, input });
          } else if (f.type === 'check') {
            row.innerHTML = `${label}<input type="checkbox" class="accent-cyan-400 w-4 h-4">`;
            const input = row.querySelector('input');
            input.addEventListener('change', () => emit(f.k, input.checked));
            entry.fields.push({ f, input });
          } else {
            row.innerHTML = `${label}<input type="range" min="${f.min}" max="${f.max}" step="${f.step}" class="flex-1 min-w-0"><span class="font-mono text-[#00f0ff] font-bold w-12 text-right"></span>`;
            const input = row.querySelector('input');
            const out = row.querySelector('span:last-child');
            input.addEventListener('input', () => {
              const v = parseFloat(input.value);
              out.textContent = f.fmt(v);
              emit(f.k, v);
            });
            entry.fields.push({ f, input, out });
          }
          body.appendChild(row);
        });
        if (withTest) card.querySelector('[data-test]').addEventListener('click', () => this.emit('sceneFxTest', sec.key));
        store.push(entry);
        box.appendChild(card);
      });
    };

    build(sphereBox, sphereSections, this.fxSphereInputs, 'sphere', false);
    build(sceneBox, sceneSections, this.fxSceneInputs, 'scene', true);

    const presets = [
      ['none', '🚫 Ninguno'], ['comet', '☄️ Cometa'], ['glow', '✨ Resplandor'],
      ['sparkle', '💫 Chispas'], ['pulsar', '📡 Púlsar']
    ];
    presets.forEach(([id, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/50 text-[11px] font-semibold text-slate-200 transition';
      b.textContent = label;
      b.addEventListener('click', () => this.emit('fxPreset', id));
      presetBox.appendChild(b);
    });

    // Valores iniciales por defecto hasta que se sincronice con la esfera / config real
    this.fillFxInputs(this.fxSphereInputs, defaults);
    this.fillFxInputs(this.fxSceneInputs, sceneDefaults);
  }

  fillFxInputs(entries, data) {
    entries.forEach(entry => {
      const cfg = data[entry.sec.key];
      if (!cfg) return;
      entry.onInput.checked = !!cfg.on;
      entry.showBody();
      entry.fields.forEach(({ f, input, out }) => {
        const v = cfg[f.k];
        if (f.type === 'check') input.checked = !!v;
        else if (f.type === 'color') input.value = v;
        else {
          input.value = v;
          out.textContent = f.fmt(parseFloat(v));
        }
      });
    });
  }

  syncFxControls(sphere) {
    if (!sphere || !this.fxSphereInputs) return;
    this.fillFxInputs(this.fxSphereInputs, sphere.fx);
    const name = document.getElementById('fx-sphere-name');
    if (name) name.textContent = `${sphere.getTypeIcon()} ${sphere.name}`;
  }

  syncSceneFxControls(cfg) {
    if (this.fxSceneInputs) this.fillFxInputs(this.fxSceneInputs, cfg);
  }

  /**
   * Menú "Crear": alterna entre esfera de fotos y objeto celeste (catálogo con miniaturas).
   */
  initCelestialMenu() {
    const grid = document.getElementById('celestial-grid');
    const panePhotos = document.getElementById('create-pane-photos');
    const paneCelestial = document.getElementById('create-pane-celestial');
    const modeBtns = document.querySelectorAll('.create-mode');
    if (!grid || !panePhotos || !paneCelestial) return;

    const groups = [
      { type: 'star', label: '⭐ Estrellas' },
      { type: 'planet', label: '🪐 Planetas' },
      { type: 'moon', label: '🌙 Satélites' },
      { type: 'exotic', label: '✨ Exóticos' }
    ];
    groups.forEach(g => {
      const items = CELESTIAL_CATALOG.filter(c => (g.type === 'exotic' ? !!c.exotic : !c.exotic && c.bodyType === g.type));
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div class="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">${g.label}</div><div class="grid grid-cols-3 gap-1.5"></div>`;
      const row = wrap.lastElementChild;
      items.forEach(def => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.celestial = def.id;
        btn.title = def.info;
        btn.className = 'flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-400/50 cursor-pointer transition';
        btn.appendChild(this.buildCelestialThumb(def));
        const label = document.createElement('span');
        label.className = 'text-[10px] font-semibold text-slate-200 normal-case tracking-normal leading-none';
        label.textContent = def.name;
        btn.appendChild(label);
        btn.addEventListener('click', () => this.emit('createCelestial', def.id));
        row.appendChild(btn);
      });
      grid.appendChild(wrap);
    });

    const setMode = (mode) => {
      panePhotos.classList.toggle('hidden', mode !== 'photos');
      paneCelestial.classList.toggle('hidden', mode !== 'celestial');
      modeBtns.forEach(b => {
        const on = b.dataset.mode === mode;
        b.classList.toggle('bg-cyan-500/30', on);
        b.classList.toggle('text-white', on);
        b.classList.toggle('text-slate-400', !on);
      });
    };
    modeBtns.forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode(b.dataset.mode);
    }));
    setMode('photos');

    const convert = document.getElementById('btn-convert-photo-sphere');
    if (convert) convert.addEventListener('click', () => this.emit('convertToPhotoSphere'));
  }

  buildCelestialThumb(def) {
    const src = document.createElement('canvas');
    paintCelestialTexture(src, def.id, 128);
    const size = 44;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    c.className = 'rounded-full shadow-md';
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(src, src.width * 0.25, 0, src.width * 0.5, src.height, 0, 0, size, size);
    const g = ctx.createRadialGradient(size * 0.38, size * 0.35, size * 0.05, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return c;
  }

  /**
   * Registers a callback for UI actions.
   */
  on(event, handler) {
    this.handlers[event] = handler;
  }

  emit(event, ...args) {
    if (this.handlers[event]) {
      this.handlers[event](...args);
    }
  }

  initDrawer() {
    if (this.dom.btnToggleMainMenu) {
      this.dom.btnToggleMainMenu.addEventListener('click', () => this.toggleDrawer());
    }
    if (this.dom.btnCloseDrawer) {
      this.dom.btnCloseDrawer.addEventListener('click', () => this.toggleDrawer(false));
    }
  }

  toggleDrawer(force) {
    this.isDrawerOpen = force !== undefined ? force : !this.isDrawerOpen;
    const drawer = this.dom.mainDrawer;
    if (!drawer) return;

    if (this.isDrawerOpen) {
      drawer.classList.remove('translate-y-full', 'md:opacity-0', 'md:pointer-events-none');
      drawer.classList.add('translate-y-0', 'md:opacity-100', 'md:pointer-events-auto');
    } else {
      drawer.classList.add('translate-y-full', 'md:opacity-0', 'md:pointer-events-none');
      drawer.classList.remove('translate-y-0', 'md:opacity-100', 'md:pointer-events-auto');
    }
    if (this.onDrawerToggle) this.onDrawerToggle(this.isDrawerOpen, drawer);
  }

  initTabs() {
    this.dom.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchToTab(tab.dataset.tab);
      });
    });
  }

  /**
   * Initializes sphere selection controls (header dropdown, travel buttons, arrows, inspector).
   */
  initSphereSelectors() {
    // Dropdown principal en encabezado
    if (this.dom.headerSphereSelect) {
      this.dom.headerSphereSelect.addEventListener('change', (e) => {
        this.emit('selectSphereById', e.target.value);
      });
    }

    // Botón directo "Ir a Esfera" en encabezado
    if (this.dom.btnHeaderGoSphere) {
      this.dom.btnHeaderGoSphere.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emit('travelToActiveSphere');
      });
    }

    // Dropdown en panel lateral / inspector
    if (this.dom.selectActiveSphere) {
      this.dom.selectActiveSphere.addEventListener('change', (e) => {
        this.emit('selectSphereById', e.target.value);
      });
    }

    // Botón directo "Ir a Esfera" en panel lateral
    if (this.dom.btnDrawerGoSphere) {
      this.dom.btnDrawerGoSphere.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emit('travelToActiveSphere');
      });
    }

    // Botón enfocar cámara en inspector
    if (this.dom.btnFocusCurrent) {
      this.dom.btnFocusCurrent.addEventListener('click', () => {
        this.emit('travelToActiveSphere');
      });
    }

    // Botón esfera anterior
    if (this.dom.btnPrevSphere) {
      this.dom.btnPrevSphere.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.emit('cycleSphere', -1);
      });
    }

    // Botón esfera siguiente
    if (this.dom.btnNextSphere) {
      this.dom.btnNextSphere.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.emit('cycleSphere', 1);
      });
    }

    // Input nombre personalizado de esfera
    if (this.dom.inputSphereName) {
      this.dom.inputSphereName.addEventListener('input', (e) => {
        this.emit('updateSphereName', e.target.value);
      });
    }
  }

  /**
   * Switches the active tab in the drawer programmatically.
   * @param {string} tabId
   */
  switchToTab(tabId) {
    this.dom.navTabs.forEach(t => {
      if (t.dataset.tab === tabId) {
        t.classList.add('active-tab');
        t.classList.remove('text-slate-400');
      } else {
        t.classList.remove('active-tab');
        t.classList.add('text-slate-400');
      }
    });

    this.dom.tabPanes.forEach(p => {
      if (p.id === tabId) {
        p.classList.remove('hidden');
      } else {
        p.classList.add('hidden');
      }
    });
  }

  /**
   * Updates all active sphere form controls to reflect the currently selected sphere.
   * @param {SphereEntity} sphere
   * @param {Array<SphereEntity>} allSpheres
   */
  syncSphereControls(sphere, allSpheres) {
    if (!sphere) return;

    // Header, Indicators & Badges
    if (this.dom.activeSphereIndicator) this.dom.activeSphereIndicator.textContent = sphere.name;
    if (this.dom.photosModalSphereName) this.dom.photosModalSphereName.textContent = sphere.name;
    if (this.dom.totalSpheresTxt) this.dom.totalSpheresTxt.textContent = allSpheres.length;

    // Prefijo de Tipo y Campo de Nombre
    const typePrefix = sphere.getTypePrefix ? sphere.getTypePrefix() : (sphere.bodyType === 'star' ? 'Estrella' : (sphere.bodyType === 'moon' ? 'Satélite' : 'Planeta'));
    const typeIcon = sphere.getTypeIcon ? sphere.getTypeIcon() : (sphere.bodyType === 'star' ? '⭐' : (sphere.bodyType === 'moon' ? '🌙' : '🪐'));
    
    if (this.dom.lblSphereTypePrefix) this.dom.lblSphereTypePrefix.textContent = `${typeIcon} ${typePrefix}`;
    if (this.dom.badgeNameIcon) this.dom.badgeNameIcon.textContent = typeIcon;
    if (this.dom.badgeNameText) this.dom.badgeNameText.textContent = typePrefix;
    if (this.dom.badgeNamePrefix) {
      this.dom.badgeNamePrefix.className = `px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-inner flex items-center gap-1 border ${
        sphere.bodyType === 'star'
          ? 'bg-cyan-950/70 border-cyan-400/40 text-cyan-200'
          : (sphere.bodyType === 'moon'
              ? 'bg-violet-950/70 border-violet-400/40 text-violet-200'
              : 'bg-cyan-950/70 border-cyan-400/40 text-cyan-300')
      }`;
    }

    if (this.dom.inputSphereName && document.activeElement !== this.dom.inputSphereName) {
      this.dom.inputSphereName.value = sphere.rawName || sphere.name;
    }

    // Sincronizar Dropdown Real en Encabezado (sin dorado)
    if (this.dom.headerSphereSelect) {
      this.dom.headerSphereSelect.innerHTML = '';
      allSpheres.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        const roleIcon = s.bodyType === 'star' ? '⭐' : (s.bodyType === 'moon' ? '🌙' : '🪐');
        const roleName = s.bodyType === 'star' ? 'Estrella' : (s.bodyType === 'moon' ? 'Satélite' : 'Planeta');
        opt.textContent = `${roleIcon} ${s.name} (${roleName})`;
        if (s.id === sphere.id) {
          opt.selected = true;
        }
        this.dom.headerSphereSelect.appendChild(opt);
      });
      this.dom.headerSphereSelect.value = sphere.id;
    }

    // Sincronizar Barra Flotante de Píldoras Celestiales
    this.renderCelestialPills(allSpheres, sphere);

    // Dedicated Active Sphere Dropdown en Inspector
    if (this.dom.selectActiveSphere) {
      this.dom.selectActiveSphere.innerHTML = '';
      allSpheres.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        const roleIcon = s.bodyType === 'star' ? '⭐' : (s.bodyType === 'moon' ? '🌙' : '🪐');
        const roleName = s.bodyType === 'star' ? 'Estrella' : (s.bodyType === 'moon' ? 'Satélite' : 'Planeta');
        opt.textContent = `${roleIcon} ${s.name} (${roleName})`;
        if (s.id === sphere.id) {
          opt.selected = true;
        }
        this.dom.selectActiveSphere.appendChild(opt);
      });
      this.dom.selectActiveSphere.value = sphere.id;
    }

    // Resaltado del botón de tipo celestial activo
    this.dom.btnBodyTypes.forEach(btn => {
      if (btn.dataset.type === sphere.bodyType) {
        btn.classList.add('border-cyan-400', 'bg-cyan-500/30', 'text-white', 'shadow-[0_0_12px_rgba(0,240,255,0.3)]', 'ring-1', 'ring-cyan-300');
        btn.classList.remove('border-white/10', 'text-slate-300');
      } else {
        btn.classList.remove('border-cyan-400', 'bg-cyan-500/30', 'text-white', 'shadow-[0_0_12px_rgba(0,240,255,0.3)]', 'ring-1', 'ring-cyan-300');
        btn.classList.add('border-white/10', 'text-slate-300');
      }
    });

    // Control de Visualización y Explicación según Rol Celestial
    const isStar = sphere.bodyType === 'star' || !sphere.parentId;
    this.syncMoveControls(sphere);
    const isMoon = sphere.bodyType === 'moon';
    const isPlanet = !isStar && !isMoon;

    const sphereMap = new Map();
    allSpheres.forEach(s => sphereMap.set(s.id, s));
    const parent = sphere.parentId ? sphereMap.get(sphere.parentId) : null;

    if (isStar) {
      if (this.dom.badgeHierarchyType) {
        this.dom.badgeHierarchyType.textContent = '⭐ Estrella (Centro Gravitatorio)';
        this.dom.badgeHierarchyType.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30';
      }
      if (this.dom.roleDescriptionCard) {
        this.dom.roleDescriptionCard.innerHTML = '⭐ <strong>Centro Gravitacional Autónomo</strong>: No orbita alrededor de ningún cuerpo. Es el sol/ancla sobre el que orbitan planetas y satélites.';
      }
      if (this.dom.containerParentSelect) this.dom.containerParentSelect.classList.add('hidden');
      if (this.dom.starIndependentNotice) this.dom.starIndependentNotice.classList.remove('hidden');
      if (this.dom.containerOrbitControls) this.dom.containerOrbitControls.classList.add('hidden');
    } else if (isPlanet) {
      if (this.dom.badgeHierarchyType) {
        this.dom.badgeHierarchyType.textContent = '🪐 Planeta';
        this.dom.badgeHierarchyType.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
      }
      if (this.dom.roleDescriptionCard) {
        this.dom.roleDescriptionCard.innerHTML = `🪐 <strong>Planeta</strong>: Orbita directamente alrededor de <strong>${parent ? parent.name : 'su Estrella'}</strong>. Configura su distancia, velocidad e inclinación abajo.`;
      }
      if (this.dom.containerParentSelect) this.dom.containerParentSelect.classList.remove('hidden');
      if (this.dom.starIndependentNotice) this.dom.starIndependentNotice.classList.add('hidden');
      if (this.dom.containerOrbitControls) this.dom.containerOrbitControls.classList.remove('hidden');
      if (this.dom.descParentHelper) this.dom.descParentHelper.textContent = 'Selecciona la Estrella a la que orbita este planeta.';
    } else {
      if (this.dom.badgeHierarchyType) {
        this.dom.badgeHierarchyType.textContent = '🌙 Satélite';
        this.dom.badgeHierarchyType.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/30';
      }
      if (this.dom.roleDescriptionCard) {
        this.dom.roleDescriptionCard.innerHTML = `🌙 <strong>Satélite</strong>: Orbita localmente alrededor de <strong>${parent ? parent.name : 'un Planeta'}</strong>. Configura su distancia y velocidad local abajo.`;
      }
      if (this.dom.containerParentSelect) this.dom.containerParentSelect.classList.remove('hidden');
      if (this.dom.starIndependentNotice) this.dom.starIndependentNotice.classList.add('hidden');
      if (this.dom.containerOrbitControls) this.dom.containerOrbitControls.classList.remove('hidden');
      if (this.dom.descParentHelper) this.dom.descParentHelper.textContent = 'Selecciona el Planeta o Estrella al que orbita este satélite.';
    }

    // Objeto celeste: oculta lo relativo a fotos y muestra su ficha
    const celDef = getCelestialDef(sphere.celestial);
    const note = document.getElementById('celestial-note');
    const photoActions = document.getElementById('photo-actions');
    if (note) {
      note.classList.toggle('hidden', !celDef);
      if (celDef) {
        document.getElementById('celestial-note-icon').textContent = celDef.icon;
        document.getElementById('celestial-note-name').textContent = celDef.name;
        document.getElementById('celestial-note-info').textContent = celDef.info;
      }
    }
    if (photoActions) photoActions.classList.toggle('hidden', !!celDef);
    this.syncFxControls(sphere);
    this.dom.navTabs.forEach(t => {
      if (t.dataset.tab === 'tab-mosaic') {
        t.classList.toggle('hidden', !!celDef);
        if (celDef && t.classList.contains('active-tab')) this.switchToTab('tab-spheres');
      }
    });

    // Sliders de Dimensiones Básicas
    if (this.dom.sliderSphereRadius) {
      this.dom.sliderSphereRadius.value = sphere.radius;
      this.dom.lblSphereRadius.textContent = `${sphere.radius} u`;
    }
    if (this.dom.sliderSphereSpin) {
      this.dom.sliderSphereSpin.value = sphere.spinSpeed;
      this.dom.lblSphereSpin.textContent = `${sphere.spinSpeed.toFixed(1)}x`;
    }

    // Selección de Padre Jerárquico (Algoritmo Anti-Ciclos)
    if (this.dom.sphereParent) {
      const invalidParentIds = new Set([sphere.id]);
      const addDescendants = (parentId) => {
        allSpheres.forEach(s => {
          if (s.parentId === parentId) {
            invalidParentIds.add(s.id);
            addDescendants(s.id);
          }
        });
      };
      addDescendants(sphere.id);

      this.dom.sphereParent.innerHTML = '';

      if (isStar) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '⭐ Centro Gravitacional Autónomo (No orbita)';
        this.dom.sphereParent.appendChild(opt);
      } else {
        const starGroup = document.createElement('optgroup');
        starGroup.label = isPlanet ? 'Estrellas / Soles (Recomendado)' : 'Estrellas';
        const planetGroup = document.createElement('optgroup');
        planetGroup.label = isMoon ? 'Planetas (Recomendado)' : 'Planetas';

        allSpheres.forEach(s => {
          if (!invalidParentIds.has(s.id)) {
            const opt = document.createElement('option');
            opt.value = s.id;
            const roleIcon = s.bodyType === 'star' ? '⭐' : (s.bodyType === 'moon' ? '🌙' : '🪐');
            const roleName = s.bodyType === 'star' ? 'Estrella' : (s.bodyType === 'moon' ? 'Satélite' : 'Planeta');
            opt.textContent = `${roleIcon} ${s.name} (${roleName})`;
            if (sphere.parentId === s.id) {
              opt.selected = true;
            }
            if (s.bodyType === 'star') {
              starGroup.appendChild(opt);
            } else if (s.bodyType === 'planet') {
              planetGroup.appendChild(opt);
            }
          }
        });

        if (isPlanet) {
          if (starGroup.children.length > 0) this.dom.sphereParent.appendChild(starGroup);
          if (planetGroup.children.length > 0) this.dom.sphereParent.appendChild(planetGroup);
        } else {
          if (planetGroup.children.length > 0) this.dom.sphereParent.appendChild(planetGroup);
          if (starGroup.children.length > 0) this.dom.sphereParent.appendChild(starGroup);
        }

        const promoteOpt = document.createElement('option');
        promoteOpt.value = '';
        promoteOpt.textContent = '⭐ Convertir en Estrella Independiente (Sin órbita)';
        if (!sphere.parentId) promoteOpt.selected = true;
        this.dom.sphereParent.appendChild(promoteOpt);
      }

      this.dom.sphereParent.value = sphere.parentId || '';
    }

    // Sliders de Órbita Relativa
    if (this.dom.sliderOrbitRadius) {
      this.dom.sliderOrbitRadius.value = sphere.orbitRadius;
      this.dom.lblOrbitRadius.textContent = `${sphere.orbitRadius} u`;
    }
    if (this.dom.sliderOrbitSpeed) {
      this.dom.sliderOrbitSpeed.value = sphere.orbitSpeed;
      this.dom.lblOrbitSpeed.textContent = `${sphere.orbitSpeed.toFixed(1)}x`;
    }
    if (this.dom.sliderOrbitTilt) {
      const tiltDeg = Math.round((sphere.orbitTilt * 180) / Math.PI);
      this.dom.sliderOrbitTilt.value = tiltDeg;
      this.dom.lblOrbitTilt.textContent = `${tiltDeg}°`;
    }
    if (this.dom.chkOrbitLine) {
      this.dom.chkOrbitLine.checked = sphere.showOrbitLine;
    }
    const deg = (r) => Math.round(((r * 180) / Math.PI) % 360 + 360) % 360;
    if (this.dom.sliderOrbitEcc) {
      this.dom.sliderOrbitEcc.value = sphere.orbitEccentricity;
      this.dom.lblOrbitEcc.textContent = sphere.orbitEccentricity.toFixed(2);
      this.dom.sliderOrbitPeri.value = deg(sphere.orbitPeriapsis);
      this.dom.lblOrbitPeri.textContent = `${deg(sphere.orbitPeriapsis)}°`;
      this.dom.sliderOrbitNode.value = deg(sphere.orbitNode);
      this.dom.lblOrbitNode.textContent = `${deg(sphere.orbitNode)}°`;
    }

    // Mosaic Sliders
    if (this.dom.sliderShapeScale) {
      const pct = Math.round(sphere.shapeScale * 100);
      this.dom.sliderShapeScale.value = pct;
      this.dom.lblShapeScale.textContent = `${pct}%`;
    }
    if (this.dom.sliderShapeStroke) {
      this.dom.sliderShapeStroke.value = sphere.strokeWidth;
      this.dom.lblShapeStroke.textContent = `${sphere.strokeWidth} px`;
    }
    if (this.dom.pickerStrokeColor) {
      this.dom.pickerStrokeColor.value = sphere.strokeColor;
      this.dom.lblStrokeVal.textContent = sphere.strokeColor;
    }
    if (this.dom.sliderGridCols) {
      this.dom.sliderGridCols.value = sphere.cols;
      this.dom.lblGridCols.textContent = sphere.cols;
    }
    if (this.dom.sliderGridRows) {
      this.dom.sliderGridRows.value = sphere.rows;
      this.dom.lblGridRows.textContent = sphere.rows;
    }
    if (this.dom.sliderCellGap) {
      this.dom.sliderCellGap.value = sphere.gap;
      this.dom.lblCellGap.textContent = `${sphere.gap} px`;
    }
    if (this.dom.pickerGridColor) {
      this.dom.pickerGridColor.value = sphere.gridColor;
      this.dom.lblGridVal.textContent = sphere.gridColor;
      this.dom.pickerGridColor.disabled = !!sphere.gridTransparent;
    }
    if (this.dom.chkGridTransparent) this.dom.chkGridTransparent.checked = !!sphere.gridTransparent;

    // Active shape highlight
    this.dom.shapeSelectors.forEach(btn => {
      if (btn.dataset.shape === sphere.shape) {
        btn.classList.add('border-cyan-400/80', 'text-cyan-300');
      } else {
        btn.classList.remove('border-cyan-400/80', 'text-cyan-300');
      }
    });

    this.renderSpheresList(allSpheres, sphere);
    this.syncPhotosCount(sphere);
  }

  /**
   * Renderiza las píldoras flotantes superiores para cambiar y volar a cualquier esfera con un solo clic/tap.
   * @param {Array<SphereEntity>} allSpheres
   * @param {SphereEntity} activeSphere
   */
  renderCelestialPills(allSpheres, activeSphere) {
    const container = this.dom.celestialPillsContainer;
    if (!container) return;
    container.innerHTML = '';

    allSpheres.forEach(s => {
      const isCurrent = activeSphere && s.id === activeSphere.id;
      const roleIcon = s.getTypeIcon();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
        isCurrent
          ? 'bg-cyan-500/30 border border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.4)] ring-1 ring-cyan-300'
          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-cyan-400/40'
      }`;
      btn.innerHTML = `
        <span class="text-xs">${roleIcon}</span>
        <span class="truncate max-w-[120px]">${s.name}</span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emit('selectSphere', s);
      });

      container.appendChild(btn);
    });

    this.renderZenMenu(allSpheres, activeSphere);
    this.renderPanelSphereSelector(allSpheres, activeSphere);
  }

  /**
   * Selector de esferas del panel: rejilla de 8 (2 filas x 4), paginable y filtrable por tipo.
   */
  renderPanelSphereSelector(allSpheres, activeSphere) {
    const grid = document.getElementById('picker-grid');
    if (!grid) return;
    const ps = this.pickerState || (this.pickerState = { page: 0, filter: 'all', collapsed: false });
    const PAGE_SIZE = 8;
    const icon = (t) => (t === 'star' ? '⭐' : (t === 'moon' ? '🌙' : '🪐'));

    if (!this.pickerBound) {
      this.pickerBound = true;
      document.querySelectorAll('.picker-filter').forEach(b => {
        b.addEventListener('click', () => {
          ps.filter = b.dataset.filter;
          ps.page = 0;
          this.renderPanelSphereSelector(this.lastPickerSpheres, this.lastPickerActive);
        });
      });
      document.getElementById('picker-prev').addEventListener('click', () => {
        ps.page = Math.max(0, ps.page - 1);
        this.renderPanelSphereSelector(this.lastPickerSpheres, this.lastPickerActive);
      });
      document.getElementById('picker-next').addEventListener('click', () => {
        ps.page += 1;
        this.renderPanelSphereSelector(this.lastPickerSpheres, this.lastPickerActive);
      });
      const body = document.getElementById('picker-body');
      const toggle = document.getElementById('picker-toggle');
      toggle.addEventListener('click', () => {
        ps.collapsed = !ps.collapsed;
        body.classList.toggle('hidden', ps.collapsed);
        toggle.setAttribute('aria-expanded', String(!ps.collapsed));
        const chev = document.getElementById('picker-chevron');
        if (chev) chev.setAttribute('data-lucide', ps.collapsed ? 'chevron-down' : 'chevron-up');
        if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
      });
      const createToggle = document.getElementById('btn-create-menu-toggle');
      const createMenu = document.getElementById('create-menu');
      if (createToggle && createMenu) {
        const setOpen = (open) => {
          createMenu.classList.toggle('hidden', !open);
          createToggle.setAttribute('aria-expanded', String(open));
        };
        this.setCreateMenuOpen = setOpen;
        createToggle.addEventListener('click', (e) => { e.stopPropagation(); setOpen(createMenu.classList.contains('hidden')); });
        createMenu.addEventListener('click', () => setOpen(false));
        document.addEventListener('click', (e) => {
          if (!createMenu.contains(e.target) && e.target !== createToggle) setOpen(false);
        });
      }
    }

    this.lastPickerSpheres = allSpheres;
    this.lastPickerActive = activeSphere;
    if (activeSphere) {
      const ic = document.getElementById('picker-active-icon');
      if (ic) ic.textContent = activeSphere.getTypeIcon();
    }

    document.querySelectorAll('.picker-filter').forEach(b => {
      const on = b.dataset.filter === ps.filter;
      b.classList.toggle('bg-cyan-500/30', on);
      b.classList.toggle('text-cyan-100', on);
      b.classList.toggle('border', true);
      b.classList.toggle('border-cyan-400/60', on);
      b.classList.toggle('border-white/10', !on);
      b.classList.toggle('text-slate-400', !on);
    });

    const filtered = allSpheres.filter(s => ps.filter === 'all' || s.bodyType === ps.filter);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    // Al cambiar la esfera activa desde fuera, mostrar la página que la contiene
    if (activeSphere && this.pickerLastActiveId !== activeSphere.id) {
      const idx = filtered.findIndex(s => s.id === activeSphere.id);
      if (idx >= 0) ps.page = Math.floor(idx / PAGE_SIZE);
    }
    this.pickerLastActiveId = activeSphere ? activeSphere.id : null;
    ps.page = Math.min(ps.page, pages - 1);

    grid.innerHTML = '';
    filtered.slice(ps.page * PAGE_SIZE, (ps.page + 1) * PAGE_SIZE).forEach(s => {
      const isCur = activeSphere && s.id === activeSphere.id;
      const b = document.createElement('button');
      b.type = 'button';
      b.title = s.name;
      b.className = `flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl border text-center cursor-pointer transition min-w-0 ${isCur ? 'bg-cyan-500/30 border-cyan-300 text-white shadow-[0_0_10px_rgba(0,240,255,0.35)]' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`;
      const i = document.createElement('span');
      i.className = 'text-base leading-none';
      i.textContent = s.getTypeIcon();
      const n = document.createElement('span');
      n.className = 'text-[9px] leading-tight w-full truncate';
      n.textContent = s.name;
      b.append(i, n);
      b.addEventListener('click', () => this.emit('selectSphere', s));
      grid.appendChild(b);
    });

    const label = document.getElementById('picker-page');
    if (label) label.textContent = `${ps.page + 1} / ${pages}`;
    document.getElementById('picker-prev').disabled = ps.page <= 0;
    document.getElementById('picker-next').disabled = ps.page >= pages - 1;
    document.getElementById('picker-pager').classList.toggle('invisible', pages <= 1);
  }

  /**
   * Desplegable de Vista Zen: esferas agrupadas por sistema (estrella -> planetas -> satélites).
   */
  renderZenMenu(allSpheres, activeSphere) {
    const list = this.dom.zenMenuList;
    if (!list) return;

    if (!this._zenMenuBound && this.dom.zenMenuToggle) {
      this._zenMenuBound = true;
      this.dom.zenMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleZenMenu();
      });
    }

    const ids = new Set(allSpheres.map(s => s.id));
    const roots = allSpheres.filter(s => !s.parentId || !ids.has(s.parentId));
    const ordered = [];
    const visited = new Set();
    const walk = (s, depth) => {
      if (visited.has(s.id)) return;
      visited.add(s.id);
      ordered.push({ s, depth });
      allSpheres.filter(c => c.parentId === s.id).forEach(c => walk(c, depth + 1));
    };
    roots.forEach(r => walk(r, 0));

    list.innerHTML = '';
    ordered.forEach(({ s, depth }) => {
      const isCurrent = activeSphere && s.id === activeSphere.id;
      const icon = s.getTypeIcon();
      const item = document.createElement('button');
      item.type = 'button';
      item.style.paddingLeft = `${0.6 + depth * 1.1}rem`;
      item.className = `w-full flex items-center gap-2 pr-3 py-2 rounded-xl text-xs text-left cursor-pointer transition ${
        s.bodyType === 'star' && depth === 0 ? 'font-bold' : 'font-medium'
      } ${isCurrent ? 'bg-cyan-500/25 text-white ring-1 ring-cyan-400/70' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`;
      const prefix = depth > 0 ? '<span class="text-slate-500">↳</span>' : '';
      item.innerHTML = `${prefix}<span>${icon}</span><span class="truncate"></span>`;
      item.lastElementChild.textContent = s.name;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emit('selectSphere', s);
        this.toggleZenMenu(false);
      });
      list.appendChild(item);
    });
  }

  toggleZenMenu(force) {
    const list = this.dom.zenMenuList;
    if (!list) return;
    const open = force !== undefined ? force : list.classList.contains('hidden');
    list.classList.toggle('hidden', !open);
    if (this.dom.zenMenuToggle) this.dom.zenMenuToggle.setAttribute('aria-expanded', String(open));
  }

  /**
   * Actualiza los nombres de la esfera en cabecera, píldoras y lista sin resetear foco de inputs.
   */
  syncSphereNamesOnly(sphere, allSpheres) {
    if (!sphere) return;
    if (this.dom.activeSphereIndicator) this.dom.activeSphereIndicator.textContent = sphere.name;
    if (this.dom.photosModalSphereName) this.dom.photosModalSphereName.textContent = sphere.name;
    if (this.dom.headerSphereSelect) {
      const opt = this.dom.headerSphereSelect.querySelector(`option[value="${sphere.id}"]`);
      if (opt) {
        const roleIcon = sphere.bodyType === 'star' ? '⭐' : (sphere.bodyType === 'moon' ? '🌙' : '🪐');
        const roleName = sphere.bodyType === 'star' ? 'Estrella' : (sphere.bodyType === 'moon' ? 'Satélite' : 'Planeta');
        opt.textContent = `${roleIcon} ${sphere.name} (${roleName})`;
      }
    }
    if (this.dom.selectActiveSphere) {
      const opt = this.dom.selectActiveSphere.querySelector(`option[value="${sphere.id}"]`);
      if (opt) {
        const roleIcon = sphere.bodyType === 'star' ? '⭐' : (sphere.bodyType === 'moon' ? '🌙' : '🪐');
        const roleName = sphere.bodyType === 'star' ? 'Estrella' : (sphere.bodyType === 'moon' ? 'Satélite' : 'Planeta');
        opt.textContent = `${roleIcon} ${sphere.name} (${roleName})`;
      }
    }

    const typePrefix = sphere.getTypePrefix ? sphere.getTypePrefix() : (sphere.bodyType === 'star' ? 'Estrella' : (sphere.bodyType === 'moon' ? 'Satélite' : 'Planeta'));
    const typeIcon = sphere.getTypeIcon ? sphere.getTypeIcon() : (sphere.bodyType === 'star' ? '⭐' : (sphere.bodyType === 'moon' ? '🌙' : '🪐'));
    if (this.dom.lblSphereTypePrefix) this.dom.lblSphereTypePrefix.textContent = `${typeIcon} ${typePrefix}`;
    if (this.dom.badgeNameIcon) this.dom.badgeNameIcon.textContent = typeIcon;
    if (this.dom.badgeNameText) this.dom.badgeNameText.textContent = typePrefix;

    this.renderCelestialPills(allSpheres, sphere);
    this.renderSpheresList(allSpheres, sphere);
  }

  /**
   * Renders the interactive list of spheres structured as a visual Solar System Tree.
   * Stars -> Planets -> Moons.
   */
  renderSpheresList(spheres, activeSphere) {
    const container = this.dom.spheresListContainer;
    if (!container) return;
    container.innerHTML = '';

    const sphereMap = new Map();
    spheres.forEach(s => sphereMap.set(s.id, s));

    const renderedIds = new Set();

    // Helper to render a sphere item row with indentation
    const renderRow = (s, depth = 0, isLastChild = false) => {
      renderedIds.add(s.id);
      const isCurrent = s === activeSphere;
      const row = document.createElement('div');

      const isStar = s.bodyType === 'star' || !s.parentId;
      const isMoon = s.bodyType === 'moon';

      let indentPadding = 'pl-2';
      let branchPrefix = '';
      if (depth === 1) {
        indentPadding = 'pl-4';
        branchPrefix = '<span class="text-slate-500 font-mono text-[10px] mr-1">↳</span>';
      } else if (depth >= 2) {
        indentPadding = 'pl-7';
        branchPrefix = '<span class="text-slate-600 font-mono text-[10px] mr-1">└──</span>';
      }

      // Visual roles and accent colors (Sin dorados para estrellas)
      let badgeHtml = '';
      let dotColor = 'bg-cyan-400';
      if (isStar) {
        dotColor = 'bg-cyan-300 shadow-[0_0_8px_#38bdf8]';
        badgeHtml = '<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 font-mono">⭐ Estrella</span>';
      } else if (isMoon) {
        dotColor = 'bg-violet-400 shadow-[0_0_8px_#c084fc]';
        badgeHtml = '<span class="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-400/30 font-mono">🌙 Satélite</span>';
      } else {
        dotColor = 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]';
        badgeHtml = '<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">🪐 Planeta</span>';
      }

      row.className = `p-1.5 ${indentPadding} rounded-xl flex items-center justify-between cursor-pointer border transition ${
        isCurrent
          ? 'bg-cyan-500/15 border-cyan-400/60 text-white shadow-[0_0_10px_rgba(0,240,255,0.15)]'
          : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
      }`;

      row.innerHTML = `
        <div class="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0 mr-1">
          ${branchPrefix}
          <div class="w-2.5 h-2.5 rounded-full shrink-0 ${isCurrent ? dotColor : 'bg-slate-500'}"></div>
          <div class="truncate">
            <div class="flex items-center gap-1.5">
              <p class="font-bold text-xs truncate">${s.name}</p>
              ${badgeHtml}
            </div>
            <p class="text-[10px] text-slate-400 truncate">R: ${s.radius}u ${s.parentId ? `· Órbita: ${s.orbitRadius}u` : '· Centro'}</p>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${isStar ? `
            <button type="button" class="list-add-child-btn px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/30 transition cursor-pointer" title="Añadir planeta a esta estrella">
              + Planeta
            </button>
          ` : (s.bodyType === 'planet' ? `
            <button type="button" class="list-add-child-btn px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/20 hover:bg-violet-500/40 text-violet-200 border border-violet-400/30 transition cursor-pointer" title="Añadir satélite a este planeta">
              + Satélite
            </button>
          ` : '')}
          <button type="button" class="list-focus-btn p-1.5 rounded-lg hover:text-cyan-300 cursor-pointer" title="Enfocar">
            <i data-lucide="crosshair" class="w-3.5 h-3.5 pointer-events-none"></i>
          </button>
          ${
            spheres.length > 1
              ? `<button type="button" class="list-del-btn p-1.5 rounded-lg text-rose-400 hover:text-rose-300 cursor-pointer" title="Borrar">
                   <i data-lucide="x" class="w-3.5 h-3.5 pointer-events-none"></i>
                 </button>`
              : ''
          }
        </div>
      `;

      row.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.emit('selectSphere', s);
        }
      });

      const addChildBtn = row.querySelector('.list-add-child-btn');
      if (addChildBtn) {
        addChildBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isStar) {
            this.emit('createPlanetForStar', s);
          } else {
            this.emit('createMoonForPlanet', s);
          }
        });
      }

      const focusBtn = row.querySelector('.list-focus-btn');
      if (focusBtn) {
        focusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.emit('focusSphere', s);
        });
      }

      const delBtn = row.querySelector('.list-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.emit('deleteSphere', s);
        });
      }

      container.appendChild(row);
    };

    // 1. First, render all Root Stars
    const rootStars = spheres.filter(s => !s.parentId || !sphereMap.has(s.parentId));
    rootStars.forEach(star => {
      renderRow(star, 0);

      // Find planets orbiting this star
      const planets = spheres.filter(s => s.parentId === star.id);
      planets.forEach(planet => {
        renderRow(planet, 1);

        // Find moons orbiting this planet
        const moons = spheres.filter(s => s.parentId === planet.id);
        moons.forEach(moon => {
          renderRow(moon, 2);
        });
      });
    });

    // 2. Render any residual un-parented bodies
    spheres.forEach(s => {
      if (!renderedIds.has(s.id)) {
        renderRow(s, 0);
      }
    });

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  syncPhotosCount(sphere) {
    if (!this.dom.badgePhotosBtn || !sphere) return;
    const cnt = sphere.images ? sphere.images.length : 0;
    this.dom.badgePhotosBtn.textContent = cnt > 0 ? `${cnt} Fotos` : 'Muestras';
  }

  /**
   * Renders the thumbnails grid inside the photo gallery modal.
   */
  renderThumbnailsGrid(sphere, onThumbnailClick) {
    const grid = this.dom.modalThumbnailsGrid;
    if (!grid || !sphere) return;
    grid.innerHTML = '';

    const list = sphere.images && sphere.images.length > 0
      ? sphere.images
      : Array.from({ length: 16 }, (_, i) => ({
          src: sphere.baker ? sphere.baker.constructor.generateArtPlaceholder(i, 120, 120, sphere.name).src : '',
          dataset: { title: `${sphere.name} · Muestra #${i + 1}` }
        }));

    list.forEach((img, idx) => {
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = img.dataset?.title || `Foto #${idx + 1}`;
      thumb.className = 'w-full aspect-square object-cover rounded-xl border border-white/10 hover:border-cyan-400 cursor-pointer transition transform active:scale-95';
      thumb.addEventListener('click', () => {
        this.closePhotosModal();
        if (onThumbnailClick) {
          onThumbnailClick(idx);
        }
      });
      grid.appendChild(thumb);
    });
  }

  openPhotosModal(sphere, onThumbnailClick) {
    this.renderThumbnailsGrid(sphere, onThumbnailClick);
    if (this.dom.photosModal) {
      this.dom.photosModal.classList.remove('opacity-0', 'pointer-events-none');
    }
  }

  closePhotosModal() {
    if (this.dom.photosModal) {
      this.dom.photosModal.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  /**
   * Panel de universos guardados (guardar, abrir, nuevo, exportar, importar).
   */
  initUniversePanel(um) {
    const $ = (id) => document.getElementById(id);
    const modal = $('universe-modal');
    const list = $('universe-list');
    const nameInput = $('universe-name-input');
    const chipName = $('universe-chip-name');
    const chipDirty = $('universe-chip-dirty');
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const icons = () => window.lucide && window.lucide.createIcons && window.lucide.createIcons();

    const guardDiscard = () => !um.dirty || confirm('Hay cambios sin guardar en el universo actual. ¿Descartarlos?');

    const renderList = async () => {
      let items = [];
      try {
        items = await um.list();
      } catch (e) {
        list.innerHTML = '<p class="text-xs text-rose-300">El almacenamiento local no está disponible en este navegador. Puedes usar Exportar / Importar JSON.</p>';
        return;
      }
      $('universe-list-count').textContent = items.length ? `${items.length}` : '';
      if (!items.length) {
        list.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Aún no hay universos guardados. Pulsa «Guardar» para crear el primero.</p>';
        return;
      }
      list.innerHTML = items.map(u => `
        <div class="flex items-center gap-3 p-2 rounded-2xl border ${u.id === um.currentId ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/5'}" data-id="${u.id}">
          <div class="w-20 h-12 shrink-0 rounded-lg overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
            ${u.thumb ? `<img src="${u.thumb}" class="w-full h-full object-cover" alt="">` : '<i data-lucide="orbit" class="w-5 h-5 text-slate-600"></i>'}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-white truncate">${esc(u.name)}${u.id === um.currentId ? ' <span class="text-[9px] text-emerald-300 font-bold uppercase">· actual</span>' : ''}</div>
            <div class="text-[10px] text-slate-400 truncate">${new Date(u.savedAt).toLocaleString()} · ${u.spheres} esferas · ${u.photos} fotos · ${formatBytes(u.size)}</div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button data-act="open" class="px-2.5 py-1.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/50 text-emerald-100 text-[11px] font-bold cursor-pointer">Abrir</button>
            <button data-act="export" class="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer" title="Exportar JSON"><i data-lucide="download" class="w-4 h-4 pointer-events-none"></i></button>
            <button data-act="delete" class="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 cursor-pointer" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
          </div>
        </div>`).join('');
      icons();
    };

    const refreshState = () => {
      chipName.textContent = um.name;
      chipDirty.classList.toggle('hidden', !um.dirty);
      if (document.activeElement !== nameInput) nameInput.value = um.name;
      $('chk-universe-autosave').checked = um.autosave;
    };

    const open = () => {
      nameInput.value = um.name;
      modal.classList.remove('opacity-0', 'pointer-events-none');
      renderList();
    };
    const close = () => modal.classList.add('opacity-0', 'pointer-events-none');

    um.onChange(refreshState);
    refreshState();

    $('btn-quick-universes').addEventListener('click', open);
    $('universe-chip').addEventListener('click', open);
    $('btn-close-universe-modal').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('pointer-events-none')) close();
    });

    $('btn-universe-save').addEventListener('click', async () => {
      await um.save({ name: nameInput.value });
      renderList();
    });
    $('btn-universe-save-as').addEventListener('click', async () => {
      const base = (nameInput.value || um.name).trim();
      await um.save({ asNew: true, name: um.currentId ? `${base} (copia)` : base });
      renderList();
    });
    $('btn-universe-new').addEventListener('click', async () => {
      if (!guardDiscard()) return;
      await um.createNew();
      close();
    });
    $('btn-universe-export').addEventListener('click', () => {
      if (nameInput.value.trim()) um.name = nameInput.value.trim();
      um.exportCurrent();
    });
    const file = $('universe-import-file');
    $('btn-universe-import').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files[0];
      file.value = '';
      if (!f || !guardDiscard()) return;
      if (await um.importFile(f)) close();
    });
    $('chk-universe-autosave').addEventListener('change', (e) => um.setAutosave(e.target.checked));
    nameInput.addEventListener('change', async () => {
      const n = nameInput.value.trim();
      if (!n) return;
      if (um.currentId) await um.rename(um.currentId, n);
      else um.name = n;
      refreshState();
      renderList();
    });

    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.closest('[data-id]').dataset.id;
      const act = btn.dataset.act;
      if (act === 'open') {
        if (id === um.currentId && !um.dirty) { close(); return; }
        if (!guardDiscard()) return;
        if (await um.open(id)) close();
      } else if (act === 'export') {
        um.exportSaved(id);
      } else if (act === 'delete') {
        if (!confirm('¿Eliminar este universo guardado? Esta acción no se puede deshacer.')) return;
        await um.remove(id);
        renderList();
      }
    });
  }

  /**
   * Menú lateral de Vista Zen: oculto por defecto, solo asoma la flecha.
   */
  toggleZenDock(force) {
    const dock = this.dom.zenDock;
    if (!dock) return;
    this.isZenDockOpen = force !== undefined ? force : !this.isZenDockOpen;
    dock.style.transform = this.isZenDockOpen
      ? 'translate(0, -50%)'
      : 'translate(calc(100% - 1.75rem), -50%)';
    if (this.dom.zenDockToggle) this.dom.zenDockToggle.setAttribute('aria-expanded', String(this.isZenDockOpen));
    if (this.dom.zenDockToggle) {
      this.dom.zenDockToggle.innerHTML = `<i data-lucide="${this.isZenDockOpen ? 'chevron-right' : 'chevron-left'}" class="w-4 h-4 pointer-events-none"></i>`;
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    }
  }

  bindZenDock() {
    if (this.dom.zenDockToggle) {
      this.dom.zenDockToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleZenDock();
      });
    }
  }

  syncTourSpeed(speed) {
    const txt = Number.isInteger(speed) ? `${speed}x` : `${parseFloat(speed.toFixed(2))}x`;
    if (this.dom.badgeZenTourSpeed) this.dom.badgeZenTourSpeed.textContent = txt;
  }

  /** Refleja si el viaje está activo en los botones. */
  syncTourState(running) {
    const d = this.dom;
    if (d.lblZenTour) d.lblZenTour.textContent = running ? 'Detener viaje' : 'Viaje rápido';
    [d.btnQuickTour, d.btnZenTour].forEach(b => {
      if (!b) return;
      b.classList.toggle('ring-2', running);
      b.classList.toggle('ring-violet-400/70', running);
    });
  }

  /**
   * Refleja la velocidad general en botón rápido, slider, etiqueta y presets.
   */
  syncUniverseSpeed(speed) {
    const d = this.dom;
    const txt = Number.isInteger(speed) ? `${speed}x` : `${parseFloat(speed.toFixed(2))}x`;
    if (d.badgeQuickSpeed) d.badgeQuickSpeed.textContent = txt;
    if (d.badgeZenSpeed) d.badgeZenSpeed.textContent = txt;
    if (d.lblUniverseSpeed) d.lblUniverseSpeed.textContent = `${speed.toFixed(speed < 1 && speed * 10 % 1 ? 2 : 1)}x`;
    if (d.sliderUniverseSpeed) d.sliderUniverseSpeed.value = speed;
    (d.btnSpeedPresets || []).forEach(b => {
      const on = Math.abs(parseFloat(b.dataset.speed) - speed) < 0.001;
      b.classList.toggle('bg-amber-500/25', on);
      b.classList.toggle('text-amber-300', on);
      b.classList.toggle('border', on);
      b.classList.toggle('border-amber-400/50', on);
      b.classList.toggle('bg-white/5', !on);
      b.classList.toggle('text-slate-300', !on);
    });
  }

  setSpinButtonState(isAutoRotating) {
    if (isAutoRotating) {
      this.dom.iconPause.classList.remove('hidden');
      this.dom.iconPlay.classList.add('hidden');
    } else {
      this.dom.iconPause.classList.add('hidden');
      this.dom.iconPlay.classList.remove('hidden');
    }
  }

  setAllOrbitLinesButtonState(visible) {
    if (this.dom.btnQuickOrbitLines) {
      if (visible) {
        this.dom.btnQuickOrbitLines.classList.remove('opacity-40', 'border-white/10', 'text-slate-400');
        this.dom.btnQuickOrbitLines.classList.add('text-[#00f0ff]', 'border-cyan-400/60', 'bg-cyan-950/20', 'shadow-[0_0_15px_rgba(0,240,255,0.3)]');
      } else {
        this.dom.btnQuickOrbitLines.classList.remove('text-[#00f0ff]', 'border-cyan-400/60', 'bg-cyan-950/20', 'shadow-[0_0_15px_rgba(0,240,255,0.3)]');
        this.dom.btnQuickOrbitLines.classList.add('opacity-40', 'border-white/10', 'text-slate-400');
      }
    }
    if (this.dom.chkAllOrbitLines) {
      this.dom.chkAllOrbitLines.checked = visible;
    }
    if (this.dom.chkConstellations) {
      this.dom.chkConstellations.checked = visible;
    }
  }

  /**
   * Displays an animated toast notification.
   * @param {string} text
   * @param {number} duration - ms
   */
  /** Estado del botón Mover/Bloquear de las estrellas libres. */
  syncMoveControls(sphere) {
    const btn = document.getElementById('btn-toggle-move');
    if (!btn || !sphere) return;
    const on = !!sphere.unlocked;
    document.getElementById('move-icon').textContent = on ? '🔓' : '🔒';
    document.getElementById('move-label').textContent = on ? 'Mover: libre' : 'Mover: bloqueada';
    btn.classList.toggle('border-amber-400', on);
    btn.classList.toggle('text-amber-200', on);
    document.getElementById('move-hint').classList.toggle('hidden', !on);
    const auto = document.getElementById('btn-auto-place');
    if (auto) auto.disabled = !sphere.manualPos;
    if (auto) auto.classList.toggle('opacity-40', !sphere.manualPos);
  }

  notify(text, duration = 2500) {
    if (!this.dom.toastNotify || !this.dom.toastText) return;
    this.dom.toastText.textContent = text;
    this.dom.toastNotify.classList.remove('opacity-0', 'pointer-events-none');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toastNotify.classList.add('opacity-0', 'pointer-events-none');
    }, duration);
  }
}
