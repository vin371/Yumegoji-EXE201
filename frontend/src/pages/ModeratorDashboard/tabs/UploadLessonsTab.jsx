import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as FM from 'framer-motion';
import DOMPurify from 'dompurify';
import { SakuraRain } from '../components/SakuraRain';
import { ROUTES } from '../../../data/routes';
import http from '../../../api/client';
import {
  createLessonFromDraft,
  extractLessonPlainText,
  generateLessonDraft,
} from '../../../services/lessonImportService';

const MAX_IMPORT_FILE_MB = 20;
const MAX_IMPORT_FILE_BYTES = MAX_IMPORT_FILE_MB * 1024 * 1024;

const LS_LIB_V = 'yumegoji_mod_import_library_vocab';
const LS_LIB_G = 'yumegoji_mod_import_library_grammar';

function isSupportedDocFile(f) {
  if (!f?.name) return false;
  const n = f.name.toLowerCase();
  return n.endsWith('.pdf') || n.endsWith('.docx') || n.endsWith('.pptx');
}

function isImageFile(f) {
  return Boolean(f?.type?.startsWith('image/'));
}

/** Ưu tiên message từ API (kể cả ProblemDetails: title/detail/errors). */
function getApiErrorMessage(err, fallback) {
  const d = err?.response?.data;
  if (d == null) return err?.message || fallback;
  if (typeof d === 'string') return d;
  if (typeof d.message === 'string' && d.message) return d.message;
  if (typeof d.detail === 'string' && d.detail) return d.detail;
  if (typeof d.title === 'string' && d.title) {
    if (d.errors && typeof d.errors === 'object')
      return `${d.title} ${JSON.stringify(d.errors)}`;
    return d.title;
  }
  return err?.message || fallback;
}

function emptyDraft() {
  return {
    title: '',
    slugSuggestion: '',
    contentHtml: '',
    estimatedMinutes: 15,
    vocabulary: [],
    grammar: [],
    quiz: [],
  };
}

/** Đưa plain text thành HTML đơn giản (&lt;p&gt;). */
function plainTextToBasicHtml(text) {
  if (text == null || !String(text).trim()) return '<p></p>';
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const paragraphs = String(text)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return '<p></p>';
  return paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n');
}

/** Bỏ thẻ HTML trong câu hỏi/đáp án quiz (AI đôi khi nhét &lt;strong&gt;). */
function stripHtmlToPlain(s) {
  if (s == null) return '';
  const str = String(s);
  if (typeof document === 'undefined') return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const el = document.createElement('div');
  el.innerHTML = str;
  const t = (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  return t;
}

function normalizeAiDraft(d) {
  if (!d) return d;
  const quiz = (d.quiz || []).map((q) => ({
    ...q,
    question: stripHtmlToPlain(q.question),
    options: (q.options || []).map((o) => stripHtmlToPlain(o)),
  }));
  return { ...d, quiz };
}

function mapDraftToCreatePayload(draft, categoryId, overrides) {
  const title = overrides.title?.trim() || draft.title || 'Bài học';
  const slug = overrides.slug?.trim() || draft.slugSuggestion || 'bai-hoc';
  const content = overrides.content ?? draft.contentHtml ?? '';
  const estimatedMinutes = Number(overrides.estimatedMinutes) || draft.estimatedMinutes || 15;

  const vocabulary = (draft.vocabulary || [])
    .filter((v) => v.wordJp?.trim())
    .map((v) => ({
      wordJp: v.wordJp.trim(),
      reading: v.reading || null,
      meaningVi: v.meaningVi || null,
    }));

  const grammar = (draft.grammar || [])
    .filter((g) => g.pattern?.trim())
    .map((g) => ({
      pattern: g.pattern.trim(),
      meaningVi: g.meaningVi || null,
      exampleSentences:
        Array.isArray(g.examples) && g.examples.length
          ? g.examples.filter(Boolean).join('\n')
          : null,
    }));

  const quiz = (draft.quiz || [])
    .filter((q) => q.question?.trim() && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => {
      const options = q.options.map((o) => String(o || '').trim()).filter(Boolean);
      let correctIndex = Number(q.correctIndex);
      if (!Number.isFinite(correctIndex)) correctIndex = 0;
      if (options.length) correctIndex = Math.min(Math.max(0, correctIndex), options.length - 1);
      return { question: q.question.trim(), options, correctIndex };
    })
    .filter((q) => q.options.length >= 2);

  return {
    categoryId: Number(categoryId),
    title,
    slug,
    content,
    estimatedMinutes,
    isPublished: Boolean(overrides.isPublished),
    vocabulary: vocabulary.length ? vocabulary : null,
    grammar: grammar.length ? grammar : null,
    quiz: quiz.length ? quiz : null,
  };
}

export function UploadLessonsTab() {
  const inputRef = useRef(null);
  const [imgPreviewUrl, setImgPreviewUrl] = useState('');
  const [file, setFile] = useState(null);
  const [pastedContent, setPastedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  /** Sau khi Lưu thành công — hiện link sang /learn/:slug */
  const [savedLearnSlug, setSavedLearnSlug] = useState('');
  const [savedWasPublished, setSavedWasPublished] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const [levels, setLevels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levelId, setLevelId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [focusVocab, setFocusVocab] = useState(true);
  const [focusGrammar, setFocusGrammar] = useState(true);
  const [focusReading, setFocusReading] = useState(false);
  const [insightTab, setInsightTab] = useState('vocab');
  const [libToast, setLibToast] = useState('');
  const [docLayoutHorizontal, setDocLayoutHorizontal] = useState(false);
  const editorAnchorRef = useRef(null);

  const [extractedPreview, setExtractedPreview] = useState('');
  const [aiWarning, setAiWarning] = useState('');
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [isPublished, setIsPublished] = useState(false);

  const htmlPreviewSanitized = useMemo(() => {
    if (!contentHtml?.trim()) return '';
    return DOMPurify.sanitize(contentHtml, { USE_PROFILES: { html: true } });
  }, [contentHtml]);

  const derivedLessonKind = useMemo(() => {
    const n = (focusVocab ? 1 : 0) + (focusGrammar ? 1 : 0) + (focusReading ? 1 : 0);
    if (n === 1) {
      if (focusVocab) return 'vocabulary';
      if (focusGrammar) return 'grammar';
      return 'reading';
    }
    return 'auto';
  }, [focusVocab, focusGrammar, focusReading]);

  const activeJlpt = useMemo(() => {
    const l = levels.find((x) => String(x.id ?? x.Id) === String(levelId));
    return String(l?.code ?? l?.Code ?? '').toUpperCase() || '';
  }, [levels, levelId]);

  const selectedLevelCode = useMemo(() => activeJlpt || '—', [activeJlpt]);

  const displaySourceText = useMemo(() => {
    const t = (extractedPreview || pastedContent || '').trim();
    if (!t) return '';
    if (t.length > 12000) return `${t.slice(0, 12000)}\n…`;
    return t;
  }, [extractedPreview, pastedContent]);

  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setImgPreviewUrl('');
      return undefined;
    }
    const u = URL.createObjectURL(file);
    setImgPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (!libToast) return undefined;
    const t = setTimeout(() => setLibToast(''), 3200);
    return () => clearTimeout(t);
  }, [libToast]);

  useEffect(() => {
    http
      .get('/api/levels')
      .then((r) => setLevels(r.data || []))
      .catch(() => setLevels([]));
  }, []);

  useEffect(() => {
    if (!levelId) {
      setCategories([]);
      setCategoryId('');
      return;
    }
    http
      .get('/api/lesson-categories', { params: { levelId } })
      .then((r) => setCategories(r.data || []))
      .catch(() => setCategories([]));
  }, [levelId]);

  const validateAndSetFile = useCallback((f) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_IMPORT_FILE_BYTES) {
      setError(`Tệp quá lớn — tối đa ${MAX_IMPORT_FILE_MB}MB.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError('');
    setFile(f);
  }, []);

  const onPick = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      validateAndSetFile(f ?? null);
    },
    [validateAndSetFile],
  );

  const onDropZoneDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(true);
  }, []);

  const onDropZoneDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);
  }, []);

  const onDropZoneDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      validateAndSetFile(f);
    },
    [validateAndSetFile],
  );

  const selectJlptCode = useCallback(
    (code) => {
      const up = String(code).toUpperCase();
      const found = levels.find((l) => String(l.code ?? l.Code ?? '').toUpperCase() === up);
      if (found) {
        setLevelId(String(found.id ?? found.Id));
        setCategoryId('');
      }
    },
    [levels],
  );

  const saveVocabToLibrary = useCallback((row) => {
    try {
      const cur = JSON.parse(localStorage.getItem(LS_LIB_V) || '[]');
      const item = { ...row, at: Date.now() };
      const next = [item, ...cur.filter((x) => (x.wordJp || '') !== (row.wordJp || ''))].slice(0, 400);
      localStorage.setItem(LS_LIB_V, JSON.stringify(next));
      setLibToast('Đã lưu từ vào Kho (trình duyệt).');
    } catch {
      setLibToast('Không ghi được kho nội bộ.');
    }
  }, []);

  const saveGrammarToLibrary = useCallback((row) => {
    try {
      const cur = JSON.parse(localStorage.getItem(LS_LIB_G) || '[]');
      const item = { ...row, at: Date.now() };
      const next = [item, ...cur.filter((x) => (x.pattern || '') !== (row.pattern || ''))].slice(0, 400);
      localStorage.setItem(LS_LIB_G, JSON.stringify(next));
      setLibToast('Đã lưu mẫu ngữ pháp vào Kho (trình duyệt).');
    } catch {
      setLibToast('Không ghi được kho nội bộ.');
    }
  }, []);

  const scrollToLessonEditor = useCallback(() => {
    editorAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const runExtractNoAi = async () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    const text = pastedContent.trim();
    const docFile = file && isSupportedDocFile(file) ? file : null;
    if (!docFile && !text) {
      setError('Chọn file PDF / DOCX / PPTX hoặc dán nội dung.');
      return;
    }

    setExtracting(true);
    try {
      const res = await extractLessonPlainText({ file: docFile, text });
      const html = plainTextToBasicHtml(res.plainText || '');
      setDraft({ ...emptyDraft(), contentHtml: html });
      setTitle('');
      setSlug('');
      setContentHtml(html);
      setEstimatedMinutes(15);
      setExtractedPreview(res.preview || '');
      setAiWarning(res.warning || '');
      setSuccess('Đã trích văn bản (không AI). Chỉnh tiêu đề, slug, HTML và quiz rồi Lưu.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi trích văn bản');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setExtracting(false);
    }
  };

  const startManualNoAi = () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    setExtractedPreview('');
    const initial = { ...emptyDraft(), contentHtml: '<p></p>' };
    setDraft(initial);
    setTitle('');
    setSlug('');
    setContentHtml('<p></p>');
    setEstimatedMinutes(15);
    setSuccess('Soạn bài thủ công — điền nội dung và (tuỳ chọn) quiz, rồi Lưu.');
  };

  const runAi = async () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    setDraft(null);
    setExtractedPreview('');

    const text = pastedContent.trim();
    const docFile = file && isSupportedDocFile(file) ? file : null;
    if (!docFile && !text) {
      if (file && isImageFile(file)) {
        setError(
          'Ảnh không trích chữ tự động. Hãy dán văn bản tiếng Nhật (OCR) vào ô bên trái, hoặc dùng PDF/DOCX/PPTX.',
        );
      } else {
        setError('Chọn file PDF / DOCX / PPTX hoặc dán nội dung vào ô bên trái.');
      }
      return;
    }

    setLoading(true);
    try {
      const res = await generateLessonDraft({ file: docFile, text, lessonKind: derivedLessonKind });
      setExtractedPreview(res.extractedPreview || '');
      setAiWarning(res.warning || '');
      const d = normalizeAiDraft(res.draft);
      setDraft(d);
      setTitle(d.title || '');
      setSlug(d.slugSuggestion || '');
      setContentHtml(d.contentHtml || '');
      setEstimatedMinutes(d.estimatedMinutes || 15);
      setSuccess('Đã sinh bản nháp — kiểm tra và chỉnh trước khi lưu.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi gọi AI');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const addQuizRow = useCallback(() => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = [...(d.quiz || []), { question: '', options: ['', '', '', ''], correctIndex: 0 }];
      return { ...d, quiz };
    });
  }, []);

  const removeQuizRow = useCallback((index) => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = (d.quiz || []).filter((_, i) => i !== index);
      return { ...d, quiz };
    });
  }, []);

  const patchQuiz = useCallback((index, patch) => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = [...(d.quiz || [])];
      quiz[index] = { ...quiz[index], ...patch };
      return { ...d, quiz };
    });
  }, []);

  const patchQuizOption = useCallback((qIndex, optIndex, value) => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = [...(d.quiz || [])];
      const row = quiz[qIndex];
      if (!row) return d;
      const options = [...(row.options || [])];
      options[optIndex] = value;
      quiz[qIndex] = { ...row, options };
      return { ...d, quiz };
    });
  }, []);

  const patchVocab = useCallback((index, patch) => {
    setDraft((d) => {
      if (!d) return d;
      const vocabulary = [...(d.vocabulary || [])];
      vocabulary[index] = { ...vocabulary[index], ...patch };
      return { ...d, vocabulary };
    });
  }, []);

  const patchGrammar = useCallback((index, patch) => {
    setDraft((d) => {
      if (!d) return d;
      const grammar = [...(d.grammar || [])];
      grammar[index] = { ...grammar[index], ...patch };
      return { ...d, grammar };
    });
  }, []);

  const saveLesson = async () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    if (!categoryId) {
      setError('Chọn cấp độ và danh mục bài học.');
      return;
    }
    if (!draft) {
      setError('Chưa có dữ liệu — dùng «Bắt đầu quét», hoặc tuỳ chọn nâng cao bên dưới.');
      return;
    }

    setSaving(true);
    try {
      const draftForSave = { ...draft, contentHtml };
      const payload = mapDraftToCreatePayload(draftForSave, categoryId, {
        title,
        slug,
        content: contentHtml,
        estimatedMinutes,
        isPublished,
      });
      await createLessonFromDraft(payload);
      setSuccess('Đã lưu bài học vào database.');
      setSavedLearnSlug(payload.slug);
      setSavedWasPublished(Boolean(isPublished));
      setDraft(null);
      setFile(null);
      setPastedContent('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi lưu');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || extracting;

  const jlptCodes = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const scannerAnimating = busy || Boolean(displaySourceText.trim());
  const insightTotal =
    draft != null
      ? insightTab === 'vocab'
        ? draft.vocabulary?.length ?? 0
        : draft.grammar?.length ?? 0
      : 0;

  const systemBadgeClass =
    error && !draft
      ? 'mod-import__badge mod-import__badge--err'
      : busy
        ? 'mod-import__badge mod-import__badge--busy'
        : 'mod-import__badge mod-import__badge--ok';
  const systemBadgeText =
    error && !draft ? 'CẦN KIỂM TRA' : busy ? 'ĐANG XỬ LÝ' : 'HỆ THỐNG SẴN SÀNG';

  return (
    <div className="mod-import mod-import--studio">
      <SakuraRain />
      <FM.motion.header
        className="mod-import__header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="mod-import__header-text">
          <h2>Import bài học</h2>
          <p>
            Studio 3 cột: tải tài liệu (PDF, DOCX, PPTX, ảnh xem trước) — xem văn bản nguồn với thanh quét — chỉnh từ vựng
            / ngữ pháp rồi lưu bài. Chọn JLPT, danh mục và trọng tâm nội dung trước khi lưu.
          </p>
        </div>
      </FM.motion.header>

      <p className="mod-import__notice">
        <strong>Lưu ý:</strong> file chỉ dùng để <strong>trích chữ</strong> trên server — không lưu file gốc. «Lưu bài học»
        ghi HTML, từ vựng, ngữ pháp, quiz. Trang này <strong>không</strong> liệt kê bài — xem như học viên: menu{' '}
        <strong>Học tập</strong> → <strong>Bài từ hệ thống</strong> (thường cần tick <strong>Xuất bản ngay</strong>). Server
        dùng <strong>OpenAI</strong> hoặc <strong>Ollama</strong> (sinh có thể vài phút; tối đa ~48k ký tự văn bản).{' '}
        <strong>Ảnh</strong> không trích chữ — hãy dán nội dung OCR hoặc dùng PDF.
      </p>

      {error ? <div className="mod-dash__alert mod-dash__alert--err">{error}</div> : null}
      {success || savedLearnSlug ? (
        <div className="mod-dash__alert mod-dash__alert--ok mod-dash__alert--learn-hint">
          {success ? <p className="mod-dash__alert-p">{success}</p> : null}
          {savedLearnSlug ? (
            <div className="mod-dash__learn-hint-body">
              <p className="mod-dash__alert-p">
                <Link className="mod-dash__learn-link" to={`${ROUTES.LEARN}/${encodeURIComponent(savedLearnSlug)}`}>
                  → Mở bài trên trang Học tập
                </Link>{' '}
                <span className="mod-dash__muted">
                  (<code className="mod-dash__code">/learn/{savedLearnSlug}</code>)
                </span>
              </p>
              {savedWasPublished ? (
                <p className="mod-dash__muted mod-dash__alert-p">
                  Đã xuất bản: trong <strong>Học tập</strong> tìm mục <strong>Bài từ hệ thống</strong> (không nằm trong lộ
                  trình N5 tĩnh phía trên).
                </p>
              ) : (
                <p className="mod-dash__muted mod-dash__alert-p">
                  <strong>Chưa xuất bản</strong> — học viên và API danh sách bài <strong>không thấy</strong> bài này. Import
                  lại và tick «Xuất bản ngay» trước khi Lưu, hoặc bật publish trong quản trị nội dung.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mod-import-studio__shell">
        <div className="mod-import-studio__grid">
          <FM.motion.div
            className="mod-import-studio__col mod-import-studio__col--left"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <div className="mod-import-studio__glass mod-import-studio__glass--tight">
              <h4 className="mod-import-studio__section-title">Nguồn tài liệu</h4>
              <div
                role="button"
                tabIndex={0}
                className={`mod-import__drop mod-import-studio__drop${dropActive ? ' mod-import__drop--active' : ''}`}
                onDragOver={onDropZoneDragOver}
                onDragLeave={onDropZoneDragLeave}
                onDrop={onDropZoneDrop}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
              >
                <span className="mod-import__drop-icon" aria-hidden>
                  ☁️
                </span>
                <span className="mod-import__drop-title">Kéo thả tài liệu vào đây</span>
                <span className="mod-import__drop-hint">
                  PDF, DOCX, PPTX (trích chữ) · JPG/PNG (chỉ xem trước) · tối đa {MAX_IMPORT_FILE_MB}MB
                </span>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
                className="mod-dash__file-input"
                onChange={onPick}
              />
              <div className="mod-import__file-row">
                <button
                  type="button"
                  className="mod-dash__btn mod-dash__btn--primary mod-dash__btn--sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Chọn file
                </button>
                <span className="mod-import__file-name">
                  {file ? (
                    <>
                      Đã chọn: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
                    </>
                  ) : (
                    'Chưa chọn tệp'
                  )}
                </span>
              </div>
              <p className="mod-import-studio__hint-row">
                Slide chỉ ảnh: dán chữ vào ô bên dưới. Với ảnh, bắt buộc dán nội dung để AI xử lý.
              </p>
            </div>

            <div className="mod-import-studio__glass mod-import-studio__glass--tight">
              <h4 className="mod-import-studio__section-title">Cấp độ JLPT mục tiêu</h4>
              <div className="mod-import-studio__jlpt-row">
                {jlptCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`mod-import-studio__jlpt-btn${activeJlpt === code ? ' mod-import-studio__jlpt-btn--on' : ''}`}
                    onClick={() => selectJlptCode(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <div className="mod-import__field">
                <label htmlFor="mod-cat">Danh mục bài học</label>
                <select
                  id="mod-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={!levelId}
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id ?? c.Id} value={c.id ?? c.Id}>
                      {c.name ?? c.Name}
                    </option>
                  ))}
                </select>
              </div>

              <h4 className="mod-import-studio__section-title" style={{ marginTop: '0.75rem' }}>
                Trọng tâm nội dung (gợi ý AI)
              </h4>
              <div className="mod-import-studio__focus-list">
                <label className="mod-import-studio__focus-item">
                  <input type="checkbox" checked={focusVocab} onChange={(e) => setFocusVocab(e.target.checked)} />
                  Từ vựng
                </label>
                <label className="mod-import-studio__focus-item">
                  <input type="checkbox" checked={focusGrammar} onChange={(e) => setFocusGrammar(e.target.checked)} />
                  Ngữ pháp
                </label>
                <label className="mod-import-studio__focus-item">
                  <input type="checkbox" checked={focusReading} onChange={(e) => setFocusReading(e.target.checked)} />
                  Bài đọc
                </label>
              </div>
              <p className="mod-import-studio__hint-row">
                Một mục được chọn đơn độc → AI ưu tiên đúng loại đó; nhiều mục → <strong>AI tự cân bằng</strong> (auto).
              </p>

              <h4 className="mod-import-studio__section-title">Hoặc dán văn bản tiếng Nhật</h4>
              <textarea
                id="mod-lesson-paste"
                className="mod-import__paste"
                rows={6}
                placeholder="Nhập văn bản tiếng Nhật tại đây…"
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                spellCheck
              />

              {aiWarning ? <p className="mod-dash__muted mod-dash__ai-warning">{aiWarning}</p> : null}

              <details className="mod-import__advanced">
                <summary>Tuỳ chọn nâng cao (không AI)</summary>
                <div className="mod-import__advanced-body">
                  <div className="mod-dash__import-actions mod-dash__import-actions--split mod-dash__import-actions--nested">
                    <button type="button" className="mod-dash__btn mod-dash__btn--outline" disabled={busy} onClick={runExtractNoAi}>
                      {extracting ? 'Đang trích văn bản…' : 'Chỉ trích văn bản'}
                    </button>
                    <button type="button" className="mod-dash__btn mod-dash__btn--outline" disabled={busy} onClick={startManualNoAi}>
                      Soạn tay trên HTML trống
                    </button>
                  </div>
                </div>
              </details>

              <button type="button" className="mod-import-studio__scan-cta" disabled={busy} onClick={runAi}>
                {loading ? 'Đang trích & gọi AI…' : 'Bắt đầu quét'}
              </button>
            </div>
          </FM.motion.div>

          <FM.motion.div
            className="mod-import-studio__col mod-import-studio__col--center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div className="mod-import-studio__glass">
              <div className="mod-import-studio__preview-head">
                <h3>Xem trước tài liệu</h3>
                <span className={`mod-import-studio__pill${busy ? ' mod-import-studio__pill--pulse' : ''}`}>
                  {busy ? 'Đang quét…' : systemBadgeText}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm"
                  onClick={() => setDocLayoutHorizontal((v) => !v)}
                >
                  {docLayoutHorizontal ? 'Dọc (JP)' : 'Ngang'}
                </button>
              </div>
              <div className="mod-import-studio__doc-frame">
                {scannerAnimating ? (
                  <FM.motion.div
                    className="mod-import-studio__scanner"
                    initial={{ top: '12%' }}
                    animate={{
                      top: busy ? ['10%', '88%', '10%'] : ['14%', '72%', '14%'],
                    }}
                    transition={{
                      duration: busy ? 2.3 : 5.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ) : null}
                {imgPreviewUrl ? (
                  <img src={imgPreviewUrl} alt="Xem trước ảnh đã chọn" className="mod-import-studio__doc-img" />
                ) : displaySourceText ? (
                  <div className="mod-import-studio__doc-scroll">
                    <div
                      className={`mod-import-studio__doc-text${docLayoutHorizontal ? ' mod-import-studio__doc-text--horizontal' : ''}`}
                    >
                      {displaySourceText}
                    </div>
                  </div>
                ) : (
                  <div className="mod-import-studio__doc-empty">
                    <span style={{ fontSize: '2rem' }} aria-hidden>
                      🙈
                    </span>
                    <p>
                      Chưa có văn bản để hiển thị. Tải PDF/DOCX/PPTX, dán nội dung, rồi bấm <strong>Bắt đầu quét</strong>.
                    </p>
                  </div>
                )}
              </div>
              <p className="mod-import__tip" style={{ marginTop: '0.65rem' }}>
                <strong>Mẹo:</strong> văn bản nguồn rõ chữ giúp AI ổn định kana — luôn đối chiếu với tài liệu gốc.
              </p>
            </div>
          </FM.motion.div>

          <FM.motion.div
            className="mod-import-studio__col mod-import-studio__col--right"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <div className="mod-import-studio__glass" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <div className="mod-import-studio__insights-head">
                <h3>Kết quả AI</h3>
                <span className={systemBadgeClass} style={{ fontSize: '0.65rem' }}>
                  {draft ? `${draft.vocabulary?.length ?? 0} từ · ${draft.grammar?.length ?? 0} NP` : '—'}
                </span>
              </div>
              <div className="mod-import-studio__tabs">
                <button
                  type="button"
                  className={`mod-import-studio__tab${insightTab === 'vocab' ? ' mod-import-studio__tab--on' : ''}`}
                  onClick={() => setInsightTab('vocab')}
                >
                  Từ vựng
                </button>
                <button
                  type="button"
                  className={`mod-import-studio__tab${insightTab === 'grammar' ? ' mod-import-studio__tab--on' : ''}`}
                  onClick={() => setInsightTab('grammar')}
                >
                  Ngữ pháp
                </button>
              </div>

              <div className="mod-import-studio__insight-scroll">
                {!draft ? (
                  <div className="mod-import-studio__doc-empty" style={{ minHeight: '180px' }}>
                    <p>Chưa có bản nháp. Sau khi quét AI, từ vựng và ngữ pháp hiển thị tại đây.</p>
                  </div>
                ) : insightTab === 'vocab' ? (
                  (draft.vocabulary || []).length ? (
                    (draft.vocabulary || []).map((row, vi) => (
                      <FM.motion.div
                        key={vi}
                        className="mod-import-studio__insight-card"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(vi * 0.04, 0.35) }}
                      >
                        <span className="mod-import-studio__jlpt-tag">{selectedLevelCode}</span>
                        <input
                          className="mod-dash__input mod-import-studio__insight-kanji"
                          value={row.wordJp ?? ''}
                          onChange={(e) => patchVocab(vi, { wordJp: e.target.value })}
                          lang="ja"
                          aria-label="Từ tiếng Nhật"
                        />
                        <input
                          className="mod-dash__input"
                          value={row.reading ?? ''}
                          onChange={(e) => patchVocab(vi, { reading: e.target.value })}
                          lang="ja"
                          placeholder="Kana"
                        />
                        <input
                          className="mod-dash__input"
                          value={row.meaningVi ?? ''}
                          onChange={(e) => patchVocab(vi, { meaningVi: e.target.value })}
                          placeholder="Nghĩa tiếng Việt"
                        />
                        <div className="mod-import-studio__insight-actions">
                          <button type="button" className="mod-import-studio__btn-lib" onClick={() => saveVocabToLibrary(row)}>
                            Library
                          </button>
                          <button type="button" className="mod-import-studio__btn-lesson" onClick={scrollToLessonEditor}>
                            + Lesson
                          </button>
                        </div>
                      </FM.motion.div>
                    ))
                  ) : (
                    <p className="mod-dash__muted">Chưa có mục từ vựng.</p>
                  )
                ) : (draft.grammar || []).length ? (
                  (draft.grammar || []).map((g, gi) => (
                    <FM.motion.div
                      key={gi}
                      className="mod-import-studio__insight-card"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(gi * 0.04, 0.35) }}
                    >
                      <span className="mod-import-studio__jlpt-tag">{selectedLevelCode}</span>
                      <input
                        className="mod-dash__input"
                        value={g.pattern ?? ''}
                        onChange={(e) => patchGrammar(gi, { pattern: e.target.value })}
                        lang="ja"
                        placeholder="Mẫu ngữ pháp"
                      />
                      <input
                        className="mod-dash__input"
                        value={g.meaningVi ?? ''}
                        onChange={(e) => patchGrammar(gi, { meaningVi: e.target.value })}
                        placeholder="Giải thích (VI)"
                      />
                      <div className="mod-import-studio__insight-actions">
                        <button type="button" className="mod-import-studio__btn-lib" onClick={() => saveGrammarToLibrary(g)}>
                          Library
                        </button>
                        <button type="button" className="mod-import-studio__btn-lesson" onClick={scrollToLessonEditor}>
                          + Lesson
                        </button>
                      </div>
                    </FM.motion.div>
                  ))
                ) : (
                  <p className="mod-dash__muted">Chưa có mục ngữ pháp.</p>
                )}
              </div>

              <div className="mod-import-studio__footer-cta">
                <button type="button" disabled={!draft} onClick={scrollToLessonEditor}>
                  Soạn và lưu bài học{draft ? ` (${insightTotal} mục đang xem)` : ''} →
                </button>
              </div>
            </div>
          </FM.motion.div>

          {draft ? (
            <FM.motion.div
              ref={editorAnchorRef}
              className="mod-import-studio__editor-span mod-import-studio__glass"
              id="mod-import-draft"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {extractedPreview ? (
                <details className="mod-dash__details" style={{ marginBottom: '0.75rem' }}>
                  <summary>Văn bản đã trích (đầy đủ hơn có thể rất dài)</summary>
                  <pre className="mod-dash__preview-pre">{extractedPreview}</pre>
                </details>
              ) : null}

              <div className="mod-dash__draft-box mod-dash__draft-box--in-panel" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <h4 className="mod-dash__upload-card-title">Chỉnh trước khi lưu</h4>
                <label className="mod-dash__paste-label">
                  Tiêu đề
                  <input className="mod-dash__input" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
                <label className="mod-dash__paste-label">
                  Slug (URL, Latin, không dấu)
                  <input className="mod-dash__input" value={slug} onChange={(e) => setSlug(e.target.value)} />
                </label>
                <label className="mod-dash__paste-label">
                  Ước lượng phút
                  <input
                    type="number"
                    min={1}
                    max={240}
                    className="mod-dash__input mod-dash__input--narrow"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 15)}
                  />
                </label>
                <label className="mod-dash__paste-label">
                  Nội dung (HTML — mã nguồn)
                  <textarea
                    className="mod-dash__paste-area mod-dash__paste-area--html"
                    rows={10}
                    value={contentHtml}
                    onChange={(e) => setContentHtml(e.target.value)}
                    spellCheck={false}
                  />
                </label>

                <details className="mod-dash__format-help">
                  <summary>Định dạng HTML — giải thích &amp; ví dụ (bấm mở)</summary>
                  <div className="mod-dash__format-help-body">
                    <p>
                      Ô phía trên là <strong>mã HTML</strong> nên bạn vẫn thấy thẻ <code>&lt;p&gt;</code>,{' '}
                      <code>&lt;strong&gt;</code>… — đó là bình thường khi soạn. Trang học viên sẽ{' '}
                      <strong>render</strong> thành chữ đẹp; dùng khối <strong>«Xem trưới»</strong> ngay dưới để hình dung.
                    </p>
                    <p>
                      <strong>Mẫu A — một dòng</strong> (từ/kanji + đọc trong ngoặc kiểu Nhật + nghĩa tiếng Việt):
                    </p>
                    <pre className="mod-dash__format-example" tabIndex={0}>
                      <code>{"<p><strong>見る</strong>（みる）— xem, nhìn</p>"}</code>
                    </pre>
                    <p>
                      <strong>Mẫu B — ba dòng</strong> (dòng 1: từ Nhật, dòng 2: chỉ kana, dòng 3: nghĩa Việt):
                    </p>
                    <pre className="mod-dash__format-example" tabIndex={0}>
                      <code>{`<p><strong>勉強</strong></p>
<p>べんきょう</p>
<p>học, ôn bài</p>`}</code>
                    </pre>
                    <p className="mod-dash__format-warn">
                      Cụm «(1) từ/kanji, (2) kana, (3) nghĩa» trong hướng dẫn cũ chỉ là <strong>mô tả vai trò từng dòng</strong>{' '}
                      của mẫu B — <strong>không</strong> phải câu cần chép vào bài. AI đôi khi sinh HTML rối (vd tách{' '}
                      <code>&lt;em&gt;(</code>…); server đã cấm trong prompt và bạn có thể sửa tay theo mẫu A hoặc B.
                    </p>
                  </div>
                </details>

                {htmlPreviewSanitized ? (
                  <div className="mod-dash__html-preview-wrap">
                    <div className="mod-dash__html-preview-head">Xem trước (gần giống học viên)</div>
                    <div
                      className="mod-dash__html-preview-body mod-dash__prose-tiny"
                      dangerouslySetInnerHTML={{ __html: htmlPreviewSanitized }}
                    />
                  </div>
                ) : null}

                <p className="mod-dash__muted mod-dash__html-structure-hint">
                  Luôn đối chiếu kana/kanji với tài liệu gốc trước khi lưu (vd <strong>あ</strong> không được thành{' '}
                  <strong>か</strong>).
                </p>
                <label className="mod-dash__import-check">
                  <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                  Xuất bản ngay (học viên thấy trên API public)
                </label>
                <p className="mod-dash__muted mod-dash__publish-hint">
                  <strong>Không tick</strong> thì bài chỉ là bản nháp: <code>/api/lessons</code> và sidebar trang{' '}
                  <strong>Học tập</strong> sẽ <strong>không</strong> liệt kê bài này. Muốn học viên thấy — bật tick trước khi
                  Lưu (hoặc publish sau trong quản trị nội dung).
                </p>

                <div className="mod-dash__quiz-block">
                  <h4 className="mod-dash__quiz-block-title">Quiz trắc nghiệm</h4>
                  <p className="mod-dash__muted mod-dash__quiz-hint">
                    Mỗi câu cần ít nhất 2 đáp án không trống. Chỉ nhập <strong>chữ thuần</strong> (không thẻ HTML); nếu AI
                    trả <code>&lt;strong&gt;…</code> thì đã được làm sạch khi tải bản nháp.
                  </p>
                  {(draft.quiz || []).map((q, qi) => (
                    <div key={qi} className="mod-dash__quiz-row">
                      <div className="mod-dash__quiz-row-head">
                        <span>Câu {qi + 1}</span>
                        <button
                          type="button"
                          className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm"
                          onClick={() => removeQuizRow(qi)}
                        >
                          Xóa câu
                        </button>
                      </div>
                      <input
                        className="mod-dash__input"
                        placeholder="Nội dung câu hỏi"
                        value={q.question || ''}
                        onChange={(e) => patchQuiz(qi, { question: e.target.value })}
                      />
                      <div className="mod-dash__quiz-options">
                        {(q.options || ['', '', '', '']).map((opt, oi) => (
                          <input
                            key={oi}
                            className="mod-dash__input"
                            placeholder={`Đáp án ${oi + 1}`}
                            value={opt}
                            onChange={(e) => patchQuizOption(qi, oi, e.target.value)}
                          />
                        ))}
                      </div>
                      <label className="mod-dash__import-label mod-dash__import-label--inline">
                        Đáp án đúng (0–3 tương ứng ô trên)
                        <select
                          className="mod-dash__select mod-dash__select--narrow"
                          value={Math.min(3, Math.max(0, Number(q.correctIndex) || 0))}
                          onChange={(e) => patchQuiz(qi, { correctIndex: Number(e.target.value) })}
                        >
                          <option value={0}>1</option>
                          <option value={1}>2</option>
                          <option value={2}>3</option>
                          <option value={3}>4</option>
                        </select>
                      </label>
                    </div>
                  ))}
                  <button type="button" className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm" onClick={addQuizRow}>
                    + Thêm câu hỏi
                  </button>
                </div>

                <button
                  type="button"
                  className="mod-dash__btn mod-dash__btn--primary"
                  disabled={saving || !categoryId}
                  onClick={saveLesson}
                >
                  {saving ? 'Đang lưu…' : 'Lưu bài học vào database'}
                </button>
              </div>
            </FM.motion.div>
          ) : null}
        </div>
      </div>

      <FM.AnimatePresence>
        {libToast ? (
          <FM.motion.div
            key="lib-toast"
            className="mod-import-studio__toast"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {libToast}
          </FM.motion.div>
        ) : null}
      </FM.AnimatePresence>
    </div>
  );
}
