"use client";

import { useEffect } from "react";

import {
  downloadCsvFromMessage,
  isDownloadCsvMessage,
} from "@/utils/downloadFile";

export default function DownloadMessageListener() {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isDownloadCsvMessage(event.data)) return;
      void downloadCsvFromMessage(event.data.content, event.data.filename);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
