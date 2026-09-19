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

    // ── Phantom thread (deep-link: open chat without creating convo yet) ───────
    // Set when the user clicks "Message" on a profile. Cleared when they send
    // their first message (which creates the real convo) or back out.
    const [pendingUser, setPendingUser]   = useState(null); // { id, username, name, avatarUrl }

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

    // Deep-link: open a phantom thread for a specific user WITHOUT creating a
    // conversation. The conversation is only created when the first message is sent.
    // If the user backs out without sending, nothing is persisted.
    useEffect(() => {
        if (!initialUserId) return;
        let cancelled = false;
        (async () => {
            try {
                // First check if we already have a real conversation with this user.
                const inboxRes = await listConversations();
                if (cancelled) return;
                if (inboxRes?.success) {
                    const existing = (inboxRes.data || []).find((conv) =>
                        !conv.isGroup && (conv.others || []).some((o) => o.id === initialUserId)
                    );
                    if (existing) {
                        // Real convo exists — open it directly, no phantom needed.
                        setConversations(inboxRes.data);
                        openConversation(existing.id);
                        return;
                    }
                }
                // No existing convo — resolve the user's display info for the phantom header.
                const userRes = await searchChatUsers('', 20);
                if (cancelled) return;
                const found = (userRes?.data || []).find((u) => u.id === initialUserId);
                const profile = found
                    ? { id: found.id, username: found.username || found.name, name: found.name, avatarUrl: found.profileImage }
                    : { id: initialUserId, username: 'User', name: 'User', avatarUrl: null };
                setPendingUser(profile);
                setActiveId(null);
                setComposer('');
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

    // ─────────────────────────────────────────────────────────────────────────
    // Phantom-thread send — creates the conversation on the fly then sends.
    // Nothing is persisted if the user exits without sending.
    // ─────────────────────────────────────────────────────────────────────────
    const handlePendingSend = useCallback(async (e) => {
        e?.preventDefault();
        const text = composer.trim();
        if (!text || !pendingUser || sending) return;
        setSending(true);
        setThreadError('');
        try {
            // 1. Create the real conversation now.
            const convRes = await createConversation({ participantIds: [pendingUser.id] });
            if (!convRes?.success) throw new Error('Could not start conversation');
            const convId = convRes.data.id;

            // 2. Send the message.
            await sendMessage(convId, text);

            // 3. Transition to the real thread — clear phantom state.
            setPendingUser(null);
            setComposer('');
            await refreshInbox();
            openConversation(convId);
        } catch (err) {
            setThreadError(err.message || 'Failed to send');
        } finally {
            setSending(false);
        }
    }, [composer, pendingUser, sending, refreshInbox, openConversation]);

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
        <div className="synapse-chat flex h-full min-h-0 w-full flex-col bg-black text-white md:flex-row">

            {/* ── Inbox sidebar ── */}
            <div className={`flex w-full flex-col border-white/5 bg-[#070707] md:w-[340px] md:shrink-0 md:border-r ${(activeId || pendingUser) ? 'hidden md:flex' : 'flex'} min-h-0 flex-1 md:flex-none`}>
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
            <div className={`min-h-0 flex-1 flex-col bg-[#080808] ${(activeId || pendingUser) ? 'flex' : 'hidden md:flex'}`}>
                {/* ── Phantom thread (new conversation, not yet created) ── */}
                {!activeId && pendingUser ? (
                    <>
                        {/* Header */}
                        <div className="flex items-center gap-3 border-b border-white/10 bg-[#070707] px-3 py-3 md:px-5">
                            <button onClick={() => { setPendingUser(null); setComposer(''); setThreadError(''); }}
                                aria-label="Back to inbox"
                                className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white">
                                <ChevronLeft size={18} />
                            </button>
                            <ChatAvatar user={{ username: pendingUser.username, name: pendingUser.name, profileImage: pendingUser.avatarUrl }} size={40} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-bold text-white">
                                    {pendingUser.username || pendingUser.name}
                                </p>
                                <p className="text-[11px] text-gray-500">Start a new conversation</p>
                            </div>
                        </div>

                        {/* Empty messages area */}
                        <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5"
                            style={{
                                backgroundImage: 'url(/chat-wallpaper.svg)',
                                backgroundSize: 'cover',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                            }}>
                            {threadError && (
                                <p className="py-4 text-center text-[12px] text-red-400">{threadError}</p>
                            )}
                            <p className="py-10 text-center text-[12px] text-gray-600">
                                Say hello to {pendingUser.username || pendingUser.name} 👋
                            </p>
                        </div>

                        {/* Composer */}
                        <form onSubmit={handlePendingSend}
                            className="shrink-0 border-t border-white/10 bg-[#070707] px-3 py-3 md:px-5">
                            <div className="flex items-center gap-2">
                                <input
                                    value={composer}
                                    onChange={(e) => setComposer(e.target.value)}
                                    placeholder={`Message ${pendingUser.username || pendingUser.name}...`}
                                    autoFocus
                                    className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-gray-600 focus:border-emerald-500/50" />
                                <button type="submit" disabled={!composer.trim() || sending}
                                    aria-label="Send message"
                                    className="shrink-0 rounded-full bg-emerald-500 p-2.5 text-black transition-all hover:bg-emerald-400 disabled:opacity-30">
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </>
                ) : !activeConversation ? (
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
                                backgroundImage: 'url(/chat-wallpaper.svg)',
                                backgroundSize: 'cover',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
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
