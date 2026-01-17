import { truecallerLogs } from "@/lib/truecallerStore";
import { NextResponse } from "next/server";

export async function GET() {
    // Returns the full history of all callbacks received since server start
    return NextResponse.json({
        totalLogs: truecallerLogs.length,
        logs: [...truecallerLogs].reverse() // Newest first
    });
}