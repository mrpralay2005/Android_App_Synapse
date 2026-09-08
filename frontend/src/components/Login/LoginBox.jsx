import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Target, ArrowLeft, AtSign } from 'lucide-react';
import { motion } from 'framer-motion';

// Import Assets for Production Build
import bgImage from '../../assets/dark_floating_pyramids_bg.png';
import sideImage from '../../assets/green_pyramid_login.png';

const LoginBox = ({ onSwitch, onBack, onLoginSuccess, onForgot }) => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [status, setStatus] = useState({ type: '', message: '' });

    // AI Behavioral Tracking Refs
    const keystrokeData = useRef([]);
    const mouseData = useRef([]);
    const lastMouseMove = useRef(Date.now());

    useEffect(() => {
        const handleKeyDown = (e) => {
            keystrokeData.current.push({
                key: e.key,
                time: Date.now(),
                type: 'keydown'
            });
            if (keystrokeData.current.length > 100) keystrokeData.current.shift();
        };

        const handleMouseMove = (e) => {
            const now = Date.now();
            if (now - lastMouseMove.current > 50) {
                mouseData.current.push({
                    x: e.clientX,
                    y: e.clientY,
                    time: now
                });
                lastMouseMove.current = now;
                if (mouseData.current.length > 100) mouseData.current.shift();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Analyzing Neural Patterns...' });

        try {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    behaviorData: {
                        key_strokes: keystrokeData.current,
                        mouse_movements: mouseData.current
                    }
                })
            });

            const data = await response.json();
            if (response.ok) {
                setStatus({ type: 'success', message: 'Identity Confirmed. Accessing Synapse...' });
                setTimeout(() => onLoginSuccess(data), 1500);
            } else {
                const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
                setStatus({ type: 'error', message: errorMessage });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection to AI Hub failed' });
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
            {/* Background Floating Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <img
                    src={bgImage}
                    alt="background"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Global Back Button */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onBack}
                className="absolute top-8 left-8 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all group backdrop-blur-md"
                title="Back to Landing Page"
            >
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="glass-card z-10 w-full max-w-5xl rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
                {/* Left Section: Form */}
                <div className="flex-1 p-8 md:p-14 flex flex-col justify-center relative">
                    <div className="flex items-center gap-2 mb-10">
                        <div className="p-1 rounded-full bg-emerald-500/20">
                            <Target className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tighter text-white">SynapseX</h1>
                    </div>

                    <h2 className="text-xl font-medium mb-8 text-gray-300">Neural Connect</h2>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {status.message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-3 rounded-lg text-xs font-medium text-center ${status.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}
                            >
                                {status.message}
                            </motion.div>
                        )}
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Neural Handle</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                    <AtSign size={18} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Username / Handle"
                                    className="glass-input"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Neural Key</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    placeholder="Password Key"
                                    className="glass-input"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end p-1">
                            <button
                                type="button"
                                onClick={onForgot}
                                className="text-[10px] text-gray-500 hover:text-emerald-400 uppercase tracking-widest font-bold transition-all"
                            >
                                [ Forgot Password? ]
                            </button>
                        </div>

                        <button type="submit" className="login-btn mt-2">
                            {status.type === 'loading' ? 'Analyzing...' : 'Secure Access'}
                        </button>
                    </form>

                    <div className="mt-10">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-4">Choose your preferred method to continue</p>
                        <div className="grid grid-cols-3 gap-3">
                            <button className="social-btn group">
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4 opacity-70 group-hover:opacity-100" alt="google" />
                                <span className="text-[10px] font-bold">Google</span>
                            </button>
                            <button className="social-btn group">
                                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-4 h-4 opacity-70 group-hover:opacity-100" alt="facebook" />
                                <span className="text-[10px] font-bold">Facebook</span>
                            </button>
                            <button className="social-btn group">
                                <img src="https://www.svgrepo.com/show/448239/microsoft.svg" className="w-4 h-4 opacity-70 group-hover:opacity-100" alt="microsoft" />
                                <span className="text-[10px] font-bold">Microsoft</span>
                            </button>
                        </div>
                    </div>

                    <p className="mt-10 text-center text-xs text-gray-500">
                        New entity? <button onClick={onSwitch} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors bg-transparent border-none cursor-pointer">Register Identity</button>
                    </p>
                </div>

                {/* Right Section: Visual */}
                <div className="hidden md:block flex-1 relative bg-emerald-950/20">
                    <div className="absolute inset-4 rounded-3xl overflow-hidden border border-white/5 shadow-inner">
                        <img
                            src={sideImage}
                            alt="Decorative Pyramid"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                    </div>
                    <div className="absolute top-10 right-10 w-2 h-2 bg-emerald-400/50 blur-sm rounded-full animate-pulse" />
                    <div className="absolute bottom-1/4 left-10 w-1 h-1 bg-white/30 rounded-full animate-ping" />
                </div>
            </motion.div>
        </div>
    );
};

export default LoginBox;
