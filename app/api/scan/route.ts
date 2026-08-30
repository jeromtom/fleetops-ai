import { NextResponse } from "next/server";
import { runFullScan } from "@/lib/fleet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const state = await runFullScan();
  return NextResponse.json({ state });
}
