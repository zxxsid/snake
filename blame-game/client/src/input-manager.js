export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.tapCallbacks = [];
    const handle = (e) => {
      if (e.preventDefault) e.preventDefault();
      const t = (e.changedTouches && e.changedTouches[0]) || e;
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: canvas.width, height: canvas.height };
      const sx = ((t.clientX || t.pageX || 0) - rect.left) * (canvas.width / (rect.width || canvas.width));
      const sy = ((t.clientY || t.pageY || 0) - rect.top) * (canvas.height / (rect.height || canvas.height));
      this.tapCallbacks.forEach(cb => cb(sx, sy));
    };
    canvas.addEventListener('touchend', handle, { passive: false });
    canvas.addEventListener('click', handle);
  }
  onTap(cb) { this.tapCallbacks.push(cb); }
  clearTaps() { this.tapCallbacks = []; }
}
