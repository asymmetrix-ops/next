"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            maxWidth: 640,
            margin: "64px auto",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: 16 }}>
            We encountered an unexpected error. Try reloading the page. If the
            problem persists, please clear your browser cache and try again.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 14px",
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            >
              Reload
            </button>
            <button
              onClick={reset}
              style={{
                padding: "8px 14px",
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
