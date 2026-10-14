"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { getNewsFollowing, setNewsFollowing } from "@/lib/news";

export default function FollowNewsButton() {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setFollowing(getNewsFollowing()), []);

  const apply = async (next: boolean) => {
    setBusy(true);
    try {
      await setNewsFollowing(next);
      setFollowing(next);
      toast.success(next ? "You'll get an email whenever we publish news." : "You've stopped receiving news emails.");
    } catch {
      toast.error("Couldn't update your preference. Please try again.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        aria-pressed={following}
        className={`nw-btn ${following ? "nw-btn-following" : "nw-btn-outline"}`}
        onClick={() => (following ? setConfirming(true) : apply(true))}
      >
        {following ? (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Following
          </>
        ) : (
          "Follow news"
        )}
      </button>

      {confirming && (
        <div
          role="presentation"
          onClick={() => !busy && setConfirming(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 10000 }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="nw-unfollow-title"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 14, boxShadow: "0 20px 48px rgba(15,23,42,0.22)", padding: 24 }}
          >
            <h2 id="nw-unfollow-title" style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
              Stop receiving news emails?
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, lineHeight: 1.5, color: "#64748b" }}>
              You will no longer get an email when we publish a news article. You can follow again at any time.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="nw-btn nw-btn-outline" disabled={busy} onClick={() => setConfirming(false)}>
                Keep following
              </button>
              <button type="button" className="nw-btn nw-btn-primary" disabled={busy} onClick={() => apply(false)} autoFocus>
                {busy ? "Updating…" : "Stop emails"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
