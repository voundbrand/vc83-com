"use client";

import { useAuth } from "@/hooks/use-auth";

interface WaitingForApprovalScreenProps {
  status: "none" | "pending" | "rejected";
  requestedAt?: number;
  rejectionReason?: string;
  userEmail: string;
}

export function WaitingForApprovalScreen({
  status,
  requestedAt,
  rejectionReason,
  userEmail,
}: WaitingForApprovalScreenProps) {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center p-8" style={{ background: 'var(--background)' }}>
      {/* Main window */}
      <div className="w-full max-w-2xl bg-gray-200 border-2 border-gray-400 shadow-[inset_1px_1px_0_white,inset_-1px_-1px_0_rgba(0,0,0,0.5)]">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-2 py-1 flex items-center">
          <div className="text-white font-bold text-sm">Beta Access</div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Status-specific content */}
          {status === "pending" && (
            <div className="space-y-6">
              {/* Icon and main message */}
              <div className="flex items-start gap-4 mb-6">
                <div className="text-6xl">⏳</div>
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Thanks for signing up!
                  </h1>
                  <p className="text-gray-700">
                    We&apos;re currently in private beta.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded">
                <h2 className="font-bold text-lg mb-3">Your request is under review</h2>
                <p className="text-gray-700 mb-4">
                  We&apos;ll review your beta access request and get back to you within 24-48 hours.
                </p>
                {requestedAt && (
                  <p className="text-sm text-gray-600 mb-2">
                    Requested on {new Date(requestedAt).toLocaleDateString()} at {new Date(requestedAt).toLocaleTimeString()}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  We&apos;ll send you an email at <strong>{userEmail}</strong> when your access is approved.
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSignOut}
                  className="bg-gray-300 hover:bg-gray-400 border-2 border-gray-400 shadow-[inset_1px_1px_0_white,inset_-1px_-1px_0_rgba(0,0,0,0.5)] px-8 py-3 font-bold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {status === "rejected" && (
            <div className="space-y-6">
              {/* Icon and main message */}
              <div className="flex items-start gap-4 mb-6">
                <div className="text-6xl">❌</div>
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Beta Access Request Declined
                  </h1>
                  <p className="text-gray-700">
                    Unfortunately, your beta access request was not approved at this time.
                  </p>
                </div>
              </div>

              {rejectionReason && (
                <div className="bg-red-50 border-2 border-red-300 p-6 rounded">
                  <h2 className="font-bold text-lg mb-2">Reason:</h2>
                  <p className="text-gray-700">{rejectionReason}</p>
                </div>
              )}

              <div className="bg-gray-100 border-2 border-gray-300 p-6 rounded">
                <p className="text-gray-700 mb-4">
                  We appreciate your interest in l4yercak3! Stay connected with our community for updates on when we open up more beta access.
                </p>
                <p className="text-sm text-gray-600">
                  Have questions? Contact us at <a href="mailto:support@l4yercak3.com" className="text-blue-600 underline">support@l4yercak3.com</a>
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSignOut}
                  className="bg-gray-300 hover:bg-gray-400 border-2 border-gray-400 shadow-[inset_1px_1px_0_white,inset_-1px_-1px_0_rgba(0,0,0,0.5)] px-8 py-3 font-bold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {status === "none" && (
            <div className="space-y-6">
              {/* Icon and main message */}
              <div className="flex items-start gap-4 mb-6">
                <div className="text-6xl">🔒</div>
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Thanks for signing up!
                  </h1>
                  <p className="text-gray-700">
                    We&apos;re currently in private beta.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded">
                <h2 className="font-bold text-lg mb-3">Beta access required</h2>
                <p className="text-gray-700 mb-4">
                  Your account has been created, but beta access approval is required to use the platform.
                </p>
                <p className="text-sm text-gray-600">
                  We&apos;ll send you an email at <strong>{userEmail}</strong> when your access is approved.
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSignOut}
                  className="bg-gray-300 hover:bg-gray-400 border-2 border-gray-400 shadow-[inset_1px_1px_0_white,inset_-1px_-1px_0_rgba(0,0,0,0.5)] px-8 py-3 font-bold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
