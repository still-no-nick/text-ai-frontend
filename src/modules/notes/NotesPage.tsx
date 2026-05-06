import { Copy, History, Home, Search, Settings } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../shared/lib/cn";
import { IconButton } from "../../shared/ui/IconButton";
import { useNotesStore } from "./notes.store";
import { DictationFab } from "../voice-dictation/DictationFab";
import { DictationDialog } from "../voice-dictation/DictationDialog";
import { NoteDialog } from "./NoteDialog";

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const snippet = (text: string) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 60 ? normalized.slice(0, 60) + "…" : normalized;
};

export const NotesPage = () => {
  const notes = useNotesStore((s) => s.notes);
  const query = useNotesStore((s) => s.query);
  const setQuery = useNotesStore((s) => s.setQuery);
  const selectNote = useNotesStore((s) => s.selectNote);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.text.toLowerCase().includes(q));
  }, [notes, query]);

  const onCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex">
      <aside className="w-64 border-r border-border bg-card/50">
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            F
          </div>
          <div className="font-semibold">Flow Notes</div>
        </div>

        <nav className="px-3 py-2 text-sm">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
              disabled
            >
              <Home className="size-4" />
              Home
            </button>

            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2",
                "bg-muted text-foreground"
              )}
            >
              <History className="size-4" />
              History
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
              disabled
            >
              <Settings className="size-4" />
              Settings
            </button>
          </div>
        </nav>

        <div className="px-6 py-6 mt-auto text-xs text-muted-foreground">
          All notes are private and stored locally on your device.
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="px-8 py-6 flex items-start justify-between gap-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-semibold">History</h1>
            <div className="text-sm text-muted-foreground mt-1">
              All transcripts are private and stored locally on your device.
            </div>
          </div>

          <div className="relative w-[320px] max-w-full">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className={cn(
                "w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3",
                "text-sm placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            />
          </div>
        </header>

        <section className="px-8 py-6">
          <div className="text-sm font-medium text-muted-foreground mb-3">Today</div>

          <div className="rounded-xl border border-border overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Пока нет заметок. Нажмите на микрофон, чтобы создать первую.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    className="grid grid-cols-[110px_1fr_120px] items-center gap-4 px-4 py-3 bg-card hover:bg-card/70 transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={() => selectNote(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectNote(n.id);
                      }
                    }}
                  >
                    <div className="text-sm text-muted-foreground">{formatTime(n.createdAt)}</div>
                    <div className="text-sm">{snippet(n.text)}</div>
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onCopy(n.text);
                        }}
                        title="Copy"
                      >
                        <Copy className="size-4" />
                      </IconButton>
                      <IconButton size="sm" disabled title="More">
                        <span className="text-muted-foreground">…</span>
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <DictationFab />
        <DictationDialog />
        <NoteDialog />
      </main>
    </div>
  );
};

