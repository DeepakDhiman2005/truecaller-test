"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";

export default function TruecallerAuth() {
  const [loading, setLoading] = useState(false);

  const handleTruecallerLogin = async () => {
    setLoading(true);
    const nonce = uuidv4(); // Unique ID for this login attempt
    
    // 1. Prepare Deep Link Parameters
    const params = new URLSearchParams({
      type: "btmsheet",
      requestNonce: nonce,
      partnerKey: "tBoZJ5a56cdf619e24cac849d3a431e026499", // Your App Key
      partnerName: "Quikkred",
      lang: "en",
      privacyUrl: "https://app-alpha.quikkred.in/privacy",
      termsUrl: "https://app-alpha.quikkred.in/terms",
      loginPrefix: "Continue",
      ctaPrefix: "Verify with",
      btnShape: "rounded",
    });

    // 2. Trigger Truecaller App
    window.location.href = `truecallersdk://truesdk/web_verify?${params.toString()}`;

    // 3. Polling: Check every 2 seconds if the backend received the data
    const checkInterval = setInterval(async () => {
      const res = await fetch(`/api/auth/truecaller/status?nonce=${nonce}`);
      const data = await res.json();

      if (data.status === "verified") {
        clearInterval(checkInterval);
        // Success! Log them into NextAuth session
        await signIn("credentials", { 
          token: data.internalToken, 
          redirect: true, 
          callbackUrl: "/dashboard" 
        });
      }
    }, 2000);

    // Timeout polling after 60 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      setLoading(false);
    }, 60000);
  };

  return (
    <button
      onClick={handleTruecallerLogin}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-70"
    >
      <div id="tc-icon" className="h-5 w-5 bg-[#0087FF] rounded-full flex items-center justify-center text-white text-[10px]">T</div>
      <span>{loading ? "Launching Truecaller..." : "Continue with Truecaller"}</span>
    </button>
  );
}