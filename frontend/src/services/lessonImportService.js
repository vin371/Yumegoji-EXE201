import { lessonImportApi } from '../api/lessonImportApi';
import http from '../api/client';

function newMultipartForm() {
  const Ctor = globalThis.FormData;
  return new Ctor();
}

/**
 * Gắn file + text vào FormData đúng cách multipart:
 * - Luôn truyền tên file (đối số thứ 3) để server nhận đúng .pdf/.docx/.pptx và trích tốt.
 * - File/Blob: kiểm tra `size` để tránh append rỗng.
 */
function appendImportMultipart(fd, { file, text, lessonKind }) {
  const hasFile = file != null && typeof file.size === 'number' && file.size > 0;
  if (hasFile) {
    const filename =
      typeof file.name === 'string' && file.name.trim() !== '' ? file.name.trim() : 'document.bin';
    fd.append('file', file, filename);
  }
  const textTrimmed = text != null ? String(text).trim() : '';
  if (textTrimmed) fd.append('text', textTrimmed);
  const kind = lessonKind != null ? String(lessonKind).trim() : '';
  if (kind) fd.append('lessonKind', kind);
}

/**
 * Trích văn bản từ PDF/DOCX/PPTX hoặc text — không gọi OpenAI.
 */
export async function extractLessonPlainText({ file, text }) {
  const fd = newMultipartForm();
  appendImportMultipart(fd, { file, text });
  const { data } = await lessonImportApi.extractText(fd);
  return data;
}

/** Upload PDF/DOCX/PPTX — không trích chữ; trả { url, originalFileName }. */
export async function uploadLessonDocumentFile(file) {
  const fd = newMultipartForm();
  appendImportMultipart(fd, { file, text: '' });
  const { data } = await lessonImportApi.uploadDocument(fd);
  return data;
}

/**
 * Upload PDF/DOCX/PPTX hoặc gửi text — server trích nội dung và gọi AI sinh bản nháp JSON.
 * Backend: OpenAI nếu có OpenAI:ApiKey, không thì Ollama (appsettings LessonImport / Ollama).
 * Cần JWT moderator/admin.
 */
export async function generateLessonDraft({ file, text, lessonKind }) {
  const fd = newMultipartForm();
  appendImportMultipart(fd, { file, text, lessonKind: lessonKind ?? 'auto' });
  const { data } = await lessonImportApi.generateDraft(fd);
  return data;
}

/**
 * Lưu bài học mới từ payload đã chỉnh (sau bước AI).
 */
export async function createLessonFromDraft(payload) {
  const { data } = await lessonImportApi.createFromDraft(payload);
  return data;
}

/** GET đầy đủ bài (kể cả chưa publish + quiz) — moderator/admin. */
export async function fetchStaffLessonFull(lessonId) {
  const { data } = await http.get(`/api/moderator/lessons/${lessonId}`);
  return data;
}

/** Danh sách bài (đã + chưa publish), phân trang — moderator/admin. */
export async function fetchStaffLessonsPaged({
  levelId,
  categoryId,
  search,
  isPublished,
  page = 1,
  pageSize = 50,
} = {}) {
  const params = { page, pageSize };
  if (levelId != null && levelId !== '') params.levelId = levelId;
  if (categoryId != null && categoryId !== '') params.categoryId = categoryId;
  if (search) params.search = search;
  if (isPublished === true || isPublished === false) params.isPublished = isPublished;
  const { data } = await http.get('/api/moderator/lessons', { params });
  return data;
}

/** Ghi đè toàn bộ nội dung bài như lúc tạo từ bản nháp; giữ tiến độ học viên. */
export async function updateLessonFromDraft(lessonId, payload) {
  const { data } = await http.put(`/api/moderator/lessons/${lessonId}/content-from-draft`, payload);
  return data;
}

/** Xóa vĩnh viễn bài và mọi dữ liệu gắn bài. */
export async function deleteStaffLesson(lessonId) {
  await http.delete(`/api/moderator/lessons/${lessonId}`);
}
