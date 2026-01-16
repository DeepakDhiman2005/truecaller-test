"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function TruecallerRealTest() {
  const [status, setStatus] = useState("Initializing...");
  const [logs, setLogs] = useState<string[]>([]); // 📱 Virtual Console
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [rawProfile, setRawProfile] = useState<any>(null);

  // Helper to print logs to the screen
  const addLog = (msg: string) => {
    console.log(msg);
    setLogs((prev) => [...prev, `> ${msg}`]);
  };

  useEffect(() => {
    addLog("Checking for Truecaller SDK on window...");
    
    const checkInterval = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).truecaller) {
        addLog("Truecaller SDK detected on window! ✅");
        setIsSdkReady(true);
        setStatus("SDK Ready ✅");
        clearInterval(checkInterval);
      }
    }, 1000);

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      if (!isSdkReady) {
        addLog("ERROR: SDK timed out. Check Ad-blocker or Network tab.");
        setStatus("SDK Load Failed ❌");
        clearInterval(checkInterval);
      }
    }, 15000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, []);

  const startLogin = async () => {
    addLog("Start Login clicked...");
    const partnerKey = process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY || "zsyH7238a78c4b043444a96c02b328d657515";
    
    try {
      addLog(`Initializing with Key: ${partnerKey.substring(0, 8)}...`);
      
      (window as any).truecaller.init({
        partnerKey: partnerKey,
        requestNonce: uuidv4(),
        privacyUrl: "https://quikkred.vercel.app/privacy",
        termsUrl: "https://quikkred.vercel.app/terms",
      });

      addLog("Invoking Bottom Sheet...");
      const response = await (window as any).truecaller.requestVerification({
        type: "btmsheet",
      });

      addLog("Verification Success!");
      setRawProfile(response);
    } catch (err: any) {
      addLog(`FAILED: ${JSON.stringify(err)}`);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-40">
      <h2 className="font-bold text-center">Truecaller Vercel Debugger</h2>
      
      <button
        onClick={startLogin}
        disabled={!isSdkReady}
        className={`w-full py-4 rounded-xl font-bold ${isSdkReady ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}
      >
        {isSdkReady ? "Verify Now" : "Waiting for SDK..."}
      </button>

      {/* ✅ SUCCESS DATA */}
      {rawProfile && (
        <div className="bg-green-50 p-3 border border-green-200 rounded text-[10px] overflow-auto max-h-40">
          <p className="font-bold text-green-700">PROFILE DATA:</p>
          <pre>{JSON.stringify(rawProfile, null, 2)}</pre>
        </div>
      )}

      {/* 📱 VIRTUAL CONSOLE (Visible on Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black text-green-400 p-3 text-[10px] font-mono h-48 overflow-y-scroll border-t-2 border-green-500">
        <p className="text-white font-bold border-b border-gray-700 mb-1">MOBILE DEBUG CONSOLE</p>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}