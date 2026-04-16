import { SakuraRainLayer } from '../effects/SakuraRainLayer';
import { PLAY_SETUP_BG } from './playSetupMotion';

/**
 * Vỏ nền setup trò chơi — Sakura + ảnh zen nhạt (CSS).
 * Trang con bọc `Motion.div` (variants parent) ngay bên trong `children`.
 */
export function PlayGameSetupPro({ children }) {
  return (
    <div className="play-setup-pro" style={{ '--play-setup-zen-bg': `url("${PLAY_SETUP_BG}")` }}>
      <div className="play-setup-pro__sakura" aria-hidden>
        <SakuraRainLayer petalCount={22} buoyant />
      </div>
      <div className="play-setup-pro__zenwash" aria-hidden />
      {children}
    </div>
  );
}
