/// <reference types="vite/client" />

// Add import.meta.glob type definition for Vite
interface ImportMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  glob: (pattern: string) => Record<string, () => Promise<any>>;
}
