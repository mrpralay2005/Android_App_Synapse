import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, ShieldCheck, Eye, EyeOff, Trash2 } from 'lucide-react';
import { LockBadge } from './ChatBits';

const LockManagerModal = ({ locked, onClose, onSetPassword, onRemoveLock, busy, error }) => {
    const [mode, setMode] = useState(locked ? 'change' : 'set');
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const submit = (e) => {
        e?.preventDefault();
        if (busy) return;
        if (mode === 'remove') onRemoveLock(currentPassword);
        else onSetPassword({ password, currentPassword: locked ? currentPassword : undefined });
    };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
                onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                    <div className="min-w-0 flex-1">
                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                            Chat lock {locked && <LockBadge />}
                        </h3>
                        <p className="text-[11px] text-gray-500">Both people use the same password</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                <div className="flex gap-1.5 px-5 pt-4">
                    {[['set', locked ? 'Change' : 'Set lock'], ['remove', 'Remove']].map(([id, label]) => (
                        <button key={id} onClick={() => setMode(id)}
                            className={`flex-1 rounded-full py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${mode === id ? 'bg-amber-400 text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <form onSubmit={submit} className="space-y-2.5 px-5 py-4">
                    {mode !== 'set' || locked ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                            <Lock size={15} className="shrink-0 text-gray-500" />
                            <input type={show ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Current chat password" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-gray-600" />
                        </div>
                    ) : null}
                    {mode !== 'remove' && (
                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-amber-400/50">
                            <ShieldCheck size={15} className="shrink-0 text-gray-500" />
                            <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                placeholder={locked ? 'New chat password (min 4)' : 'Chat password (min 4)'}
                                className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-gray-600" />
                            <button type="button" onClick={() => setShow((v) => !v)} aria-label="Toggle password visibility" className="text-gray-500 hover:text-white">
                                {show ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    )}
                    {error && <p className="text-center text-[11px] text-red-400">{error}</p>}
                    <button type="submit" disabled={busy}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-black transition-all disabled:opacity-40 ${mode === 'remove' ? 'bg-red-500/90 text-white hover:bg-red-500' : 'bg-amber-400 text-black hover:bg-amber-300'}`}>
                        {mode === 'remove' ? <Trash2 size={15} /> : <ShieldCheck size={15} />}
                        {busy ? 'Saving...' : mode === 'remove' ? 'Remove lock' : locked ? 'Change password' : 'Lock this chat'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default LockManagerModal;