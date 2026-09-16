import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, ArrowRight, RotateCcw, Trash2, History, ChevronLeft, Clock } from 'lucide-react';
import Cookies from 'js-cookie';
import PriyaAvatar from './PriyaAvatar';
import {
    PRIYA,
    resolveQuery,
    getTopicsByIds,
    getDefaultSuggestions,
    pickRejection
} from './priyaKnowledge';
import { saveToCache, loadFromCache } from '../../utils/synapseCache';

// ─── Config ───────────────────────────────────────────────────────────────────
const ACTIVE_KEY   = 'priya_conversation';
const SESSIONS_KEY = 'priya_sessions';
const MAX_SESSIONS = 10;
const MAX_MSGS     = 40;
const API_URL      = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';

let seq = 0;
const nextId = () => `pm-${Date.now()}-${seq++}`;
const makeIntroMessages = () => [{
    id: nextId(), role: 'priya',
    text: PRIYA.intro,
    suggestions: getDefaultSuggestions()
}];

// ─── Session storage ──────────────────────────────────────────────────────────
const loadSessions  = () => { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; } };
const saveSessions  = (s) => { try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s.slice(0, MAX_SESSIONS))); } catch {} };
const deleteSession = (id) => saveSessions(loadSessions().filter(s => s.id !== id));
const archiveSession = (sessionId, messages) => {
    if (!messages || messages.length <= 1) return;
    const userMsg = messages.find(m => m.role === 'user');
    if (!userMsg) return;
    const title = userMsg.text.length > 48 ? userMsg.text.slice(0, 45) + '…' : userMsg.text;
    const sessions = loadSessions().filter(s => s.id !== sessionId);
    sessions.unshift({ id: sessionId, title, savedAt: Date.now(), messages });
    saveSessions(sessions);
};

// ─── Real AI call → fallback ──────────────────────────────────────────────────
/**
 * Calls the Cloudflare Workers AI endpoint.
 * Returns the AI reply string, or null if it fails (triggers keyword fallback).
 */
const callPriyaAI = async (message, history = []) => {
    try {
        const token = Cookies.get('synapse_token');
        if (!token) return null; // not logged in — skip AI, use keyword matcher

        const res = await fetch(`${API_URL}/api/ai/priya`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({
                message,
                history: history
                    .filter(m => m.role !== 'priya' || !m.suggestions)
                    .slice(-6)
                    .map(m => ({ role: m.role === 'priya' ? 'assistant' : 'user', content: m.text }))
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

// ─── Rich text ────────────────────────────────────────────────────────────────
const formatRich = (text) =>
    String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((p, i) => {
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

const MessageBubble = ({ message, onAction, onTopicPick }) => {
    const isPriya = message.role === 'priya';
    return (
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.22 }}
            className={`flex w-full flex-col gap-2 ${isPriya ? 'items-start' : 'items-end'}`}>
            <div className={`flex w-full gap-2 ${isPriya ? 'justify-start' : 'justify-end'}`}>
                {isPriya && <div className="mt-1 shrink-0"><PriyaAvatar size={28} animated={false} showRing={false} /></div>}
                <div className="max-w-[82%]">
                    <div className={isPriya
                        ? 'rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-200'
                        : 'rounded-2xl rounded-br-sm bg-emerald-500 px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-black'}>
                        <p className="whitespace-pre-line break-words">{formatRich(message.text)}</p>
                    </div>
                    {message.action && onAction && (
                        <button onClick={() => onAction(message.action)}
                            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20">
                            {message.action.label}<ArrowRight size={12} />
                        </button>
                    )}
                </div>
            </div>
            {isPriya && message.suggestions?.length > 0 && onTopicPick && (
                <SuggestionGrid topics={message.suggestions} onPick={onTopicPick} />
            )}
        </motion.div>
    );
};

// ─── Sessions panel ───────────────────────────────────────────────────────────
const SessionsPanel = ({ onResume, onClose }) => {
    const [sessions, setSessions] = useState(loadSessions);
    const fmt = (ts) => {
        const d = new Date(ts), now = new Date();
        const diff = Math.floor((now - d) / 86400000);
        if (diff === 0) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        if (diff === 1) return 'Yesterday';
        if (diff < 7)  return d.toLocaleDateString([], { weekday:'short' });
        return d.toLocaleDateString([], { day:'numeric', month:'short' });
    };
    const handleDelete = (id, e) => {
        e.stopPropagation();
        deleteSession(id);
        setSessions(loadSessions());
    };
    return (
        <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
            transition={{ type:'spring', stiffness:340, damping:34 }}
            className="absolute inset-0 z-10 flex flex-col bg-[#060c0b]">
            <div className="flex items-center gap-3 border-b border-white/[0.07] bg-[#080f0d] px-4 py-3">
                <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                <p className="flex-1 text-[14px] font-black text-white">Chat history</p>
                <Clock size={15} className="text-gray-500" />
            </div>
            <div className="hide-scrollbar flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {sessions.length === 0 && (
                    <div className="flex flex-col items-center py-16 text-center">
                        <History size={28} className="text-gray-600" />
                        <p className="mt-3 text-[13px] font-bold text-gray-400">No saved sessions yet</p>
                        <p className="mt-1 text-[11px] text-gray-600">Start a new chat — it saves automatically.</p>
                    </div>
                )}
                {sessions.map(session => (
                    <motion.button key={session.id}
                        initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                        onClick={() => onResume(session)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.07] active:scale-[0.98]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <Sparkles size={14} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-white">{session.title}</p>
                            <p className="text-[11px] text-gray-500">{session.messages.length - 1} messages · {fmt(session.savedAt)}</p>
                        </div>
                        <button onClick={(e) => handleDelete(session.id, e)}
                            className="shrink-0 rounded-full p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};

// ─── Main PriyaChat ───────────────────────────────────────────────────────────
const PriyaChat = ({ onClose, onNavigate, hideHeader = false }) => {
    const [sessionId]     = useState(() => `session-${Date.now()}`);
    const [messages, setMessages] = useState(() => {
        const cached = loadFromCache(ACTIVE_KEY);
        if (Array.isArray(cached) && cached.length) return cached;
        return makeIntroMessages();
    });
    const [input, setInput]             = useState('');
    const [isTyping, setIsTyping]       = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showSessions, setShowSessions]   = useState(false);

    const rejectionCount   = useRef(0);
    const timers           = useRef([]);
    const scrollRef        = useRef(null);
    const inputRef         = useRef(null);
    const currentSessionId = useRef(sessionId);

    const schedule = useCallback((fn, delay) => {
        const id = setTimeout(fn, delay);
        timers.current.push(id);
        return id;
    }, []);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    useEffect(() => { if (messages.length) saveToCache(ACTIVE_KEY, messages.slice(-MAX_MSGS)); }, [messages]);
    useEffect(() => { const n = scrollRef.current; if (n) n.scrollTop = n.scrollHeight; }, [messages, isTyping]);
    useEffect(() => { inputRef.current?.focus(); }, []);
    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    // ── New session ───────────────────────────────────────────────────────────
    const handleNewSession = () => {
        archiveSession(currentSessionId.current, messages);
        timers.current.forEach(clearTimeout);
        setIsTyping(false); setInput(''); setConfirmDelete(false);
        rejectionCount.current = 0;
        currentSessionId.current = `session-${Date.now()}`;
        const fresh = makeIntroMessages();
        setMessages(fresh);
        saveToCache(ACTIVE_KEY, fresh);
    };

    const handleDeleteChat = () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        timers.current.forEach(clearTimeout);
        setIsTyping(false); setInput(''); setConfirmDelete(false);
        rejectionCount.current = 0;
        const fresh = makeIntroMessages();
        setMessages(fresh);
        saveToCache(ACTIVE_KEY, fresh);
    };

    const handleResume = (session) => {
        archiveSession(currentSessionId.current, messages);
        currentSessionId.current = session.id;
        setMessages(session.messages);
        saveToCache(ACTIVE_KEY, session.messages);
        setShowSessions(false); setInput(''); setIsTyping(false);
    };

    // ── Keyword fallback (always available) ──────────────────────────────────
    const answerByKeyword = (text) => {
        const result = resolveQuery(text);
        if (result.type === 'topic') {
            const followUps = getTopicsByIds(result.topic.followUps || []);
            setMessages(prev => [...prev, {
                id: nextId(), role: 'priya',
                text: result.topic.answer,
                action: result.topic.action || null,
                suggestions: followUps.length ? followUps : getDefaultSuggestions()
            }]);
            return;
        }
        if (result.type === 'smalltalk') {
            setMessages(prev => [...prev, {
                id: nextId(), role: 'priya',
                text: PRIYA.smalltalkReplies[result.kind],
                suggestions: getDefaultSuggestions()
            }]);
            return;
        }
        const attempt = rejectionCount.current++;
        setMessages(prev => [...prev, {
            id: nextId(), role: 'priya',
            text: pickRejection(attempt),
            suggestions: getDefaultSuggestions()
        }]);
    };

    // ── Main submit — tries real AI first, falls back to keyword matcher ──────
    const handleSubmit = async (rawText, knownTopic = null) => {
        const text = String(rawText ?? input).trim();
        if (!text || isTyping) return;
        setInput(''); setConfirmDelete(false);

        // Remove chips from last Priya message
        setMessages(prev => {
            const upd = [...prev];
            for (let i = upd.length - 1; i >= 0; i--) {
                if (upd[i].role === 'priya' && upd[i].suggestions) { upd[i] = { ...upd[i], suggestions: [] }; break; }
            }
            return [...upd, { id: nextId(), role: 'user', text }];
        });

        // If user tapped a chip, we already know the topic — use keyword matcher directly
        // (no need to waste an AI call on a chip tap)
        if (knownTopic) {
            setIsTyping(true);
            const followUps = getTopicsByIds(knownTopic.followUps || []);
            schedule(() => {
                setIsTyping(false);
                setMessages(prev => [...prev, {
                    id: nextId(), role: 'priya',
                    text: knownTopic.answer,
                    action: knownTopic.action || null,
                    suggestions: followUps.length ? followUps : getDefaultSuggestions()
                }]);
            }, 550 + Math.random() * 300);
            return;
        }

        // Free-typed message → try real AI
        setIsTyping(true);

        // FIX: snapshot history BEFORE setMessages so we don't capture stale state
        const historySnapshot = [...messages].slice(-8);

        const aiReply = await callPriyaAI(text, historySnapshot);

        if (aiReply) {
            // Real AI responded ✅
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: nextId(), role: 'priya',
                text: aiReply
                // No suggestions after AI reply — the AI answer is open-ended
            }]);
        } else {
            // AI unavailable → keyword fallback 🔄
            schedule(() => {
                setIsTyping(false);
                answerByKeyword(text);
            }, 500 + Math.random() * 300);
        }
    };

    const handleTopicPick = (topic) => handleSubmit(topic.question, topic);
    const handleAction = (action) => { if (action?.type === 'navigate' && onNavigate) onNavigate(action.view); };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-[#060c0b]">

            {/* Standalone header */}
            {!hideHeader && (
                <div className="flex items-center gap-3 border-b border-white/10 bg-[#080f0d] px-4 py-3">
                    <PriyaAvatar size={40} />
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                            {PRIYA.name}<Sparkles size={12} className="text-emerald-400" />
                        </p>
                        <p className="truncate text-[10px] text-emerald-400/80">{PRIYA.status}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <button onClick={() => setShowSessions(true)} title="Chat history" className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-emerald-300 transition-colors"><History size={15} /></button>
                        <button onClick={handleNewSession} title="New session" className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-emerald-300 transition-colors"><RotateCcw size={15} /></button>
                        <button onClick={handleDeleteChat} title={confirmDelete ? 'Tap again to confirm' : 'Delete chat'}
                            className={`rounded-full p-2 transition-colors hover:bg-white/10 ${confirmDelete ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}><Trash2 size={15} /></button>
                    </div>
                </div>
            )}

            {/* Action row when inside full-screen */}
            {hideHeader && (
                <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#080f0d] px-4 py-2">
                    <button onClick={() => setShowSessions(true)} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:bg-white/10 hover:text-emerald-300 transition-colors"><History size={12} /> History</button>
                    <button onClick={handleNewSession} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:bg-white/10 hover:text-emerald-300 transition-colors"><RotateCcw size={12} /> New chat</button>
                    <button onClick={handleDeleteChat} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${confirmDelete ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-white/10 bg-white/[0.04] text-gray-400 hover:text-red-400 hover:bg-white/10'}`}><Trash2 size={12} /> {confirmDelete ? 'Confirm?' : 'Delete'}</button>
                </div>
            )}

            {/* Conversation */}
            <div ref={scrollRef} className="hide-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} onAction={handleAction} onTopicPick={handleTopicPick} />
                ))}
                {isTyping && (
                    <div className="flex items-center gap-2">
                        <PriyaAvatar size={28} animated={false} showRing={false} />
                        <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2"><TypingDots /></div>
                    </div>
                )}
            </div>

            {/* Composer */}
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                className="shrink-0 border-t border-white/10 bg-[#080f0d] px-3 py-3"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
                <div className="flex items-center gap-2">
                    <input ref={inputRef} value={input}
                        onChange={e => { setInput(e.target.value); setConfirmDelete(false); }}
                        placeholder="Ask Priya anything about SynapseX..."
                        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-gray-500 focus:border-emerald-500/50" />
                    <button type="submit" disabled={!input.trim() || isTyping} aria-label="Send"
                        className="shrink-0 rounded-full bg-emerald-500 p-2.5 text-black transition-all hover:bg-emerald-400 disabled:opacity-30">
                        <Send size={16} />
                    </button>
                </div>
                <p className="mt-1.5 text-center text-[9px] text-gray-600">Powered by Cloudflare Workers AI · SynapseX only</p>
            </form>

            {/* Sessions panel */}
            <AnimatePresence>
                {showSessions && <SessionsPanel onResume={handleResume} onClose={() => setShowSessions(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default PriyaChat;
