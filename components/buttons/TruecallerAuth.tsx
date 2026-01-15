"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

export default function TruecallerAuth() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleTruecallerLogin = async () => {
    setLoading(true);

    const nonce = uuidv4(); // we will use this as requestNonce / requestId mapping
    sessionStorage.setItem("tc_nonce", nonce);

    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY; // ✅ move to env
    const partnerName = process.env.NEXT_PUBLIC_TRUECALLER_APP_NAME || "Quikkred";

    if (!partnerKey) {
      setLoading(false);
      alert("Truecaller App Key missing (NEXT_PUBLIC_TRUECALLER_APP_KEY)");
      return;
    }

    // ✅ IMPORTANT: use the same domain as Truecaller dashboard App domain
    const privacyUrl = `${window.location.origin}/privacy`;
    const termsUrl = `${window.location.origin}/terms`;

    // ✅ Deep link params (keep minimal; optional fields can remain)
    const params = new URLSearchParams({
      type: "btmsheet",
      requestNonce: nonce,
      partnerKey,
      partnerName,
      lang: "en",
      privacyUrl,
      termsUrl,
      loginPrefix: "Continue",
      ctaPrefix: "Verify with",
      btnShape: "rounded",
      ttl: "600000", // 10 minutes (optional)
    });

    // ✅ open truecaller
    window.location.href = `truecallersdk://truesdk/web_verify?${params.toString()}`;

    // ✅ If truecaller not installed -> focus stays -> fallback
    setTimeout(() => {
      if (document.hasFocus()) {
        setLoading(false);
        router.push("/login?method=otp");
        return;
      }

      // ✅ Truecaller opened, now poll backend
      const start = Date.now();
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/auth/truecaller/status?nonce=${encodeURIComponent(nonce)}`);
          const data = await res.json();

          if (data?.status === "verified" && data?.internalToken) {
            clearInterval(interval);

            // ✅ Use your real NextAuth provider id (recommended: "truecaller")
            await signIn("truecaller", {
              redirect: true,
              token: data.internalToken,
              callbackUrl: "/user",
            });

            return;
          }

          // timeout after 60s
          if (Date.now() - start > 60000) {
            clearInterval(interval);
            setLoading(false);
          }
        } catch (e) {
          // keep polling quietly
        }
      }, 1500);
    }, 700);
  };

  return (
    <button
      onClick={handleTruecallerLogin}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-70"
    >
      <div className="h-5 w-5 rounded-full bg-[#0087FF] flex items-center justify-center text-white text-[10px]">
        T
      </div>
      <span>{loading ? "Launching Truecaller..." : "Continue with Truecaller"}</span>
    </button>
  );
}
