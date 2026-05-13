import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { useAuth } from '../../hooks/useAuth';
import http from '../../api/client';
import { storage } from '../../utils/storage';
import { isStaffUser } from '../../utils/roles';
import { PLACEMENT_DRAFT_KEY } from './constants';
import { PlacementHero } from './PlacementHero';
import { PlacementSidebar } from './PlacementSidebar';
import { LevelUpExamBar } from '../LevelUpTest/LevelUpExamBar';
import { LevelUpQuestionCard } from '../LevelUpTest/LevelUpQuestionCard';
import { LevelUpBottomBar } from '../LevelUpTest/LevelUpBottomBar';

const TEST_DURATION_SECONDS = 20 * 60;

function readDraft() {
  try {
    const raw = localStorage.getItem(PLACEMENT_DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.answers !== 'object') return null;
    return { answers: data.answers, savedAt: data.savedAt || null };
  } catch {
    return null;
  }
}

function writeDraft(answers) {
  localStorage.setItem(
    PLACEMENT_DRAFT_KEY,
    JSON.stringify({ answers, savedAt: new Date().toISOString() })
  );
}

function clearDraft() {
  localStorage.removeItem(PLACEMENT_DRAFT_KEY);
}

function formatDraftLabel(iso) {
  if (!iso) return null;
  try {
    const dt = new Date(iso);
    if (!Number.isFinite(dt.getTime())) return null;
    return dt.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return null;
  }
}

export default function PlacementTest() {
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const expirySubmitRef = useRef(false);

  const navigate = useNavigate();
  const { user, setNeedsPlacementTest } = useAuth();

  const displayName = user?.displayName || user?.username || user?.name || user?.email || 'bạn';

  useEffect(() => {
    if (isStaffUser(user)) {
      storage.set('needs_placement_test', false);
      setNeedsPlacementTest?.(false);
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [user, navigate, setNeedsPlacementTest]);

  useEffect(() => {
    if (isStaffUser(user)) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await http.get('/api/PlacementTest');
        if (!cancelled && res.data) {
          expirySubmitRef.current = false;
          setTest(res.data);
          setTimeLeft(res.data.timeLimitSeconds ?? TEST_DURATION_SECONDS);
          const d = readDraft();
          if (d?.answers) setAnswers(d.answers);
          setDraftSavedAt(formatDraftLabel(d?.savedAt));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setTest(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleChange = (qid, key) => {
    setAnswers((prev) => ({ ...prev, [qid]: key }));
  };

  const handleSubmit = useCallback(
    async (isAuto = false) => {
      if (!test || submitting) return;
      if (submitted) return;
      setSubmitting(true);
      try {
        const payload = {
          answers: test.questions.map((q) => ({
            questionId: q.id,
            selectedKey: answers[q.id] || '',
          })),
        };
        const res = await http.post('/api/PlacementTest/submit', payload);
        setResult(res.data);
        setSubmitted(true);
        clearDraft();
        storage.set('needs_placement_test', false);
        setNeedsPlacementTest?.(false);
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD);
        }, 3000);
      } catch (e) {
        if (!isAuto) console.error(e);
      } finally {
        setSubmitting(false);
      }
    },
    [test, submitted, submitting, answers, navigate, setNeedsPlacementTest]
  );

  useEffect(() => {
    if (!test || submitted) return;
    if (timeLeft <= 0) {
      if (!expirySubmitRef.current) {
        expirySubmitRef.current = true;
        void handleSubmit(true);
      }
      return;
    }
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [test, timeLeft, submitted, handleSubmit]);

  const answeredCount = useMemo(() => {
    if (!test?.questions) return 0;
    return test.questions.filter((q) => answers[q.id]).length;
  }, [test, answers]);

  const saveDraft = useCallback(() => {
    if (!test || submitted) return;
    writeDraft(answers);
    setDraftSavedAt(
      new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    );
  }, [test, answers, submitted]);

  const scrollToTips = () => {
    document.getElementById('level-up-tips')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (loading) {
    return (
      <div className="level-up-page level-up-page--state">
        <p>Đang tải bài test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="level-up-page level-up-page--state">
        <p>Không tải được bài test.</p>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const urgent = timeLeft <= 60 && !submitted;
  const totalQ = test.questions?.length ?? test.totalQuestions;
  const minutesLimit = Math.round((test.timeLimitSeconds ?? TEST_DURATION_SECONDS) / 60);

  return (
    <div className="level-up-page">
      <LevelUpExamBar
        testTitle="Bài test phân trình độ"
        minutes={minutes}
        seconds={seconds}
        urgent={urgent}
        onHelpClick={scrollToTips}
      />

      <PlacementHero
        displayName={displayName}
        answeredCount={answeredCount}
        totalQuestions={totalQ}
        minutesLimit={minutesLimit}
      />

      <div className="level-up-grid">
        <div className="level-up-main">
          {test.questions.map((q, idx) => (
            <LevelUpQuestionCard key={q.id} question={q} index={idx} selectedKey={answers[q.id]} onSelect={handleChange} />
          ))}
        </div>
        <PlacementSidebar totalQuestions={totalQ} />
      </div>

      <LevelUpBottomBar
        onSaveDraft={saveDraft}
        onSubmit={() => handleSubmit(false)}
        draftSavedAt={draftSavedAt}
        submitting={submitting}
        submitted={submitted}
        disableSubmit={submitting}
      />

      {result ? (
        <div className="level-up-toast" role="status">
          <p>
            Bạn làm đúng {result.correctCount}/{result.totalCount} câu. Gợi ý trình độ: <strong>JLPT {result.levelLabel}</strong>
            . Đang chuyển về bảng điều khiển…
          </p>
        </div>
      ) : null}
    </div>
  );
}
