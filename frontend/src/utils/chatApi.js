import Cookies from 'js-cookie';

const CHAT_API =
    import.meta.env.VITE_CHAT_API_URL ||
    'https://synapse-chat.mrpralay2005.workers.dev';

const buildHeaders = (extra = {}) => {
    const token = Cookies.get('synapse_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra
    };
};

const request = async (path, { method = 'GET', body, unlockToken } = {}, retries = 2) => {
    const attempt = async () => {
        const res = await fetch(`${CHAT_API}${path}`, {
            method,
            headers: buildHeaders(unlockToken ? { 'X-Chat-Unlock': unlockToken } : {}),
            ...(body !== undefined ? { body: JSON.stringify(body) } : {})
        });

        let data = null;
        try { data = await res.json(); } catch { data = null; }

        if (!res.ok) {
            const message = data?.error || `Chat request failed (${res.status})`;
            const error = new Error(message);
            error.status = res.status;
            error.locked = data?.locked === true;
            error.payload = data;
            throw error;
        }
        return data;
    };

    for (let i = 0; i <= retries; i++) {
        try {
            return await attempt();
        } catch (err) {
            // Only retry on 500 (cold start) — not on 4xx (auth/logic errors)
            const isServerError = !err.status || err.status >= 500;
            if (isServerError && i < retries) {
                await new Promise(r => setTimeout(r, 800 * (i + 1)));
                continue;
            }
            throw err;
        }
    }
};

// Unlock tokens live per browser profile only (never cached to the shared feed
// cache). A locked thread demands a fresh password entry after every reload.
const unlockKey = (conversationId) => `synapse_chat_unlock_${conversationId}`;

export const getUnlockToken = (conversationId) => {
    try {
        return sessionStorage.getItem(unlockKey(conversationId));
    } catch {
        return null;
    }
};

export const setUnlockToken = (conversationId, token) => {
    try {
        if (token) sessionStorage.setItem(unlockKey(conversationId), token);
        else sessionStorage.removeItem(unlockKey(conversationId));
    } catch {
        /* session storage unavailable — chat simply re-locks on reload */
    }
};

export const clearUnlockToken = (conversationId) => setUnlockToken(conversationId, null);

export const searchChatUsers = (q = '', limit = 10) =>
    request(`/api/chat/users?q=${encodeURIComponent(q)}&limit=${limit}`);

export const listConversations = () => request('/api/chat/conversations');

export const createConversation = ({ participantIds, title, password }) =>
    request('/api/chat/conversations', {
        method: 'POST',
        body: { participantIds, title, password }
    });

export const getMessages = (conversationId, { limit = 50, before, unlockToken } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    return request(`/api/chat/conversations/${conversationId}/messages?${params.toString()}`, {
        unlockToken: unlockToken ?? getUnlockToken(conversationId)
    });
};

export const sendMessage = (conversationId, content, unlockToken) =>
    request(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content },
        unlockToken: unlockToken ?? getUnlockToken(conversationId)
    });

export const unlockConversation = (conversationId, password) =>
    request(`/api/chat/conversations/${conversationId}/unlock`, {
        method: 'POST',
        body: { password }
    });

export const setConversationPassword = (conversationId, { password, currentPassword }) =>
    request(`/api/chat/conversations/${conversationId}/password`, {
        method: 'POST',
        body: { password, currentPassword }
    });

export const sendTyping = (conversationId, typing) =>
    request(`/api/chat/conversations/${conversationId}/typing`, {
        method: 'POST',
        body: { typing: Boolean(typing) }
    });

export const getUnreadCount = () => request('/api/chat/unread');

export const CHAT_API_URL = CHAT_API;
