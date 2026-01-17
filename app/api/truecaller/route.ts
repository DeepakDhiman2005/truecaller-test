import { truecallerStore, pushLog } from "@/lib/truecallerStore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const safeText = async (r: Response) => { try { return await r.text(); } catch { return ""; } };
    const safeJson = (text: string) => { try { return JSON.parse(text); } catch { return text; } };

    // 🟢 Log entry
    pushLog("INFO", "Callback POST received from Truecaller");

    try {
        const body = await req.json().catch((err) => {
            pushLog("ERROR", "JSON Parsing Failed", err.message);
            return null;
        });

        if (!body) return NextResponse.json({ error: "Empty Body" }, { status: 400 });

        // 🟢 Log the ID we are processing
        pushLog("DEBUG", `Processing RequestID: ${body.requestId}`, body);

        if (!body.requestId || !body.accessToken || !body.endpoint) {
            pushLog("ERROR", "Invalid Payload: Missing fields", body);
            return NextResponse.json({ success: false, error: "Invalid Payload" }, { status: 400 });
        }

        truecallerStore.set(body.requestId, {
            status: "PROCESSING",
            createdAt: Date.now(),
            request: body,
        });

        // --- A) Alpha Backend Sync ---
        let alphaOk = false;
        let alphaData = null;
        try {
            pushLog("INFO", "Forwarding to Alpha Backend...");
            const alphaRes = await fetch("https://alpha.quikkred.in/test2/truecaller/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                cache: "no-store",
            });
            alphaOk = alphaRes.ok;
            alphaData = safeJson(await safeText(alphaRes));
            
            if (!alphaOk) pushLog("ERROR", `Alpha Backend returned ${alphaRes.status}`, alphaData);
            else pushLog("INFO", "Alpha Backend Sync Success", alphaData);
            
        } catch (e: any) {
            pushLog("ERROR", "Alpha Fetch Exception", e.message);
        }

        // --- B) Truecaller Profile Fetch ---
        let profileOk = false;
        let profileData = null;
        try {
            pushLog("INFO", "Fetching Profile from Truecaller...");
            const profileRes = await fetch(body.endpoint, {
                headers: { Authorization: `Bearer ${body.accessToken}` },
                cache: "no-store",
            });
            profileOk = profileRes.ok;
            profileData = safeJson(await safeText(profileRes));
            
            if (!profileOk) pushLog("ERROR", `Profile Fetch Failed: ${profileRes.status}`, profileData);
            
        } catch (e: any) {
            pushLog("ERROR", "Profile Fetch Exception", e.message);
        }

        // 🟢 Final Decision & Log
        const resultStatus = profileOk ? "VERIFIED" : "ERROR";
        
        truecallerStore.set(body.requestId, {
            status: resultStatus,
            profile: profileData,
            alphaCallback: { ok: alphaOk, data: alphaData },
            verify: { ok: profileOk, data: profileData },
            createdAt: Date.now()
        });

        pushLog(
            resultStatus === "VERIFIED" ? "INFO" : "ERROR", 
            `Process Complete: ${resultStatus}`, 
            { profileOk, alphaOk }
        );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        pushLog("ERROR", "CRITICAL API EXCEPTION", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const nonce = req.nextUrl.searchParams.get("nonce");
    if (!nonce) return NextResponse.json({ status: "pending" });
    const data = truecallerStore.get(nonce);
    return NextResponse.json(data || { status: "pending" });
}