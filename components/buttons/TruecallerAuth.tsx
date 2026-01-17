"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, CheckCircle, XCircle, Activity, 
  Database, LogOut, RefreshCw, Smartphone, ListTree, ChevronRight
} from "lucide-react";

export default function TruecallerRealTest() {
  // --- States ---
  const [nonce, setNonce] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState("Idle");
  const [backendData, setBackendData] = useState<any>(null);
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  
  // --- UI Toggles ---
  const [showDebug, setShowDebug] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session, status: sessionStatus, update } = useSession();

  // 🟢 1. Initialization: Restore Nonce from SessionStorage
  useEffect(() => {
    const savedNonce = sessionStorage.getItem("truecaller_nonce");
    if (savedNonce) {
      setNonce(savedNonce);
      setStatus("Session recovered. Polling backend...");
    }
  }, []);

  // 🟢 2. Start Login Flow
  const startLogin = () => {
    const id = uuidv4();
    sessionStorage.setItem("truecaller_nonce", id);
    setNonce(id);
    setProfile(null);
    setBackendData(null);
    setStatus("Initiating Truecaller SDK...");

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
  };

  // 🟢 3. Manual Status Check (Nonce specific)
  const manualStatusCheck = async () => {
    if (!nonce) return setStatus("No active Nonce.");
    setStatus("Syncing with backend...");
    try {
      const res = await fetch(`/api/truecaller?nonce=${nonce}`);
      const data = await res.json();
      setBackendData(data);
      setStatus(`Status: ${data.status}`);
    } catch (e) {
      setStatus("Check failed.");
    }
  };

  // 🟢 4. Fetch Global History Array
  const fetchGlobalLogs = async () => {
    setStatus("Fetching server logs...");
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setGlobalLogs(data.logs || []);
      setShowLogs(true);
      setStatus("Logs updated.");
    } catch (e) {
      setStatus("Failed to fetch logs.");
    }
  };

  // 🟢 5. Sign Out
  const handleSignOut = async () => {
    sessionStorage.removeItem("truecaller_nonce");
    await signOut({ redirect: false });
    setNonce("");
    setProfile(null);
    setBackendData(null);
    await update();
    setStatus("Signed Out");
  };

  // 🟢 6. Polling Effect
  useEffect(() => {
    if (!nonce || profile) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/truecaller?nonce=${nonce}`);
        if (!res.ok) return;

        const data = await res.json();
        setBackendData(data);

        if (data.status === "VERIFIED") {
          clearInterval(intervalRef.current!);
          sessionStorage.removeItem("truecaller_nonce");
          setProfile(data.profile);
          
          const result = await signIn("truecaller", {
            redirect: false,
            requestId: nonce,
          });

          if (result?.ok) {
            setStatus("Session Created ✅");
            await update();
          }
        }
      } catch (err) { console.error(err); }
    }, 2000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [nonce, profile, update]);

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6 bg-white min-h-screen">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter">Truecaller Debug</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{status}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${sessionStatus === 'authenticated' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
          Auth: {sessionStatus}
        </div>
      </div>

      {/* 🔴 Main Actions */}
      <div className="space-y-3">
        <button
          onClick={startLogin}
          disabled={!!nonce && !profile}
          className="w-full bg-[#0087FF] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Smartphone className="w-5 h-5" />
          {!!nonce && !profile ? "Waiting for Callback..." : "Start Truecaller Auth"}
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={manualStatusCheck} className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100">
            <RefreshCw className="w-4 h-4 mb-1 text-gray-600" />
            <span className="text-[9px] font-black text-gray-500 uppercase">Check Status</span>
          </button>
          <button onClick={fetchGlobalLogs} className="flex flex-col items-center justify-center p-3 bg-indigo-50 rounded-xl border border-indigo-100 hover:bg-indigo-100">
            <ListTree className="w-4 h-4 mb-1 text-indigo-600" />
            <span className="text-[9px] font-black text-indigo-500 uppercase">Global Logs</span>
          </button>
          <button onClick={handleSignOut} className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100">
            <LogOut className="w-4 h-4 mb-1 text-red-600" />
            <span className="text-[9px] font-black text-red-500 uppercase">Sign Out</span>
          </button>
        </div>
      </div>

      {/* 🔴 Global Logs Section */}
      <AnimatePresence>
        {showLogs && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-indigo-900 rounded-2xl p-4 text-indigo-100 shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest">Server Event Array</span>
                <button onClick={() => setShowLogs(false)} className="text-indigo-400 font-bold">Close</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {globalLogs.length === 0 ? <p className="text-xs text-indigo-400">No logs yet...</p> : 
                  globalLogs.map((log, i) => (
                    <div key={i} className="bg-indigo-950 p-2 rounded-lg border border-indigo-800 text-[10px] font-mono">
                      <span className="text-indigo-400">[{log.timestamp?.split('T')[1].split('.')[0]}]</span> {log.type}
                    </div>
                  ))
                }
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 Live Sync Monitor */}
      <div className="bg-gray-900 rounded-2xl p-5 text-white shadow-2xl border border-gray-800">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" /> Live Sync Status
          </h3>
          <button onClick={() => setShowDebug(!showDebug)} className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
            {showDebug ? "HIDE JSON" : "VIEW JSON"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatusBadge label="SDK Callback" active={backendData?.status === "VERIFIED" || backendData?.status === "PROCESSING"} />
          <StatusBadge label="Alpha Sync" active={backendData?.alphaCallback?.ok} />
        </div>

        <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-bold">NONCE</span>
            <span className="text-[10px] text-blue-400 truncate w-32 text-right">{nonce || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-bold">STATUS</span>
            <span className={`text-[10px] font-black ${backendData?.status === 'VERIFIED' ? 'text-green-400' : 'text-yellow-500'}`}>
              {backendData?.status || "PENDING"}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {showDebug && backendData && (
            <motion.pre initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-4 text-[9px] bg-black p-4 rounded-xl border border-white/10 text-emerald-400 overflow-auto max-h-60"
            >
              {JSON.stringify(backendData, null, 2)}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>

      {/* Success Details */}
      {profile && (
        <div className="bg-green-50 border border-green-200 p-5 rounded-2xl animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-black text-xs uppercase">Verified Profile</span>
          </div>
          <p className="text-lg font-black text-gray-900">{profile.name?.first} {profile.name?.last}</p>
          <p className="text-sm font-bold text-gray-500">{profile.phoneNumber}</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-3 rounded-xl border ${active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-gray-600'} transition-all`}>
      {active ? <CheckCircle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </div>
  );
}