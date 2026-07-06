import { LocateFixed, FileMusic } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AmllLyricLine, LyricLine } from "../types/lyric";
import { EmptyState } from "./EmptyState";

interface LyricViewProps {
  lines: LyricLine[];
  amllLines: AmllLyricLine[];
  plainLines?: string[];
  currentTime: number;
  isPlaying: boolean;
  onSeek: (seconds: number) => Promise<void>;
  onImport?: () => void;
}

export function LyricView({
  lines,
  plainLines = [],
  currentTime,
  onSeek,
  onImport,
}: LyricViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<string, HTMLButtonElement>());
  const isAutoScrollingRef = useRef(false);
  const autoScrollTimerRef = useRef<number | null>(null);
  const [followCurrentLyric, setFollowCurrentLyric] = useState(true);
  const activeIndex = useMemo(() => {
    let index = -1;
    for (let cursor = 0; cursor < lines.length; cursor += 1) {
      if (lines[cursor].startTime > currentTime) break;
      index = cursor;
    }
    return index;
  }, [currentTime, lines]);
  const activeStartTime = activeIndex >= 0 ? lines[activeIndex].startTime : -1;

  function scrollToCurrent(behavior: ScrollBehavior = "smooth") {
    const line = lines[activeIndex];
    if (!line) return;
    isAutoScrollingRef.current = true;
    lineRefs.current.get(line.id)?.scrollIntoView({
      behavior,
      block: "center",
      inline: "nearest",
    });
    if (autoScrollTimerRef.current) window.clearTimeout(autoScrollTimerRef.current);
    autoScrollTimerRef.current = window.setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, behavior === "smooth" ? 700 : 80);
  }

  useEffect(() => {
    setFollowCurrentLyric(true);
    const frame = window.requestAnimationFrame(() => scrollToCurrent("auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [lines]);

  useEffect(() => {
    if (!followCurrentLyric || activeIndex < 0) return;
    scrollToCurrent();
  }, [activeIndex, followCurrentLyric]);

  useEffect(() => () => {
    if (autoScrollTimerRef.current) window.clearTimeout(autoScrollTimerRef.current);
  }, []);

  if (lines.length === 0 && plainLines.length > 0) {
    return (
      <div className="plain-lyrics">
        <span>仅有纯文本歌词，无法逐行同步。</span>
        {plainLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        compact
        icon={FileMusic}
        title="暂无歌词"
        description="可为当前歌曲导入一个 .lrc 文件"
        action={onImport && (
          <button className="ghost-button" onClick={onImport}>
            <FileMusic />
            导入歌词
          </button>
        )}
      />
    );
  }

  function handleUserScroll(force = false) {
    if (isAutoScrollingRef.current && !force) return;
    isAutoScrollingRef.current = false;
    setFollowCurrentLyric(false);
  }

  function returnToCurrent() {
    setFollowCurrentLyric(true);
    scrollToCurrent();
  }

  function handleLyricClick(line: LyricLine) {
    setFollowCurrentLyric(true);
    void onSeek(line.startTime);
  }

  return (
    <div className="lyric-player-shell">
      <div
        className="lyric-scroll"
        ref={containerRef}
        onScroll={() => handleUserScroll()}
        onWheel={() => handleUserScroll(true)}
        onTouchMove={() => handleUserScroll(true)}
        onPointerMove={(event) => {
          if (event.buttons) handleUserScroll(true);
        }}
      >
        <div className="lyric-scroll__spacer" />
        {lines.map((line, index) => {
          const distance = activeIndex < 0 ? Number.POSITIVE_INFINITY : Math.abs(index - activeIndex);
          const lineState = (activeIndex >= 0 && line.startTime === activeStartTime)
            ? "is-current"
            : distance === 1
              ? "is-near-current"
              : distance === 2
                ? "is-mid-current"
                : "is-far-current";
          return (
            <button
              className={`lyric-line ${lineState}`}
              key={line.id}
              ref={(element) => {
                if (element) lineRefs.current.set(line.id, element);
                else lineRefs.current.delete(line.id);
              }}
              onClick={() => handleLyricClick(line)}
            >
              {line.text}
            </button>
          );
        })}
        <div className="lyric-scroll__spacer" />
      </div>
      {!followCurrentLyric && (
        <button className="return-to-lyric" onClick={returnToCurrent}>
          <LocateFixed />
          回到当前歌词
        </button>
      )}
    </div>
  );
}
