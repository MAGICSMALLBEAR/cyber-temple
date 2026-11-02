// smoke.js - Canvas 2D Incense Smoke Particle System
// 模擬香煙裊裊、隨風搖曳、微光明滅的自然物理動態

class IncenseSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.isLit = false;
    this.particles = [];
    this.burnProgress = 0; // 0 (全新) -> 1 (燒盡)
    this.burnDuration = 180; // 3分鐘燒完一輪
    this.lastTime = performance.now();

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 300;
    const h = rect.height > 0 ? rect.height : 260;
    this.canvas.width = w * (window.devicePixelRatio || 1);
    this.canvas.height = h * (window.devicePixelRatio || 1);
    this.scale = window.devicePixelRatio || 1;
  }

  light() {
    this.isLit = true;
    this.burnProgress = 0;
  }

  extinguish() {
    this.isLit = false;
  }

  // 取得三炷香的香頭在 Canvas 上的座標 (像素)
  getEmberPoints() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w / 2;
    // 線香燃燒時香頭慢慢向下移
    const fullHeight = h * 0.45;
    const baseBottom = h * 0.88;
    const stickLength = fullHeight * (1 - this.burnProgress * 0.65);
    const topY = baseBottom - stickLength;

    const spacing = 18 * this.scale;
    return [
      { x: centerX - spacing, y: topY + 4 * this.scale, angle: -0.06 }, // 左
      { x: centerX, y: topY, angle: 0 },                                // 中
      { x: centerX + spacing, y: topY + 4 * this.scale, angle: 0.06 }   // 右
    ];
  }

  spawnParticle(point) {
    // 稍微帶點橫向隨機擴散與左右擺動初速度
    this.particles.push({
      x: point.x + (Math.random() - 0.5) * 3 * this.scale,
      y: point.y,
      vx: (Math.random() - 0.5) * 0.4 * this.scale + point.angle * 8,
      vy: -(0.9 + Math.random() * 0.7) * this.scale,
      size: (3.5 + Math.random() * 2.5) * this.scale,
      maxSize: (28 + Math.random() * 18) * this.scale,
      alpha: 0.55 + Math.random() * 0.2,
      maxLife: 140 + Math.random() * 60,
      life: 0,
      turbOffset: Math.random() * 100
    });
  }

  update(dt) {
    if (this.isLit) {
      // 推進燃燒進度
      this.burnProgress += dt / this.burnDuration;
      if (this.burnProgress >= 1) {
        this.burnProgress = 1;
      }

      // 產生煙霧粒子
      const embers = this.getEmberPoints();
      embers.forEach(pt => {
        if (Math.random() < 0.65) {
          this.spawnParticle(pt);
        }
      });
    }

    // 更新現有粒子
    const now = performance.now() * 0.001;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;

      // 模擬環境輕微對流/亂流 (Perlin-like sinusoidal sway)
      const sway = Math.sin(now * 2 + p.turbOffset + p.y * 0.02) * 0.45 * this.scale;
      p.vx += sway * 0.05;
      p.vx *= 0.98; // 阻尼
      p.x += p.vx;
      p.y += p.vy;

      // 隨上升膨脹與淡出
      const progress = p.life / p.maxLife;
      p.currentSize = p.size + (p.maxSize - p.size) * Math.pow(progress, 0.7);
      p.currentAlpha = p.alpha * Math.sin(progress * Math.PI); // 先亮後淡

      if (p.life >= p.maxLife || p.currentAlpha <= 0.005) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w / 2;
    const baseBottom = h * 0.88;
    const fullHeight = h * 0.45;
    const stickLength = fullHeight * (1 - this.burnProgress * 0.65);
    const embers = this.getEmberPoints();

    // 1. 繪製三炷線香本體 (香身為傳統赤褐色/金香)
    embers.forEach((pt, idx) => {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.strokeStyle = '#8B2500'; // 赭紅香身
      this.ctx.lineWidth = 3.2 * this.scale;
      this.ctx.lineCap = 'round';

      // 香底
      const bottomX = centerX + (idx - 1) * 12 * this.scale;
      this.ctx.moveTo(bottomX, baseBottom);
      this.ctx.lineTo(pt.x, pt.y);
      this.ctx.stroke();

      // 2. 如果點燃，繪製香頭微紅火光 (Ember)
      if (this.isLit) {
        const pulse = 0.75 + Math.sin(performance.now() * 0.008 + idx) * 0.25;
        // 外層火紅光暈
        const grad = this.ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 8 * this.scale);
        grad.addColorStop(0, `rgba(255, 120, 20, ${0.9 * pulse})`);
        grad.addColorStop(0.3, `rgba(255, 60, 0, ${0.5 * pulse})`);
        grad.addColorStop(1, 'rgba(255, 30, 0, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 8 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();

        // 核心白亮火點
        this.ctx.fillStyle = `rgba(255, 240, 200, ${0.95 * pulse})`;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 1.8 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // 3. 繪製煙霧粒子 (柔和淡雅香煙)
    this.particles.forEach(p => {
      this.ctx.save();
      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.currentSize);
      grad.addColorStop(0, `rgba(240, 240, 245, ${p.currentAlpha * 0.7})`);
      grad.addColorStop(0.5, `rgba(210, 215, 230, ${p.currentAlpha * 0.35})`);
      grad.addColorStop(1, 'rgba(200, 200, 210, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.currentSize, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  loop() {
    const now = performance.now();
    const dt = (now - this.lastTime) * 0.001;
    this.lastTime = now;

    this.update(dt);
    this.draw();

    requestAnimationFrame(() => this.loop());
  }
}

window.IncenseSystem = IncenseSystem;
