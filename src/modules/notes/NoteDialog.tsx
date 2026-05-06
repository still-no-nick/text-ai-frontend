import { useEffect, useMemo, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Dialog } from "../../shared/ui/Dialog";
import { cn } from "../../shared/lib/cn";
import { useNotesStore } from "./notes.store";

export const NoteDialog = () => {
  const notes = useNotesStore((s) => s.notes);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const selectNote = useNotesStore((s) => s.selectNote);
  const updateNoteText = useNotesStore((s) => s.updateNoteText);

  const note = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => n.id === selectedNoteId) ?? null;
  }, [notes, selectedNoteId]);

  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(note?.text ?? "");
  }, [note?.id]);

  const open = selectedNoteId != null;

  return (
    <Dialog open={open} onClose={() => selectNote(null)} className="max-w-3xl w-full !p-0 overflow-hidden">
      <div className="p-6 flex items-start justify-between gap-6 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold">Заметка</h2>
          <div className="text-sm text-muted-foreground mt-1">Полный текст с возможностью редактирования.</div>
        </div>
      </div>

      <div className="p-6">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Текст заметки…"
          className={cn(
            "w-full min-h-[260px] resize-y rounded-lg border border-input bg-background p-3",
            "text-sm leading-6",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        />
      </div>

      <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={() => selectNote(null)} className="sm:flex-1">
          Закрыть
        </Button>
        <Button
          onClick={() => {
            if (!note) return;
            const next = value.trim();
            if (!next) return;
            updateNoteText(note.id, next);
            selectNote(null);
          }}
          className="sm:flex-1"
          disabled={!value.trim() || !note}
        >
          Сохранить
        </Button>
      </div>
    </Dialog>
  );
};

