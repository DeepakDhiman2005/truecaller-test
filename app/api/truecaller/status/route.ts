import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const nonce = searchParams.get("nonce");

    // 1. Check your DB/Redis for this nonce
    // const data = await redis.get(nonce);

    // IF DATA EXISTS:
    // return NextResponse.json({ status: "verified", internalToken: "..." });

    return NextResponse.json({ status: "pending" });
}