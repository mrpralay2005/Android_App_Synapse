import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';

const PasswordGate = ({ conversationTitle, onSubmit, onClose, busy, error }) => {
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const submit = (e) => {
        e?.preventDefault();
        if (!busy && password) onSubmit(password);
    };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/25 bg-[#0c0c0c]">
                <div className="flex flex-col items-center px-6 pb-2 pt-7 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                        <Lock size={24} />
                    </span>
                    <h3 className="mt-4 text-sm font-black uppercase tracking-widest text-white">Locked chat</h3>
                    <p className="mt-1 text-[12px] leading-snug text-gray-400">
                        {conversationTitle ? (<>Enter the password for <span className="font-bold text-gray-200">{conversationTitle}</span></>) : 'Enter the password to open this chat'}
                    </p>
                </div>
                <form onSubmit={submit} className="px-6 pb-6 pt-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-amber-400/50">
                        <KeyRound size={15} className="shrink-0 text-gray-500" />
                        <input autoFocus type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Chat password" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-gray-600" />
                        <button type="button" onClick={() => setShow((v) => !v)} aria-label="Toggle password visibility" className="text-gray-500 hover:text-white">
                            {show ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {error && <p className="mt-2 text-center text-[11px] text-red-400">{error}</p>}
                    <button type="submit" disabled={busy || !password}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 text-[13px] font-black text-black transition-all hover:bg-amber-300 disabled:opacity-40">
                        <ShieldCheck size={15} /> {busy ? 'Unlocking...' : 'Unlock chat'}
                    </button>
                    <button type="button" onClick={onClose} className="mt-2 w-full rounded-2xl py-2 text-[12px] font-bold text-gray-500 hover:text-white">
                        Cancel
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default PasswordGate;