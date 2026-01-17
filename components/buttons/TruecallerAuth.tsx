"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, XCircle, Terminal, Activity } from "lucide-react";

export default function TruecallerRealTest() {
  const [nonce, setNonce] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState("Idle");
  const [backendData, setBackendData] = useState<any>(null); // 🟢 Holds raw status from GET /api/truecaller
  const [showDebug, setShowDebug] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session, status: sessionStatus, update } = useSession();

  const startLogin = () => {
    const id = uuidv4();
    setNonce(id);
    setProfile(null);
    setBackendData(null);
    setStatus("Opening Truecaller...");

    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY || "m9aggf2b26b2595f641dd8dde393e8c9ed09b";
    
    const params = new URLSearchParams({
      type: "btmsheet",
      requestNonce: id,
      partnerKey: partnerKey,
      partnerName: process.env.NEXT_PUBLIC_TRUECALLER_APP_NAME || "quikkred-test",
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
        setStatus("Truecaller app not detected.");
      }
    }, 2500);
  };

  // Polling logic + Backend Status Sync
  useEffect(() => {
    if (!nonce || profile) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/truecaller?nonce=${nonce}`);
        if (!res.ok) return;

        const data = await res.json();
        setBackendData(data); // 🟢 Update live backend status

        if (data.status === "VERIFIED") {
          clearInterval(intervalRef.current!);
          setProfile(data.profile);
          setStatus("Verified! Syncing session...");

          const result = await signIn("truecaller", {
            redirect: false,
            requestId: nonce,
          });

          if (result?.ok) {
            setStatus("Session Active ✅");
            await update();
          } else {
            setStatus("Session Error: " + result?.error);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [nonce, profile, update]);

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      <button
        onClick={startLogin}
        disabled={!!nonce && !profile}
        className="w-full bg-[#0087FF] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95 transition-all"
      >
        {!!nonce && !profile ? "Waiting for Approval..." : "Login with Truecaller"}
      </button>

      {/* 🟢 Backend Status Check UI */}
      <div className="bg-gray-900 rounded-2xl p-4 text-white shadow-2xl border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase tracking-tighter text-gray-400 flex items-center gap-2">
            <Activity className="w-3 h-3 text-green-400" />
            Backend Sync Status
          </h3>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] bg-gray-800 px-2 py-1 rounded font-bold hover:bg-gray-700 transition-colors"
          >
            {showDebug ? "Hide JSON" : "Show JSON"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatusBadge label="Truecaller Callback" active={backendData?.status === "VERIFIED" || backendData?.status === "PROCESSING"} />
          <StatusBadge label="Alpha Backend" active={backendData?.alphaCallback?.ok} />
        </div>

        <div className="text-[11px] font-mono space-y-1 text-gray-300">
          <p>Status: <span className="text-green-400 font-bold">{backendData?.status || "WAITING"}</span></p>
          <p>Request ID: <span className="text-blue-300">{nonce || "NONE"}</span></p>
        </div>

        <AnimatePresence>
          {showDebug && backendData && (
            <motion.pre 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 text-[10px] bg-black p-3 rounded-xl border border-gray-700 overflow-auto max-h-64 text-emerald-400"
            >
              {JSON.stringify(backendData, null, 2)}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Success Card */}
      {profile && (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-3xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="text-emerald-500 w-6 h-6" />
            <h2 className="text-emerald-900 font-black text-xl">Verification Successful</h2>
          </div>
          <p className="text-sm font-bold text-emerald-800">Name: {profile.name?.first} {profile.name?.last}</p>
          <p className="text-sm text-emerald-700">Phone: {profile.phoneNumber}</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${active ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'} transition-all`}>
      {active ? <CheckCircle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
      <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
    </div>
  );
}