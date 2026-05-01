import { useEffect, useRef } from 'react';

/**
 * Khi cuộn vào viewport: fade-in + trượt nhẹ lên (IntersectionObserver).
 * Tôn trọng prefers-reduced-motion.
 */
export default function ScrollReveal({ as = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('learn-scroll-reveal--visible');
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('learn-scroll-reveal--visible');
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -7% 0px', threshold: 0.06 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      el.classList.remove('learn-scroll-reveal--visible');
    };
  }, []);

  const merged = ['learn-scroll-reveal', className].filter(Boolean).join(' ');
  return (
    <Tag ref={ref} className={merged} {...rest}>
      {children}
    </Tag>
  );
}
