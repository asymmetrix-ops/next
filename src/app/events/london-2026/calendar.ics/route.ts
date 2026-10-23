import { NextResponse } from "next/server";
import {
  buildLondon2026IcsContent,
  LONDON_2026_EVENT,
} from "@/lib/events/london-2026-calendar";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const body = buildLondon2026IcsContent();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${LONDON_2026_EVENT.icsFilename}"`,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
