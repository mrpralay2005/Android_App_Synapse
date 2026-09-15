import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { ChatAvatar } from './ChatBits';

const NewChatModal = ({ users, initialQuery, onQueryChange, onPickUser, onClose, starting, startError }) => {
    const [lockEnabled, setLockEnabled] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const pick = (user) => {
        if (!starting) onPickUser(user, lockEnabled ? password : undefined);
    };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">New message</h3>
                        <p className="text-[11px] text-gray-500">Chat with anyone on SynapseX</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                <div className="border-b border-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5">
                        <Search size={15} className="shrink-0 text-gray-500" />
                        <input autoFocus value={initialQuery} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search people..."
                            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-gray-600" />
                    </div>
                    <button onClick={() => setLockEnabled((v) => !v)}
                        className={`mt-2.5 flex w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${lockEnabled ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${lockEnabled ? 'bg-amber-400/20 text-amber-300' : 'bg-white/5 text-gray-400'}`}>
                            <Lock size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-bold text-white">Password-protect this chat</span>
                            <span className="block text-[11px] leading-snug text-gray-500">We will ask for it before showing messages</span>
                        </span>
                        <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${lockEnabled ? 'bg-amber-400' : 'bg-white/15'}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${lockEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                        </span>
                    </button>
// (cleaned up: interleaved blocks removed)
                    {lockEnabled && (
                        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-black/40 px-3.5 py-2.5">
                            <ShieldCheck size={15} className="shrink-0 text-amber-300" />
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                placeholder="Set a chat password (min 4)"
                                className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-gray-600" />
                            <button onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility" className="text-gray-500 hover:text-white">
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    )}
                </div>
                <div className="hide-scrollbar max-h-[46vh] flex-1 overflow-y-auto px-2 py-2">
                    {users.length === 0 && (
                        <p className="px-4 py-8 text-center text-[12px] text-gray-500">
                            No people found. Try another name or username.
                        </p>
                    )}
                    {users.map((user) => (
                        <button key={user.id} onClick={() => pick(user)} disabled={starting}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-50">
                            <ChatAvatar user={user} size={44} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-bold text-white">{user.username}</span>
                                <span className="block truncate text-[11px] text-gray-500">{user.name || 'SynapseX explorer'}</span>
                            </span>
                            <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-black">
                                {starting ? '...' : 'Chat'}
                            </span>
                        </button>
                    ))}
                </div>
                {startError && (
                    <p className="border-t border-white/5 px-5 py-2.5 text-center text-[11px] text-red-400">{startError}</p>
                )}
            </motion.div>
        </motion.div>
    );
};

export default NewChatModal;
