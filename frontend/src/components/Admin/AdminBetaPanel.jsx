import React, { useState, useEffect } from 'react';
import {
  X, Users, MessageSquare, TrendingUp, CheckCircle2, XCircle, AlertCircle,
  Clock, Star, Send, Sparkles, Shield, ShieldCheck, ArrowRight, ArrowLeft,
  Filter, RefreshCw, Check, Loader2, ChevronRight, Sliders, Smartphone,
  Lock, Layers, Cpu, Radio, Crown, Terminal, UserX, Bug, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPendingApplications,
  getAllApplications,
  approveBetaApplication,
  rejectBetaApplication,
  revokeBetaAccess,
  getAllFeedback,
  markFeedbackRead,
  respondToFeedback,
  getBetaStats,
  getAllFeatureFlags,
  updateFeatureFlag
} from '../../utils/adminBetaApi';

const DEFAULT_FEATURE_FLAGS = [
  {
    id: 1,
    name: 'stealth_vault',
    displayName: 'Neural Vault & Stealth v2',
    description: 'Zero-knowledge media encryption and hidden story vault.',
    enabledForBeta: true,
    enabledForAll: false
  },
  {
    id: 2,
    name: 'quantum_reels',
    displayName: 'Quantum Reels Rendering',
    description: 'Hardware-accelerated reel playback and dynamic shader effects.',
    enabledForBeta: true,
    enabledForAll: false
  },
  {
    id: 3,
    name: 'direct_engineer_telemetry',
    displayName: 'Direct Core Telemetry',
    description: 'Low-latency crash telemetry streamed to engineering sprints.',
    enabledForBeta: true,
    enabledForAll: true
  },
  {
    id: 4,
    name: 'holographic_badges',
    displayName: 'Vanguard Holographic VIP Emblem',
    description: 'Dynamic iridescent badge rendered across member profiles.',
    enabledForBeta: true,
    enabledForAll: false
  }
];

export default function AdminBetaPanel({ onClose }) {
  // Navigation: 'overview' | 'applications' | 'feedback' | 'features'
  const [activeTab, setActiveTab] = useState('overview');
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [features, setFeatures] = useState(DEFAULT_FEATURE_FLAGS);
  
  // Selection and Actions
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [applicationFilter, setApplicationFilter] = useState('PENDING'); // PENDING | ALL | APPROVED | REJECTED
  const [feedbackFilter, setFeedbackFilter] = useState('UNREAD'); // UNREAD | ALL

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: 'success', text: '' });

  // Feature flag slide state
  const [flagIndex, setFlagIndex] = useState(0);
  const [flagDirection, setFlagDirection] = useState(1);
  
  // Group features into pages of 2
  const flagPages = React.useMemo(() => {
    const list = features && features.length > 0 ? features : DEFAULT_FEATURE_FLAGS;
    const pages = [];
    for (let i = 0; i < list.length; i += 2) pages.push(list.slice(i, i + 2));
    return pages;
  }, [features]);

  // Smart pagination for candidates (only if > 4 items)
  const [candidatePageIndex, setCandidatePageIndex] = useState(0);
  const [candidatePageDirection, setCandidatePageDirection] = useState(1);
  
  // Smart pagination for feedback (only if > 4 items)
  const [feedbackPageIndex, setFeedbackPageIndex] = useState(0);
  const [feedbackPageDirection, setFeedbackPageDirection] = useState(1);
  
  const ITEMS_PER_PAGE = 2;

  // Group candidates into pages if > 4
  const candidatePages = React.useMemo(() => {
    if (applications.length <= 2) return null;
    const pages = [];
    for (let i = 0; i < applications.length; i += ITEMS_PER_PAGE) {
      pages.push(applications.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [applications]);

  // Group feedback into pages if > 4
  const feedbackPages = React.useMemo(() => {
    if (feedback.length <= 2) return null;
    const pages = [];
    for (let i = 0; i < feedback.length; i += ITEMS_PER_PAGE) {
      pages.push(feedback.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [feedback]);


  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => {
      setToast({ show: false, type: 'success', text: '' });
    }, 4000);
  };

  const changeTab = (newTab) => {
    const tabs = ['overview', 'applications', 'feedback', 'features'];
    const oldIdx = tabs.indexOf(activeTab);
    const newIdx = tabs.indexOf(newTab);
    setDirection(newIdx >= oldIdx ? 1 : -1);
    setActiveTab(newTab);
    setSelectedItem(null);
  };

  // Initial and reactive load
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(false); // silent auto-refresh
    }, 25000);
    return () => clearInterval(interval);
  }, [activeTab, applicationFilter, feedbackFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCandidatePageIndex(0);
  }, [applicationFilter]);

  useEffect(() => {
    setFeedbackPageIndex(0);
  }, [feedbackFilter]);

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      if (activeTab === 'overview') {
        const res = await getBetaStats();
        if (res.success && res.stats) setStats(res.stats);
      } else if (activeTab === 'applications') {
        const res = applicationFilter === 'PENDING'
          ? await getPendingApplications()
          : await getAllApplications(applicationFilter === 'ALL' ? null : applicationFilter);
        
        if (res.success && Array.isArray(res.applications)) {
          setApplications(res.applications);
        } else if (Array.isArray(res)) {
          setApplications(res);
        }
      } else if (activeTab === 'feedback') {
        const res = await getAllFeedback(feedbackFilter === 'UNREAD' ? { unread: true } : {});
        if (res.success && Array.isArray(res.feedback)) {
          setFeedback(res.feedback);
        }
      } else if (activeTab === 'features') {
        // Load from localStorage ONLY (don't overwrite with API defaults)
        const cached = localStorage.getItem('admin_feature_flags');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFeatures(parsed);
              return; // Don't fetch from API, use localStorage as source of truth
            }
          } catch (e) {
            console.warn('[ADMIN] LocalStorage parse failed:', e);
          }
        }
        
        // Only fetch from API if localStorage is empty (first time)
        const res = await getAllFeatureFlags();
        if (res && res.success && Array.isArray(res.flags) && res.flags.length > 0) {
          setFeatures(res.flags);
          // Save initial state to localStorage
          try {
            localStorage.setItem('admin_feature_flags', JSON.stringify(res.flags));
          } catch (e) {
            console.warn('[ADMIN] LocalStorage save failed:', e);
          }
        }
      }
    } catch (err) {
      console.warn('[ADMIN] Data synchronization warning:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Approve action
  const handleApprove = async (applicationId, notes = '') => {
    setActionLoadingId(applicationId);
    try {
      const res = await approveBetaApplication(applicationId, notes);
      if (res.success !== false) {
        showToast('success', 'Candidate approved. Vanguard beta credentials granted.');
        // Update local state immediately for instant feedback
        setApplications((prev) => prev.filter((a) => a.id !== applicationId));
        setSelectedItem(null);
        loadData(false);
      } else {
        showToast('error', res.error || 'Failed to approve application.');
      }
    } catch (err) {
      showToast('error', 'Network error during approval.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject action
  const handleReject = async (applicationId, reason = '') => {
    setActionLoadingId(applicationId);
    try {
      const res = await rejectBetaApplication(applicationId, reason);
      if (res.success !== false) {
        showToast('info', 'Application flagged as rejected.');
        setApplications((prev) => prev.filter((a) => a.id !== applicationId));
        setSelectedItem(null);
        loadData(false);
      } else {
        showToast('error', res.error || 'Failed to reject application.');
      }
    } catch (err) {
      showToast('error', 'Network error during rejection.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Revoke beta access
  const handleRevoke = async (userId, reason = '', applicationId = null) => {
    setActionLoadingId(userId || applicationId);
    try {
      const res = await revokeBetaAccess(userId, reason, applicationId);
      if (res.success !== false) {
        showToast('info', 'Beta tester access revoked.');
        setSelectedItem(null);
        loadData(false);
      } else {
        showToast('error', res.error || 'Failed to revoke access.');
      }
    } catch (err) {
      showToast('error', 'Network error during revocation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Respond to feedback
  const handleRespondFeedback = async (feedbackId, responseText) => {
    setActionLoadingId(feedbackId);
    try {
      const res = await respondToFeedback(feedbackId, responseText, 'RESOLVED');
      if (res.success !== false) {
        showToast('success', 'Engineer response transmitted to beta tester.');
        setFeedback((prev) => prev.filter((f) => f.id !== feedbackId));
        setSelectedItem(null);
        loadData(false);
      } else {
        showToast('error', res.error || 'Failed to transmit response.');
      }
    } catch (err) {
      showToast('error', 'Network error transmitting response.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle feature flag
  const handleToggleFeature = async (featureId, field, currentValue) => {
    const nextValue = !currentValue;
    const targetFlag = features.find((f) => f.id === featureId);

    // Optimistic UI update
    const updatedFeatures = features.map((f) => 
      f.id === featureId ? { ...f, [field]: nextValue } : f
    );
    setFeatures(updatedFeatures);
    
    // Persist to localStorage
    try {
      localStorage.setItem('admin_feature_flags', JSON.stringify(updatedFeatures));
    } catch (e) {
      console.warn('[ADMIN] LocalStorage save failed:', e);
    }

    try {
      const res = await updateFeatureFlag(
        featureId,
        field === 'enabledForBeta' ? nextValue : undefined,
        field === 'enabledForAll' ? nextValue : undefined,
        targetFlag?.name
      );
      if (res && res.success !== false) {
        showToast('success', 'Feature rollout protocol synchronized.');
      } else {
        console.warn('[ADMIN] Feature flag sync notice:', res?.error);
        showToast('info', 'Feature rollout updated.');
      }
    } catch (err) {
      console.warn('[ADMIN] Feature flag network warning:', err);
      showToast('info', 'Feature rollout updated.');
    }
  };

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
      scale: 0.99
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (dir) => ({
      x: dir < 0 ? 40 : -40,
      opacity: 0,
      scale: 0.99,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#050608] text-white overflow-hidden select-none p-3">
      {/* Ambient Cyberpunk Glow Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[160px] animate-pulse" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute bottom-[-100px] right-[-100px] h-[500px] w-[500px] rounded-full bg-purple-500/12 blur-[170px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Floating Action Toast Banner */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 left-1/2 z-[250] -translate-x-1/2"
          >
            <div className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold shadow-2xl backdrop-blur-xl border ${
              toast.type === 'error'
                ? 'bg-red-500/20 text-red-300 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                : toast.type === 'info'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
            }`}>
              {toast.type === 'error' ? (
                <XCircle size={16} className="text-red-400" />
              ) : toast.type === 'info' ? (
                <AlertCircle size={16} className="text-amber-400" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-400" />
              )}
              <span>{toast.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Suite Header - FLOATING */}
      <header className="relative z-20 flex shrink-0 items-center justify-between border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-cyan-950/40 px-3 py-3 backdrop-blur-2xl rounded-2xl shadow-lg mb-3 md:px-8">
        {/* Subtle Sync Pulse line */}
        {(loading || refreshing) && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden bg-white/5">
            <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
          </div>
        )}

        {/* Brand identity */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <ShieldCheck size={22} className="text-black" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-white">Vanguard Command</span>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1 py-0.5 text-[7px] font-extrabold uppercase tracking-widest text-emerald-400">
                ADMIN CORE
              </span>
            </div>
            <p className="text-[10px] font-medium text-gray-500">
              {refreshing ? 'Synchronizing stream...' : 'Candidate Evaluation & Canary Rollouts'}
            </p>
          </div>
        </div>

        {/* Center Pill Nav Rail */}
        <div className="hidden md:flex items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
          {[
            { id: 'overview', label: 'Resonance', icon: TrendingUp },
            { id: 'applications', label: 'Candidates', icon: Users },
            { id: 'feedback', label: 'Telemetry', icon: MessageSquare }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive ? 'text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-active-tab-indicator"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
            title="Refresh Registry"
            aria-label="Refresh Registry"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
          </button>
          <button
            onClick={onClose}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Exit Admin Panel"
          >
            <X size={20} className="transition-transform group-hover:rotate-90" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom/Top Tab Rail - FLOATING */}
      <div className="flex md:hidden justify-center border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-teal-950/30 px-3 py-2 overflow-x-auto gap-2 hide-scrollbar rounded-xl mb-3 shadow-lg backdrop-blur-xl">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'applications', label: 'Candidates', icon: Users },
          { id: 'feedback', label: 'Telemetry', icon: MessageSquare }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                isActive
                  ? 'bg-emerald-400 text-black shadow-md'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Slide Workspace */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col py-1 px-0 md:py-4 md:px-0">
          <AnimatePresence custom={direction} mode="wait">
            {/* ══════════════════════════════════════════════════════════════════
                1. OVERVIEW / RESONANCE DECK
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex h-full flex-col overflow-hidden pb-3"
              >
                {/* 4 Metric Bento Cards - More compact */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-3 shrink-0 mb-3">
                  {[
                    {
                      label: 'Pending Reviews',
                      value: stats?.applications?.pending ?? 0,
                      icon: Clock,
                      color: 'amber',
                      tag: 'Awaiting Action',
                      action: () => {
                        setApplicationFilter('PENDING');
                        changeTab('applications');
                      }
                    },
                    {
                      label: 'Vanguard Testers',
                      value: stats?.betaTesters?.active ?? 0,
                      icon: ShieldCheck,
                      color: 'emerald',
                      tag: 'Active Cohort',
                      action: () => {
                        setApplicationFilter('APPROVED');
                        changeTab('applications');
                      }
                    },
                    {
                      label: 'Unread Telemetry',
                      value: stats?.feedback?.unread ?? 0,
                      icon: MessageSquare,
                      color: 'cyan',
                      tag: 'Bug Reports',
                      action: () => {
                        setFeedbackFilter('UNREAD');
                        changeTab('feedback');
                      }
                    },
                    {
                      label: 'Total Dossiers',
                      value: stats?.applications?.total ?? 0,
                      icon: Users,
                      color: 'purple',
                      tag: 'All Time',
                      action: () => {
                        setApplicationFilter('ALL');
                        changeTab('applications');
                      }
                    }
                  ].map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={idx}
                        onClick={card.action}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] p-2.5 transition-all hover:border-emerald-500/30 hover:bg-white/[0.05] active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                            {card.label}
                          </span>
                          <div className={`flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 ${
                            card.color === 'emerald' ? 'text-emerald-400' :
                            card.color === 'cyan' ? 'text-cyan-400' :
                            card.color === 'amber' ? 'text-amber-400' : 'text-purple-400'
                          }`}>
                            <Icon size={13} />
                          </div>
                        </div>
                        <div className="text-xl font-black text-white md:text-2xl tracking-tight">
                          {card.value}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[8px] font-semibold text-gray-500">{card.tag}</span>
                          <ChevronRight size={12} className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cohort Intake Capacity & Health Radar - More compact */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 shrink-0">
                  {/* Card 1: Cohort Intake Status */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Radio size={13} className="text-emerald-400 animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">
                          Cohort Allocation
                        </h3>
                      </div>
                      <span className="text-[9px] font-bold text-gray-400">Target: 500</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-gray-400">Capacity</span>
                        <span className="font-bold text-emerald-400">
                          {Math.min(100, Math.round(((stats?.betaTesters?.active ?? 0) / 500) * 100))}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                          style={{
                            width: `${Math.min(100, Math.max(8, Math.round(((stats?.betaTesters?.active ?? 0) / 500) * 100)))}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/[0.06]">
                      <div className="rounded-lg bg-white/[0.02] p-1.5 text-center">
                        <p className="text-[8px] uppercase font-bold text-gray-500">Approved</p>
                        <p className="text-xs font-black text-emerald-400">{stats?.applications?.approved ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.02] p-1.5 text-center">
                        <p className="text-[8px] uppercase font-bold text-gray-500">Pending</p>
                        <p className="text-xs font-black text-amber-400">{stats?.applications?.pending ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.02] p-1.5 text-center">
                        <p className="text-[8px] uppercase font-bold text-gray-500">Rejected</p>
                        <p className="text-xs font-black text-red-400">{stats?.applications?.rejected ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Quick Operations */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Terminal size={13} className="text-cyan-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">
                          Operator Quick Sprints
                        </h3>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                        Triage pending requests or deploy Canary rollouts.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setApplicationFilter('PENDING');
                          changeTab('applications');
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-[10px] font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-95"
                      >
                        <Users size={12} /> Review ({stats?.applications?.pending ?? 0})
                      </button>
                      <button
                        onClick={() => changeTab('features')}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-2 text-[10px] font-bold text-cyan-300 transition-all hover:bg-cyan-500/20 active:scale-95"
                      >
                        <Sliders size={12} /> Manage Flags
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                2. APPLICATIONS COHORT (SLIDE)
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'applications' && (
              <motion.div
                key="applications"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                {/* Filter bar */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="grid grid-cols-5 gap-1.5 flex-1">
                    {[
                      { id: 'PENDING', label: 'Pending' },
                      { id: 'ALL', label: 'All' },
                      { id: 'APPROVED', label: 'Approved' },
                      { id: 'REVOKED', label: 'Revoked' },
                      { id: 'REJECTED', label: 'Rejected' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setApplicationFilter(f.id)}
                        className={`rounded-xl px-1.5 py-1.5 text-[10px] font-bold transition-all text-center ${
                          applicationFilter === f.id
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] font-semibold text-gray-500 shrink-0 ml-1">
                    {applications.length}
                  </span>
                </div>

                {/* Applications list */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-emerald-400 mb-3" />
                    <p className="text-xs text-gray-400">Loading dossiers...</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
                    <Clock size={36} className="text-gray-600 mb-3" />
                    <h4 className="text-sm font-bold text-white">No applications in this view</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      {applicationFilter === 'PENDING'
                        ? 'Zero pending applications in queue. All candidates have been evaluated.'
                        : 'No applicant records match this filter.'}
                    </p>
                  </div>
                ) : candidatePages === null ? (
                  /* Render all items if <= 4 */
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {applications.map((app) => {
                      const isPending = app.status === 'PENDING';
                      const isApproved = app.status === 'APPROVED';
                      const isRejected = app.status === 'REJECTED';
                      const isRevoked = app.status === 'REVOKED';
                      const isActing = actionLoadingId === app.id;

                      return (
                        <div
                          key={app.id}
                          className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition-all hover:border-emerald-500/30 hover:bg-white/[0.04]"
                        >
                          <div>
                            {/* Card Top: User identity */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={app.user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.user?.username || app.fullName}`}
                                  className="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-cover bg-black"
                                  alt=""
                                />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-white truncate">{app.fullName}</h4>
                                  <p className="text-[10px] text-gray-400 truncate">@{app.user?.username || 'operator'}</p>
                                  <p className="text-[9px] text-gray-500 truncate">{app.email}</p>
                                </div>
                              </div>

                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                                isApproved
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : isRejected
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : isRevoked
                                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}>
                                {app.status}
                              </span>
                            </div>

                            {/* Motivation summary */}
                            <div className="rounded-xl bg-black/30 p-2.5 mb-3 border border-white/[0.04]">
                              <p className="text-[11px] leading-relaxed text-gray-300 line-clamp-2">
                                <span className="font-bold text-gray-400">Focus: </span>
                                {app.reasonForJoining}
                              </p>
                              {app.motivation && (
                                <p className="text-[10px] text-gray-500 line-clamp-1 mt-1 italic">
                                  "{app.motivation}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
                            <button
                              onClick={() => setSelectedItem(app)}
                              className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                            >
                              <span>Inspect Dossier</span>
                              <ChevronRight size={12} />
                            </button>

                            <div className="flex items-center gap-2">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleReject(app.id, 'Cohort capacity reached.')}
                                    disabled={isActing}
                                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-300 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleApprove(app.id, 'Candidate credentials verified.')}
                                    disabled={isActing}
                                    className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-[10px] font-bold text-black shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                  >
                                    {isActing ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <Check size={12} />
                                    )}
                                    <span>Accept</span>
                                  </button>
                                </>
                              )}

                              {isRevoked && (
                                <>
                                  <button
                                    onClick={() => handleReject(app.id, 'Candidate permanently rejected.')}
                                    disabled={isActing}
                                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-300 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleApprove(app.id, 'Candidate reinstated into Vanguard cohort.')}
                                    disabled={isActing}
                                    className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-[10px] font-bold text-black shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                  >
                                    {isActing ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <Check size={12} />
                                    )}
                                    <span>Re-Approve</span>
                                  </button>
                                </>
                              )}

                              {isApproved && (
                                <button
                                  onClick={() => handleRevoke(app.userId || app.user?.id, 'Admin revocation.', app.id)}
                                  disabled={isActing}
                                  className="rounded-xl border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[9px] font-bold text-red-400 transition-all hover:bg-red-500/10"
                                >
                                  Revoke Beta Access
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Smart pagination for > 4 items */
                  <div className="flex flex-col h-full">
                    {/* Arrow navigation + Progress dots */}
                    <div className="flex items-center justify-center gap-3 mb-3 shrink-0">
                      {/* Left Arrow */}
                      <button
                        onClick={() => { 
                          setCandidatePageDirection(-1); 
                          setCandidatePageIndex(i => Math.max(0, i - 1)); 
                        }}
                        disabled={candidatePageIndex === 0}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-gray-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-95"
                        aria-label="Previous page"
                      >
                        <ArrowLeft size={14} />
                      </button>

                      {/* Progress Dots */}
                      <div className="flex justify-center gap-1.5">
                        {candidatePages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => { 
                              setCandidatePageDirection(i > candidatePageIndex ? 1 : -1); 
                              setCandidatePageIndex(i); 
                            }}
                            className={`rounded-full transition-all duration-300 ${
                              i === candidatePageIndex ? 'w-5 h-1.5 bg-emerald-400' : 'w-1.5 h-1.5 bg-white/20'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Right Arrow */}
                      <button
                        onClick={() => { 
                          setCandidatePageDirection(1); 
                          setCandidatePageIndex(i => Math.min(candidatePages.length - 1, i + 1)); 
                        }}
                        disabled={candidatePageIndex === candidatePages.length - 1}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-gray-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-95"
                        aria-label="Next page"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    {/* Paginated content */}
                    <div className="overflow-hidden relative flex-1 mb-3">
                      <AnimatePresence custom={candidatePageDirection} mode="wait">
                        <motion.div
                          key={candidatePageIndex}
                          custom={candidatePageDirection}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="grid grid-cols-1 gap-3 md:grid-cols-2"
                        >
                          {candidatePages[candidatePageIndex]?.map((app) => {
                            const isPending = app.status === 'PENDING';
                            const isApproved = app.status === 'APPROVED';
                            const isRejected = app.status === 'REJECTED';
                            const isRevoked = app.status === 'REVOKED';
                            const isActing = actionLoadingId === app.id;

                            return (
                              <div
                                key={app.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition-all hover:border-emerald-500/30 hover:bg-white/[0.04]"
                              >
                                <div>
                                  {/* Card Top: User identity */}
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <img
                                        src={app.user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.user?.username || app.fullName}`}
                                        className="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-cover bg-black"
                                        alt=""
                                      />
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-white truncate">{app.fullName}</h4>
                                        <p className="text-[10px] text-gray-400 truncate">@{app.user?.username || 'operator'}</p>
                                        <p className="text-[9px] text-gray-500 truncate">{app.email}</p>
                                      </div>
                                    </div>

                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                                      isApproved
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : isRejected
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                        : isRevoked
                                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    }`}>
                                      {app.status}
                                    </span>
                                  </div>

                                  {/* Motivation summary */}
                                  <div className="rounded-xl bg-black/30 p-2.5 mb-3 border border-white/[0.04]">
                                    <p className="text-[11px] leading-relaxed text-gray-300 line-clamp-2">
                                      <span className="font-bold text-gray-400">Focus: </span>
                                      {app.reasonForJoining}
                                    </p>
                                    {app.motivation && (
                                      <p className="text-[10px] text-gray-500 line-clamp-1 mt-1 italic">
                                        "{app.motivation}"
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Card Actions */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
                                  <button
                                    onClick={() => setSelectedItem(app)}
                                    className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                  >
                                    <span>Inspect Dossier</span>
                                    <ChevronRight size={12} />
                                  </button>

                                  <div className="flex items-center gap-2">
                                    {isPending && (
                                      <>
                                        <button
                                          onClick={() => handleReject(app.id, 'Cohort capacity reached.')}
                                          disabled={isActing}
                                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-300 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          onClick={() => handleApprove(app.id, 'Candidate credentials verified.')}
                                          disabled={isActing}
                                          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-[10px] font-bold text-black shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                        >
                                          {isActing ? (
                                            <Loader2 size={12} className="animate-spin" />
                                          ) : (
                                            <Check size={12} />
                                          )}
                                          <span>Accept</span>
                                        </button>
                                      </>
                                    )}

                                    {isRevoked && (
                                      <>
                                        <button
                                          onClick={() => handleReject(app.id, 'Candidate permanently rejected.')}
                                          disabled={isActing}
                                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-300 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          onClick={() => handleApprove(app.id, 'Candidate reinstated into Vanguard cohort.')}
                                          disabled={isActing}
                                          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-[10px] font-bold text-black shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                        >
                                          {isActing ? (
                                            <Loader2 size={12} className="animate-spin" />
                                          ) : (
                                            <Check size={12} />
                                          )}
                                          <span>Re-Approve</span>
                                        </button>
                                      </>
                                    )}

                                    {isApproved && (
                                      <button
                                        onClick={() => handleRevoke(app.userId || app.user?.id, 'Admin revocation.', app.id)}
                                        disabled={isActing}
                                        className="rounded-xl border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[9px] font-bold text-red-400 transition-all hover:bg-red-500/10"
                                      >
                                        Revoke Beta Access
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                3. TELEMETRY & FEEDBACK (SLIDE)
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'feedback' && (
              <motion.div
                key="feedback"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                {/* Filter bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'UNREAD', label: 'Unread Only' },
                      { id: 'ALL', label: 'All Telemetry' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFeedbackFilter(f.id)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                          feedbackFilter === f.id
                            ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] font-semibold text-gray-500">
                    {feedback.length} Item{feedback.length === 1 ? '' : 's'}
                  </span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-cyan-400 mb-3" />
                    <p className="text-xs text-gray-400">Loading feedback stream...</p>
                  </div>
                ) : feedback.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
                    <MessageSquare size={36} className="text-gray-600 mb-3" />
                    <h4 className="text-sm font-bold text-white">No telemetry in this queue</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      All bug reports and feature ratings have been reviewed.
                    </p>
                  </div>
                ) : feedbackPages === null ? (
                  /* Render all items if <= 4 */
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {feedback.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition-all hover:border-cyan-500/30 hover:bg-white/[0.04]"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={item.user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user?.username}`}
                                className="h-7 w-7 rounded-lg border border-white/10 object-cover"
                                alt=""
                              />
                              <span className="text-xs font-bold text-white truncate">@{item.user?.username || 'tester'}</span>
                            </div>

                            {item.rating && (
                              <div className="flex items-center gap-0.5">
                                {[...Array(item.rating)].map((_, i) => (
                                  <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{item.title}</span>
                              {item.featureName && (
                                <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400 uppercase">
                                  {item.featureName}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-400 mt-1 line-clamp-3">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                          <span className="text-[9px] text-gray-500">
                            {new Date(item.submittedAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => setSelectedItem({ ...item, modalType: 'feedback' })}
                            className="flex items-center gap-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20"
                          >
                            <Send size={11} /> Reply & Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Smart pagination for > 4 items */
                  <div className="flex flex-col h-full">
                    {/* Arrow navigation + Progress dots */}
                    <div className="flex items-center justify-center gap-3 mb-3 shrink-0">
                      {/* Left Arrow */}
                      <button
                        onClick={() => { 
                          setFeedbackPageDirection(-1); 
                          setFeedbackPageIndex(i => Math.max(0, i - 1)); 
                        }}
                        disabled={feedbackPageIndex === 0}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-gray-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all active:scale-95"
                        aria-label="Previous page"
                      >
                        <ArrowLeft size={14} />
                      </button>

                      {/* Progress Dots */}
                      <div className="flex justify-center gap-1.5">
                        {feedbackPages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => { 
                              setFeedbackPageDirection(i > feedbackPageIndex ? 1 : -1); 
                              setFeedbackPageIndex(i); 
                            }}
                            className={`rounded-full transition-all duration-300 ${
                              i === feedbackPageIndex ? 'w-5 h-1.5 bg-cyan-400' : 'w-1.5 h-1.5 bg-white/20'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Right Arrow */}
                      <button
                        onClick={() => { 
                          setFeedbackPageDirection(1); 
                          setFeedbackPageIndex(i => Math.min(feedbackPages.length - 1, i + 1)); 
                        }}
                        disabled={feedbackPageIndex === feedbackPages.length - 1}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-gray-400 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all active:scale-95"
                        aria-label="Next page"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    {/* Paginated content */}
                    <div className="overflow-hidden relative flex-1 mb-3">
                      <AnimatePresence custom={feedbackPageDirection} mode="wait">
                        <motion.div
                          key={feedbackPageIndex}
                          custom={feedbackPageDirection}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="grid grid-cols-1 gap-3 md:grid-cols-2"
                        >
                          {feedbackPages[feedbackPageIndex]?.map((item) => (
                            <div
                              key={item.id}
                              className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition-all hover:border-cyan-500/30 hover:bg-white/[0.04]"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={item.user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user?.username}`}
                                      className="h-7 w-7 rounded-lg border border-white/10 object-cover"
                                      alt=""
                                    />
                                    <span className="text-xs font-bold text-white truncate">@{item.user?.username || 'tester'}</span>
                                  </div>

                                  {item.rating && (
                                    <div className="flex items-center gap-0.5">
                                      {[...Array(item.rating)].map((_, i) => (
                                        <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-white">{item.title}</span>
                                    {item.featureName && (
                                      <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400 uppercase">
                                        {item.featureName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-gray-400 mt-1 line-clamp-3">
                                    {item.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                <span className="text-[9px] text-gray-500">
                                  {new Date(item.submittedAt).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() => setSelectedItem({ ...item, modalType: 'feedback' })}
                                  className="flex items-center gap-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20"
                                >
                                  <Send size={11} /> Reply & Resolve
                                </button>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                4. CANARY FEATURE FLAGS (SLIDE)
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'features' && (
              <motion.div
                key="features"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex h-full flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2 shrink-0">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Live Feature Rollout Matrix
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Toggle cohort access per protocol.
                    </p>
                  </div>
                  <motion.button
                    onClick={() => changeTab('overview')}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center gap-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"
                  >
                    <ArrowLeft size={9} /> Overview
                  </motion.button>
                </div>

                {/* Progress dots - 2 only */}
                <div className="flex justify-center gap-1.5 mb-2 shrink-0">
                  {flagPages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setFlagDirection(i > flagIndex ? 1 : -1); setFlagIndex(i); }}
                      className={`rounded-full transition-all duration-300 ${
                        i === flagIndex ? 'w-5 h-1.5 bg-emerald-400' : 'w-1.5 h-1.5 bg-white/20'
                      }`}
                    />
                  ))}
                </div>

                {/* Swipeable Page - 2 items per page */}
                <div className="overflow-hidden relative mb-2">
                  <AnimatePresence custom={flagDirection} mode="wait">
                    <motion.div
                      key={flagIndex}
                      custom={flagDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="flex flex-col gap-3"
                    >
                      {flagPages[flagIndex]?.map((feature) => (
                        <div
                          key={feature.id}
                          className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-xl flex flex-col"
                        >
                          {/* Feature name + tag */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                              <Cpu size={14} className="text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-white leading-tight truncate">{feature.displayName}</h4>
                              <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-mono text-gray-400 inline-block">
                                {feature.name}
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] leading-relaxed text-gray-400 mb-2">
                            {feature.description}
                          </p>

                          {/* Dual Switches */}
                          <div className="grid grid-cols-2 gap-2 mt-auto">
                            <div
                              onClick={() => handleToggleFeature(feature.id, 'enabledForBeta', feature.enabledForBeta)}
                              className={`cursor-pointer rounded-xl border p-2.5 transition-all flex items-center justify-between ${
                                feature.enabledForBeta
                                  ? 'bg-emerald-500/10 border-emerald-500/30'
                                  : 'bg-white/[0.02] border-white/[0.06] opacity-60'
                              }`}
                            >
                              <div>
                                <p className="text-[10px] font-bold text-white">Beta Cohort</p>
                                <p className="text-[9px] text-gray-400">{feature.enabledForBeta ? 'Active' : 'Disabled'}</p>
                              </div>
                              <div className={`h-5 w-9 rounded-full p-0.5 transition-colors ${feature.enabledForBeta ? 'bg-emerald-400' : 'bg-white/20'}`}>
                                <div className={`h-4 w-4 rounded-full bg-white transition-transform ${feature.enabledForBeta ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                            </div>

                            <div
                              onClick={() => handleToggleFeature(feature.id, 'enabledForAll', feature.enabledForAll)}
                              className={`cursor-pointer rounded-xl border p-2.5 transition-all flex items-center justify-between ${
                                feature.enabledForAll
                                  ? 'bg-cyan-500/10 border-cyan-500/30'
                                  : 'bg-white/[0.02] border-white/[0.06] opacity-60'
                              }`}
                            >
                              <div>
                                <p className="text-[10px] font-bold text-white">Global GA</p>
                                <p className="text-[9px] text-gray-400">{feature.enabledForAll ? '100% Live' : 'Restricted'}</p>
                              </div>
                              <div className={`h-5 w-9 rounded-full p-0.5 transition-colors ${feature.enabledForAll ? 'bg-cyan-400' : 'bg-white/20'}`}>
                                <div className={`h-4 w-4 rounded-full bg-white transition-transform ${feature.enabledForAll ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Prev / Next */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.06] shrink-0">
                  <button
                    onClick={() => { setFlagDirection(-1); setFlagIndex(i => Math.max(0, i - 1)); }}
                    disabled={flagIndex === 0}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-white/5 border border-white/10 disabled:opacity-30 transition-all active:scale-95"
                  >
                    <ArrowLeft size={12} /> Prev
                  </button>
                  <span className="text-[9px] text-gray-600 font-mono">{flagIndex + 1} of {flagPages.length}</span>
                  <button
                    onClick={() => { setFlagDirection(1); setFlagIndex(i => Math.min(flagPages.length - 1, i + 1)); }}
                    disabled={flagIndex === flagPages.length - 1}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 disabled:opacity-30 transition-all active:scale-95"
                  >
                    Next <ArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          INSPECT DOSSIER & FEEDBACK RESPONSE MODAL DRAWER
         ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-[2rem] border border-white/15 bg-[#0e1014] p-6 shadow-2xl overflow-hidden"
            >
              {/* Type: Application Inspection */}
              {selectedItem.modalType !== 'feedback' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Vanguard Candidate Dossier
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="rounded-full p-1 text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Candidate Identity Profile */}
                  <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/10">
                    <img
                      src={selectedItem.user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedItem.user?.username || selectedItem.fullName}`}
                      className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{selectedItem.fullName}</h4>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                          selectedItem.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : selectedItem.status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : selectedItem.status === 'REVOKED'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {selectedItem.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">@{selectedItem.user?.username || 'candidate'}</p>
                      <p className="text-[10px] text-gray-500">{selectedItem.email}</p>
                    </div>
                  </div>

                  {/* Demographic Details */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-white/[0.02] p-2.5 border border-white/[0.04]">
                      <span className="text-gray-500 font-bold uppercase text-[9px] block">Age & Gender</span>
                      <span className="text-white font-medium">
                        {selectedItem.age ? `${selectedItem.age} yrs` : 'Not specified'} // {selectedItem.gender || 'N/A'}
                      </span>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] p-2.5 border border-white/[0.04]">
                      <span className="text-gray-500 font-bold uppercase text-[9px] block">OTP Status</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedItem.otpVerified ? 'Identity Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>

                  {/* Reason & Motivation */}
                  <div className="space-y-2 text-xs">
                    <div className="rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Application Reason / Domain Focus
                      </span>
                      <p className="text-gray-200 leading-relaxed">{selectedItem.reasonForJoining}</p>
                    </div>

                    <div className="rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Personal Motivation
                      </span>
                      <p className="text-gray-200 leading-relaxed">{selectedItem.motivation}</p>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    {selectedItem.status === 'APPROVED' ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400 font-bold">
                          <CheckCircle2 size={15} />
                          <span>Active Vanguard Tester</span>
                        </div>
                        <button
                          onClick={() => handleRevoke(selectedItem.userId || selectedItem.user?.id, 'Admin revocation from dossier.', selectedItem.id)}
                          disabled={actionLoadingId === (selectedItem.userId || selectedItem.user?.id || selectedItem.id)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 active:scale-95 disabled:opacity-50 transition-all"
                        >
                          Revoke Beta Access
                        </button>
                      </div>
                    ) : selectedItem.status === 'REVOKED' ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <button
                          onClick={() => handleReject(selectedItem.id, 'Candidate permanently rejected.')}
                          disabled={actionLoadingId === selectedItem.id}
                          className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/20 active:scale-95 disabled:opacity-50 transition-all text-center"
                        >
                          Reject Completely
                        </button>
                        <button
                          onClick={() => handleApprove(selectedItem.id, 'Candidate reinstated into Vanguard cohort.')}
                          disabled={actionLoadingId === selectedItem.id}
                          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all text-center"
                        >
                          {actionLoadingId === selectedItem.id ? 'Processing...' : 'Reconsider'}
                        </button>
                      </div>
                    ) : selectedItem.status === 'REJECTED' ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 font-bold">
                          <XCircle size={15} />
                          <span>Application Rejected</span>
                        </div>
                        <button
                          onClick={() => setSelectedItem(null)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                        >
                          Close Dossier
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReject(selectedItem.id, 'Candidate denied at this milestone.')}
                          disabled={actionLoadingId === selectedItem.id}
                          className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/20 active:scale-95 disabled:opacity-50 transition-all"
                        >
                          Reject Candidate
                        </button>
                        <button
                          onClick={() => handleApprove(selectedItem.id, 'Admitted into Vanguard cohort.')}
                          disabled={actionLoadingId === selectedItem.id}
                          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all"
                        >
                          {actionLoadingId === selectedItem.id ? 'Processing...' : 'Approve for Beta'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Type: Feedback Response Drawer */
                <FeedbackResponseForm
                  item={selectedItem}
                  onClose={() => setSelectedItem(null)}
                  onSubmit={handleRespondFeedback}
                  loading={actionLoadingId === selectedItem.id}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedbackResponseForm({ item, onClose, onSubmit, loading }) {
  const [response, setResponse] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!response.trim()) return;
    onSubmit(item.id, response.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Bug size={18} className="text-cyan-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Engineer Response Terminal
          </h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="rounded-xl bg-white/[0.03] p-3 border border-white/10 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-white">@{item.user?.username}</span>
          <span className="text-[10px] text-cyan-400 uppercase font-mono">{item.featureName || 'General'}</span>
        </div>
        <h4 className="font-semibold text-white mb-1">{item.title}</h4>
        <p className="text-gray-400 leading-relaxed text-[11px]">{item.description}</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
          Direct Note Back to Tester *
        </label>
        <textarea
          required
          rows={4}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Thank you for telemetry! We have triaged this glitch into our upcoming sprint..."
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-cyan-500 placeholder-gray-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !response.trim()}
          className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-cyan-500/20 hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          <span>Send Response</span>
        </button>
      </div>
    </form>
  );
}
