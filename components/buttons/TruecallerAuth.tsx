"use client";
import { useSession, signIn } from "next-auth/react"; // add signIn
import { useState, useEffect, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

export default function TruecallerRealTest() {
  const [nonce, setNonce] = useState("");
  const [profile, setProfile] = useState<any>(null); // ← uncomment / add this
  const [status, setStatus] = useState("Idle");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data } = useSession();

  // Optional: you can still use session.user for other things
  // const sessionProfile = useMemo(() => data?.user || null, [data?.user]);

  const startLogin = () => {
    const id = uuidv4();
    setNonce(id);
    setProfile(null);
    setStatus("Opening Truecaller app... Approve and return to this tab");

    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY || "zsyH7238a78c4b043444a96c02b328d657515";
    if (!partnerKey) {
      setStatus("Error: Missing Truecaller Partner Key (check .env)");
      return;
    }

    const params = new URLSearchParams({
      type: "btmsheet",
      requestNonce: id,
      partnerKey: partnerKey,
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

    setTimeout(() => {
      if (document.hasFocus()) {
        setStatus("Truecaller app not detected. Please install Truecaller or use manual verification.");
      }
    }, 2500);
  };

  // Polling logic
  useEffect(() => {
    if (!nonce || profile) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/truecaller?nonce=${nonce}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.status === "pending") return;

        // Success!
        setProfile(data.profile);
        setStatus("Verified successfully! Logged in.");

        // Trigger NextAuth sign-in
        await signIn("truecaller", {
          userId: data.auth.userId,
          accessToken: data.auth.accessToken,
          refreshToken: data.auth.refreshToken,
          customerUniqueId: data.auth.customerUniqueId,
          role: data.auth.role,
          verifiedAt: data.auth.verifiedAt,
          phoneNumber: data.phone,
          name: data.name,
          email: data.email,
          redirect: false, // stay on page
        });

        if (intervalRef.current) clearInterval(intervalRef.current);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    // Optional timeout (60 seconds)
    const timeout = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setStatus("Timeout — please try again");
    }, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timeout);
    };
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