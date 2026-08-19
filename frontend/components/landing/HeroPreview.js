"use client";

import { motion } from "framer-motion";
import { TerminalMockup } from "./TerminalMockup";
import { CheckCircle2, Database } from "lucide-react";

const resources = [
  { name: "prod-postgres-01", type: "PostgreSQL", status: "Ready", cost: "$14.20/mo" },
  { name: "cache-redis-02", type: "Redis", status: "Ready", cost: "$6.40/mo" },
  { name: "staging-s3-01", type: "S3", status: "Provisioning", cost: "$0.90/mo" },
];

export default function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 35, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
      className="relative mx-auto mt-16 max-w-5xl text-left"
    >
      <div className="pointer-events-none absolute -inset-x-20 -top-10 bottom-0 bg-cyan-500/10 blur-[100px] rounded-full" />
      <div className="relative grid lg:grid-cols-5 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl shadow-2xl shadow-black/80 hover:border-white/20 transition-all duration-300">
        <div className="lg:col-span-3 rounded-xl border border-white/10 bg-[#0a0a0c] overflow-hidden">
          <TerminalMockup />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#0a0a0c] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-xs font-semibold text-zinc-300">Live Dashboard</span>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">3 active</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {resources.map((r) => (
                <div
                  key={r.name}
                  className="group rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200 cursor-default"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="w-3.5 h-3.5 text-cyan-300 shrink-0 group-hover:scale-110 group-hover:text-cyan-200 transition-all duration-200" />
                      <span className="text-xs font-medium text-white truncate group-hover:text-cyan-200 transition-colors">{r.name}</span>
                    </div>
                    {r.status === "Ready" ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 group-hover:brightness-125 transition-all">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-amber-300 group-hover:brightness-125 transition-all">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" /> {r.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="font-mono">{r.type}</span>
                    <span className="text-zinc-300 font-mono group-hover:text-white transition-colors">{r.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/5">
            <span className="text-[11px] text-zinc-500 font-mono">Est. monthly run rate</span>
            <span className="text-sm font-semibold text-emerald-300 font-mono">$21.50</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
