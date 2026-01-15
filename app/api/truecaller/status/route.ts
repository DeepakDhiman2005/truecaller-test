import { tcStore } from "@/lib/truecallerStore";
import { NextResponse } from "next/server";

// ---------------------------------------------------------
// GET: Frontend Polling
// ---------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nonce = searchParams.get("nonce");

  console.log(`[GET] Polling for nonce: ${nonce}`);

  if (!nonce) return NextResponse.json({ error: "No nonce" }, { status: 400 });

  const cachedData = tcStore.get(nonce);

  if (!cachedData) {
    console.log(`[GET] No data found in tcStore for ${nonce} (Still waiting for Truecaller)`);
    return NextResponse.json({ status: "pending" });
  }

  console.log(`[GET] Found data for ${nonce}:`, JSON.stringify(cachedData));
  return NextResponse.json(cachedData);
}

// ---------------------------------------------------------
// POST: Truecaller Callback
// ---------------------------------------------------------
export async function POST(req: Request) {
  console.log("[POST] Truecaller callback received!");
  
  const body = await req.json().catch(() => null);
  console.log("[POST] Payload:", JSON.stringify(body));

  const { requestId, accessToken, endpoint } = body || {};

  if (!requestId || !accessToken || !endpoint) {
    console.error("[POST] Invalid Payload received from Truecaller");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // 1. Save pending state
  tcStore.set(requestId, { status: "pending", requestId });
  console.log(`[POST] Nonce ${requestId} marked as PENDING in store.`);

  // 2. Background Fetch
  (async () => {
    try {
      console.log(`[FETCH] Calling Truecaller endpoint: ${endpoint}`);
      
      const profileRes = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        throw new Error(`Truecaller API responded with ${profileRes.status}`);
      }

      const profile = await profileRes.json();
      console.log(`[FETCH] Profile received for ${requestId}:`, JSON.stringify(profile));

      // 3. Update Store with Verified Data
      tcStore.set(requestId, {
        status: "verified",
        profile: profile,
        internalToken: `tc_verify_${requestId}`,
        receivedAt: new Date().toISOString()
      });
      
      console.log(`[SUCCESS] Store updated for ${requestId}. Verified!`);

    } catch (err: any) {
      console.error(`[ERROR] Background fetch failed for ${requestId}:`, err.message);
      tcStore.set(requestId, { status: "failed", error: err.message });
    }
  })();

  // Response to Truecaller
  return NextResponse.json({ ok: true }, { status: 200 });
}