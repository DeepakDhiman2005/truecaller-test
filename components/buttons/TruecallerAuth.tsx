"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function TruecallerRealTest() {
  const [status, setStatus] = useState("Initializing... Waiting for SDK");
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [rawProfile, setRawProfile] = useState<any>(null); // Success Data
  const [errorLog, setErrorLog] = useState<any>(null);     // Error Data

  const { data: session } = useSession();

  // ✅ FIX: Wait for window.truecaller to become available
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if ((window as any).truecaller) {
        setIsSdkReady(true);
        setStatus("Truecaller SDK Loaded & Ready ✅");
        clearInterval(checkInterval); // Stop checking once found
      }
    }, 100); // Check every 100ms

    // Stop checking after 10 seconds to avoid infinite loops if script fails
    const timeout = setTimeout(() => clearInterval(checkInterval), 10000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, []);

  const startLogin = async () => {
    if (!isSdkReady) {
      setStatus("Error: SDK is not loaded. Please refresh or check your internet.");
      return;
    }

    setRawProfile(null);
    setErrorLog(null);
    const requestId = uuidv4();

    try {
      setStatus("Initializing Request...");
      
      // 1. Init SDK
      (window as any).truecaller.init({
        partnerKey: process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY || "zsyH7238a78c4b043444a96c02b328d657515",
        requestNonce: requestId,
        privacyUrl: "https://quikkred.vercel.app/privacy",
        termsUrl: "https://quikkred.vercel.app/terms",
      });

      setStatus("Opening Bottom Sheet... Please check your phone.");

      // 2. Request Verification
      const response = await (window as any).truecaller.requestVerification({
        type: "btmsheet",
      });

      // ✅ SUCCESS: Print Data
      console.log("Success:", response);
      setRawProfile(response);
      setStatus("Verification Successful! See Data Below 👇");

      /* // Uncomment to sign in with NextAuth later
       await signIn("truecaller", { redirect: false, profileData: JSON.stringify(response) });
      */

    } catch (err: any) {
      console.error("Truecaller Error:", err);
      // ✅ FAIL: Print Error JSON
      setErrorLog(err); 
      setStatus("Verification Failed. See Error Log Below 👇");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-bold text-center">Truecaller Debugger</h2>

      {/* --- MAIN BUTTON --- */}
      <button
        onClick={startLogin}
        disabled={!isSdkReady}
        className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${
          isSdkReady 
            ? "bg-[#0087FF] text-white hover:scale-105" 
            : "bg-gray-400 text-gray-200 cursor-not-allowed"
        }`}
      >
        {isSdkReady ? "Verify with Truecaller" : "Loading SDK..."}
      </button>

      {/* --- STATUS BOX --- */}
      <div className={`text-xs font-mono p-3 rounded border ${
          status.includes("Success") ? "bg-green-100 border-green-300 text-green-800" :
          status.includes("Failed") || status.includes("Error") ? "bg-red-100 border-red-300 text-red-800" :
          "bg-gray-100 border-gray-300 text-gray-700"
      }`}>
        <strong>Status:</strong> {status}
      </div>

      {/* --- ✅ SUCCESS DATA DISPLAY --- */}
      {rawProfile && (
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <h3 className="text-sm font-bold text-green-800 mb-2">🚀 SUCCESS DATA</h3>
          <pre className="text-[10px] bg-black text-green-400 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(rawProfile, null, 2)}
          </pre>
        </div>
      )}

      {/* --- ❌ ERROR LOG DISPLAY --- */}
      {errorLog && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <h3 className="text-sm font-bold text-red-800 mb-2">⚠️ ERROR LOG</h3>
          <pre className="text-[10px] bg-black text-red-400 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(errorLog, null, 2)}
          </pre>
        </div>
      )}

      <button onClick={() => signOut()} className="w-full text-xs text-gray-500 underline">
        Reset / Sign Out
      </button>
    </div>
  );
}