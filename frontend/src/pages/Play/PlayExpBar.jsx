import { useEffect, useMemo, useState } from 'react';
import { fetchMyProgressSummary } from '../../services/learningProgressService';
import { playExpTierProgress } from '../../utils/playExpTier';

const EXP_REFRESH = 'yume-play-exp-refresh';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

export default function PlayExpBar() {
  const [exp, setExp] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let c = false;
    const load = async () => {
      try {
        const s = await fetchMyProgressSummary();
        if (!c) {
          setExp(pick(s, 'exp', 'Exp') ?? 0);
          setErr(false);
        }
      } catch {
        if (!c) setErr(true);
      }
    };
    load();
    const onRefresh = () => {
      load();
    };
    window.addEventListener(EXP_REFRESH, onRefresh);
    return () => {
      c = true;
      window.removeEventListener(EXP_REFRESH, onRefresh);
    };
  }, []);

  const prog = useMemo(() => playExpTierProgress(exp), [exp]);

  if (err) return null;

  return (
    <div className="play-expbar" aria-label="Tiến độ EXP">
      <div className="play-expbar__row play-expbar__row--title">
        <span className="play-expbar__label">Cấp độ hiện tại</span>
        <span className="play-expbar__nums">{prog.line}</span>
      </div>
      <div className="play-expbar__rank">
        <span className="play-expbar__rank-ico" aria-hidden>
          ★
        </span>
        <span className="play-expbar__rank-text">{prog.rankLabel} Rank</span>
      </div>
      <div
        className="play-expbar__track"
        role="progressbar"
        aria-valuenow={prog.pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="play-expbar__fill" style={{ width: `${prog.pct}%` }} />
      </div>
      {prog.nextRankLabel ? (
        <div className="play-expbar__tier-labels">
          <span>{prog.rankLabel}</span>
          <span>{prog.nextRankLabel}</span>
        </div>
      ) : (
        <span className="play-expbar__sub">{prog.sub}</span>
      )}
    </div>
  );
}
