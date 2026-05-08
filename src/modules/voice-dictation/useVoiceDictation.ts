import { create } from "zustand";
import type { DictationStatus, TransformKind } from "./voice-dictation.types";
import { createSttTranscription, getSttTranscription, postProcessText } from "../../shared/lib/api";
import { startWavRecording, stopWavRecording } from "./wavRecorder";

type VoiceDictationState = {
  status: DictationStatus;
  level: number;
  interimText: string;
  finalText: string;
  currentText: string;
  dictatedText: string;
  dictatedDirty: boolean;
  convertedText: string;
  transformKind: TransformKind;
  recording: { blob: Blob; sampleRate: number; durationMs: number } | null;
  error: string | null;
  startNew: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  reset: () => void;
  setDictatedText: (text: string) => void;
  setConvertedText: (text: string) => void;
  setTransformKind: (kind: TransformKind) => void;
  convertText: () => Promise<void>;
};

let recognition: SpeechRecognition | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationFrame: number | null = null;
let stream: MediaStream | null = null;
let committed = "";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const stopLevelMeter = (set: (partial: Partial<VoiceDictationState>) => void) => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  set({ level: 0 });
};

const startLevelMeter = (set: (partial: Partial<VoiceDictationState>) => void) => {
  if (!analyser) return;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const updateLevel = () => {
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = sum / dataArray.length;
    set({ level: avg / 255 });
    animationFrame = requestAnimationFrame(updateLevel);
  };
  updateLevel();
};

const ensureAudio = async () => {
  if (stream && audioContext && analyser) return;
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
};

const createRecognition = (
  set: (partial: Partial<VoiceDictationState>) => void,
  getStatus: () => DictationStatus,
  getDictated: () => { dictatedDirty: boolean; dictatedText: string }
) => {
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) {
    throw new Error("SpeechRecognition API не поддерживается в этом браузере");
  }

  const r = new SpeechRecognitionAPI();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "ru-RU";

  r.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) final += transcript + " ";
      else interim += transcript;
    }

    if (final) committed = (committed + final).trim() + " ";
    const committedTrimmed = committed.trim();
    const currentText = (committedTrimmed + (interim ? ` ${interim}` : "")).trim();

    const { dictatedDirty, dictatedText } = getDictated();
    set({
      interimText: interim,
      finalText: committedTrimmed,
      currentText,
      dictatedText: dictatedDirty ? dictatedText : currentText,
    });
  };

  r.onerror = (event: any) => {
    // When we call abort()/stop() programmatically, Chrome may emit "aborted".
    // It's not a real failure from the user's perspective.
    if ((event as any)?.error === "aborted") return;
    stopLevelMeter(set);
    set({ status: "error", error: "Ошибка распознавания речи" });
  };

  r.onend = () => {
    // When we pause, SpeechRecognition ends — keep paused state.
    if (getStatus() === "recording") {
      stopLevelMeter(set);
      set({ status: "paused" });
    }
  };

  return r;
};

export const useVoiceDictation = create<VoiceDictationState>((set, get) => ({
  status: "idle",
  level: 0,
  interimText: "",
  finalText: "",
  currentText: "",
  dictatedText: "",
  dictatedDirty: false,
  convertedText: "",
  transformKind: "beautify",
  recording: null,
  error: null,

  startNew: () => {
    committed = "";
    set({
      interimText: "",
      finalText: "",
      currentText: "",
      dictatedText: "",
      dictatedDirty: false,
      convertedText: "",
      recording: null,
      error: null,
    });
    void get().resume();
  },

  pause: () => {
    if (get().status !== "recording") return;
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    stopLevelMeter(set);
    set({ status: "paused" });
  },

  resume: async () => {
    try {
      set({ status: "requesting", error: null });
      await ensureAudio();
      startLevelMeter(set);
      recognition = createRecognition(set, () => get().status, () => ({
        dictatedDirty: get().dictatedDirty,
        dictatedText: get().dictatedText,
      }));
      recognition.start();
      await startWavRecording();
      set({ status: "recording" });
    } catch (err) {
      stopLevelMeter(set);
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Не удалось получить доступ к микрофону",
      });
    }
  },

  stop: async () => {
    if (recognition) {
      recognition.abort();
      recognition = null;
    }

    stopLevelMeter(set);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    if (audioContext) {
      void audioContext.close();
      audioContext = null;
    }

    analyser = null;

    const rec = await stopWavRecording();
    if (!rec) {
      set({ status: "idle", level: 0 });
      return;
    }

    set({ status: "recorded", level: 0, recording: rec, error: null });
  },

  reset: () => {
    committed = "";
    set({
      status: "idle",
      level: 0,
      interimText: "",
      finalText: "",
      currentText: "",
      dictatedText: "",
      dictatedDirty: false,
      convertedText: "",
      recording: null,
      error: null,
    });
  },

  setDictatedText: (text) => {
    set({ dictatedText: text, dictatedDirty: true });
  },

  setConvertedText: (text) => {
    set({ convertedText: text });
  },

  setTransformKind: (kind) => {
    set({ transformKind: kind });
  },

  convertText: async () => {
    try {
      // If user clicks "Преобразовать" while recording/paused, finalize WAV first.
      const before = get();
      if ((before.status === "recording" || before.status === "paused") && !before.recording) {
        await before.stop();
      } else if (before.status === "recording") {
        before.pause();
      }

      const s = get();

      // Prefer STT from audio file when available.
      if (s.recording?.blob) {
        set({ status: "uploading", error: null });
        const created = await createSttTranscription({
          file: s.recording.blob,
          language: "ru-RU",
          mode: "auto",
          postProcess: true,
          style: "chat",
          kind: s.transformKind,
        });

        if (created.status === "failed") {
          throw new Error(created.error?.message || "STT failed");
        }

        if (created.status === "done") {
          const dictated = (created.textRaw ?? "").trim();
          const converted = (created.text ?? "").trim();
          set({
            status: "recorded",
            dictatedText: dictated,
            dictatedDirty: false,
            convertedText: converted,
            error: null,
          });
          return;
        }

        set({ status: "processing" });
        const id = created.id;

        for (let attempt = 0; attempt < 60; attempt++) {
          await sleep(800);
          const task = await getSttTranscription(id);
          if (task.status === "processing") continue;
          if (task.status === "failed") {
            throw new Error(task.error?.message || "STT failed");
          }

          const dictated = (task.textRaw ?? "").trim();
          const converted = (task.text ?? "").trim();
          set({
            status: "recorded",
            dictatedText: dictated,
            dictatedDirty: false,
            convertedText: converted,
            error: null,
          });
          return;
        }

        throw new Error("STT timeout");
      }

      // Fallback: LLM-only post-process of already dictated text (e.g. WebSpeech API).
      const text = s.dictatedText.trim();
      if (!text) return;

      set({ status: "converting", error: null });

      const json = await postProcessText({
        text,
        language: "ru",
        style: "chat",
        kind: s.transformKind,
      });
      const out = typeof json?.text === "string" ? json.text : "";
      set({ convertedText: out, status: "recorded", error: null });
    } catch (e) {
      set({
        status: "error",
        error: e instanceof Error ? e.message : "Ошибка бэкенда",
      });
    }
  },
}));
