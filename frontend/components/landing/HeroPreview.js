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
      className="relative mx-auto mt-10 sm:mt-16 max-w-5xl text-left"
    >
      {/* Background radial glow */}
      <div className="pointer-events-none absolute -inset-x-6 sm:-inset-x-20 -top-10 bottom-0 bg-gradient-to-r from-cyan-500/15 via-emerald-500/10 to-teal-500/15 blur-[70px] sm:blur-[100px] rounded-full" />
      
      <div className="relative grid lg:grid-cols-5 gap-2.5 sm:gap-4 rounded-2xl sm:rounded-3xl border border-white/[0.12] bg-[#07070a]/70 p-2 sm:p-3.5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/20 transition-all duration-300">
        <div className="lg:col-span-3 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030305] overflow-hidden shadow-inner">
          <TerminalMockup />
        </div>
        
        <div className="lg:col-span-2 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#050508]/90 p-3 sm:p-4 flex flex-col justify-between shadow-inner">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-zinc-200">Active Fleet</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08]">
                3 online
              </span>
            </div>
            
            <div className="mt-2.5 sm:mt-3 space-y-2 sm:space-y-2.5">
              {resources.map((r) => (
                <div
                  key={r.name}
                  className="group rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 sm:p-3 hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200 cursor-default"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="w-3.5 h-3.5 text-cyan-300 shrink-0 group-hover:scale-110 group-hover:text-cyan-200 transition-all duration-200" />
                      <span className="text-xs font-medium text-white truncate group-hover:text-cyan-200 transition-colors font-mono">{r.name}</span>
                    </div>
                    {r.status === "Ready" ? (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-emerald-400 group-hover:brightness-125 transition-all">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-amber-300 group-hover:brightness-125 transition-all">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" /> {r.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="font-mono text-[10px] text-zinc-400">{r.type}</span>
                    <span className="text-zinc-300 font-mono text-xs group-hover:text-white transition-colors">{r.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-3.5 pt-2.5 sm:mt-4 sm:pt-3 flex items-center justify-between border-t border-white/[0.06]">
            <span className="text-[11px] text-zinc-400 font-mono">Est. monthly run rate</span>
            <span className="text-sm font-semibold text-emerald-400 font-mono">$21.50</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
