"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, CheckCircle, Activity, 
  LogOut, RefreshCw, Smartphone, ListTree, 
  FileJson, Copy, ShieldCheck, Database,
  XCircle
} from "lucide-react";

export default function TruecallerRealTest() {
  // --- Core States ---
  const [nonce, setNonce] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState("Idle");
  const [backendData, setBackendData] = useState<any>(null);
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  
  // --- UI Control States ---
  const [showDebug, setShowDebug] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session, status: sessionStatus, update } = useSession();

  // 1. Initial Load: Restore Nonce from SessionStorage to handle page refreshes
  useEffect(() => {
    const savedNonce = sessionStorage.getItem("truecaller_nonce");
    if (savedNonce) {
      setNonce(savedNonce);
      setStatus("Session recovered. Resuming polling...");
    }
  }, []);

  // 2. Start Truecaller Web SDK Flow
  const startLogin = () => {
    const id = uuidv4();
    sessionStorage.setItem("truecaller_nonce", id);
    setNonce(id);
    setProfile(null);
    setBackendData(null);
    setStatus("Opening Truecaller SDK...");

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

  // 3. Manual Fetch of Global Status Array
  const fetchGlobalLogs = async () => {
    setStatus("Fetching server logs...");
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setGlobalLogs(data.logs || []);
      setShowLogs(true);
      setStatus("Global logs updated.");
    } catch (e) {
      setStatus("Error: Failed to fetch global logs.");
    }
  };

  // 4. Manual Backend Sync Check (Nonce specific)
  const manualStatusCheck = async () => {
    if (!nonce) return setStatus("No active Nonce found.");
    setStatus("Checking specific nonce...");
    try {
      const res = await fetch(`/api/truecaller?nonce=${nonce}`);
      const data = await res.json();
      setBackendData(data);
      setStatus(`Last Status: ${data.status}`);
    } catch (e) {
      setStatus("Backend check failed.");
    }
  };

  // 5. Global Sign Out & State Reset
  const handleSignOut = async () => {
    sessionStorage.removeItem("truecaller_nonce");
    await signOut({ redirect: false });
    setNonce("");
    setProfile(null);
    setBackendData(null);
    await update();
    setStatus("Session Cleared");
  };

  // 6. Clipboard Helper
  const copyJSON = (obj: any) => {
    setIsCopying(true);
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setTimeout(() => setIsCopying(false), 2000);
  };

  // 7. Auto-Polling Logic
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
            setStatus("NextAuth Session Created ✅");
            await update();
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [nonce, profile, update]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* TOP HEADER SECTION */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-[#0087FF]" />
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Quikkred Auth Lab</h1>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{status}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${sessionStatus === 'authenticated' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
              <div className={`w-2 h-2 rounded-full ${sessionStatus === 'authenticated' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              {sessionStatus === 'authenticated' ? 'Logged In' : 'Guest Mode'}
            </div>
          </div>
        </header>

        {/* MAIN INTERACTION CARD */}
        <main className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls Column */}
          <div className="md:col-span-5 space-y-4">
            <button
              onClick={startLogin}
              disabled={!!nonce && !profile}
              className="w-full bg-[#0087FF] text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-blue-100 disabled:opacity-50 hover:bg-[#0075e0] transition-all flex items-center justify-center gap-3 active:scale-[0.97]"
            >
              <Smartphone className="w-6 h-6" />
              {!!nonce && !profile ? "Waiting..." : "Truecaller Login"}
            </button>

            <div className="grid grid-cols-1 gap-2">
              <ActionButton icon={<RefreshCw className="w-4 h-4" />} label="Refresh Status" onClick={manualStatusCheck} color="slate" />
              <ActionButton icon={<ListTree className="w-4 h-4" />} label="Server History" onClick={fetchGlobalLogs} color="indigo" />
              <ActionButton icon={<LogOut className="w-4 h-4" />} label="Logout / Reset" onClick={handleSignOut} color="red" />
            </div>
          </div>

          {/* Monitoring Column */}
          <div className="md:col-span-7 space-y-4">
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-24 h-24" />
               </div>
               
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Live Backend Sync</h3>
                  <button 
                    onClick={() => setShowDebug(!showDebug)} 
                    className={`text-[9px] font-black px-4 py-1.5 rounded-full border transition-all ${showDebug ? 'bg-blue-500 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-blue-400'}`}
                  >
                    {showDebug ? "CLOSE INSPECTOR" : "INSPECT JSON"}
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-6">
                  <StatusIndicator label="Callback" active={backendData?.status === "VERIFIED" || backendData?.status === "PROCESSING"} />
                  <StatusIndicator label="Alpha Sync" active={backendData?.alphaCallback?.ok} />
               </div>

               <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Request Nonce</span>
                    <span className="text-blue-400 truncate max-w-[150px]">{nonce || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Current Status</span>
                    <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${backendData?.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {backendData?.status || "Idle / Pending"}
                    </span>
                  </div>
               </div>
            </div>
          </div>
        </main>

        {/* FULL-WIDTH ENHANCED LOG VIEWER */}
        <AnimatePresence>
          {(showLogs || showDebug) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="z-50"
            >
              <div className="bg-[#111111] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800">
                <div className="flex justify-between items-center p-4 bg-[#1A1A1A] border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {showLogs ? "Server Execution Logs" : "Current Object Inspector"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyJSON(showLogs ? globalLogs : backendData)}
                      className="text-[10px] font-black text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg transition-colors"
                    >
                      {isCopying ? "Copied!" : <><Copy className="w-3 h-3" /> Copy JSON</>}
                    </button>
                    <button 
                      onClick={() => { setShowLogs(false); setShowDebug(false); }} 
                      className="text-slate-500 hover:text-white p-1"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-0 max-h-[500px] overflow-auto bg-[#0A0A0A] custom-scrollbar">
                  {showLogs ? (
                    <div className="divide-y divide-slate-800">
                      {globalLogs.length === 0 ? (
                        <div className="p-10 text-center text-slate-600 text-sm font-bold">No logs found on server memory.</div>
                      ) : (
                        globalLogs.map((log, i) => (
                          <div key={i} className="p-6 hover:bg-[#111] transition-colors group">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-[10px] font-mono text-slate-500">[{log.timestamp?.split('T')[1].split('Z')[0]}]</span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                log.type === 'ERROR' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                                log.type === 'DEBUG' ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30' : 
                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {log.type}
                              </span>
                              <span className="text-xs font-bold text-slate-300">{log.message}</span>
                            </div>
                            
                            {log.detail && (
                              <div className="relative mt-2">
                                <pre className="text-[11px] leading-relaxed font-mono bg-[#050505] p-4 rounded-xl border border-slate-800 text-emerald-500/90 overflow-x-auto">
                                  {JSON.stringify(log.detail, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="p-6">
                      <pre className="text-[11px] font-mono text-emerald-400 bg-[#050505] p-6 rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed">
                        {JSON.stringify(backendData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VERIFIED SUCCESS CARD */}
        {profile && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-emerald-500 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-200">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-md">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-black tracking-tight mb-2">Verified Successfully</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-emerald-50 opacity-90 font-bold text-sm">
                  <span>Name: {profile.name?.first} {profile.name?.last}</span>
                  <span className="w-1 h-1 bg-white/40 rounded-full mt-2 hidden md:block" />
                  <span>Phone: {profile.phoneNumber}</span>
                </div>
              </div>
              <div className="bg-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-400/30">
                NextAuth Session: Ready
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* PERSISTENT MOBILE FOOTER BAR */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-100 sm:hidden">
         <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black uppercase text-slate-500">Status Monitor Active</span>
            </div>
            <button onClick={manualStatusCheck} className="p-2 bg-slate-100 rounded-lg">
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
         </div>
      </footer>
    </div>
  );
}

// Helper Components
function ActionButton({ icon, label, onClick, color }: { icon: any, label: string, onClick: any, color: string }) {
  const colors: any = {
    slate: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    indigo: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
    red: "bg-red-50 text-red-600 hover:bg-red-100"
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 ${colors[color]}`}>
      {icon}
      {label}
    </button>
  );
}

function StatusIndicator({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-4 rounded-3xl border transition-all ${active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-600'}`}>
      <div className={`relative flex h-3 w-3`}>
        {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${active ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}