"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

export default function TruecallerRealTest() {
  const [nonce, setNonce] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState("Idle");
  const intervalRef = useRef<any>(null);

  const startLogin = () => {
    const id = uuidv4();
    setNonce(id);
    setProfile(null);
    setStatus("Opening Truecaller app... Approve and return to this tab");

    // Use your real partner key from Truecaller dashboard via .env
    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY || "zsyH7238a78c4b043444a96c02b328d657515";

    if (!partnerKey) {
      setStatus("Error: Missing Truecaller Partner Key (check .env)");
      return;
    }

    const params = new URLSearchParams({
      type: "btmsheet",
      requestNonce: id,
      partnerKey: partnerKey,
      partnerName: "test", // Use your actual app name
      lang: "en",
      privacyUrl: `${window.location.origin}/privacy`,
      termsUrl: `${window.location.origin}/terms`,
      loginPrefix: "Continue",
      ctaPrefix: "Verify with",
      btnShape: "rounded",
      ttl: "600000", // 10 minutes
    });

    const deepLink = `truecallersdk://truesdk/web_verify?${params.toString()}`;

    // Standard way: redirect to deep link (works reliably on mobile Android)
    window.location.href = deepLink;

    // Fallback check: if page still focused after 2.5s, Truecaller app likely not installed
    setTimeout(() => {
      if (document.hasFocus()) {
        setStatus("Truecaller app not detected. Please install Truecaller or use manual verification.");
      }
    }, 2500);
  };

  useEffect(() => {
    if (!nonce || profile) return;

    intervalRef.current = setInterval(async () => {
      setStatus("Polling for verification... (return to this tab after approving)");

      try {
        // Fixed: Match your API route path (assuming app/api/truecaller/route.ts)
        const res = await fetch(`/api/truecaller?nonce=${nonce}`);
        
        if (!res.ok) {
          console.error("Polling error:", res.status);
          return;
        }

        const data = await res.json();

        if (data.status === "verified") {
          setProfile(data.profile);
          setStatus("Identity Verified Successfully!");
          clearInterval(intervalRef.current);
        }
      } catch (e) {
        console.error("Polling failed:", e);
      }
    }, 3000); // Slightly longer interval to reduce load

    return () => clearInterval(intervalRef.current);
  }, [nonce, profile]);

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <button
        onClick={startLogin}
        disabled={!!nonce && !profile}
        className="w-full bg-[#0087FF] text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50"
      >
        Login with Mobile Number
      </button>

      <div className="text-xs font-mono bg-gray-100 p-2 rounded">
        <strong>Status:</strong> {status}
      </div>

      {profile && (
        <div className="border-2 border-green-500 bg-green-50 p-6 rounded-2xl shadow-xl">
          <h2 className="text-green-700 font-black text-center border-b border-green-200 pb-2 mb-4">
            REAL PROFILE DATA
          </h2>
          <div className="space-y-2 text-sm text-gray-800">
            <p><strong>NAME:</strong> {profile.name?.first} {profile.name?.last || profile.firstName} {profile.lastName}</p>
            <p><strong>PHONE:</strong> {profile.phoneNumbers?.[0] || profile.phoneNumber}</p>
            <p><strong>EMAIL:</strong> {profile.email || profile.onlineIdentities?.email || "Not Provided"}</p>
            <p><strong>CITY:</strong> {profile.addresses?.[0]?.city || "Not Provided"}</p>
          </div>

          <div className="mt-6 pt-4 border-t border-green-200">
            <p className="text-[10px] text-gray-400 font-bold mb-2">RAW JSON DEBUG:</p>
            <pre className="text-[9px] bg-black text-green-400 p-3 rounded h-48 overflow-auto font-mono">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}