"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Copy, Check, ExternalLink, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

// ── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { id: "workflow_start",  label: "Workflow Start",  icon: "🚀" },
  { id: "checkout",        label: "Checkout",        icon: "📥" },
  { id: "aws_auth",        label: "AWS Auth",        icon: "🔐" },
  { id: "terraform_setup", label: "TF Setup",        icon: "⚙️" },
  { id: "terraform_init",  label: "State Init",      icon: "📦" },
  { id: "terraform_plan",  label: "Plan",            icon: "📋" },
  { id: "terraform_apply", label: "Apply",           icon: "🏗️" },
  { id: "complete",        label: "Complete",        icon: "🎉" },
];

const springFast = {
  type: "spring",
  stiffness: 450,
  damping: 32,
  mass: 0.7,
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ProvisioningTerminal({ requestId, onComplete }) {
  const { data: session } = useSession();
  const [logs, setLogs] = useState([]);
  const [requestStatus, setRequestStatus] = useState("provisioning");
  const [workflowUrl, setWorkflowUrl] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef(null);
  const intervalRef = useRef(null);
  const hasCompletedRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const res = await fetch(
        `/api/backend/api/requests/${requestId}/logs`,
        { headers: { "x-user-email": session.user.email } }
      );
      if (!res.ok) {
        if (res.status === 403) { setError("Access denied"); return; }
        if (res.status === 404) { setError("Request not found"); return; }
        return; // transient error — keep polling
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setRequestStatus(data.request_status);
      setWorkflowUrl(data.workflow_run_url || null);

      // Stop polling once terminal (success or failure)
      if (data.request_status === "ready" || data.request_status === "failed") {
        clearInterval(intervalRef.current);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.(data.request_status);
        }
      }
    } catch {
      // Network error — keep polling silently
    }
  }, [requestId, session?.user?.email, onComplete]);

  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 2000);
    return () => clearInterval(intervalRef.current);
  }, [fetchLogs]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current && !isCollapsed) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const handleCopyLogs = () => {
    const logText = logs.map(l => `[${new Date(l.created_at).toLocaleTimeString()}] [${l.step}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(logText || "No logs yet");
    setCopied(true);
    toast.success("Terminal logs copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const stepMap = Object.fromEntries(
    logs.map((l) => [l.step, { status: l.status, message: l.message }])
  );
  const successCount = logs.filter((l) => l.status === "success").length;
  const progressPct = Math.min(Math.round((successCount / STEPS.length) * 100), 100);

  const isDone = requestStatus === "ready" || requestStatus === "failed";
  const isSuccess = requestStatus === "ready";

  if (error) {
    return (
      <div className="rounded-2xl bg-red-950/20 border border-red-500/30 p-4 text-xs font-mono text-red-400 flex items-center gap-2.5">
        <XCircle size={16} className="text-red-400 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springFast}
      className="w-full rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-white/10 bg-[#08080a] font-mono text-xs ring-1 ring-white/5"
    >
      {/* ── Title bar with MacOS traffic lights ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0e12] border-b border-white/5 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <Terminal size={13} className="text-cyan-400" />
            <span className="text-zinc-300 text-[11px] font-semibold tracking-wider uppercase font-mono">
              Terraform Engine Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isDone ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
              </span>
              RUNNING
            </span>
          ) : isSuccess ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 size={11} className="text-emerald-400" />
              DEPLOYED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-300 border border-red-500/20">
              <XCircle size={11} className="text-red-400" />
              FAILED
            </span>
          )}

          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            title="Copy Logs"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>

          <button
            onClick={() => setIsCollapsed((c) => !c)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center"
            title={isCollapsed ? "Expand Terminal" : "Collapse Terminal"}
          >
            {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>

      {/* ── Progress bar with gradient fill ── */}
      <div className="px-4 py-2.5 bg-black/40 border-b border-white/5 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              {isDone ? (
                isSuccess ? (
                  <span className="text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Infrastructure provisioned successfully
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle size={12} /> Provisioning pipeline encountered an error
                  </span>
                )
              ) : (
                <span className="text-cyan-300 flex items-center gap-1.5">
                  <RefreshCw size={11} className="animate-spin text-cyan-400" /> Executing isolated Terraform apply...
                </span>
              )}
            </span>
            <span className="text-zinc-300 font-semibold">{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden ring-1 ring-white/5">
            <motion.div
              className={`h-full rounded-full ${
                isSuccess 
                  ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]" 
                  : requestStatus === "failed" 
                  ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]" 
                  : "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springFast}
          >
            {/* ── Step grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-3 bg-black/60 border-b border-white/5">
              {STEPS.map((step) => {
                const s = stepMap[step.id];
                const stepStatus = s?.status ?? "pending";
                
                let cardStyle = "border-white/5 bg-white/[0.02] text-zinc-500";
                if (stepStatus === "running") {
                  cardStyle = "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.1)] ring-1 ring-cyan-500/30";
                } else if (stepStatus === "success") {
                  cardStyle = "border-emerald-500/30 bg-emerald-500/5 text-emerald-300";
                } else if (stepStatus === "failed") {
                  cardStyle = "border-red-500/40 bg-red-500/10 text-red-300";
                }

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] transition-all duration-300 ${cardStyle}`}
                  >
                    <span className="text-xs">{step.icon}</span>
                    <span className="truncate font-medium">{step.label}</span>
                    {stepStatus === "success" && (
                      <Check size={11} className="ml-auto text-emerald-400 shrink-0 stroke-[2.5]" />
                    )}
                    {stepStatus === "running" && (
                      <RefreshCw size={11} className="ml-auto text-cyan-400 animate-spin shrink-0" />
                    )}
                    {stepStatus === "failed" && (
                      <span className="ml-auto text-red-400 font-bold shrink-0">✕</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Log output ── */}
            <div
              ref={terminalRef}
              className="h-56 overflow-y-auto bg-[#050507] px-4 py-3.5 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 select-text"
            >
              {logs.length === 0 ? (
                <div className="flex items-center gap-2 text-zinc-600 italic py-2">
                  <RefreshCw size={12} className="animate-spin text-zinc-500" />
                  <span>Connecting to AWS workflow runner...</span>
                </div>
              ) : (
                logs.map((log, i) => {
                  const isErr = log.status === "failed" || log.message?.toLowerCase().includes("fail") || log.message?.toLowerCase().includes("error");
                  const isSucc = log.status === "success" || log.message?.includes("✅") || log.message?.includes("complete");
                  const isRun = log.status === "running";

                  return (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className="leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-zinc-600 shrink-0 select-none text-[10px] mt-0.5">
                        [{new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={`break-words ${
                          isErr ? "text-red-400 font-medium" : 
                          isSucc ? "text-emerald-300 font-medium" : 
                          isRun ? "text-cyan-200" : 
                          "text-zinc-300"
                        }`}>
                          {log.message}
                        </span>
                        {log.details?.endpoint && (
                          <div className="mt-1 p-2 rounded-lg bg-black/60 border border-white/10 text-cyan-300 text-[10px] flex items-center justify-between">
                            <span className="truncate">Endpoint: {log.details.endpoint}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              {/* Blinking cursor while running */}
              {!isDone && (
                <div className="flex items-center gap-1.5 text-cyan-400 pt-1">
                  <span className="inline-block w-2 h-3.5 bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  <span className="text-[10px] text-zinc-600 select-none">streaming stdout</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-[#0d0e12] border-t border-white/5 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          {logs.length} telemetry {logs.length === 1 ? "event" : "events"} recorded
        </span>
        {workflowUrl ? (
          <a
            href={workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium hover:underline"
          >
            <span>GitHub Action Run</span>
            <ExternalLink size={11} />
          </a>
        ) : (
          <span className="text-zinc-600 text-[10px]">
            Syncing live state lock
          </span>
        )}
      </div>
    </motion.div>
  );
}
