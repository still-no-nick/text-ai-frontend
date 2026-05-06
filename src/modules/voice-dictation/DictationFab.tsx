import { Mic, Pause } from "lucide-react";
import { Fab } from "../../shared/ui/Fab";
import { useVoiceDictationStore } from "./voice-dictation.store";
import { useVoiceDictation } from "./useVoiceDictation";

export const DictationFab = () => {
  const open = useVoiceDictationStore((s) => s.open);
  const isOpen = useVoiceDictationStore((s) => s.isOpen);
  const { status, pause, resume } = useVoiceDictation();
  const isRecording = status === "recording";

  return (
    <Fab
      onClick={() => {
        if (isRecording) {
          pause();
          return;
        }
        if (isOpen) {
          resume();
          return;
        }
        open();
      }}
      title={isRecording ? "Пауза" : "Диктовка"}
    >
      {isRecording ? <Pause className="size-6" /> : <Mic className="size-6" />}
    </Fab>
  );
};
