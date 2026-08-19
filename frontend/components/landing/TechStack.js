"use client";

import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import {
  NextjsLogo,
  FastApiLogo,
  PostgresLogo,
  TerraformLogo,
  GitHubActionsLogo,
  VercelLogo,
  RailwayLogo,
  RedisLogo,
  S3Logo,
  SlackLogo,
  SecurityOidcLogo,
} from "./TechLogos";

const stack = [
  {
    name: "Next.js",
    role: "Frontend",
    note: "React 19 · Tailwind CSS",
    logo: NextjsLogo,
    spotlight: "rgba(255, 255, 255, 0.15)",
  },
  {
    name: "FastAPI",
    role: "Backend API",
    note: "Python 3.12 · Async REST",
    logo: FastApiLogo,
    spotlight: "rgba(5, 153, 139, 0.25)",
  },
  {
    name: "Terraform",
    role: "Infrastructure as Code",
    note: "AWS Provider · S3 Backend",
    logo: TerraformLogo,
    spotlight: "rgba(132, 79, 186, 0.25)",
  },
  {
    name: "GitHub Actions",
    role: "CI/CD Orchestration",
    note: "Keyless IAM OIDC Auth",
    logo: GitHubActionsLogo,
    spotlight: "rgba(32, 136, 255, 0.25)",
  },
  {
    name: "Vercel",
    role: "Frontend Deployment",
    note: "Global Edge Network · SSL",
    logo: VercelLogo,
    spotlight: "rgba(255, 255, 255, 0.2)",
  },
  {
    name: "Railway",
    role: "Backend Deployment",
    note: "FastAPI Containers · Auto-Deploy",
    logo: RailwayLogo,
    spotlight: "rgba(244, 63, 94, 0.25)",
  },
];

const marqueeItems = [
  { name: "Vercel Edge", icon: VercelLogo },
  { name: "Railway Backend", icon: RailwayLogo },
  { name: "PostgreSQL 16", icon: PostgresLogo },
  { name: "Redis 7.2", icon: RedisLogo },
  { name: "Amazon S3", icon: S3Logo },
  { name: "Terraform", icon: TerraformLogo },
  { name: "GitHub Actions", icon: GitHubActionsLogo },
  { name: "Slack Alerts", icon: SlackLogo },
  { name: "Keyless IAM OIDC", icon: SecurityOidcLogo },
  { name: "FastAPI 0.110", icon: FastApiLogo },
  { name: "Next.js 16", icon: NextjsLogo },
];

export default function TechStack() {
  return (
    <section id="stack" className="relative py-16 sm:py-24 md:py-32 border-t border-white/5">
      {/* Background ambient lighting matching logo */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[800px] h-[300px] sm:h-[400px] rounded-full bg-gradient-to-r from-green-500/[0.06] to-cyan-500/[0.06] blur-[100px] sm:blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400 font-mono">
            Tech stack
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-white">
            Built on a stack you <span className="text-cyan-300">already trust</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Production-grade tools, wired together for reliable, repeatable
            deployments — deployed seamlessly on Vercel and Railway.
          </p>
        </div>

        {/* Continuous Sliding Marquee with Official Logos */}
        <div className="relative mt-10 sm:mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
          <motion.div
            className="flex gap-3 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          >
            {[...marqueeItems, ...marqueeItems].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="shrink-0 flex items-center gap-2 sm:gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs text-zinc-300 font-mono shadow-sm hover:border-white/20 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* 6 Core Tech Stack Cards with Dedicated Official Brand Logos */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {stack.map((s, i) => {
            const LogoComponent = s.logo;
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.06 }}
              >
                <SpotlightCard
                  spotlightColor={s.spotlight}
                  className="p-4 sm:p-5 h-full flex items-center gap-3.5 sm:gap-4 hover:border-white/25 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.04] border border-white/10 shrink-0 shadow-inner px-2">
                    <LogoComponent className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-white tracking-tight">{s.name}</div>
                    <div className="text-[11px] sm:text-xs text-zinc-400 font-mono mt-0.5 truncate">{s.role} · <span className="text-zinc-500">{s.note}</span></div>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
