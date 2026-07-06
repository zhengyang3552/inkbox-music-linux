import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import type { Song } from "../types/music";
import { resolveBrowserAudioFile } from "./browserFileService";

let activeObjectUrl: string | null = null;

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

export async function resolveSongSrc(song: Song): Promise<string | null> {
  if (song.sourceType === "tauri") {
    if (!(await exists(song.path))) return null;
    // Linux 下 convertFileSrc 在 WebKitGTK 中无法正常播放，改用后端读取文件
    const response = await invoke<ArrayBuffer | Uint8Array | number[]>(
      "read_audio_file",
      { path: song.path },
    );
    const bytes =
      response instanceof ArrayBuffer
        ? new Uint8Array(response)
        : Uint8Array.from(response);
    const blob = new Blob([bytes], { type: getAudioMimeType(song.path) });
    if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = URL.createObjectURL(blob);
    return activeObjectUrl;
  }

  const file = await resolveBrowserAudioFile(song.path);
  if (!file) return null;
  if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
  activeObjectUrl = URL.createObjectURL(file);
  return activeObjectUrl;
}
