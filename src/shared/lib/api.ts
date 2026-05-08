import type { TransformKind } from "../../modules/voice-dictation/voice-dictation.types";

const DEFAULT_API_BASE = "http://127.0.0.1:3001";

export function getApiBase(): string {
  const v = import.meta.env.VITE_BACKEND_URL as string | undefined;
  return v && v.trim() ? v.trim().replace(/\/$/, "") : DEFAULT_API_BASE;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getApiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, init);
}

export type PostProcessRequest = {
  text: string;
  language?: string;
  style?: "chat" | "doc";
  kind?: TransformKind;
};

export type PostProcessResponse = {
  text: string;
};

export async function postProcessText(body: PostProcessRequest): Promise<PostProcessResponse> {
  const res = await apiFetch("/api/post-process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.error?.message || "Backend post-process failed");
  return json as PostProcessResponse;
}

export type SttCreateRequest = {
  file: Blob;
  language?: string;
  mode?: "auto" | "sync" | "async";
  postProcess?: boolean;
  style?: "chat" | "doc";
  kind?: TransformKind;
};

export type SttTaskProcessing = {
  id: string;
  status: "processing";
  language?: string;
  provider?: string;
};

export type SttTaskDone = {
  id: string;
  status: "done";
  language: string;
  textRaw: string;
  text: string;
  provider: string;
  providerMeta?: Record<string, unknown>;
};

export type SttTaskFailed = {
  id: string;
  status: "failed";
  error: { code: string; message: string; retryable: boolean };
};

export type SttTask = SttTaskProcessing | SttTaskDone | SttTaskFailed;

export async function createSttTranscription(req: SttCreateRequest): Promise<SttTask> {
  const form = new FormData();
  if (req.language) form.append("language", req.language);
  if (req.mode) form.append("mode", req.mode);
  if (req.postProcess !== undefined) form.append("postProcess", req.postProcess ? "true" : "false");
  if (req.style) form.append("style", req.style);
  if (req.kind) form.append("kind", req.kind);
  // Important: in Fastify multipart, `req.file()` only captures fields that came *before* the file part.
  // Put non-file fields first so backend can read them from `file.fields`.
  form.append("file", req.file, "audio.wav");

  const res = await apiFetch("/api/stt/transcriptions", { method: "POST", body: form });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.error?.message || "Backend STT failed");
  return json as SttTask;
}

export async function getSttTranscription(id: string): Promise<SttTask> {
  const res = await apiFetch(`/api/stt/transcriptions/${encodeURIComponent(id)}`);
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.error?.message || "Backend STT status failed");
  return json as SttTask;
}

