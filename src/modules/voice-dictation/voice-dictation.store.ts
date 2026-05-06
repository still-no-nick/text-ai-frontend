import { create } from "zustand";

type VoiceDictationState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useVoiceDictationStore = create<VoiceDictationState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
