import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Volume2, VolumeX, Play, Pause, Download, Link, Info, X, Send } from 'lucide-react';
import Cookies from 'js-cookie';

const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i);
};

const ReelItem = ({ post, currentUserId, onProfileClick }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [isSaved, setIsSaved] = useState(post.isSaved || false);
    const [likesCount, setLikesCount] = useState(post._count?.likes || 0);
    const [showHeart, setShowHeart] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isFollowing, setIsFollowing] = useState(Boolean(post.user?.isFollowing));
    const [isRequested, setIsRequested] = useState(Boolean(post.user?.isRequested));
    const [followLoading, setFollowLoading] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    const [commentsCount, setCommentsCount] = useState(post._count?.comments || 0);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [commentError, setCommentError] = useState('');

    const apiUrl = import.meta.env.VITE_API_URL || "https://synapse-backend.mrpralay2005.workers.dev";
    const token = Cookies.get('synapse_token');
    
    // Check all possible user ID variations to determine if this is own reel
    const postUserId = post.user?.id || post.userId;
    const isOwnReel = currentUserId && postUserId && (
        String(currentUserId) === String(postUserId) ||
        String(currentUserId) === String(post.user?.userId)
    );
    
    // Debug log to help troubleshoot
    console.log('ReelItem Debug:', {
        currentUserId,
        postUserId: post.user?.id,
        postUserIdAlt: post.userId,
        isOwnReel,
        username: post.user?.username
    });

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

    const handleProfileClick = (e) => {
        e.stopPropagation();
        if (!isOwnReel && post.user?.username && onProfileClick) {
            onProfileClick(post.user);
        }
    };

    const handleFollow = async () => {
        if (followLoading || !post.user?.username) return;
        setFollowLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/user/profile/${post.user.username}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Could not update follow status');
            setIsFollowing(Boolean(data.following));
            setIsRequested(Boolean(data.requested));
        } catch (err) {
            console.error('Follow error:', err);
            alert(err.message || 'Could not update follow status');
        } finally {
            setFollowLoading(false);
        }
    };

    useEffect(() => {
        if (!showComments) return undefined;

        let isCurrent = true;
        const loadComments = async () => {
            setIsLoadingComments(true);
            setCommentError('');
            try {
                const response = await fetch(`${apiUrl}/api/social/posts/${post.id}/comments`);
                const data = await response.json();
                if (!response.ok || !Array.isArray(data)) {
                    throw new Error(data?.error || 'Could not load comments.');
                }
                if (isCurrent) {
                    setComments(data);
                    setCommentsCount(data.length);
                }
            } catch (error) {
                if (isCurrent) setCommentError(error.message || 'Could not load comments.');
            } finally {
                if (isCurrent) setIsLoadingComments(false);
            }
        };

        loadComments();
        return () => { isCurrent = false; };
    }, [apiUrl, post.id, showComments]);

    const handleCommentSubmit = async (event) => {
        event?.preventDefault();
        const content = commentText.trim();
        if (!content || isPostingComment) return;

        if (!token) {
            setCommentError('Your session has ended. Please sign in again before posting.');
            return;
        }

        setIsPostingComment(true);
        setCommentError('');
        try {
            const response = await fetch(`${apiUrl}/api/social/posts/${post.id}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
            const data = await response.json();
            if (!response.ok || !data.success || !data.data) {
                throw new Error(data?.error || (response.status === 401 || response.status === 403 ? 'Your session has ended. Please sign in again.' : 'Could not post your comment.'));
            }

            setComments((current) => [...current, data.data]);
            setCommentsCount((current) => current + 1);
            setCommentText('');
        } catch (error) {
            setCommentError(error.message || 'Could not post your comment.');
        } finally {
            setIsPostingComment(false);
        }
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
                        <div 
                            className={`story-ring p-[2px] shadow-lg ${!isOwnReel ? 'cursor-pointer' : ''}`}
                            onClick={handleProfileClick}
                        >
                            <img
                                src={post.user?.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                className="h-9 w-9 rounded-full border-2 border-black object-cover"
                                alt={post.user?.username}
                            />
                        </div>
                        <h4 
                            className={`max-w-[7.5rem] truncate text-xs font-bold tracking-tight text-white transition-colors ${!isOwnReel ? 'cursor-pointer hover:text-emerald-300' : ''}`}
                            onClick={handleProfileClick}
                        >
                            {post.user?.username}
                        </h4>
                        {!isOwnReel && (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`ml-auto rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider shadow-lg transition ${
                                    isFollowing
                                        ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                                        : isRequested
                                            ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                            : 'bg-emerald-400 text-black shadow-emerald-500/20 hover:bg-emerald-300'
                                } disabled:opacity-60`}
                            >
                                {followLoading ? 'Wait...' : isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                            </button>
                        )}
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
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setShowComments(true)}>
                        <div className="rounded-xl border border-white/10 bg-black/35 p-2.5 text-white backdrop-blur-xl transition-all hover:bg-white/10">
                            <MessageCircle size={20} className="drop-shadow-2xl" />
                        </div>
                        <span className="text-[9px] font-extrabold text-white drop-shadow-lg">{commentsCount}</span>
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

            {/* Comment Modal - Portal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showComments && (
                        <motion.div
                            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Comments"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                        >
                            <motion.button
                                type="button"
                                aria-label="Close comments"
                                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setShowComments(false)}
                            />

                            <motion.section
                                variants={{ hidden: { opacity: 0, scale: 0.94, y: 16 }, visible: { opacity: 1, scale: 1, y: 0 } }}
                                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                                className="relative z-10 flex max-h-[min(34rem,calc(100dvh-2rem))] w-full max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101112] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="relative overflow-hidden border-b border-white/[0.08] px-5 pb-4 pt-5">
                                    <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-emerald-400/15 blur-3xl" />
                                    <div className="pointer-events-none absolute -left-14 bottom-0 h-28 w-28 rounded-full bg-violet-500/10 blur-3xl" />
                                    <div className="relative flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300 shadow-[0_8px_24px_rgba(52,211,153,0.12)]">
                                                <MessageCircle size={18} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold text-white">Neural thread</h2>
                                                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                                    {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowComments(false)}
                                            className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                        >
                                            Close
                                        </button>
                                    </div>

                                    <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                                        {isVideo(post.user?.profileImage) ? (
                                            <video src={post.user.profileImage} className="h-9 w-9 shrink-0 rounded-xl object-cover" autoPlay muted loop playsInline />
                                        ) : (
                                            <img src={post.user?.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt={post.user?.username || 'Reel author'} />
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-bold text-white">{post.user?.username || 'Synapse member'}</p>
                                            <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">{post.caption || 'Share your thought on this reel.'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                                    {isLoadingComments ? (
                                        <div className="flex min-h-[11rem] flex-col items-center justify-center gap-3 text-center">
                                            <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-300/20 border-t-emerald-300" />
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Loading conversation</p>
                                        </div>
                                    ) : comments.length > 0 ? (
                                        <div className="space-y-4">
                                            {comments.map((comment) => (
                                                <article key={comment.id} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                                                    {isVideo(comment.user?.profileImage) ? (
                                                        <video src={comment.user.profileImage} className="h-9 w-9 shrink-0 rounded-xl object-cover" autoPlay muted loop playsInline />
                                                    ) : (
                                                        <img src={comment.user?.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt={comment.user?.username || 'Comment author'} />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-baseline justify-between gap-3">
                                                            <p className="truncate text-xs font-bold text-white">{comment.user?.username || 'Synapse member'}</p>
                                                            {comment.createdAt && <time className="shrink-0 text-[9px] font-medium text-gray-600">{new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>}
                                                        </div>
                                                        <p className="mt-1 break-words text-xs leading-relaxed text-gray-300">{comment.content}</p>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex min-h-[11rem] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-8 text-center">
                                            <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-300">
                                                <MessageCircle size={23} />
                                                <span className="absolute inset-[-5px] rounded-[1.1rem] border border-emerald-300/10" />
                                            </div>
                                            <p className="text-sm font-bold text-white">Start the conversation</p>
                                            <p className="mt-2 max-w-[15rem] text-xs leading-relaxed text-gray-500">No messages are showing here yet. Share the first thought on this reel.</p>
                                            <div className="mt-5 rounded-full border border-emerald-300/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200/80">Live discussion</div>
                                        </div>
                                    )}
                                    {commentError && <p role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-center text-[11px] leading-relaxed text-red-200">{commentError}</p>}
                                </div>

                                <form onSubmit={handleCommentSubmit} className="border-t border-white/[0.08] bg-gradient-to-b from-white/[0.025] to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                                    <div className="flex items-center gap-3">
                                        {isVideo(Cookies.get('synapse_user_image')) ? (
                                            <video
                                                src={Cookies.get('synapse_user_image')}
                                                className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 object-cover"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={Cookies.get('synapse_user_image') || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                                className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 object-cover"
                                                alt="Your profile"
                                            />
                                        )}
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={commentText}
                                                onChange={(event) => setCommentText(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' && !event.shiftKey) handleCommentSubmit(event);
                                                }}
                                                placeholder="Add to the neural thread..."
                                                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-4 pr-12 text-sm text-white placeholder:text-gray-600 transition focus:border-emerald-400/50 focus:bg-black/55 focus:outline-none"
                                            />
                                            <button
                                                type="submit"
                                                aria-label="Post comment"
                                                disabled={!commentText.trim() || isPostingComment}
                                                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl bg-emerald-400 text-black transition hover:bg-emerald-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {isPostingComment ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black" /> : <Send size={15} />}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </motion.section>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
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

const ReelsView = ({ posts, loading, currentUser, onProfileClick }) => {
    // Neural Filter: Only extract video segments for Reels Broadcast
    const reels = posts.filter(post => post.type === 'VIDEO');
    
    // Get current user ID from prop (preferred) or cookie fallback
    const currentUserId = currentUser?.id || currentUser?.userId || Cookies.get('synapse_user_id');

    return (
        <div className="relative h-full w-full overflow-y-auto overscroll-contain snap-y snap-mandatory hide-scrollbar bg-transparent">
            {loading ? (
                <ReelsSkeleton />
            ) : reels.length > 0 ? (
                reels.map((post) => (
                    <ReelItem 
                        key={post.id} 
                        post={post} 
                        currentUserId={currentUserId} 
                        onProfileClick={onProfileClick}
                    />
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
