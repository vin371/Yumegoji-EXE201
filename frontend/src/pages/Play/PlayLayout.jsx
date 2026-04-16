import { AnimatePresence, motion as motionFr, useReducedMotion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import '../../styles/pages/play-games.css';
import PlayExpBar from './PlayExpBar';

const Motion = motionFr;

const PLAY_HUBISH = new Set(['guide', 'daily', 'pvp', 'leaderboard', 'achievements', 'shop']);

function showSessionExpBar(pathname) {
  const norm = pathname.replace(/\/+$/, '') || '/';
  if (norm === '/play') return false;
  const parts = norm.split('/').filter(Boolean);
  if (parts[0] !== 'play' || parts.length < 2) return false;
  return !PLAY_HUBISH.has(parts[1]);
}

export default function PlayLayout() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const hubHome = /^\/play\/?$/.test(pathname);
  const showExp = showSessionExpBar(pathname);

  return (
    <div
      className={`page page-play yume-page play-layout${hubHome ? ' play-layout--hub' : ''}${showExp ? ' play-layout--session' : ''}`}
    >
      {showExp ? <PlayExpBar /> : null}
      <AnimatePresence mode="wait" initial={false}>
        <Motion.div
          key={pathname}
          className="play-layout__outlet"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
          transition={{
            duration: reduceMotion ? 0.05 : 0.28,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Outlet />
        </Motion.div>
      </AnimatePresence>
    </div>
  );
}
