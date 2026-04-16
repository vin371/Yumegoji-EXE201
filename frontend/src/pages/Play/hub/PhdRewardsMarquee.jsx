import { useMemo, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';

/**
 * Hàng phần thưởng: marquee vòng lặp (2 bản copy), không scrollbar;
 * dừng khi hover / prefers-reduced-motion.
 */
export function PhdRewardsMarquee({ items, renderCard }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const run = !reduce && !paused;

  const track = useMemo(() => [...items, ...items], [items]);

  return (
    <div
      className="phd-rewards-marquee"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Motion.div
        className="phd-rewards-track"
        animate={run ? { x: ['0%', '-50%'] } : { x: 0 }}
        transition={
          run
            ? { duration: 36, repeat: Infinity, ease: 'linear', repeatType: 'loop' }
            : { duration: 0.35 }
        }
      >
        {track.map((item, i) => (
          <div key={`${item.title}-${i}`} className="phd-rewards-track__cell">
            {renderCard(item, i % items.length)}
          </div>
        ))}
      </Motion.div>
    </div>
  );
}
