import { writeFile } from 'node:fs/promises';

// This marker is intentionally written after every build. Open clients compare
// it with the deployed marker before reloading, so they never restart into a
// Pages build that is still in progress.
const buildId = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || `local-${Date.now()}`;
await writeFile('dist/synapse-build.json', JSON.stringify({ buildId, builtAt: new Date().toISOString() }));
