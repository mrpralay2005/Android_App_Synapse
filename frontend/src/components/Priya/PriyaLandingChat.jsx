import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowRight } from 'lucide-react';
import PriyaAvatar from './PriyaAvatar';

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';

// ─── Landing AI call (no auth token needed — landing page is pre-login) ──────
// Uses a public landing endpoint that doesn't require authentication.
// Falls back to keyword matcher if AI is unavailable.
const callLandingAI = async (message, history = []) => {
    try {
        const res = await fetch(`${API_URL}/api/ai/priya-landing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                // FIX: cap content length + normalize role same as PriyaChat
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
        answer: "Tap **Initialize Identity** on the home page. 🚀\n1. Enter your name, email, username and password.\n2. Check your email for a one-time code (OTP).\n3. Enter the code to verify your account.\n4. Done — now log in!",
        followUps: ['otp-help', 'go-signup'],
        action: { label: 'Take me to Sign Up', type: 'navigate', view: 'signup' }
    },
    {
        id: 'how-to-login',
        chip: 'How do I log in?',
        answer: "Tap **Access Neural Hub** on the home page. 🔑\nEnter your username and password — that's it.\nIf you forgot your password, use the **Forgot password** link on the login screen.",
        followUps: ['forgot-password', 'go-login'],
        action: { label: 'Take me to Login', type: 'navigate', view: 'login' }
    },
    {
        id: 'forgot-password',
        chip: 'I forgot my password',
        answer: "No problem at all! 💚\n1. Tap **Access Neural Hub**.\n2. On the login screen tap **Forgot password**.\n3. Enter your registered email — we send a one-time reset code.\n4. Enter the code and set a new password.",
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
        answer: "SynapseX is an AI-powered social platform with military-grade security. 🔐\nYou get a social feed, Stories, Reels, direct messages and a behavioural AI layer that protects your account.\nCreate a free account to explore everything!",
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
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-white">{p.slice(2,-2)}</strong>;
        if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i} className="italic">{p.slice(1,-1)}</em>;
        return <span key={i}>{p}</span>;
    });

const TypingDots = () => (
    <div className="flex items-center gap-1 px-1 py-0.5">
        {[0,1,2].map(i => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                animate={{ opacity:[0.25,1,0.25], y:[0,-3,0] }}
                transition={{ duration:1, delay:i*0.15, repeat:Infinity, ease:'easeInOut' }} />
        ))}
    </div>
);

const SuggestionGrid = ({ topics, onPick }) => (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.22, delay:0.08 }}
        className="flex flex-wrap gap-2 pl-9 pr-1">
        {topics.map(t => (
            <button key={t.id} onClick={() => onPick(t)}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/[0.07] px-3.5 py-1.5 text-[12px] font-medium text-emerald-200 transition-all active:scale-95 hover:border-emerald-500/55 hover:bg-emerald-500/15">
                {t.chip}
            </button>
        ))}
    </motion.div>
);

const PriyaLandingChat = ({ onClose, onNavigate }) => {
    const defaultChips = DEFAULT_CHIPS.map(id => TOPICS.find(t => t.id === id)).filter(Boolean);

    const [messages, setMessages] = useState([{
        id: nid(), role: 'priya',
        text: "Hi! I'm Priya 💚\nI can help you **sign up** or **log in** to SynapseX.\nWhat would you like to do?",
        chips: defaultChips
    }]);
    const [input, setInput]     = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const timers   = useRef([]);
    const scrollRef = useRef(null);
    const inputRef  = useRef(null);

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
        const followUpChips = (topic.followUps||[]).map(id => TOPICS.find(t => t.id === id)).filter(Boolean);
        schedule(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: nid(), role: 'priya',
                text: topic.answer,
                action: topic.action || null,
                chips: followUpChips
            }]);
        }, 550 + Math.random() * 320);
    };

    const clearLastChips = (prev) => {
        const upd = [...prev];
        for (let i = upd.length-1; i >= 0; i--) {
            if (upd[i].chips?.length) { upd[i] = { ...upd[i], chips:[] }; break; }
        }
        return upd;
    };

    const handleChipClick = (topic) => {
        setMessages(prev => [...clearLastChips(prev), { id:nid(), role:'user', text:topic.chip }]);
        replyTopic(topic);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const text = input.trim();
        if (!text || isTyping) return;
        setInput('');
        setMessages(prev => [...clearLastChips(prev), { id:nid(), role:'user', text }]);

        setIsTyping(true);

        // Try real AI first
        const historySnapshot = messages.slice(-4);
        const aiReply = await callLandingAI(text, historySnapshot);

        if (aiReply) {
            // Real AI responded ✅
            setIsTyping(false);
            setMessages(prev => [...prev, { id:nid(), role:'priya', text: aiReply }]);
            return;
        }

        // AI unavailable → keyword fallback 🔄
        const result = matchQuery(text);

        if (result.type === 'topic') {
            const followUpChips = (result.topic.followUps||[]).map(id => TOPICS.find(t => t.id === id)).filter(Boolean);
            schedule(() => {
                setIsTyping(false);
                setMessages(prev => [...prev, {
                    id:nid(), role:'priya',
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
                setMessages(prev => [...prev, { id:nid(), role:'priya', text: replies[result.kind]||replies.greetings, chips: defaultChips }]);
            }, 400);
            return;
        }

        schedule(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id:nid(), role:'priya',
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
        <div className="flex h-full flex-col bg-[#060c0b]">
            {/* Conversation */}
            <div ref={scrollRef} className="hide-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.map(msg => {
                    const isPriya = msg.role === 'priya';
                    return (
                        <motion.div key={msg.id}
                            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                            transition={{ duration:0.22 }}
                            className={`flex w-full flex-col gap-2 ${isPriya ? 'items-start' : 'items-end'}`}>
                            <div className={`flex w-full gap-2 ${isPriya ? 'justify-start' : 'justify-end'}`}>
                                {isPriya && <div className="mt-1 shrink-0"><PriyaAvatar size={28} animated={false} showRing={false} /></div>}
                                <div className="max-w-[82%]">
                                    <div className={isPriya
                                        ? 'rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-200'
                                        : 'rounded-2xl rounded-br-sm bg-emerald-500 px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-black'}>
                                        <p className="whitespace-pre-line break-words">{formatRich(msg.text)}</p>
                                    </div>
                                    {msg.action && (
                                        <button onClick={() => handleAction(msg.action)}
                                            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20">
                                            {msg.action.label}<ArrowRight size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {isPriya && msg.chips?.length > 0 && (
                                <SuggestionGrid topics={msg.chips} onPick={handleChipClick} />
                            )}
                        </motion.div>
                    );
                })}
                {isTyping && (
                    <div className="flex items-center gap-2">
                        <PriyaAvatar size={28} animated={false} showRing={false} />
                        <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2">
                            <TypingDots />
                        </div>
                    </div>
                )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSubmit}
                className="shrink-0 border-t border-white/10 bg-[#080f0d] px-3 py-3"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
                <div className="flex items-center gap-2">
                    <input ref={inputRef} value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about sign up or login..."
                        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-gray-500 focus:border-emerald-500/50" />
                    <button type="submit" disabled={!input.trim() || isTyping} aria-label="Send"
                        className="shrink-0 rounded-full bg-emerald-500 p-2.5 text-black transition-all hover:bg-emerald-400 disabled:opacity-30">
                        <Send size={16} />
                    </button>
                </div>
                <p className="mt-1.5 text-center text-[9px] text-gray-600">Priya guides sign-up and login only.</p>
            </form>
        </div>
    );
};

export default PriyaLandingChat;
