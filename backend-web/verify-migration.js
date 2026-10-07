// Quick script to verify uploadId column exists
// Run: node verify-migration.js

const { createClient } = require('@libsql/client');
require('dotenv').config();

async function verify() {
    const client = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.DATABASE_AUTH_TOKEN
    });

    try {
        // Try to query the new column
        const result = await client.execute('PRAGMA table_info(Post)');
        console.log('Post table columns:');
        result.rows.forEach(col => {
            console.log(`- ${col.name} (${col.type})`);
        });

        const hasUploadId = result.rows.some(col => col.name === 'uploadId');
        if (hasUploadId) {
            console.log('\n✅ uploadId column exists!');
        } else {
            console.log('\n❌ uploadId column NOT found - run the migration!');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

verify();
