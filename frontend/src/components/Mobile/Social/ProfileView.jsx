import React, { useState, useEffect } from 'react';
import { Grid, Play, Bookmark, User as UserIcon, Settings, ShieldCheck, Shield, Plus, Monitor, Lock, Hash, Heart, MessageCircle, Zap, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import EditNeuralProfileModal from './EditNeuralProfileModal';

const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i);
};

const ProfileView = ({ user, currentUser, posts: parentPosts = [], onOpenCreatePost, loading: parentLoading, onCinemaMode, onUpdateUser, onFollowChange, onClose }) => {
    const [activeTab, setActiveTab] = useState('posts');
    const [tabData, setTabData] = useState([]);
    const [localLoading, setLocalLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(Boolean(user.isFollowing));
    const [followLoading, setFollowLoading] = useState(false);

    const isLoading = parentLoading || localLoading;
    const isOwnProfile = String(currentUser?.id ?? currentUser?.userId) === String(user.id ?? user.userId);
    const canViewContent = isOwnProfile || !user.isPrivate || isFollowing;
    const isRecentlyActive = Boolean(user.showActivityStatus && user.lastActiveAt && Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000);
    const apiUrl = import.meta.env.VITE_API_URL || "https://synapse-backend.mrpralay2005.workers.dev";
    const token = Cookies.get('synapse_token');

    useEffect(() => { setActiveTab('posts'); }, [user.id]);
    useEffect(() => { setIsFollowing(Boolean(user.isFollowing)); }, [user.id, user.isFollowing]);

    useEffect(() => {
        if (isOwnProfile || !token || !user.username) return;
        fetch(`${apiUrl}/api/user/profile/${encodeURIComponent(user.username)}/visit`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
    }, [apiUrl, isOwnProfile, token, user.username]);

    const handleFollow = async () => {
        if (followLoading) return;
        const previousFollowing = isFollowing;
        const nextFollowing = !previousFollowing;
        setFollowLoading(true);
        setIsFollowing(nextFollowing);
        onFollowChange?.({ targetUserId: user.id ?? user.userId, following: nextFollowing });
        try {
            const res = await fetch(`${apiUrl}/api/user/profile/${encodeURIComponent(user.username)}/follow`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Could not update follow status');
            setIsFollowing(data.following);
            onFollowChange?.({
                targetUserId: user.id ?? user.userId,
                following: data.following,
                targetFollowers: data.counts?.targetFollowers,
                viewerFollowing: data.counts?.viewerFollowing
            });
        } catch (error) {
            console.error('Follow action failed:', error);
            setIsFollowing(previousFollowing);
            onFollowChange?.({ targetUserId: user.id ?? user.userId, following: previousFollowing });
        } finally {
            setFollowLoading(false);
        }
    };

    useEffect(() => {
        let isCancelled = false;
        setLocalLoading(false);
        const loadContent = async () => {
            if (activeTab === 'saved' && isOwnProfile) {
                setTabData([]);
                setLocalLoading(true);
                try {
                    const res = await fetch(`${apiUrl}/api/user/saved`, { headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    if (!isCancelled) setTabData(data.data || []);
                } catch (err) {
                    if (!isCancelled) console.error('Registry Sync Failure:', err);
                } finally {
                    if (!isCancelled) setLocalLoading(false);
                }
            } else if (activeTab === 'resonance' && !isOwnProfile) {
                setTabData([]);
                setLocalLoading(true);
                try {
                    const res = await fetch(`${apiUrl}/api/user/resonance/${encodeURIComponent(user.username)}`, { headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    if (!isCancelled) setTabData(data.data || []);
                } catch (err) {
                    if (!isCancelled) console.error('Resonance Sync Failed:', err);
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
                if (!isCancelled) setTabData(filtered);
            }
        };
        loadContent();
        return () => { isCancelled = true; };
    }, [activeTab, parentPosts, token]);

    const tabs = [
        { id: 'posts', label: 'Synapses', icon: <Grid size={13} /> },
        { id: 'reels', label: 'Neural Reels', icon: <Play size={13} /> },
        ...(isOwnProfile
            ? [{ id: 'saved', label: 'Registry', icon: <Bookmark size={13} /> }]
            : [{ id: 'resonance', label: 'Resonance', icon: <Zap size={13} /> }]
        ),
        { id: 'tagged', label: 'Tagged', icon: <UserIcon size={13} /> },
    ];

    return (
        <div className="w-full min-h-full bg-[#0a0a0a] text-white">

            {/* ── Header card ── */}
            <div className="px-4 pt-4 pb-3">

                {/* Avatar + action row */}
                <div className="flex items-center gap-4 mb-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="story-ring p-[2.5px] w-[72px] h-[72px] rounded-full bg-black overflow-hidden">
                            {isVideo(user.profileImage) ? (
                                <video src={user.profileImage} className="w-full h-full rounded-full object-cover" autoPlay muted loop playsInline />
                            ) : (
                                <img
                                    src={user.profileImage || 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg'}
                                    className="w-full h-full rounded-full object-cover"
                                    alt={user.username}
                                />
                            )}
                        </div>
                        {isRecentlyActive && (
                            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" title="Active now" />
                        )}
                        <div className="absolute inset-0 bg-emerald-500/15 blur-xl rounded-full -z-10" />
                    </div>

                    {/* Stats */}
                    <div className="flex flex-1 justify-around">
                        {[
                            { value: user._count?.posts ?? parentPosts.length ?? 0, label: 'Posts' },
                            { value: user._count?.followers ?? 0, label: 'Followers' },
                            { value: user._count?.following ?? 0, label: 'Following' },
                        ].map(({ value, label }) => (
                            <div key={label} className="flex flex-col items-center gap-1">
                                <span className="text-[17px] font-black text-white leading-none">{value}</span>
                                <span className="text-[10px] text-gray-500 font-semibold">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Name + bio */}
                <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[13px] font-black text-white tracking-tight">{user.name || user.username}</span>
                        {user.isPrivate && <Shield size={13} className="text-emerald-400" aria-label="Private profile" />}
                        {user.isVerified && <ShieldCheck size={11} className="text-emerald-400" />}
                    </div>
                    <p className="text-[12px] text-gray-400 leading-snug">
                        {user.bio || 'Quantum Explorer in the SynapseX Realm'}
                    </p>
                </div>

                {/* Action buttons */}
                {isOwnProfile ? (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex-1 py-2 rounded-xl bg-white/[0.08] border border-white/[0.08] text-[12px] font-bold text-white transition-colors hover:bg-white/[0.12] active:scale-95"
                        >
                            Edit Neural Link
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.08] border border-white/[0.08] transition-colors hover:bg-white/[0.12] active:scale-95">
                            <Settings size={15} className="text-gray-400" />
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={handleFollow} disabled={followLoading} className={`flex-1 rounded-xl py-2 text-[12px] font-black transition-all active:scale-95 disabled:opacity-60 ${isFollowing ? 'border border-white/[0.12] bg-white/[0.08] text-white hover:bg-white/[0.12]' : 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:bg-emerald-400'}`}>
                            {followLoading ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button className="flex-1 py-2 rounded-xl bg-white/[0.08] border border-white/[0.08] text-[12px] font-bold text-white transition-colors hover:bg-white/[0.12] active:scale-95">
                            Message
                        </button>
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <div className="border-t border-white/[0.06] flex">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] border-t-2 -mt-[2px] transition-colors ${
                            activeTab === tab.id
                                ? 'border-emerald-400 text-emerald-400'
                                : 'border-transparent text-gray-600 hover:text-gray-400'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden xs:block">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Content grid ── */}
            <div className="min-h-[200px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.3em]">Syncing...</p>
                    </div>
                ) : user.isPrivate && !canViewContent ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-16 h-16 bg-amber-500/[0.06] border border-amber-500/15 rounded-2xl flex items-center justify-center mb-4">
                            <Lock size={24} className="text-amber-400" />
                        </div>
                        <h3 className="text-white text-sm font-black mb-1 uppercase tracking-wide">Neural Link Restricted</h3>
                        <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase max-w-xs leading-relaxed">
                            Follow this user to see their synapses.
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-3 gap-[2px]">
                        <AnimatePresence mode="popLayout">
                            {tabData.length > 0 ? (
                                tabData.map((post, i) => (
                                    <motion.div
                                        key={post.id}
                                        // Mobile profile posts arrive with a gentle, staggered zoom-in.
                                        // The small scale difference keeps the profile grid feeling clean.
                                        initial={{ opacity: 0, scale: 0.975 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ delay: i * 0.09, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                                        className="aspect-square bg-white/[0.02] overflow-hidden relative cursor-pointer isolate"
                                        onClick={() => onCinemaMode(post)}
                                    >
                                        <div className="absolute inset-0 bg-black/40 opacity-0 active:opacity-100 transition-opacity duration-200 z-10 flex items-center justify-center gap-3">
                                            <div className="flex items-center gap-1 text-white text-[11px] font-bold">
                                                <Heart size={13} fill="white" />{post._count?.likes || 0}
                                            </div>
                                            <div className="flex items-center gap-1 text-white text-[11px] font-bold">
                                                <MessageCircle size={13} fill="white" />{post._count?.comments || 0}
                                            </div>
                                        </div>
                                        {post.type === 'VIDEO' ? (
                                            <div className="w-full h-full relative">
                                                <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                                                <div className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-md">
                                                    <Play className="text-white" size={10} />
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover" />
                                        )}
                                        {post.postPassword && (
                                            <div className="absolute bottom-1 left-1 p-1 bg-black/50 rounded-md">
                                                <Lock size={9} className="text-amber-400" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="col-span-full py-16 text-center flex flex-col items-center px-6">
                                    <div className="w-14 h-14 bg-white/[0.04] rounded-2xl flex items-center justify-center mb-4 border border-white/[0.06]">
                                        {activeTab === 'posts' ? <Grid size={22} className="text-gray-700" /> :
                                            activeTab === 'reels' ? <Play size={22} className="text-gray-700" /> :
                                                activeTab === 'saved' ? <Bookmark size={22} className="text-gray-700" /> :
                                                    activeTab === 'resonance' ? <Zap size={22} className="text-gray-700" /> :
                                                        <UserIcon size={22} className="text-gray-700" />}
                                    </div>
                                    <h3 className="text-white text-sm font-black mb-1 uppercase tracking-wide">
                                        {activeTab === 'resonance' ? 'No Resonance' : 'Nothing here yet'}
                                    </h3>
                                    <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase mb-6">
                                        {activeTab === 'resonance' ? "You haven't entangled with this user's content." : 'Start sharing to fill this space.'}
                                    </p>
                                    {isOwnProfile && activeTab === 'posts' && (
                                        <button onClick={onOpenCreatePost}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-black font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all active:scale-95">
                                            <Plus size={14} /> New post
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
