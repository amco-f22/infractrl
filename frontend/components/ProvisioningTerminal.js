"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

// ── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { id: "workflow_start",  label: "Workflow Start",  icon: "🚀" },
  { id: "checkout",        label: "Code Checkout",   icon: "📥" },
  { id: "aws_auth",        label: "AWS Auth",        icon: "🔐" },
  { id: "terraform_setup", label: "Terraform CLI",   icon: "⚙️"  },
  { id: "terraform_init",  label: "State Init",      icon: "📦" },
  { id: "terraform_plan",  label: "Plan",            icon: "📋" },
  { id: "terraform_apply", label: "Apply",           icon: "🏗️"  },
  { id: "complete",        label: "Complete",        icon: "🎉" },
];

const STATUS_COLORS = {
  running: "text-blue-400 border-blue-700 bg-blue-950/40",
  success: "text-green-400 border-green-700 bg-green-950/30",
  failed:  "text-red-400  border-red-700  bg-red-950/30",
  pending: "text-zinc-500 border-zinc-800 bg-zinc-900/40",
};

const LOG_COLORS = {
  running: "text-blue-300",
  success: "text-emerald-400",
  failed:  "text-red-400",
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ProvisioningTerminal({ requestId, onComplete }) {
  const { data: session } = useSession();
  const [logs, setLogs] = useState([]);
  const [requestStatus, setRequestStatus] = useState("provisioning");
  const [workflowUrl, setWorkflowUrl] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState(null);
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
      <div className="rounded-lg bg-red-950/30 border border-red-800 p-4 text-sm text-red-400">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-zinc-800 font-mono text-sm">

      {/* ── Title bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-zinc-400 text-xs tracking-widest uppercase">
            provisioning-terminal
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isDone && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              LIVE
            </span>
          )}
          <button
            onClick={() => setIsCollapsed((c) => !c)}
            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            {isCollapsed ? "Expand ↓" : "Collapse ↑"}
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800">
        <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
          <span>
            {isDone
              ? isSuccess ? "✅ Provisioning complete" : "❌ Provisioning failed"
              : "⏳ Provisioning in progress..."}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isSuccess ? "bg-emerald-500" : requestStatus === "failed" ? "bg-red-500" : "bg-blue-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* ── Step grid ── */}
          <div className="grid grid-cols-4 gap-1.5 p-3 bg-zinc-950 border-b border-zinc-800">
            {STEPS.map((step) => {
              const s = stepMap[step.id];
              const stepStatus = s?.status ?? "pending";
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs transition-all duration-300 ${STATUS_COLORS[stepStatus]}`}
                >
                  <span>{step.icon}</span>
                  <span className="truncate">{step.label}</span>
                  {stepStatus === "success" && <span className="ml-auto">✓</span>}
                  {stepStatus === "running" && (
                    <span className="ml-auto animate-spin">⟳</span>
                  )}
                  {stepStatus === "failed" && <span className="ml-auto">✗</span>}
                </div>
              );
            })}
          </div>

          {/* ── Log output ── */}
          <div
            ref={terminalRef}
            className="h-52 overflow-y-auto bg-black px-4 py-3 space-y-0.5"
          >
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic">
                Waiting for GitHub Actions to start...
              </span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-5">
                  <span className="text-zinc-600 mr-2 select-none">
                    [{new Date(log.created_at).toLocaleTimeString()}]
                  </span>
                  <span className={LOG_COLORS[log.status] ?? "text-zinc-300"}>
                    {log.message}
                  </span>
                  {log.details?.endpoint && (
                    <div className="ml-20 text-zinc-500 text-xs mt-0.5">
                      → Endpoint: {log.details.endpoint}
                    </div>
                  )}
                </div>
              ))
            )}
            {/* blinking cursor while running */}
            {!isDone && logs.length > 0 && (
              <span className="text-zinc-500 animate-pulse">█</span>
            )}
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <div className="flex justify-between items-center px-4 py-2 bg-zinc-900 border-t border-zinc-800">
        <span className="text-xs text-zinc-500">
          {logs.length} log {logs.length === 1 ? "line" : "lines"}
        </span>
        {workflowUrl ? (
          <a
            href={workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            View in GitHub Actions →
          </a>
        ) : (
          <span className="text-xs text-zinc-600">
            GitHub run link will appear once workflow starts
          </span>
        )}
      </div>
    </div>
  );
}
