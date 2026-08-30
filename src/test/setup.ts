/**
 * A minimal fake WebMCP host for tests. It captures every registered tool and
 * lets a test invoke `execute` exactly the way a browser agent would, so the
 * whole agent path (schemas, execute bodies, store wiring) is covered without a
 * real `document.modelContext`.
 */
export interface CapturedTool {
  name: string;
  description: string;
  inputSchema?: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (args: unknown) => Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }>;
}

import { beforeEach } from 'vitest';

class FakeModelContext extends EventTarget {
  tools = new Map<string, CapturedTool>();

  registerTool(tool: CapturedTool, options?: { signal?: AbortSignal }) {
    if (this.tools.has(tool.name)) {
      return Promise.reject(new Error(`tool ${tool.name} already registered`));
    }
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => this.tools.delete(tool.name));
    this.dispatchEvent(new Event('toolchange'));
    return Promise.resolve();
  }

  /** Test helper: call a tool the way an agent would and return the parsed JSON/text. */
  async call(name: string, args: Record<string, unknown> = {}) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`no such tool: ${name}`);
    const res = await tool.execute(args);
    const text = res.content.map((c) => c.text ?? '').join('');
    try {
      return { ok: !res.isError, value: JSON.parse(text) as unknown, text };
    } catch {
      return { ok: !res.isError, value: text as unknown, text };
    }
  }
}

beforeEach(() => {
  Object.defineProperty(document, 'modelContext', {
    value: new FakeModelContext(),
    configurable: true,
    writable: true,
  });
});

export const host = () => document.modelContext as unknown as FakeModelContext;
