import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import getChatPrisma, { getWebClient } from '../prisma/db.js';

const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 72;
const MAX_MESSAGE_LENGTH = 2000;
const UNLOCK_TTL_SECONDS = 12 * 60 * 60; // 12h unlock tokens
const TYPING_FRESH_MS = 8 * 1000; // a typing flag older than this is "stopped"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const asInt = (value) => {
    const id = parseInt(value, 10);
    return Number.isFinite(id) ? id : null;
};

/** Assert the caller participates in the conversation; returns the row. */
const requireParticipant = async (prisma, conversationId, userId) => {
    const participant = await prisma.chatParticipant.findUnique({
        where: {
            conversationId_userId: { conversationId, userId }
        }
    });
    return participant;
};

/**
 * Sign an unlock token proving "user X knows conversation Y's password".
 * The signature salt = JWT_SECRET + conversation.passwordSalt (+ password
 * version bump), so changing/removing the password instantly invalidates
 * every previously issued token.
 */
const signUnlockToken = (c, conversation, userId) => {
    const salt = `${c.env.JWT_SECRET || 'fallback_secret'}::${conversation.passwordSalt || ''}`;
    return jwt.sign(
        { userId, conversationId: conversation.id, scope: 'chat-unlock' },
        salt,
        { expiresIn: `${UNLOCK_TTL_SECONDS}s` }
    );
};

const verifyUnlockToken = (c, token, conversation) => {
    if (!token || !conversation?.passwordSalt) return null;
    try {
        const salt = `${c.env.JWT_SECRET || 'fallback_secret'}::${conversation.passwordSalt}`;
        const decoded = jwt.verify(token, salt);
        if (decoded?.scope !== 'chat-unlock') return null;
        if (decoded.conversationId !== conversation.id) return null;
        return decoded;
    } catch {
        return null;
    }
};

const unlockTokenFromRequest = (c) => {
    const header = c.req.header('x-chat-unlock');
    if (header) return header.trim();
    try {
        const url = new URL(c.req.url);
        return url.searchParams.get('unlock');
    } catch {
        return null;
    }
};

/**
 * For a locked conversation, the caller must present a valid unlock token.
 * Returns { ok: true } or { ok: false, status, body }.
 */
const requireUnlocked = (c, conversation, viewerId) => {
    if (!conversation?.passwordHash) return { ok: true };

    const decoded = verifyUnlockToken(c, unlockTokenFromRequest(c), conversation);
    if (!decoded) {
        return {
            ok: false,
            status: 423,
            body: { success: false, locked: true, error: 'This conversation is password protected' }
        };
    }
    if (decoded.userId !== viewerId) {
        return {
            ok: false,
            status: 403,
            body: { success: false, locked: true, error: 'Unlock token does not belong to this identity' }
        };
    }
    return { ok: true };
};


// ---------------------------------------------------------------------------
// GET /api/chat/users?q=&limit= — people available to chat with
// ---------------------------------------------------------------------------

export const searchChatUsers = async (c) => {
    try {
        const viewer = c.get('user');
        const webClient = getWebClient(c.env);

        const query = (c.req.query('q') || '').trim();
        const limit = Math.min(Math.max(parseInt(c.req.query('limit'), 10) || 10, 1), 100);

        // Use libsql client directly for cross-database queries
        const result = await webClient.execute({
            sql: `SELECT id, username, name, profileImage FROM User
                  WHERE id <> ? AND role <> 'ADMIN'
                  AND (? = '' OR username LIKE ? OR COALESCE(name, '') LIKE ?)
                  ORDER BY createdAt DESC LIMIT ?`,
            args: [viewer.userId, query, `%${query}%`, `%${query}%`, limit]
        });

        return c.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Chat user directory error:', error);
        return c.json({ success: false, error: 'Failed to load people' }, 500);
    }
};

// ---------------------------------------------------------------------------
// GET /api/chat/conversations — inbox with last message + unread counts
// ---------------------------------------------------------------------------

export const listConversations = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const webClient = getWebClient(c.env);

        const memberships = await prisma.chatParticipant.findMany({
            where: { userId: viewer.userId },
            include: {
                conversation: {
                    include: {
                        participants: true,
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        const otherIds = new Set();
        memberships.forEach((m) => {
            m.conversation.participants.forEach((p) => {
                if (p.userId !== viewer.userId) otherIds.add(p.userId);
            });
        });

        let otherById = new Map();
        if (otherIds.size > 0) {
            // Check viewer's showActivityStatus as well (mutual privacy rule)
            let viewerShowActivity = true;
            try {
                const viewerRes = await webClient.execute({
                    sql: `SELECT showActivityStatus FROM User WHERE id = ?`,
                    args: [viewer.userId]
                });
                if (viewerRes.rows.length > 0) {
                    const val = viewerRes.rows[0].showActivityStatus;
                    viewerShowActivity = val === 1 || val === true || val === '1';
                }
            } catch (e) {
                console.error('Failed to get viewer showActivityStatus:', e);
            }

            const othersList = await webClient.execute({
                sql: `SELECT id, username, name, profileImage, lastActiveAt, showActivityStatus, isOnline FROM User WHERE id IN (${Array.from(otherIds).map(() => '?').join(',')})`,
                args: Array.from(otherIds)
            });

            otherById = new Map(othersList.rows.map((u) => {
                const targetShowActivity = u.showActivityStatus === 1 || u.showActivityStatus === true || u.showActivityStatus === '1';
                const canShow = viewerShowActivity && targetShowActivity;
                return [u.id, {
                    ...u,
                    showActivityStatus: canShow,
                    isOnline: canShow ? (u.isOnline === 1 || u.isOnline === true || u.isOnline === '1') : false,
                    lastActiveAt: canShow ? u.lastActiveAt : null
                }];
            }));
        }
        const typingFreshSince = new Date(Date.now() - TYPING_FRESH_MS);

        const conversations = memberships.map((m) => {
            const conv = m.conversation;
            const lastMessage = conv.messages?.[0] || null;
            const othersList = conv.participants
                .filter((p) => p.userId !== viewer.userId)
                .map((p) => ({
                    userId: p.userId,
                    profile: otherById.get(p.userId) || null,
                    typing: p.typingAt ? new Date(p.typingAt) > typingFreshSince : false
                }));

            return {
                id: conv.id,
                isGroup: conv.isGroup,
                title: conv.title,
                locked: Boolean(conv.passwordHash),
                createdById: conv.createdById,
                updatedAt: conv.updatedAt,
                others: othersList,
                unreadCount: 0,
                lastMessage: lastMessage
                    ? {
                        id: lastMessage.id,
                        senderId: lastMessage.senderId,
                        content: lastMessage.content,
                        createdAt: lastMessage.createdAt
                    }
                    : null
            };
        });

        // Unread counts: messages after my lastReadAt, excluding my own.
        const counts = await Promise.all(
            memberships.map((m) =>
                prisma.chatMessage.count({
                    where: {
                        conversationId: m.conversationId,
                        createdAt: { gt: m.lastReadAt },
                        senderId: { not: viewer.userId }
                    }
                })
            )
        );
        conversations.forEach((conv, index) => {
            conv.unreadCount = counts[index] || 0;
        });

        const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

        return c.json({ success: true, data: conversations, totalUnread });
    } catch (error) {
        console.error('Chat inbox error:', error);
        return c.json({ success: false, error: 'Failed to load conversations' }, 500);
    }
};

// ---------------------------------------------------------------------------
// POST /api/chat/conversations — start (or reuse) a 1:1 chat
// Body: { participantIds: [Int], title?: String, password?: String }
// ---------------------------------------------------------------------------

export const createConversation = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const { participantIds, title, password } = await c.req.json();

        const ids = Array.from(
            new Set((Array.isArray(participantIds) ? participantIds : []).map(asInt).filter(Boolean))
        ).filter((id) => id !== viewer.userId);

        if (ids.length === 0) {
            return c.json({ success: false, error: 'Choose at least one person to chat with' }, 400);
        }
        if (typeof title === 'string' && title.length > 80) {
            return c.json({ success: false, error: 'Group title is too long' }, 400);
        }

        let passwordHash = null;
        let passwordSalt = null;
        if (password !== undefined && password !== null && String(password).length > 0) {
            const secret = String(password);
            if (secret.length < MIN_PASSWORD_LENGTH) {
                return c.json({ success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
            }
            if (secret.length > MAX_PASSWORD_LENGTH) {
                return c.json({ success: false, error: 'Password is too long' }, 400);
            }
            passwordHash = await bcrypt.hash(secret, 10);
            passwordSalt = [...crypto.getRandomValues(new Uint8Array(16))]
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        }

        // Reuse an existing 1:1 thread instead of spawning duplicates.
        if (ids.length === 1 && !title) {
            const existing = await prisma.$queryRaw`
                SELECT conversationId FROM ChatParticipant
                WHERE conversationId IN (
                    SELECT conversationId FROM ChatParticipant WHERE userId = ${viewer.userId}
                )
                GROUP BY conversationId
                HAVING COUNT(*) = 2
                   AND SUM(CASE WHEN userId IN (${viewer.userId}, ${ids[0]}) THEN 1 ELSE 0 END) = 2
            `;
            if (existing?.length) {
                return c.json({ success: true, data: { id: existing[0].conversationId, reused: true } }, 200);
            }
        }

        const isGroup = ids.length > 1 || Boolean(title);
        const conversation = await prisma.chatConversation.create({
            data: {
                createdById: viewer.userId,
                isGroup,
                title: isGroup ? (String(title || '').trim() || null) : null,
                passwordHash,
                passwordSalt,
                passwordSetBy: passwordHash ? viewer.userId : null,
                passwordSetAt: passwordHash ? new Date() : null,
                participants: {
                    create: [{ userId: viewer.userId }, ...ids.map((userId) => ({ userId }))]
                }
            }
        });

        return c.json({ success: true, data: { id: conversation.id, locked: Boolean(passwordHash) } }, 201);
    } catch (error) {
        console.error('Chat create error:', error);
        return c.json({ success: false, error: 'Failed to start conversation' }, 500);
    }
};

// ---------------------------------------------------------------------------
// GET /api/chat/conversations/:id/messages — history (unlock token if locked)
// ---------------------------------------------------------------------------

export const getMessages = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const conversationId = asInt(c.req.param('id'));
        if (!conversationId) return c.json({ success: false, error: 'Invalid conversation' }, 400);

        const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
        if (!conversation) return c.json({ success: false, error: 'Conversation not found' }, 404);

        const participant = await requireParticipant(prisma, conversationId, viewer.userId);
        if (!participant) return c.json({ success: false, error: 'Not a member of this conversation' }, 403);

        const gate = requireUnlocked(c, conversation, viewer.userId);
        if (!gate.ok) return c.json(gate.body, gate.status);

        const limit = Math.min(Math.max(parseInt(c.req.query('limit'), 10) || 50, 1), 100);
        const before = c.req.query('before');
        const beforeDate = before ? new Date(before) : null;

        const messages = await prisma.chatMessage.findMany({
            where: {
                conversationId,
                ...(beforeDate && !Number.isNaN(beforeDate.getTime()) ? { createdAt: { lt: beforeDate } } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        // Mark read up to now using raw SQL for Turso
        await prisma.$executeRaw`UPDATE chatParticipant SET lastReadAt = ${new Date().toISOString()}, lastActiveAt = ${new Date().toISOString()} WHERE id = ${participant.id}`;

        // Mark all messages in this conversation as seen by this user
        // Only mark messages sent by others (not own messages)
        await prisma.$executeRaw`
            UPDATE chatMessage 
            SET seenAt = ${new Date().toISOString()} 
            WHERE conversationId = ${conversationId} 
            AND senderId != ${viewer.userId}
            AND seenAt IS NULL
        `;

        return c.json({
            success: true,
            locked: Boolean(conversation.passwordHash),
            data: messages.reverse()
        });
    } catch (error) {
        console.error('Chat history error:', error);
        return c.json({ success: false, error: 'Failed to load messages' }, 500);
    }
};
// ---------------------------------------------------------------------------
// POST /api/chat/conversations/:id/messages — send (unlock token if locked)
// ---------------------------------------------------------------------------

export const sendMessage = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const conversationId = asInt(c.req.param('id'));
        if (!conversationId) return c.json({ success: false, error: 'Invalid conversation' }, 400);

        const { content } = await c.req.json();
        const text = String(content ?? '').trim();
        if (!text) return c.json({ success: false, error: 'Message is empty' }, 400);
        if (text.length > MAX_MESSAGE_LENGTH) {
            return c.json({ success: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH})` }, 400);
        }

        const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
        if (!conversation) return c.json({ success: false, error: 'Conversation not found' }, 404);

        const participant = await requireParticipant(prisma, conversationId, viewer.userId);
        if (!participant) return c.json({ success: false, error: 'Not a member of this conversation' }, 403);

        const gate = requireUnlocked(c, conversation, viewer.userId);
        if (!gate.ok) return c.json(gate.body, gate.status);

        const message = await prisma.chatMessage.create({
            data: { conversationId, senderId: viewer.userId, content: text }
        });
        
        const now = new Date().toISOString();
        await prisma.$executeRaw`UPDATE chatConversation SET updatedAt = ${now} WHERE id = ${conversationId}`;
        await prisma.$executeRaw`UPDATE chatParticipant SET lastReadAt = ${now}, lastActiveAt = ${now}, typingAt = NULL WHERE id = ${participant.id}`;

        return c.json({ success: true, data: message }, 201);
    } catch (error) {
        console.error('Chat send error:', error);
        return c.json({ success: false, error: 'Failed to send message' }, 500);
    }
};

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/:id/unlock — exchange password for a token
// ---------------------------------------------------------------------------

export const unlockConversation = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const conversationId = asInt(c.req.param('id'));
        if (!conversationId) return c.json({ success: false, error: 'Invalid conversation' }, 400);

        const { password } = await c.req.json();
        const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
        if (!conversation) return c.json({ success: false, error: 'Conversation not found' }, 404);

        const participant = await requireParticipant(prisma, conversationId, viewer.userId);
        if (!participant) return c.json({ success: false, error: 'Not a member of this conversation' }, 403);

        if (!conversation.passwordHash) {
            return c.json({ success: true, locked: false, data: { unlockToken: null } });
        }

        if (!password) return c.json({ success: false, locked: true, error: 'Password required' }, 400);
        const ok = await bcrypt.compare(String(password), conversation.passwordHash);
        if (!ok) {
            return c.json({ success: false, locked: true, error: 'Incorrect chat password' }, 401);
        }

        const unlockToken = signUnlockToken(c, conversation, viewer.userId);
        return c.json({
            success: true,
            locked: true,
            data: { unlockToken, expiresInSeconds: UNLOCK_TTL_SECONDS }
        });
    } catch (error) {
        console.error('Chat unlock error:', error);
        return c.json({ success: false, locked: true, error: 'Failed to unlock conversation' }, 500);
    }
};

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/:id/password — set / change / remove lock
// ---------------------------------------------------------------------------

export const setConversationPassword = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const conversationId = asInt(c.req.param('id'));
        if (!conversationId) return c.json({ success: false, error: 'Invalid conversation' }, 400);

        const { password, currentPassword } = await c.req.json();
        const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
        if (!conversation) return c.json({ success: false, error: 'Conversation not found' }, 404);

        const participant = await requireParticipant(prisma, conversationId, viewer.userId);
        if (!participant) return c.json({ success: false, error: 'Not a member of this conversation' }, 403);

        // Remove lock.
        if (password === null || password === '') {
            if (conversation.passwordHash) {
                if (!currentPassword) {
                    return c.json({ success: false, locked: true, error: 'Current password required to remove the lock' }, 400);
                }
                const ok = await bcrypt.compare(String(currentPassword), conversation.passwordHash);
                if (!ok) return c.json({ success: false, locked: true, error: 'Incorrect chat password' }, 401);
            }
            await prisma.$executeRaw`UPDATE chatConversation SET passwordHash = NULL, passwordSalt = NULL, passwordSetBy = NULL, passwordSetAt = NULL WHERE id = ${conversationId}`;
            return c.json({ success: true, locked: false });
        }

        // Set / rotate lock.
        const secret = String(password);
        if (secret.length < MIN_PASSWORD_LENGTH) {
            return c.json({ success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
        }
        if (secret.length > MAX_PASSWORD_LENGTH) {
            return c.json({ success: false, error: 'Password is too long' }, 400);
        }
        if (conversation.passwordHash) {
            if (!currentPassword) {
                return c.json({ success: false, locked: true, error: 'Current password required to change the lock' }, 400);
            }
            const ok = await bcrypt.compare(String(currentPassword), conversation.passwordHash);
            if (!ok) return c.json({ success: false, locked: true, error: 'Incorrect chat password' }, 401);
        }

        const passwordHash = await bcrypt.hash(secret, 10);
        const passwordSalt = [...crypto.getRandomValues(new Uint8Array(16))]
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        await prisma.chatConversation.update({
            where: { id: conversationId },
            data: {
                passwordHash,
                passwordSalt,
                passwordSetBy: viewer.userId,
                passwordSetAt: new Date()
            }
        });

        return c.json({ success: true, locked: true });
    } catch (error) {
        console.error('Chat password error:', error);
        return c.json({ success: false, error: 'Failed to update chat password' }, 500);
    }
};

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/:id/typing — heartbeat { typing: true/false }
// ---------------------------------------------------------------------------

export const setTyping = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const conversationId = asInt(c.req.param('id'));
        if (!conversationId) return c.json({ success: false, error: 'Invalid conversation' }, 400);

        const { typing } = await c.req.json().catch(() => ({}));
        const participant = await requireParticipant(prisma, conversationId, viewer.userId);
        if (!participant) return c.json({ success: false, error: 'Not a member of this conversation' }, 403);

        const typingTime = typing ? new Date().toISOString() : null;
        const now = new Date().toISOString();
        await prisma.$executeRaw`UPDATE chatParticipant SET typingAt = ${typingTime}, lastActiveAt = ${now} WHERE id = ${participant.id}`;

        return c.json({ success: true });
    } catch (error) {
        console.error('Chat typing error:', error);
        return c.json({ success: false, error: 'Failed to update typing state' }, 500);
    }
};

// ---------------------------------------------------------------------------
// GET /api/chat/unread — lightweight badge count for the inbox icon
// ---------------------------------------------------------------------------

export const getUnreadCount = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);

        const memberships = await prisma.chatParticipant.findMany({
            where: { userId: viewer.userId },
            select: { conversationId: true, lastReadAt: true }
        });

        const counts = await Promise.all(
            memberships.map((m) =>
                prisma.chatMessage.count({
                    where: {
                        conversationId: m.conversationId,
                        createdAt: { gt: m.lastReadAt },
                        senderId: { not: viewer.userId }
                    }
                })
            )
        );

        return c.json({ success: true, data: { totalUnread: counts.reduce((a, b) => a + b, 0) } });
    } catch (error) {
        console.error('Chat unread error:', error);
        return c.json({ success: false, error: 'Failed to load unread count' }, 500);
    }
};

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/:id/seen — mark specific message(s) as seen
// Body: { messageIds: [Int] } or auto-mark all if omitted
// ---------------------------------------------------------------------------

export const markMessagesSeen = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const conversationId = asInt(c.req.param('id'));
        if (!conversationId) return c.json({ success: false, error: 'Invalid conversation' }, 400);

        const participant = await requireParticipant(prisma, conversationId, viewer.userId);
        if (!participant) return c.json({ success: false, error: 'Not a member of this conversation' }, 403);

        const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
        const gate = requireUnlocked(c, conversation, viewer.userId);
        if (!gate.ok) return c.json(gate.body, gate.status);

        // Transmission Feedback (readReceipts) check:
        // If the viewer has disabled read receipts, we do NOT stamp seenAt on the other party's messages.
        let readReceiptsEnabled = true;
        try {
            const webClient = getWebClient(c.env);
            const userRes = await webClient.execute({
                sql: `SELECT readReceipts FROM User WHERE id = ?`,
                args: [viewer.userId]
            });
            if (userRes.rows && userRes.rows.length > 0) {
                const val = userRes.rows[0].readReceipts;
                readReceiptsEnabled = val === 1 || val === true || val === '1';
            }
        } catch (e) {
            console.error('Failed to read readReceipts setting:', e);
            readReceiptsEnabled = true;
        }

        const body = await c.req.json().catch(() => ({}));
        const messageIds = Array.isArray(body.messageIds) 
            ? body.messageIds.map(asInt).filter(Boolean) 
            : null;

        const now = new Date().toISOString();
        
        if (readReceiptsEnabled) {
            if (messageIds && messageIds.length > 0) {
                // Mark specific messages as seen
                await prisma.$executeRawUnsafe(
                    `UPDATE chatMessage SET seenAt = ? WHERE id IN (${messageIds.map(() => '?').join(',')}) AND conversationId = ? AND senderId != ? AND seenAt IS NULL`,
                    now,
                    ...messageIds,
                    conversationId,
                    viewer.userId
                );
            } else {
                // Mark all unseen messages in this conversation as seen
                await prisma.$executeRaw`
                    UPDATE chatMessage 
                    SET seenAt = ${now}
                    WHERE conversationId = ${conversationId}
                    AND senderId != ${viewer.userId}
                    AND seenAt IS NULL
                `;
            }
        }

        // Update participant's lastReadAt (resets unread badge) and lastActiveAt (presence)
        await prisma.$executeRaw`UPDATE chatParticipant SET lastReadAt = ${now}, lastActiveAt = ${now} WHERE id = ${participant.id}`;

        return c.json({ success: true, suppressed: !readReceiptsEnabled });
    } catch (error) {
        console.error('Mark seen error:', error);
        return c.json({ success: false, error: 'Failed to mark messages as seen' }, 500);
    }
};

// ---------------------------------------------------------------------------
// POST /api/chat/activity/heartbeat — update lastActiveAt (keep-alive)
// ---------------------------------------------------------------------------

export const updateActivityHeartbeat = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const webClient = getWebClient(c.env);
        const nowIso = new Date().toISOString();
        
        // Update activity in chat participants for all conversations
        await prisma.$executeRaw`
            UPDATE ChatParticipant 
            SET lastActiveAt = ${nowIso}, isOnline = 1
            WHERE userId = ${viewer.userId}
        `;

        // Also update in main User table for global activity status
        await webClient.execute({
            sql: `UPDATE User SET lastActiveAt = ?, isOnline = 1 WHERE id = ?`,
            args: [nowIso, viewer.userId]
        });

        return c.json({ success: true, timestamp: nowIso });
    } catch (error) {
        console.error('Activity heartbeat error:', error);
        return c.json({ success: false, error: 'Failed to update activity' }, 500);
    }
};

export const markUserInactive = async (c) => {
    try {
        const viewer = c.get('user');
        const prisma = getChatPrisma(c.env);
        const webClient = getWebClient(c.env);
        const nowIso = new Date().toISOString();

        // Update activity in chat participants
        await prisma.$executeRaw`
            UPDATE ChatParticipant 
            SET lastActiveAt = ${nowIso}, isOnline = 0
            WHERE userId = ${viewer.userId}
        `;

        // Update in main User table
        await webClient.execute({
            sql: `UPDATE User SET lastActiveAt = ?, isOnline = 0 WHERE id = ?`,
            args: [nowIso, viewer.userId]
        });

        return c.json({ success: true, message: 'User marked as inactive' });
    } catch (error) {
        console.error('❌ Mark inactive error:', error);
        return c.json({ success: false, error: 'Failed to mark inactive' }, 500);
    }
};

// ---------------------------------------------------------------------------
// GET /api/chat/activity/:userId — get activity status for a specific user
// ---------------------------------------------------------------------------

export const getUserActivity = async (c) => {
    try {
        const viewer = c.get('user');
        const userId = asInt(c.req.param('userId'));
        if (!userId) return c.json({ success: false, error: 'Invalid user ID' }, 400);

        const webClient = getWebClient(c.env);

        // Get user's activity from main database
        const result = await webClient.execute({
            sql: `SELECT id, username, name, profileImage, lastActiveAt, showActivityStatus, isOnline 
                  FROM User WHERE id = ?`,
            args: [userId]
        });

        if (!result.rows || result.rows.length === 0) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }

        const user = result.rows[0];

        // Check if viewer has showActivityStatus enabled (mutual privacy rule)
        let viewerShowActivity = true;
        try {
            const viewerRes = await webClient.execute({
                sql: `SELECT showActivityStatus FROM User WHERE id = ?`,
                args: [viewer.userId]
            });
            if (viewerRes.rows.length > 0) {
                const val = viewerRes.rows[0].showActivityStatus;
                viewerShowActivity = val === 1 || val === true || val === '1';
            }
        } catch (e) {
            console.error('Failed to get viewer showActivityStatus:', e);
        }

        const targetShowActivity = user.showActivityStatus === 1 || user.showActivityStatus === true || user.showActivityStatus === '1';
        const canShowActivity = viewerShowActivity && targetShowActivity;

        if (!canShowActivity) {
            return c.json({
                success: true,
                data: {
                    userId: user.id,
                    username: user.username,
                    name: user.name,
                    profileImage: user.profileImage,
                    isActiveNow: false,
                    lastActiveAt: null,
                    lastSeenText: null,
                    showActivityStatus: false
                }
            });
        }
        
        // Helper to safely parse date string regardless of ISO or SQLite format
        const parseUtcDate = (val) => {
            if (!val) return null;
            let str = String(val).trim();
            if (str.includes(' ') && !str.includes('T')) str = str.replace(' ', 'T');
            if (!str.endsWith('Z') && !str.includes('+')) str += 'Z';
            const parsed = new Date(str);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        };

        const lastActive = parseUtcDate(user.lastActiveAt);
        const now = new Date();
        const diffMs = lastActive ? Math.max(0, now.getTime() - lastActive.getTime()) : null;
        const diffSeconds = diffMs !== null ? Math.floor(diffMs / 1000) : null;
        const diffMinutes = diffSeconds !== null ? Math.floor(diffSeconds / 60) : null;
        
        // User is "active now" IF:
        // 1. isOnline is true (not marked inactive), AND
        // 2. heartbeat occurred within the last 60 seconds (prevents stale online if app crashed/disconnected)
        const isOnline = Boolean(user.isOnline);
        const isActiveNow = isOnline && diffSeconds !== null && diffSeconds < 60;
        
        // Format last seen text for when NOT active now
        let lastSeenText = null;
        if (!isActiveNow && diffSeconds !== null) {
            if (diffSeconds < 60) {
                lastSeenText = diffSeconds <= 5 ? 'Active just now' : `Active ${diffSeconds}s ago`;
            } else if (diffMinutes < 60) {
                lastSeenText = `Active ${diffMinutes}m ago`;
            } else if (diffMinutes < 1440) {
                const hours = Math.floor(diffMinutes / 60);
                lastSeenText = `Active ${hours}h ago`;
            } else {
                const days = Math.floor(diffMinutes / 1440);
                lastSeenText = `Active ${days}d ago`;
            }
        }

        return c.json({
            success: true,
            data: {
                userId: user.id,
                username: user.username,
                name: user.name,
                profileImage: user.profileImage,
                isActiveNow,
                lastActiveAt: lastActive ? lastActive.toISOString() : null,
                lastSeenText,
                showActivityStatus: Boolean(user.showActivityStatus)
            }
        });
    } catch (error) {
        console.error('Get activity error:', error);
        return c.json({ success: false, error: 'Failed to get activity status' }, 500);
    }
};