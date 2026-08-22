"use client";

import Link from "next/link";
import Script from "next/script";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const REPO_URL = "https://github.com/amco-f22/infractrl";
const LINKEDIN_URL = "https://linkedin.com/in/amco-f22";

export default function LandingFooter() {
  const openCalendly = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.Calendly) {
      window.Calendly.initPopupWidget({
        url: "https://calendly.com/creatvaman/30min?background_color=111111&text_color=e4e4e7&primary_color=34d399",
      });
    }
  };

  return (
    <footer className="relative border-t border-white/10 bg-black text-white">
      {/* Calendly assets */}
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />

      {/* Footer grid with CTA integrated as a column */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2.5">
            <BrandLogo size="md" />
          </div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-zinc-500 max-w-xs leading-relaxed">
            Simple self-service infrastructure. Request cloud databases in minutes,
            not days.
          </p>
        </div>

        {/* Product links */}
        <div className="text-xs sm:text-sm">
          <div className="text-zinc-400 font-medium">Product</div>
          <ul className="mt-3 space-y-2 text-zinc-500">
            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
            <li><a href="#stack" className="hover:text-white transition-colors">Tech stack</a></li>
            <li><Link href="/dashboard" className="hover:text-white transition-colors">Fleet Dashboard</Link></li>
          </ul>
        </div>

        {/* Built by */}
        <div className="text-xs sm:text-sm">
          <div className="text-zinc-400 font-medium">Built by</div>
          <p className="mt-3 text-zinc-300 font-medium">Aman Nikhare</p>
          <p className="text-zinc-500 text-xs">DevOps &amp; Cloud Engineer</p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors touch-manipulation"
              aria-label="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors touch-manipulation"
              aria-label="LinkedIn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45c-.91 0-1.64.73-1.64 1.64 0 .91.73 1.64 1.64 1.64.91 0 1.64-.73 1.64-1.64 0-.91-.73-1.64-1.64-1.64z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Contact CTA column */}
        <div className="text-xs sm:text-sm">
          <div className="text-zinc-400 font-medium">Get in Touch</div>
          <p className="mt-3 text-zinc-500 leading-relaxed">
            InfraCtrl is a work in progress. Interested in self-serve infra for your org?
          </p>
          <button
            onClick={openCalendly}
            className="group mt-4 inline-flex items-center gap-1.5 text-sm text-white hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <span className="font-medium">Book a quick chat</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} InfraCtrl. MIT License.</span>
          <span className="font-mono text-[11px] sm:text-xs">made with terraform · actions · keyless oidc</span>
        </div>
      </div>
    </footer>
  );
}
