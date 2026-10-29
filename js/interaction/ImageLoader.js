/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * ImageLoader: Drag & Drop, Multiple File API & Procedural Art Pipeline
 */

import { TextureBaker } from '../entities/TextureBaker.js';

export class ImageLoader {
  /**
   * @param {Object} options
   * @param {HTMLInputElement} options.fileInput
   * @param {HTMLElement} options.dropTarget
   * @param {Function} options.onImagesLoaded - Callback when images are loaded into a sphere
   * @param {Function} options.onNotify - Toast notification callback
   */
  constructor({ fileInput, dropTarget, onImagesLoaded, onNotify }) {
    this.fileInput = fileInput;
    this.dropTarget = dropTarget || document.body;
    this.onImagesLoaded = onImagesLoaded;
    this.onNotify = onNotify;

    this.initFileInput();
    this.initDragAndDrop();
  }

  initFileInput() {
    if (!this.fileInput) return;
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.processFiles(e.target.files);
        // Reset input value so the same files can be re-selected if desired
        this.fileInput.value = '';
      }
    });
  }

  initDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropTarget.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    this.dropTarget.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        this.processFiles(dt.files);
      }
    });
  }

  /**
   * Processes a list of uploaded File objects.
   * @param {FileList|Array<File>} fileList
   * @param {SphereEntity} targetSphere
   */
  processFiles(fileList, targetSphere) {
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      if (this.onNotify) this.onNotify('Por favor selecciona archivos de imagen válidos (PNG, JPG, WebP)');
      return;
    }

    const loadedImages = [];
    let processedCount = 0;

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          img.dataset.title = file.name.replace(/\.[^/.]+$/, '');
          img.dataset.filename = file.name;
          loadedImages.push(img);
          processedCount++;

          if (processedCount === validFiles.length) {
            if (this.onImagesLoaded) {
              this.onImagesLoaded(loadedImages, targetSphere);
            }
            if (this.onNotify) {
              this.onNotify(`¡${loadedImages.length} fotos cargadas exitosamente!`);
            }
          }
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generates procedural art placeholders for empty spheres.
   */
  static generateArtFallback(index, width, height, sphereName) {
    return TextureBaker.generateArtPlaceholder(index, width, height, sphereName);
  }
}
