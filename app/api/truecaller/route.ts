import { truecallerStore, truecallerLogs } from "@/lib/truecallerStore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const safeText = async (r: Response) => { try { return await r.text(); } catch { return ""; } };
    const safeJson = (text: string) => { try { return JSON.parse(text); } catch { return text; } };

    try {
        const body = await req.json().catch(() => null);

        // 🟢 STEP 1: LOG EVERYTHING TO THE ARRAY IMMEDIATELY
        truecallerLogs.push({
            timestamp: new Date().toISOString(),
            type: "CALLBACK_RECEIVED",
            data: body
        });

        if (!body?.requestId || !body?.accessToken || !body?.endpoint) {
            return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
        }

        truecallerStore.set(body.requestId, {
            status: "PROCESSING",
            createdAt: Date.now(),
            request: body,
        });

        // A) Call Alpha Backend
        const alphaRes = await fetch("https://alpha.quikkred.in/test2/truecaller/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const alphaData = safeJson(await safeText(alphaRes));

        // B) Fetch Truecaller Profile
        const profileRes = await fetch(body.endpoint, {
            headers: { Authorization: `Bearer ${body.accessToken}` },
            cache: "no-store",
        });

        const profileData = safeJson(await safeText(profileRes));

        // 🟢 STEP 2: UPDATE STORE & LOG ARRAY WITH RESULTS
        const resultStatus = profileRes.ok ? "VERIFIED" : "ERROR";
        const finalPayload = {
            status: resultStatus,
            profile: profileData,
            alphaCallback: { ok: alphaRes.ok, data: alphaData },
            verify: { ok: profileRes.ok, data: profileData }
        };

        truecallerStore.set(body.requestId, finalPayload);
        
        truecallerLogs.push({
            timestamp: new Date().toISOString(),
            type: "PROCESS_COMPLETE",
            requestId: body.requestId,
            status: resultStatus
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// Existing GET logic for polling a specific Nonce
export async function GET(req: NextRequest) {
    const nonce = req.nextUrl.searchParams.get("nonce");
    if (!nonce) return NextResponse.json({ status: "pending" });
    const data = truecallerStore.get(nonce);
    return NextResponse.json(data || { status: "pending" });
}