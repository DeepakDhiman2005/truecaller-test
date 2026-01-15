"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------

type TruecallerProfile = {
  firstName?: string;
  lastName?: string;
  phoneNumbers?: string[];
  email?: string;
  city?: string;
  avatarUrl?: string;
  [key: string]: any;
};

type TcStatusResponse = {
  status?: "pending" | "verified" | "failed";
  profile?: TruecallerProfile;
  internalToken?: string;
  error?: string;
  requestId?: string;
  endpoint?: string;
  [key: string]: any;
};

// ---------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------

export default function TruecallerAuth() {
  // State
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [debug, setDebug] = useState<TcStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs for cleanup to prevent memory leaks if component unmounts
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Helper: Format User String safely
  const formatUserString = (profile?: TruecallerProfile) => {
    if (!profile) return "Profile data missing";
    const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Unknown Name";
    const phone = profile.phoneNumbers?.[0] || "No Phone";
    const email = profile.email || "No Email";
    return `${name} | ${phone} | ${email}`;
  };

  const handleTruecallerLogin = async () => {
    // 1. Reset State
    setLoading(true);
    setPolling(false);
    setDebug(null);
    setErrorMessage(null);
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      // 2. Configuration Check
      const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY;
      if (!partnerKey) {
        throw new Error("Configuration Error: NEXT_PUBLIC_TRUECALLER_APP_KEY is missing.");
      }

      const nonce = uuidv4();
      const params = new URLSearchParams({
        type: "btmsheet",
        requestNonce: nonce,
        partnerKey,
        partnerName: process.env.NEXT_PUBLIC_TRUECALLER_APP_NAME || "Quikkred",
        lang: "en",
        privacyUrl: `${window.location.origin}/privacy`,
        termsUrl: `${window.location.origin}/terms`,
        loginPrefix: "Continue",
        ctaPrefix: "Verify with",
        btnShape: "rounded",
        ttl: "600000",
      });

      // 3. Trigger Deep Link
      const deepLink = `truecallersdk://truesdk/web_verify?${params.toString()}`;
      window.location.href = deepLink;

      // 4. Wait to see if App Opens (Focus Check)
      setTimeout(() => {
        // If the document still has focus 600ms later, the app likely didn't open
        if (document.hasFocus()) {
          setLoading(false);
          setErrorMessage("Truecaller app did not open. Please ensure it is installed.");
          return;
        }

        // 5. Start Polling
        setPolling(true);
        const startTime = Date.now();

        intervalRef.current = setInterval(async () => {
          try {
            // Stop polling if timeout (60s)
            if (Date.now() - startTime > 60000) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              setLoading(false);
              setPolling(false);
              setErrorMessage("Verification timed out. Please try again.");
              return;
            }

            const res = await fetch(`/api/auth/truecaller/status?nonce=${nonce}`, {
              cache: "no-store",
            });

            if (!res.ok) {
              // Don't throw immediately on 404/pending, just wait for next tick
              console.warn("Polling status:", res.status);
              return; 
            }

            const data: TcStatusResponse = await res.json();
            setDebug(data); // Live update debug view

            // SUCCESS CASE
            if (data?.status === "verified" && data?.internalToken) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              setPolling(false);
              setLoading(false);

              // Auto-login with NextAuth
              await signIn("truecaller", {
                token: data.internalToken,
                callbackUrl: "/user",
                redirect: false,
              });
            } 
            
            // FAILED CASE
            else if (data?.status === "failed") {
              if (intervalRef.current) clearInterval(intervalRef.current);
              setLoading(false);
              setPolling(false);
              setErrorMessage(data.error || "Truecaller verification failed.");
            }

          } catch (pollError) {
            console.error("Polling Error:", pollError);
            // We do NOT stop polling on network hiccups, only on timeout or explicit fail
          }
        }, 2000); // Poll every 2 seconds

      }, 800);

    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || "An initialization error occurred.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* BUTTON */}
      <button
        onClick={handleTruecallerLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-800 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-70"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0087FF] text-[10px] font-bold text-white">
          T
        </div>
        <span>
          {loading
            ? polling
              ? "Waiting for confirmation..."
              : "Opening Truecaller..."
            : "Continue with Truecaller"}
        </span>
      </button>

      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
          <p className="text-xs font-semibold text-red-600">Action Failed</p>
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* SUCCESS DISPLAY (HTML String Format) */}
      {debug?.status === "verified" && debug.profile && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-1">
            Identity Verified
          </p>
          <code className="block bg-white border border-green-100 p-2 rounded text-xs text-gray-700 break-all font-mono">
            {formatUserString(debug.profile)}
          </code>
        </div>
      )}

      {/* RAW DEBUGGING PANEL */}
      <div className="mt-4 border-t pt-4">
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-gray-400 select-none flex items-center gap-2">
            <span>Debug Console</span>
            <span className="h-px flex-1 bg-gray-200"></span>
          </summary>
          <div className="mt-2 rounded bg-gray-900 p-3 shadow-inner">
            <div className="flex justify-between text-[10px] text-gray-400 mb-2 border-b border-gray-700 pb-1">
              <span>Status: {debug?.status || "idle"}</span>
              <span>Time: {new Date().toLocaleTimeString()}</span>
            </div>
            <pre className="overflow-x-auto text-[10px] leading-4 text-green-400 font-mono">
              {JSON.stringify(debug || { message: "No data received yet" }, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}