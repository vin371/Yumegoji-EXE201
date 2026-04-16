/** Tiến độ EXP / rank — dùng chung PlayExpBar & UI trò chơi. */

export const PLAY_EXP_TIERS = [
  { label: 'Bronze', minExp: 0 },
  { label: 'Silver', minExp: 5000 },
  { label: 'Gold', minExp: 15000 },
  { label: 'Platinum', minExp: 30000 },
];

/**
 * @param {number} exp
 * @returns {{ pct: number, line: string, sub: string, rankLabel: string, nextRankLabel: string | null }}
 */
export function playExpTierProgress(exp) {
  const e = Math.max(0, Number(exp) || 0);
  const TIERS = PLAY_EXP_TIERS;
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i -= 1) {
    if (e >= TIERS[i].minExp) {
      idx = i;
      break;
    }
  }
  const cur = TIERS[idx];
  const next = TIERS[idx + 1];
  if (!next) {
    return {
      pct: 100,
      line: `${e.toLocaleString('vi-VN')} XP`,
      sub: cur.label,
      rankLabel: cur.label,
      nextRankLabel: null,
    };
  }
  const span = next.minExp - cur.minExp;
  const pct = Math.min(100, Math.round(((e - cur.minExp) / span) * 100));
  return {
    pct,
    line: `${e.toLocaleString('vi-VN')} / ${next.minExp.toLocaleString('vi-VN')} XP`,
    sub: `${cur.label} → ${next.label}`,
    rankLabel: cur.label,
    nextRankLabel: next.label,
  };
}
