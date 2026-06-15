import { NextRequest, NextResponse } from "next/server";

const POSTMARK_API = "https://api.postmarkapp.com";
const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN!;
const XANO_EMAIL_ALERTS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_alerts_all";
const XANO_USERS_EMAIL_FILTERING_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI/users_email_filtering";

const pmHeaders = {
  "X-Postmark-Server-Token": POSTMARK_TOKEN,
  Accept: "application/json",
};

// ── Internal types ────────────────────────────────────────────────────────────

interface PostmarkMessage {
  MessageID: string;
  To: unknown;
  Recipients?: string[];
  Subject: string;
  Status: string;
  ReceivedAt: string;
  Tag?: string;
}

interface PostmarkOpenRecord {
  MessageID: string;
  ReceivedAt: string;
  Recipient: string;
}

interface PostmarkClickRecord {
  MessageID: string;
  ReceivedAt: string;
  Recipient: string;
}

interface XanoAlert {
  id: number;
  user_id: number;
  item_type: string;
  email_frequency: string;
  is_active: boolean;
  last_sent_at_utc: number | null;
  next_run_at_utc: number | null;
  status: string;
}

interface XanoUser {
  id: number;
  name: string;
  email: string;
  status: string;
  seniority_level: string;
  firm_type: string;
  company_id: number | null;
  company_name: string;
}

type UserFilterParams = {
  firm_type: string;
  seniority_level: string;
  user_type: string;
  company_id: number | null;
};

type UserProfile = {
  id: number;
  name: string;
  email: string;
  status: string;
  seniorityLevel: string;
  firmType: string;
  companyId: number | null;
  companyName: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractEmail(to: unknown, recipients?: string[]): string {
  if (Array.isArray(to) && to.length > 0) {
    const first = to[0];
    if (typeof first === "string") return first.toLowerCase().trim();
    if (first && typeof first === "object" && "Email" in first) {
      return String((first as { Email: unknown }).Email ?? "").toLowerCase().trim();
    }
  }
  if (typeof to === "string" && to) return to.toLowerCase().trim();
  if (Array.isArray(recipients) && recipients.length > 0) {
    return String(recipients[0]).toLowerCase().trim();
  }
  return "";
}

/** Paginate any Postmark list endpoint up to `maxRecords`. */
async function pmFetchAll<T>(
  path: string,
  listKey: string,
  dateParams: { fromdate: string; todate: string },
  maxRecords = 5000
): Promise<{ records: T[]; error: string | null; rawFirst: unknown }> {
  const records: T[] = [];
  let offset = 0;
  const count = 500;
  let rawFirst: unknown = null;

  while (records.length < maxRecords) {
    const params = new URLSearchParams({
      count: String(count),
      offset: String(offset),
      ...dateParams,
    });
    const res = await fetch(`${POSTMARK_API}${path}?${params}`, {
      headers: pmHeaders,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        records,
        error: `Postmark ${res.status} ${res.statusText}: ${text}`,
        rawFirst,
      };
    }
    const data = await res.json();
    if (rawFirst === null) rawFirst = data;
    const page: T[] = (data[listKey] as T[]) ?? [];
    records.push(...page);
    if (page.length < count) break;
    offset += count;
  }
  return { records, error: null, rawFirst };
}

async function fetchXanoData<T>(url: string, authHeader: string): Promise<T[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function parseUserFilters(searchParams: URLSearchParams): UserFilterParams {
  const companyIdRaw = searchParams.get("company_id");
  const parsedCompanyId = companyIdRaw ? parseInt(companyIdRaw, 10) : NaN;

  return {
    firm_type: searchParams.get("firm_type") ?? "",
    seniority_level: searchParams.get("seniority_level") ?? "",
    user_type: searchParams.get("user_type") ?? "",
    company_id: Number.isFinite(parsedCompanyId) ? parsedCompanyId : null,
  };
}

async function fetchFilteredUsers(
  authHeader: string,
  filters: UserFilterParams
): Promise<XanoUser[]> {
  const params = new URLSearchParams({
    firm_type: filters.firm_type,
    seniority_level: filters.seniority_level,
    user_type: filters.user_type,
  });
  if (filters.company_id != null) {
    params.set("company_id", String(filters.company_id));
  }

  return fetchXanoData<XanoUser>(
    `${XANO_USERS_EMAIL_FILTERING_URL}?${params.toString()}`,
    authHeader
  );
}

function toUserProfile(user: XanoUser): UserProfile {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    status: user.status ?? "",
    seniorityLevel: user.seniority_level ?? "",
    firmType: user.firm_type ?? "",
    companyId: user.company_id ?? null,
    companyName: user.company_name ?? "",
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "30"), 1), 90);
  const hoursParam = searchParams.get("hours");
  const hours = hoursParam ? Math.min(Math.max(parseInt(hoursParam), 1), 72) : null;
  const authHeader = req.headers.get("authorization") ?? "";
  const userFilters = parseUserFilters(searchParams);

  const now = new Date();
  const cutoff = hours
    ? new Date(now.getTime() - hours * 3600 * 1000)
    : new Date(now.getTime() - days * 86400 * 1000);

  // Add one extra day to fromdate so the date-only param safely covers the cutoff
  const fromDate = new Date(cutoff);
  fromDate.setDate(fromDate.getDate() - 1);
  const toDate = now;

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const dateParams = { fromdate: fmt(fromDate), todate: fmt(toDate) };

  // Parallel fetch: messages + bulk opens + bulk clicks + Xano data
  const [msgResult, opensResult, clicksResult, alerts, users] = await Promise.all([
    pmFetchAll<PostmarkMessage>("/messages/outbound", "Messages", dateParams),
    pmFetchAll<PostmarkOpenRecord>("/messages/outbound/opens", "Opens", dateParams),
    pmFetchAll<PostmarkClickRecord>("/messages/outbound/clicks", "Clicks", dateParams),
    fetchXanoData<XanoAlert>(XANO_EMAIL_ALERTS_URL, authHeader),
    fetchFilteredUsers(authHeader, userFilters),
  ]);

  const allMessages = msgResult.records;
  const allOpens = opensResult.records;
  const allClicks = clicksResult.records;

  // Apply exact time-window filter when hours param is used
  const messages = hours
    ? allMessages.filter((m) => m.ReceivedAt && new Date(m.ReceivedAt) >= cutoff)
    : allMessages;

  // Build opens/clicks lookup: MessageID → first event timestamp
  const firstOpenByMsgId: Record<string, string> = {};
  const firstClickByMsgId: Record<string, string> = {};

  for (const o of allOpens) {
    if (o.MessageID && !firstOpenByMsgId[o.MessageID]) {
      firstOpenByMsgId[o.MessageID] = o.ReceivedAt;
    }
  }
  for (const c of allClicks) {
    if (c.MessageID && !firstClickByMsgId[c.MessageID]) {
      firstClickByMsgId[c.MessageID] = c.ReceivedAt;
    }
  }

  // Build Xano lookups (users pre-filtered by Xano users_email_filtering)
  const userByEmail: Record<string, UserProfile> = {};
  for (const u of users) {
    if (u.email) {
      userByEmail[u.email.toLowerCase()] = toUserProfile(u);
    }
  }

  const alertsByUserId: Record<number, XanoAlert[]> = {};
  for (const a of alerts) {
    if (!alertsByUserId[a.user_id]) alertsByUserId[a.user_id] = [];
    alertsByUserId[a.user_id].push(a);
  }

  // Group messages by recipient email
  const msgsByEmail: Record<string, PostmarkMessage[]> = {};
  let unmatchedEmails = 0;
  for (const m of messages) {
    const email = extractEmail(m.To, m.Recipients);
    if (!email) continue;
    if (!msgsByEmail[email]) msgsByEmail[email] = [];
    msgsByEmail[email].push(m);
    if (!userByEmail[email]) unmatchedEmails++;
  }

  // Build per-user summaries
  const effectiveDays = hours ? Math.ceil(hours / 24) + 1 : days;

  type MsgRecord = {
    messageId: string; subject: string; sentAt: string; status: string;
    tag: string | null; opened: boolean; clicked: boolean;
    firstOpenedAt: string | null; firstClickedAt: string | null;
  };

  type HeatCell = { date: string; status: "opened" | "clicked" | "sent" | "bounced" | "none" };

  function buildHeatmap(msgs: MsgRecord[], numDays: number): HeatCell[] {
    const cells: HeatCell[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = fmt(d);
      const dayMsgs = msgs.filter((m) => m.sentAt?.startsWith(dateStr));
      let status: HeatCell["status"] = "none";
      if (dayMsgs.some((m) => m.clicked)) status = "clicked";
      else if (dayMsgs.some((m) => m.opened)) status = "opened";
      else if (dayMsgs.some((m) => m.status === "Bounced")) status = "bounced";
      else if (dayMsgs.length > 0) status = "sent";
      cells.push({ date: dateStr, status });
    }
    return cells;
  }

  function msgStats(msgs: MsgRecord[]) {
    const sentCount = msgs.length;
    const openedCount = msgs.filter((m) => m.opened).length;
    const clickedCount = msgs.filter((m) => m.clicked).length;
    const bouncedCount = msgs.filter((m) => m.status === "Bounced").length;
    return {
      sentCount,
      openedCount,
      clickedCount,
      bouncedCount,
      openRate: sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0,
      clickRate: sentCount > 0 ? Math.round((clickedCount / sentCount) * 100) : 0,
      lastOpened: msgs.find((m) => m.opened)?.firstOpenedAt ?? null,
    };
  }

  const userSummaries = Object.values(userByEmail).map((user) => {
    const userAlerts = alertsByUserId[user.id] ?? [];
    const userMessages = msgsByEmail[user.email] ?? [];
    const activeAlerts = userAlerts.filter((a) => a.is_active);

    const lastAlert = [...userAlerts].sort(
      (a, b) => (b.last_sent_at_utc ?? 0) - (a.last_sent_at_utc ?? 0)
    )[0];

    const messageHistory: MsgRecord[] = userMessages
      .map((m) => ({
        messageId: m.MessageID,
        subject: m.Subject ?? "",
        sentAt: m.ReceivedAt ?? "",
        status: m.Status ?? "",
        tag: m.Tag ?? null,
        opened: !!firstOpenByMsgId[m.MessageID],
        clicked: !!firstClickByMsgId[m.MessageID],
        firstOpenedAt: firstOpenByMsgId[m.MessageID] ?? null,
        firstClickedAt: firstClickByMsgId[m.MessageID] ?? null,
      }))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    const overall = msgStats(messageHistory);

    // Per-alert-type breakdown
    // Named types come from Xano subscriptions + distinct Postmark tags
    const namedTypes = new Set([
      ...activeAlerts.map((a) => a.item_type),
      ...messageHistory.map((m) => m.tag).filter(Boolean) as string[],
    ]);

    const namedRows = Array.from(namedTypes).map((alertType) => {
      const typeMsgs = messageHistory.filter((m) => m.tag === alertType);
      const alert = userAlerts.find((a) => a.item_type === alertType);
      const stats = msgStats(typeMsgs);
      return {
        alertType,
        frequency: alert?.email_frequency ?? null,
        isActive: alert?.is_active ?? false,
        lastSentAtUtc: alert?.last_sent_at_utc ?? null,
        nextRunAtUtc: alert?.next_run_at_utc ?? null,
        isUntaggedGroup: false,
        ...stats,
        heatmap: buildHeatmap(typeMsgs, effectiveDays),
        messageHistory: typeMsgs,
      };
    }).sort((a, b) => b.sentCount - a.sentCount || a.alertType.localeCompare(b.alertType));

    // Messages that have no matching tag get grouped as "__untagged__".
    // This is the common case when Postmark is not configured with per-type tags.
    const untaggedMsgs = messageHistory.filter(
      (m) => !m.tag || !namedTypes.has(m.tag)
    );
    const untaggedRow = untaggedMsgs.length > 0
      ? [{
          alertType: "__untagged__",
          frequency: null,
          isActive: true,
          lastSentAtUtc: null,
          nextRunAtUtc: null,
          isUntaggedGroup: true,
          ...msgStats(untaggedMsgs),
          heatmap: buildHeatmap(untaggedMsgs, effectiveDays),
          messageHistory: untaggedMsgs,
        }]
      : [];

    // Put subscription-info rows first, then untagged catch-all at the bottom
    const byAlertType = [...namedRows, ...untaggedRow];

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      seniorityLevel: user.seniorityLevel,
      firmType: user.firmType,
      companyId: user.companyId,
      companyName: user.companyName,
      activeAlerts: activeAlerts.length,
      alertTypes: Array.from(new Set(activeAlerts.map((a) => a.item_type))),
      frequency: lastAlert?.email_frequency ?? null,
      lastSentAtUtc: lastAlert?.last_sent_at_utc ?? null,
      nextRunAtUtc: lastAlert?.next_run_at_utc ?? null,
      ...overall,
      messageHistory,
      heatmap: buildHeatmap(messageHistory, effectiveDays),
      byAlertType,
    };
  });

  userSummaries.sort((a, b) => b.sentCount - a.sentCount || a.name.localeCompare(b.name));

  const usersWithSends = userSummaries.filter((u) => u.sentCount > 0);
  const totalSent = userSummaries.reduce((s, u) => s + u.sentCount, 0);
  const totalOpened = userSummaries.reduce((s, u) => s + u.openedCount, 0);
  const totalClicked = userSummaries.reduce((s, u) => s + u.clickedCount, 0);
  const avgOpenRate = usersWithSends.length
    ? Math.round(usersWithSends.reduce((s, u) => s + u.openRate, 0) / usersWithSends.length)
    : 0;
  const overallOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const overallClickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;
  const neverOpened = usersWithSends.filter((u) => u.openedCount === 0).length;
  const bounced = userSummaries.filter((u) => u.bouncedCount > 0).length;

  return NextResponse.json({
    meta: {
      fromDate: fmt(fromDate),
      toDate: fmt(toDate),
      days,
      hours,
      filters: userFilters,
    },
    stats: {
      totalSent,
      totalOpened,
      totalClicked,
      avgOpenRate,
      overallOpenRate,
      overallClickRate,
      neverOpened,
      bounced,
    },
    users: userSummaries,
    _debug: {
      postmarkMessagesError: msgResult.error,
      postmarkOpensError: opensResult.error,
      postmarkClicksError: clicksResult.error,
      postmarkRawMessageCount: allMessages.length,
      postmarkFilteredMessageCount: messages.length,
      postmarkOpensCount: allOpens.length,
      postmarkClicksCount: allClicks.length,
      postmarkMsgSample: Array.isArray(
        (msgResult.rawFirst as { Messages?: unknown })?.Messages
      )
        ? (msgResult.rawFirst as { Messages: PostmarkMessage[] }).Messages.slice(0, 2)
        : msgResult.rawFirst,
      postmarkOpensSample: Array.isArray(
        (opensResult.rawFirst as { Opens?: unknown })?.Opens
      )
        ? (opensResult.rawFirst as { Opens: PostmarkOpenRecord[] }).Opens.slice(0, 2)
        : opensResult.rawFirst,
      xanoUserCount: users.length,
      xanoAlertCount: alerts.length,
      unmatchedPostmarkEmails: unmatchedEmails,
    },
  });
}
