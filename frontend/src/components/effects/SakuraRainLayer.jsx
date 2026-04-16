import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '../../styles/sakura-rain.css';

/** Alias để ESLint nhận diện biến dùng qua JSX. */
const Motion = motion;

const DEFAULT_PETAL_COUNT = 22;

function buildPetals(count) {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    return {
      id: i,
      left: (seed % 1000) / 10,
      size: 8 + (seed % 70) / 10,
      duration: 11 + (seed % 140) / 10,
      delay: (seed % 100) / 25,
      drift: ((seed % 2) * 2 - 1) * (18 + (seed % 40)),
      rotateEnd: 120 + (seed % 180),
      sway: 10 + (seed % 26),
    };
  });
}

function PetalBuoyant({ p }) {
  const startY = -(40 + (p.id % 14) * 48);
  const r0 = (p.id % 7) * 12;
  const r1 = r0 + 28 + (p.id % 50);
  const xLo = p.drift - p.sway;
  const xHi = p.drift + p.sway;
  const xDur = 2.6 + (p.id % 6) * 0.42;
  const rotDur = 3.2 + (p.id % 5) * 0.55;

  return (
    <Motion.span
      className="sakura-rain__petal sakura-rain__petal--buoyant"
      style={{
        left: `${p.left}%`,
        width: p.size,
        height: p.size * 1.05,
        top: '-6%',
        willChange: 'transform, opacity',
      }}
      initial={{
        y: startY,
        x: xLo + (xHi - xLo) * 0.35,
        rotate: r0,
        opacity: 0.36,
      }}
      animate={{
        y: 1280,
        x: [xLo, xHi, xLo],
        rotate: [r0, r1, r0],
        opacity: 0.42,
      }}
      transition={{
        y: {
          duration: p.duration * 1.12,
          repeat: Infinity,
          ease: 'linear',
          delay: p.delay,
        },
        x: {
          duration: xDur,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: p.delay * 0.4,
        },
        rotate: {
          duration: rotDur,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: p.delay * 0.25,
        },
        opacity: { duration: 0.6, ease: 'easeOut' },
      }}
    />
  );
}

function PetalLinear({ p }) {
  return (
    <Motion.span
      className="sakura-rain__petal"
      style={{
        left: `${p.left}%`,
        width: p.size,
        height: p.size * 1.05,
        top: '-6%',
        willChange: 'transform, opacity',
      }}
      initial={{
        y: -(40 + (p.id % 14) * 48),
        x: 0,
        rotate: (p.id % 7) * 12,
        opacity: 0.34,
      }}
      animate={{
        y: 1280,
        x: p.drift,
        rotate: p.rotateEnd,
        opacity: 0.4,
      }}
      transition={{
        duration: p.duration,
        delay: p.delay,
        repeat: Infinity,
        ease: 'linear',
        repeatDelay: 0,
      }}
    />
  );
}

/**
 * Nền cánh hoa rơi — animate transform/opacity, tôn trọng prefers-reduced-motion.
 * @param {{ petalCount?: number, buoyant?: boolean }} props
 * `buoyant`: dao động ngang / xoay nhẹ (bồng bềnh) kết hợp rơi chậm hơn.
 */
export function SakuraRainLayer({ petalCount = DEFAULT_PETAL_COUNT, buoyant = false }) {
  const reduceMotion = useReducedMotion();
  const petals = useMemo(() => buildPetals(petalCount), [petalCount]);

  if (reduceMotion) {
    return (
      <div className="sakura-rain sakura-rain--static" aria-hidden>
        {petals.slice(0, 6).map((p) => (
          <span
            key={p.id}
            className="sakura-rain__petal sakura-rain__petal--static"
            style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.05, top: `${8 + (p.id % 5) * 16}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="sakura-rain" aria-hidden>
      {petals.map((p) => (buoyant ? <PetalBuoyant key={p.id} p={p} /> : <PetalLinear key={p.id} p={p} />))}
    </div>
  );
}
