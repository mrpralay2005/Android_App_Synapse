import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import PriyaAvatar from './PriyaAvatar';
import PriyaChat from './PriyaChat';
import { PRIYA } from './priyaKnowledge';

const NUDGE_KEY = 'priya_nudge_seen';

/**
 * Priya's entry point: the floating launcher that opens her chat panel.
 * Rendered once at the app root so she is available on every screen.
 *
 * z-index note: the launcher sits at z-[900] and the panel at z-[950]. That puts
 * them above the mobile social layout (z-[120]) but below the app's modals
 * (z-[1000]), so a modal opened from inside a post still appears on top.
 */
const PriyaAssistant = ({ onNavigate }) => {
    const [open, setOpen] = useState(false);
    const [showNudge, setShowNudge] = useState(false);

    // Introduce her once, a few seconds after the visitor lands.
    useEffect(() => {
        let alreadySeen = false;
        try {
            alreadySeen = localStorage.getItem(NUDGE_KEY) === '1';
        } catch {
            alreadySeen = true; // storage blocked — never nag
        }
        if (alreadySeen) return undefined;

        const timer = setTimeout(() => setShowNudge(true), 4500);
        return () => clearTimeout(timer);
    }, []);

    const rememberNudge = () => {
        setShowNudge(false);
        try {
            localStorage.setItem(NUDGE_KEY, '1');
        } catch {
            /* storage unavailable — nothing to remember */
        }
    };

    const openChat = () => {
        rememberNudge();
        setOpen(true);
    };

    return (
        <>
            {/* ---------------- Launcher ---------------- */}
            <div className="pointer-events-none fixed bottom-20 right-4 z-[900] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
                <AnimatePresence>
                    {showNudge && !open && (
                        <motion.button
                            key="priya-nudge"
                            initial={{ opacity: 0, y: 10, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.94 }}
                            onClick={openChat}
                            className="pointer-events-auto max-w-[232px] rounded-2xl rounded-br-sm border border-emerald-500/25 bg-[#0b1512]/95 px-3.5 py-2.5 text-left text-[11px] leading-relaxed text-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md"
                        >
                            Hi, I'm {PRIYA.name} 💚 Need help finding your way around SynapseX?
                        </motion.button>
                    )}
                </AnimatePresence>

                <motion.button
                    onClick={() => (open ? setOpen(false) : openChat())}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={open ? 'Close Priya' : `Chat with ${PRIYA.name}`}
                    title={`${PRIYA.name} — ${PRIYA.tagline}`}
                    className="pointer-events-auto relative flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-[#0b1512]/90 p-1.5 pr-2 shadow-[0_10px_36px_rgba(16,185,129,0.28)] backdrop-blur-md"
                >
                    {/* Attention halo, only while she is closed */}
                    {!open && (
                        <motion.span
                            className="pointer-events-none absolute inset-0 rounded-full border border-emerald-400/40"
                            animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
                        />
                    )}

                    <PriyaAvatar size={44} />

                    {open ? (
                        <X size={16} className="mr-1.5 text-emerald-200" />
                    ) : (
                        <span className="hidden pr-1 text-xs font-bold text-emerald-200 sm:block">
                            Ask {PRIYA.name}
                        </span>
                    )}
                </motion.button>
            </div>

            {/* ---------------- Chat panel ---------------- */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="priya-panel"
                        initial={{ opacity: 0, y: 26, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 26, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                        className="fixed bottom-2 left-2 right-2 z-[950] flex h-[min(78vh,620px)] flex-col overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#080c0b]/95 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:bottom-24 sm:left-auto sm:right-6 sm:h-[560px] sm:w-[384px]"
                    >
                        <PriyaChat onClose={() => setOpen(false)} onNavigate={onNavigate} />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PriyaAssistant;