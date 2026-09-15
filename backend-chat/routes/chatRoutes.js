import { Hono } from 'hono';
import {
    searchChatUsers,
    listConversations,
    createConversation,
    getMessages,
    sendMessage,
    unlockConversation,
    setConversationPassword,
    setTyping,
    getUnreadCount
} from '../controllers/chatController.js';
import authenticateChatToken from '../middleware/authMiddleware.js';

const chat = new Hono();

// People available to chat with (directory reads only — no auth data leaks).
chat.get('/users', authenticateChatToken, searchChatUsers);

// Inbox + badge.
chat.get('/conversations', authenticateChatToken, listConversations);
chat.post('/conversations', authenticateChatToken, createConversation);
chat.get('/unread', authenticateChatToken, getUnreadCount);

// Thread lifecycle. History + send require an unlock token when locked.
chat.get('/conversations/:id/messages', authenticateChatToken, getMessages);
chat.post('/conversations/:id/messages', authenticateChatToken, sendMessage);

// Password lock lifecycle.
chat.post('/conversations/:id/unlock', authenticateChatToken, unlockConversation);
chat.post('/conversations/:id/password', authenticateChatToken, setConversationPassword);

// Typing presence heartbeat.
chat.post('/conversations/:id/typing', authenticateChatToken, setTyping);

export default chat;
