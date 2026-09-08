import React, { useState } from 'react';
import { Mail, Lock, Target, User, AtSign, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

// Import Assets for Production Build
import bgImage from '../../assets/dark_floating_pyramids_bg.png';
import sideImage from '../../assets/green_pyramid_login.png';

const SignUpBox = ({ onSwitch, onBack, onSuccess }) => {
    const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return setStatus({ type: 'error', message: 'Passwords do not match' });
        }

        setStatus({ type: 'loading', message: 'Syncing with Neural Network...' });

        try {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            const response = await fetch(`${apiUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();
            if (response.ok) {
                setStatus({ type: 'success', message: 'Neural Print Saved! Verification Code Sent.' });
                setTimeout(() => onSuccess(formData.email), 1500);
            } else {
                const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
                setStatus({ type: 'error', message: errorMessage });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Neural Gateway Offline' });
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="glass-card z-10 w-full max-w-5xl rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
                {/* Left Section: Visual */}
                <div className="hidden md:block flex-1 relative bg-emerald-950/20">
                    <div className="absolute inset-4 rounded-3xl overflow-hidden border border-white/5">
                        <img
                            src={sideImage}
                            alt="Decorative Pyramid"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    </div>
                </div>

                {/* Right Section: Form */}
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1 rounded-full bg-emerald-500/20">
                            <Target className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">SynapseX</h1>
                    </div>

                    <h2 className="text-xl font-medium mb-6 text-gray-300">Initiate Local Uplink</h2>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {status.message && (
                            <div className={`p-3 rounded-lg text-xs font-medium ${status.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {status.message}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Identity</label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                        <User size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        className="glass-input !py-2.5 !px-9"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Handle</label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                        <AtSign size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        className="glass-input !py-2.5 !px-9"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Neural Address</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                    <Mail size={16} />
                                </span>
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    className="glass-input !py-2.5 !px-9"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Access Key</label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                        <Lock size={16} />
                                    </span>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        className="glass-input !py-2.5 !px-9"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Verify Key</label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                        <Lock size={16} />
                                    </span>
                                    <input
                                        type="password"
                                        placeholder="Protect"
                                        className="glass-input !py-2.5 !px-9"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="signup-btn mt-4">
                            {status.type === 'loading' ? 'Encrypting...' : 'Initiate Uplink'}
                        </button>
                    </form>

                    <div className="mt-6">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-4">Or sign up with</p>
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

                    <p className="mt-6 text-center text-xs text-gray-500">
                        Already synced? <button onClick={onSwitch} className="text-gray-300 hover:text-emerald-400 font-semibold transition-colors bg-transparent border-none cursor-pointer">Reconnect Access</button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default SignUpBox;
