type CsvDownloadEntry = {
  content: string;
  filename: string;
  expiresAt: number;
};

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, CsvDownloadEntry>();

function pruneExpired(): void {
  const now = Date.now();
  store.forEach((entry, token) => {
    if (entry.expiresAt <= now) store.delete(token);
  });
}

export function stashCsvDownload(
  content: string,
  filename: string
): string {
  pruneExpired();
  const token = crypto.randomUUID();
  store.set(token, {
    content,
    filename,
    expiresAt: Date.now() + TTL_MS,
  });
  return token;
}

/** Read without deleting — browsers may request the download URL more than once. */
export function getCsvDownload(
  token: string
): { content: string; filename: string } | null {
  pruneExpired();
  const entry = store.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    store.delete(token);
    return null;
  }
  return { content: entry.content, filename: entry.filename };
}
