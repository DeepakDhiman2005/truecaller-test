import { NextRequest, NextResponse } from "next/server";
import { tcStore } from "@/lib/truecallerStore";

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get("nonce");

  if (!nonce) {
    return NextResponse.json({ status: "failed", error: "Missing nonce" }, { status: 400 });
  }

  const data = tcStore.get(nonce);

  if (!data) {
    return NextResponse.json({ status: "pending" }, { status: 200 });
  }

  // return everything for testing
  return NextResponse.json({ requestId: nonce, ...data }, { status: 200 });
}
