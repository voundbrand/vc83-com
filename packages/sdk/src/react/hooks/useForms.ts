'use client';

import { useState, useCallback } from 'react';
import { useL4yercak3Client } from '../provider';
import type {
  Form,
  FormSubmission,
  FormListParams,
  FormSubmissionListParams,
  PaginatedResponse,
} from '../../types';

export interface UseFormsResult {
  /** Current list of forms */
  forms: Form[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of forms (from last fetch) */
  total: number;
  /** Whether there are more forms to load */
  hasMore: boolean;
  /** Fetch forms with optional filters */
  fetchForms: (params?: FormListParams) => Promise<PaginatedResponse<Form>>;
  /** Get a single form by ID */
  getForm: (id: string) => Promise<Form>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing forms.
 *
 * @example
 * ```tsx
 * function FormList() {
 *   const { forms, loading, fetchForms } = useForms();
 *
 *   useEffect(() => {
 *     fetchForms({ status: 'published' });
 *   }, []);
 *
 *   return (
 *     <div>
 *       {forms.map(form => (
 *         <FormCard key={form.id} form={form} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useForms(): UseFormsResult {
  const client = useL4yercak3Client();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchForms = useCallback(
    async (params?: FormListParams): Promise<PaginatedResponse<Form>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.forms.list(params);
        setForms(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const getForm = useCallback(
    async (id: string): Promise<Form> => {
      setLoading(true);
      setError(null);
      try {
        return await client.forms.get(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    forms,
    loading,
    error,
    total,
    hasMore,
    fetchForms,
    getForm,
    clearError,
  };
}

export interface UseFormSubmissionsResult {
  /** Current list of submissions */
  submissions: FormSubmission[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Whether a form is being submitted */
  isSubmitting: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of submissions (from last fetch) */
  total: number;
  /** Whether there are more submissions to load */
  hasMore: boolean;
  /** Fetch submissions for a form */
  fetchSubmissions: (formId: string, params?: FormSubmissionListParams) => Promise<PaginatedResponse<FormSubmission>>;
  /** Submit a form response */
  submitForm: (formId: string, data: Record<string, unknown>) => Promise<FormSubmission>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing form submissions.
 *
 * @example
 * ```tsx
 * function ContactForm({ formId }) {
 *   const { submitForm, isSubmitting, error } = useFormSubmissions();
 *   const [formData, setFormData] = useState({});
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await submitForm(formId, formData);
 *       alert('Form submitted successfully!');
 *     } catch (err) {
 *       // Error is also available in the error state
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="error">{error.message}</div>}
 *       <button type="submit" disabled={isSubmitting}>
 *         {isSubmitting ? 'Submitting...' : 'Submit'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormSubmissions(): UseFormSubmissionsResult {
  const client = useL4yercak3Client();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchSubmissions = useCallback(
    async (formId: string, params?: FormSubmissionListParams): Promise<PaginatedResponse<FormSubmission>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.forms.getSubmissions(formId, params);
        setSubmissions(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const submitForm = useCallback(
    async (formId: string, data: Record<string, unknown>): Promise<FormSubmission> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const submission = await client.forms.submit(formId, data);
        setSubmissions((prev) => [submission, ...prev]);
        setTotal((prev) => prev + 1);
        return submission;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [client]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submissions,
    loading,
    isSubmitting,
    error,
    total,
    hasMore,
    fetchSubmissions,
    submitForm,
    clearError,
  };
}
