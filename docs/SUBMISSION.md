# Duet — WebMCP Challenge submission

Live: https://nishn304.github.io/duet/ · Code: https://github.com/nishn304/duet ·
Demo video: _(add link)_

Open the live URL in ChatGPT's in-app browser, or Chrome 146+ with
`chrome://flags/#enable-webmcp-testing`. Without a WebMCP host it still runs as a
normal design tool; the top-right pill shows whether an agent is connected.

---

## Inspiration / the one-liner

**You can't hand an agent a whiteboard. WebMCP lets you hand it a modeling tool.**

Designing a system with an AI assistant today means copy-pasting a diagram
description into a chat window, getting back a wall of text, and re-drawing it
yourself. The agent can't see your canvas, and if you point it at the DOM it can
only shove pixels around. Duet closes that gap: you and your agent work the same
architecture on the same screen, through the same typed operations.

## What it is

Duet is an agent-native cloud-architecture canvas. You sketch a system as a typed
graph — services, queues, datastores, caches, load balancers, CDNs, workers,
object stores, external dependencies, clients. Duet continuously analyses it
(rough monthly cost, single points of failure, a security lint) and can compile
it to a starting-point `docker-compose.yml` or Terraform sketch.

Your browser agent gets 12 WebMCP tools over that same model. It reads the
design, runs the analysis, and **proposes** concrete changes — which land in an
**Approval Lane** as an itemised diff with a cost and reliability delta, for you
to accept or reject one line at a time.

## Why this use case is a strong fit for WebMCP

An architecture diagram is a **model, not a picture**. "Add a read replica and
take the API off the public internet" is a precise graph edit with a right answer.
An agent driving the DOM can't make that edit meaningfully — it has no concept of
"replica" or "public", only boxes and pixels. WebMCP lets Duet expose the exact
typed operations its own UI uses:

- **`get_design`** returns the whole graph as JSON. **`propose_changes`** takes an
  ordered list of typed ops (`add_node`, `connect`, `update_node`,
  `disconnect`, `remove_node`). No selectors, no screenshots, no guessing.
- **`analyze_design`** hands back the single points of failure and security
  findings, each with the reason it fired *and the concrete fix that clears it* —
  so the agent acts on Duet's analysis instead of re-deriving it.
- The tools are only useful **in a shared tab**. `focus_component` recenters
  *your* view on the node the agent is talking about. You drag a box and the agent
  sees it on its next `get_design`. That co-presence is what WebMCP unlocks that a
  server-side MCP or a separate chat window can't.

## How it creates a better user experience

- **The app is built for two kinds of operator.** You get direct manipulation and
  the final say. The agent gets high-leverage, read-mostly tools plus a **review
  gate**: anything that would change the shared design becomes a pending proposal
  with a visible `$/mo` and `SPOF` delta — never a silent mutation you have to
  notice after the fact. Flip *Auto-apply* and the gate is removed for a full
  autopilot session; every change is still one undo away.
- **The agent's tool list tracks the app's state.** `get_pending_proposals` is
  only registered while the review queue is non-empty, so the agent always knows
  whether there's something waiting on you.
- **Duet ships no LLM.** The intelligence is *your* agent; Duet is the hands. So
  it deploys as a static page and there are no API keys to manage.

## What people and agents can do together here that was hard before

- **"Make this production-ready on AWS."** The agent reads the board, runs the
  analysis, and returns one proposal: add a CDN and a load balancer, raise the API
  to 3 replicas, enable multi-AZ + a read replica on the database, drop the public
  path to the API. You see `SPOF 2 → 0`, `$/mo 75 → 261`, untick the one change
  you disagree with, approve the rest. The diagram re-lays itself out. Fifteen
  seconds, versus a whiteboard session and a hand-translation to config.
- **"What's the risk in what I've selected?"** `get_selection` + `analyze_design`;
  the agent explains the single point of failure you're looking at and proposes
  the specific fix — on the same canvas, not in a chat transcript you then have to
  apply by hand.
- **Iterate out loud.** "Cheaper." "Now make it multi-region." Each turn is a
  reviewable diff on a live diagram, not a new wall of text.

## How WebMCP is implemented

All 12 tools are registered in
[`src/webmcp/Tools.tsx`](../src/webmcp/Tools.tsx) via
[`use-webmcp-tool`](https://www.npmjs.com/package/use-webmcp-tool) — Chrome's
official React hook, which wraps `document.modelContext.registerTool` and ties
each tool's lifecycle to a component (registered on mount, unregistered via
`AbortSignal` on unmount). Input schemas are in
[`src/webmcp/schemas.ts`](../src/webmcp/schemas.ts).

| Tool | Kind | Purpose |
| --- | --- | --- |
| `get_design` | read | Whole graph as JSON |
| `list_component_types` | read | Component vocabulary + default props (grounds the agent's choices) |
| `analyze_design` | read | Cost, single points of failure, security findings — each with reason + fix |
| `get_selection` | read | What the human has selected, plus findings on it |
| `export_config` | read | Compile to docker-compose / Terraform sketch |
| `focus_component` | view | Recenter the shared view on a node (does not change the design) |
| `propose_changes` | proposal | Ordered typed ops → Approval Lane; returns the cost/reliability delta |
| `add_component` / `connect_components` / `update_component` / `remove_component` | proposal | Ergonomic wrappers over `propose_changes` |
| `get_pending_proposals` | read, **dynamic** | The review queue — only registered while non-empty |

Read tools carry `annotations: { readOnlyHint: true }`. Nothing an agent calls
mutates the design directly. `src/webmcp/compat.ts` bridges
`navigator.modelContext` ↔ `document.modelContext` so Duet works whichever surface
a given browser exposes.

The UI and the WebMCP tools call the **same** Zustand store actions
([`src/model/store.ts`](../src/model/store.ts)) — there is no separate "agent
path". Agent-originated mutations are the one exception: they go through
`submitProposal` and wait in the Approval Lane.

## Honest scope

- The analysis is **bounded heuristics**, not a simulator. SPOF detection is graph
  reachability ("does removing this node cut every client off from storage, and is
  the node not itself redundant?"). Cost is a coarse static price table. The
  security lint is a handful of structural rules. Every finding shows its
  reasoning on screen.
- The exported config is a **faithful structural translation** — a starting point
  a human finishes, not `apply`-ready output. Both generators say so in their
  header.

## Built with

React 19 · TypeScript · Vite · React Flow (`@xyflow/react`) · Zustand · Tailwind
CSS · `use-webmcp-tool` · deployed on GitHub Pages via GitHub Actions.
