"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A silent Remotion video (~/Code/immotrim-promo). Plays muted and looping
 * while it is on screen and pauses when you scroll past; click to pause.
 */
export function LandingVideo({
  name,
  label,
  playLabel,
  pauseLabel,
  className = "",
}: {
  /** File stem in public/video: `${name}.mp4` plus `poster-${poster}.jpg`. */
  name: "immotrim-promo" | "upload" | "bank";
  label: string;
  playLabel: string;
  pauseLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const poster = name === "immotrim-promo" ? "promo" : name;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-[var(--line-strong)] bg-black shadow-[0_40px_120px_rgba(0,0,0,0.5)] ${className}`}
    >
      <video
        ref={ref}
        src={`/video/${name}.mp4`}
        poster={`/video/poster-${poster}.jpg`}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={toggle}
        className="block aspect-video w-full cursor-pointer"
        aria-label={label}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
        className={`absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-opacity ${
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        {playing ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
      </button>
    </div>
  );
}
