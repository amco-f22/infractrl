"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Server, DollarSign, AlertTriangle, Plus, RefreshCw, Database, HardDrive, Archive, Copy, Check, Clock, CalendarPlus, History, Users } from "lucide-react";

const PRICING = {
  postgres: { small: 15, medium: 28, large: 56 },
  redis:    { small: 10, medium: 20, large: 40 },
  s3:       { small: 5,  medium: 15, large: 30 },
};

const STATUS_CONFIG = {
  pending:      { cls: "badge-pending",      label: "Pending" },
  provisioning: { cls: "badge-provisioning", label: "Provisioning" },
  ready:        { cls: "badge-ready",        label: "Ready" },
  failed:       { cls: "badge-failed",       label: "Failed" },
  deleted:      { cls: "badge-deleted",      label: "Deleted" },
};

const RESOURCE_ICONS = { postgres: Database, redis: HardDrive, s3: Archive };

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-1.5 p-1 rounded transition-colors"
      style={{ color: copied ? '#34d399' : '#64748b' }} title="Copy connection string">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [extendingId, setExtendingId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [tab, setTab] = useState("resources"); // "resources" | "audit"

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchRequests = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/api/requests`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/audit-logs?limit=30`);
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  const handleExtend = async (requestId) => {
    setExtendingId(requestId);
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/extend`, { method: "POST" });
      if (res.ok) {
        await fetchRequests(true);
      }
    } catch (err) {
      console.error("Failed to extend:", err);
    } finally {
      setExtendingId(null);
    }
  };

  useEffect(() => { fetchRequests(); fetchAuditLogs(); }, []);

  // Metrics
  const active = requests.filter(r => !['deleted', 'failed'].includes(r.status));
  const monthlyRunRate = active.reduce((sum, r) => {
    const t = r.resource_type || "postgres";
    return sum + (PRICING[t]?.[r.instance_size] ?? 0);
  }, 0);
  const expiringSoon = active.filter(r => {
    if (!r.expiry_date) return false;
    const diff = (new Date(r.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 2;
  }).length;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  const AUDIT_ICONS = {
    created: "🆕", status_changed: "🔄", extended: "📅", cloned: "📋", deleted: "🗑️"
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-2 border-t-transparent rounded-full mx-auto mb-4"
            style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>Loading infrastructure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Infrastructure Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Manage your ephemeral cloud resources</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => fetchRequests(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
              <motion.div animate={refreshing ? { rotate: 360 } : {}}
                transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: "linear" }}>
                <RefreshCw size={16} />
              </motion.div>
            </motion.button>
            <Link href="/onboarding"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}>
              <Users size={16} /> Clone Setup
            </Link>
            <Link href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
              <Plus size={16} /> New Request
            </Link>
          </div>
        </div>

        {/* Metrics */}
        <motion.div variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Server, label: "Active Resources", value: active.length, accent: "#3b82f6", glow: "rgba(59,130,246,0.15)" },
            { icon: DollarSign, label: "Est. Monthly Cost", value: `$${monthlyRunRate}`, sub: "*AWS list prices", accent: "#10b981", glow: "rgba(16,185,129,0.15)" },
            { icon: AlertTriangle, label: "Expiring < 48h", value: expiringSoon, accent: expiringSoon > 0 ? "#f59e0b" : "#64748b", glow: expiringSoon > 0 ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.1)" },
          ].map(({ icon: I, label, value, sub, accent, glow }) => (
            <motion.div key={label} variants={itemVariants} className="glass-card p-6 flex items-center gap-4"
              style={{ boxShadow: `0 0 30px ${glow}` }}>
              <div className="p-3 rounded-xl flex-shrink-0" style={{ background: `${accent}20` }}>
                <I size={22} style={{ color: accent }} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{label}</p>
                <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
                {sub && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</p>}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          {[
            { id: "resources", label: "Resources", icon: Server },
            { id: "audit", label: "Audit Log", icon: History },
          ].map(({ id, label, icon: I }) => (
            <button key={id} onClick={() => { setTab(id); if (id === "audit") fetchAuditLogs(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={tab === id
                ? { background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }
              }>
              <I size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Resources Tab */}
        {tab === "resources" && (
          <>
            {requests.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-16 text-center">
                <Server size={40} style={{ color: '#334155', margin: '0 auto 16px' }} />
                <p className="text-lg font-semibold text-white mb-2">No resources yet</p>
                <p className="text-sm mb-6" style={{ color: '#64748b' }}>Provision your first database, cache, or storage bucket.</p>
                <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                  <Plus size={16} /> Create First Resource
                </Link>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {["Resource", "Type", "Env", "Size", "Status", "Expires", "Connection", ""].map(h => (
                          <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider"
                            style={{ color: '#475569' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                      {requests.map((req) => {
                        const TypeIcon = RESOURCE_ICONS[req.resource_type] || Database;
                        const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                        const canExtend = !['deleted', 'failed'].includes(req.status);
                        return (
                          <motion.tr key={req.id} variants={itemVariants} className="transition-colors"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-sm text-white">{req.requester_name}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{req.requester_email}</p>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <TypeIcon size={14} style={{ color: '#64748b' }} />
                                <span className="text-sm capitalize text-slate-300">{req.resource_type || 'postgres'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm capitalize" style={{ color: '#94a3b8' }}>{req.environment}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm capitalize" style={{ color: '#94a3b8' }}>{req.instance_size}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={statusCfg.cls}>{statusCfg.label}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm" style={{ color: '#64748b' }}>{req.expiry_date || "N/A"}</span>
                            </td>
                            <td className="px-5 py-4 max-w-[200px]">
                              {req.connection_string ? (
                                <div className="flex items-center">
                                  <code className="text-xs font-mono truncate max-w-[160px]" style={{ color: '#60a5fa' }}>
                                    {req.connection_string.substring(0, 28)}...
                                  </code>
                                  <CopyButton text={req.connection_string} />
                                </div>
                              ) : req.status === 'failed' ? (
                                <span className="text-xs" style={{ color: '#f87171' }}>Failed</span>
                              ) : (
                                <span className="text-xs italic" style={{ color: '#334155' }}>Pending...</span>
                              )}
                            </td>
                            {/* Extend button */}
                            <td className="px-5 py-4">
                              {canExtend && (
                                <button onClick={() => handleExtend(req.id)}
                                  disabled={extendingId === req.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                                  style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' }}
                                  title="Extend expiry by 7 days">
                                  {extendingId === req.id ? (
                                    <Clock size={12} className="animate-spin" />
                                  ) : (
                                    <CalendarPlus size={12} />
                                  )}
                                  +7d
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </motion.tbody>
                  </table>
                </div>
                <div className="px-5 py-3 flex justify-between items-center"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs" style={{ color: '#334155' }}>
                    {requests.length} total · {active.length} active
                  </p>
                  <p className="text-xs" style={{ color: '#334155' }}>Auto-refreshes on page load</p>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Audit Log Tab */}
        {tab === "audit" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <History size={18} /> Activity Feed
            </h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm" style={{ color: '#64748b' }}>No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 py-3"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-lg">{AUDIT_ICONS[log.action] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{log.details}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs" style={{ color: '#64748b' }}>{log.actor}</span>
                        <span className="text-xs" style={{ color: '#334155' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                        </span>
                      </div>
                    </div>
                    {log.request_id && (
                      <code className="text-xs font-mono shrink-0" style={{ color: '#475569' }}>
                        {log.request_id.substring(0, 8)}...
                      </code>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
