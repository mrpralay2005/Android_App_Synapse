import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Settings, Grid, Bookmark, User, LogOut, Clock, Globe } from 'lucide-react';

const ProfilePage = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = React.useState('synapses');
    const [adminUsers, setAdminUsers] = React.useState([]);

    React.useEffect(() => {
        let isActive = true;
        if (activeTab === 'admin' && user.role === 'ADMIN') {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            fetch(`${apiUrl}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (isActive) setAdminUsers(data);
                })
                .catch(err => {
                    if (isActive) console.error("Admin Fetch Error:", err);
                });
        }
        return () => { isActive = false; };
    }, [activeTab, user]);

    // Determine security status based on risk score
    const getSecurityStatus = (score) => {
        if (score <= 0.2) return { status: 'Secure', icon: <ShieldCheck className="text-emerald-400" />, color: 'emerald' };
        if (score <= 0.5) return { status: 'Neutral', icon: <Shield className="text-amber-400" />, color: 'amber' };
        return { status: 'Critical', icon: <ShieldAlert className="text-red-400" />, color: 'red' };
    };

    const security = getSecurityStatus(user.riskScore || 0);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-['Inter'] selection:bg-emerald-500/30 overflow-x-hidden">
            {/* Header / Nav */}
            <nav className="fixed top-0 w-full z-50 glass-card bg-black/60 border-b border-white/5 px-6 py-4 flex justify-between items-center backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    <span className="text-xl font-bold tracking-tighter">SynapseX</span>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto pt-24 pb-12 px-4">
                {/* Profile Section */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 mb-12">
                    <div className="relative">
                        <div className={`absolute -inset-1.5 bg-gradient-to-tr from-${security.color}-500 to-transparent rounded-full blur-sm opacity-60`}></div>
                        <img
                            src={user.image}
                            alt={user.username}
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-2 border-black relative z-10"
                        />
                        {user.role === 'ADMIN' && (
                            <div className="absolute bottom-1 right-1 bg-emerald-500 text-black px-2 py-0.5 rounded-full text-[10px] font-bold z-20">
                                ADMIN
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                            <h2 className="text-2xl font-light">{user.username}</h2>
                            <div className="flex gap-2">
                                <button className="px-4 py-1.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Edit Neural Link
                                </button>
                                <button className="p-1.5 glass-card rounded-lg hover:bg-white/10 transition-colors">
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center md:justify-start gap-8 mb-6">
                            <div className="flex gap-1.5 items-baseline">
                                <span className="font-bold">2.4k</span>
                                <span className="text-gray-400 text-sm">synapses</span>
                            </div>
                            <div className="flex gap-1.5 items-baseline">
                                <span className="font-bold">890</span>
                                <span className="text-gray-400 text-sm">followers</span>
                            </div>
                            <div className="flex gap-1.5 items-baseline">
                                <span className="font-bold">420</span>
                                <span className="text-gray-400 text-sm">following</span>
                            </div>
                        </div>

                        <div>
                            <span className="font-semibold block mb-1">{user.name}</span>
                            <p className="text-sm text-gray-300 leading-relaxed max-w-md">
                                {user.bio}
                            </p>
                            <a href="#" className="text-xs text-blue-400 font-medium mt-2 flex items-center gap-1 justify-center md:justify-start hover:underline">
                                <Globe size={12} />
                                quantum-link.ai/{user.username}
                            </a>
                        </div>
                    </div>
                </div>

                {/* AI Integrated Dashboard Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-6 mb-12 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.05)]"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-${security.color}-500/10`}>
                                {security.icon}
                            </div>
                            <div>
                                <h3 className="font-bold">Neural Security Core</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Behavioral Analysis</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-gray-400 block mb-1">Risk Score</span>
                            <span className={`text-2xl font-black ${security.status === 'Secure' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {Math.round((1 - (user.riskScore || 0)) * 100)}%
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Auth Status</span>
                            </div>
                            <span className="text-sm font-medium">{security.status} Verified</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                                <ShieldCheck size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Encrypted Link</span>
                            </div>
                            <span className="text-sm font-medium">Quantum Grade</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                                <User size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Identity Proof</span>
                            </div>
                            <span className="text-sm font-medium">Biometric Hash</span>
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="border-t border-white/5 flex justify-center gap-12 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-8">
                    <button
                        onClick={() => setActiveTab('synapses')}
                        className={`flex items-center gap-2 py-4 border-t-2 -mt-[1px] transition-colors ${activeTab === 'synapses' ? 'border-emerald-500 text-white' : 'border-transparent'}`}
                    >
                        <Grid size={16} />
                        Synapses
                    </button>
                    {user.role === 'ADMIN' && (
                        <button
                            onClick={() => setActiveTab('admin')}
                            className={`flex items-center gap-2 py-4 border-t-2 -mt-[1px] transition-colors ${activeTab === 'admin' ? 'border-emerald-400 text-emerald-400' : 'border-transparent hover:text-emerald-400'}`}
                        >
                            <Shield size={16} />
                            Admin Grid
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex items-center gap-2 py-4 border-t-2 -mt-[1px] transition-colors ${activeTab === 'saved' ? 'border-white text-white' : 'border-transparent hover:text-gray-300'}`}
                    >
                        <Bookmark size={16} />
                        Saved
                    </button>
                </div>

                {/* Content Area */}
                {activeTab === 'admin' ? (
                    <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Identity</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">AI Score</th>
                                    <th className="px-6 py-4">Last Sync</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {adminUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{u.username}</div>
                                            <div className="text-[10px] text-gray-500">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${u.role === 'ADMIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-emerald-400">
                                            {(1 - (u.riskScore || 0)).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 md:gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-square bg-white/5 rounded-sm md:rounded-lg overflow-hidden relative group cursor-pointer border border-white/5">
                                <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                                    <ShieldCheck className="w-8 h-8 text-white" />
                                </div>
                                <img
                                    src={`https://picsum.photos/seed/synapse${i}/800/800`}
                                    alt="Post"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProfilePage;
