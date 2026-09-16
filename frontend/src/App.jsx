import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';
import LoginBox from './components/Login/LoginBox';
import SignUpBox from './components/Login/SignUpBox';
import OTPBox from './components/Login/OTPBox';
import ForgotPasswordBox from './components/Login/ForgotPasswordBox';
import LandingPage from './components/Login/LandingPage';
import MobileLandingPage from './components/Mobile/LandingPageMobile';
import InstagramLayout from './components/Desktop/Social/InstagramLayout';
import MobileInstagramLayout from './components/Mobile/Social/MobileInstagramLayout';
import MobileLoginBox from './components/Mobile/Auth/LoginBox';
import MobileSignUpBox from './components/Mobile/Auth/SignUpBox';
import MobileOTPBox from './components/Mobile/Auth/OTPBox';
import MobileForgotPasswordBox from './components/Mobile/Auth/ForgotPasswordBox';
import './components/Mobile/Auth/mobileAuth.css';

// Synapse Core Logo
const SynapseLogo = ({ size = 60 }) => (
    <motion.div style={{ width: size, height: size }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-2 border-emerald-500/20 rotate-45 rounded-sm" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3], rotate: 45 }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-1/2 h-1/2 bg-emerald-500 shadow-[0_0_20px_#10b981] rounded-sm" />
        {[0, 1, 2, 3].map((i) => (
            <motion.div key={i} animate={{ y: [-10, 10, -10], x: i % 2 === 0 ? [-5, 5, -5] : [5, -5, 5], opacity: [0, 1, 0] }} transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }} className="absolute w-1 h-1 bg-emerald-400 rounded-full" style={{ top: i < 2 ? '0%' : '100%', left: i % 2 === 0 ? '0%' : '100%' }} />
        ))}
    </motion.div>
);

function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState(() => localStorage.getItem('synapse_last_view') || 'landing');
    const [isLoading, setIsLoading] = useState(true);
    const [isExited, setIsExited] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [isMobileView, setIsMobileView] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    });

    // Persist view to localStorage
    useEffect(() => {
        localStorage.setItem('synapse_last_view', view);
        console.log('👀 View changed to:', view);
    }, [view]);

    const LIVE_API = import.meta.env.VITE_API_URL || "https://synapse-backend.mrpralay2005.workers.dev";
    // The hostname check is a fail-safe: the protected staging URL remains a
    // preview even if a Pages environment variable is stale for one build.
    const isPreviewMode = import.meta.env.VITE_PREVIEW_MODE === 'true' || window.location.hostname.startsWith('staging.');
    const previewTestUsername = import.meta.env.VITE_PREVIEW_TEST_USERNAME || '';

    useEffect(() => {
        if (isPreviewMode && ['signup', 'otp', 'forgot'].includes(view)) setView('landing');
    }, [isPreviewMode, view]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobileView) {
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.overflow = 'hidden';
            document.body.style.background = '#0a0a0a';
            document.body.style.overscrollBehavior = 'none';
            document.body.style.width = '100vw';
            document.body.style.height = '100vh';
            document.documentElement.style.margin = '0';
            document.documentElement.style.padding = '0';
            document.documentElement.style.overflow = 'hidden';
            document.documentElement.style.background = '#0a0a0a';
            document.documentElement.style.width = '100%';
            document.documentElement.style.height = '100%';
        } else {
            document.body.style.margin = '';
            document.body.style.padding = '';
            document.body.style.overflow = '';
            document.body.style.background = '';
            document.body.style.overscrollBehavior = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.documentElement.style.margin = '';
            document.documentElement.style.padding = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.background = '';
            document.documentElement.style.width = '';
            document.documentElement.style.height = '';
        }

        return () => {
            document.body.style.margin = '';
            document.body.style.padding = '';
            document.body.style.overflow = '';
            document.body.style.background = '';
            document.body.style.overscrollBehavior = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.documentElement.style.margin = '';
            document.documentElement.style.padding = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.background = '';
            document.documentElement.style.width = '';
            document.documentElement.style.height = '';
        };
    }, [isMobileView]);

    useEffect(() => {
        let scrollTimeout;
        const handleScroll = () => {
            document.documentElement.classList.add('is-scrolling');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                document.documentElement.classList.remove('is-scrolling');
            }, 1000);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
        };
    }, []);

    useEffect(() => {
        const performNeuralSync = async () => {
            const isLocalApi = import.meta.env.DEV && (import.meta.env.VITE_API_URL || '').includes('localhost');
            const localSessionKey = 'synapse_local_session_api';

            // Local sessions must never reuse a token issued by the deployed Worker.
            // Mark a token only after a successful local login, so the first local run
            // always starts from the login page.
            if (isLocalApi && localStorage.getItem(localSessionKey) !== import.meta.env.VITE_API_URL) {
                Cookies.remove('synapse_token');
                Cookies.remove('session_id');
                localStorage.removeItem('synapse_user_data');
                localStorage.removeItem('synapse_last_view');
                setUser(null);
                setView('landing');
                setIsLoading(false);
                return;
            }

            const token = Cookies.get('synapse_token');
            const savedUser = localStorage.getItem('synapse_user_data');
            const sessionIsStillCurrent = () => Cookies.get('synapse_token') === token;

            // Debug simplified
            console.log('🍪 Session Check:', { hasToken: !!token, hasUser: !!savedUser });

            console.log('🔍 Token Debug:', {
                hasToken: !!token,
                tokenLength: token ? token.length : 0,
                tokenPreview: token ? token.substring(0, 50) + '...' : 'none',
                tokenType: typeof token
            });

            if (!token) {
                if (view === 'profile') setView('landing');
                setTimeout(() => setIsLoading(false), 800);
                return;
            }

            // SECURE APPROACH: Use cached data but verify with API
            let userLoggedIn = false;

            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    console.log('🎯 Setting user data and view to profile');
                    setUser(userData);
                    setView('profile');
                    // Cached profile data is only a visual placeholder. Continue to
                    // verify its session before allowing protected actions.
                } catch (e) {
                    console.error('Failed to parse saved user data:', e);
                    localStorage.removeItem('synapse_user_data');
                }
            }

            try {
                // Background Verification (non-blocking)
                console.log('🌐 Syncing session with token...');
                const response = await fetch(`${LIVE_API}/api/auth/me`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` },
                    credentials: 'include'
                });

                console.log('📡 Sync Response Status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ API Success:', data);
                    setUser(data.user);
                    setView('profile');
                    userLoggedIn = true;
                    // Refresh localStorage with new user data
                    localStorage.setItem('synapse_user_data', JSON.stringify(data.user));
                } else if (response.status === 401 || response.status === 403) {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn('🚫 Token invalid - Error:', errorData);
                    console.log('🚪 Calling handleLogout due to invalid token');
                    // SECURITY: Always logout on invalid tokens
                    // Do not let an old startup request erase a token issued by a
                    // successful login while that request was still in flight.
                    if (sessionIsStillCurrent()) handleLogout();
                    userLoggedIn = false;
                } else {
                    console.warn('Server error but keeping user logged in temporarily');
                    // SECURITY: Keep user logged in for server errors (5xx) but not network failures
                    if (response.status >= 500) {
                        // Server is down but will come back - keep user logged in
                        console.log('Server error (5xx) - keeping user logged in');
                    } else {
                        // Other client errors - logout for security
                        if (sessionIsStillCurrent()) handleLogout();
                        userLoggedIn = false;
                    }
                }
            } catch (err) {
                console.error('Network error - cannot verify session');
                // SECURITY: Network failure means we cannot verify the session
                // Logout user for security since we can't verify the token
                console.log('Network failure - logging out for security');
                if (sessionIsStillCurrent()) handleLogout();
                userLoggedIn = false;
            } finally {
                setTimeout(() => setIsLoading(false), 1200);
            }
        };

        performNeuralSync();
    }, []);

    const handleLoginSuccess = (loginData) => {
        const { user: userData, token } = loginData;
        console.log('🔑 Login Success - Token Debug:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            tokenPreview: token ? token.substring(0, 50) + '...' : 'none',
            userData: userData
        });
        setUser(userData);
        if (token) {
            // Secure cookies are required in production, but HTTP localhost cannot store them.
            Cookies.set('synapse_token', token, { expires: 7, secure: window.location.protocol === 'https:', sameSite: 'Lax' });
            if (import.meta.env.DEV && (import.meta.env.VITE_API_URL || '').includes('localhost')) {
                localStorage.setItem('synapse_local_session_api', import.meta.env.VITE_API_URL);
            }
            console.log('🍪 Token cookie synchronized');
        }
        if (loginData.sessionId) {
            Cookies.set('session_id', loginData.sessionId, { expires: 7, secure: window.location.protocol === 'https:', sameSite: 'Lax' });
            console.log('🍪 Session ID cookie set');
        }
        // Set user data in localStorage (The "Nametag")
        localStorage.setItem('synapse_user_data', JSON.stringify(userData));
        console.log('📦 User data stored in localStorage');
        setView('profile');
    };

    const handleLogout = async () => {
        console.log('🚪 LOGOUT TRIGGERED - Stack trace:', new Error().stack);
        try { await fetch(`${LIVE_API}/api/auth/logout`, { method: 'POST' }); } catch (e) { }
        setUser(null);
        // Clear ALL possible session cookies to be safe
        Cookies.remove('synapse_token');
        Cookies.remove('session_id');
        localStorage.removeItem('synapse_user_data');

        localStorage.removeItem('synapse_last_view');
        localStorage.removeItem('synapse_social_tab');
        localStorage.removeItem('synapse_local_session_api');

        console.log('Sweep complete, returning to landing');
        setView('landing');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <SynapseLogo size={50} />
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-500 text-[9px] uppercase tracking-[0.4em] font-bold mt-10 ml-1">
                        Neural Synchronization
                    </motion.p>
                </div>
            </div>
        );
    }

    if (isExited) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
                <SynapseLogo size={40} />
                <h1 className="text-2xl font-bold tracking-tighter text-white mb-2 italic mt-8">Connection Severed</h1>
                <button onClick={() => setIsExited(false)} className="mt-16 text-[9px] text-gray-700 hover:text-emerald-500/50 uppercase tracking-[0.3em] font-bold transition-colors">[ Re-initialize Link ]</button>
            </div>
        );
    }

    const pageVariants = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

    return (
        <motion.div
            className="App bg-black"
            style={{
                minHeight: isMobileView ? '100dvh' : '100vh',
                height: isMobileView ? '100dvh' : 'auto',
                overflow: isMobileView ? 'hidden' : 'visible',
                position: isMobileView ? 'fixed' : 'relative',
                inset: isMobileView ? '0' : 'auto',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
            }}
        >
            <AnimatePresence mode="wait">
                {view === 'landing' && (
                    <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }} className={isMobileView ? 'h-full' : undefined}>
                        {isMobileView ? (
                            <MobileLandingPage onLogin={() => setView('login')} onRegister={() => setView('signup')} onExit={() => setIsExited(true)} previewMode={isPreviewMode} />
                        ) : (
                            <LandingPage onLogin={() => setView('login')} onRegister={() => setView('signup')} onExit={() => setIsExited(true)} />
                        )}
                    </motion.div>
                )}
                {view === 'login' && (
                    <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className={isMobileView ? 'h-full' : undefined}>
                        {isMobileView ? (
                            <MobileLoginBox onSwitch={() => setView('signup')} onBack={() => setView('landing')} onLoginSuccess={handleLoginSuccess} onForgot={() => setView('forgot')} previewMode={isPreviewMode} previewTestUsername={previewTestUsername} />
                        ) : (
                            <LoginBox onSwitch={() => setView('signup')} onBack={() => setView('landing')} onLoginSuccess={handleLoginSuccess} onForgot={() => setView('forgot')} />
                        )}
                    </motion.div>
                )}
                {view === 'forgot' && (
                    <motion.div key="forgot" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className={isMobileView ? 'h-full' : undefined}>
                        {isMobileView ? (
                            <MobileForgotPasswordBox onBack={() => setView('login')} onSuccess={() => setView('login')} />
                        ) : (
                            <ForgotPasswordBox onBack={() => setView('login')} onSuccess={() => setView('login')} />
                        )}
                    </motion.div>
                )}
                {view === 'signup' && (
                    <motion.div key="signup" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className={isMobileView ? 'h-full' : undefined}>
                        {isMobileView ? (
                            <MobileSignUpBox onSwitch={() => setView('login')} onBack={() => setView('landing')} onSuccess={(email) => { setOtpEmail(email); setView('otp'); }} />
                        ) : (
                            <SignUpBox onSwitch={() => setView('login')} onBack={() => setView('landing')} onSuccess={(email) => { setOtpEmail(email); setView('otp'); }} />
                        )}
                    </motion.div>
                )}
                {view === 'otp' && (
                    <motion.div key="otp" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className={isMobileView ? 'h-full' : undefined}>
                        {isMobileView ? (
                            <MobileOTPBox email={otpEmail} onVerified={() => setView('login')} onBack={() => setView('signup')} />
                        ) : (
                            <OTPBox email={otpEmail} onVerified={() => setView('login')} onBack={() => setView('signup')} />
                        )}
                    </motion.div>
                )}
                {view === 'profile' && user && (
                    <motion.div key="profile" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}>
                        {isMobileView ? (
                            <MobileInstagramLayout currentUser={user} onLogout={handleLogout} />
                        ) : (
                            <InstagramLayout currentUser={user} onLogout={handleLogout} />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default App;
