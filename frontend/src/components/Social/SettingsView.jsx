import React, { useState, useEffect } from 'react';
import {
    User, Lock, Mail, Shield, Monitor, Zap, Download,
    Bell, Eye, Trash2, Smartphone, Globe, Palette,
    ChevronRight, Key, ShieldCheck, CreditCard, ChevronLeft,
    LogOut, AlertTriangle, CheckCircle2, X, TrendingUp,
    Activity, Clock, ShieldAlert, Cpu, EyeOff, Ghost, CheckCheck, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';

const SettingsView = ({ user, onUpdateUser, onLogout }) => {
    const [activeSection, setActiveSection] = useState('profile');
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        isPrivate: user.isPrivate || false,
        links: user.links || [],
        showActivityStatus: user.showActivityStatus ?? true,
        readReceipts: user.readReceipts ?? true,
        ghostViewer: user.ghostViewer ?? false,
        protectedStories: user.protectedStories ?? false,
    });

    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: '',
    });
    const [otpDigits, setOtpDigits] = useState(['', '', '', '']);

    const [otpSent, setOtpSent] = useState(false);
    const [emailEditOpen, setEmailEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
    const token = Cookies.get('synapse_token');

    // Vital Sync: Fetch latest user data on mount if email or isPrivate is missing
    useEffect(() => {
        const syncIdentity = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${apiUrl}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setFormData({
                        name: data.user.name || '',
                        username: data.user.username || '',
                        email: data.user.email || '',
                        bio: data.user.bio || '',
                        isPrivate: data.user.isPrivate || false,
                        links: data.user.links || []
                    });
                    onUpdateUser(data.user);
                }
            } catch (err) {
                console.error("Identity Sync Failed", err);
            }
        };
        syncIdentity();
    }, []);

    const menuItems = [
        { id: 'profile', label: 'Professional Deck', icon: <Sparkles size={20} />, description: 'Creator tools and professional signals' },
        { id: 'security', label: 'Security Core', icon: <Shield size={20} />, description: 'Passwords, OTP and Login activity' },
        { id: 'privacy', label: 'Privacy Link', icon: <Eye size={20} />, description: 'Manage account visibility and status' },
        { id: 'analytics', label: 'Neural Analytics', icon: <TrendingUp size={20} />, description: 'Track resonance and visitor frequency' },
        { id: 'advanced', label: 'Advanced Protocols', icon: <Zap size={20} />, description: 'Quantum decay and neural guardian' },
        { id: 'notifications', label: 'Notification Pulse', icon: <Bell size={20} />, description: 'Configure alerts and neural pings' },
        { id: 'interface', label: 'Neural Interface', icon: <Palette size={20} />, description: 'Customize glow levels and glass intensity' },
        { id: 'data', label: 'Archive & Synapses', icon: <Download size={20} />, description: 'Download your data or clear activity' },
        { id: 'help', label: 'System Support', icon: <Globe size={20} />, description: 'Documentation and nexus assistance' },
    ];

    const showStatus = (type, text) => {
        setStatusMsg({ type, text });
        setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    };

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                onUpdateUser(data.data);
                showStatus('success', 'Neural Identity Synchronized Successfully');
            } else {
                showStatus('error', data.error || 'Sync Failed');
            }
        } catch (err) {
            showStatus('error', 'Sync Failed: Connection Severed');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOTP = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email || user.email })
            });
            const data = await res.json();
            if (data.success) {
                setOtpSent(true);
                showStatus('success', 'OTP Transmitted to your Neural Mail');
            } else {
                showStatus('error', data.error || 'Transmission Failed');
            }
        } catch (err) {
            showStatus('error', 'Transmission Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newDigits = [...otpDigits];
        newDigits[index] = value.slice(-1);
        setOtpDigits(newDigits);

        // Auto focus next
        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').slice(0, 4);
        if (!/^\d+$/.test(data)) return;
        const newDigits = [...otpDigits];
        data.split('').forEach((char, i) => {
            if (i < 4) newDigits[i] = char;
        });
        setOtpDigits(newDigits);
        // Focus last or next available
        const targetIdx = data.length < 4 ? data.length : 3;
        document.getElementById(`otp-${targetIdx}`)?.focus();
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const combinedOtp = otpDigits.join('');
        if (combinedOtp.length < 4) {
            showStatus('error', 'Incomplete Neural Code');
            return;
        }
        if (passwordData.new !== passwordData.confirm) {
            showStatus('error', 'Neural Mismatch: Passwords do not align');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email || user.email,
                    otp: combinedOtp,
                    newPassword: passwordData.new
                })
            });
            const data = await res.json();
            if (data.success) {
                showStatus('success', 'Neural Key Recalibrated');
                setOtpSent(false);
                setOtpDigits(['', '', '', '']);
                setPasswordData({ current: '', new: '', confirm: '' });
            } else {
                showStatus('error', data.error || 'Recalibration Failed');
            }
        } catch (err) {
            showStatus('error', 'Recalibration Failed: Connection Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-48px)] mt-20 max-w-6xl mx-auto bg-black border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
            {/* Status Messages */}
            <AnimatePresence>
                {statusMsg.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`fixed top-12 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-xl border shadow-2xl ${statusMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                    >
                        {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">{statusMsg.text}</span>
                        <X size={16} className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setStatusMsg({ type: '', text: '' })} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar Navigation */}
            <div className="w-full lg:w-80 bg-white/[0.02] border-r border-white/5 p-8 flex flex-col gap-10">
                <div className="flex items-center gap-4 px-2">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                        <Monitor size={24} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold tracking-tight text-lg">Command Center</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">System Configuration</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setIsTransitioning(true);
                                setActiveSection(item.id);
                            }}
                            className={`w-full group relative flex items-center gap-4 p-5 rounded-2xl transition-all ${activeSection === item.id ? 'bg-emerald-500/10 shadow-inner' : 'hover:bg-white/5'
                                }`}
                        >
                            {activeSection === item.id && (
                                <motion.div
                                    layoutId="active-bg"
                                    className="absolute inset-0 bg-emerald-500/5 rounded-2xl border border-emerald-500/10"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <div className={`relative z-10 ${activeSection === item.id ? 'text-emerald-500' : 'text-gray-500 group-hover:text-white'}`}>
                                {item.icon}
                            </div>
                            <div className="relative z-10 text-left">
                                <p className={`text-sm font-bold transition-colors ${activeSection === item.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                    {item.label}
                                </p>
                            </div>
                        </button>
                    ))}
                </nav>

                <div className="pt-6 border-t border-white/5">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all group"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Sever Connection</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-black relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        className="p-10 md:p-16 h-full overflow-y-auto hide-scrollbar"
                        layout
                    >
                        {activeSection === 'profile' && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                                className="space-y-12"
                            >
                                <section>
                                    <div className="flex items-center justify-between mb-8">
                                        <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white tracking-tight">Professional Deck</motion.h3>
                                        <div className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Creator Mode Active</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Verification Status Card */}
                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="p-8 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                                <ShieldCheck size={48} className="text-emerald-500" />
                                            </div>
                                            <h4 className="text-white font-bold text-lg mb-2">Signal Verification</h4>
                                            <p className="text-gray-500 text-xs font-medium mb-6">Confirm your neural identity to receive the verified creator surge.</p>
                                            <button className="px-6 py-2.5 bg-indigo-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20">
                                                {user.isProfessional ? 'Verified Status Active' : 'Request Verification'}
                                            </button>
                                        </motion.div>

                                        {/* Monetization Pulse Card */}
                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="p-8 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                                <CreditCard size={48} className="text-blue-500" />
                                            </div>
                                            <h4 className="text-white font-bold text-lg mb-2">Monetization Pulse</h4>
                                            <p className="text-gray-500 text-xs font-medium mb-6">Track your earnings and digital synapse revenue streams.</p>
                                            <div className="flex items-center gap-4">
                                                <span className="text-white font-mono font-bold text-xl">$0.00</span>
                                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Awaiting Payout</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </section>

                                <motion.section variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="pt-12 border-t border-white/5">
                                    <h4 className="text-white font-bold text-lg mb-8 flex items-center gap-3">
                                        <Zap size={20} className="text-amber-500" />
                                        Advanced Creator Tools
                                    </h4>

                                    <div className="space-y-4">
                                        {[
                                            { label: 'High-Res Transmissions', desc: 'Enable 4K neural video uploads (Requires Pro)', active: true },
                                            { label: 'Anonymous Shield', desc: 'Hide viewer count on your recently broadcasted reels', active: false },
                                            { label: 'Deep Analytics Surge', desc: 'Interactive resonance maps for every post and story', active: true }
                                        ].map((tool, idx) => (
                                            <div key={idx} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                                                <div>
                                                    <h5 className="text-white font-bold text-sm mb-1">{tool.label}</h5>
                                                    <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest opacity-60">{tool.desc}</p>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${tool.active ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${tool.active ? 'right-1' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.section>

                                <motion.section variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="pt-12 border-t border-white/5">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg tracking-tight">Professional Nexus Links</h4>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Connect your external professional synapses</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <AnimatePresence>
                                            {formData.links.map((link, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="flex gap-4 group"
                                                >
                                                    <input
                                                        type="text"
                                                        value={link}
                                                        onChange={e => {
                                                            const newLinks = [...formData.links];
                                                            newLinks[idx] = e.target.value;
                                                            setFormData({ ...formData, links: newLinks });
                                                        }}
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:border-indigo-500/50 focus:bg-indigo-500/5 focus:outline-none transition-all"
                                                        placeholder="https://portfolio.nova.com"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newLinks = formData.links.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, links: newLinks });
                                                        }}
                                                        className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileActive={{ scale: 0.98 }}
                                            onClick={() => setFormData({ ...formData, links: [...formData.links, ''] })}
                                            className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:border-indigo-500/50 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2"
                                        >
                                            <X size={14} className="rotate-45" /> Add Professional Synapse
                                        </motion.button>
                                    </div>

                                    <div className="mt-12 flex justify-end">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileActive={{ scale: 0.95 }}
                                            onClick={handleUpdateProfile}
                                            disabled={loading}
                                            className="px-12 py-4 bg-white text-black font-bold text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-gray-200 transition-all shadow-xl disabled:opacity-50"
                                        >
                                            {loading ? 'Propagating Changes...' : 'Save Creator Settings'}
                                        </motion.button>
                                    </div>
                                </motion.section>
                            </motion.div>
                        )}

                        {activeSection === 'security' && (
                            <div className="relative min-h-[500px]">
                                <AnimatePresence mode="wait">
                                    {(!emailEditOpen && !otpSent) ? (
                                        <motion.div
                                            key="security-overview"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="space-y-12"
                                        >
                                            <section>
                                                <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">Security Core</h3>
                                                <div className="space-y-6">
                                                    {/* Password Section */}
                                                    <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 group hover:bg-white/[0.07] hover:border-emerald-500/30 transition-all duration-500">
                                                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                                            <Key size={30} />
                                                        </div>
                                                        <div className="flex-1 text-center md:text-left">
                                                            <h4 className="text-white font-bold text-lg mb-1 tracking-tight">Update Neural Key</h4>
                                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Reset your encrypted login credentials</p>
                                                        </div>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileActive={{ scale: 0.95 }}
                                                            onClick={handleRequestOTP}
                                                            disabled={loading}
                                                            className="px-8 py-3 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-gray-200 transition-all shadow-xl shadow-white/5 disabled:opacity-50"
                                                        >
                                                            {loading ? 'Initializing...' : 'Initialize Reset'}
                                                        </motion.button>
                                                    </div>

                                                    {/* Email Re-Link Card */}
                                                    <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 group hover:bg-white/[0.07] hover:border-blue-500/30 transition-all duration-500">
                                                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                                            <Mail size={30} />
                                                        </div>
                                                        <div className="flex-1 text-center md:text-left">
                                                            <h4 className="text-white font-bold text-lg mb-1 tracking-tight">Email Re-Link</h4>
                                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Update your core communication synapse</p>
                                                        </div>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileActive={{ scale: 0.95 }}
                                                            onClick={() => setEmailEditOpen(true)}
                                                            className="px-8 py-3 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
                                                        >
                                                            Modify Link
                                                        </motion.button>
                                                    </div>

                                                    {/* Active Terminals Card */}
                                                    <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
                                                        <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-3">
                                                            <Smartphone size={20} className="text-emerald-500" />
                                                            Active Terminals
                                                        </h4>
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <div>
                                                                        <p className="text-white text-sm font-bold">This Web Browser (Nova Prime)</p>
                                                                        <p className="text-gray-500 text-[10px] tracking-wider font-bold">CURRENT SESSION • EARTH SECTOR 7G</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </motion.div>
                                    ) : otpSent ? (
                                        <motion.div
                                            key="password-reset"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center gap-6 mb-8">
                                                <button
                                                    onClick={() => setOtpSent(false)}
                                                    className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all group"
                                                >
                                                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                                                </button>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-white tracking-tight">Neural Key Calibration</h3>
                                                    <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mt-1">Status: Identity Verification in progress</p>
                                                </div>
                                            </div>

                                            <form onSubmit={handleResetPassword} className="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-10">
                                                <div className="grid grid-cols-1 gap-10">
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] ml-2">Neural Access Code</label>
                                                        <div className="flex gap-4 max-w-sm">
                                                            {otpDigits.map((digit, idx) => (
                                                                <input
                                                                    key={idx}
                                                                    id={`otp-${idx}`}
                                                                    type="text"
                                                                    maxLength={1}
                                                                    autoComplete="one-time-code"
                                                                    inputMode="numeric"
                                                                    value={digit}
                                                                    onPaste={handleOtpPaste}
                                                                    onChange={e => handleOtpChange(idx, e.target.value)}
                                                                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                                                                    className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl text-center text-2xl font-bold text-emerald-500 focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all placeholder:text-gray-800"
                                                                    placeholder="•"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] ml-2">New Neural Key</label>
                                                            <input
                                                                type="password"
                                                                value={passwordData.new}
                                                                onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-lg focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all placeholder:text-gray-800"
                                                                placeholder="••••••••"
                                                            />
                                                        </div>
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] ml-2">Confirm Key</label>
                                                            <input
                                                                type="password"
                                                                value={passwordData.confirm}
                                                                onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-lg focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all placeholder:text-gray-800"
                                                                placeholder="••••••••"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <motion.button
                                                    whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(16, 185, 129, 0.15)' }}
                                                    whileActive={{ scale: 0.99 }}
                                                    disabled={loading}
                                                    type="submit"
                                                    className="w-full py-6 bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-[0.4em] rounded-3xl shadow-2xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
                                                >
                                                    {loading ? 'Recalibrating Neural Matrix...' : 'Commit Neural Key Update'}
                                                </motion.button>
                                            </form>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="email-migration"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center gap-6 mb-8">
                                                <button
                                                    onClick={() => setEmailEditOpen(false)}
                                                    className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all group"
                                                >
                                                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                                                </button>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-white tracking-tight">Email Migration</h3>
                                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Status: Ready for initialization</p>
                                                </div>
                                            </div>

                                            <div className="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-10">
                                                <div className="flex items-center gap-6 p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                                                    <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                                                        <ShieldAlert size={28} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className="text-white font-bold text-sm mb-1">Security Authentication Required</h5>
                                                        <p className="text-gray-500 text-xs leading-relaxed">System will send a verification link to your new synapse address to confirm neural ownership.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-8">
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] ml-2">Enter New Neural Email</label>
                                                        <input
                                                            type="email"
                                                            className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 px-8 text-white text-lg focus:border-blue-500/50 focus:bg-blue-500/5 outline-none transition-all placeholder:text-gray-800"
                                                            placeholder="new-synapse@nova.com"
                                                        />
                                                    </div>

                                                    <motion.button
                                                        whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(59, 130, 246, 0.15)' }}
                                                        whileActive={{ scale: 0.98 }}
                                                        className="w-full py-6 bg-blue-500 text-black font-bold text-[10px] uppercase tracking-[0.4em] rounded-3xl shadow-2xl shadow-blue-500/20 hover:bg-blue-400 transition-all"
                                                    >
                                                        Initialize Verification Synapse
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {activeSection === 'privacy' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Privacy Logic</motion.h3>
                                    <div className="space-y-6">
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                                    <Lock size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-lg mb-1 tracking-tight">Stealth Shield</h4>
                                                    <p className="text-gray-500 text-xs font-medium max-w-sm">When active, only approved links can view your synapses and reels.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const newStatus = !formData.isPrivate;
                                                    setFormData(prev => ({ ...prev, isPrivate: newStatus }));
                                                    try {
                                                        const res = await fetch(`${apiUrl}/api/user/update`, {
                                                            method: 'PUT',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${token}`
                                                            },
                                                            body: JSON.stringify({ ...formData, isPrivate: newStatus })
                                                        });
                                                        const data = await res.json();
                                                        if (data.success) {
                                                            onUpdateUser(data.data);
                                                            showStatus('success', `Stealth Shield ${newStatus ? 'Activated' : 'Liquidated'}`);
                                                        }
                                                    } catch (err) {
                                                        showStatus('error', 'Shield Sync Failed');
                                                    }
                                                }}
                                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${formData.isPrivate ? 'bg-emerald-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.isPrivate ? 26 : 4 }}
                                                    className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-lg"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Activity Status */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                                    <Activity size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-lg mb-1 tracking-tight">Neural Presence</h4>
                                                    <p className="text-gray-500 text-xs font-medium max-w-sm">Allow others to see when you are active in the synapse.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, showActivityStatus: !prev.showActivityStatus }))}
                                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${formData.showActivityStatus ? 'bg-blue-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.showActivityStatus ? 26 : 4 }}
                                                    className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-lg"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Read Receipts */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                                    <CheckCheck size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-lg mb-1 tracking-tight">Transmission Feedback</h4>
                                                    <p className="text-gray-500 text-xs font-medium max-w-sm">Let others know when you have viewed their transmissions.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, readReceipts: !prev.readReceipts }))}
                                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${formData.readReceipts ? 'bg-purple-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.readReceipts ? 26 : 4 }}
                                                    className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-lg"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Ghost Viewer */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-gray-500/20 rounded-xl flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                                                    <Ghost size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-lg mb-1 tracking-tight">Wraith Mode</h4>
                                                    <p className="text-gray-500 text-xs font-medium max-w-sm">View stories anonymously. Your footprint remains invisible.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, ghostViewer: !prev.ghostViewer }))}
                                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${formData.ghostViewer ? 'bg-gray-400' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.ghostViewer ? 26 : 4 }}
                                                    className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-lg"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Protected Story */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                                    <ShieldCheck size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-lg mb-1 tracking-tight">Neural Vault</h4>
                                                    <p className="text-gray-500 text-xs font-medium max-w-sm">Enable password-protected stories and selective neural access.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, protectedStories: !prev.protectedStories }))}
                                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${formData.protectedStories ? 'bg-amber-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.protectedStories ? 26 : 4 }}
                                                    className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-lg"
                                                />
                                            </button>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'analytics' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Neural Analytics</motion.h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                        {[
                                            { label: 'Profile Resonance', value: '4.8k', trend: '+12%', icon: <TrendingUp className="text-emerald-500" /> },
                                            { label: 'Memory Retention', value: '92%', trend: '+5%', icon: <Activity className="text-blue-500" /> },
                                            { label: 'Active Synapses', value: '1.2k', trend: '+24%', icon: <Zap className="text-amber-500" /> }
                                        ].map((stat, i) => (stat &&
                                            <motion.div key={stat.label} variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                                                    {stat.icon}
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{stat.label}</p>
                                                <h4 className="text-3xl font-bold text-white mb-2">{stat.value}</h4>
                                                <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">{stat.trend} Overlap</p>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="p-8 bg-emerald-500 text-black rounded-[2.5rem] flex items-center justify-between shadow-xl shadow-emerald-500/20">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center">
                                                    <Eye size={28} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xl mb-1 tracking-tight">Real-Time Trace Notification</h4>
                                                    <p className="text-black/60 text-xs font-bold uppercase tracking-widest">Receive a neural ping when someone visits your terminal</p>
                                                </div>
                                            </div>
                                            <div className="w-16 h-9 bg-black rounded-full relative shadow-inner cursor-pointer group">
                                                <div className="w-7 h-7 bg-emerald-500 rounded-full absolute top-1 right-1 shadow-md group-hover:scale-110 transition-transform" />
                                            </div>
                                        </motion.div>

                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-500">
                                                    <Clock size={28} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-xl mb-1 tracking-tight">Visit Frequency Map</h4>
                                                    <p className="text-gray-500 text-xs font-medium">Track which links are most resonant with your profile.</p>
                                                </div>
                                            </div>
                                            <div className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active Tracking</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'advanced' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Advanced Protocols</motion.h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] group hover:border-blue-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-8 group-hover:rotate-12 transition-transform shadow-xl shadow-blue-500/10">
                                                <Cpu size={32} />
                                            </div>
                                            <h4 className="text-white font-bold text-2xl mb-3 tracking-tight">Quantum Decay</h4>
                                            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-10">Automatically degrade data quality (blur/noise) over time until permanent liquidation. The ultimate digital ephemerality.</p>
                                            <div className="space-y-6">
                                                <div className="h-2 bg-white/5 rounded-full relative">
                                                    <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-blue-500 rounded-full" />
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                    <span>Decay: Low</span>
                                                    <span>30 Days Lifespan</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 transition-transform shadow-xl shadow-emerald-500/10">
                                                <ShieldAlert size={32} />
                                            </div>
                                            <h4 className="text-white font-bold text-2xl mb-3 tracking-tight">Neural Guardian</h4>
                                            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-10">Intelligent AI that shields your profile based on detected IP sensitivity or location-based data surges.</p>
                                            <button className="w-full py-5 bg-white text-black text-[11px] font-bold uppercase tracking-[0.3em] rounded-2xl hover:bg-gray-200 transition-all shadow-xl">Engage Shield</button>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'interface' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Neural Interface Saturation</motion.h3>
                                    <div className="space-y-12">
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="space-y-6">
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Glow Intensity</label>
                                                <span className="text-emerald-500 font-bold text-xs uppercase tracking-widest">85% High Voltage</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full relative group cursor-pointer">
                                                <div className="absolute left-0 top-0 bottom-0 w-[85%] bg-emerald-500 shadow-[0_0_20px_#10b981] rounded-full group-hover:bg-emerald-400 transition-all" />
                                                <motion.div whileHover={{ scale: 1.2 }} className="absolute left-[85%] top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-emerald-500 z-10" />
                                            </div>
                                        </motion.div>

                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="grid grid-cols-3 gap-6">
                                            {[
                                                { name: 'Emerald Core', color: 'bg-emerald-500' },
                                                { name: 'Sapphire Flux', color: 'bg-blue-500' },
                                                { name: 'Solar Flare', color: 'bg-orange-500' }
                                            ].map((theme, i) => (
                                                <motion.div
                                                    key={theme.name}
                                                    whileHover={{ y: -5, scale: 1.02 }}
                                                    className={`p-5 rounded-[2rem] border transition-all cursor-pointer ${i === 0 ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
                                                >
                                                    <div className={`w-full h-24 rounded-2xl mb-4 ${theme.color} opacity-20 shadow-inner`} />
                                                    <p className="text-[10px] font-bold text-center uppercase tracking-widest text-white">{theme.name}</p>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'notifications' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Notification Pulse</motion.h3>

                                    <div className="space-y-6">
                                        {/* AI Security Alert: Failed Logins */}
                                        <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} className="p-8 bg-red-500/5 border border-red-500/20 rounded-[2.5rem] relative overflow-hidden group hover:bg-red-500/10 transition-all">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-start gap-8">
                                                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                                                    <ShieldAlert size={32} className="animate-pulse" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-[0.3em]">AI Security Threat</span>
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">2 MINS AGO</span>
                                                    </div>
                                                    <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Brute Force Detected</h4>
                                                    <p className="text-gray-500 text-sm leading-relaxed mb-4">AI neural scan detected 4 failed login attempts synchronized from IP: 192.168.0.XX (Sector 7G). Immediate security protocol recommended.</p>
                                                    <div className="flex gap-4">
                                                        <button className="px-6 py-2 bg-red-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-400 transition-all">Lock Synapse</button>
                                                        <button className="px-6 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">Dismiss Trace</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* AI Security Alert: Suspicious Device */}
                                        <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-[2.5rem] relative overflow-hidden group hover:bg-amber-500/10 transition-all">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-start gap-8">
                                                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                                    <Monitor size={32} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.3em]">AI Resonance Alert</span>
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">1 HOUR AGO</span>
                                                    </div>
                                                    <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Unknown Terminal Link</h4>
                                                    <p className="text-gray-500 text-sm leading-relaxed">Suspicious terminal link initiated from unknown sector (Chrome on Linux-X86). AI has quarantined the session until verification.</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Developer Pulse: Patch Notes */}
                                        <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] relative overflow-hidden group hover:bg-emerald-500/10 transition-all">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-start gap-8">
                                                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0">
                                                    <Cpu size={32} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.3em]">Developer Pulse</span>
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">SYSTEM RECENT</span>
                                                    </div>
                                                    <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Neural Engine Patch 2.4.1</h4>
                                                    <p className="text-gray-500 text-sm leading-relaxed mb-4">Quantum decay logic optimized for better digital ephemerality across all synapses. Privacy Link protocols hardened.</p>
                                                    <button className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2 group/btn">
                                                        Read Full Patch Manifest
                                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'data' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Data & Archive Protocols</motion.h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-500/10 transition-all" />
                                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                                <Download size={26} />
                                            </div>
                                            <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Export Neural Map</h4>
                                            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-8">Packages your synapses, stories and reels into active encryption.</p>
                                            <button className="w-full py-4 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-400 transition-all shadow-lg active:scale-95">Prepare Archive</button>
                                        </motion.div>

                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:border-red-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-all" />
                                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                                <Trash2 size={26} />
                                            </div>
                                            <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Execute Activity Wipe</h4>
                                            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-8">Clears all temporary data pulses and your viewing history.</p>
                                            <button className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500/20 transition-all active:scale-95">Purge Session</button>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'help' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">System Support</motion.h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { title: 'Neural Docs', desc: 'Complete manual for Synapse functions.' },
                                            { title: 'Nexus Support', desc: 'Direct link to terminal assistance.' },
                                            { title: 'Legal Nodes', desc: 'Privacy and data processing terms.' },
                                            { title: 'Patch Notes', desc: 'Recent neural interface updates.' }
                                        ].map((item, i) => (
                                            <motion.div key={i} variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group">
                                                <div>
                                                    <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                                                    <p className="text-gray-500 text-[10px] font-medium">{item.desc}</p>
                                                </div>
                                                <ChevronRight size={16} className="text-gray-600 group-hover:text-emerald-500 transition-colors" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            </motion.div>
                        )}

                    </motion.div>
                </AnimatePresence>
            </div>
        </div >
    );
};

export default SettingsView;
