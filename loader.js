// JIAXIN Design Studios — Loading Screen
// Comet / shooting-star animation inspired by the reference image

(function () {
  const overlay = document.getElementById('loaderOverlay');
  if (!overlay) return;

  const canvas = document.getElementById('loaderCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, comets = [], lastBurst = 0;
  const START = performance.now();
  const HOLD  = 2200;   // ms before fade starts
  const FADE  = 700;    // ms fade duration

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  // Comet ---------------------------------------------------------------
  class Comet {
    constructor() { this.reset(); }
    reset() {
      const cx = W * 0.5, cy = H * 0.5;
      const angle = Math.random() * Math.PI * 2;
      const r0    = 30 + Math.random() * 70;
      this.x  = cx + Math.cos(angle) * r0;
      this.y  = cy + Math.sin(angle) * r0;
      this.speed = 5 + Math.random() * 7;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.accel = 1.025 + Math.random() * 0.02;
      this.w   = 0.8 + Math.random() * 2;
      this.hue = [280, 300, 190, 210, 330][Math.floor(Math.random() * 5)]; // purple/pink/teal
      this.trail = [];
      this.alive = true;
    }
    update() {
      this.trail.unshift({ x: this.x, y: this.y });
      if (this.trail.length > 28) this.trail.pop();
      this.vx *= this.accel; this.vy *= this.accel;
      this.x += this.vx; this.y += this.vy;
      if (this.x < -400 || this.x > W + 400 || this.y < -400 || this.y > H + 400) this.alive = false;
    }
    draw() {
      if (this.trail.length < 2) return;
      const tail = this.trail[this.trail.length - 1];
      const grd = ctx.createLinearGradient(tail.x, tail.y, this.x, this.y);
      grd.addColorStop(0,   `hsla(${this.hue},100%,70%,0)`);
      grd.addColorStop(0.5, `hsla(${this.hue},100%,78%,0.55)`);
      grd.addColorStop(1,   `hsla(${this.hue},100%,92%,1)`);

      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      for (const p of this.trail) ctx.lineTo(p.x, p.y);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = grd;
      ctx.lineWidth   = this.w;
      ctx.shadowColor = `hsl(${this.hue},100%,70%)`;
      ctx.shadowBlur  = 10;
      ctx.stroke();

      // bright head
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.w + 1.5, 0, Math.PI * 2);
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = `hsl(${this.hue},100%,80%)`;
      ctx.shadowBlur  = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // 4-pointed center star -----------------------------------------------
  function drawStar(t) {
    const cx = W * 0.5, cy = H * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.5);

    const s = 26 + Math.sin(t * 2.8) * 5;

    // Main 4 points
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(4, -4, s, 0);
    ctx.quadraticCurveTo(4,  4, 0, s);
    ctx.quadraticCurveTo(-4, 4, -s, 0);
    ctx.quadraticCurveTo(-4, -4, 0, -s);
    ctx.closePath();
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.3, '#aaeeff');
    grd.addColorStop(1, 'rgba(0,120,255,0)');
    ctx.fillStyle   = grd;
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur  = 45;
    ctx.fill();

    // Diagonal 4 points (rotated 45°)
    ctx.rotate(Math.PI / 4);
    const d = s * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -d);
    ctx.quadraticCurveTo(2.5, -2.5, d, 0);
    ctx.quadraticCurveTo(2.5,  2.5, 0, d);
    ctx.quadraticCurveTo(-2.5, 2.5, -d, 0);
    ctx.quadraticCurveTo(-2.5, -2.5, 0, -d);
    ctx.closePath();
    const grd2 = ctx.createRadialGradient(0, 0, 0, 0, 0, d);
    grd2.addColorStop(0, 'rgba(255,255,255,0.7)');
    grd2.addColorStop(1, 'rgba(100,200,255,0)');
    ctx.fillStyle   = grd2;
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur  = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function spawnBurst() {
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) comets.push(new Comet());
  }
  spawnBurst();

  function animate(now) {
    const elapsed = now - START;
    const t = elapsed / 1000;

    ctx.clearRect(0, 0, W, H);

    if (now - lastBurst > 280) { spawnBurst(); lastBurst = now; }

    comets = comets.filter(c => c.alive);
    comets.forEach(c => { c.update(); c.draw(); });

    drawStar(t);

    if (elapsed > HOLD) {
      const progress = Math.min(1, (elapsed - HOLD) / FADE);
      overlay.style.opacity = String(1 - progress);
      if (progress >= 1) { overlay.style.display = 'none'; return; }
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
