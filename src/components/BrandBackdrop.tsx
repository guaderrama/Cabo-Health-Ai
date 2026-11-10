import React, { useEffect, useRef } from 'react';

/**
 * Fondo de marca inspirado en el hero de cabohealth.org: una constelación de partículas
 * que flota despacio, unida por líneas muy tenues, sobre brumas de color que se desplazan.
 *
 * - Decorativo: aria-hidden y sin eventos de puntero.
 * - Se pausa si la pestaña está oculta o el fondo sale de la pantalla.
 * - Con "reducir movimiento" se dibuja una sola vez, quieta.
 */

interface BrandBackdropProps {
  /** "full" para pantallas de entrada; "soft" detrás de contenido con texto. */
  density?: 'full' | 'soft';
  className?: string;
}

interface Node {
  x: number;
  y: number;
  vx: number; // px por segundo
  vy: number;
  r: number;
  big: boolean;
  color: string; // "r,g,b"
  depth: number;
  phase: number;
  dx: number;
  dy: number;
}

const DEEP = '10,77,104';
const SEA = '79,119,133';
const BRONZE = '184,149,106';

const BrandBackdrop: React.FC<BrandBackdropProps> = ({ density = 'full', className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let linkDistance = 130;
    let nodes: Node[] = [];
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;
    let onScreen = true;
    // Paralaje suave con el mouse (solo computadoras)
    let mx = 0.5;
    let my = 0.4;
    let targetX = 0.5;
    let targetY = 0.4;

    const seed = () => {
      const area = width * height;
      const [divisor, min, max] = density === 'full' ? [17000, 22, 80] : [26000, 14, 44];
      const count = Math.round(Math.min(max, Math.max(min, area / divisor)));
      linkDistance = Math.min(130, Math.max(90, width * 0.28));
      nodes = Array.from({ length: count }, (_, i) => {
        const roll = Math.random();
        let r: number;
        let big = false;
        if (roll < 0.5) r = 1 + Math.random() * 1.2; // polvo fino
        else if (roll < 0.82) r = 2.2 + Math.random() * 1.4; // medianas
        else if (roll < 0.95) r = 3.6 + Math.random() * 1.4; // grandes
        else {
          r = 5.2 + Math.random() * 2.2; // esferas sueltas, sin líneas
          big = true;
        }
        const speed = 6 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r,
          big,
          color: i % 5 === 0 ? BRONZE : i % 2 ? SEA : DEEP,
          depth: 0.35 + Math.random() * 0.65,
          phase: Math.random() * Math.PI * 2,
          dx: 0,
          dy: 0,
        };
      });
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reducedMotion) draw(0);
    };

    const draw = (dt: number) => {
      elapsed += dt;
      mx += (targetX - mx) * 0.045;
      my += (targetY - my) * 0.045;
      const px = (mx - 0.5) * 26;
      const py = (my - 0.5) * 16;
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < -20) n.x = width + 20;
        else if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        else if (n.y > height + 20) n.y = -20;
        n.dx = n.x + px * n.depth;
        n.dy = n.y + py * n.depth;
      }

      // Líneas entre partículas cercanas: más tenues cuanto más lejos
      ctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        if (a.big) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!;
          if (b.big) continue;
          const ddx = a.dx - b.dx;
          const ddy = a.dy - b.dy;
          if (Math.abs(ddx) > linkDistance || Math.abs(ddy) > linkDistance) continue;
          const d = Math.hypot(ddx, ddy);
          if (d < linkDistance) {
            ctx.strokeStyle = `rgba(${DEEP},${((1 - d / linkDistance) * 0.16).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.dx, a.dy);
            ctx.lineTo(b.dx, b.dy);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const alpha = 0.5 + 0.22 * Math.sin(elapsed * 1.3 + n.phase);
        if (n.big) {
          ctx.fillStyle = `rgba(${n.color},${(alpha * 0.18).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(n.dx, n.dy, n.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(${n.color},${(alpha * 0.55).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(${n.color},${(alpha * 0.85).toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(n.dx, n.dy, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (time: number) => {
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      draw(dt);
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reducedMotion || rafId || !onScreen || document.hidden) return;
      lastTime = 0;
      rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = !!entry?.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    intersection.observe(container);
    const handleVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', handleVisibility);
    const handlePointer = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / Math.max(rect.width, 1);
      targetY = (e.clientY - rect.top) / Math.max(rect.height, 1);
    };
    if (finePointer && !reducedMotion) window.addEventListener('pointermove', handlePointer, { passive: true });

    resize();
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointermove', handlePointer);
    };
  }, [density]);

  const soft = density === 'soft';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        background:
          'radial-gradient(130% 90% at 50% -10%, #E8F4F8 0%, rgba(232,244,248,0.45) 45%, rgba(232,244,248,0) 72%), linear-gradient(180deg, #F0F7FA 0%, #FAFAF7 78%)',
      }}
    >
      {/* Brumas que se desplazan despacio */}
      <i
        className="absolute -left-[15%] -top-[20%] h-[70%] w-[70%] animate-orb-drift-a rounded-full blur-[64px] motion-reduce:animate-none"
        style={{ background: 'radial-gradient(circle, rgba(136,176,188,0.38), rgba(136,176,188,0) 66%)' }}
      />
      <i
        className="absolute -bottom-[25%] -right-[15%] h-[70%] w-[70%] animate-orb-drift-b rounded-full blur-[64px] motion-reduce:animate-none"
        style={{ background: 'radial-gradient(circle, rgba(184,149,106,0.2), rgba(184,149,106,0) 66%)' }}
      />
      <i
        className="absolute left-[35%] top-[30%] h-[50%] w-[50%] animate-orb-drift-c rounded-full blur-[64px] motion-reduce:animate-none"
        style={{ background: 'radial-gradient(circle, rgba(10,77,104,0.13), rgba(10,77,104,0) 66%)' }}
      />
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${soft ? 'opacity-70' : ''}`} />
    </div>
  );
};

export default React.memo(BrandBackdrop);
