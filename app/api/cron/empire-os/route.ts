import { NextRequest, NextResponse } from "next/server";
import { runEmpireOsCron } from "@/lib/empire-os/cron";

export const runtime = "nodejs";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runEmpireOsCron();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
