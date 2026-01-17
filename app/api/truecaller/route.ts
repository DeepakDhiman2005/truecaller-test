import { createClient } from "redis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper: Connect to your specific Redis Labs DB
const getRedis = async () => {
  const client = createClient({
    url: "redis://default:yGjh4ykYDlhxVv88Xd98AFIGzsSKOhRv@redis-12601.c261.us-east-1-4.ec2.cloud.redislabs.com:12601"
  });
  if (!client.isOpen) await client.connect();
  return client;
};

// Helper: Save a log entry to Redis (List)
async function pushLog(type: string, message: string, detail: any = null) {
  const client = await getRedis();
  const log = JSON.stringify({ timestamp: new Date().toISOString(), type, message, detail });
  await client.lPush("truecaller_logs", log);
  await client.lTrim("truecaller_logs", 0, 49); // Keep only last 50
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nonce = body.requestId;

    if (!nonce) return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

    await pushLog("INFO", `Callback Received for ${nonce}`, body);

    // 1. Fetch Profile from Truecaller
    const profileRes = await fetch(body.endpoint, {
      headers: { Authorization: `Bearer ${body.accessToken}` },
      cache: "no-store",
    });
    
    const profileData = await profileRes.json();
    const isOk = profileRes.ok;

    // 2. Save Final Result to Redis (Expires in 10 minutes)
    const client = await getRedis();
    await client.set(nonce, JSON.stringify({
      status: isOk ? "VERIFIED" : "ERROR",
      profile: profileData,
      updatedAt: Date.now()
    }), { EX: 600 });

    await pushLog(isOk ? "INFO" : "ERROR", `Verification ${isOk ? 'Success' : 'Failed'}`, profileData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await pushLog("ERROR", "POST Exception", error.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get("nonce");
  if (!nonce) return NextResponse.json({ status: "pending" });

  const client = await getRedis();
  const data = await client.get(nonce);
  return NextResponse.json(data ? JSON.parse(data) : { status: "pending" });
}