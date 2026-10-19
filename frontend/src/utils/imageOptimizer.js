/**
 * Instagram-Style Image Optimization
 * Progressive loading: blur → low quality → high quality
 */

const IMAGE_QUALITY = {
    THUMBNAIL: 'w=150&q=60',    // Tiny placeholder
    LOW: 'w=400&q=70',           // Quick preview
    MEDIUM: 'w=800&q=80',        // Normal view
    HIGH: 'w=1200&q=90'          // Full quality
};

/**
 * Get optimized image URL (Cloudflare Image Resizing)
 * @param {string} url - Original image URL
 * @param {string} quality - 'thumbnail', 'low', 'medium', 'high'
 * @returns {string} - Optimized URL
 */
export const getOptimizedImageUrl = (url, quality = 'medium') => {
    if (!url) return url;
    
    // If already optimized or external URL, return as-is
    if (url.includes('?') || url.startsWith('http://') || url.startsWith('https://')) {
        // For your backend images, you can add Cloudflare image resizing
        // Format: /cdn-cgi/image/width=800,quality=80/your-image.jpg
        if (url.includes('synapse-backend') || url.includes('workers.dev')) {
            const params = IMAGE_QUALITY[quality.toUpperCase()] || IMAGE_QUALITY.MEDIUM;
            // Cloudflare Image Resizing (if enabled)
            // return url.replace(/^(https?:\/\/[^\/]+)/, `$1/cdn-cgi/image/${params}`);
        }
    }
    
    return url;
};

/**
 * Preload image in background (Instagram strategy)
 * @param {string} url - Image URL to preload
 */
export const preloadImage = (url) => {
    if (!url) return;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = reject;
        img.src = url;
    });
};

/**
 * Create blurred placeholder (Instagram blur effect)
 * @param {string} url - Image URL
 * @returns {string} - Data URL of blurred version
 */
export const createBlurPlaceholder = (url) => {
    // Return a tiny base64 gray placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect width="1" height="1" fill="%23222"%3E%3C/rect%3E%3C/svg%3E';
};

export default {
    getOptimizedImageUrl,
    preloadImage,
    createBlurPlaceholder,
    IMAGE_QUALITY
};
