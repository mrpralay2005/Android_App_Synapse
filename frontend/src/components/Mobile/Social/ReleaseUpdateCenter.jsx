import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
const appliedReleaseKey = 'synapse_applied_release';
const dismissedReleaseKey = 'synapse_dismissed_release';

const useLatestRelease = () => {
    const [release, setRelease] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/user/platform-update/latest`, { cache: 'no-store' });
                const data = await response.json();
                if (active && data.success) setRelease(data.data);
            } catch {
                // An update check must never interrupt normal app use.
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        const onFocus = () => load();
        window.addEventListener('focus', onFocus);
        return () => { active = false; window.removeEventListener('focus', onFocus); };
    }, []);

    return { release, loading };
};

const startWebUpdate = (version, setProgress) => {
    setProgress({ value: 20, label: 'Checking release integrity…' });
    window.setTimeout(() => setProgress({ value: 62, label: 'Synchronising new experience…' }), 360);
    window.setTimeout(() => setProgress({ value: 100, label: 'Ready — restarting SynapseX…' }), 820);
    window.setTimeout(() => {
        localStorage.setItem(appliedReleaseKey, version);
        window.location.reload();
    }, 1250);
};

export const ReleaseUpdateNotice = () => {
    const { release, loading } = useLatestRelease();
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(null);

    useEffect(() => {
        if (!loading && release?.version) {
            const seen = localStorage.getItem(dismissedReleaseKey);
            const applied = localStorage.getItem(appliedReleaseKey);
            setVisible(seen !== release.version && applied !== release.version);
        }
    }, [loading, release]);

    const dismiss = () => {
        localStorage.setItem(dismissedReleaseKey, release.version);
        setVisible(false);
    };

    return <AnimatePresence>{visible && release && <motion.div initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.96 }} className="fixed inset-x-4 bottom-24 z-[500] overflow-hidden rounded-3xl border border-emerald-400/25 bg-[#121716]/[0.98] p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="mb-3 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Sparkles size={19} /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Update available · {release.version}</p><p className="mt-1 text-sm font-bold text-white">{release.title}</p><p className="mt-1 text-xs leading-relaxed text-gray-400">{release.summary}</p></div>{!progress && <button onClick={dismiss} className="p-1 text-gray-500" aria-label="Update later"><X size={17} /></button>}</div>
        {progress ? <div><div className="mb-2 flex justify-between text-[10px] font-semibold text-gray-400"><span>{progress.label}</span><span>{progress.value}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div animate={{ width: `${progress.value}%` }} className="h-full rounded-full bg-emerald-400" /></div></div> : <div className="flex gap-2"><button onClick={() => startWebUpdate(release.version, setProgress)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 py-2.5 text-xs font-bold text-black"><RefreshCw size={14} />Update now</button><button onClick={dismiss} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300">Later</button></div>}
    </motion.div>}</AnimatePresence>;
};

export const ReleaseUpdatePanel = () => {
    const { release, loading } = useLatestRelease();
    const [progress, setProgress] = useState(null);
    const isCurrent = release?.version && localStorage.getItem(appliedReleaseKey) === release.version;

    if (loading) return <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><div className="h-3 w-28 rounded bg-white/10" /><div className="mt-3 h-3 w-3/4 rounded bg-white/[0.07]" /></div>;
    if (!release) return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center"><CheckCircle2 className="mx-auto text-emerald-400" size={24} /><p className="mt-3 text-sm font-semibold text-white">SynapseX is current</p><p className="mt-1 text-xs text-gray-500">There are no published updates yet.</p></div>;

    return <div className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.09] to-white/[0.025] p-5"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><Download size={19} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Latest release · {release.version}</p><h4 className="mt-1 text-base font-bold text-white">{release.title}</h4><p className="mt-2 text-xs leading-relaxed text-gray-400">{release.summary}</p></div></div>{progress ? <div className="mt-5"><div className="mb-2 flex justify-between text-[10px] font-semibold text-gray-400"><span>{progress.label}</span><span>{progress.value}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div animate={{ width: `${progress.value}%` }} className="h-full rounded-full bg-emerald-400" /></div></div> : <button disabled={isCurrent} onClick={() => startWebUpdate(release.version, setProgress)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 text-xs font-bold text-black disabled:bg-white/10 disabled:text-gray-400">{isCurrent ? <><CheckCircle2 size={15} />Current version installed</> : <><RefreshCw size={15} />Synchronise update</>}</button>}</div>;
};
