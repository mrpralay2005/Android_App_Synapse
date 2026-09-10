import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Search, PlusSquare, Video, User, Settings, Bell, ArrowLeft, MessageCircle, Heart, Camera, X } from 'lucide-react';
import Cookies from 'js-cookie';
import FeedView from './FeedView';
import ProfileView from './ProfileView';
import SettingsView from './SettingsView';
import ReelsView from './ReelsView';
import CreatePostModal from './CreatePostModal';
import CreateStoryModal from './CreateStoryModal';
import StoryViewer from './StoryViewer';
import { ReleaseUpdateNotice } from './ReleaseUpdateCenter';
import NotificationCenter, { useNotificationCount } from './NotificationCenter';
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
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [feedSort, setFeedSort] = useState('popular');
    const unreadNotifications = useNotificationCount();

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
            setLoading(true);

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

                if (view === 'feed' || view === 'reels') {
                    const cachedFeed = loadFromCache('synapse_feed_posts');
                    if (cachedFeed && Array.isArray(cachedFeed) && active) {
                        setPosts(cachedFeed);
                    }
                } else if (view === 'profile') {
                    const profileId = userProfile?.username || currentUser.username;
                    const cachedProfile = loadFromCache(`synapse_profile_${profileId}`);
                    if (cachedProfile && active) {
                        setUserProfile(cachedProfile);
                        setPosts(cachedProfile.posts || []);
                    }
                }

                const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
                const token = Cookies.get('synapse_token');
                const fetchOptions = {
                    method: 'GET',
                    headers: { ...(token && { Authorization: `Bearer ${token}` }) }
                };

                const storyRes = await fetch(`${apiUrl}/api/social/stories`, fetchOptions);
                const storyData = await storyRes.json();
                if (active && storyData.success) {
                    setAllStories(storyData.data);
                    saveToCache('synapse_stories', storyData.data);
                    const mine = storyData.data.filter(s => s.userId === currentUserState.id || s.userId === currentUserState.userId);
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
                    const res = await fetch(`${apiUrl}/api/social/feed?sort=${feedSort}`, fetchOptions);
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

    const handleCreatePost = async (postData) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
            const token = Cookies.get('synapse_token');
            let finalMediaUrl = postData.mediaUrl;

            if (postData.rawFile) {
                const isVideo = postData.type === 'VIDEO';
                const isLarge = postData.rawFile.size > 800000;
                if (isVideo || isLarge) {
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

                    if (!uploadUrlRes.ok) return false;
                    const { uploadUrl, publicUrl } = await uploadUrlRes.json();
                    const storageRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: postData.rawFile,
                        headers: { 'Content-Type': postData.rawFile.type }
                    });
                    if (!storageRes.ok) return false;
                    finalMediaUrl = publicUrl;
                }
            }

            const res = await fetch(`${apiUrl}/api/social/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({
                    caption: postData.caption,
                    mediaUrl: finalMediaUrl,
                    type: postData.type,
                    postPassword: postData.postPassword
                })
            });

            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Mobile create post failed:', err);
            return false;
        }
    };

    const handleStoryUpload = async (storyData) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
            const token = Cookies.get('synapse_token');
            let finalMediaUrl = storyData.mediaUrl;

            if (storyData.rawFile) {
                const uploadUrlRes = await fetch(`${apiUrl}/api/social/upload-url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { Authorization: `Bearer ${token}` })
                    },
                    body: JSON.stringify({ fileName: storyData.rawFile.name, fileType: storyData.rawFile.type })
                });

                if (uploadUrlRes.ok) {
                    const { uploadUrl, publicUrl } = await uploadUrlRes.json();
                    const storageRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: storyData.rawFile,
                        headers: { 'Content-Type': storyData.rawFile.type }
                    });
                    if (storageRes.ok) finalMediaUrl = publicUrl;
                }
            }

            const res = await fetch(`${apiUrl}/api/social/stories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({ mediaUrl: finalMediaUrl, type: storyData.type })
            });

            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Mobile story upload failed:', err);
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
                    onClose={() => handleNavigation('feed')}
                />
            );
        }

        if (view === 'reels') {
            return <ReelsView posts={posts} loading={loading} />;
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
        <div className="md:hidden bg-[#0a0a0a] text-white" style={{ height: 'calc(100vh - 18px)', width: '100vw', overflow: 'hidden', position: 'fixed', inset: '9px 0 0 0', maxWidth: '100vw', maxHeight: 'calc(100vh - 18px)', overscrollBehavior: 'none', boxSizing: 'border-box', margin: 0, padding: 0, left: 0, right: 0 }}>
            <div className="h-full relative pb-36 bg-[#0a0a0a]" style={{ overflow: 'hidden', width: '100%', maxWidth: '100vw', margin: 0, padding: 0 }}>
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
                    ) : (
                        <div className="flex items-center justify-between gap-4">
                            <div
                                className="select-none text-[1.7rem] leading-none text-white"
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
                                <button onClick={() => setNotificationsOpen(true)} className="relative transition-transform active:scale-90" aria-label={`Activity${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}>
                                    <Heart size={21} strokeWidth={2.1} />
                                    {unreadNotifications > 0 && <><span className="absolute -right-2 -top-2 h-4 w-4 animate-ping rounded-full bg-emerald-400/55" aria-hidden="true" /><span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#0a0a0a] bg-emerald-400 px-1 text-[9px] font-black text-black">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span></>}
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

                <div className="px-4 pb-3 overflow-y-auto hide-scrollbar" style={{ height: 'calc(100% - 140px)', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                    {renderMainContent()}
                </div>

                <nav
                    className="absolute bottom-12 left-3 right-3 z-50 overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#101111]/95 shadow-[0_-8px_24px_rgba(0,0,0,0.32)]"
                    style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
                >
                    <div className="grid grid-cols-5 gap-1 px-2 py-1.5" style={{ width: '100%', maxWidth: '100vw' }}>
                        {loading && view === 'feed' ? [0, 1, 2, 3, 4].map((item) => (
                            <div key={item} className="flex flex-col items-center justify-center gap-1 py-1 animate-pulse" aria-hidden="true">
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
                </nav>
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
                        onClose={() => setViewingStory(false)}
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
                            <div className="absolute top-4 right-4 z-20">
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
            <ReleaseUpdateNotice />
            <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        </div>
    );
};

export default MobileInstagramLayout;
