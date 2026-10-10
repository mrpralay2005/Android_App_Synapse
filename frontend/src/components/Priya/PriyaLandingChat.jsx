import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowRight, Sparkles } from 'lucide-react';
import PriyaAvatar from './PriyaAvatar';

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';

// ─── Landing AI call (no auth token needed — landing page is pre-login) ──────
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
        answer: "No problem at all! 💚\n1. Tap **Welcome back**.\n2. On the login screen tap **Forgot password**.\n3. Enter your registered email — we send a one-time reset code.\n4. Enter the code and set a new password.",
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
        answer: "SynapseX is an AI-powered social platform with zero-knowledge encryption. 🔐\nYou get a social feed, Stories, direct messages and a behavioural AI layer that protects your private identity.\nCreate a free account to explore everything!",
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
        id: 'username-rules',
        chip: 'Username rules',
        answer: "Your username is your public identity on SynapseX. 👤\n• Must be unique — no duplicates.\n• Shown with an @ in front.\n• Use letters, numbers, underscores or dots.\n• You can change it later from your profile settings.",
        followUps: ['how-to-signup']
    },
    {
        id: 'password-rules',
        chip: 'Password requirements',
        answer: "SynapseX needs a reasonably strong password. 🔐\n• Minimum 8 characters.\n• Mix of letters and numbers recommended.\n• Passwords are stored as one-way hashes — nobody can read yours.",
        followUps: ['how-to-signup']
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

const formatRich = (text) =>
    String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((p,i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-extrabold text-white tracking-tight">{p.slice(2,-2)}</strong>;
        if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i} className="italic text-sky-200">{p.slice(1,-1)}</em>;
        return <span key={i}>{p}</span>;
    });

const TypingDots = () => (
    <div className="flex items-center gap-1.5 px-1 py-1">
        {[0, 1, 2].map(i => (
            <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 shadow-[0_0_8px_#38bdf8]"
                animate={{ opacity: [0.35, 1, 0.35], y: [0, -4, 0] }}
                transition={{ duration: 1.1, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
            />
        ))}
    </div>
);

const SuggestionGrid = ({ topics, onPick }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        className="flex flex-wrap gap-2 mt-1 px-0.5"
    >
        {topics.map(t => (
            <button
                key={t.id}
                onClick={() => onPick(t)}
                className="group relative overflow-hidden rounded-full border border-sky-400/30 bg-gradient-to-r from-white/[0.14] via-sky-500/[0.10] to-indigo-500/[0.10] px-3.5 py-1.5 text-[11.5px] font-semibold text-sky-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.38),0_4px_14px_-2px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all active:scale-95 hover:border-sky-300/60 hover:bg-white/[0.22] hover:text-white"
            >
                <span className="relative z-10 flex items-center gap-1.5">
                    <Sparkles size={11} className="text-sky-300 opacity-80 group-hover:opacity-100" />
                    {t.chip}
                </span>
            </button>
        ))}
    </motion.div>
);

const PriyaLandingChat = ({ onClose, onNavigate }) => {
    const defaultChips = DEFAULT_CHIPS.map(id => TOPICS.find(t => t.id === id)).filter(Boolean);

    const [messages, setMessages] = useState([{
        id: nid(),
        role: 'priya',
        text: "Hi! I'm Priya 💚\nI can help you **sign up** or **log in** to SynapseX.\nWhat would you like to do?",
        chips: defaultChips
    }]);
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

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 400); }, []);

    const replyTopic = (topic) => {
        setIsTyping(true);
        const followUpChips = (topic.followUps || []).map(id => TOPICS.find(t => t.id === id)).filter(Boolean);
        schedule(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: nid(),
                role: 'priya',
                text: topic.answer,
                action: topic.action || null,
                chips: followUpChips
            }]);
        }, 550 + Math.random() * 320);
    };

    const clearLastChips = (prev) => {
        const upd = [...prev];
        for (let i = upd.length - 1; i >= 0; i--) {
            if (upd[i].chips?.length) { upd[i] = { ...upd[i], chips: [] }; break; }
        }
        return upd;
    };

    const handleChipClick = (topic) => {
        setMessages(prev => [...clearLastChips(prev), { id: nid(), role: 'user', text: topic.chip }]);
        replyTopic(topic);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const text = input.trim();
        if (!text || isTyping) return;
        setInput('');
        setMessages(prev => [...clearLastChips(prev), { id: nid(), role: 'user', text }]);

        setIsTyping(true);

        // Try real AI first
        const historySnapshot = messages.slice(-4);
        const aiReply = await callLandingAI(text, historySnapshot);

        if (aiReply) {
            setIsTyping(false);
            setMessages(prev => [...prev, { id: nid(), role: 'priya', text: aiReply }]);
            return;
        }

        // AI unavailable → keyword fallback
        const result = matchQuery(text);

        if (result.type === 'topic') {
            const followUpChips = (result.topic.followUps || []).map(id => TOPICS.find(t => t.id === id)).filter(Boolean);
            schedule(() => {
                setIsTyping(false);
                setMessages(prev => [...prev, {
                    id: nid(),
                    role: 'priya',
                    text: result.topic.answer,
                    action: result.topic.action || null,
                    chips: followUpChips
                }]);
            }, 400);
            return;
        }

        if (result.type === 'smalltalk') {
            const replies = {
                greetings: "Hello! 💚 I'm here to help you sign up or log in to SynapseX. What do you need?",
                thanks:    "You're welcome! 💚 Let me know if you need anything else.",
                farewell:  "Take care! 💚 Come back anytime you need help."
            };
            schedule(() => {
                setIsTyping(false);
                setMessages(prev => [...prev, { id: nid(), role: 'priya', text: replies[result.kind] || replies.greetings, chips: defaultChips }]);
            }, 400);
            return;
        }

        schedule(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: nid(),
                role: 'priya',
                text: "I'm only trained to help with sign-up and login here. 😊\nTry one of these:",
                chips: defaultChips
            }]);
        }, 400);
    };

    const handleAction = (action) => {
        if (action?.type === 'navigate' && onNavigate) {
            onNavigate(action.view);
        }
    };

    return (
        <div className="flex h-full flex-col bg-transparent px-3.5 pb-2">
            {/* ── Centerpiece: Floating Liquid Glass Main Box (ColorOS 17 Aquamorphic) ── */}
            <div
                className="relative flex-1 min-h-0 flex flex-col rounded-[28px] overflow-hidden"
                style={{
                    background: 'linear-gradient(142deg, rgba(255,255,255,0.18) 0%, rgba(147,197,253,0.09) 35%, rgba(168,85,247,0.07) 70%, rgba(255,255,255,0.02) 100%), rgba(9,13,38,0.60)',
                    border: '1.5px solid rgba(255, 255, 255, 0.30)',
                    borderTop: '2.2px solid rgba(255, 255, 255, 0.80)',
                    borderLeft: '1.8px solid rgba(255, 255, 255, 0.55)',
                    boxShadow: 'inset 0 2px 2px 0 rgba(255, 255, 255, 0.62), inset 0 -2px 3px 0 rgba(125, 211, 252, 0.25), 0 24px 50px -10px rgba(0, 0, 0, 0.75), 0 0 35px -5px rgba(56, 189, 248, 0.22)',
                    backdropFilter: 'blur(32px) saturate(220%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(220%)',
                }}
            >
                {/* Top specular reflection shimmer */}
                <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1.5px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)', filter: 'drop-shadow(0 0 6px rgba(125,211,252,0.8))', pointerEvents: 'none' }} />

                {/* Main Box Header Strip */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] shrink-0 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8]" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Fluid AI Channel</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[9.5px] font-bold text-slate-300">
                        <Sparkles size={10} className="text-cyan-300" />
                        <span>ColorOS 17 Engine</span>
                    </div>
                </div>

                {/* Conversation Feed inside Floating Main Box */}
                <div ref={scrollRef} className="hide-scrollbar flex-1 space-y-3.5 overflow-y-auto p-3.5">
                    {messages.map(msg => {
                        const isPriya = msg.role === 'priya';
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full"
                            >
                                {isPriya ? (
                                    <div className="flex flex-col gap-2.5 w-full">
                                        {/* Priya Message Floating Card */}
                                        <div
                                            className="relative w-full rounded-[22px] border-[1.5px] border-white/35 border-t-white/80 border-l-white/60 bg-gradient-to-br from-white/[0.22] via-sky-300/[0.10] to-indigo-950/[0.35] p-3.5 text-[13.5px] leading-relaxed text-slate-100 shadow-[inset_0_2px_2px_rgba(255,255,255,0.68),inset_0_-1.5px_2px_rgba(125,211,252,0.25),0_12px_28px_-6px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                                        >
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/[0.08]">
                                                <div style={{ width:24, height:24, borderRadius:'50%', overflow:'hidden', border:'1.5px solid rgba(168,85,247,0.5)', flexShrink:0 }}>
                                                    <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop" alt="Priya" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.3)' }} />
                                                </div>
                                                <span className="text-[11px] font-extrabold text-white tracking-tight">Priya Assistant</span>
                                                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-sky-300 bg-sky-400/15 border border-sky-400/30 px-2 py-0.5 rounded-full">AI Guide</span>
                                            </div>
                                            <p className="whitespace-pre-line break-words">{formatRich(msg.text)}</p>

                                            {/* Action Button inside Priya message */}
                                            {msg.action && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAction(msg.action)}
                                                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 px-4 py-2 text-[11.5px] font-black uppercase tracking-wider text-[#060922] shadow-[0_8px_24px_rgba(56,189,248,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.9)] transition-all hover:scale-[1.03] active:scale-95"
                                                >
                                                    <span>{msg.action.label}</span>
                                                    <ArrowRight size={13} strokeWidth={2.6} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Suggestion Chips */}
                                        {msg.chips?.length > 0 && (
                                            <SuggestionGrid topics={msg.chips} onPick={handleChipClick} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex justify-end w-full">
                                        <div className="relative max-w-[85%] rounded-[20px] bg-gradient-to-r from-[#f0f9ff] via-[#7dd3fc] to-[#c084fc] px-4 py-2.5 text-[13.5px] font-bold leading-relaxed text-[#060924] shadow-[0_12px_28px_-4px_rgba(56,189,248,0.5),inset_0_2px_1.5px_rgba(255,255,255,0.98)]">
                                            <p className="whitespace-pre-line break-words">{msg.text}</p>
                                        </div>
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
                            className="flex items-center gap-2.5 pl-0.5"
                        >
                            <div style={{ width:28, height:28, borderRadius:'50%', overflow:'hidden', border:'1.5px solid rgba(168,85,247,0.5)', boxShadow:'0 0 10px rgba(168,85,247,0.35)', flexShrink:0 }}>
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop" alt="Priya" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.3)' }} />
                            </div>
                            <div className="rounded-[1.2rem] border-[1.5px] border-white/30 border-t-white/70 bg-gradient-to-br from-white/[0.22] to-sky-900/[0.25] px-3.5 py-2 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.55),0_12px_28px_-8px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                                <TypingDots />
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* ── Floating Liquid Glass Composer (Trough style like reference Login inputs) ── */}
            <div className="shrink-0 mt-2.5 mb-1 pb-[env(safe-area-inset-bottom,0px)]">
                <form
                    onSubmit={handleSubmit}
                    className="relative flex items-center gap-2 rounded-full border-[1.5px] border-white/32 border-t-white/80 border-l-white/60 bg-gradient-to-r from-white/[0.22] via-sky-500/[0.10] to-indigo-900/[0.35] p-1.5 shadow-[inset_0_2px_2px_rgba(255,255,255,0.60),inset_0_-1.5px_2px_rgba(99,102,241,0.25),0_20px_45px_-10px_rgba(0,0,0,0.75),0_0_25px_-2px_rgba(56,189,248,0.28)] backdrop-blur-3xl"
                >
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask Priya about sign up or login..."
                        className="min-w-0 flex-1 bg-transparent px-4 py-2 text-[13px] text-white outline-none placeholder:text-slate-300 font-medium"
                    />

                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        aria-label="Send"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#f0f9ff] via-[#7dd3fc] to-[#a855f7] text-[#06081e] shadow-[0_8px_20px_rgba(56,189,248,0.5),inset_0_1.5px_1px_rgba(255,255,255,0.95)] transition-all hover:scale-105 active:scale-90 disabled:opacity-30 disabled:scale-100"
                    >
                        <Send size={15} strokeWidth={2.6} />
                    </button>
                </form>

                <p className="mt-1 text-center text-[8.5px] font-semibold tracking-wider text-slate-400/80">
                    Priya Neural Guide • ColorOS 17 Liquid Glass
                </p>
            </div>
        </div>
    );
};

export default PriyaLandingChat;
