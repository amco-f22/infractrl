"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Database, Loader2, RefreshCw, TrendingUp, Activity, Gauge } from "lucide-react";

const HOURS_PER_MONTH = 730;

const PRICING = {
  postgres: { small: 15, medium: 28, large: 56 },
  redis:    { small: 10, medium: 20, large: 40 },
  s3:       { small: 5,  medium: 15, large: 30 },
};

const typeMeta = {
  postgres: { label: "PostgreSQL", color: "text-cyan-300", dot: "bg-cyan-400", ring: "border-cyan-400/30 bg-cyan-400/10" },
  PostgreSQL: { label: "PostgreSQL", color: "text-cyan-300", dot: "bg-cyan-400", ring: "border-cyan-400/30 bg-cyan-400/10" },
  redis: { label: "Redis", color: "text-rose-300", dot: "bg-rose-400", ring: "border-rose-400/30 bg-rose-400/10" },
  Redis: { label: "Redis", color: "text-rose-300", dot: "bg-rose-400", ring: "border-rose-400/30 bg-rose-400/10" },
  s3: { label: "S3", color: "text-amber-300", dot: "bg-amber-400", ring: "border-amber-400/30 bg-amber-400/10" },
  S3: { label: "S3", color: "text-amber-300", dot: "bg-amber-400", ring: "border-amber-400/30 bg-amber-400/10" },
};

const statusMeta = {
  ready: { label: "Ready", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
  Ready: { label: "Ready", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
  provisioning: { label: "Provisioning", cls: "text-amber-300 border-amber-400/30 bg-amber-400/10", pulse: true },
  Provisioning: { label: "Provisioning", cls: "text-amber-300 border-amber-400/30 bg-amber-400/10", pulse: true },
  expiring: { label: "Expiring", cls: "text-orange-300 border-orange-400/30 bg-orange-400/10" },
  Expiring: { label: "Expiring", cls: "text-orange-300 border-orange-400/30 bg-orange-400/10" },
  deleted: { label: "Deleted", cls: "text-zinc-500 border-white/10 bg-white/5" },
  Deleted: { label: "Deleted", cls: "text-zinc-500 border-white/10 bg-white/5" },
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
  if (ms < 0) return 0;
  const monthlyCost = getMonthlyCost(res);
  return (monthlyCost / (HOURS_PER_MONTH * 3600 * 1000)) * ms;
}

const fmt = (n, d = 2) => `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

const fallbackResources = [
  { id: "1", name: "prod-postgres-01", resource_type: "postgres", status: "ready", instance_size: "Large", environment: "us-east-1", monthly_cost: 142.00, created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
  { id: "2", name: "cache-redis-02", resource_type: "redis", status: "ready", instance_size: "Medium", environment: "us-east-1", monthly_cost: 64.00, created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString() },
  { id: "3", name: "staging-s3-01", resource_type: "s3", status: "provisioning", instance_size: "Small", environment: "eu-west-1", monthly_cost: 9.00, created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: "4", name: "analytics-postgres-01", resource_type: "postgres", status: "expiring", instance_size: "Medium", environment: "us-west-2", monthly_cost: 78.00, created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString() },
  { id: "5", name: "media-s3-02", resource_type: "s3", status: "ready", instance_size: "Large", environment: "ap-south-1", monthly_cost: 31.50, created_at: new Date(Date.now() - 3600000 * 24 * 14).toISOString() },
];

export default function DashboardSection() {
  const [resources, setResources] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Simulate a brief loading state for the mockup, then show static dummy data
    const timer = setTimeout(() => {
      setResources(fallbackResources);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = (resources || []).filter((r) => !["deleted", "failed", "Deleted", "Failed"].includes(r.status));
  const monthlyTotal = active.reduce((s, r) => s + getMonthlyCost(r), 0);
  const liveTotal = active.reduce((s, r) => s + liveSpend(r, now), 0);

  return (
    <section id="dashboard" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-r from-green-500/[0.08] to-cyan-500/[0.08] blur-[150px]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/90 font-mono">
              Live dashboard
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-white">
              Your resources, in <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">real time</span>
            </h2>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              Every active resource and its estimated monthly cost — with live spend
              ticking up by the second as your infrastructure runs.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1.5 text-xs text-green-300 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Live Telemetry
          </span>
        </div>

        {/* Summary stats matching logo palette */}
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          <StatCard icon={Gauge} label="Estimated monthly cost" value={fmt(monthlyTotal)} accent="from-green-400 via-emerald-400 to-cyan-400" />
          <StatCard icon={Activity} label="Active resources" value={String(active.length)} accent="from-emerald-400 to-cyan-400" />
          <StatCard icon={TrendingUp} label="Live spend so far" value={fmt(liveTotal, 4)} accent="from-green-400 to-teal-400" live />
        </div>

        {/* Resource list */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
            <div className="col-span-4">Resource</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Monthly</div>
            <div className="col-span-2 text-right">Live spend</div>
          </div>

          {resources === null ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> Loading resources…
            </div>
          ) : active.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <RefreshCw className="w-6 h-6 text-zinc-600" />
              <p className="text-sm text-zinc-500">No active resources yet. Provision one to see it here.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {active.map((r) => {
                const type = (r.resource_type || "postgres").toLowerCase();
                const t = typeMeta[type] || typeMeta.postgres;
                const status = (r.status || "ready").toLowerCase();
                const s = statusMeta[status] || statusMeta.ready;
                const name = r.name || `${r.environment || 'dev'}-${r.resource_type || 'db'}-${(r.id || '').substring(0, 4)}`;

                return (
                  <div key={r.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors">
                    <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${t.ring} ${t.color}`}>
                        <Database className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white font-mono truncate">{name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{r.instance_size || "small"} · {r.environment || "dev"}</div>
                      </div>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2 text-sm text-zinc-300 font-mono">
                      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> {t.label}
                    </div>
                    <div className="sm:col-span-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${s.cls}`}>
                        {s.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                        {s.label}
                      </span>
                    </div>
                    <div className="sm:col-span-2 sm:text-right text-sm font-medium text-emerald-300 font-mono">{fmt(getMonthlyCost(r))}</div>
                    <div className="sm:col-span-2 sm:text-right font-mono text-[13px] text-cyan-200 tabular-nums">{fmt(liveSpend(r, now), 4)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, accent, live }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.025] p-5 overflow-hidden shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${accent} text-black`}>
          <Icon className="w-4 h-4" />
        </span>
        {live && <span className="text-[10px] text-emerald-400 font-mono">● live</span>}
      </div>
      <div className="mt-4 text-2xl font-semibold tabular-nums text-white font-mono">{value}</div>
      <div className="mt-1 text-xs text-zinc-500 font-mono">{label}</div>
    </motion.div>
  );
}
