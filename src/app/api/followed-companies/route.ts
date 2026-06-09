import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Following companies is currently disabled." },
    { status: 501 }
  );
}

