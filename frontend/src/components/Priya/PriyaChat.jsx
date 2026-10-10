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
            <motion.span key={i}
                style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #38bdf8)' }}
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
                style={{
                    borderRadius: '9999px',
                    border: '1px solid rgba(167,139,250,0.35)',
                    borderTop: '1px solid rgba(192,132,252,0.5)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(145,175,255,0.03)), rgba(10,14,40,0.55)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(196,181,253,0.9)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
            >
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
                {isPriya && <div className="mt-1 shrink-0"><div style={{ position:'relative', width:28, height:28, borderRadius:'50%', overflow:'hidden', border:'1.5px solid rgba(168,85,247,0.4)', flexShrink:0 }}>
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop" alt="Priya" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.3)' }} />
                                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(124,58,237,0.25), transparent)' }} />
                            </div></div>}
                <div className="max-w-[82%]">
                    {isPriya ? (
                        <div style={{
                            borderRadius: '16px 16px 16px 4px',
                            background: 'linear-gradient(138deg, rgba(255,255,255,0.09) 0%, rgba(145,175,255,0.04) 50%, rgba(255,255,255,0.02) 100%), rgba(10,14,40,0.58)',
                            border: '1px solid rgba(255,255,255,0.11)',
                            borderTop: '1px solid rgba(255,255,255,0.20)',
                            backdropFilter: 'blur(16px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                            padding: '10px 14px',
                            fontSize: 13,
                            lineHeight: '1.6',
                            color: 'rgba(226,232,240,0.92)',
                            boxShadow: '0 4px 16px rgba(2,4,18,0.3)',
                        }}>
                            <p style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{formatRich(message.text)}</p>
                        </div>
                    ) : (
                        <div style={{
                            borderRadius: '16px 16px 4px 16px',
                            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                            padding: '10px 14px',
                            fontSize: 13,
                            fontWeight: 500,
                            lineHeight: '1.6',
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                        }}>
                            <p style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{formatRich(message.text)}</p>
                        </div>
                    )}
                    {message.action && onAction && (
                        <button onClick={() => onAction(message.action)}
                            style={{
                                marginTop: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: '9999px',
                                border: '1px solid rgba(167,139,250,0.45)',
                                background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(168,85,247,0.10))',
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'rgba(196,181,253,0.9)',
                                cursor: 'pointer',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}>
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
            style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column',
                background: 'linear-gradient(168deg, #0a0d25 0%, #060818 45%, #04050f 100%)',
            }}>
            {/* Ambient orbs */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-5%', left: '-10%', width: '55%', height: '35%', borderRadius: '9999px', background: 'rgba(56,189,248,0.09)', filter: 'blur(55px)', mixBlendMode: 'screen' }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '45%', height: '40%', borderRadius: '9999px', background: 'rgba(168,85,247,0.08)', filter: 'blur(55px)', mixBlendMode: 'screen' }} />
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: '1px solid rgba(255,255,255,0.09)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(145,175,255,0.03)), rgba(9,12,36,0.70)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                padding: '12px 16px',
            }}>
                <button onClick={onClose}
                    style={{
                        borderRadius: '50%', padding: 8, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'rgba(148,163,184,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                    }}>
                    <ChevronLeft size={18} />
                </button>
                <p style={{ flex: 1, fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>Chat history</p>
                <Clock size={15} style={{ color: 'rgba(100,116,139,0.7)' }} />
            </div>

            <div className="hide-scrollbar" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64, textAlign: 'center' }}>
                        <History size={28} style={{ color: 'rgba(100,116,139,0.5)' }} />
                        <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'rgba(148,163,184,0.6)' }}>No saved sessions yet</p>
                        <p style={{ marginTop: 4, fontSize: 11, color: 'rgba(100,116,139,0.5)' }}>Start a new chat — it saves automatically.</p>
                    </div>
                )}
                {sessions.map(session => (
                    <motion.button key={session.id}
                        initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                        onClick={() => onResume(session)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderTop: '1px solid rgba(255,255,255,0.14)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(145,175,255,0.03)), rgba(10,14,40,0.50)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            padding: '12px 16px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            width: '100%',
                        }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(56,189,248,0.12))',
                            border: '1px solid rgba(167,139,250,0.25)',
                        }}>
                            <Sparkles size={14} style={{ color: '#a78bfa' }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</p>
                            <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)' }}>{session.messages.length - 1} messages · {fmt(session.savedAt)}</p>
                        </div>
                        <button onClick={(e) => handleDelete(session.id, e)}
                            style={{
                                flexShrink: 0, borderRadius: '50%', padding: 6, cursor: 'pointer',
                                background: 'transparent', border: 'none',
                                color: 'rgba(100,116,139,0.6)',
                                transition: 'color 0.15s',
                            }}>
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

    // ── Liquid glass pill button shared style ─────────────────────────────────
    const pillBtn = (active = false) => ({
        display: 'inline-flex', alignItems: 'center', gap: 6,
        borderRadius: '9999px',
        border: active ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.10)',
        borderTop: active ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(255,255,255,0.18)',
        background: active
            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(145,175,255,0.03)), rgba(10,14,40,0.50)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 700,
        color: active ? 'rgba(252,165,165,0.9)' : 'rgba(148,163,184,0.8)',
        cursor: 'pointer',
        transition: 'all 0.15s',
    });

    const iconBtn = () => ({
        borderRadius: '50%', padding: 8, cursor: 'pointer',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(148,163,184,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ position: 'relative', display: 'flex', height: '100%', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>

            {/* Standalone header */}
            {!hideHeader && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid rgba(255,255,255,0.09)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.09), rgba(145,175,255,0.03)), rgba(9,12,36,0.72)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    padding: '12px 16px',
                }}>
                    <div style={{ position:'relative', width:40, height:40, borderRadius:'50%', overflow:'hidden', border:'2px solid rgba(168,85,247,0.5)', boxShadow:'0 0 12px rgba(168,85,247,0.4)' }}>
                    <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop" alt="Priya" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.3)' }} />
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(124,58,237,0.3), transparent)' }} />
                </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                            {PRIYA.name}<Sparkles size={12} style={{ color: '#c084fc' }} />
                        </p>
                        <p style={{ fontSize: 10, color: 'rgba(192,132,252,0.75)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{PRIYA.status}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button onClick={() => setShowSessions(true)} title="Chat history" style={iconBtn()}><History size={15} /></button>
                        <button onClick={handleNewSession} title="New session" style={iconBtn()}><RotateCcw size={15} /></button>
                        <button onClick={handleDeleteChat} title={confirmDelete ? 'Tap again to confirm' : 'Delete chat'}
                            style={{ ...iconBtn(), color: confirmDelete ? 'rgba(252,165,165,0.9)' : 'rgba(148,163,184,0.7)' }}>
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* Action row when inside full-screen */}
            {hideHeader && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    margin: '0 14px 8px 14px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderTop: '1.5px solid rgba(255,255,255,0.40)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(145,175,255,0.04)), rgba(9,12,36,0.65)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    padding: '8px 14px',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), 0 8px 20px -4px rgba(0,0,0,0.5)',
                }}>
                    <button onClick={() => setShowSessions(true)} style={pillBtn()}><History size={12} /> History</button>
                    <button onClick={handleNewSession} style={pillBtn()}><RotateCcw size={12} /> New chat</button>
                    <button onClick={handleDeleteChat} style={pillBtn(confirmDelete)}><Trash2 size={12} /> {confirmDelete ? 'Confirm?' : 'Delete'}</button>
                </div>
            )}

            {/* Conversation inside Floating Liquid Glass Main Box */}
            <div style={{
                position: 'relative',
                flex: 1, minHeight: 0,
                display: 'flex', flexDirection: 'column',
                margin: '0 14px 10px 14px',
                borderRadius: '28px',
                overflow: 'hidden',
                background: 'linear-gradient(142deg, rgba(255,255,255,0.18) 0%, rgba(147,197,253,0.09) 35%, rgba(168,85,247,0.07) 70%, rgba(255,255,255,0.02) 100%), rgba(9,13,38,0.60)',
                border: '1.5px solid rgba(255, 255, 255, 0.30)',
                borderTop: '2.2px solid rgba(255, 255, 255, 0.80)',
                borderLeft: '1.8px solid rgba(255, 255, 255, 0.55)',
                boxShadow: 'inset 0 2px 2px 0 rgba(255, 255, 255, 0.62), inset 0 -2px 3px 0 rgba(125, 211, 252, 0.25), 0 24px 50px -10px rgba(0, 0, 0, 0.75), 0 0 35px -5px rgba(56, 189, 248, 0.22)',
                backdropFilter: 'blur(32px) saturate(220%)',
                WebkitBackdropFilter: 'blur(32px) saturate(220%)',
            }}>
                <div ref={scrollRef} className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} onAction={handleAction} onTopicPick={handleTopicPick} />
                    ))}
                    {isTyping && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ position:'relative', width:28, height:28, borderRadius:'50%', overflow:'hidden', border:'1.5px solid rgba(168,85,247,0.4)', flexShrink:0 }}>
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop" alt="Priya" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.3)' }} />
                                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(124,58,237,0.25), transparent)' }} />
                            </div>
                            <div style={{
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(145,175,255,0.06)), rgba(10,14,40,0.60)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                borderTop: '1.5px solid rgba(255,255,255,0.60)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                padding: '8px 14px',
                            }}>
                                <TypingDots />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Composer — Floating Pill Dock */}
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                style={{
                    flexShrink: 0,
                    margin: '0 14px 10px 14px',
                    borderRadius: '9999px',
                    border: '1.5px solid rgba(255,255,255,0.30)',
                    borderTop: '2px solid rgba(255,255,255,0.75)',
                    borderLeft: '1.5px solid rgba(255,255,255,0.50)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.20), rgba(145,175,255,0.08)), rgba(9,12,36,0.68)',
                    backdropFilter: 'blur(28px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                    padding: '6px 8px 6px 14px',
                    boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.55), 0 16px 36px -8px rgba(0,0,0,0.7), 0 0 25px -4px rgba(56,189,248,0.25)',
                    marginBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input ref={inputRef} value={input}
                        onChange={e => { setInput(e.target.value); setConfirmDelete(false); }}
                        placeholder="Ask Priya anything about SynapseX..."
                        style={{
                            flex: 1, minWidth: 0,
                            borderRadius: '9999px',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderTop: '1px solid rgba(255,255,255,0.20)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(145,175,255,0.03)), rgba(10,14,40,0.55)',
                            backdropFilter: 'blur(16px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                            padding: '10px 16px',
                            fontSize: 13,
                            color: '#fff',
                            outline: 'none',
                        }}
                    />
                    <button type="submit" disabled={!input.trim() || isTyping} aria-label="Send"
                        style={{
                            flexShrink: 0, borderRadius: '50%',
                            background: input.trim() && !isTyping
                                ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                                : 'rgba(255,255,255,0.08)',
                            border: 'none',
                            padding: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                            opacity: input.trim() && !isTyping ? 1 : 0.35,
                            boxShadow: input.trim() && !isTyping ? '0 4px 16px rgba(124,58,237,0.45)' : 'none',
                            transition: 'all 0.18s',
                        }}>
                        <Send size={16} style={{ color: '#fff' }} />
                    </button>
                </div>
                <p style={{ marginTop: 6, textAlign: 'center', fontSize: 9, color: 'rgba(71,85,105,0.7)' }}>Powered by Cloudflare Workers AI · SynapseX only</p>
            </form>

            {/* Sessions panel */}
            <AnimatePresence>
                {showSessions && <SessionsPanel onResume={handleResume} onClose={() => setShowSessions(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default PriyaChat;
