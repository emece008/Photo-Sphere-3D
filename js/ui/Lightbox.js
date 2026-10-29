/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * Lightbox: High-Definition Inspection Modal & UV Metadata Inspector
 */

import { TextureBaker } from '../entities/TextureBaker.js';

export class Lightbox {
  /**
   * @param {Object} elements
   * @param {HTMLElement} elements.modal
   * @param {HTMLImageElement} elements.img
   * @param {HTMLElement} elements.title
   * @param {HTMLElement} elements.meta
   * @param {HTMLElement} elements.closeBtn
   */
  constructor({ modal, img, title, meta, closeBtn, prevBtn, nextBtn, playBtn, playLabel, counter }) {
    this.modal = modal;
    this.img = img;
    this.title = title;
    this.meta = meta;
    this.closeBtn = closeBtn;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.playBtn = playBtn;
    this.playLabel = playLabel;
    this.counter = counter;

    this.entity = null;
    this.index = 0;
    this.isOpen = false;
    this.isPlaying = false;
    this.timer = null;
    this.intervalMs = 3000;
    this.initEvents();
  }

  initEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.step(-1, true));
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.step(1, true));
    if (this.playBtn) this.playBtn.addEventListener('click', () => this.togglePlay());

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.close();
        }
      });

      // Deslizamiento horizontal en pantallas táctiles
      let startX = null;
      this.modal.addEventListener('touchstart', (e) => {
        startX = e.touches.length === 1 ? e.touches[0].clientX : null;
      }, { passive: true });
      this.modal.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) this.step(dx < 0 ? 1 : -1, true);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowRight') this.step(1, true);
      else if (e.key === 'ArrowLeft') this.step(-1, true);
      else if (e.key === ' ') {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }

  get total() {
    return this.entity ? Math.max(1, this.entity.cols * this.entity.rows) : 1;
  }

  /**
   * Opens the lightbox modal showing the inspected photo.
   * @param {SphereEntity} entity - The sphere containing the photo
   * @param {number} col - 0-indexed column
   * @param {number} row - 0-indexed row
   * @param {number} idx - Sequential index
   */
  show(entity, col, row, idx) {
    if (!this.modal || !this.img || !entity) return;
    this.entity = entity;
    this.render(idx);
    this.modal.classList.remove('opacity-0', 'pointer-events-none');
    this.isOpen = true;
  }

  render(idx) {
    const entity = this.entity;
    const total = this.total;
    this.index = ((idx % total) + total) % total;
    const col = this.index % entity.cols;
    const row = Math.floor(this.index / entity.cols);

    let photo;
    if (entity.images && entity.images.length > 0) {
      photo = entity.images[this.index % entity.images.length];
    } else {
      photo = TextureBaker.generateArtPlaceholder(this.index, 600, 420, entity.name);
    }
    const titleText = photo.dataset.title || `${entity.name} #${this.index + 1}`;
    if (this.title) this.title.textContent = titleText;

    this.img.src = photo.src;
    this.img.alt = titleText;

    if (this.meta) {
      this.meta.textContent = `${entity.name} · [Columna ${col + 1}, Fila ${row + 1}]`;
    }
    if (this.counter) this.counter.textContent = `${this.index + 1} / ${total}`;
  }

  /**
   * Avanza o retrocede; si es una acción manual reinicia el temporizador del slideshow.
   */
  step(delta, manual = false) {
    if (!this.isOpen || !this.entity) return;
    this.render(this.index + delta);
    if (manual && this.isPlaying) this.startTimer();
  }

  startTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.step(1), this.intervalMs);
  }

  togglePlay(force) {
    const next = force !== undefined ? force : !this.isPlaying;
    this.isPlaying = next;
    if (next) {
      this.startTimer();
    } else {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.playLabel) this.playLabel.textContent = next ? 'Pausar' : 'Reproducir';
    if (this.playBtn) {
      const icon = this.playBtn.querySelector('svg, i');
      if (icon) {
        const fresh = document.createElement('i');
        fresh.setAttribute('data-lucide', next ? 'pause' : 'play');
        fresh.className = 'w-4 h-4 text-[#00f0ff] pointer-events-none';
        icon.replaceWith(fresh);
        if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
      }
    }
  }

  /**
   * Closes the lightbox modal.
   */
  close() {
    if (!this.modal) return;
    this.togglePlay(false);
    this.modal.classList.add('opacity-0', 'pointer-events-none');
    this.isOpen = false;
  }
}
