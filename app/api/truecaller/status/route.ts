import { tcStore } from "@/lib/truecallerStore";
import { NextResponse } from "next/server";

// ✅ GET: Called by your Frontend (Polling)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nonce = searchParams.get("nonce");

  if (!nonce) {
    return NextResponse.json({ ok: false, message: "Missing nonce" }, { status: 400 });
  }

  // Check memory store for the requestId (nonce)
  const data = tcStore.get(nonce);

  // If not found, it means Truecaller hasn't called us back yet
  if (!data) {
    return NextResponse.json({ status: "pending" });
  }

  // If found, return the profile/status
  return NextResponse.json(data);
}

// ✅ POST: Called by Truecaller Server (Callback)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const requestId = body?.requestId;
  const accessToken = body?.accessToken;
  const endpoint = body?.endpoint;

  if (!requestId || !accessToken || !endpoint) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }

  // 1. Initial pending write (fast)
  tcStore.set(requestId, {
    status: "pending",
    createdAt: Date.now(),
    accessToken,
    endpoint,
  });

  // 2. Respond immediately to Truecaller so they don't timeout
  const res = NextResponse.json({ ok: true }, { status: 200 });

  // 3. Background process: Fetch the actual profile
  // We don't await this so the response (step 2) returns instantly
  (async () => {
    try {
      const profileRes = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileRes.json().catch(() => null);

      // Generate a session token for your app
      const internalToken = `tc_token_${requestId}_${Date.now()}`;

      // Update the store with the real profile data
      const existing = tcStore.get(requestId);
      tcStore.set(requestId, {
        ...(existing || {}),
        status: "verified",
        profile,        // <--- This is what your frontend needs
        internalToken,
        endpoint,
      });
    } catch (e) {
      console.error("Truecaller Profile Fetch Error:", e);
      const existing = tcStore.get(requestId);
      tcStore.set(requestId, {
        ...(existing || {}),
        status: "failed",
        error: "Profile fetch failed",
      });
    }
  })();

  return res;
}