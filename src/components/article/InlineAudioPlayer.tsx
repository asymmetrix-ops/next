"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";

type PlaybackRate = 0.75 | 1 | 1.25 | 1.5;

export default function InlineAudioPlayer(props: {
  src: string;
  title?: string;
  subtitle?: string;
  initialRate?: PlaybackRate;
}) {
  const { src, title, subtitle, initialRate = 1 } = props;
  // react-h5-audio-player exposes the underlying <audio> element as `ref.current.audio.current`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(initialRate);

  const rates = useMemo<PlaybackRate[]>(() => [0.75, 1, 1.25, 1.5], []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioEl = (playerRef.current as any)?.audio?.current as
      | HTMLAudioElement
      | undefined;
    if (!audioEl) return;
    audioEl.playbackRate = playbackRate;
  }, [playbackRate, src]);

  return (
    <div className="inline-audio-player" role="group" aria-label="Audio player">
      <div className="inline-audio-header">
        <div className="inline-audio-title">
          {title || "Listen to this article now"}
          {subtitle ? (
            <span className="inline-audio-subtitle">{subtitle}</span>
          ) : null}
        </div>

        <div className="inline-audio-controls">
          <label className="inline-audio-rate-label">
            <span className="sr-only">Playback speed</span>
            <select
              className="inline-audio-rate"
              value={playbackRate}
              onChange={(e) =>
                setPlaybackRate(Number(e.target.value) as PlaybackRate)
              }
              aria-label="Playback speed"
            >
              {rates.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <AudioPlayer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={playerRef as any}
        autoPlay={false}
        src={src}
        preload="metadata"
        showJumpControls={false}
        showSkipControls={false}
        customAdditionalControls={[]}
        customVolumeControls={[]}
        // Keep it close to the screenshot: time + progress + duration
        customProgressBarSection={[
          RHAP_UI.CURRENT_TIME,
          RHAP_UI.PROGRESS_BAR,
          RHAP_UI.DURATION,
        ]}
      />
    </div>
  );
}


