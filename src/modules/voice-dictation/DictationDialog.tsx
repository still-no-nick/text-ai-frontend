import { Mic, Pause, Save, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../shared/ui/Button";
import { Dialog } from "../../shared/ui/Dialog";
import { cn } from "../../shared/lib/cn";
import { useVoiceDictation } from "./useVoiceDictation";
import { useVoiceDictationStore } from "./voice-dictation.store";
import { VoiceLevelBars } from "./VoiceLevelBars";
import { useNotesStore } from "../notes/notes.store";

export const DictationDialog = () => {
  const isOpen = useVoiceDictationStore((s) => s.isOpen);
  const close = useVoiceDictationStore((s) => s.close);

  const addNote = useNotesStore((s) => s.addNote);
  const clearDraft = useNotesStore((s) => s.clearDraft);

  const { status, level, interimText, finalText, currentText, error, startNew, pause, resume, stop } =
    useVoiceDictation();

  useEffect(() => {
    if (isOpen && status === "idle") {
      startNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, status]);

  const handleClose = () => {
    stop();
    clearDraft();
    close();
  };

  const handleSave = () => {
    const text = currentText.trim();
    if (!text) return;
    addNote(text);
    stop();
    clearDraft();
    close();
  };

  const handleDiscard = () => {
    stop();
    clearDraft();
    close();
  };

  const isRecording = status === "recording";
  const isPaused = status === "paused";

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="max-w-3xl w-full !p-0 overflow-hidden"
    >
      <div className="p-6 flex items-center justify-between border-b border-border">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">Запись заметки</h2>
          <p className="text-sm text-muted-foreground">
            Нажмите на активный микрофон, чтобы поставить на паузу.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {isRecording ? "Listening…" : isPaused ? "Paused" : status === "requesting" ? "Starting…" : ""}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <div className="flex flex-col items-center gap-4">
          <button
            className={cn(
              "size-24 rounded-full flex items-center justify-center transition-all",
              "bg-primary text-primary-foreground",
              isRecording && "animate-pulse ring-4 ring-primary/30"
            )}
            onClick={isRecording ? pause : resume}
            disabled={status === "requesting" || status === "error"}
            title={isRecording ? "Пауза" : "Продолжить"}
          >
            {isRecording ? <Pause className="size-10" /> : <Mic className="size-10" />}
          </button>

          <VoiceLevelBars level={level} />

          <div className="w-full rounded-lg border border-border bg-card p-4 text-sm">
            <div className="text-muted-foreground">Текущее состояние</div>
            <div className="mt-1 font-medium">
              {isRecording ? "Идёт запись" : isPaused ? "Пауза" : "Ожидание"}
            </div>
          </div>
        </div>

        <div className="min-h-[220px] max-h-[360px] overflow-y-auto rounded-lg border border-border bg-muted p-4">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {finalText}
              {interimText && (
                <span className="text-muted-foreground">{` ${interimText}`}</span>
              )}
              {!finalText && !interimText && (
                <span className="text-muted-foreground">Начните говорить...</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleDiscard} className="sm:flex-1">
          <Trash2 className="size-4 mr-2" />
          Удалить
        </Button>
        <Button onClick={handleSave} className="sm:flex-1" disabled={!currentText.trim()}>
          <Save className="size-4 mr-2" />
          Сохранить заметку
        </Button>
      </div>
    </Dialog>
  );
};
