import React from 'react';
import { Home, Compass, Heart, MessageSquare, Monitor, BarChart2, Settings, LogOut, PlusSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i);
};

const Sidebar = ({ user, activeView, setView, onLogout, onOpenCreatePost, onMyProfileClick }) => {
    const navItems = [
        { id: 'feed', label: 'Feed', icon: <Home size={22} /> },
        { id: 'explore', label: 'Explore', icon: <Compass size={22} /> },
        { id: 'favorites', label: 'My Favorites', icon: <Heart size={22} /> },
        { id: 'direct', label: 'Direct', icon: <MessageSquare size={22} /> },
        { id: 'igtv', label: 'IG TV', icon: <Monitor size={22} /> },
        { id: 'stats', label: 'Stats', icon: <BarChart2 size={22} /> },
        { id: 'setting', label: 'Setting', icon: <Settings size={22} /> },
    ];

    return (
        <div className="w-80 h-screen fixed left-0 top-0 bg-[#050505] border-r border-white/5 flex flex-col z-40">
            {/* User Profile Summary */}
            <div className="p-10 flex flex-col items-center">
                <div className="relative mb-4 group cursor-pointer" onClick={onMyProfileClick}>
                    <div className="story-ring p-[3px] bg-black overflow-hidden rounded-full">
                        {isVideo(user.profileImage || user.image) ? (
                            <video
                                src={user.profileImage || user.image}
                                className="w-20 h-20 rounded-full object-cover border-4 border-black group-hover:scale-105 transition-transform"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        ) : (
                            <img
                                src={user.profileImage || user.image || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                alt={user.username}
                                className="w-20 h-20 rounded-full object-cover border-4 border-black group-hover:scale-105 transition-transform"
                            />
                        )}
                    </div>
                </div>
                <h3 className="text-white font-bold text-lg">{user.name || user.username}</h3>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-8">Earth, Sector 7G</p>

                <div className="flex justify-between w-full px-2">
                    <div className="stats-item">
                        <span className="stats-value">{user._count?.posts || 0}</span>
                        <span className="stats-label">Posts</span>
                    </div>
                    <div className="stats-item">
                        <span className="stats-value">{user._count?.followers || 0}</span>
                        <span className="stats-label">Followers</span>
                    </div>
                    <div className="stats-item">
                        <span className="stats-value">{user._count?.following || 0}</span>
                        <span className="stats-label">Following</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 mt-4 overflow-y-auto hide-scrollbar">
                {navItems.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`sidebar-link ${activeView === item.id ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                ))}

                {/* Create Post Button (Custom) */}
                <div
                    onClick={onOpenCreatePost}
                    className="sidebar-link group text-emerald-400"
                >
                    <PlusSquare size={22} />
                    <span className="text-sm font-bold">New Post</span>
                </div>
            </nav>

            {/* Logout */}
            <div className="p-6 border-t border-white/5">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-4 text-gray-500 hover:text-red-400 transition-colors w-full px-4 py-3"
                >
                    <LogOut size={22} />
                    <span className="text-sm font-semibold">Log out</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
