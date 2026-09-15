import React from 'react';
import { motion } from 'framer-motion';

/**
 * Priya's appearance.
 * ---------------------------------------------------------------------------
 * She is drawn as vector art so she ships inside the web bundle and the Android
 * build with no external assets, no network request and no licensing issues.
 *
 * WANT A REAL PHOTO INSTEAD?
 * Put an image in `frontend/src/assets/`, import it here and assign it to
 * PRIYA_PHOTO. Every avatar in the app (launcher, header, messages) will switch
 * to it automatically — that is the only line you need to change.
 *
 *   import priyaPhoto from '../../assets/priya.png';
 *   export const PRIYA_PHOTO = priyaPhoto;
 */
export const PRIYA_PHOTO = null;

const SKIN = '#f6d2b8';
const SKIN_SHADE = '#e8b79a';
const HAIR = '#123a34';
const HAIR_LIGHT = '#1d5a4e';
const LIP = '#e0796f';

/**
 * The full portrait. Used for the launcher button and the chat header.
 */
const PriyaAvatar = ({ size = 96, className = '', animated = true, showRing = true }) => {
    // A supplied photo always wins.
    if (PRIYA_PHOTO) {
        return (
            <img
                src={PRIYA_PHOTO}
                alt="Priya"
                width={size}
                height={size}
                className={`rounded-full object-cover ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div
            className={`relative shrink-0 ${className}`}
            style={{ width: size, height: size }}
            aria-label="Priya"
            role="img"
        >
            {showRing && (
                <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'conic-gradient(from 0deg, #10b981, #22d3ee, #34d399, #10b981)'
                    }}
                    animate={animated ? { rotate: 360 } : undefined}
                    transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                />
            )}

            <svg
                viewBox="0 0 100 100"
                width={size}
                height={size}
                className="relative block rounded-full"
                style={{ filter: 'drop-shadow(0 6px 18px rgba(16,185,129,0.35))' }}
            >
                <defs>
                    <linearGradient id="priyaBg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d2b26" />
                        <stop offset="100%" stopColor="#04110f" />
                    </linearGradient>
                    <linearGradient id="priyaSkin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SKIN} />
                        <stop offset="100%" stopColor={SKIN_SHADE} />
                    </linearGradient>
                    <linearGradient id="priyaHair" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={HAIR_LIGHT} />
                        <stop offset="100%" stopColor={HAIR} />
                    </linearGradient>
                    <radialGradient id="priyaGlow" cx="50%" cy="38%" r="60%">
                        <stop offset="0%" stopColor="rgba(16,185,129,0.45)" />
                        <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                    </radialGradient>
                    <clipPath id="priyaClip">
                        <circle cx="50" cy="50" r="48" />
                    </clipPath>
                </defs>

                <g clipPath="url(#priyaClip)">
                    {/* Backdrop + ambient glow */}
                    <circle cx="50" cy="50" r="48" fill="url(#priyaBg)" />
                    <circle cx="50" cy="50" r="48" fill="url(#priyaGlow)" />

                    {/* Neural halo behind her head */}
                    <motion.circle
                        cx="50"
                        cy="46"
                        r="34"
                        fill="none"
                        stroke="rgba(52,211,153,0.35)"
                        strokeWidth="0.6"
                        strokeDasharray="3 6"
                        animate={animated ? { rotate: 360 } : undefined}
                        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    />

                    {/* Hair — the long shape sitting behind the face */}
                    <path
                        d="M50 16 C29 16 22 32 22 50 C22 67 25 80 23 92 L39 92 C36 78 35 62 35 50 C35 37 41 31 50 31 C59 31 65 37 65 50 C65 62 64 78 61 92 L77 92 C75 80 78 67 78 50 C78 32 71 16 50 16 Z"
                        fill="url(#priyaHair)"
                    />

                    {/* Neck + shoulders */}
                    <path d="M44 68 L56 68 L56 78 L44 78 Z" fill={SKIN_SHADE} />
                    <path
                        d="M24 100 C26 86 37 80 50 80 C63 80 74 86 76 100 Z"
                        fill="#0f2f2a"
                    />
                    <path
                        d="M38 82 C42 88 58 88 62 82 L62 88 C58 92 42 92 38 88 Z"
                        fill="#10b981"
                        opacity="0.85"
                    />

                    {/* Face */}
                    <ellipse cx="50" cy="51" rx="18.5" ry="21.5" fill="url(#priyaSkin)" />

                    {/* Ears */}
                    <ellipse cx="31.5" cy="53" rx="3.2" ry="4.4" fill={SKIN} />
                    <ellipse cx="68.5" cy="53" rx="3.2" ry="4.4" fill={SKIN} />

                    {/* Fringe over the forehead */}
                    <path
                        d="M30 46 C32 30 40 24 50 24 C60 24 68 30 70 46 C65 37 59 32 50 32 C41 32 35 37 30 46 Z"
                        fill="url(#priyaHair)"
                    />

                    {/* Eyebrows */}
                    <path d="M37.5 44.5 Q42 42 46.5 44.8" stroke={HAIR} strokeWidth="1.3" strokeLinecap="round" fill="none" />
                    <path d="M53.5 44.8 Q58 42 62.5 44.5" stroke={HAIR} strokeWidth="1.3" strokeLinecap="round" fill="none" />

                    {/* Eyes — the whole group blinks on a slow, natural cycle */}
                    <motion.g
                        animate={animated ? { scaleY: [1, 1, 0.08, 1] } : undefined}
                        transition={{
                            duration: 5.4,
                            times: [0, 0.85, 0.9, 1],
                            repeat: Infinity,
                            repeatDelay: 1.8,
                            ease: 'easeInOut'
                        }}
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    >
                        <ellipse cx="42" cy="52" rx="4.2" ry="4.6" fill="#ffffff" />
                        <circle cx="42.6" cy="52.3" r="2.5" fill="#17614f" />
                        <circle cx="42.6" cy="52.3" r="1.15" fill="#05100e" />
                        <circle cx="41.4" cy="50.9" r="0.95" fill="#ffffff" />

                        <ellipse cx="58" cy="52" rx="4.2" ry="4.6" fill="#ffffff" />
                        <circle cx="58.6" cy="52.3" r="2.5" fill="#17614f" />
                        <circle cx="58.6" cy="52.3" r="1.15" fill="#05100e" />
                        <circle cx="57.4" cy="50.9" r="0.95" fill="#ffffff" />
                    </motion.g>

                    {/* Upper lash lines */}
                    <path d="M37.6 50.6 Q42 47.4 46.4 50.4" stroke="#0b2b26" strokeWidth="0.9" strokeLinecap="round" fill="none" />
                    <path d="M53.6 50.4 Q58 47.4 62.4 50.6" stroke="#0b2b26" strokeWidth="0.9" strokeLinecap="round" fill="none" />

                    {/* Nose */}
                    <path d="M50 55 Q49.1 58.6 50.7 59.4" stroke={SKIN_SHADE} strokeWidth="0.9" strokeLinecap="round" fill="none" />

                    {/* Lips */}
                    <path d="M45 65 C47.5 63.2 52.5 63.2 55 65 C52.5 66.3 47.5 66.3 45 65 Z" fill={LIP} />
                    <path d="M45.6 65.5 C47.5 68.3 52.5 68.3 54.4 65.5 C52.5 66.6 47.5 66.6 45.6 65.5 Z" fill="#c9635c" />

                    {/* Blush */}
                    <ellipse cx="36.5" cy="59.5" rx="4.6" ry="2.7" fill="#ef8f7f" opacity="0.26" />
                    <ellipse cx="63.5" cy="59.5" rx="4.6" ry="2.7" fill="#ef8f7f" opacity="0.26" />

                    {/* Earrings */}
                    <circle cx="31" cy="58" r="1.5" fill="#34d399" />
                    <circle cx="69" cy="58" r="1.5" fill="#34d399" />
                </g>

                {/* Floating neural motes */}
                {animated &&
                    [
                        { cx: 22, cy: 30, delay: 0 },
                        { cx: 78, cy: 34, delay: 0.9 },
                        { cx: 26, cy: 68, delay: 1.7 }
                    ].map((mote, i) => (
                        <motion.circle
                            key={i}
                            cx={mote.cx}
                            cy={mote.cy}
                            r="1.1"
                            fill="#34d399"
                            animate={{ opacity: [0, 1, 0], cy: [mote.cy + 4, mote.cy - 4, mote.cy + 4] }}
                            transition={{ duration: 4.4, delay: mote.delay, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    ))}
            </svg>
        </div>
    );
};

export default PriyaAvatar;