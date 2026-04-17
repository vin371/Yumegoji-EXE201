import { useMemo } from 'react';

/**
 * Lớp nền cánh hoa anh đào — trang trí, không ảnh hưởng tương tác (pointer-events: none).
 */
export function SakuraRain({ className = '' }) {
  const petals = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: `${((i * 17) % 97) + (i % 3) * 0.8}%`,
        delay: ((i * 0.31) % 10) + (i % 4) * 0.2,
        duration: 9 + (i % 6) * 1.4,
        size: 5 + (i % 5) * 2.5,
        rot: (i * 47) % 360,
      })),
    [],
  );

  return (
    <div className={`mod-import-sakura ${className}`.trim()} aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="mod-import-sakura__petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.15,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
