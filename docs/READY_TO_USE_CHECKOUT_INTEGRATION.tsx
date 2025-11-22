/**
 * READY-TO-USE CHECKOUT INTEGRATION
 *
 * Drop this file into your frontend project and use it!
 * Replace your workflow API calls with this checkout integration.
 *
 * Location: /src/utils/checkoutIntegration.ts (or .tsx)
 */

import React from 'react';

// ============================================
// TYPES
// ============================================

interface WorkflowPayload {
  trigger: string;
  inputData: {
    customerData: {
      email: string;
      firstName: string;
      lastName: string;
      organization?: string;
      phone?: string;
      salutation?: string;
      title?: string;
    };
    eventId: string;
    eventType: string;
    formId: string;
    formResponses: Record<string, any>;
    products: Array<{ productId: string; quantity: number }>;
    transactionData: {
      currency: string;
      breakdown: {
        basePrice: number;
        addons?: Array<any>;
        subtotal: number;
        total: number;
      };
    };
    metadata?: Record<string, any>;
  };
}

interface CheckoutPayload {
  organizationId: string;
  checkoutInstanceId: string;
  productIds: string[];
  quantities: number[];
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: 'free' | 'stripe' | 'invoice';
  formResponses: Array<{
    productId: string;
    ticketNumber: number;
    formId?: string;
    responses: Record<string, any>;
    addedCosts: number;
  }>;
  transactionType?: 'B2C' | 'B2B';
  companyName?: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

interface CheckoutSessionResponse {
  checkoutSessionId: string;
  sessionId: string;
  clientSecret?: string;
  requiresPayment: boolean;
  amount: number;
  currency: string;
  expiresAt: number;
}

interface CheckoutConfirmResponse {
  success: boolean;
  purchasedItemIds: string[];
  crmContactId?: string;
  paymentId: string;
  amount: number;
  currency: string;
  isGuestRegistration: boolean;
  frontendUserId?: string;
  invoiceType: 'none' | 'receipt' | 'manual_b2b' | 'manual_b2c' | 'employer';
  downloadUrls: {
    purchaseItems: string;
    tickets?: string;
    invoice?: string;
  };
}

// ============================================
// CONFIGURATION
// ============================================

const CHECKOUT_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_CONVEX_URL || 'https://agreeable-lion-828.convex.site',
  apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
  organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || '',
  checkoutInstanceId: process.env.NEXT_PUBLIC_CHECKOUT_INSTANCE_ID || '',
};

// Validate config
if (!CHECKOUT_CONFIG.apiKey) {
  console.warn('⚠️ NEXT_PUBLIC_API_KEY not set in environment variables');
}
if (!CHECKOUT_CONFIG.organizationId) {
  console.warn('⚠️ NEXT_PUBLIC_ORGANIZATION_ID not set in environment variables');
}
if (!CHECKOUT_CONFIG.checkoutInstanceId) {
  console.warn('⚠️ NEXT_PUBLIC_CHECKOUT_INSTANCE_ID not set in environment variables');
}

// ============================================
// PAYLOAD MAPPER
// ============================================

/**
 * Convert your existing workflow payload to checkout payload
 */
export function mapWorkflowToCheckout(
  workflowPayload: WorkflowPayload,
  paymentMethod: 'free' | 'stripe' | 'invoice' = 'free'
): CheckoutPayload {
  const { inputData } = workflowPayload;
  const { customerData, formResponses, products, formId } = inputData;

  // Build customer name with salutation and title
  const nameParts = [
    customerData.salutation,
    customerData.title,
    customerData.firstName,
    customerData.lastName,
  ].filter(Boolean);
  const customerName = nameParts.join(' ');

  // Extract product IDs and quantities
  const productIds = products.map(p => p.productId);
  const quantities = products.map(p => p.quantity);

  // Map form responses for main ticket (first product)
  const mainProduct = products[0];
  const checkoutFormResponses = [
    {
      productId: mainProduct.productId,
      ticketNumber: 1,
      formId: formId,
      responses: formResponses,
      addedCosts: 0,
    },
  ];

  // Build base payload
  const checkoutPayload: CheckoutPayload = {
    organizationId: CHECKOUT_CONFIG.organizationId,
    checkoutInstanceId: CHECKOUT_CONFIG.checkoutInstanceId,
    productIds,
    quantities,
    customerEmail: customerData.email,
    customerName,
    customerPhone: customerData.phone,
    paymentMethod,
    formResponses: checkoutFormResponses,
  };

  // Add B2B fields if organization provided
  if (customerData.organization) {
    checkoutPayload.transactionType = 'B2B';
    checkoutPayload.companyName = customerData.organization;

    // Extract billing address from formResponses
    if (formResponses.billing_street && formResponses.billing_city) {
      checkoutPayload.billingAddress = {
        line1: formResponses.billing_street,
        city: formResponses.billing_city,
        postalCode: formResponses.billing_postal_code,
        country: formResponses.billing_country,
      };
    }
  }

  return checkoutPayload;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Create checkout session
 */
async function createCheckoutSession(
  payload: CheckoutPayload
): Promise<CheckoutSessionResponse> {
  const response = await fetch(`${CHECKOUT_CONFIG.baseUrl}/api/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHECKOUT_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to create checkout session');
  }

  return response.json();
}

/**
 * Confirm checkout payment
 */
async function confirmCheckout(
  checkoutSessionId: string,
  paymentIntentId: string
): Promise<CheckoutConfirmResponse> {
  const response = await fetch(`${CHECKOUT_CONFIG.baseUrl}/api/v1/checkout/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHECKOUT_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkoutSessionId,
      sessionId: checkoutSessionId,
      paymentIntentId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to confirm checkout');
  }

  return response.json();
}

// ============================================
// MAIN INTEGRATION FUNCTION
// ============================================

/**
 * Process event registration using checkout API
 *
 * This replaces your existing workflow API call.
 *
 * @example
 * ```typescript
 * const result = await processEventRegistration(workflowPayload, 'free');
 * console.log('Registration complete!', result.purchasedItemIds);
 * ```
 */
export async function processEventRegistration(
  workflowPayload: WorkflowPayload,
  paymentMethod: 'free' | 'stripe' | 'invoice' = 'free'
): Promise<CheckoutConfirmResponse> {
  try {
    console.log('🚀 [Checkout] Starting registration process...');

    // Step 1: Convert payload
    const checkoutPayload = mapWorkflowToCheckout(workflowPayload, paymentMethod);
    console.log('✅ [Checkout] Payload converted:', {
      productIds: checkoutPayload.productIds,
      quantities: checkoutPayload.quantities,
      customerEmail: checkoutPayload.customerEmail,
      paymentMethod: checkoutPayload.paymentMethod,
    });

    // Step 2: Create checkout session
    console.log('📦 [Checkout] Creating checkout session...');
    const session = await createCheckoutSession(checkoutPayload);
    console.log('✅ [Checkout] Session created:', {
      checkoutSessionId: session.checkoutSessionId,
      requiresPayment: session.requiresPayment,
      amount: session.amount,
      currency: session.currency,
    });

    // Step 3: Handle payment based on method
    let paymentIntentId: string;

    if (!session.requiresPayment) {
      // Free event or invoice - no payment UI needed
      console.log('✅ [Checkout] No payment required, confirming immediately...');
      paymentIntentId = paymentMethod === 'invoice' ? 'invoice' : 'free';
    } else if (paymentMethod === 'stripe' && session.clientSecret) {
      // TODO: For Stripe payments, you need to show Stripe Elements UI
      // and get the paymentIntent.id after user completes payment
      throw new Error(
        'Stripe payment requires UI integration. See STRIPE_PAYMENT_INTEGRATION.md'
      );
    } else {
      throw new Error('Invalid payment state');
    }

    // Step 4: Confirm checkout
    console.log('💳 [Checkout] Confirming payment...');
    const result = await confirmCheckout(session.checkoutSessionId, paymentIntentId);
    console.log('✅ [Checkout] Registration complete!', {
      success: result.success,
      purchasedItemIds: result.purchasedItemIds,
      invoiceType: result.invoiceType,
      isGuestRegistration: result.isGuestRegistration,
    });

    return result;
  } catch (error) {
    console.error('❌ [Checkout] Registration failed:', error);
    throw error;
  }
}

// ============================================
// REACT HOOK (OPTIONAL)
// ============================================

/**
 * React hook for checkout integration
 *
 * @example
 * ```typescript
 * const { processRegistration, loading, error } = useCheckout();
 *
 * const handleSubmit = async () => {
 *   const result = await processRegistration(workflowPayload, 'free');
 *   if (result.success) {
 *     showSuccessModal(result);
 *   }
 * };
 * ```
 */
export function useCheckout() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const processRegistration = async (
    workflowPayload: WorkflowPayload,
    paymentMethod: 'free' | 'stripe' | 'invoice' = 'free'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await processEventRegistration(workflowPayload, paymentMethod);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Registration failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { processRegistration, loading, error };
}

// ============================================
// USAGE EXAMPLE
// ============================================

/*
import { processEventRegistration } from '@/utils/checkoutIntegration';

// Your existing workflow payload
const workflowPayload = {
  trigger: "api_call",
  inputData: {
    customerData: {
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      organization: "ACME Corp",
      phone: "+49123456789",
      salutation: "Herr",
      title: "Dr."
    },
    eventId: "ns73596...",
    eventType: "haffsymposium_registration",
    formId: "form_haffsymposium_2025_registration",
    formResponses: {
      attendee_category: "standard",
      dietary_requirements: "vegetarian",
      // ... all other form fields
    },
    products: [
      { productId: "ns72v16...", quantity: 1 },
      { productId: "addon-1763127610845", quantity: 2 }
    ],
    transactionData: { ... }
  }
};

// Call the checkout API
try {
  const result = await processEventRegistration(workflowPayload, 'free');

  console.log('✅ Success!', result);
  // {
  //   success: true,
  //   purchasedItemIds: ["ticket_123"],
  //   crmContactId: "contact_xyz",
  //   isGuestRegistration: true,
  //   frontendUserId: "frontend_user_abc",
  //   invoiceType: "none",
  //   downloadUrls: {
  //     tickets: "https://.../tickets/k789xyz/download"
  //   }
  // }

  // Show success modal to user
  showSuccessModal({
    title: '✅ Registration Successful!',
    message: 'Confirmation email sent with your ticket.',
    downloadUrl: result.downloadUrls.tickets,
  });

} catch (error) {
  console.error('❌ Registration failed:', error);
  showErrorModal(error.message);
}
*/

// ============================================
// REACT COMPONENT EXAMPLE
// ============================================

/*
import React from 'react';
import { useCheckout } from '@/utils/checkoutIntegration';

export function RegistrationForm() {
  const { processRegistration, loading, error } = useCheckout();
  const [formData, setFormData] = React.useState({...});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build workflow payload from form data
    const workflowPayload = {
      trigger: "api_call",
      inputData: {
        customerData: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          organization: formData.organization,
          phone: formData.phone,
          salutation: formData.salutation,
          title: formData.title,
        },
        eventId: "ns73596...",
        eventType: "haffsymposium_registration",
        formId: "form_haffsymposium_2025_registration",
        formResponses: formData,
        products: [
          { productId: "ns72v16...", quantity: 1 }
        ],
        transactionData: {...}
      }
    };

    try {
      const result = await processRegistration(workflowPayload, 'free');

      // Success!
      showSuccessModal({
        title: '✅ Registration Complete!',
        message: 'Check your email for confirmation and tickets.',
        ticketIds: result.purchasedItemIds,
        downloadUrl: result.downloadUrls.tickets,
      });

    } catch (err) {
      // Error handling
      console.error('Registration error:', err);
      showErrorModal(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error.message}</div>}

      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />

      {/* ... other form fields ... *\/}

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Register Now'}
      </button>
    </form>
  );
}
*/

// ============================================
// EXPORTS
// ============================================

export default {
  mapWorkflowToCheckout,
  processEventRegistration,
  useCheckout,
};
