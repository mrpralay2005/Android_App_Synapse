import React, { useState, useRef, useEffect } from 'react';
import { Shield, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import Assets
import bgImage from '../../assets/dark_floating_pyramids_bg.png';
import sideImage from '../../assets/green_pyramid_login.png';

const OTPBox = ({ email, onVerified, onBack }) => {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [status, setStatus] = useState({ type: '', message: '' });
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        // Focus first box on mount
        if (inputRefs[0].current) {
            inputRefs[0].current.focus();
        }
    }, []);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 3) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const fullOtp = otp.join('');
        if (fullOtp.length < 4) {
            return setStatus({ type: 'error', message: 'Enter full verification code' });
        }

        setStatus({ type: 'loading', message: 'Decrypting Neural Code...' });

        try {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            const response = await fetch(`${apiUrl}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: fullOtp })
            });

            const data = await response.json();
            if (response.ok) {
                setStatus({ type: 'success', message: 'Neural Link Verified!' });
                setTimeout(() => onVerified(), 1500);
            } else {
                setStatus({ type: 'error', message: data.error || 'Verification Failed' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection Interrupted' });
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
            {/* Background Floating Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <img src={bgImage} alt="background" className="w-full h-full object-cover" />
            </div>

            {/* Global Back Button */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onBack}
                className="absolute top-8 left-8 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all group backdrop-blur-md"
            >
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card z-10 w-full max-w-5xl rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
                {/* Visual Section */}
                <div className="hidden md:block flex-1 relative bg-emerald-950/20">
                    <div className="absolute inset-4 rounded-3xl overflow-hidden border border-white/5">
                        <img src={sideImage} alt="Neural Interface" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    </div>
                </div>

                {/* Main Form Section */}
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative bg-black/40 backdrop-blur-xl">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="p-2 rounded-xl bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <Shield className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white leading-none">Security Core</h1>
                            <p className="text-[10px] text-emerald-500/60 uppercase tracking-[0.2em] mt-1 font-bold">Neural Verification Mode</p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-medium text-gray-200">Verify Identity</h2>
                        <p className="text-sm text-gray-500 mt-2">
                            A neural access code was transmitted to:
                            <br />
                            <span className="text-emerald-400 font-mono mt-1 block">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-8">
                        <AnimatePresence mode="wait">
                            {status.message && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        }`}
                                >
                                    {status.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    {status.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                                    {status.message}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-between gap-4">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={inputRefs[index]}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-full h-16 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-2xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <div className="space-y-4">
                            <button
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest text-sm"
                            >
                                {status.type === 'loading' ? 'Processing...' : 'Access Neural Core'}
                            </button>

                            <div className="flex justify-center flex-col items-center gap-4">
                                <button
                                    type="button"
                                    className="text-[10px] text-gray-500 hover:text-emerald-400 uppercase tracking-widest font-bold transition-colors"
                                >
                                    Resend Code
                                </button>
                                <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="text-xs text-gray-500 hover:text-white transition-colors"
                                >
                                    Change email address
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default OTPBox;
