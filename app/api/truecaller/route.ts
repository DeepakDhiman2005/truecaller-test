import { truecallerStore } from "@/lib/truecallerStore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Validate Payload from Truecaller
        if (!body.requestId || !body.accessToken || !body.endpoint) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        console.log("🔥 Truecaller Callback Received for ID:", body.requestId);

        // 2. Fetch Profile from Truecaller immediately
        const profileRes = await fetch(body.endpoint, {
            headers: { Authorization: `Bearer ${body.accessToken}` },
        });

        if (!profileRes.ok) {
            console.error("Truecaller API Failed:", await profileRes.text());
            throw new Error("Failed to verify token with Truecaller");
        }

        const profile = await profileRes.json();
        
        // 3. Extract Phone (Essential)
        const phone = profile.phoneNumbers?.[0] || profile.phoneNumber;
        if (!phone) throw new Error("No phone number in profile");

        // 4. Store Data in Global Map (The Bridge)
        truecallerStore.set(body.requestId, {
            status: "VERIFIED",
            profile: profile,
            accessToken: body.accessToken,
            phone: phone,
            name: `${profile.name?.first || ""} ${profile.name?.last || ""}`.trim(),
            email: profile.onlineIdentities?.email || null,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Callback Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const nonce = req.nextUrl.searchParams.get("nonce");
    if (!nonce) return NextResponse.json({ status: "pending" });

    const data = truecallerStore.get(nonce);

    if (!data) {
        return NextResponse.json({ status: "pending" });
    }

    // ⚠️ DO NOT DELETE HERE. 
    // Wait for NextAuth to read it, or use a timeout to clean up later.
    return NextResponse.json({ status: "VERIFIED", profile: data.profile });
}