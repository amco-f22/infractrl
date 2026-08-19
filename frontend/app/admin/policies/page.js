"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Shield, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Zap, 
  Clock, 
  Filter, 
  Layers, 
  Sparkles,
  X
} from 'lucide-react';

export default function PolicyAdmin() {
  const { data: session } = useSession();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', text: '' }
  
  const [policy, setPolicy] = useState({
    name: '',
    description: '',
    priority: 50,
    conditions: [{ field: '', operator: 'eq', value: '', logic_gate: 'AND' }],
    action_type: 'auto_approved',
    reason_template: ''
  });

  const fields = ['environment', 'instance_size', 'resource_type', 'estimated_cost', 'requester_email'];
  const operators = [
    { value: 'eq', label: 'Equals' },
    { value: 'ne', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'lt', label: 'Less Than' },
    { value: 'gte', label: 'Greater Than or Equal' },
    { value: 'lte', label: 'Less Than or Equal' },
    { value: 'in', label: 'In (comma-separated)' },
    { value: 'contains', label: 'Contains' }
  ];
  const actions = [
    { value: 'auto_approved', label: 'Auto-Approve', color: 'green' },
    { value: 'pending_approval', label: 'Pending Approval', color: 'amber' },
    { value: 'auto_denied', label: 'Auto-Deny', color: 'red' }
  ];

  useEffect(() => {
    if (session?.user?.email) {
      fetchPolicies();
    }
  }, [session]);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchPolicies = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/backend/admin/policies', {
        headers: { 'x-user-email': session.user.email }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPolicies(data);
        } else {
          console.error("API did not return an array", data);
          setPolicies([]);
        }
      }
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to load policies from server');
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setPolicy({
      ...policy,
      conditions: [...policy.conditions, { field: '', operator: 'eq', value: '', logic_gate: 'AND' }]
    });
  };

  const removeCondition = (index) => {
    if (policy.conditions.length <= 1) return;
    const newConditions = policy.conditions.filter((_, i) => i !== index);
    setPolicy({ ...policy, conditions: newConditions });
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...policy.conditions];
    newConditions[index][field] = value;
    setPolicy({ ...policy, conditions: newConditions });
  };

  // Strict validation logic to prevent empty or incomplete form submissions
  const validConditions = policy.conditions.filter(c => c.field && c.value.trim().length > 0);
  const isNameValid = policy.name.trim().length > 0;
  const isDescValid = policy.description.trim().length > 0;
  const isReasonValid = policy.reason_template.trim().length > 0;
  const hasValidConditions = validConditions.length > 0 && validConditions.length === policy.conditions.length;
  const isFormValid = isNameValid && isDescValid && isReasonValid && hasValidConditions;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!isNameValid) {
      showNotification('error', 'Please provide a policy name.');
      return;
    }
    if (!isDescValid) {
      showNotification('error', 'Please provide a policy description.');
      return;
    }
    if (!hasValidConditions) {
      showNotification('error', 'Please complete all conditions (select field, operator, and enter value).');
      return;
    }
    if (!isReasonValid) {
      showNotification('error', 'Please provide a reason message for the action.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: policy.name.trim(),
        description: policy.description.trim(),
        priority: Number(policy.priority) || 50,
        conditions: validConditions.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value.trim(),
          logic_gate: c.logic_gate || 'AND'
        })),
        actions: [{ 
          action_type: policy.action_type, 
          reason_template: policy.reason_template.trim() 
        }]
      };
      
      const res = await fetch('/api/backend/admin/policies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': session?.user?.email || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showNotification('success', `Policy "${policy.name}" deployed successfully!`);
        setPolicy({
          name: '',
          description: '',
          priority: 50,
          conditions: [{ field: '', operator: 'eq', value: '', logic_gate: 'AND' }],
          action_type: 'auto_approved',
          reason_template: ''
        });
        fetchPolicies();
      } else {
        const err = await res.json();
        showNotification('error', err.detail || 'Failed to create policy');
      }
    } catch (e) {
      console.error(e);
      showNotification('error', 'Network error creating policy');
    } finally {
      setSubmitting(false);
    }
  };

  const deletePolicy = async (id, policyName) => {
    if (!confirm(`Are you sure you want to revoke policy "${policyName}"?`)) return;
    try {
      const res = await fetch(`/api/backend/admin/policies/${id}`, { 
        method: 'DELETE',
        headers: { 'x-user-email': session?.user?.email || '' }
      });
      if (res.ok) {
        showNotification('success', `Policy "${policyName}" revoked`);
        fetchPolicies();
      } else {
        showNotification('error', 'Failed to delete policy');
      }
    } catch (e) {
      console.error(e);
      showNotification('error', 'Network error revoking policy');
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white pt-20 pb-16 px-4 sm:px-6 antialiased overflow-x-hidden selection:bg-indigo-500/30">
      {/* Background Grid & Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[350px] rounded-full bg-gradient-to-r from-indigo-500/[0.05] via-purple-500/[0.05] to-cyan-500/[0.05] blur-[150px]" />

      {/* Floating Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4 ${
          notification.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-950/80 border-red-500/30 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{notification.text}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-zinc-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Console Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-mono transition-colors group"
              >
                <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
                <span>Console Dashboard</span>
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400 font-mono">
                Policy Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-white flex items-center gap-3">
              Governance & Policies
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Configure dynamic constraints, fast lanes, and automated guardrails for cloud requests.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Engine Online
            </span>
          </div>
        </div>
      
        {/* Main 2-Column Dashboard Layout with Independent Scrolling */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Create New Policy Form (Sticky & Non-Scrolling) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Sparkles size={17} className="text-indigo-400" />
                Create New Policy
              </h2>
              <span className="text-[11px] font-mono text-zinc-500">Auto-evaluates real-time</span>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col gap-5">
              
              {/* Section 1: Policy Details */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 font-mono flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">1</span>
                  Policy Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium mb-1 text-zinc-400">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                      placeholder="e.g., Dev Fast Lane"
                      value={policy.name}
                      onChange={(e) => setPolicy({...policy, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium mb-1 text-zinc-400 flex justify-between">
                      <span>Priority (0-100)</span>
                      <span className="text-zinc-500 text-[10px]">High = First</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                      value={policy.priority}
                      onChange={(e) => setPolicy({...policy, priority: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium mb-1 text-zinc-400">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                    placeholder="Brief explanation of policy intent..."
                    value={policy.description}
                    onChange={(e) => setPolicy({...policy, description: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="h-px bg-white/5 w-full" />

              {/* Section 2: Conditions Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">2</span>
                    Conditions <span className="text-red-400">*</span>
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">ALL must match</span>
                </div>

                <div className="space-y-2.5">
                  {policy.conditions.map((cond, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 bg-black/30 rounded-2xl border border-white/5 relative group">
                      <div className="flex items-center justify-between gap-2">
                        {idx > 0 ? (
                          <select
                            className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-indigo-500/50"
                            value={cond.logic_gate}
                            onChange={(e) => updateCondition(idx, 'logic_gate', e.target.value)}
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded">
                            Rule {idx + 1}
                          </span>
                        )}

                        {policy.conditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCondition(idx)}
                            className="text-zinc-500 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                            title="Remove condition"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          className={`bg-black/50 border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 ${
                            !cond.field ? 'border-amber-500/30' : 'border-white/10'
                          }`}
                          value={cond.field}
                          onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                          required
                        >
                          <option value="">Field...</option>
                          {fields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>

                        <select
                          className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                          value={cond.operator}
                          onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                        >
                          {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>

                        <input
                          className={`bg-black/50 border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 ${
                            !cond.value.trim() ? 'border-amber-500/30' : 'border-white/10'
                          }`}
                          placeholder="Value (e.g. dev, 20)"
                          value={cond.value}
                          onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCondition}
                    className="inline-flex items-center gap-1.5 text-indigo-400 text-xs hover:text-indigo-300 font-medium px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                  >
                    <Plus size={13} />
                    <span>Add Condition</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/5 w-full" />

              {/* Section 3: Action Execution */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 font-mono flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">3</span>
                  Decision Action
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-zinc-400">If matched, do:</label>
                    <select
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                      value={policy.action_type}
                      onChange={(e) => setPolicy({...policy, action_type: e.target.value})}
                    >
                      {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-zinc-400">
                      Reason Message <span className="text-red-400">*</span>
                    </label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                      placeholder="e.g., Fast lane approved"
                      value={policy.reason_template}
                      onChange={(e) => setPolicy({...policy, reason_template: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Validation Warning when incomplete */}
              {!isFormValid && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 text-amber-300/80 text-[11px]">
                  <AlertCircle size={14} className="shrink-0 text-amber-400" />
                  <span>Fill in all required fields marked with * to deploy.</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className={`w-full py-3 px-5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
                  isFormValid && !submitting
                    ? 'bg-white text-black hover:bg-zinc-200 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]'
                    : 'bg-white/10 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <span>Deploying Policy...</span>
                  </>
                ) : (
                  <>
                    <Shield size={14} />
                    <span>Deploy Policy Rule</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: Active Policies (Independent Scrollable Container) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2.5">
                <Layers size={18} className="text-cyan-400" />
                Active Policies
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  {policies.length} rules
                </span>
              </h2>
              <span className="text-[11px] text-zinc-500 font-mono">Evaluated in priority order</span>
            </div>
            
            {/* Scrollable Container with custom scrollbar */}
            <div className="space-y-4 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto pr-2 custom-scrollbar">
              {loading && (
                <div className="p-12 text-center border border-white/5 rounded-3xl bg-white/[0.01]">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-zinc-400 font-mono">Syncing policy state...</p>
                </div>
              )}

              {!loading && policies.length === 0 && (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01] text-zinc-500">
                  <Shield size={28} className="mx-auto mb-2 opacity-30 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-300">No active policies</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    Create your first rule on the left to enforce governance over self-service infrastructure.
                  </p>
                </div>
              )}

              {!loading && policies.map(p => (
                <div 
                  key={p.id} 
                  className="group bg-white/[0.02] border border-white/5 hover:border-white/15 rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:bg-white/[0.03] backdrop-blur-sm"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h4 className="text-base font-semibold text-white tracking-tight">{p.name}</h4>
                        <span className="text-[10px] uppercase font-mono tracking-wider bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded-full">
                          Pri: {p.priority}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
                    </div>

                    <button 
                      onClick={() => deletePolicy(p.id, p.name)} 
                      className="text-red-400/60 hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-mono opacity-0 group-hover:opacity-100 shrink-0"
                      title="Revoke and delete this policy rule"
                    >
                      Revoke
                    </button>
                  </div>
                  
                  {/* Visual Policy Logic Representation */}
                  <div className="mt-4 bg-black/50 border border-white/5 p-3.5 rounded-2xl font-mono text-xs text-zinc-300">
                    <div className="text-indigo-400/90 mb-1.5 font-semibold text-[10px] tracking-wider uppercase">IF Conditions:</div>
                    <div className="space-y-1 pl-2">
                      {p.conditions.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap text-[11px]">
                          {i > 0 && <span className="text-zinc-500 font-bold">{c.logic_gate}</span>}
                          <span className="text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">{c.field}</span> 
                          <span className="text-zinc-500 font-sans text-xs">{c.operator}</span> 
                          <span className="text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">"{c.value}"</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-indigo-400/90 mt-3 mb-1.5 font-semibold text-[10px] tracking-wider uppercase">THEN Action:</div>
                    <div className="pl-2 flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 ${
                        p.actions[0]?.action_type === 'auto_approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        p.actions[0]?.action_type === 'pending_approval' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {p.actions[0]?.action_type === 'auto_approved' ? <Zap size={12} /> :
                         p.actions[0]?.action_type === 'pending_approval' ? <Clock size={12} /> :
                         <AlertCircle size={12} />}
                        <span>{p.actions[0]?.action_type}</span>
                      </span>

                      {p.actions[0]?.reason_template && (
                        <span className="text-zinc-400 text-[11px] italic">
                          "{p.actions[0].reason_template}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
