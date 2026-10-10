import React, { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft,
  Zap, Crown, Shield, ShieldCheck, Rocket, Star, Lock, Unlock, Clock,
  RefreshCw, Send, Check, ChevronRight, Bug, Radio, Terminal, Eye,
  Layers, Smartphone, Laptop, Cpu, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  submitBetaApplication,
  verifyBetaOTP,
  resendBetaOTP,
  getBetaStatus,
  getBetaFeatures,
  submitBetaFeedback,
  getMyFeedback
} from '../../utils/betaApi';

export default function BetaProgramModal({ isOpen, onClose }) {
  // Steps: 'intro', 'form', 'otp', 'pending', 'approved', 'rejected'
  const [step, setStep] = useState(() => {
    try {
      return sessionStorage.getItem('synapse_beta_step') || 'intro';
    } catch (_) {
      return 'intro';
    }
  });
  const [formStep, setFormStep] = useState(0); // 0, 1, 2 for form pages
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Data state
  const [betaStatus, setBetaStatus] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [features, setFeatures] = useState([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    address: '',
    age: '',
    gender: 'Prefer not to say',
    focusArea: 'Mobile UI & Gestures',
    reasonForJoining: '',
    motivation: ''
  });

  // OTP State: 6-digit array
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  // In-modal quick feedback state (for approved members)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ title: '', description: '', rating: 5, featureName: 'Vanguard Core' });
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [myFeedback, setMyFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);

  // Focus area chips
  const focusAreas = [
    { id: 'Mobile UI & Gestures', icon: Smartphone, label: 'Mobile UI & Fluid Gestures' },
    { id: 'Chat & Encryption', icon: Lock, label: 'Chat & Stealth Privacy' },
    { id: 'Reels & Media Engine', icon: Layers, label: 'Reels & Media Rendering' },
    { id: 'Security Auditing', icon: Shield, label: 'Zero-Knowledge Security' },
    { id: 'Performance & Latency', icon: Cpu, label: 'Performance & FPS Tuning' }
  ];

  // Load status when opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      loadStatus();
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const goToStep = (newStep, dir = 1) => {
    setError('');
    setDirection(dir);
    setStep(newStep);
    try {
      sessionStorage.setItem('synapse_beta_step', newStep);
    } catch (_) {}
  };

  const loadStatus = async () => {
    try {
      setSyncingStatus(true);
      const data = await getBetaStatus();
      if (data.success) {
        setBetaStatus(data);
        setFormData((prev) => ({
          ...prev,
          email: data.email || prev.email,
          fullName: prev.fullName || data.name || ''
        }));

        let targetStep = 'intro';
        if (data.isBetaTester) {
          targetStep = 'approved';
          loadFeatures();
          loadMyFeedback();
        } else if (data.application) {
          setApplicationId(data.application.id);
          if (!data.application.otpVerified) {
            targetStep = 'otp';
          } else if (data.application.status === 'PENDING') {
            targetStep = 'pending';
          } else if (data.application.status === 'REJECTED') {
            targetStep = 'rejected';
          } else if (data.application.status === 'APPROVED') {
            targetStep = 'approved';
            loadFeatures();
            loadMyFeedback();
          } else if (data.application.status === 'REVOKED') {
            targetStep = 'revoked';
          }
        }

        setStep((currentStep) => {
          if (currentStep !== targetStep) {
            goToStep(targetStep, 1);
          }
          return currentStep;
        });
      } else {
        setError(data.error || 'Unable to sync beta registry.');
      }
    } catch (err) {
      setError('Connection timeout. Please verify internet access.');
    } finally {
      setSyncingStatus(false);
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    try {
      setFeaturesLoading(true);
      const data = await getBetaFeatures();
      if (data.success && Array.isArray(data.features)) {
        setFeatures(data.features);
      }
    } catch {
      // Non-critical
    } finally {
      setFeaturesLoading(false);
    }
  };

  // Submit Application
  const handleSubmitApplication = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Operator full name is required');
      return;
    }
    if (!formData.reasonForJoining.trim() || formData.reasonForJoining.trim().length < 15) {
      setError('Please provide a reason with at least 15 characters.');
      return;
    }
    if (!formData.motivation.trim() || formData.motivation.trim().length < 15) {
      setError('Please provide motivation with at least 15 characters.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email,
        address: formData.address.trim(),
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender,
        reasonForJoining: `[Focus: ${formData.focusArea}] ${formData.reasonForJoining.trim()}`,
        motivation: formData.motivation.trim()
      };

      const res = await submitBetaApplication(payload);
      if (res.success) {
        setApplicationId(res.applicationId);
        setResendCooldown(60);
        goToStep('otp', 1);
      } else {
        if (res.applicationId) {
          setApplicationId(res.applicationId);
          setResendCooldown(60);
          goToStep('otp', 1);
        }
        setError(res.error || 'Application submission failed.');
      }
    } catch (err) {
      setError('Failed to transmit application payload.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleDigitChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const clean = val.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[idx] = clean;
    setOtpDigits(newDigits);

    if (clean && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    const nextIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await verifyBetaOTP(applicationId, code);
      if (res.success) {
        setSuccessMsg('Identity sealed. Your application is now in the review queue.');
        setTimeout(() => {
          goToStep('pending', 1);
        }, 800);
      } else {
        setError(res.error || 'Invalid verification token.');
      }
    } catch {
      setError('Network communication severed.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      setError('');
      const res = await resendBetaOTP(applicationId);
      if (res.success) {
        setResendCooldown(60);
        setSuccessMsg('A fresh verification token was dispatched to your mail.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res.error || 'Failed to dispatch new token.');
      }
    } catch {
      setError('Could not contact verification gateway.');
    } finally {
      setLoading(false);
    }
  };


  const loadMyFeedback = async () => {
    try {
      setFeedbackLoading(true);
      const data = await getMyFeedback();
      if (data.success && Array.isArray(data.feedback)) {
        setMyFeedback(data.feedback);
      }
    } catch (err) {
      // Non-critical - endpoint may not be available yet
      console.warn('[BETA] Feedback history not available:', err);
      setMyFeedback([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Submit Feedback
  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackData.title.trim() || !feedbackData.description.trim()) {
      setFeedbackError('Title and description are required.');
      return;
    }
    try {
      setFeedbackSending(true);
      setFeedbackError('');
      const res = await submitBetaFeedback(feedbackData);
      if (res && res.success) {
        setShowFeedbackModal(false);
        setFeedbackError('');
        setFeedbackData({ title: '', description: '', rating: 5, featureName: 'Vanguard Core' });
        setSuccessMsg('Feedback logged into the engineering sprint queue.');
        setTimeout(() => setSuccessMsg(''), 4000);
        loadMyFeedback(); // Reload feedback list
      } else {
        setFeedbackError(res?.error || 'Failed to log feedback');
      }
    } catch (err) {
      setFeedbackError(err?.message || 'Network transmission failed');
    } finally {
      setFeedbackSending(false);
    }
  };

  if (!isOpen) return null;

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (dir) => ({
      x: dir < 0 ? 60 : -60,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="vanguardBetaProgramRootModal"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="fixed inset-0 z-[100] flex flex-col bg-[#050608] text-white overflow-hidden select-none"
        >
          {/* Ambient Cyberpunk Glow Gradients */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[160px] animate-pulse" />
            <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[150px]" />
            <div className="absolute bottom-[-100px] right-[-100px] h-[500px] w-[500px] rounded-full bg-purple-500/12 blur-[170px]" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          </div>

          {/* Top App Header - Floating with rounded corners */}
          <header className="relative z-20 mx-3 mt-3 flex shrink-0 items-center justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-950/60 via-teal-950/50 to-black/80 px-4 py-3.5 backdrop-blur-2xl shadow-lg shadow-black/50 md:mx-6 md:mt-4 md:px-8">
            {syncingStatus && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden bg-white/5">
                <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
              </div>
            )}
            <div className="flex items-center gap-3">
              {step !== 'intro' && step !== 'approved' && step !== 'pending' && step !== 'rejected' ? (
                <button
                  onClick={() => goToStep('intro', -1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Previous slide"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : null}

              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                  <Sparkles size={18} className="text-black" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black uppercase tracking-wider text-white sm:text-[13px]">SynapseX Vanguard</span>
                    <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-widest text-emerald-400">
                      BETA
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-gray-500">
                    {syncingStatus ? 'Synchronizing registry...' : 'Cohort 2026 // Canary Channel'}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Breadcrumbs */}
            <div className="hidden items-center gap-2 sm:flex">
              {['intro', 'form', 'otp', 'pending'].map((s, idx) => {
                const isActive = step === s;
                const isPast = ['intro', 'form', 'otp', 'pending'].indexOf(step) > idx;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'w-8 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                          : isPast
                          ? 'w-2 bg-emerald-700'
                          : 'w-2 bg-white/10'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Close Beta Suite"
            >
              <X size={20} className="transition-transform group-hover:rotate-90" />
            </button>
          </header>

          {/* Main Slide Stage */}
          <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col px-3 py-3 md:px-8 md:py-6 overflow-hidden">
              <AnimatePresence custom={direction} mode="wait">

                {/* 2. INTRO / SHOWCASE SLIDE */}
                {step === 'intro' && (
                  <motion.div
                    key="intro"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex h-full flex-col"
                  >
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div className="flex-1 pb-2">
                        {/* Hero Section — Balanced */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-4 text-center backdrop-blur-xl">
                          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
                          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl" />

                          <div className="relative z-10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                            <Crown size={28} className="text-emerald-400" />
                          </div>

                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase text-emerald-400">
                            <Radio size={10} className="animate-pulse" /> Private Cohort Open
                          </div>

                          <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
                            SHAPE THE <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">QUANTUM EDGE</span>
                          </h1>
                          <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-gray-400">
                            Test unreleased features before global rollouts
                          </p>

                          {/* Live Cohort Metrics */}
                          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-black/40 py-2 backdrop-blur-md">
                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Cohort</p>
                              <p className="text-xs font-black text-emerald-400">94% Filled</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Cadence</p>
                              <p className="text-xs font-black text-white">Weekly</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Security</p>
                              <p className="text-xs font-black text-cyan-400">Zero-Knowledge</p>
                            </div>
                          </div>
                        </div>

                        {/* 4 Feature Bento Cards — Balanced 2x2 */}
                        <div className="mt-4 mb-6 grid grid-cols-2 gap-2.5">
                          {[
                            {
                              icon: Rocket,
                              title: 'Bleeding-Edge Protocols',
                              desc: 'UI upgrades & fast media pipelines'
                            },
                            {
                              icon: ShieldCheck,
                              title: 'Neural Vault & Stealth v2',
                              desc: 'Hardened story lockers & relays'
                            },
                            {
                              icon: Terminal,
                              title: 'Direct Engineer Channel',
                              desc: 'Bug reports triaged fast'
                            },
                            {
                              icon: Star,
                              title: 'Holographic Badge',
                              desc: 'Vanguard emblem on profile'
                            }
                          ].map((card, i) => (
                            <div
                              key={i}
                              className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                            >
                              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-400 transition-transform group-hover:scale-110">
                                <card.icon size={16} />
                              </div>
                              <h4 className="text-[11px] font-bold text-white leading-tight">{card.title}</h4>
                              <p className="mt-1 text-[10px] leading-snug text-gray-500">{card.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom CTA Dock - Always Visible */}
                      <div className="shrink-0 p-3 pb-16 backdrop-blur-xl">
                        <button
                          onClick={() => goToStep('form', 1)}
                          className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 py-3.5 font-black text-black shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] active:scale-95"
                        >
                          <span className="text-sm uppercase tracking-wider">Initialize Application</span>
                          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. APPLICATION FORM SLIDE - SWIPEABLE MULTI-STEP */}
                {step === 'form' && (
                  <motion.div
                    key="form"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex h-full flex-col overflow-hidden"
                  >
                    {/* Header */}
                    <div className="shrink-0 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Step 01 / 02</span>
                          <h2 className="text-xl font-black text-white md:text-2xl">Operator Dossier</h2>
                        </div>
                        <span className="text-[9px] text-gray-500">Page {formStep + 1}/3</span>
                      </div>
                    </div>

                    {/* Linked Verified Identity Pill */}
                    <div className="shrink-0 mb-4 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                          <CheckCircle size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white">{formData.email || 'Active Operator'}</p>
                          <p className="text-[8px] text-emerald-400/80">Verified Account</p>
                        </div>
                      </div>
                      <Lock size={14} className="text-emerald-400" />
                    </div>

                    {/* Swipeable Form Pages */}
                    <div className="flex-1 overflow-hidden relative">
                      <AnimatePresence mode="wait" custom={direction}>
                        {/* PAGE 1: Basic Info + Focus Area */}
                        {formStep === 0 && (
                          <motion.div
                            key="formPage1"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="absolute inset-0 flex flex-col justify-between"
                          >
                            <div className="space-y-4">
                              {/* Full Name */}
                              <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Operator Full Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={formData.fullName}
                                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                  placeholder="Alex Mercer"
                                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all focus:border-emerald-500 focus:bg-white/[0.08]"
                                />
                              </div>

                              {/* Age & Gender */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Age
                                  </label>
                                  <input
                                    type="number"
                                    min="13"
                                    max="120"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    placeholder="24"
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all focus:border-emerald-500 focus:bg-white/[0.08]"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Gender
                                  </label>
                                  <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white outline-none transition-all focus:border-emerald-500 focus:bg-[#111]"
                                  >
                                    <option value="Prefer not to say" className="bg-[#111]">Prefer not to say</option>
                                    <option value="Male" className="bg-[#111]">Male</option>
                                    <option value="Female" className="bg-[#111]">Female</option>
                                    <option value="Non-Binary" className="bg-[#111]">Non-Binary</option>
                                  </select>
                                </div>
                              </div>

                              {/* City Location */}
                              <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  City / Node Location
                                </label>
                                <input
                                  type="text"
                                  value={formData.address}
                                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                  placeholder="Tokyo, JP or Berlin, DE"
                                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all focus:border-emerald-500 focus:bg-white/[0.08]"
                                />
                              </div>

                              {/* Testing Domain - Grid layout for perfect alignment */}
                              <div>
                                <div className="grid grid-cols-2 gap-2">
                                  {focusAreas.map((f) => {
                                    const isSelected = formData.focusArea === f.id;
                                    return (
                                      <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, focusArea: f.id })}
                                        className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[9px] font-bold transition-all ${
                                          isSelected
                                            ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                        }`}
                                      >
                                        <f.icon size={11} />
                                        <span className="text-[9px] leading-tight text-center flex-1">{f.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* PAGE 2: Why Join, Motivation & Submit */}
                        {formStep === 1 && (
                          <motion.div
                            key="formPage2"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="absolute inset-0 flex flex-col justify-between"
                          >
                            <div className="space-y-4">
                              {/* Why Join */}
                              <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Why join Vanguard? *
                                  </label>
                                  <span className="text-[9px] text-gray-600">{formData.reasonForJoining.length}/2000</span>
                                </div>
                                <textarea
                                  required
                                  rows={4}
                                  value={formData.reasonForJoining}
                                  onChange={(e) => setFormData({ ...formData, reasonForJoining: e.target.value })}
                                  placeholder="Your testing background, daily usage, features you want to break..."
                                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all focus:border-emerald-500 focus:bg-white/[0.08]"
                                />
                              </div>

                              {/* Motivation */}
                              <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    What motivates you? *
                                  </label>
                                  <span className="text-[9px] text-gray-600">{formData.motivation.length}/2000</span>
                                </div>
                                <textarea
                                  required
                                  rows={5}
                                  value={formData.motivation}
                                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                                  placeholder="What inspires you to make this platform faster, sharper, and more secure?"
                                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white placeholder-gray-600 outline-none transition-all focus:border-emerald-500 focus:bg-white/[0.08]"
                                />
                              </div>

                              {error && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[10px] text-red-400">
                                  <AlertCircle size={14} className="shrink-0" />
                                  <span>{error}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Bottom Navigation with Progress Dots */}
                    <div className="shrink-0 pt-3 pb-16 backdrop-blur-xl">
                      {/* Progress Dots */}
                      <div className="flex items-center justify-center gap-2 mb-3">
                        {[0, 1].map((i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setDirection(i > formStep ? 1 : -1);
                              setFormStep(i);
                            }}
                            className={`h-2 rounded-full transition-all ${
                              i === formStep
                                ? 'w-8 bg-emerald-400'
                                : i < formStep
                                ? 'w-2 bg-emerald-700'
                                : 'w-2 bg-white/20'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex gap-2">
                        {formStep > 0 && (
                          <button
                            onClick={() => {
                              setDirection(-1);
                              setFormStep(formStep - 1);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white transition-all hover:bg-white/10"
                          >
                            <ArrowLeft size={14} /> Previous
                          </button>
                        )}
                        
                        {formStep < 1 ? (
                          <button
                            onClick={() => {
                              setDirection(1);
                              setFormStep(formStep + 1);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-black text-black transition-all hover:scale-[1.01]"
                          >
                            Next <ArrowRight size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={handleSubmitApplication}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-black text-black transition-all hover:scale-[1.01] disabled:opacity-50"
                          >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Transmit Application</>}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. SECURITY HANDSHAKE (OTP) SLIDE */}
                {step === 'otp' && (
                  <motion.div
                    key="otp"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-1 flex-col items-center justify-center py-6 text-center"
                  >
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                        <Lock size={36} className="text-emerald-400" />
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Step 02 / 02</span>
                    <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">Neural Handshake Key</h2>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-400">
                      Enter the 6-digit confirmation token dispatched to{' '}
                      <span className="font-bold text-white">{formData.email}</span>.
                    </p>

                    {/* 6 Digit Box Inputs */}
                    <div className="my-8 flex gap-2.5 sm:gap-3" onPaste={handleDigitPaste}>
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => (otpInputRefs.current[i] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(i, e)}
                          className={`h-14 w-12 rounded-2xl border text-center font-mono text-2xl font-black text-white transition-all outline-none sm:h-16 sm:w-14 ${
                            digit
                              ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                              : 'border-white/10 bg-white/5 focus:border-emerald-500 focus:bg-white/10'
                          }`}
                        />
                      ))}
                    </div>

                    {error && (
                      <div className="mb-6 flex max-w-sm items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {successMsg && (
                      <div className="mb-6 flex max-w-sm items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                        <CheckCircle size={16} className="shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {/* Verify CTA */}
                    <button
                      onClick={handleVerifyOTP}
                      disabled={loading || otpDigits.join('').length !== 6}
                      className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] disabled:opacity-40"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>Verify & Seal Application <Unlock size={16} /></>}
                    </button>

                    {/* Resend Action */}
                    <div className="mt-4">
                      {resendCooldown > 0 ? (
                        <p className="text-[11px] text-gray-500">
                          Resend key available in <span className="font-bold text-emerald-400">{resendCooldown}s</span>
                        </p>
                      ) : (
                        <button
                          onClick={handleResendOTP}
                          disabled={loading}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 transition-colors hover:text-emerald-300"
                        >
                          <RefreshCw size={12} /> Resend Verification Key
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 5. APPLICATION PENDING / UNDER REVIEW SLIDE */}
                {step === 'pending' && (
                  <motion.div
                    key="pending"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-1 flex-col justify-between py-6 text-center"
                  >
                    <div>
                      {/* Radar Scanning Graphic */}
                      <div className="relative mx-auto mb-6 h-28 w-28">
                        <div className="absolute inset-0 rounded-full border border-amber-500/20 bg-amber-500/5 animate-ping opacity-30" />
                        <div className="absolute inset-2 rounded-full border border-amber-500/30 bg-amber-500/10" />
                        <div className="absolute inset-4 rounded-full border border-dashed border-amber-500/50 animate-spin" style={{ animationDuration: '12s' }} />
                        <div className="relative flex h-full w-full items-center justify-center text-amber-400">
                          <Clock size={40} className="animate-pulse" />
                        </div>
                      </div>

                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        Queued For Triage
                      </span>

                      <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">Under Neural Review</h2>
                      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-gray-400">
                        Your Vanguard dossier has been sealed and dispatched to our engineering gatekeepers. We approve applications in rolling 24-48h batches.
                      </p>

                      {/* 4-Node Status Tracker */}
                      <div className="mx-auto my-8 max-w-md space-y-3 text-left">
                        {[
                          { title: 'Dossier Payload Transmitted', status: 'COMPLETED', time: 'Instant' },
                          { title: 'Identity & OTP Verified', status: 'COMPLETED', time: 'Verified' },
                          { title: 'Core Engineer Assessment', status: 'IN_PROGRESS', time: 'Active Pulse' },
                          { title: 'Vanguard Canary Token Grant', status: 'PENDING', time: 'Estimated 24h' }
                        ].map((node, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                              node.status === 'COMPLETED'
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : node.status === 'IN_PROGRESS'
                                ? 'border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                                : 'border-white/5 bg-white/[0.02] opacity-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {node.status === 'COMPLETED' ? (
                                <CheckCircle size={18} className="text-emerald-400" />
                              ) : node.status === 'IN_PROGRESS' ? (
                                <Radio size={18} className="text-amber-400 animate-pulse" />
                              ) : (
                                <Lock size={16} className="text-gray-500" />
                              )}
                              <div>
                                <p className="text-[12px] font-bold text-white">{node.title}</p>
                                <p className="text-[10px] text-gray-500">{node.time}</p>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-extrabold uppercase tracking-wider ${
                                node.status === 'COMPLETED'
                                  ? 'text-emerald-400'
                                  : node.status === 'IN_PROGRESS'
                                  ? 'text-amber-400'
                                  : 'text-gray-600'
                              }`}
                            >
                              {node.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex gap-3">
                      <button
                        onClick={loadStatus}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-xs font-bold text-white transition-all hover:bg-white/10"
                      >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh Status Pulse
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 rounded-2xl bg-white/10 py-3.5 text-xs font-bold text-white transition-colors hover:bg-white/15"
                      >
                        Return to Synapse
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 6. APPROVED / ACTIVE VANGUARD TESTER SLIDE */}
                {step === 'approved' && (
                  <motion.div
                    key="approved"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex h-full flex-col overflow-hidden"
                  >
                    <div className="flex-1 overflow-hidden pb-2">
                      {/* Holographic VIP Member Card */}
                      <div className="relative mb-4 overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-black to-[#050608] p-4 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
                        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <Crown size={18} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                              Official Vanguard Operator
                            </span>
                          </div>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black text-emerald-300">
                            TESTER TIER 1
                          </span>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-xl font-black text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                            {formData.fullName?.charAt(0) || 'V'}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white">{formData.fullName || 'Vanguard Operator'}</h3>
                            <p className="text-[10px] font-medium text-emerald-400/80">{formData.email}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-[9px] text-gray-500">
                              <span>Active Since: {new Date().toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="text-emerald-400">Canary Build Ready</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Beta Feature Flags */}
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap size={14} className="text-emerald-400" />
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Live Beta Feature Protocols</h4>
                          </div>
                          {featuresLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
                        </div>

                        <div className="space-y-2">
                          {features.length > 0 ? (
                            features.map((f, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 backdrop-blur-md"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-white">{f.displayName || f.name}</span>
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-bold text-emerald-400">
                                      CANARY
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-gray-400">{f.description}</p>
                                </div>
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                                  <Check size={11} />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-center">
                              <p className="text-[10px] text-gray-400">All Vanguard Canary features are loaded into your session.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tester Stats Grid */}
                      <div className="mb-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                          <div className="text-lg font-black text-emerald-400">{myFeedback.filter(f => f.priority === 'HIGH' || f.priority === 'CRITICAL').length}</div>
                          <div className="text-[8px] uppercase tracking-wider text-gray-500">Priority Reports</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                          <div className="text-lg font-black text-emerald-400">{features.length || 5}</div>
                          <div className="text-[8px] uppercase tracking-wider text-gray-500">Features Active</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center cursor-pointer transition-all hover:border-emerald-500/30 hover:bg-white/[0.05]" onClick={() => myFeedback.length > 0 && setShowFeedbackHistory(true)}>
                          <div className="text-lg font-black text-emerald-400">{myFeedback.length}</div>
                          <div className="text-[8px] uppercase tracking-wider text-gray-500">Feedback Sent</div>
                        </div>
                      </div>

                      {/* Perks & Access */}
                      <div className="mb-4">
                        <h4 className="mb-2 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <Star size={14} className="text-emerald-400" /> Vanguard Perks
                        </h4>
                        <div className="space-y-1.5">
                          {[
                            { icon: Rocket, text: 'Priority Feature Rollout' },
                            { icon: Shield, text: 'Direct Engineer Channel Access' },
                            { icon: Zap, text: 'Early Experimental Builds' },
                            { icon: Eye, text: 'Beta Tester Badge on Profile' }
                          ].map((perk, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                                <perk.icon size={12} />
                              </div>
                              <span className="text-[10px] font-medium text-gray-300">{perk.text}</span>
                              <CheckCircle size={12} className="ml-auto text-emerald-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Feedback Buttons - Always visible at bottom */}
                    <div className="shrink-0 space-y-2 pt-3 pb-16">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFeedbackError('');
                            setShowFeedbackModal(true);
                          }}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-[11px] font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01]"
                        >
                          <Bug size={14} /> Submit Feedback
                        </button>
                        <button
                          onClick={() => setShowFeedbackHistory(true)}
                          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-[11px] font-bold text-cyan-300 transition-all hover:bg-cyan-500/20"
                        >
                          <MessageSquare size={14} /> History ({myFeedback.length})
                        </button>
                      </div>
                      <button
                        onClick={onClose}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/10"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 7. REJECTED SLIDE */}
                {step === 'rejected' && (
                  <motion.div
                    key="rejected"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-1 flex-col items-center justify-center py-10 text-center"
                  >
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-red-500/30 bg-red-500/10 text-red-400">
                      <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white">Cohort Limit Reached</h2>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-400">
                      Your previous application wasn't selected for this cycle. You can re-apply when a new cohort slot opens.
                    </p>
                    <div className="mt-8 flex items-center gap-3">
                      <button
                        onClick={() => {
                          // Reset form so user can re-apply fresh
                          setBetaStatus(null);
                          setApplicationId(null);
                          setFormData(prev => ({ ...prev, reasonForJoining: '', motivation: '' }));
                          goToStep('intro', 1);
                        }}
                        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                      >
                        Re-apply Now
                      </button>
                      <button
                        onClick={onClose}
                        className="rounded-2xl bg-white/10 px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-white/15"
                      >
                        Return to Synapse
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 8. REVOKED SLIDE */}
                {step === 'revoked' && (
                  <motion.div
                    key="revoked"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-1 flex-col items-center justify-center py-10 text-center"
                  >
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
                      <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white">Beta Privileges Revoked</h2>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-400">
                      Your Vanguard cohort tester credentials have been revoked by an administrator.
                    </p>
                    {betaStatus?.application?.reviewNotes && (
                      <p className="mt-2 max-w-sm rounded-xl bg-white/[0.03] border border-white/10 p-2.5 text-[11px] text-gray-400 italic">
                        "{betaStatus.application.reviewNotes}"
                      </p>
                    )}
                    <div className="mt-8 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setBetaStatus(null);
                          setApplicationId(null);
                          setFormData(prev => ({ ...prev, reasonForJoining: '', motivation: '' }));
                          goToStep('intro', 1);
                        }}
                        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                      >
                        Re-apply for Beta
                      </button>
                      <button
                        onClick={onClose}
                        className="rounded-2xl bg-white/10 px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-white/15"
                      >
                        Return to Synapse
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* Inline Feedback Modal for Approved Testers */}
          <AnimatePresence>
            {showFeedbackModal && (
              <motion.div
                key="vanguardFeedbackSubmitModal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
              >
                <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-[#0f1115] p-6 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bug size={18} className="text-emerald-400" />
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">Vanguard Feedback Terminal</h3>
                    </div>
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="rounded-full p-1 text-gray-400 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSendFeedback} className="space-y-3.5">
                    {feedbackError && (
                      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{feedbackError}</span>
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Feature Under Test</label>
                      <input
                        type="text"
                        value={feedbackData.featureName}
                        onChange={(e) => setFeedbackData({ ...feedbackData, featureName: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="e.g. Neural Vault, Direct DMs, Reels"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase text-gray-400">Experience Rating *</label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                            className="group transition-transform hover:scale-110 active:scale-95"
                          >
                            <Star 
                              size={28} 
                              className={`transition-all ${
                                star <= feedbackData.rating 
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                                  : 'text-gray-600 hover:text-amber-400/50'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-[11px] font-bold text-amber-400">
                          {feedbackData.rating}/5
                        </span>
                      </div>
                      <p className="mt-1 text-[9px] text-gray-500">
                        {feedbackData.rating === 1 && '😞 Critical Issues'}
                        {feedbackData.rating === 2 && '😕 Needs Improvement'}
                        {feedbackData.rating === 3 && '😐 Acceptable'}
                        {feedbackData.rating === 4 && '😊 Good Experience'}
                        {feedbackData.rating === 5 && '🤩 Excellent!'}
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Feedback Title *</label>
                      <input
                        type="text"
                        required
                        value={feedbackData.title}
                        onChange={(e) => setFeedbackData({ ...feedbackData, title: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="Concise summary of issue or recommendation"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Detailed Telemetry / Notes *</label>
                      <textarea
                        required
                        rows={4}
                        value={feedbackData.description}
                        onChange={(e) => setFeedbackData({ ...feedbackData, description: e.target.value })}
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="Reproduction steps, visual glitches, or suggestion..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={feedbackSending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-black uppercase text-black disabled:opacity-50"
                    >
                      {feedbackSending ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Transmit Feedback Payload</>}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback History Modal */}
          <AnimatePresence>
            {showFeedbackHistory && (
              <motion.div
                key="vanguardFeedbackHistoryModal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
              >
                <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[2rem] border border-white/15 bg-[#0f1115] shadow-2xl flex flex-col">
                  <div className="shrink-0 p-6 pb-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={18} className="text-cyan-400" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Feedback History</h3>
                      </div>
                      <button
                        onClick={() => setShowFeedbackHistory(false)}
                        className="rounded-full p-1 text-gray-400 hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {myFeedback.length} submission{myFeedback.length !== 1 ? 's' : ''} • {myFeedback.filter(f => f.adminResponse).length} with admin response
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                    {feedbackLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={24} className="animate-spin text-emerald-400" />
                      </div>
                    ) : myFeedback.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Bug size={32} className="text-gray-600 mb-2" />
                        <p className="text-sm text-gray-400">No feedback submitted yet</p>
                        <p className="text-[10px] text-gray-600 mt-1">Submit your first feedback to help improve SynapseX</p>
                      </div>
                    ) : (
                      myFeedback.map((fb, idx) => (
                        <div key={fb.id || idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                          {/* Feedback Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-white">{fb.title}</h4>
                                {fb.featureName && (
                                  <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400 uppercase">
                                    {fb.featureName}
                                  </span>
                                )}
                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${
                                  fb.status === 'RESOLVED' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : fb.status === 'IN_REVIEW'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                                }`}>
                                  {fb.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 mt-1">
                                {new Date(fb.submittedAt).toLocaleDateString()} • {new Date(fb.submittedAt).toLocaleTimeString()}
                              </p>
                            </div>
                            {fb.rating && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                {[...Array(fb.rating)].map((_, i) => (
                                  <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* User's Feedback */}
                          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                            <p className="text-[10px] text-gray-300 leading-relaxed">{fb.description}</p>
                          </div>

                          {/* Admin Response */}
                          {fb.adminResponse ? (
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck size={12} className="text-emerald-400" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Engineer Response</span>
                                {fb.respondedAt && (
                                  <span className="text-[8px] text-gray-500">
                                    • {new Date(fb.respondedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-emerald-100 leading-relaxed">{fb.adminResponse}</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[9px] text-gray-500">
                              <Clock size={10} />
                              <span>Awaiting engineer review...</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="shrink-0 p-4 border-t border-white/10">
                    <button
                      onClick={() => setShowFeedbackHistory(false)}
                      className="w-full rounded-xl bg-white/5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
