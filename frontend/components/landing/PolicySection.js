"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Zap, 
  SlidersHorizontal, 
  Lock, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  Database,
  Server,
  DollarSign,
  UserCheck
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

const SCENARIOS = [
  {
    id: "dev-fastlane",
    tabLabel: "Dev Sandbox",
    badge: "Auto-Approved",
    badgeColor: "emerald",
    icon: Zap,
    request: {
      resource: "PostgreSQL Database",
      environment: "dev",
      instance_size: "small (db.t4g.micro)",
      estimated_cost: "$15.00 / mo",
      requester: "developer@company.com",
    },
    policyTriggered: {
      name: "Dev Fast Lane",
      priority: 20,
      rule: "environment == 'dev' AND instance_size == 'small'",
      action: "AUTO_APPROVED",
      reason: "Safe sandbox resource. Auto-approved with 24-hour auto-teardown policy.",
      time: "42ms",
    },
    outcome: {
      status: "Approved Instantly",
      title: "Direct to Terraform Runner",
      description: "0 tickets, 0 human latency. Terraform provisioning started immediately via GitHub Actions OIDC.",
      accent: "from-emerald-400 to-teal-400",
      glowColor: "rgba(16, 185, 129, 0.15)",
      borderColor: "border-emerald-500/30 bg-emerald-500/[0.04]",
      textColor: "text-emerald-400",
    }
  },
  {
    id: "prod-gateway",
    tabLabel: "Production Database",
    badge: "Pending Review",
    badgeColor: "amber",
    icon: Clock,
    request: {
      resource: "PostgreSQL Database",
      environment: "prod",
      instance_size: "medium (db.m6g.large)",
      estimated_cost: "$142.00 / mo",
      requester: "lead-dev@company.com",
    },
    policyTriggered: {
      name: "Production Gate",
      priority: 90,
      rule: "environment == 'prod'",
      action: "PENDING_APPROVAL",
      reason: "Production tier infrastructure requires platform engineering sign-off.",
      time: "38ms",
    },
    outcome: {
      status: "Review Required",
      title: "Routed to Platform Admin",
      description: "Triggered audit alert with estimated monthly cost preview and 1-click Slack approve button.",
      accent: "from-amber-400 to-orange-400",
      glowColor: "rgba(245, 158, 11, 0.15)",
      borderColor: "border-amber-500/30 bg-amber-500/[0.04]",
      textColor: "text-amber-400",
    }
  },
  {
    id: "cost-guardrail",
    tabLabel: "Oversized Dev Instance",
    badge: "Auto-Denied",
    badgeColor: "rose",
    icon: XCircle,
    request: {
      resource: "Redis Cluster",
      environment: "dev",
      instance_size: "large (cache.r6g.2xlarge)",
      estimated_cost: "$380.00 / mo",
      requester: "contractor@company.com",
    },
    policyTriggered: {
      name: "Hard Cost Ceiling",
      priority: 10,
      rule: "instance_size == 'large' OR estimated_cost > $200",
      action: "AUTO_DENIED",
      reason: "Exceeds dev tier maximum budget threshold ($200.00). Requires manager budget allocation.",
      time: "29ms",
    },
    outcome: {
      status: "Blocked by Policy",
      title: "Budget Ceiling Protected",
      description: "Prevented runaway cloud bill shock before Terraform is ever executed. Reason logged to fleet audit.",
      accent: "from-rose-400 to-red-500",
      glowColor: "rgba(244, 63, 94, 0.15)",
      borderColor: "border-rose-500/30 bg-rose-500/[0.04]",
      textColor: "text-rose-400",
    }
  }
];

export default function PolicySection() {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);

  return (
    <section id="policies" className="relative py-16 sm:py-24 md:py-32 border-t border-white/5 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[350px] sm:h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-purple-500/10 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Heading */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/[0.06] text-cyan-300 text-xs font-mono mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autonomous Governance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-white">
            Guardrails without the{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              DevOps red tape
            </span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
            Self-service shouldn&apos;t create cloud chaos. InfraCtrl evaluates every infrastructure request against configurable policy rules in real-time — auto-approving safe sandboxes, enforcing reviews for production, and blocking cost blowouts.
          </p>
        </div>

        {/* Live Interactive Policy Simulator */}
        <div className="mt-10 sm:mt-12">
          {/* Scenario Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 max-w-fit mb-6">
            {SCENARIOS.map((scenario) => {
              const isActive = activeScenario.id === scenario.id;
              const Icon = scenario.icon;
              return (
                <button
                  key={scenario.id}
                  onClick={() => setActiveScenario(scenario)}
                  className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? "text-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.08)] border border-white/15" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    scenario.badgeColor === "emerald" ? "text-emerald-400" :
                    scenario.badgeColor === "amber" ? "text-amber-400" : "text-rose-400"
                  }`} />
                  <span>{scenario.tabLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Simulator Interactive Board */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScenario.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <SpotlightCard
                spotlightColor={activeScenario.outcome.glowColor}
                className={`rounded-3xl border ${activeScenario.outcome.borderColor} p-5 sm:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                  {/* Left: Incoming Request Payload */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                        Incoming Request
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        JSON Payload
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs space-y-2.5">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-zinc-500">resource:</span>
                        <span className="text-white font-medium">{activeScenario.request.resource}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-zinc-500">environment:</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          activeScenario.request.environment === "prod" 
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" 
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}>
                          {activeScenario.request.environment}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-zinc-500">instance_size:</span>
                        <span className="text-zinc-200">{activeScenario.request.instance_size}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-zinc-500">estimated_cost:</span>
                        <span className="text-cyan-300 font-semibold">{activeScenario.request.estimated_cost}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-white/5">
                        <span className="text-zinc-500">requester:</span>
                        <span className="text-zinc-400 text-[10px] truncate max-w-[150px]">{activeScenario.request.requester}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Policy Evaluator Engine */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                        Engine Evaluation
                      </span>
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {activeScenario.policyTriggered.time}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-white">
                          {activeScenario.policyTriggered.name}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                          Priority {activeScenario.policyTriggered.priority}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[11px] text-cyan-300">
                        <span className="text-zinc-500">rule: </span>
                        {activeScenario.policyTriggered.rule}
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {activeScenario.policyTriggered.reason}
                      </p>
                    </div>
                  </div>

                  {/* Right: Decision Output & Action */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                        Action Output
                      </span>
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${activeScenario.outcome.borderColor} ${activeScenario.outcome.textColor}`}>
                        {activeScenario.policyTriggered.action}
                      </span>
                    </div>

                    <div className={`rounded-2xl border ${activeScenario.outcome.borderColor} bg-black/60 p-5 space-y-2 text-left`}>
                      <div className="flex items-center gap-2">
                        {activeScenario.badgeColor === "emerald" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {activeScenario.badgeColor === "amber" && <Clock className="w-5 h-5 text-amber-400 shrink-0" />}
                        {activeScenario.badgeColor === "rose" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                        <h4 className="text-sm font-semibold text-white">
                          {activeScenario.outcome.title}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {activeScenario.outcome.description}
                      </p>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 3 Pillar Feature Cards */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <SpotlightCard
            spotlightColor="rgba(52, 211, 153, 0.15)"
            className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Zero-Friction Fast Lanes
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Safe dev sandboxes and small staging instances bypass queues automatically. Developers get working infrastructure in 5 minutes without opening a single ticket.
            </p>
          </SpotlightCard>

          <SpotlightCard
            spotlightColor="rgba(34, 211, 238, 0.15)"
            className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400 mb-4">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Multi-Attribute Logic Rules
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Construct granular rules targeting environment, instance tier, estimated hourly spend, or user identity using operators like <code className="text-cyan-300">eq</code>, <code className="text-cyan-300">gt</code>, and logical <code className="text-cyan-300">AND/OR</code> gates.
            </p>
          </SpotlightCard>

          <SpotlightCard
            spotlightColor="rgba(168, 85, 247, 0.15)"
            className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 grid place-items-center text-purple-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Hard Budget Ceilings
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Prevent surprise AWS bills with strict cost caps. Requests exceeding financial thresholds are halted before Terraform touches your cloud provider.
            </p>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}
