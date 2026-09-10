import React, { useEffect, useState } from 'react';
import { Activity, Check, FileText, ShieldCheck, Users, X } from 'lucide-react';
import Cookies from 'js-cookie';

const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';

const AdminCommandCenter = () => {
    const [overview, setOverview] = useState(null);
    const [requests, setRequests] = useState([]);
    const [updates, setUpdates] = useState([]);
    const [release, setRelease] = useState({ version: '', title: '', summary: '' });
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState('');
    const token = Cookies.get('synapse_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = async () => {
        try {
            const [overviewRes, requestsRes, updatesRes] = await Promise.all([
                fetch(`${apiUrl}/api/admin/overview`, { headers }),
                fetch(`${apiUrl}/api/admin/creator-requests`, { headers }),
                fetch(`${apiUrl}/api/admin/platform-updates`, { headers })
            ]);
            const [overviewData, requestsData, updatesData] = await Promise.all([overviewRes.json(), requestsRes.json(), updatesRes.json()]);
            if (overviewData.success) setOverview(overviewData.data);
            if (requestsData.success) setRequests(requestsData.data);
            if (updatesData.success) setUpdates(updatesData.data);
        } catch {
            setMessage('Command Center could not reach the admin core.');
        }
    };

    useEffect(() => { load(); }, []);

    const review = async (id, decision) => {
        setBusyId(id);
        try {
            const res = await fetch(`${apiUrl}/api/admin/creator-requests/${id}`, { method: 'PUT', headers, body: JSON.stringify({ decision }) });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setMessage(`Creator request ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`);
            await load();
        } catch (error) {
            setMessage(error.message || 'Review could not be completed.');
        } finally { setBusyId(null); }
    };

    const publish = async (event) => {
        event.preventDefault();
        setBusyId('release');
        try {
            const res = await fetch(`${apiUrl}/api/admin/platform-updates`, { method: 'POST', headers, body: JSON.stringify(release) });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setRelease({ version: '', title: '', summary: '' });
            setMessage('Release published. Cloudflare is now building the frontend and backend together.');
            await load();
        } catch (error) {
            setMessage(error.message || 'Release note could not be published.');
        } finally { setBusyId(null); }
    };

    const stats = [
        { label: 'Identities', value: overview?.totalUsers ?? '—', icon: Users, tone: 'text-blue-400' },
        { label: 'Pending reviews', value: overview?.pendingVerifications ?? '—', icon: Activity, tone: 'text-amber-400' },
        { label: 'Verified creators', value: overview?.verifiedCreators ?? '—', icon: ShieldCheck, tone: 'text-emerald-400' },
        { label: 'Published posts', value: overview?.totalPosts ?? '—', icon: FileText, tone: 'text-violet-400' }
    ];

    return <div className="space-y-5 pb-4">
        <div className="rounded-[1.5rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.13] to-white/[0.025] p-5">
            <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-400" size={24} /><div><h3 className="text-lg font-bold text-white">Admin Command Center</h3><p className="mt-0.5 text-xs text-gray-400">Role-protected platform operations</p></div></div>
        </div>
        {message && <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300">{message}</div>}
        <div className="grid grid-cols-2 gap-3">{stats.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3"><Icon size={18} className={tone} /><p className="mt-4 text-2xl font-bold text-white">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p></div>)}</div>
        <section className="rounded-[1.5rem] border border-white/[0.08] bg-[#111214] p-4"><div className="mb-3 flex items-center justify-between"><h4 className="font-bold text-white">Creator verification queue</h4><span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">{requests.length} pending</span></div>{requests.length === 0 ? <p className="py-5 text-center text-sm text-gray-500">All creator requests are reviewed.</p> : <div className="space-y-3">{requests.map(request => <div key={request.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3"><div className="mb-3"><p className="font-semibold text-white">{request.name || request.username}</p><p className="text-xs text-gray-500">@{request.username} · {request.email}</p></div><div className="flex gap-2"><button disabled={busyId === request.id} onClick={() => review(request.id, 'APPROVED')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-400 py-2 text-xs font-bold text-black disabled:opacity-50"><Check size={14} />Approve</button><button disabled={busyId === request.id} onClick={() => review(request.id, 'REJECTED')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 py-2 text-xs font-bold text-red-300 disabled:opacity-50"><X size={14} />Reject</button></div></div>)}</div>}</section>
        <section className="rounded-[1.5rem] border border-white/[0.08] bg-[#111214] p-4"><h4 className="mb-1 font-bold text-white">Publish software update</h4><p className="mb-3 text-xs leading-relaxed text-gray-500">This records the release notes and manually starts the Cloudflare frontend and backend builds from main. Pushing code alone does not update users.</p><form onSubmit={publish} className="space-y-2"><input required value={release.version} onChange={e => setRelease({ ...release, version: e.target.value })} placeholder="Version e.g. v1.2.0" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none" /><input required value={release.title} onChange={e => setRelease({ ...release, title: e.target.value })} placeholder="Release title" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none" /><textarea required value={release.summary} onChange={e => setRelease({ ...release, summary: e.target.value })} placeholder="What changed?" rows="3" className="w-full resize-none rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none" /><button disabled={busyId === 'release'} className="w-full rounded-xl bg-emerald-400 py-2.5 text-xs font-bold text-black disabled:opacity-50">{busyId === 'release' ? 'Starting release…' : 'Publish update & deploy'}</button></form>{updates.slice(0, 3).map(update => <div key={update.id} className="mt-3 border-t border-white/[0.06] pt-3"><p className="text-xs font-bold text-emerald-300">{update.version} · {update.title}</p><p className="mt-1 text-xs text-gray-500">{update.summary}</p></div>)}</section>
    </div>;
};

export default AdminCommandCenter;
