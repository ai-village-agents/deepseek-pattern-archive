import { WORLD_DIMENSIONS } from './world-zones.js';

export class NavigationController {
  constructor(canvas) {
    this.canvas = canvas;
    this.camera = {
      x: WORLD_DIMENSIONS.width / 2,
      y: WORLD_DIMENSIONS.height / 2,
      zoom: 0.8
    };
    this.velocity = { x: 0, y: 0 };
    this.keys = new Set();
    this.dragging = false;
    this.lastPointer = null;
    this.pinchStart = null;

    this.bindInputs();
  }

  bindInputs() {
    window.addEventListener('keydown', e => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.key.toLowerCase());
    });

    this.canvas.addEventListener('mousedown', e => {
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
      this.lastPointer = null;
    });
    window.addEventListener('mousemove', e => {
      if (!this.dragging || !this.lastPointer) return;
      const dx = (e.clientX - this.lastPointer.x) * -1 / this.camera.zoom;
      const dy = (e.clientY - this.lastPointer.y) * -1 / this.camera.zoom;
      this.camera.x = clamp(this.camera.x + dx, 0, WORLD_DIMENSIONS.width);
      this.camera.y = clamp(this.camera.y + dy, 0, WORLD_DIMENSIONS.height);
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.camera.zoom = clamp(this.camera.zoom + delta, 0.5, 1.8);
    }, { passive: false });

    // Touch controls: drag to pan, pinch to zoom
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        this.pinchStart = {
          distance: pinchDistance(e.touches),
          zoom: this.camera.zoom
        };
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.dragging = true;
        this.lastPointer = { x: touch.clientX, y: touch.clientY };
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.dragging = false;
      this.lastPointer = null;
      this.pinchStart = null;
    });

    this.canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && this.pinchStart) {
        const distance = pinchDistance(e.touches);
        const ratio = distance / this.pinchStart.distance;
        this.camera.zoom = clamp(this.pinchStart.zoom * ratio, 0.5, 1.8);
        return;
      }
      if (!this.dragging || !this.lastPointer) return;
      const touch = e.touches[0];
      const dx = (touch.clientX - this.lastPointer.x) * -1 / this.camera.zoom;
      const dy = (touch.clientY - this.lastPointer.y) * -1 / this.camera.zoom;
      this.camera.x = clamp(this.camera.x + dx, 0, WORLD_DIMENSIONS.width);
      this.camera.y = clamp(this.camera.y + dy, 0, WORLD_DIMENSIONS.height);
      this.lastPointer = { x: touch.clientX, y: touch.clientY };
    }, { passive: false });
  }

  update(dt) {
    const speed = 360;
    const acceleration = 1500;
    const friction = 0.86;
    let inputX = 0;
    let inputY = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) inputY -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) inputY += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) inputX -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) inputX += 1;

    if (inputX !== 0 || inputY !== 0) {
      const length = Math.hypot(inputX, inputY) || 1;
      inputX /= length;
      inputY /= length;
      this.velocity.x += inputX * acceleration * dt;
      this.velocity.y += inputY * acceleration * dt;
    } else {
      this.velocity.x *= friction;
      this.velocity.y *= friction;
    }

    this.velocity.x = clamp(this.velocity.x, -speed, speed);
    this.velocity.y = clamp(this.velocity.y, -speed, speed);

    this.camera.x = clamp(this.camera.x + this.velocity.x * dt, 0, WORLD_DIMENSIONS.width);
    this.camera.y = clamp(this.camera.y + this.velocity.y * dt, 0, WORLD_DIMENSIONS.height);
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pinchDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
