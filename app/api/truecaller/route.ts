import { NextRequest, NextResponse } from "next/server";

// In-memory cache for development/testing (persists across requests in Vercel dev)
const globalStore = global as any;
if (!globalStore.tcCache) globalStore.tcCache = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.requestId || !body?.accessToken || !body?.endpoint) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Fetch real profile from Truecaller
    const profileRes = await fetch(body.endpoint, {
      headers: { Authorization: `Bearer ${body.accessToken}` },
    });

    if (!profileRes.ok) {
      throw new Error(`Truecaller API error: ${profileRes.status}`);
    }

    const profile = await profileRes.json();

    // Check for Truecaller error response
    if (profile.error || profile.code) {
      throw new Error(profile.error?.message || "Verification failed");
    }

    console.log("Truecaller profile fetched:", profile); // Debug log

    // Cache the profile keyed by nonce (requestId)
    globalStore.tcCache.set(body.requestId, {
      status: "verified",
      profile,
    });

    // Optional: set expiry (delete after 10 minutes)
    setTimeout(() => {
      globalStore.tcCache.delete(body.requestId);
    }, 10 * 60 * 1000);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Truecaller callback error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get("nonce");

  if (!nonce) {
    return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
  }

  const data = globalStore.tcCache.get(nonce) || { status: "pending" };

  return NextResponse.json(data);
}