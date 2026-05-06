import { create } from "zustand";
import type { DictationStatus } from "./voice-dictation.types";
import { useNotesStore } from "../notes/notes.store";

type VoiceDictationState = {
  status: DictationStatus;
  level: number;
  interimText: string;
  finalText: string;
  currentText: string;
  error: string | null;
  startNew: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

let recognition: SpeechRecognition | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationFrame: number | null = null;
let stream: MediaStream | null = null;
let committed = "";

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
  getStatus: () => DictationStatus
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

    set({
      interimText: interim,
      finalText: committedTrimmed,
      currentText,
    });

    useNotesStore.getState().setDraft(currentText);
  };

  r.onerror = () => {
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
  error: null,

  startNew: () => {
    committed = "";
    set({ interimText: "", finalText: "", currentText: "", error: null });
    useNotesStore.getState().setDraft("");
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
      recognition = createRecognition(set, () => get().status);
      recognition.start();
      set({ status: "recording" });
    } catch (err) {
      stopLevelMeter(set);
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Не удалось получить доступ к микрофону",
      });
    }
  },

  stop: () => {
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
    set({ status: "idle", level: 0 });
  },
}));
