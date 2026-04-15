import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { useAuth } from '../../hooks/useAuth';
import http from '../../api/client';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import { isStaffUser } from '../../utils/roles';
import { LEVEL_UP_DRAFT_PREFIX } from './constants';
import { LevelUpExamBar } from './LevelUpExamBar';
import { LevelUpHero } from './LevelUpHero';
import { LevelUpQuestionCard } from './LevelUpQuestionCard';
import { LevelUpSidebar } from './LevelUpSidebar';
import { LevelUpBottomBar } from './LevelUpBottomBar';

const TEST_DURATION_SECONDS = 20 * 60;

function readDraft(testId) {
  try {
    const raw = localStorage.getItem(`${LEVEL_UP_DRAFT_PREFIX}${testId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.answers !== 'object') return null;
    return { answers: data.answers, savedAt: data.savedAt || null };
  } catch {
    return null;
  }
}

function writeDraft(testId, answers) {
  const payload = JSON.stringify({
    answers,
    savedAt: new Date().toISOString(),
  });
  localStorage.setItem(`${LEVEL_UP_DRAFT_PREFIX}${testId}`, payload);
}

function clearDraft(testId) {
  localStorage.removeItem(`${LEVEL_UP_DRAFT_PREFIX}${testId}`);
}

/** Trả về { answers, draftLabel } từ localStorage để hydrate state sau khi load đề */
function hydrateFromDraft(testId) {
  const d = readDraft(testId);
  if (!d?.answers) return { answers: {}, draftLabel: null };
  let draftLabel = null;
  if (d.savedAt) {
    try {
      const dt = new Date(d.savedAt);
      if (Number.isFinite(dt.getTime())) {
        draftLabel = dt.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        });
      }
    } catch {
      draftLabel = null;
    }
  }
  return { answers: d.answers, draftLabel };
}

function applyTestToState(resData, cancelled, refs, setters) {
  if (cancelled || !setters) return;
  const t = resData;
  refs.expirySubmitRef.current = false;
  setters.setTest(t);
  setters.setTimeLeft(t?.timeLimitSeconds ?? TEST_DURATION_SECONDS);
  if (!t?.testId) {
    setters.setAnswers({});
    setters.setDraftSavedAt(null);
    return;
  }
  const { answers: draftAnswers, draftLabel } = hydrateFromDraft(t.testId);
  setters.setAnswers(draftAnswers);
  setters.setDraftSavedAt(draftLabel);
}

export default function LevelUpTest() {
  const { toLevel } = useParams();
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
  const { user } = useAuth();

  const displayName = user?.displayName || user?.username || user?.name || user?.email || 'bạn';

  useEffect(() => {
    if (isStaffUser(user)) {
      navigate(getPostLoginRoute(user, ROUTES.DASHBOARD), { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (isStaffUser(user)) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await http.get('/api/LevelUpTest', { params: { toLevel } });
        applyTestToState(res.data, cancelled, { expirySubmitRef }, { setTest, setTimeLeft, setAnswers, setDraftSavedAt });
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
  }, [toLevel, user]);

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
          testId: test.testId,
          answers: test.questions.map((q) => ({
            questionId: q.id,
            selectedKey: answers[q.id] || '',
          })),
        };
        const res = await http.post('/api/LevelUpTest/submit', payload);
        setResult(res.data);
        setSubmitted(true);
        clearDraft(test.testId);
        setTimeout(() => {
          navigate(ROUTES.CHAT);
        }, 3000);
      } catch (e) {
        if (!isAuto) {
          console.error(e);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [test, submitted, submitting, answers, navigate]
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
    writeDraft(test.testId, answers);
    const now = new Date();
    setDraftSavedAt(
      now.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    );
  }, [test, answers, submitted]);

  const scrollToTips = () => {
    document.getElementById('level-up-tips')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (loading) {
    return (
      <div className="level-up-page level-up-page--state">
        <p>Đang tải bài thi nâng level...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="level-up-page level-up-page--state">
        <p>Chưa có bài thi nâng level phù hợp. Hỏi moderator để tạo đề.</p>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const urgent = timeLeft <= 60 && !submitted;

  return (
    <div className="level-up-page">
      <LevelUpExamBar
        testTitle={test.title}
        minutes={minutes}
        seconds={seconds}
        urgent={urgent}
        onHelpClick={scrollToTips}
      />

      <LevelUpHero
        displayName={displayName}
        description={test.description}
        answeredCount={answeredCount}
        totalQuestions={test.questions.length}
        fromLevel={test.fromLevel}
        toLevel={test.toLevel}
      />

      <div className="level-up-grid">
        <div className="level-up-main">
          {test.questions.map((q, idx) => (
            <LevelUpQuestionCard
              key={q.id}
              question={q}
              index={idx}
              selectedKey={answers[q.id]}
              onSelect={handleChange}
            />
          ))}
        </div>
        <LevelUpSidebar
          toLevel={test.toLevel}
          totalQuestions={test.questions.length}
          passScore={test.passScore}
          totalPoints={test.totalPoints}
        />
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
            Bạn đạt {result.score}/{result.maxScore} điểm. {result.isPassed ? 'Đậu — chuyển tới chat sau vài giây.' : 'Chưa đạt yêu cầu.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
