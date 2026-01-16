"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function TruecallerRealTest() {
  const [status, setStatus] = useState("Idle");
  const [rawProfile, setRawProfile] = useState<any>(null); // State to store direct SDK response
  const [sessionUser, setSessionUser] = useState<any>(null);
  const { data: session, status: sessionStatus, update } = useSession();

  const startLogin = async () => {
    if (!(window as any).truecaller) {
      setStatus("Truecaller SDK not loaded yet");
      return;
    }

    const requestId = uuidv4();
    
    try {
      (window as any).truecaller.init({
        partnerKey: process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY || "zsyH7238a78c4b043444a96c02b328d657515",
        requestNonce: requestId,
        privacyUrl: "https://quikkred.vercel.app/privacy",
        termsUrl: "https://quikkred.vercel.app/terms",
      });

      setStatus("Waiting for user approval in Truecaller...");

      const response = await (window as any).truecaller.requestVerification({
        type: "btmsheet",
      });

      // ✅ 1. Print data directly to state so it shows in HTML
      console.log("Direct Response:", response);
      setRawProfile(response);
      setStatus("Data received directly from SDK!");

      // ✅ 2. signIn code COMMENTED OUT (Uncomment when ready for production)
      /*
      const result = await signIn("truecaller", {
        redirect: false,
        profileData: JSON.stringify(response),
      });
      if (!result?.error) await update();
      */

    } catch (err: any) {
      setStatus(err.message || "Verification failed");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <button
        onClick={startLogin}
        className="w-full bg-[#0087FF] text-white py-4 rounded-xl font-bold shadow-lg"
      >
        Verify with Truecaller
      </button>

      {/* --- STATUS BOX --- */}
      <div className="text-xs font-mono bg-gray-100 p-3 rounded border">
        <strong>Status:</strong> {status}
      </div>

      {/* --- DIRECT DATA DISPLAY (HTML PRINT) --- */}
      {rawProfile && (
        <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
          <h3 className="text-sm font-bold text-yellow-800 mb-2">🚀 Direct SDK Response:</h3>
          <div className="text-xs space-y-2">
            <p><strong>Name:</strong> {rawProfile.firstName} {rawProfile.lastName}</p>
            <p><strong>Phone:</strong> {rawProfile.phoneNumber}</p>
            <p><strong>Email:</strong> {rawProfile.email || "N/A"}</p>
            <p><strong>City:</strong> {rawProfile.city || "N/A"}</p>
          </div>
          
          <details className="mt-3">
            <summary className="text-[10px] cursor-pointer text-blue-600 font-bold">VIEW RAW JSON</summary>
            <pre className="mt-2 text-[10px] bg-black text-green-400 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(rawProfile, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* --- ACTIONS --- */}
      <div className="flex gap-2">
        <button
          onClick={() => setSessionUser(session)}
          className="flex-1 bg-black text-white py-2 rounded-lg text-sm"
        >
          Check Session
        </button>
        <button
          onClick={() => signOut()}
          className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg text-sm font-bold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}