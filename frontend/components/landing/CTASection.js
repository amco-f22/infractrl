"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  const { data: session } = useSession();

  return (
    <section className="relative py-16 sm:py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] px-5 py-12 sm:px-8 sm:py-20 text-center shadow-2xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent)]" />
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[350px] sm:w-[600px] h-[250px] sm:h-[300px] rounded-full bg-green-500/20 blur-[100px] sm:blur-[130px]" />
          <div className="pointer-events-none absolute -bottom-24 right-10 w-[250px] sm:w-[400px] h-[250px] sm:h-[300px] rounded-full bg-cyan-500/20 blur-[100px] sm:blur-[130px]" />

          <div className="relative">
            <h2 className="text-2xl xs:text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-white">
              Stop waiting on DevOps.
              <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Ship faster.
              </span>
            </h2>
            <p className="mt-4 sm:mt-5 text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed px-2 sm:px-0">
              Spin up dev and staging databases yourself, see the cost up front, and
              let InfraCtrl clean up after itself.
            </p>

            <div className="mt-8 sm:mt-9 max-w-xs sm:max-w-none mx-auto">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors shadow-lg active:scale-[0.98] touch-manipulation"
                >
                  <span>Go to Fleet Dashboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <button
                  onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors shadow-lg active:scale-[0.98] touch-manipulation"
                >
                  <span>Get started free with GitHub</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
