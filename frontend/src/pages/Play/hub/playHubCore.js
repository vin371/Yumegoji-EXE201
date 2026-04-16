/**
 * Dữ liệu tĩnh + hàm thuần cho màn Play hub — tách khỏi component để dễ đọc.
 */
import {
  artBadgeCyanHolo,
  artBadgeNeonPink,
  artBossBattle,
  artCardFlashcardVocab,
  artCardHiragana,
  artCardKatakana,
  artCardMultipleChoice,
  artDailyChallenge,
  artKanjiMemoryStones,
  artKanjiPuzzle,
  artPowerup5050,
  artPowerupDouble,
  artPowerupHeart,
  artPowerupSkip,
  artPowerupTimeFreeze,
  artPvpSamurai,
  artSentenceBuilder,
  artVocabSpeed,
} from '../../../assets/play';

export const STATIC_FALLBACK = [
  {
    slug: 'hiragana-match',
    name: 'Hiragana Match',
    description: 'Chọn đúng romaji cho chữ Hiragana (mỗi câu 10 giây).',
    skillType: 'hiragana',
    levelMin: 'N5',
    levelMax: 'N5',
    sortOrder: 1,
  },
  {
    slug: 'katakana-match',
    name: 'Katakana Match',
    description: 'Tương tự Hiragana — chọn romaji đúng cho Katakana (10 giây/câu).',
    skillType: 'katakana',
    levelMin: 'N5',
    levelMax: 'N5',
    sortOrder: 2,
  },
  {
    slug: 'kanji-memory',
    name: 'Kanji Memory',
    description: 'Lật thẻ ghép Kanji (hoặc từ) với nghĩa tiếng Việt — memory game.',
    skillType: 'kanji',
    levelMin: 'N5',
    levelMax: 'N5',
    sortOrder: 3,
  },
  {
    slug: 'vocabulary-speed-quiz',
    name: 'Vocabulary Speed Quiz',
    description: 'Quiz từ vựng phản xạ nhanh (8 giây mỗi câu).',
    skillType: 'vocabulary',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 4,
  },
  {
    slug: 'sentence-builder',
    name: 'Sentence Builder',
    description: 'Sắp xếp các từ tiếng Nhật thành câu hoàn chỉnh.',
    skillType: 'grammar',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 5,
  },
  {
    slug: 'counter-quest',
    name: 'Counter Quest',
    description: 'Chọn cách đếm đúng với trợ từ đếm (〜人、〜枚、〜本…).',
    skillType: 'counters',
    levelMin: 'N5',
    levelMax: 'N4',
    sortOrder: 6,
  },
  {
    slug: 'flashcard-vocabulary',
    name: 'Flashcard Battle',
    description: 'Đấu tốc độ với Bot AI (bot trả lời đúng ~70% số vòng).',
    skillType: 'vocabulary',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 7,
  },
  {
    slug: 'boss-battle',
    name: 'Boss Battle',
    description: 'Đánh Boss bằng kiến thức — có thanh HP Boss và thanh “Bạn” (theo mạng).',
    skillType: 'mixed',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 8,
    isBossMode: true,
  },
  {
    slug: 'daily-challenge',
    name: 'Daily Challenge',
    description: 'Mix 15 câu hỏi từ nhiều chủ đề — thử thách mỗi ngày.',
    skillType: 'mixed',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 9,
  },
];

export const HUB_HIDDEN_GAME_SLUGS = new Set(['fill-in-blank', 'fill-blank']);

export const HUB_STATIC_META_BY_SLUG = Object.fromEntries(
  STATIC_FALLBACK.map((row) => [
    row.slug,
    {
      name: row.name,
      description: row.description,
      skillType: row.skillType,
      levelMin: row.levelMin,
      levelMax: row.levelMax,
      sortOrder: row.sortOrder,
      isBossMode: row.isBossMode,
    },
  ]),
);

export const RANK_TIERS = [
  { label: 'Bronze', minExp: 0 },
  { label: 'Silver', minExp: 5000 },
  { label: 'Gold', minExp: 15000 },
  { label: 'Platinum', minExp: 30000 },
];

export const POWERUP_ROWS = [
  {
    slug: 'fifty-fifty',
    label: '50:50',
    desc: 'Loại bỏ 2 đáp án sai',
    img: artPowerup5050,
    hint: 'Dùng trong phiên game (API)',
  },
  {
    slug: 'time-freeze',
    label: 'Time Freeze',
    desc: 'Mỗi lần dùng: +5 giây cho đồng hồ câu hiện tại',
    img: artPowerupTimeFreeze,
    hint: null,
  },
  {
    slug: 'double-points',
    label: 'Double Points',
    desc: 'Nhân đôi điểm câu đúng kế tiếp',
    img: artPowerupDouble,
    hint: null,
  },
  {
    slug: 'skip',
    label: 'Skip',
    desc: 'Bỏ qua câu (không mất mạng)',
    img: artPowerupSkip,
    hint: null,
  },
  {
    slug: 'heart',
    label: 'Heart',
    desc: 'Hồi phục 1 mạng',
    img: artPowerupHeart,
    hint: null,
  },
];

export const REWARD_CARDS = [
  { icon: '💎', title: 'EXP points', desc: 'Lên level tài khoản' },
  { icon: '🪙', title: 'Xu trong game', desc: 'Đổi vật phẩm, power-ups' },
  { icon: '🏅', title: 'Huy hiệu', desc: 'Trang trí profile' },
  { icon: '🎀', title: 'Danh hiệu', desc: 'Hiển thị bên cạnh tên' },
  { icon: '🎨', title: 'Sticker độc quyền', desc: 'Dùng trong chat' },
  { icon: '👑', title: 'Premium miễn phí', desc: 'Ngày dùng thử Premium' },
  { icon: '🖼️', title: 'Khung avatar', desc: 'Khung avatar đặc biệt' },
];

export function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/**
 * Khớp chuẩn hoá slug với SQL GetInventory (GameService):
 * LOWER + TRIM + '_' → '-' + bỏ mọi khoảng trắng.
 * Dùng khi đối chiếu slug từ API với slug cố định trên UI (POWERUP_ROWS).
 */
export function normalizePowerUpSlugFromApi(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '');
}

/** Định dạng số nguyên kiểu VN (1.234) — không dùng Intl để tránh ESLint/Codacy báo `Intl` not defined. */
export function formatIntVi(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const v = Math.round(Math.abs(x));
  const signed = x < 0 ? '-' : '';
  const s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return signed + s;
}

export function normalizeGameRow(g) {
  const slug = pick(g, 'slug', 'Slug');
  if (!slug) return null;
  const sm = HUB_STATIC_META_BY_SLUG[slug];
  return {
    slug,
    name: sm?.name || pick(g, 'name', 'Name') || slug,
    description: sm?.description || pick(g, 'description', 'Description') || '',
    skillType: sm?.skillType || pick(g, 'skillType', 'SkillType') || '',
    levelMin: sm?.levelMin || pick(g, 'levelMin', 'LevelMin') || pick(g, 'level_min', 'level_min') || '',
    levelMax: sm?.levelMax || pick(g, 'levelMax', 'LevelMax') || pick(g, 'level_max', 'level_max') || '',
    maxHearts: pick(g, 'maxHearts', 'MaxHearts'),
    isPvp: !!(pick(g, 'isPvp', 'IsPvp') ?? pick(g, 'is_pvp')),
    isBossMode: !!(pick(g, 'isBossMode', 'IsBossMode') ?? pick(g, 'is_boss_mode') ?? sm?.isBossMode),
    sortOrder: Number(sm?.sortOrder ?? pick(g, 'sortOrder', 'SortOrder') ?? pick(g, 'sort_order') ?? 0),
    fromApi: !!g.fromApi,
  };
}

export function levelBadge(g) {
  const a = String(g.levelMin || '').trim();
  const b = String(g.levelMax || '').trim();
  if (a && b && a !== b) return `${a}–${b}`;
  if (a) return a;
  if (b) return b;
  return 'N5';
}

export function coverForGame(g) {
  if (g.isPvp) return artPvpSamurai;
  const map = {
    'hiragana-match': artCardHiragana,
    'katakana-match': artCardKatakana,
    'flashcard-vocabulary': artCardFlashcardVocab,
    'flashcard-battle': artCardFlashcardVocab,
    'multiple-choice': artCardMultipleChoice,
    'fill-in-blank': artBadgeCyanHolo,
    'listen-choose': artBadgeNeonPink,
    'kanji-memory': artKanjiMemoryStones,
    'vocabulary-speed-quiz': artVocabSpeed,
    'sentence-builder': artSentenceBuilder,
    'counter-quest': artKanjiPuzzle,
    'boss-battle': artBossBattle,
    'daily-challenge': artDailyChallenge,
  };
  return map[g.slug] || artBadgeCyanHolo;
}

export function themeClass(g) {
  if (g.isPvp) return 'play-dash__gcard--pvp';
  if (g.isBossMode) return 'play-dash__gcard--boss';
  const slug = g.slug;
  if (slug === 'hiragana-match') return 'play-dash__gcard--pink';
  if (slug === 'katakana-match') return 'play-dash__gcard--green';
  if (slug === 'kanji-memory' || slug === 'counter-quest') return 'play-dash__gcard--gold';
  if (slug === 'vocabulary-speed-quiz' || slug === 'listen-choose' || slug === 'flashcard-battle')
    return 'play-dash__gcard--blue';
  if (slug === 'sentence-builder') return 'play-dash__gcard--purple';
  return 'play-dash__gcard--neutral';
}

export function expBarFromExp(exp) {
  const e = Math.max(0, Number(exp) || 0);
  let idx = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (e >= RANK_TIERS[i].minExp) {
      idx = i;
      break;
    }
  }
  const cur = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1];
  if (!next) {
    return { pct: 100, line: `${formatIntVi(e)} XP`, sub: cur.label };
  }
  const span = next.minExp - cur.minExp;
  const pct = Math.min(100, Math.round(((e - cur.minExp) / span) * 100));
  return {
    pct,
    line: `${formatIntVi(e)} / ${formatIntVi(next.minExp)}`,
    sub: `${cur.label} → ${next.label}`,
  };
}

export function displayLevelFromExp(exp) {
  const e = Math.max(0, Number(exp) || 0);
  return Math.min(99, 1 + Math.floor(e / 250));
}
