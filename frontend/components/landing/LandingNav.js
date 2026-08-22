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
  { label: "Policies", href: "#policies" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "How it works", href: "#how-it-works" },
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
          ? "border-b border-white/[0.08] bg-[#050507]/75 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9),inset_0_-1px_0_0_rgba(255,255,255,0.05)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center group touch-manipulation">
          <BrandLogo size="md" />
        </Link>

        {/* Desktop Navigation Links (Apple liquid pill style) */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-full border border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs sm:text-[13px] font-medium text-zinc-400 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-white/[0.06] transition-all duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-2.5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="grid place-items-center w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all"
            aria-label="GitHub repository"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)] active:scale-[0.98]"
              >
                <span>Dashboard</span>
                <ArrowRight size={13} />
              </Link>
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-full border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="text-xs font-semibold px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)] active:scale-[0.98]"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 -mr-1 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all touch-manipulation"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Slide-Down Menu Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-white/[0.08] bg-[#050507]/90 backdrop-blur-2xl backdrop-saturate-150 px-5 py-6 shadow-2xl"
          >
            <div className="space-y-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => {
                    setOpen(false);
                    if (typeof document !== "undefined") {
                      document.body.style.overflow = "unset";
                    }
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <span>{l.label}</span>
                  <ArrowRight size={14} className="text-zinc-600" />
                </a>
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
              {session?.user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                    {session.user.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-8 h-8 rounded-full border border-white/10"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-mono text-cyan-300">
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
                    onClick={() => {
                      setOpen(false);
                      if (typeof document !== "undefined") {
                        document.body.style.overflow = "unset";
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg active:scale-[0.98]"
                  >
                    <span>Go to Fleet Dashboard</span>
                    <ArrowRight size={15} />
                  </Link>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setOpen(false);
                        if (typeof document !== "undefined") {
                          document.body.style.overflow = "unset";
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                      <span>GitHub</span>
                    </a>
                    <button
                      onClick={() => {
                        setOpen(false);
                        if (typeof document !== "undefined") {
                          document.body.style.overflow = "unset";
                        }
                        signOut();
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      if (typeof document !== "undefined") {
                        document.body.style.overflow = "unset";
                      }
                      signIn("github", { callbackUrl: "/dashboard" });
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg active:scale-[0.98]"
                  >
                    <span>Sign in with GitHub</span>
                    <ArrowRight size={15} />
                  </button>

                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setOpen(false);
                      if (typeof document !== "undefined") {
                        document.body.style.overflow = "unset";
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-medium text-zinc-300 hover:text-white transition-colors"
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
