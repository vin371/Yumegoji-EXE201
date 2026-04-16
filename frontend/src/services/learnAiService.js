import { learnAiApi } from '../api/learnAiApi';

/**
 * Yumegoji AI (Learn) — gọi backend (Ollama khi bật). Cần đăng nhập (Member).
 * @param {{ messages: { role: string; content: string }[]; imagesBase64?: string[] }} body
 */
export async function postLearnAiChat(body) {
  const { data } = await learnAiApi.postChat(body);
  return data;
}

/** Trích chữ từ .pdf / .docx / .pptx (server) — Member. */
export async function extractLearnDocument(file) {
  const FormDataCtor = globalThis.FormData;
  const formData = new FormDataCtor();
  formData.append('file', file);
  const { data } = await learnAiApi.extractDocument(formData);
  return data;
}
