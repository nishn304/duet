/**
 * Minimal ambient types for the WebMCP imperative API.
 *
 * The shipping Chrome / ChatGPT implementations expose this on
 * `document.modelContext`; an earlier spec draft used `navigator.modelContext`.
 * `src/webmcp/compat.ts` bridges the two so the rest of the app only ever
 * touches `document.modelContext`.
 */

interface WebMCPToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

interface WebMCPToolResult {
  content: Array<{ type: string; text?: string; [k: string]: unknown }>;
  isError?: boolean;
}

interface WebMCPToolDescriptor {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  annotations?: WebMCPToolAnnotations;
  execute: (
    args: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => WebMCPToolResult | string | unknown | Promise<WebMCPToolResult | string | unknown>;
}

interface ModelContext extends EventTarget {
  registerTool(tool: WebMCPToolDescriptor, options?: { signal?: AbortSignal }): void | Promise<void>;
  unregisterTool?(name: string): void;
  getTools?(): Promise<unknown[]>;
  ontoolchange?: ((this: ModelContext, ev: Event) => unknown) | null;
}

interface Document {
  modelContext?: ModelContext;
}

interface Navigator {
  modelContext?: ModelContext;
}
