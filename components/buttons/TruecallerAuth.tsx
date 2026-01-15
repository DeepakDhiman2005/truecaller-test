"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

export default function TruecallerRealTest() {
  const [nonce, setNonce] = useState("");
  const [profile, setProfile] = useState<any>(null); // truecaller fetched profile (your polling result)
  const [status, setStatus] = useState("Idle");

  // ✅ NEW: store session user details on button click
  const [sessionUser, setSessionUser] = useState<any>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session, status: sessionStatus, update } = useSession();

  const startLogin = () => {
    const id = uuidv4();
    setNonce(id);
    setProfile(null);
    setStatus("Opening Truecaller app... Approve and return to this tab");

    const partnerKey =
      process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY ||
      "zsyH7238a78c4b043444a96c02b328d657515";

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
        setStatus(
          "Truecaller app not detected. Please install Truecaller or use manual verification."
        );
      }
    }, 2500);
  };

  // ✅ NEW: button handler to read session and show it
  const getSessionDetails = async () => {
    // If you want, you can force refresh session from server:
    // await update();
    setSessionUser(session || null);

    if (!session) setStatus("No session found. Please login first.");
    else setStatus("Session loaded from NextAuth (useSession).");
  };

  // Polling logic
  useEffect(() => {
    if (!nonce || profile) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/truecaller?nonce=${nonce}`); // Calls our GET route
        if (!res.ok) return;

        const data = await res.json();

        // If status is 'VERIFIED', we proceed
        if (data.status === "VERIFIED") {
          clearInterval(intervalRef.current!); // Stop polling

          setProfile(data.profile);
          setStatus("Verified! creating session...");

          // ✅ FIX: Pass 'requestId' (which matches the key in NextAuth credentials)
          const result = await signIn("truecaller", {
            redirect: false,
            requestId: nonce,
          });

          if (result?.ok) {
            setStatus("Session Created Successfully!");
            await update(); // Force UI update
          } else {
            setStatus("Session Creation Failed: " + result?.error);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    const timeout = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setStatus("Timeout — please try again");
    }, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timeout);
    };
  }, [nonce, profile, update]);

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <button
        onClick={startLogin}
        disabled={!!nonce && !profile}
        className="w-full bg-[#0087FF] text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50"
      >
        Login with Mobile Number
      </button>

      {/* ✅ NEW BUTTON */}
      <button
        onClick={getSessionDetails}
        className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-lg"
      >
        Get Session User Details
      </button>

      <div className="text-xs font-mono bg-gray-100 p-2 rounded">
        <strong>Status:</strong> {status}
        <div className="mt-1">
          <strong>NextAuth:</strong> {sessionStatus}
        </div>
      </div>

      {/* ✅ Show session details */}
      {sessionUser && (
        <div className="border border-gray-300 bg-white p-4 rounded-xl shadow">
          <h3 className="font-bold mb-2">SESSION (useSession)</h3>

          <div className="text-sm space-y-1">
            <p>
              <strong>ID:</strong> {(sessionUser.user as any)?.id || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {sessionUser.user?.email || "N/A"}
            </p>
            <p>
              <strong>AccessToken:</strong>{" "}
              {(sessionUser as any)?.accessToken ? "✅ present" : "❌ missing"}
            </p>
            <p>
              <strong>Role:</strong> {(sessionUser as any)?.role || "N/A"}
            </p>
          </div>

          <div className="mt-3">
            <p className="text-[10px] text-gray-500 font-bold mb-2">RAW SESSION JSON</p>
            <pre className="text-[10px] bg-gray-900 text-green-400 p-3 rounded max-h-56 overflow-auto">
              {JSON.stringify(sessionUser, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Your existing Truecaller profile preview */}
      {profile && (
        <div className="border-2 border-green-500 bg-green-50 p-6 rounded-2xl shadow-xl">
          <h2 className="text-green-700 font-black text-center border-b border-green-200 pb-2 mb-4">
            TRUECALLER PROFILE (POLL RESULT)
          </h2>

          <div className="space-y-2 text-sm text-gray-800">
            <p>
              <strong>NAME:</strong> {profile.name?.first}{" "}
              {profile.name?.last || profile.firstName} {profile.lastName}
            </p>
            <p>
              <strong>PHONE:</strong> {profile.phoneNumbers?.[0] || profile.phoneNumber}
            </p>
            <p>
              <strong>EMAIL:</strong>{" "}
              {profile.email || profile.onlineIdentities?.email || "Not Provided"}
            </p>
            <p>
              <strong>CITY:</strong> {profile.addresses?.[0]?.city || "Not Provided"}
            </p>
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
