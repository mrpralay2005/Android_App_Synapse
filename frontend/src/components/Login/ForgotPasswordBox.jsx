import React, { useState, useRef, useEffect } from 'react';
import { Mail, Shield, ArrowLeft, KeyRound, RefreshCw, CheckCircle2, UserCircle, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import Assets
import bgImage from '../../assets/dark_floating_pyramids_bg.png';
import sideImage from '../../assets/green_pyramid_login.png';

const ForgotPasswordBox = ({ onBack, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: Account Found, 3: Reset Form
    const [email, setEmail] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [otp, setOtp] = useState(['', '', '', '']);
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [status, setStatus] = useState({ type: '', message: '' });
    const otpRefs = [useRef(), useRef(), useRef(), useRef()];

    const handleFindAccount = async (e) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Searching Neural Database...' });

        try {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (response.ok) {
                setFoundUser(data.user);
                setStatus({ type: '', message: '' });
                setStep(2);
            } else {
                setStatus({ type: 'error', message: data.error });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection to Security Core failed' });
        }
    };

    const handleInitiateRecovery = () => {
        // OTP already sent by the forgot-password endpoint
        setStep(3);
        setStatus({ type: 'success', message: 'Access Code transmitted to your email' });
    };

    const handleOTPChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 3) otpRefs[index + 1].current.focus();
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            return setStatus({ type: 'error', message: 'Key mismatch: Passwords must match' });
        }
        if (otp.join('').length < 4) {
            return setStatus({ type: 'error', message: 'Complete the 4-digit verification code' });
        }

        setStatus({ type: 'loading', message: 'Recalibrating Neural Key...' });

        try {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    otp: otp.join(''),
                    newPassword: passwords.new
                })
            });

            const data = await response.json();
            if (response.ok) {
                setStatus({ type: 'success', message: 'Neural Key updated! Redirecting...' });
                setTimeout(() => onSuccess(), 2000);
            } else {
                setStatus({ type: 'error', message: data.error });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Recalibration interrupted' });
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <img src={bgImage} alt="background" className="w-full h-full object-cover" />
            </div>

            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onBack}
                className="absolute top-8 left-8 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all group backdrop-blur-md"
            >
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card z-10 w-full max-w-5xl rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
                <div className="hidden md:block flex-1 relative bg-emerald-950/20">
                    <div className="absolute inset-4 rounded-3xl overflow-hidden border border-white/5">
                        <img src={sideImage} alt="Decorative Pyramid" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    </div>
                </div>

                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative bg-black/40 backdrop-blur-xl">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="p-2 rounded-xl bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <KeyRound className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white leading-none">Access Recovery</h1>
                            <p className="text-[10px] text-emerald-500/60 uppercase tracking-[0.2em] mt-1 font-bold">Security Override Mode</p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {status.message && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 mb-6 ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}
                            >
                                {status.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin" />}
                                {status.message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {step === 1 && (
                        <motion.form
                            key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onSubmit={handleFindAccount} className="space-y-6"
                        >
                            <div>
                                <h2 className="text-lg font-medium text-white mb-2">Locate Neural Node</h2>
                                <p className="text-sm text-gray-500 mb-6">Enter the email address associated with your identity to initiate recovery.</p>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                                        <Mail size={18} />
                                    </span>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        className="glass-input !pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-xl transition-all shadow-lg uppercase tracking-widest text-sm">
                                Find Account
                            </button>
                        </motion.form>
                    )}

                    {step === 2 && foundUser && (
                        <motion.div
                            key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h2 className="text-lg font-medium text-white mb-6 text-center">Identity Found</h2>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center gap-4 group hover:border-emerald-500/30 transition-all cursor-pointer" onClick={handleInitiateRecovery}>
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center p-1 border border-emerald-500/20 overflow-hidden">
                                        {foundUser.image ? (
                                            <img src={foundUser.image} alt="User" className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <UserCircle size={40} className="text-emerald-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold">{foundUser.name}</h3>
                                        <p className="text-xs text-gray-500 tracking-tight">@{foundUser.username}</p>
                                        <p className="text-[10px] text-emerald-400 mt-1 uppercase font-bold tracking-[0.1em]">Verified Entity</p>
                                    </div>
                                    <button className="p-2 rounded-full bg-emerald-500 text-black shadow-lg">
                                        <CheckCircle2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 uppercase text-center tracking-widest">Click account to send recovery code</p>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.form
                            key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            onSubmit={handleReset} className="space-y-6"
                        >
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] block ml-1 text-center">Neural Verification Code</label>
                                <div className="flex justify-center gap-3">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={otpRefs[index]}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOTPChange(index, e.target.value)}
                                            className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 transition-all"
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase tracking-widest ml-1">New Access Key</label>
                                    <input
                                        type="password"
                                        placeholder="Min 8 characters"
                                        className="glass-input"
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase tracking-widest ml-1">Verify Key</label>
                                    <input
                                        type="password"
                                        placeholder="Confirm new key"
                                        className="glass-input"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-xl transition-all shadow-lg uppercase tracking-widest text-sm mt-4">
                                Recalibrate Access
                            </button>
                        </motion.form>
                    )}

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <button onClick={onBack} className="text-xs text-gray-500 hover:text-white transition-colors">
                            Return to Secure Login
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPasswordBox;
