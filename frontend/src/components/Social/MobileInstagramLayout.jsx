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
import { saveToCache, loadFromCache } from '../../utils/synapseCache';

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
                if (cachedSuggested && active) setSuggestedUsers(cachedSuggested);

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

                const apiUrl = 'https://synapse-backend.mrpralay2005.workers.dev';
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
                    setSuggestedUsers(userData.data);
                    saveToCache('synapse_suggested', userData.data);
                }

                if (view === 'feed' || view === 'reels') {
                    const res = await fetch(`${apiUrl}/api/social/feed`, fetchOptions);
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
    }, [view, currentUser, refreshTrigger, userProfile?.username]);

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
            const apiUrl = 'https://synapse-backend.mrpralay2005.workers.dev';
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
            const apiUrl = 'https://synapse-backend.mrpralay2005.workers.dev';
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
            const apiUrl = 'https://synapse-backend.mrpralay2005.workers.dev';
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

        if (view === 'setting') {
            return (
                <SettingsView
                    user={currentUserState}
                    onUpdateUser={handleUpdateUser}
                    onLogout={onLogout}
                />
            );
        }

        return (
            <div className="flex items-center justify-center min-h-[50vh] text-gray-500 uppercase tracking-[0.4em] text-[10px]">
                Setting up
            </div>
        );
    };

    return (
        <div className="md:hidden min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-md mx-auto min-h-screen relative pb-24 bg-[#0a0a0a]">
                <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 text-white">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                                2:06
                            </div>
                            <div className="flex gap-1">
                                {[1,2,3,4].map((dot) => (
                                    <span key={dot} className="w-2 h-2 rounded-full bg-emerald-400/90" />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                            <Bell size={18} />
                            <MessageCircle size={18} />
                        </div>
                    </div>
                </header>

                <div className="px-4 pt-3">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={view === 'profile' ? () => handleNavigation('feed') : () => setIsPostModalOpen(true)}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white"
                        >
                            {view === 'profile' ? <ArrowLeft size={18} /> : '+'}
                        </button>

                        <div className="text-2xl font-black tracking-tight text-white">
                            {view === 'profile' ? (userProfile?.username || 'Profile') : 'Instagram'}
                        </div>

                        <div className="flex items-center gap-3">
                            <Heart size={20} className="text-white" />
                            <Settings size={20} className="text-white" onClick={() => handleNavigation('setting')} />
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-4">
                    {renderMainContent()}
                </div>

                <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl">
                    <div className="max-w-md mx-auto grid grid-cols-5 gap-1 px-3 py-2">
                        {navItems.map((item) => {
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
                                    className={`flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium ${active ? 'text-white' : 'text-gray-500'}`}
                                >
                                    <div className={`transition-colors ${active ? 'text-white' : 'text-gray-500'}`}>
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
        </div>
    );
};

export default MobileInstagramLayout;
