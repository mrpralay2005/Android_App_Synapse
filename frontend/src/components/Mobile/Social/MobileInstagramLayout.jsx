import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Search, PlusSquare, Video, User, Settings, Bell, ArrowLeft, MessageCircle, Heart, Camera, X, Trash2 } from 'lucide-react';
import Cookies from 'js-cookie';
import FeedView from './FeedView';
import ProfileView from './ProfileView';
import SettingsView from './SettingsView';
import ReelsView from './ReelsView';
import SearchView from './SearchView';
import CreatePostModal from './CreatePostModal';
import CreateStoryModal from './CreateStoryModal';
import BetaFeedbackWidget from '../../Social/BetaFeedbackWidget';

// Auto-retry fetch on 500 (Cloudflare Worker cold starts).
// Transparent to callers — same API as fetch().
const fetchWithRetry = async (url, options = {}, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
        const res = await fetch(url, options);
        if (res.status < 500 || i === retries) return res;
        await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
};
import StoryViewer from './StoryViewer';
import { ReleaseUpdateNotice } from './ReleaseUpdateCenter';
import NotificationCenter, { useNotificationCount } from './NotificationCenter';
import DirectInbox from '../../Social/DirectInbox';
import { updateActivityHeartbeat, markUserInactive } from '../../../utils/chatApi';
import PriyaAssistant from '../../Priya/PriyaAssistant';
import { saveToCache, loadFromCache } from '../../../utils/synapseCache';

const MobileInstagramLayout = ({ currentUser, onLogout }) => {
    const [view, setView] = useState(() => localStorage.getItem('synapse_mobile_social_tab') || 'feed');
    const [posts, setPosts] = useState([]);
    const [currentUserState, setCurrentUserState] = useState(currentUser);
    const [userProfile, setUserProfile] = useState(currentUser);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
    const [viewingStory, setViewingStory] = useState(false);
    const [allStories, setAllStories] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [myStories, setMyStories] = useState([]);
    const [cinemaPost, setCinemaPost] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [feedSort, setFeedSort] = useState('popular');
    const [chatUnread, setChatUnread] = useState(0);
    const [directUser, setDirectUser] = useState(null);
    const unreadNotifications = useNotificationCount();

    // ═══════════════════════════════════════════════════════════════════════════
    // Activity Heartbeat - Tracks user online/offline status globally
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        let heartbeatInterval = null;
        let inactivityTimeout = null;

        const sendHeartbeat = async () => {
            try {
                await updateActivityHeartbeat();
            } catch (err) {
                console.debug('Heartbeat failed:', err.message);
            }
        };

        const startHeartbeat = () => {
            if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
                inactivityTimeout = null;
            }
            if (heartbeatInterval) return;
            sendHeartbeat(); // Send immediately
            heartbeatInterval = setInterval(sendHeartbeat, 20000); // Every 20 seconds
        };

        const stopHeartbeat = async () => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
                inactivityTimeout = null;
            }
            try {
                await markUserInactive();
            } catch (err) {
                console.debug('Failed to mark inactive:', err.message);
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                startHeartbeat();
            } else {
                // Tab hidden: pause heartbeat interval and schedule inactive after 8s grace period
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                    heartbeatInterval = null;
                }
                if (inactivityTimeout) clearTimeout(inactivityTimeout);
                inactivityTimeout = setTimeout(() => {
                    markUserInactive().catch(() => {});
                }, 8000);
            }
        };

        // Start if tab is visible
        if (!document.hidden) {
            startHeartbeat();
        }

        // Listen to visibility changes and page exit
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', stopHeartbeat);
        window.addEventListener('beforeunload', stopHeartbeat);

        // Cleanup on unmount — clear timers, do NOT fire markUserInactive() on simple component unmounts
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', stopHeartbeat);
            window.removeEventListener('beforeunload', stopHeartbeat);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (inactivityTimeout) clearTimeout(inactivityTimeout);
        };
    }, []); // Empty deps - runs once on mount

    useEffect(() => {
        localStorage.setItem('synapse_mobile_social_tab', view);
    }, [view]);

    const handleNavigation = (newView) => {
        if (newView === view) return;
        setLoading(true);
        setView(newView);
    };

    const handleViewMyProfile = () => {
        setUserProfile(currentUserState);
        handleNavigation('profile');
    };

    useEffect(() => {
        let active = true;

        const fetchData = async () => {
            if (!active) return;

            try {
                const cachedStories = loadFromCache('synapse_stories');
                if (cachedStories && active) {
                    setAllStories(cachedStories);
                    const mine = cachedStories.filter(s => s.userId === currentUserState.id || s.userId === currentUserState.userId);
                    setMyStories(mine);
                }

                const cachedSuggested = loadFromCache('synapse_suggested');
                if (cachedSuggested && active) {
                    setSuggestedUsers(cachedSuggested.filter(user =>
                        user?.role !== 'ADMIN' && user?.username?.toUpperCase() !== 'ADMIN'
                    ));
                }

                // Only show loading spinner if no cached data exists
                let hasCachedData = false;
                if (view === 'feed' || view === 'reels') {
                    const cachedFeed = loadFromCache('synapse_feed_posts');
                    if (cachedFeed && Array.isArray(cachedFeed) && active) {
                        setPosts(cachedFeed);
                        hasCachedData = true;
                    }
                } else if (view === 'profile') {
                    const profileId = userProfile?.username || currentUser.username;
                    const cachedProfile = loadFromCache(`synapse_profile_${profileId}`);
                    if (cachedProfile && active) {
                        setUserProfile(cachedProfile);
                        setPosts(cachedProfile.posts || []);
                        hasCachedData = true;
                    }
                }

                if (!hasCachedData) setLoading(true);

                const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
                const token = Cookies.get('synapse_token');
                const fetchOptions = {
                    method: 'GET',
                    headers: { ...(token && { Authorization: `Bearer ${token}` }) }
                };

                const storyRes = await fetchWithRetry(`${apiUrl}/api/social/stories`, fetchOptions);
                const storyData = await storyRes.json();
                if (active && storyData.success) {
                    console.log('[Story Debug] All stories fetched:', storyData.data.length);
                    setAllStories(storyData.data);
                    saveToCache('synapse_stories', storyData.data);
                    const mine = storyData.data.filter(s => s.userId === currentUserState.id || s.userId === currentUserState.userId);
                    console.log('[Story Debug] My stories filtered:', mine.length, 'Current user ID:', currentUserState.id || currentUserState.userId);
                    setMyStories(mine);
                }

                const userRes = await fetch(`${apiUrl}/api/user/suggested?limit=10`, fetchOptions);
                const userData = await userRes.json();
                if (active && userData.success) {
                    const publicSuggestions = userData.data.filter(user =>
                        user?.role !== 'ADMIN' && user?.username?.toUpperCase() !== 'ADMIN'
                    );
                    setSuggestedUsers(publicSuggestions);
                    saveToCache('synapse_suggested', publicSuggestions);
                }

                if (view === 'feed' || view === 'reels') {
                    const res = await fetchWithRetry(`${apiUrl}/api/social/feed?sort=${feedSort}`, fetchOptions);
                    const data = await res.json();
                    if (active) {
                        const newPosts = Array.isArray(data) ? data : [];
                        setPosts(newPosts);
                        saveToCache('synapse_feed_posts', newPosts);
                    }
                } else if (view === 'profile') {
                    const profileToFetch = userProfile?.username || currentUser.username;
                    const res = await fetch(`${apiUrl}/api/user/profile/${encodeURIComponent(profileToFetch)}`, fetchOptions);
                    const data = await res.json();
                    const profileData = data.data || data;
                    if (active) {
                        setUserProfile(profileData);
                        setPosts(profileData.posts || []);
                        saveToCache(`synapse_profile_${profileToFetch}`, profileData);
                    }
                }
            } catch (error) {
                console.error('Mobile sync failed:', error);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();
        return () => { active = false; };
    }, [view, currentUser, refreshTrigger, userProfile?.username, feedSort]);

    const handleUpdateUser = (newData) => {
        const profileImage = newData.profileImage || newData.image || currentUserState.profileImage || currentUserState.image;
        const updated = { ...currentUserState, ...newData, image: profileImage, profileImage };
        setCurrentUserState(updated);
        localStorage.setItem('synapse_user_data', JSON.stringify(updated));
        if (userProfile?.id === updated.id || userProfile?.userId === updated.id) {
            setUserProfile(updated);
        }
    };

    const handleFollowChange = ({ targetUserId, following, targetFollowers, viewerFollowing }) => {
        const sameUser = (candidate) => String(candidate?.id ?? candidate?.userId) === String(targetUserId);
        setUserProfile(previous => {
            if (!sameUser(previous)) return previous;
            const wasFollowing = Boolean(previous.isFollowing);
            const followerDelta = following === wasFollowing ? 0 : (following ? 1 : -1);
            return {
                ...previous,
                isFollowing: following,
                _count: {
                    ...previous._count,
                    followers: targetFollowers ?? Math.max(0, (previous._count?.followers ?? 0) + followerDelta)
                }
            };
        });
        setCurrentUserState(previous => {
            const followingDelta = following ? 1 : -1;
            return {
                ...previous,
                _count: {
                    ...previous._count,
                    following: viewerFollowing ?? Math.max(0, (previous._count?.following ?? 0) + followingDelta)
                }
            };
        });
    };

    const handleCreatePost = async (postData) => {
        const uploadId = `POST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`\n[${uploadId}] ========== POST UPLOAD STARTED (v2.0 - R2_ALWAYS) ==========`);
        console.log(`[${uploadId}] Timestamp:`, new Date().toISOString());
        console.log(`[${uploadId}] Post Data:`, {
            hasRawFile: !!postData.rawFile,
            fileSize: postData.rawFile?.size,
            fileName: postData.rawFile?.name,
            fileType: postData.rawFile?.type,
            type: postData.type,
            captionLength: postData.caption?.length,
            hasPassword: !!postData.postPassword
        });

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
            const token = Cookies.get('synapse_token');
            let finalMediaUrl = postData.mediaUrl;

            console.log(`[${uploadId}] API URL:`, apiUrl);
            console.log(`[${uploadId}] Has Token:`, !!token);
            console.log(`[${uploadId}] 🔍 CHECKING rawFile:`, postData.rawFile);
            console.log(`[${uploadId}] 🔍 rawFile is truthy?`, !!postData.rawFile);

            if (postData.rawFile) {
                const isVideo = postData.type === 'VIDEO';
                const isLarge = postData.rawFile.size > 800000;
                console.log(`[${uploadId}] File Check:`, { isVideo, isLarge, needsCloudUpload: isVideo || isLarge });

                // ALWAYS use cloud upload for better reliability (base64 can exceed 1MB)
                if (postData.rawFile) {
                    console.log(`[${uploadId}] STEP 1: Requesting upload URL from backend...`);
                    const uploadUrlStartTime = Date.now();
                    
                    const uploadUrlRes = await fetch(`${apiUrl}/api/social/upload-url`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token && { Authorization: `Bearer ${token}` })
                        },
                        body: JSON.stringify({
                            fileName: postData.rawFile.name,
                            fileType: postData.rawFile.type
                        })
                    });

                    const uploadUrlDuration = Date.now() - uploadUrlStartTime;
                    console.log(`[${uploadId}] STEP 1 Response:`, { 
                        status: uploadUrlRes.status, 
                        ok: uploadUrlRes.ok,
                        duration: `${uploadUrlDuration}ms`
                    });

                    if (!uploadUrlRes.ok) {
                        console.error(`[${uploadId}] ❌ FAILED: Could not get upload URL`);
                        return false;
                    }

                    const { uploadUrl, publicUrl } = await uploadUrlRes.json();
                    console.log(`[${uploadId}] ✅ Got upload URL, Public URL:`, publicUrl);

                    console.log(`[${uploadId}] STEP 2: Uploading file to cloud storage...`);
                    const storageStartTime = Date.now();

                    const storageRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: postData.rawFile,
                        headers: { 'Content-Type': postData.rawFile.type }
                    });

                    const storageDuration = Date.now() - storageStartTime;
                    console.log(`[${uploadId}] STEP 2 Response:`, { 
                        status: storageRes.status, 
                        ok: storageRes.ok,
                        duration: `${storageDuration}ms`
                    });

                    if (!storageRes.ok) {
                        console.error(`[${uploadId}] ❌ FAILED: Cloud storage upload failed`);
                        return false;
                    }

                    finalMediaUrl = publicUrl;
                    console.log(`[${uploadId}] ✅ Cloud upload successful`);
                }
            } else {
                console.log(`[${uploadId}] No raw file provided, using provided mediaUrl`);
            }

            console.log(`[${uploadId}] STEP 3: Creating post in database...`);
            const dbStartTime = Date.now();

            const postPayload = {
                uploadId,  // ← Instagram-style idempotency key
                caption: postData.caption,
                mediaUrl: finalMediaUrl,
                type: postData.type,
                postPassword: postData.postPassword
            };
            console.log(`[${uploadId}] Post Payload:`, {
                uploadId,
                captionLength: postPayload.caption?.length,
                mediaUrlLength: postPayload.mediaUrl?.length,
                type: postPayload.type,
                hasPassword: !!postPayload.postPassword
            });

            const res = await fetch(`${apiUrl}/api/social/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify(postPayload)
            });

            const dbDuration = Date.now() - dbStartTime;
            console.log(`[${uploadId}] STEP 3 Response:`, { 
                status: res.status, 
                ok: res.ok,
                duration: `${dbDuration}ms`
            });

            if (res.ok) {
                const responseData = await res.json();
                console.log(`[${uploadId}] ✅ POST CREATED SUCCESSFULLY`);
                console.log(`[${uploadId}] Response Data:`, responseData);
                console.log(`[${uploadId}] Total Upload Duration:`, Date.now() - parseInt(uploadId.split('_')[1]), 'ms');
                console.log(`[${uploadId}] ========== POST UPLOAD COMPLETE ==========\n`);
                
                setRefreshTrigger(prev => prev + 1);
                return true;
            } else {
                const errorText = await res.text();
                console.error(`[${uploadId}] ❌ FAILED: Post creation failed`);
                console.error(`[${uploadId}] Error Response:`, errorText);
                return false;
            }
        } catch (err) {
            console.error(`[${uploadId}] ❌ EXCEPTION CAUGHT:`, err);
            console.error(`[${uploadId}] Error Message:`, err.message);
            console.error(`[${uploadId}] Error Stack:`, err.stack);
            console.error(`[${uploadId}] ========== POST UPLOAD FAILED ==========\n`);
            return false;
        }
    };

    const handleStoryUpload = async (storyData) => {
        console.log('[Story Upload] Starting upload...', { hasRawFile: !!storyData.rawFile, type: storyData.type });
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
            const token = Cookies.get('synapse_token');
            let finalMediaUrl = null;

            if (storyData.rawFile) {
                console.log('[Story Upload] Getting upload URL...');
                const uploadUrlRes = await fetch(`${apiUrl}/api/social/upload-url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { Authorization: `Bearer ${token}` })
                    },
                    body: JSON.stringify({ fileName: storyData.rawFile.name, fileType: storyData.rawFile.type })
                });

                if (!uploadUrlRes.ok) {
                    console.error('[Story Upload] Failed to get upload URL');
                    return false;
                }

                const { uploadUrl, publicUrl } = await uploadUrlRes.json();
                console.log('[Story Upload] Uploading to cloud storage...');
                const storageRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: storyData.rawFile,
                    headers: { 'Content-Type': storyData.rawFile.type }
                });

                if (!storageRes.ok) {
                    console.error('[Story Upload] Cloud storage upload failed');
                    return false;
                }

                finalMediaUrl = publicUrl;
                console.log('[Story Upload] Cloud upload successful:', finalMediaUrl);
            } else {
                // No raw file - shouldn't happen but fallback
                console.error('[Story Upload] No raw file provided');
                return false;
            }

            console.log('[Story Upload] Creating story in database...');
            const res = await fetch(`${apiUrl}/api/social/stories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({ mediaUrl: finalMediaUrl, type: storyData.type })
            });

            const result = await res.json();
            console.log('[Story Upload] Server response:', result);

            if (res.ok) {
                console.log('[Story Upload] Success! Triggering refresh...');
                setRefreshTrigger(prev => prev + 1);
                return true;
            }
            console.error('[Story Upload] Failed:', result);
            return false;
        } catch (err) {
            console.error('[Story Upload] Error:', err);
            return false;
        }
    };

    const handleDeleteStory = async (storyId) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
            const token = Cookies.get('synapse_token');
            const res = await fetch(`${apiUrl}/api/social/stories/${storyId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
                return true;
            }
        } catch (err) {
            console.error('Delete story failed:', err);
        }
        return false;
    };

    const handleDeletePost = async () => {
        if (!postToDelete) return;
        
        try {
            const token = Cookies.get('synapse_token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev'}/api/social/posts/${postToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.ok) {
                setShowDeleteConfirm(false);
                setPostToDelete(null);
                setCinemaPost(null);
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Delete post failed:', err);
        }
    };

    const handleAddStoryClick = () => setIsStoryModalOpen(true);

    const handleMyStoryClick = () => {
        if (myStories.length > 0) {
            setViewingStory(myStories);
        } else {
            setIsStoryModalOpen(true);
        }
    };

    const navItems = [
        { id: 'feed', label: 'Home', icon: <Home size={22} /> },
        { id: 'search', label: 'Search', icon: <Search size={22} /> },
        { id: 'direct', label: 'Direct', icon: <MessageCircle size={22} /> },
        { id: 'create', label: 'Create', icon: <PlusSquare size={22} /> },
        { id: 'reels', label: 'Reels', icon: <Video size={22} /> },
        { id: 'profile', label: 'Profile', icon: <User size={22} /> }
    ];

    const renderMainContent = () => {
        if (view === 'feed') {
            return (
                <FeedView
                    posts={posts}
                    stories={allStories}
                    suggestedUsers={suggestedUsers}
                    onCreateClick={handleAddStoryClick}
                    loading={loading}
                    onCinemaMode={setCinemaPost}
                    myStories={myStories}
                    onMyStoryClick={handleMyStoryClick}
                    currentUser={currentUserState}
                    feedSort={feedSort}
                    onFeedSortChange={setFeedSort}
                    onStoryClick={(item) => {
                        const userStories = allStories.filter(s => s.userId === item.userId);
                        setViewingStory(userStories);
                    }}
                    onUserProfileClick={(user) => {
                        setUserProfile(user);
                        handleNavigation('profile');
                    }}
                />
            );
        }

        if (view === 'profile') {
            return (
                <ProfileView
                    user={userProfile}
                    currentUser={currentUserState}
                    posts={posts}
                    loading={loading}
                    onOpenCreatePost={() => setIsPostModalOpen(true)}
                    onCinemaMode={setCinemaPost}
                    onUpdateUser={handleUpdateUser}
                    onFollowChange={handleFollowChange}
                    onClose={() => handleNavigation('feed')}
                    onMessage={(user) => {
                        setDirectUser(user);
                        handleNavigation('direct');
                    }}
                />
            );
        }

        if (view === 'reels') {
            return <ReelsView 
                posts={posts} 
                loading={loading} 
                currentUser={currentUserState}
                onProfileClick={(user) => {
                    setUserProfile(user);
                    handleNavigation('profile');
                }}
            />;
        }

        if (view === 'search') {
            return (
                <SearchView
                    onUserSelect={(user) => {
                        setUserProfile(user);
                        handleNavigation('profile');
                    }}
                />
            );
        }

        if (view === 'direct') {
            return (
                <div className="h-full">
                    <DirectInbox
                        currentUser={currentUserState}
                        initialUser={directUser}
                        onConsumed={() => setDirectUser(null)}
                        onUnreadChange={(n) => setChatUnread(n)}
                        onExit={() => { setDirectUser(null); handleNavigation('feed'); }}
                    />
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center min-h-[50vh] text-gray-500 uppercase tracking-[0.4em] text-[10px]">
                Setting up
            </div>
        );
    };

    if (view === 'setting') {
        return (
            <div className="md:hidden fixed inset-0 z-[120] bg-[#0a0a0a] text-white" style={{ height: '100vh', width: '100vw', overflow: 'hidden', maxWidth: '100vw' }}>
                <SettingsView
                    user={currentUserState}
                    onUpdateUser={handleUpdateUser}
                    onLogout={onLogout}
                    onBack={() => handleNavigation('feed')}
                />
            </div>
        );
    }

    return (
        <div className="synapse-social-shell md:hidden bg-[#0a0a0a] text-white" style={{ height: 'calc(100vh - 18px)', width: '100vw', overflow: 'hidden', position: 'fixed', inset: '9px 0 0 0', maxWidth: '100vw', maxHeight: 'calc(100vh - 18px)', overscrollBehavior: 'none', boxSizing: 'border-box', margin: 0, padding: 0, left: 0, right: 0 }}>
            <div className="synapse-social-frame h-full relative pb-24 bg-[#0a0a0a]" style={{ overflow: 'hidden', width: '100%', maxWidth: '100vw', margin: 0, padding: 0 }}>
                <header className="z-40 bg-[#0a0a0a]/90 px-4 pt-2 pb-1.5">
                    {view === 'profile' ? (
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => handleNavigation('feed')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-white"
                                aria-label="Back to feed"
                            >
                                <ArrowLeft size={18} />
                            </button>

                            <div className="flex-1 text-center text-[1.85rem] font-black leading-none tracking-[-0.08em] text-white">
                                {userProfile?.username || 'Profile'}
                            </div>

                            <button
                                onClick={() => handleNavigation('setting')}
                                className="flex h-9 w-9 items-center justify-center text-white"
                                aria-label="Open settings"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    ) : (view === 'search' || view === 'reels') ? (
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => handleNavigation('feed')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-white"
                                aria-label="Back to feed"
                            >
                                <ArrowLeft size={18} />
                            </button>

                            <div className="flex-1 text-center text-[1.85rem] font-black leading-none tracking-[-0.08em] text-white">
                                {view === 'search' ? 'Search' : 'Reels'}
                            </div>

                            <div className="w-9" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-4">
                            <div
                                className="synapse-brand select-none text-[1.7rem] leading-none text-white"
                                style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontWeight: 700, letterSpacing: '-0.08em' }}
                            >
                                SynapseX
                            </div>

                            <div className="flex items-center gap-4 text-white">
                                <button
                                    onClick={() => setIsPostModalOpen(true)}
                                    className="transition-transform active:scale-90"
                                    aria-label="Create post"
                                >
                                    <PlusSquare size={21} strokeWidth={2.1} />
                                </button>
                                <button onClick={() => handleNavigation('direct')} className="relative transition-transform active:scale-90" aria-label={`Direct messages${chatUnread ? `, ${chatUnread} unread` : ''}`}>
                                    <MessageCircle size={21} strokeWidth={2.1} />
                                    {chatUnread > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#0a0a0a] bg-emerald-400 px-1 text-[9px] font-black text-black">{chatUnread > 9 ? '9+' : chatUnread}</span>}
                                </button>
                                <button onClick={() => setNotificationsOpen(true)} className="relative transition-transform active:scale-90" aria-label={`Activity${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}>
                                    <Heart size={21} strokeWidth={2.1} />
                                    {unreadNotifications > 0 && <><span className="synapse-notification-ping absolute -right-2 -top-2 h-4 w-4 animate-ping rounded-full bg-emerald-400/55" aria-hidden="true" /><span className="synapse-notification-badge absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#0a0a0a] bg-emerald-400 px-1 text-[9px] font-black text-black">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span></>}
                                </button>
                                <button
                                    onClick={() => handleNavigation('setting')}
                                    className="transition-transform active:scale-90"
                                    aria-label="Open settings"
                                >
                                    <Settings size={21} strokeWidth={2.1} />
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                <div className="px-4 pb-3 overflow-y-auto hide-scrollbar" style={{ height: 'calc(100% - 110px)', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                    {renderMainContent()}
                </div>

                <motion.nav
                    initial={false}
                    animate={{ 
                        y: (view === 'direct' || view === 'reels' || view === 'profile' || view === 'search') ? 120 : 0,
                        opacity: (view === 'direct' || view === 'reels' || view === 'profile' || view === 'search') ? 0 : 1
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="synapse-bottom-nav absolute bottom-12 left-3 right-3 z-50 overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#101111]/95 shadow-[0_-8px_24px_rgba(0,0,0,0.32)]"
                >
                    <div className="grid grid-cols-6 gap-1 px-2 py-1.5" style={{ width: '100%', maxWidth: '100vw' }}>
                        {loading && view === 'feed' ? [0, 1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="synapse-nav-skeleton flex flex-col items-center justify-center gap-1 py-1 animate-pulse" aria-hidden="true">
                                <div className="h-10 w-10 rounded-2xl bg-white/[0.07]" />
                                <div className="h-2 w-7 rounded-full bg-white/[0.07]" />
                            </div>
                        )) : navItems.map((item) => {
                            const active = item.id === view || (item.id === 'profile' && view === 'profile');
                            const onClick = () => {
                                if (item.id === 'create') {
                                    setIsPostModalOpen(true);
                                    return;
                                }
                                if (item.id === 'profile') {
                                    handleViewMyProfile();
                                    return;
                                }
                                handleNavigation(item.id);
                            };

                            return (
                                <button
                                    key={item.id}
                                    onClick={onClick}
                                    className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-medium ${active ? 'text-white' : 'text-gray-500'}`}
                                >
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 ${active ? 'border-emerald-400/25 bg-emerald-400/15 text-emerald-300 shadow-[0_5px_16px_rgba(16,185,129,0.12)]' : 'border-white/[0.06] bg-white/[0.035] text-gray-400 active:scale-95'}`}>
                                        {item.icon}
                                    </div>
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </motion.nav>
            </div>

            <AnimatePresence>
                {isPostModalOpen && (
                    <CreatePostModal
                        isOpen={isPostModalOpen}
                        onClose={() => setIsPostModalOpen(false)}
                        onSubmit={handleCreatePost}
                        user={currentUserState}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isStoryModalOpen && (
                    <CreateStoryModal
                        isOpen={isStoryModalOpen}
                        onClose={() => setIsStoryModalOpen(false)}
                        onSubmit={handleStoryUpload}
                        user={currentUserState}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewingStory && Array.isArray(viewingStory) && viewingStory.length > 0 && (
                    <StoryViewer
                        stories={viewingStory}
                        initialStoryIndex={0}
                        onClose={() => {
                            setViewingStory(false);
                            // Refresh stories to update view status (ring colors)
                            setRefreshTrigger(prev => prev + 1);
                        }}
                        onDelete={handleDeleteStory}
                        currentUser={currentUserState}
                        onUserProfileClick={(user) => {
                            setViewingStory(false);
                            setUserProfile(user);
                            handleNavigation('profile');
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {cinemaPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4"
                        onClick={() => setCinemaPost(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-black"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-4 right-4 z-20 flex gap-2">
                                {cinemaPost.userId === currentUserState?.id && (
                                    <button 
                                        onClick={() => {
                                            setPostToDelete(cinemaPost);
                                            setShowDeleteConfirm(true);
                                        }} 
                                        className="p-2 rounded-full bg-red-500/20 border border-red-500/30 hover:bg-red-500 hover:border-red-500 transition-all"
                                    >
                                        <Trash2 size={18} className="text-red-500 hover:text-black" />
                                    </button>
                                )}
                                <button onClick={() => setCinemaPost(null)} className="p-2 rounded-full bg-black/60 border border-white/10">
                                    <X size={18} />
                                </button>
                            </div>
                            {cinemaPost.type === 'VIDEO' ? (
                                <video src={cinemaPost.mediaUrl} className="w-full h-[72vh] object-cover" controls autoPlay playsInline />
                            ) : (
                                <img src={cinemaPost.mediaUrl} className="w-full h-[72vh] object-cover" alt="cinema" />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-sm bg-[#1a1a1a] border border-red-500/30 rounded-3xl p-8 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Warning Icon */}
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-red-500/10 rounded-full border-2 border-red-500/30">
                                    <Trash2 size={32} className="text-red-500" />
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-white text-xl font-bold text-center mb-3">
                                Delete Post?
                            </h3>

                            {/* Message */}
                            <p className="text-gray-400 text-sm text-center mb-8">
                                This action cannot be undone. Your post will be permanently removed from the Neural Network.
                            </p>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeletePost}
                                    className="flex-1 py-3 bg-red-500 rounded-2xl text-black font-bold text-sm uppercase tracking-wider hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ReleaseUpdateNotice />
            <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
            {/* Priya AI assistant — only in Direct/chat view, above nav bar */}
            {view === 'direct' && <PriyaAssistant />}
            {/* Beta Feedback Widget - only for beta testers */}
            {currentUserState?.isBetaTester && <BetaFeedbackWidget />}
        </div>
    );
};

export default MobileInstagramLayout;
