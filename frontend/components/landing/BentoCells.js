"use client";

import { TerminalMockup } from "./TerminalMockup";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Database, Sliders, CircleDollarSign, Bell, Link2, Recycle } from "lucide-react";
import { motion } from "framer-motion";

export function ProvisioningCell() {
  return (
    <SpotlightCard
      spotlightColor="rgba(45, 212, 191, 0.2)"
      className="lg:col-span-2 lg:row-span-2 p-5 sm:p-6 flex flex-col"
    >
      <div className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-black font-bold shadow-md shadow-emerald-500/20">
          <Database className="w-4 h-4" />
        </span>
        <h3 className="text-base font-semibold text-white">Automated CI/CD provisioning</h3>
      </div>
      <p className="mt-2.5 text-sm text-zinc-400 max-w-sm leading-relaxed">
        Submit a request and GitHub Actions runs <span className="font-mono text-cyan-300">terraform apply</span> in AWS — keyless OIDC, no shared credentials.
      </p>
      <div className="mt-4 sm:mt-5 flex-1 rounded-xl border border-white/10 bg-[#0a0a0c] min-h-[190px] sm:min-h-[220px] shadow-inner overflow-hidden">
        <TerminalMockup />
      </div>
    </SpotlightCard>
  );
}

export function FormCell() {
  return (
    <SpotlightCard
      spotlightColor="rgba(34, 211, 238, 0.18)"
      className="lg:col-span-2 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-300">
          <Sliders className="w-4 h-4" />
        </span>
        <h3 className="text-base font-semibold text-white">Self-service form</h3>
      </div>
      <p className="mt-2 text-sm text-zinc-400">Pick a resource, environment, and size — in seconds.</p>
      <div className="mt-3.5 sm:mt-4 flex flex-wrap gap-2">
        {["PostgreSQL", "Redis", "S3"].map((r, i) => (
          <span
            key={r}
            className={`rounded-lg border px-3 py-1.5 sm:px-3.5 text-xs font-mono transition-colors ${
              i === 0 ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/[0.03] text-zinc-400"
            }`}
          >
            {r}
          </span>
        ))}
      </div>
      <div className="mt-3.5 flex items-center gap-2.5 sm:gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:p-3">
        <span className="text-xs text-zinc-500 font-mono">Size</span>
        <div className="flex flex-1 gap-1.5 sm:gap-2">
          {["Small", "Medium", "Large"].map((s, idx) => (
            <div
              key={s}
              className={`flex-1 rounded-lg px-1.5 py-1.5 sm:px-2 text-center text-[10.5px] sm:text-[11px] font-mono transition-colors ${
                idx === 0 ? "text-cyan-300 bg-cyan-950/30 border border-cyan-500/30 font-medium" : "text-zinc-400 bg-white/[0.02] border border-white/5"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </SpotlightCard>
  );
}

export function CostCell() {
  return (
    <SpotlightCard
      spotlightColor="rgba(52, 211, 153, 0.2)"
      className="p-5 sm:p-6"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
        <CircleDollarSign className="w-4 h-4" />
      </span>
      <h3 className="mt-3.5 text-base font-semibold text-white">Cost tracking</h3>
      <div className="mt-3 flex items-end gap-1.5 h-16">
        {[40, 65, 35, 80, 55, 70].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/30 to-emerald-400"
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="text-zinc-500 font-mono">Est. run rate</span>
        <span className="font-semibold text-emerald-300 font-mono">$14.20/mo</span>
      </div>
    </SpotlightCard>
  );
}

export function SlackCell() {
  return (
    <SpotlightCard
      spotlightColor="rgba(244, 114, 182, 0.2)"
      className="p-5 sm:p-6"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-fuchsia-300">
        <Bell className="w-4 h-4" />
      </span>
      <h3 className="mt-3.5 text-base font-semibold text-white">Slack alerts</h3>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded bg-fuchsia-500/80 text-[10px] font-bold text-black">iC</span>
          <span className="text-[11px] font-medium text-white">InfraCtrl</span>
          <span className="text-[10px] text-zinc-500 font-mono">just now</span>
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-400 leading-snug">✅ prod-postgres-01 is ready. Expires in 7 days.</p>
      </div>
    </SpotlightCard>
  );
}

export function SyncCell() {
  return (
    <SpotlightCard
      spotlightColor="rgba(34, 211, 238, 0.2)"
      className="lg:col-span-2 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-300">
          <Link2 className="w-4 h-4" />
        </span>
        <h3 className="text-base font-semibold text-white">Instant access &amp; sync</h3>
      </div>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        Connection strings sync from Terraform output straight to your dashboard.
      </p>
      <div className="mt-3.5 rounded-xl border border-white/10 bg-[#0a0a0c] p-3 sm:p-3.5 font-mono text-[10.5px] sm:text-[11px] text-zinc-300 overflow-x-auto scrollbar-none shadow-inner">
        <span className="text-zinc-500">$</span> infractl connection prod-postgres-01
        <br />
        <span className="text-emerald-400 whitespace-nowrap">postgresql://infraadmin:••••••@db.infractl.io:5432/infractl</span>
      </div>
    </SpotlightCard>
  );
}

export function CleanupCell() {
  return (
    <SpotlightCard
      spotlightColor="rgba(45, 212, 191, 0.2)"
      className="lg:col-span-2 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-teal-300">
          <Recycle className="w-4 h-4" />
        </span>
        <h3 className="text-base font-semibold text-white">Auto-cleanup</h3>
      </div>
      <p className="mt-2 text-sm text-zinc-400 max-w-md leading-relaxed">
        Expired resources are destroyed with <span className="font-mono text-teal-300">terraform destroy</span> — no orphaned instances, no surprise bills.
      </p>
      <div className="mt-3.5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-3.5">
        <div className="flex items-center gap-3">
          <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-white">6d 23h</div>
          <span className="text-[10.5px] sm:text-[11px] text-zinc-500 leading-tight">until auto-destroy<br />Slack warns 24h prior</span>
        </div>
        <span className="rounded-md border border-teal-400/30 bg-teal-400/10 px-2.5 py-1 text-[10.5px] sm:text-[11px] text-teal-200 font-mono font-medium">scheduled</span>
      </div>
    </SpotlightCard>
  );
}
