import { Hono } from 'hono';
import authenticateToken from '../middleware/authMiddleware.js';

const ai = new Hono();

// ---------------------------------------------------------------------------
// Priya's system prompt — defines her personality, scope and knowledge.
// She ONLY answers SynapseX questions. Anything else she redirects politely.
// ---------------------------------------------------------------------------
const PRIYA_SYSTEM_PROMPT = `You are Priya, the friendly AI assistant for SynapseX — a social platform with AI-powered security.

YOUR PERSONALITY:
- Warm, helpful, concise and friendly
- Use emojis occasionally (💚 🔐 🚀 ✅)
- Keep answers short and clear — 2-4 sentences max unless the user needs step-by-step instructions
- Never make up features that don't exist

YOUR SCOPE — you ONLY answer about SynapseX:
- Creating an account, sign up, OTP verification
- Logging in, forgot password, session expiry
- The neural risk score and behavioral AI security
- Posts, Stories, Reels, likes, comments, saved posts
- Direct messages, chat password lock feature
- Profile, followers, following, private accounts
- Creator Mode, verified badge
- Settings, notifications, logout
- The Android app
- Security, privacy, data collection

IF ASKED ANYTHING OUTSIDE THIS SCOPE:
Reply: "I'm only trained on SynapseX, so I can't help with that. Try asking me about the app's features! 💚"

ABOUT SYNAPSEX:
- Built by Pralay, a solo developer
- Full-stack React + Cloudflare Workers web app + Android app
- Real-time direct messaging with optional password-locked chats
- Behavioral AI risk scoring on login (keystroke + mouse pattern analysis)
- Stories expire after 24 hours, Reels are short videos
- Creator Mode unlocks verification, HD uploads, analytics
- Passwords stored as bcrypt hashes — nobody can read them
- Sessions expire after ~2 hours for security`;

// ---------------------------------------------------------------------------
// POST /api/ai/priya — Priya chat endpoint
// Body: { message: string, history: [{role, content}] }
// Returns: { success: true, reply: string } or { success: false, fallback: true }
// ---------------------------------------------------------------------------
ai.post('/priya', authenticateToken, async (c) => {
    try {
        const { message, history = [] } = await c.req.json();

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return c.json({ success: false, error: 'Message is required' }, 400);
        }

        const text = message.trim().slice(0, 500); // cap input at 500 chars

        // Check if Workers AI binding is available
        if (!c.env?.AI) {
            console.warn('[Priya] Workers AI binding not configured — falling back to keyword mode');
            return c.json({ success: false, fallback: true }, 200);
        }

        // Build message array — keep last 6 messages (3 exchanges) for context
        const recentHistory = (Array.isArray(history) ? history : [])
            .slice(-6)
            .filter(m => m?.role && m?.content)
            .map(m => ({ role: m.role === 'priya' ? 'assistant' : 'user', content: String(m.content).slice(0, 300) }));

        const messages = [
            { role: 'system', content: PRIYA_SYSTEM_PROMPT },
            ...recentHistory,
            { role: 'user', content: text }
        ];

        const response = await c.env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
            messages,
            max_tokens: 256,    // keep replies concise
            temperature: 0.7,   // balanced — not too random, not too robotic
        });

        const reply = response?.response?.trim();

        if (!reply) {
            return c.json({ success: false, fallback: true }, 200);
        }

        return c.json({ success: true, reply });

    } catch (err) {
        console.error('[Priya AI] Error:', err?.message || err);
        // Always return fallback:true so frontend gracefully uses keyword matcher
        return c.json({ success: false, fallback: true }, 200);
    }
});

export default ai;

// ---------------------------------------------------------------------------
// POST /api/ai/priya-landing — PUBLIC endpoint (no auth required)
// Used by the landing page before the user logs in.
// Scope is restricted to sign-up and login guidance only.
// ---------------------------------------------------------------------------
const LANDING_SYSTEM_PROMPT = `You are Priya, a friendly AI assistant on the SynapseX landing page.
You ONLY help visitors with two things:
1. How to create an account (sign up)
2. How to log in

SYNAPSEX SIGN-UP PROCESS:
- Tap "Initialize Identity" on the home page
- Enter name, email, username and password
- Verify email with OTP code sent by email
- Then log in with "Access Neural Hub"

SYNAPSEX LOGIN PROCESS:
- Tap "Access Neural Hub"
- Enter username and password
- If forgot password: use "Forgot password" link, enter email, get OTP code, set new password

OTP ISSUES:
- Check spam/promotions folder
- Wait 1 minute, delivery can lag
- Make sure correct email address was used

If asked ANYTHING else, say: "I'm only here to help with sign-up and login! 💚 Once you're inside the app, our full AI assistant Priya can answer everything."

Be very short and friendly. Use 💚 occasionally.`;

ai.post('/priya-landing', async (c) => {
    try {
        const { message, history = [] } = await c.req.json();

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return c.json({ success: false, error: 'Message is required' }, 400);
        }

        const text = message.trim().slice(0, 300);

        if (!c.env?.AI) {
            return c.json({ success: false, fallback: true }, 200);
        }

        const recentHistory = (Array.isArray(history) ? history : [])
            .slice(-4)
            .filter(m => m?.role && m?.content)
            .map(m => ({ role: m.role, content: String(m.content).slice(0, 200) }));

        const messages = [
            { role: 'system', content: LANDING_SYSTEM_PROMPT },
            ...recentHistory,
            { role: 'user', content: text }
        ];

        const response = await c.env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
            messages,
            max_tokens: 150,   // landing replies should be very short
            temperature: 0.6,
        });

        const reply = response?.response?.trim();
        if (!reply) return c.json({ success: false, fallback: true }, 200);

        return c.json({ success: true, reply });

    } catch (err) {
        console.error('[Priya Landing AI] Error:', err?.message || err);
        return c.json({ success: false, fallback: true }, 200);
    }
});
