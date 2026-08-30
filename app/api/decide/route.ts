import { NextRequest, NextResponse } from "next/server";
import { applyDecision } from "@/lib/fleet";
import type { FleetState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DecideBody {
  state: FleetState;
  remediationId: string;
  decision: "approve" | "deny" | "defer";
  humanReason?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as DecideBody;
  try {
    const state = await applyDecision(
      body.state,
      body.remediationId,
      body.decision,
      body.humanReason,
    );
    return NextResponse.json({ state });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
