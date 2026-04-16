import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../data/routes';
import { SakuraRainLayer } from '../../../components/effects/SakuraRainLayer';
import { PhdRewardsMarquee } from './PhdRewardsMarquee';
import {
  POWERUP_ROWS,
  REWARD_CARDS,
  coverForGame,
  formatIntVi,
  levelBadge,
  pick,
  themeClass,
} from './playHubCore';
import '../../../styles/pages/play-hub-dashboard.css';

/** Alias để ESLint (không có react/jsx-uses-vars) nhận diện biến được dùng qua JSX. */
const Motion = motion;

const easeOut = [0.22, 1, 0.36, 1];

const vPage = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.38, ease: easeOut, staggerChildren: 0.075, delayChildren: 0.05 },
  },
};

const vBlock = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
};

const vHero = {
  hidden: { opacity: 0, y: 28, x: -14 },
  show: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { type: 'spring', stiffness: 340, damping: 26 },
  },
};

const vColumns = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.2, staggerChildren: 0.11, delayChildren: 0.03 },
  },
};

const vSlideMain = {
  hidden: { opacity: 0, x: -26, y: 10 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: 'spring', stiffness: 360, damping: 28 },
  },
};

const vAsideCol = {
  hidden: { opacity: 0, x: 28, y: 12 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 360,
      damping: 28,
      staggerChildren: 0.072,
      delayChildren: 0.1,
    },
  },
};

const vAsideItem = {
  hidden: { opacity: 0, x: 16, y: 8 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: 'spring', stiffness: 420, damping: 30 },
  },
};

const vCard = {
  hidden: { opacity: 0, y: 22, x: -8, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 440, damping: 30 },
  },
};

const hoverGame = {
  y: -10,
  scale: 1.028,
  boxShadow:
    '0 22px 48px -14px rgba(190, 24, 93, 0.22), 0 14px 32px -12px rgba(15, 23, 42, 0.12)',
  transition: { type: 'spring', stiffness: 480, damping: 24 },
};
const hoverReward = { y: -6, scale: 1.04, transition: { type: 'spring', stiffness: 500, damping: 24 } };

const hoverAsidePanel = {
  y: -5,
  scale: 1.014,
  boxShadow:
    '0 18px 40px -14px rgba(190, 24, 93, 0.16), 0 10px 24px -10px rgba(15, 23, 42, 0.1)',
  transition: { type: 'spring', stiffness: 400, damping: 26 },
};

function leaderboardHeading(kind) {
  if (kind === 'weekly') return 'Bảng xếp hạng tuần';
  if (kind === 'monthly') return 'Bảng xếp hạng tháng';
  return 'Top EXP';
}

function rankCellLabel(kind) {
  if (kind === 'weekly') return 'BXH tuần';
  if (kind === 'monthly') return 'BXH tháng';
  return 'Hạng EXP';
}

/**
 * Giao diện hub /play — layout 2 cột, motion, nền glass + sakura.
 * Header site (LearnerTopNav) nằm ngoài component này.
 */
export function PlayHubDashboard({
  loadError,
  loading,
  ordered,
  displayName,
  exp,
  streakDays,
  xu,
  expUi,
  pseudoLevel,
  invQty,
  myLbRank,
  lbBoardKind,
  lbRows,
  expTopRows,
  user,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="play-dash phd-root">
      <div className="phd-sakura-rain-wrap" aria-hidden>
        <SakuraRainLayer petalCount={28} buoyant />
      </div>
      <div className="phd-glass-layer" aria-hidden />
      <Motion.div
        className="phd-inner"
        variants={vPage}
        initial="hidden"
        animate="show"
        style={{ willChange: 'opacity' }}
      >
        <Motion.div
          className="phd-hero"
          variants={vHero}
          animate={{
            boxShadow: [
              '0 18px 48px -28px rgba(15, 23, 42, 0.18)',
              '0 22px 56px -24px rgba(190, 24, 93, 0.14)',
              '0 18px 48px -28px rgba(15, 23, 42, 0.18)',
            ],
          }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <p className="phd-hero__eyebrow">CHÀO MỪNG TRỞ LẠI!</p>
          <div className="phd-hero__row">
            <div>
              <h1 className="phd-hero__title">
                Xin chào, <strong>{displayName}</strong>!
              </h1>
              <p className="phd-hero__lead">
                Hôm nay bạn đã sẵn sàng chinh phục tiếng Nhật chưa? Daily Challenge đang chờ bạn!
              </p>
              <div className="phd-hero__actions">
                <Link className="play-dash__btn play-dash__btn--daily" to={`${ROUTES.PLAY}/daily`}>
                  ⚔️ Daily Challenge
                </Link>
                <Link className="play-dash__btn play-dash__btn--quick" to={`${ROUTES.PLAY}/hiragana-match`}>
                  🎮 Quick Match
                </Link>
              </div>
            </div>
            <div className="phd-stat-ribbon" aria-label="Chỉ số nhanh">
              <div className="phd-stat-chip phd-stat-chip--xp">
                <span className="phd-stat-chip__lbl">EXP</span>
                <span className="phd-stat-chip__val">{formatIntVi(exp)}</span>
              </div>
              <div className="phd-stat-chip phd-stat-chip--coin">
                <span className="phd-stat-chip__lbl">Xu</span>
                <span className="phd-stat-chip__val">{formatIntVi(xu)}</span>
              </div>
              <div className="phd-stat-chip">
                <span className="phd-stat-chip__lbl">Streak</span>
                <span className="phd-stat-chip__val">{formatIntVi(streakDays)} ngày</span>
              </div>
              <div className="phd-stat-chip">
                <span className="phd-stat-chip__lbl">Cấp</span>
                <span className="phd-stat-chip__val">LV {pseudoLevel}</span>
              </div>
            </div>
          </div>
        </Motion.div>

        <Motion.div className="play-dash__columns phd-columns" variants={vColumns}>
          <Motion.div className="play-dash__main phd-main" variants={vSlideMain}>
            {loadError ? <div className="play-dash__warn">{loadError}</div> : null}
            {loading ? <p className="play-dash__muted">Đang tải danh sách game…</p> : null}

            <Motion.section className="phd-section" variants={vBlock}>
              <div className="phd-section__head">
                <h2 className="phd-section__title">
                  <span aria-hidden>🎮</span> Trò chơi
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="play-dash__count">{ordered.length} games</span>
                  <Link className="phd-link-quiet" to={`${ROUTES.PLAY}/leaderboard`}>
                    Xem tất cả →
                  </Link>
                </div>
              </div>
              <Motion.ul className="play-dash__game-grid" variants={vPage} initial="hidden" animate="show">
                {ordered.map((g) => (
                  <Motion.li
                    key={g.slug}
                    className={`play-dash__gcard ${themeClass(g)}`}
                    variants={vCard}
                    whileHover={hoverGame}
                    whileTap={{ scale: 0.985 }}
                  >
                    <div className="play-dash__gcard-badges">
                      <span className="play-dash__gcard-badge">{levelBadge(g)}</span>
                      {g.isPvp ? <span className="play-dash__tag">PvP</span> : null}
                      {g.isBossMode ? (
                        <span className="play-dash__tag play-dash__tag--boss">Boss</span>
                      ) : null}
                    </div>
                    <div className="play-dash__gcard-art-wrap">
                      <img className="play-dash__gcard-art" src={coverForGame(g)} alt="" />
                    </div>
                    <h3 className="play-dash__gcard-title">{g.name}</h3>
                    <p className="play-dash__gcard-cat">{g.skillType || 'Luyện tập'}</p>
                    <p className="play-dash__gcard-desc">{g.description || '—'}</p>
                    <Link
                      className="play-dash__playnow"
                      to={g.isPvp ? `${ROUTES.PLAY}/pvp` : `${ROUTES.PLAY}/${g.slug}`}
                    >
                      PLAY NOW
                    </Link>
                  </Motion.li>
                ))}
              </Motion.ul>
            </Motion.section>

            <Motion.section className="phd-section" variants={vBlock}>
              <div className="phd-section__head">
                <h2 className="phd-section__title">
                  <span aria-hidden>💎</span> Phần thưởng
                </h2>
              </div>
              <PhdRewardsMarquee
                items={REWARD_CARDS}
                renderCard={(r, i) => (
                  <Motion.div className="phd-reward-card" whileHover={hoverReward} whileTap={{ scale: 0.98 }}>
                    <Motion.span
                      className="phd-reward-card__ico"
                      aria-hidden
                      animate={
                        reduceMotion
                          ? undefined
                          : { y: [0, -6, 0], rotate: [0, 4, -4, 0] }
                      }
                      transition={
                        reduceMotion
                          ? undefined
                          : {
                              duration: 2.6 + (i % 4) * 0.2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: i * 0.09,
                            }
                      }
                    >
                      {r.icon}
                    </Motion.span>
                    <div className="phd-reward-card__t">{r.title}</div>
                    <div className="phd-reward-card__d">{r.desc}</div>
                  </Motion.div>
                )}
              />
            </Motion.section>

            <Motion.section className="play-dash__panel" variants={vBlock} aria-labelledby="dash-powerups-main">
              <div className="play-dash__section-head play-dash__section-head--tight">
                <h2 id="dash-powerups-main" className="play-dash__h2 play-dash__h2--inline">
                  <span aria-hidden>⚡</span> Vật phẩm (Power-ups)
                </h2>
                <Link className="play-dash__link-more" to={`${ROUTES.PLAY}/shop`}>
                  Cửa hàng xu →
                </Link>
              </div>
              <p className="play-dash__hint">
                Số lượng từ túi đồ API — dùng trong lúc chơi (phiên game đang mở). Mua thêm bằng xu tại cửa hàng.
              </p>
              <ul className="play-dash__power-grid">
                {POWERUP_ROWS.map((p) => (
                  <Motion.li
                    key={p.slug}
                    className="play-dash__power-card"
                    whileHover={{ y: -4, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    <span className="play-dash__power-qty">{formatIntVi(invQty(p.slug))}</span>
                    <img className="play-dash__power-img" src={p.img} alt="" />
                    <div className="play-dash__power-body">
                      <div className="play-dash__power-name">{p.label}</div>
                      <div className="play-dash__power-desc">{p.desc}</div>
                      {p.hint ? <div className="play-dash__power-foot">{p.hint}</div> : null}
                    </div>
                  </Motion.li>
                ))}
              </ul>
            </Motion.section>

            <details className="phd-details">
              <summary>📦 Cách nhận vật phẩm</summary>
              <ul className="play-dash__dotlist">
                <li>Đăng nhập hàng ngày</li>
                <li>Hoàn thành daily challenge</li>
                <li>Chiến thắng trong PvP</li>
                <li>Mua bằng xu (kiếm từ game)</li>
                <li>Premium: nhận thêm mỗi ngày</li>
              </ul>
            </details>

            <details className="phd-details">
              <summary>📊 Cơ chế điểm số</summary>
              <div className="play-dash__score-cols">
                <ul className="play-dash__checklist">
                  <li>✅ Trả lời đúng: +100 điểm cơ bản</li>
                  <li>🔥 Combo: ×1.2 → ×1.5 → ×2.0</li>
                </ul>
                <ul className="play-dash__checklist">
                  <li>⚡ Trả lời nhanh: + điểm thưởng</li>
                  <li>❌ Sai: mất 1 mạng, reset combo</li>
                </ul>
              </div>
            </details>

            <details className="phd-details">
              <summary>🏆 Top điểm (EXP)</summary>
              <p className="play-dash__hint">Xếp hạng theo điểm tích lũy trên tài khoản.</p>
              {expTopRows.length === 0 ? (
                <p className="play-dash__muted">Chưa có dữ liệu bảng xếp hạng EXP.</p>
              ) : (
                <ol className="play-dash__exp-top-list">
                  {expTopRows.map((r, i) => {
                    const uid = pick(r, 'userId', 'UserId');
                    const name = pick(r, 'displayName', 'DisplayName') || '—';
                    const ex = Number(pick(r, 'exp', 'Exp') ?? 0);
                    const me = user?.id != null && uid != null && String(uid) === String(user.id);
                    const label = pick(r, 'rank', 'Rank') ?? i + 1;
                    return (
                      <li
                        key={String(uid ?? i)}
                        className={`play-dash__exp-top-row ${me ? 'play-dash__exp-top-row--me' : ''}`}
                      >
                        <span className="play-dash__exp-top-rank">#{label}</span>
                        <span className="play-dash__exp-top-name">
                          {name}
                          {me ? <span className="play-dash__exp-top-me"> (bạn)</span> : null}
                        </span>
                        <span className="play-dash__exp-top-score">{formatIntVi(ex)} XP</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </details>

          </Motion.div>

          <Motion.aside className="play-dash__aside phd-aside-stack" variants={vAsideCol}>
            <Motion.div className="play-dash__profile" variants={vAsideItem} whileHover={hoverAsidePanel}>
              <div className="play-dash__profile-ring">
                <span className="play-dash__profile-lv">{pseudoLevel}</span>
                <span className="play-dash__profile-lvlabel">LV</span>
              </div>
              <div className="play-dash__profile-text">
                <div className="play-dash__profile-name">{displayName}</div>
                <div className="play-dash__profile-sub">Kanji Hunter • Speed Demon</div>
              </div>
            </Motion.div>
            <Motion.div className="play-dash__expblock" variants={vAsideItem} whileHover={hoverAsidePanel}>
              <div className="play-dash__exprow">
                <span>EXP</span>
                <span>
                  {expUi.line} <small className="play-dash__expsub">{expUi.sub}</small>
                </span>
              </div>
              <div
                className="play-dash__exptrack"
                role="progressbar"
                aria-valuenow={expUi.pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="play-dash__expfill" style={{ width: `${expUi.pct}%` }} />
              </div>
            </Motion.div>
            <Motion.div className="play-dash__ministats" variants={vAsideItem} whileHover={hoverAsidePanel}>
              <div>
                <div className="play-dash__ms-val">{formatIntVi(xu)}</div>
                <div className="play-dash__ms-lbl">Xu</div>
              </div>
              <div>
                <div className="play-dash__ms-val">{formatIntVi(streakDays)}</div>
                <div className="play-dash__ms-lbl">Streak</div>
              </div>
              <div>
                <div className="play-dash__ms-val">
                  {myLbRank > 0 ? `#${myLbRank}` : lbRows.length > 0 ? '…' : '—'}
                </div>
                <div className="play-dash__ms-lbl">{rankCellLabel(lbBoardKind)}</div>
                {myLbRank === 0 && lbRows.length > 0 ? (
                  <div className="phd-ms-note">Ngoài top hiển thị</div>
                ) : null}
              </div>
            </Motion.div>

            <Motion.div
              className="play-dash__panel play-dash__panel--compact"
              variants={vAsideItem}
              whileHover={hoverAsidePanel}
            >
              <h2 className="play-dash__h2 play-dash__h2--inline">
                <span aria-hidden>⚡</span> Vật phẩm
              </h2>
              <ul className="phd-power-compact">
                {POWERUP_ROWS.map((p) => (
                  <li key={p.slug}>
                    <span className="phd-power-compact__left">
                      <img className="phd-power-compact__img" src={p.img} alt="" width={36} height={36} />
                      <span className="phd-power-compact__name">{p.label}</span>
                    </span>
                    <span className="phd-power-compact__qty">×{formatIntVi(invQty(p.slug))}</span>
                  </li>
                ))}
              </ul>
              <Link className="phd-btn-shop" to={`${ROUTES.PLAY}/shop`}>
                VÀO CỬA HÀNG
              </Link>
            </Motion.div>

            <Motion.div className="play-dash__lb" variants={vAsideItem} whileHover={hoverAsidePanel}>
              <div className="play-dash__lb-head">
                <h3 className="play-dash__lb-title">🏆 {leaderboardHeading(lbBoardKind)}</h3>
                <Link to={`${ROUTES.PLAY}/leaderboard`} className="play-dash__lb-all">
                  Xem tất cả →
                </Link>
              </div>
              <p className="play-dash__muted play-dash__shop-link">
                <Link to={`${ROUTES.PLAY}/shop`}>🛒 Cửa hàng xu</Link>
              </p>
              {lbRows.length === 0 ? (
                <p className="play-dash__muted">
                  Chưa có dữ liệu xếp hạng. Chơi game có ghi điểm (quiz / Kanji Memory) hoặc F5 sau khi backend cập nhật
                  BXH.
                </p>
              ) : (
                <ol className="play-dash__lb-list">
                  {lbRows.map((r, i) => {
                    const name = pick(r, 'displayName', 'DisplayName') || '—';
                    const rawScore = pick(r, 'score', 'Score') ?? pick(r, 'exp', 'Exp');
                    const score = Number(rawScore) || 0;
                    const uid = pick(r, 'userId', 'UserId');
                    const jlpt = pick(r, 'levelCode', 'LevelCode');
                    const me = user?.id != null && uid != null && String(uid) === String(user.id);
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    const scoreSuffix = lbBoardKind === 'exp' ? ' XP' : '';
                    return (
                      <Motion.li
                        key={String(uid ?? `${name}-${i}`)}
                        className={`play-dash__lb-row ${me ? 'play-dash__lb-row--me' : ''}`}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ x: -2 }}
                      >
                        <span className="play-dash__lb-medal">{medal}</span>
                        <span className="play-dash__lb-name">
                          {name}
                          {jlpt ? <span className="play-dash__lb-jlpt"> · {jlpt}</span> : null}
                        </span>
                        <span className="play-dash__lb-score">
                          {formatIntVi(score)}
                          {scoreSuffix}
                        </span>
                      </Motion.li>
                    );
                  })}
                </ol>
              )}
            </Motion.div>
          </Motion.aside>
        </Motion.div>

      </Motion.div>
    </div>
  );
}
