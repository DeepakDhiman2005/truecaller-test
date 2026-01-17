import { truecallerStore, pushLog } from "@/lib/truecallerStore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const safeText = async (r: Response) => { try { return await r.text(); } catch { return ""; } };
    const safeJson = (text: string) => { try { return JSON.parse(text); } catch { return text; } };

    pushLog("INFO", "Callback POST received");

    try {
        const body = await req.json().catch((err) => {
            pushLog("ERROR", "JSON parsing failed", err.message);
            return null;
        });

        if (!body) return NextResponse.json({ error: "Empty body" }, { status: 400 });

        // 🟢 Log the incoming body for inspection
        pushLog("DEBUG", `Processing RequestID: ${body.requestId}`, body);

        if (!body.requestId || !body.accessToken || !body.endpoint) {
            pushLog("ERROR", "Missing required Truecaller fields", body);
            return NextResponse.json({ error: "Invalid Payload" }, { status: 400 });
        }

        truecallerStore.set(body.requestId, { status: "PROCESSING", createdAt: Date.now() });

        // --- Alpha Backend Sync ---
        try {
            const alphaRes = await fetch("https://alpha.quikkred.in/test2/truecaller/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                cache: "no-store",
            });
            if (!alphaRes.ok) pushLog("ERROR", `Alpha Backend returned ${alphaRes.status}`);
        } catch (e: any) {
            pushLog("ERROR", "Alpha Backend fetch exception", e.message);
        }

        // --- Profile Fetch ---
        const profileRes = await fetch(body.endpoint, {
            headers: { Authorization: `Bearer ${body.accessToken}` },
            cache: "no-store",
        });

        const profileData = safeJson(await safeText(profileRes));

        if (!profileRes.ok) {
            pushLog("ERROR", "Truecaller Profile fetch failed", profileData);
            truecallerStore.set(body.requestId, { status: "ERROR", error: "Profile fetch failed" });
            return NextResponse.json({ success: false }, { status: 502 });
        }

        // ✅ Success
        pushLog("INFO", `Verification Successful for ${body.requestId}`);
        truecallerStore.set(body.requestId, {
            status: "VERIFIED",
            profile: profileData,
            createdAt: Date.now()
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        pushLog("ERROR", "Critical Route Exception", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Existing GET logic for polling a specific Nonce
export async function GET(req: NextRequest) {
    const nonce = req.nextUrl.searchParams.get("nonce");
    if (!nonce) return NextResponse.json({ status: "pending" });
    const data = truecallerStore.get(nonce);
    return NextResponse.json(data || { status: "pending" });
}