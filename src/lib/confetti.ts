// Blue + white (Lightspeed palette) confetti burst. Self-contained canvas
// animation — no dependency. Call fireConfetti() to celebrate a completion.
export function fireConfetti() {
  if (typeof document === 'undefined') return;
  const colors = ['#4FA9D6', '#2E89B8', '#EAF4FA', '#FFFFFF'];
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  const parts = Array.from({ length: 180 }).map(() => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.7,
    y: -20 - Math.random() * canvas.height * 0.3,
    vx: (Math.random() - 0.5) * 7,
    vy: 2 + Math.random() * 4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frame = 0;
  const tick = () => {
    frame += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (frame < 170) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
