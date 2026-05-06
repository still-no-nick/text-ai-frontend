import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Note } from "./notes.types";

type NotesState = {
  notes: Note[];
  draft: string;
  query: string;
  selectedNoteId: string | null;
  setDraft: (draft: string) => void;
  clearDraft: () => void;
  setQuery: (query: string) => void;
  addNote: (text: string) => void;
  updateNoteText: (id: string, text: string) => void;
  selectNote: (id: string | null) => void;
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      draft: "",
      query: "",
      selectedNoteId: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: "" }),
      setQuery: (query) => set({ query }),
      addNote: (text) => {
        const note: Note = { id: crypto.randomUUID(), createdAt: Date.now(), text };
        set((s) => ({ notes: [note, ...s.notes], selectedNoteId: note.id }));
      },
      updateNoteText: (id, text) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, text } : n)),
        })),
      selectNote: (id) => set({ selectedNoteId: id }),
    }),
    {
      name: "notes-storage-v1",
      partialize: (s) => ({ notes: s.notes }),
    }
  )
);

