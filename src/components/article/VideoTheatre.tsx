"use client";

import React, { useCallback, useRef } from "react";

export interface VideoTheatreProps {
  /** Video source URL (e.g. MP4) */
  src: string;
  /** Optional title for accessibility / caption */
  title?: string;
  /** Optional callback when user clicks Close (e.g. pause + reset + exit fullscreen). If not provided, Close only resets the video and exits fullscreen. */
  onClose?: () => void;
  /** Optional class name for the root container */
  className?: string;
}

const VideoTheatre: React.FC<VideoTheatreProps> = ({
  src,
  title = "Video",
  onClose,
  className = "",
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleFullscreen = useCallback(async () => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (wrapper) {
        await wrapper.requestFullscreen();
      }
    } catch {
      if (video?.requestFullscreen) {
        try {
          await video.requestFullscreen();
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const exitVideo = useCallback(async () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (document.fullscreenElement?.contains(wrapperRef.current ?? null) && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
    // Older Safari fullscreen API (best-effort)
    const v = videoRef.current as HTMLVideoElement & {
      webkitSupportsFullscreen?: boolean;
      webkitDisplayingFullscreen?: boolean;
      webkitExitFullscreen?: () => void;
    };
    if (v?.webkitSupportsFullscreen && v?.webkitDisplayingFullscreen && v?.webkitExitFullscreen) {
      try {
        v.webkitExitFullscreen();
      } catch {
        // ignore
      }
    }
    onClose?.();
  }, [onClose]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className={`video-theatre ${className}`.trim()}>
      <div className="video-theatre-wrapper" ref={wrapperRef}>
        <div className="video-theatre-actions">
          <button
            type="button"
            className="video-theatre-btn"
            onClick={toggleFullscreen}
          >
            Fullscreen ⛶
          </button>
          <button
            type="button"
            className="video-theatre-btn"
            onClick={exitVideo}
          >
            Close ✕
          </button>
        </div>
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload nofullscreen"
          disablePictureInPicture
          disableRemotePlayback
          onContextMenu={handleContextMenu}
          aria-label={title}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoTheatre;
