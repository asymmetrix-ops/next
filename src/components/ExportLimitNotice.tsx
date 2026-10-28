"use client";

import React, { useEffect, useState } from "react";
import {
  EXPORT_LIMIT_NOTICE_EVENT,
  EXPORT_LIMIT_NOTICE_READY_FLAG,
  type ExportLimitNoticeDetail,
} from "@/lib/listExport/exportLimit";

/** Mounted once in the root layout; shown when an export was cut to the user's limit. */
export const ExportLimitNotice: React.FC = () => {
  const [notice, setNotice] = useState<ExportLimitNoticeDetail | null>(null);

  useEffect(() => {
    const flags = window as unknown as Record<string, unknown>;
    const onNotice = (event: Event) => {
      setNotice((event as CustomEvent<ExportLimitNoticeDetail>).detail);
    };
    window.addEventListener(EXPORT_LIMIT_NOTICE_EVENT, onNotice);
    flags[EXPORT_LIMIT_NOTICE_READY_FLAG] = true;
    return () => {
      window.removeEventListener(EXPORT_LIMIT_NOTICE_EVENT, onNotice);
      flags[EXPORT_LIMIT_NOTICE_READY_FLAG] = false;
    };
  }, []);

  if (!notice) return null;

  const close = () => {
    notice.done();
    setNotice(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={close}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "460px",
          width: "90%",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1a202c",
            margin: "0 0 12px",
          }}
        >
          Export limited
        </h2>
        <p
          style={{
            fontSize: "15px",
            color: "#4a5568",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          {notice.message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            autoFocus
            onClick={close}
            style={{
              backgroundColor: "#0075df",
              color: "white",
              fontWeight: 600,
              padding: "10px 24px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
