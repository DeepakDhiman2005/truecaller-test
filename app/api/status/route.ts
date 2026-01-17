import { createClient } from "redis";
import { NextResponse } from "next/server";

export async function GET() {
  const client = createClient({ url: "redis://default:yGjh4ykYDlhxVv88Xd98AFIGzsSKOhRv@redis-12601.c261.us-east-1-4.ec2.cloud.redislabs.com:12601" });
  await client.connect();
  const logs = await client.lRange("truecaller_logs", 0, -1);
  return NextResponse.json({ logs: logs.map(l => JSON.parse(l)) });
}