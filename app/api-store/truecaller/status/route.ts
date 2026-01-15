import { NextResponse } from "next/server";

// Using a global variable to help persist data during local dev/testing
const globalStore = global as any;
if (!globalStore.tcCache) globalStore.tcCache = new Map();

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  console.log("DEBUG: Callback received from Truecaller", body);

  if (!body?.requestId || !body?.accessToken) {
    return NextResponse.json({ error: "Invalid Callback" }, { status: 400 });
  }

  try {
    // 1. Fetch real profile using the token Truecaller sent
    const profileRes = await fetch(body.endpoint, {
      headers: { Authorization: `Bearer ${body.accessToken}` },
    });
    const profile = await profileRes.json();
    console.log("DEBUG: Profile fetched successfully", profile);

    // 2. Save into store (RequestId is the Nonce you sent)
    globalStore.tcCache.set(body.requestId, { status: "verified", profile });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DEBUG: Fetch error", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const nonce = new URL(req.url).searchParams.get("nonce");
  const data = globalStore.tcCache.get(nonce) || { status: "pending" };
  return NextResponse.json(data);
}