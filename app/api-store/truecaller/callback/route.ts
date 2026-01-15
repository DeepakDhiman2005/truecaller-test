import { NextResponse } from "next/server";
import { tcStore } from "@/lib/truecallerStore";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Truecaller sends: { requestId, accessToken, endpoint }
  const requestId = body?.requestId;
  const accessToken = body?.accessToken;
  const endpoint = body?.endpoint;

  if (!requestId || !accessToken || !endpoint) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }

  // 1) store immediately (fast)
  tcStore.set(requestId, {
    status: "pending",
    createdAt: Date.now(),
    accessToken,
    endpoint,
  });

  // 2) respond quickly (Truecaller expects fast 2xx)
  const res = NextResponse.json({ ok: true }, { status: 200 });

  // 3) best-effort: fetch profile + mark verified
  (async () => {
    try {
      // NOTE: some Truecaller endpoints are full profile URLs, some are base URLs.
      // For testing: call endpoint directly
      const profileRes = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileRes.json().catch(() => null);

      // ✅ For testing, we generate a fake internalToken
      // In real world: call your backend to create session token
      const internalToken = `tc_test_${requestId}`;

      const existing = tcStore.get(requestId);
      tcStore.set(requestId, {
        ...(existing || { createdAt: Date.now() }),
        status: "verified",
        profile,
        internalToken,
        accessToken,
        endpoint,
      });
    } catch (e) {
      const existing = tcStore.get(requestId);
      tcStore.set(requestId, {
        ...(existing || { createdAt: Date.now() }),
        status: "failed",
        error: "Profile fetch failed",
      });
    }
  })();

  return res;
}
