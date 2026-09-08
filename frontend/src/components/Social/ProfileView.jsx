import React, { useState, useEffect } from 'react';
import { Grid, Play, Bookmark, User as UserIcon, Settings, ShieldCheck, Plus, Monitor, Lock, Hash, Heart, MessageCircle, Zap, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import EditNeuralProfileModal from './EditNeuralProfileModal';

const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i);
};

const ProfileView = ({ user, currentUser, posts: parentPosts = [], onOpenCreatePost, loading: parentLoading, onCinemaMode, onUpdateUser, onClose }) => {
    const [activeTab, setActiveTab] = useState('posts');
    const [tabData, setTabData] = useState([]);
    const [localLoading, setLocalLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const isLoading = parentLoading || localLoading;

    // String matching to ensure IDs connect regardless of type (Number vs String)
    const isOwnProfile = String(currentUser?.id) === String(user.id);
    const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
    const token = Cookies.get('synapse_token');

    useEffect(() => {
        setActiveTab('posts');
    }, [user.id]);

    useEffect(() => {
        let isCancelled = false;
        setLocalLoading(false); // Reset loading state on every tab change

        const loadContent = async () => {
            if (activeTab === 'saved' && isOwnProfile) {
                setTabData([]); // Clear immediately to prevent ghosting
                setLocalLoading(true);
                try {
                    const res = await fetch(`${apiUrl}/api/user/saved`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (!isCancelled) {
                        setTabData(data.data || []);
                    }
                } catch (err) {
                    if (!isCancelled) console.error("Registry Sync Failure:", err);
                } finally {
                    if (!isCancelled) setLocalLoading(false);
                }
            } else if (activeTab === 'resonance' && !isOwnProfile) {
                setTabData([]);
                setLocalLoading(true);
                try {
                    // Fetch mutual resonance (posts both users have interacted with/liked)
                    const res = await fetch(`${apiUrl}/api/user/resonance/${encodeURIComponent(user.username)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (!isCancelled) {
                        setTabData(data.data || []);
                    }
                } catch (err) {
                    if (!isCancelled) console.error("Resonance Sync Failed:", err);
                } finally {
                    if (!isCancelled) setLocalLoading(false);
                }
            } else if (activeTab === 'tagged') {
                setTabData([]);
            } else {
                const filtered = parentPosts.filter(post => {
                    const postType = post.type || 'IMAGE';
                    if (activeTab === 'posts') return postType === 'IMAGE';
                    if (activeTab === 'reels') return postType === 'VIDEO';
                    return true;
                });
                if (!isCancelled) {
                    setTabData(filtered);
                }
            }
        };

        loadContent();
        return () => { isCancelled = true; };
    }, [activeTab, parentPosts, token]);

    const tabs = [
        { id: 'posts', label: 'Synapses', icon: <Grid size={16} /> },
        { id: 'reels', label: 'Neural Reels', icon: <Play size={16} /> },
        ...(isOwnProfile ? [
            { id: 'saved', label: 'Registry', icon: <Bookmark size={16} /> }
        ] : [
            { id: 'resonance', label: 'Mutual Resonance', icon: <Zap size={16} /> }
        ]),
        { id: 'tagged', label: 'Tagged', icon: <UserIcon size={16} /> },
    ];

    return (
        <div className="flex-1 max-w-5xl mx-auto py-16 px-6 md:px-12 relative">
            {/* Animated Back Arrow for All Profile Views */}
            {onClose && (
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: -5, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="absolute top-12 right-6 md:-right-8 p-3 bg-white/5 border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors z-50 backdrop-blur-md group"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </motion.button>
            )}

            {/* Header (Refined Pro Typography) */}
            <div className="flex flex-col md:flex-row gap-12 md:gap-24 items-center md:items-start mb-24">
                <div className="relative group">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="story-ring p-[5px] w-36 h-36 md:w-52 md:h-52 relative z-10 bg-black overflow-hidden rounded-full"
                    >
                        {isVideo(user.profileImage) ? (
                            <video
                                src={user.profileImage}
                                className="w-full h-full rounded-full border-4 border-black object-cover"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        ) : (
                            <img
                                src={user.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                className="w-full h-full rounded-full border-4 border-black object-cover"
                                alt={user.username}
                            />
                        )}
                    </motion.div>
                    <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full -z-10 group-hover:bg-emerald-500/30 transition-all duration-700"></div>
                </div>

                <div className="flex-1 w-full text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                        <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-bold text-white tracking-tighter">{user.username}</h2>
                            {user.isPrivate && <Lock className="text-amber-500" size={24} />}
                        </div>
                        <div className="flex gap-3">
                            {isOwnProfile ? (
                                <>
                                    <button onClick={() => setIsEditModalOpen(true)} className="px-8 py-3 bg-white text-black text-[10px] font-bold rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95">Edit Neural Link</button>
                                    <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                                        <Settings size={20} className="text-gray-400" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="px-10 py-3 bg-emerald-500 text-black text-[10px] font-bold rounded-2xl hover:bg-emerald-400 transition-all uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(16,185,129,0.2)]">Connect</button>
                                    <button className="px-10 py-3 bg-white/5 text-white text-[10px] font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all uppercase tracking-[0.2em]">Message</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center md:justify-start gap-16 mb-10 border-y border-white/5 py-8 md:border-none md:py-0">
                        <div className="text-center md:text-left group cursor-pointer">
                            <span className="text-2xl font-bold text-white block mb-1 group-hover:text-emerald-500 transition-colors">
                                {user._count?.posts || parentPosts.length || 0}
                            </span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-[0.3em] font-bold">Synapses</span>
                        </div>
                        <div className="text-center md:text-left group cursor-pointer">
                            <span className="text-2xl font-bold text-white block mb-1 group-hover:text-emerald-500 transition-colors">{user._count?.followers || 0}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-[0.3em] font-bold">Followers</span>
                        </div>
                        <div className="text-center md:text-left group cursor-pointer">
                            <span className="text-2xl font-bold text-white block mb-1 group-hover:text-emerald-500 transition-colors">{user._count?.following || 0}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-[0.3em] font-bold">Following</span>
                        </div>
                    </div>

                    <div className="max-w-lg mx-auto md:mx-0">
                        <h3 className="text-white font-bold text-lg mb-2 tracking-tight uppercase tracking-[0.1em]">{user.name}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                            {user.bio || "Synchronizing with the neural hive mind. Quantum explorer in the SynapseX realm."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation (Restored Tagged Section) */}
            <div className="border-t border-white/5 flex justify-center gap-12 text-[9px] font-bold uppercase tracking-[0.4em] text-gray-600 mb-12 relative">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-6 border-t-[3px] -mt-[3px] transition-all relative z-10 ${activeTab === tab.id ? 'border-emerald-500 text-white' : 'border-transparent hover:text-gray-400'}`}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="tab-active" className="absolute inset-0 bg-emerald-500/5 -z-10" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.3em] animate-pulse">Syncing Registry...</p>
                    </div>
                ) : user.isPrivate && !isOwnProfile ? (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-40 text-center"
                    >
                        <div className="w-24 h-24 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full animate-pulse" />
                            <Lock size={40} className="text-amber-500 relative z-10" />
                        </div>
                        <h3 className="text-white text-2xl font-bold mb-2 tracking-tight uppercase">Neural Link Restricted</h3>
                        <p className="text-gray-600 text-[10px] font-bold tracking-[0.3em] mb-10 uppercase max-w-xs leading-relaxed">
                            This user has activated their Stealth Shield. Follow them to synchronize with their synapses.
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 md:gap-8">
                        <AnimatePresence mode="popLayout">
                            {tabData.length > 0 ? (
                                tabData.map((post, i) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: i * 0.05, duration: 0.4 }}
                                        className="aspect-square bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden relative group cursor-pointer shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all"
                                        onClick={() => onCinemaMode(post)}
                                    >
                                        <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-all z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                                            <div className="flex items-center gap-6 mb-2">
                                                <div className="flex items-center gap-2 text-white font-bold">
                                                    <Heart size={18} fill="white" />
                                                    <span>{post._count?.likes || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white font-bold">
                                                    <MessageCircle size={18} fill="white" />
                                                    <span>{post._count?.comments || 0}</span>
                                                </div>
                                            </div>
                                            {post.postPassword && <div className="flex items-center gap-2 text-amber-400 text-[8px] font-bold uppercase tracking-widest mt-4 bg-black/40 px-3 py-1 rounded-full"><Lock size={10} /> Encrypted</div>}
                                        </div>

                                        {post.type === 'VIDEO' ? (
                                            <div className="w-full h-full relative">
                                                <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                                                <div className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-lg"><Play className="text-white" size={14} /></div>
                                            </div>
                                        ) : (
                                            <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        )}
                                        <div className="absolute bottom-4 right-4 text-white opacity-40">{post.type === 'VIDEO' ? <Monitor size={14} /> : <Hash size={14} />}</div>
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-40 text-center flex flex-col items-center">
                                    <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5">
                                        {activeTab === 'posts' ? <Grid size={32} className="text-gray-700" /> :
                                            activeTab === 'reels' ? <Play size={32} className="text-gray-700" /> :
                                                activeTab === 'saved' ? <Bookmark size={32} className="text-gray-700" /> :
                                                    activeTab === 'resonance' ? <Zap size={32} className="text-gray-700" /> :
                                                        <UserIcon size={32} className="text-gray-700" />}
                                    </div>
                                    <h3 className="text-white text-2xl font-bold mb-2 tracking-tight uppercase">
                                        {activeTab === 'resonance' ? "Resonance Not Found" : "Segment Empty"}
                                    </h3>
                                    <p className="text-gray-600 text-xs font-bold tracking-[0.2em] mb-10 uppercase">
                                        {activeTab === 'resonance' ? "You haven't entangled with this user's content yet." : "Initiate your broadcast for this area."}
                                    </p>
                                    {isOwnProfile && activeTab === 'posts' && (
                                        <button onClick={onOpenCreatePost} className="flex items-center gap-3 px-10 py-4 bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-emerald-400 transition-all shadow-2xl">
                                            <Plus size={16} /> New post
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <EditNeuralProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={user}
                onUpdate={onUpdateUser}
            />
        </div>
    );
};

export default ProfileView;
