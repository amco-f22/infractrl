"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import AuthButton from "@/app/auth-button";
import { BrandLogo } from "@/components/BrandLogo";

export default function AppHeader() {
  const pathname = usePathname();

  // If on the public landing page, let the LandingNav handle header
  if (pathname === "/") {
    return null;
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/[0.08] bg-[#030305]/85 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="max-w-7xl mx-auto px-4 xs:px-5 sm:px-6 h-full flex items-center justify-between">
        
        {/* Brand Logo & Console Tag */}
        <div className="flex items-center gap-2 xs:gap-2.5">
          <Link href="/" className="flex items-center group touch-manipulation" title="InfraCtrl Home">
            {/* Mobile: Logo Icon only without text "InfraCtrl" */}
            <BrandLogo iconOnly size="md" className="sm:hidden" />
            {/* Desktop / Tablets: Full Brand Logo */}
            <BrandLogo size="md" className="hidden sm:inline-flex" />
          </Link>
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-semibold select-none pointer-events-none cursor-default">
            Console
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              pathname === "/dashboard"
                ? "bg-white/10 text-white font-semibold shadow-sm border border-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/onboarding"
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              pathname === "/onboarding"
                ? "bg-white/10 text-white font-semibold shadow-sm border border-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <span className="hidden sm:inline">Clone Setup</span>
            <span className="sm:hidden">Setup</span>
          </Link>
          
          <div className="h-4 w-px bg-white/10 mx-0.5 sm:mx-1" />

          <AuthButton />
        </div>
      </div>
    </header>
  );
}
