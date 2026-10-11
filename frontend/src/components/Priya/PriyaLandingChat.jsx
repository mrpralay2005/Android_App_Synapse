import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    ArrowUp,
    Sparkles,
    Code2,
    PenTool,
    MessageSquare,
    Clock,
    Camera,
    Plus,
    Send,
    ChevronLeft,
    X,
    Bell,
    Layers,
    Shield,
    Users,
    MoreHorizontal
} from 'lucide-react';
// PriyaAvatar removed - using real photo now

// ─── API Config ────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';

const callLandingAI = async (message, history = []) => {
    try {
        const res = await fetch(`${API_URL}/api/ai/priya-landing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: history
                    .slice(-4)
                    .map(m => ({
                        role: m.role === 'priya' ? 'assistant' : 'user',
                        content: String(m.text || '').slice(0, 200)
                    }))
            })
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.fallback || !data.success) return null;
        return data.reply || null;
    } catch {
        return null;
    }
};

// ─── Preset Knowledge Topics ──────────────────────────────────────────────────
const TOPICS = [
    {
        id: 'how-to-signup',
        chip: 'How do I sign up?',
        answer: "Tap **Create account** on the home page. 🚀\n1. Enter your name, email, username and password.\n2. Check your email for a one-time code (OTP).\n3. Enter the code to verify your account.\n4. Done — now log in!",
        followUps: ['otp-help', 'go-signup'],
        action: { label: 'Take me to Sign Up', type: 'navigate', view: 'signup' }
    },
    {
        id: 'how-to-login',
        chip: 'How do I log in?',
        answer: "Tap **Welcome back** on the home page. 🔑\nEnter your username and password — that's it.\nIf you forgot your password, use the **Forgot password** link on the login screen.",
        followUps: ['forgot-password', 'go-login'],
        action: { label: 'Take me to Login', type: 'navigate', view: 'login' }
    },
    {
        id: 'forgot-password',
        chip: 'I forgot my password',
        answer: "No problem at all! 💜\n1. Tap **Welcome back**.\n2. On the login screen tap **Forgot password**.\n3. Enter your registered email — we send a one-time reset code.\n4. Enter the code and set a new password.",
        followUps: ['go-login'],
        action: { label: 'Go to Login', type: 'navigate', view: 'login' }
    },
    {
        id: 'otp-help',
        chip: 'OTP not received',
        answer: "Check your spam or promotions folder first. 📧\nIf it's still not there:\n• Wait a minute — email delivery can lag.\n• Make sure you used the correct email address.\n• Request a new code from the verification screen.",
        followUps: ['how-to-signup']
    },
    {
        id: 'what-is-synapsex',
        chip: 'What is SynapseX?',
        answer: "SynapseX is an AI-powered social sanctuary with zero-knowledge encryption. 🔐\nYou get a fluid social feed, Stories, direct messages, and behavioral privacy.\nCreate a free account to explore everything!",
        followUps: ['how-to-signup', 'how-to-login']
    },
    {
        id: 'go-signup',
        chip: 'Sign me up',
        answer: "Great choice! Tap below to create your account. 🎉",
        followUps: [],
        action: { label: 'Sign Up now', type: 'navigate', view: 'signup' }
    },
    {
        id: 'go-login',
        chip: 'Log me in',
        answer: "On your way! Tap below to log in. 👇",
        followUps: [],
        action: { label: 'Log In now', type: 'navigate', view: 'login' }
    },
    {
        id: 'code-wizard',
        chip: 'Code Wizard',
        answer: "Here is a CSS snippet for a high-performance glass effect using ColorOS 17 tones:\n\n```css\n.glass-card {\n  background: rgba(139, 92, 246, 0.12);\n  backdrop-filter: blur(24px);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n  box-shadow: inset 0 1px 1px rgba(255,255,255,0.2);\n}\n```\n\nNeed assistance implementing this in your project?",
        followUps: ['what-is-synapsex', 'how-to-signup']
    },
    {
        id: 'creative-copy',
        chip: 'Creative Copy',
        answer: "Here's a creative bio idea for your new profile:\n\n*\"Curating real moments in a digital sanctuary. Protected by zero-knowledge encryption, powered by AI.\"*\n\nWould you like me to refine this or write a story?",
        followUps: ['how-to-signup', 'what-is-synapsex']
    }
];

const DEFAULT_CHIPS = ['how-to-signup', 'how-to-login', 'what-is-synapsex'];

const SMALLTALK = {
    greetings: ['hi','hii','hello','hey','heyy','yo','namaste','good morning','good evening','good afternoon'],
    thanks:    ['thanks','thank you','thankyou','thx','ty','great','awesome','perfect','nice'],
    farewell:  ['bye','byee','goodbye','see you','good night'],
};

const matchQuery = (raw) => {
    const q = raw.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
    for (const [kind, words] of Object.entries(SMALLTALK)) {
        if (words.some(w => q === w || q.startsWith(w+' ') || q.endsWith(' '+w))) return { type:'smalltalk', kind };
    }
    let best = null, bestScore = 0;
    for (const t of TOPICS) {
        let score = 0;
        const hay = [t.chip.toLowerCase(), t.id.replace(/-/g,' '), ...(t.answer.toLowerCase().split('\n').slice(0,1))].join(' ');
        const words = q.split(' ').filter(w => w.length > 2);
        if (q.includes(t.chip.toLowerCase())) score += 6;
        if (q.includes(t.id.replace(/-/g,' '))) score += 4;
        words.forEach(w => { if (hay.includes(w)) score += 1; });
        if (score > bestScore) { bestScore = score; best = t; }
    }
    if (bestScore >= 2) return { type:'topic', topic: best };
    return { type:'unknown' };
};

let seq = 0;
const nid = () => `lc-${Date.now()}-${seq++}`;

// Format rich text with markdown and code blocks
const formatRich = (text) => {
    // Check if contains code block
    if (text.includes('```')) {
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const lines = part.slice(3, -3).trim().split('\n');
                const lang = lines[0].match(/^[a-z]+/i) ? lines[0] : '';
                const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
                return (
                    <div key={i} className="my-2.5 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d22]/90 p-3 font-mono text-[11.5px] text-cyan-200 shadow-inner">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] uppercase tracking-wider text-slate-400">
                            <span>{lang || 'code'}</span>
                            <span className="text-emerald-400">synapse</span>
                        </div>
                        <pre className="overflow-x-auto text-emerald-300">
                            <code>{code}</code>
                        </pre>
                    </div>
                );
            }
            return (
                <span key={i}>
                    {part.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((p, j) => {
                        if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} className="font-extrabold text-white tracking-tight">{p.slice(2,-2)}</strong>;
                        if (p.startsWith('*') && p.endsWith('*')) return <em key={j} className="italic text-purple-200">{p.slice(1,-1)}</em>;
                        return p;
                    })}
                </span>
            );
        });
    }

    return String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-extrabold text-white tracking-tight">{p.slice(2,-2)}</strong>;
        if (p.startsWith('*') && p.endsWith('*')) return <em key={i} className="italic text-purple-200">{p.slice(1,-1)}</em>;
        return <span key={i}>{p}</span>;
    });
};

const TypingDots = () => (
    <div className="flex items-center gap-1.5 px-1 py-1">
        {[0, 1, 2].map(i => (
            <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 shadow-[0_0_6px_rgba(168,85,247,0.6)]"
                animate={{ opacity: [0.35, 1, 0.35], y: [0, -4, 0] }}
                transition={{ duration: 1.1, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
            />
        ))}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SCREEN 1: GET STARTED SPLASH (Matches media_1791668907501_bedf3d5a.png) ──
// ═══════════════════════════════════════════════════════════════════════════════
const GetStartedScreen = ({ onStart, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="relative flex h-full flex-col justify-between px-6 pt-5 pb-14 sm:pb-8 overflow-y-auto no-scrollbar"
        style={{
            paddingBottom: 'max(3.25rem, calc(env(safe-area-inset-bottom, 0px) + 2.25rem))',
            background: 'linear-gradient(160deg, rgba(30,27,75,0.95) 0%, rgba(88,28,135,0.85) 35%, rgba(49,46,129,0.9) 70%, rgba(30,27,75,0.95) 100%)',
        }}
    >
        {/* Background Ambient Bubbles (ColorOS 17 signature floating glass spheres) */}
        <div
            className="pointer-events-none absolute -right-14 -top-8 h-60 w-60 rounded-full"
            style={{
                background: 'radial-gradient(circle at 35% 35%, rgba(168,85,247,0.36), rgba(124,58,237,0.16) 50%, transparent 75%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: 'inset 0 -8px 24px rgba(124,58,237,0.2), 0 12px 36px -6px rgba(0,0,0,0.35)',
            }}
        />
        <div
            className="pointer-events-none absolute -left-12 top-[32%] h-44 w-44 rounded-full"
            style={{
                background: 'radial-gradient(circle at 40% 30%, rgba(192,132,252,0.30), rgba(147,51,234,0.12) 55%, transparent 75%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 -6px 20px rgba(147,51,234,0.15)',
            }}
        />
        <div
            className="pointer-events-none absolute right-2 bottom-[24%] h-36 w-36 rounded-full"
            style={{
                background: 'radial-gradient(circle at 30% 35%, rgba(196,181,253,0.28), rgba(139,92,246,0.10) 55%, transparent)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 -5px 16px rgba(139,92,246,0.12)',
            }}
        />

        {/* Top Header: Badge + Close Button */}
        <div className="relative z-10 flex items-center justify-between">
            <div 
                className="rounded-full px-3.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.22em] text-purple-200"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(168,85,247,0.08) 100%), rgba(20,20,46,0.4)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderTop: '1.5px solid rgba(255,255,255,0.35)',
                    boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.15), 0 8px 20px -4px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                Next-Gen Intelligence
            </div>

            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-300 transition-all active:scale-90 hover:text-white"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.09), rgba(168,85,247,0.05)), rgba(18,18,42,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1.5px solid rgba(255,255,255,0.28)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12), 0 6px 16px -3px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(16px)',
                }}
            >
                <X size={15} />
            </button>
        </div>

        {/* Centerpiece: Glowing Infinity Squircle + Title */}
        <div className="relative z-10 flex flex-col items-center text-center my-auto py-2">
            {/* 3D Liquid Squircle with Priya AI Avatar (Clean, no glitched circle) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-3 grid h-[88px] w-[88px] place-items-center rounded-[1.85rem]"
                style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(124,58,237,0.25) 50%, rgba(255,255,255,0.08) 100%), rgba(20,20,46,0.7)',
                    border: '1.5px solid rgba(255,255,255,0.22)',
                    borderTop: '2px solid rgba(255,255,255,0.45)',
                    boxShadow: '0 20px 48px -10px rgba(168,85,247,0.5), inset 0 2px 2px rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(28px)',
                }}
            >
                {/* Specular highlight */}
                <div className="pointer-events-none absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                
                <img
                    src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80&auto=format&fit=crop"
                    alt="Priya AI"
                    style={{
                        width: "100%", height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        filter: "saturate(1.3) brightness(0.95)",
                        borderRadius: "1.85rem",
                    }}
                />
                <div style={{ position:"absolute", inset:0, borderRadius:"1.85rem", background:"linear-gradient(to top, rgba(124,58,237,0.35) 0%, transparent 60%)", pointerEvents:"none" }} />
            </motion.div>

            {/* NEURAL. Heading with glowing violet dot */}
            <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="flex items-center justify-center text-[32px] sm:text-4xl font-black tracking-[-0.05em] text-white"
            >
                <span>NEURAL</span>
                <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-[#c084fc] shadow-[0_0_10px_#c084fc]" />
            </motion.h1>

            {/* Subtitle */}
            <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-2.5 max-w-[240px] text-[12.5px] leading-relaxed text-slate-300"
            >
                Your personal AI companion for infinite possibilities.
            </motion.p>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42, duration: 0.5 }}
                className="mt-3 flex items-center gap-2.5"
            >
                <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full border-2 border-[#121228] bg-gradient-to-br from-violet-400 to-purple-600 grid place-items-center"><Users size={11} className="text-white" /></div>
                    <div className="h-6 w-6 rounded-full border-2 border-[#121228] bg-gradient-to-br from-sky-400 to-indigo-600 grid place-items-center"><Users size={11} className="text-white" /></div>
                    <div className="h-6 w-6 rounded-full border-2 border-[#121228] bg-gradient-to-br from-fuchsia-400 to-pink-600 grid place-items-center"><Users size={11} className="text-white" /></div>
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-slate-400">Trusted by 2M+ users</span>
            </motion.div>
        </div>

        {/* Bottom CTA Row: Get Started Button (Raised up, never cut off) */}
        <div className="relative z-10 w-full flex flex-col items-center mb-1">
            <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                onClick={onStart}
                className="flex w-full items-center justify-center rounded-2xl py-3.5 text-[15px] font-black tracking-tight text-[#070b24] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98]"
                style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                    boxShadow: '0 16px 36px -6px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.95)',
                }}
            >
                Get Started
            </motion.button>
        </div>
    </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SCREEN 2: HOME DASHBOARD (Matches media_1791668907477_82f28028.png) ──────
// ═══════════════════════════════════════════════════════════════════════════════
const HomeScreen = ({ onStartChat, onCapabilityClick, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col overflow-hidden px-5 pt-4 pb-6 sm:pb-4"
            style={{
                paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
                background: 'linear-gradient(160deg, rgba(30,27,75,0.95) 0%, rgba(88,28,135,0.85) 35%, rgba(49,46,129,0.9) 70%, rgba(30,27,75,0.95) 100%)',
            }}
        >
            {/* Top User Greeting Bar - Wrapped in Liquid Glass Box */}
            <div className="flex items-center justify-between pb-4">
                <div 
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 flex-1 mr-3"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(168,85,247,0.09) 50%, rgba(255,255,255,0.05) 100%), rgba(18,18,42,0.65)',
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        borderTop: '2px solid rgba(255,255,255,0.35)',
                        boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.16), 0 10px 28px -6px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(26px)',
                    }}
                >
                    <div className="relative">
                        <div
                            className="grid h-11 w-11 place-items-center rounded-2xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, rgba(168,85,247,0.28) 0%, rgba(139,92,246,0.18) 100%), rgba(20,20,46,0.5)',
                                border: '1.5px solid rgba(168,85,247,0.35)',
                                borderTop: '2px solid rgba(255,255,255,0.4)',
                                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 8px 24px -4px rgba(168,85,247,0.4)',
                                backdropFilter: 'blur(16px)',
                            }}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80&auto=format&fit=crop"
                                alt="Priya AI"
                                style={{
                                    width: "100%", height: "100%",
                                    objectFit: "cover",
                                    objectPosition: "center top",
                                }}
                            />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#101026] bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-black text-white tracking-tight">Hello, Robert</h3>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Neural Assistant Active
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="grid h-12 w-12 place-items-center rounded-2xl text-slate-300 transition-all active:scale-90 hover:text-white"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.09), rgba(168,85,247,0.05)), rgba(18,18,42,0.5)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderTop: '1.5px solid rgba(255,255,255,0.28)',
                        boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.12), 0 8px 20px -4px rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <X size={17} />
                </button>
            </div>

            {/* Scrollable Center Content */}
            <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto pr-0.5 pb-2">
                {/* 1. Large Liquid Glass Feature Card ("What can I help you create?") */}
                <div
                    className="relative overflow-hidden rounded-[2rem] p-6 text-left"
                    style={{
                        background: 'linear-gradient(142deg, rgba(168,85,247,0.22) 0%, rgba(139,92,246,0.14) 40%, rgba(99,102,241,0.08) 100%), rgba(20,20,46,0.65)',
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        borderTop: '2px solid rgba(255,255,255,0.38)',
                        boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.18), 0 20px 48px -10px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(30px)',
                    }}
                >
                    <div className="pointer-events-none absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                    <h2 className="text-[26px] font-black leading-[1.12] tracking-[-0.035em] text-white">
                        What can I<br />help you create?
                    </h2>

                    <p className="mt-2.5 max-w-[240px] text-[12.5px] leading-relaxed text-slate-300">
                        I'm your creative partner for code, writing, and analysis.
                    </p>
                </div>

                {/* 2. CAPABILITIES Section */}
                <div>
                    <div className="flex items-center justify-between pb-2 px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Capabilities
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Capability 1: Sign Up */}
                        <button
                            type="button"
                            onClick={() => onCapabilityClick('how-to-signup')}
                            className="group relative overflow-hidden rounded-[1.6rem] p-4 text-left transition-all active:scale-[0.97]"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(168,85,247,0.08) 50%, rgba(255,255,255,0.02) 100%), rgba(18,18,40,0.55)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderTop: '1.5px solid rgba(255,255,255,0.22)',
                                boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.1), 0 10px 28px -6px rgba(0,0,0,0.4)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-purple-500/35 to-violet-600/35 border border-purple-400/30 text-purple-300 mb-3">
                                <Users size={18} strokeWidth={2.4} />
                            </div>
                            <p className="text-[12.5px] font-black text-white tracking-tight">Sign Up</p>
                            <p className="mt-0.5 text-[9.5px] text-slate-400">Create Account</p>
                        </button>

                        {/* Capability 2: Log In */}
                        <button
                            type="button"
                            onClick={() => onCapabilityClick('how-to-login')}
                            className="group relative overflow-hidden rounded-[1.6rem] p-4 text-left transition-all active:scale-[0.97]"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(59,130,246,0.08) 50%, rgba(255,255,255,0.02) 100%), rgba(18,18,40,0.55)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderTop: '1.5px solid rgba(255,255,255,0.22)',
                                boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.1), 0 10px 28px -6px rgba(0,0,0,0.4)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/35 to-indigo-600/35 border border-blue-400/30 text-blue-300 mb-3">
                                <Shield size={17} strokeWidth={2.4} />
                            </div>
                            <p className="text-[12.5px] font-black text-white tracking-tight">Log In</p>
                            <p className="mt-0.5 text-[9.5px] text-slate-400">Welcome Back</p>
                        </button>
                    </div>
                </div>

                {/* 3. QUICK SHORTCUTS Section */}
                <div>
                    <div className="flex items-center justify-between pb-2 px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Quick Shortcuts
                        </span>
                    </div>

                    <div className="space-y-2">
                        {/* What is Nexus shortcut */}
                        <button
                            type="button"
                            onClick={() => onStartChat('what-is-synapsex')}
                            className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(168,85,247,0.08) 50%, rgba(255,255,255,0.04) 100%), rgba(18,18,42,0.65)',
                                border: '1.5px solid rgba(255,255,255,0.16)',
                                borderTop: '2px solid rgba(255,255,255,0.32)',
                                boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.14), 0 10px 28px -6px rgba(0,0,0,0.45)',
                                backdropFilter: 'blur(24px)',
                            }}
                        >
                            <div 
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-purple-300"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(124,58,237,0.15))',
                                    border: '1px solid rgba(168,85,247,0.35)',
                                    boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                                }}
                            >
                                <Layers size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-bold text-white">What is Nexus?</p>
                                <p className="text-[10px] text-slate-400 truncate">Learn about our platform</p>
                            </div>
                        </button>

                        {/* Forgot Password shortcut */}
                        <button
                            type="button"
                            onClick={() => onStartChat('forgot-password')}
                            className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(59,130,246,0.08) 50%, rgba(255,255,255,0.04) 100%), rgba(18,18,42,0.65)',
                                border: '1.5px solid rgba(255,255,255,0.16)',
                                borderTop: '2px solid rgba(255,255,255,0.32)',
                                boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.14), 0 10px 28px -6px rgba(0,0,0,0.45)',
                                backdropFilter: 'blur(24px)',
                            }}
                        >
                            <div 
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-blue-300"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.15))',
                                    border: '1px solid rgba(59,130,246,0.35)',
                                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                                }}
                            >
                                <Shield size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-bold text-white">Forgot Password?</p>
                                <p className="text-[10px] text-slate-400 truncate">Reset your account</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Bottom CTA Button: Start Chatting (moved inside scrollable area) */}
                <div className="pt-2 pb-4">
                    <button
                        type="button"
                        onClick={() => onStartChat()}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black tracking-tight text-[#070b24] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                            boxShadow: '0 16px 36px -6px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.95)',
                        }}
                    >
                        <Sparkles size={16} className="text-purple-600" />
                        <span>Start Chatting</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SCREEN 3: CHAT SCREEN (Matches media_1791668907536_e1b977ed.png) ─────────
// ═══════════════════════════════════════════════════════════════════════════════
const ChatScreen = ({
    messages,
    isTyping,
    input,
    setInput,
    handleSubmit,
    handleChipClick,
    handleAction,
    onBack,
    onClose,
    inputRef,
    scrollRef
}) => (
    <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-full flex-col overflow-hidden px-4 pt-3 pb-20 sm:pb-16"
        style={{
            paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom, 0px) + 3.5rem))',
            background: 'linear-gradient(160deg, rgba(30,27,75,0.95) 0%, rgba(88,28,135,0.85) 35%, rgba(49,46,129,0.9) 70%, rgba(30,27,75,0.95) 100%)',
        }}
    >
        {/* Top Chat Header Bar (< Neural Assistant ONLINE •••) */}
        <div className="flex items-center justify-between pb-3">
            <button
                type="button"
                onClick={onBack}
                aria-label="Back to home"
                className="grid h-9 w-9 place-items-center rounded-2xl text-slate-200 transition-all active:scale-90 hover:text-white"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(168,85,247,0.06)), rgba(18,18,42,0.55)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    borderTop: '2px solid rgba(255,255,255,0.32)',
                    boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.15), 0 8px 20px -4px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(22px)',
                }}
            >
                <ChevronLeft size={18} strokeWidth={2.4} />
            </button>

            <div 
                className="text-center px-8 py-1 rounded-2xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(168,85,247,0.09) 50%, rgba(255,255,255,0.05) 100%), rgba(18,18,42,0.65)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    borderTop: '2px solid rgba(255,255,255,0.35)',
                    boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.16), 0 10px 28px -6px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(26px)',
                }}
            >
                <p className="text-[13px] font-black text-white tracking-tight">Neural Assistant</p>
                <p className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    ONLINE
                </p>
            </div>

            <button
                type="button"
                onClick={onClose}
                aria-label="Options or Close"
                className="grid h-9 w-9 place-items-center rounded-2xl text-slate-200 transition-all active:scale-90 hover:text-white"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(168,85,247,0.06)), rgba(18,18,42,0.55)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    borderTop: '2px solid rgba(255,255,255,0.32)',
                    boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.15), 0 8px 20px -4px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(22px)',
                }}
            >
                <X size={15} strokeWidth={2.4} />
            </button>
        </div>

        {/* Message Stream */}
        <div ref={scrollRef} className="hide-scrollbar flex-1 space-y-4 overflow-y-auto px-1 py-2">
            {messages.map(msg => {
                const isPriya = msg.role === 'priya';
                return (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full"
                    >
                        {isPriya ? (
                            <div className="flex flex-col gap-2 w-full">
                                {/* AI Assistant tag */}
                                <div className="flex items-center gap-1.5 pl-1">
                                    <div 
                                        className="grid h-4 w-4 place-items-center rounded text-[9px] text-purple-200 font-bold"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(168,85,247,0.30), rgba(124,58,237,0.20))',
                                            border: '1px solid rgba(168,85,247,0.4)',
                                            boxShadow: '0 2px 8px rgba(168,85,247,0.25)',
                                        }}
                                    >
                                        AI
                                    </div>
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                                        AI ASSISTANT
                                    </span>
                                </div>

                                {/* Liquid Glass Message Card */}
                                <div
                                    className="relative w-full rounded-[1.6rem] p-4 text-[13px] leading-relaxed text-slate-200"
                                    style={{
                                        background: 'linear-gradient(142deg, rgba(255,255,255,0.11) 0%, rgba(168,85,247,0.08) 50%, rgba(255,255,255,0.03) 100%), rgba(18,18,42,0.65)',
                                        border: '1px solid rgba(255,255,255,0.14)',
                                        borderTop: '1.8px solid rgba(255,255,255,0.28)',
                                        boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.12), 0 12px 28px -6px rgba(0,0,0,0.45)',
                                        backdropFilter: 'blur(24px)',
                                    }}
                                >
                                    <div className="pointer-events-none absolute top-0 left-[8%] right-[8%] h-[0.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                                    <div>{formatRich(msg.text)}</div>

                                    {/* Action button inside Priya message */}
                                    {msg.action && (
                                        <button
                                            type="button"
                                            onClick={() => handleAction(msg.action)}
                                            className="mt-3.5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-95"
                                            style={{
                                                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                                                boxShadow: '0 8px 20px -4px rgba(168,85,247,0.45), inset 0 1px 1px rgba(255,255,255,0.25)',
                                            }}
                                        >
                                            <span>{msg.action.label}</span>
                                            <ArrowRight size={13} strokeWidth={2.6} />
                                        </button>
                                    )}
                                </div>

                                {/* Suggestion Chips */}
                                {msg.chips?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-0.5 px-0.5">
                                        {msg.chips.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => handleChipClick(t)}
                                                className="group rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-purple-200 transition-all active:scale-95 hover:text-white"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(124,58,237,0.12) 100%), rgba(20,20,46,0.4)',
                                                    border: '1px solid rgba(168,85,247,0.35)',
                                                    boxShadow: '0 4px 12px rgba(168,85,247,0.2)',
                                                    backdropFilter: 'blur(16px)',
                                                }}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <Sparkles size={10} className="text-purple-300 opacity-80" />
                                                    {t.chip}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-end w-full">
                                {/* Solid White Message Bubble with Dark Text */}
                                <div
                                    className="relative max-w-[84%] rounded-[1.4rem] px-4 py-3 text-[13px] font-semibold leading-relaxed text-[#101428]"
                                    style={{
                                        background: '#ffffff',
                                        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.95)',
                                    }}
                                >
                                    <p className="whitespace-pre-line break-words">{msg.text}</p>
                                </div>
                                <span className="mt-1 mr-1 text-[9px] text-slate-400">12:42 PM</span>
                            </div>
                        )}
                    </motion.div>
                );
            })}

            {/* Typing Indicator */}
            {isTyping && (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                >
                    <div 
                        className="grid h-4 w-4 place-items-center rounded text-[9px] text-purple-200 font-bold"
                        style={{
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.30), rgba(124,58,237,0.20))',
                            border: '1px solid rgba(168,85,247,0.4)',
                            boxShadow: '0 2px 8px rgba(168,85,247,0.25)',
                        }}
                    >
                        AI
                    </div>
                    <div
                        className="rounded-2xl px-4 py-2"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(16px)',
                        }}
                    >
                        <TypingDots />
                    </div>
                </motion.div>
            )}
        </div>

        {/* Bottom Composer Dock ((+) Message assistant... >) */}
        <form
            onSubmit={handleSubmit}
            className="absolute bottom-0 left-0 right-0 mx-4 mb-16 flex items-center gap-2 rounded-full px-3.5 py-1.5"
            style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(168,85,247,0.10) 50%, rgba(255,255,255,0.06) 100%), rgba(18,18,42,0.75)',
                border: '1.8px solid rgba(255,255,255,0.20)',
                borderTop: '2.5px solid rgba(255,255,255,0.40)',
                boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.18), 0 12px 32px -6px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(28px)',
            }}
        >
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:text-white">
                <Plus size={16} />
            </div>

            <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message assistant..."
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[13px] font-medium text-white placeholder:text-slate-400 outline-none"
            />

            <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all hover:scale-105 active:scale-90 disabled:opacity-35"
                style={{
                    background: input.trim() && !isTyping
                        ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                        : 'rgba(255,255,255,0.1)',
                    boxShadow: input.trim() && !isTyping
                        ? '0 4px 16px rgba(168,85,247,0.5)'
                        : 'none',
                }}
            >
                <Send size={14} className="text-white ml-0.5" />
            </button>
        </form>
    </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN CONTROLLER COMPONENT ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const PriyaLandingChat = ({ onClose, onNavigate }) => {
    const defaultChips = DEFAULT_CHIPS.map(id => TOPICS.find(t => t.id === id)).filter(Boolean);

    // State flow: 'splash' -> 'home' -> 'chat'
    const [view, setView] = useState('splash');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const timers = useRef([]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const schedule = useCallback((fn, delay) => {
        const id = setTimeout(fn, delay);
        timers.current.push(id);
        return id;
    }, []);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    useEffect(() => {
        const node = scrollRef.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [messages, isTyping]);

    useEffect(() => {
        if (view === 'chat') {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [view]);

    const startChat = (initialTopic, prompt) => {
        const introMsg = {
            id: nid(),
            role: 'priya',
            text: "Hello Robert! I've analyzed your request for a glassmorphism design. Would you like me to generate some color palettes that complement the frosted glass effect?",
            chips: defaultChips
        };

        const initialMsgs = [introMsg];

        if (prompt) {
            initialMsgs.push({
                id: nid(),
                role: 'user',
                text: prompt
            });
        }

        setMessages(initialMsgs);
        setView('chat');

        if (prompt) {
            setIsTyping(true);
            const topic = matchQuery(prompt);
            schedule(() => {
                setIsTyping(false);
                if (topic.type === 'topic') {
                    setMessages(prev => [...prev, {
                        id: nid(),
                        role: 'priya',
                        text: topic.topic.answer,
                        chips: defaultChips,
                        action: topic.topic.action
                    }]);
                } else {
                    callLandingAI(prompt, initialMsgs).then(aiReply => {
                        setMessages(prev => [...prev, {
                            id: nid(),
                            role: 'priya',
                            text: aiReply || "Great choice! Here is a CSS snippet for a high-performance glass effect using those tones:\n\n```css\n.glass-card {\n  background: rgba(139, 92, 246, 0.12);\n  backdrop-filter: blur(24px);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n}\n```",
                            chips: defaultChips
                        }]);
                    });
                }
            }, 500);
            return;
        }

        if (initialTopic) {
            schedule(() => {
                const topic = TOPICS.find(t => t.id === initialTopic);
                if (topic) {
                    setMessages(prev => [...prev, { id: nid(), role: 'user', text: topic.chip }]);
                    replyTopic(topic);
                }
            }, 300);
        }
    };

    const replyTopic = (topic) => {
        setIsTyping(true);
        schedule(() => {
            setIsTyping(false);
            const followChips = (topic.followUps || [])
                .map(id => TOPICS.find(t => t.id === id))
                .filter(Boolean);
            setMessages(prev => [...prev, {
                id: nid(),
                role: 'priya',
                text: topic.answer,
                chips: followChips.length ? followChips : defaultChips,
                action: topic.action
            }]);
        }, 550);
    };

    const handleChipClick = (topic) => {
        setMessages(prev => [...prev, { id: nid(), role: 'user', text: topic.chip }]);
        replyTopic(topic);
    };

    const handleCapabilityClick = (capId) => {
        startChat(capId);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        setInput('');
        setMessages(prev => [...prev, { id: nid(), role: 'user', text }]);
        setIsTyping(true);

        const result = matchQuery(text);
        if (result.type === 'topic') {
            replyTopic(result.topic);
            return;
        }

        if (result.type === 'smalltalk') {
            const replies = {
                greetings: "Hello Robert! 💜 I'm here to assist you with design, coding, or getting started with SynapseX.",
                thanks:    "You're very welcome! 💜 Let me know if you need more CSS styles or guidance.",
                farewell:  "Take care! 💜 Come back whenever you need creative assistance."
            };
            schedule(() => {
                setIsTyping(false);
                setMessages(prev => [...prev, { id: nid(), role: 'priya', text: replies[result.kind] || replies.greetings, chips: defaultChips }]);
            }, 400);
            return;
        }

        // Try AI call, fallback to contextual design code response
        callLandingAI(text, messages).then(aiReply => {
            schedule(() => {
                setIsTyping(false);
                if (aiReply) {
                    setMessages(prev => [...prev, { id: nid(), role: 'priya', text: aiReply, chips: defaultChips }]);
                } else {
                    setMessages(prev => [...prev, {
                        id: nid(),
                        role: 'priya',
                        text: "Great choice! Here is a CSS snippet for a high-performance glass effect using those tones:\n\n```css\n.glass-card {\n  background: rgba(139, 92, 246, 0.1);\n  backdrop-filter: blur(24px);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n}\n```",
                        chips: defaultChips
                    }]);
                }
            }, 350);
        });
    };

    const handleAction = (action) => {
        if (action?.type === 'navigate' && onNavigate) {
            onNavigate(action.view);
        }
    };

    return (
        <div className="flex h-full flex-col bg-transparent">
            <AnimatePresence mode="wait">
                {view === 'splash' && (
                    <GetStartedScreen
                        key="splash"
                        onStart={() => setView('home')}
                        onClose={onClose}
                    />
                )}
                {view === 'home' && (
                    <HomeScreen
                        key="home"
                        onStartChat={startChat}
                        onCapabilityClick={handleCapabilityClick}
                        onClose={onClose}
                    />
                )}
                {view === 'chat' && (
                    <ChatScreen
                        key="chat"
                        messages={messages}
                        isTyping={isTyping}
                        input={input}
                        setInput={setInput}
                        handleSubmit={handleSubmit}
                        handleChipClick={handleChipClick}
                        handleAction={handleAction}
                        onBack={() => setView('home')}
                        onClose={onClose}
                        inputRef={inputRef}
                        scrollRef={scrollRef}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PriyaLandingChat;
