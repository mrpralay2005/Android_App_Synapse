import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, ArrowLeft, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreateStoryModal = ({ isOpen, onClose, onSubmit, user }) => {
    const [step, setStep] = useState(1); // 1: Select Media, 2: Preview
    const [mediaUrl, setMediaUrl] = useState('');
    const [type, setType] = useState('IMAGE');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [rawMedia, setRawMedia] = useState(null);

    const fileInputRef = useRef(null);

    const handleFile = (file) => {
        if (!file) return;
        const isVideo = file.type.startsWith('video/');
        setType(isVideo ? 'VIDEO' : 'IMAGE');
        setRawMedia(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            setMediaUrl(e.target.result);
            setStep(2);
        };
        reader.readAsDataURL(file);
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

    const handleSubmit = async () => {
        if (!mediaUrl) return;
        setIsSubmitting(true);
        try {
            const success = await onSubmit({
                mediaUrl,
                type,
                rawFile: rawMedia
            });
            if (success) {
                onClose();
                setStep(1);
                setMediaUrl('');
                setRawMedia(null);
            } else {
                alert("Neural link unstable: Upload failed.");
            }
        } catch (err) {
            console.error("Story Upload Error", err);
            alert("Neural crash: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Legendary Variants for stable animation
    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, rotateY: 5 },
        visible: {
            opacity: 1,
            scale: 1,
            rotateY: 0,
            transition: { duration: 0.4, ease: "easeOut" }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-8 perspective-[2000px] pointer-events-none">
            {/* Backdrop - High-End Obsidian Void */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl pointer-events-auto"
            />

            {/* 3D Floating Glass Slab Container */}
            <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={{
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                }}
                className="relative w-full md:max-w-md h-full md:h-[90vh] flex flex-col group z-10 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glass Prism Frame - Pulse Protocol */}
                {step === 2 && (
                    <motion.div
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        style={{ willChange: 'opacity' }}
                        className="absolute -inset-[3px] rounded-[2rem] bg-gradient-to-tr from-fuchsia-500/30 via-white/40 to-emerald-500/30 blur-[2px] z-0"
                    />
                )}

                {/* Main Modal Content */}
                <div
                    className="relative flex-1 bg-[#050505] md:rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col z-10"
                    style={{ isolation: 'isolate' }}
                >
                    {/* Header overlay - Softened Gradient */}
                    <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 via-black/20 to-transparent">
                        <button onClick={step === 1 ? onClose : () => setStep(1)} className="text-white/80 hover:text-white transition-colors">
                            {step === 1 ? <X size={28} /> : <ArrowLeft size={28} />}
                        </button>
                        {step === 2 && (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-500 text-black px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-emerald-300 transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Broadcast"}
                            </button>
                        )}
                    </div>

                    {/* Step 1: Selection */}
                    {step === 1 && (
                        <div
                            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                            onClick={() => fileInputRef.current.click()}
                            className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all ${dragActive ? 'bg-emerald-500/5' : ''}`}
                        >
                            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFile(e.target.files[0])} accept="image/*,video/*" />
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 10 }}
                                className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/10 group-hover:border-emerald-500/50 transition-all shadow-inner"
                            >
                                <Upload className="text-emerald-500" size={32} />
                            </motion.div>
                            <h3 className="text-white text-lg font-bold tracking-tight">Sync Neural Stream</h3>
                            <p className="text-gray-500 text-[10px] mt-2 tracking-[0.3em] uppercase opacity-60">Package Selection Required</p>
                        </div>
                    )}

                    {/* Step 2: Realistic Preview */}
                    {step === 2 && (
                        <div className="relative w-full h-full bg-[#080808] flex items-center justify-center group/preview overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="w-full h-full"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'translateZ(0)'
                                }}
                            >
                                {type === 'VIDEO' ? (
                                    <video
                                        src={mediaUrl}
                                        className="w-full h-full object-cover"
                                        autoPlay loop muted playsInline
                                        style={{ transform: 'translateZ(0)' }}
                                    />
                                ) : (
                                    <img
                                        src={mediaUrl}
                                        className="w-full h-full object-cover"
                                        alt="Preview"
                                        style={{ transform: 'translateZ(0)' }}
                                    />
                                )}
                            </motion.div>

                            {/* Glass Preview Badge */}
                            <div className="absolute bottom-12 left-0 right-0 flex justify-center z-30">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-black/40 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/10 flex items-center gap-3 shadow-2xl"
                                >
                                    <img src={user?.image || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"} className="w-6 h-6 rounded-full border border-white/20" alt="me" />
                                    <span className="text-white text-[10px] font-bold uppercase tracking-[0.2em]">Neural Projection</span>
                                </motion.div>
                            </div>

                            {/* Cinematic vignette - Lightened for better visibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40 pointer-events-none z-20" />
                        </div>
                    )}
                </div>

            </motion.div>
        </div>
    );
};

export default CreateStoryModal;
