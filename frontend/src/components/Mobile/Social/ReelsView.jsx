import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Volume2, VolumeX, Play, Pause, Download, Link, Info, X } from 'lucide-react';
import Cookies from 'js-cookie';

const ReelItem = ({ post }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [isSaved, setIsSaved] = useState(post.isSaved || false);
    const [likesCount, setLikesCount] = useState(post._count?.likes || 0);
    const [showHeart, setShowHeart] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || "https://synapse-backend.mrpralay2005.workers.dev";
    const token = Cookies.get('synapse_token');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (videoRef.current) {
                        if (entry.isIntersecting) {
                            videoRef.current.play().catch(() => { });
                            setIsPlaying(true);
                        } else {
                            videoRef.current.pause();
                            setIsPlaying(false);
                            videoRef.current.currentTime = 0;
                        }
                    }
                });
            },
            { threshold: 0.7 }
        );

        if (videoRef.current) observer.observe(videoRef.current);
        return () => { if (videoRef.current) observer.unobserve(videoRef.current); };
    }, []);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleDoubleTap = (e) => {
        if (!isLiked) handleLike();
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
    };

    const handleLike = async () => {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
        try {
            await fetch(`${apiUrl}/api/social/posts/${post.id}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) { console.error(err); }
    };

    const handleSave = async (e) => {
        if (e) e.stopPropagation();
        setIsSaved(!isSaved);
        try {
            await fetch(`${apiUrl}/api/social/posts/${post.id}/save`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) { console.error(err); }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'SynapseX Reel',
                text: post.caption,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Broadcast link copied.");
        }
    };

    const handleDownload = async () => {
        setShowMenu(false);
        try {
            const response = await fetch(post.mediaUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `synapse_reel_${post.id}.mp4`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Neural Download Interrupted:", error);
            // Fallback for cross-origin if absolute fetch fails
            window.open(post.mediaUrl, '_blank');
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard.");
        setShowMenu(false);
    };

    return (
        <article className="relative h-full min-h-full w-full snap-start py-1">
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[#050505] shadow-[0_18px_45px_rgba(0,0,0,0.48)] group">
                <video
                    ref={videoRef}
                    src={post.mediaUrl}
                    className="w-full h-full object-cover"
                    loop
                    muted={isMuted}
                    playsInline
                    onClick={togglePlay}
                    onDoubleClick={handleDoubleTap}
                />

                {/* Left Side Overlay (Bottom Aligned HUD) */}
                <div className="absolute bottom-5 left-5 right-[4.5rem] z-20">
                    <div className="mb-3 flex items-center gap-2.5">
                        <div className="story-ring p-[2px] cursor-pointer shadow-lg">
                            <img
                                src={post.user?.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                className="h-9 w-9 rounded-full border-2 border-black object-cover"
                                alt={post.user?.username}
                            />
                        </div>
                        <h4 className="max-w-[7.5rem] truncate text-xs font-bold tracking-tight text-white transition-colors hover:text-emerald-300">{post.user?.username}</h4>
                        <button className="ml-auto rounded-xl bg-emerald-400 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300">
                            Follow
                        </button>
                    </div>
                    {post.caption && <p className="mb-3 line-clamp-2 pr-1 text-xs font-medium leading-relaxed text-white drop-shadow-2xl">{post.caption}</p>}
                    <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-emerald-300">
                        <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-black/40 px-2.5 py-1 backdrop-blur-xl">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                            Live reel
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-5 right-3 z-20 flex flex-col items-center gap-3.5">
                    {/* Like Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleLike}>
                        <motion.div
                            whileTap={{ scale: 0.7 }}
                            className={`rounded-xl border border-white/10 p-2.5 backdrop-blur-xl transition-all ${isLiked ? 'bg-red-500/15 text-red-400' : 'bg-black/35 text-white hover:bg-white/10'}`}
                        >
                            <Heart size={20} fill={isLiked ? "currentColor" : "none"} className="drop-shadow-2xl" />
                        </motion.div>
                        <span className="text-[9px] font-extrabold text-white drop-shadow-lg">{likesCount}</span>
                    </div>

                    {/* Comment Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="rounded-xl border border-white/10 bg-black/35 p-2.5 text-white backdrop-blur-xl transition-all hover:bg-white/10">
                            <MessageCircle size={20} className="drop-shadow-2xl" />
                        </div>
                        <span className="text-[9px] font-extrabold text-white drop-shadow-lg">{post._count?.comments || 0}</span>
                    </div>

                    {/* Share Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleShare}>
                        <div className="rounded-xl border border-white/10 bg-black/35 p-2.5 text-white backdrop-blur-xl transition-all hover:bg-white/10">
                            <Share2 size={20} className="drop-shadow-2xl" />
                        </div>
                        <span className="text-[9px] font-extrabold text-white drop-shadow-lg">Share</span>
                    </div>

                    {/* Bookmark Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleSave}>
                        <div className={`rounded-xl border border-white/10 p-2.5 backdrop-blur-xl transition-all ${isSaved ? 'bg-amber-500/15 text-amber-300' : 'bg-black/35 text-white hover:bg-white/10'}`}>
                            <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} className="drop-shadow-2xl" />
                        </div>
                        <span className="text-[9px] font-extrabold text-white drop-shadow-lg">Save</span>
                    </div>

                    {/* More Menu */}
                    <div className="relative">
                        <div
                            onClick={() => setShowMenu(!showMenu)}
                            className={`rounded-xl border border-white/10 p-2.5 text-white backdrop-blur-xl transition-all ${showMenu ? 'rotate-90 bg-emerald-400 text-black' : 'bg-black/35 hover:bg-white/10'}`}
                        >
                            <MoreHorizontal size={20} />
                        </div>

                        {/* Professional Context Menu */}
                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                    className="absolute bottom-0 right-14 z-50 w-44 overflow-hidden rounded-2xl border border-white/10 bg-black/85 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                                >
                                    <button onClick={handleCopyLink} className="flex w-full items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10">
                                        <Link size={16} /> Copy Link
                                    </button>
                                    <button className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10">
                                        <Info size={16} /> About Account
                                    </button>
                                    <button onClick={handleDownload} className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 transition-all hover:bg-emerald-500/10">
                                        <Download size={16} /> Download
                                    </button>
                                    <button onClick={() => setShowMenu(false)} className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-400/10">
                                        <X size={16} /> Close
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Big Double-Tap Heart Overlay */}
                <AnimatePresence>
                    {showHeart && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 0 }}
                            animate={{ scale: 1.5, opacity: 1, y: -20 }}
                            exit={{ scale: 2, opacity: 0, y: -40 }}
                            className="absolute pointer-events-none z-40 text-red-500 drop-shadow-[0_0_80px_rgba(239,68,68,0.8)]"
                        >
                            <Heart size={112} fill="currentColor" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Top Interaction Layer (Ambient HUD) */}
                <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-2.5 py-1.5 backdrop-blur-xl">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                        <h2 className="text-[9px] font-black uppercase tracking-[0.18em] text-white">Reels</h2>
                    </div>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="rounded-xl border border-white/10 bg-black/35 p-2.5 text-white shadow-xl backdrop-blur-xl transition hover:bg-emerald-400 hover:text-black"
                    >
                        {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    </button>
                </div>

                {/* Play/Pause Center Indicator */}
                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            className="absolute z-30 rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-3xl pointer-events-none"
                        >
                            <Play size={36} className="ml-1 text-white" fill="white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </article>
    );
};

const ReelsSkeleton = () => (
    <div className="relative h-full min-h-full w-full snap-start py-1">
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#080808]">
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
            />

            {/* HUD Skeleton */}
            <div className="absolute bottom-5 left-5 right-16 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-white/5" />
                    <div className="h-3 w-24 animate-pulse rounded-lg bg-white/5" />
                </div>
                <div className="h-3 w-40 animate-pulse rounded-lg bg-white/5" />
                <div className="h-6 w-24 animate-pulse rounded-2xl bg-white/5" />
            </div>

            {/* Interaction HUD Skeleton */}
            <div className="absolute bottom-5 right-3 flex flex-col gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 w-10 animate-pulse rounded-xl bg-white/5" />
                ))}
            </div>
        </div>
    </div>
);

const ReelsView = ({ posts, loading }) => {
    // Neural Filter: Only extract video segments for Reels Broadcast
    const reels = posts.filter(post => post.type === 'VIDEO');

    return (
        <div className="relative h-full w-full overflow-y-auto overscroll-contain snap-y snap-mandatory hide-scrollbar bg-transparent">
            {loading ? (
                <ReelsSkeleton />
            ) : reels.length > 0 ? (
                reels.map((post) => (
                    <ReelItem key={post.id} post={post} />
                ))
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#050505]">
                    <div className="w-24 h-24 bg-emerald-500/5 rounded-full flex items-center justify-center mb-8 border border-emerald-500/10 border-dashed animate-spin-slow">
                        <Play size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-white text-3xl font-bold tracking-tighter mb-4">No Neural Reels Yet</h2>
                    <p className="text-gray-500 max-w-sm font-medium">Broadcast your first video to see it appearing in the Synapse TV network.</p>
                </div>
            )}
        </div>
    );
};

export default ReelsView;
