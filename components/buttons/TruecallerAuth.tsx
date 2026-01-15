"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

type TcStatusResponse = {
  status?: "pending" | "verified" | "failed";
  requestId?: string;
  accessToken?: string;
  endpoint?: string;
  internalToken?: string;
  profile?: any;
  error?: string;
  createdAt?: number;
  // allow anything extra
  [key: string]: any;
};

export default function TruecallerAuth() {
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<TcStatusResponse | null>(null);
  const [polling, setPolling] = useState(false);

  const router = useRouter();

  const handleTruecallerLogin = async () => {
    setLoading(true);
    setDebug(null);

    const nonce = uuidv4();
    sessionStorage.setItem("tc_nonce", nonce);

    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY;
    const partnerName = process.env.NEXT_PUBLIC_TRUECALLER_APP_NAME || "Quikkred";

    if (!partnerKey) {
      setLoading(false);
      setDebug({ status: "failed", error: "Missing NEXT_PUBLIC_TRUECALLER_APP_KEY" });
      return;
    }

    const privacyUrl = `${window.location.origin}/privacy`;
    const termsUrl = `${window.location.origin}/terms`;

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
      ttl: "600000",
    });

    const deeplink = `truecallersdk://truesdk/web_verify?${params.toString()}`;

    // must be user click -> ok here
    window.location.href = deeplink;

    // fallback / polling after attempt
    setTimeout(() => {
      // If still focused, app probably didn't open
      if (document.hasFocus()) {
        setLoading(false);
        setDebug({
          status: "failed",
          error: "Truecaller did not open. App not installed / deep-link blocked.",
          deeplink,
          requestNonce: nonce,
        });
        router.push("/login?method=otp");
        return;
      }

      // Truecaller opened -> start polling
      setPolling(true);
      setLoading(true);

      const start = Date.now();
      const interval = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/auth/truecaller/status?nonce=${encodeURIComponent(nonce)}`,
            { cache: "no-store" }
          );
          const data: TcStatusResponse = await res.json();

          // ✅ Show EVERYTHING under the button (for testing)
          setDebug(data);

          if (data?.status === "verified" && data?.internalToken) {
            clearInterval(interval);
            setPolling(false);

            await signIn("truecaller", {
              redirect: true,
              token: data.internalToken,
              callbackUrl: "/user",
            });
            return;
          }

          if (data?.status === "failed") {
            clearInterval(interval);
            setPolling(false);
            setLoading(false);
            return;
          }

          // stop after 60s
          if (Date.now() - start > 60000) {
            clearInterval(interval);
            setPolling(false);
            setLoading(false);
            setDebug((prev) => ({
              ...(prev || {}),
              status: prev?.status || "pending",
              error: "Polling timeout (60s).",
            }));
          }
        } catch (e: any) {
          setDebug({ status: "failed", error: e?.message || "Polling error" });
        }
      }, 1500);
    }, 700);
  };

  return (
    <div className="w-full">
      <button
        onClick={handleTruecallerLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-70"
      >
        <div className="h-5 w-5 rounded-full bg-[#0087FF] flex items-center justify-center text-white text-[10px]">
          T
        </div>
        <span>
          {loading
            ? polling
              ? "Verifying with Truecaller..."
              : "Launching Truecaller..."
            : "Continue with Truecaller"}
        </span>
      </button>

      {/* ✅ Debug output below button */}
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
        <div className="mb-2 font-semibold">Truecaller Debug</div>

        <div className="space-y-1">
          <div>
            <span className="font-medium">status:</span>{" "}
            <span>{debug?.status || "-"}</span>
          </div>
          <div>
            <span className="font-medium">accessToken:</span>{" "}
            <span className="break-all">{debug?.accessToken || "-"}</span>
          </div>
          <div>
            <span className="font-medium">endpoint:</span>{" "}
            <span className="break-all">{debug?.endpoint || "-"}</span>
          </div>
          <div>
            <span className="font-medium">internalToken:</span>{" "}
            <span className="break-all">{debug?.internalToken || "-"}</span>
          </div>
          {debug?.error ? (
            <div className="text-red-600">
              <span className="font-medium">error:</span> {debug.error}
            </div>
          ) : null}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer select-none font-medium">
            Full response (JSON)
          </summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
