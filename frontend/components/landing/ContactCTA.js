"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Script from "next/script";

export default function ContactCTA() {
  const openCalendly = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.Calendly) {
      window.Calendly.initPopupWidget({
        url: "https://calendly.com/creatvaman/30min",
      });
    }
  };

  return (
    <>
      {/* Calendly assets */}
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />

      <section className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">
              Still building
            </p>

            <h2 className="mt-4 text-2xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
              Want this for your team?
            </h2>

            <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
              InfraCtrl is a work in progress. If you&apos;re interested in
              self-serve infrastructure for your org, let&apos;s have a quick chat.
            </p>

            <div className="mt-8">
              <button
                onClick={openCalendly}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white hover:bg-white/[0.08] hover:border-white/25 transition-all duration-200 active:scale-[0.98] cursor-pointer"
              >
                <span>Get in Touch</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
