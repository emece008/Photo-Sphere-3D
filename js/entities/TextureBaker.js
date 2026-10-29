/**
 * Photo Sphere Studio 3D - Universal Orbital Engine
 * TextureBaker: Canvas 2D High-Resolution Synthesis & Geometric Shape Clipping
 */

import { PALETTES } from '../config/constants.js';
import { paintCelestialTexture } from './CelestialTextures.js';

export class TextureBaker {
  /**
   * @param {Object} sphere - The SphereEntity owning this baker
   */
  constructor(sphere) {
    this.sphere = sphere;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.texture = null;
  }

  /**
   * Creates or updates the Three.js CanvasTexture.
   * @param {Object} THREE - Three.js namespace
   * @param {number} maxAnisotropy - Maximum anisotropy supported by GPU
   * @returns {THREE.CanvasTexture}
   */
  createTexture(THREE, maxAnisotropy = 4) {
    this.render();

    if (!this.texture) {
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.wrapS = THREE.RepeatWrapping;
      this.texture.wrapT = THREE.ClampToEdgeWrapping;
      this.texture.generateMipmaps = true;

      // Color space and sharpness
      if (THREE.SRGBColorSpace) {
        this.texture.colorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        this.texture.encoding = THREE.sRGBEncoding;
      }

      if (maxAnisotropy > 1) {
        this.texture.anisotropy = maxAnisotropy;
      }
    } else {
      this.texture.needsUpdate = true;
    }

    return this.texture;
  }

  /**
   * Renders the complete photo grid texture to the 2D canvas.
   */
  render() {
    const s = this.sphere;

    if (s.celestial) {
      paintCelestialTexture(this.canvas, s.celestial);
      if (this.texture) this.texture.needsUpdate = true;
      return;
    }

    const width = s.cols * s.tileW;
    const height = s.rows * s.tileH;

    this.canvas.width = width;
    this.canvas.height = height;

    // Fill background grid / divider color
    if (s.gridTransparent) {
      this.ctx.clearRect(0, 0, width, height);
    } else {
      this.ctx.fillStyle = s.gridColor || '#080a11';
      this.ctx.fillRect(0, 0, width, height);
    }

    for (let r = 0; r < s.rows; r++) {
      for (let c = 0; c < s.cols; c++) {
        const idx = r * s.cols + c;
        const x = c * s.tileW;
        const y = r * s.tileH;

        let imgSource;
        if (s.images && s.images.length > 0) {
          imgSource = s.images[idx % s.images.length];
        } else {
          imgSource = TextureBaker.generateArtPlaceholder(idx, s.tileW, s.tileH, s.name);
        }

        if (imgSource.complete && imgSource.naturalWidth > 0) {
          this.drawCell(imgSource, x, y, s.tileW, s.tileH);
        } else {
          imgSource.onload = () => {
            this.drawCell(imgSource, x, y, s.tileW, s.tileH);
            if (this.texture) {
              this.texture.needsUpdate = true;
            }
          };
        }
      }
    }

    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  /**
   * Draws a single cropped and framed photo cell with geometric masking.
   */
  drawCell(img, x, y, w, h) {
    const s = this.sphere;
    const pad = s.gap;
    const cw = Math.max(1, w - (pad * 2));
    const ch = Math.max(1, h - (pad * 2));

    const targetW = cw * s.shapeScale;
    const targetH = ch * s.shapeScale;
    const startX = x + pad + (cw - targetW) / 2;
    const startY = y + pad + (ch - targetH) / 2;

    const imgRatio = (img.naturalWidth || w) / (img.naturalHeight || h);
    const cellRatio = targetW / targetH;
    let sWidth, sHeight, sx, sy;

    if (imgRatio > cellRatio) {
      sHeight = img.naturalHeight || h;
      sWidth = sHeight * cellRatio;
      sx = ((img.naturalWidth || w) - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = img.naturalWidth || w;
      sHeight = sWidth / cellRatio;
      sx = 0;
      sy = ((img.naturalHeight || h) - sHeight) / 2;
    }

    this.ctx.save();
    this.ctx.beginPath();
    TextureBaker.traceShape(this.ctx, s.shape, startX, startY, targetW, targetH);
    this.ctx.closePath();

    // Clip image to geometric path
    this.ctx.save();
    this.ctx.clip();
    try {
      this.ctx.drawImage(img, sx, sy, sWidth, sHeight, startX, startY, targetW, targetH);
    } catch {
      this.ctx.fillStyle = '#111827';
      this.ctx.fillRect(startX, startY, targetW, targetH);
    }
    this.ctx.restore();

    // Optional border / outer stroke
    if (s.strokeWidth > 0) {
      this.ctx.strokeStyle = s.strokeColor || '#00f0ff';
      this.ctx.lineWidth = s.strokeWidth;
      TextureBaker.traceShape(this.ctx, s.shape, startX, startY, targetW, targetH);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * Traces geometric shapes onto a 2D canvas context.
   */
  static traceShape(ctx, shape, x, y, w, h) {
    ctx.beginPath();
    switch (shape) {
      case 'circle': {
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        break;
      }
      case 'rounded': {
        const r = Math.min(18, w * 0.2, h * 0.2);
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        break;
      }
      case 'hexagon': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          if (i === 0) ctx.moveTo(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
          else ctx.lineTo(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
        }
        break;
      }
      case 'octagon': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i + Math.PI / 8;
          if (i === 0) ctx.moveTo(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
          else ctx.lineTo(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
        }
        break;
      }
      case 'diamond': {
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h / 2);
        break;
      }
      case 'triangle': {
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        break;
      }
      case 'triangle-inv': {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w / 2, y + h);
        break;
      }
      case 'star': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const outerR = Math.min(w, h) / 2;
        const innerR = outerR * 0.45;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / 5;
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < 5; i++) {
          ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
          rot += step;
          ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
          rot += step;
        }
        break;
      }
      case 'rect':
      default: {
        ctx.rect(x, y, w, h);
        break;
      }
    }
  }

  /**
   * Generates high-fidelity artistic procedural fallback photos.
   */
  static generateArtPlaceholder(idx, w, h, sphereName = 'Esfera') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const p = PALETTES[idx % PALETTES.length];

    // Rich gradient background
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, p[0]);
    grad.addColorStop(0.5, p[1]);
    grad.addColorStop(1, p[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Glowing orbital halo
    g.fillStyle = 'rgba(255, 255, 255, 0.22)';
    g.beginPath();
    g.arc(w * 0.38, h * 0.35, Math.min(w, h) * 0.24, 0, Math.PI * 2);
    g.fill();

    // Cosmic curvature silhouette
    g.fillStyle = 'rgba(0, 0, 0, 0.38)';
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, h * 0.72);
    g.bezierCurveTo(w * 0.3, h * 0.52, w * 0.7, h * 0.82, w, h * 0.66);
    g.lineTo(w, h);
    g.fill();

    // High readability typography badge
    g.fillStyle = '#ffffff';
    g.font = 'bold 11px system-ui, -apple-system, sans-serif';
    g.shadowColor = 'rgba(0, 0, 0, 0.8)';
    g.shadowBlur = 4;
    g.fillText(`${p[3]} #${idx + 1}`, 10, h - 10);
    g.shadowBlur = 0;

    const img = new Image();
    img.src = c.toDataURL();
    img.dataset.title = `${sphereName} - ${p[3]} #${idx + 1}`;
    return img;
  }

  /**
   * Disposes of canvas memory and GPU textures to prevent leaks.
   */
  dispose() {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    this.canvas.width = 1;
    this.canvas.height = 1;
  }
}
