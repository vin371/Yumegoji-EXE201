/**
 * Sprite combat Hiragana/Katakana — ninja_part_1..3 & ghost_part_1..3 (Vite hash URL).
 */
import ninjaPart1 from './ninja_part_1.png';
import ninjaPart2 from './ninja_part_2.png';
import ninjaPart3 from './ninja_part_3.png';
import ghostPart1 from './ghost_part_1.png';
import ghostPart2 from './ghost_part_2.png';
import ghostPart3 from './ghost_part_3.png';

export const KANA_NINJA_SPRITES = [ninjaPart1, ninjaPart2, ninjaPart3];
export const KANA_GHOST_SPRITES = [ghostPart1, ghostPart2, ghostPart3];

export function pickRandomKanaCombatSprites() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return { ninjaSrc: pick(KANA_NINJA_SPRITES), ghostSrc: pick(KANA_GHOST_SPRITES) };
}
