import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as FM from 'framer-motion';
import { SakuraRain } from '../components/SakuraRain';
import { sanitizeLessonBodyHtml } from '../../../utils/lessonContentHtml';
import { ROUTES } from '../../../data/routes';
import http, { ENV } from '../../../api/client';
import {
  createLessonFromDraft,
  deleteStaffLesson,
  extractLessonPlainText,
  fetchStaffLessonFull,
  generateLessonDraft,
  updateLessonFromDraft,
  uploadLessonDocumentFile,
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

function isPdfFile(f) {
  return Boolean(f?.name?.toLowerCase().endsWith('.pdf'));
}

function isOfficeNativePreviewFile(f) {
  if (!f?.name) return false;
  const n = f.name.toLowerCase();
  return n.endsWith('.docx') || n.endsWith('.pptx');
}

function isImageFile(f) {
  return Boolean(f?.type?.startsWith('image/'));
}

/** Tách văn bản trích theo marker `--- Slide N ---` (PPTX). */
function splitIntoSlides(text) {
  const t = String(text || '').replace(/\r\n/g, '\n');
  const re = /^---\s*Slide\s+(\d+)\s*---\s*$/gim;
  const matches = [...t.matchAll(re)];
  if (!matches.length) {
    const b = t.trim();
    return b ? [{ slideNum: 1, body: b }] : [];
  }
  const slides = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : t.length;
    const body = t.slice(start, end).trim();
    const n = Number(matches[i][1], 10) || i + 1;
    slides.push({ slideNum: n, body });
  }
  if (matches[0].index > 0) {
    const pre = t.slice(0, matches[0].index).trim();
    if (pre) {
      slides[0] = { ...slides[0], body: `${pre}\n${slides[0].body}`.trim() };
    }
  }
  return slides;
}

/** Mỗi dòng slide: ưu tiên `A / B` hoặc tab. */
function parseSlideRows(body) {
  return String(body || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const slash = line.split(/\s*\/\s+/);
      if (slash.length >= 2) {
        return { jp: slash[0].trim(), vi: slash.slice(1).join(' / ').trim(), raw: line };
      }
      const tabs = line.split('\t');
      if (tabs.length >= 2) {
        return { jp: tabs[0].trim(), vi: tabs.slice(1).join(' ').trim(), raw: line };
      }
      return { jp: line, vi: '', raw: line };
    });
}

/** Tiêu đề slide + các dòng làm lưới badge (ưu tiên dòng có nghĩa VI). */
function slideTopicAndBadgeRows(body, slideNum) {
  const rows = parseSlideRows(body);
  if (!rows.length) {
    return { topic: `Slide ${slideNum}`, badgeRows: [], allRows: [] };
  }
  let topic = rows[0].jp.trim();
  if (topic.length > 32) topic = `${topic.slice(0, 30)}…`;
  const withVi = rows.filter((r) => r.vi);
  const badgeRows =
    withVi.length > 0 ? withVi.slice(0, 24) : rows.slice(1, Math.min(rows.length, 20)).filter((r) => r.jp);
  return { topic, badgeRows, allRows: rows };
}

function readingIllustrationUrl(seed) {
  const s = encodeURIComponent(String(seed || 'yume').slice(0, 40));
  return `https://picsum.photos/seed/${s}-read/720/300`;
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
    kanji: [],
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

/** URL đầy đủ tới file trong wwwroot (frontend/API khác origin → cần VITE_API_URL). */
function hrefForLessonUpload(relativePath) {
  const p = String(relativePath || '').trim();
  const path = p.startsWith('/') ? p : `/${p}`;
  if (ENV.API_URL) return `${ENV.API_URL}${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) return `${window.location.origin}${path}`;
  return path;
}

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Slug URL an toàn + hậu tố ngắn để tránh trùng slug mặc định «bai-hoc». */
function slugSuggestionFromFileName(fileName) {
  const withExt = String(fileName || 'tai-lieu').trim() || 'tai-lieu';
  const noExt = withExt.replace(/\.[^.]+$/i, '').trim() || 'tai-lieu';
  const ascii = noExt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const base = ascii || 'tai-lieu';
  return `${base}-${Date.now().toString(36)}`;
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
  return { ...d, quiz, kanji: Array.isArray(d.kanji) ? d.kanji : [] };
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

  const kanji = (draft.kanji || [])
    .filter((k) => k.character?.trim())
    .map((k) => ({
      character: k.character.trim(),
      readingsOn: k.readingsOn?.trim() || null,
      readingsKun: k.readingsKun?.trim() || null,
      meaningVi: k.meaningVi?.trim() || null,
      meaningEn: k.meaningEn?.trim() || null,
      strokeCount: k.strokeCount != null && k.strokeCount !== '' ? Number(k.strokeCount) : null,
      jlptLevel: k.jlptLevel?.trim() || null,
    }));

  return {
    categoryId: Number(categoryId),
    title,
    slug,
    content,
    estimatedMinutes,
    isPublished: Boolean(overrides.isPublished),
    vocabulary: vocabulary.length ? vocabulary : null,
    grammar: grammar.length ? grammar : null,
    kanji: kanji.length ? kanji : null,
    quiz: quiz.length ? quiz : null,
  };
}

/** Đổ API staff (LessonFullDetailDto) vào state form import. */
function lessonFullToDraft(full) {
  const L = full?.lesson ?? full?.Lesson;
  if (!L) return null;
  const voc = full?.vocabulary ?? full?.Vocabulary ?? [];
  const gram = full?.grammar ?? full?.Grammar ?? [];
  const kj = full?.kanji ?? full?.Kanji ?? [];
  const qz = full?.quiz ?? full?.Quiz ?? [];

  const padQuizOptions = (opts) => {
    const a = Array.isArray(opts) ? opts.map((o) => String(o ?? '')) : [];
    while (a.length < 4) a.push('');
    return a.slice(0, 8);
  };

  return {
    lessonMeta: {
      id: L.id ?? L.Id,
      categoryId: L.categoryId ?? L.CategoryId,
      levelId: L.levelId ?? L.LevelId,
      isPublished: Boolean(L.isPublished ?? L.IsPublished),
    },
    draft: {
      title: L.title ?? L.Title ?? '',
      slugSuggestion: L.slug ?? L.Slug ?? '',
      contentHtml: L.content ?? L.Content ?? '<p></p>',
      estimatedMinutes: Number(L.estimatedMinutes ?? L.EstimatedMinutes) || 15,
      vocabulary: voc.map((v) => ({
        wordJp: v.wordJp ?? v.WordJp ?? '',
        reading: v.reading ?? v.Reading ?? '',
        meaningVi: v.meaningVi ?? v.MeaningVi ?? '',
      })),
      grammar: gram.map((g) => {
        const ex = g.exampleSentences ?? g.ExampleSentences;
        const examples =
          typeof ex === 'string' && ex.trim()
            ? ex
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        return {
          pattern: g.pattern ?? g.Pattern ?? '',
          meaningVi: g.meaningVi ?? g.MeaningVi ?? '',
          examples,
        };
      }),
      kanji: kj.map((k) => ({
        character: k.character ?? k.Character ?? '',
        readingsOn: k.readingsOn ?? k.ReadingsOn ?? '',
        readingsKun: k.readingsKun ?? k.ReadingsKun ?? '',
        meaningVi: k.meaningVi ?? k.MeaningVi ?? '',
        meaningEn: k.meaningEn ?? k.MeaningEn ?? '',
        strokeCount: k.strokeCount ?? k.StrokeCount ?? '',
        jlptLevel: k.jlptLevel ?? k.JlptLevel ?? '',
      })),
      quiz: qz.map((q) => ({
        question: q.question ?? q.Question ?? '',
        options: padQuizOptions(q.options ?? q.Options),
        correctIndex: Number(q.correctIndex ?? q.CorrectIndex) || 0,
      })),
    },
  };
}

export function UploadLessonsTab({ initialStaffLessonId = null, onConsumedInitialStaffLesson } = {}) {
  const inputRef = useRef(null);
  const previewColumnRef = useRef(null);
  const [imgPreviewUrl, setImgPreviewUrl] = useState('');
  /** Blob URL — trình duyệt xem PDF ngay sau khi chọn file (không cần chờ server). */
  const [pdfObjectUrl, setPdfObjectUrl] = useState('');
  const [file, setFile] = useState(null);
  const [pastedContent, setPastedContent] = useState('');
  const [loading, setLoading] = useState(false);
  /** Hai bước khi có file: extract → AI (upload văn bản thay vì file lần 2 — nhanh hơn khi mạng chậm). */
  const [aiPhase, setAiPhase] = useState('idle');
  const [extracting, setExtracting] = useState(false);
  const [attaching, setAttaching] = useState(false);
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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [highlightVocabIdx, setHighlightVocabIdx] = useState(null);
  const [highlightGrammarIdx, setHighlightGrammarIdx] = useState(null);
  const editorAnchorRef = useRef(null);
  /** Đồng bộ ref để tự lưu sau import không bị stale closure. */
  const categoryIdRef = useRef('');
  const editingLessonIdRef = useRef(null);
  const estimatedMinutesRef = useRef(15);
  const isPublishedRef = useRef(false);
  /** Đã có nội dung nhưng chưa có danh mục — tự lưu ngay khi chọn danh mục. */
  const pendingAutoSaveRef = useRef(false);
  const autoSaveInFlightRef = useRef(false);

  const [extractedPreview, setExtractedPreview] = useState('');
  const [aiWarning, setAiWarning] = useState('');
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [isPublished, setIsPublished] = useState(false);
  /** Sửa bài đã có trong DB (PUT content-from-draft); null = tạo mới. */
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const htmlPreviewSanitized = useMemo(() => {
    if (!contentHtml?.trim()) return '';
    return sanitizeLessonBodyHtml(contentHtml);
  }, [contentHtml]);

  useEffect(() => {
    categoryIdRef.current = categoryId;
  }, [categoryId]);
  useEffect(() => {
    editingLessonIdRef.current = editingLessonId;
  }, [editingLessonId]);
  useEffect(() => {
    estimatedMinutesRef.current = estimatedMinutes;
  }, [estimatedMinutes]);
  useEffect(() => {
    isPublishedRef.current = isPublished;
  }, [isPublished]);

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

  const parsedSlides = useMemo(() => splitIntoSlides(displaySourceText), [displaySourceText]);

  /** Tải bài khi chọn «Sửa trong Import» từ tab Nội dung bài học. */
  useEffect(() => {
    if (initialStaffLessonId == null || initialStaffLessonId < 1) return undefined;
    let cancelled = false;
    (async () => {
      pendingAutoSaveRef.current = false;
      setError('');
      setSuccess('');
      setSavedLearnSlug('');
      setLoadingLesson(true);
      try {
        const full = await fetchStaffLessonFull(initialStaffLessonId);
        const mapped = lessonFullToDraft(full);
        if (cancelled) return;
        if (!mapped) {
          setError('API không trả dữ liệu bài học.');
          return;
        }
        const { lessonMeta, draft: d } = mapped;
        setEditingLessonId(lessonMeta.id);
        setLevelId(String(lessonMeta.levelId));
        setCategoryId(String(lessonMeta.categoryId));
        setTitle(d.title);
        setSlug(d.slugSuggestion);
        setContentHtml(d.contentHtml || '<p></p>');
        setEstimatedMinutes(d.estimatedMinutes);
        setIsPublished(lessonMeta.isPublished);
        setDraft({
          ...d,
          kanji: d.kanji?.length ? d.kanji : [],
        });
        setSuccess(`Đã tải bài #${lessonMeta.id} — chỉnh rồi bấm «Cập nhật bài học».`);
      } catch (err) {
        if (!cancelled) {
          const msg = getApiErrorMessage(err, 'Không tải được bài');
          setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
          setEditingLessonId(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingLesson(false);
          onConsumedInitialStaffLesson?.();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialStaffLessonId, onConsumedInitialStaffLesson]);

  useEffect(() => {
    setActiveSlideIndex(0);
    setHighlightVocabIdx(null);
    setHighlightGrammarIdx(null);
  }, [displaySourceText]);

  useEffect(() => {
    setActiveSlideIndex((i) => {
      const max = Math.max(0, parsedSlides.length - 1);
      return Math.min(Math.max(0, i), max);
    });
  }, [parsedSlides.length]);

  const safeSlideIdx = Math.min(activeSlideIndex, Math.max(0, parsedSlides.length - 1));

  const readingBlocks = useMemo(() => {
    if (!draft?.contentHtml) return [];
    const plain = stripHtmlToPlain(draft.contentHtml);
    return plain
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 28);
  }, [draft?.contentHtml]);

  const allSlideRowsFlat = useMemo(() => {
    const out = [];
    parsedSlides.forEach((s, si) => {
      parseSlideRows(s.body).forEach((row, ri) => {
        out.push({ ...row, slideIndex: si, slideNum: s.slideNum, rowIndex: ri });
      });
    });
    return out;
  }, [parsedSlides]);

  const speakJp = useCallback((text) => {
    const t = String(text || '').trim();
    if (!t || typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'ja-JP';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  const focusVocabInPreview = useCallback(
    (vocabIdx) => {
      const v = draft?.vocabulary?.[vocabIdx];
      if (!v) return;
      const w = (v.wordJp || '').trim();
      const hit = w
        ? allSlideRowsFlat.find((r) => r.jp.includes(w) || w.includes(r.jp) || r.raw.includes(w))
        : null;
      if (hit) {
        setActiveSlideIndex(hit.slideIndex);
        window.setTimeout(() => {
          document.getElementById(`doc-slide-${hit.slideIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }
      setHighlightVocabIdx(vocabIdx);
      setHighlightGrammarIdx(null);
    },
    [draft, allSlideRowsFlat],
  );

  const focusGrammarInPreview = useCallback(
    (grammarIdx) => {
      const g = draft?.grammar?.[grammarIdx];
      if (!g) return;
      const p = (g.pattern || '').trim();
      const hit = p
        ? allSlideRowsFlat.find((r) => r.jp.includes(p) || p.includes(r.jp) || r.raw.includes(p))
        : null;
      if (hit) {
        setActiveSlideIndex(hit.slideIndex);
        window.setTimeout(() => {
          document.getElementById(`doc-slide-${hit.slideIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }
      setHighlightGrammarIdx(grammarIdx);
      setHighlightVocabIdx(null);
    },
    [draft, allSlideRowsFlat],
  );

  const onSlideRowActivate = useCallback(
    (row, slideIdxOverride) => {
      if (typeof slideIdxOverride === 'number' && slideIdxOverride >= 0) {
        setActiveSlideIndex(slideIdxOverride);
      }
      const jp = String(row?.jp || '').trim();
      if (!jp || !draft) return;
      if (draft.vocabulary?.length) {
        const vidx = draft.vocabulary.findIndex((v) => {
          const w = (v.wordJp || '').trim();
          if (!w) return false;
          return jp.includes(w) || w.includes(jp) || jp.startsWith(w);
        });
        if (vidx >= 0) {
          setInsightTab('vocab');
          setHighlightVocabIdx(vidx);
          setHighlightGrammarIdx(null);
          window.setTimeout(() => {
            document.getElementById(`recon-vocab-${vidx}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 80);
          return;
        }
      }
      if (draft.grammar?.length) {
        const gidx = draft.grammar.findIndex((g) => {
          const p = (g.pattern || '').trim();
          if (!p) return false;
          return jp.includes(p) || p.includes(jp);
        });
        if (gidx >= 0) {
          setInsightTab('grammar');
          setHighlightGrammarIdx(gidx);
          setHighlightVocabIdx(null);
          window.setTimeout(() => {
            document.getElementById(`recon-grammar-${gidx}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 80);
          return;
        }
      }
      setInsightTab('reading');
      setHighlightVocabIdx(null);
      setHighlightGrammarIdx(null);
    },
    [draft],
  );

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
    if (!file || !isPdfFile(file)) {
      setPdfObjectUrl('');
      return undefined;
    }
    const u = URL.createObjectURL(file);
    setPdfObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  /** Sau khi chọn file — cuộn tới cột xem trước để moderator thấy PDF / thẻ PPTX ngay. */
  useEffect(() => {
    if (!file) return;
    const t = window.setTimeout(() => {
      previewColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
    return () => window.clearTimeout(t);
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
    setSuccess('');
    setSavedLearnSlug('');
    setDraft(null);
    setExtractedPreview('');
    setAiWarning('');
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

  /**
   * Ghi draft xuống DB (tạo mới hoặc cập nhật). `isAuto`: thông báo ngắn gọn + không xoá success trước khi gọi (trừ khi lỗi).
   */
  const actuallyPersistLesson = useCallback(async (d, html, titleVal, slugVal, { isAuto = false } = {}) => {
    const cat = categoryIdRef.current;
    if (!cat) {
      if (!isAuto) setError('Chọn cấp độ và danh mục bài học.');
      return { ok: false, reason: 'no-category' };
    }
    if (!d) {
      if (!isAuto) setError('Chưa có dữ liệu — dùng «Quét AI», hoặc tuỳ chọn nâng cao bên dưới.');
      return { ok: false, reason: 'no-draft' };
    }

    setSaving(true);
    if (!isAuto) {
      setError('');
      setSuccess('');
      setSavedLearnSlug('');
    }
    try {
      const draftForSave = { ...d, contentHtml: html };
      const payload = mapDraftToCreatePayload(draftForSave, cat, {
        title: titleVal,
        slug: slugVal,
        content: html,
        estimatedMinutes: estimatedMinutesRef.current,
        isPublished: isPublishedRef.current,
      });
      const editId = editingLessonIdRef.current;
      if (editId != null) {
        await updateLessonFromDraft(editId, payload);
        setSuccess(
          isAuto
            ? 'Đã cập nhật bài trong database — sang tab «Nội dung bài học» (Làm mới) để xem.'
            : 'Đã cập nhật bài học (HTML, từ vựng, ngữ pháp, kanji nếu có, quiz).',
        );
        setSavedLearnSlug(payload.slug);
        setSavedWasPublished(Boolean(isPublishedRef.current));
      } else {
        await createLessonFromDraft(payload);
        setSuccess(
          isAuto
            ? 'Đã lưu bài vào database — mở tab «Nội dung bài học» (bấm Làm mới nếu cần) để xem ngay.'
            : 'Đã lưu bài học vào database.',
        );
        setSavedLearnSlug(payload.slug);
        setSavedWasPublished(Boolean(isPublishedRef.current));
        setDraft(null);
        setFile(null);
        setPastedContent('');
        if (inputRef.current) inputRef.current.value = '';
      }
      return { ok: true };
    } catch (err) {
      let msg = getApiErrorMessage(err, 'Lỗi lưu');
      if (typeof msg === 'string' && /slug đã tồn tại/i.test(msg)) {
        msg = `${msg} Đổi ô Slug (URL) sang giá trị khác rồi Lưu lại — slug mặc định «bai-hoc» thường đã có sẵn một bài.`;
      }
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      return { ok: false, reason: 'api' };
    } finally {
      setSaving(false);
    }
  }, []);

  /** Khi đã chọn danh mục sau bước import — tự lưu một lần (tránh gọi song song). */
  useEffect(() => {
    if (!pendingAutoSaveRef.current) return;
    if (!categoryId || !draft) return;
    if (saving || loadingLesson || attaching || loading || extracting) return;
    if (autoSaveInFlightRef.current) return;

    autoSaveInFlightRef.current = true;
    pendingAutoSaveRef.current = false;

    void actuallyPersistLesson(draft, contentHtml, title, slug, { isAuto: true }).finally(() => {
      autoSaveInFlightRef.current = false;
    });
  }, [
    categoryId,
    draft,
    contentHtml,
    title,
    slug,
    saving,
    loadingLesson,
    attaching,
    loading,
    extracting,
    actuallyPersistLesson,
  ]);

  /**
   * Trích văn bản từ file / ô dán → HTML đơn giản, **không gọi AI**.
   * Dùng khi kết quả AI sai: soạn tay trong HTML, từ vựng/quiz tuỳ chọn, rồi «Lưu bài học».
   */
  const runExtractNoAi = async () => {
    pendingAutoSaveRef.current = false;
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    const text = pastedContent.trim();
    const docFile = file && isSupportedDocFile(file) ? file : null;
    if (!docFile && !text) {
      if (file && isImageFile(file)) {
        setError(
          'Ảnh không trích chữ tự động. Hãy dán văn bản (OCR) vào ô bên dưới, hoặc dùng PDF/DOCX/PPTX.',
        );
      } else {
        setError('Chọn file PDF / DOCX / PPTX hoặc dán nội dung.');
      }
      return;
    }

    setExtracting(true);
    try {
      const res = await extractLessonPlainText({ file: docFile, text });
      const plain = String(res.plainText ?? res.PlainText ?? '').trim();
      if (!plain) {
        setError('Không có nội dung chữ sau khi trích. Thử file khác hoặc dán thêm văn bản.');
        return;
      }
      const html = plainTextToBasicHtml(plain);
      const d = { ...emptyDraft(), contentHtml: html };
      const firstLine = plain.split(/\n/).find((l) => l.trim())?.trim() ?? '';
      const titleGuess = firstLine.slice(0, 200) || 'Bài từ tài liệu';
      const slugVal = docFile ? slugSuggestionFromFileName(docFile.name) : `noi-dung-${Date.now().toString(36)}`;

      setDraft(d);
      setTitle(titleGuess);
      setSlug(slugVal);
      setContentHtml(html);
      setEstimatedMinutes(15);
      const leftPreview = plain.length > 12000 ? `${plain.slice(0, 12000)}\n…` : plain;
      setExtractedPreview(leftPreview);
      setAiWarning([res.warning, res.Warning].filter(Boolean).join(' ') || '');
      if (!categoryIdRef.current) {
        pendingAutoSaveRef.current = true;
        setSuccess(
          'Đã đưa nội dung đã trích vào bài (không AI). Chọn **Danh mục bài học** phía trên — hệ thống sẽ **tự lưu vào database** ngay, rồi xem trong tab «Nội dung bài học».',
        );
      } else {
        pendingAutoSaveRef.current = false;
        await actuallyPersistLesson(d, html, titleGuess, slugVal, { isAuto: true });
      }
      scrollToLessonEditor();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi trích văn bản');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setExtracting(false);
    }
  };

  /**
   * Upload PDF/DOCX/PPTX lên server, chèn liên kết vào HTML — không gọi trích chữ.
   * Nội dung ô dán (nếu có) được nối thêm dưới dạng đoạn văn bản thuần.
   */
  const runAttachFileNoExtract = async () => {
    pendingAutoSaveRef.current = false;
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    const docFile = file && isSupportedDocFile(file) ? file : null;
    if (!docFile) {
      setError('Chọn file PDF / DOCX / PPTX để đính kèm (không trích chữ).');
      return;
    }

    setAttaching(true);
    try {
      const data = await uploadLessonDocumentFile(docFile);
      const rel = data.url ?? data.Url ?? '';
      if (!rel) {
        setError('Server không trả URL file.');
        return;
      }
      const orig = String(data.originalFileName ?? data.OriginalFileName ?? docFile.name ?? 'tai-lieu');
      const href = hrefForLessonUpload(rel);
      const isPdf = isPdfFile(docFile) || /\.pdf(\?|$)/i.test(String(rel));
      let html;
      if (isPdf) {
        html = `<section class="lesson-attached-doc lesson-attached-doc--pdf-embed">
<p><strong>PDF</strong> — xem trực tiếp trong trang (không trích chữ máy):</p>
<div class="lesson-pdf-frame-wrap">
<iframe class="lesson-pdf-iframe" title="${escapeHtmlAttr(orig)}" src="${escapeHtmlAttr(href)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
</div>
<p class="lesson-pdf-fallback"><a href="${escapeHtmlAttr(href)}" target="_blank" rel="noopener noreferrer">Mở PDF tab mới / tải xuống — ${escapeHtmlText(orig)}</a></p>
</section>`;
      } else {
        html = `<section class="lesson-attached-doc"><p><strong>Tài liệu đính kèm</strong> (không trích chữ từ file):</p><p><a href="${escapeHtmlAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtmlText(orig)}</a></p></section>`;
      }

      const pasted = pastedContent.trim();
      if (pasted) {
        const extra = plainTextToBasicHtml(pasted);
        html = `${html}\n${extra}`;
      }

      const d = { ...emptyDraft(), contentHtml: html };
      const displayTitle = (orig.replace(/\.[^.]+$/i, '').trim() || orig).slice(0, 200);
      const slugVal = slugSuggestionFromFileName(orig);
      const titleFinal = displayTitle || 'Bài học có đính kèm';

      setDraft(d);
      setTitle(titleFinal);
      setSlug(slugVal);
      setContentHtml(html);
      setEstimatedMinutes(15);
      setExtractedPreview('');
      if (!categoryIdRef.current) {
        pendingAutoSaveRef.current = true;
        setSuccess(
          'File đã trên server, link đã vào bài. Chọn **Danh mục bài học** — hệ thống sẽ **tự lưu vào database** ngay, rồi mở tab «Nội dung bài học» (Làm mới) để xem.',
        );
      } else {
        pendingAutoSaveRef.current = false;
        await actuallyPersistLesson(d, html, titleFinal, slugVal, { isAuto: true });
      }
      scrollToLessonEditor();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi upload tài liệu');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setAttaching(false);
    }
  };

  const startManualNoAi = () => {
    pendingAutoSaveRef.current = false;
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
    pendingAutoSaveRef.current = false;
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    setDraft(null);
    setAiPhase('idle');

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
    let extractWarnings = '';
    let textForAi = text;

    try {
      if (docFile) {
        setAiPhase('extract');
        setSuccess('Bước 1/2: đang trích chữ trên server (không gọi AI)…');
        const ex = await extractLessonPlainText({ file: docFile, text });
        const plain = String(ex.plainText ?? ex.PlainText ?? '').trim();
        if (!plain) {
          setError('Không trích được chữ từ file. Thử PDF/DOCX, dán thêm nội dung, hoặc dùng «Chỉ trích văn bản».');
          return;
        }
        textForAi = plain;
        extractWarnings = [ex.warning, ex.Warning].filter(Boolean).join(' ');
        const prevFull = plain.length > 12000 ? `${plain.slice(0, 12000)}\n…` : plain;
        setExtractedPreview(prevFull);
        setAiPhase('ai');
        setSuccess(
          'Bước 2/2: đang gọi AI (chỉ gửi văn bản — không upload lại file; nhanh hơn khi file PPTX lớn / mạng chậm). Có thể 30 giây–vài phút.',
        );
      }

      const res = await generateLessonDraft({
        file: null,
        text: textForAi,
        lessonKind: derivedLessonKind,
      });
      setExtractedPreview((prev) => {
        const fromAi = res.extractedPreview || res.ExtractedPreview;
        if (fromAi && String(fromAi).trim()) return String(fromAi);
        return prev;
      });
      const wAi = res.warning || res.Warning || '';
      setAiWarning([extractWarnings, wAi].filter(Boolean).join(' '));
      const d = normalizeAiDraft(res.draft);
      const t = (d.title || '').trim() || 'Bài học';
      let sl = String(d.slugSuggestion || '').trim();
      if (!sl) sl = `bai-${Date.now().toString(36)}`;
      const ch = d.contentHtml || '';

      setDraft(d);
      setTitle(t);
      setSlug(sl);
      setContentHtml(ch);
      setEstimatedMinutes(d.estimatedMinutes || 15);
      if (!categoryIdRef.current) {
        pendingAutoSaveRef.current = true;
        setSuccess(
          'Đã sinh bản nháp từ AI. Chọn **Danh mục bài học** — hệ thống sẽ **tự lưu vào database** ngay, rồi xem trong tab «Nội dung bài học».',
        );
      } else {
        pendingAutoSaveRef.current = false;
        await actuallyPersistLesson(d, ch, t, sl, { isAuto: true });
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, docFile ? 'Lỗi trích chữ hoặc gọi AI' : 'Lỗi gọi AI');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
      setAiPhase('idle');
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
    await actuallyPersistLesson(draft, contentHtml, title, slug, { isAuto: false });
  };

  const exitEditLessonContext = useCallback(() => {
    pendingAutoSaveRef.current = false;
    setEditingLessonId(null);
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
  }, []);

  const confirmDeleteLesson = async () => {
    if (editingLessonId == null) return;
    const ok = window.confirm(
      `Xóa vĩnh viễn bài #${editingLessonId} khỏi database? Hành động không hoàn tác (gồm quiz, từ vựng, tiến độ học viên gắn bài này).`,
    );
    if (!ok) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await deleteStaffLesson(editingLessonId);
      setSuccess(`Đã xóa bài #${editingLessonId}.`);
      setDraft(null);
      setTitle('');
      setSlug('');
      setContentHtml('');
      setEditingLessonId(null);
      setFile(null);
      setPastedContent('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi xóa bài');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setDeleting(false);
    }
  };

  const busy = loading || extracting || attaching || loadingLesson;

  const jlptCodes = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const scannerAnimating = busy || Boolean(displaySourceText.trim());
  const insightTotal =
    draft != null
      ? insightTab === 'vocab'
        ? draft.vocabulary?.length ?? 0
        : insightTab === 'grammar'
          ? draft.grammar?.length ?? 0
          : readingBlocks.length
      : 0;

  const systemBadgeClass =
    error && !draft
      ? 'mod-import__badge mod-import__badge--err'
      : busy
        ? 'mod-import__badge mod-import__badge--busy'
        : 'mod-import__badge mod-import__badge--ok';
  const systemBadgeText =
    error && !draft
      ? 'CẦN KIỂM TRA'
      : busy && attaching
        ? 'ĐANG TẢI FILE'
        : busy && aiPhase === 'extract'
          ? 'ĐANG TRÍCH CHỮ'
          : busy && aiPhase === 'ai'
            ? 'ĐANG GỌI AI'
            : busy
              ? 'ĐANG XỬ LÝ'
              : 'HỆ THỐNG SẴN SÀNG';

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
        </div>
      </FM.motion.header>

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

      {editingLessonId != null ? (
        <div className="mod-import-studio__editing-strip mod-import-studio__glass mod-import-studio__glass--tight">
          <span className="mod-import-studio__editing-strip-text">
            Đang sửa bài <strong>#{editingLessonId}</strong> — nút lưu bên dưới sẽ <strong>cập nhật</strong> bài này.
          </span>
          <div className="mod-import-studio__editing-strip-actions">
            <button
              type="button"
              className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm"
              onClick={exitEditLessonContext}
              disabled={loadingLesson || deleting}
            >
              Ngừng sửa bài này
            </button>
            <button
              type="button"
              className="mod-dash__btn mod-dash__btn--danger mod-dash__btn--sm"
              onClick={confirmDeleteLesson}
              disabled={deleting || loadingLesson}
            >
              {deleting ? 'Đang xóa…' : 'Xóa bài'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mod-import-studio__shell">
        <FM.motion.div
          className="mod-import-studio__topbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04 }}
        >
          <div className="mod-import-studio__topbar-cards">
            <div className="mod-import-studio__glass mod-import-studio__glass--tight mod-import-studio__glass--compact">
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
                {file && (isSupportedDocFile(file) || pastedContent.trim()) ? (
                  <button
                    type="button"
                    className="mod-dash__btn mod-dash__btn--primary mod-dash__btn--sm mod-import-studio__file-cta-ai"
                    disabled={busy}
                    onClick={runAi}
                  >
                    {loading ? 'Đang gọi AI…' : 'Quét AI'}
                  </button>
                ) : null}
              </div>
              {file && isSupportedDocFile(file) ? (
                <p className="mod-import-studio__file-received" role="status">
                  Đã nhận tệp — xem khung <strong>Xem trước tài liệu</strong> bên dưới (PDF hiện ngay; PPTX/DOCX hiện thẻ + hướng dẫn).
                </p>
              ) : null}
              <p className="mod-import-studio__hint-row">
                Slide chỉ ảnh: dán chữ vào ô bên dưới. Với ảnh, bắt buộc dán nội dung để AI xử lý.
              </p>
            </div>

            <div className="mod-import-studio__glass mod-import-studio__glass--tight mod-import-studio__glass--compact">
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
            </div>
          </div>

          <div className="mod-import-studio__topbar-controls">
            <div className="mod-import-studio__glass mod-import-studio__glass--tight">
              <h4 className="mod-import-studio__section-title" style={{ marginTop: 0 }}>
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

              <div className="mod-import-studio__cta-stack">
                <button type="button" className="mod-import-studio__scan-cta" disabled={busy} onClick={runAi}>
                  {loading && aiPhase === 'extract'
                    ? 'Đang trích chữ (1/2)…'
                    : loading && aiPhase === 'ai'
                      ? 'Đang gọi AI (2/2)…'
                      : loading
                        ? 'Đang xử lý…'
                        : 'Quét AI'}
                </button>
                <button type="button" className="mod-import-studio__no-ai-cta" disabled={busy} onClick={runExtractNoAi}>
                  {extracting ? 'Đang trích chữ…' : 'Không dùng AI — lấy nội dung file → soạn bài'}
                </button>
                <p className="mod-import-studio__no-ai-hint">
                  Dùng khi <strong>kết quả AI sai</strong>: chỉ trích chữ từ PDF/DOCX/PPTX (và phần dán kèm), chuyển thành HTML — <strong>không</strong> sinh từ vựng/ngữ pháp bằng AI. Đã chọn <strong>danh mục</strong> thì bài được <strong>tự lưu DB</strong> (hoặc chọn danh mục sau đó).
                </p>
                <button
                  type="button"
                  className="mod-import-studio__attach-doc-cta"
                  disabled={busy || !file || !isSupportedDocFile(file)}
                  onClick={runAttachFileNoExtract}
                >
                  {attaching ? 'Đang tải file lên…' : 'Đính kèm file — không trích chữ'}
                </button>
                <p className="mod-import-studio__attach-doc-hint">
                  <strong>PDF:</strong> nhúng xem <strong>trực tiếp trong bài</strong> (iframe — không trích chữ). DOCX/PPTX: chỉ liên kết tải/mở. Có <strong>danh mục</strong> thì <strong>tự lưu DB</strong>. API/web khác domain → <code>VITE_API_URL</code>.
                </p>
              </div>
            </div>
          </div>
        </FM.motion.div>

        <div className="mod-import-studio__main-split">
          <FM.motion.div
            className="mod-import-studio__col mod-import-studio__col--preview-wide"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div ref={previewColumnRef} className="mod-import-studio__preview-anchor">
            <div className="mod-import-studio__glass">
              <div className="mod-import-studio__preview-head">
                <h3>Xem trước tài liệu</h3>
                <span className={`mod-import-studio__pill${busy ? ' mod-import-studio__pill--pulse' : ''}`}>
                  {busy && attaching
                    ? 'Đang tải file lên…'
                    : busy && aiPhase === 'extract'
                      ? 'Trích chữ…'
                      : busy && aiPhase === 'ai'
                        ? 'AI đang soạn…'
                        : busy
                          ? 'Đang quét…'
                          : systemBadgeText}
                </span>
              </div>
              <div
                className={`mod-import-studio__doc-frame mod-recon__frame${pdfObjectUrl ? ' mod-import-studio__doc-frame--with-pdf' : ''}`}
              >
                {pdfObjectUrl ? (
                  <div className="mod-import-studio__pdf-shell">
                    <div className="mod-import-studio__native-preview-head">Xem trước PDF (trên máy bạn)</div>
                    <div className={`mod-import-studio__pdf-viewport${busy ? ' mod-import-studio__pdf-viewport--busy' : ''}`}>
                      {loading ? (
                        <FM.motion.div
                          className="mod-import-studio__scanner mod-import-studio__scanner--pdf"
                          initial={{ top: '8%' }}
                          animate={{ top: ['6%', '92%', '6%'] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      ) : null}
                      <iframe
                        title="Xem trước PDF"
                        src={`${pdfObjectUrl}#navpanes=0&toolbar=1`}
                        className="mod-import-studio__pdf-iframe"
                      />
                    </div>
                  </div>
                ) : null}
                {file && isOfficeNativePreviewFile(file) && !pdfObjectUrl && !displaySourceText.trim() ? (
                  <div className="mod-import-studio__office-native-card">
                    <div className="mod-import-studio__office-native-icon" aria-hidden>
                      {file.name.toLowerCase().endsWith('.pptx') ? '📊' : '📝'}
                    </div>
                    <div>
                      <strong>{file.name}</strong>
                      <p className="mod-import-studio__office-native-text">
                        Trình duyệt không mở PPTX/DOCX như Google Drive. Bạn sẽ thấy <strong>nội dung đã trích</strong> dạng
                        slide/câu bên dưới sau khi bấm <strong>Quét AI</strong> (hoặc «Chỉ trích văn bản» trong tuỳ chọn nâng cao).
                      </p>
                    </div>
                  </div>
                ) : null}
                {imgPreviewUrl ? (
                  <div className={`mod-recon__slide-canvas${busy ? ' mod-recon__slide-canvas--scanning' : ''}`}>
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
                    <img src={imgPreviewUrl} alt="Xem trước ảnh đã chọn" className="mod-import-studio__doc-img" />
                  </div>
                ) : displaySourceText ? (
                  <div className="mod-doc-preview">
                    <div className="mod-recon__slide-metabar">
                      <span className="mod-recon__slide-chip">
                        {draft ? 'Toàn bộ slide trong file đã trích' : 'Toàn bộ nội dung file (chưa quét AI)'}
                      </span>
                      <span className="mod-recon__slide-chip mod-recon__slide-chip--dim">
                        {parsedSlides.length} phần · 🔊 phát âm từng dòng
                        {draft ? ' · bấm dòng để đồng bộ Kết quả AI' : ''}
                      </span>
                    </div>
                    <div className={`mod-doc-deck-wrap${busy ? ' mod-doc-deck-wrap--scanning' : ''}`}>
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
                      <div className="mod-doc-deck-scroll">
                        {parsedSlides.map((slide, si) => {
                          const { topic, badgeRows, allRows } = slideTopicAndBadgeRows(slide.body, slide.slideNum);
                          const isActive = si === safeSlideIdx;
                          const hlVw =
                            highlightVocabIdx != null && draft?.vocabulary?.[highlightVocabIdx]
                              ? String(draft.vocabulary[highlightVocabIdx].wordJp || '').trim()
                              : '';
                          const hlGp =
                            highlightGrammarIdx != null && draft?.grammar?.[highlightGrammarIdx]
                              ? String(draft.grammar[highlightGrammarIdx].pattern || '').trim()
                              : '';
                          return (
                            <article
                              key={`${slide.slideNum}-${si}`}
                              id={`doc-slide-${si}`}
                              className={`mod-doc-slide-card${isActive ? ' mod-doc-slide-card--active' : ''}`}
                              onClick={() => setActiveSlideIndex(si)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setActiveSlideIndex(si);
                                }
                              }}
                            >
                              <div className="mod-doc-slide-card__rail" aria-hidden>
                                {slide.slideNum}
                              </div>
                              <div className="mod-doc-slide-card__main">
                                <div className="mod-doc-slide-card__head">
                                  <button
                                    type="button"
                                    className="mod-doc-slide-card__speak"
                                    aria-label="Phát âm tiêu đề slide"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speakJp(topic);
                                    }}
                                  >
                                    🔊
                                  </button>
                                  <div className="mod-doc-slide-topic" lang="ja">
                                    {topic}
                                  </div>
                                </div>
                                {badgeRows.length > 0 ? (
                                  <div className="mod-doc-badge-grid">
                                    {badgeRows.map((row, bri) => (
                                      <button
                                        key={`b-${si}-${bri}-${row.raw}`}
                                        type="button"
                                        className="mod-doc-badge-cell"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (draft) onSlideRowActivate(row, si);
                                          else speakJp(row.jp);
                                        }}
                                      >
                                        <span className="mod-doc-badge-cell__tx">
                                          {(row.vi || row.jp).toUpperCase()}
                                        </span>
                                        <span className="mod-doc-badge-cell__ic" aria-hidden>
                                          🔊
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                                <div className="mod-doc-pair-list">
                                  {allRows.map((row, ri) => {
                                    const rowVocabHl =
                                      Boolean(hlVw) &&
                                      (row.jp.includes(hlVw) ||
                                        hlVw.includes(row.jp) ||
                                        String(row.raw || '').includes(hlVw));
                                    const rowGrammarHl =
                                      Boolean(hlGp) &&
                                      (row.jp.includes(hlGp) ||
                                        hlGp.includes(row.jp) ||
                                        String(row.raw || '').includes(hlGp));
                                    return (
                                      <div
                                        key={`p-${si}-${ri}-${row.raw}`}
                                        role="button"
                                        tabIndex={0}
                                        className={`mod-yume-pair${rowVocabHl || rowGrammarHl ? ' mod-yume-pair--hl' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (draft) onSlideRowActivate(row, si);
                                          else speakJp(row.jp);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (draft) onSlideRowActivate(row, si);
                                            else speakJp(row.jp);
                                          }
                                        }}
                                      >
                                        <span className="mod-yume-pair__jp" lang="ja">
                                          {row.jp}
                                        </span>
                                        <span className="mod-yume-pair__vi">
                                          <span className="mod-yume-pair__vi-badge" lang="vi">
                                            {(row.vi || '—').toUpperCase()}
                                          </span>
                                          <button
                                            type="button"
                                            className="mod-yume-pair__speak"
                                            aria-label="Phát âm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              speakJp(row.jp);
                                            }}
                                          >
                                            🔊
                                          </button>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : pdfObjectUrl || (file && isOfficeNativePreviewFile(file) && !displaySourceText.trim()) ? null : (
                  <div className="mod-import-studio__doc-empty">
                    <span style={{ fontSize: '2rem' }} aria-hidden>
                      🙈
                    </span>
                    <p>
                      Chưa có văn bản để hiển thị. Tải PDF/DOCX/PPTX hoặc dán nội dung, rồi bấm <strong>Quét AI</strong>.
                    </p>
                  </div>
                )}
              </div>
              <p className="mod-import__tip" style={{ marginTop: '0.65rem' }}>
                <strong>Mẹo:</strong> PDF xem thử ngay trên trình duyệt; PPTX/DOCX cần <strong>Quét AI</strong> để thấy nội dung dạng
                slide/câu. Sau khi có bản nháp, bấm dòng để đồng bộ tab Kết quả AI.
              </p>
            </div>
            </div>
          </FM.motion.div>

          <FM.motion.div
            className="mod-import-studio__col mod-import-studio__col--insights-wide"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <div className="mod-import-studio__glass" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <div className="mod-import-studio__insights-head">
                <h3>Kết quả AI</h3>
                <span className={systemBadgeClass} style={{ fontSize: '0.65rem' }}>
                  {draft
                    ? `${draft.vocabulary?.length ?? 0} từ · ${draft.grammar?.length ?? 0} NP · ${readingBlocks.length} đoạn`
                    : '—'}
                </span>
              </div>
              <div className="mod-import-studio__tabs mod-import-studio__tabs--three">
                <button
                  type="button"
                  className={`mod-import-studio__tab${insightTab === 'vocab' ? ' mod-import-studio__tab--on' : ''}`}
                  onClick={() => {
                    setInsightTab('vocab');
                    setHighlightVocabIdx(null);
                    setHighlightGrammarIdx(null);
                  }}
                >
                  Từ vựng
                </button>
                <button
                  type="button"
                  className={`mod-import-studio__tab${insightTab === 'grammar' ? ' mod-import-studio__tab--on' : ''}`}
                  onClick={() => {
                    setInsightTab('grammar');
                    setHighlightVocabIdx(null);
                    setHighlightGrammarIdx(null);
                  }}
                >
                  Ngữ pháp
                </button>
                <button
                  type="button"
                  className={`mod-import-studio__tab${insightTab === 'reading' ? ' mod-import-studio__tab--on' : ''}`}
                  onClick={() => {
                    setInsightTab('reading');
                    setHighlightVocabIdx(null);
                    setHighlightGrammarIdx(null);
                  }}
                >
                  Bài đọc
                </button>
              </div>

              <div className="mod-import-studio__insight-scroll">
                {!draft ? (
                  <div className="mod-import-studio__doc-empty mod-ai-empty-wait" style={{ minHeight: '200px' }}>
                    <p className="mod-ai-empty-wait__title">Chưa có bản nháp</p>
                    <p>
                      Cột <strong>Xem trước tài liệu</strong> hiển thị PDF hoặc nội dung đã trích. Bấm <strong>Quét AI</strong> để AI
                      sinh từ vựng / ngữ pháp; hoặc <strong>Không dùng AI</strong> để chỉ đưa văn bản vào HTML rồi soạn tay — khi
                      AI hay sai, nên dùng cách sau.
                    </p>
                  </div>
                ) : insightTab === 'vocab' ? (
                  (draft.vocabulary || []).length ? (
                    <FM.motion.div
                      className="mod-recon__vocab-grid"
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
                      }}
                    >
                      {(draft.vocabulary || []).map((row, vi) => (
                        <FM.motion.div
                          id={`recon-vocab-${vi}`}
                          key={vi}
                          role="button"
                          tabIndex={0}
                          className={`mod-recon__vocab-tile${highlightVocabIdx === vi ? ' mod-recon__vocab-tile--hl' : ''}`}
                          variants={{
                            hidden: { opacity: 0, y: 18, scale: 0.96 },
                            show: { opacity: 1, y: 0, scale: 1 },
                          }}
                          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => focusVocabInPreview(vi)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              focusVocabInPreview(vi);
                            }
                          }}
                        >
                          <span className="mod-recon__vocab-level">{selectedLevelCode}</span>
                          <input
                            className="mod-recon__vocab-word"
                            value={row.wordJp ?? ''}
                            onChange={(e) => patchVocab(vi, { wordJp: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            lang="ja"
                            aria-label="Từ tiếng Nhật"
                          />
                          <input
                            className="mod-recon__vocab-read"
                            value={row.reading ?? ''}
                            onChange={(e) => patchVocab(vi, { reading: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            lang="ja"
                            placeholder="Kana"
                          />
                          <div className="mod-recon__vocab-badge-wrap" onClick={(e) => e.stopPropagation()}>
                            <input
                              className="mod-recon__vocab-badge-in"
                              value={row.meaningVi ?? ''}
                              onChange={(e) => patchVocab(vi, { meaningVi: e.target.value })}
                              placeholder="Nghĩa (VI)"
                            />
                          </div>
                          <div className="mod-import-studio__insight-actions" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="mod-import-studio__btn-lib" onClick={() => saveVocabToLibrary(row)}>
                              Library
                            </button>
                            <button type="button" className="mod-import-studio__btn-lesson" onClick={scrollToLessonEditor}>
                              + Lesson
                            </button>
                          </div>
                        </FM.motion.div>
                      ))}
                    </FM.motion.div>
                  ) : (
                    <p className="mod-dash__muted">Chưa có mục từ vựng.</p>
                  )
                ) : insightTab === 'grammar' ? (
                  (draft.grammar || []).length ? (
                    <FM.motion.div
                      className="mod-recon__grammar-wrap"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.38 }}
                    >
                      <table className="mod-recon__grammar-table">
                        <thead>
                          <tr>
                            <th>Mẫu</th>
                            <th>Giải thích</th>
                            <th>Ví dụ</th>
                            <th className="mod-recon__grammar-th-actions"> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(draft.grammar || []).map((g, gi) => (
                            <tr
                              key={gi}
                              id={`recon-grammar-${gi}`}
                              tabIndex={0}
                              className={highlightGrammarIdx === gi ? 'mod-recon__grammar-tr--hl' : undefined}
                              onClick={() => focusGrammarInPreview(gi)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  focusGrammarInPreview(gi);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  className="mod-recon__table-input"
                                  value={g.pattern ?? ''}
                                  onChange={(e) => patchGrammar(gi, { pattern: e.target.value })}
                                  lang="ja"
                                />
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  className="mod-recon__table-input"
                                  value={g.meaningVi ?? ''}
                                  onChange={(e) => patchGrammar(gi, { meaningVi: e.target.value })}
                                />
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <span className="mod-recon__grammar-ex" lang="ja">
                                  {Array.isArray(g.examples) ? g.examples.filter(Boolean).join(' · ') : ''}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div className="mod-recon__table-actions">
                                  <button type="button" className="mod-import-studio__btn-lib" onClick={() => saveGrammarToLibrary(g)}>
                                    Library
                                  </button>
                                  <button type="button" className="mod-import-studio__btn-lesson" onClick={scrollToLessonEditor}>
                                    + Lesson
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </FM.motion.div>
                  ) : (
                    <p className="mod-dash__muted">Chưa có mục ngữ pháp.</p>
                  )
                ) : readingBlocks.length ? (
                  <FM.motion.div
                    className="mod-recon__reading"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="mod-recon__read-hero">
                      <img
                        src={readingIllustrationUrl(slug || title || 'lesson')}
                        alt=""
                        className="mod-recon__read-hero-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="mod-recon__read-hero-cap">Minh họa đọc / hội thoại (ảnh mẫu)</div>
                    </div>
                    <div className="mod-recon__dialogue">
                      {readingBlocks.map((block, bi) => (
                        <FM.motion.div
                          key={bi}
                          className={`mod-recon__bubble mod-recon__bubble--${bi % 2 === 0 ? 'a' : 'b'}`}
                          initial={{ opacity: 0, x: bi % 2 === 0 ? -14 : 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: bi * 0.055, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div className="mod-recon__bubble-av" aria-hidden>
                            {bi % 2 === 0 ? '🧑' : '🌸'}
                          </div>
                          <div className="mod-recon__bubble-body">
                            <div className="mod-recon__bubble-name">{bi % 2 === 0 ? 'Nhân vật A' : 'Nhân vật B'}</div>
                            <div className="mod-recon__bubble-text" lang="ja">
                              {block}
                            </div>
                          </div>
                        </FM.motion.div>
                      ))}
                    </div>
                  </FM.motion.div>
                ) : (
                  <p className="mod-dash__muted">Chưa có đoạn đọc — chỉnh nội dung HTML bên dưới để thêm văn bản.</p>
                )}
              </div>

              <div className="mod-import-studio__footer-cta">
                <button type="button" disabled={!draft} onClick={scrollToLessonEditor}>
                  Soạn và lưu bài học{draft ? ` (${insightTotal} mục đang xem)` : ''} →
                </button>
              </div>
            </div>
          </FM.motion.div>
        </div>

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
                {(contentHtml || '').includes('lesson-attached-doc') ? (
                  <div className="mod-import-studio__attach-pending-banner" role="status">
                    {editingLessonId != null ? (
                      <p>
                        <strong>Tài liệu đã upload.</strong> Nhấn «Cập nhật bài học» bên dưới để ghi liên kết vào bài #{editingLessonId}.
                      </p>
                    ) : (
                      <p>
                        <strong>Đính kèm / import:</strong> nếu đã chọn <strong>danh mục</strong>, hệ thống <strong>tự lưu DB</strong> sau khi có nội dung — mở tab «Nội dung bài học» (Làm mới). Nếu chưa chọn danh mục, chọn xong sẽ{' '}
                        <strong>tự lưu</strong>. Vẫn có thể chỉnh rồi bấm «Lưu bài học» như trước.
                      </p>
                    )}
                  </div>
                ) : null}
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
                  disabled={saving || !categoryId || loadingLesson}
                  onClick={saveLesson}
                >
                  {saving
                    ? 'Đang lưu…'
                    : editingLessonId != null
                      ? 'Cập nhật bài học'
                      : 'Lưu bài học vào database'}
                </button>
              </div>
            </FM.motion.div>
          ) : null}
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
