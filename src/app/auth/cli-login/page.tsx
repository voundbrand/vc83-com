/**
 * CLI Login Provider Selection Page
 * 
 * Shows OAuth provider selection (Microsoft, Google, GitHub) for CLI login.
 * User selects their preferred provider, then redirects to OAuth.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function CliLoginContent() {
  const searchParams = useSearchParams();
  const state = searchParams.get('state');
  const callback = searchParams.get('callback');
  const [error, setError] = useState<string | null>(null);
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProviderClick = (provider: 'microsoft' | 'google' | 'github') => {
    if (!state || !callback) {
      setError('Missing required parameters');
      return;
    }

    // Redirect to provider OAuth (uses unified callback)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const redirectUri = `${appUrl}/api/auth/oauth/callback`;
    
    let authUrl = '';
    
    if (provider === 'github') {
      const githubAuthUrl = 'https://github.com/login/oauth/authorize';
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state: state,
        allow_signup: 'false',
      });
      authUrl = `${githubAuthUrl}?${params.toString()}`;
    } else if (provider === 'microsoft') {
      const microsoftAuthUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
        response_type: 'code',
        redirect_uri: redirectUri,
        response_mode: 'query',
        scope: 'openid profile email',
        state: state,
      });
      authUrl = `${microsoftAuthUrl}?${params.toString()}`;
    } else if (provider === 'google') {
      const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state: state,
      });
      authUrl = `${googleAuthUrl}?${params.toString()}`;
    }

    if (authUrl) {
      window.location.href = authUrl;
    } else {
      setError('Failed to generate OAuth URL');
    }
  };

  if (!state || !callback) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h1>Invalid Request</h1>
        <p>Missing required parameters. Please try logging in again from the CLI.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '500px', 
      margin: '0 auto', 
      fontFamily: 'system-ui' 
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        🍰 CLI Login
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
        Choose your preferred login method:
      </p>

      {error && (
        <div style={{ 
          padding: '15px', 
          background: '#fee', 
          color: '#c33', 
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => handleProviderClick('github')}
          style={{
            padding: '14px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '6px',
            background: '#24292e',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Continue with GitHub
        </button>

        <button
          onClick={() => handleProviderClick('microsoft')}
          style={{
            padding: '14px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '6px',
            background: '#0078d4',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Continue with Microsoft
        </button>

        <button
          onClick={() => handleProviderClick('google')}
          style={{
            padding: '14px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '6px',
            background: '#4285f4',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Continue with Google
        </button>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          onClick={() => setShowEmailSignup(!showEmailSignup)}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            background: 'white',
            color: '#666',
            cursor: 'pointer',
          }}
        >
          {showEmailSignup ? '← Back to OAuth' : 'Or create account with email'}
        </button>
      </div>

      {showEmailSignup && (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '6px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Create Account</h2>
          
          {error && (
            <div style={{ 
              padding: '10px', 
              background: '#fee', 
              color: '#c33', 
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);

            try {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
              const response = await fetch(`${appUrl}/api/auth/cli/email-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  state,
                  callback,
                  email,
                  password,
                  firstName,
                  lastName,
                  organizationName: organizationName || undefined,
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
              }

              // Redirect to CLI callback with token
              if (data.token && callback) {
                const redirectUrl = new URL(callback);
                redirectUrl.searchParams.set('token', data.token);
                window.location.href = redirectUrl.toString();
              }
            } catch (err: any) {
              setError(err.message || 'Failed to create account');
              setLoading(false);
            }
          }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                Password * (min 8 characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                Organization Name (optional)
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Will use your name if not provided"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '6px',
                background: loading ? '#ccc' : '#9F7AEA',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account & Login'}
            </button>
          </form>
        </div>
      )}

      <p style={{ 
        marginTop: '30px', 
        fontSize: '12px', 
        color: '#999', 
        textAlign: 'center' 
      }}>
        This will create the same account as platform login, just with CLI access.
      </p>
    </div>
  );
}

export default function CliLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h1>🍰 CLI Login</h1>
        <p>Loading...</p>
      </div>
    }>
      <CliLoginContent />
    </Suspense>
  );
}

