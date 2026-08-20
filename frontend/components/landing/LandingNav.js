"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Menu, X, ArrowRight, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { BrandLogo } from "@/components/BrandLogo";

const REPO_URL = "https://github.com/amco-f22/infractrl";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Stack", href: "#stack" },
];

export default function LandingNav() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? "border-b border-white/[0.08] bg-[#030305]/85 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-b border-transparent bg-gradient-to-b from-black/80 via-black/30 to-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 xs:px-5 sm:px-6 h-16 sm:h-[4.25rem] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group touch-manipulation">
          <BrandLogo size="md" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] text-[10px] font-mono font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            v2.4
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-medium text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-200"
            aria-label="GitHub repository"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>GitHub</span>
          </a>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
              >
                <span>Dashboard</span>
                <ArrowRight size={13} />
              </Link>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-200"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex items-center gap-2 md:hidden">
          {session?.user && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-semibold active:scale-95 transition-transform"
            >
              <span>App</span>
              <ArrowRight size={11} />
            </Link>
          )}
          <button
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/[0.12] bg-white/[0.04] text-zinc-100 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all duration-200 touch-manipulation shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5 text-cyan-300" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Down Menu Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="md:hidden border-b border-white/[0.12] bg-[#050508]/96 backdrop-blur-3xl px-4 xs:px-5 py-6 shadow-2xl"
          >
            <div className="flex items-center justify-between px-3 pb-3 mb-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">Navigation</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] text-[10px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Fleet Active
              </span>
            </div>

            <div className="space-y-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors"
                >
                  <span className="tracking-tight">{l.label}</span>
                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                </a>
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-white/[0.08] space-y-3">
              {session?.user ? (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    {session.user.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-9 h-9 rounded-full border border-white/15"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-mono text-cyan-300">
                        {(session.user.name || "U")[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">{session.user.name || "Signed in"}</div>
                      <div className="text-[11px] text-zinc-400 font-mono truncate">{session.user.email || "GitHub User"}</div>
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3.5 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                  >
                    <span>Launch Fleet Dashboard</span>
                    <ArrowRight size={15} />
                  </Link>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-zinc-200 hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                      <span>GitHub</span>
                    </a>
                    <button
                      onClick={() => {
                        setOpen(false);
                        signOut();
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      signIn("github", { callbackUrl: "/dashboard" });
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3.5 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                  >
                    <span>Sign In with GitHub</span>
                    <ArrowRight size={15} />
                  </button>

                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    <span>Star on GitHub</span>
                  </a>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
