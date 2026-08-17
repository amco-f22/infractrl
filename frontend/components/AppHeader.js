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
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/10 bg-[#000000]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <BrandLogo size="md" />
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-semibold hidden sm:inline-block">
            Console
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              pathname === "/dashboard"
                ? "bg-white/10 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/onboarding"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              pathname === "/onboarding"
                ? "bg-white/10 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            Clone Setup
          </Link>
          
          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <AuthButton />
        </div>
      </div>
    </header>
  );
}
