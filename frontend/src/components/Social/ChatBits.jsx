import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, Lock, Plus, X, ShieldCheck, ChevronLeft, Send, Trash2, KeyRound, Eye, EyeOff } from 'lucide-react';

const getInitials = (user) => {
    const name = user?.name || user?.username || '?';
    return name.trim().charAt(0).toUpperCase();
};

const formatClock = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDay = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    if (sameDay) return formatClock(value);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatAvatar = ({ user, size = 44, ring = false }) => {
    const dimension = { width: size, height: size };
    const inner = user?.profileImage ? (
        <img
            src={user.profileImage}
            alt={user?.username || 'user'}
            className="h-full w-full rounded-full object-cover"
            style={dimension}
        />
    ) : (
        <div
            className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/70 to-cyan-600/70 text-sm font-black text-black"
            style={dimension}
        >
            {getInitials(user)}
        </div>
    );

    if (!ring) return <div className="shrink-0 overflow-hidden rounded-full border border-white/10" style={dimension}>{inner}</div>;

    return (
        <div className="shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-fuchsia-500 to-purple-600 p-[2px]" style={dimension}>
            <div className="h-full w-full overflow-hidden rounded-full border-2 border-black">
                {user?.profileImage ? (
                    <img src={user.profileImage} alt={user?.username || 'user'} className="h-full w-full rounded-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/70 to-cyan-600/70 text-sm font-black text-black">
                        {getInitials(user)}
                    </div>
                )}
            </div>
        </div>
    );
};

export const LockBadge = ({ className = '' }) => (
    <span className={`inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300 ${className}`}>
        <Lock size={10} /> Locked
    </span>
);

export { Search, MessageCircle, Lock, Plus, X, ShieldCheck, ChevronLeft, Send, Trash2, KeyRound, Eye, EyeOff, formatClock, formatDay, getInitials };

const ChatBits = null;
export default ChatBits;
