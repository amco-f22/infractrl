"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Database, HardDrive, Archive, Copy, ChevronRight, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const RESOURCE_ICONS = { postgres: Database, redis: HardDrive, s3: Archive };
const RESOURCE_COLORS = { postgres: "#60a5fa", redis: "#f87171", s3: "#fbbf24" };

export default function OnboardingPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloningEmail] = useState(null);
  const [result, setResult] = useState(null);
  const [targetName, setTargetName] = useState("");
  const [targetEmail, setTargetEmail] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API_URL}/api/team/members-with-resources`)
      .then(res => res.json())
      .then(data => setMembers(data.members || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleClone = async (sourceEmail) => {
    if (!targetName.trim() || !targetEmail.trim()) return;

    setCloningEmail(sourceEmail);
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
      }
    } catch (err) {
      console.error("Clone failed:", err);
    } finally {
      setCloningEmail(null);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-2 border-t-transparent rounded-full"
          style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: '#64748b' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex p-3 rounded-2xl mb-4" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            <Users size={32} style={{ color: '#a78bfa' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Clone a Teammate&apos;s Setup</h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: '#64748b' }}>
            Get started in 30 seconds — clone an existing team member&apos;s environment instead of configuring from scratch.
          </p>
        </motion.div>

        {/* Success state */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center"
              style={{ border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 0 40px rgba(16,185,129,0.15)' }}>
              <CheckCircle size={40} style={{ color: '#34d399', margin: '0 auto 12px' }} />
              <h2 className="text-xl font-bold text-white mb-2">Setup Cloned!</h2>
              <p className="text-sm mb-1" style={{ color: '#6ee7b7' }}>
                {result.cloned_count} resource{result.cloned_count > 1 ? 's' : ''} are now provisioning.
              </p>
              <p className="text-sm mb-4" style={{ color: '#6ee7b7' }}>
                Estimated cost: <span className="font-bold">${result.estimated_cost}/mo</span>
              </p>
              <button onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                View Dashboard <ChevronRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Your info section */}
        {!result && (
          <>
            <div className="glass-card-solid p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#64748b' }}>Your Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Name</label>
                  <input type="text" value={targetName} onChange={e => setTargetName(e.target.value)}
                    className="input-field" placeholder="Your Name" required />
                </div>
                <div>
                  <label className="label-text">Email</label>
                  <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)}
                    className="input-field" placeholder="you@example.com" required />
                </div>
              </div>
            </div>

            {/* Team member cards */}
            {members.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Users size={36} style={{ color: '#334155', margin: '0 auto 12px' }} />
                <p className="text-sm" style={{ color: '#64748b' }}>No team members with active resources found.</p>
                <Link href="/" className="text-sm font-medium mt-3 inline-block" style={{ color: '#60a5fa' }}>
                  Create your own setup →
                </Link>
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map((member) => (
                  <motion.div key={member.email} variants={itemVariants}
                    className="glass-card p-5 transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{member.name}</p>
                        <p className="text-xs" style={{ color: '#64748b' }}>{member.email}</p>
                      </div>
                    </div>

                    {/* Resource badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {member.resource_types.map(type => {
                        const Ic = RESOURCE_ICONS[type] || Database;
                        return (
                          <span key={type} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ background: `${RESOURCE_COLORS[type] || '#64748b'}15`, color: RESOURCE_COLORS[type] || '#94a3b8',
                                     border: `1px solid ${RESOURCE_COLORS[type] || '#64748b'}30` }}>
                            <Ic size={10} /> {type}
                          </span>
                        );
                      })}
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between items-center mb-4 py-2"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs" style={{ color: '#64748b' }}>{member.resource_count} resource{member.resource_count > 1 ? 's' : ''}</span>
                      <span className="text-sm font-bold text-white">${member.total_cost}/mo</span>
                    </div>

                    {/* Clone button */}
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => handleClone(member.email)}
                      disabled={cloning === member.email || !targetName || !targetEmail}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                      style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}>
                      {cloning === member.email ? (
                        <><Loader2 size={14} className="animate-spin" /> Cloning...</>
                      ) : (
                        <><Copy size={14} /> Clone This Setup</>
                      )}
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Skip */}
            <div className="text-center">
              <Link href="/" className="text-sm font-medium" style={{ color: '#64748b' }}>
                Skip — I&apos;ll set up manually →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
