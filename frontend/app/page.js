"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Database, HardDrive, Archive, Zap, ChevronRight, CheckCircle, Clock, Shield, AlertTriangle, X, Copy } from "lucide-react";

const PRICING = {
  postgres: { small: 15, medium: 28, large: 56 },
  redis:    { small: 10, medium: 20, large: 40 },
  s3:       { small: 5,  medium: 15, large: 30 },
};

const RESOURCE_CONFIG = {
  postgres: { label: "PostgreSQL Database", icon: Database, color: "#60a5fa", glow: "rgba(96, 165, 250, 0.3)", desc: "Relational database for structured data" },
  redis:    { label: "Redis Cache",         icon: HardDrive, color: "#f87171", glow: "rgba(248, 113, 113, 0.3)", desc: "In-memory store for caching & queues" },
  s3:       { label: "S3 Object Storage",   icon: Archive,   color: "#fbbf24", glow: "rgba(251, 191, 36, 0.3)",  desc: "Scalable object & file storage" },
};

export default function RequestForm() {
  const [formData, setFormData] = useState({
    requester_name: "", requester_email: "", resource_type: "postgres", environment: "dev", instance_size: "small",
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const resource = RESOURCE_CONFIG[formData.resource_type];
  const Icon = resource.icon;
  const currentCost = PRICING[formData.resource_type][formData.instance_size];

  const createRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: "success", id: data.id, expiry: data.expiry_date, budget_warning: data.budget_warning });
        setFormData({ requester_name: "", requester_email: "", resource_type: "postgres", environment: "dev", instance_size: "small" });
      } else {
        setMessage({ type: "error", text: data.detail || "Something went wrong" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to API. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setChecking(true);

    // Step 1: Check for duplicates
    try {
      const checkRes = await fetch(`${API_URL}/api/requests/check-duplicates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const { found_similar, suggestions, estimated_savings } = await checkRes.json();

      if (found_similar) {
        setDuplicateModal({ suggestions, estimated_savings });
        setChecking(false);
        return;
      }
    } catch {
      // If duplicate check fails, proceed anyway
    }
    setChecking(false);

    // Step 2: No duplicates found, create directly
    await createRequest();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Duplicate Warning Modal */}
      <AnimatePresence>
        {duplicateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card-solid p-6 max-w-lg w-full"
              style={{ border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 0 40px rgba(245,158,11,0.15)' }}>
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} style={{ color: '#fbbf24' }} />
                  <h3 className="text-lg font-bold text-white">Similar Resources Exist</h3>
                </div>
                <button onClick={() => setDuplicateModal(null)} style={{ color: '#64748b' }}><X size={18} /></button>
              </div>
              
              <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
                Creating a duplicate could waste <span className="font-bold text-white">${duplicateModal.estimated_savings}/mo</span>.
                Consider reusing an existing resource:
              </p>

              <div className="space-y-3 mb-5 max-h-48 overflow-y-auto">
                {duplicateModal.suggestions.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl flex items-center justify-between"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-sm font-medium text-white">{r.requester_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                        {r.resource_type} / {r.environment} / {r.instance_size}
                      </p>
                    </div>
                    {r.connection_string && (
                      <button onClick={() => { navigator.clipboard.writeText(r.connection_string); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <Copy size={10} /> Use This
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setDuplicateModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  Cancel
                </button>
                <button onClick={async () => { setDuplicateModal(null); await createRequest(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  Create Anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl w-full">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Provision Infrastructure
            <span className="block text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)' }}>
              in Seconds
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-lg mx-auto">
            Self-service cloud resources with automatic 7-day lifecycle management.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-3 glass-card-solid p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Your Name</label>
                  <input name="requester_name" type="text" required value={formData.requester_name}
                    onChange={handleChange} className="input-field" placeholder="Aman Kumar" />
                </div>
                <div>
                  <label className="label-text">Email</label>
                  <input name="requester_email" type="email" required value={formData.requester_email}
                    onChange={handleChange} className="input-field" placeholder="aman@example.com" />
                </div>
              </div>

              {/* Resource type selector */}
              <div>
                <label className="label-text">Resource Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(RESOURCE_CONFIG).map(([key, cfg]) => {
                    const Ic = cfg.icon;
                    const selected = formData.resource_type === key;
                    return (
                      <motion.button key={key} type="button" whileTap={{ scale: 0.96 }}
                        onClick={() => setFormData(prev => ({ ...prev, resource_type: key }))}
                        className="p-3 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: selected ? `${cfg.color}18` : 'rgba(255,255,255,0.04)',
                          border: selected ? `1px solid ${cfg.color}60` : '1px solid rgba(255,255,255,0.07)',
                          boxShadow: selected ? `0 0 20px ${cfg.glow}` : 'none'
                        }}>
                        <Ic size={18} style={{ color: selected ? cfg.color : '#64748b' }} className="mb-1" />
                        <div className="text-xs font-semibold" style={{ color: selected ? cfg.color : '#94a3b8' }}>{cfg.label.split(' ')[0]}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Environment</label>
                  <select name="environment" value={formData.environment} onChange={handleChange} className="input-field">
                    <option value="dev">Development</option>
                    <option value="staging">Staging</option>
                    <option value="prod">Production</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Instance Size</label>
                  <select name="instance_size" value={formData.instance_size} onChange={handleChange} className="input-field">
                    <option value="small">Small — Starter</option>
                    <option value="medium">Medium — Standard</option>
                    <option value="large">Large — High Performance</option>
                  </select>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                type="submit" disabled={loading || checking}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 mt-2">
                {loading || checking ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {checking ? "Checking duplicates..." : "Provisioning..."}
                  </>
                ) : (
                  <><Zap size={18} /> Provision Now <ChevronRight size={16} /></>
                )}
              </motion.button>
            </form>

            {/* Trust signals */}
            <div className="mt-6 flex items-center justify-center gap-6">
              {[
                { icon: Shield, text: "Encrypted at rest" },
                { icon: Clock, text: "Auto-expires in 7 days" },
                { icon: AlertTriangle, text: "Duplicate detection" },
              ].map(({ icon: I, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <I size={12} style={{ color: '#64748b' }} />
                  <span className="text-xs" style={{ color: '#64748b' }}>{text}</span>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {message && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mt-5 p-4 rounded-xl"
                  style={message.type === 'success'
                    ? { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }
                    : { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  {message.type === 'success' ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle size={18} style={{ color: '#34d399', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#34d399' }}>Request submitted!</p>
                        <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>ID: <code className="font-mono">{message.id}</code></p>
                        <p className="text-xs" style={{ color: '#6ee7b7' }}>Expires: {message.expiry}</p>
                        {message.budget_warning && (
                          <p className="text-xs mt-2 font-medium" style={{ color: '#fbbf24' }}>⚠️ {message.budget_warning}</p>
                        )}
                        <Link href="/dashboard" className="text-xs font-semibold mt-2 inline-block" style={{ color: '#34d399' }}>
                          Track on dashboard →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: '#f87171' }}>❌ {message.text}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Live preview panel */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2 flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div key={formData.resource_type}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass-card p-6"
                style={{ border: `1px solid ${resource.color}30`, boxShadow: `0 0 40px ${resource.glow}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl" style={{ background: `${resource.color}20` }}>
                    <Icon size={22} style={{ color: resource.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{resource.label}</h3>
                    <p className="text-xs" style={{ color: '#64748b' }}>{resource.desc}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Environment", value: formData.environment },
                    { label: "Capacity", value: formData.instance_size },
                    { label: "Auto-expires", value: "7 days" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-2"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
                      <span className="text-sm font-medium capitalize text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#64748b' }}>Est. monthly cost</p>
                      <p className="text-xs" style={{ color: '#475569' }}>*AWS list price</p>
                    </div>
                    <motion.span key={currentCost} initial={{ scale: 1.3, color: resource.color }}
                      animate={{ scale: 1, color: '#ffffff' }} className="text-4xl font-bold">
                      ${currentCost}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            <Link href="/dashboard" className="glass-card p-4 flex items-center justify-between group transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-sm font-semibold text-white">Infrastructure Dashboard</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>View all active resources</p>
              </div>
              <ChevronRight size={18} style={{ color: '#64748b' }} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
