import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || `local-${Date.now()}`
const buildMetadata = JSON.stringify({ buildId, builtAt: new Date().toISOString() })

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const apiUrl = env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev'
    const chatUrl = env.VITE_CHAT_API_URL || 'https://synapse-chat.mrpralay2005.workers.dev'

    return {
        define: {
            __SYNAPSE_BUILD_ID__: JSON.stringify(buildId)
        },
        plugins: [
            react(),
            {
                name: 'synapse-build-marker',
                generateBundle() {
                    this.emitFile({
                        type: 'asset',
                        fileName: 'synapse-build.json',
                        source: buildMetadata
                    })
                }
            }
        ],
        // ── Performance Optimizations for Mobile ─────────────────────────────
        build: {
            // Code splitting - load components on demand
            rollupOptions: {
                output: {
                    manualChunks: {
                        // Separate vendor chunks for better caching
                        'react-vendor': ['react', 'react-dom'],
                        'animation-vendor': ['framer-motion'],
                        'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge']
                    }
                }
            },
            // Optimize chunks
            chunkSizeWarningLimit: 1000,
            // Minify aggressively
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: mode === 'production', // Remove console.logs in production
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.info', 'console.debug']
                }
            }
        },
        // ── Dev proxy — eliminates CORS when running locally ──────────────────
        // All /api/* requests are forwarded to the real backend by Vite's dev
        // server, which doesn't have browser CORS restrictions. This only runs
        // during `npm run dev` and has zero effect on production builds.
        server: {
            proxy: {
                '/api': {
                    target: apiUrl,
                    changeOrigin: true,
                    secure: true,
                },
                '/api/chat': {
                    target: chatUrl,
                    changeOrigin: true,
                    secure: true,
                }
            }
        }
    }
})
