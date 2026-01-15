"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

// Define the shape of the Truecaller Profile for better Type Safety
type TruecallerProfile = {
  firstName?: string;
  lastName?: string;
  phoneNumbers?: string[];
  gender?: string;
  avatarUrl?: string;
  email?: string;
  city?: string;
  [key: string]: any;
};

type TcStatusResponse = {
  status?: "pending" | "verified" | "failed";
  profile?: TruecallerProfile;
  internalToken?: string;
  error?: string;
  [key: string]: any;
};

export default function TruecallerAuth() {
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<TcStatusResponse | null>(null);
  const [polling, setPolling] = useState(false);
  const router = useRouter();

  // Helper to format the profile into a single string
  const getProfileString = (profile?: TruecallerProfile) => {
    if (!profile) return "";
    const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
    const phone = profile.phoneNumbers?.[0] || "No Number";
    const email = profile.email ? `(${profile.email})` : "";
    return `${name} - ${phone} ${email}`.trim();
  };

  const handleTruecallerLogin = async () => {
    setLoading(true);
    setDebug(null);

    const nonce = uuidv4();
    sessionStorage.setItem("tc_nonce", nonce);

    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY;
    const partnerName = process.env.NEXT_PUBLIC_TRUECALLER_APP_NAME || "Quikkred";

    if (!partnerKey) {
      setLoading(false);
      setDebug({ status: "failed", error: "Missing API Key" });
      return;
    }

    const params = new URLSearchParams({
      type: "btmsheet",
      requestNonce: nonce,
      partnerKey,
      partnerName,
      lang: "en",
      privacyUrl: `${window.location.origin}/privacy`,
      termsUrl: `${window.location.origin}/terms`,
      loginPrefix: "Continue",
      ctaPrefix: "Verify with",
      btnShape: "rounded",
      ttl: "600000",
    });

    window.location.href = `truecallersdk://truesdk/web_verify?${params.toString()}`;

    setTimeout(() => {
      if (document.hasFocus()) {
        setLoading(false);
        router.push("/login?method=otp");
        return;
      }

      setPolling(true);
      const start = Date.now();
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/auth/truecaller/status?nonce=${nonce}`);
          const data: TcStatusResponse = await res.json();
          setDebug(data);

          if (data?.status === "verified") {
            clearInterval(interval);
            setPolling(false);
            // Sign in with NextAuth after getting the profile
            await signIn("truecaller", {
              token: data.internalToken,
              callbackUrl: "/user",
            });
          }

          if (data?.status === "failed" || Date.now() - start > 60000) {
            clearInterval(interval);
            setPolling(false);
            setLoading(false);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }, 1000);
  };

  return (
    <div className="w-full">
      <button
        onClick={handleTruecallerLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-70"
      >
        <div className="h-5 w-5 rounded-full bg-[#0087FF] flex items-center justify-center text-white text-[10px]">T</div>
        <span>{loading ? "Verifying..." : "Continue with Truecaller"}</span>
      </button>

      {/* ✅ String Format Details below button */}
      {debug?.status === "verified" && debug.profile && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center animate-in fade-in zoom-in duration-300">
          <p className="text-sm font-semibold text-blue-800">Verified User Details:</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {getProfileString(debug.profile)}
          </p>
        </div>
      )}

      {/* Debug Logs */}
      <details className="mt-4 opacity-50">
        <summary className="text-xs cursor-pointer">Raw Debug Data</summary>
        <pre className="text-[10px] bg-gray-100 p-2 mt-2 overflow-auto">
          {JSON.stringify(debug, null, 2)}
        </pre>
      </details>
    </div>
  );
}