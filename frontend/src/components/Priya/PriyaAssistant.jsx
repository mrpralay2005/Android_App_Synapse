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
const PriyaAssistant = ({ onNavigate, landingMode = false, forceOpen = false, onClose }) => {
    const nudgeKey = landingMode ? LANDING_NUDGE_KEY : NUDGE_KEY;

    const [open, setOpen]           = useState(false);
    const [showNudge, setShowNudge] = useState(false);
    // Changes every time the chat opens — forces PriyaLandingChat to remount fresh.
    const [sessionKey, setSessionKey] = useState(0);

    useEffect(() => {
        // The landing page has a deliberately dense visual composition. Keep its
        // assistant available as a calm floating button instead of covering the
        // primary content with an automatic speech bubble.
        if (landingMode) return undefined;
        let seen = false;
        try { seen = localStorage.getItem(nudgeKey) === '1'; } catch { seen = true; }
        if (seen) return;
        const t = setTimeout(() => setShowNudge(true), 4500);
        return () => clearTimeout(t);
    }, [nudgeKey, landingMode]);

    const dismissNudge = () => {
        setShowNudge(false);
        try { localStorage.setItem(nudgeKey, '1'); } catch { /* ok */ }
    };

    const openChat  = () => { dismissNudge(); setSessionKey(k => k + 1); setOpen(true); };

    // Handle external forceOpen trigger
    useEffect(() => {
        if (forceOpen) {
            dismissNudge();
            setSessionKey(k => k + 1);
            setOpen(true);
        }
    }, [forceOpen]);
    const closeChat = () => { setOpen(false); if (onClose) onClose(); };

    const nudgeText = landingMode
        ? "Hi! I'm Priya � Need help signing up or logging in?"
        : `Hi, I'm ${PRIYA.name} � Need help with SynapseX?`;

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
                        className={`pointer-events-none fixed right-3 z-[900] flex flex-col items-end gap-2 ${landingMode ? 'bottom-24' : 'bottom-[96px]'}`}
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
                                    className={`pointer-events-auto max-w-[200px] rounded-2xl rounded-br-sm px-3 py-2 text-left text-[11px] leading-relaxed text-gray-200 shadow-[0_8px_32px_rgba(0,0,0,0.55)] ${landingMode ? 'mobile-priya-nudge' : ''}`}
                                    style={{
                                        background: 'linear-gradient(138deg, rgba(255,255,255,0.12) 0%, rgba(145,175,255,0.05) 50%, rgba(255,255,255,0.02) 100%), rgba(9,12,36,0.88)',
                                        border: '1px solid rgba(255,255,255,0.14)',
                                        borderTop: '1.5px solid rgba(255,255,255,0.28)',
                                        backdropFilter: 'blur(24px) saturate(180%)',
                                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                    }}
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
                            className={`synapse-priya-launcher pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full ${landingMode ? 'mobile-priya-launcher' : ''}`}
                            style={{
                                background: 'linear-gradient(138deg, rgba(168,85,247,0.35) 0%, rgba(56,189,248,0.18) 100%), rgba(9,12,36,0.85)',
                                border: '1px solid rgba(168,85,247,0.45)',
                                borderTop: '1.5px solid rgba(192,132,252,0.55)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                boxShadow: '0 6px 24px rgba(168,85,247,0.38), inset 0 1px 1px rgba(255,255,255,0.25)',
                            }}
                        >
                            <motion.span
                                className="synapse-priya-launcher-pulse pointer-events-none absolute inset-0 rounded-full"
                                style={{ border: '1px solid rgba(168,85,247,0.5)' }}
                                animate={{ scale: [1, 1.25, 1], opacity: [0.65, 0, 0.65] }}
                                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
                            />
                            <div style={{ position:'relative', width:36, height:36, borderRadius:'50%', overflow:'hidden' }}>
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop" alt="Priya" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.3)' }} />
                                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(124,58,237,0.3), transparent)' }} />
                            </div>
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
                        className={`fixed inset-0 z-[960] flex flex-col overflow-hidden ${landingMode ? 'mobile-priya-sheet' : ''}`}
                        style={{
                            background: 'radial-gradient(110% 65% at 50% -10%, rgba(56, 189, 248, 0.26) 0%, rgba(99, 102, 241, 0.20) 36%, transparent 72%), radial-gradient(85% 55% at 100% 60%, rgba(192, 132, 252, 0.22) 0%, transparent 65%), linear-gradient(168deg, #0a0d25 0%, #060818 45%, #04050f 100%)',
                            transformOrigin: 'bottom right',
                        }}
                    >
                        {/* Dynamic Liquid Ambient Lighting Orbs */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div style={{ position: 'absolute', top: '-6%', left: '-12%', width: '60%', height: '40%', borderRadius: '9999px', background: 'rgba(56,189,248,0.30)', filter: 'blur(60px)', mixBlendMode: 'screen' }} />
                            <div style={{ position: 'absolute', top: '25%', right: '-12%', width: '58%', height: '45%', borderRadius: '9999px', background: 'rgba(168,85,247,0.26)', filter: 'blur(65px)', mixBlendMode: 'screen' }} />
                            <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: '65%', height: '35%', borderRadius: '9999px', background: 'rgba(99,102,241,0.22)', filter: 'blur(70px)', mixBlendMode: 'screen' }} />
                            <div style={{ position: 'absolute', bottom: '-8%', right: '5%', width: '50%', height: '35%', borderRadius: '9999px', background: 'rgba(6,182,212,0.25)', filter: 'blur(60px)', mixBlendMode: 'screen' }} />
                        </div>

                        {/* Status bar spacer */}
                        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />

                        {/* Header — Floating Liquid Glass Island (Oppo ColorOS 17 / Aquamorphic) */}
                        <div
                            className={`relative z-10 flex items-center gap-3 px-4 py-3 mx-3.5 mt-2.5 mb-2 rounded-[26px] ${landingMode ? 'mobile-priya-sheet-header' : ''}`}
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(147,197,253,0.10) 45%, rgba(192,132,252,0.06) 75%, rgba(255,255,255,0.03) 100%), rgba(10,14,42,0.68)',
                                border: '1.5px solid rgba(255,255,255,0.32)',
                                borderTop: '2.2px solid rgba(255,255,255,0.85)',
                                borderLeft: '1.8px solid rgba(255,255,255,0.60)',
                                boxShadow: 'inset 0 2px 2px 0 rgba(255,255,255,0.65), inset 0 -1.5px 2px 0 rgba(125,211,252,0.25), 0 20px 45px -10px rgba(0,0,0,0.72), 0 0 30px -4px rgba(56,189,248,0.30)',
                                backdropFilter: 'blur(32px) saturate(210%)',
                                WebkitBackdropFilter: 'blur(32px) saturate(210%)',
                            }}
                        >
                            {/* Top specular reflection shimmer */}
                            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1.5px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)', filter: 'drop-shadow(0 0 6px rgba(125,211,252,0.8))', pointerEvents: 'none' }} />

                            {/* Crystal Avatar Squircle Badge */}
                            <div style={{ position:'relative', width:44, height:44, borderRadius:'50%', overflow:'hidden', border:'2px solid rgba(168,85,247,0.55)', boxShadow:'0 0 16px rgba(168,85,247,0.45)', flexShrink:0 }}>
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80&auto=format&fit=crop" alt="Priya" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.3) brightness(0.95)' }} />
                                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(124,58,237,0.35), transparent)' }} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                                    <span style={{ background: 'linear-gradient(108deg, #ffffff 0%, #bae6fd 40%, #c084fc 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 2px 8px rgba(56,189,248,0.3))' }}>
                                        {PRIYA.name}
                                    </span>
                                    <Sparkles size={13} style={{ color: '#7dd3fc' }} />
                                    <span style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '2px 6px', borderRadius: 9999, border: '1px solid rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.12)', color: '#7dd3fc' }}>
                                        Liquid Core
                                    </span>
                                </p>
                                <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#93c5fd', fontWeight: 600, letterSpacing: '0.02em', marginTop: 1 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8', display: 'inline-block' }} />
                                    {statusText}
                                </p>
                            </div>

                            {/* Liquid Glass Close Pill Button */}
                            <button
                                onClick={closeChat}
                                aria-label="Close Priya"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(147,197,253,0.06) 100%), rgba(18,22,58,0.5)',
                                    border: '1px solid rgba(255,255,255,0.22)',
                                    borderTop: '1.2px solid rgba(255,255,255,0.42)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.38), 0 8px 18px -4px rgba(0,0,0,0.4)',
                                    color: '#dbeafe',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M4.5 7 L9 12 L13.5 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Chat body — different component per mode */}
                        <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
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
