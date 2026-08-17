"use client";

import { motion } from "framer-motion";
import { FileText, Cpu, Link2, Recycle } from "lucide-react";

const steps = [
  { icon: FileText, title: "Fill the form", desc: "Enter details and pick an environment and size — dev, staging, or prod." },
  { icon: Cpu, title: "Automated provisioning", desc: "FastAPI triggers GitHub Actions, which runs Terraform apply to create the resource in AWS." },
  { icon: Link2, title: "Connect & build", desc: "A post-deploy script syncs the connection string to your dashboard. Copy it and start building." },
  { icon: Recycle, title: "Auto-cleanup", desc: "When a resource expires, a scheduled teardown destroys it — Slack warns you 24h before." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 border-t border-white/5">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-r from-green-500/[0.07] to-cyan-500/[0.07] blur-[150px]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400 font-mono">
            How it works
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-white">
            From request to teardown, <span className="text-emerald-300">fully automated</span>
          </h2>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative rounded-2xl border border-white/10 bg-white/[0.025] p-6 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-11 h-11 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <s.icon className="w-5 h-5" />
                </span>
                <span className="text-5xl font-semibold text-white/[0.06] tabular-nums font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-medium text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
