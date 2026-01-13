import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json(); // requestId (nonce), accessToken, endpoint

        // 1. Verify user profile with Truecaller
        const profileRes = await fetch(body.endpoint, {
            headers: { Authorization: `Bearer ${body.accessToken}` }
        });
        const profile = await profileRes.json();

        if (profile.code) throw new Error("Verification Failed");

        // 2. TODO: Save profile to Database or Redis
        // Key: body.requestId, Value: { status: 'verified', user: profile }
        // await redis.set(body.requestId, JSON.stringify(profile), 'EX', 300);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 400 });
    }
}