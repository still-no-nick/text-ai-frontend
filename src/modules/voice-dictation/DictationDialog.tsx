import { Mic, Save, X, Wand2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../shared/ui/Button";
import { Dialog } from "../../shared/ui/Dialog";
import { cn } from "../../shared/lib/cn";
import { useVoiceDictation } from "./useVoiceDictation";
import { useVoiceDictationStore } from "./voice-dictation.store";
import { VoiceLevelBars } from "./VoiceLevelBars";
import { useNotesStore } from "../notes/notes.store";
import type { TransformKind } from "./voice-dictation.types";

export const DictationDialog = () => {
  const isOpen = useVoiceDictationStore((s) => s.isOpen);
  const close = useVoiceDictationStore((s) => s.close);

  const addNote = useNotesStore((s) => s.addNote);
  const selectNote = useNotesStore((s) => s.selectNote);

  const {
    status,
    level,
    error,
    startNew,
    stop,
    reset,
    dictatedText,
    convertedText,
    transformKind,
    setDictatedText,
    setConvertedText,
    setTransformKind,
    convertText,
  } = useVoiceDictation();

  useEffect(() => {
    if (isOpen && status === "idle") {
      startNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, status]);

  useEffect(() => {
    if (isOpen) return;
    if (status === "idle") return;
    void (async () => {
      await stop();
      reset();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, status]);

  const handleClose = () => {
    void (async () => {
      await stop();
      reset();
      close();
    })();
  };

  const handleSave = () => {
    const text = convertedText.trim() || dictatedText.trim();
    if (!text) return;
    void (async () => {
      addNote({ dictatedText: dictatedText.trim(), convertedText: convertedText.trim() });
      // Prevent opening the note editor dialog right after saving from dictation.
      selectNote(null);
      await stop();
      reset();
      close();
    })();
  };

  const handleCancel = () => {
    void (async () => {
      await stop();
      reset();
      close();
    })();
  };

  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isConverting = status === "converting";
  const isUploading = status === "uploading";
  const isProcessing = status === "processing";
  const isBusy = status === "requesting" || isConverting || isUploading || isProcessing;
  const canConvert = !!dictatedText.trim() || status === "recorded";
  const canStop = status === "requesting" || status === "recording" || status === "paused";

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="max-w-6xl w-full !p-0 overflow-hidden"
    >
      <div className="p-6 flex items-center justify-between border-b border-border">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Запись заметки</h2>
          <p className="text-sm text-muted-foreground">
            Нажмите на активный микрофон, чтобы остановить запись.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-[260px] flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Тип преобразования</div>
            <select
              className={cn(
                "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              value={transformKind}
              onChange={(e) => setTransformKind(e.target.value as TransformKind)}
              disabled={isBusy}
            >
              <option value="beautify">Орфография (без изменения смысла)</option>
              <option value="expand">Расширить (по смыслу, с перефразированием)</option>
              <option value="compress">Сжать (оставить суть)</option>
            </select>
          </div>

          <div className="text-sm text-muted-foreground min-w-[120px] text-right">
            {isRecording
              ? "Listening…"
              : isPaused
                ? "Paused"
                : status === "requesting"
                  ? "Starting…"
                  : status === "uploading"
                    ? "Uploading…"
                    : status === "processing"
                      ? "Processing…"
                      : status === "converting"
                    ? "Converting…"
                    : status === "recorded"
                    ? "Ready"
                    : ""}
          </div>
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
            onClick={() => {
              void (async () => {
                if (canStop) await stop();
              })();
            }}
            disabled={status === "error" || isBusy || (!canStop && status !== "idle")}
            title={canStop ? "Стоп" : "Запись запускается автоматически"}
          >
            <Mic className="size-10" />
          </button>

          <VoiceLevelBars level={level} />

          <div className="w-full rounded-lg border border-border bg-card p-4 text-sm">
            <div className="text-muted-foreground">Текущее состояние</div>
            <div className="mt-1 font-medium">
              {isRecording
                ? "Идёт запись"
                : isPaused
                  ? "Пауза"
                  : status === "uploading"
                    ? "Загрузка аудио…"
                    : status === "processing"
                      ? "Распознавание…"
                      : status === "converting"
                        ? "Преобразование…"
                        : status === "recorded"
                          ? "Запись готова"
                          : "Ожидание"}
            </div>
          </div>
        </div>

        <div className="min-h-[220px] max-h-[420px] overflow-y-auto rounded-lg border border-border bg-muted p-4">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Надиктованный текст</div>
                <textarea
                  value={dictatedText}
                  onChange={(e) => setDictatedText(e.target.value)}
                  placeholder="Нажмите на микрофон и начните говорить…"
                  className={cn(
                    "w-full min-h-[160px] resize-y rounded-md border border-input bg-background p-3",
                    "text-sm leading-6",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  disabled={status === "requesting" || status === "error"}
                />
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Преобразованный текст</div>
                <textarea
                  value={convertedText}
                  onChange={(e) => setConvertedText(e.target.value)}
                  placeholder="Нажмите «Преобразовать», чтобы получить результат…"
                  className={cn(
                    "w-full min-h-[160px] resize-y rounded-md border border-input bg-background p-3",
                    "text-sm leading-6",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  disabled={isBusy}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => void convertText()}
          className="sm:flex-1"
          disabled={!canConvert || isBusy || status === "error"}
          title={!canConvert ? "Введите надиктованный текст" : undefined}
        >
          <Wand2 className="size-4 mr-2" />
          {isUploading
            ? "Загрузка…"
            : isProcessing
              ? "Распознавание…"
              : isConverting
                ? "Преобразование…"
                : "Преобразовать"}
        </Button>
        <Button onClick={handleSave} className="sm:flex-1" disabled={!(convertedText.trim() || dictatedText.trim()) || isBusy}>
          <Save className="size-4 mr-2" />
          Сохранить
        </Button>
        <Button variant="outline" onClick={handleCancel} className="sm:flex-1" disabled={isBusy}>
          <X className="size-4 mr-2" />
          Отменить
        </Button>
      </div>
    </Dialog>
  );
};
