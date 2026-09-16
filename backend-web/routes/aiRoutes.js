import { Hono } from 'hono';
import authenticateToken from '../middleware/authMiddleware.js';
import getPrisma from '../prisma/db.js';

const ai = new Hono();

// ─── Token usage logger (fire-and-forget, never blocks the response) ──────────
const logUsage = (databaseUrl, userId, endpoint, tokens) => {
    if (!databaseUrl || !tokens || tokens <= 0) return;
    try {
        const prisma = getPrisma(databaseUrl);
        prisma.aiUsageLog.create({ data: { userId, endpoint, tokens } }).catch(() => {/* silent */});
    } catch { /* never crash the AI call */ }
};

// ─── Dev mock ─────────────────────────────────────────────────────────────────
const generateDevReply = (message) => {
    const q = message.toLowerCase();
    if (q.includes('sign up') || q.includes('signup') || q.includes('register') || q.includes('create account'))
        return "To sign up for SynapseX, tap **Initialize Identity** on the home page. 🚀\nFill in your name, email, username and password. We'll send a one-time code to your email — enter it to verify, then you're all set!";
    if (q.includes('log in') || q.includes('login') || q.includes('sign in'))
        return "Tap **Access Neural Hub** and enter your username and password. 🔑\nYour session stays active for about 2 hours. Forgotten your password? Use the Forgot password link on the login screen.";
    if (q.includes('forgot') && q.includes('password'))
        return "No worries! 💚 Tap **Forgot password** on the login screen. Enter your email, get a reset code, set a new password and you're back in.";
    if (q.includes('risk score') || q.includes('neural score'))
        return "The neural risk score is SynapseX's behavioural security layer. 🧠\nIt watches your typing rhythm and mouse movement at login, scoring you from 0.0 (safe) to 1.0 (suspicious). It's advisory — it never blocks you.";
    if (q.includes('story') || q.includes('stories'))
        return "Stories are short updates that disappear after 24 hours. 📸\nTap your avatar with the + badge to add one. Viewers can mute, unmute or copy the link from the three-dot menu.";
    if (q.includes('reel') || q.includes('video'))
        return "Reels is the short-video section of SynapseX. 🎬\nOpen it from the Reels tab — full-screen scrollable videos where you can like and comment just like on a regular post.";
    if (q.includes('direct') || q.includes('message') || q.includes('chat') || q.includes('dm'))
        return "SynapseX has real-time direct messaging. 💬\nTap the chat icon → + to start a new conversation. You can also password-lock any chat — tap the lock icon inside the conversation.";
    if (q.includes('creator') || q.includes('verified') || q.includes('badge'))
        return "Creator Mode unlocks a verified badge, HD uploads, analytics and an anonymous shield. 🌟\nGo to Settings → Creator Mode to enable it and submit a verification request.";
    if (q.includes('private') || q.includes('privacy'))
        return "You can make your account private from Settings. 🔐\nWhen private, only approved followers can see your posts. New followers must be accepted before they get access.";
    if (q.includes('follow') || q.includes('follower'))
        return "Following someone adds their posts to your feed and their Stories to your Stories row. 🤝\nFollow or unfollow from any profile — your counts are shown on your profile page.";
    if (q.includes('notification'))
        return "The bell icon holds your activity — follows, likes, comments and announcements. 🔔\nOpening it marks things as seen. Clear the whole list to keep the badge count at zero.";
    if (q.includes('settings') || q.includes('setting'))
        return "Settings is the control room for your account. ⚙️\nEdit your profile, switch public/private, manage Creator Mode, review sessions and log out — all from there.";
    if (q.includes('security') || q.includes('safe') || q.includes('encrypt'))
        return "SynapseX uses layered security. 🛡️\nPasswords are stored as one-way bcrypt hashes. Sessions use signed tokens that expire after ~2 hours. The risk score adds a behavioural signal on top.";
    if (q.includes('who') && (q.includes('made') || q.includes('built') || q.includes('created')))
        return "SynapseX was built by **Pralay** — a solo developer who designed and coded the entire platform from scratch. 🚀\nIt covers a full-stack React web app, an Android app, Cloudflare Workers backend and a real-time chat system.";
    if (q.includes('priya') || q.includes('who are you') || q.includes('what are you'))
        return "I'm Priya — your personal SynapseX guide! 💚\nI'm powered by Cloudflare Workers AI. I can answer any question about SynapseX's features, security and how things work.";
    return "That's a great question! 💚 I'm Priya, your SynapseX guide. I can help with sign-up, login, posts, Stories, Reels, direct messages, profiles, Creator Mode, security and more. What would you like to know?";
};

// ─── System prompts ───────────────────────────────────────────────────────────
const PRIYA_SYSTEM_PROMPT = `You are Priya, the friendly AI assistant for SynapseX — a social platform with AI-powered security.

YOUR PERSONALITY:
- Warm, helpful, concise and friendly
- Use emojis occasionally (💚 🔐 🚀 ✅)
- Keep answers short — 2-4 sentences max unless step-by-step is needed
- Never make up features that don't exist

YOUR SCOPE — ONLY answer about SynapseX:
- Creating an account, sign up, OTP verification
- Logging in, forgot password, session expiry
- Neural risk score and behavioral AI security
- Posts, Stories, Reels, likes, comments, saved posts
- Direct messages, chat password lock feature
- Profile, followers, following, private accounts
- Creator Mode, verified badge
- Settings, notifications, logout
- Android app, security, privacy, data collection

IF ASKED ANYTHING OUTSIDE SCOPE reply: "I'm only trained on SynapseX, so I can't help with that. Try asking me about the app's features! 💚"

ABOUT SYNAPSEX:
- Built by Pralay, a solo developer
- Full-stack React + Cloudflare Workers + Android app
- Real-time direct messaging with optional password-locked chats
- Behavioral AI risk scoring on login
- Stories expire after 24 hours, Reels are short videos
- Creator Mode unlocks verification, HD uploads, analytics
- Passwords stored as bcrypt hashes — nobody can read them
- Sessions expire after ~2 hours for security`;

const LANDING_SYSTEM_PROMPT = `You are Priya, a friendly AI assistant on the SynapseX landing page.
You ONLY help visitors with:
1. How to create an account (sign up)
2. How to log in

SIGN-UP: Tap "Initialize Identity" → enter name, email, username, password → verify email OTP → log in with "Access Neural Hub"
LOGIN: Tap "Access Neural Hub" → enter username and password
FORGOT PASSWORD: "Forgot password" link on login screen → enter email → enter OTP → set new password
OTP NOT RECEIVED: Check spam, wait 1 minute, ensure correct email address

STRICT RULE: If asked ANYTHING not related to SynapseX sign-up or login, you MUST respond with exactly:
"I'm only here to help with sign-up and login! 💚 Once you're inside the app, our full AI assistant Priya can answer everything."
Do NOT answer questions about weather, news, general knowledge, or anything outside SynapseX sign-up and login.

Be very short, 1-3 sentences max. Use 💚 occasionally.`;

// ─── Helper: normalize history roles for LLM ─────────────────────────────────
// FIX: role 'priya' → 'assistant', everything else → 'user'
const normalizeHistory = (history, limit, contentLimit) =>
    (Array.isArray(history) ? history : [])
        .slice(-limit)
        .filter(m => m?.role && m?.content)
        .map(m => ({
            role: m.role === 'priya' || m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content).slice(0, contentLimit)
        }));

// ─── POST /api/ai/priya — authenticated ──────────────────────────────────────
ai.post('/priya', authenticateToken, async (c) => {
    try {
        const { message, history = [] } = await c.req.json();
        if (!message || typeof message !== 'string' || !message.trim())
            return c.json({ success: false, error: 'Message is required' }, 400);

        const text = message.trim().slice(0, 500);

        if (!c.env?.AI)
            return c.json({ success: true, reply: generateDevReply(text), dev: true });

        const messages = [
            { role: 'system', content: PRIYA_SYSTEM_PROMPT },
            ...normalizeHistory(history, 6, 300),
            { role: 'user', content: text }
        ];

        const response = await c.env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
            messages,
            max_tokens: 256,
            temperature: 0.7,
        });

        const reply = response?.response?.trim();
        if (!reply) return c.json({ success: false, fallback: true }, 200);

        // Log token usage — fire-and-forget, never blocks response
        const userId = c.get('user')?.userId ?? 0;
        const tokens = (response?.usage?.total_tokens) || Math.ceil((text.length + reply.length) / 4);
        logUsage(c.env.DATABASE_URL, userId, 'priya', tokens);

        return c.json({ success: true, reply });

    } catch (err) {
        console.error('[Priya AI]', err?.message || err);
        return c.json({ success: false, fallback: true }, 200);
    }
});

// ─── POST /api/ai/priya-landing — public (no auth) ───────────────────────────
ai.post('/priya-landing', async (c) => {
    try {
        const { message, history = [] } = await c.req.json();
        if (!message || typeof message !== 'string' || !message.trim())
            return c.json({ success: false, error: 'Message is required' }, 400);

        const text = message.trim().slice(0, 300);

        if (!c.env?.AI)
            return c.json({ success: true, reply: generateDevReply(text), dev: true });

        // FIX: same role normalisation as /priya
        const messages = [
            { role: 'system', content: LANDING_SYSTEM_PROMPT },
            ...normalizeHistory(history, 4, 200),
            { role: 'user', content: text }
        ];

        const response = await c.env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
            messages,
            max_tokens: 150,
            temperature: 0.6,
        });

        const reply = response?.response?.trim();
        if (!reply) return c.json({ success: false, fallback: true }, 200);

        // Log token usage for landing calls (userId = 0 = unauthenticated)
        const tokens = (response?.usage?.total_tokens) || Math.ceil((text.length + reply.length) / 4);
        logUsage(c.env.DATABASE_URL, 0, 'priya-landing', tokens);

        return c.json({ success: true, reply });

    } catch (err) {
        console.error('[Priya Landing AI]', err?.message || err);
        return c.json({ success: false, fallback: true }, 200);
    }
});

// FIX: export AFTER all routes are registered
export default ai;
