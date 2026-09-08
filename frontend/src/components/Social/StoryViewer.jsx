import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, MoreHorizontal, Eye, Trash2, Copy, Volume2, VolumeX, Lock, Share, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';

// Helper Component for Profile Media (Image or Video)
// Defined outside to prevent re-renders during progress updates
const UserAvatar = ({ user, className, staticOnly = false }) => {
    const src = user?.profileImage || user?.image || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg";
    const isVideo = src.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$/i);

    // Optimization: If floating/animating (staticOnly), don't render heavy video.
    // Show stylish Initials intead to prevent flickering.
    if (isVideo && staticOnly) {
        const initial = (user?.username || "U").charAt(0).toUpperCase();
        const colors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-orange-500'];
        const randomColor = colors[initial.charCodeAt(0) % colors.length];

        return (
            <div className={`w-full h-full ${randomColor} flex items-center justify-center`}>
                <span className="text-white font-bold text-[10px]">{initial}</span>
            </div>
        );
    }

    if (isVideo) {
        return (
            <video
                src={src}
                className={className}
                autoPlay
                muted
                loop
                playsInline
                style={{ objectFit: 'cover' }}
            />
        );
    }
    return <img src={src} className={className} alt={user?.username || "User"} style={{ objectFit: 'cover' }} />;
};

const StoryViewer = ({ stories, initialStoryIndex = 0, onClose, onDelete, onUserProfileClick, currentUser }) => {
    const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isMediaLoading, setIsMediaLoading] = useState(true);
    const [showLoadingUI, setShowLoadingUI] = useState(false);
    const [isFirstStoryLoad, setIsFirstStoryLoad] = useState(true);
    const [retryKey, setRetryKey] = useState(0);
    const videoRef = useRef(null);
    const imgRef = useRef(null);

    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // New State for Viewers & Messages
    const [viewers, setViewers] = useState([]);
    const [floatingMessages, setFloatingMessages] = useState([]);
    const [allMessages, setAllMessages] = useState([]);
    const [showViewersModal, setShowViewersModal] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [showFloatingBatch, setShowFloatingBatch] = useState([]);

    const activeStories = stories?.length > 0 ? stories : [];
    const safeIndex = Math.min(currentIndex, activeStories.length - 1);
    const currentStory = activeStories[safeIndex >= 0 ? safeIndex : 0];

    // Helper: Identity Check
    const isOwner = currentStory && currentUser && (
        String(currentStory.userId) === String(currentUser.id) ||
        String(currentStory.userId) === String(currentUser.userId)
    );

    if (!currentStory && stories?.length === 0) return null;

    const [videoDuration, setVideoDuration] = useState(null);
    const effectiveDuration = currentStory?.type === 'VIDEO'
        ? Math.min(videoDuration || 60000, 60000)
        : 5000;

    const LIVE_API = "https://synapse-backend.pralayd140.workers.dev";
    const token = Cookies.get('synapse_token');

    // --- Effects ---

    const [sessionError, setSessionError] = useState(false);

    // 1. Mark Viewed & Fetch Details (Optimized: SWR Cache Strategy)
    // 1. Mark Viewed & Fetch Details (Optimized: SWR + SessionStorage + Auto-Pause)
    // 1. Mark Viewed & Fetch Details (Optimized: SWR + SessionStorage + Auto-Pause)
    useEffect(() => {
        if (!currentStory || !token) return;

        let active = true;
        const storyId = currentStory.id;
        const cacheKey = `synapse_story_details_${storyId}`;

        // Helper: Filter out self from lists (Frontend Failsafe)
        const filterSelf = (list) => {
            if (!list) return [];
            const myId = String(currentUser.id || currentUser.userId);
            // Check top level userId or nested user.id
            return list.filter(item => {
                const itemId = String(item.userId || item.user?.id);
                return itemId !== myId;
            });
        };

        // --- STEP 1: INSTANT CACHE HIT (Persist across Refresh) ---
        let cachedData = null;
        try {
            const raw = sessionStorage.getItem(cacheKey);
            if (raw) cachedData = JSON.parse(raw);
        } catch (e) { }

        if (cachedData) {
            setViewers(filterSelf(cachedData.viewers));
            setAllMessages(filterSelf(cachedData.messages));
            setIsDetailsLoading(false); // Immediate Data
        } else {
            // Cold Start: Pause Story & Show Loading
            setViewers([]);
            setAllMessages([]);
            setIsDetailsLoading(true);
        }

        // Reset Inputs
        setFloatingMessages([]);
        setShowFloatingBatch([]);
        setMessageInput("");
        setSessionError(false);

        // --- STEP 2: PARALLEL NETWORK REFRESH (Background) ---

        const markViewed = async () => {
            try {
                const userId = currentUser.id || currentUser.userId;
                if (userId) {
                    await fetch(`${LIVE_API}/api/social/stories/${storyId}/view`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            } catch (e) { console.error("View Sync Weakness", e); }
        };

        const fetchDetails = async () => {
            try {
                const res = await fetch(`${LIVE_API}/api/social/stories/${storyId}/details`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 403) {
                    if (active) setSessionError(true);
                    throw new Error("Session Expired");
                }

                const data = await res.json();
                if (active && data.success) {
                    // Update Cache (Persistence) with RAW data (or filtered? Better raw in case user changes?) 
                    // Let's store raw, filter on read/set.
                    try {
                        sessionStorage.setItem(cacheKey, JSON.stringify({
                            viewers: data.viewers || [],
                            messages: data.messages || []
                        }));
                    } catch (e) { }

                    // Update State
                    setViewers(filterSelf(data.viewers));
                    setAllMessages(filterSelf(data.messages));
                    setIsDetailsLoading(false); // Unpause story
                }
            } catch (e) {
                console.error("Details fetch failed", e);
            } finally {
                if (active && !sessionStorage.getItem(cacheKey)) setIsDetailsLoading(false);
            }
        };

        markViewed();

        if (isOwner) {
            fetchDetails();
        } else {
            setIsDetailsLoading(false);
        }

        return () => { active = false; };

    }, [currentStory?.id, isOwner, token, currentUser]);

    // 2. Playback Logic (Owner & Messages)
    useEffect(() => {
        if (allMessages.length === 0) return;

        let index = 0;
        let isCancelled = false;

        const processBatch = () => {
            if (isCancelled) return;

            // If we've shown all, restart or stop? User said "continue untill finishes".
            // Implementation: Loop through them once.
            if (index >= allMessages.length) return;

            const batch = allMessages.slice(index, index + 3);

            // Apply floating animation to this batch
            // Use callback to append safely or replace? 
            // User: "float recent 3... then take 5 sec rest then again float next 3"
            // We replace the current batch to show the new ones floating up
            setShowFloatingBatch(batch.map(m => ({
                ...m,
                uniqueId: Math.random(), // Force re-render for animation
                delay: Math.random() * 0.5
            })));

            index += 3;

            // Wait 5s total (animation + rest) before next batch
            setTimeout(processBatch, 5000);
        };

        // Start delay
        const initialDelay = setTimeout(processBatch, 1000);

        return () => {
            isCancelled = true;
            clearTimeout(initialDelay);
        };
    }, [allMessages, isOwner, isDetailsLoading]);

    // 3. Media Loading Logic (Existing)
    useEffect(() => {
        setIsMediaLoading(true);
        setShowLoadingUI(false);
        setVideoDuration(null);

        const timer = setTimeout(() => {
            setIsMediaLoading(prev => {
                if (prev) setShowLoadingUI(true);
                return prev;
            });
        }, 100);

        const safetyTimeout = setTimeout(() => setIsMediaLoading(false), 5000);

        return () => {
            clearTimeout(timer);
            clearTimeout(safetyTimeout);
        };
    }, [currentStory?.id]);

    useEffect(() => {
        if (!isMediaLoading && isFirstStoryLoad) {
            setIsFirstStoryLoad(false);
        }
    }, [isMediaLoading, isFirstStoryLoad]);

    useEffect(() => {
        const handleOnline = () => {
            if (isMediaLoading) {
                setRetryKey(prev => prev + 1);
                if (videoRef.current) videoRef.current.load();
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [isMediaLoading]);

    useEffect(() => {
        if (!currentStory) return;

        const checkLoadingStatus = () => {
            if (currentStory.type === 'IMAGE' && imgRef.current) {
                if (imgRef.current.complete) setIsMediaLoading(false);
            } else if (currentStory.type === 'VIDEO' && videoRef.current) {
                if (videoRef.current.readyState >= 3) setIsMediaLoading(false);
            }
        };

        checkLoadingStatus();
        const t = setTimeout(checkLoadingStatus, 50);
        return () => clearTimeout(t);
    }, [currentStory?.id, retryKey]);



    // 2. Playback Logic (Timer)
    useEffect(() => {
        // Auto-Pause if system loading or user interaction
        if (isPaused || isMediaLoading || showViewersModal) {
            if (currentStory?.type === 'VIDEO' && videoRef.current) {
                videoRef.current.pause();
            }
            return;
        }

        if (currentStory?.type === 'VIDEO' && videoRef.current) {
            videoRef.current.play().catch(() => { });

            const updateVideoProgress = () => {
                if (videoRef.current && !isPaused && !isMediaLoading && !showViewersModal) {
                    const duration = videoRef.current.duration;
                    const currentTime = videoRef.current.currentTime;
                    if (duration) {
                        const calculatedProgress = (currentTime / duration) * 100;
                        setProgress(calculatedProgress);
                        if (calculatedProgress >= 99.9) handleNext();
                    }
                }
            };

            const interval = setInterval(updateVideoProgress, 30);
            return () => clearInterval(interval);
        } else {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        handleNext();
                        return 100;
                    }
                    return prev + (100 / (effectiveDuration / 50));
                });
            }, 50);
            return () => clearInterval(interval);
        }
    }, [currentIndex, isPaused, isMediaLoading, effectiveDuration, currentStory?.id, showViewersModal]);

    const handleNext = () => {
        if (currentIndex < activeStories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            // Defer closing to avoid "Cannot update while rendering" error
            setTimeout(onClose, 0);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;

        const tempMessage = {
            id: 'temp-' + Date.now(),
            uniqueId: Math.random(),
            content: messageInput,
            user: currentUser,
            isSelf: true
        };

        // Animate immediately
        setShowFloatingBatch(prev => [...prev, tempMessage]);
        setMessageInput("");

        try {
            await fetch(`${LIVE_API}/api/social/stories/${currentStory.id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: tempMessage.content })
            });
        } catch (e) {
            console.error("Failed to send message", e);
        }
    };



    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xl flex items-center justify-center p-0 md:p-8"
            >
                {/* Standard Cinematic Container */}
                <div className="relative w-full md:max-w-md h-full md:h-[90vh] bg-black md:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col group border border-white/10">

                    {/* Media Display Area */}
                    <div className="absolute inset-0 z-0 bg-black">
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={currentStory.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-0"
                            >
                                {currentStory?.type === 'VIDEO' ? (
                                    <video
                                        ref={videoRef}
                                        key={`video-${currentStory.id}-${retryKey}`}
                                        src={currentStory.mediaUrl}
                                        className="w-full h-full object-contain bg-black"
                                        style={{
                                            opacity: isMediaLoading ? 0 : 1, // Clean cut, no blur
                                        }}
                                        autoPlay
                                        loop
                                        muted={isMuted}
                                        playsInline
                                        onLoadedMetadata={(e) => setVideoDuration(e.target.duration * 1000)}
                                        onLoadedData={() => setIsMediaLoading(false)}
                                        onCanPlay={() => setIsMediaLoading(false)}
                                        onWaiting={() => setIsMediaLoading(true)}
                                        onPlaying={() => setIsMediaLoading(false)}
                                        onError={() => {
                                            if (navigator.onLine) setTimeout(() => setRetryKey(k => k + 1), 2000);
                                        }}
                                    />
                                ) : (
                                    <img
                                        ref={imgRef}
                                        key={`img-${currentStory.id}-${retryKey}`}
                                        src={currentStory.mediaUrl}
                                        className="w-full h-full object-contain bg-black"
                                        style={{
                                            opacity: isMediaLoading ? 0 : 1,
                                        }}
                                        alt="Story"
                                        onLoad={() => setIsMediaLoading(false)}
                                        onError={() => {
                                            if (navigator.onLine) setTimeout(() => setRetryKey(k => k + 1), 2000);
                                        }}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Floating Messages Layer - GPU Accelerated */}
                        <div className="absolute inset-0 z-[25] pointer-events-none flex flex-col justify-end pb-32 px-6 overflow-hidden">
                            <AnimatePresence>
                                {showFloatingBatch.map((msg, i) => (
                                    <motion.div
                                        key={msg.id || msg.uniqueId}
                                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                                        animate={{
                                            opacity: [0, 1, 1, 0],
                                            y: [-20, -180 - (i * 40)],
                                            scale: [0.9, 1, 1, 0.95],
                                            // Removed dynamic filter blur for pure performance
                                        }}
                                        transition={{
                                            duration: 3.5,
                                            times: [0, 0.1, 0.8, 1],
                                            ease: [0.25, 0.1, 0.25, 1],
                                            delay: i * 0.25
                                        }}
                                        // Removed backdrop-blur-xl. Used solid semi-transparent black for stability.
                                        className="absolute bottom-0 flex items-center gap-3 bg-black/80 px-4 py-3 rounded-full border border-white/10 mb-4 max-w-[85%] will-change-transform shadow-2xl"
                                        style={{
                                            left: `${10 + (i * 2)}%`,
                                            transform: 'translate3d(0,0,0)', // Strict 3D lock
                                            backfaceVisibility: 'hidden', // Anti-flicker
                                            WebkitFontSmoothing: 'subpixel-antialiased'
                                        }}
                                    >
                                        <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shrink-0">
                                            <UserAvatar user={msg.user} className="w-full h-full" staticOnly={true} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-xs truncate max-w-[100px] drop-shadow-md">{msg.user?.username}</span>
                                            <span className="text-white/90 text-sm truncate max-w-[150px] drop-shadow-md">{msg.content}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Loading State Overlay */}
                        <AnimatePresence>
                            {showLoadingUI && isMediaLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-[60] flex flex-col items-center justify-center backdrop-blur-md bg-black/20"
                                >
                                    <div className="absolute top-8 left-4 right-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full bg-white/10" />
                                            <div className="space-y-2">
                                                <div className="w-20 h-2 bg-white/10 rounded-full" />
                                                <div className="w-10 h-1.5 bg-white/10 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                        className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full mb-4"
                                    />
                                    <p className="text-white text-[7px] uppercase tracking-[0.4em] font-bold opacity-40">Neural Sync</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Premium Vingette & Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none z-10" />
                    </div>

                    {/* Top Progress Bars */}
                    <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
                        {activeStories.map((_, idx) => (
                            <div key={idx} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-white"
                                    initial={{ width: idx < currentIndex ? '100%' : '0%' }}
                                    animate={{ width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' }}
                                    transition={{ ease: 'linear', duration: idx === currentIndex && !isPaused && !showViewersModal ? 0.05 : 0 }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Story Header */}
                    <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onUserProfileClick) onUserProfileClick(currentStory.user);
                            }}
                        >
                            <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden group-hover:scale-105 transition-transform bg-black">
                                {currentStory.user?.profileImage && currentStory.user.profileImage.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i) ? (
                                    <video
                                        src={currentStory.user.profileImage}
                                        className="w-full h-full object-cover"
                                        autoPlay muted loop playsInline
                                    />
                                ) : (
                                    <img
                                        src={currentStory.user?.profileImage || currentStory.user?.image || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                        className="w-full h-full object-cover"
                                        alt="User"
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-sm tracking-wide group-hover:text-emerald-400 transition-colors">{currentStory.user?.username}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 relative">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white hover:text-gray-300 transition-colors">
                                <MoreHorizontal size={24} />
                            </button>
                            <button onClick={() => setTimeout(onClose, 0)} className="text-white hover:text-gray-300 transition-colors"><X size={24} /></button>

                            <AnimatePresence>
                                {isMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        className="absolute top-10 right-0 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[160px] z-50 flex flex-col"
                                    >
                                        <button onClick={() => { navigator.clipboard.writeText(currentStory.mediaUrl); setIsMenuOpen(false); alert("Link Copied!"); }}
                                            className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-left transition-colors"
                                        >
                                            <Copy size={14} className="text-emerald-500" /> Copy Link
                                        </button>
                                        <div className="h-[1px] bg-white/5" />
                                        {isOwner && (
                                            <button onClick={() => { setIsMenuOpen(false); if (onDelete) onDelete(currentStory.id); }}
                                                className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider text-left transition-colors"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Navigation Areas */}
                    <div className="absolute inset-0 z-10 flex">
                        <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
                        <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
                    </div>

                    {/* Control Footer (Hidden for Owner) */}
                    {!isOwner && (
                        <div className="absolute bottom-6 left-4 right-4 z-20 flex items-center gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => { setMessageInput(e.target.value); setIsPaused(true); }}
                                    onBlur={() => setIsPaused(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSendMessage();
                                    }}
                                    placeholder="Send message..."
                                    className="w-full bg-black/20 border border-white/20 rounded-full py-3 px-6 text-white text-sm placeholder-white/70 focus:outline-none focus:border-white/50 backdrop-blur-md"
                                />
                            </div>
                            <button onClick={() => setIsLiked(!isLiked)} className="text-white hover:scale-110 transition-transform">
                                <Heart size={28} fill={isLiked ? "white" : "none"} />
                            </button>
                            <button onClick={handleSendMessage} className="text-white hover:scale-110 transition-transform">
                                <Send size={24} className="-rotate-45" />
                            </button>
                        </div>
                    )}

                    {/* View Counters & Owner Controls */}
                    {isOwner && (
                        <>
                            <div
                                onClick={(e) => { e.stopPropagation(); setShowViewersModal(true); }}
                                className="absolute bottom-6 left-4 z-30 flex items-center gap-2 cursor-pointer group"
                            >

                                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
                                    <Users size={16} className="text-white/90" />
                                </div>
                                <div className="flex items-center gap-1.5 text-white/80 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 group-hover:bg-white/10 transition-colors">
                                    {isDetailsLoading ? (
                                        <Eye size={14} className="animate-pulse opacity-50" />
                                    ) : sessionError ? (
                                        <div className="w-4 h-4 rounded-full bg-red-500/50 flex items-center justify-center border border-red-500"><X size={10} className="text-white" /></div>
                                    ) : (
                                        <Eye size={14} />
                                    )}
                                    <span className={`text-xs font-bold tracking-wide ${isDetailsLoading ? "opacity-50" : ""}`}>
                                        {isDetailsLoading ? "..." : sessionError ? "Auth Error" : `${viewers.length} views`}
                                    </span>
                                </div>
                            </div>

                            {/* Owner Share Button (Bottom Right) */}
                            <div className="absolute bottom-6 right-4 z-30">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (navigator.share) {
                                            navigator.share({ title: 'Synapse Story', url: currentStory.mediaUrl }).catch(() => { });
                                        } else {
                                            navigator.clipboard.writeText(currentStory.mediaUrl); alert("Link Copied!");
                                        }
                                    }}
                                    className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-colors"
                                >
                                    <Share size={14} />
                                    <span>Share</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Viewers Modal */}
                    <AnimatePresence>
                        {showViewersModal && (
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                className="absolute bottom-0 left-0 right-0 h-[60%] bg-[#111] rounded-t-[2rem] z-[100] border-t border-white/10 shadow-2xl flex flex-col"
                            >
                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-white font-bold text-lg px-2">Story Views</h3>
                                    <button onClick={() => setShowViewersModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {sessionError ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                                            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                                                <Lock size={32} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-lg">Recall Failed</h4>
                                                <p className="text-gray-500 text-xs mt-1">Your neural link (session) has expired.<br />Please terminate and re-initialize (Log In again).</p>
                                            </div>
                                        </div>
                                    ) : viewers.length === 0 ? (
                                        <div className="text-center text-gray-500 py-10 text-sm">No views yet</div>
                                    ) : (
                                        viewers.map((view, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="flex items-center gap-4 p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                                                onClick={() => onUserProfileClick(view.user)}
                                            >
                                                <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-black/40">
                                                    <UserAvatar user={view.user} className="w-full h-full" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-bold text-sm">{view.user?.username || "Unknown Entity"}</p>
                                                    <p className="text-gray-400 text-xs">{view.user?.name}</p>
                                                </div>
                                                {view.viewedAt && (
                                                    <span className="text-gray-500 text-[10px] font-mono">
                                                        {new Date(view.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Video Mute Control */}
                    {currentStory?.type === 'VIDEO' && (
                        <div className="absolute bottom-32 right-4 z-50">
                            <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-black/40 rounded-full backdrop-blur-md text-white/80 hover:text-white border border-white/10 shadow-lg transition-all">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence >
    );
};

export default StoryViewer;
