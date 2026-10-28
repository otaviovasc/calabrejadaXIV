const COLORS = ['#ff4b91', '#ff7d32', '#38e1d2', '#ffe66a', '#fff4d6'];
const MAX_PARTICLES = 96;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export class GameEffects {
  constructor({ reducedMotion = false } = {}) {
    this.reducedMotion = reducedMotion;
    this.particles = [];
    this.celebrationRemaining = 0;
    this.celebrationDuration = 2.5;
  }

  reset() {
    this.particles.length = 0;
    this.celebrationRemaining = 0;
  }

  add(particle) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(particle);
  }

  landing(x, lane, kind) {
    if (this.reducedMotion) return;
    const water = kind === 'water';
    const count = water ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const life = randomBetween(.3, water ? .58 : .42);
      this.add({
        kind: water ? 'splash' : 'dust',
        x, lane,
        ox: randomBetween(-8, 8),
        oy: randomBetween(-2, 2),
        vx: randomBetween(water ? -48 : -31, water ? 48 : 31),
        vy: randomBetween(water ? -105 : -48, water ? -54 : -22),
        gravity: water ? 210 : 95,
        size: randomBetween(water ? 1.7 : 2.2, water ? 3.4 : 4.4),
        color: water ? (i % 2 ? '#b1f1e3' : '#74dedb') : (i % 2 ? '#f1c5aa' : '#c99c84'),
        life,
        maxLife: life
      });
    }
    if (water) {
      this.add({ kind: 'ripple', x, lane, ox: 0, oy: 1, life: .5, maxLife: .5, size: 5 });
    }
  }

  celebrate() {
    this.celebrationRemaining = this.celebrationDuration;
    this.particles = this.particles.filter(particle => particle.kind !== 'confetti');
    if (this.reducedMotion) return;
    for (let i = 0; i < 40; i++) {
      const life = randomBetween(1.4, 2.35);
      this.add({
        kind: 'confetti',
        sx: randomBetween(18, 342),
        sy: randomBetween(35, 105),
        vx: randomBetween(-24, 24),
        vy: randomBetween(12, 62),
        spin: randomBetween(-8, 8),
        rotation: randomBetween(0, Math.PI * 2),
        size: randomBetween(3, 6),
        color: COLORS[i % COLORS.length],
        life,
        maxLife: life
      });
    }
  }

  update(delta) {
    this.celebrationRemaining = Math.max(0, this.celebrationRemaining - delta);
    for (const particle of this.particles) {
      particle.life -= delta;
      if (particle.kind === 'confetti') {
        particle.sx += particle.vx * delta;
        particle.sy += particle.vy * delta;
        particle.vy += 34 * delta;
        particle.rotation += particle.spin * delta;
        // Keep the celebration above the player's normal play area.
        if (particle.sy > 285) particle.life = 0;
      } else if (particle.kind !== 'ripple') {
        particle.ox += particle.vx * delta;
        particle.oy += particle.vy * delta;
        particle.vy += particle.gravity * delta;
      }
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
  }

  drawWorld(ctx, project, progress) {
    for (const particle of this.particles) {
      if (particle.kind === 'confetti') continue;
      const point = project(particle.x, particle.lane, progress);
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (particle.kind === 'ripple') {
        const growth = 1 - alpha;
        ctx.strokeStyle = '#b1f1e3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(point.x, point.y + particle.oy, particle.size + growth * 18,
          2 + growth * 5, .2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(point.x + particle.ox, point.y + particle.oy, particle.size * alpha,
          0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawCelebration(ctx) {
    if (this.celebrationRemaining <= 0) return;
    const elapsed = this.celebrationDuration - this.celebrationRemaining;
    const fadeIn = Math.min(1, elapsed / .18);
    const fadeOut = Math.min(1, this.celebrationRemaining / .35);
    const alpha = Math.min(fadeIn, fadeOut);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const particle of this.particles) {
      if (particle.kind !== 'confetti') continue;
      const particleAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * particleAlpha;
      ctx.fillStyle = particle.color;
      ctx.translate(particle.sx, particle.sy);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size / 2, -particle.size, particle.size, particle.size * 2);
      ctx.restore();
    }
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(elapsed * 10) * .025;
    ctx.translate(180, 0);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#17102ce8';
    ctx.strokeStyle = '#38e1d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-139, 26, 278, 70, 15);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe66a';
    ctx.font = '900 25px sans-serif';
    ctx.fillText('16 ITENS!', 0, 57);
    ctx.fillStyle = '#fff4d6';
    ctx.font = '700 9px sans-serif';
    ctx.fillText('META ALCANÇADA · A FESTA CONTINUA', 0, 78);
    ctx.restore();
  }
}
