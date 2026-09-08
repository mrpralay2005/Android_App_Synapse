/// <reference types="react" />
/// <reference types="react-native" />
import * as React from 'react';
import { useState, useEffect } from 'react';
import { AnimatePresence, MotiView } from 'moti';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import SynapseLogo from './src/components/SynapseLogo';
import SynapseBridge from './src/native-modules/SynapseBridge';
import "./global.css";

// Fix for breaking React 19 / React Native 0.83 Types
const View = require('react-native').View as any;
const Text = require('react-native').Text as any;
const SafeAreaView = require('react-native').SafeAreaView as any;
const StatusBar = require('react-native').StatusBar as any;
const ScrollView = require('react-native').ScrollView as any;
const TouchableOpacity = require('react-native').TouchableOpacity as any;

const LIVE_API = "https://synapse-backend.pralayd140.workers.dev";

interface User {
    id: string;
    username: string;
    email: string;
    profileImage?: string;
    image?: string;
}

function App(): React.JSX.Element {
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<string>('landing'); // landing, login, signup, otp, forgot, profile
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isExited, setIsExited] = useState<boolean>(false);
    const [otpEmail, setOtpEmail] = useState<string>('');

    useEffect(() => {
        const init = async () => {
            try {
                const lastView = await AsyncStorage.getItem('synapse_last_view');
                if (lastView) setView(lastView);

                // Native Bridge Example: Get hardware stats
                const stats = await SynapseBridge.getHardwareStats();
                console.log('Native Hardware Stats:', stats);

                await performNeuralSync();
            } catch (e) {
                console.error('Init error:', e);
                setIsLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        AsyncStorage.setItem('synapse_last_view', view);
    }, [view]);

    const performNeuralSync = async () => {
        try {
            const token = await AsyncStorage.getItem('synapse_token');
            const savedUser = await AsyncStorage.getItem('synapse_user_data');

            console.log('Session Check:', { hasToken: !!token, hasUser: !!savedUser });

            if (!token) {
                if (view === 'profile') setView('landing');
                setTimeout(() => setIsLoading(false), 800);
                return;
            }

            // Using Native Bridge for Sync
            await SynapseBridge.performNeuralSync(token);

            if (savedUser) {
                try {
                    const userData: User = JSON.parse(savedUser);
                    setUser(userData);
                    setView('profile');
                    setTimeout(() => setIsLoading(false), 1200);
                    return;
                } catch (e) {
                    console.error('Failed to parse saved user data:', e);
                    await AsyncStorage.removeItem('synapse_user_data');
                }
            }

            // Fallback to API
            const response = await axios.get(`${LIVE_API}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data && response.status === 200) {
                const data = response.data;
                setUser(data.user);
                setView('profile');
                await AsyncStorage.setItem('synapse_user_data', JSON.stringify(data.user));
            } else {
                handleLogout();
            }
        } catch (err) {
            console.error('Sync error:', err);
            handleLogout();
        } finally {
            setTimeout(() => setIsLoading(false), 1200);
        }
    };

    const handleLogout = async () => {
        try { await axios.post(`${LIVE_API}/api/auth/logout`); } catch (e) { }
        setUser(null);
        await AsyncStorage.removeItem('synapse_token');
        await AsyncStorage.removeItem('synapse_user_data');
        await AsyncStorage.removeItem('synapse_last_view');
        await AsyncStorage.removeItem('synapse_social_tab');
        setView('landing');
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ alignItems: 'center' }}>
                    <SynapseLogo size={50} />
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1000, type: 'timing' } as any}
                        style={{ marginTop: 40 }}
                    >
                        <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase' }}>
                            Neural Synchronization
                        </Text>
                    </MotiView>
                </View>
            </View>
        );
    }

    if (isExited) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <SynapseLogo size={40} />
                <Text style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: -1, color: 'white', marginBottom: 8, fontStyle: 'italic', marginTop: 32 }}>Connection Severed</Text>
                <TouchableOpacity onPress={() => setIsExited(false)}>
                    <Text style={{ marginTop: 64, fontSize: 9, color: '#374151', textTransform: 'uppercase', letterSpacing: 3, fontWeight: 'bold' }}>[ Re-initialize Link ]</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView className="flex-1 bg-black">
                <StatusBar barStyle="light-content" />
                <View className="flex-1">
                    <AnimatePresence exitBeforeEnter>
                        {view === 'landing' && (
                            <MotiView
                                key="landing"
                                from={{ opacity: 0, translateX: 20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: -20 }}
                                style={{ flex: 1 }}
                            >
                                <View className="flex-1 items-center justify-center">
                                    <SynapseLogo size={100} />
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: 'white', fontSize: 30, fontWeight: 'bold', marginTop: 32, fontStyle: 'italic' }}>SYNAPSE</Text>
                                        <Text style={{ color: 'rgba(16, 185, 129, 0.5)', fontSize: 10, letterSpacing: 8, textTransform: 'uppercase', fontWeight: 'bold', marginTop: 8, marginLeft: 8 }}>Neural Core</Text>
                                    </View>
                                    <View style={{ marginTop: 80, width: '100%', paddingHorizontal: 40, gap: 16 }}>
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center' }}
                                            onPress={() => setView('login')}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold', letterSpacing: 2, fontSize: 12 }}>ENTER SYSTEM</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', padding: 16, borderRadius: 12, alignItems: 'center' }}
                                            onPress={() => setView('signup')}
                                        >
                                            <Text style={{ color: '#10b981', fontWeight: 'bold', letterSpacing: 2, fontSize: 12 }}>INITIALIZE LINK</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </MotiView>
                        )}

                        {view === 'login' && (
                            <MotiView
                                key="login"
                                from={{ opacity: 0, translateX: 20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: -20 }}
                                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } as any}
                            >
                                <View style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 30, padding: 32 }}>
                                    <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 32, fontStyle: 'italic' }}>Login Module</Text>
                                    <Text style={{ color: '#9ca3af', marginBottom: 40 }}>Interface pending. Returning to secure landing protocol...</Text>
                                    <TouchableOpacity
                                        onPress={() => setView('landing')}
                                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', padding: 16, borderRadius: 12, alignItems: 'center' }}
                                    >
                                        <Text style={{ color: '#10b981', fontWeight: 'bold' }}>RETURN TO HUB</Text>
                                    </TouchableOpacity>
                                </View>
                            </MotiView>
                        )}

                        {view === 'profile' && user && (
                            <MotiView
                                key="profile"
                                from={{ opacity: 0, translateX: 20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: -20 }}
                                style={{ flex: 1 }}
                            >
                                <ScrollView style={{ flex: 1 }}>
                                    <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center', minHeight: '80%' }}>
                                        <SynapseLogo size={80} />
                                        <Text style={{ color: 'white', fontSize: 30, fontWeight: 'bold', marginTop: 32, fontStyle: 'italic', textAlign: 'center' }}>Protocol Accepted</Text>
                                        <Text style={{ color: '#10b981', fontWeight: 'bold', marginTop: 8, fontSize: 20 }}>@{user.username}</Text>

                                        <View style={{ marginTop: 48, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', padding: 24, borderRadius: 16, width: '100%' }}>
                                            <Text style={{ color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>"The neural interface is active and synchronized with your biometric data."</Text>
                                        </View>

                                        <TouchableOpacity
                                            onPress={handleLogout}
                                            style={{ marginTop: 80, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', width: '100%', alignItems: 'center' }}
                                        >
                                            <Text style={{ color: '#ef4444', fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase', fontSize: 10 }}>Terminate Link</Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </MotiView>
                        )}
                    </AnimatePresence>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

export default App;
