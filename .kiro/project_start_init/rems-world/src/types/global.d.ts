declare global {
  interface Window {
    Cal: {
      (action: string, options?: unknown): void;
      ns?: Record<string, unknown>;
      loaded?: boolean;
      q?: unknown[];
    };
  }
}

export {};