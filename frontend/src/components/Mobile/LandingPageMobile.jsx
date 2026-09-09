import React from 'react';
import { motion } from 'framer-motion';
import { Target, Shield, Zap, Globe, X } from 'lucide-react';

const MobileLandingPage = ({ onLogin, onRegister, onExit }) => {
    const features = [
        { icon: Shield, title: 'Quantum Security', desc: 'Military-grade encryption for your digital self.' },
        { icon: Zap, title: 'Instant Sync', desc: 'Real-time behavioral analysis and authentication.' },
        { icon: Globe, title: 'Global Uplink', desc: 'Access your profile from any node in the world.' },
        { icon: Target, title: 'AI Core', desc: 'Continuous learning neural protection.' }
    ];

    return (
        <div
            className="mobile-landing relative w-full overflow-hidden bg-[#04080d] text-white"
            style={{
                height: '100%',
                width: '100%',
                maxHeight: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overscrollBehavior: 'none',
                boxSizing: 'border-box'
            }}
        >
            <style>{`
                .mobile-landing {
                    min-height: 0;
                }

                .mobile-landing-content {
                    padding-top: max(0.75rem, env(safe-area-inset-top));
                    padding-right: max(1rem, env(safe-area-inset-right));
                    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
                    padding-left: max(1rem, env(safe-area-inset-left));
                }

                .mobile-landing-title {
                    font-size: clamp(2.2rem, 12vw, 3rem);
                }

                .mobile-landing-copy {
                    font-size: clamp(0.875rem, 3.8vw, 1rem);
                    line-height: clamp(1.35rem, 6vw, 1.75rem);
                }

                .mobile-landing-feature-title {
                    font-size: clamp(0.75rem, 3.6vw, 1rem);
                }

                .mobile-landing-feature-copy {
                    font-size: clamp(0.625rem, 2.8vw, 0.6875rem);
                }

                @media (max-height: 850px) {
                    .mobile-landing-content { padding-top: max(0.5rem, env(safe-area-inset-top)); padding-bottom: max(0.5rem, env(safe-area-inset-bottom)); }
                    .mobile-landing-title-block { margin-top: 0.5rem; }
                    .mobile-landing-copy-block { margin-top: 0.625rem; }
                    .mobile-landing-actions { margin-top: 0.875rem; gap: 0.5rem; }
                    .mobile-landing-actions button { padding-top: 0.75rem; padding-bottom: 0.75rem; }
                    .mobile-landing-features { margin-top: 0.875rem; gap: 0.5rem; }
                    .mobile-landing-feature { padding: 0.625rem; border-radius: 1rem; }
                    .mobile-landing-feature-icon { margin-bottom: 0.5rem; height: 2rem; width: 2rem; }
                }

                @media (max-height: 580px) {
                    .mobile-landing-brand { margin-top: 0; }
                    .mobile-landing-title { font-size: 2rem; }
                    .mobile-landing-copy { line-height: 1.3rem; }
                    .mobile-landing-actions { gap: 0.375rem; }
                    .mobile-landing-actions button { padding-top: 0.625rem; padding-bottom: 0.625rem; }
                    .mobile-landing-feature-copy { display: none; }
                    .mobile-landing-features { margin-top: 0.625rem; }
                    .mobile-landing-feature { padding: 0.5rem; }
                    .mobile-landing-feature-icon { margin-bottom: 0.25rem; height: 1.75rem; width: 1.75rem; }
                    .mobile-landing-feature-title { font-size: 0.6875rem; }
                }

                div::-webkit-scrollbar { display: none; }
            `}</style>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.10),_transparent_30%)]" />

            <div className="mobile-landing-content relative z-10 mx-auto flex h-full max-w-md flex-col">
                <motion.button
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    onClick={onExit}
                    className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105"
                    aria-label="Exit"
                    title="Exit Neural Gateway"
                >
                    <X size={20} />
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mobile-landing-brand mt-2 flex items-center gap-3"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10">
                        <Target className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h1 className="text-[2rem] font-black tracking-[-0.07em] text-white">SynapseX</h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08 }}
                    className="mobile-landing-title-block mt-5"
                >
                    <h2 className="mobile-landing-title font-black leading-[0.9] tracking-[-0.07em] text-white">
                        The World's
                        <span className="block text-emerald-400">Most Secure</span>
                        Neural Gateway
                    </h2>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="mobile-landing-copy mobile-landing-copy-block mt-4 max-w-sm text-gray-300"
                >
                    Experience the next generation of digital identity. SynapseX uses advanced behavioral AI to protect your neural footprint across the decentralized web.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.22 }}
                    className="mobile-landing-actions mt-6 flex flex-col gap-3"
                >
                    <button
                        onClick={onLogin}
                        className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-4 text-base font-black text-black shadow-[0_0_24px_rgba(52,211,153,0.45)] transition-transform hover:scale-[1.01]"
                    >
                        Access Neural Hub
                    </button>

                    <button
                        onClick={onRegister}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base font-black text-white backdrop-blur-md transition-transform hover:scale-[1.01]"
                    >
                        Initialize Identity
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.28 }}
                    className="mobile-landing-features mt-6 grid grid-cols-2 gap-3"
                >
                    {features.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="mobile-landing-feature rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                        >
                            <div className="mobile-landing-feature-icon mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                                <Icon className="h-4 w-4 text-emerald-400" />
                            </div>
                            <h3 className="mobile-landing-feature-title font-black leading-tight text-white">{title}</h3>
                            <p className="mobile-landing-feature-copy mt-2 leading-4 text-gray-400">{desc}</p>
                        </div>
                    ))}
                </motion.div>
            </div>

            <div className="pointer-events-none absolute -right-8 top-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-10 left-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>
    );
};

export default MobileLandingPage;
