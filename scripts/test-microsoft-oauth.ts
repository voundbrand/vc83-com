/**
 * Test Microsoft OAuth Configuration
 *
 * This script verifies that your Azure app credentials are configured correctly
 * by generating a valid OAuth authorization URL.
 *
 * Run: npx ts-node scripts/test-microsoft-oauth.ts
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/microsoft/callback`;

console.log('🔍 Testing Microsoft OAuth Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`  MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`  MICROSOFT_CLIENT_SECRET: ${process.env.MICROSOFT_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`  MICROSOFT_TENANT_ID: ${MICROSOFT_TENANT_ID}`);
console.log(`  NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
console.log(`  OAUTH_ENCRYPTION_KEY: ${process.env.OAUTH_ENCRYPTION_KEY ? '✅ Set' : '❌ Missing'}`);
console.log('');

if (!MICROSOFT_CLIENT_ID) {
  console.error('❌ MICROSOFT_CLIENT_ID is not set in .env.local');
  process.exit(1);
}

if (!process.env.MICROSOFT_CLIENT_SECRET) {
  console.error('❌ MICROSOFT_CLIENT_SECRET is not set in .env.local');
  process.exit(1);
}

if (!process.env.OAUTH_ENCRYPTION_KEY) {
  console.warn('⚠️  OAUTH_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32');
}

// Generate OAuth URL
const scopes = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read'
];

const state = Math.random().toString(36).substring(7);
const nonce = Math.random().toString(36).substring(7);

const authUrl = new URL(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`);
authUrl.searchParams.append('client_id', MICROSOFT_CLIENT_ID);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('scope', scopes.join(' '));
authUrl.searchParams.append('state', state);
authUrl.searchParams.append('nonce', nonce);
authUrl.searchParams.append('response_mode', 'query');

console.log('✅ Configuration looks good!\n');
console.log('📝 OAuth Authorization URL:');
console.log(`   ${authUrl.toString()}\n`);
console.log('🔗 Redirect URI configured in Azure:');
console.log(`   ${REDIRECT_URI}\n`);
console.log('📦 Requested Scopes:');
scopes.forEach(scope => console.log(`   - ${scope}`));
console.log('');
console.log('🧪 Test Instructions:');
console.log('   1. Make sure this redirect URI is registered in Azure Portal:');
console.log(`      ${REDIRECT_URI}`);
console.log('   2. Copy the OAuth URL above');
console.log('   3. Paste it in your browser');
console.log('   4. You should see Microsoft login page');
console.log('   5. After login, you should be redirected to your callback URL');
console.log('      (It will 404 for now - that\'s expected!)');
console.log('');
console.log('✨ Next Steps:');
console.log('   - If the OAuth URL works, credentials are configured correctly');
console.log('   - Ready to implement the OAuth mutations in Convex');
