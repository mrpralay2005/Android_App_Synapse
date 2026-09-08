import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const RightSidebar = ({ suggestions = [] }) => {
    const [showAllSuggestions, setShowAllSuggestions] = useState(false);

    const allUsers = [
        { name: 'Webulstylist', location: 'Ukraine' },
        { name: 'Anghelina', location: 'Ukraine' },
        { name: 'Mais Designer', location: 'Ukraine' },
        { name: 'Vara Cherry', location: 'Ukraine' },
        { name: 'Creative Studio', location: 'USA' },
        { name: 'Design Master', location: 'UK' },
        { name: 'Art Director', location: 'France' },
        { name: 'Visual Artist', location: 'Germany' },
        { name: 'UI Expert', location: 'Canada' },
        { name: 'Brand Designer', location: 'Australia' },
        { name: 'Digital Artist', location: 'Japan' },
        { name: 'Creative Mind', location: 'Brazil' }
    ];

    return (
        <>
            <div className="w-80 h-screen fixed right-0 top-0 bg-[#050505] p-10 hidden xl:flex flex-col border-l border-white/5 space-y-12 overflow-y-auto hide-scrollbar">
                {/* Trending Feeds */}
                <div>
                    <h3 className="text-white font-bold text-sm mb-6 uppercase tracking-widest">Trending Feeds</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer group">
                                <img
                                    src={`https://picsum.photos/seed/trend${i}/300/300`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    alt="Trend"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Suggestions */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Suggestions for you</h3>
                        <button 
                            onClick={() => setShowAllSuggestions(true)}
                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            See all
                        </button>
                    </div>
                    <div className="space-y-6">
                        {allUsers.slice(0, 4).map((user, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={`https://i.pravatar.cc/100?u=${user.name}`}
                                        className="w-10 h-10 rounded-full object-cover"
                                        alt={user.name}
                                    />
                                    <div>
                                        <h4 className="text-white text-[12px] font-bold">{user.name}</h4>
                                        <p className="text-gray-500 text-[9px]">{user.location}</p>
                                    </div>
                                </div>
                                <button className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors">Follow</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Profile Activity */}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <h4 className="text-white font-bold text-sm mb-1">Profile Activity</h4>
                        <div className="flex -space-x-2 mb-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <img key={i} src={`https://i.pravatar.cc/100?u=active${i}`} className="w-6 h-6 rounded-full border border-black" alt="Active" />
                            ))}
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-white font-bold text-xl">24.3k</span>
                            <span className="text-gray-500 text-[10px] uppercase font-medium">FOLLOWER</span>
                        </div>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-4">Active now on your profile</p>
                        <p className="text-[10px] text-gray-500 leading-relaxed mb-4">
                            The perfect time for uploading your new post. <span className="text-emerald-400 cursor-pointer">Create new post</span>
                        </p>
                    </div>
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[40px] rounded-full -mr-10 -mt-10"></div>
                </div>
            </div>

            {/* See All Suggestions Modal */}
            {showAllSuggestions && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowAllSuggestions(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-white text-2xl font-bold">All Suggestions</h2>
                            <button
                                onClick={() => setShowAllSuggestions(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto max-h-[60vh] hide-scrollbar">
                            <div className="grid grid-cols-1 gap-4">
                                {allUsers.map((user, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={`https://i.pravatar.cc/100?u=${user.name}`}
                                                className="w-12 h-12 rounded-full object-cover"
                                                alt={user.name}
                                            />
                                            <div>
                                                <h4 className="text-white text-sm font-bold">{user.name}</h4>
                                                <p className="text-gray-500 text-xs">{user.location}</p>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-xl hover:bg-emerald-400 transition-colors">
                                            Follow
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </>
    );
};

export default RightSidebar;
