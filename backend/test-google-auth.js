
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

async function testGoogleAuth() {
    console.log('--- Google Search Auth Debug ---');

    // 1. Env Variables
    console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);

    // 2. File Check
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
        const resolvedPath = path.resolve(process.cwd(), credPath);
        console.log('Resolved Key Path:', resolvedPath);

        if (fs.existsSync(resolvedPath)) {
            console.log('✅ Key file exists.');
            try {
                const content = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
                console.log('Key Project ID:', content.project_id);
                console.log('Key Client Email:', content.client_email);

                if (content.project_id !== process.env.GOOGLE_CLOUD_PROJECT_ID) {
                    console.error('❌ WARNING: Mismatch between .env GOOGLE_CLOUD_PROJECT_ID and JSON file project_id!');
                } else {
                    console.log('✅ Project IDs match.');
                }
            } catch (e) {
                console.error('❌ Error reading key file:', e.message);
            }
        } else {
            console.error('❌ Key file NOT found at resolved path!');
        }
    } else {
        console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env');
    }

    // 3. Auth Test
    try {
        const auth = new GoogleAuth({
            keyFilename: credPath,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        console.log('✅ Auth Client Successful. Authenticated Project ID:', projectId);
    } catch (error) {
        console.error('❌ Google Log-in Failed:', error.message);
    }
}

testGoogleAuth();
