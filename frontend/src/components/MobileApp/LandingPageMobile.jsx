import React, { useState, useEffect, useRef } from 'react';
import PriyaAssistant from '../Priya/PriyaAssistant';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowUpRight,
    Fingerprint,
    Globe2,
    ShieldCheck,
    Sparkles,
    Wand2,
    X,
    Zap,
    Lock,
    Radio,
    Activity,
    Compass,
    User,
    Layers,
    Eye,
    Shield,
    Check,
    MessageCircle,
    Rss,
    Users,
    Video,
    Heart,
    TrendingUp,
    Star,
    Music2
} from 'lucide-react';

const MobileLandingPage = ({ onLogin, onRegister, onExit, previewMode = false }) => {
    // Interactive states for the liquid glass controls (mimicking Oppo ColorOS 17 / iOS Liquid Glass)
    const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
    const [activeSlide, setActiveSlide] = useState(0);
    const [slideDirection, setSlideDirection] = useState(1);
    const [priyaOpen, setPriyaOpen] = useState(false);
    const priyaRef = useRef(null);
    const [istTime, setIstTime] = useState('');

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const h = ist.getHours();
            const m = String(ist.getMinutes()).padStart(2, '0');
            const s = String(ist.getSeconds()).padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            setIstTime(`${h12}:${m}:${s} ${ampm}`);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    const slides = [
        {
            id: 'privacy',
            label: 'Privacy',
            icon: ShieldCheck,
            iconColor: 'from-sky-400/30 to-indigo-500/30',
            iconBorder: 'border-sky-300/30',
            iconText: 'text-sky-200',
            title: 'Neural Privacy Engine',
            subtitle: 'Active Protection · 256-bit',
            cards: [
                { id: 'vault', label: 'Quantum Vault', sub: 'End-to-end encrypted', icon: Lock, color: 'from-[#38bdf8] to-[#6366f1]' },
                { id: 'decay', label: 'Zero Telemetry', sub: 'Auto-decaying packets', icon: Zap, color: 'from-[#818cf8] to-[#c084fc]' },
                { id: 'circle', label: 'Ghost Circles', sub: 'Invisible footprint', icon: Eye, color: 'from-[#c084fc] to-[#f472b6]' },
            ],
            footer: { dot: 'bg-emerald-400', text: 'Encrypted Neural Orbit', stat: '0.0ms LEAK', statColor: 'text-sky-300' },
        },
        {
            id: 'messaging',
            label: 'Messages',
            icon: MessageCircle,
            iconColor: 'from-violet-400/30 to-pink-500/30',
            iconBorder: 'border-violet-300/30',
            iconText: 'text-violet-200',
            title: 'Quantum Messaging',
            subtitle: 'Ephemeral · Encrypted · Real-time',
            cards: [
                { id: 'ghost', label: 'Ghost Chats', sub: 'Self-destruct messages', icon: Eye, color: 'from-[#a78bfa] to-[#7c3aed]' },
                { id: 'voice', label: 'Voice Orbit', sub: 'Encrypted voice notes', icon: Radio, color: 'from-[#f472b6] to-[#ec4899]' },
                { id: 'group', label: 'Nexus Groups', sub: 'Private communities', icon: Users, color: 'from-[#34d399] to-[#059669]' },
            ],
            footer: { dot: 'bg-violet-400', text: 'Zero Data Stored', stat: 'E2E · Always', statColor: 'text-violet-300' },
        },
        {
            id: 'feed',
            label: 'Feed',
            icon: Rss,
            iconColor: 'from-pink-400/30 to-orange-500/30',
            iconBorder: 'border-pink-300/30',
            iconText: 'text-pink-200',
            title: 'Neural Feed',
            subtitle: 'Curated · Calm · Ad-free',
            cards: [
                { id: 'reels', label: 'Reels Orbit', sub: 'Mood-matched reels', icon: Video, color: 'from-[#fb923c] to-[#f43f5e]' },
                { id: 'trending', label: 'Trending Now', sub: 'Live pulse tracker', icon: TrendingUp, color: 'from-[#facc15] to-[#f97316]' },
                { id: 'vibes', label: 'Vibe Stories', sub: 'Authentic moments', icon: Heart, color: 'from-[#f472b6] to-[#c084fc]' },
            ],
            footer: { dot: 'bg-pink-400', text: 'Zero Ads · Pure Content', stat: '100% Real', statColor: 'text-pink-300' },
        },
        {
            id: 'spaces',
            label: 'Spaces',
            icon: Layers,
            iconColor: 'from-amber-400/30 to-cyan-500/30',
            iconBorder: 'border-amber-300/30',
            iconText: 'text-amber-200',
            title: 'Nexus Spaces',
            subtitle: 'Communities · Vibes · Universes',
            cards: [
                { id: 'music', label: 'Music Spaces', sub: 'Shared listening rooms', icon: Music2, color: 'from-[#22d3ee] to-[#6366f1]' },
                { id: 'stars', label: 'Star Circles', sub: 'Elite inner groups', icon: Star, color: 'from-[#fbbf24] to-[#f59e0b]' },
                { id: 'global', label: 'Global Nexus', sub: 'World communities', icon: Globe2, color: 'from-[#4ade80] to-[#06b6d4]' },
            ],
            footer: { dot: 'bg-amber-400', text: 'Connected · Worldwide', stat: '∞ Spaces', statColor: 'text-amber-300' },
        },
        {
            id: 'priya',
            label: 'Priya',
            icon: Sparkles,
            iconColor: 'from-pink-400/30 to-violet-500/30',
            iconBorder: 'border-pink-300/30',
            iconText: 'text-pink-200',
            title: 'Priya AI',
            subtitle: 'Your neural companion',
            cards: [],
            footer: { dot: 'bg-pink-400', text: 'Neural Intelligence', stat: 'Always On', statColor: 'text-pink-300' },
        },
    ];

    const handleSlideChange = (idx) => {
        setSlideDirection(idx > activeSlide ? 1 : -1);
        setActiveSlide(idx);
    };


    return (
        <main className="mobile-liquid-landing mobile-landing relative isolate h-full w-full text-white select-none">
            <style>{`
                .mobile-liquid-landing {
                    min-height: 0;
                    height: 100dvh;
                    background:
                        linear-gradient(160deg, 
                            rgba(88, 28, 135, 0.6) 0%,
                            rgba(67, 56, 202, 0.5) 25%,
                            rgba(99, 102, 241, 0.4) 50%,
                            rgba(249, 168, 212, 0.3) 75%,
                            rgba(251, 146, 60, 0.25) 100%
                        ),
                        linear-gradient(to bottom, #1e1b4b, #312e81);
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                }

                .hero-gradient-text {
                    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .widget-card {
                    background: linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 100%), rgba(30,27,75,0.4);
                    border: 1.5px solid rgba(255,255,255,0.2);
                    border-top: 2px solid rgba(255,255,255,0.4);
                    box-shadow: 
                        inset 0 2px 3px rgba(255,255,255,0.2), 
                        0 20px 40px -10px rgba(0,0,0,0.5),
                        0 0 30px -5px rgba(139,92,246,0.3),
                        0 0 60px -10px rgba(99,102,241,0.2);
                    backdrop-filter: blur(28px);
                    -webkit-backdrop-filter: blur(28px);
                    transform: translateZ(0);
                    will-change: transform, opacity;
                }

                .metric-card {
                    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(168,85,247,0.08) 100%), rgba(30,27,75,0.5);
                    border: 1.5px solid rgba(255,255,255,0.18);
                    border-top: 2px solid rgba(255,255,255,0.35);
                    box-shadow: 
                        inset 0 1.5px 2px rgba(255,255,255,0.18), 
                        0 16px 32px -8px rgba(0,0,0,0.4),
                        0 0 25px -8px rgba(139,92,246,0.4),
                        0 0 50px -15px rgba(99,102,241,0.25);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    transform: translateZ(0);
                    will-change: transform, opacity;
                }

                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            <div className="hide-scrollbar relative z-10 flex min-h-full flex-col px-6 pt-2.5" style={{
                paddingBottom: 'max(11.5rem, calc(180px + env(safe-area-inset-bottom, 0px)))',
            }}>

                {/* 1. TOP BAR - Nexus + Clock + Exit - Single Liquid Glass Box */}
                <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                        duration: 0.6, 
                        delay: 0,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                    className="flex items-center justify-between px-4 py-2.5 rounded-[1.4rem] mb-3.5"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(168,85,247,0.10) 50%, rgba(255,255,255,0.06) 100%), rgba(30,27,75,0.5)',
                        border: '1.5px solid rgba(255,255,255,0.22)',
                        borderTop: '2px solid rgba(255,255,255,0.42)',
                        boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.2), 0 16px 32px -8px rgba(0,0,0,0.45), 0 0 30px -10px rgba(139,92,246,0.3)',
                        backdropFilter: 'blur(28px)',
                        transform: 'translateZ(0)',
                        willChange: 'transform, opacity',
                    }}
                >
                    {/* Nexus Logo */}
                    <div className="flex items-center gap-2.5">
                        <div 
                            className="grid h-9 w-9 place-items-center rounded-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(99,102,241,0.3) 100%)',
                                border: '1.5px solid rgba(139,92,246,0.5)',
                                boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
                            }}
                        >
                            <Fingerprint size={18} className="text-violet-200" strokeWidth={2.4} />
                        </div>
                        <span className="text-[15px] font-black tracking-tight text-white">Nexus</span>
                        <span className="ml-0.5 rounded-md bg-violet-500/25 border border-violet-400/30 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-200">
                            OS 17
                        </span>
                    </div>

                    {/* Clock */}
                    <div className="flex items-center gap-2">
                        <div className="text-[11px] font-semibold text-slate-300 tracking-tight">
                            {istTime}
                        </div>
                    </div>
                </motion.div>

                {/* 2. HERO SECTION - Removed, merged into card below */}

                {/* 3. WIDGET CARDS - Clean Layout */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="flex-1 space-y-3 mb-3.5"
                >
                    {/* Hero Widget - All text merged in one liquid box */}
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                            duration: 0.7, 
                            delay: 0.1,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="rounded-[2rem] p-5"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(168,85,247,0.10) 100%), rgba(30,27,75,0.5)',
                            border: '1.5px solid rgba(255,255,255,0.22)',
                            borderTop: '2px solid rgba(255,255,255,0.40)',
                            boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.22), 0 0 35px -8px rgba(139,92,246,0.35), 0 0 70px -15px rgba(99,102,241,0.25)',
                            backdropFilter: 'blur(28px)',
                            transform: 'translateZ(0)',
                            willChange: 'transform, opacity',
                        }}
                    >
                        <h1 className="text-[28px] sm:text-[32px] font-black leading-[1.14] tracking-[-0.03em] mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            <span className="text-white">Privacy first,</span><br/>
                            <span className="hero-gradient-text">beautifully yours.</span>
                        </h1>
                        
                        <div className="flex items-start justify-between mt-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your Privacy</p>
                                <p className="mt-1 text-[13.5px] font-bold text-white leading-snug">Keep going, you're protected</p>
                            </div>
                            <div 
                                className="grid h-10 w-10 place-items-center rounded-xl shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(56,189,248,0.35), rgba(99,102,241,0.25))',
                                    border: '1.5px solid rgba(56,189,248,0.45)',
                                }}
                            >
                                <ShieldCheck size={20} className="text-sky-200" strokeWidth={2.5} />
                            </div>
                        </div>
                    </motion.div>

                    {/* ACTION BUTTONS - Right below the main box */}
                    <div className="grid grid-cols-2 gap-3">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                                duration: 0.3, 
                                delay: 0.15,
                                ease: "easeOut"
                            }}
                        >
                            <button
                                onClick={onLogin}
                                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-black tracking-tight transition-all active:scale-[0.97]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(56,189,248,0.9) 0%, rgba(99,102,241,0.8) 100%)',
                                    boxShadow: '0 8px 20px -4px rgba(56,189,248,0.4), 0 0 30px -10px rgba(56,189,248,0.5), inset 0 2px 2px rgba(255,255,255,0.3)',
                                    transform: 'translateZ(0)',
                                    backfaceVisibility: 'hidden',
                                    WebkitFontSmoothing: 'antialiased',
                                }}
                            >
                                <span className="text-white">Welcome back</span>
                                <ArrowUpRight size={16} className="text-white" strokeWidth={2.8} />
                            </button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                                duration: 0.3, 
                                delay: 0.15,
                                ease: "easeOut"
                            }}
                        >
                            <button
                                onClick={onRegister}
                                className="w-full flex items-center justify-center rounded-2xl py-3 text-[14px] font-black tracking-tight text-white transition-all active:scale-[0.97]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(168,85,247,0.08) 100%), rgba(30,27,75,0.5)',
                                    border: '1.5px solid rgba(255,255,255,0.2)',
                                    boxShadow: '0 0 25px -8px rgba(168,85,247,0.3)',
                                    backdropFilter: 'blur(20px)',
                                    transform: 'translateZ(0)',
                                    backfaceVisibility: 'hidden',
                                    WebkitFontSmoothing: 'antialiased',
                                }}
                            >
                                Create account
                            </button>
                        </motion.div>
                    </div>

                    {/* Two Medium Cards - Side by Side (Row 1) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                            duration: 0.6, 
                            delay: 0.4,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="grid grid-cols-2 gap-3"
                    >
                        {/* Encrypted Messages */}
                        <div className="metric-card rounded-[1.75rem] p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <div 
                                    className="grid h-9 w-9 place-items-center rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(124,58,237,0.2))',
                                        border: '1px solid rgba(167,139,250,0.4)',
                                    }}
                                >
                                    <Lock size={16} className="text-violet-200" strokeWidth={2.5} />
                                </div>
                                <span className="rounded-full bg-violet-500/20 border border-violet-400/30 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-violet-200">
                                    256-bit
                                </span>
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-white tracking-tight leading-snug">Encrypted Messages</p>
                                <p className="mt-1 text-[9.5px] text-slate-300 leading-normal">
                                    End-to-end protected chats with self-destruct
                                </p>
                            </div>
                        </div>

                        {/* Zero Knowledge */}
                        <div className="metric-card rounded-[1.75rem] p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <div 
                                    className="grid h-9 w-9 place-items-center rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(244,114,182,0.3), rgba(236,72,153,0.2))',
                                        border: '1px solid rgba(244,114,182,0.4)',
                                    }}
                                >
                                    <Eye size={16} className="text-pink-200" strokeWidth={2.5} />
                                </div>
                                <span className="rounded-full bg-pink-500/20 border border-pink-400/30 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-pink-200">
                                    ZK-Proof
                                </span>
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-white tracking-tight leading-snug">Zero Knowledge</p>
                                <p className="mt-1 text-[9.5px] text-slate-300 leading-normal">
                                    Decentralized authentication leaving zero footprint
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Two More Cards - Side by Side (Row 2) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                            duration: 0.6, 
                            delay: 0.5,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="grid grid-cols-2 gap-3"
                    >
                        {/* Ghost Circles */}
                        <div className="metric-card rounded-[1.75rem] p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <div 
                                    className="grid h-9 w-9 place-items-center rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(52,211,153,0.3), rgba(16,185,129,0.2))',
                                        border: '1px solid rgba(52,211,153,0.4)',
                                    }}
                                >
                                    <Shield size={16} className="text-emerald-200" strokeWidth={2.5} />
                                </div>
                                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-emerald-200">
                                    P2P Mesh
                                </span>
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-white tracking-tight leading-snug">Ghost Circles</p>
                                <p className="mt-1 text-[9.5px] text-slate-300 leading-normal">
                                    Private peer-to-peer groups with ephemeral relays
                                </p>
                            </div>
                        </div>

                        {/* Quantum Vault */}
                        <div className="metric-card rounded-[1.75rem] p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <div 
                                    className="grid h-9 w-9 place-items-center rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(251,146,60,0.3), rgba(249,115,22,0.2))',
                                        border: '1px solid rgba(251,146,60,0.4)',
                                    }}
                                >
                                    <Zap size={16} className="text-orange-200" strokeWidth={2.5} />
                                </div>
                                <span className="rounded-full bg-orange-500/20 border border-orange-400/30 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-orange-200">
                                    Cold Core
                                </span>
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-white tracking-tight leading-snug">Quantum Vault</p>
                                <p className="mt-1 text-[9.5px] text-slate-300 leading-normal">
                                    Air-gapped biometric vault for critical asset security
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* 5. BOTTOM DOCK - Fixed position from bottom */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                        duration: 0.7, 
                        delay: 0.6,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                    className="fixed left-6 right-6 z-40 flex items-center justify-between rounded-[1.6rem] px-4 py-2"
                    style={{
                        bottom: 'max(4.25rem, calc(env(safe-area-inset-bottom, 0px) + 3.75rem))',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%), rgba(30,27,75,0.5)',
                        border: '1.5px solid rgba(255,255,255,0.22)',
                        borderTop: '2px solid rgba(255,255,255,0.35)',
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.55), inset 0 1px 1.5px rgba(255,255,255,0.2)',
                        transform: 'translateZ(0)',
                        willChange: 'transform, opacity',
                    }}
                >
                    {slides.slice(0, 4).map((slide, idx) => {
                        const DockIcon = slide.icon;
                        const isActive = idx === activeSlide;
                        return (
                            <button
                                key={slide.id}
                                onClick={() => handleSlideChange(idx)}
                                className="flex flex-col items-center gap-1 py-1 px-2 transition-all active:scale-95"
                            >
                                <DockIcon 
                                    size={20} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                    className={isActive ? 'text-sky-300' : 'text-slate-400'}
                                />
                                <span className={`text-[8px] font-semibold tracking-tight ${isActive ? 'text-sky-300' : 'text-slate-400'}`}>
                                    {slide.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* Priya Avatar */}
                    <button
                        onClick={() => setPriyaOpen(true)}
                        className="flex flex-col items-center py-1 px-2 transition-all active:scale-95"
                    >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-pink-400/50 shadow-[0_0_12px_rgba(244,114,182,0.6)]">
                            <img
                                src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop"
                                alt="Priya AI"
                                className="w-full h-full object-cover"
                                style={{ filter: 'saturate(1.3) brightness(0.95)' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-violet-900/40 to-transparent" />
                        </div>
                        <span className="mt-0.5 block text-[8px] font-semibold tracking-tight text-pink-300">Priya</span>
                    </button>
                </motion.div>

            </div>

            {/* Priya Assistant Modal */}
            <AnimatePresence>
                {priyaOpen && (
                    <PriyaAssistant
                        forceOpen={true}
                        onClose={() => setPriyaOpen(false)}
                        landingMode={true}
                        onNavigate={(view) => {
                            setPriyaOpen(false);
                            if (view === 'login') onLogin();
                            if (view === 'signup') onRegister();
                        }}
                    />
                )}
            </AnimatePresence>
        </main>
    );
};

export default MobileLandingPage;
