import { truecallerLogs } from "@/lib/truecallerStore";
import { NextResponse } from "next/server";

export async function GET() {
    // Return logs in reverse order (newest first)
    return NextResponse.json({
        total: truecallerLogs.length,
        logs: [...truecallerLogs].reverse() 
    });
}