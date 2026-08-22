"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Database,
  HardDrive,
  Archive,
  CheckCircle,
  ArrowLeft,
  Zap,
  Sparkles,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const RESOURCE_ICONS = { postgres: Database, redis: HardDrive, s3: Archive };
const RESOURCE_COLORS = { postgres: "text-cyan-300", redis: "text-rose-300", s3: "text-amber-300" };

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloningEmail] = useState(null);
  const [result, setResult] = useState(null);
  const [targetName, setTargetName] = useState("");
  const [targetEmail, setTargetEmail] = useState("");

  const API_URL = "/api/backend";

  useEffect(() => {
    fetch(`${API_URL}/api/team/members-with-resources`)
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [API_URL]);

  const handleClone = async (sourceEmail) => {
    if (!targetName.trim() || !targetEmail.trim()) {
      toast.error("Please provide both your name and work email to clone this setup");
      return;
    }

    setCloningEmail(sourceEmail);
    const toastId = toast.loading(`Cloning infrastructure stack from ${sourceEmail}...`);

    try {
      const res = await fetch(`${API_URL}/api/requests/clone-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_email: sourceEmail,
          target_name: targetName,
          target_email: targetEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success(`Successfully cloned ${data.cloned_count} resource(s)!`, { id: toastId });
      } else {
        toast.error(data.detail || "Clone failed", { id: toastId });
      }
    } catch {
      toast.error("Network error during cloning", { id: toastId });
    } finally {
      setCloningEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="text-xs font-mono text-zinc-500">Loading team topologies…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white pt-24 pb-20 px-6 antialiased overflow-x-hidden selection:bg-cyan-400/30">
      {/* Background Grid & Glows matching logo */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-gradient-to-r from-green-500/[0.08] to-cyan-500/[0.08] blur-[150px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto space-y-8"
      >
        {/* Back Link */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-green-300 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to Fleet Dashboard</span>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-2 max-w-xl mx-auto">
          <span className="grid place-items-center w-11 h-11 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Users size={20} />
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
            Clone a Teammate&apos;s Infrastructure
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Spin up an identical development environment with 1-click. Copies all databases, caching layers, and Terraform configurations automatically.
          </p>
        </motion.div>

        {/* Identity input card */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Sparkles size={15} className="text-cyan-300 animate-pulse" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Your Recipient Identity
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Rivera"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs bg-white/[0.03] border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                placeholder="e.g. alex@company.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs bg-white/[0.03] border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50 font-mono"
              />
            </div>
          </div>
        </motion.div>

        {/* Success banner */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={springTransition}
              className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-3"
            >
              <CheckCircle size={32} className="text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-base font-semibold text-white">Stack Cloned Successfully!</h2>
                <p className="text-xs text-zinc-300 mt-1">
                  Triggered provisioning for <strong className="text-emerald-300">{result.cloned_count}</strong> new cloud resource(s).
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-lg"
              >
                <span>View Live in Dashboard</span>
                <ChevronRight size={14} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Members list */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold">
            Available Teammate Stacks ({members.length})
          </h2>

          {members.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-12 text-center text-xs text-zinc-500 font-mono">
              No active team stacks found to clone.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((member) => (
                <motion.div
                  key={member.email}
                  whileHover={{ y: -2 }}
                  transition={springTransition}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 space-y-4 flex flex-col justify-between hover:border-white/20 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{member.name || member.email}</h3>
                        <p className="text-xs font-mono text-zinc-500 mt-0.5">{member.email}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-cyan-300">
                        {member.resource_count} resource{member.resource_count > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Resource chips */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {(member.resources && member.resources.length > 0
                        ? member.resources
                        : (member.resource_types || []).map((t) => ({ resource_type: t, environment: "dev" }))
                      ).map((res, i) => {
                        const type = typeof res === "string" ? res : res.resource_type;
                        const env = typeof res === "object" ? res.environment : "dev";
                        const Icon = RESOURCE_ICONS[type] || Database;
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-xs font-mono text-zinc-300"
                          >
                            <Icon size={12} className={RESOURCE_COLORS[type] || "text-cyan-300"} />
                            <span className="capitalize">{type}</span>
                            {env && <span className="text-[10px] text-zinc-500 font-mono">({env})</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springTransition}
                    onClick={() => handleClone(member.email)}
                    disabled={cloning === member.email}
                    className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-2 mt-4"
                  >
                    {cloning === member.email ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Cloning Stack...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        <span>Clone This Setup</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
