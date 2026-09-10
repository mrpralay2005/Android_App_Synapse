import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || `local-${Date.now()}`
const buildMetadata = JSON.stringify({ buildId, builtAt: new Date().toISOString() })

// https://vitejs.dev/config/
export default defineConfig({
    // The running bundle receives the exact identifier that is emitted into
    // /synapse-build.json. This lets update checks compare the deployed build
    // against the code currently running, rather than comparing two requests.
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
})
