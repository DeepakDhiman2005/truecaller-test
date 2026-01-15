import { NextRequest, NextResponse } from "next/server";

declare global {
    var truecallerTempStorage: Map<string, any> | undefined;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body?.requestId || !body?.accessToken || !body?.endpoint) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const profileRes = await fetch(body.endpoint, {
            headers: { Authorization: `Bearer ${body.accessToken}` },
        });
        if (!profileRes.ok) {
            throw new Error(`Truecaller API error: ${profileRes.status}`);
        }
        const profile = await profileRes.json();

        if (profile.error || profile.code) {
            throw new Error(profile.error?.message || "Verification failed");
        }

        console.log("Truecaller profile fetched:", profile);

        // Extract needed fields (Truecaller response structure varies)
        const phone = profile.phoneNumbers?.[0] || profile.phoneNumber || profile.payload?.phoneNumber;
        const firstName = profile.name?.first || profile.firstName || "";
        const lastName = profile.name?.last || profile.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim() || null;
        const email = profile.email || profile.onlineIdentities?.email || null;

        if (!phone) {
            throw new Error("No phone number in profile");
        }

        // Call your backend to login/register with verified phone
        // const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://alpha.quikkred.in";
        // const loginRes = await fetch(`${API_BASE_URL}/api/auth/customer/truecaller-login`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     mobile: phone,
        //     name: fullName,
        //     email,
        //     // add city or other fields if needed
        //   }),
        // });

        // if (!loginRes.ok) throw new Error("Backend login failed");
        // const loginData = await loginRes.json();
        // if (!loginData?.success || !loginData?.data) throw new Error("Backend login failed");

        // const auth = loginData.data;

        // Store temporarily keyed by nonce (requestId)
        if (!global.truecallerTempStorage) {
            global.truecallerTempStorage = new Map<string, any>();
        }
        global.truecallerTempStorage.set(body.requestId, {
            profile,
            //   auth,
            accessToken: body.accessToken,
            phone,
            name: fullName,
            email,
        });

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

    if (!global.truecallerTempStorage) {
        return NextResponse.json({ status: "pending" });
    }

    const data = global.truecallerTempStorage.get(nonce);
    if (!data) {
        return NextResponse.json({ status: "pending" });
    }

    // One-time use
    global.truecallerTempStorage.delete(nonce);

    return NextResponse.json({
        profile: data.profile,
        auth: data.auth,
        phone: data.phone,
        name: data.name,
        email: data.email,
    });
}