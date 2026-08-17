"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-8 w-24 rounded-lg bg-white/[0.04] animate-pulse border border-white/[0.05]" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          {session.user.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={session.user.image}
              alt=""
              className="w-5 h-5 rounded-full ring-1 ring-emerald-500/40"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <User size={12} />
            </div>
          )}
          <span className="text-xs font-medium text-slate-300 max-w-[100px] truncate hidden md:inline-block">
            {session.user.name || session.user.email}
          </span>
        </div>

        <button
          onClick={() => signOut()}
          className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
          title="Sign Out"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="btn-startup flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      <span>Sign In</span>
    </button>
  );
}
