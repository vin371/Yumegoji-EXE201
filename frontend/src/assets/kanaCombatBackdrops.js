/**
 * Nền chiến đấu Hiragana/Katakana — scene_1…4, random mỗi phiên (bộ phong cảnh ảnh 3–6).
 */
import scene1 from './scene_1.png';
import scene2 from './scene_2.png';
import scene3 from './scene_3.png';
import scene4 from './scene_4.png';

export const KANA_COMBAT_BACKDROPS = [scene1, scene2, scene3, scene4];

export function pickRandomKanaCombatBackdrop() {
  const arr = KANA_COMBAT_BACKDROPS;
  return arr[Math.floor(Math.random() * arr.length)];
}
