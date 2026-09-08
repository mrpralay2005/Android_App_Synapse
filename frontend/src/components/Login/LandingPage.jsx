import React from 'react';
import { motion } from 'framer-motion';
import { Target, Shield, Zap, Globe, X } from 'lucide-react';

// Import Assets for Production Build
import bgImage from '../../assets/dark_floating_pyramids_bg.png';

const LandingPage = ({ onLogin, onRegister, onExit }) => {
    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden bg-black text-white">
            {/* Background Image Layer */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <img
                    src={bgImage}
                    alt="background"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Global Exit Button */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onExit}
                className="absolute top-8 left-8 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all group backdrop-blur-md"
                title="Exit Neural Gateway"
            >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
            </motion.button>

            {/* Content Container */}
            <div className="z-10 max-w-6xl w-full">
                {/* Header/Logo section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex items-center gap-3 mb-12 justify-center md:justify-start"
                >
                    <div className="p-2 rounded-full bg-emerald-500/20">
                        <Target className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tighter">SynapseX</h1>
                </motion.div>

                {/* Main Hero Section */}
                <div className="flex flex-col md:flex-row items-center gap-16">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="flex-1 text-center md:text-left"
                    >
                        <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                            The World's Most <span className="text-emerald-500">Secure</span> Neural Gateway
                        </h2>
                        <p className="text-xl text-gray-400 mb-10 max-w-2xl">
                            Experience the next generation of digital identity. SynapseX uses advanced behavioral AI to protect your neural footprint across the decentralized web.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <button
                                onClick={onLogin}
                                className="px-10 py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                            >
                                Access Neural Hub
                            </button>
                            <button
                                onClick={onRegister}
                                className="px-10 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all transform hover:scale-105 backdrop-blur-md"
                            >
                                Initialize Identity
                            </button>
                        </div>
                    </motion.div>

                    {/* Feature Cards Grid */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="flex-1 grid grid-cols-2 gap-4 w-full"
                    >
                        {[
                            { icon: <Shield className="w-6 h-6 text-emerald-500" />, title: "Quantum Security", desc: "Military-grade encryption for your digital self." },
                            { icon: <Zap className="w-6 h-6 text-emerald-500" />, title: "Instant Sync", desc: "Real-time behavioral analysis and authentication." },
                            { icon: <Globe className="w-6 h-6 text-emerald-500" />, title: "Global Uplink", desc: "Access your profile from any node in the world." },
                            { icon: <div className="w-6 h-6 border-2 border-emerald-500 rounded-sm" />, title: "AI Core", desc: "Continuous learning neural protection." }
                        ].map((feature, i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                                <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="font-bold mb-2">{feature.title}</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Footer simple */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold"
                >
                    <p>© 2026 SynapseX Neural Research Lab</p>
                    <div className="flex gap-8">
                        <span className="hover:text-emerald-500 cursor-pointer transition-colors">Neural Protocols</span>
                        <span className="hover:text-emerald-500 cursor-pointer transition-colors">Privacy Core</span>
                        <span className="hover:text-emerald-500 cursor-pointer transition-colors">Sync Status: Operational</span>
                    </div>
                </motion.div>
            </div>

            {/* Subtle light effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </div>
    );
};

export default LandingPage;
