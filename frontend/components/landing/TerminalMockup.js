"use client";

import { motion } from "framer-motion";

const lines = [
  { t: "$ infractl provision prod-postgres-01", c: "text-zinc-200" },
  { t: "→ triggering github actions …", c: "text-zinc-500" },
  { t: "✓ terraform init", c: "text-emerald-400" },
  { t: "✓ terraform apply — rds postgres 16", c: "text-emerald-400" },
  { t: "  aws_db_instance.postgres: Creating…", c: "text-zinc-500" },
  { t: "  aws_db_instance.postgres: Creation complete [id=prod-pg-01]", c: "text-cyan-300" },
  { t: "✓ state synced to dashboard", c: "text-emerald-400" },
  { t: "✓ connection string posted to #alerts", c: "text-emerald-400" },
  { t: "done in 4m 12s · est. $14.20/mo", c: "text-zinc-300" },
];

export function TerminalMockup() {
  return (
    <div className="h-full flex flex-col font-mono text-[11px] sm:text-[12.5px]">
      <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 border-b border-white/5 bg-white/[0.01]">
        <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-2 text-[10px] sm:text-[11px] text-zinc-500 font-mono">infractl — zsh</span>
      </div>
      <div className="leading-relaxed p-3.5 sm:p-4 space-y-1 sm:space-y-1.5 overflow-x-auto scrollbar-none">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.22, duration: 0.25 }}
            className={`${l.c} whitespace-nowrap sm:whitespace-normal`}
          >
            {l.t}
          </motion.div>
        ))}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 0.2 + lines.length * 0.22, repeat: Infinity, duration: 0.9 }}
          className="inline-block h-3 sm:h-3.5 w-1.5 sm:w-2 bg-cyan-300 translate-y-0.5"
        />
      </div>
    </div>
  );
}
