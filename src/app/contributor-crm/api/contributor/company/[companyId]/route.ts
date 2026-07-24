import { NextRequest, NextResponse } from "next/server";
import { fetchServiceCompany } from "@/lib/contributorCrm/server/contributorApi";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { companyId } = await context.params;
    if (!companyId?.trim()) {
      return NextResponse.json({ error: "Company id is required." }, { status: 400 });
    }

    const data = await fetchServiceCompany(companyId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch company" },
      { status: 500 }
    );
  }
}
