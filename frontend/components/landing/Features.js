"use client";

import { motion } from "framer-motion";
import {
  ProvisioningCell,
  FormCell,
  CostCell,
  SlackCell,
  SyncCell,
  CleanupCell,
} from "./BentoCells";

export default function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400 font-mono">
            Features
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-white">
            Everything between <span className="text-emerald-300">request</span> and <span className="text-cyan-300">connection</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            InfraCtrl closes the loop on infrastructure self-service — from the
            first click to automatic teardown.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-4 lg:auto-rows-[minmax(0,1fr)] gap-3.5 sm:gap-4"
        >
          <ProvisioningCell />
          <FormCell />
          <CostCell />
          <SlackCell />
          <SyncCell />
          <CleanupCell />
        </motion.div>
      </div>
    </section>
  );
}
