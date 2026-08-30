# Duet

**Design cloud infrastructure with your agent, on the same canvas.**

Duet is an agent-native architecture design tool. You sketch a system as a typed
graph — services, queues, datastores, caches, load balancers — and your browser
agent works the same board through [WebMCP](https://github.com/webmachinelearning/webmcp)
tools: it reads the design, runs the analysis, and proposes concrete changes that
land in an **Approval Lane** for you to accept or reject, one item at a time. When
you're done, Duet compiles the graph to a starting-point `docker-compose.yml` or
Terraform sketch.

> **Live app:** https://nishn304.github.io/duet/
> Open it in ChatGPT's in-app browser, or Chrome 146+ with
> `chrome://flags/#enable-webmcp-testing` enabled, to give your agent the tools.
> Without a WebMCP host it still works as a normal design tool.

- **Demo video:** _(add link)_
- **License:** [MIT](./LICENSE)

---

## Why this is a strong fit for WebMCP

An architecture diagram is a *model*, not a picture. "Add a read replica and take
the API off the public internet" is a precise graph edit — but an agent driving
the DOM can only push pixels around and hope. WebMCP lets Duet hand the agent the
same typed operations the UI uses:

- **The tools operate on structure, not the screen.** `get_design` returns the
  graph as JSON; `propose_changes` takes an ordered list of typed ops
  (`add_node`, `connect`, `update_node`, …). No selectors, no screenshots, no
  guessing.
- **Human and agent share one live surface.** The agent calls `focus_component`
  and your view recenters on the node it's talking about. You drag a box and the
  agent sees it on the next `get_design`. Co-presence in one tab is the point —
  that's what WebMCP enables that a server-side MCP or a separate chat window
  doesn't.
- **The app is built for two kinds of operator.** You get direct manipulation and
  final say. The agent gets high-leverage, read-mostly tools and a **review gate**:
  anything that would change the shared design becomes a pending proposal with a
  cost and reliability diff, never a silent mutation. `get_pending_proposals` is
  only registered while something is actually pending, so the agent's tool list
  tracks the state of the review queue.

## What people and agents can do together here that was hard before

- **"Make this production-ready on AWS"** → the agent reads the board, runs the
  analysis, and returns one proposal: add a load balancer, raise replicas to 3,
  enable multi-AZ on the database, drop the public path to the API. You see
  `SPOF 2 → 0`, `$/mo 75 → 431`, tick the four boxes you want, approve. The
  diagram re-lays itself out. Seconds, not a whiteboard session.
- **"What happens if Postgres goes down?"** → `simulate_failure`; the canvas dims
  everything still healthy and lights up what goes dark, while the agent reports
  the blast radius in words. Then it proposes the fix.
- **"What's the risk in what I've selected?"** → `get_selection` +
  `analyze_design`; the agent explains the single point of failure you're looking
  at and proposes the specific fix.
- **Autopilot when you want it** — flip *Auto-apply* and the review gate is
  removed; agent proposals apply immediately and stay undoable.

## How WebMCP is implemented

Duet registers **13 tools** via Sarah Drasner's
[`use-webmcp-tool`](https://www.npmjs.com/package/use-webmcp-tool) hook, which
wraps `document.modelContext.registerTool` and ties each tool's lifecycle to a
React component (registered on mount, unregistered via `AbortSignal` on unmount).
All of them live in [`src/webmcp/Tools.tsx`](./src/webmcp/Tools.tsx); the input
schemas are in [`src/webmcp/schemas.ts`](./src/webmcp/schemas.ts).

| Tool | Kind | What it does |
| --- | --- | --- |
| `get_design` | read | The whole graph as JSON |
| `list_component_types` | read | Duet's component vocabulary + default props |
| `analyze_design` | read | Cost estimate, single points of failure, security findings — each with a reason and a fix |
| `get_selection` | read | What the human has selected, plus findings on it |
| `export_config` | read | Compile to `docker-compose.yml` or a Terraform sketch |
| `focus_component` | view | Recenter the shared view on a node |
| `simulate_failure` | view | Take a component down and report the blast radius — what goes unreachable, what degrades, which storage is cut off — and put the human's canvas into that mode |
| `propose_changes` | proposal | Ordered typed ops → Approval Lane, returns the cost/reliability delta |
| `add_component` / `connect_components` / `update_component` / `remove_component` | proposal | Ergonomic wrappers over `propose_changes` |
| `get_pending_proposals` | read (dynamic) | The review queue — only registered while non-empty |

Read tools carry `annotations: { readOnlyHint: true }`. Nothing an agent calls
mutates the design directly.

### The raw API

```js
// What the hook does under the hood (see the WebMCP spec / use-webmcp-tool):
const controller = new AbortController();

document.modelContext.registerTool(
  {
    name: 'propose_changes',
    description:
      'Propose a batch of changes to the design. Does NOT apply them — it puts ' +
      'an itemised, reviewable diff in the Approval Lane for the human.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        rationale: { type: 'string' },
        ops: { type: 'array', minItems: 1, items: opSchema },
      },
      required: ['title', 'ops'],
    },
    async execute({ title, rationale, ops }) {
      const proposalId = store.submitProposal({ title, rationale, ops });
      const diff = describeProposal({ title, ops }, store.design);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              proposalId,
              status: 'pending_review',
              costPerMonthUsd: { before: diff.costBefore, after: diff.costAfter },
              singlePointsOfFailure: { before: diff.spofBefore, after: diff.spofAfter },
            }),
          },
        ],
      };
    },
  },
  { signal: controller.signal },
);
```

### The same thing in Duet, with the hook

```tsx
useWebMCP<{ id: string }>({
  name: 'focus_component',
  description:
    'Select a component by id and center the human’s view on it. Moves the ' +
    'shared view only — does not change the design.',
  inputSchema: idSchema,
  async execute({ id }) {
    const s = useDuet.getState();
    const node = s.design.nodes.find((n) => n.id === id);
    if (!node) throw new Error(`No component with id "${id}"`);
    s.setSelection([id]);
    window.dispatchEvent(new CustomEvent('duet:focus', { detail: { id } }));
    return `Focused "${node.label}".`;
  },
});
```

## Architecture

Everything is client-side. **Duet ships no LLM** — the intelligence is your own
agent; Duet just gives it good hands.

```
src/
  model/          domain graph, analysis engine, proposal/patch system, IaC compiler
    types.ts        NodeKind, DuetNode, DuetEdge, Op, Proposal
    analysis.ts     cost rollup · SPOF (graph reachability) · security lint
    failure.ts      blast-radius simulation (what breaks if X is lost)
    patch.ts        applyOps() + describeProposal() (the reviewable diff)
    iac.ts          graph → docker-compose / Terraform sketch
    store.ts        Zustand store — the single source of truth for UI *and* tools
  webmcp/
    Tools.tsx       all 13 WebMCP tool registrations
    schemas.ts      JSON Schemas for tool inputs
    compat.ts       bridges navigator.modelContext <-> document.modelContext
  canvas/           React Flow canvas + typed node renderer + palette
  panels/           Inspector · Approval Lane · Activity feed · Export · Simulation bar
```

The UI and the WebMCP tools call the **same** store actions. Agent-originated
*mutations* are the one exception — they go through `submitProposal` and wait in
the Approval Lane.

### Scope, honestly

- The analysis is **bounded heuristics**, not a simulator. SPOF detection is
  graph reachability ("does removing this node cut every client off from
  storage?"); cost is a coarse static price table; the security lint is a handful
  of structural rules. Every finding shows its reasoning.
- The exported config is a **faithful structural translation** — a starting point
  a human finishes, not `terraform apply`-ready output. Both generators say so in
  their header.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

To exercise the agent path, open the dev URL in a WebMCP-capable browser (see the
top of this README). In dev, `window.__duet` exposes the store for manual testing.

```bash
npm run build    # typecheck + production build to dist/
npm test         # vitest — analysis engine, patch/proposal logic, and the full
                 # WebMCP tool surface against a fake modelContext host
```

`src/webmcp/tools.test.tsx` mounts `<Tools />` against a stand-in
`document.modelContext`, then calls each tool the way an agent would — so the
schemas, the `execute` bodies, the "proposals don't mutate" rule, and the dynamic
registration of `get_pending_proposals` are all covered without a real browser.

## Built with

React 19 · TypeScript · Vite · [@xyflow/react](https://reactflow.dev) (React Flow)
· Zustand · Tailwind CSS · [use-webmcp-tool](https://www.npmjs.com/package/use-webmcp-tool)
