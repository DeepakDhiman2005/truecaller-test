import { truecallerStore } from "@/lib/truecallerStore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const safeText = async (r: Response) => {
        try { return await r.text(); } catch { return ""; }
    };

    const safeJson = (text: string) => {
        try { return JSON.parse(text); } catch { return text; }
    };

    try {
        const body = await req.json().catch(() => null);

        if (!body?.requestId || !body?.accessToken || !body?.endpoint) {
            return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
        }

        console.log("🔥 Truecaller Callback Received for ID:", body.requestId);

        // Create initial store entry so GET can show progress even if something fails later
        truecallerStore.set(body.requestId, {
            status: "PROCESSING",
            createdAt: Date.now(),
            request: { requestId: body.requestId, endpoint: body.endpoint },
        });

        // A) Call your alpha backend callback
        const alphaRes = await fetch("https://alpha.quikkred.in/test2/truecaller/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const alphaText = await safeText(alphaRes);
        const alphaData = safeJson(alphaText);

        // B) Call Truecaller endpoint to fetch profile
        const profileRes = await fetch(body.endpoint, {
            headers: { Authorization: `Bearer ${body.accessToken}` },
            cache: "no-store",
        });

        const profileText = await safeText(profileRes);
        const profileData = safeJson(profileText);

        if (!profileRes.ok) {
            truecallerStore.set(body.requestId, {
                status: "ERROR",
                createdAt: Date.now(),
                request: { requestId: body.requestId, endpoint: body.endpoint },
                alphaCallback: { ok: alphaRes.ok, status: alphaRes.status, data: alphaData },
                verify: { ok: false, status: profileRes.status, data: profileData },
                error: "Failed to verify token with Truecaller",
            });

            return NextResponse.json(
                { success: false, error: "Truecaller verify failed", verify: profileData, alphaCallback: alphaData },
                { status: 502 }
            );
        }

        // extract phone
        const phone = (profileData as any)?.phoneNumbers?.[0] || (profileData as any)?.phoneNumber;
        if (!phone) {
            truecallerStore.set(body.requestId, {
                status: "ERROR",
                createdAt: Date.now(),
                request: { requestId: body.requestId, endpoint: body.endpoint },
                alphaCallback: { ok: alphaRes.ok, status: alphaRes.status, data: alphaData },
                verify: { ok: true, status: profileRes.status, data: profileData },
                error: "No phone number in profile",
            });

            return NextResponse.json({ success: false, error: "No phone in profile", profile: profileData }, { status: 422 });
        }

        // ✅ Store VERIFIED + debug objects
        truecallerStore.set(body.requestId, {
            status: "VERIFIED",
            createdAt: Date.now(),
            profile: profileData,
            accessToken: body.accessToken,
            phone,
            name: `${(profileData as any)?.name?.first || ""} ${(profileData as any)?.name?.last || ""}`.trim(),
            email: (profileData as any)?.onlineIdentities?.email || null,

            // debug info
            alphaCallback: { ok: alphaRes.ok, status: alphaRes.status, data: alphaData },
            verify: { ok: true, status: profileRes.status, data: profileData },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Callback Error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Unknown error" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const nonce = req.nextUrl.searchParams.get("nonce");
    if (!nonce) return NextResponse.json({ status: "pending" });

    const data = truecallerStore.get(nonce);

    if (!data) return NextResponse.json({ status: "pending" });

    // Return everything you want to debug on alpha
    return NextResponse.json({
        status: data.status || "pending",
        profile: data.profile || null,
        error: data.error || null,
        alphaCallback: data.alphaCallback || null,
        verify: data.verify || null,
        createdAt: data.createdAt || null,
    });
}