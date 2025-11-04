"use client";

/**
 * CHECKOUT SUCCESS PAGE
 *
 * Shows after successful payment
 */

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.close()}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Close Window
          </button>
          <p className="text-sm text-gray-500">
            You can safely close this page now.
          </p>
        </div>
      </div>
    </div>
  );
}
