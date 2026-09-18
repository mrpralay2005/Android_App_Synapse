import React, { useState, useEffect } from 'react';
import {
    User, Lock, Mail, Shield, Zap, Download,
    Bell, Eye, Trash2, Smartphone, Globe, Palette,
    ChevronRight, Key, ShieldCheck, CreditCard, ChevronLeft,
    LogOut, AlertTriangle, CheckCircle2, X, TrendingUp,
    Activity, Clock, ShieldAlert, Cpu, EyeOff, Ghost, CheckCheck, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import AdminCommandCenter from './AdminCommandCenter';
import { ReleaseUpdatePanel } from './ReleaseUpdateCenter';

const SettingsView = ({ user, onUpdateUser, onLogout, onBack }) => {
    const [activeSection, setActiveSection] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [previousSection, setPreviousSection] = useState(null);
    const [interfaceTheme, setInterfaceTheme] = useState(() => {
        const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('synapse_interface_theme') : null;
        return ['prism', 'atelier', 'signal'].includes(savedTheme) ? savedTheme : 'current';
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Form States
    const [formData, setFormData] = useState({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        isPrivate: user.isPrivate || false,
        links: Array.isArray(user.links) ? user.links : [],
        creatorModeEnabled: user.creatorModeEnabled ?? false,
        creatorVerificationRequestedAt: user.creatorVerificationRequestedAt || null,
        creatorVerificationStatus: user.creatorVerificationStatus || 'NONE',
        creatorVerifiedAt: user.creatorVerifiedAt || null,
        creatorHighResUploads: user.creatorHighResUploads ?? false,
        creatorAnonymousShield: user.creatorAnonymousShield ?? false,
        creatorDeepAnalytics: user.creatorDeepAnalytics ?? false,
        showActivityStatus: user.showActivityStatus ?? true,
        readReceipts: user.readReceipts ?? true,
        ghostViewer: user.ghostViewer ?? false,
        protectedStories: user.protectedStories ?? false,
        profileVisitAlerts: user.profileVisitAlerts ?? true,
        notificationPostAlerts: user.notificationPostAlerts ?? true,
        notificationStoryAlerts: user.notificationStoryAlerts ?? true,
        notificationSecurityAlerts: user.notificationSecurityAlerts ?? true,
        quantumDecayEnabled: user.quantumDecayEnabled ?? false,
        quantumDecayDays: user.quantumDecayDays ?? 30,
        neuralGuardianEnabled: user.neuralGuardianEnabled ?? false,
    });

    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: '',
    });
    const [otpDigits, setOtpDigits] = useState(['', '', '', '']);

    const [otpSent, setOtpSent] = useState(false);
    const [emailEditOpen, setEmailEditOpen] = useState(false);
    const [emailChangeCodeSent, setEmailChangeCodeSent] = useState(false);
    const [emailChangeData, setEmailChangeData] = useState({ email: '', otp: '' });
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [archiveDownload, setArchiveDownload] = useState(null);
    const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || "https://synapse-backend.mrpralay2005.workers.dev";
    const token = Cookies.get('synapse_token');

    // Vital Sync: Fetch latest user data on mount if email or isPrivate is missing
    useEffect(() => {
        const syncIdentity = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${apiUrl}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setFormData({
                        name: data.user.name || '',
                        username: data.user.username || '',
                        email: data.user.email || '',
                        bio: data.user.bio || '',
                        isPrivate: data.user.isPrivate || false,
                        links: Array.isArray(data.user.links) ? data.user.links : [],
                        creatorModeEnabled: data.user.creatorModeEnabled ?? false,
                        creatorVerificationRequestedAt: data.user.creatorVerificationRequestedAt || null,
                        creatorVerificationStatus: data.user.creatorVerificationStatus || 'NONE',
                        creatorVerifiedAt: data.user.creatorVerifiedAt || null,
                        creatorHighResUploads: data.user.creatorHighResUploads ?? false,
                        creatorAnonymousShield: data.user.creatorAnonymousShield ?? false,
                        creatorDeepAnalytics: data.user.creatorDeepAnalytics ?? false,
                        showActivityStatus: data.user.showActivityStatus ?? true,
                        readReceipts: data.user.readReceipts ?? true,
                        ghostViewer: data.user.ghostViewer ?? false,
                        protectedStories: data.user.protectedStories ?? false,
                        profileVisitAlerts: data.user.profileVisitAlerts ?? true,
                        notificationPostAlerts: data.user.notificationPostAlerts ?? true,
                        notificationStoryAlerts: data.user.notificationStoryAlerts ?? true,
                        notificationSecurityAlerts: data.user.notificationSecurityAlerts ?? true,
                        quantumDecayEnabled: data.user.quantumDecayEnabled ?? false,
                        quantumDecayDays: data.user.quantumDecayDays ?? 30,
                        neuralGuardianEnabled: data.user.neuralGuardianEnabled ?? false,
                    });
                    onUpdateUser(data.user);
                }
            } catch (err) {
                console.error("Identity Sync Failed", err);
            }
        };
        syncIdentity();
    }, []);

    const menuItems = [
        { id: 'profile', label: 'Professional Deck', icon: <Sparkles size={20} />, description: 'Creator tools and professional signals' },
        { id: 'security', label: 'Security Core', icon: <Shield size={20} />, description: 'Passwords, OTP and Login activity' },
        { id: 'privacy', label: 'Privacy Link', icon: <Eye size={20} />, description: 'Manage account visibility and status' },
        { id: 'analytics', label: 'Neural Analytics', icon: <TrendingUp size={20} />, description: 'Track resonance and visitor frequency' },
        { id: 'advanced', label: 'Advanced Protocols', icon: <Zap size={20} />, description: 'Quantum decay and neural guardian' },
        { id: 'notifications', label: 'Notification Pulse', icon: <Bell size={20} />, description: 'Configure alerts and neural pings' },
        { id: 'interface', label: 'Neural Interface', icon: <Palette size={20} />, description: 'Customize glow levels and glass intensity' },
        { id: 'data', label: 'Archive & Synapses', icon: <Download size={20} />, description: 'Download your data or clear activity' },
        { id: 'account', label: 'Account Center', icon: <User size={20} />, description: 'Review your identity and account controls' },
    ];
    // Admins manage the platform through Command Center, so the end-user support
    // shortcut would be redundant and makes the compact settings overview overflow.
    if (user.role !== 'ADMIN') menuItems.splice(menuItems.length - 1, 0, { id: 'help', label: 'System Support', icon: <Globe size={20} />, description: 'Documentation and nexus assistance' });
    if (user.role === 'ADMIN') menuItems.unshift({ id: 'admin', label: 'Admin Command Center', icon: <ShieldCheck size={20} />, description: 'Review platform operations and creator requests' });

    const showStatus = (type, text) => {
        setStatusMsg({ type, text });
        setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    };

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                onUpdateUser(data.data);
                showStatus('success', 'Neural Identity Synchronized Successfully');
            } else {
                showStatus('error', data.error || 'Sync Failed');
            }
        } catch (err) {
            showStatus('error', 'Sync Failed: Connection Severed');
        } finally {
            setLoading(false);
        }
    };

    const saveCreatorSetting = async (changes, successMessage) => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(changes)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Creator settings could not be saved');
            setFormData(current => ({
                ...current,
                ...data.data,
                links: Array.isArray(data.data.links) ? data.data.links : current.links
            }));
            onUpdateUser(data.data);
            showStatus('success', successMessage);
        } catch (err) {
            showStatus('error', err.message || 'Creator settings could not be saved');
        } finally {
            setLoading(false);
        }
    };

    const saveSetting = async (key, nextValue, label) => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/user/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ [key]: nextValue })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Privacy preference could not be saved');
            // Older API builds acknowledge the update but do not echo newer
            // privacy fields. Keep the switch in the state the user selected
            // unless the server explicitly returns a boolean value for it.
            const savedValue = typeof data.data?.[key] === 'boolean' ? data.data[key] : nextValue;
            setFormData(current => ({ ...current, ...data.data, [key]: savedValue }));
            onUpdateUser({ ...data.data, [key]: savedValue });
            showStatus('success', typeof nextValue === 'boolean' ? `${label} ${nextValue ? 'enabled' : 'disabled'}` : `${label} saved`);
        } catch (err) {
            showStatus('error', err.message || 'Privacy preference could not be saved');
        } finally {
            setLoading(false);
        }
    };

    const savePrivacySetting = (key, label) => saveSetting(key, !formData[key], label);

    // A theme is only a local visual preference.  Keeping it out of saveSetting
    // prevents a palette change from touching user data or an authenticated API.
    const selectInterfaceTheme = (themeId) => {
        setInterfaceTheme(themeId);
        if (themeId === 'current') {
            localStorage.removeItem('synapse_interface_theme');
            document.documentElement.removeAttribute('data-synapse-theme');
            return;
        }
        localStorage.setItem('synapse_interface_theme', themeId);
        document.documentElement.dataset.synapseTheme = themeId;
    };

    const downloadArchive = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/user/archive/export`, { headers: { Authorization: `Bearer ${token}` } });
            const raw = await res.text();
            let data;
            try { data = JSON.parse(raw); } catch { throw new Error('Archive service error. Please try again in a moment.'); }
            if (!data.success) throw new Error(data.error || 'Archive could not be prepared');
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            if (archiveDownload?.url) URL.revokeObjectURL(archiveDownload.url);
            const url = URL.createObjectURL(blob);
            const filename = `synapsex-archive-${formData.username || 'account'}-${new Date().toISOString().slice(0, 10)}.json`;
            setArchiveDownload({ url, filename });
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            showStatus('success', 'Archive prepared. If a download does not start, use the Download now button below.');
        } catch (err) {
            showStatus('error', err.message || 'Archive could not be prepared');
        } finally {
            setLoading(false);
        }
    };

    const purgeActivityData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/user/archive/purge-activity`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const raw = await res.text();
            let data;
            try { data = JSON.parse(raw); } catch { throw new Error('Activity service error. Please try again in a moment.'); }
            if (!data.success) throw new Error(data.error || 'Activity could not be cleared');
            ['synapse_feed_posts', 'synapse_stories', 'synapse_suggested'].forEach(key => localStorage.removeItem(key));
            window.dispatchEvent(new Event('synapse-notifications-cleared'));
            setPurgeConfirmOpen(false);
            showStatus('success', 'Viewing history and notification activity cleared');
        } catch (err) {
            showStatus('error', err.message || 'Activity could not be cleared');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeSection !== 'analytics' || !token) return;
        let active = true;
        setAnalyticsLoading(true);
        fetch(`${apiUrl}/api/user/analytics`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => { if (active && data.success) setAnalytics(data.data); })
            .catch(() => { if (active) showStatus('error', 'Analytics could not be loaded'); })
            .finally(() => { if (active) setAnalyticsLoading(false); });
        return () => { active = false; };
    }, [activeSection, token]);

    const handleRequestOTP = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email || user.email })
            });
            const data = await res.json();
            if (data.success) {
                setOtpSent(true);
                showStatus('success', 'OTP Transmitted to your Neural Mail');
            } else {
                showStatus('error', data.error || 'Transmission Failed');
            }
        } catch (err) {
            showStatus('error', 'Transmission Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newDigits = [...otpDigits];
        newDigits[index] = value.slice(-1);
        setOtpDigits(newDigits);

        // Auto focus next
        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').slice(0, 4);
        if (!/^\d+$/.test(data)) return;
        const newDigits = [...otpDigits];
        data.split('').forEach((char, i) => {
            if (i < 4) newDigits[i] = char;
        });
        setOtpDigits(newDigits);
        // Focus last or next available
        const targetIdx = data.length < 4 ? data.length : 3;
        document.getElementById(`otp-${targetIdx}`)?.focus();
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const combinedOtp = otpDigits.join('');
        if (combinedOtp.length < 4) {
            showStatus('error', 'Incomplete Neural Code');
            return;
        }
        if (passwordData.new !== passwordData.confirm) {
            showStatus('error', 'Neural Mismatch: Passwords do not align');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email || user.email,
                    otp: combinedOtp,
                    newPassword: passwordData.new
                })
            });
            const data = await res.json();
            if (data.success) {
                showStatus('success', 'Neural Key Recalibrated');
                setOtpSent(false);
                setOtpDigits(['', '', '', '']);
                setPasswordData({ current: '', new: '', confirm: '' });
            } else {
                showStatus('error', data.error || 'Recalibration Failed');
            }
        } catch (err) {
            showStatus('error', 'Recalibration Failed: Connection Error');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestEmailChange = async (e) => {
        e.preventDefault();
        const email = emailChangeData.email.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            showStatus('error', 'Enter a valid new email address');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/auth/request-email-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Could not send a confirmation code');
            setEmailChangeCodeSent(true);
            showStatus('success', 'Confirmation code sent to your new email');
        } catch (err) {
            showStatus('error', err.message || 'Could not start the email change');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEmailChange = async (e) => {
        e.preventDefault();
        if (!/^\d{4}$/.test(emailChangeData.otp.trim())) {
            showStatus('error', 'Enter the four-digit confirmation code');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/auth/confirm-email-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ otp: emailChangeData.otp.trim() })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Could not confirm the email change');
            setFormData(current => ({ ...current, email: data.data.email }));
            onUpdateUser(data.data);
            setEmailEditOpen(false);
            setEmailChangeCodeSent(false);
            setEmailChangeData({ email: '', otp: '' });
            showStatus('success', 'Your email address has been updated');
        } catch (err) {
            showStatus('error', err.message || 'Could not confirm the email change');
        } finally {
            setLoading(false);
        }
    };

    const openMobileSection = (id) => {
        const subSections = ['neural-docs', 'nexus-support', 'legal-nodes', 'patch-notes'];
        if (subSections.includes(id)) {
            setPreviousSection('help');
        } else {
            setPreviousSection(null);
        }
        setActiveSection(id);
        if (isMobile) {
            setMobileDetailOpen(true);
        } else {
            setIsTransitioning(true);
        }
    };

    const closeMobileSection = () => {
        if (previousSection) {
            setActiveSection(previousSection);
            setPreviousSection(null);
        } else {
            setMobileDetailOpen(false);
        }
    };

    if (isMobile && !mobileDetailOpen) {
        return (
            <div className="synapse-settings flex h-full w-full flex-col bg-[#0a0a0a] px-3 pb-3 pt-2">
                <div className="mb-6 flex h-10 items-center justify-between">
                    <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-colors active:bg-white/10" aria-label="Back to feed">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-xl font-bold tracking-[-0.05em] text-white">Settings</div>
                    <div className="h-10 w-10" />
                </div>

                <div className="flex max-h-[calc(100%-3rem)] flex-none flex-col overflow-y-auto rounded-[1.35rem] border border-white/[0.08] bg-[#101113] p-1.5 hide-scrollbar">
                    <div className="space-y-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => openMobileSection(item.id)}
                                className="flex h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-white transition-colors active:bg-white/[0.07]"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.045] text-gray-400">
                                    {item.icon}
                                </div>
                                <span className="flex-1 text-[0.95rem] font-semibold tracking-[-0.025em]">{item.label}</span>
                                <ChevronRight size={16} className="text-gray-600" />
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onLogout}
                        className="mt-1 flex h-[44px] w-full shrink-0 items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 text-left text-sm font-bold text-red-400"
                    >
                        <ChevronLeft size={18} className="rotate-180" />
                        <span>Sever Connection</span>
                    </button>
                </div>
            </div>
        );
    }

    if (isMobile && mobileDetailOpen) {
        return (
            <div className="synapse-settings flex h-full w-full flex-col bg-[#0f0f0f]">
                <div className="settings-mobile-header relative flex h-14 items-center justify-between border-b border-white/10 px-4">
                    <button
                        onClick={closeMobileSection}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                        aria-label="Back to settings"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="absolute inset-x-14 truncate text-center text-xl font-bold tracking-[-0.05em] text-white">{
                        activeSection === 'neural-docs' ? 'Neural Docs' :
                        activeSection === 'nexus-support' ? 'Nexus Support' :
                        activeSection === 'legal-nodes' ? 'Legal Nodes' :
                        activeSection === 'patch-notes' ? 'Patch Notes' :
                        menuItems.find(item => item.id === activeSection)?.label || 'Settings'
                    }</div>
                    <div className="h-10 w-10" />
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar px-2 pb-2 pt-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full"
                        >
                            {renderSettingPanel()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    function renderSettingPanel() {
        return (
            <motion.div
                key={activeSection}
                initial={isMobile ? { opacity: 0, x: 30 } : { opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                animate={isMobile ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={isMobile ? { opacity: 0, x: -30 } : { opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={isMobile ? 'settings-mobile-detail h-full w-full overflow-y-auto hide-scrollbar p-4' : 'h-full overflow-y-auto hide-scrollbar p-4 sm:p-6 md:p-8 lg:p-10'}
                layout
            >
                        {activeSection === 'account' && (
                            <div className="space-y-5">
                                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                            <User size={25} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-xl font-bold tracking-tight text-white">{user.name || user.username}</h3>
                                            <p className="mt-0.5 truncate text-sm text-gray-500">@{user.username}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.025]">
                                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
                                        <span className="text-sm text-gray-400">Neural address</span>
                                        <span className="max-w-[58%] truncate text-sm font-medium text-white">{formData.email || user.email}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-4">
                                        <span className="text-sm text-gray-400">Account visibility</span>
                                        <span className="text-sm font-medium text-white">{formData.isPrivate ? 'Private' : 'Public'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveSection('profile')}
                                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-sm font-semibold text-white transition-colors active:bg-white/[0.08]"
                                >
                                    Edit professional profile
                                    <ChevronRight size={18} className="text-gray-500" />
                                </button>
                            </div>
                        )}

                        {activeSection === 'admin' && user.role === 'ADMIN' && <AdminCommandCenter />}

                        {activeSection === 'profile' && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                                className="space-y-6 sm:space-y-12"
                            >
                                <section>
                                    <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
                                        <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-lg font-bold tracking-tight text-white sm:text-2xl">Professional Deck</motion.h3>
                                        <button
                                            type="button"
                                            onClick={() => saveCreatorSetting({ creatorModeEnabled: !formData.creatorModeEnabled }, formData.creatorModeEnabled ? 'Creator mode paused' : 'Creator mode enabled')}
                                            disabled={loading}
                                            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors disabled:opacity-50 sm:gap-2 sm:px-4 ${formData.creatorModeEnabled ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white/[0.03] border-white/10'}`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${formData.creatorModeEnabled ? 'bg-indigo-400 animate-pulse' : 'bg-gray-500'}`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.creatorModeEnabled ? 'text-indigo-400' : 'text-gray-500'}`}>{formData.creatorModeEnabled ? 'Creator Mode On' : 'Creator Mode Off'}</span>
                                        </button>
                                    </div>

                                    {statusMsg.text && (
                                        <div className={`mb-5 rounded-xl border px-3 py-2 text-xs font-medium ${statusMsg.type === 'error' ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
                                            {statusMsg.text}
                                        </div>
                                    )}

                                    {!formData.creatorModeEnabled && (
                                        <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-gray-400">
                                            Turn on Creator Mode to manage verification, creator tools, and professional links. Your previous choices are kept safely.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-8">
                                        {/* Verification Status Card */}
                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 sm:rounded-[2.5rem] sm:p-8">
                                            <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110 sm:p-8">
                                                <ShieldCheck size={36} className="text-emerald-500 sm:hidden" />
                                                <ShieldCheck size={48} className="hidden text-emerald-500 sm:block" />
                                            </div>
                                            <h4 className="mb-1.5 text-base font-bold text-white sm:mb-2 sm:text-lg">Signal Verification</h4>
                                            <p className="mb-4 max-w-[85%] text-[11px] font-medium leading-relaxed text-gray-500 sm:mb-6 sm:max-w-none sm:text-xs">Confirm your neural identity to receive the verified creator surge.</p>
                                            <button
                                                type="button"
                                                disabled={loading || !formData.creatorModeEnabled || ['PENDING', 'APPROVED'].includes(formData.creatorVerificationStatus)}
                                                onClick={() => saveCreatorSetting({ requestCreatorVerification: true }, 'Verification request sent for review')}
                                                className="rounded-xl bg-indigo-500 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-black shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-2.5 sm:text-[10px] sm:tracking-widest"
                                            >
                                                {formData.creatorVerificationStatus === 'APPROVED' ? 'Verified Creator' : formData.creatorVerificationStatus === 'PENDING' ? 'Verification Request Pending' : 'Request Verification'}
                                            </button>
                                        </motion.div>

                                        {/* Monetization Pulse Card */}
                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 sm:rounded-[2.5rem] sm:p-8">
                                            <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110 sm:p-8">
                                                <CreditCard size={36} className="text-blue-500 sm:hidden" />
                                                <CreditCard size={48} className="hidden text-blue-500 sm:block" />
                                            </div>
                                            <h4 className="mb-1.5 text-base font-bold text-white sm:mb-2 sm:text-lg">Monetization Pulse</h4>
                                            <p className="mb-4 max-w-[85%] text-[11px] font-medium leading-relaxed text-gray-500 sm:mb-6 sm:max-w-none sm:text-xs">Creator earnings will appear here once monetization is available.</p>
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <span className="font-mono text-lg font-bold text-white sm:text-xl">$0.00</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wide text-gray-600 sm:text-[10px] sm:tracking-widest">Not eligible yet</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </section>

                                <motion.section variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="border-t border-white/5 pt-6 sm:pt-12">
                                    <h4 className="mb-5 flex items-center gap-2 text-base font-bold text-white sm:mb-8 sm:gap-3 sm:text-lg">
                                        <Zap size={18} className="text-amber-500 sm:hidden" />
                                        <Zap size={20} className="hidden text-amber-500 sm:block" />
                                        Advanced Creator Tools
                                    </h4>

                                    <div className="space-y-2.5 sm:space-y-4">
                                        {[
                                            { key: 'creatorHighResUploads', label: 'High-Res Transmissions', desc: 'Prefer high-resolution media uploads when supported' },
                                            { key: 'creatorAnonymousShield', label: 'Anonymous Shield', desc: 'Hide your reel viewer count on your profile' },
                                            { key: 'creatorDeepAnalytics', label: 'Deep Analytics Surge', desc: 'Enable detailed creator analytics when available' }
                                        ].map((tool, idx) => (
                                            <div key={idx} className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition-all hover:bg-white/5 sm:rounded-2xl sm:p-6">
                                                <div className="min-w-0">
                                                    <h5 className="mb-0.5 text-[13px] font-bold text-white sm:mb-1 sm:text-sm">{tool.label}</h5>
                                                    <p className="text-[9px] font-medium leading-relaxed text-gray-500 opacity-60 sm:text-[10px] sm:uppercase sm:tracking-widest">{tool.desc}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label={`Toggle ${tool.label}`}
                                                    aria-pressed={formData[tool.key]}
                                                    disabled={loading || !formData.creatorModeEnabled}
                                                    onClick={() => saveCreatorSetting({ [tool.key]: !formData[tool.key] }, `${tool.label} ${formData[tool.key] ? 'disabled' : 'enabled'}`)}
                                                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-50 sm:w-12 ${formData[tool.key] ? 'bg-emerald-500' : 'bg-white/10'}`}
                                                >
                                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData[tool.key] ? 'right-1' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.section>

                                <motion.section variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="border-t border-white/5 pt-6 sm:pt-12">
                                    <div className="mb-5 flex items-center gap-3 sm:mb-8 sm:gap-4">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 sm:h-10 sm:w-10">
                                            <Globe size={18} className="sm:hidden" />
                                            <Globe size={20} className="hidden sm:block" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold tracking-tight text-white sm:text-lg">Professional Nexus Links</h4>
                                            <p className="text-[9px] font-bold text-gray-500 sm:text-[10px] sm:uppercase sm:tracking-widest">Connect your external professional synapses</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 sm:space-y-4">
                                        <AnimatePresence>
                                            {(Array.isArray(formData.links) ? formData.links : []).map((link, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="group flex gap-2.5 sm:gap-4"
                                                >
                                                    <input
                                                        type="text"
                                                        value={link}
                                                        disabled={!formData.creatorModeEnabled}
                                                        onChange={e => {
                                                            const newLinks = [...formData.links];
                                                            newLinks[idx] = e.target.value;
                                                            setFormData({ ...formData, links: newLinks });
                                                        }}
                                                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition-all focus:border-indigo-500/50 focus:bg-indigo-500/5 focus:outline-none sm:rounded-2xl sm:px-6 sm:py-4"
                                                        placeholder="https://portfolio.nova.com"
                                                    />
                                                    <button
                                                        disabled={!formData.creatorModeEnabled}
                                                        onClick={() => {
                                                            const newLinks = formData.links.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, links: newLinks });
                                                        }}
                                                        className="rounded-xl bg-red-500/10 p-3 text-red-500 transition-all hover:bg-red-500/20 sm:rounded-2xl sm:p-4"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileActive={{ scale: 0.98 }}
                                            onClick={() => setFormData({ ...formData, links: [...formData.links, ''] })}
                                            disabled={!formData.creatorModeEnabled}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-500 sm:rounded-2xl sm:py-4 sm:text-[10px] sm:tracking-widest"
                                        >
                                            <X size={14} className="rotate-45" /> Add Professional Synapse
                                        </motion.button>
                                    </div>

                                    <div className="mt-6 flex sm:mt-12 sm:justify-end">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileActive={{ scale: 0.95 }}
                                            onClick={handleUpdateProfile}
                                            disabled={loading || !formData.creatorModeEnabled}
                                            className="w-full rounded-xl bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black shadow-xl transition-all hover:bg-gray-200 disabled:opacity-50 sm:w-auto sm:rounded-2xl sm:px-12 sm:py-4 sm:text-xs sm:tracking-[0.3em]"
                                        >
                                            {loading ? 'Propagating Changes...' : 'Save Creator Settings'}
                                        </motion.button>
                                    </div>
                                </motion.section>
                            </motion.div>
                        )}

                        {activeSection === 'security' && (
                            <div className="relative min-h-[500px]">
                                {statusMsg.text && (
                                    <div className={`mb-4 rounded-xl border px-3 py-2 text-xs font-medium ${statusMsg.type === 'error' ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
                                        {statusMsg.text}
                                    </div>
                                )}
                                <AnimatePresence mode="wait">
                                    {(!emailEditOpen && !otpSent) ? (
                                        <motion.div
                                            key="security-overview"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="space-y-6 sm:space-y-12"
                                        >
                                            <section>
                                                <h3 className="mb-5 text-lg font-bold tracking-tight text-white sm:mb-8 sm:text-2xl">Security Core</h3>
                                                <div className="space-y-3 sm:space-y-6">
                                                    {/* Password Section */}
                                                    <div className="group flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition-all duration-500 hover:border-emerald-500/30 hover:bg-white/[0.07] md:flex-row md:gap-8 md:p-8 md:text-left sm:rounded-[2.5rem]">
                                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl">
                                                            <Key size={22} className="sm:hidden" /><Key size={30} className="hidden sm:block" />
                                                        </div>
                                                        <div className="flex-1 text-center md:text-left">
                                                            <h4 className="mb-1 text-base font-bold tracking-tight text-white sm:text-lg">Update Neural Key</h4>
                                                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500 opacity-60 sm:text-[10px] sm:tracking-[0.2em]">Reset your encrypted login credentials</p>
                                                        </div>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileActive={{ scale: 0.95 }}
                                                            onClick={handleRequestOTP}
                                                            disabled={loading}
                                                            className="rounded-xl bg-white px-5 py-2.5 text-[9px] font-bold uppercase tracking-wider text-black shadow-xl shadow-white/5 transition-all hover:bg-gray-200 disabled:opacity-50 sm:px-8 sm:py-3 sm:text-[10px] sm:tracking-[0.2em]"
                                                        >
                                                            {loading ? 'Initializing...' : 'Initialize Reset'}
                                                        </motion.button>
                                                    </div>

                                                    {/* Email Re-Link Card */}
                                                    <div className="group flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition-all duration-500 hover:border-blue-500/30 hover:bg-white/[0.07] md:flex-row md:gap-8 md:p-8 md:text-left sm:rounded-[2.5rem]">
                                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl">
                                                            <Mail size={22} className="sm:hidden" /><Mail size={30} className="hidden sm:block" />
                                                        </div>
                                                        <div className="flex-1 text-center md:text-left">
                                                            <h4 className="mb-1 text-base font-bold tracking-tight text-white sm:text-lg">Email Re-Link</h4>
                                                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500 opacity-60 sm:text-[10px] sm:tracking-[0.2em]">Update your core communication synapse</p>
                                                        </div>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileActive={{ scale: 0.95 }}
                                                            onClick={() => { setEmailEditOpen(true); setEmailChangeCodeSent(false); setEmailChangeData({ email: '', otp: '' }); }}
                                                            className="rounded-xl bg-white px-5 py-2.5 text-[9px] font-bold uppercase tracking-wider text-black shadow-xl shadow-white/5 transition-all hover:bg-gray-200 sm:px-8 sm:py-3 sm:text-[10px] sm:tracking-[0.2em]"
                                                        >
                                                            Modify Link
                                                        </motion.button>
                                                    </div>

                                                    {/* Active Terminals Card */}
                                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-[2.5rem] sm:p-8">
                                                        <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-white sm:mb-6 sm:gap-3 sm:text-lg">
                                                            <Smartphone size={18} className="text-emerald-500 sm:hidden" /><Smartphone size={20} className="hidden text-emerald-500 sm:block" />
                                                            Active Terminals
                                                        </h4>
                                                        <div className="space-y-2 sm:space-y-4">
                                                            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3 sm:rounded-2xl sm:p-4">
                                                                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <div>
                                                                        <p className="truncate text-[13px] font-bold text-white sm:text-sm">This Web Browser</p>
                                                                        <p className="text-[8px] font-bold tracking-wide text-gray-500 sm:text-[10px] sm:tracking-wider">CURRENT SESSION</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </motion.div>
                                    ) : otpSent ? (
                                        <motion.div
                                            key="password-reset"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="space-y-5 sm:space-y-8"
                                        >
                                            <div className="mb-5 flex items-center gap-3 sm:mb-8 sm:gap-6">
                                                <button
                                                    onClick={() => setOtpSent(false)}
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 sm:h-12 sm:w-12"
                                                >
                                                    <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1 sm:hidden" /><ChevronLeft size={24} className="hidden transition-transform group-hover:-translate-x-1 sm:block" />
                                                </button>
                                                <div>
                                                    <h3 className="text-lg font-bold tracking-tight text-white sm:text-2xl">Neural Key Calibration</h3>
                                                    <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-emerald-500 sm:text-[10px] sm:tracking-widest">Status: Identity Verification in progress</p>
                                                </div>
                                            </div>

                                            <form onSubmit={handleResetPassword} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:space-y-10 sm:rounded-[2.5rem] sm:p-10">
                                                <div className="grid grid-cols-1 gap-5 sm:gap-10">
                                                    <div className="space-y-2.5 sm:space-y-4">
                                                        <label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:ml-2 sm:text-[10px] sm:tracking-[0.3em]">Neural Access Code</label>
                                                        <div className="flex max-w-sm gap-2.5 sm:gap-4">
                                                            {otpDigits.map((digit, idx) => (
                                                                <input
                                                                    key={idx}
                                                                    id={`otp-${idx}`}
                                                                    type="text"
                                                                    maxLength={1}
                                                                    autoComplete="one-time-code"
                                                                    inputMode="numeric"
                                                                    value={digit}
                                                                    onPaste={handleOtpPaste}
                                                                    onChange={e => handleOtpChange(idx, e.target.value)}
                                                                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                                                                    className="aspect-square w-full rounded-xl border border-white/10 bg-white/5 text-center text-xl font-bold text-emerald-500 outline-none transition-all placeholder:text-gray-800 focus:border-emerald-500/50 focus:bg-emerald-500/5 sm:rounded-2xl sm:text-2xl"
                                                                    placeholder="•"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-8">
                                                        <div className="space-y-2.5 sm:space-y-4">
                                                            <label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:ml-2 sm:text-[10px] sm:tracking-[0.3em]">New Neural Key</label>
                                                            <input
                                                                type="password"
                                                                value={passwordData.new}
                                                                onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                                                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all placeholder:text-gray-800 focus:border-emerald-500/50 focus:bg-emerald-500/5 sm:rounded-2xl sm:px-8 sm:py-5 sm:text-lg"
                                                                placeholder="••••••••"
                                                            />
                                                        </div>
                                                        <div className="space-y-2.5 sm:space-y-4">
                                                            <label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:ml-2 sm:text-[10px] sm:tracking-[0.3em]">Confirm Key</label>
                                                            <input
                                                                type="password"
                                                                value={passwordData.confirm}
                                                                onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all placeholder:text-gray-800 focus:border-emerald-500/50 focus:bg-emerald-500/5 sm:rounded-2xl sm:px-8 sm:py-5 sm:text-lg"
                                                                placeholder="••••••••"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <motion.button
                                                    whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(16, 185, 129, 0.15)' }}
                                                    whileActive={{ scale: 0.99 }}
                                                    disabled={loading}
                                                    type="submit"
                                                    className="w-full rounded-xl bg-emerald-500 py-3.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black shadow-2xl shadow-emerald-500/20 transition-all hover:bg-emerald-400 sm:rounded-3xl sm:py-6 sm:text-[10px] sm:tracking-[0.4em]"
                                                >
                                                    {loading ? 'Recalibrating Neural Matrix...' : 'Commit Neural Key Update'}
                                                </motion.button>
                                            </form>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="email-migration"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="space-y-5 sm:space-y-8"
                                        >
                                            <div className="mb-5 flex items-center gap-3 sm:mb-8 sm:gap-6">
                                                <button
                                                    onClick={() => { setEmailEditOpen(false); setEmailChangeCodeSent(false); }}
                                                    className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 sm:h-12 sm:w-12"
                                                >
                                                    <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1 sm:hidden" /><ChevronLeft size={24} className="hidden transition-transform group-hover:-translate-x-1 sm:block" />
                                                </button>
                                                <div>
                                                    <h3 className="text-lg font-bold tracking-tight text-white sm:text-2xl">Email Migration</h3>
                                                    <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-gray-500 sm:text-[10px] sm:tracking-widest">{emailChangeCodeSent ? 'Status: confirmation required' : 'Status: Ready for initialization'}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:space-y-10 sm:rounded-[2.5rem] sm:p-10">
                                                <div className="flex items-center gap-3 rounded-xl border border-blue-500/10 bg-blue-500/5 p-3 sm:gap-6 sm:rounded-3xl sm:p-6">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 sm:h-14 sm:w-14 sm:rounded-2xl">
                                                        <ShieldAlert size={20} className="sm:hidden" /><ShieldAlert size={28} className="hidden sm:block" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className="mb-0.5 text-[13px] font-bold text-white sm:mb-1 sm:text-sm">Security Authentication Required</h5>
                                                        <p className="text-[10px] leading-relaxed text-gray-500 sm:text-xs">We will send a four-digit code to confirm your new email address.</p>
                                                    </div>
                                                </div>

                                                <form onSubmit={emailChangeCodeSent ? handleConfirmEmailChange : handleRequestEmailChange} className="space-y-4 sm:space-y-8">
                                                    <div className="space-y-2.5 sm:space-y-4">
                                                        <label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:ml-2 sm:text-[10px] sm:tracking-[0.3em]">{emailChangeCodeSent ? 'Confirmation Code' : 'Enter New Neural Email'}</label>
                                                        <input
                                                            type={emailChangeCodeSent ? 'text' : 'email'}
                                                            inputMode={emailChangeCodeSent ? 'numeric' : 'email'}
                                                            maxLength={emailChangeCodeSent ? 4 : undefined}
                                                            autoComplete={emailChangeCodeSent ? 'one-time-code' : 'email'}
                                                            value={emailChangeCodeSent ? emailChangeData.otp : emailChangeData.email}
                                                            onChange={(e) => setEmailChangeData(current => ({ ...current, [emailChangeCodeSent ? 'otp' : 'email']: emailChangeCodeSent ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value }))}
                                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all placeholder:text-gray-800 focus:border-blue-500/50 focus:bg-blue-500/5 sm:rounded-3xl sm:px-8 sm:py-6 sm:text-lg"
                                                            placeholder={emailChangeCodeSent ? '0000' : 'new-synapse@nova.com'}
                                                        />
                                                    </div>

                                                    <motion.button
                                                        whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(59, 130, 246, 0.15)' }}
                                                        whileActive={{ scale: 0.98 }}
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full rounded-xl bg-blue-500 py-3.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black shadow-2xl shadow-blue-500/20 transition-all hover:bg-blue-400 disabled:opacity-50 sm:rounded-3xl sm:py-6 sm:text-[10px] sm:tracking-[0.4em]"
                                                    >
                                                        {loading ? 'Processing...' : emailChangeCodeSent ? 'Confirm New Email' : 'Send Confirmation Code'}
                                                    </motion.button>
                                                    {emailChangeCodeSent && <button type="button" onClick={() => setEmailChangeCodeSent(false)} className="w-full text-[10px] font-bold uppercase tracking-wider text-gray-500 transition-colors hover:text-white">Use a different email</button>}
                                                </form>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {activeSection === 'privacy' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-6 sm:space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-5 text-lg font-bold tracking-tight text-white sm:mb-8 sm:text-2xl">Privacy Logic</motion.h3>
                                    {statusMsg.text && <div className={`mb-4 rounded-xl border px-3 py-2 text-xs font-medium ${statusMsg.type === 'error' ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{statusMsg.text}</div>}
                                    <div className="space-y-3 sm:space-y-6">
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/[0.07] sm:rounded-[2.5rem] sm:p-8">
                                            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
                                                    <Lock size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="mb-0.5 text-[14px] font-bold tracking-tight text-white sm:mb-1 sm:text-lg">Stealth Shield</h4>
                                                    <p className="text-[10px] font-medium leading-relaxed text-gray-500 sm:text-xs">When active, only approved links can view your synapses and reels.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => savePrivacySetting('isPrivate', 'Stealth Shield')}
                                                disabled={loading}
                                                aria-label="Toggle Stealth Shield"
                                                aria-pressed={formData.isPrivate}
                                                className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-500 disabled:opacity-50 sm:h-8 sm:w-14 ${formData.isPrivate ? 'bg-emerald-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.isPrivate ? 24 : 4 }}
                                                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg sm:h-6 sm:w-6"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Activity Status */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/[0.07] sm:rounded-[2.5rem] sm:p-8">
                                            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
                                                    <Activity size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="mb-0.5 text-[14px] font-bold tracking-tight text-white sm:mb-1 sm:text-lg">Neural Presence</h4>
                                                    <p className="text-[10px] font-medium leading-relaxed text-gray-500 sm:text-xs">Allow others to see when you are active in the synapse.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => savePrivacySetting('showActivityStatus', 'Neural Presence')}
                                                disabled={loading}
                                                aria-label="Toggle Neural Presence"
                                                aria-pressed={formData.showActivityStatus}
                                                className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-500 disabled:opacity-50 sm:h-8 sm:w-14 ${formData.showActivityStatus ? 'bg-blue-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.showActivityStatus ? 24 : 4 }}
                                                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg sm:h-6 sm:w-6"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Read Receipts */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/[0.07] sm:rounded-[2.5rem] sm:p-8">
                                            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
                                                    <CheckCheck size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="mb-0.5 text-[14px] font-bold tracking-tight text-white sm:mb-1 sm:text-lg">Transmission Feedback</h4>
                                                    <p className="text-[10px] font-medium leading-relaxed text-gray-500 sm:text-xs">Let others know when you have viewed their transmissions.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => savePrivacySetting('readReceipts', 'Transmission Feedback')}
                                                disabled={loading}
                                                aria-label="Toggle Transmission Feedback"
                                                aria-pressed={formData.readReceipts}
                                                className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-500 disabled:opacity-50 sm:h-8 sm:w-14 ${formData.readReceipts ? 'bg-purple-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.readReceipts ? 24 : 4 }}
                                                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg sm:h-6 sm:w-6"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Ghost Viewer */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/[0.07] sm:rounded-[2.5rem] sm:p-8">
                                            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-500/20 text-gray-400 transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
                                                    <Ghost size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="mb-0.5 text-[14px] font-bold tracking-tight text-white sm:mb-1 sm:text-lg">Wraith Mode</h4>
                                                    <p className="text-[10px] font-medium leading-relaxed text-gray-500 sm:text-xs">View stories anonymously. Your footprint remains invisible.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => savePrivacySetting('ghostViewer', 'Wraith Mode')}
                                                disabled={loading}
                                                aria-label="Toggle Wraith Mode"
                                                aria-pressed={formData.ghostViewer}
                                                className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-500 disabled:opacity-50 sm:h-8 sm:w-14 ${formData.ghostViewer ? 'bg-gray-400' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.ghostViewer ? 24 : 4 }}
                                                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg sm:h-6 sm:w-6"
                                                />
                                            </button>
                                        </motion.div>

                                        {/* Protected Story */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/[0.07] sm:rounded-[2.5rem] sm:p-8">
                                            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
                                                    <ShieldCheck size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="mb-0.5 text-[14px] font-bold tracking-tight text-white sm:mb-1 sm:text-lg">Neural Vault</h4>
                                                    <p className="text-[10px] font-medium leading-relaxed text-gray-500 sm:text-xs">Enable password-protected stories and selective neural access.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => savePrivacySetting('protectedStories', 'Neural Vault')}
                                                disabled={loading}
                                                aria-label="Toggle Neural Vault"
                                                aria-pressed={formData.protectedStories}
                                                className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-500 disabled:opacity-50 sm:h-8 sm:w-14 ${formData.protectedStories ? 'bg-amber-500' : 'bg-gray-800'}`}
                                            >
                                                <motion.div
                                                    animate={{ x: formData.protectedStories ? 24 : 4 }}
                                                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg sm:h-6 sm:w-6"
                                                />
                                            </button>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'analytics' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-6 sm:space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-5 text-lg font-bold tracking-tight text-white sm:mb-8 sm:text-2xl">Neural Analytics</motion.h3>

                                    <div className="mb-6 grid grid-cols-3 gap-2 sm:mb-12 sm:gap-6">
                                        {[
                                            { label: 'Engagement', value: analytics ? analytics.likes + analytics.comments : '—', detail: 'likes + replies', icon: <TrendingUp className="text-emerald-500" /> },
                                            { label: 'Profile visits', value: analytics ? analytics.profileVisits : '—', detail: 'last 7 days', icon: <Activity className="text-blue-500" /> },
                                            { label: 'Followers', value: analytics ? analytics.followers : '—', detail: `${analytics?.posts ?? 0} posts`, icon: <Zap className="text-amber-500" /> }
                                        ].map((stat, i) => (stat &&
                                            <motion.div key={stat.label} variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 sm:rounded-[2.5rem] sm:p-8">
                                                <div className="absolute right-0 top-0 p-2 opacity-20 transition-transform group-hover:scale-110 sm:p-6">
                                                    {stat.icon}
                                                </div>
                                                <p className="mb-1 pr-3 text-[8px] font-bold uppercase tracking-wide text-gray-500 sm:mb-2 sm:text-[10px] sm:tracking-widest">{stat.label}</p>
                                                <h4 className="mb-1 text-xl font-bold text-white sm:mb-2 sm:text-3xl">{analyticsLoading ? '…' : stat.value}</h4>
                                                <p className="text-[8px] font-bold uppercase tracking-wide text-emerald-500 sm:text-[10px] sm:tracking-widest">{stat.detail}</p>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="space-y-3 sm:space-y-6">
                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-500 p-4 text-black shadow-xl shadow-emerald-500/20 sm:rounded-[2.5rem] sm:p-8">
                                            <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/10 sm:h-14 sm:w-14 sm:rounded-2xl">
                                                    <Eye size={20} className="sm:hidden" /><Eye size={28} className="hidden sm:block" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="mb-0.5 text-sm font-bold tracking-tight sm:mb-1 sm:text-xl">Profile Visit Alerts</h4>
                                                    <p className="text-[9px] font-bold leading-relaxed text-black/60 sm:text-xs sm:uppercase sm:tracking-widest">Show profile visits in your notification feed</p>
                                                </div>
                                            </div>
                                            <button onClick={() => savePrivacySetting('profileVisitAlerts', 'Profile visit alerts')} disabled={loading} aria-pressed={formData.profileVisitAlerts} className="relative h-7 w-12 shrink-0 rounded-full bg-black/80 shadow-inner disabled:opacity-50 sm:h-9 sm:w-16">
                                                <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={`absolute top-1 h-5 w-5 rounded-full bg-emerald-400 shadow-md sm:h-7 sm:w-7 ${formData.profileVisitAlerts ? 'right-1' : 'left-1'}`} />
                                            </button>
                                        </motion.div>

                                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-[2.5rem] sm:p-8">
                                            <div className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-6">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-emerald-500 sm:h-14 sm:w-14 sm:rounded-2xl">
                                                    <Clock size={20} className="sm:hidden" /><Clock size={28} className="hidden sm:block" />
                                                </div>
                                                <div>
                                                    <h4 className="mb-0.5 text-base font-bold tracking-tight text-white sm:mb-1 sm:text-xl">Visit Frequency Map</h4>
                                                    <p className="text-[10px] font-medium text-gray-500 sm:text-xs">Your recorded profile visits over the past seven days.</p>
                                                </div>
                                            </div>
                                            <div className="flex h-20 items-end gap-1.5">
                                                {(analytics?.dailyVisits || Array.from({ length: 7 }, () => ({ visits: 0 }))).map((day, index, days) => {
                                                    const maximum = Math.max(1, ...days.map(item => item.visits));
                                                    return <div key={day.label || index} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-emerald-500/80" style={{ height: `${Math.max(6, (day.visits / maximum) * 100)}%` }} /><span className="text-[8px] font-bold text-gray-600">{day.label || ''}</span></div>;
                                                })}
                                            </div>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'advanced' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-6 sm:space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-5 text-lg font-bold tracking-tight text-white sm:mb-8 sm:text-2xl">Advanced Protocols</motion.h3>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-8">
                                        <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-blue-500/30 sm:rounded-[3rem] sm:p-10">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                            <div className="mb-4 flex items-center justify-between sm:mb-8">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shadow-xl shadow-blue-500/10 transition-transform group-hover:rotate-12 sm:h-16 sm:w-16 sm:rounded-2xl"><Cpu size={22} className="sm:hidden" /><Cpu size={32} className="hidden sm:block" /></div>
                                                <button onClick={() => savePrivacySetting('quantumDecayEnabled', 'Quantum Decay')} disabled={loading} aria-pressed={formData.quantumDecayEnabled} className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${formData.quantumDecayEnabled ? 'bg-blue-500' : 'bg-gray-800'}`}><motion.span layout className={`absolute top-1 h-5 w-5 rounded-full bg-white ${formData.quantumDecayEnabled ? 'right-1' : 'left-1'}`} /></button>
                                            </div>
                                            <h4 className="mb-1 text-base font-bold tracking-tight text-white sm:mb-3 sm:text-2xl">Quantum Decay</h4>
                                            <p className="mb-4 text-[10px] font-medium leading-relaxed text-gray-500 sm:mb-6 sm:text-xs">New posts expire automatically after the selected lifespan. Existing posts are never changed.</p>
                                            <div className="flex gap-2">
                                                {[7, 30, 90].map(days => <button key={days} onClick={() => saveSetting('quantumDecayDays', days, `${days}-day lifespan`)} disabled={loading || !formData.quantumDecayEnabled} className={`flex-1 rounded-lg border py-2 text-[9px] font-bold transition-colors disabled:opacity-40 ${formData.quantumDecayDays === days ? 'border-blue-400 bg-blue-500/15 text-blue-300' : 'border-white/10 text-gray-500'}`}>{days} days</button>)}
                                            </div>
                                            <p className="mt-3 text-[9px] font-bold uppercase tracking-wide text-blue-300">{formData.quantumDecayEnabled ? `New posts expire after ${formData.quantumDecayDays} days` : 'Decay is paused'}</p>
                                        </motion.div>

                                        <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-emerald-500/30 sm:rounded-[3rem] sm:p-10">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                            <div className="mb-4 flex items-center justify-between sm:mb-8">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-500/10 transition-transform group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl"><ShieldAlert size={22} className="sm:hidden" /><ShieldAlert size={32} className="hidden sm:block" /></div>
                                                <button onClick={() => savePrivacySetting('neuralGuardianEnabled', 'Neural Guardian')} disabled={loading} aria-pressed={formData.neuralGuardianEnabled} className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${formData.neuralGuardianEnabled ? 'bg-emerald-500' : 'bg-gray-800'}`}><motion.span layout className={`absolute top-1 h-5 w-5 rounded-full bg-white ${formData.neuralGuardianEnabled ? 'right-1' : 'left-1'}`} /></button>
                                            </div>
                                            <h4 className="mb-1 text-base font-bold tracking-tight text-white sm:mb-3 sm:text-2xl">Neural Guardian</h4>
                                            <p className="mb-4 text-[10px] font-medium leading-relaxed text-gray-500 sm:mb-6 sm:text-xs">When enabled, Guardian immediately turns on your private profile shield. You can still turn it off manually in Privacy Link.</p>
                                            <div className={`rounded-xl border px-3 py-2 text-[9px] font-bold uppercase tracking-wide ${formData.neuralGuardianEnabled ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-gray-500'}`}>{formData.neuralGuardianEnabled ? 'Private profile protection active' : 'Guardian is standing by'}</div>
                                        </motion.div>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'interface' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="space-y-6">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white tracking-tight">Neural Interface</motion.h3>
                                    <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mt-2 text-xs leading-relaxed text-gray-500">Choose an interface identity. Themes change only this device’s visuals; your account, posts, chats and security session stay untouched.</motion.p>
                                </section>

                                <div className="space-y-3">
                                    {[
                                        { id: 'current', name: 'Current · SynapseX', label: 'DEFAULT', description: 'Your existing emerald interface, preserved exactly as it is today.', preview: 'from-[#071b16] via-[#0a4537] to-[#10b981]' },
                                        { id: 'prism', name: 'Prism Relay', label: 'LUMINOUS', description: 'Midnight indigo, cyan signal light and soft glass-like cards.', preview: 'from-[#101332] via-[#2448a8] to-[#67e8f9]' },
                                        { id: 'atelier', name: 'Atelier Nocturne', label: 'EDITORIAL', description: 'Plum ink, warm rose accents, expressive typography and rounded forms.', preview: 'from-[#2a1426] via-[#75394f] to-[#fda4af]' },
                                        { id: 'signal', name: 'Signal Terminal', label: 'FOCUSED', description: 'Monochrome console surfaces, square edges and crisp green signal text.', preview: 'from-[#080b09] via-[#17251c] to-[#b6f36a]' },
                                    ].map((theme) => {
                                        const selected = interfaceTheme === theme.id;
                                        return (
                                            <motion.button
                                                key={theme.id}
                                                type="button"
                                                onClick={() => selectInterfaceTheme(theme.id)}
                                                whileTap={{ scale: 0.985 }}
                                                aria-pressed={selected}
                                                className={`theme-choice w-full overflow-hidden rounded-2xl border p-3 text-left transition-all ${selected ? 'theme-choice-selected border-emerald-400/70 bg-emerald-500/[0.09] shadow-lg shadow-emerald-500/10' : 'border-white/10 bg-white/[0.03] active:bg-white/[0.07]'}`}
                                            >
                                                <div className={`h-16 rounded-xl bg-gradient-to-br ${theme.preview} p-3`}>
                                                    <div className="flex h-full items-start justify-between">
                                                        <span className="rounded-full bg-black/25 px-2 py-1 text-[8px] font-black tracking-[0.18em] text-white/90">{theme.label}</span>
                                                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${selected ? 'border-white bg-white text-black' : 'border-white/40 bg-black/15 text-transparent'}`}>✓</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 px-1 pt-3">
                                                    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{theme.name}</p><p className="mt-1 text-[10px] leading-relaxed text-gray-500">{theme.description}</p></div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                                <p className="px-1 text-[10px] leading-relaxed text-gray-600">Current is always safe to select. It removes the visual overlay and restores the original interface without reloading or signing you out.</p>
                            </motion.div>
                        )}

                        {activeSection === 'notifications' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Notification Pulse</motion.h3>

                                    <div className="mb-6 space-y-3">
                                        {[
                                            { key: 'notificationPostAlerts', title: 'Post alerts', detail: 'New posts from identities you follow', icon: <Bell size={18} className="text-emerald-300" /> },
                                            { key: 'notificationStoryAlerts', title: 'Story alerts', detail: 'Fresh stories from identities you follow', icon: <Activity size={18} className="text-blue-300" /> },
                                            { key: 'notificationSecurityAlerts', title: 'Security alerts', detail: 'New sign-ins to your account', icon: <ShieldAlert size={18} className="text-red-300" /> }
                                        ].map(option => (
                                            <div key={option.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">{option.icon}</div>
                                                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{option.title}</p><p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{option.detail}</p></div>
                                                <button onClick={() => saveSetting(option.key, !formData[option.key], option.title)} disabled={loading} aria-label={`Toggle ${option.title}`} aria-pressed={formData[option.key]} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${formData[option.key] ? 'bg-emerald-500' : 'bg-gray-800'}`}>
                                                    <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${formData[option.key] ? 'right-1' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        ))}
                                        <p className="px-1 text-[10px] leading-relaxed text-gray-600">Changes are saved immediately and filter your Activity feed on every device.</p>
                                    </div>

                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'data' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">Data & Archive Protocols</motion.h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-500/10 transition-all" />
                                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                                <Download size={26} />
                                            </div>
                                            <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Export Neural Map</h4>
                                            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-8">Packages your synapses, stories and reels into active encryption.</p>
                                            <button onClick={downloadArchive} disabled={loading} className="w-full py-4 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-400 transition-all shadow-lg active:scale-95 disabled:opacity-50">{loading ? 'Preparing…' : 'Prepare Archive'}</button>
                                            {archiveDownload && <a href={archiveDownload.url} download={archiveDownload.filename} className="mt-3 flex w-full items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300 active:scale-95">Download now</a>}
                                        </motion.div>

                                        <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:border-red-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-all" />
                                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                                <Trash2 size={26} />
                                            </div>
                                            <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Clear Activity History</h4>
                                            <p className="text-gray-500 text-xs font-medium leading-relaxed mb-8">Clears viewing history, cached activity, and notification history. Your posts, stories, followers, and account stay safe.</p>
                                            <button onClick={() => setPurgeConfirmOpen(true)} disabled={loading} className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50">Clear Activity</button>
                                        </motion.div>
                                    </div>
                                    {statusMsg.text && <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${statusMsg.type === 'error' ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{statusMsg.text}</div>}
                                    <AnimatePresence>
                                        {purgeConfirmOpen && <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} className="rounded-2xl border border-red-500/30 bg-[#1b1012] p-4 shadow-xl">
                                            <div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0 text-red-400" /><div><p className="text-sm font-bold text-white">Clear activity history?</p><p className="mt-1 text-[11px] leading-relaxed text-gray-400">This removes viewing history, cached activity, and notification history only. Your posts, stories, followers, messages, and account remain untouched.</p></div></div>
                                            <div className="mt-4 flex gap-2"><button onClick={() => setPurgeConfirmOpen(false)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-[10px] font-bold uppercase tracking-wider text-white">Keep activity</button><button onClick={purgeActivityData} disabled={loading} className="flex-1 rounded-xl bg-red-500 py-2.5 text-[10px] font-bold uppercase tracking-wider text-black disabled:opacity-50">{loading ? 'Clearing…' : 'Clear now'}</button></div>
                                        </motion.div>}
                                    </AnimatePresence>
                                </section>
                            </motion.div>
                        )}

                        {activeSection === 'neural-docs' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-white mb-2">Neural Docs</h3>
                                <p className="text-[12px] text-gray-400 mb-4">Complete guide to all SynapseX features.</p>
                                {[
                                    { title: 'Creating an Account', body: 'Tap "Initialize Identity" on the home screen. Enter your name, email, username and password. Verify your email with the OTP code we send. Once verified, log in with "Access Neural Hub".' },
                                    { title: 'Neural Risk Score', body: 'When you log in, SynapseX analyses your typing rhythm and mouse movement. This generates a risk score from 0.0 (safe) to 1.0 (suspicious). It is advisory only and never blocks your login.' },
                                    { title: 'Posts & Stories', body: 'Tap + to create a post — image or video. Stories disappear after 24 hours. You can password-protect individual posts. Reels are short videos in a scrollable full-screen feed.' },
                                    { title: 'Direct Messages', body: 'Tap the chat icon to open your inbox. Start a new conversation with any user. You can password-lock any chat from inside the conversation. Messages update in real time.' },
                                    { title: 'Creator Mode', body: 'Enable Creator Mode in Settings to access verification, high-resolution uploads, anonymous shield and deep analytics. Submit a verification request and an admin reviews it.' },
                                    { title: 'Privacy & Security', body: 'Make your account private from Settings. Passwords are stored as bcrypt hashes — nobody can read them. Sessions expire after ~2 hours. The AI risk score adds an extra security signal.' },
                                    { title: 'Priya AI Assistant', body: 'Priya is your built-in AI guide powered by Cloudflare Workers AI. Find her in the Direct tab (inside the app) and on the landing page. She can answer any question about SynapseX.' },
                                ].map((doc, i) => (
                                    <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                        <h4 className="text-[13px] font-black text-emerald-400 mb-1.5">{doc.title}</h4>
                                        <p className="text-[12px] text-gray-400 leading-relaxed">{doc.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeSection === 'nexus-support' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-white mb-2">Nexus Support</h3>
                                <p className="text-[12px] text-gray-400 mb-4">Get help with any issue on SynapseX.</p>

                                {/* FAQ */}
                                {[
                                    { q: 'I forgot my password', a: 'Go to Login → tap "Forgot password" → enter your email → enter the OTP code → set a new password.' },
                                    { q: 'My OTP code never arrived', a: 'Check your spam/promotions folder. Wait 1 minute. Make sure you used the correct email. Request a new code from the verification screen.' },
                                    { q: 'My account shows wrong data', a: 'Log out and log back in. This syncs your profile with the latest server data.' },
                                    { q: 'Chat is not working', a: 'Make sure you are logged in. Check your internet connection. If the chat was password-locked, you need to enter the password to unlock it.' },
                                    { q: 'Settings toggles show an error', a: 'Log out and log back in to refresh your session token. If the issue persists, the server may be doing a cold start — wait 10 seconds and try again.' },
                                ].map((faq, i) => (
                                    <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                        <h4 className="text-[13px] font-black text-white mb-1.5">Q: {faq.q}</h4>
                                        <p className="text-[12px] text-gray-400 leading-relaxed">{faq.a}</p>
                                    </div>
                                ))}

                                {/* Contact */}
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                                    <h4 className="text-[13px] font-black text-emerald-400 mb-1.5">Still need help?</h4>
                                    <p className="text-[12px] text-gray-400 mb-3">Reach out directly and we'll get back to you.</p>
                                    <button onClick={() => window.open('mailto:mrpralay2005@gmail.com?subject=SynapseX Support Request', '_blank')}
                                        className="w-full rounded-xl bg-emerald-500 py-2.5 text-[12px] font-black text-black transition-all active:scale-95 hover:bg-emerald-400">
                                        Contact Support
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeSection === 'legal-nodes' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-white mb-2">Legal Nodes</h3>
                                <p className="text-[12px] text-gray-500 mb-2">Last updated: September 2026</p>

                                {[
                                    { title: 'Privacy Policy', body: 'SynapseX collects the minimum data needed to operate:\n\n• Account data you provide — name, email, username, bio, profile picture.\n• Content you create — posts, Stories, comments, likes, saved items.\n• Security data — login timestamps, device/user-agent and IP address.\n• Behavioural data — at login only, keystroke timing and mouse movement used to calculate your risk score.\n\nYour password is stored as a one-way bcrypt hash. Nobody — including admins — can read it.\n\nYou can limit who sees your content by making your account private.' },
                                    { title: 'Terms of Use', body: 'By using SynapseX you agree to:\n\n• Not use the platform for illegal activity, harassment or spam.\n• Not attempt to reverse-engineer or exploit the platform.\n• Take responsibility for content you publish.\n• Accept that your session token expires after ~2 hours for security.\n\nSynapseX is a personal project and is provided "as is" without warranties.' },
                                    { title: 'Data Deletion', body: 'You can delete individual posts and Stories at any time. To request full account deletion, contact support and an admin will process it from the Command Center. We do not sell your data to third parties.' },
                                    { title: 'Cookies', body: 'SynapseX uses a single secure session cookie (synapse_token) to keep you logged in. No advertising cookies or third-party trackers are used.' },
                                ].map((section, i) => (
                                    <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                        <h4 className="text-[13px] font-black text-white mb-2">{section.title}</h4>
                                        <p className="text-[12px] text-gray-400 leading-relaxed whitespace-pre-line">{section.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeSection === 'patch-notes' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-white mb-2">Patch Notes</h3>
                                <p className="text-[12px] text-gray-400 mb-2">All published SynapseX releases.</p>
                                <ReleaseUpdatePanel />
                            </div>
                        )}

                        {activeSection === 'help' && (
                            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-12">
                                <section>
                                    <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold text-white mb-8 tracking-tight">System Support</motion.h3>
                                    <div className="mb-6">
                                        <ReleaseUpdatePanel />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { title: 'Neural Docs', desc: 'Complete manual for Synapse functions.', id: 'neural-docs' },
                                            { title: 'Nexus Support', desc: 'Direct link to terminal assistance.', id: 'nexus-support' },
                                            { title: 'Legal Nodes', desc: 'Privacy and data processing terms.', id: 'legal-nodes' },
                                            { title: 'Patch Notes', desc: 'Recent neural interface updates.', id: 'patch-notes' }
                                        ].map((item, i) => (
                                            <motion.div key={i} onClick={() => openMobileSection(item.id)} variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-between group">
                                                <div>
                                                    <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                                                    <p className="text-gray-500 text-[10px] font-medium">{item.desc}</p>
                                                </div>
                                                <ChevronRight size={16} className="text-gray-600 group-hover:text-emerald-500 transition-colors" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            </motion.div>
                        )}
                    </motion.div>
                );
            }

            return (
                <div className="synapse-settings h-full w-full overflow-hidden bg-[#0f0f0f]">
                    <div className="flex h-full w-full">
                        <aside className="hidden w-[320px] border-r border-white/10 bg-[#111316] p-5 lg:block">
                            <div className="mb-6 text-[1.2rem] font-black tracking-[-0.06em] text-white">Settings</div>
                            <div className="space-y-2">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => openMobileSection(item.id)}
                                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${activeSection === item.id ? 'bg-emerald-500/10 text-white' : 'bg-transparent text-white hover:bg-white/5'}`}
                                    >
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${activeSection === item.id ? 'bg-emerald-500/15 text-emerald-500' : 'bg-white/5 text-gray-400'}`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="text-[0.95rem] font-semibold tracking-[-0.04em]">{item.label}</div>
                                            <div className="text-[10px] text-gray-500">{item.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        <main className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 lg:p-8">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeSection}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="h-full"
                                >
                                    {renderSettingPanel()}
                                </motion.div>
                            </AnimatePresence>
                        </main>
                    </div>
                </div>
            );
        };

export default SettingsView;
