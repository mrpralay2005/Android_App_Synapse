import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';
import LoginBox from './components/Login/LoginBox';
import SignUpBox from './components/Login/SignUpBox';
import OTPBox from './components/Login/OTPBox';
import ForgotPasswordBox from './components/Login/ForgotPasswordBox';
import LandingPage from './components/Login/LandingPage';
import InstagramLayout from './components/Social/InstagramLayout';

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

    // Persist view to localStorage
    useEffect(() => {
        localStorage.setItem('synapse_last_view', view);
        console.log('👀 View changed to:', view);
    }, [view]);

    const LIVE_API = "https://synapse-backend.pralayd140.workers.dev";

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
            const token = Cookies.get('synapse_token');
            const savedUser = localStorage.getItem('synapse_user_data');

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
                    userLoggedIn = true;
                    // Skip API verification temporarily if data exists
                    setTimeout(() => setIsLoading(false), 1200);
                    return;
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
                    handleLogout();
                    userLoggedIn = false;
                } else {
                    console.warn('Server error but keeping user logged in temporarily');
                    // SECURITY: Keep user logged in for server errors (5xx) but not network failures
                    if (response.status >= 500) {
                        // Server is down but will come back - keep user logged in
                        console.log('Server error (5xx) - keeping user logged in');
                    } else {
                        // Other client errors - logout for security
                        handleLogout();
                        userLoggedIn = false;
                    }
                }
            } catch (err) {
                console.error('Network error - cannot verify session');
                // SECURITY: Network failure means we cannot verify the session
                // Logout user for security since we can't verify the token
                console.log('Network failure - logging out for security');
                handleLogout();
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
            Cookies.set('synapse_token', token, { expires: 7, secure: true, sameSite: 'Lax' });
            console.log('🍪 Token cookie synchronized');
        }
        if (loginData.sessionId) {
            Cookies.set('session_id', loginData.sessionId, { expires: 7, secure: true, sameSite: 'Lax' });
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
        <motion.div className="App bg-black min-h-screen">
            <AnimatePresence mode="wait">
                {view === 'landing' && (
                    <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}>
                        <LandingPage onLogin={() => setView('login')} onRegister={() => setView('signup')} onExit={() => setIsExited(true)} />
                    </motion.div>
                )}
                {view === 'login' && (
                    <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
                        <LoginBox onSwitch={() => setView('signup')} onBack={() => setView('landing')} onLoginSuccess={handleLoginSuccess} onForgot={() => setView('forgot')} />
                    </motion.div>
                )}
                {view === 'forgot' && (
                    <motion.div key="forgot" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
                        <ForgotPasswordBox onBack={() => setView('login')} onSuccess={() => setView('login')} />
                    </motion.div>
                )}
                {view === 'signup' && (
                    <motion.div key="signup" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
                        <SignUpBox onSwitch={() => setView('login')} onBack={() => setView('landing')} onSuccess={(email) => { setOtpEmail(email); setView('otp'); }} />
                    </motion.div>
                )}
                {view === 'otp' && (
                    <motion.div key="otp" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
                        <OTPBox email={otpEmail} onVerified={() => setView('login')} onBack={() => setView('signup')} />
                    </motion.div>
                )}
                {view === 'profile' && user && (
                    <motion.div key="profile" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}>
                        <InstagramLayout currentUser={user} onLogout={handleLogout} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default App;
