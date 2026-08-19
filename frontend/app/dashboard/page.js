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
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/5 active:scale-95 transition-all duration-150"
      title="Copy connection string"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function ResourceDetailsModal({ req, session, onClose, onRefresh }) {
  const [revealed, setRevealed] = useState(false);
  const [fullString, setFullString] = useState(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [loadingIp, setLoadingIp] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingDeny, setLoadingDeny] = useState(false);
  const [loadingExtend, setLoadingExtend] = useState(false);
  const [modalNow, setModalNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setModalNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!req) return null;

  const API_URL = "/api/backend";
  const effEmail = session?.user?.email || (session?.user?.id ? `id-${session.user.id}@github.local` : "unknown@example.com");
  const isOwner = effEmail && effEmail === req.requester_email;
  const type = (req.resource_type || "postgres").toLowerCase();
  const t = typeMeta[type] || typeMeta.postgres;
  const TypeIcon = t.icon || Database;
  const effStatus = getEffectiveStatus(req);
  const s = statusMeta[effStatus] || statusMeta.ready;
  const name = req.name || `${req.environment || 'dev'}-${req.resource_type || 'db'}-${(req.id || '').substring(0, 4)}`;
  const canExtend = !["deleted", "failed"].includes((req.status || "").toLowerCase()) && isOwner;
  const spec = SPECS[req.instance_size || "small"] || SPECS.small;

  const handleUpdateIp = async () => {
    setLoadingIp(true);
    const toastId = toast.loading("Detecting current IP and updating security group...");
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      const currentIp = ipData.ip;
      
      const res = await fetch(`${API_URL}/api/requests/${req.id}/update-ip`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": effEmail
        },
        body: JSON.stringify({ new_allowed_ip: currentIp }),
      });
      if (res.ok) {
        toast.success(`Network locked to IP: ${currentIp}`, { id: toastId });
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(`Failed to update firewall IP: ${data.detail || "Unknown error"}`, { id: toastId });
      }
    } catch (e) {
      toast.error("Network error updating IP", { id: toastId });
    } finally {
      setLoadingIp(false);
    }
  };

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setLoadingReveal(true);
    try {
      const res = await fetch(
        `${API_URL}/api/requests/${req.id}/connection-string`, {
          headers: { 'x-user-email': effEmail }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setFullString(data.connection_string);
        setRevealed(true);
        toast.info("Connection credentials revealed");
      } else {
        toast.error("Access denied: Only the owner can reveal plaintext credentials");
      }
    } catch {
      toast.error("Failed to retrieve connection string");
    } finally {
      setLoadingReveal(false);
    }
  };

  const handleExtend = async () => {
    setLoadingExtend(true);
    try {
      const res = await fetch(`${API_URL}/api/requests/${req.id}/extend`, { method: "POST" });
      if (res.ok) {
        toast.success("Lifecycle extended by +7 days!");
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(`Failed to extend lifespan: ${data.detail || "Unknown error"}`);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingExtend(false);
    }
  };

  const [loadingDestroy, setLoadingDestroy] = useState(false);
  const handleDestroy = async () => {
    if (!window.confirm("Are you sure you want to permanently destroy this resource? This cannot be undone.")) return;
    
    setLoadingDestroy(true);
    const toastId = toast.loading("Initiating destroy sequence...");
    try {
      const res = await fetch(`${API_URL}/api/requests/${req.id}`, { 
        method: "DELETE",
        headers: { 'x-user-email': effEmail }
      });
      if (res.ok) {
        toast.success("Resource destruction initiated! It may take a few minutes.", { id: toastId });
        onRefresh();
        onClose();
      } else {
        const data = await res.json();
        toast.error(`Destroy failed: ${data.detail || "Unknown error"}`, { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    } finally {
      setLoadingDestroy(false);
    }
  };

  const handleApprove = async () => {
    setLoadingApprove(true);
    const toastId = toast.loading("Approving request...");
    try {
      const res = await fetch(`${API_URL}/api/requests/${req.id}/approve`, { 
        method: "POST",
        headers: { 'x-user-email': session?.user?.email || '' }
      });
      if (res.ok) {
        toast.success("Request approved! Terraform provisioning initiated.", { id: toastId });
        onRefresh();
        onClose();
      } else {
        const data = await res.json();
        toast.error(`Approval failed: ${data.detail}`, { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    } finally {
      setLoadingApprove(false);
    }
  };

  const handleDeny = async () => {
    setLoadingDeny(true);
    const toastId = toast.loading("Denying request...");
    try {
      const res = await fetch(`${API_URL}/api/requests/${req.id}/deny`, { 
        method: "POST",
        headers: { 'x-user-email': session?.user?.email || '' }
      });
      if (res.ok) {
        toast.success("Request denied.", { id: toastId });
        onRefresh();
        onClose();
      } else {
        const data = await res.json();
        toast.error(`Denial failed: ${data.detail}`, { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    } finally {
      setLoadingDeny(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 480, damping: 32, mass: 0.65 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-2xl w-full rounded-3xl border border-white/10 bg-[#08080a] shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-white/10"
      >
        {/* Ambient Top Glow Highlight Line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none z-20" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 shrink-0 bg-[#0c0d11]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${t.ring} ${t.color} shadow-[0_0_20px_rgba(34,211,238,0.1)]`}>
              <TypeIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-white font-mono truncate">{name}</h3>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono ${s.cls}`}>
                  {s.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                  {s.label}
                </span>
                <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-semibold">
                  {req.environment || "dev"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono truncate mt-1 flex items-center gap-2">
                <span className="text-zinc-500">ID:</span>
                <span className="text-zinc-400 select-all">{req.id}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">Owner:</span>
                <span className="text-zinc-400">{req.requester_email}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all hover:scale-105"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-6 py-6 space-y-6 flex-1 scrollbar-thin scrollbar-thumb-white/10">
          {/* Top 3 Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Monthly Run Rate</span>
              <div className="mt-2 text-xl font-bold font-mono text-emerald-300">
                {fmt(getMonthlyCost(req))} <span className="text-xs text-zinc-500 font-normal">/mo</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-1 capitalize">{req.instance_size || "small"} tier spec</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Live Accrued Spend</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-cyan-200 tabular-nums">
                {fmt(liveSpend(req, modalNow), 4)}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">Real-time meter</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Lifecycle Expiry</span>
              <div className="mt-2 text-xs font-semibold font-mono text-amber-300 truncate">
                {req.expiry_date ? `${req.expiry_date}` : "7 Days Default"}
              </div>
              {canExtend ? (
                <button
                  onClick={handleExtend}
                  disabled={loadingExtend}
                  className="mt-2 w-full py-1.5 px-2 rounded-xl text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loadingExtend ? <Clock size={11} className="animate-spin" /> : <CalendarPlus size={11} />}
                  <span>+7d Extend</span>
                </button>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono mt-1">Auto-destroys on expiry</span>
              )}
            </div>
          </div>

          {/* Connection Credentials Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-cyan-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold">
                  Connection URI & Credentials
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {req.connection_string ? "Encrypted TLS 1.3" : "Pending Provision"}
              </span>
            </div>

            {req.connection_string ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 p-3.5 bg-black/70 border border-white/10 rounded-xl font-mono text-xs text-cyan-200 shadow-inner">
                  <span className="select-all break-all text-xs font-mono">
                    {revealed && fullString ? fullString : req.connection_string}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <CopyButton text={revealed && fullString ? fullString : req.connection_string} />
                    {isOwner && (
                      <button
                        onClick={handleReveal}
                        disabled={loadingReveal}
                        className={`p-1.5 rounded-lg border text-xs transition-all ${
                          revealed 
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" 
                            : "border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                        }`}
                        title={revealed ? "Mask credentials" : "Show plain credentials"}
                      >
                        {loadingReveal ? (
                          <div className="w-3.5 h-3.5 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        ) : revealed ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[9px] uppercase">Engine</span>
                    <span className="text-zinc-200 font-semibold">PostgreSQL 16</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[9px] uppercase">Port</span>
                    <span className="text-zinc-200 font-semibold">5432</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[9px] uppercase">Database</span>
                    <span className="text-zinc-200 font-semibold">postgres</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[9px] uppercase">Username</span>
                    <span className="text-zinc-200 font-semibold">infraadmin</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-black/40 border border-dashed border-white/10 text-center text-xs font-mono text-zinc-500">
                Connection string will be generated automatically once Terraform finishes provisioning.
              </div>
            )}
          </div>

          {/* Network Security / Security Group */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                Network Firewall & Security Group
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                IP Locked
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-black/40 border border-white/5 rounded-xl text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Allowed Ingress CIDR</span>
                <span className="text-white font-semibold">{req.allowed_ip ? `${req.allowed_ip}/32` : "0.0.0.0/0 (Open)"}</span>
              </div>

              {isOwner && (
                <button
                  onClick={handleUpdateIp}
                  disabled={loadingIp}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {loadingIp ? <div className="w-3 h-3 border border-cyan-300 border-t-transparent rounded-full animate-spin" /> : <RefreshCw size={13} />}
                  <span>Update to Current IP</span>
                </button>
              )}
            </div>
          </div>

          {/* Hardware & Cloud Infrastructure Specs */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold block">
              Provisioned Hardware Profile
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-zinc-500 uppercase block">Compute Core</span>
                <span className="text-white font-semibold">{spec.cpu}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-zinc-500 uppercase block">Memory</span>
                <span className="text-white font-semibold">{spec.ram}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-zinc-500 uppercase block">Storage</span>
                <span className="text-white font-semibold">{spec.storage}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-zinc-500 uppercase block">Region</span>
                <span className="text-white font-semibold">AWS us-east-1</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-zinc-500 uppercase block">Created At</span>
                <span className="text-white font-semibold">{req.created_at ? new Date(req.created_at).toLocaleDateString() : "Just now"}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-zinc-500 uppercase block">Expiry Date</span>
                <span className="text-white font-semibold">{req.expiry_date || "7 Days"}</span>
              </div>
            </div>
          </div>

          {/* Pending Approval Controls (if applicable) */}
          {(req.status || "").toLowerCase() === "pending_approval" && (
            <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <div>
                <h4 className="text-sm font-semibold text-purple-200">Pending Governance Review</h4>
                <p className="text-xs text-purple-300/70 mt-0.5">This request requires platform approval before AWS provisioning.</p>
              </div>
              <div className="flex items-center justify-center p-3 rounded-xl bg-black/40 border border-purple-500/20 text-xs text-purple-200/80 font-mono">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#E01E5A]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.835a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.835a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.835zM17.688 8.835a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.313zM15.165 18.958a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.52v-2.522h2.52zM15.165 17.687a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                  Approve or Deny in Slack
                </span>
              </div>
            </div>
          )}

          {/* Terminal / Logs (if applicable) */}
          {["provisioning", "ready", "failed"].includes((req.status || "").toLowerCase()) && (
            <div className="mt-4 space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold block">
                Provisioning Log Feed
              </span>
              <ProvisioningTerminal requestId={req.id} />
            </div>
          )}

          {/* Active Resource Controls (Danger Zone) */}
          {["ready", "failed"].includes((req.status || "").toLowerCase()) && isOwner && (
            <div className="p-5 rounded-2xl bg-red-500/[0.04] border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-red-400 font-mono">Danger Zone</h4>
                <p className="text-xs text-red-400/70 mt-0.5">Permanently destroy this resource and its data.</p>
              </div>
              <button
                onClick={handleDestroy}
                disabled={loadingDestroy}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-semibold text-xs hover:bg-red-500/30 transition-all disabled:opacity-50 font-mono shadow-sm"
              >
                {loadingDestroy ? "Initiating Destroy..." : "Destroy Resource"}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-white/10 px-6 py-4 bg-[#0c0d11]/90 flex items-center justify-between text-xs font-mono text-zinc-500">
          <span className="text-[11px]">InfraCtrl Ephemeral Cloud Governance</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-mono"
          >
            Close Inspector
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const effEmail = session?.user?.email || (session?.user?.id ? `id-${session.user.id}@github.local` : "unknown@example.com");
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
  const [selectedResource, setSelectedResource] = useState(null);

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
              requester_email: effEmail,
              name: provForm.name || undefined
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
  }, [provForm, effEmail]);
  
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
        const data = await res.json();
        toast.error(`Failed to extend lifespan: ${data.detail || "Unknown error"}`);
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

    const cost = PRICING[provForm.resource_type]?.[provForm.instance_size] || 0;
    addLog(`[SYSTEM] Initiating Provisioning Request by ${effEmail}...`);
    addLog(`Target environment: ${provForm.environment.toUpperCase()}`);
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
        requester_email: session?.user?.email || "unknown@example.com",
        allowed_ip: provForm.allowed_ip || "0.0.0.0",
      };
      fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": effEmail
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
      requester_email: effEmail,
      allowed_ip: provForm.allowed_ip || "0.0.0.0",
    };

    try {
      const res = await fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": effEmail
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
      } else if (res.status === 403) {
        addLog(`[AUTH] ❌ ACCESS DENIED: ${apiData.detail || "You are not authorized to provision resources."}`);
        addLog(`[SYSTEM] Aborting workflow.`);
        toast.error(apiData.detail || "Not authorized to provision resources");
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
            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
              <div className="col-span-4">Resource</div>
              <div className="col-span-2">Engine & Spec</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Cost / Spend</div>
              <div className="col-span-2 text-right">Actions</div>
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

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedResource(r)}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-6 py-4 items-center hover:bg-white/[0.03] transition-all cursor-pointer group"
                    >
                      {/* Resource Column */}
                      <div className="sm:col-span-4 flex items-center gap-3.5 min-w-0">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${t.ring} ${t.color} shadow-sm group-hover:scale-105 transition-transform`}>
                          <TypeIcon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white font-mono truncate group-hover:text-cyan-300 transition-colors">
                            {name}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono truncate">
                            {r.environment || "dev"} · {r.requester_email}
                          </div>
                        </div>
                      </div>

                      {/* Engine & Spec Column */}
                      <div className="sm:col-span-2 flex flex-col justify-center font-mono">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-200">
                          <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                          <span>{t.label}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {r.instance_size || "small"} ({SPECS[r.instance_size || "small"]?.cpu || "1 vCPU"})
                        </div>
                      </div>

                      {/* Status Column */}
                      <div className="sm:col-span-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${s.cls}`}>
                          {s.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                          {s.label}
                        </span>
                      </div>

                      {/* Cost / Spend Column */}
                      <div className="sm:col-span-2 sm:text-right font-mono">
                        <div className="text-xs font-semibold text-emerald-300">
                          {fmt(getMonthlyCost(r))} <span className="text-[10px] text-zinc-500 font-normal">/mo</span>
                        </div>
                        <div className="text-[11px] text-cyan-300/80 tabular-nums">
                          {fmt(liveSpend(r, now), 4)}
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="sm:col-span-2 flex items-center justify-end gap-2">
                        {r.connection_string && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-colors"
                            title="Quick Copy Connection URI"
                          >
                            <CopyButton text={r.connection_string} />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResource(r);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-white/[0.04] border border-white/10 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/10 text-zinc-300 group-hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <span>Inspect</span>
                          <ChevronRight size={12} className="text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                        </button>
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
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-xl"
            onClick={() => {
              setShowProvisionModal(false);
              setTimeout(() => setProvStep("form"), 300);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 480, damping: 32, mass: 0.65 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full rounded-3xl border border-white/10 bg-[#08080a] shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-white/10"
            >
              {/* Ambient Top Glow Highlight Line */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none z-20" />

              {/* Header (Sticky) */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 shrink-0 bg-[#0c0d11]/90 backdrop-blur-md z-10">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <Database className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight font-mono">Provision Cloud Resource</h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Automated Zero-Trust Terraform Deployment</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowProvisionModal(false);
                    setTimeout(() => setProvStep("form"), 300);
                  }}
                  className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all hover:scale-105"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {provStep === "form" ? (
                /* Form Body (Scrollable) */
                <form onSubmit={handleQuickProvision} className="flex flex-col overflow-hidden h-full">
                <div className="overflow-y-auto px-6 py-6 space-y-7 flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  
                  {/* 1. Engine Selection Boxes */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 block mb-3 font-mono">
                      1. Cloud Resource Engine
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "postgres", label: "PostgreSQL 16", icon: Database, cost: "$15/mo", disabled: false },
                        { id: "redis", label: "Redis Cluster", icon: HardDrive, cost: "$10/mo", disabled: true },
                        { id: "s3", label: "S3 Object Store", icon: Archive, cost: "$5/mo", disabled: true },
                      ].map((eng) => {
                        const isSel = provForm.resource_type === eng.id;
                        const disabled = eng.disabled;
                        const Ic = eng.icon;
                        return (
                          <button
                            key={eng.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => { if (!disabled) setProvForm((p) => ({ ...p, resource_type: eng.id })) }}
                            className={`p-4 rounded-2xl border text-left transition-all duration-200 ease-out relative select-none ${
                              disabled
                                ? "border-white/5 bg-white/[0.01] text-zinc-600 cursor-not-allowed opacity-50"
                                : isSel
                                ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.12)] ring-1 ring-cyan-500/30"
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/[0.04] active:bg-white/[0.06]"
                            }`}
                          >
                            {isSel && !disabled && (
                              <motion.div
                                layoutId="modalActiveEngineRing"
                                className="absolute inset-0 rounded-2xl border border-cyan-400/60 pointer-events-none"
                                transition={{ duration: 0.18, ease: "easeOut" }}
                              />
                            )}
                            <div className="flex justify-between items-start mb-3">
                              <Ic size={20} className={disabled ? "text-zinc-600" : isSel ? "text-cyan-400" : "text-zinc-400"} />
                              {disabled && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-mono">
                                  Soon
                                </span>
                              )}
                            </div>
                            <p className={`text-sm font-semibold font-mono ${disabled ? "text-zinc-600" : isSel ? "text-white" : "text-zinc-200"}`}>{eng.label}</p>
                            <p className={`text-xs mt-0.5 font-mono ${disabled ? "text-zinc-700" : "text-zinc-500"}`}>{eng.cost}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Environment Boxes */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 block mb-3 font-mono">
                      2. Target Environment
                    </label>
                    <div className="flex p-1.5 rounded-2xl bg-black/60 border border-white/10 relative w-full sm:w-fit shadow-inner">
                      {[
                        { id: "dev", label: "dev", color: "text-emerald-400" },
                        { id: "staging", label: "staging", color: "text-amber-400" },
                        { id: "prod", label: "prod", color: "text-purple-400" }
                      ].map((env) => {
                        const isSel = provForm.environment === env.id;
                        return (
                          <button
                            key={env.id}
                            type="button"
                            onClick={() => setProvForm((p) => ({ ...p, environment: env.id }))}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-semibold uppercase font-mono tracking-wider transition-colors duration-150 relative z-10 select-none ${
                              isSel ? "text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {isSel && (
                              <motion.div
                                layoutId="modalActiveEnvPill"
                                className="absolute inset-0 bg-white/10 rounded-xl shadow-md border border-white/15 -z-10"
                                transition={{ duration: 0.18, ease: "easeOut" }}
                              />
                            )}
                            <span className={isSel ? env.color : ""}>{env.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Compute Allocation Boxes */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 block mb-3 font-mono">
                      3. Compute Profile Tier
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {["small", "medium", "large"].map((sz) => {
                        const isSel = provForm.instance_size === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setProvForm((p) => ({ ...p, instance_size: sz }))}
                            className={`p-3.5 rounded-2xl border text-center transition-all duration-200 ease-out relative select-none ${
                              isSel
                                ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.12)] ring-1 ring-emerald-500/30"
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/[0.04] active:bg-white/[0.06]"
                            }`}
                          >
                            {isSel && (
                              <motion.div
                                layoutId="modalActiveSizeRing"
                                className="absolute inset-0 rounded-2xl border border-emerald-400/60 pointer-events-none"
                                transition={{ duration: 0.18, ease: "easeOut" }}
                              />
                            )}
                            <p className={`text-sm font-semibold capitalize font-mono ${isSel ? "text-emerald-300" : "text-zinc-200"}`}>{sz}</p>
                            <p className="text-[11px] text-zinc-500 mt-1 font-mono">{SPECS[sz].cpu} · {SPECS[sz].ram}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Security / Network Access Box */}
                  {provForm.resource_type === "postgres" && (
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 block mb-3 font-mono">
                        4. Network Firewall (Zero Trust)
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={provForm.allowed_ip}
                          onChange={(e) => setProvForm({ ...provForm, allowed_ip: e.target.value })}
                          placeholder="Your Public IP (e.g., 203.0.113.5)"
                          className="flex-1 rounded-2xl bg-black/60 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono shadow-inner"
                          required
                        />
                        <button
                          type="button"
                          onClick={detectIp}
                          className="px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-mono font-semibold text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all duration-150 shadow-sm whitespace-nowrap active:bg-white/[0.12]"
                        >
                          Detect IP
                        </button>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                        <Shield size={13} className="text-emerald-400" />
                        <span>Database security group will be firewalled to this specific IP.</span>
                      </div>
                    </div>
                  )}

                  {/* Policy Preview (Minimalistic Strip) */}
                  {policyPreview ? (() => {
                    const pStatus = policyPreview.decision;
                    const pMsg = policyPreview.reason;
                    const matchedPolicies = policyPreview.matched_policies?.map(p => p.policy_name).join(', ');
                    
                    return (
                      <div className={`p-4.5 rounded-2xl border flex gap-3.5 items-start transition-all duration-300 ${
                        pStatus === "auto_approved" ? "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)]" :
                        pStatus === "pending_approval" ? "border-purple-500/20 bg-purple-500/[0.04] text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.05)]" :
                        "border-red-500/20 bg-red-500/[0.04] text-red-400"
                      }`}>
                        <div className="mt-0.5">
                          {pStatus === "auto_approved" ? <Zap size={18} className="text-emerald-400" /> :
                           pStatus === "pending_approval" ? <Clock size={18} className="text-purple-400" /> :
                           <AlertCircle size={18} className="text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold tracking-tight mb-1 font-mono">
                            {pStatus === "auto_approved" ? "Auto-Approve Eligible" : 
                             pStatus === "pending_approval" ? "Governance Review Required" : 
                             "Request Denied by Policy"}
                          </h4>
                          <p className={`text-xs leading-relaxed font-mono ${
                            pStatus === "auto_approved" ? "text-emerald-400/80" :
                            pStatus === "pending_approval" ? "text-purple-300/80" :
                            "text-red-400/80"
                          }`}>
                            {pMsg}
                          </p>
                          {matchedPolicies && (
                            <p className="text-[10px] uppercase tracking-wider font-mono opacity-60 mt-2">
                              Policy: {matchedPolicies}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="p-4 rounded-2xl border border-white/5 flex gap-3.5 items-center bg-black/40">
                       <div className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
                       <span className="text-xs text-zinc-500 font-mono">Evaluating policy engine...</span>
                    </div>
                  )}

                </div>

                {/* Footer (Sticky) */}
                <div className="p-6 pt-5 border-t border-white/10 bg-[#0c0d11]/90 backdrop-blur-md shrink-0 z-10 flex flex-col gap-4">
                  {/* Dynamic Spec & Cost Breakdown Strip */}
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                      <HardDrive size={13} className="text-zinc-500" />
                      <span>{SPECS[provForm.instance_size].storage}</span>
                    </div>
                    <div className="flex items-baseline gap-2 text-white">
                      <span className="text-xs font-mono text-zinc-500">Estimated Cost:</span>
                      <div className="font-mono text-base font-bold text-emerald-400 overflow-hidden">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={`${provForm.resource_type}-${provForm.instance_size}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="inline-block"
                          >
                            ${PRICING[provForm.resource_type][provForm.instance_size]}/mo
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={provLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black py-3.5 text-sm font-semibold hover:bg-zinc-200 transition-all duration-150 shadow-[0_0_30px_rgba(255,255,255,0.15)] font-mono disabled:opacity-50 active:bg-zinc-300"
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
                  </button>
                </div>
              </form>
              ) : (
                /* Terminal Body */
                <div className="flex flex-col h-full bg-[#08080a] rounded-b-3xl">
                  {provForm._requestId ? (
                    <div className="p-5 flex-1">
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
                    <div className="p-6 border-t border-white/10 bg-[#0c0d11]/90 shrink-0 z-10 rounded-b-3xl">
                      <button
                        onClick={() => {
                          setShowProvisionModal(false);
                          setTimeout(() => {
                            setProvStep("form");
                            setProvForm(p => ({ ...p, _requestId: null }));
                          }, 300);
                        }}
                        className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all shadow-md font-mono border border-white/10"
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

      {/* Resource Details Pop-up Modal */}
      <AnimatePresence>
        {selectedResource && (
          <ResourceDetailsModal
            req={selectedResource}
            session={session}
            onClose={() => setSelectedResource(null)}
            onRefresh={() => fetchRequests(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
