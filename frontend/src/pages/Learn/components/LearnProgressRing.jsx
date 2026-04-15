/**
 * Vòng tròn tiến độ (mẫu hình 2 — widget bên phải hero).
 * @param {number|null|undefined} percent — 0–100 hoặc null khi chưa có dữ liệu
 */
export function LearnProgressRing({ percent, size = 132 }) {
  const has = percent != null && !Number.isNaN(Number(percent));
  const pct = has ? Math.min(100, Math.max(0, Number(percent))) : 0;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = has ? c * (1 - pct / 100) : c;

  return (
    <div className="learn-hero-ring" style={{ width: size, height: size }} aria-hidden={!has}>
      <svg className="learn-hero-ring__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="learn-hero-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        {has ? (
          <circle
            className="learn-hero-ring__arc"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      <div className="learn-hero-ring__label">
        <span className="learn-hero-ring__pct">{has ? `${pct}%` : '—'}</span>
      </div>
    </div>
  );
}
