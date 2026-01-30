'use client';

import { useState, useCallback, useEffect } from 'react';
import { useL4yercak3Client } from '../provider';
import type {
  BuilderProject,
  BuilderProjectCreateInput,
  BuilderProjectUpdateInput,
  BuilderProjectLinkInput,
  BuilderProjectListParams,
  BuilderProjectLinkedObjects,
  Event,
  Product,
  Form,
  Contact,
  PaginatedResponse,
} from '../../types';

export interface UseBuilderProjectsResult {
  /** Current list of builder projects */
  projects: BuilderProject[];
  /** Whether a request is in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Total count of projects (from last fetch) */
  total: number;
  /** Whether there are more projects to load */
  hasMore: boolean;
  /** Fetch builder projects with optional filters */
  fetchProjects: (params?: BuilderProjectListParams) => Promise<PaginatedResponse<BuilderProject>>;
  /** Get a single builder project by ID */
  getProject: (id: string) => Promise<BuilderProject>;
  /** Create a new builder project */
  createProject: (data: BuilderProjectCreateInput) => Promise<BuilderProject>;
  /** Update an existing builder project */
  updateProject: (id: string, data: BuilderProjectUpdateInput) => Promise<BuilderProject>;
  /** Delete a builder project */
  deleteProject: (id: string) => Promise<void>;
  /** Link objects to a builder project */
  linkObjects: (id: string, data: BuilderProjectLinkInput) => Promise<{ linkedObjects: BuilderProjectLinkedObjects }>;
  /** Deploy a builder project to Vercel */
  deployProject: (id: string) => Promise<{ deployUrl: string; vercelProjectId: string }>;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook for managing builder projects.
 *
 * @example
 * ```tsx
 * function ProjectList() {
 *   const { projects, loading, fetchProjects, deployProject } = useBuilderProjects();
 *
 *   useEffect(() => {
 *     fetchProjects({ status: 'ready' });
 *   }, []);
 *
 *   const handleDeploy = async (projectId: string) => {
 *     const { deployUrl } = await deployProject(projectId);
 *     window.open(deployUrl, '_blank');
 *   };
 *
 *   return (
 *     <div>
 *       {projects.map(project => (
 *         <div key={project.id}>
 *           <h3>{project.name}</h3>
 *           <button onClick={() => handleDeploy(project.id)}>Deploy</button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBuilderProjects(): UseBuilderProjectsResult {
  const client = useL4yercak3Client();
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchProjects = useCallback(
    async (params?: BuilderProjectListParams): Promise<PaginatedResponse<BuilderProject>> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.builderProjects.list(params);
        setProjects(result.items);
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

  const getProject = useCallback(
    async (id: string): Promise<BuilderProject> => {
      setLoading(true);
      setError(null);
      try {
        return await client.builderProjects.get(id);
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

  const createProject = useCallback(
    async (data: BuilderProjectCreateInput): Promise<BuilderProject> => {
      setLoading(true);
      setError(null);
      try {
        const project = await client.builderProjects.create(data);
        setProjects((prev) => [...prev, project]);
        setTotal((prev) => prev + 1);
        return project;
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

  const updateProject = useCallback(
    async (id: string, data: BuilderProjectUpdateInput): Promise<BuilderProject> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await client.builderProjects.update(id, data);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        return updated;
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

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await client.builderProjects.delete(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setTotal((prev) => prev - 1);
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

  const linkObjects = useCallback(
    async (id: string, data: BuilderProjectLinkInput): Promise<{ linkedObjects: BuilderProjectLinkedObjects }> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.builderProjects.linkObjects(id, data);
        // Update local project state with new linked objects
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, linkedObjects: result.linkedObjects } : p
          )
        );
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

  const deployProject = useCallback(
    async (id: string): Promise<{ deployUrl: string; vercelProjectId: string }> => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.builderProjects.deploy(id);
        // Update local project state with deploying status
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'deploying' as const,
                  deployment: {
                    ...p.deployment,
                    status: 'deploying' as const,
                    vercelProjectId: result.vercelProjectId,
                  },
                }
              : p
          )
        );
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    projects,
    loading,
    error,
    total,
    hasMore,
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    linkObjects,
    deployProject,
    clearError,
  };
}

export interface UseBuilderProjectLinkedDataResult {
  /** Linked events */
  events: Event[];
  /** Linked products */
  products: Product[];
  /** Linked forms */
  forms: Form[];
  /** Linked contacts */
  contacts: Contact[];
  /** Whether data is loading */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Refresh the linked data */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching linked data for a builder project.
 * This is the key hook for v0-generated apps to fetch their dynamic data.
 *
 * @param projectId - The builder project ID (optional, auto-detected from env if not provided)
 *
 * @example
 * ```tsx
 * // In a v0-generated app
 * function EventsPage() {
 *   const { events, loading } = useBuilderProjectLinkedData();
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       {events.map(event => (
 *         <EventCard key={event.id} event={event} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBuilderProjectLinkedData(projectId?: string): UseBuilderProjectLinkedDataResult {
  const client = useL4yercak3Client();
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Try to get project ID from environment if not provided
  const resolvedProjectId = projectId || (typeof process !== 'undefined' ? process.env.L4YERCAK3_PROJECT_ID : undefined);

  const refresh = useCallback(async (): Promise<void> => {
    if (!resolvedProjectId) {
      console.warn('[@l4yercak3/sdk] No project ID provided to useBuilderProjectLinkedData. Set L4YERCAK3_PROJECT_ID or pass projectId.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await client.builderProjects.getLinkedData(resolvedProjectId);
      setEvents(data.events);
      setProducts(data.products);
      setForms(data.forms);
      setContacts(data.contacts);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, resolvedProjectId]);

  // Auto-fetch on mount if we have a project ID
  useEffect(() => {
    if (resolvedProjectId) {
      refresh();
    }
  }, [resolvedProjectId, refresh]);

  return {
    events,
    products,
    forms,
    contacts,
    loading,
    error,
    refresh,
  };
}
