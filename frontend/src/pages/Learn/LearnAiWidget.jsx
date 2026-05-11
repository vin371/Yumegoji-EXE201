import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';
import { ROUTES } from '../../data/routes';
import { extractLearnDocument, postLearnAiChat } from '../../services/learnAiService';
import { getErrorMessageForUser } from '../../utils/apiErrorMessage';

const Motion = motion;

const MAX_TEXT_FILE_CHARS = 24_000;
const MAX_IMAGE_BYTES = 2_200_000;
const MAX_DOC_BYTES = 24 * 1024 * 1024;

/** Nền vườn Nhật (nhạt) trong khung tin nhắn — ảnh + lớp phủ trong CSS. */
const LEARN_AI_MESSAGES_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBVTHYikuZH0p7u2VCJV4qI-wu_3DW0qy1-EjnWqAmqyUKdRzHNQAM9GXSCjCZvLnCgSzIsD9GHwR5swUyXr2lpEkNu_QJmMZc2IFGPO7OlB6I-49dkWSL6CFOeaUaSQVuNiZT137-CaSBs9AqyOpK1YQ5zCE-SQshPbR6dxzed2JeyZjAWHHbvxSCaoxKTdZ5Z5XUFHI-HWSjqErRVHUcX_Vt3_xULtdOpR4ar4q7CMzm9ERrDqSXR29ITa1Ur5WES4mQW_rl0YJY';

function stripBase64Prefix(dataUrlOrB64) {
  const s = String(dataUrlOrB64 || '').trim();
  const i = s.indexOf('base64,');
  return i >= 0 ? s.slice(i + 7) : s;
}

/** Bubble user: chỉ hiện câu hỏi + tên file; nội dung dài gửi kèm trong `content` cho API. */
function buildUserBubbleDisplay(q, textSnippets, imageCount) {
  const docNames = textSnippets.map((s) => s.name).filter(Boolean);
  const attachBits = [];
  if (docNames.length) attachBits.push(docNames.join(', '));
  if (imageCount > 0) attachBits.push(`${imageCount} ảnh`);
  const attachLine = attachBits.length ? `📎 ${attachBits.join(' · ')}` : '';

  if (q && attachLine) return `${q}\n${attachLine}`;
  if (q) return q;
  if (attachLine) return `${attachLine}\n(Nội dung đã gửi kèm cho AI — không hiện đầy đủ trong khung chat.)`;
  return '';
}

function TypingDots({ label }) {
  return (
    <div className="learn-ai-widget__typing-dots" role="status" aria-label={label}>
      <span />
      <span />
      <span />
    </div>
  );
}

function IconSparkles({ className }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l1.09 3.26L16 7l-2.91 1.74L12 12l-1.09-3.26L8 7l2.91-1.74L12 3zM5 14l.73 2.18L8 17l-2.27 1.36L5 21l-.73-2.64L2 17l2.27-1.36L5 14zm14 0l.73 2.18L22 17l-2.27 1.36L19 21l-.73-2.64L16 17l2.27-1.36L19 14z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  );
}

export default function LearnAiWidget({ isAuthenticated }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [textSnippets, setTextSnippets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const [err, setErr] = useState('');
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const msgEase = [0.22, 1, 0.36, 1];

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    function onOpenFromBanner() {
      setOpen(true);
    }
    window.addEventListener('yume-open-learn-ai', onOpenFromBanner);
    return () => window.removeEventListener('yume-open-learn-ai', onOpenFromBanner);
  }, []);

  const clearAttachments = useCallback(() => {
    setImagePreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setTextSnippets([]);
  }, []);

  const onPickFiles = useCallback(
    (ev) => {
      const files = Array.from(ev.target.files || []);
      ev.target.value = '';
      if (!files.length) return;

      for (const f of files) {
        if (f.type.startsWith('image/')) {
          if (f.size > MAX_IMAGE_BYTES) {
            setErr(`Ảnh "${f.name}" quá lớn (tối đa ~${Math.round(MAX_IMAGE_BYTES / 1024)} KB).`);
            continue;
          }
          const url = URL.createObjectURL(f);
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = stripBase64Prefix(reader.result);
            setImagePreviews((p) => [...p, { id: `${Date.now()}-${f.name}`, url, base64: b64, name: f.name }]);
          };
          reader.readAsDataURL(f);
        } else if (f.type === 'text/plain' || /\.(txt|md)$/i.test(f.name)) {
          const reader = new FileReader();
          reader.onload = () => {
            let t = String(reader.result || '');
            if (t.length > MAX_TEXT_FILE_CHARS) t = `${t.slice(0, MAX_TEXT_FILE_CHARS)}\n\n…(đã cắt bớt)`;
            setTextSnippets((s) => [...s, { id: `${Date.now()}-${f.name}`, name: f.name, text: t }]);
          };
          reader.readAsText(f, 'UTF-8');
        } else if (/\.(pdf|docx|pptx)$/i.test(f.name)) {
          if (f.size > MAX_DOC_BYTES) {
            setErr(`Tài liệu "${f.name}" quá lớn (tối đa ~24 MB).`);
            continue;
          }
          if (!isAuthenticated) {
            setErr('Đăng nhập để đính kèm PDF / Word / PowerPoint.');
            continue;
          }
          void (async () => {
            try {
              setDocBusy(true);
              setErr('');
              const data = await extractLearnDocument(f);
              const text = data?.plainText ?? data?.PlainText ?? '';
              const warn = data?.warning ?? data?.Warning;
              if (!String(text).trim()) {
                setErr('Không trích được chữ từ file (file trống hoặc không đọc được).');
                return;
              }
              let t = String(text);
              if (warn) t += `\n\n---\n(${warn})`;
              setTextSnippets((s) => [...s, { id: `${Date.now()}-${f.name}`, name: f.name, text: t }]);
            } catch (ex) {
              setErr(getErrorMessageForUser(ex, 'Không tải được tài liệu.'));
            } finally {
              setDocBusy(false);
            }
          })();
        } else {
          setErr('Chỉ hỗ trợ ảnh PNG/JPG/WebP, .txt / .md, hoặc .pdf / .docx / .pptx.');
        }
      }
    },
    [isAuthenticated]
  );

  const removeImage = useCallback((id) => {
    setImagePreviews((prev) => {
      const x = prev.find((p) => p.id === id);
      if (x) URL.revokeObjectURL(x.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const removeText = useCallback((id) => {
    setTextSnippets((s) => s.filter((x) => x.id !== id));
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    const q = draft.trim();
    if (!q && imagePreviews.length === 0 && textSnippets.length === 0) return;
    if (!isAuthenticated) return;

    let userContent = q;
    if (textSnippets.length) {
      const blocks = textSnippets.map((s) => `### ${s.name}\n${s.text}`);
      userContent = [userContent, ...blocks].filter(Boolean).join('\n\n---\n\n');
    }

    const imgs = imagePreviews.map((p) => p.base64);
    const apiUserContent = userContent || (imgs.length ? '(Đính kèm ảnh)' : '');
    const bubbleDisplay =
      buildUserBubbleDisplay(q, textSnippets, imgs.length) ||
      apiUserContent ||
      'Đính kèm ảnh — xem và phân tích giúp mình.';

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const nextHistory = [...history, { role: 'user', content: apiUserContent }];

    setErr('');
    setBusy(true);
    setDraft('');
    clearAttachments();
    const userId = `u-${Date.now()}`;
    setMessages((m) => [
      ...m,
      {
        id: userId,
        role: 'user',
        content: apiUserContent,
        displayContent: bubbleDisplay,
      },
    ]);

    try {
      const data = await postLearnAiChat({
        messages: nextHistory,
        imagesBase64: imgs.length ? imgs : undefined,
      });
      const reply = data?.message ?? data?.Message ?? '';
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (ex) {
      const fallback =
        ex?.response?.status === 503
          ? 'Ollama chưa chạy hoặc model chưa tải. Kiểm tra máy chủ backend và `ollama serve`.'
          : 'Không gửi được tin nhắn.';
      setErr(getErrorMessageForUser(ex, fallback));
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  const bubbleMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.32, ease: msgEase },
      };

  return (
    <div className="learn-ai-widget" aria-live="polite">
      {open ? (
        <div className="learn-ai-widget__panel learn-ai-widget__panel--glass" role="dialog" aria-label="Yumegoji AI">
          <div className="learn-ai-widget__sakura" aria-hidden>
            <SakuraRainLayer petalCount={20} buoyant />
          </div>
          <div className="learn-ai-widget__panel-inner">
            <header className="learn-ai-widget__head">
              <div className="learn-ai-widget__head-text">
                <span className="learn-ai-widget__title">Yumegoji AI</span>
              </div>
              <Motion.button
                type="button"
                className="learn-ai-widget__icon-btn"
                aria-label="Đóng"
                onClick={() => setOpen(false)}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 520, damping: 28 }}
              >
                ×
              </Motion.button>
            </header>

            {!isAuthenticated ? (
              <div className="learn-ai-widget__gate">
                <p>Đăng nhập để dùng Yumegoji AI trên trang Học tập.</p>
                <Link className="learn-ai-widget__link" to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.LEARN)}`}>
                  Đăng nhập
                </Link>
              </div>
            ) : (
              <>
                <div
                  className="learn-ai-widget__messages"
                  ref={listRef}
                  style={{ '--learn-ai-messages-bg': `url("${LEARN_AI_MESSAGES_BG}")` }}
                >
                  <div className="learn-ai-widget__messages-bg" aria-hidden />
                  <div className="learn-ai-widget__messages-stack">
                    {messages.map((m) => (
                      <Motion.div
                        key={m.id}
                        className={`learn-ai-widget__bubble learn-ai-widget__bubble--${m.role}`}
                        {...bubbleMotion}
                      >
                        <span className="learn-ai-widget__bubble-label">
                          {m.role === 'user' ? 'Bạn' : 'Yumegoji AI'}
                        </span>
                        <div className="learn-ai-widget__bubble-body">
                          {m.displayContent != null && m.displayContent !== '' ? m.displayContent : m.content}
                        </div>
                      </Motion.div>
                    ))}
                    {busy ? <TypingDots label="Yumegoji AI đang soạn tin" /> : null}
                  </div>
                </div>

                {err ? <div className="learn-ai-widget__error">{err}</div> : null}
                {docBusy ? (
                  <div className="learn-ai-widget__typing learn-ai-widget__typing--bar learn-ai-widget__typing--doc">
                    <TypingDots label="Đang trích văn bản từ tài liệu" />
                    <span className="learn-ai-widget__typing-doc-label">Đang xử lý tài liệu…</span>
                  </div>
                ) : null}

                {(imagePreviews.length > 0 || textSnippets.length > 0) && (
                  <div className="learn-ai-widget__attach-bar">
                    {imagePreviews.map((p) => (
                      <Motion.div
                        key={p.id}
                        className="learn-ai-widget__attach-chip learn-ai-widget__attach-chip--img"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                      >
                        <img src={p.url} alt="" />
                        <button type="button" onClick={() => removeImage(p.id)} aria-label={`Bỏ ${p.name}`}>
                          ×
                        </button>
                      </Motion.div>
                    ))}
                    {textSnippets.map((s) => (
                      <Motion.div
                        key={s.id}
                        className="learn-ai-widget__attach-chip"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                      >
                        <span>{s.name}</span>
                        <Motion.button
                          type="button"
                          onClick={() => removeText(s.id)}
                          aria-label={`Bỏ ${s.name}`}
                          whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                        >
                          ×
                        </Motion.button>
                      </Motion.div>
                    ))}
                  </div>
                )}

                <form className="learn-ai-widget__form" onSubmit={handleSend}>
                  <input
                    ref={fileRef}
                    type="file"
                    className="learn-ai-widget__file"
                    accept="image/png,image/jpeg,image/webp,.txt,.md,.pdf,.docx,.pptx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    multiple
                    onChange={onPickFiles}
                  />
                  <Motion.button
                    type="button"
                    className="learn-ai-widget__attach-trigger"
                    aria-label="Đính ảnh hoặc tài liệu"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy || docBusy}
                    whileHover={reduceMotion || busy || docBusy ? undefined : { scale: 1.06 }}
                    whileTap={reduceMotion || busy || docBusy ? undefined : { scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  >
                    +
                  </Motion.button>
                  <textarea
                    className="learn-ai-widget__input"
                    rows={2}
                    placeholder="Hỏi bài, dán nội dung, hoặc mô tả ảnh đính kèm…"
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                    disabled={busy || docBusy}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' && !ev.shiftKey) {
                        ev.preventDefault();
                        void handleSend(ev);
                      }
                    }}
                  />
                  <Motion.button
                    type="submit"
                    className="learn-ai-widget__send"
                    disabled={busy || docBusy}
                    whileHover={reduceMotion || busy || docBusy ? undefined : { scale: 1.04 }}
                    whileTap={reduceMotion || busy || docBusy ? undefined : { scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 24 }}
                  >
                    Gửi
                  </Motion.button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}

      <Motion.button
        type="button"
        className={`learn-ai-widget__fab${open ? ' learn-ai-widget__fab--open' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Đóng Yumegoji AI' : 'Mở Yumegoji AI'}
        onClick={() => setOpen((v) => !v)}
        whileHover={reduceMotion ? undefined : { scale: 1.06, y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      >
        <IconSparkles className="learn-ai-widget__fab-ico" />
      </Motion.button>
    </div>
  );
}
