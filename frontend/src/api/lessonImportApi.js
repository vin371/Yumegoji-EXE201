import http from './client';

const BASE = '/api/moderator/lessons/import';

/** Axios mặc định Content-Type: application/json — multipart cần bỏ để trình duyệt gắn boundary. */
function clearContentTypeHeader(headers) {
  if (!headers) return;
  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type');
    headers.delete('content-type');
    return;
  }
  delete headers['Content-Type'];
  delete headers['content-type'];
}

const formDataTransform = [
  (body, headers) => {
    const FD = globalThis.FormData;
    if (FD && body instanceof FD) clearContentTypeHeader(headers);
    return body;
  },
];

export const lessonImportApi = {
  extractText: (formData) =>
    http.post(`${BASE}/extract-text`, formData, {
      timeout: 300000,
      transformRequest: formDataTransform,
    }),

  generateDraft: (formData) =>
    http.post(`${BASE}/generate-draft`, formData, {
      timeout: 600000,
      transformRequest: formDataTransform,
    }),

  /** Lưu PDF/DOCX/PPTX lên server — không trích chữ. */
  uploadDocument: (formData) =>
    http.post(`${BASE}/upload-document`, formData, {
      timeout: 300000,
      transformRequest: formDataTransform,
    }),

  createFromDraft: (payload) => http.post(`${BASE}/create-from-draft`, payload),
};
