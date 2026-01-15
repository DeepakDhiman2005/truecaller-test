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
    setStatus("Opening Truecaller...");
    setProfile(null);

    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY || "zsyH7238a78c4b043444a96c02b328d657515";
    const params = new URLSearchParams({
      type: "btmsheet",
      requestNonce: id,
      partnerKey: partnerKey || "",
      partnerName: "test",
      lang: "en",
      privacyUrl: `${window.location.origin}/privacy`,
      termsUrl: `${window.location.origin}/terms`,
      loginPrefix: "Continue",
      ctaPrefix: "Verify with",
      btnShape: "rounded",
      ttl: "600000",
    });

    const deepLink = `truecallersdk://truesdk/web_verify?${params.toString()}`;
    window.location.href = deepLink;
  };

  useEffect(() => {
    if (!nonce || profile) return;

    // Start Polling the GET route every 2 seconds
    intervalRef.current = setInterval(async () => {
      setStatus("Polling Server for data...");
      try {
        const res = await fetch(`/api/auth/truecaller/status?nonce=${nonce}`);
        const data = await res.json();

        if (data.status === "verified") {
          setProfile(data.profile);
          setStatus("Identity Verified!");
          clearInterval(intervalRef.current);
        }
      } catch (e) {
        console.error("Polling...");
      }
    }, 2000);

    return () => clearInterval(intervalRef.current);
  }, [nonce, profile]);

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <button 
        onClick={startLogin}
        className="w-full bg-[#0087FF] text-white py-4 rounded-xl font-bold shadow-lg"
      >
        Login with Mobile Number
      </button>

      <div className="text-xs font-mono bg-gray-100 p-2 rounded">
        <strong>Status:</strong> {status}
      </div>

      {/* --- REAL DATA PRINT --- */}
      {profile && (
        <div className="border-2 border-green-500 bg-green-50 p-6 rounded-2xl shadow-xl animate-bounce">
          <h2 className="text-green-700 font-black text-center border-b border-green-200 pb-2 mb-4">
            REAL PROFILE DATA
          </h2>
          <div className="space-y-2 text-sm text-gray-800">
            <p><strong>NAME:</strong> {profile.firstName} {profile.lastName}</p>
            <p><strong>PHONE:</strong> {profile.phoneNumbers?.[0]}</p>
            <p><strong>EMAIL:</strong> {profile.email || "Not Provided"}</p>
            <p><strong>CITY:</strong> {profile.addresses?.[0]?.city || "Not Provided"}</p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-green-200">
            <p className="text-[10px] text-gray-400 font-bold mb-2">RAW JSON DEBUG:</p>
            <pre className="text-[9px] bg-black text-green-400 p-3 rounded h-32 overflow-auto font-mono">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}