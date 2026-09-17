export const LONDON_2026_SCHEDULE = [
  { time: "09:00", label: "Registration opens" },
  { time: "09:30", label: "Summit begins" },
  { time: "13:00", label: "Networking lunch" },
  { time: "17:00", label: "Closing drinks reception" },
] as const;

export const LONDON_2026_EVENT = {
  title: "Asymmetrix London Summit 2026",
  venue: "Nobu Hotel London",
  address: "22 Portman Square, London W1H 7BG",
  dateLabel: "Tuesday 3rd November 2026",
  /** Full-day block for calendar entries (registration through closing reception) */
  startLocal: "20261103T090000",
  endLocal: "20261103T170000",
  timeZone: "Europe/London",
  description: LONDON_2026_SCHEDULE.map((s) => `${s.time} — ${s.label}`).join(
    "\n"
  ),
  icsFilename: "asymmetrix-london-summit-2026.ics",
  uid: "london-2026-summit@asymmetrixintelligence.com",
} as const;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

function formatIcsUtcStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
      date.getUTCSeconds()
    )}Z`
  );
}

/** RFC 5545 calendar body for Apple Calendar, Outlook import, etc. */
export function buildLondon2026IcsContent(now = new Date()): string {
  const e = LONDON_2026_EVENT;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Asymmetrix Intelligence//London Summit 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${formatIcsUtcStamp(now)}`,
    `DTSTART;TZID=${e.timeZone}:${e.startLocal}`,
    `DTEND;TZID=${e.timeZone}:${e.endLocal}`,
    `SUMMARY:${escapeIcsText(e.title)}`,
    `LOCATION:${escapeIcsText(`${e.venue}, ${e.address}`)}`,
    `DESCRIPTION:${escapeIcsText(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
