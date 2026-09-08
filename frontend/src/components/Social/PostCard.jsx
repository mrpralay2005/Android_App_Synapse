import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Download, Lock, Unlock, Play, Pause, Volume2, VolumeX, ShieldCheck, Share2, Maximize2, Expand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';

const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i);
};

const PostCard = ({ post, onInteraction, onCinemaMode, index = 0 }) => {
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [isSaved, setIsSaved] = useState(post.isSaved || false);
    const [likesCount, setLikesCount] = useState(post._count?.likes || 0);
    const [isUnlocked, setIsUnlocked] = useState(!post.postPassword);
    const [inputPassword, setInputPassword] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [isInView, setIsInView] = useState(false);
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    // Pick a random Neural Mask (from the 6 photos you saved)
    // We use useMemo so it stays the same for this post during a session but changes on refresh
    const neuralMask = React.useMemo(() => {
        const maskNumber = Math.floor(Math.random() * 6) + 1;
        return `/assets/neural-masks/mask_${maskNumber}.webp`;
    }, []);

    useEffect(() => {
        // Neural Animation Delay: Enforce a slight delay before triggering cinematic effects
        // This prevents the "instant motion" jarring effect on page load/refresh
        let timeoutId;
        const ANIMATION_START_DELAY = 1000; // 1 second delay after mounting before any animation can start
        const mountTime = Date.now();

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const timeSinceMount = Date.now() - mountTime;
                    const initialDelay = Math.max(0, ANIMATION_START_DELAY - timeSinceMount);

                    if (entry.isIntersecting) {
                        clearTimeout(timeoutId);
                        // Delay the activation of cinematic mode
                        timeoutId = setTimeout(() => {
                            if (videoRef.current) {
                                videoRef.current.play().catch(() => { });
                                setIsPlaying(true);
                            }
                            setIsInView(true);
                        }, initialDelay + 150); // Plus small debounce
                    } else {
                        clearTimeout(timeoutId);
                        if (videoRef.current) videoRef.current.pause();
                        setIsPlaying(false);
                        setIsInView(false);
                    }
                });
            },
            { threshold: 0.6 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) observer.unobserve(containerRef.current);
            clearTimeout(timeoutId);
        };
    }, []);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
    const token = Cookies.get('synapse_token');

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

    const handleSave = async () => {
        setIsSaved(!isSaved);
        try {
            await fetch(`${apiUrl}/api/social/posts/${post.id}/save`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) { console.error(err); }
    };

    const handleUnlock = () => {
        if (inputPassword === post.postPassword) {
            setIsUnlocked(true);
        } else {
            alert("Neural Key Mismatch. Access Denied.");
            setInputPassword('');
        }
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(post.mediaUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `synapse_${post.id}.${post.type === 'VIDEO' ? 'mp4' : 'jpg'}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Neural Extraction Interrupted:", error);
            // Fallback for cross-origin if absolute fetch fails
            window.open(post.mediaUrl, '_blank');
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'SynapseX Broadcast',
                text: post.caption,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Broadcast link copied to neural clipboard.");
        }
    };

    const handleCinemaModeClick = (e) => {
        if (e) e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
        onCinemaMode(post);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "0px 0px -100px 0px" }}
            transition={{
                type: "spring",
                stiffness: 70,   // Organic movement
                damping: 18,     // Smooth settling without vibration
                mass: 0.8,       // Light, snappy feel
                delay: index < 5 ? index * 0.06 : 0, // Tight ripple
            }}
            ref={containerRef}
            style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
            }}
            className="group relative bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden mb-12 last:mb-0 hover:border-emerald-500/20 transition-[border-color,box-shadow] duration-500"
        >
            {/* Post Header */}
            <div className="flex items-center justify-between p-6 px-8">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 p-[2px] transition-transform group-hover:rotate-12 bg-black overflow-hidden">
                            {isVideo(post.user?.profileImage) ? (
                                <video
                                    src={post.user?.profileImage}
                                    className="w-full h-full rounded-full object-cover border-2 border-black"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={post.user?.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                    className="w-full h-full rounded-full object-cover border-2 border-black"
                                    alt={post.user?.username}
                                />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center">
                            <ShieldCheck size={8} className="text-black" />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white text-[13px] font-bold tracking-tight">{post.user?.name || post.user?.username}</h4>
                        <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                            Neural Link Active <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                        </p>
                    </div>
                </div>
                <button className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all hover:bg-white/10">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Media Canvas - Neural Masking Applied */}
            <div className="relative aspect-square md:aspect-[16/10] bg-[#0d0d0d] post-media-container flex items-center justify-center overflow-hidden">
                {/* 1. Underlying Neural Atmosphere (Immediate Neural Mask) */}
                <AnimatePresence>
                    {!isMediaLoaded && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="absolute inset-0 z-10 overflow-hidden bg-[#0d0d0d]"
                        >
                            <img
                                src={`${neuralMask}?v=1`}
                                className="absolute inset-0 w-full h-full object-cover opacity-80 blur-[12px] scale-110 grayscale"
                                alt=""
                                decoding="async"
                            />
                            {/* Synchronized Project Shimmer - Instant Start */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-skeleton-shimmer z-20" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {!isUnlocked ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-3xl p-8 text-center group">
                        <div className="p-6 bg-amber-500/10 rounded-[2rem] mb-6 mb-8 group-hover:scale-110 transition-transform">
                            <Lock size={48} className="text-amber-500" />
                        </div>
                        <h3 className="text-white text-xl font-bold mb-2">Segment Encrypted</h3>
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-[0.3em] mb-8">Access Key Required</p>

                        <div className="w-full max-w-xs relative">
                            <input
                                type="password"
                                value={inputPassword}
                                onChange={(e) => setInputPassword(e.target.value)}
                                placeholder="Neural Key..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono tracking-widest text-center"
                            />
                            <button
                                onClick={handleUnlock}
                                className="mt-4 w-full py-4 bg-emerald-500 text-black font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all"
                            >
                                Decrypt Access
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {post.type === 'VIDEO' ? (
                            <div
                                className="relative w-full h-full group/video cursor-pointer"
                                onClick={togglePlay}
                                onDoubleClick={handleCinemaModeClick}
                            >
                                <video
                                    ref={videoRef}
                                    src={post.mediaUrl}
                                    className={`post-media-fix object-cover transition-opacity duration-700 ${(isInView && isMediaLoaded) ? 'active-cinematic' : ''} ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`}
                                    loop
                                    muted={isMuted}
                                    playsInline
                                    preload="metadata"
                                    onCanPlay={() => setIsMediaLoaded(true)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity flex flex-col justify-end p-8">
                                    <div className="flex items-center gap-4">
                                        <div
                                            onClick={togglePlay}
                                            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-white/20 transition-all"
                                        >
                                            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
                                        </div>
                                        <div
                                            onClick={toggleMute}
                                            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-white/20 transition-all"
                                        >
                                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                        </div>
                                    </div>


                                </div>
                            </div>
                        ) : (
                            <img
                                src={post.mediaUrl}
                                className={`post-media-fix object-cover cursor-zoom-in transition-opacity duration-700 ${(isInView && isMediaLoaded) ? 'active-cinematic' : ''} ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`}
                                alt="Neural Visual"
                                onDoubleClick={handleCinemaModeClick}
                                onLoad={() => setIsMediaLoaded(true)}
                                decoding="async"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.src = "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80";
                                    setIsMediaLoaded(true);
                                }}
                            />
                        )}

                        {/* Cinema Mode Toggle - Top Left (Precision Placement) */}
                        <button
                            onClick={handleCinemaModeClick}
                            className="absolute top-6 left-6 z-30 p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500 hover:text-black shadow-lg"
                            title="Initiate Cinema Broadcast"
                        >
                            <Expand size={14} />
                        </button>

                        {/* Download Overlay - Top Right (Precision Placement) */}
                        <div className="absolute top-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={handleDownload}
                                className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-emerald-500 hover:text-black shadow-lg transition-colors"
                                title="Download Synchronized Data"
                            >
                                <Download size={14} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Neural Meta / Actions */}
            <div className="p-8 px-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={handleLike}
                            className="flex flex-col items-center gap-1.5 group/btn"
                        >
                            <div className={`p-4 rounded-[1.2rem] transition-all flex items-center justify-center ${isLiked ? 'bg-red-500/10 text-red-500 shadow-[0_10px_20px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-gray-400 group-hover/btn:bg-white/10 group-hover/btn:text-red-400'}`}>
                                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{likesCount} Liked</span>
                        </button>

                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="flex flex-col items-center gap-1.5 group/btn"
                        >
                            <div className={`p-4 rounded-[1.2rem] transition-all flex items-center justify-center ${showComments ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-gray-400 group-hover/btn:bg-white/10 group-hover/btn:text-emerald-400'}`}>
                                <MessageCircle size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{post._count?.comments || 0} Synapse</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="flex flex-col items-center gap-1.5 group/btn"
                        >
                            <div className="p-4 bg-white/5 rounded-[1.2rem] text-gray-400 transition-all group-hover/btn:bg-white/10 group-hover/btn:text-blue-400 flex items-center justify-center">
                                <Share2 size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Share</span>
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        className="flex flex-col items-center gap-1.5 group/btn"
                    >
                        <div className={`p-4 rounded-[1.2rem] transition-all flex items-center justify-center ${isSaved ? 'bg-amber-500/10 text-amber-500 shadow-[0_10px_20px_rgba(245,158,11,0.2)]' : 'bg-white/5 text-gray-400 group-hover/btn:bg-white/10 group-hover/btn:text-amber-400'}`}>
                            <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Registry</span>
                    </button>
                </div>

                {/* Caption / Content */}
                <div className="space-y-4">
                    <p className="text-sm text-gray-300 leading-relaxed font-medium">
                        <span className="text-white font-bold mr-3">{post.user?.username}</span>
                        {post.caption}
                    </p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
                        {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Expansion: Comments Section (Mini-interface) */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 overflow-hidden bg-white/[0.01]"
                    >
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8">
                                {isVideo(Cookies.get('synapse_user_image')) ? (
                                    <video
                                        src={Cookies.get('synapse_user_image')}
                                        className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={Cookies.get('synapse_user_image') || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                        className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                        alt="self"
                                    />
                                )}
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add to the neural thread..."
                                        className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-5 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest hover:text-emerald-400">Post</button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                {/* Placeholder for real comments */}
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center py-4">Synchronizing recent threads...</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default PostCard;
