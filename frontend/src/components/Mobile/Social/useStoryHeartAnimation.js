import { useRef, useCallback } from 'react';

// --- Pure Helper Functions ---
// --- Pure Helper Functions ---
const heartStyles = [
  { c0: '#ffffff', c1: '#ffffff' },  // Pure white
  { c0: '#ffffff', c1: '#f5f5f5' },  // White to very light gray
  { c0: '#ffffff', c1: '#ffffff' },  // Pure white
  { c0: '#fafafa', c1: '#ffffff' },  // Off-white to white
  { c0: '#ffffff', c1: '#f8f8f8' }   // White to light gray
];

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const buildHeartSVG = (colors) => {
  const uid = Math.random().toString(36).slice(2, 8);
  return `
    <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; overflow: visible;">
      <defs>
        <linearGradient id="hg-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${colors.c0}" />
          <stop offset="100%" stop-color="${colors.c1}" />
        </linearGradient>
      </defs>
      <path d="M50 88 C20 65 5 48 5 30 C5 14 18 5 32 5 C40 5 46 9 50 16 C54 9 60 5 68 5 C82 5 95 14 95 30 C95 48 80 65 50 88 Z"
            fill="url(#hg-${uid})" />
    </svg>
  `;
};

const animateNode = (node, duration, updateFn, onComplete) => {
  let startTime = null;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    updateFn(progress);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  };
  requestAnimationFrame(step);
};

export function useStoryHeartAnimation() {
  const stageRef = useRef(null);

  // Spawn single heart particle
  const spawnHeart = useCallback((originX, originY, tier, sideDirection) => {
    if (!stageRef.current) return;

    const el = document.createElement('div');
    el.className = 'story-heart-node';
    const colors = heartStyles[Math.floor(Math.random() * heartStyles.length)];
    el.innerHTML = buildHeartSVG(colors);

    let size, blurPx, zIndex, duration;

    // 3-tier depth system
    if (tier === 'hero') {
      size = randomBetween(30, 38);  // Reduced from 35-45
      blurPx = 0;
      zIndex = 20;
      duration = 2000;
    } else if (tier === 'medium') {
      size = randomBetween(22, 28);  // Reduced from 25-32
      blurPx = randomBetween(0, 1.5);
      zIndex = 15;
      duration = 2300;
    } else {
      size = randomBetween(14, 19);  // Reduced from 16-22
      blurPx = randomBetween(4, 8);
      zIndex = 5;
      duration = 2600;
    }

    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.zIndex = zIndex;
    if (blurPx > 0) el.style.filter = `blur(${blurPx}px)`;

    stageRef.current.appendChild(el);

    const laneOffset = sideDirection * randomBetween(12, 32);
    const startX = originX + laneOffset - size / 2;
    const startY = originY - size / 2;
    const floatDistance = randomBetween(420, 560);
    const waveAmplitude = randomBetween(18, 34) * sideDirection;
    const waveCycles = randomBetween(1.15, 1.5);
    const baseTilt = sideDirection * randomBetween(6, 18);

    animateNode(el, duration, (p) => {
      const currentY = startY - p * floatDistance;
      const angle = p * Math.PI * 2 * waveCycles;
      const currentX = startX + Math.sin(angle) * waveAmplitude;
      const rotation = baseTilt + Math.cos(angle) * 8;

      let opacity = 1;
      if (p < 0.12) opacity = p / 0.12;
      else if (p > 0.65) opacity = 1 - (p - 0.65) / 0.35;

      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${rotation}deg)`;
      el.style.opacity = opacity;
    }, () => el.remove());
  }, []);

  // Spawn bokeh/light particle
  const spawnBokeh = useCallback((originX, originY, sideDirection) => {
    if (!stageRef.current) return;

    const el = document.createElement('div');
    el.className = 'story-bokeh-node';

    const size = randomBetween(4, 14);
    const isBright = Math.random() > 0.5;
    
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = isBright
      ? 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,200,220,0.3) 70%, transparent 100%)'
      : 'radial-gradient(circle, rgba(255,180,200,0.5) 0%, rgba(255,120,150,0.15) 70%, transparent 100%)';
    el.style.borderRadius = '50%';
    if (Math.random() > 0.6) el.style.filter = `blur(${randomBetween(1, 3)}px)`;

    stageRef.current.appendChild(el);

    const startX = originX + sideDirection * randomBetween(20, 70);
    const startY = originY + randomBetween(-20, 10);
    const floatDist = randomBetween(300, 480);
    const duration = randomBetween(2000, 2800);  // Reduced from 3000-4200ms

    animateNode(el, duration, (p) => {
      const currentY = startY - p * floatDist;
      const currentX = startX + Math.sin(p * Math.PI * 2) * 10;
      let opacity = p < 0.15 ? p / 0.15 : (p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1);
      
      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      el.style.opacity = opacity * 0.7;
    }, () => el.remove());
  }, []);

  // Trigger full heart burst sequence
  const triggerHeartBurst = useCallback((buttonElement) => {
    if (!buttonElement || !stageRef.current) return;

    const rect = buttonElement.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const sequence = [
      { tier: 'hero', dir: -1 },
      { tier: 'medium', dir: 1 },
      { tier: 'background', dir: -1 },
      { tier: 'hero', dir: 1 },
      { tier: 'medium', dir: -1 },
      { tier: 'background', dir: 1 },
      { tier: 'medium', dir: -1 }
    ];

    let index = 0;

    const spawnStep = () => {
      const item = sequence[index];
      spawnHeart(originX, originY, item.tier, item.dir);
      
      if (Math.random() > 0.35) spawnBokeh(originX, originY, item.dir);
      if (Math.random() > 0.6) spawnBokeh(originX, originY, -item.dir);

      index++;
      if (index < sequence.length) {
        setTimeout(spawnStep, randomBetween(180, 260));
      }
    };

    spawnStep();
  }, [spawnHeart, spawnBokeh]);

  return { stageRef, triggerHeartBurst };
}

// CSS that needs to be injected
export const HEART_ANIMATION_STYLES = `
.story-heart-stage {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}

.story-heart-node, .story-bokeh-node {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform, opacity;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}
`;
