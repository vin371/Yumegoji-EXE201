import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/** Alias để ESLint nhận diện biến dùng qua JSX. */
const Motion = motion;

/**
 * Hai ảnh luân phiên với hiệu ứng trượt nhẹ — tôn trọng prefers-reduced-motion.
 */
export function LearnImageCarousel({ urls, intervalMs = 5200, className = '', ...rest }) {
  const reduceMotion = useReducedMotion();
  const safe = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || safe.length < 2) return undefined;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % safe.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [safe.length, intervalMs, reduceMotion]);

  const rootClass = ['learn-image-carousel', className].filter(Boolean).join(' ');

  if (safe.length === 0) return null;

  if (safe.length === 1 || reduceMotion) {
    return (
      <div className={rootClass} {...rest}>
        <img className="learn-image-carousel__img learn-image-carousel__img--static" src={safe[0]} alt="" loading="lazy" />
      </div>
    );
  }

  const src = safe[index];

  return (
    <div className={rootClass} {...rest}>
      <AnimatePresence mode="wait" initial={false}>
        <Motion.img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className="learn-image-carousel__img learn-image-carousel__img--slide"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
    </div>
  );
}
