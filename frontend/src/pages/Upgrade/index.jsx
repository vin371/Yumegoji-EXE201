import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/paymentService';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';

/** Alias để ESLint nhận diện biến dùng qua JSX. */
const Motion = motion;

const PREMIUM_SPARKLE_LAYOUT = [
  { top: '10%', left: '11%' },
  { top: '19%', right: '16%' },
  { top: '36%', left: '7%' },
  { top: '54%', right: '11%' },
  { top: '71%', left: '20%' },
];

const plansContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.16, delayChildren: 0.08 },
  },
};

const planCard = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 28 },
  },
};

const btnHoverLift = { y: -3, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } };
const btnTap = { scale: 0.985, transition: { duration: 0.12 } };

function fmtVnd(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(x));
}

/** 7.1 Gói Miễn phí — nội dung theo spec sản phẩm */
const FREE_FEATURES = [
  'Truy cập bài học cơ bản theo cấp độ',
  'Chơi game giới hạn số lượt',
  'Tham gia chat công cộng',
  'Kết bạn',
  'Xem bảng xếp hạng',
  'Quảng cáo hiển thị (nếu có)',
];

/** 7.2 Gói Cao cấp (Premium) */
const PREMIUM_FEATURES = [
  'Không giới hạn lượt chơi game',
  'Truy cập tất cả bài học, bao gồm nâng cao',
  'Không quảng cáo',
  'Vật phẩm đặc biệt trong game mỗi ngày',
  'Kết bạn không giới hạn',
  'Tạo nhóm chat riêng',
  'Tham gia giải đấu PvP',
  'Nhận huy hiệu Premium độc quyền',
  'Ưu tiên hỗ trợ khách hàng',
];

export default function UpgradePage() {
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [intent, setIntent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const isPremium = !!(user?.isPremium ?? user?.IsPremium);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [cfg, latest] = await Promise.all([
          paymentService.getPremiumConfig(),
          paymentService.getMyLatestPremiumIntent().catch(() => null),
        ]);
        if (!cancelled) {
          setConfig(cfg);
          setIntent(latest);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.response?.data?.message || e?.message || 'Không tải được dữ liệu Upgrade.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const premiumPrice = Number(config?.premiumPriceVnd ?? 10000);
  const durationDays = Number(config?.premiumDurationDays ?? 30);
  const bankCode = String(config?.bankCode ?? 'ICB');
  const accountNo = String(config?.accountNo ?? '105877558159');
  const accountName = String(config?.accountName ?? 'HOANG NGUYEN THE VINH');
  const canBuy = !!(config?.isActive ?? true) && !isPremium;

  const statusText = useMemo(() => {
    const s = String(intent?.status || '').toLowerCase();
    if (s === 'approved') return 'Đã duyệt: tài khoản đã lên Premium.';
    if (s === 'pending_review') return 'Đã gửi yêu cầu, đang chờ admin duyệt.';
    if (s === 'rejected') return 'Yêu cầu đã bị từ chối. Tạo mã mới để thanh toán lại.';
    if (s === 'created') return 'Đã tạo mã, vui lòng chuyển khoản đúng nội dung token.';
    return '';
  }, [intent?.status]);

  async function onCreateIntent() {
    setCreating(true);
    setErr('');
    setMsg('');
    try {
      const dto = await paymentService.createPremiumIntent();
      setIntent(dto);
      setMsg('Đã tạo mã QR thanh toán.');
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Không tạo được mã thanh toán.');
    } finally {
      setCreating(false);
    }
  }

  async function onConfirmPaid() {
    if (!intent?.token) return;
    setConfirming(true);
    setErr('');
    setMsg('');
    try {
      const dto = await paymentService.confirmPremiumPayment(intent.token);
      setIntent(dto);
      setMsg('Đã gửi xác nhận. Vui lòng chờ admin duyệt.');
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Không xác nhận được thanh toán.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="upgrade-page upgrade-page--sakura">
      <SakuraRainLayer />
      <div className="upgrade-page__decor upgrade-page__decor--tl" aria-hidden />
      <div className="upgrade-page__decor upgrade-page__decor--br" aria-hidden />

      <header className="upgrade-page__hero">
        <p className="upgrade-page__eyebrow">So sánh gói đăng ký</p>
        <h1 className="upgrade-page__title">Nâng cấp trải nghiệm học &amp; chơi</h1>
        <p className="upgrade-page__lead">
          Mở khóa phần thưởng và tính năng nâng cao. Phân biệt tài khoản theo cờ{' '}
          <strong>Premium</strong> trên hệ thống (sau khi admin duyệt thanh toán).
        </p>
      </header>

      {loading ? <p className="upgrade-page__muted">Đang tải…</p> : null}
      {err ? <p className="upgrade-page__err">{err}</p> : null}
      {msg ? <p className="upgrade-page__ok">{msg}</p> : null}

      <Motion.section
        className="upgrade-page__plans"
        aria-label="So sánh gói Free và Premium"
        variants={plansContainer}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
      >
        <Motion.article
          className={`upgrade-card upgrade-card--free ${!isPremium ? 'upgrade-card--current' : ''}`}
          variants={reduceMotion ? undefined : planCard}
        >
          <div className="upgrade-card__ribbon">Gói Miễn phí</div>
          <h2 className="upgrade-card__name">Free</h2>
          <p className="upgrade-card__price">
            Miễn phí <span className="upgrade-card__price-sub">/ dùng lâu dài</span>
          </p>
          <ul className="upgrade-card__features">
            {FREE_FEATURES.map((t) => (
              <li key={t}>
                <span className="upgrade-card__check" aria-hidden>
                  ✓
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <Motion.div className="upgrade-card__btn-touch" whileHover={btnHoverLift} whileTap={btnTap}>
            <button type="button" className="upgrade-card__btn" disabled>
              {!isPremium ? 'Gói hiện tại' : 'Không phải gói này'}
            </button>
          </Motion.div>
        </Motion.article>

        <Motion.article
          className={`upgrade-card upgrade-card--premium ${isPremium ? 'upgrade-card--current' : ''}`}
          variants={reduceMotion ? undefined : planCard}
        >
          <div className="upgrade-card__sparkles" aria-hidden>
            {PREMIUM_SPARKLE_LAYOUT.map((pos, i) =>
              reduceMotion ? (
                <span key={i} className="upgrade-card__sparkle upgrade-card__sparkle--static" style={pos}>
                  ✦
                </span>
              ) : (
                <Motion.span
                  key={i}
                  className="upgrade-card__sparkle"
                  style={pos}
                  initial={{ opacity: 0.35, scale: 0.85 }}
                  animate={{
                    opacity: [0.35, 1, 0.45, 0.95, 0.4],
                    scale: [0.85, 1.15, 0.9, 1.08, 0.88],
                  }}
                  transition={{
                    duration: 2.4 + i * 0.35,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.22,
                  }}
                >
                  ✦
                </Motion.span>
              ),
            )}
          </div>
          <div className="upgrade-card__badge">Ưu đãi nhất</div>
          <div className="upgrade-card__ribbon upgrade-card__ribbon--gold">Gói Cao cấp (Premium)</div>
          <h2 className="upgrade-card__name upgrade-card__name--gold">Premium</h2>
          <p className="upgrade-card__price upgrade-card__price--gold">
            {fmtVnd(premiumPrice)} VND
            <span className="upgrade-card__price-sub"> / {durationDays} ngày</span>
          </p>
          <p className="upgrade-card__billing-note">Tính phí theo gói đang cấu hình — thanh toán &amp; kích hoạt sau khi admin duyệt.</p>
          <ul className="upgrade-card__features upgrade-card__features--gold">
            {PREMIUM_FEATURES.map((t) => (
              <li key={t}>
                <span className="upgrade-card__check upgrade-card__check--gold" aria-hidden>
                  ✓
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <Motion.div className="upgrade-card__btn-touch" whileHover={btnHoverLift} whileTap={btnTap}>
            <button
              type="button"
              className="upgrade-card__btn upgrade-card__btn--gold"
              onClick={onCreateIntent}
              disabled={!canBuy || creating}
            >
              {isPremium ? 'Gói hiện tại' : creating ? 'Đang tạo mã…' : 'Nâng cấp Premium'}
            </button>
          </Motion.div>
        </Motion.article>
      </Motion.section>

      {!isPremium && intent ? (
        <section className="upgrade-pay" aria-labelledby="upgrade-pay-title">
          <h3 id="upgrade-pay-title">Thanh toán QR</h3>
          <p className="upgrade-page__muted">{statusText}</p>
          <div className="upgrade-pay__grid">
            <div className="upgrade-pay__info">
              <div>
                <strong>Ngân hàng:</strong> {bankCode}
              </div>
              <div>
                <strong>Số tài khoản:</strong> {accountNo}
              </div>
              <div>
                <strong>Chủ tài khoản:</strong> {accountName}
              </div>
              <div>
                <strong>Số tiền:</strong> {fmtVnd(intent.amountVnd ?? premiumPrice)} VND
              </div>
              <div className="upgrade-pay__token">
                <strong>Nội dung chuyển:</strong> <code>{intent.token}</code>
              </div>
              <div className="upgrade-pay__hint">Token mẫu theo chuẩn ngắn: NAPxxxxxYume (12 ký tự).</div>
            </div>

            <div className="upgrade-pay__qr">
              <img src={intent.qrImageUrl} alt="QR thanh toán Premium" />
            </div>
          </div>

          <div className="upgrade-pay__actions">
            <Motion.div className="upgrade-pay__btn-touch" whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
              <button type="button" className="upgrade-card__btn upgrade-card__btn--gold" onClick={onConfirmPaid} disabled={confirming}>
                {confirming ? 'Đang gửi…' : 'Tôi đã thanh toán'}
              </button>
            </Motion.div>
            <Link className="upgrade-page__back" to={ROUTES.DASHBOARD}>
              ← Về Dashboard
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
