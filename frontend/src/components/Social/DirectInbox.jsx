import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, MessageCircle, Lock, Plus, ChevronLeft, Send, ShieldCheck } from 'lucide-react';
import { ChatAvatar, LockBadge, formatDay, formatClock } from './ChatBits';
import NewChatModal from './NewChatModal';
import PasswordGate from './PasswordGate';
import LockManagerModal from './LockManagerModal';
import {
    searchChatUsers, listConversations, createConversation, getMessages,
    sendMessage, unlockConversation, setConversationPassword,
    sendTyping, getUnlockToken, setUnlockToken, clearUnlockToken
} from '../../utils/chatApi';

const INBOX_POLL_MS = 5000;
const THREAD_POLL_MS = 2500;

const threadTitleOf = (conv, currentUserId) => {
    if (!conv) return 'Chat';
    if (conv.isGroup) return conv.title || 'Group chat';
    const other = (conv.others || [])[0];
    return other?.profile?.username || other?.profile?.name || 'Chat';
};

const threadAvatarOf = (conv) => (conv?.others || [])[0]?.profile || null;


const DirectInbox = ({ currentUser, initialUserId = null, onUnreadChange, onExit = null }) => {
    const [conversations, setConversations] = useState([]);
    const [totalUnread, setTotalUnread] = useState(0);
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadError, setThreadError] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [unlockBusy, setUnlockBusy] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [composer, setComposer] = useState('');
    const [sending, setSending] = useState(false);
    const [inboxSearch, setInboxSearch] = useState('');
    const [newChatOpen, setNewChatOpen] = useState(false);
    const [people, setPeople] = useState([]);
    const [peopleQuery, setPeopleQuery] = useState('');
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState('');
    const [lockModalOpen, setLockModalOpen] = useState(false);
    const [lockBusy, setLockBusy] = useState(false);
    const [lockError, setLockError] = useState('');

    const scrollRef = useRef(null);
    const typingTimeout = useRef(null);
    const stateRef = useRef({ activeId: null, conversations: [] });
    stateRef.current = { activeId, conversations };

    const activeConversation = conversations.find((c) => c.id === activeId) || null;

    const scrollToBottom = useCallback((smooth = true) => {
        const node = scrollRef.current;
        if (!node) return;
        node.scrollTo({ top: node.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    const refreshInbox = useCallback(async (silent = true) => {
        try {
            const res = await listConversations();
            if (!res?.success) return;
            setConversations(res.data || []);
            setTotalUnread(res.totalUnread || 0);
            onUnreadChange?.(res.totalUnread || 0);
        } catch (err) {
            if (!silent) console.error('Inbox refresh failed:', err);
        }
    }, [onUnreadChange]);

    const loadThread = useCallback(async (conversationId, { showSpinner = false } = {}) => {
        if (!conversationId) return;
        if (showSpinner) {
            setThreadLoading(true);
            setThreadError('');
        }
        try {
            const res = await getMessages(conversationId, { limit: 50 });
            if (!res?.success) throw new Error('Failed to load messages');
            setMessages(res.data || []);
            setNeedsPassword(false);
            setUnlockError('');
            // Fresh read marks messages read server-side, so refresh the badge.
            refreshInbox(true);
            requestAnimationFrame(() => scrollToBottom(false));
        } catch (err) {
            if (err?.locked || err?.status === 423) {
                setNeedsPassword(true);
                setMessages([]);
            } else if (showSpinner) {
                setThreadError(err.message || 'Failed to load messages');
            }
        } finally {
            if (showSpinner) setThreadLoading(false);
        }
    }, [refreshInbox, scrollToBottom]);

    const openConversation = useCallback((conversationId) => {
        setActiveId(conversationId);
        setMessages([]);
        setThreadError('');
        setNeedsPassword(false);
        setUnlockError('');
        setComposer('');
        loadThread(conversationId, { showSpinner: true });
    }, [loadThread]);

    // Initial inbox load.
    useEffect(() => {
        refreshInbox(false);
    }, [refreshInbox]);

    // Inbox polling (badges, last-message previews, typing flags).
    useEffect(() => {
        const timer = setInterval(() => refreshInbox(true), INBOX_POLL_MS);
        return () => clearInterval(timer);
    }, [refreshInbox]);

    // Open-thread polling.
    useEffect(() => {
        if (!activeId || needsPassword) return undefined;
        const timer = setInterval(() => loadThread(activeId, { showSpinner: false }), THREAD_POLL_MS);
        return () => clearInterval(timer);
    }, [activeId, needsPassword, loadThread]);

    // Deep-link: open (or create) a thread with a specific user id.
    useEffect(() => {
        if (!initialUserId) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await createConversation({ participantIds: [initialUserId] });
                if (!cancelled && res?.success) {
                    await refreshInbox(true);
                    openConversation(res.data.id);
                }
            } catch (err) {
                if (!cancelled) console.error('Deep-link chat failed:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [initialUserId, openConversation, refreshInbox]);

    // Keep scroll pinned while chatting.
    useEffect(() => {
        scrollToBottom(messages.length <= 5);
    }, [messages, scrollToBottom]);

    const handlePeopleSearch = async (value) => {
        setPeopleQuery(value);
        try {
            const res = await searchChatUsers(value, 10);
            if (res?.success) setPeople(res.data || []);
        } catch (err) {
            console.error('People search failed:', err);
        }
    };

    const openNewChat = async () => {
        setStartError('');
        setPeopleQuery('');
        setPeople([]);
        setNewChatOpen(true);
        try {
            const res = await searchChatUsers('', 10);
            if (!res?.success) throw new Error(res?.error || 'Chat service is unavailable');
            setPeople(res.data || []);
        } catch (err) {
            setStartError(err.message || 'Could not load people. Is the chat backend online?');
        }
    };

    const handlePickUser = async (user, password) => {
        setStarting(true);
        setStartError('');
        try {
            if (password && password.length > 0 && password.length < 4) {
                throw new Error('Chat password must be at least 4 characters');
            }
            const res = await createConversation({ participantIds: [user.id], password: password || undefined });
            if (!res?.success) throw new Error('Could not start conversation');
            setNewChatOpen(false);
            await refreshInbox(true);
            openConversation(res.data.id);
        } catch (err) {
            setStartError(err.message || 'Could not start conversation');
        } finally {
            setStarting(false);
        }
    };

    const handleUnlock = async (password) => {
        if (!activeId) return;
        setUnlockBusy(true);
        setUnlockError('');
        try {
            const res = await unlockConversation(activeId, password);
            if (!res?.success) throw new Error(res?.error || 'Incorrect chat password');
            setUnlockToken(activeId, res.data?.unlockToken);
            setNeedsPassword(false);
            await loadThread(activeId, { showSpinner: true });
            refreshInbox(true);
        } catch (err) {
            setUnlockError(err.message || 'Incorrect chat password');
        } finally {
            setUnlockBusy(false);
        }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        const text = composer.trim();
        if (!text || !activeId || sending) return;
        setSending(true);
        try {
            await sendMessage(activeId, text);
            setComposer('');
            try { await sendTyping(activeId, false); } catch { /* presence is best-effort */ }
            await loadThread(activeId, { showSpinner: false });
            scrollToBottom(true);
        } catch (err) {
            if (err?.locked || err?.status === 423) {
                setNeedsPassword(true);
            } else {
                setThreadError(err.message || 'Failed to send message');
            }
        } finally {
            setSending(false);
        }
    };

    const handleComposerChange = (value) => {
        setComposer(value);
        if (!activeId) return;
        try { sendTyping(activeId, value.length > 0); } catch { /* best-effort */ }
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            try { sendTyping(stateRef.current.activeId, false); } catch { /* best-effort */ }
        }, 3000);
    };

    const handleSetPassword = async ({ password, currentPassword }) => {
        if (!activeId) return;
        setLockBusy(true);
        setLockError('');
        try {
            const res = await setConversationPassword(activeId, { password, currentPassword });
            if (!res?.success) throw new Error(res?.error || 'Could not update lock');
            clearUnlockToken(activeId);
            setLockModalOpen(false);
            setNeedsPassword(Boolean(res.locked));
            if (!res.locked) await loadThread(activeId, { showSpinner: true });
            refreshInbox(true);
        } catch (err) {
            setLockError(err.message || 'Could not update lock');
        } finally {
            setLockBusy(false);
        }
    };

    const handleRemoveLock = async (currentPassword) => {
        if (!activeId) return;
        setLockBusy(true);
        setLockError('');
        try {
            const res = await setConversationPassword(activeId, { password: null, currentPassword });
            if (!res?.success) throw new Error(res?.error || 'Could not remove lock');
            clearUnlockToken(activeId);
            setLockModalOpen(false);
            setNeedsPassword(false);
            await loadThread(activeId, { showSpinner: true });
            refreshInbox(true);
        } catch (err) {
            setLockError(err.message || 'Could not remove lock');
        } finally {
            setLockBusy(false);
        }
    };

    const filteredConversations = conversations.filter((conv) => {
        const q = inboxSearch.trim().toLowerCase();
        if (!q) return true;
        if (conv.isGroup) return (conv.title || 'Group chat').toLowerCase().includes(q);
        return (conv.others || []).some((o) =>
            (o.profile?.username || '').toLowerCase().includes(q) ||
            (o.profile?.name || '').toLowerCase().includes(q)
        );
    });

    const otherTyping = (activeConversation?.others || []).some((o) => o.typing);

    const meId = currentUser?.id ?? currentUser?.userId ?? null;

    return (
        <div className="flex h-full min-h-0 w-full flex-col bg-black text-white md:flex-row">
            <div className={`flex w-full flex-col border-white/5 bg-[#070707] md:w-[340px] md:shrink-0 md:border-r ${activeId ? 'hidden md:flex' : 'flex'} min-h-0 flex-1 md:flex-none`}>
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3.5">
                    {onExit && (
                        <button onClick={onExit} aria-label="Back to feed"
                            className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white">
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                            <MessageCircle size={15} className="text-emerald-400" />
                            Direct
                            {totalUnread > 0 && (
                                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-black">
                                    {totalUnread > 99 ? '99+' : totalUnread}
                                </span>
                            )}
                        </h2>
                    </div>
                    <button onClick={openNewChat} aria-label="New message"
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                        <Search size={14} className="shrink-0 text-gray-500" />
                        <input value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)} placeholder="Search chats..."
                            className="w-full bg-transparent text-[12px] text-white outline-none placeholder:text-gray-600" />
                    </div>
                </div>
                <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                    {filteredConversations.length === 0 && (
                        <div className="flex flex-col items-center px-6 py-14 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-500">
                                <MessageCircle size={22} />
                            </span>
                            <p className="mt-4 text-[13px] font-bold text-gray-300">No conversations yet</p>
                            <p className="mt-1 text-[11px] leading-snug text-gray-500">Tap + to chat with anyone on the app.</p>
                        </div>
                    )}
                    {filteredConversations.map((conv) => {
                        const isActive = conv.id === activeId;
                        const otherIsTyping = (conv.others || []).some((o) => o.typing);
                        return (
                            <button key={conv.id} onClick={() => openConversation(conv.id)}
                                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}>
                                <ChatAvatar user={threadAvatarOf(conv)} size={48} />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="truncate text-[13px] font-bold text-white">{threadTitleOf(conv)}</span>
                                        {conv.locked && <Lock size={12} className="shrink-0 text-amber-300" />}
                                    </span>
                                    <span className={`block truncate text-[11px] ${otherIsTyping ? 'font-bold text-emerald-400' : 'text-gray-500'}`}>
                                        {otherIsTyping ? 'typing...' : conv.lastMessage ? conv.lastMessage.content : 'Say hello  '}
                                    </span>
                                </span>
                                <span className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="text-[10px] text-gray-600">{formatDay(conv.lastMessage?.createdAt || conv.updatedAt)}</span>
                                    {conv.unreadCount > 0 && (
                                        <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-black">
                                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>


            <div className={`min-h-0 flex-1 flex-col bg-black ${activeId ? 'flex' : 'hidden md:flex'}`}>
                {!activeConversation ? (
                    <div className="hidden flex-1 flex-col items-center justify-center px-8 text-center md:flex">
                        <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-gray-500">
                            <MessageCircle size={26} />
                        </span>
                        <p className="mt-5 text-sm font-black uppercase tracking-widest text-white">Your messages</p>
                        <p className="mt-1 max-w-xs text-[12px] leading-snug text-gray-500">
                            Pick a conversation — or start a new one. Locked chats stay locked until you enter the password.
                        </p>
                        <button onClick={openNewChat}
                            className="mt-5 rounded-full bg-emerald-500 px-6 py-2.5 text-[12px] font-black text-black transition-transform hover:scale-105">
                            Send message
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 border-b border-white/10 bg-[#070707] px-3 py-3 md:px-5">
                            <button onClick={() => setActiveId(null)} aria-label="Back to inbox"
                                className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white md:hidden">
                                <ChevronLeft size={18} />
                            </button>
                            <ChatAvatar user={threadAvatarOf(activeConversation)} size={40} />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-white">
                                    {threadTitleOf(activeConversation, meId)}
                                    {activeConversation.locked && <Lock size={12} className="shrink-0 text-amber-300" />}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    {otherTyping ? <span className="font-bold text-emerald-400">typing...</span> : 'Active now'}
                                </p>
                            </div>
                            <button onClick={() => { setLockError(''); setLockModalOpen(true); }} aria-label="Chat lock settings"
                                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition-colors hover:border-amber-400/40 hover:text-amber-300">
                                {activeConversation.locked ? <Lock size={12} /> : <ShieldCheck size={12} />}
                                <span className="hidden sm:inline">{activeConversation.locked ? 'Locked' : 'Lock'}</span>
                            </button>
                        </div>
                        <div ref={scrollRef} className="hide-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4 md:px-5">
                            {threadLoading && (
                                <p className="py-10 text-center text-[11px] uppercase tracking-widest text-gray-600">Loading messages...</p>
                            )}
                            {!threadLoading && threadError && (
                                <p className="py-10 text-center text-[12px] text-red-400">{threadError}</p>
                            )}
                            {!threadLoading && !threadError && messages.length === 0 && !needsPassword && (
                                <p className="py-10 text-center text-[12px] text-gray-600">No messages yet. Say hello below.</p>
                            )}
                            {messages.map((msg) => {
                                const mine = msg.senderId === meId;
                                return (
                                    <div key={msg.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'rounded-br-sm bg-emerald-500 text-black' : 'rounded-bl-sm border border-white/10 bg-white/[0.06] text-gray-100'}`}>
                                            <p className="whitespace-pre-line break-words text-[13px] leading-relaxed">{msg.content}</p>
                                            <p className={`mt-1 text-right text-[9px] ${mine ? 'text-black/60' : 'text-gray-500'}`}>{formatClock(msg.createdAt)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {needsPassword ? (
                            <div className="flex flex-col items-center border-t border-amber-400/20 bg-amber-400/[0.04] px-6 py-6 text-center">
                                <Lock size={20} className="text-amber-300" />
                                <p className="mt-2 text-[12px] font-bold text-white">This chat is locked</p>
                                <p className="text-[11px] text-gray-500">Enter the password to read and send messages.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSend} className="shrink-0 border-t border-white/10 bg-[#070707] px-3 py-3 md:px-5">
                                <div className="flex items-center gap-2">
                                    <input value={composer} onChange={(e) => handleComposerChange(e.target.value)}
                                        placeholder={activeConversation.locked ? 'Message (unlocked)...' : 'Message...'}
                                        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-gray-600 focus:border-emerald-500/50" />
                                    <button type="submit" disabled={!composer.trim() || sending} aria-label="Send message"
                                        className="shrink-0 rounded-full bg-emerald-500 p-2.5 text-black transition-all hover:bg-emerald-400 disabled:opacity-30">
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>
            {/* ---------- Overlays ---------- */}
            <AnimatePresence>
                {newChatOpen && (
                    <NewChatModal users={people} initialQuery={peopleQuery} onQueryChange={handlePeopleSearch}
                        onPickUser={handlePickUser} onClose={() => setNewChatOpen(false)}
                        starting={starting} startError={startError} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {needsPassword && activeConversation && (
                    <PasswordGate conversationTitle={threadTitleOf(activeConversation, meId)}
                        onSubmit={handleUnlock} onClose={() => { setNeedsPassword(false); setActiveId(null); }}
                        busy={unlockBusy} error={unlockError} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {lockModalOpen && activeConversation && (
                    <LockManagerModal locked={activeConversation.locked} onClose={() => setLockModalOpen(false)}
                        onSetPassword={handleSetPassword} onRemoveLock={handleRemoveLock}
                        busy={lockBusy} error={lockError} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default DirectInbox;
