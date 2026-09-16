import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, MessageCircle, Lock, Plus, ChevronLeft, Send, ShieldCheck } from 'lucide-react';
import { ChatAvatar, LockBadge, formatDay, formatClock } from './ChatBits';
import NewChatModal from './NewChatModal';
import PasswordGate from './PasswordGate';
import LockManagerModal from './LockManagerModal';
import ChatWallpaper from './ChatWallpaper';
import {
    searchChatUsers, listConversations, createConversation, getMessages,
    sendMessage, unlockConversation, setConversationPassword,
    sendTyping, getUnlockToken, setUnlockToken, clearUnlockToken
} from '../../utils/chatApi';

// ─── Poll intervals ────────────────────────────────────────────────────────────
const INBOX_POLL_MS  = 6000;   // inbox list refresh
const THREAD_POLL_MS = 3000;   // open thread refresh (raised from 2.5 s)

// ─── Pure helpers (stable references, no re-render cost) ──────────────────────
const threadTitleOf = (conv) => {
    if (!conv) return 'Chat';
    if (conv.isGroup) return conv.title || 'Group chat';
    const other = (conv.others || [])[0];
    return other?.profile?.username || other?.profile?.name || 'Chat';
};

const threadAvatarOf = (conv) => (conv?.others || [])[0]?.profile || null;

// Simple shallow-equal for message arrays — skip setState when nothing changed.
const messagesChanged = (prev, next) => {
    if (prev.length !== next.length) return true;
    const last = next.length - 1;
    if (last < 0) return false;
    return prev[last]?.id !== next[last]?.id;
};

// ─── Component ────────────────────────────────────────────────────────────────
const DirectInbox = ({ currentUser, initialUserId = null, onUnreadChange, onExit = null }) => {

    // ── Inbox state ────────────────────────────────────────────────────────────
    const [conversations, setConversations] = useState(() => {
        // Seed from sessionStorage so the list never flashes empty on remount.
        try {
            const cached = sessionStorage.getItem('synapse_inbox_cache');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [totalUnread, setTotalUnread]   = useState(0);
    const [inboxSearch, setInboxSearch]   = useState('');

    // ── Thread state ───────────────────────────────────────────────────────────
    const [activeId, setActiveId]         = useState(null);
    const [messages, setMessages]         = useState([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadError, setThreadError]   = useState('');

    // ── Password gate state ────────────────────────────────────────────────────
    // We track the locked status of the active thread as a ref too so polling
    // never accidentally clears a gate that the user is currently looking at.
    const [needsPassword, setNeedsPassword] = useState(false);
    const needsPasswordRef = useRef(false);
    const [unlockBusy, setUnlockBusy]     = useState(false);
    const [unlockError, setUnlockError]   = useState('');

    // ── Composer ───────────────────────────────────────────────────────────────
    const [composer, setComposer]         = useState('');
    const [sending, setSending]           = useState(false);

    // ── New chat modal ─────────────────────────────────────────────────────────
    const [newChatOpen, setNewChatOpen]   = useState(false);
    const [people, setPeople]             = useState([]);
    const [peopleQuery, setPeopleQuery]   = useState('');
    const [starting, setStarting]         = useState(false);
    const [startError, setStartError]     = useState('');

    // ── Lock manager modal ─────────────────────────────────────────────────────
    const [lockModalOpen, setLockModalOpen] = useState(false);
    const [lockBusy, setLockBusy]         = useState(false);
    const [lockError, setLockError]       = useState('');

    // ── Refs ───────────────────────────────────────────────────────────────────
    const scrollRef       = useRef(null);
    const typingTimeout   = useRef(null);
    const peopleTimer     = useRef(null);   // debounce for user search
    const activeIdRef     = useRef(null);   // always mirrors activeId without closure stale issues
    const isScrolledUp    = useRef(false);  // don't force-scroll if user is reading history

    // Keep refs in sync
    activeIdRef.current        = activeId;
    needsPasswordRef.current   = needsPassword;

    // ── Derived ────────────────────────────────────────────────────────────────
    const activeConversation = useMemo(
        () => conversations.find((c) => c.id === activeId) || null,
        [conversations, activeId]
    );
    const meId = currentUser?.id ?? currentUser?.userId ?? null;

    // ─────────────────────────────────────────────────────────────────────────
    // Scroll helpers
    // ─────────────────────────────────────────────────────────────────────────
    const scrollToBottom = useCallback((instant = false) => {
        const node = scrollRef.current;
        if (!node) return;
        node.scrollTo({ top: node.scrollHeight, behavior: instant ? 'auto' : 'smooth' });
    }, []);

    // Track whether user has scrolled up so we don't hijack their reading.
    const handleScrollPane = useCallback(() => {
        const node = scrollRef.current;
        if (!node) return;
        const distFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
        isScrolledUp.current = distFromBottom > 80;
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Inbox refresh — called by poll and by explicit actions.
    // Does NOT touch thread state at all.
    // ─────────────────────────────────────────────────────────────────────────
    const refreshInbox = useCallback(async () => {
        try {
            const res = await listConversations();
            if (!res?.success) return;
            const data = res.data || [];
            setConversations(data);
            setTotalUnread(res.totalUnread || 0);
            onUnreadChange?.(res.totalUnread || 0);
            // Persist to sessionStorage so remount shows content instantly.
            try { sessionStorage.setItem('synapse_inbox_cache', JSON.stringify(data)); } catch { /* quota */ }
        } catch { /* silent — keep last known state */ }
    }, [onUnreadChange]);

    // ─────────────────────────────────────────────────────────────────────────
    // Thread loader — used by openConversation AND polling.
    // Never calls refreshInbox — separation of concerns.
    // ─────────────────────────────────────────────────────────────────────────
    const loadThread = useCallback(async (conversationId, { showSpinner = false } = {}) => {
        if (!conversationId) return;
        // Don't run a poll while user is staring at the password gate.
        if (needsPasswordRef.current) return;

        if (showSpinner) {
            setThreadLoading(true);
            setThreadError('');
        }
        try {
            const res = await getMessages(conversationId, { limit: 50 });
            if (!res?.success) throw new Error('Failed to load messages');

            // Only update messages state when content actually changed.
            setMessages(prev => messagesChanged(prev, res.data || []) ? (res.data || []) : prev);

            // Only clear the gate if this poll belongs to the still-active conversation.
            if (activeIdRef.current === conversationId) {
                setNeedsPassword(false);
                needsPasswordRef.current = false;
                setUnlockError('');
            }

            if (!isScrolledUp.current) {
                requestAnimationFrame(() => scrollToBottom(true));
            }
        } catch (err) {
            if (err?.locked || err?.status === 423) {
                if (activeIdRef.current === conversationId) {
                    // Clear any stale unlock token — it's expired or was revoked.
                    clearUnlockToken(conversationId);
                    setNeedsPassword(true);
                    needsPasswordRef.current = true;
                    setMessages([]);
                }
            } else if (showSpinner) {
                setThreadError(err.message || 'Failed to load messages');
            }
        } finally {
            if (showSpinner) setThreadLoading(false);
        }
    }, [scrollToBottom]);

    // ─────────────────────────────────────────────────────────────────────────
    // Open a conversation — determine lock state BEFORE clearing gate flag
    // so there's no flicker.
    // ─────────────────────────────────────────────────────────────────────────
    const openConversation = useCallback((conversationId) => {
        setActiveId(conversationId);
        setMessages([]);
        setThreadError('');
        setComposer('');
        isScrolledUp.current = false;

        const convInState = conversations.find(c => c.id === conversationId);
        if (convInState?.locked) {
            // Always demand password when opening a locked chat from the inbox.
            // We clear the stored token so loadThread cannot silently bypass the gate.
            clearUnlockToken(conversationId);
            setNeedsPassword(true);
            needsPasswordRef.current = true;
            // Don't call loadThread at all — nothing to load until unlocked.
        } else {
            setNeedsPassword(false);
            needsPasswordRef.current = false;
            setUnlockError('');
            loadThread(conversationId, { showSpinner: true });
        }
    }, [loadThread, conversations]);

    // ─────────────────────────────────────────────────────────────────────────
    // Effects
    // ─────────────────────────────────────────────────────────────────────────

    // Initial inbox load.
    useEffect(() => { refreshInbox(); }, [refreshInbox]);

    // Inbox polling — independent of thread.
    useEffect(() => {
        const t = setInterval(refreshInbox, INBOX_POLL_MS);
        return () => clearInterval(t);
    }, [refreshInbox]);

    // Thread polling — paused when password gate is showing.
    useEffect(() => {
        if (!activeId || needsPassword) return;
        const t = setInterval(() => loadThread(activeId, { showSpinner: false }), THREAD_POLL_MS);
        return () => clearInterval(t);
    }, [activeId, needsPassword, loadThread]);

    // Refresh inbox once when we close a thread (to sync unread badges).
    useEffect(() => {
        if (activeId === null) refreshInbox();
    }, [activeId, refreshInbox]);

    // Deep-link: open (or create) thread for a specific user.
    useEffect(() => {
        if (!initialUserId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await createConversation({ participantIds: [initialUserId] });
                if (!cancelled && res?.success) {
                    await refreshInbox();
                    openConversation(res.data.id);
                }
            } catch (err) {
                if (!cancelled) console.error('Deep-link chat failed:', err);
            }
        })();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialUserId]);

    // Scroll to bottom when new messages arrive (only if near the bottom).
    useEffect(() => {
        if (messages.length > 0 && !isScrolledUp.current) {
            requestAnimationFrame(() => scrollToBottom(messages.length <= 5));
        }
    }, [messages, scrollToBottom]);

    // ─────────────────────────────────────────────────────────────────────────
    // New chat modal
    // ─────────────────────────────────────────────────────────────────────────
    const openNewChat = useCallback(async () => {
        setStartError('');
        setPeopleQuery('');
        setPeople([]);
        setNewChatOpen(true);
        try {
            const res = await searchChatUsers('', 10);
            if (!res?.success) throw new Error(res?.error || 'Chat service unavailable');
            setPeople(res.data || []);
        } catch (err) {
            setStartError(err.message || 'Could not load people');
        }
    }, []);

    // Debounced user search — fires 300 ms after the user stops typing.
    const handlePeopleSearch = useCallback((value) => {
        setPeopleQuery(value);
        if (peopleTimer.current) clearTimeout(peopleTimer.current);
        peopleTimer.current = setTimeout(async () => {
            try {
                const res = await searchChatUsers(value, 10);
                if (res?.success) setPeople(res.data || []);
            } catch { /* ignore */ }
        }, 300);
    }, []);

    const handlePickUser = useCallback(async (user, password) => {
        setStarting(true);
        setStartError('');
        try {
            if (password && password.length > 0 && password.length < 4) {
                throw new Error('Chat password must be at least 4 characters');
            }
            const res = await createConversation({
                participantIds: [user.id],
                password: password || undefined
            });
            if (!res?.success) throw new Error('Could not start conversation');
            // Close modal and open thread immediately — don't wait for inbox refresh.
            setNewChatOpen(false);
            openConversation(res.data.id);
            // Refresh inbox in background.
            refreshInbox();
        } catch (err) {
            setStartError(err.message || 'Could not start conversation');
        } finally {
            setStarting(false);
        }
    }, [refreshInbox, openConversation]);

    // ─────────────────────────────────────────────────────────────────────────
    // Unlock
    // ─────────────────────────────────────────────────────────────────────────
    const handleUnlock = useCallback(async (password) => {
        if (!activeIdRef.current) return;
        const convId = activeIdRef.current;
        setUnlockBusy(true);
        setUnlockError('');
        try {
            const res = await unlockConversation(convId, password);
            if (!res?.success) throw new Error(res?.error || 'Incorrect chat password');
            setUnlockToken(convId, res.data?.unlockToken);
            setNeedsPassword(false);
            needsPasswordRef.current = false;
            await loadThread(convId, { showSpinner: true });
            refreshInbox();
        } catch (err) {
            setUnlockError(err.message || 'Incorrect chat password');
        } finally {
            setUnlockBusy(false);
        }
    }, [loadThread, refreshInbox]);

    // ─────────────────────────────────────────────────────────────────────────
    // Send message — optimistic UI for instant feel
    // ─────────────────────────────────────────────────────────────────────────
    const handleSend = useCallback(async (e) => {
        e?.preventDefault();
        const text = composer.trim();
        if (!text || !activeIdRef.current || sending) return;
        const convId = activeIdRef.current;

        // Clear composer and typing indicator immediately — feels instant.
        setComposer('');
        setSending(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        try { sendTyping(convId, false); } catch { /* best-effort */ }

        // Optimistically append the message to state right away.
        // Use a temp id so React can key it — server will replace on next poll.
        const optimisticMsg = {
            id: `optimistic-${Date.now()}`,
            senderId: meId,
            content: text,
            createdAt: new Date().toISOString(),
            _optimistic: true,
        };
        setMessages(prev => [...prev, optimisticMsg]);
        isScrolledUp.current = false;
        requestAnimationFrame(() => scrollToBottom(true));

        try {
            await sendMessage(convId, text);
            // Replace optimistic message with real one from server.
            await loadThread(convId, { showSpinner: false });
        } catch (err) {
            // Remove the optimistic message on failure.
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            if (err?.locked || err?.status === 423) {
                setNeedsPassword(true);
                needsPasswordRef.current = true;
            } else {
                setThreadError(err.message || 'Failed to send');
                // Restore composer so user doesn't lose their message.
                setComposer(text);
            }
        } finally {
            setSending(false);
        }
    }, [composer, sending, loadThread, meId, scrollToBottom]);

    // Typing indicator — debounced, fire on first keypress then stop after 3 s idle.
    const handleComposerChange = useCallback((value) => {
        setComposer(value);
        const convId = activeIdRef.current;
        if (!convId) return;
        // Only send typing=true once per burst (when going from empty to non-empty).
        if (value.length === 1) {
            try { sendTyping(convId, true); } catch { /* best-effort */ }
        }
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            try { sendTyping(convId, false); } catch { /* best-effort */ }
        }, 3000);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Lock manager
    // ─────────────────────────────────────────────────────────────────────────
    const handleSetPassword = useCallback(async ({ password, currentPassword }) => {
        const convId = activeIdRef.current;
        if (!convId) return;
        setLockBusy(true);
        setLockError('');
        try {
            const res = await setConversationPassword(convId, { password, currentPassword });
            if (!res?.success) throw new Error(res?.error || 'Could not update lock');
            clearUnlockToken(convId);
            setLockModalOpen(false);

            // Always show the gate after locking — don't trust res.locked alone.
            // The token was just cleared so the next getMessages will 423 anyway.
            if (password) {
                setNeedsPassword(true);
                needsPasswordRef.current = true;
            } else {
                setNeedsPassword(false);
                needsPasswordRef.current = false;
                await loadThread(convId, { showSpinner: true });
            }
            refreshInbox();
        } catch (err) {
            setLockError(err.message || 'Could not update lock');
        } finally {
            setLockBusy(false);
        }
    }, [loadThread, refreshInbox]);

    const handleRemoveLock = useCallback(async (currentPassword) => {
        const convId = activeIdRef.current;
        if (!convId) return;
        setLockBusy(true);
        setLockError('');
        try {
            const res = await setConversationPassword(convId, { password: null, currentPassword });
            if (!res?.success) throw new Error(res?.error || 'Could not remove lock');
            clearUnlockToken(convId);
            setLockModalOpen(false);
            setNeedsPassword(false);
            needsPasswordRef.current = false;
            await loadThread(convId, { showSpinner: true });
            refreshInbox();
        } catch (err) {
            setLockError(err.message || 'Could not remove lock');
        } finally {
            setLockBusy(false);
        }
    }, [loadThread, refreshInbox]);

    // ─────────────────────────────────────────────────────────────────────────
    // Filtered inbox list (purely derived — no state)
    // ─────────────────────────────────────────────────────────────────────────
    const filteredConversations = useMemo(() => {
        const q = inboxSearch.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter((conv) => {
            if (conv.isGroup) return (conv.title || 'Group chat').toLowerCase().includes(q);
            return (conv.others || []).some((o) =>
                (o.profile?.username || '').toLowerCase().includes(q) ||
                (o.profile?.name || '').toLowerCase().includes(q)
            );
        });
    }, [conversations, inboxSearch]);

    const otherTyping = (activeConversation?.others || []).some((o) => o.typing);

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-full min-h-0 w-full flex-col bg-black text-white md:flex-row">

            {/* ── Inbox sidebar ── */}
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
                        <input value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)}
                            placeholder="Search chats..."
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
                                        {otherIsTyping ? 'typing...' : conv.lastMessage ? conv.lastMessage.content : 'Say hello 👋'}
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

            {/* ── Thread pane ── */}
            <div className={`min-h-0 flex-1 flex-col bg-[#080808] ${activeId ? 'flex' : 'hidden md:flex'}`}>
                {!activeConversation ? (
                    <div className="hidden flex-1 flex-col items-center justify-center px-8 text-center md:flex">
                        <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-gray-500">
                            <MessageCircle size={26} />
                        </span>
                        <p className="mt-5 text-sm font-black uppercase tracking-widest text-white">Your messages</p>
                        <p className="mt-1 max-w-xs text-[12px] leading-snug text-gray-500">
                            Pick a conversation — or start a new one.
                        </p>
                        <button onClick={openNewChat}
                            className="mt-5 rounded-full bg-emerald-500 px-6 py-2.5 text-[12px] font-black text-black transition-transform hover:scale-105">
                            Send message
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Thread header */}
                        <div className="flex items-center gap-3 border-b border-white/10 bg-[#070707] px-3 py-3 md:px-5">
                            <button onClick={() => setActiveId(null)} aria-label="Back to inbox"
                                className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white md:hidden">
                                <ChevronLeft size={18} />
                            </button>
                            <ChatAvatar user={threadAvatarOf(activeConversation)} size={40} />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-white">
                                    {threadTitleOf(activeConversation)}
                                    {activeConversation.locked && <Lock size={12} className="shrink-0 text-amber-300" />}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    {otherTyping
                                        ? <span className="font-bold text-emerald-400">typing...</span>
                                        : 'Active now'}
                                </p>
                            </div>
                            <button onClick={() => { setLockError(''); setLockModalOpen(true); }}
                                aria-label="Chat lock settings"
                                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition-colors hover:border-amber-400/40 hover:text-amber-300">
                                {activeConversation.locked ? <Lock size={12} /> : <ShieldCheck size={12} />}
                                <span className="hidden sm:inline">{activeConversation.locked ? 'Locked' : 'Lock'}</span>
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} onScroll={handleScrollPane}
                            className="hide-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4 md:px-5"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><rect width='600' height='600' fill='%230a0a0a'/><polygon points='0,0 120,0 60,90' fill='%23111111'/><polygon points='120,0 240,0 180,80' fill='%230d0d0d'/><polygon points='240,0 360,0 300,100' fill='%23131313'/><polygon points='360,0 480,0 420,85' fill='%230f0f0f'/><polygon points='480,0 600,0 540,90' fill='%23121212'/><polygon points='600,0 600,120 540,90' fill='%230e0e0e'/><polygon points='0,0 60,90 0,150' fill='%230f0f0f'/><polygon points='60,90 180,80 150,170' fill='%23161616'/><polygon points='60,90 150,170 0,150' fill='%23111111'/><polygon points='180,80 300,100 260,180' fill='%23141414'/><polygon points='180,80 260,180 150,170' fill='%230f0f0f'/><polygon points='300,100 420,85 380,190' fill='%23161616'/><polygon points='300,100 380,190 260,180' fill='%23101010'/><polygon points='420,85 540,90 500,180' fill='%23131313'/><polygon points='420,85 500,180 380,190' fill='%230d0d0d'/><polygon points='540,90 600,120 580,200' fill='%23161616'/><polygon points='540,90 580,200 500,180' fill='%23111111'/><polygon points='0,150 150,170 80,250' fill='%23131313'/><polygon points='150,170 260,180 200,270' fill='%23111111'/><polygon points='150,170 200,270 80,250' fill='%23141414'/><polygon points='260,180 380,190 320,280' fill='%23131313'/><polygon points='260,180 320,280 200,270' fill='%230f0f0f'/><polygon points='380,190 500,180 440,270' fill='%23141414'/><polygon points='380,190 440,270 320,280' fill='%23161616'/><polygon points='500,180 580,200 560,290' fill='%230e0e0e'/><polygon points='500,180 560,290 440,270' fill='%23131313'/><polygon points='580,200 600,280 600,380' fill='%23111111'/><polygon points='80,250 200,270 130,360' fill='%230f0f0f'/><polygon points='80,250 130,360 30,340' fill='%23161616'/><polygon points='200,270 320,280 250,370' fill='%23141414'/><polygon points='200,270 250,370 130,360' fill='%230d0d0d'/><polygon points='320,280 440,270 370,360' fill='%23111111'/><polygon points='320,280 370,360 250,370' fill='%23161616'/><polygon points='440,270 560,290 490,370' fill='%23131313'/><polygon points='440,270 490,370 370,360' fill='%230f0f0f'/><polygon points='560,290 600,380 600,450' fill='%23141414'/><polygon points='560,290 600,450 490,370' fill='%23161616'/><polygon points='30,340 130,360 70,450' fill='%23131313'/><polygon points='130,360 250,370 180,460' fill='%23111111'/><polygon points='130,360 180,460 70,450' fill='%23141414'/><polygon points='250,370 370,360 300,460' fill='%230d0d0d'/><polygon points='250,370 300,460 180,460' fill='%23161616'/><polygon points='370,360 490,370 420,460' fill='%23131313'/><polygon points='370,360 420,460 300,460' fill='%23111111'/><polygon points='490,370 600,450 530,460' fill='%230f0f0f'/><polygon points='490,370 530,460 420,460' fill='%23141414'/><polygon points='70,450 180,460 110,540' fill='%23161616'/><polygon points='180,460 300,460 230,550' fill='%23111111'/><polygon points='180,460 230,550 110,540' fill='%23131313'/><polygon points='300,460 420,460 350,550' fill='%230f0f0f'/><polygon points='300,460 350,550 230,550' fill='%23141414'/><polygon points='420,460 530,460 470,550' fill='%23161616'/><polygon points='420,460 470,550 350,550' fill='%230d0d0d'/><polygon points='530,460 600,450 570,540' fill='%23131313'/><polygon points='530,460 570,540 470,550' fill='%23111111'/><polygon points='110,540 230,550 170,600' fill='%23161616'/><polygon points='230,550 350,550 280,600' fill='%230f0f0f'/><polygon points='350,550 470,550 400,600' fill='%23141414'/><polygon points='470,550 570,540 510,600' fill='%23111111'/><polygon points='570,540 600,450 600,600' fill='%23161616'/><g stroke='%231a1a1a' stroke-width='0.7' fill='none'><line x1='60' y1='90' x2='0' y2='150'/><line x1='60' y1='90' x2='180' y2='80'/><line x1='60' y1='90' x2='150' y2='170'/><line x1='180' y1='80' x2='300' y2='100'/><line x1='180' y1='80' x2='260' y2='180'/><line x1='300' y1='100' x2='420' y2='85'/><line x1='300' y1='100' x2='380' y2='190'/><line x1='420' y1='85' x2='540' y2='90'/><line x1='420' y1='85' x2='500' y2='180'/><line x1='540' y1='90' x2='580' y2='200'/><line x1='150' y1='170' x2='80' y2='250'/><line x1='150' y1='170' x2='260' y2='180'/><line x1='260' y1='180' x2='380' y2='190'/><line x1='260' y1='180' x2='200' y2='270'/><line x1='380' y1='190' x2='500' y2='180'/><line x1='380' y1='190' x2='320' y2='280'/><line x1='500' y1='180' x2='560' y2='290'/><line x1='500' y1='180' x2='440' y2='270'/><line x1='80' y1='250' x2='30' y2='340'/><line x1='80' y1='250' x2='200' y2='270'/><line x1='200' y1='270' x2='320' y2='280'/><line x1='200' y1='270' x2='130' y2='360'/><line x1='320' y1='280' x2='440' y2='270'/><line x1='320' y1='280' x2='250' y2='370'/><line x1='440' y1='270' x2='560' y2='290'/><line x1='440' y1='270' x2='370' y2='360'/><line x1='560' y1='290' x2='490' y2='370'/><line x1='30' y1='340' x2='70' y2='450'/><line x1='30' y1='340' x2='130' y2='360'/><line x1='130' y1='360' x2='250' y2='370'/><line x1='130' y1='360' x2='180' y2='460'/><line x1='250' y1='370' x2='370' y2='360'/><line x1='250' y1='370' x2='300' y2='460'/><line x1='370' y1='360' x2='490' y2='370'/><line x1='370' y1='360' x2='420' y2='460'/><line x1='490' y1='370' x2='530' y2='460'/><line x1='70' y1='450' x2='110' y2='540'/><line x1='70' y1='450' x2='180' y2='460'/><line x1='180' y1='460' x2='300' y2='460'/><line x1='180' y1='460' x2='230' y2='550'/><line x1='300' y1='460' x2='420' y2='460'/><line x1='300' y1='460' x2='350' y2='550'/><line x1='420' y1='460' x2='530' y2='460'/><line x1='420' y1='460' x2='470' y2='550'/><line x1='530' y1='460' x2='570' y2='540'/><line x1='110' y1='540' x2='230' y2='550'/><line x1='230' y1='550' x2='350' y2='550'/><line x1='350' y1='550' x2='470' y2='550'/><line x1='470' y1='550' x2='570' y2='540'/></g></svg>`)}")`,
                                backgroundSize: '300px 300px',
                                backgroundRepeat: 'repeat',
                            }}>
                            {threadLoading && (
                                <p className="py-10 text-center text-[11px] uppercase tracking-widest text-gray-600">Loading...</p>
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

                        {/* Composer */}
                        {!needsPassword && (
                            <form onSubmit={handleSend}
                                className="shrink-0 border-t border-white/10 bg-[#070707] px-3 py-3 md:px-5">
                                <div className="flex items-center gap-2">
                                    <input value={composer} onChange={(e) => handleComposerChange(e.target.value)}
                                        placeholder={activeConversation.locked ? 'Message (unlocked)...' : 'Message...'}
                                        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-gray-600 focus:border-emerald-500/50" />
                                    <button type="submit" disabled={!composer.trim() || sending}
                                        aria-label="Send message"
                                        className="shrink-0 rounded-full bg-emerald-500 p-2.5 text-black transition-all hover:bg-emerald-400 disabled:opacity-30">
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>

            {/* ── Overlays ── */}
            <AnimatePresence>
                {newChatOpen && (
                    <NewChatModal key="new-chat" users={people} initialQuery={peopleQuery}
                        onQueryChange={handlePeopleSearch} onPickUser={handlePickUser}
                        onClose={() => setNewChatOpen(false)} starting={starting} startError={startError} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {needsPassword && activeConversation && (
                    <PasswordGate key="password-gate"
                        conversationTitle={threadTitleOf(activeConversation)}
                        onSubmit={handleUnlock}
                        onClose={() => { setNeedsPassword(false); needsPasswordRef.current = false; setActiveId(null); }}
                        busy={unlockBusy} error={unlockError} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {lockModalOpen && activeConversation && (
                    <LockManagerModal key="lock-manager"
                        locked={activeConversation.locked}
                        onClose={() => setLockModalOpen(false)}
                        onSetPassword={handleSetPassword}
                        onRemoveLock={handleRemoveLock}
                        busy={lockBusy} error={lockError} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default DirectInbox;
