import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Note } from "./notes.types";

export type AddNotePayload = {
  dictatedText?: string;
  convertedText?: string;
};

type NotesState = {
  notes: Note[];
  query: string;
  selectedNoteId: string | null;
  setQuery: (query: string) => void;
  addNote: (payload: AddNotePayload) => string;
  updateNoteText: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      query: "",
      selectedNoteId: null,
      setQuery: (query) => set({ query }),
      addNote: ({ dictatedText, convertedText }) => {
        const mainText = (convertedText?.trim() || dictatedText?.trim() || "").trim();
        const note: Note = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          text: mainText,
          dictatedText: dictatedText?.trim() ? dictatedText.trim() : undefined,
          convertedText: convertedText?.trim() ? convertedText.trim() : undefined,
        };
        set((s) => ({ notes: [note, ...s.notes], selectedNoteId: note.id }));
        return note.id;
      },
      updateNoteText: (id, text) =>
        set((s) => ({
          notes: s.notes.map((n) => {
            if (n.id !== id) return n;
            const nextText = text.trim();
            const hasConverted = !!n.convertedText?.trim();
            const hasDictated = !!n.dictatedText?.trim();
            return {
              ...n,
              text: nextText,
              convertedText: hasConverted ? nextText : n.convertedText,
              dictatedText: !hasConverted && hasDictated ? nextText : n.dictatedText,
            };
          }),
        })),
      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
          selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
        })),
      selectNote: (id) => set({ selectedNoteId: id }),
    }),
    {
      name: "notes-storage-v1",
      partialize: (s) => ({ notes: s.notes }),
    }
  )
);

