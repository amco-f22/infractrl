"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Menu, X, ArrowRight, User, LogOut } from "lucide-react";

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

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#000000]/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <BrandLogo size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="grid place-items-center w-9 h-9 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
            aria-label="GitHub repository"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white text-[#000000] hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <span>Dashboard</span>
                <ArrowRight size={14} />
              </Link>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-white text-[#000000] hover:bg-zinc-200 transition-colors"
            >
              Sign in with GitHub
            </button>
          )}
        </div>

        <button
          className="md:hidden grid place-items-center w-9 h-9 rounded-lg border border-white/10 text-zinc-300"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#000000]/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          {session?.user ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-semibold px-4 py-2 rounded-lg bg-white text-[#000000]"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                signIn("github", { callbackUrl: "/dashboard" });
              }}
              className="w-full text-center text-sm font-semibold px-4 py-2 rounded-lg bg-white text-[#000000]"
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      )}
    </header>
  );
}
