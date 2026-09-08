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

    const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
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
        <div className="relative w-full h-screen snap-center flex items-center justify-center">
            {/* The Floating Neural Tablet - Width Synced to Feed (Max-2xl minus padding) */}
            <div className="relative w-full max-w-[640px] h-[92vh] flex items-center justify-center bg-[#050505] rounded-[3.5rem] overflow-hidden shadow-[20px_40px_100px_rgba(0,0,0,0.8)] border border-white/10 group">
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
                <div className="absolute bottom-12 left-10 right-20 z-20">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="story-ring p-[2px] cursor-pointer shadow-lg">
                            <img
                                src={post.user?.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                className="w-11 h-11 rounded-full object-cover border-2 border-black"
                                alt={post.user?.username}
                            />
                        </div>
                        <h4 className="text-white font-bold text-sm tracking-tight hover:text-emerald-400 transition-colors cursor-pointer text-shadow-lg">{post.user?.username}</h4>
                        <button className="px-5 py-2 bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all ml-2 shadow-lg shadow-emerald-500/20">
                            Follow
                        </button>
                    </div>
                    <p className="text-white text-[15px] font-medium pr-12 line-clamp-2 leading-relaxed mb-5 drop-shadow-2xl">{post.caption}</p>
                    <div className="flex items-center gap-4 text-emerald-400 font-mono text-[9px] uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-emerald-500/20 shadow-2xl">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                            Neural Phase Locked
                        </div>
                    </div>
                </div>

                {/* Right Side Interaction HUD (Vertical Floating HUD) */}
                <div className="absolute bottom-14 right-8 z-20 flex flex-col items-center gap-7">
                    {/* Like Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleLike}>
                        <motion.div
                            whileTap={{ scale: 0.7 }}
                            className={`p-4 rounded-2xl backdrop-blur-xl border border-white/5 transition-all ${isLiked ? 'text-red-500 bg-red-500/10' : 'text-white bg-white/5 hover:bg-white/10'}`}
                        >
                            <Heart size={28} fill={isLiked ? "currentColor" : "none"} className="drop-shadow-2xl" />
                        </motion.div>
                        <span className="text-[11px] text-white font-extrabold drop-shadow-lg">{likesCount}</span>
                    </div>

                    {/* Comment Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/5 text-white transition-all hover:bg-white/10">
                            <MessageCircle size={28} className="drop-shadow-2xl" />
                        </div>
                        <span className="text-[11px] text-white font-extrabold drop-shadow-lg">{post._count?.comments || 0}</span>
                    </div>

                    {/* Share Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleShare}>
                        <div className="p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/5 text-white transition-all hover:bg-white/10">
                            <Share2 size={28} className="drop-shadow-2xl" />
                        </div>
                        <span className="text-[11px] text-white font-extrabold drop-shadow-lg">Share</span>
                    </div>

                    {/* Bookmark Action */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={handleSave}>
                        <div className={`p-4 rounded-2xl backdrop-blur-xl border border-white/5 transition-all ${isSaved ? 'text-amber-500 bg-amber-500/10' : 'text-white bg-white/5 hover:bg-white/10'}`}>
                            <Bookmark size={28} fill={isSaved ? "currentColor" : "none"} className="drop-shadow-2xl" />
                        </div>
                        <span className="text-[11px] text-white font-extrabold drop-shadow-lg">Vault</span>
                    </div>

                    {/* More Menu */}
                    <div className="relative">
                        <div
                            onClick={() => setShowMenu(!showMenu)}
                            className={`p-4 rounded-2xl backdrop-blur-xl border border-white/5 text-white cursor-pointer transition-all ${showMenu ? 'bg-emerald-500 text-black rotate-90' : 'bg-white/5 hover:bg-white/10'}`}
                        >
                            <MoreHorizontal size={24} />
                        </div>

                        {/* Professional Context Menu */}
                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                    className="absolute bottom-0 right-20 w-48 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50"
                                >
                                    <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-6 py-4 text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest">
                                        <Link size={16} /> Copy Link
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-6 py-4 text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest border-t border-white/5">
                                        <Info size={16} /> About Account
                                    </button>
                                    <button onClick={handleDownload} className="w-full flex items-center gap-3 px-6 py-4 text-emerald-500 hover:bg-emerald-500/10 transition-all text-xs font-bold uppercase tracking-widest border-t border-white/5">
                                        <Download size={16} /> Download
                                    </button>
                                    <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-red-400/10 transition-all text-xs font-bold uppercase tracking-widest border-t border-white/5">
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
                            <Heart size={160} fill="currentColor" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Top Interaction Layer (Ambient HUD) */}
                <div className="absolute top-10 left-10 right-10 z-20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                        <h2 className="text-white text-xl font-black uppercase tracking-widest drop-shadow-2xl opacity-90">TV Matrix</h2>
                    </div>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl text-white border border-white/10 hover:bg-emerald-500 hover:text-black transition-all shadow-2xl"
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                </div>

                {/* Play/Pause Center Indicator */}
                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            className="absolute pointer-events-none z-30 bg-black/60 backdrop-blur-3xl p-12 rounded-[2.5rem] border border-white/5"
                        >
                            <Play size={64} className="text-white ml-2" fill="white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const ReelsSkeleton = () => (
    <div className="relative w-full h-screen flex items-center justify-center">
        <div className="relative w-full max-w-[640px] h-[92vh] bg-[#080808] rounded-[3.5rem] overflow-hidden border border-white/10">
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
            />

            {/* HUD Skeleton */}
            <div className="absolute bottom-12 left-10 right-20 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
                    <div className="w-32 h-4 bg-white/5 rounded-lg animate-pulse" />
                </div>
                <div className="w-64 h-3 bg-white/5 rounded-lg animate-pulse" />
                <div className="w-40 h-8 bg-white/5 rounded-2xl animate-pulse" />
            </div>

            {/* Interaction HUD Skeleton */}
            <div className="absolute bottom-14 right-8 flex flex-col gap-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
                ))}
            </div>
        </div>
    </div>
);

const ReelsView = ({ posts, loading }) => {
    // Neural Filter: Only extract video segments for Reels Broadcast
    const reels = posts.filter(post => post.type === 'VIDEO');

    return (
        <div className="relative w-full h-screen overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-transparent">
            {loading ? (
                <>
                    <ReelsSkeleton />
                    <ReelsSkeleton />
                </>
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
