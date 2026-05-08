export type DictationStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "recorded"
  | "converting"
  | "uploading"
  | "processing"
  | "error";

export type TransformKind = "beautify" | "expand" | "compress";
