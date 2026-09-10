import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Heart, Image as ImageIcon, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';

const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
const readKey = 'synapse_read_notification_ids';

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

const NotificationCenter = ({ open, onClose }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    const load = async () => {
        try {
            const token = Cookies.get('synapse_token');
            const response = await fetch(`${apiUrl}/api/social/notifications`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            const data = await response.json();
            if (data.success) setItems(data.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { if (open) load(); }, [open]);
    useEffect(() => {
        const poll = window.setInterval(load, 20000);
        return () => window.clearInterval(poll);
    }, []);

    const clearAll = async () => {
        try {
            const token = Cookies.get('synapse_token');
            const response = await fetch(`${apiUrl}/api/social/notifications/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            if (!data.success) return;
            localStorage.removeItem(readKey);
            setItems([]);
            window.dispatchEvent(new Event('synapse-notifications-cleared'));
        } catch {
            // The current list remains visible if the secure clear request fails.
        }
    };
    const readIds = useMemo(getReadIds, [items, open]);
    const iconFor = (type) => type === 'SECURITY' ? <ShieldCheck size={17} /> : type === 'STORY' ? <ImageIcon size={17} /> : <Heart size={17} />;

    return <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-black/55 backdrop-blur-sm" onClick={onClose}>
        <motion.section initial={{ opacity: 0, y: -18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.98 }} transition={{ type: 'spring', damping: 24, stiffness: 280 }} onClick={event => event.stopPropagation()} className="absolute inset-x-3 bottom-3 top-3 flex flex-col overflow-hidden rounded-[1.7rem] border border-white/[0.1] bg-[#111214] shadow-2xl shadow-black/70">
            <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4"><div><div className="flex items-center gap-2"><Bell className="text-emerald-300" size={19} /><h2 className="text-base font-bold text-white">Activity</h2></div><div className="mt-1 flex items-center gap-1.5 pl-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300/80"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />Live activity</div></div><div className="flex items-center gap-2"><button onClick={clearAll} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><CheckCheck size={15} />Clear all</button><button onClick={onClose} className="rounded-full bg-white/[0.06] p-1.5 text-gray-300"><X size={17} /></button></div></header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{loading ? <div className="space-y-3 p-2">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div> : items.length === 0 ? <div className="px-6 py-14 text-center"><Bell className="mx-auto text-gray-600" size={28} /><p className="mt-4 text-sm font-semibold text-white">All caught up</p><p className="mt-1 text-xs leading-relaxed text-gray-500">New posts and stories from people you follow will appear here.</p></div> : <div className="space-y-2">{items.map(item => { const isExpanded = expandedId === item.id; return <button type="button" key={item.id} onClick={() => setExpandedId(isExpanded ? null : item.id)} aria-expanded={isExpanded} className={`block w-full rounded-2xl p-3 text-left transition-colors ${readIds.has(item.id) ? 'bg-transparent hover:bg-white/[0.035]' : 'bg-emerald-400/[0.07]'}`}><div className="flex gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.type === 'SECURITY' ? 'bg-blue-400/10 text-blue-300' : 'bg-emerald-400/10 text-emerald-300'}`}>{item.actor?.profileImage ? <img src={item.actor.profileImage} className="h-full w-full rounded-xl object-cover" alt="" /> : iconFor(item.type)}</div><div className="min-w-0 flex-1"><div className="flex gap-2"><p className="min-w-0 flex-1 text-sm font-semibold text-white">{item.title}</p><span className="text-[10px] font-medium text-gray-500">{relativeTime(item.createdAt)}</span></div><p className="mt-1 text-xs leading-relaxed text-gray-500">{item.detail}</p></div>{!readIds.has(item.id) && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />}</div><AnimatePresence initial={false}>{isExpanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="ml-[52px] mt-3 border-t border-white/[0.08] pt-3 text-xs leading-relaxed text-gray-400"><p><span className="font-semibold text-gray-300">Activity time:</span> {fullTime(item.createdAt)}</p>{item.type === 'SECURITY' ? <p className="mt-1">This sign-in record belongs only to your account. Review it if you do not recognise the device.</p> : <p className="mt-1">This update is from an identity you follow. Tap again to collapse.</p>}</div></motion.div>}</AnimatePresence></button>; })}</div>}</div>
        </motion.section>
    </motion.div>}</AnimatePresence>;
};

export const useNotificationCount = () => {
    const [items, setItems] = useState([]);
    useEffect(() => {
        let active = true;
        const load = async () => {
            try { const token = Cookies.get('synapse_token'); const response = await fetch(`${apiUrl}/api/social/notifications`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }); const data = await response.json(); if (active && data.success) setItems(data.data); } catch { /* keep the app usable offline */ }
        };
        load(); const poll = window.setInterval(load, 20000); window.addEventListener('synapse-notifications-cleared', load); return () => { active = false; window.clearInterval(poll); window.removeEventListener('synapse-notifications-cleared', load); };
    }, []);
    const readIds = useMemo(getReadIds, [items]);
    return items.filter(item => !readIds.has(item.id)).length;
};

export default NotificationCenter;
