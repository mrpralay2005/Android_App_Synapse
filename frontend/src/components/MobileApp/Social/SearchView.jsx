import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Loader2, Lock, Search, Sparkles, User, X } from 'lucide-react';
import Cookies from 'js-cookie';

const avatarFallback = 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg';

const isVideo = (url) => /\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i.test(url || '');

const SearchView = ({ onUserSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const searchTerm = query.normalize('NFKC').trim();
        if (!searchTerm) {
            setResults([]);
            setError('');
            setIsSearching(false);
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setIsSearching(true);
            setError('');

            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
                const token = Cookies.get('synapse_token');
                const response = await fetch(`${apiUrl}/api/user/search?q=${encodeURIComponent(searchTerm)}&limit=12`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    signal: controller.signal
                });
                const data = await response.json();
                if (!response.ok || !data.success || !Array.isArray(data.data)) {
                    throw new Error(data?.error || 'Search is unavailable right now.');
                }
                setResults(data.data);
            } catch (requestError) {
                if (requestError.name !== 'AbortError') {
                    setResults([]);
                    setError(requestError.message || 'Search is unavailable right now.');
                }
            } finally {
                if (!controller.signal.aborted) setIsSearching(false);
            }
        }, 260);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [query]);

    const hasQuery = Boolean(query.trim());

    return (
        <section className="mx-auto w-full max-w-xl pb-5 pt-2">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-gradient-to-br from-emerald-400/[0.10] via-[#151716] to-violet-500/[0.08] px-5 py-5 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-300/15 blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 text-emerald-200">
                        <Sparkles size={15} />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em]">Discover people</span>
                    </div>
                    <h1 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">Search SynapseX</h1>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">Find people by their name or @username.</p>

                    <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3.5 shadow-inner shadow-black/20 transition focus-within:border-emerald-300/50 focus-within:bg-black/50">
                        {isSearching ? <Loader2 size={18} className="shrink-0 animate-spin text-emerald-300" /> : <Search size={18} className="shrink-0 text-gray-400" />}
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search people"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck="false"
                            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-gray-600"
                        />
                        {hasQuery && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-gray-400 transition hover:bg-white/[0.14] hover:text-white"
                                aria-label="Clear search"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </label>
                </div>
            </div>

            <div className="mt-5">
                {!hasQuery && (
                    <div className="rounded-[1.6rem] border border-dashed border-white/[0.09] bg-white/[0.02] px-6 py-12 text-center">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] text-emerald-300">
                            <User size={23} />
                        </div>
                        <p className="mt-4 text-sm font-bold text-white">Find your people</p>
                        <p className="mx-auto mt-2 max-w-[17rem] text-xs leading-relaxed text-gray-500">Type a name or username to search real SynapseX profiles.</p>
                    </div>
                )}

                {error && <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-center text-xs leading-relaxed text-red-200">{error}</p>}

                {hasQuery && !isSearching && !error && results.length === 0 && (
                    <div className="rounded-[1.6rem] border border-dashed border-white/[0.09] bg-white/[0.02] px-6 py-12 text-center">
                        <Search className="mx-auto text-gray-600" size={25} />
                        <p className="mt-4 text-sm font-bold text-white">No profiles found</p>
                        <p className="mt-2 text-xs leading-relaxed text-gray-500">Try a shorter name or a different @username.</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-2">
                        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.17em] text-gray-500">People</p>
                        {results.map((user, index) => (
                            <motion.button
                                type="button"
                                key={user.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.18, delay: Math.min(index * 0.035, 0.2) }}
                                onClick={() => onUserSelect?.(user)}
                                className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:border-emerald-300/25 hover:bg-emerald-400/[0.05] active:scale-[0.99]"
                            >
                                {isVideo(user.profileImage) ? (
                                    <video src={user.profileImage} className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={user.profileImage || avatarFallback} className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover" alt="" />
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                                        <span className="truncate">{user.username}</span>
                                        {user.isPrivate && <Lock size={12} className="shrink-0 text-gray-500" aria-label="Private profile" />}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-gray-500">{user.name || `@${user.username}`}</span>
                                </span>
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-gray-400 transition group-hover:text-emerald-200">
                                    <ArrowUpRight size={16} />
                                </span>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default SearchView;
