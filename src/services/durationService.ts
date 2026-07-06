import { invoke } from "@tauri-apps/api/core";
import type { Song } from "../types/music";
import { resolveBrowserAudioFile } from "./browserFileService";

const METADATA_TIMEOUT_MS = 15_000;

function getAudioMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "mp3": return "audio/mpeg";
    case "flac": return "audio/flac";
    case "wav": return "audio/wav";
    case "m4a": return "audio/mp4";
    case "ogg": return "audio/ogg";
    case "opus": return "audio/opus";
    default: return "audio/*";
  }
}

export async function readAudioDuration(song: Song): Promise<number> {
  let objectUrl: string | null = null;
  let src: string;

  if (song.sourceType === "tauri") {
    const response = await invoke<ArrayBuffer | Uint8Array | number[]>(
      "read_audio_file",
      { path: song.path },
    );
    const bytes =
      response instanceof ArrayBuffer
        ? new Uint8Array(response)
        : Uint8Array.from(response);
    const blob = new Blob([bytes], { type: getAudioMimeType(song.path) });
    objectUrl = URL.createObjectURL(blob);
    src = objectUrl;
  } else {
    const file = await resolveBrowserAudioFile(song.path);
    if (!file) return -1;
    objectUrl = URL.createObjectURL(file);
    src = objectUrl;
  }

  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;

    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      audio.removeAttribute("src");
      audio.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };

    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration >= 0) {
        finish(audio.duration);
      }
    };

    const timeout = window.setTimeout(() => finish(-1), METADATA_TIMEOUT_MS);
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", readDuration, { once: true });
    audio.addEventListener("durationchange", readDuration);
    audio.addEventListener("error", () => finish(-1), { once: true });
    audio.src = src;
    audio.load();
  });
}
