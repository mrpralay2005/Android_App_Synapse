import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import {
    X, Camera, Video, Maximize2, Sliders, Image as ImageIcon,
    Check, ChevronRight, User, Shield, Briefcase, Zap,
    Activity, Layout, Sun, Aperture, Droplet, Scan, Fingerprint,
    Cpu, Globe, Terminal, Sparkles, AlertCircle, Clock
} from 'lucide-react';
import Cookies from 'js-cookie';

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
        image,
        safeArea / 2 - image.width * 0.5,
        safeArea / 2 - image.height * 0.5
    );
    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
        data,
        0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
        0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
    );

    return new Promise((resolve) => {
        canvas.toBlob((file) => {
            resolve(file);
        }, 'image/jpeg');
    });
}



const EditNeuralProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const isVideo = (url) => {
        if (!url) return false;
        if (url.startsWith('blob:')) return url.includes('video') || (mediaType === 'video');
        return url.match(/\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i);
    };

    // Identity State
    const [identity, setIdentity] = useState({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        isProfessional: user.isProfessional || false,
        professionCategory: user.professionCategory || 'Digital Creator'
    });

    // System State
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Media Editor State
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [mediaType, setMediaType] = useState(null);

    // Editor transform state
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [adjustments, setAdjustments] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        sepia: 0,
        grayscale: 0,
        balance: 0
    });

    const [videoRange, setVideoRange] = useState({ start: 0, end: 10 });
    const [videoDuration, setVideoDuration] = useState(0);

    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileSelect = (e, type) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setMediaFile(file);
            setMediaType(type);
            const url = URL.createObjectURL(file);
            setMediaUrl(url);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setAdjustments({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, balance: 0 });

            if (type === 'video') {
                const video = document.createElement('video');
                video.src = url;
                video.onloadedmetadata = () => {
                    setVideoDuration(video.duration);
                    setVideoRange({ start: 0, end: Math.min(10, video.duration) });
                };
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            setMediaFile(null);
            setMediaUrl(null);
            setMediaType(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setCroppedAreaPixels(null);
            setAdjustments({
                brightness: 100,
                contrast: 100,
                saturation: 100,
                sepia: 0,
                grayscale: 0,
                balance: 0
            });
            setVideoRange({ start: 0, end: 10 });
            setVideoDuration(0);
        }
    }, [isOpen]);

    useEffect(() => {
        let interval;
        if (mediaType === 'video' && mediaUrl) {
            interval = setInterval(() => {
                const videoElements = document.querySelectorAll('video');
                videoElements.forEach(v => {
                    if (v.src.includes(mediaUrl) || (v.firstChild && v.firstChild.src && v.firstChild.src.includes(mediaUrl))) {
                        if (v.currentTime < videoRange.start || v.currentTime > videoRange.end) {
                            v.currentTime = videoRange.start;
                        }
                    }
                });
            }, 200);
        }
        return () => clearInterval(interval);
    }, [mediaType, mediaUrl, videoRange]);

    const handleIdentitySync = async () => {
        setIsAnalyzing(true);
        try {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            const token = Cookies.get('synapse_token');

            const updatedProfileData = {
                ...identity,
                profileImage: user.profileImage // Keep current image, ignore staged media
            };

            const res = await fetch(`${apiUrl}/api/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedProfileData)
            });

            const data = await res.json();
            if (data.success) {
                if (onUpdate) onUpdate(data.data);
                onClose();
            } else {
                console.error("Identity Matrix Sync Failed:", data.error);
            }
        } catch (err) {
            console.error("Critical Neural Error:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        setIsAnalyzing(true);
        try {
            const apiUrl = "https://synapse-backend.pralayd140.workers.dev";
            const token = Cookies.get('synapse_token');
            let profileImageUrl = user.profileImage;

            if (mediaFile) {
                let fileToUpload = mediaFile;

                if (mediaType === 'image' && croppedAreaPixels) {
                    const croppedImageBlob = await getCroppedImg(mediaUrl, croppedAreaPixels, rotation);
                    fileToUpload = new File([croppedImageBlob], mediaFile.name, { type: 'image/jpeg' });
                }

                const uploadUrlRes = await fetch(`${apiUrl}/api/social/upload-url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        fileName: fileToUpload.name,
                        fileType: fileToUpload.type
                    })
                });

                if (uploadUrlRes.ok) {
                    const { uploadUrl, publicUrl } = await uploadUrlRes.json();
                    const storageRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: fileToUpload,
                        headers: { 'Content-Type': fileToUpload.type }
                    });

                    if (storageRes.ok) {
                        profileImageUrl = publicUrl;
                    }
                }
            }

            const updatedProfileData = {
                ...identity,
                profileImage: profileImageUrl,
                videoTrim: mediaType === 'video' ? videoRange : null
            };

            const res = await fetch(`${apiUrl}/api/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedProfileData)
            });

            const data = await res.json();
            if (data.success) {
                if (onUpdate) onUpdate(data.data);
                onClose();
            } else {
                console.error("Neural Matrix Sync Failed:", data.error);
            }
        } catch (err) {
            console.error("Critical Neural Error:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filterStyle = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) sepia(${adjustments.sepia}%) grayscale(${adjustments.grayscale}%) hue-rotate(${adjustments.balance}deg)`;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Ultra-Premium Kinetic Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#000000]/90 backdrop-blur-3xl"
                    >
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
                        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
                    </motion.div>

                    {/* Main Interface Container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 40, filter: 'blur(10px)' }}
                        animate={{ scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ scale: 0.9, opacity: 0, y: 40, filter: 'blur(10px)' }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-[85rem] bg-[#030303] outline outline-1 outline-white/10 rounded-[2.5rem] shadow-[0_0_120px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[90vh]"
                    >
                        {/* Scanning Effect Overlay (Only for Media Analysis now) */}
                        <AnimatePresence>
                            {isAnalyzing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-[60] bg-[#030303]/90 backdrop-blur-xl flex flex-col items-center justify-center"
                                >
                                    {/* Central Focus */}
                                    <div className="relative mb-12">
                                        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                                        <Fingerprint size={64} className="text-emerald-500 relative z-10" strokeWidth={1} />
                                        <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_3s_linear_infinite]" />
                                    </div>

                                    {/* Cinematic Progress */}
                                    <div className="w-64 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-emerald-500 font-mono font-bold tracking-[0.2em] uppercase">
                                                Analyzing Media
                                            </span>
                                            <span className="text-[10px] text-white font-mono">
                                                PROCESSING
                                            </span>
                                        </div>

                                        <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                                            />
                                        </div>

                                        <p className="text-center text-[10px] text-gray-600 font-medium tracking-wide animate-pulse">
                                            Optimizing visual matrices...
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* LEFT: Neural Identity Matrix */}
                        <div className="w-full md:w-[45%] border-b md:border-b-0 md:border-r border-white/5 relative z-10 bg-gradient-to-br from-white/[0.02] to-transparent flex flex-col overflow-hidden">

                            {/* Scrollable Content Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                                {/* Header Section */}
                                <div className="flex items-center justify-between mb-12">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Terminal size={16} className="text-emerald-500" />
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded border border-emerald-500/20 font-mono tracking-widest">SYS.CONFIG.V2</span>
                                        </div>
                                        <h2 className="text-4xl font-light text-white tracking-[-0.05em]">Identity<span className="font-bold">Matrix</span></h2>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold">Security Level</span>
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            <Shield size={12} className="text-emerald-500" />
                                            <span className="text-xs text-white font-bold font-mono">ENCRYPTED</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Bio-Identity Fields */}
                                    <div className="space-y-6">
                                        {/* Designation Field */}
                                        <div className="group relative">
                                            <label className="absolute -top-3 left-4 bg-[#030303] px-2 text-[9px] text-emerald-500 uppercase tracking-widest font-bold z-10 group-focus-within:text-white transition-colors">
                                                Designation
                                            </label>
                                            <input
                                                type="text"
                                                value={identity.name}
                                                onChange={e => setIdentity({ ...identity, name: e.target.value })}
                                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-6 py-5 text-white text-lg font-medium focus:border-emerald-500/50 focus:bg-emerald-500/[0.02] outline-none transition-all placeholder:text-gray-800"
                                                placeholder="Enter Full Name"
                                            />
                                            <User size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" />
                                        </div>

                                        {/* Username Field */}
                                        <div className="group relative">
                                            <label className="absolute -top-3 left-4 bg-[#030303] px-2 text-[9px] text-gray-500 uppercase tracking-widest font-bold z-10 group-focus-within:text-blue-500 transition-colors">
                                                Neural ID
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-lg">@</span>
                                                <input
                                                    type="text"
                                                    value={identity.username}
                                                    onChange={e => setIdentity({ ...identity, username: e.target.value })}
                                                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-6 py-5 pl-12 text-white text-lg font-mono focus:border-blue-500/50 focus:bg-blue-500/[0.02] outline-none transition-all placeholder:text-gray-800"
                                                    placeholder="username"
                                                />
                                                <Fingerprint size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                                            </div>
                                        </div>

                                        {/* Bio Field */}
                                        <div className="group relative">
                                            <label className="absolute -top-3 left-4 bg-[#030303] px-2 text-[9px] text-gray-500 uppercase tracking-widest font-bold z-10 group-focus-within:text-purple-500 transition-colors">
                                                Transmission Bio
                                            </label>
                                            <textarea
                                                value={identity.bio}
                                                onChange={e => setIdentity({ ...identity, bio: e.target.value })}
                                                rows={4}
                                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-6 py-5 text-gray-300 text-sm font-medium focus:border-purple-500/50 focus:bg-purple-500/[0.02] outline-none transition-all resize-none custom-scrollbar leading-relaxed"
                                                placeholder="Broadcast your signal..."
                                            />
                                            <div className="absolute right-4 bottom-4 text-[9px] text-gray-600 font-mono">
                                                {identity.bio.length}/150
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Module */}
                                    <div className="relative border border-white/10 rounded-2xl p-1 bg-gradient-to-b from-white/5 to-transparent">
                                        <div className="bg-[#050505] rounded-xl p-6 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-[10rem] bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />

                                            <div className="relative z-10 flex items-start justify-between">
                                                <div className="flex gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                                        <Sparkles size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-bold text-base tracking-tight mb-1">Professional License</h3>
                                                        <p className="text-gray-500 text-[10px] font-medium max-w-[180px] leading-relaxed">
                                                            Activate for advanced analytics, creator tools, and verified signal status.
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setIdentity(prev => ({ ...prev, isProfessional: !prev.isProfessional }))}
                                                    className={`w-11 h-6 rounded-full border transition-all duration-500 relative ${identity.isProfessional ? 'bg-indigo-600 border-indigo-500' : 'bg-transparent border-white/10'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-500 ${identity.isProfessional ? 'left-[22px]' : 'left-1'}`} />
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {identity.isProfessional && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        animate={{ height: "auto", opacity: 1, marginTop: 24 }}
                                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="relative">
                                                            <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                                            <input
                                                                type="text"
                                                                value={identity.professionCategory}
                                                                onChange={e => setIdentity({ ...identity, professionCategory: e.target.value })}
                                                                placeholder="Category (e.g. Quantum Architect)"
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white text-xs font-bold focus:border-indigo-500/50 outline-none transition-all placeholder:text-gray-600"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Footer: Identity Commit Action */}
                            <div className="p-8 md:p-12 border-t border-white/5 bg-[#030303]/80 backdrop-blur-md">
                                <button
                                    onClick={handleIdentitySync}
                                    className="w-full py-4 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/50 rounded-xl transition-all duration-300 group flex items-center justify-between px-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                            <Zap size={14} fill="currentColor" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-white text-xs font-bold tracking-wider uppercase group-hover:text-emerald-400 transition-colors">Deploy Updates</div>
                                            <div className="text-[9px] text-gray-500 font-mono group-hover:text-emerald-500/60">SYNC_TO_NEURAL_NET</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: Visual Calibration (Preview & Edit) */}
                        <div className="w-full md:w-[55%] bg-[#080808] flex flex-col relative border-l border-white/5">
                            {/* Toolbar */}
                            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start z-30 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                                <div>
                                    <h4 className="text-white font-bold text-sm tracking-wide">Visual Cortex</h4>
                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Render & Calibrate</p>
                                </div>
                                <button onClick={onClose} className="pointer-events-auto w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition-all group">
                                    <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            {/* Content Stage */}
                            {!mediaUrl ? (
                                <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden perspective-[1000px]">
                                    {/* Ambient Background */}
                                    <div className="absolute inset-0 bg-[#080808]" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

                                    {/* HOLOGRAPHIC CARD - CENTER STAGE (Expanded Pro Size) */}
                                    <motion.div
                                        initial={{ rotateX: 20, opacity: 0, scale: 0.9 }}
                                        animate={{ rotateX: 0, opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                                        className="relative z-10 w-full max-w-[420px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-1.5 shadow-[0_0_80px_-20px_rgba(99,102,241,0.15)] group"
                                    >
                                        <div className="bg-[#080808]/90 rounded-[2.2rem] p-8 flex flex-col items-center gap-8 relative overflow-hidden backdrop-blur-md">
                                            {/* Dynamic Shine Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                                            {/* Header */}
                                            <div className="w-full flex justify-between items-center border-b border-white/5 pb-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] font-mono">Live Uplink</span>
                                                </div>
                                                <Fingerprint size={14} className="text-gray-600" />
                                            </div>

                                            {/* Avatar (Larger & More Heroic) */}
                                            <div className="relative group/avatar scale-110 my-2">
                                                <div className="w-32 h-32 rounded-full border border-white/10 p-1.5 relative bg-gradient-to-b from-white/5 to-transparent">
                                                    <div className="w-full h-full rounded-full overflow-hidden relative border border-black shadow-2xl bg-black">
                                                        {isVideo(mediaUrl || user.profileImage) ? (
                                                            <video
                                                                src={mediaUrl || user.profileImage}
                                                                className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-700 ease-out"
                                                                autoPlay
                                                                muted
                                                                loop
                                                                playsInline
                                                            />
                                                        ) : (
                                                            <img
                                                                src={mediaUrl || user.profileImage || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"}
                                                                className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-700 ease-out"
                                                            />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300">
                                                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                                <Scan size={18} className="text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Status Indicator */}
                                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#0a0a0a] border border-emerald-500/20 text-emerald-500 text-[9px] font-bold rounded-full uppercase tracking-widest shadow-xl flex items-center gap-2 whitespace-nowrap z-20">
                                                    <div className="w-1 h-1 bg-emerald-500 rounded-full" /> Signal Active
                                                </div>
                                            </div>

                                            {/* Identity Info Broadcast (Enhanced Typography) */}
                                            <div className="text-center w-full space-y-3 mt-2">
                                                <div>
                                                    <h3 className="text-white font-bold text-2xl tracking-tight mb-1">{identity.name || 'Your Name'}</h3>
                                                    <div className="inline-block px-3 py-1 bg-blue-500/5 border border-blue-500/10 rounded-full">
                                                        <p className="text-blue-400 text-[10px] font-mono tracking-wider">@{identity.username || 'username'}</p>
                                                    </div>
                                                </div>
                                                <p className="text-gray-400 text-xs font-medium leading-relaxed px-4 line-clamp-2 max-w-[280px] mx-auto opacity-80">
                                                    {identity.bio || 'Neural bio transmission inactive...'}
                                                </p>
                                            </div>

                                            {/* Actions (Bigger, Better Buttons) */}
                                            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="group/btn relative overflow-hidden py-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-2"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                    <ImageIcon size={20} className="text-gray-400 group-hover/btn:text-emerald-500 transition-colors relative z-10" />
                                                    <span className="text-[10px] font-bold text-gray-400 group-hover/btn:text-white uppercase tracking-[0.2em] relative z-10">Upload Photo</span>
                                                </button>
                                                <button
                                                    onClick={() => videoInputRef.current?.click()}
                                                    className="group/btn relative overflow-hidden py-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-2"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                    <Video size={20} className="text-gray-400 group-hover/btn:text-blue-500 transition-colors relative z-10" />
                                                    <span className="text-[10px] font-bold text-gray-400 group-hover/btn:text-white uppercase tracking-[0.2em] relative z-10">Upload Video</span>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Action Prompt */}
                                    <div className="absolute bottom-12 text-center space-y-2">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">Interactive Preview Live</p>
                                        <div className="flex items-center gap-2 justify-center">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[9px] text-emerald-500/60 font-mono">SIGNAL_STABLE</span>
                                        </div>
                                    </div>

                                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
                                    <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col h-full bg-[#050505]">
                                    {/* Cropper Stage */}
                                    <div className="flex-1 relative overflow-hidden bg-[#020202]">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                                        <Cropper
                                            image={mediaType === 'image' ? mediaUrl : undefined}
                                            video={mediaType === 'video' ? mediaUrl : undefined}
                                            crop={crop}
                                            zoom={zoom}
                                            rotation={rotation}
                                            aspect={1}
                                            onCropChange={setCrop}
                                            onCropComplete={onCropComplete}
                                            onZoomChange={setZoom}
                                            onRotationChange={setRotation}
                                            showGrid={true}
                                            style={{
                                                mediaStyle: { filter: filterStyle },
                                                containerStyle: { background: 'transparent' }
                                            }}
                                        />

                                        {/* HUD Overlays */}
                                        <div className="absolute top-6 left-6 font-mono text-[9px] text-emerald-500/60 pointer-events-none">
                                            X: {crop.x.toFixed(1)} <br /> Y: {crop.y.toFixed(1)}
                                        </div>

                                        {/* Floating Zoom Dial */}
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full flex items-center gap-4 z-20 shadow-2xl transition-all hover:bg-black/80 hover:border-emerald-500/30">
                                            <Maximize2 size={14} className="text-emerald-500" />
                                            <input
                                                type="range" min="1" max="3" step="0.1" value={zoom}
                                                onChange={e => setZoom(Number(e.target.value))}
                                                className="w-32 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                                            />
                                            <span className="text-[10px] text-emerald-500 font-mono w-8 text-right font-bold">{zoom.toFixed(1)}x</span>
                                        </div>
                                    </div>

                                    {/* Editor Control Deck */}
                                    <div className="p-8 bg-[#0a0a0a] border-t border-white/5 relative z-20">
                                        {mediaType === 'video' && (
                                            <div className="mb-8 max-w-[440px] mx-auto bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl flex flex-col gap-3 shadow-2xl transition-all hover:bg-black/60 hover:border-blue-500/30">
                                                <div className="flex justify-between items-center px-1">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-blue-400" />
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Neural Timing</span>
                                                    </div>
                                                    <span className="text-[10px] text-blue-400 font-mono font-bold tracking-tighter">{videoRange.start.toFixed(1)}s <span className="text-gray-600">→</span> {videoRange.end.toFixed(1)}s</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max={Math.max(0, videoDuration - 1)} step="0.1"
                                                    value={videoRange.start}
                                                    onChange={e => {
                                                        const start = Number(e.target.value);
                                                        const end = Math.min(start + 10, videoDuration);
                                                        setVideoRange({ start, end });
                                                    }}
                                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-2">
                                                <Sliders size={16} className="text-emerald-500" />
                                                <h4 className="text-white text-xs font-bold uppercase tracking-widest">Signal Tuning</h4>
                                            </div>
                                            <button
                                                onClick={() => setMediaUrl(null)}
                                                className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:text-red-400 border-b border-transparent hover:border-red-500/50 transition-all font-mono"
                                            >
                                                ABORT_EDIT
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                            {[
                                                { label: 'Brightness', icon: <Sun size={12} />, value: adjustments.brightness, key: 'brightness', color: 'bg-emerald-500' },
                                                { label: 'Contrast', icon: <Aperture size={12} />, value: adjustments.contrast, key: 'contrast', color: 'bg-blue-500' },
                                                { label: 'Saturation', icon: <Droplet size={12} />, value: adjustments.saturation, key: 'saturation', color: 'bg-purple-500' },
                                                { label: 'Balance', icon: <Sparkles size={12} />, value: adjustments.balance, key: 'balance', color: 'bg-indigo-500', max: 360, unit: '°' }
                                            ].map((adj) => (
                                                <div key={adj.key} className="space-y-3 group">
                                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                        <span className="flex items-center gap-2 text-gray-500 group-hover:text-white transition-colors">
                                                            {adj.icon} {adj.label}
                                                        </span>
                                                        <span className="text-gray-400 font-mono">{adj.value}{adj.unit || '%'}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max={adj.max || "200"} value={adj.value}
                                                        onChange={e => setAdjustments({ ...adjustments, [adj.key]: Number(e.target.value) })}
                                                        className={`w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:${adj.color} [&::-webkit-slider-thumb]:shadow-[0_0_10px_currentColor] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-2">
                                                <Cpu size={12} className="text-emerald-500 animate-pulse" />
                                                Rendering Preview
                                            </div>
                                            <button
                                                onClick={handleSave}
                                                className="px-10 py-4 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 flex items-center gap-2 group"
                                            >
                                                <Check size={16} />
                                                <span>Commit Changes</span>
                                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EditNeuralProfileModal;
