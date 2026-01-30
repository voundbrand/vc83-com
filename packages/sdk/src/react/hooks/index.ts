/**
 * @l4yercak3/sdk React Hooks
 *
 * All React hooks for interacting with the LayerCake API.
 */

// CRM
export { useContacts, type UseContactsResult } from './useContacts';
export { useOrganizations, type UseOrganizationsResult } from './useOrganizations';

// Events
export { useEvents, useAttendees, type UseEventsResult, type UseAttendeesResult } from './useEvents';

// Forms
export { useForms, useFormSubmissions, type UseFormsResult, type UseFormSubmissionsResult } from './useForms';

// Commerce
export { useProducts, useCheckout, type UseProductsResult, type UseCheckoutResult, type CartItem } from './useCheckout';
export { useOrders, type UseOrdersResult } from './useOrders';

// Finance
export { useInvoices, type UseInvoicesResult } from './useInvoices';

// Benefits
export { useBenefitClaims, useCommissions, type UseBenefitClaimsResult, type UseCommissionsResult } from './useBenefits';

// Certificates
export { useCertificates, type UseCertificatesResult } from './useCertificates';

// Builder Projects (v0-generated apps)
export {
  useBuilderProjects,
  useBuilderProjectLinkedData,
  type UseBuilderProjectsResult,
  type UseBuilderProjectLinkedDataResult,
} from './useBuilderProject';
