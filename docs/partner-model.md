# The Partner Model

Date: 2026-04-17
Status: Active — guides product direction

---

## Thesis

**lens's north star is not "a knowledge base." It is an externalized thinking partner crystallized from the user's own past thinking.**

Luhmann's Zettelkasten is the prototype. But most of what he designed — numbered branching IDs, manual indexes, physical insertion — was his *workaround for pen-and-paper constraints*, not the point of the method. The point of the method was the partner itself.

We inherit the goal. We drop the workarounds that the medium no longer requires.

---

## What Luhmann Actually Wanted

From *Communicating with Slip Boxes* (1981), in his own words: the Zettelkasten is a **communication partner**. He spent 30 years crystallizing his own thinking into an external other — an other that speaks his own voice but whose specific words he no longer remembers. Re-reading a 1975 card is the **young self putting a question to the current self**.

That is the depth of what he was building. Cards, IDs, and chains are the implementation; self-dialogue over time is the purpose.

---

## Three Constraints Luhmann Could Not Escape

Paper imposed three silences. Most of his method is design against them.

1. **The partner was mute.** Cards never spoke on their own. He had to pull them. Forgotten cards effectively did not exist. His indexes and structure notes were workarounds for the silence — manual pointers into the muteness.

2. **No temporal awareness.** All 90k cards were "present" to the box. The box couldn't say "this is new," "this is cold," "you thought about this 3 years ago." He had to track the time dimension himself, in his head.

3. **No provocation.** When he wrote a new card that contradicted a 1972 card, the system didn't notice. He had to stumble on the contradiction. Most contradictions, he never stumbled on.

Everything we now call "Luhmann's method" — including the branching IDs, the structure notes, the walking-the-chain practice — is his compensation for these three silences. Take the silences away, and most of the method collapses into simpler primitives.

---

## What AI and Computation Change

All three silences dissolve, if we design for it:

- The partner can **speak on its own** when something worth saying arises (not every hour; not when queried — when warranted).
- The partner can **know time**: what's new, what's cold, what cluster the user has been circling, what was abandoned.
- The partner can **provoke**: surface contradictions, synthesis gaps, cold regions, and adversarial readings automatically — not on demand.

Writing, judgment, and placement remain the user's. AI does not generate notes; AI generates *questions that only new notes can answer*.

---

## Three Design Principles

### 1. Partner, not library

The system initiates. A library is queried; a partner speaks when it has something to say and stays silent when it doesn't. Every feature is evaluated against: does this make lens more of a partner, or more of a shelf?

### 2. Questions, not answers

Every AI-generated output is a provocation the user answers by writing a new note. "You wrote A in January and B in March. Does A still stand?" beats "Here is a summary of your notes about A" by orders of magnitude. The system never commits an answer. It produces high-quality questions, forever.

### 3. Time is a first-class axis

The partner's value compounds with time. Today-you, last-month-you, and three-year-ago-you are distinct voices the system orchestrates into dialogue. Any feature that flattens time (e.g., force-directed graphs showing all cards at once) fights the partner model.

---

## Mapping to Current Lens

Lens today has **storage, linking, retrieval**. These are library capabilities. Necessary but insufficient for partnership.

Missing:

- **Voice** — lens speaks only when spoken to. Briefing (proactive voice) does not yet exist. Cold-region detection, "what you're circling" detection, contradiction injection — none exist.
- **Slow reading surface** — no Walking Reader. A force-directed graph is not a reading surface; it is a totality surface, which Luhmann never wanted.
- **Provocation density** — `collide` and `tensions` exist but fire only on user demand. They are not arriving uninvited when something is worth saying.
- **Temporal structure** — we track `created_at` and `updated_at`, but the system never narrates time. "Three months ago you cared about X; what happened?" is not a query lens can answer.

---

## Priority Direction

Given the partner model, priorities reorder:

1. **Install the voice** — Morning Briefing: proactive daily/weekly output that reports contradictions, cold regions, synthesis candidates, and abandoned branches. Bundles existing `review` / `collide` / `tensions` primitives; adds temporal signals (`list notes --cold`, `list clusters --unsynthesized`).

2. **Build the reading surface** — Walking Reader: a view that presents one card at a time with its continues / refines chain, a few related branches, and AI-surfaced tensions in the margin. Replaces the force-directed graph as the primary reading experience.

3. **Make provocations arrive uninvited** — when writing a new note, if it creates a potential contradiction with an existing card, the write response surfaces it. When a cluster grows to N cards without a synthesis note, the next capture in that cluster notes the gap.

4. **Polish the library layer** — the force-directed graph, Heptabase-style boards, ego views, editing in-place, visual badges. All of these improve lens as a library. They are useful but not load-bearing for partnership.

The first three are the frontier. The fourth is maintenance.

---

## What This Rules Out

Decisions the partner model makes for us:

- **No feature that generates note content for the user.** AI generates questions; users generate answers. A "summarize my notes about X" command is explicitly rejected. It dulls the partner into a mirror.
- **No primary interface that shows the whole graph at once.** Force-directed overview can exist as one of several views, but it cannot be the default landing experience — it fights Principle 3 (time) and Principle 1 (partner).
- **No interaction that removes user placement.** Auto-linking from the skill is explicitly rejected (see SKILL.md Capture flow). Placement is where the thinking happens.

---

## Relation to Other Docs

- `product-vision.md` — lens as infrastructure (storage, linking, retrieval). Still holds. The partner model sits **on top** of the infrastructure: infrastructure is what lens *is*; partnership is what lens *does* once an agent (and a user) engage with it.
- `tool-redesign-v2.md` — command-level design. Most commands (`search`, `write`, `link`) are library primitives. The partner emerges from how a skill/agent composes them.
- `roadmap.md` — concrete build order. Should be re-sequenced to reflect the partner-first priority (briefing before view polish, walking reader before boards).
