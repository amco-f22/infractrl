"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import HeroPreview from "./HeroPreview";

const REPO_URL = "https://github.com/amco-f22/infractrl";

export default function Hero() {
  const { data: session } = useSession();

  return (
    <section className="relative pt-28 xs:pt-32 sm:pt-40 pb-16 sm:pb-24 overflow-hidden">
      {/* Ambient glowing mesh */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] rounded-full bg-gradient-to-b from-cyan-500/20 via-emerald-500/15 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute top-20 right-[-100px] w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-40 left-[-100px] w-[450px] h-[450px] rounded-full bg-cyan-500/12 blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-3.5 xs:px-5 sm:px-6 md:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto"
        >
          {/* Top announcement pill */}
          <div className="flex justify-center mb-8 sm:mb-10">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] hover:border-emerald-500/50 px-3.5 sm:px-4 py-1.5 text-xs text-zinc-200 backdrop-blur-xl transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            >
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400 animate-pulse" />
              <span className="font-medium tracking-tight">Now Provisioning PostgreSQL, Redis &amp; S3</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-emerald-400 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Headline with exact line breaks matching image on mobile and large text size */}
          <h1 className="text-5xl xs:text-6xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-[-0.04em] text-white leading-[1.08] sm:leading-[1.03]">
            <span className="block sm:inline">Request cloud</span>{" "}
            <span className="block sm:inline">databases</span>
            <span className="hidden sm:inline"><br /></span>
            <span className="block sm:inline sm:ml-3">
              in{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  5 minutes
                </span>
                <svg className="absolute -bottom-1.5 sm:-bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
                  <path d="M2 7 Q 150 -2 298 6" fill="none" stroke="url(#hero-grad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                  <defs>
                    <linearGradient id="hero-grad" x1="0" x2="1">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span className="text-zinc-200">,</span>
            </span>{" "}
            <span className="block sm:inline sm:ml-3 text-zinc-300">not 5 days</span>
          </h1>

          {/* Editorial serif description matching exact font styling of reference image */}
          <p className="font-editorial mx-auto mt-8 sm:mt-10 max-w-2xl text-[1.35rem] xs:text-2xl sm:text-[1.7rem] text-zinc-300 font-normal leading-[1.42] tracking-tight px-1 xs:px-2">
            InfraCtrl{" "}
            <span className="italic text-zinc-100">
              kills the DevOps bottleneck
            </span>
            . Self-serve{" "}
            <span className="italic text-zinc-100">
              ephemeral developer infrastructure
            </span>{" "}
            with automated Terraform provisioning, per-second cost metering, and automatic teardown.
          </p>

          {/* CTA Action Area */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-3.5 max-w-sm sm:max-w-none mx-auto">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 sm:py-3.5 text-sm sm:text-base font-semibold text-black hover:bg-zinc-100 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-[0.98] touch-manipulation"
              >
                <span>Launch Fleet Console</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <button
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 sm:py-3.5 text-sm sm:text-base font-semibold text-black hover:bg-zinc-100 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-[0.98] touch-manipulation"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            )}

            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-7 py-4 sm:py-3.5 text-sm sm:text-base font-medium text-white hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 active:scale-[0.98] touch-manipulation shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span>Star on GitHub</span>
            </a>
          </div>

          {/* Micro Feature / Trust Bar */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-mono text-zinc-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <span className="text-emerald-400">✓</span> 5-Min Spinup
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <span className="text-cyan-400">✓</span> IP-Locked SGs
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <span className="text-purple-400">✓</span> Auto-Teardown
            </span>
            <span className="hidden xs:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <span className="text-green-400">✓</span> $0 Idle Waste
            </span>
          </div>
        </motion.div>

        {/* Live Preview Card */}
        <HeroPreview />
      </div>
    </section>
  );
}
