import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../../services/adminService';

function pct(cur, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((cur / target) * 100));
}

export function SuggestionsTab() {
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancel = false;
    adminService
      .getOverview()
      .then((data) => {
        if (!cancel) setOv(data);
      })
      .catch((e) => {
        if (!cancel) setErr(e?.response?.data?.message || e?.message || 'Không tải được dữ liệu đề xuất từ API.');
      });
    return () => {
      cancel = true;
    };
  }, []);

  const monthLabel = useMemo(() => {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }, []);

  const kpi = useMemo(() => {
    const revenueCurrent = Math.round(Number(ov?.revenueTodayVnd ?? ov?.RevenueTodayVnd ?? 0) / 1_000_000);
    const revenueTarget = Math.max(1, revenueCurrent + 5);
    const paidCurrent = Number(ov?.premiumUsers ?? ov?.PremiumUsers ?? 0);
    const paidTarget = Math.max(1, paidCurrent + 20);
    const convCurrent = Number(ov?.premiumConversionRatePercent ?? ov?.PremiumConversionRatePercent ?? 0);
    const convTarget = Math.max(1, Math.round(convCurrent + 8));
    return { revenueCurrent, revenueTarget, paidCurrent, paidTarget, convCurrent, convTarget };
  }, [ov]);

  const suggestionCards = useMemo(() => {
    const premium = Number(ov?.premiumUsers ?? ov?.PremiumUsers ?? 0);
    const free = Number(ov?.freeUsers ?? ov?.FreeUsers ?? 0);
    const conversion = Number(ov?.premiumConversionRatePercent ?? ov?.PremiumConversionRatePercent ?? 0);
    const retention = Number(ov?.retentionRatePercent ?? ov?.RetentionRatePercent ?? 0);
    const msg24 = Number(ov?.messagesLast24Hours ?? ov?.MessagesLast24Hours ?? 0);
    const new7 = Number(ov?.newUsersLast7Days ?? ov?.NewUsersLast7Days ?? 0);
    return [
      {
        tone: 'blue',
        tag: 'Chuyển đổi',
        title: 'Tăng chuyển đổi Free -> Premium',
        body: `Hiện có ${free.toLocaleString('vi-VN')} tài khoản Free và ${premium.toLocaleString('vi-VN')} Premium (${conversion}%). Nên đặt điểm nâng cấp ở cuối bài học có tỷ lệ hoàn thành cao.`,
      },
      {
        tone: 'amber',
        tag: 'Retention',
        title: 'Giữ chân học viên cũ',
        body: `Retention 30 ngày đang là ${retention}%. Nên kích hoạt chiến dịch nhắc học lại cho nhóm không đăng nhập trong 7 ngày.`,
      },
      {
        tone: 'violet',
        tag: 'Hoạt động',
        title: 'Tối ưu trải nghiệm chat và game',
        body: `Hệ thống ghi nhận ${msg24.toLocaleString('vi-VN')} tin nhắn trong 24h. Ưu tiên tối ưu tải phòng chat và bảng xếp hạng game vào giờ cao điểm.`,
      },
      {
        tone: 'emerald',
        tag: 'Tăng trưởng',
        title: 'Tập trung nhóm người dùng mới',
        body: `Có ${new7.toLocaleString('vi-VN')} tài khoản mới trong 7 ngày. Nên gửi onboarding 3 bước trong 24h đầu để tăng tỷ lệ quay lại.`,
      },
    ];
  }, [ov]);

  const bars = useMemo(
    () => [
      {
        key: 'revenue',
        label: 'Doanh thu mục tiêu',
        current: kpi.revenueCurrent,
        target: kpi.revenueTarget,
        unit: 'M',
        display: `${kpi.revenueCurrent}M / ${kpi.revenueTarget}M`,
        color: '#16a34a',
      },
      {
        key: 'paid',
        label: 'Học viên trả phí mới',
        current: kpi.paidCurrent,
        target: kpi.paidTarget,
        unit: '',
        display: `${kpi.paidCurrent} / ${kpi.paidTarget}`,
        color: '#6366f1',
      },
      {
        key: 'conv',
        label: 'Tỷ lệ chuyển đổi',
        current: kpi.convCurrent,
        target: kpi.convTarget,
        unit: '%',
        display: `${kpi.convCurrent}% / ${kpi.convTarget}%`,
        color: '#ea580c',
      },
    ],
    [kpi]
  );

  return (
    <div className="admin-dash__tab-inner">
      <div className="admin-dash__ai-hero">
        <h2 className="admin-dash__ai-title">Đề xuất tối ưu hóa từ AI</h2>
        <p className="admin-dash__ai-desc">
          Phân tích dữ liệu thật từ API và gợi ý bốn hướng tối ưu doanh thu cùng trải nghiệm học viên.
        </p>
      </div>
      {err ? <div className="admin-users__alert">{err}</div> : null}

      <div className="admin-dash__suggest-grid">
        {suggestionCards.map((c) => (
          <div key={c.title} className={`admin-dash__suggest-card admin-dash__suggest-card--${c.tone}`}>
            <span className="admin-dash__suggest-tag">{c.tag}</span>
            <h3 className="admin-dash__suggest-title">{c.title}</h3>
            <p className="admin-dash__suggest-body">{c.body}</p>
            <button type="button" className="admin-dash__suggest-link">
              Xem chi tiết →
            </button>
          </div>
        ))}
      </div>

      <div className="admin-dash__card admin-dash__card--goals">
        <div className="admin-dash__goals-head">
          <div>
            <h3 className="admin-dash__card-title">Mục tiêu tháng {monthLabel}</h3>
            <p className="admin-dash__card-sub">KPI theo dõi lấy từ API thật (mục tiêu đang tính tự động theo dữ liệu hiện tại).</p>
          </div>
        </div>
        <ul className="admin-dash__goal-list">
          {bars.map((b) => (
            <li key={b.key}>
              <div className="admin-dash__goal-row">
                <span>{b.label}</span>
                <strong>{b.display}</strong>
              </div>
              <div className="admin-dash__goal-track">
                <div
                  className="admin-dash__goal-fill"
                  style={{ width: `${pct(b.current, b.target)}%`, background: b.color }}
                />
              </div>
              <span className="admin-dash__goal-pct">{pct(b.current, b.target)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
