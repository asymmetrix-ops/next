/**
 * Contributions are saved as drafts first and sent together: nothing reaches the team (and no
 * notification email goes out) until the contributor presses "Send all changes". One email
 * then covers everything. Drafts live in this browser, so a refresh keeps them.
 */
import {
  createChangeRequest as sendChangeRequest,
  notifyDataContribution as sendNotification,
  type ChangeRequestPayload,
  type DataContributionNotificationPayload,
} from "@/lib/contributorCrm/api";
import { readIdentity } from "@/lib/contributorCrm/identity";
import { authService } from "@/lib/contributorCrm/auth";

type DraftNotice = Omit<DataContributionNotificationPayload, "contributor_name"> & {
  contributor_name?: string;
};
type Draft = { id: string; payload: ChangeRequestPayload; notice?: DraftNotice; savedAt: number };

const key = (companyId: string | number) => `contributor-drafts:${companyId}`;
const SENT_KEY = (companyId: string | number) => `contributor-sent:${companyId}`;
const EVENT = "contributor-drafts-changed";

function read(companyId: string | number): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key(companyId)) || "[]");
    return Array.isArray(parsed) ? (parsed as Draft[]) : [];
  } catch {
    return [];
  }
}

function write(companyId: string | number, drafts: Draft[]) {
  try {
    localStorage.setItem(key(companyId), JSON.stringify(drafts));
  } catch {
    /* storage unavailable: drafts still live for this visit through the event below */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function draftCount(companyId: string | number): number {
  return read(companyId).length;
}

export function subscribeDrafts(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function companyOf(payload: ChangeRequestPayload): number {
  return Number((payload as { new_company_id?: unknown }).new_company_id);
}

/** Same name-and-role rule as sending, so the contributor is asked at save time. */
function assertIdentity() {
  if (authService.getAuthToken()) return;
  const { name, role } = readIdentity();
  if (!name.trim() || !role.trim()) throw new Error("Please enter your name and role.");
}

/** Saves one section's change as a draft. Nothing is sent yet. */
export async function saveDraftChangeRequest(payload: ChangeRequestPayload): Promise<void> {
  assertIdentity();
  const companyId = companyOf(payload);
  const drafts = read(companyId);
  drafts.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, payload, savedAt: Date.now() });
  write(companyId, drafts);
}

/** Remembers what the single notification email should mention for the latest draft. */
export async function saveDraftNotice(notice: DraftNotice): Promise<void> {
  const companyMatch = /\/contributor-crm\/(\d+)/.exec(typeof window !== "undefined" ? window.location.pathname : "");
  const companyId = companyMatch?.[1];
  if (!companyId) return;
  const drafts = read(companyId);
  const last = drafts[drafts.length - 1];
  if (last) {
    last.notice = notice;
    write(companyId, drafts);
  }
}

/** True once the contributor has sent something from this browser (keeps the Benchmark open). */
export function hasSentBefore(companyId: string | number): boolean {
  try {
    return localStorage.getItem(SENT_KEY(companyId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Sends every draft, then exactly one notification email. The link stays open: the
 * contributor can keep adding or editing data and send again later.
 */
export async function submitAllDrafts(companyId: string | number, token: string | null): Promise<void> {
  const drafts = read(companyId);
  if (drafts.length === 0) throw new Error("There is nothing to send yet.");

  // Each request is removed as soon as it is sent, so a retry never sends one twice.
  for (const draft of [...drafts]) {
    await sendChangeRequest(draft.payload);
    const rest = read(companyId).filter((d) => d.id !== draft.id);
    write(companyId, rest);
  }

  const notices = drafts.map((d) => d.notice).filter((n): n is DraftNotice => Boolean(n));
  if (notices.length > 0) {
    const first = notices[0];
    const fields = Array.from(new Set(notices.map((n) => n.field_name).filter(Boolean)));
    const notes = Array.from(new Set(notices.map((n) => n.notes).filter(Boolean)));
    try {
      await sendNotification(token, {
        ...first,
        contributor_name: first.contributor_name ?? "",
        field_name: fields.join(", "),
        notes: notes.join(" | "),
      });
    } catch (e) {
      // The requests are in; a failed notification must not block the contributor.
      console.error("Data contribution notification failed:", e);
    }
  }

  try {
    localStorage.setItem(SENT_KEY(companyId), "1");
  } catch {
    /* only used to keep the Benchmark open */
  }
  window.dispatchEvent(new Event(EVENT));
}
