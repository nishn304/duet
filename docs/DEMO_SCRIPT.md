# Duet — demo video script (target 2:40, hard cap 3:00)

Public YouTube, clear audio. Record in **ChatGPT's in-app browser** (has WebMCP +
an agent), or Chrome 146+ with `chrome://flags/#enable-webmcp-testing` and a
WebMCP-capable agent extension. 1512-wide window looks best.

**Before recording**
- Open https://nishn304.github.io/duet/ — confirm the top-right pill says
  **"agent connected"** (not "agent not detected"). If it doesn't, the browser
  has no WebMCP host — fix that first, nothing else matters.
- Load the **"Web app (needs hardening)"** template from the left rail.
- Dismiss the "no agent host" banner if present.
- Have the agent panel open beside the page.

---

### 0:00–0:20 — The problem (talking head or voiceover over the canvas)

> "Designing a system with an AI assistant means pasting a diagram into a chat
> box and getting back a wall of text you then redraw yourself. The agent can't
> see your canvas. This is Duet — a WebMCP app where you and your agent design
> infrastructure on the *same* board."

Show: the canvas with Web client → API → Postgres, the Inspector flagging
**2 single points of failure**.

### 0:20–0:40 — Human moves first

- Drag the nodes around, click the **API** node, bump **Replicas** to 2 in the
  Inspector, toggle a property. Show the finding update live.

> "I work it directly — typed components, not shapes. Duet is analysing as I go:
> cost, single points of failure, a security lint."

### 0:40–1:30 — The agent works the same board

Type to the agent:

> "Look at the design in Duet and make it production-ready on AWS. Keep it
> reasonably cheap."

Narrate what shows on screen as the tools fire:

> "It's calling `get_design` to read the graph, `analyze_design` to get the
> findings — and now `propose_changes`. Notice it didn't touch my canvas."

Show the **Approval Lane**: the proposal card with the itemised diff and the
deltas — `$/mo 75 → 261`, `SPOF 2 → 0`, `sec 1 → 0`.

> "Every agent change lands here as a reviewable diff, with the cost and
> reliability impact. I'm the one who commits it."

### 1:30–2:00 — Review, adjust, approve

- Untick one line (e.g. the read replica) to show partial approval.
- Click **Approve** (the button label reflects the count).
- The canvas re-lays itself out into a clean left-to-right diagram; SPOFs go to 0,
  health to ~100.

> "I dropped one change I didn't want and approved the rest. The diagram
> reorganises itself."

### 2:00–2:25 — One more turn + export

- To the agent: **"Now make it multi-region."** — show a second proposal arrive.
- Approve it (or dismiss, to keep it short).
- Click **Export config** → show the generated `docker-compose.yml`, switch to the
  **Terraform** tab.

> "When it's right, Duet compiles the graph to a starting-point compose file or
> Terraform sketch."

### 2:25–2:40 — Close

> "Twelve WebMCP tools, all operating on the typed model instead of the DOM.
> Mutations are proposals, not silent edits. The app ships no LLM — your agent is
> the intelligence, Duet is the hands. That's the agent-native web: built for
> people *and* their agents, on one surface."

Show: the repo page (MIT license visible) and the live URL on screen.

---

**Cutaways to keep handy:** the `list_component_types` call, the Auto-apply toggle
(mention: "or hand it the wheel entirely"), the Activity feed showing the
you/agent interleave.
