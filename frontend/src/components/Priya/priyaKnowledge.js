/**
 * Priya — SynapseX Guide Brain
 * ---------------------------------------------------------------------------
 * Single source of truth for what Priya is allowed to talk about.
 *
 * DESIGN CONTRACT (intentional — do not "upgrade" this into an open chatbot):
 *   Priya is SCOPED. She answers only the topics listed below. Free typed text
 *   is matched against these topics; anything outside the scope is rejected
 *   with a friendly redirect instead of being answered. This keeps her
 *   strictly bound to SynapseX and prevents invented features.
 *
 * To teach Priya something new: append one object to TOPICS. Nothing else in
 * the app needs to change — the matcher and the quick-reply chips are both
 * derived from this array automatically.
 */

export const PRIYA = {
    name: 'Priya',
    tagline: 'Your SynapseX Guide',
    status: 'Online · Trained on SynapseX only',
    // Shown once, on first open.
    intro: "Hi, I'm Priya — your personal SynapseX guide. \nI explain how this app works: your neural profile, the risk score, Stories, Reels, Creator Mode and more.\n\nPick a question below, or ask me about any SynapseX feature.",
    // Shown when the user asks something outside her scope.
    rejections: [
        "I'm sorry — I'm trained only on SynapseX, so I can't help with that. 🙂\nLet me redirect you to what I know:",
        "That's outside my neural link. I only guide you inside the SynapseX app.\nHere's what I can explain:",
        "I'm not able to answer that one. My knowledge is strictly limited to SynapseX features.\nTry one of these:"
    ],
    smalltalk: {
        greetings: ["hi", "hii", "hiii", "hello", "hey", "heyy", "yo", "namaste", "namaskar", "good morning", "good evening", "good afternoon"],
        thanks: ["thanks", "thank you", "thankyou", "thx", "ty", "awesome", "perfect", "great", "nice"],
        farewell: ["bye", "byee", "goodbye", "see you", "good night"],
        help: ["help", "menu", "options", "topics", "what can you do", "what can u do", "start"]
    },
    smalltalkReplies: {
        greeting: "Hello! 💚 Lovely to meet you. I'm Priya, your SynapseX guide.\nWhat would you like to know about the app?",
        thanks: "Anytime! 💚 That's what I'm here for. Anything else about SynapseX?",
        farewell: "Bye! 💚 Come back whenever you need a hand inside SynapseX.",
        help: "Here's everything I can help you with:"
    }
};

// Topics are the ONLY things Priya can answer.
// id         -> stable key (used for follow-ups + suggestions)
// chip       -> short text shown on the quick-reply buttons
// question   -> how it appears in the "menu" listing
// keywords   -> lowercase fragments that trigger this topic
// answer     -> what Priya says ( \n is respected by the chat renderer )
// followUps  -> topic ids Priya offers right after answering
// action     -> optional real in-app navigation
export const TOPICS = [
    {
        id: 'what-is-synapsex',
        chip: 'What is SynapseX?',
        question: 'What is SynapseX?',
        keywords: ['what is synapsex', 'about synapsex', 'about this app', 'what does this app do', 'what is this app', 'what is synapse', 'synapsex mean', 'purpose of this app'],
        answer: "SynapseX is an AI-integrated security and social platform. 🔐\nIt combines a familiar social experience — feed, Stories, Reels, profiles, likes and comments — with a behavioural AI layer that scores how you log in.\nThe interface is themed as a 'neural gateway'; that's the product's design language for security.",
        followUps: ['risk-score', 'create-account', 'what-can-you-do']
    },
    {
        id: 'what-can-you-do',
        chip: 'What can you help with?',
        question: 'What can you help me with?',
        keywords: ['what can you help', 'what can you do', 'your features', 'list of topics', 'how can you help', 'what do you know'],
        answer: "I can guide you through all of this: 💚\n• Creating an account and verifying your email\n• Logging in and understanding the neural risk score\n• Posts, protected posts, likes, comments and saved items\n• Stories and Reels\n• Your profile, followers and a private account\n• Creator Mode and verification\n• Notifications, Settings and logging out\n• Security, privacy and the Android app\nJust tap a question below!",
        followUps: ['create-account', 'login', 'stories', 'creator-mode']
    },
    {
        id: 'create-account',
        chip: 'Create an account',
        question: 'How do I create an account?',
        keywords: ['create account', 'create an account', 'sign up', 'signup', 'register', 'registration', 'new account', 'initialize identity', 'make an account'],
        answer: "Tap **Initialize Identity** on the home page. 🚀\n1. Enter your name, email, username and a password.\n2. We email you a one-time code (OTP) to confirm the address.\n3. Enter that code and your account is verified.\n4. Return to the login screen and access the Neural Hub.\nTip: your username is shown publicly with an @, so choose it carefully.",
        followUps: ['otp-problem', 'login'],
        action: { type: 'navigate', view: 'signup', label: 'Take me to Sign Up' }
    },
    {
        id: 'login',
        chip: 'How do I log in?',
        question: 'How do I log in?',
        keywords: ['log in', 'login', 'sign in', 'signin', 'access neural hub', 'how to enter'],
        answer: "Tap **Access Neural Hub** on the home page and enter your username and password. \nWhile you type, the app quietly reads your typing rhythm and mouse movement — that's what shows the 'Analyzing Neural Patterns…' message.\nOn success you receive a secure session that stays valid for about 2 hours.",
        followUps: ['risk-score', 'forgot-password', 'login-failing'],
        action: { type: 'navigate', view: 'login', label: 'Take me to Login' }
    },
    {
        id: 'risk-score',
        chip: 'What is the risk score?',
        question: 'What is the neural risk score?',
        keywords: ['risk score', 'riskscore', 'neural score', 'behavioural', 'behavioral', 'biometric', 'analyzing neural', 'ai score', 'how does the ai work'],
        answer: "It's SynapseX's behavioural security layer. 🧠\nWhen you log in, the AI service compares how you typed and moved the mouse against 'bot-like' patterns — for example unnaturally fast typing or no mouse movement at all.\nYou get a score from 0.0 (safe) to 1.0 (suspicious). It's stored with your account and shown to admins in the Command Center.\nNote: today it is advisory telemetry — it does not block your login.",
        followUps: ['security', 'privacy', 'login']
    },
    {
        id: 'forgot-password',
        chip: 'I forgot my password',
        question: 'I forgot my password — what now?',
        keywords: ['forgot password', 'forgot my password', 'reset password', 'password reset', 'recover password', 'lost password'],
        answer: "No problem. 💚\n1. On the login screen tap **Forgot password**.\n2. Enter the email address on your account.\n3. We send a one-time code by email.\n4. Enter the code and set a new password.\nIf the email doesn't arrive, check spam and confirm you're using the address you signed up with.",
        followUps: ['otp-problem', 'login']
    },
    {
        id: 'otp-problem',
        chip: "OTP didn't arrive",
        question: "My verification code didn't arrive",
        keywords: ['otp', 'verification code', 'code not received', 'didnt get code', 'did not get code', 'verify email', 'not verified', 'neural link not verified', 'no email'],
        answer: "Let's fix that. 📧\n• Wait a minute — mail can lag.\n• Check your Spam / Promotions folder.\n• Make sure you used the exact address you registered with.\n• Request the code again from the verification screen.\nUnverified accounts can't log in — you'll see 'Neural link not verified' until the email step is done.",
        followUps: ['create-account', 'forgot-password']
    },
    {
        id: 'login-failing',
        chip: 'Login is failing',
        question: 'Why is my login failing?',
        keywords: ['login not working', 'login failing', 'access denied', 'neural mismatch', 'wrong password', 'invalid credentials', 'cant log in'],
        answer: "The likely causes: \n• **Access Denied: Neural mismatch** means the username or password is wrong — use Forgot password to reset it.\n• **Neural link not verified** means your email OTP was never completed.\n• A brand-new account must be verified before its first login.\nIf the password is definitely correct, reset it once — that clears rare stale states.",
        followUps: ['forgot-password', 'otp-problem']
    },
    {
        id: 'feed',
        chip: 'How the feed works',
        question: 'How does the feed work?',
        keywords: ['feed', 'home feed', 'timeline', 'scroll feed', 'see posts', 'posts from others'],
        answer: "Your feed is the home screen after login. 🏠\nIt shows posts from the SynapseX community, newest first, with the Stories row pinned at the top.\nOn desktop you also get a sidebar with navigation and a right-hand column with suggestions; on mobile everything moves to a bottom navigation bar.\nThe feed caches locally, so returning to it feels instant while fresh data loads in the background.",
        followUps: ['create-post', 'stories', 'save-post']
    },
    {
        id: 'create-post',
        chip: 'Create a post',
        question: 'How do I create a post?',
        keywords: ['create post', 'create a post', 'new post', 'upload post', 'add post', 'share photo', 'post photo', 'how to post', 'post a video', 'upload video', 'add video', 'video post', 'share video'],
        answer: "Tap the **+** icon in the navigation. 📸\n1. Choose an image or a video from your device.\n2. Write a caption.\n3. Optionally set a password to lock that single post.\n4. Publish — it appears in your feed and on your profile right away.",
        followUps: ['post-password', 'feed']
    },
    {
        id: 'post-password',
        chip: 'Locked / protected posts',
        question: 'How do protected posts work?',
        keywords: ['protected post', 'post password', 'locked post', 'password protected', 'private post', 'lock post'],
        answer: "SynapseX can protect an individual post with its own password. 🔒\nYou set that password while creating the post. Anyone opening it — even a follower — must enter the password to reveal the media.\nIt applies per post, so the rest of your profile stays normal.",
        followUps: ['create-post', 'private-account']
    },
    {
        id: 'like-comment',
        chip: 'Likes & comments',
        question: 'How do likes and comments work?',
        keywords: ['like', 'likes', 'comment', 'comments', 'double tap', 'heart', 'reply'],
        answer: "Every post carries the usual social actions. ❤️\n• Tap the heart to like or unlike — one like per person per post.\n• Tap the comment icon to read and write comments.\n• On mobile you can double-tap the media to like it quickly.",
        followUps: ['save-post', 'create-post']
    },
    {
        id: 'save-post',
        chip: 'Saved posts',
        question: 'How do I save a post?',
        keywords: ['save post', 'saved', 'bookmark', 'saved posts', 'save for later'],
        answer: "Tap the bookmark icon on a post to save it. 🔖\nSaved posts are private to you — the author is never notified. You'll find them in the saved area of your profile whenever you want to come back to them.",
        followUps: ['profile', 'like-comment']
    },
    {
        id: 'stories',
        chip: 'How do Stories work?',
        question: 'How do Stories work?',
        keywords: ['story', 'stories', 'add story', 'story expires', 'story viewer', 'my story', 'upload story'],
        answer: "Stories are short updates that vanish after 24 hours. \n• Tap your avatar with the **+ badge** to add a Story — image or video.\n• You can add several in a row; they play one after another automatically.\n• Videos play for their real length, capped at 60 seconds.\n• While watching, you can mute or unmute, delete your own Story, or copy its link from the three-dot menu.\n• Only 5 Stories are shown at once — an arrow appears when there are more and slides the row two at a time.",
        followUps: ['story-ring', 'create-post', 'reels']
    },
    {
        id: 'story-ring',
        chip: 'What do the ring colours mean?',
        question: 'What do the story ring colours mean?',
        keywords: ['ring', 'ring colour', 'ring color', 'gradient ring', 'grey circle', 'gray circle', 'circle around', 'story ring'],
        answer: "The ring tells you who has something new. 💫\n• **Colourful gradient ring** — that person has active Stories, and tapping opens the story viewer.\n• **Grey, dimmed circle** — no active Stories, so tapping opens their profile instead.\nThe colour disappears on its own once the Story expires.",
        followUps: ['stories', 'profile']
    },
    {
        id: 'reels',
        chip: 'Reels',
        question: 'What are Reels?',
        keywords: ['reel', 'reels', 'short video', 'videos tab', 'video feed'],
        answer: "Reels is the short-video area of SynapseX. 🎬\nOpen it from the Reels icon in the navigation. You get a full-screen, scrollable video feed where you can like and comment exactly like on a normal post.",
        followUps: ['create-post', 'stories']
    },
    {
        id: 'profile',
        chip: 'My profile',
        question: 'How does my profile work?',
        keywords: ['profile', 'my profile', 'profile page', 'profile picture', 'avatar', 'bio', 'my account page'],
        answer: "Your profile is your identity inside SynapseX. 👤\nIt shows your profile picture, name, @username, bio, your posts grid and your stats — followers, following and posts.\nTap your avatar in the navigation to open it. Tapping someone else's avatar opens *their* profile in the same layout.",
        followUps: ['edit-profile', 'follow', 'private-account']
    },
    {
        id: 'edit-profile',
        chip: 'Edit my profile',
        question: 'How do I edit my profile?',
        keywords: ['edit profile', 'edit neural profile', 'change bio', 'change name', 'change username', 'update profile', 'profile photo change', 'crop photo'],
        answer: "Open your profile and tap **Edit Profile**. ✏️\nYou can change your name, bio, profile picture and links.\nThe image editor lets you crop and reposition your photo before saving it, so your avatar looks exactly how you want.",
        followUps: ['profile', 'creator-mode']
    },
    {
        id: 'follow',
        chip: 'Followers & following',
        question: 'How do followers and following work?',
        keywords: ['follow', 'followers', 'following', 'unfollow', 'follow back', 'how many followers'],
        answer: "Following someone adds their posts to your feed and their Stories to your Stories row. 🤝\n• Follow or unfollow from any profile using the button under their name.\n• Your follower and following counts live on your own profile.\n• Following someone is one-way until they follow you back.",
        followUps: ['private-account', 'profile']
    },
    {
        id: 'private-account',
        chip: 'Private account',
        question: 'How do I make my account private?',
        keywords: ['private account', 'private profile', 'profile private', 'make private', 'make my profile private', 'account private', 'public account', 'who can see my posts'],
        answer: "A private account hides your posts from people who don't follow you. 🔐\nYou can switch it on from Settings. When it's on, new followers must be approved before they can see your content — and your existing followers keep their access.",
        followUps: ['settings', 'follow']
    },
    {
        id: 'creator-mode',
        chip: 'Creator Mode',
        question: 'What is Creator Mode?',
        keywords: ['creator mode', 'creator', 'verification', 'get verified', 'blue tick', 'verified badge', 'become creator', 'monetise', 'monetize'],
        answer: "Creator Mode unlocks the tools for people who publish a lot. 🌟\n• **Verification** — request the verified badge and an admin reviews it.\n• **High-resolution uploads** — keep your media sharp instead of being compressed.\n• **Anonymous Shield** — extra protection for your identity.\n• **Deep Analytics** — richer insight into how your content performs.\nOpen Settings → Creator Mode to enable it and submit a verification request.",
        followUps: ['settings', 'admin', 'profile'],
        action: { type: 'navigate', view: 'profile', label: 'Open my profile' }
    },
    {
        id: 'notifications',
        chip: 'Notifications',
        question: 'How do notifications work?',
        keywords: ['notification', 'notifications', 'bell', 'alerts', 'who liked', 'who followed me', 'clear notifications'],
        answer: "The bell icon holds your activity. 🔔\nIt collects follows, likes, comments and platform announcements. Opening it marks things as seen and you can clear the list, which keeps your badge count at zero until something new arrives.\nOn mobile, notifications live in their own full-screen centre.",
        followUps: ['release-updates', 'settings']
    },
    {
        id: 'settings',
        chip: 'Settings',
        question: 'What is in Settings?',
        keywords: ['settings', 'preferences', 'account settings', 'change settings', 'privacy settings', 'profile settings'],
        answer: "Settings is the control room for your account. ⚙️\nFrom there you can edit your profile details, switch your account between public and private, manage Creator Mode, review your session information and log out.\nOn mobile the settings screen is compact and card-based; on desktop it sits in a wider panel beside the sidebar.",
        followUps: ['private-account', 'creator-mode', 'logout']
    },
    {
        id: 'logout',
        chip: 'Log out',
        question: 'How do I log out?',
        keywords: ['log out', 'logout', 'sign out', 'signout', 'terminate link', 'exit account'],
        answer: "Open Settings and choose the log-out action — on the native app it's labelled **Terminate Link**. \nThat clears your stored session token and returns you to the home page, so the next visitor can't get into your account.",
        followUps: ['settings', 'security']
    },
    {
        id: 'admin',
        chip: 'Admin Command Center',
        question: 'What is the Admin Command Center?',
        keywords: ['admin', 'command center', 'administrator', 'moderation', 'user management', 'review verification', 'admin panel'],
        answer: "The Command Center is the staff-only dashboard. 🛡️\nAdmins can list and search users, see each account's role, last login and neural risk score, approve or reject creator verification requests, and publish platform updates.\nIt only appears for accounts with the ADMIN role — regular users never see it.",
        followUps: ['creator-mode', 'release-updates']
    },
    {
        id: 'release-updates',
        chip: 'App updates & version',
        question: 'How do I know when the app updates?',
        keywords: ['update', 'updates', 'version', 'release notes', 'changelog', 'new version', 'whats new', 'build'],
        answer: "SynapseX keeps a release centre inside the app. 📦\nEach published update has a title, a version and a short summary of what changed — you can read the newest ones from the Updates section.\nEvery build also writes a build marker file, so the app can compare the version you're running against the one that's deployed and tell you when it's time to refresh.",
        followUps: ['sync-status', 'notifications']
    },
    {
        id: 'mobile-app',
        chip: 'Android app',
        question: 'Is there a mobile or Android app?',
        keywords: ['android app', 'mobile app', 'apk', 'install app', 'download app', 'native app', 'play store', 'app on phone'],
        answer: "Yes — SynapseX ships as an Android application as well as a website. \nThe app is the same SynapseX experience, packaged so it runs full-screen on your phone with its own launcher icon and no browser bars.\nOn mobile the interface switches to a bottom navigation bar and gesture-friendly layouts, which is what you see whenever the window is narrower than a tablet.",
        followUps: ['troubleshooting', 'sync-status']
    },
    {
        id: 'security',
        chip: 'Is my account secure?',
        question: 'Is my account secure?',
        keywords: ['security', 'secure', 'safe', 'encryption', 'hash', 'jwt', 'session', 'hacked', 'protect my account'],
        answer: "SynapseX takes a layered approach. ️\n• Passwords are stored as one-way bcrypt hashes — nobody, including admins, can read them.\n• Logging in issues a signed session token that expires after roughly two hours.\n• Every session records the device and IP address, so unusual access is visible.\n• The behavioural risk score adds an extra signal on top of the password.\nGood practice: never reuse your SynapseX password elsewhere, and log out on shared devices.",
        followUps: ['risk-score', 'privacy', 'logout']
    },
    {
        id: 'privacy',
        chip: 'What data is collected?',
        question: 'What data does SynapseX collect?',
        keywords: ['privacy', 'my data', 'collect', 'tracking', 'gdpr', 'personal information', 'privacy core', 'data policy'],
        answer: "Here's the honest answer. \n• Account data you provide — name, email, username, bio, profile picture.\n• Content you create — posts, Stories, comments, likes, saved items.\n• Security data — login timestamps, device/user-agent and IP address.\n• Behavioural data — at login only, the timing of your key presses and mouse movement, used to calculate the risk score.\nYou can limit who sees your content with a private account, and creators can switch on the Anonymous Shield.",
        followUps: ['security', 'private-account', 'risk-score']
    },
    {
        id: 'sync-status',
        chip: 'What does Sync Status mean?',
        question: 'What does Sync Status: Operational mean?',
        keywords: ['sync status', 'sync', 'operational', 'status', 'server status', 'is the app down', 'uptime'],
        answer: "**Sync Status: Operational** is the app's health indicator. ✅\nIt means your client can reach the SynapseX backend and your profile is in sync with the server.\nIf the backend ever becomes unreachable you'll see connection errors instead of that status — in which case it's a service-side issue, not something wrong with your account.",
        followUps: ['troubleshooting', 'release-updates']
    },
    {
        id: 'troubleshooting',
        chip: 'Something is broken',
        question: 'The app is not behaving properly',
        keywords: ['not working', 'broken', 'bug', 'error', 'stuck', 'loading forever', 'blank screen', 'crash', 'slow', 'glitch'],
        answer: "Let's troubleshoot together. 🔧\n1. Refresh the page, or fully close and reopen the app.\n2. Check your internet connection — the feed needs it to sync.\n3. If media won't load, switch between Wi-Fi and mobile data.\n4. Make sure you're on the newest build from the Updates section.\n5. Still stuck? Log out and back in — that clears a stale cached session.\nIf it carries on, it's likely service-side and worth reporting.",
        followUps: ['contact', 'sync-status']
    },
    {
        id: 'contact',
        chip: 'Talk to a human',
        question: 'How do I contact a human?',
        keywords: ['contact', 'support', 'human', 'report a problem', 'customer care', 'email support', 'admin contact', 'complain'],
        answer: "I can cover most questions about SynapseX, but if you need a person: \n• Report account or verification problems through the app so your account details are attached automatically.\n• Admins review creator-verification requests and reports from the Command Center.\n• For anything urgent about your account security, reset your password first, then report it.\nI'm always here too — just tap one of my questions.",
        followUps: ['troubleshooting', 'security']
    },
    {
        id: 'account-deletion',
        chip: 'Delete my account',
        question: 'Can I delete my account?',
        keywords: ['delete my account', 'delete account', 'deactivate', 'remove my account', 'close my account', 'remove account', 'delete profile'],
        answer: "I want to be straight with you: deleting an account isn't a self-service button in SynapseX today. \nWhat you *can* do right now:\n• Make your account private so only approved followers see your content.\n• Remove the content you don't want — individual posts and Stories can be deleted.\n• Log out on any device, which ends that session immediately.\nFor a full account removal, contact support and an admin will handle it from the Command Center.",
        followUps: ['private-account', 'contact', 'security']
    },
    // ── NEW TOPICS ───────────────────────────────────────────────────────────
    {
        id: 'direct-messages',
        chip: 'Direct messages',
        question: 'How do direct messages work?',
        keywords: ['direct message', 'dm', 'direct chat', 'chat', 'message someone', 'send a message', 'inbox', 'messages', 'private message', 'direct'],
        answer: "SynapseX has a built-in direct messaging system. 💬\n• Tap the chat icon in the top bar (or the **Direct** tab on mobile) to open your inbox.\n• Tap the **+** button to start a new conversation — search for any user by name or username.\n• Messages are delivered in real time and your inbox updates every few seconds automatically.\n• You can see when someone is **typing** — a live indicator appears in their chat.\n• Unread message counts show as badges on the chat icon so you never miss anything.",
        followUps: ['chat-password', 'chat-notifications', 'follow']
    },
    {
        id: 'chat-password',
        chip: 'Lock a chat with a password',
        question: 'How do I password-protect a chat?',
        keywords: ['chat password', 'lock chat', 'locked chat', 'password chat', 'protect chat', 'chat lock', 'private chat', 'secure chat', 'encrypt chat'],
        answer: "You can lock any conversation so only people with the password can read it. 🔒\n• When starting a **new chat**, toggle **Password-protect this chat** and set a password (min 4 characters).\n• Inside an **existing chat**, tap the lock icon in the top-right corner to open the Lock Manager.\n  — Set a new password, change an existing one, or remove the lock entirely.\n• Once locked, both participants need to enter the password to view messages.\n• The unlock is remembered for your current browser session — closing the tab re-locks it automatically.",
        followUps: ['direct-messages', 'security']
    },
    {
        id: 'chat-notifications',
        chip: 'Chat unread badges',
        question: 'How do chat unread badges work?',
        keywords: ['chat badge', 'unread messages', 'message count', 'chat notification', 'unread count', 'badge chat'],
        answer: "The chat icon shows a green number badge whenever you have unread messages. 🔢\n• The number counts all unread messages across every conversation.\n• Opening a conversation marks it as read automatically.\n• The badge resets to zero once all conversations are read.\nOn mobile, the badge also appears on the bottom navigation Direct tab.",
        followUps: ['direct-messages', 'notifications']
    },
    {
        id: 'search',
        chip: 'Search for people',
        question: 'How do I search for people?',
        keywords: ['search', 'find user', 'find people', 'search people', 'look up user', 'find account', 'discover people', 'search bar'],
        answer: "Tap the **Search** icon in the navigation. 🔍\n• Type a name or username to find any account on SynapseX.\n• Suggested users also appear on your feed sidebar (desktop) or the search screen (mobile).\n• From a search result you can view the profile and follow the person directly.",
        followUps: ['follow', 'profile']
    },
    {
        id: 'who-made-synapsex',
        chip: 'Who made SynapseX?',
        question: 'Who created SynapseX?',
        keywords: ['who made', 'who created', 'who built', 'developer', 'founder', 'creator of synapsex', 'who is behind', 'team behind', 'made by'],
        answer: "SynapseX was built by **Pralay** — a solo developer who designed and coded the entire platform from scratch. 🚀\nIt covers a full-stack React + Cloudflare Workers web app, an Android app, an AI risk-scoring service, and the real-time direct messaging system.\nPralay built it as both a showcase project and a working social platform.",
        followUps: ['what-is-synapsex', 'contact']
    },
    {
        id: 'priya-who-are-you',
        chip: 'Who are you, Priya?',
        question: 'Who are you?',
        keywords: ['who are you', 'what are you', 'are you a bot', 'are you ai', 'are you human', 'who is priya', 'what is priya', 'introduce yourself', 'about you', 'about priya'],
        answer: "I'm Priya — your personal SynapseX guide! 💚\nI'm a built-in AI assistant, trained exclusively on SynapseX. I can explain every feature, walk you through sign-up and login, help with problems, and answer questions about how the app works.\nI don't browse the internet or answer general knowledge questions — I stay focused on SynapseX so my answers are always accurate.",
        followUps: ['what-can-you-do', 'what-is-synapsex']
    },
    {
        id: 'username-rules',
        chip: 'Username rules',
        question: 'What are the username rules?',
        keywords: ['username', 'username rules', 'choose username', 'username format', 'username taken', 'change username', 'username characters'],
        answer: "Your username is your public identity on SynapseX. 👤\n• It must be unique — no two accounts can share one.\n• It's shown with an **@** in front wherever you appear.\n• Pick it carefully: while you *can* change it later from Edit Profile, everyone who follows you or @-mentions you will see the update immediately.\n• Avoid special characters that could confuse search — letters, numbers, underscores and dots work best.",
        followUps: ['create-account', 'edit-profile']
    },
    {
        id: 'password-rules',
        chip: 'Password requirements',
        question: 'What are the password requirements?',
        keywords: ['password rules', 'password requirements', 'strong password', 'password length', 'how long password', 'password format'],
        answer: "SynapseX asks for a reasonably strong password to protect your account. 🔐\n• Minimum 8 characters.\n• A mix of letters and numbers is recommended.\n• Avoid using the same password you use on other websites.\n• Passwords are stored as one-way bcrypt hashes — nobody can ever read your actual password, including admins.",
        followUps: ['security', 'forgot-password']
    },
    {
        id: 'session-expiry',
        chip: 'Why was I logged out?',
        question: 'Why was I automatically logged out?',
        keywords: ['logged out', 'auto logout', 'session expired', 'kicked out', 'signed out automatically', 'session ended', 'why logged out'],
        answer: "SynapseX sessions are short-lived for security. ⏱️\n• Your login token expires after roughly **2 hours** of inactivity.\n• If the app detects the token is invalid or expired, it logs you out automatically and returns you to the home page.\n• This protects you on shared devices — a stale session can't be reused by someone else.\nSimply log back in — your account and all your content are safe.",
        followUps: ['login', 'security']
    },
    {
        id: 'verified-badge',
        chip: 'How to get verified',
        question: 'How do I get a verified badge?',
        keywords: ['verified', 'verification', 'blue tick', 'get verified', 'apply verification', 'verification request', 'verified badge'],
        answer: "Verification on SynapseX confirms you're a genuine creator. ✅\n1. Enable **Creator Mode** in Settings.\n2. Submit a verification request — you'll find the button in the Creator Mode section.\n3. An admin reviews your request from the Command Center.\n4. If approved, a verified badge appears on your profile and posts.\nNote: the badge is admin-granted, not automatic — and it requires Creator Mode to be active.",
        followUps: ['creator-mode', 'admin']
    },
    {
        id: 'video-post',
        chip: 'Posting videos',
        question: 'How do I post a video?',
        keywords: ['post video', 'upload video', 'video post', 'share video', 'add video', 'video content', 'video upload'],
        answer: "Posting a video works the same as posting an image. 🎥\n• Tap **+** in the navigation.\n• Choose a video from your device — the uploader accepts common formats.\n• Add a caption and optionally set a post password.\n• Tap Publish and the video appears in the feed and on your profile.\nTip: for short, scrollable clips, the **Reels** tab is the dedicated video area.",
        followUps: ['create-post', 'reels', 'post-password']
    }
];
// ---------------------------------------------------------------------------
// Matching engine — this is the scope guard.
// ---------------------------------------------------------------------------

const normalize = (value) =>
    String(value || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// Words too generic to prove intent on their own.
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'or', 'in', 'on', 'for',
    'my', 'me', 'i', 'you', 'it', 'this', 'that', 'do', 'does', 'how', 'what',
    'can', 'where', 'when', 'with', 'about', 'please', 'pls', 'tell', 'give'
]);

export const getTopicById = (id) => TOPICS.find((topic) => topic.id === id) || null;

export const getTopicsByIds = (ids = []) =>
    ids.map((id) => getTopicById(id)).filter(Boolean);

/**
 * Scores one topic against a normalized query.
 * Whole phrases outrank single words, so "how do i log in" beats the word "log".
 */
const scoreTopic = (topic, query) => {
    let score = 0;

    topic.keywords.forEach((keyword) => {
        const phrase = normalize(keyword);
        if (!phrase) return;
        // Multi-word phrases are much stronger evidence than a single word.
        if (query.includes(phrase)) score += phrase.includes(' ') ? 6 : 3;
    });

    // Typing the visible question verbatim is decisive.
    if (normalize(topic.question) === query) score += 20;

    // Otherwise fall back to individual words, ignoring filler.
    const queryWords = query
        .split(' ')
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

    const topicHeadline = `${normalize(topic.question)} ${normalize(topic.chip)}`;
    const keywordHaystack = normalize(topic.keywords.join(' '));

    queryWords.forEach((word) => {
        // Words shared with her own curated question/chip wording are stronger
        // evidence of intent than words that only appear in the loose keywords.
        if (topicHeadline.includes(word)) score += 2;
        else if (keywordHaystack.includes(word)) score += 1;
    });

    return score;
};

// Below this we refuse to guess and use the out-of-scope reply instead.
const MATCH_THRESHOLD = 3;

/**
 * Resolves free-typed text into one of three outcomes:
 *   { type: 'topic', topic }      -> in scope, answer it
 *   { type: 'smalltalk', kind }   -> greeting / thanks / farewell / help
 *   { type: 'unscoped' }          -> politely refused
 */
export const resolveQuery = (rawInput) => {
    const query = normalize(rawInput);
    if (!query) return { type: 'unscoped' };

    const ranked = TOPICS
        .map((topic) => ({ topic, score: scoreTopic(topic, query) }))
        .sort((a, b) => b.score - a.score);

    // Topics are checked BEFORE smalltalk so that "help me log in" answers the
    // login question instead of dumping the whole menu.
    if (ranked.length && ranked[0].score >= MATCH_THRESHOLD) {
        return { type: 'topic', topic: ranked[0].topic };
    }

    const { smalltalk } = PRIYA;
    const words = new Set(query.split(' '));
    const isShort = query.split(' ').length <= 3;

    // Single words must match a WHOLE word here. Substring matching used to make
    // "are you chatgpt" look like a greeting, because "you" contains "yo".
    const matchesAny = (list) =>
        list.some((phrase) => {
            const candidate = normalize(phrase);
            if (!candidate) return false;
            return candidate.includes(' ') ? query.includes(candidate) : words.has(candidate);
        });

    if (isShort && matchesAny(smalltalk.greetings)) return { type: 'smalltalk', kind: 'greeting' };
    if (isShort && matchesAny(smalltalk.thanks)) return { type: 'smalltalk', kind: 'thanks' };
    if (isShort && matchesAny(smalltalk.farewell)) return { type: 'smalltalk', kind: 'farewell' };
    if (isShort && matchesAny(smalltalk.help)) return { type: 'smalltalk', kind: 'help' };

    return { type: 'unscoped' };
};

// Chips shown on first open and whenever she needs to re-offer the menu.
export const DEFAULT_SUGGESTION_IDS = [
    'what-is-synapsex',
    'create-account',
    'login',
    'risk-score',
    'stories',
    'create-post',
    'creator-mode',
    'settings'
];

export const getDefaultSuggestions = () => getTopicsByIds(DEFAULT_SUGGESTION_IDS);

// Rotates through the refusal messages so she never sounds robotic.
export const pickRejection = (attempt = 0) => {
    const list = PRIYA.rejections;
    return list[attempt % list.length];
};