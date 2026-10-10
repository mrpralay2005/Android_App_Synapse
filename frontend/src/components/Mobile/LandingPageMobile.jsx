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
                        radial-gradient(115% 70% at 50% -12%, rgba(56, 189, 248, 0.38) 0%, rgba(99, 102, 241, 0.28) 35%, transparent 72%),
                        radial-gradient(90% 60% at 100% 55%, rgba(192, 132, 252, 0.28) 0%, transparent 68%),
                        radial-gradient(80% 55% at 0% 85%, rgba(56, 189, 248, 0.24) 0%, transparent 70%),
                        linear-gradient(172deg, #0d1238 0%, #080a26 42%, #050616 100%) !important;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
                    overflow-x: hidden;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }

                .mobile-liquid-landing::-webkit-scrollbar {
                    display: none;
                }

                .mobile-liquid-landing * {
                    box-sizing: border-box;
                }

                /* Deep Fluid Ambient Mesh with Bokeh */
                .mobile-liquid-landing::before {
                    content: "";
                    pointer-events: none;
                    position: absolute;
                    inset: 0;
                    opacity: 0.4;
                    background-image:
                        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px);
                    background-size: 22px 22px;
                    mask-image: radial-gradient(ellipse at 50% 35%, black 45%, transparent 85%);
                }

                /* Luminous Liquid Aurora Orbs (Aquamorphic Backlighting) */
                .mobile-liquid-landing .liquid-ambient-orb {
                    position: absolute;
                    border-radius: 9999px;
                    pointer-events: none;
                    mix-blend-mode: screen;
                    filter: blur(50px);
                    opacity: 0.85;
                    animation: liquidFloat 12s ease-in-out infinite alternate;
                }

                @keyframes liquidFloat {
                    0% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-18px) scale(1.1) translateX(12px); }
                    100% { transform: translateY(14px) scale(0.94) translateX(-10px); }
                }

                /* TRUE FLOATING LIQUID GLASS MATERIALS (Oppo ColorOS 17 / Aquamorphic 2.0) */
                .mobile-liquid-landing .liquid-glass-header {
                    position: relative;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.24) 0%, rgba(186, 215, 255, 0.12) 50%, rgba(255, 255, 255, 0.05) 100%), rgba(11, 15, 45, 0.62);
                    border: 1px solid rgba(255, 255, 255, 0.28);
                    border-top: 1.8px solid rgba(255, 255, 255, 0.65);
                    border-left: 1.4px solid rgba(255, 255, 255, 0.45);
                    box-shadow:
                        inset 0 2px 2px 0 rgba(255, 255, 255, 0.55),
                        inset 0 -1.5px 2px 0 rgba(99, 102, 241, 0.2),
                        0 16px 40px -8px rgba(0, 0, 0, 0.65),
                        0 0 24px -2px rgba(56, 189, 248, 0.28);
                    -webkit-backdrop-filter: blur(32px) saturate(210%);
                    backdrop-filter: blur(32px) saturate(210%);
                }

                .mobile-liquid-landing .liquid-glass-panel {
                    position: relative;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(190, 220, 255, 0.12) 40%, rgba(220, 180, 255, 0.14) 75%, rgba(255, 255, 255, 0.04) 100%), rgba(12, 17, 50, 0.55);
                    border: 1.5px solid rgba(255, 255, 255, 0.32);
                    border-top: 2.2px solid rgba(255, 255, 255, 0.75);
                    border-left: 1.8px solid rgba(255, 255, 255, 0.55);
                    box-shadow:
                        inset 0 2px 2px 0 rgba(255, 255, 255, 0.68),
                        inset 0 -2px 3px 0 rgba(125, 211, 252, 0.35),
                        0 24px 50px -10px rgba(0, 0, 0, 0.72),
                        0 0 35px -5px rgba(56, 189, 248, 0.3);
                    -webkit-backdrop-filter: blur(32px) saturate(220%);
                    backdrop-filter: blur(32px) saturate(220%);
                }

                .mobile-liquid-landing .liquid-glass-card {
                    position: relative;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.20) 0%, rgba(180, 210, 255, 0.09) 55%, rgba(255, 255, 255, 0.03) 100%), rgba(15, 21, 58, 0.52);
                    border: 1px solid rgba(255, 255, 255, 0.26);
                    border-top: 1.5px solid rgba(255, 255, 255, 0.55);
                    border-left: 1.2px solid rgba(255, 255, 255, 0.40);
                    box-shadow:
                        inset 0 1.5px 1.2px 0 rgba(255, 255, 255, 0.52),
                        inset 0 -1px 1.5px 0 rgba(129, 140, 248, 0.2),
                        0 14px 34px -8px rgba(0, 0, 0, 0.5);
                    -webkit-backdrop-filter: blur(24px) saturate(200%);
                    backdrop-filter: blur(24px) saturate(200%);
                }

                .mobile-liquid-landing .liquid-glass-pill {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(180, 210, 255, 0.10) 100%), rgba(16, 22, 60, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.28);
                    border-top: 1.5px solid rgba(255, 255, 255, 0.55);
                    box-shadow:
                        inset 0 1.2px 1px 0 rgba(255, 255, 255, 0.5),
                        0 8px 22px -4px rgba(0, 0, 0, 0.4);
                    -webkit-backdrop-filter: blur(20px) saturate(190%);
                    backdrop-filter: blur(20px) saturate(190%);
                }

                /* Liquid Glass Shimmer Highlight Beam */
                .mobile-liquid-landing .liquid-shimmer::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    right: 10%;
                    width: 52%;
                    height: 2px;
                    border-radius: 9999px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.98), transparent);
                    filter: drop-shadow(0 0 8px rgba(125, 211, 252, 0.95));
                    pointer-events: none;
                }

                /* Liquid Buttons */
                .mobile-liquid-landing .liquid-btn-primary {
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(116deg, #f0f9ff 0%, #7dd3fc 26%, #818cf8 65%, #c084fc 100%);
                    box-shadow:
                        0 16px 36px -4px rgba(56, 189, 248, 0.55),
                        0 4px 14px 0 rgba(99, 102, 241, 0.35),
                        inset 0 2px 2px rgba(255, 255, 255, 0.98),
                        inset 0 -2px 4px rgba(24, 38, 110, 0.4);
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
                }

                .mobile-liquid-landing .liquid-btn-primary:active {
                    transform: scale(0.96);
                    box-shadow:
                        0 8px 20px -2px rgba(56, 189, 248, 0.45),
                        inset 0 1px 1px rgba(255, 255, 255, 0.9);
                }

                .mobile-liquid-landing .liquid-btn-secondary {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.20) 0%, rgba(180, 195, 255, 0.08) 100%), rgba(18, 24, 65, 0.62);
                    border: 1.2px solid rgba(255, 255, 255, 0.32);
                    border-top: 1.8px solid rgba(255, 255, 255, 0.6);
                    box-shadow:
                        inset 0 1.5px 1.2px 0 rgba(255, 255, 255, 0.45),
                        0 12px 28px -6px rgba(0, 0, 0, 0.45);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    backdrop-filter: blur(24px) saturate(180%);
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .mobile-liquid-landing .liquid-btn-secondary:active {
                    transform: scale(0.96);
                }

                /* ColorOS 17 Fluid Toggle Switch */
                .mobile-liquid-landing .liquid-toggle-track {
                    width: 46px;
                    height: 26px;
                    border-radius: 9999px;
                    padding: 2.5px;
                    transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
                    border: 1px solid rgba(255, 255, 255, 0.35);
                }

                .mobile-liquid-landing .liquid-toggle-active {
                    background: linear-gradient(135deg, #38bdf8, #818cf8);
                    box-shadow: 0 0 16px rgba(56, 189, 248, 0.65), inset 0 1.2px 1px rgba(255, 255, 255, 0.65);
                }

                .mobile-liquid-landing .liquid-toggle-inactive {
                    background: rgba(255, 255, 255, 0.16);
                    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
                }

                .mobile-liquid-landing .liquid-toggle-thumb {
                    width: 19px;
                    height: 19px;
                    border-radius: 9999px;
                    background: #ffffff;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.9);
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                /* Luminous Liquid Pedestal Stage (Bottom Volumetric Reflection) */
                .mobile-liquid-landing .liquid-pedestal-platform {
                    position: relative;
                    width: 100%;
                    height: 54px;
                    border-radius: 50%;
                    background: radial-gradient(ellipse at 50% 50%, rgba(56, 189, 248, 0.45) 0%, rgba(129, 140, 248, 0.25) 35%, rgba(192, 132, 252, 0.12) 55%, transparent 75%);
                    filter: blur(12px);
                    pointer-events: none;
                }

                .mobile-liquid-landing .liquid-pedestal-rim {
                    position: absolute;
                    left: 6%;
                    right: 6%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.95) 20%, rgba(255, 255, 255, 1) 50%, rgba(192, 132, 252, 0.95) 80%, transparent);
                    box-shadow: 0 0 22px 3px rgba(56, 189, 248, 0.85);
                }

                /* Floating Liquid Dock (ColorOS 17 Aquamorphic Style) */
                .mobile-liquid-landing .liquid-glass-dock {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.24) 0%, rgba(186, 215, 255, 0.12) 50%, rgba(255, 255, 255, 0.05) 100%), rgba(10, 14, 42, 0.68);
                    border: 1.2px solid rgba(255, 255, 255, 0.30);
                    border-top: 1.8px solid rgba(255, 255, 255, 0.65);
                    box-shadow:
                        inset 0 1.8px 1.2px 0 rgba(255, 255, 255, 0.58),
                        inset 0 -1.5px 2px 0 rgba(99, 102, 241, 0.22),
                        0 24px 55px -10px rgba(0, 0, 0, 0.8),
                        0 0 28px -2px rgba(56, 189, 248, 0.3);
                    -webkit-backdrop-filter: blur(34px) saturate(220%);
                    backdrop-filter: blur(34px) saturate(220%);
                }

                /* Fluid Typography */
                .mobile-liquid-landing .liquid-hero-title {
                    font-size: clamp(2.35rem, 10.6vw, 3.25rem);
                    line-height: 0.95;
                    letter-spacing: -0.075em;
                }

                .mobile-liquid-landing .liquid-title-gradient {
                    background: linear-gradient(108deg, #ffffff 0%, #bae6fd 30%, #7dd3fc 60%, #c084fc 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    filter: drop-shadow(0 2px 14px rgba(56, 189, 248, 0.35));
                }


            `}</style>

            {/* Dynamic Ambient Background Orbs */}
            <div className="liquid-ambient-orb -left-20 top-16 h-64 w-64 bg-[#38bdf8]/30" />
            <div className="liquid-ambient-orb -right-16 top-48 h-72 w-72 bg-[#a855f7]/25" />
            <div className="liquid-ambient-orb left-1/4 top-[58%] h-80 w-80 bg-[#6366f1]/22" />
            <div className="liquid-ambient-orb bottom-[-4rem] right-4 h-64 w-64 bg-[#06b6d4]/25" />

            {/* Main Content Area (Scrollable with smooth natural elasticity) */}
            <div className="relative z-10 mx-auto flex min-h-full max-w-md flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(5.5rem,env(safe-area-inset-bottom))]">

                {/* 1. FLOATING LIQUID GLASS HEADER BAR (ColorOS 17 Floating Capsule) */}
                <motion.header
                    initial={{ opacity: 0, y: -16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                    className="liquid-glass-header liquid-shimmer flex items-center justify-between px-3.5 py-2 rounded-full mb-2"
                >
                    <div className="flex items-center gap-2.5">
                        {/* 3D Liquid Squircle Brand Badge */}
                        <div className="relative grid h-9 w-9 place-items-center rounded-[1rem] bg-gradient-to-br from-[#e0f2fe] via-[#7dd3fc] to-[#a855f7] shadow-[0_6px_20px_rgba(56,189,248,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.95)]">
                            <Fingerprint size={19} strokeWidth={2.3} className="text-[#070b28]" />
                            <div className="absolute inset-0 rounded-[1rem] bg-white/20 opacity-40 mix-blend-overlay" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[1.25rem] font-black tracking-[-0.06em] text-white">Nexus</span>
                                <span className="rounded-full border border-sky-400/40 bg-sky-400/15 px-1.5 py-0.2 text-[7.5px] font-black uppercase tracking-wider text-sky-200">
                                    OS 17
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* IST Live Clock with pulse beacon */}
                        {istTime && (
                            <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" />
                                </span>
                                <span className="text-[11px] font-black tabular-nums text-white tracking-tight">{istTime}</span>
                            </div>
                        )}

                        {onExit && (
                            <button
                                type="button"
                                onClick={onExit}
                                className="liquid-glass-pill grid h-7 w-7 place-items-center rounded-full text-slate-300 hover:text-white transition-all active:scale-90"
                                aria-label="Exit"
                                title="Exit"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </motion.header>

                {/* 2. LIQUID HERO TYPOGRAPHY */}
                <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-5"
                >
                    <div className="liquid-glass-pill mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#bae6fd]">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_8px_#38bdf8]" />
                        </span>
                        <Sparkles size={11} className="text-sky-300" />
                        A calmer way to connect
                    </div>

                    <h1 className="liquid-hero-title font-black text-white">
                        Your world,
                        <span className="liquid-title-gradient block">beautifully protected.</span>
                    </h1>

                    <p className="mt-3.5 max-w-[21rem] text-[0.875rem] leading-[1.48] text-[#cbd5e1]">
                        A quieter, private sanctuary for real moments, protected by fluid zero-knowledge architecture.
                    </p>
                </motion.section>

                {/* 3. HERO ACTION BUTTONS (HIGH-ELEVATION LIQUID FINISH) */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.52, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-5 grid grid-cols-[1.25fr_0.85fr] gap-2.5"
                >
                    <button
                        type="button"
                        onClick={onLogin}
                        className="liquid-btn-primary flex min-h-[3.35rem] items-center justify-center gap-1.5 rounded-[1.3rem] px-4 text-sm font-black tracking-[-0.025em] text-[#05081f]"
                    >
                        <span>Welcome back</span>
                        <ArrowUpRight size={17} strokeWidth={2.6} />
                    </button>

                    {previewMode ? (
                        <div className="liquid-btn-secondary flex min-h-[3.35rem] items-center justify-center rounded-[1.3rem] px-3 text-center text-[9px] font-black uppercase leading-tight tracking-[0.14em] text-[#e0f2fe]">
                            Private Preview
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onRegister}
                            className="liquid-btn-secondary flex min-h-[3.35rem] items-center justify-center rounded-[1.3rem] px-3 text-sm font-extrabold tracking-[-0.025em] text-[#f8fafc]"
                        >
                            Create account
                        </button>
                    )}
                </motion.div>

                {/* 4. THE CENTERPIECE: SLIDING LIQUID GLASS FEATURE SHOWCASE */}
                <motion.section
                    initial={{ opacity: 0, y: 22, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.58, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="liquid-glass-panel liquid-shimmer mt-5 rounded-[2rem] p-4"
                    aria-label="Liquid Glass Feature Showcase"
                >
                    {/* Header: current slide title + Live badge */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSlide + '-header'}
                                initial={{ opacity: 0, x: slideDirection * 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: slideDirection * -20 }}
                                transition={{ duration: 0.22 }}
                                className="flex items-center gap-2"
                            >
                                <div className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${slides[activeSlide].iconColor} border ${slides[activeSlide].iconBorder} ${slides[activeSlide].iconText}`}>
                                    {React.createElement(slides[activeSlide].icon, { size: 16 })}
                                </div>
                                <div>
                                    <p className="text-[11px] font-black tracking-[-0.02em] text-white">{slides[activeSlide].title}</p>
                                    <p className={`text-[9px] font-bold ${slides[activeSlide].iconText}/80`}>{slides[activeSlide].subtitle}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-2.5 py-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Live</span>
                        </div>
                    </div>

                    {/* Slide content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSlide}
                            initial={{ opacity: 0, x: slideDirection * 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: slideDirection * -40 }}
                            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* Coming Soon slide */}
                            {slides[activeSlide].id === 'coming' ? (
                                <div className="mt-4 flex flex-col items-center justify-center py-4 gap-3">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15">
                                        <Sparkles size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-[13px] font-black text-white tracking-tight">Something Big Is Coming</p>
                                    <p className="text-[10px] text-slate-500 text-center max-w-[180px] leading-relaxed">A feature so wild we can't show it yet. Stay tuned.</p>
                                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 mt-1">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-60" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" />
                                        </span>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Coming Soon</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Feature cards grid */}
                                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                                        {slides[activeSlide].cards.map((qa) => {
                                            const IconComponent = qa.icon;
                                            return (
                                                <div
                                                    key={qa.id}
                                                    className="liquid-glass-card text-left rounded-2xl p-2.5"
                                                >
                                                    <div className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${qa.color} text-white shadow-md shadow-sky-500/20`}>
                                                        <IconComponent size={14} strokeWidth={2.4} />
                                                    </div>
                                                    <p className="mt-2 text-[10px] font-extrabold leading-tight tracking-[-0.02em] text-white">{qa.label}</p>
                                                    <p className="mt-0.5 text-[8px] leading-tight text-slate-400">{qa.sub}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer capsule */}
                                    <div className="liquid-glass-card mt-3 flex items-center justify-between rounded-xl px-3 py-2 border border-white/10">
                                        <div className="flex items-center gap-2.5">
                                            <span className="relative flex h-2 w-2">
                                                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${slides[activeSlide].footer.dot} opacity-60`} />
                                                <span className={`relative inline-flex h-2 w-2 rounded-full ${slides[activeSlide].footer.dot}`} />
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-300">{slides[activeSlide].footer.text}</span>
                                        </div>
                                        <span className={`text-[9px] font-black tracking-wider ${slides[activeSlide].footer.statColor}`}>
                                            {slides[activeSlide].footer.stat}
                                        </span>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.section>

                {/* 5. LIQUID GLASS FLOATING DOCK (ColorOS 17 / iOS 18 Liquid Dock Navigation) */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-4 flex flex-col items-center"
                >
                    <div className="liquid-glass-dock relative flex items-center justify-between gap-1 rounded-[1.6rem] px-3.5 py-2 w-full max-w-[340px]">
                        {slides.map((slide, idx) => {
                            const DockIcon = slide.icon;
                            const isActive = idx === activeSlide;
                            const isPriya = slide.id === 'priya';
                            return (
                                <button
                                    key={slide.id}
                                    type="button"
                                    onClick={() => isPriya ? setPriyaOpen(true) : handleSlideChange(idx)}
                                    className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 ${
                                        isActive && !isPriya ? 'text-sky-300 font-bold' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {isPriya ? (
                                        <div className={`relative w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-200 ${isActive ? 'border-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.7)]' : 'border-white/20'}`}>
                                            <img
                                                src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop"
                                                alt="Priya AI"
                                                className="w-full h-full object-cover"
                                                style={{ filter: 'saturate(1.3) brightness(0.95)' }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-violet-900/40 to-transparent" />
                                        </div>
                                    ) : (
                                        <DockIcon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    )}
                                    <span className={`mt-1 text-[8px] tracking-tight ${isPriya ? 'text-pink-300' : ''}`}>{slide.label}</span>
                                    {isActive && !isPriya && (
                                        <motion.div
                                            layoutId="liquidDockIndicator"
                                            className="absolute -bottom-1 h-1 w-5 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 shadow-[0_0_8px_#38bdf8]"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Volumetric Glowing Pedestal Underneath Dock (Reference image illumination) */}
                    <div className="liquid-pedestal-platform mt-1">
                        <div className="liquid-pedestal-rim top-2" />
                    </div>
                </motion.div>

            </div>
            {/* Real Priya AI - controlled open via dock button */}
            <PriyaAssistant
                landingMode
                forceOpen={priyaOpen}
                onClose={() => setPriyaOpen(false)}
                onNavigate={(view) => {
                    if (view === 'signup') onRegister();
                    else if (view === 'login') onLogin();
                }}
            />

            {/* Liquid Glass overrides for Priya inside landing page */}
            <style>{`
                .mobile-priya-sheet {
                    background:
                        radial-gradient(110% 65% at 50% -10%, rgba(56, 189, 248, 0.28) 0%, rgba(99, 102, 241, 0.22) 36%, transparent 72%),
                        radial-gradient(85% 55% at 100% 60%, rgba(192, 132, 252, 0.24) 0%, transparent 65%),
                        linear-gradient(168deg, #0a0d25 0%, #060818 45%, #04050f 100%) !important;
                }
                .mobile-priya-sheet-header {
                    margin: 10px 14px 8px 14px !important;
                    border-radius: 26px !important;
                    border: 1.5px solid rgba(255, 255, 255, 0.32) !important;
                    border-top: 2.2px solid rgba(255, 255, 255, 0.85) !important;
                    border-left: 1.8px solid rgba(255, 255, 255, 0.60) !important;
                    background: linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(147,197,253,0.10) 45%, rgba(192,132,252,0.06) 75%, rgba(255,255,255,0.03) 100%), rgba(10,14,42,0.68) !important;
                    box-shadow: inset 0 2px 2px 0 rgba(255,255,255,0.65), inset 0 -1.5px 2px 0 rgba(125,211,252,0.25), 0 20px 45px -10px rgba(0,0,0,0.72), 0 0 30px -4px rgba(56,189,248,0.30) !important;
                    -webkit-backdrop-filter: blur(32px) saturate(210%) !important;
                    backdrop-filter: blur(32px) saturate(210%) !important;
                }
                .mobile-priya-nudge {
                    background: linear-gradient(135deg, rgba(255,255,255,0.14), rgba(145,175,255,0.06)), rgba(11,15,45,0.92) !important;
                    border-color: rgba(56,189,248,0.35) !important;
                    box-shadow: 0 10px 30px rgba(56,189,248,0.35), inset 0 1px 1px rgba(255,255,255,0.4) !important;
                    color: #e2e8f0 !important;
                }
                .synapse-priya-launcher {
                    display: none !important;
                }
            `}</style>
        </main>
    );
};

export default MobileLandingPage;
