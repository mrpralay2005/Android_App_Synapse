import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Cropper from 'react-easy-crop';
import {
    Aperture, Check, Clock, Droplet, Fingerprint, Globe, Image as ImageIcon,
    Maximize2, Scan, Shield, Sliders, Sparkles, Sun, Terminal, User, Video, X, Zap
} from 'lucide-react';
import Cookies from 'js-cookie';

const avatarFallback = 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg';

const isVideo = (url, mediaType) => {
    if (!url) return false;
    if (url.startsWith('blob:')) return mediaType === 'video';
    return /\.(mp4|webm|mov|m4v|m3u8|ogv)$|video/i.test(url);
};

const createImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
});

const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
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
    ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);

    const data = ctx.getImageData(0, 0, safeArea, safeArea);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(data, -safeArea / 2 + image.width * 0.5 - pixelCrop.x, -safeArea / 2 + image.height * 0.5 - pixelCrop.y);

    return new Promise((resolve) => canvas.toBlob((file) => resolve(file), 'image/jpeg'));
};

const EditNeuralProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [identity, setIdentity] = useState({
        name: user?.name || '',
        username: user?.username || '',
        bio: user?.bio || '',
        isProfessional: user?.isProfessional || false,
        professionCategory: user?.professionCategory || 'Digital Creator'
    });
    const [activeSection, setActiveSection] = useState('identity');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [videoRange, setVideoRange] = useState({ start: 0, end: 10 });
    const [videoDuration, setVideoDuration] = useState(0);
    const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, balance: 0 });

    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

    const resetMedia = () => {
        setMediaFile(null);
        setMediaUrl(null);
        setMediaType(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setCroppedAreaPixels(null);
        setVideoRange({ start: 0, end: 10 });
        setVideoDuration(0);
        setAdjustments({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, balance: 0 });
    };

    useEffect(() => {
        if (!isOpen) return;
        setIdentity({
            name: user?.name || '',
            username: user?.username || '',
            bio: user?.bio || '',
            isProfessional: user?.isProfessional || false,
            professionCategory: user?.professionCategory || 'Digital Creator'
        });
        setActiveSection('identity');
        setSaveError('');
        resetMedia();
    }, [isOpen]);

    useEffect(() => () => {
        if (mediaUrl?.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
    }, [mediaUrl]);

    useEffect(() => {
        if (mediaType !== 'video' || !mediaUrl) return undefined;
        const interval = window.setInterval(() => {
            document.querySelectorAll('video').forEach((video) => {
                if (video.src.includes(mediaUrl) && (video.currentTime < videoRange.start || video.currentTime > videoRange.end)) {
                    video.currentTime = videoRange.start;
                }
            });
        }, 200);
        return () => window.clearInterval(interval);
    }, [mediaType, mediaUrl, videoRange]);

    const handleFileSelect = (event, type) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const nextUrl = URL.createObjectURL(file);
        setMediaFile(file);
        setMediaType(type);
        setMediaUrl(nextUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setCroppedAreaPixels(null);
        setAdjustments({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, balance: 0 });
        setSaveError('');
        setActiveSection('editor');

        if (type === 'video') {
            const video = document.createElement('video');
            video.src = nextUrl;
            video.onloadedmetadata = () => {
                setVideoDuration(video.duration);
                setVideoRange({ start: 0, end: Math.min(10, video.duration) });
            };
        }
    };

    const apiRequest = async (path, options) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
        const token = Cookies.get('synapse_token');
        const response = await fetch(`${apiUrl}${path}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not save your profile.');
        return data;
    };

    const saveProfile = async (profileImage, videoTrim = null) => {
        // This payload and endpoint are intentionally unchanged: the backend
        // persists it through its existing Turso/libSQL user update flow.
        const data = await apiRequest('/api/user/update', {
            method: 'PUT',
            body: JSON.stringify({ ...identity, profileImage, videoTrim })
        });
        onUpdate?.(data.data);
        onClose();
    };

    const handleIdentitySave = async () => {
        setIsSaving(true);
        setSaveError('');
        try {
            await saveProfile(user?.profileImage, null);
        } catch (error) {
            console.error('Profile save failed:', error);
            setSaveError(error.message || 'Could not save your profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMediaSave = async () => {
        if (!mediaFile || !mediaUrl) return;
        setIsSaving(true);
        setSaveError('');
        try {
            let fileToUpload = mediaFile;
            if (mediaType === 'image' && croppedAreaPixels) {
                const cropped = await getCroppedImg(mediaUrl, croppedAreaPixels, rotation);
                fileToUpload = new File([cropped], mediaFile.name, { type: 'image/jpeg' });
            }

            const apiUrl = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';
            const token = Cookies.get('synapse_token');
            const uploadResponse = await fetch(`${apiUrl}/api/social/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ fileName: fileToUpload.name, fileType: fileToUpload.type })
            });
            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok || !uploadData.uploadUrl || !uploadData.publicUrl) throw new Error(uploadData.error || 'Could not prepare the upload.');

            const storageResponse = await fetch(uploadData.uploadUrl, {
                method: 'PUT', body: fileToUpload, headers: { 'Content-Type': fileToUpload.type }
            });
            if (!storageResponse.ok) throw new Error('Could not upload the profile visual.');

            await saveProfile(uploadData.publicUrl, mediaType === 'video' ? videoRange : null);
        } catch (error) {
            console.error('Profile visual save failed:', error);
            setSaveError(error.message || 'Could not save your profile visual. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const filterStyle = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) sepia(${adjustments.sepia}%) grayscale(${adjustments.grayscale}%) hue-rotate(${adjustments.balance}deg)`;
    const sections = [
        { id: 'identity', label: 'Profile', icon: User },
        { id: 'media', label: 'Photo', icon: ImageIcon },
        { id: 'editor', label: 'Adjust', icon: Sliders, disabled: !mediaUrl }
    ];
    const currentVisual = mediaUrl || user?.profileImage;
    const currentVisualIsVideo = isVideo(currentVisual, mediaType);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6">
                    <motion.button type="button" aria-label="Close edit profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-md" />
                    <motion.section role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" initial={{ opacity: 0, y: 56 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 56 }} transition={{ type: 'spring', stiffness: 340, damping: 32 }} className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#090a0b] shadow-2xl sm:h-[min(92dvh,48rem)] sm:max-w-2xl sm:rounded-[2rem] sm:border sm:border-white/10">
                        <header className="shrink-0 border-b border-white/[0.08] bg-[#0d0f10]/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6 sm:pt-5">
                            <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-emerald-300"><Terminal size={13} /><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Profile settings</span></div><h2 id="edit-profile-title" className="truncate text-xl font-bold tracking-tight text-white">Edit neural profile</h2></div><button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition hover:bg-white/10 hover:text-white active:scale-95"><X size={18} /></button></div>
                            <nav aria-label="Edit profile sections" className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/30 p-1">{sections.map(({ id, label, icon: Icon, disabled }) => <button key={id} type="button" disabled={disabled} onClick={() => setActiveSection(id)} className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition ${activeSection === id ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'} disabled:cursor-not-allowed disabled:opacity-35`}><Icon size={14} /><span className="truncate">{label}</span></button>)}</nav>
                        </header>

                        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
                            <AnimatePresence mode="wait" initial={false}>
                                {activeSection === 'identity' && <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="space-y-5">
                                    <div className="flex items-center gap-4 rounded-3xl border border-white/[0.08] bg-gradient-to-br from-emerald-400/[0.1] to-transparent p-4"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black">{currentVisualIsVideo ? <video src={currentVisual} className="h-full w-full object-cover" autoPlay muted loop playsInline /> : <img src={currentVisual || avatarFallback} alt="Current profile" className="h-full w-full object-cover" />}</div><div className="min-w-0"><p className="text-sm font-bold text-white">Your public identity</p><p className="mt-1 text-xs leading-relaxed text-gray-400">Update your name, username, bio, and creator profile. Changes save only when you tap Save profile.</p></div></div>
                                    <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-300"><User size={14} className="text-emerald-300" /> Name</span><input type="text" value={identity.name} onChange={(event) => setIdentity({ ...identity, name: event.target.value })} placeholder="Enter your name" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400/60 focus:bg-emerald-400/[0.04]" /></label>
                                    <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-300"><Fingerprint size={14} className="text-blue-300" /> Username</span><div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 transition focus-within:border-blue-400/60 focus-within:bg-blue-400/[0.04]"><span className="mr-1 text-sm text-gray-500">@</span><input type="text" value={identity.username} onChange={(event) => setIdentity({ ...identity, username: event.target.value })} placeholder="username" className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-gray-600" /></div></label>
                                    <label className="block"><span className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-gray-300"><span>Bio</span><span className="font-mono text-[10px] font-normal text-gray-500">{identity.bio.length}/150</span></span><textarea value={identity.bio} maxLength={150} onChange={(event) => setIdentity({ ...identity, bio: event.target.value })} rows={4} placeholder="Tell people a little about yourself..." className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm leading-relaxed text-white outline-none transition placeholder:text-gray-600 focus:border-purple-400/60 focus:bg-purple-400/[0.04]" /></label>
                                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300"><Sparkles size={18} /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">Professional profile</p><p className="mt-1 text-xs leading-relaxed text-gray-500">Show your professional category on your profile.</p></div><button type="button" role="switch" aria-checked={identity.isProfessional} onClick={() => setIdentity((current) => ({ ...current, isProfessional: !current.isProfessional }))} className={`relative h-7 w-12 shrink-0 rounded-full transition ${identity.isProfessional ? 'bg-indigo-400' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${identity.isProfessional ? 'translate-x-5' : 'translate-x-0'}`} /></button></div><AnimatePresence initial={false}>{identity.isProfessional && <motion.label initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 16 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="block overflow-hidden"><span className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-300"><Globe size={14} className="text-indigo-300" /> Category</span><input type="text" value={identity.professionCategory} onChange={(event) => setIdentity({ ...identity, professionCategory: event.target.value })} placeholder="e.g. Digital Creator" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400/60" /></motion.label>}</AnimatePresence></div>
                                    <button type="button" onClick={handleIdentitySave} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-4 text-sm font-bold text-black transition hover:bg-emerald-300 active:scale-[0.99]"><Zap size={17} fill="currentColor" /> Save profile</button>
                                </motion.div>}

                                {activeSection === 'media' && <motion.div key="media" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="space-y-5">
                                    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 text-center"><div className="relative mx-auto mb-4 h-28 w-28 overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-xl">{currentVisualIsVideo ? <video src={currentVisual} className="h-full w-full object-cover" autoPlay muted loop playsInline /> : <img src={currentVisual || avatarFallback} alt="Current profile" className="h-full w-full object-cover" />}<div className="absolute inset-0 grid place-items-center bg-black/35"><Scan size={22} className="text-white" /></div></div><h3 className="text-base font-bold text-white">Choose a new profile visual</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-gray-400">Add a photo or short video. You can crop and tune it before saving.</p></div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-[116px] flex-col items-center justify-center gap-3 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 text-center transition hover:bg-emerald-400/[0.12] active:scale-[0.98]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-black"><ImageIcon size={21} /></span><span><span className="block text-sm font-bold text-white">Upload photo</span><span className="mt-1 block text-[11px] text-gray-400">Crop and enhance</span></span></button><button type="button" onClick={() => videoInputRef.current?.click()} className="flex min-h-[116px] flex-col items-center justify-center gap-3 rounded-3xl border border-blue-400/20 bg-blue-400/[0.06] p-5 text-center transition hover:bg-blue-400/[0.12] active:scale-[0.98]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-400 text-black"><Video size={21} /></span><span><span className="block text-sm font-bold text-white">Upload video</span><span className="mt-1 block text-[11px] text-gray-400">Trim before saving</span></span></button></div>
                                    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-4 text-xs leading-relaxed text-gray-500"><Shield size={16} className="mt-0.5 shrink-0 text-emerald-300" /> Your current profile visual stays unchanged until you save the new one.</div>
                                </motion.div>}

                                {activeSection === 'editor' && mediaUrl && <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="space-y-5">
                                    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-black"><div className="relative h-[clamp(17rem,48dvh,28rem)] overflow-hidden"><Cropper image={mediaType === 'image' ? mediaUrl : undefined} video={mediaType === 'video' ? mediaUrl : undefined} crop={crop} zoom={zoom} rotation={rotation} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} onRotationChange={setRotation} showGrid style={{ mediaStyle: { filter: filterStyle }, containerStyle: { background: '#020202' } }} /><div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-[9px] text-emerald-300">Drag to position</div></div><div className="border-t border-white/[0.08] bg-[#101112] p-4"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-white"><Maximize2 size={15} className="text-emerald-300" /> Zoom</span><span className="font-mono text-[11px] text-emerald-300">{zoom.toFixed(1)}×</span></div><input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-3 w-full accent-emerald-400" /></div></div>
                                    {mediaType === 'video' && <div className="rounded-3xl border border-blue-400/20 bg-blue-400/[0.06] p-4"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-blue-100"><Clock size={15} /> Video duration</span><span className="font-mono text-[11px] text-blue-200">{videoRange.start.toFixed(1)}s – {videoRange.end.toFixed(1)}s</span></div><input type="range" min="0" max={Math.max(0, videoDuration - 1)} step="0.1" value={videoRange.start} onChange={(event) => { const start = Number(event.target.value); setVideoRange({ start, end: Math.min(start + 10, videoDuration) }); }} className="mt-4 w-full accent-blue-400" /></div>}
                                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold text-white"><Sliders size={16} className="text-emerald-300" /> Fine tune</span><span className="text-[10px] font-medium uppercase tracking-widest text-gray-500">Preview only</span></div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{[{ label: 'Brightness', icon: <Sun size={13} />, key: 'brightness', max: 200, unit: '%' }, { label: 'Contrast', icon: <Aperture size={13} />, key: 'contrast', max: 200, unit: '%' }, { label: 'Saturation', icon: <Droplet size={13} />, key: 'saturation', max: 200, unit: '%' }, { label: 'Hue balance', icon: <Sparkles size={13} />, key: 'balance', max: 360, unit: '°' }].map(({ label, icon, key, max, unit }) => <label key={key} className="block"><span className="mb-2 flex items-center justify-between text-[11px] font-semibold text-gray-400"><span className="flex items-center gap-1.5">{icon}{label}</span><span className="font-mono text-gray-300">{adjustments[key]}{unit}</span></span><input type="range" min="0" max={max} value={adjustments[key]} onChange={(event) => setAdjustments({ ...adjustments, [key]: Number(event.target.value) })} className="w-full accent-emerald-400" /></label>)}</div></div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={() => { resetMedia(); setActiveSection('media'); }} className="rounded-2xl border border-white/10 px-4 py-3.5 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.06]">Choose another file</button><button type="button" onClick={handleMediaSave} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-bold text-black transition hover:bg-emerald-300 active:scale-[0.99]"><Check size={17} /> Save profile visual</button></div>
                                </motion.div>}
                            </AnimatePresence>
                            {saveError && <p role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-center text-xs leading-relaxed text-red-200">{saveError}</p>}
                        </main>
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(event) => handleFileSelect(event, 'image')} />
                        <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(event) => handleFileSelect(event, 'video')} />
                        <AnimatePresence>{isSaving && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 grid place-items-center bg-[#090a0b]/90 p-6 text-center backdrop-blur-xl"><div><div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Fingerprint size={34} /><span className="absolute inset-[-7px] rounded-full border border-emerald-400/20 animate-[spin_2.5s_linear_infinite]" /></div><p className="text-sm font-bold text-white">Saving your profile</p><p className="mt-2 text-xs text-gray-400">Please keep this screen open for a moment.</p></div></motion.div>}</AnimatePresence>
                    </motion.section>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EditNeuralProfileModal;
