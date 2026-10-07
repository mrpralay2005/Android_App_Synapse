import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Send, ShieldCheck, Loader2, Lock, Unlock, Upload, Monitor, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreatePostModal = ({ isOpen, onClose, onSubmit, user }) => {
    const [step, setStep] = useState(1); // 1: Select Media, 2: Details & Encryption
    const [caption, setCaption] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [type, setType] = useState('IMAGE');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [postPassword, setPostPassword] = useState('');
    const [isProtected, setIsProtected] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [rawMedia, setRawMedia] = useState(null); // Actual File object for cloud upload

    const fileInputRef = useRef(null);
    const submissionLockRef = useRef(false); // CRITICAL: Prevent duplicate submissions

    // Neural Compressor: Shrinks images properly to fit Cloudflare's 1MB limit
    const compressImage = async (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 1200; // Professional Instagram size
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Iterative compression to ensure < 1MB
                    let quality = 0.8;
                    let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                    // While size > 0.9MB (approx), reduce quality
                    while ((compressedDataUrl.length * 0.75) > 900000 && quality > 0.1) {
                        quality -= 0.1;
                        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    resolve(compressedDataUrl);
                };
            };
        });
    };

    const handleFile = async (file) => {
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        setType(isVideo ? 'VIDEO' : 'IMAGE');
        setIsOptimizing(true);

        try {
            setRawMedia(file);
            if (isVideo) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setUploadPreview(e.target.result);
                    setMediaUrl(e.target.result);
                    setStep(2);
                };
                reader.readAsDataURL(file);
            } else {
                const compressedData = await compressImage(file);
                setUploadPreview(compressedData);
                setMediaUrl(compressedData);
                setStep(2);
            }
        } catch (err) {
            console.error("Neural Sync Error:", err);
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        
        const submitId = `MODAL_SUBMIT_${Date.now()}`;
        console.log(`\n[${submitId}] ========== MODAL SUBMIT TRIGGERED ==========`);
        
        if (!mediaUrl) {
            console.log(`[${submitId}] ❌ ABORT: No media URL`);
            return;
        }

        // ATOMIC CHECK-AND-SET: Check and set in one line to prevent race condition
        if (submissionLockRef.current === true) {
            console.warn(`[${submitId}] 🚫 BLOCKED: Lock already acquired`);
            return;
        }
        submissionLockRef.current = true; // IMMEDIATELY set to true
        
        console.log(`[${submitId}] ✅ LOCK ACQUIRED`);
        console.log(`[${submitId}] Has rawMedia:`, !!rawMedia);
        
        if (isSubmitting) {
            console.warn(`[${submitId}] 🚫 Secondary check: isSubmitting is true, releasing lock`);
            submissionLockRef.current = false;
            return;
        }

        setIsSubmitting(true);
        console.log(`[${submitId}] Proceeding with submission`);
        
        try {
            const postData = {
                caption,
                mediaUrl,
                type,
                postPassword: isProtected ? postPassword : null,
                rawFile: rawMedia
            };
            console.log(`[${submitId}] Calling onSubmit with data:`, {
                captionLength: caption?.length,
                type,
                hasPassword: isProtected,
                hasRawFile: !!rawMedia,
                rawFileSize: rawMedia?.size,
                rawFileName: rawMedia?.name
            });
            
            const success = await onSubmit(postData);
            console.log(`[${submitId}] onSubmit returned:`, success);

            if (success) {
                console.log(`[${submitId}] ✅ Success! Resetting form and closing modal`);
                setStep(1);
                resetForm();
                onClose();
            } else {
                console.error(`[${submitId}] ❌ Upload failed`);
                alert("Neural Network Saturated. The file is still too large for the Cloudflare Gateway (1MB). Please try a smaller file.");
            }
        } catch (err) {
            console.error(`[${submitId}] ❌ Exception:`, err);
            alert("Connection Severed. Deployment failed.");
        } finally {
            submissionLockRef.current = false;
            setIsSubmitting(false);
            console.log(`[${submitId}] 🔓 LOCK RELEASED`);
            console.log(`[${submitId}] ========== MODAL SUBMIT COMPLETE ==========\n`);
        }
    };

    const resetForm = () => {
        setCaption(''); setMediaUrl(''); setUploadPreview(null);
        setIsProtected(false); setPostPassword(''); setType('IMAGE');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {/* Dark Professional Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/95 backdrop-blur-2xl pointer-events-auto"
            />

            {/* Instagram-Style Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-4xl h-[85vh] max-h-[700px] bg-[#050505] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Step 1: Select Media View */}
                {step === 1 && (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-white text-sm font-bold uppercase tracking-[0.3em]">Create New Post</h2>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div
                            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                            onClick={() => fileInputRef.current.click()}
                            className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all ${dragActive ? 'bg-emerald-500/5' : ''}`}
                        >
                            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFile(e.target.files[0])} accept="image/*,video/*" />

                            {isOptimizing ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative">
                                        <Loader2 className="animate-spin text-emerald-500" size={64} />
                                        <div className="absolute inset-0 bg-emerald-500/20 blur-[20px] rounded-full" />
                                    </div>
                                    <p className="text-emerald-500 font-bold text-xs uppercase tracking-[0.3em] animate-pulse">Syncing Neural Core...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center p-12">
                                    <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10 group-hover:border-emerald-500/50 transition-all">
                                        <Upload className="text-gray-400" size={32} />
                                    </div>
                                    <h3 className="text-white text-xl font-bold mb-2">Drag photos and videos here</h3>
                                    <p className="text-gray-500 mb-8 text-sm">Initiate your next broadcast to the sector</p>
                                    <button className="px-8 py-3 bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all">Select From Storage</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Instagram Two-Pane Layout */}
                {step === 2 && (
                    <>
                        {/* Left: Professional Preview Section */}
                        <div className="flex-[1.5] bg-black flex items-center justify-center relative border-r border-white/5 h-full overflow-hidden">
                            <button
                                onClick={() => setStep(1)}
                                className="absolute top-6 left-6 z-10 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            {type === 'VIDEO' ? (
                                <video src={uploadPreview} className="max-h-full w-full object-contain" controls />
                            ) : (
                                <img src={uploadPreview} className="max-h-full w-full object-contain" alt="Preview" />
                            )}
                        </div>

                        {/* Right: Details & Encryption Pane */}
                        <div className="flex-1 flex flex-col bg-[#050505] p-4 justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <img src={user?.image} className="w-8 h-8 rounded-full border border-white/10" alt="me" />
                                    <span className="text-white font-bold text-sm tracking-tight">{user?.username}</span>
                                </div>
                                <div className="text-emerald-500/60 font-bold text-[10px] uppercase tracking-[0.2em]">
                                    {isSubmitting ? "Syncing..." : "New Post"}
                                </div>
                            </div>

                            {/* Caption Input */}
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Write a caption..."
                                className="w-full bg-transparent border-none text-white placeholder-gray-600 focus:ring-0 resize-none flex-1 text-sm leading-relaxed"
                            />

                            <div className="space-y-3">
                                {/* Password Encryption Core (Your Setup) */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${isProtected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-gray-500'}`}>
                                                {isProtected ? <Lock size={16} /> : <Unlock size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-white text-[11px] font-bold uppercase tracking-wider">Advanced Privacy</p>
                                                <p className="text-[9px] text-gray-500 font-medium">Encrypt this neural segment</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!isProtected) {
                                                    setShowPasswordModal(true);
                                                } else {
                                                    setIsProtected(false);
                                                    setPostPassword('');
                                                }
                                            }}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${isProtected ? 'bg-emerald-500' : 'bg-white/10'}`}
                                        >
                                            <motion.div animate={{ x: isProtected ? 22 : 4 }} className="w-3 h-3 bg-white rounded-full absolute top-1" />
                                        </button>
                                    </div>
                                </div>

                                {/* Security Verification */}
                                <div className="flex items-center justify-between py-3 px-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="text-emerald-500" size={16} />
                                        <span className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">Secure Link Active</span>
                                    </div>
                                    <CheckCircle2 className="text-emerald-500/40" size={16} />
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className={`w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all ${isSubmitting ? 'bg-gray-900 text-gray-700' : 'bg-emerald-500 text-black shadow-[0_15px_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-95'}`}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                    Initiate Broadcast
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>

            {/* Password Popup Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowPasswordModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">Set Neural Key</h3>
                                    <p className="text-gray-500 text-xs">Protect your content with encryption</p>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={postPassword}
                                onChange={(e) => setPostPassword(e.target.value)}
                                placeholder="Enter Neural Key..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-700 outline-none focus:border-emerald-500/30 transition-all font-mono tracking-widest text-sm mb-4"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setIsProtected(false);
                                        setPostPassword('');
                                    }}
                                    className="flex-1 py-3 bg-white/5 text-white rounded-xl font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setIsProtected(true);
                                    }}
                                    disabled={!postPassword}
                                    className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold text-xs disabled:opacity-50"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CreatePostModal;
