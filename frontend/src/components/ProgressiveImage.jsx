import React, { useState, useEffect } from 'react';
import { getOptimizedImageUrl, createBlurPlaceholder } from '../utils/imageOptimizer';

/**
 * Instagram-Style Progressive Image Component
 * Loads: blur placeholder → low quality → high quality
 */
const ProgressiveImage = ({ 
    src, 
    alt = '', 
    className = '',
    quality = 'medium',
    style = {},
    onClick = null
}) => {
    const [currentSrc, setCurrentSrc] = useState(createBlurPlaceholder());
    const [isLoaded, setIsLoaded] = useState(false);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (!src) return;

        let isMounted = true;
        
        // Load optimized version
        const optimizedSrc = getOptimizedImageUrl(src, quality);
        const img = new Image();
        
        img.onload = () => {
            if (isMounted) {
                setCurrentSrc(optimizedSrc);
                setIsLoaded(true);
            }
        };
        
        img.onerror = () => {
            if (isMounted) {
                setIsError(true);
                setCurrentSrc(src); // Fallback to original
            }
        };
        
        img.src = optimizedSrc;

        return () => {
            isMounted = false;
        };
    }, [src, quality]);

    if (isError && !src) {
        return (
            <div 
                className={`bg-gray-800 flex items-center justify-center ${className}`}
                style={style}
            >
                <span className="text-gray-500 text-xs">Image unavailable</span>
            </div>
        );
    }

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'}`}
            style={{
                ...style,
                filter: isLoaded ? 'none' : 'blur(10px)',
            }}
            onClick={onClick}
            loading="lazy"
        />
    );
};

export default ProgressiveImage;
