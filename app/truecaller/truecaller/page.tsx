"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TruecallerWait() {
    const router = useRouter();
    const sp = useSearchParams();
    const rid = sp.get("rid");

    useEffect(() => {
        if (!rid) return;

        let timer: any;

        const poll = async () => {
            const res = await fetch(`/api/truecaller/status?rid=${encodeURIComponent(rid)}`);
            const json = await res.json().catch(() => null);

            if (json?.status === "done" && json?.data?.accessToken) {
                // ✅ Now you can sign in to NextAuth credentials provider
                // OR set cookies/localStorage based on your auth strategy

                // Example: save & redirect
                localStorage.setItem("accessToken", json.data.accessToken);
                localStorage.setItem("refreshToken", json.data.refreshToken);
                localStorage.setItem("userId", json.data.userId);

                router.replace("/user");
                return;
            }

            timer = setTimeout(poll, 800);
        };

        poll();
        return () => clearTimeout(timer);
    }, [rid, router]);

    return <div>Waiting for Truecaller verification…</div>;
}
