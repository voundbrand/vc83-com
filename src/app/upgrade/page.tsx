"use client";

/**
 * CLI Upgrade Landing Page
 *
 * This page is designed for CLI users who hit their limits.
 * It authenticates them via CLI session token and redirects
 * to the main app with the store window opened.
 *
 * URL format: /upgrade?token=cli_session_xxx&reason=api_keys&resource=API%20Keys
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ShoppingBag, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

function UpgradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const token = searchParams.get('token');
  const reason = searchParams.get('reason') || 'limit';
  const resource = searchParams.get('resource') || 'resources';

  useEffect(() => {
    async function validateAndRedirect() {
      if (!token) {
        setStatus('error');
        setErrorMessage('Missing authentication token. Please run "l4yercak3 login" first.');
        return;
      }

      try {
        // Validate the CLI session
        const response = await fetch('/api/v1/auth/cli/validate', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          setStatus('error');
          setErrorMessage(data.error || 'Session validation failed. Please run "l4yercak3 login" again.');
          return;
        }

        const data = await response.json();
        if (data.valid && data.email) {
          setUserEmail(data.email);
          setStatus('authenticated');

          // Redirect to main app with upgrade intent after a brief delay
          setTimeout(() => {
            // The main app will detect this and open the store window
            router.push(`/?openWindow=store&upgradeReason=${encodeURIComponent(reason)}&upgradeResource=${encodeURIComponent(resource)}`);
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage('Invalid session. Please run "l4yercak3 login" again.');
        }
      } catch (error) {
        console.error('Validation error:', error);
        setStatus('error');
        setErrorMessage('Failed to validate session. Please try again.');
      }
    }

    validateAndRedirect();
  }, [token, reason, resource, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#008080' }}
    >
      <div
        className="max-w-md w-full"
        style={{
          background: '#c0c0c0',
          border: '2px solid',
          borderColor: '#ffffff #808080 #808080 #ffffff',
          boxShadow: '2px 2px 0 #000',
        }}
      >
        {/* Title Bar */}
        <div
          className="px-2 py-1 flex items-center gap-2"
          style={{
            background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
            color: 'white',
          }}
        >
          <ShoppingBag size={14} />
          <span className="text-sm font-bold">L4YERCAK3 - Upgrade Your Plan</span>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: '#000080' }} />
              <h2 className="text-lg font-bold mb-2" style={{ color: '#000' }}>
                Validating Session...
              </h2>
              <p className="text-sm" style={{ color: '#404040' }}>
                Please wait while we verify your CLI session.
              </p>
            </div>
          )}

          {status === 'authenticated' && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: '#d4edda', border: '2px solid #28a745' }}
              >
                <ArrowRight size={32} style={{ color: '#28a745' }} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#000' }}>
                Welcome back, {userEmail}!
              </h2>
              <p className="text-sm mb-4" style={{ color: '#404040' }}>
                Redirecting you to the upgrade page...
              </p>
              <div
                className="p-3 text-left text-sm"
                style={{
                  background: '#ffffcc',
                  border: '1px solid #e6e600',
                }}
              >
                <p className="font-bold mb-1" style={{ color: '#666600' }}>
                  Upgrade Reason: {resource} Limit Reached
                </p>
                <p style={{ color: '#666600' }}>
                  You'll be able to view all available plans and choose the one that fits your needs.
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: '#f8d7da', border: '2px solid #dc3545' }}
              >
                <AlertCircle size={32} style={{ color: '#dc3545' }} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#dc3545' }}>
                Authentication Error
              </h2>
              <p className="text-sm mb-4" style={{ color: '#404040' }}>
                {errorMessage}
              </p>
              <div
                className="p-3 text-left text-sm"
                style={{
                  background: '#e9ecef',
                  border: '1px solid #adb5bd',
                }}
              >
                <p className="font-bold mb-1">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1" style={{ color: '#404040' }}>
                  <li>Open your terminal</li>
                  <li>Run <code className="bg-white px-1 border">l4yercak3 login</code></li>
                  <li>Complete the login process</li>
                  <li>Try the upgrade command again</li>
                </ol>
              </div>
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-4 py-2 text-sm font-bold"
                style={{
                  background: '#c0c0c0',
                  border: '2px solid',
                  borderColor: '#ffffff #808080 #808080 #ffffff',
                }}
              >
                Go to Homepage
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#008080' }}
      >
        <Loader2 size={48} className="animate-spin" style={{ color: 'white' }} />
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  );
}
