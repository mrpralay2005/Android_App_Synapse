import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Bell, CheckCheck, Heart, Image as ImageIcon, ShieldCheck, X, Eye, UserPlus, Check, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';

const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
const readKey = 'synapse_read_notification_ids';
const LIVE_REFRESH_MS = 30000;

const fetchWithRetry = async (url, options = {}, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
        const res = await fetch(url, options);
        if (res.status < 500 || i === retries) return res;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
};

const relativeTime = (date) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
};

const fullTime = (date) => new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(date));

const getReadIds = () => new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));

const iconFor = (type) => {
    if (type === 'SECURITY') return <ShieldCheck size={17} />;
    if (type === 'STORY') return <ImageIcon size={17} />;
    if (type === 'PROFILE_VISIT') return <Eye size={17} />;
    if (type === 'FOLLOW_REQUEST') return <UserPlus size={17} />;
    return <Heart size={17} />;
};

const colorFor = (type) => {
    if (type === 'SECURITY') return 'bg-blue-400/10 text-blue-300';
    if (type === 'PROFILE_VISIT') return 'bg-purple-400/10 text-purple-300';
    if (type === 'FOLLOW_REQUEST') return 'bg-amber-400/10 text-amber-300';
    return 'bg-emerald-400/10 text-emerald-300';
};

const expandedCopyFor = (type) => {
    if (type === 'SECURITY') return 'This sign-in record belongs only to your account. Review it if you do not recognise the device.';
    if (type === 'PROFILE_VISIT') return 'Someone visited your profile. Their visit has been recorded in your Neural Analytics.';
    if (type === 'STORY') return 'This person shared a new story. It will be available for the next 24 hours.';
    if (type === 'FOLLOW_REQUEST') return 'Accept to let them follow you and see your posts.';
    return 'This person shared a new post. Tap their profile to see it.';
};

const NotificationCenter = ({ open, onClose }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [clearState, setClearState] = useState('idle');
    const [requestActions, setRequestActions] = useState({}); // { [itemId]: 'accepting' | 'rejecting' | 'accepted' | 'rejected' }
    const clearingRef = useRef(false);
    const loadRequestId = useRef(0);
    const failCount = useRef(0);

    const load = async () => {
        const requestId = ++loadRequestId.current;
        try {
            const token = Cookies.get('synapse_token');
            const response = await fetchWithRetry(`${apiUrl}/api/social/notifications`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            const data = await response.json();
            if (data.success && !clearingRef.current && requestId === loadRequestId.current) {
                setItems(data.data);
                failCount.current = 0;
            }
        } catch {
            failCount.current += 1;
        } finally { setLoading(false); }
    };

    useEffect(() => { if (open) load(); }, [open]);
    useEffect(() => {
        const poll = window.setInterval(load, LIVE_REFRESH_MS);
        return () => window.clearInterval(poll);
    }, []);

    const handleFollowRequest = useCallback(async (item, action) => {
        const actionKey = item.id;
        setRequestActions(prev => ({ ...prev, [actionKey]: action === 'accept' ? 'accepting' : 'rejecting' }));
        try {
            const token = Cookies.get('synapse_token');
            const res = await fetch(`${apiUrl}/api/user/follow-requests/${item.requestId}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRequestActions(prev => ({ ...prev, [actionKey]: action === 'accept' ? 'accepted' : 'rejected' }));
                // Remove item from list after a brief delay
                setTimeout(() => {
                    setItems(prev => prev.filter(i => i.id !== item.id));
                    setRequestActions(prev => { const n = { ...prev }; delete n[actionKey]; return n; });
                }, 1200);
            } else {
                setRequestActions(prev => { const n = { ...prev }; delete n[actionKey]; return n; });
            }
        } catch {
            setRequestActions(prev => { const n = { ...prev }; delete n[actionKey]; return n; });
        }
    }, []);

    const clearAll = async () => {
        if (clearState !== 'idle' || items.length === 0) return;
        const previousItems = items;
        clearingRef.current = true;
        loadRequestId.current += 1;
        setClearState('clearing');
        setExpandedId(null);
        setItems([]);
        localStorage.removeItem(readKey);
        window.dispatchEvent(new Event('synapse-notifications-cleared'));
        try {
            const token = Cookies.get('synapse_token');
            const response = await fetch(`${apiUrl}/api/social/notifications/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            if (!data.success) throw new Error('Clear request failed');
            clearingRef.current = false;
            setClearState('cleared');
            window.setTimeout(() => setClearState('idle'), 1400);
        } catch {
            clearingRef.current = false;
            setItems(previousItems);
            setClearState('idle');
        }
    };

    const readIds = useMemo(getReadIds, [items, open]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[700] bg-black/55 backdrop-blur-sm" onClick={onClose}>
                    <motion.section
                        initial={{ opacity: 0, y: -18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -18, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                        onClick={e => e.stopPropagation()}
                        className="absolute inset-x-3 bottom-3 top-3 flex flex-col overflow-hidden rounded-[1.7rem] border border-white/[0.1] bg-[#111214] shadow-2xl shadow-black/70"
                    >
                        {/* Header */}
                        <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Bell className="text-emerald-300" size={19} />
                                    <h2 className="text-base font-bold text-white">Activity</h2>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 pl-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
                                    Live activity
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearAll} disabled={clearState !== 'idle' || items.length === 0}
                                    className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all disabled:cursor-default disabled:opacity-40 ${clearState === 'cleared' ? 'bg-emerald-400/15 text-emerald-200' : 'text-emerald-300 active:scale-95'}`}>
                                    <CheckCheck size={15} className={clearState === 'clearing' ? 'animate-pulse' : ''} />
                                    {clearState === 'clearing' ? 'Clearing…' : clearState === 'cleared' ? 'Cleared' : 'Clear all'}
                                </button>
                                <button onClick={onClose} className="rounded-full bg-white/[0.06] p-1.5 text-gray-300"><X size={17} /></button>
                            </div>
                        </header>

                        {/* Body */}
                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {loading ? (
                                <div className="space-y-3 p-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />)}
                                </div>
                            ) : items.length === 0 ? (
                                <div className="px-6 py-14 text-center">
                                    <Bell className="mx-auto text-gray-600" size={28} />
                                    <p className="mt-4 text-sm font-semibold text-white">All caught up</p>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-500">New posts, stories, and follow requests will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {items.map(item => {
                                        const isExpanded = expandedId === item.id;
                                        const actionState = requestActions[item.id];
                                        const isFollowRequest = item.type === 'FOLLOW_REQUEST';

                                        return (
                                            <div key={item.id}
                                                className={`rounded-2xl p-3 transition-colors ${readIds.has(item.id) ? 'bg-transparent' : isFollowRequest ? 'bg-amber-400/[0.06]' : 'bg-emerald-400/[0.07]'}`}>
                                                <div className="flex gap-3">
                                                    {/* Avatar / Icon */}
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorFor(item.type)}`}>
                                                        {item.actor?.profileImage
                                                            ? <img src={item.actor.profileImage} className="h-full w-full rounded-xl object-cover" alt="" />
                                                            : iconFor(item.type)
                                                        }
                                                    </div>

                                                    {/* Content */}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex gap-2">
                                                            <p className="min-w-0 flex-1 text-sm font-semibold text-white">{item.title}</p>
                                                            <span className="text-[10px] font-medium text-gray-500">{relativeTime(item.createdAt)}</span>
                                                        </div>
                                                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{item.detail}</p>

                                                        {/* Follow Request accept/reject buttons */}
                                                        {isFollowRequest && (
                                                            <div className="mt-2 flex gap-2">
                                                                {actionState === 'accepted' ? (
                                                                    <span className="text-[11px] font-bold text-emerald-400">✓ Accepted</span>
                                                                ) : actionState === 'rejected' ? (
                                                                    <span className="text-[11px] font-bold text-gray-500">Declined</span>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleFollowRequest(item, 'accept')}
                                                                            disabled={!!actionState}
                                                                            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-black transition-all active:scale-95 disabled:opacity-50"
                                                                        >
                                                                            {actionState === 'accepting'
                                                                                ? <span className="animate-pulse">...</span>
                                                                                : <><Check size={12} /> Accept</>
                                                                            }
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleFollowRequest(item, 'reject')}
                                                                            disabled={!!actionState}
                                                                            className="flex items-center gap-1 rounded-lg bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                                                                        >
                                                                            {actionState === 'rejecting'
                                                                                ? <span className="animate-pulse">...</span>
                                                                                : <><XCircle size={12} /> Decline</>
                                                                            }
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!readIds.has(item.id) && !isFollowRequest && (
                                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                                                    )}
                                                </div>

                                                {/* Expanded details for non-follow-request types */}
                                                {!isFollowRequest && (
                                                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                                        className="mt-1 w-full text-left">
                                                        <AnimatePresence initial={false}>
                                                            {isExpanded && (
                                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                                    <div className="ml-[52px] mt-3 border-t border-white/[0.08] pt-3 text-xs leading-relaxed text-gray-400">
                                                                        <p><span className="font-semibold text-gray-300">Activity time:</span> {fullTime(item.createdAt)}</p>
                                                                        <p className="mt-1">{expandedCopyFor(item.type)}</p>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.section>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const useNotificationCount = () => {
    const [items, setItems] = useState([]);
    useEffect(() => {
        let active = true;
        let failures = 0;
        const load = async () => {
            try {
                const token = Cookies.get('synapse_token');
                const response = await fetchWithRetry(`${apiUrl}/api/social/notifications`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
                const data = await response.json();
                if (active && data.success) {
                    setItems(data.data);
                    failures = 0;
                }
            } catch {
                failures += 1;
            }
        };
        const clearCountImmediately = () => { if (active) setItems([]); };
        load();
        const poll = window.setInterval(load, LIVE_REFRESH_MS);
        window.addEventListener('synapse-notifications-cleared', clearCountImmediately);
        return () => {
            active = false;
            window.clearInterval(poll);
            window.removeEventListener('synapse-notifications-cleared', clearCountImmediately);
        };
    }, []);
    const readIds = useMemo(getReadIds, [items]);
    return items.filter(item => !readIds.has(item.id)).length;
};

export default NotificationCenter;
