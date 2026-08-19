"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  HardDrive,
  Archive,
  RefreshCw,
  TrendingUp,
  Activity,
  Gauge,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  CalendarPlus,
  History,
  Users,
  Search,
  Clock,
  Shield,
  Zap,
  X,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import ProvisioningTerminal from "@/components/ProvisioningTerminal";

const HOURS_PER_MONTH = 730;

const PRICING = {
  postgres: { small: 15, medium: 28, large: 56 },
  redis:    { small: 10, medium: 20, large: 40 },
  s3:       { small: 5,  medium: 15, large: 30 },
};

const SPECS = {
  small:  { cpu: "1 vCPU", ram: "1 GB RAM", storage: "20 GB NVMe" },
  medium: { cpu: "2 vCPU", ram: "4 GB RAM", storage: "50 GB NVMe" },
  large:  { cpu: "4 vCPU", ram: "8 GB RAM", storage: "100 GB NVMe" },
};

const typeMeta = {
  postgres: { label: "PostgreSQL", icon: Database, color: "text-cyan-300", dot: "bg-cyan-400", ring: "border-cyan-400/30 bg-cyan-400/10" },
  PostgreSQL: { label: "PostgreSQL", icon: Database, color: "text-cyan-300", dot: "bg-cyan-400", ring: "border-cyan-400/30 bg-cyan-400/10" },
  redis: { label: "Redis", icon: HardDrive, color: "text-rose-300", dot: "bg-rose-400", ring: "border-rose-400/30 bg-rose-400/10" },
  Redis: { label: "Redis", icon: HardDrive, color: "text-rose-300", dot: "bg-rose-400", ring: "border-rose-400/30 bg-rose-400/10" },
  s3: { label: "S3", icon: Archive, color: "text-amber-300", dot: "bg-amber-400", ring: "border-amber-400/30 bg-amber-400/10" },
  S3: { label: "S3", icon: Archive, color: "text-amber-300", dot: "bg-amber-400", ring: "border-amber-400/30 bg-amber-400/10" },
};

const statusMeta = {
  ready: { label: "Ready", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
  Ready: { label: "Ready", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
  provisioning: { label: "Provisioning", cls: "text-amber-300 border-amber-400/30 bg-amber-400/10", pulse: true },
  Provisioning: { label: "Provisioning", cls: "text-amber-300 border-amber-400/30 bg-amber-400/10", pulse: true },
  pending_approval: { label: "Pending Approval", cls: "text-purple-300 border-purple-400/30 bg-purple-400/10", pulse: true },
  expiring: { label: "Expiring", cls: "text-orange-300 border-orange-400/30 bg-orange-400/10" },
  Expiring: { label: "Expiring", cls: "text-orange-300 border-orange-400/30 bg-orange-400/10" },
  deleted: { label: "Deleted", cls: "text-zinc-500 border-white/10 bg-white/5" },
  Deleted: { label: "Deleted", cls: "text-zinc-500 border-white/10 bg-white/5" },
  failed: { label: "Failed", cls: "text-red-400 border-red-500/30 bg-red-500/10" },
  Failed: { label: "Failed", cls: "text-red-400 border-red-500/30 bg-red-500/10" },
  auto_denied: { label: "Auto-Denied", cls: "text-red-400 border-red-500/30 bg-red-500/10" },
};

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

function getMonthlyCost(r) {
  if (r.monthly_cost) return Number(r.monthly_cost);
  const type = (r.resource_type || "postgres").toLowerCase();
  const size = (r.instance_size || "small").toLowerCase();
  return PRICING[type]?.[size] ?? 15;
}

function liveSpend(res, now) {
  const createdDate = res.created_at || res.created_date || new Date().toISOString();
  const ms = now - new Date(createdDate).getTime();
  if (ms < 0 || ["deleted", "failed"].includes((res.status || "").toLowerCase())) return 0;
  const monthlyCost = getMonthlyCost(res);
  return (monthlyCost / (HOURS_PER_MONTH * 3600 * 1000)) * ms;
}

function isExpiringSoon(req) {
  if (!req.expiry_date || ["deleted", "failed"].includes((req.status || "").toLowerCase())) return false;
  const diff = (new Date(req.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
  return diff <= 2 && diff > 0;
}

function getEffectiveStatus(req) {
  const s = (req.status || "ready").toLowerCase();
  if (isExpiringSoon(req) && s === "ready") return "expiring";
  return s;
}

const fmt = (n, d = 2) => `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Connection string copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={handleCopy}
      className="p-1 rounded text-zinc-500 hover:text-emerald-400 transition-colors"
      title="Copy connection string"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </motion.button>
  );
}

function ConnectionCell({ req, session }) {
  const [revealed, setRevealed] = useState(false);
  const [fullString, setFullString] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/backend";
  const isOwner = session?.user?.email && session.user.email === req.requester_email;

  const handleUpdateIp = async () => {
    setLoading(true);
    const toastId = toast.loading("Updating security group...");
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      const currentIp = ipData.ip;
      
      const res = await fetch(`${API_URL}/api/requests/${req.id}/update-ip`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify({ new_allowed_ip: currentIp }),
      });
      if (res.ok) {
        toast.success(`Network locked to your current IP: ${currentIp}`, { id: toastId });
        if (typeof window !== "undefined") {
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        toast.error("Failed to update IP", { id: toastId });
      }
    } catch (e) {
      toast.error("Network error", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/requests/${req.id}/connection-string`, {
          headers: { 'x-user-email': session?.user?.email || '' }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setFullString(data.connection_string);
        setRevealed(true);
        toast.info("Connection string credentials revealed");
      } else {
        toast.error("Access denied: You can only reveal your own connection strings");
      }
    } catch {
      toast.error("Failed to retrieve connection string");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    const toastId = toast.loading("Approving request...");
    try {
      const res = await fetch(`${API_URL}/api/requests/${req.id}/approve`, { 
        method: "POST",
        headers: { 'x-user-email': session?.user?.email || '' }
      });
      if (res.ok) {
        toast.success("Request approved and provisioning started!", { id: toastId });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await res.json();
        toast.error(`Approval failed: ${data.detail}`, { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    const toastId = toast.loading("Denying request...");
    try {
      const res = await fetch(`${API_URL}/api/requests/${req.id}/deny`, { 
        method: "POST",
        headers: { 'x-user-email': session?.user?.email || '' }
      });
      if (res.ok) {
        toast.success("Request denied.", { id: toastId });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await res.json();
        toast.error(`Denial failed: ${data.detail}`, { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!req.connection_string) {
    const s = (req.status || "").toLowerCase();
    if (s === "failed") return <span className="text-xs text-red-400/80 font-mono">Failed</span>;
    if (s === "deleted") return <span className="text-xs text-zinc-600 font-mono">Destroyed</span>;
    if (s === "auto_denied") return <span className="text-xs text-red-400/80 font-mono">Auto-Denied</span>;
    
    if (s === "pending_approval") {
      return (
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-semibold disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={handleDeny}
                disabled={loading}
                className="px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-semibold disabled:opacity-50"
              >
                Deny
              </button>
            </>
          )}
        </div>
      );
    }
    
    return <span className="text-xs text-zinc-500 font-mono animate-pulse">Provisioning...</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1 font-mono text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-cyan-200 truncate max-w-[140px] md:max-w-[190px]">
          {revealed && fullString ? fullString : req.connection_string}
        </span>
        {revealed && fullString && <CopyButton text={fullString} />}
        {isOwner && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleReveal}
            disabled={loading}
            className={`p-1 rounded transition-colors ${
              revealed ? "text-amber-400 hover:text-amber-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title={revealed ? "Hide credentials" : "Owner Reveal: Show plain credentials"}
          >
            {loading ? (
              <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
            ) : revealed ? (
              <EyeOff size={13} />
            ) : (
              <Eye size={13} />
            )}
          </motion.button>
        )}
      </div>
      {req.allowed_ip && (
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Shield size={10} />
          <span>Locked to {req.allowed_ip}</span>
          {isOwner && (
            <button 
              onClick={handleUpdateIp}
              disabled={loading}
              className="ml-1 text-cyan-400/70 hover:text-cyan-300 underline underline-offset-2 disabled:opacity-50"
              title="Update security group to your current IP"
            >
              Update IP
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [extendingId, setExtendingId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tab, setTab] = useState("resources");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnv, setSelectedEnv] = useState("all");
  const [now, setNow] = useState(() => Date.now());
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Quick provision state
  const [provForm, setProvForm] = useState({ resource_type: "postgres", environment: "dev", instance_size: "small", allowed_ip: "" });
  const [provLoading, setProvLoading] = useState(false);
  const [provStep, setProvStep] = useState("form"); // "form" or "terminal"
  const [terminalLogs, setTerminalLogs] = useState([]);
  // Track the most recently provisioned request IDs to show the live terminal
  const [activeTerminalIds, setActiveTerminalIds] = useState(new Set());
  
  const [policyPreview, setPolicyPreview] = useState(null);
  
  useEffect(() => {
    if (session?.user?.email) {
      const fetchPreview = async () => {
        try {
          setPolicyPreview(null); // Reset to show loading state on change
          const API_URL = "/api/backend";
          const cost = PRICING[provForm.resource_type]?.[provForm.instance_size] || 0;
          const res = await fetch(`${API_URL}/api/policies/preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              environment: provForm.environment,
              instance_size: provForm.instance_size,
              resource_type: provForm.resource_type,
              estimated_cost: cost,
              requester_email: session.user.email
            })
          });
          if (res.ok) {
            setPolicyPreview(await res.json());
          } else {
            setPolicyPreview({ decision: "auto_approved", reason: "Fallback (Engine error)" });
          }
        } catch (e) {
          console.error("Preview failed", e);
          setPolicyPreview({ decision: "auto_approved", reason: "Fallback (Engine unreachable)" });
        }
      };
      fetchPreview();
    }
  }, [provForm, session?.user?.email]);
  
  const addLog = (msg) => {
    setTerminalLogs((prev) => [...prev, { time: new Date().toISOString(), text: msg }]);
  };

  const detectIp = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      setProvForm((p) => ({ ...p, allowed_ip: data.ip }));
      toast.success("IP automatically detected!");
    } catch {
      toast.error("Failed to detect IP. Please enter manually.");
    }
  };

  const API_URL = "/api/backend";

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchRequests = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/api/requests`);
      const data = await res.json();
      setRequests(data.requests || []);
      if (isRefresh) toast.success("Fleet state refreshed");
    } catch {
      // Backend not reachable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/audit-logs?limit=40`);
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch {
      // Ignore
    }
  };

  const handleExtend = async (requestId) => {
    setExtendingId(requestId);
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/extend`, { method: "POST" });
      if (res.ok) {
        toast.success("Lifecycle extended by +7 days!");
        await fetchRequests();
      } else {
        toast.error("Failed to extend lifespan");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setExtendingId(null);
    }
  };

  const handleQuickProvision = async (e) => {
    e.preventDefault();
    if (!session) {
      signIn("github");
      return;
    }
    
    // Use the live policy engine evaluation from the backend (preview endpoint)
    const expectedStatus = policyPreview?.decision || "auto_approved";
    const policyReason = policyPreview?.reason || "No strict policy matched";

    setProvStep("terminal");
    setTerminalLogs([]);
    setProvLoading(true);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    addLog(`[SYSTEM] Initiating Provisioning Request by ${session.user.email}...`);
    await sleep(600);
    
    if (expectedStatus === "auto_denied") {
      addLog(`[POLICY] Evaluating budget constraints for ${provForm.environment} (${provForm.instance_size})...`);
      await sleep(800);
      addLog(`[POLICY] ❌ REJECTED: ${policyReason}`);
      await sleep(400);
      addLog(`[SYSTEM] Aborting workflow.`);
      setProvLoading(false);
      return;
    }

    if (expectedStatus === "pending_approval") {
      addLog(`[POLICY] Evaluating budget constraints for ${provForm.environment} (${provForm.instance_size})...`);
      await sleep(800);
      addLog(`[POLICY] ⚠️ FLAG: ${policyReason}`);
      await sleep(600);
      addLog(`[SYSTEM] Routing request to DevOps team for manual review.`);
      await sleep(1000);
      addLog(`[SYSTEM] Workflow paused. Awaiting manual approval...`);
      setProvLoading(false);
      
      // Fire the API call silently to store it
      const payload = {
        ...provForm,
        requester_name: session.user.name || "Developer",
        requester_email: session.user.email,
        allowed_ip: provForm.allowed_ip || "0.0.0.0",
      };
      fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(payload),
      }).then(() => fetchRequests());
      return;
    }

    // Auto-approve flow
    addLog(`[POLICY] Evaluating budget constraints for ${provForm.environment} (${provForm.instance_size})...`);
    await sleep(800);
    addLog(`[POLICY] ✅ APPROVED: Request fits within auto-approval boundaries.`);
    await sleep(700);
    addLog(`[SYSTEM] Dispatching workflow...`);

    const payload = {
      ...provForm,
      requester_name: session.user.name || "Developer",
      requester_email: session.user.email,
      allowed_ip: provForm.allowed_ip || "0.0.0.0",
    };

    try {
      const res = await fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": session?.user?.email || ""
        },
        body: JSON.stringify(payload),
      });
      const apiData = await res.json();
      
      if (res.ok) {
        if (apiData?.id) {
          // Store the generated request ID to pass to ProvisioningTerminal
          setProvForm(p => ({ ...p, _requestId: apiData.id }));
          setActiveTerminalIds((prev) => new Set([...prev, apiData.id]));
        }
        setProvStep("terminal"); // Switch modal to show ProvisioningTerminal
        fetchRequests();
      } else {
        toast.error(`Backend failed: ${apiData.detail || "Unknown error"}`);
      }
    } catch (e) {
      toast.error("Network error connecting to backend");
    } finally {
      setProvLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const interval = setInterval(() => fetchRequests(), 30000);
    return () => clearInterval(interval);
  }, []);

  const active = requests.filter((r) => !["deleted", "failed"].includes((r.status || "").toLowerCase()));
  const monthlyTotal = active.reduce((s, r) => s + getMonthlyCost(r), 0);
  const liveTotal = active.reduce((s, r) => s + liveSpend(r, now), 0);
  const expiringCount = active.filter((r) => isExpiringSoon(r)).length;

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const s = (r.environment || "").toLowerCase();
      const matchEnv = selectedEnv === "all" || s === selectedEnv;
      const query = searchQuery.toLowerCase();
      const name = (r.name || `${r.environment}-${r.resource_type}-${(r.id || '').substring(0, 4)}`).toLowerCase();
      const email = (r.requester_email || "").toLowerCase();
      const type = (r.resource_type || "").toLowerCase();
      const matchSearch = !query || name.includes(query) || email.includes(query) || type.includes(query);
      return matchEnv && matchSearch;
    });
  }, [requests, selectedEnv, searchQuery]);

  // If loading auth
  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="text-xs text-zinc-500 font-mono">Syncing fleet telemetry…</p>
        </div>
      </div>
    );
  }

  // Auth gate check
  if (!session) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center px-6 py-20">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-cyan-500/10 blur-[140px]" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={springTransition}
          className="relative max-w-md w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl shadow-2xl"
        >
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-black font-bold mx-auto mb-5 shadow-lg shadow-emerald-500/20">
            <Shield size={22} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Sign in with your GitHub account to access your live infrastructure console and connection strings.
          </p>

          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="mt-6 w-full flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors shadow-lg"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>Sign in with GitHub</span>
          </button>

          <Link href="/" className="inline-block mt-5 text-xs text-zinc-500 hover:text-zinc-300 font-mono">
            ← Back to Homepage
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white pt-24 pb-20 px-6 antialiased overflow-x-hidden selection:bg-cyan-400/30">
      {/* Background Grid & Ambient Glows matching logo */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[350px] rounded-full bg-gradient-to-r from-green-500/[0.08] via-emerald-500/[0.08] to-cyan-500/[0.08] blur-[150px]" />

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Console Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/90 font-mono">
                Fleet Console
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-400/30 bg-green-400/10 px-2.5 py-0.5 text-[10px] text-green-300 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
              Infrastructure Dashboard
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Active cloud databases, caching layers, and real-time live spend meters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
              onClick={() => fetchRequests(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
              title="Refresh Fleet Telemetry"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin text-cyan-300" : ""} />
            </motion.button>

            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-medium text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
            >
              <Users size={14} />
              <span>Clone Stack</span>
            </Link>

            <Link
              href="/admin/policies"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs font-medium text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition-colors"
            >
              <Shield size={14} />
              <span>Policy Admin</span>
            </Link>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={springTransition}
              onClick={() => setShowProvisionModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-lg"
            >
              <Plus size={15} />
              <span>Provision Resource</span>
            </motion.button>
          </div>
        </div>

        {/* 3 Bento Metric Cards (Matching Logo Color Theme) */}
        <div className="grid sm:grid-cols-3 gap-4">
          
          {/* Card 1: Monthly Cost */}
          <SpotlightCard spotlightColor="rgba(74, 222, 128, 0.2)" className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-green-400 via-emerald-400 to-cyan-400 text-black font-bold shadow-md shadow-green-500/20">
                <Gauge className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Run Rate</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tabular-nums text-white font-mono">{fmt(monthlyTotal)}</div>
            <div className="mt-1 text-xs text-zinc-500 font-mono">Estimated monthly cost</div>
          </SpotlightCard>

          {/* Card 2: Active Resources */}
          <SpotlightCard spotlightColor="rgba(34, 211, 238, 0.2)" className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 text-black font-bold shadow-md shadow-cyan-500/20">
                <Activity className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono text-green-300">{active.length} active / {requests.length} total</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tabular-nums text-white font-mono">{active.length}</div>
            <div className="mt-1 text-xs text-zinc-500 font-mono">
              {expiringCount > 0 ? (
                <span className="text-amber-300">⚠️ {expiringCount} instance(s) expiring &lt; 48h</span>
              ) : (
                "Active ephemeral fleet"
              )}
            </div>
          </SpotlightCard>

          {/* Card 3: Live Spend Ticker */}
          <SpotlightCard spotlightColor="rgba(52, 211, 153, 0.2)" className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-green-400 to-teal-400 text-black font-bold shadow-md shadow-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </span>
              <span className="text-[10px] text-green-400 font-mono">● live</span>
            </div>
            <div className="mt-4 text-3xl font-semibold tabular-nums text-cyan-200 font-mono">{fmt(liveTotal, 4)}</div>
            <div className="mt-1 text-xs text-zinc-500 font-mono">Live spend so far</div>
          </SpotlightCard>
        </div>

        {/* Tab & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.02] border border-white/10 w-fit relative">
            {[
              { id: "resources", label: `Resources (${requests.length})` },
              { id: "audit", label: `Audit Trail (${auditLogs.length})` },
            ].map((t) => {
              const isSelected = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    if (t.id === "audit") fetchAuditLogs();
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors relative z-10 ${
                    isSelected ? "text-white font-semibold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="dashboardMainTabPill"
                      className="absolute inset-0 bg-white/10 rounded-lg shadow-sm border border-white/10 -z-10"
                      transition={springTransition}
                    />
                  )}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {tab === "resources" && (
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl pl-8 pr-3 py-1.5 text-xs bg-white/[0.03] border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50 w-44 md:w-56 font-mono transition-colors"
                />
              </div>

              {/* Environment Filters */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/10 text-xs relative">
                {["all", "dev", "staging", "prod"].map((env) => {
                  const isSelected = selectedEnv === env;
                  return (
                    <button
                      key={env}
                      onClick={() => setSelectedEnv(env)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase transition-colors relative z-10 ${
                        isSelected ? "text-cyan-200 font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="dashboardEnvFilterPill"
                          className="absolute inset-0 bg-cyan-400/20 border border-cyan-400/30 rounded -z-10"
                          transition={springTransition}
                        />
                      )}
                      <span>{env}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Resources Table Container (Matching Base 44 exact styling) */}
        {tab === "resources" ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
              <div className="col-span-4">Resource</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Monthly</div>
              <div className="col-span-1 text-right">Live Spend</div>
              <div className="col-span-2 text-right">Secrets / Lifecycle</div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <Database className="w-8 h-8 text-zinc-600" />
                <p className="text-sm text-zinc-400">
                  {searchQuery || selectedEnv !== "all"
                    ? "No matching resources found for this filter."
                    : "No active resources yet. Provision one to see it here."}
                </p>
                <button
                  onClick={() => setShowProvisionModal(true)}
                  className="mt-2 text-xs text-cyan-300 hover:underline font-mono"
                >
                  + Provision your first database
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredRequests.map((r) => {
                  const type = (r.resource_type || "postgres").toLowerCase();
                  const t = typeMeta[type] || typeMeta.postgres;
                  const TypeIcon = t.icon || Database;
                  const effStatus = getEffectiveStatus(r);
                  const s = statusMeta[effStatus] || statusMeta.ready;
                  const name = r.name || `${r.environment || 'dev'}-${r.resource_type || 'db'}-${(r.id || '').substring(0, 4)}`;
                  const isOwner = session?.user?.email && session.user.email === r.requester_email;
                  const canExtend = !["deleted", "failed"].includes((r.status || "").toLowerCase()) && isOwner;

                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Resource Column */}
                      <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${t.ring} ${t.color}`}>
                          <TypeIcon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white font-mono truncate">{name}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {r.instance_size || "small"} · {r.environment || "dev"} · {r.requester_email}
                          </div>
                        </div>
                      </div>

                      {/* Type Column */}
                      <div className="sm:col-span-2 flex items-center gap-2 text-sm text-zinc-300 font-mono">
                        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                        <span>{t.label}</span>
                      </div>

                      {/* Status Column */}
                      <div className="sm:col-span-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${s.cls}`}>
                          {s.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                          {s.label}
                        </span>
                      </div>

                      {/* Monthly Cost */}
                      <div className="sm:col-span-1 sm:text-right text-sm font-medium text-emerald-300 font-mono">
                        {fmt(getMonthlyCost(r))}
                      </div>

                      {/* Live Spend */}
                      <div className="sm:col-span-1 sm:text-right font-mono text-[13px] text-cyan-200 tabular-nums">
                        {fmt(liveSpend(r, now), 4)}
                      </div>

                      {/* Connection String & Actions */}
                      <div className="sm:col-span-2 flex items-center justify-end gap-2">
                        <ConnectionCell req={r} session={session} />
                        {canExtend && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={springTransition}
                            onClick={() => handleExtend(r.id)}
                            disabled={extendingId === r.id}
                            className="px-2 py-1 rounded-lg text-xs font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
                            title="Extend lifecycle by 7 days"
                          >
                            {extendingId === r.id ? <Clock size={11} className="animate-spin" /> : <CalendarPlus size={11} />}
                            <span>+7d</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Live Provisioning Terminals — shown below each provisioning row */}
                {filteredRequests
                  .filter(r => (r.status || "").toLowerCase() === "provisioning" && activeTerminalIds.has(r.id))
                  .map(r => (
                    <div key={`terminal-${r.id}`} className="px-5 pb-5">
                      <ProvisioningTerminal
                        requestId={r.id}
                        onComplete={(finalStatus) => {
                          // Remove from active set once done, refresh data
                          setActiveTerminalIds(prev => {
                            const next = new Set(prev);
                            next.delete(r.id);
                            return next;
                          });
                          fetchRequests();
                        }}
                      />
                    </div>
                  ))}
              </div>
            )}

            <div className="p-3.5 px-5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500 bg-white/[0.01]">
              <span>Showing {filteredRequests.length} of {requests.length} resources</span>
              <span>30s polling cycle active</span>
            </div>
          </div>
        ) : (
          /* Audit Feed */
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-cyan-300" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
                  Audit Activity Trail
                </h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Zero-Trust Compliance Feed</span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No compliance audit entries recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-xs"
                  >
                    <span className="text-sm">📌</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 font-medium">{log.details}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-zinc-500">
                        <span>{log.actor}</span>
                        <span>•</span>
                        <span>{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</span>
                      </div>
                    </div>
                    {log.request_id && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                        {log.request_id.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Provision Modal Drawer */}
      <AnimatePresence>
        {showProvisionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-2xl w-full rounded-3xl border border-white/10 bg-[#0a0a0c] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-white/5"
            >
              {/* Header (Sticky) */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 shrink-0 bg-[#0a0a0c]/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 text-cyan-300 border border-cyan-400/20 shadow-inner">
                    <Database className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">Provision Resource</h3>
                    <p className="text-xs text-zinc-500">Automated Terraform deployment pipeline</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowProvisionModal(false);
                    setTimeout(() => setProvStep("form"), 300);
                  }}
                  className="p-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {provStep === "form" ? (
                /* Form Body (Scrollable) */
                <form onSubmit={handleQuickProvision} className="flex flex-col overflow-hidden h-full">
                <div className="overflow-y-auto px-6 py-6 space-y-8 flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  
                  {/* 1. Engine Selection Boxes */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 block mb-3">
                      Resource Engine
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "postgres", label: "PostgreSQL 16", icon: Database, cost: "$15/mo", disabled: false },
                        { id: "redis", label: "Redis Cluster", icon: HardDrive, cost: "$10/mo", disabled: true },
                        { id: "s3", label: "S3 Bucket", icon: Archive, cost: "$5/mo", disabled: true },
                      ].map((eng) => {
                        const isSel = provForm.resource_type === eng.id;
                        const disabled = eng.disabled;
                        const Ic = eng.icon;
                        return (
                          <motion.button
                            key={eng.id}
                            type="button"
                            disabled={disabled}
                            whileHover={disabled ? {} : { y: -2 }}
                            whileTap={disabled ? {} : { scale: 0.98 }}
                            transition={springTransition}
                            onClick={() => { if (!disabled) setProvForm((p) => ({ ...p, resource_type: eng.id })) }}
                            className={`p-4 rounded-2xl border text-left transition-all duration-300 relative ${
                              disabled
                                ? "border-white/5 bg-white/[0.01] text-zinc-600 cursor-not-allowed opacity-50"
                                : isSel
                                ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/[0.04]"
                            }`}
                          >
                            {isSel && !disabled && (
                              <motion.div
                                layoutId="modalActiveEngineRing"
                                className="absolute inset-0 rounded-2xl border border-cyan-400/50 pointer-events-none"
                                transition={springTransition}
                              />
                            )}
                            <div className="flex justify-between items-start mb-3">
                              <Ic size={18} className={disabled ? "text-zinc-600" : isSel ? "text-cyan-400" : "text-zinc-500"} />
                              {disabled && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                  Soon
                                </span>
                              )}
                            </div>
                            <p className={`text-sm font-medium ${disabled ? "text-zinc-600" : isSel ? "text-white" : "text-zinc-300"}`}>{eng.label}</p>
                            <p className={`text-xs mt-0.5 ${disabled ? "text-zinc-700" : "text-zinc-500"}`}>{eng.cost}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Environment Boxes */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 block mb-3">
                      Target Environment
                    </label>
                    <div className="flex p-1 rounded-xl bg-white/[0.02] border border-white/5 relative w-full sm:w-fit">
                      {["dev", "staging", "prod"].map((env) => {
                        const isSel = provForm.environment === env;
                        return (
                          <button
                            key={env}
                            type="button"
                            onClick={() => setProvForm((p) => ({ ...p, environment: env }))}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors relative z-10 ${
                              isSel ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {isSel && (
                              <motion.div
                                layoutId="modalActiveEnvPill"
                                className="absolute inset-0 bg-white/10 rounded-lg shadow-sm border border-white/10 -z-10"
                                transition={springTransition}
                              />
                            )}
                            <span>{env}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Compute Allocation Boxes */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 block mb-3">
                      Compute Profile
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {["small", "medium", "large"].map((sz) => {
                        const isSel = provForm.instance_size === sz;
                        return (
                          <motion.button
                            key={sz}
                            type="button"
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            transition={springTransition}
                            onClick={() => setProvForm((p) => ({ ...p, instance_size: sz }))}
                            className={`p-3.5 rounded-2xl border text-center transition-all duration-300 relative ${
                              isSel
                                ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/[0.04]"
                            }`}
                          >
                            {isSel && (
                              <motion.div
                                layoutId="modalActiveSizeRing"
                                className="absolute inset-0 rounded-2xl border border-emerald-400/50 pointer-events-none"
                                transition={springTransition}
                              />
                            )}
                            <p className={`text-sm font-medium capitalize ${isSel ? "text-emerald-300" : "text-zinc-300"}`}>{sz}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{SPECS[sz].cpu} • {SPECS[sz].ram}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Security / Network Access Box */}
                  {provForm.resource_type === "postgres" && (
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 block mb-3">
                        Network Access (Zero Trust)
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={provForm.allowed_ip}
                          onChange={(e) => setProvForm({ ...provForm, allowed_ip: e.target.value })}
                          placeholder="Your Public IP (e.g., 203.0.113.5)"
                          className="flex-1 rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={detectIp}
                          className="px-5 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all shadow-sm whitespace-nowrap"
                        >
                          Detect IP
                        </button>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-500">
                        <Shield size={12} className="text-zinc-400" />
                        <span>Database will be firewalled to this specific IP address.</span>
                      </div>
                    </div>
                  )}

                  {/* Policy Preview (Minimalistic Strip) */}
                  {policyPreview ? (() => {
                    const pStatus = policyPreview.decision;
                    const pMsg = policyPreview.reason;
                    const matchedPolicies = policyPreview.matched_policies?.map(p => p.policy_name).join(', ');
                    
                    return (
                      <div className={`p-4 rounded-2xl border flex gap-3.5 items-start transition-all duration-300 ${
                        pStatus === "auto_approved" ? "border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-400" :
                        pStatus === "pending_approval" ? "border-amber-500/20 bg-amber-500/[0.03] text-amber-400" :
                        "border-red-500/20 bg-red-500/[0.03] text-red-400"
                      }`}>
                        <div className="mt-0.5">
                          {pStatus === "auto_approved" ? <Zap size={18} /> :
                           pStatus === "pending_approval" ? <Clock size={18} /> :
                           <AlertCircle size={18} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium tracking-tight mb-1">
                            {pStatus === "auto_approved" ? "Auto-Approve Eligible" : 
                             pStatus === "pending_approval" ? "Manual Approval Required" : 
                             "Request Denied by Policy"}
                          </h4>
                          <p className={`text-xs leading-relaxed ${
                            pStatus === "auto_approved" ? "text-emerald-400/70" :
                            pStatus === "pending_approval" ? "text-amber-400/70" :
                            "text-red-400/70"
                          }`}>
                            {pMsg}
                          </p>
                          {matchedPolicies && (
                            <p className="text-[10px] uppercase tracking-wider font-mono opacity-50 mt-2">
                              Matched: {matchedPolicies}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="p-4 rounded-2xl border border-white/5 flex gap-3.5 items-center">
                       <div className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
                       <span className="text-xs text-zinc-500">Evaluating policies...</span>
                    </div>
                  )}

                </div>

                {/* Footer (Sticky) */}
                <div className="p-6 pt-5 border-t border-white/5 bg-[#0a0a0c] shrink-0 z-10 flex flex-col gap-4">
                  {/* Dynamic Spec & Cost Breakdown Strip */}
                  <div className="flex items-center justify-between px-2">
                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                      <HardDrive size={13} />
                      <span>{SPECS[provForm.instance_size].storage}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 text-white">
                      <span className="text-xs text-zinc-500">Estimated Cost:</span>
                      <div className="font-mono text-sm font-semibold text-emerald-400 overflow-hidden">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={`${provForm.resource_type}-${provForm.instance_size}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={springTransition}
                            className="inline-block"
                          >
                            ${PRICING[provForm.resource_type][provForm.instance_size]}/mo
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={provLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={springTransition}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black py-3.5 text-sm font-semibold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    {provLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                        <span>Dispatching Workflow...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Trigger Provisioning</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
              ) : (
                /* Terminal Body */
                <div className="flex flex-col h-full bg-[#0a0a0c] rounded-b-3xl">
                  {provForm._requestId ? (
                    <div className="p-4 flex-1">
                      <ProvisioningTerminal 
                        requestId={provForm._requestId} 
                        onComplete={() => {
                          fetchRequests(true);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="overflow-y-auto px-6 py-6 space-y-3 flex-1 scrollbar-thin font-mono text-[11px]">
                      {terminalLogs.map((log, i) => {
                        const isError = log.text.includes("[ERROR]") || log.text.includes("❌");
                        const isSuccess = log.text.includes("✅") || log.text.includes("successfully") || log.text.includes("OK");
                        const isWarning = log.text.includes("⚠️") || log.text.includes("paused");
                        
                        return (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex gap-3 ${
                              isError ? "text-red-400" :
                              isSuccess ? "text-emerald-400" :
                              isWarning ? "text-amber-400" :
                              "text-zinc-300"
                            }`}
                          >
                            <span className="text-zinc-600 shrink-0">
                              {new Date(log.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                            </span>
                            <span>{log.text}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {!provLoading && (
                    <div className="p-6 border-t border-white/5 bg-[#0a0a0c] shrink-0 z-10 rounded-b-3xl">
                      <button
                        onClick={() => {
                          setShowProvisionModal(false);
                          setTimeout(() => {
                            setProvStep("form");
                            setProvForm(p => ({ ...p, _requestId: null }));
                          }, 300);
                        }}
                        className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors shadow-lg"
                      >
                        Close & View Dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
