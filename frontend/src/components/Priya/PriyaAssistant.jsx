import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import PriyaAvatar from './PriyaAvatar';
import PriyaChat from './PriyaChat';
import PriyaLandingChat from './PriyaLandingChat';
import { PRIYA } from './priyaKnowledge';

const NUDGE_KEY         = 'priya_nudge_seen';
const LANDING_NUDGE_KEY = 'priya_landing_nudge_seen';

/**
 * PriyaAssistant — single entry point for both contexts.
 *
 * landingMode = false (default) → full knowledge base, sessions, history
 * landingMode = true            → landing-only knowledge, sign-up/login guide
 *
 * In both cases clicking the floating button opens a full-screen slide-up chat.
 */
const PriyaAssistant = ({ onNavigate, landingMode = false }) => {
    const nudgeKey = landingMode ? LANDING_NUDGE_KEY : NUDGE_KEY;

    const [open, setOpen]           = useState(false);
    const [showNudge, setShowNudge] = useState(false);
    // Changes every time the chat opens — forces PriyaLandingChat to remount fresh.
    const [sessionKey, setSessionKey] = useState(0);

    useEffect(() => {
        let seen = false;
        try { seen = localStorage.getItem(nudgeKey) === '1'; } catch { seen = true; }
        if (seen) return;
        const t = setTimeout(() => setShowNudge(true), landingMode ? 3500 : 4500);
        return () => clearTimeout(t);
    }, [nudgeKey, landingMode]);

    const dismissNudge = () => {
        setShowNudge(false);
        try { localStorage.setItem(nudgeKey, '1'); } catch { /* ok */ }
    };

    const openChat  = () => { dismissNudge(); setSessionKey(k => k + 1); setOpen(true); };
    const closeChat = () => setOpen(false);

    const nudgeText = landingMode
        ? "Hi! I'm Priya 💚 Need help signing up or logging in?"
        : `Hi, I'm ${PRIYA.name} 💚 Need help with SynapseX?`;

    const statusText = landingMode
        ? 'Sign-up & login guide'
        : PRIYA.status;

    return (
        <>
            {/* ── Floating launcher ── */}
            <AnimatePresence>
                {!open && (
                    <motion.div
                        key="priya-launcher"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.18 } }}
                        className="pointer-events-none fixed bottom-[96px] right-3 z-[900] flex flex-col items-end gap-2"
                    >
                        {/* Nudge bubble */}
                        <AnimatePresence>
                            {showNudge && (
                                <motion.button
                                    key="nudge"
                                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.94 }}
                                    onClick={openChat}
                                    className="pointer-events-auto max-w-[200px] rounded-2xl rounded-br-sm border border-emerald-500/25 bg-[#0b1512]/95 px-3 py-2 text-left text-[11px] leading-relaxed text-gray-200 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-md"
                                >
                                    {nudgeText}
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Avatar button */}
                        <motion.button
                            onClick={openChat}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Chat with Priya"
                            className="synapse-priya-launcher pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/35 bg-[#080f0d]/90 shadow-[0_6px_24px_rgba(16,185,129,0.32)] backdrop-blur-md"
                        >
                            <motion.span
                                className="synapse-priya-launcher-pulse pointer-events-none absolute inset-0 rounded-full border border-emerald-400/45"
                                animate={{ scale: [1, 1.25, 1], opacity: [0.65, 0, 0.65] }}
                                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
                            />
                            <PriyaAvatar size={36} showRing={false} animated={false} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Full-screen chat ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="priya-fullscreen"
                        initial={{ y: '100%', borderRadius: '9999px', opacity: 0.6 }}
                        animate={{
                            y: 0, borderRadius: '0px', opacity: 1,
                            transition: {
                                y: { type: 'spring', stiffness: 340, damping: 36 },
                                borderRadius: { duration: 0.28, ease: 'easeOut' },
                                opacity: { duration: 0.18 }
                            }
                        }}
                        exit={{
                            y: '100%', borderRadius: '9999px', opacity: 0,
                            transition: {
                                y: { type: 'spring', stiffness: 360, damping: 38 },
                                borderRadius: { duration: 0.22, ease: 'easeIn' },
                                opacity: { duration: 0.22 }
                            }
                        }}
                        className="fixed inset-0 z-[960] flex flex-col overflow-hidden bg-[#060c0b]"
                        style={{ transformOrigin: 'bottom right' }}
                    >
                        {/* Status bar spacer */}
                        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />

                        {/* Header */}
                        <div className="flex items-center gap-3 border-b border-white/[0.07] bg-[#080f0d] px-4 py-3">
                            <PriyaAvatar size={44} animated showRing />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 text-[15px] font-black tracking-tight text-white">
                                    {PRIYA.name}
                                    <Sparkles size={13} className="text-emerald-400" />
                                </p>
                                <p className="truncate text-[11px] text-emerald-400/75">{statusText}</p>
                            </div>
                            {/* Down chevron close button */}
                            <button onClick={closeChat} aria-label="Close Priya"
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M4.5 7 L9 12 L13.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Chat body — different component per mode */}
                        <div className="min-h-0 flex-1 overflow-hidden">
                            {landingMode
                                ? <PriyaLandingChat key={sessionKey} onClose={closeChat} onNavigate={onNavigate} />
                                : <PriyaChat onClose={closeChat} onNavigate={onNavigate} hideHeader />
                            }
                        </div>

                        {/* Bottom safe area */}
                        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PriyaAssistant;
