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
    <section className="relative pt-32 sm:pt-40 pb-16">
      {/* Ambient ambient glows matching logo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-cyan-500/15 blur-[150px]" />
      <div className="pointer-events-none absolute top-10 right-0 w-[450px] h-[450px] rounded-full bg-green-500/15 blur-[130px]" />
      <div className="pointer-events-none absolute top-32 left-0 w-[380px] h-[380px] rounded-full bg-emerald-500/12 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-300 backdrop-blur hover:border-white/20 transition-colors"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px] shadow-green-400" />
            Now provisioning PostgreSQL, Redis &amp; S3
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1 className="mx-auto mt-7 max-w-4xl text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] text-white">
            Request cloud databases
            <br className="hidden sm:block" /> in{" "}
            <span className="relative whitespace-nowrap">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                5 minutes
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
                <path d="M2 7 Q 150 -2 298 6" fill="none" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <defs>
                  <linearGradient id="logo-grad" x1="0" x2="1">
                    <stop offset="0" stopColor="#4ade80" />
                    <stop offset="0.5" stopColor="#10b981" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            , not 5 days
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg text-zinc-400 leading-relaxed">
            InfraCtrl kills the DevOps bottleneck. Self-serve dev and staging
            resources with automated Terraform provisioning, live per-second cost
            tracking, and automatic teardown.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors shadow-lg"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <button
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors shadow-lg"
              >
                Get started free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-white hover:bg-white/[0.08] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Star on GitHub
            </a>
          </div>
        </motion.div>

        <HeroPreview />
      </div>
    </section>
  );
}
