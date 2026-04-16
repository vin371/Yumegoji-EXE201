import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchExpLeaderboard,
  fetchGames,
  fetchGameInventory,
  fetchLeaderboard,
} from '../../services/gameService';
import { fetchMyProgressSummary } from '../../services/learningProgressService';
import { PlayHubDashboard } from './hub/PlayHubDashboard';
import {
  HUB_HIDDEN_GAME_SLUGS,
  STATIC_FALLBACK,
  displayLevelFromExp,
  expBarFromExp,
  normalizeGameRow,
  normalizePowerUpSlugFromApi,
  pick,
} from './hub/playHubCore';

export default function PlayHub() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  /** BXH game: tuần → tháng nếu rỗng; UI có thể fallback EXP. */
  const [lbRowsFull, setLbRowsFull] = useState([]);
  const [lbBoardKind, setLbBoardKind] = useState('weekly');
  const [expTopRows, setExpTopRows] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchGames();
        const raw = Array.isArray(list) && list.length > 0 ? list : STATIC_FALLBACK;
        const mapped = raw
          .map((row) => normalizeGameRow({ ...row, fromApi: Array.isArray(list) && list.length > 0 }))
          .filter(Boolean)
          .filter((g) => g.slug && !HUB_HIDDEN_GAME_SLUGS.has(g.slug));
        if (!cancelled) {
          setGames(mapped);
          setLoadError(Array.isArray(list) && list.length === 0 ? 'API trả về danh sách rỗng — hiển thị bản dự phòng.' : '');
        }
      } catch {
        if (!cancelled) {
          setGames(
            STATIC_FALLBACK.map((row) => normalizeGameRow({ ...row, fromApi: false }))
              .filter(Boolean)
              .filter((g) => g.slug && !HUB_HIDDEN_GAME_SLUGS.has(g.slug)),
          );
          setLoadError('Không tải được danh sách game từ server — đang dùng bản dự phòng.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadInventory = useCallback(async () => {
    try {
      const inv = await fetchGameInventory();
      setInventory(inv);
    } catch {
      setInventory(null);
    }
  }, []);

  useEffect(() => {
    reloadInventory();
  }, [reloadInventory]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') reloadInventory();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', reloadInventory);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', reloadInventory);
    };
  }, [reloadInventory]);

  const reloadLeaderboard = useCallback(async () => {
    try {
      const weekly = await fetchLeaderboard({ period: 'weekly', sortBy: 'score' });
      const w = Array.isArray(weekly) ? weekly : [];
      if (w.length > 0) {
        setLbRowsFull(w.slice(0, 40));
        setLbBoardKind('weekly');
        return;
      }
      const monthly = await fetchLeaderboard({ period: 'monthly', sortBy: 'score' });
      const m = Array.isArray(monthly) ? monthly : [];
      if (m.length > 0) {
        setLbRowsFull(m.slice(0, 40));
        setLbBoardKind('monthly');
        return;
      }
      setLbRowsFull([]);
      setLbBoardKind('exp');
    } catch {
      setLbRowsFull([]);
      setLbBoardKind('exp');
    }
  }, []);

  useEffect(() => {
    reloadLeaderboard();
  }, [reloadLeaderboard]);

  const reloadExpTop = useCallback(async () => {
    try {
      const rows = await fetchExpLeaderboard(10);
      setExpTopRows(Array.isArray(rows) ? rows : []);
    } catch {
      setExpTopRows([]);
    }
  }, []);

  useEffect(() => {
    reloadExpTop();
  }, [reloadExpTop]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') reloadLeaderboard();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', reloadLeaderboard);
    const t = window.setInterval(reloadLeaderboard, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', reloadLeaderboard);
      window.clearInterval(t);
    };
  }, [reloadLeaderboard]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') reloadExpTop();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', reloadExpTop);
    const t = window.setInterval(reloadExpTop, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', reloadExpTop);
      window.clearInterval(t);
    };
  }, [reloadExpTop]);

  const reloadSummary = useCallback(async () => {
    try {
      const s = await fetchMyProgressSummary();
      setSummary(s);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    void reloadSummary();
  }, [reloadSummary]);

  useEffect(() => {
    const onRefresh = () => {
      void reloadSummary();
      void reloadInventory();
    };
    window.addEventListener('yume-play-exp-refresh', onRefresh);
    return () => window.removeEventListener('yume-play-exp-refresh', onRefresh);
  }, [reloadSummary, reloadInventory]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void reloadSummary();
        void reloadInventory();
      }
    };
    const onFocus = () => {
      void reloadSummary();
      void reloadInventory();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [reloadSummary, reloadInventory]);

  const ordered = useMemo(
    () => [...games].sort((a, b) => (a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.slug.localeCompare(b.slug))),
    [games],
  );

  const displayName = useMemo(() => {
    return user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'NihongoMaster';
  }, [user]);

  const exp = pick(summary, 'exp', 'Exp') ?? pick(user, 'exp', 'Exp') ?? 0;
  const streakDays = pick(summary, 'streakDays', 'StreakDays') ?? 0;
  const xu = pick(summary, 'xu', 'Xu') ?? pick(user, 'xu', 'Xu', 'coins', 'Coins') ?? 0;
  const expUi = expBarFromExp(exp);
  const pseudoLevel = displayLevelFromExp(exp);

  /** Số lượng theo slug đã chuẩn hoá (trùng logic SQL inventory trên server). */
  const inventoryQtyBySlug = useMemo(() => {
    const items = inventory?.items ?? inventory?.Items ?? [];
    const map = new Map();
    if (!Array.isArray(items)) return map;
    for (const row of items) {
      const key = normalizePowerUpSlugFromApi(row.slug ?? row.Slug);
      if (!key) continue;
      const q = Math.max(0, Math.floor(Number(row.quantityOwned ?? row.QuantityOwned ?? 0) || 0));
      map.set(key, (map.get(key) || 0) + q);
    }
    return map;
  }, [inventory]);

  const invQty = useCallback(
    (slug) => inventoryQtyBySlug.get(normalizePowerUpSlugFromApi(slug)) ?? 0,
    [inventoryQtyBySlug],
  );

  const lbRows = useMemo(() => {
    if (lbBoardKind === 'weekly' || lbBoardKind === 'monthly') {
      return lbRowsFull.slice(0, 8);
    }
    return (expTopRows || []).slice(0, 8);
  }, [lbBoardKind, lbRowsFull, expTopRows]);

  const myLbRank = useMemo(() => {
    const uid = user?.id ?? user?.userId;
    if (uid == null) return 0;
    if (lbBoardKind === 'exp') {
      const i = expTopRows.findIndex((r) => {
        const id = pick(r, 'userId', 'UserId');
        return id != null && String(id) === String(uid);
      });
      return i >= 0 ? i + 1 : 0;
    }
    const i = lbRowsFull.findIndex((r) => {
      const id = pick(r, 'userId', 'UserId');
      return id != null && String(id) === String(uid);
    });
    return i >= 0 ? i + 1 : 0;
  }, [lbBoardKind, lbRowsFull, expTopRows, user]);

  return (
    <PlayHubDashboard
      loadError={loadError}
      loading={loading}
      ordered={ordered}
      displayName={displayName}
      exp={exp}
      streakDays={streakDays}
      xu={xu}
      expUi={expUi}
      pseudoLevel={pseudoLevel}
      invQty={invQty}
      myLbRank={myLbRank}
      lbBoardKind={lbBoardKind}
      lbRows={lbRows}
      expTopRows={expTopRows}
      user={user}
    />
  );
}
