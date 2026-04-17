# Chain in lens — Considered and Rejected

Date: 2026-04-17
Status: Active — do not reintroduce without reading this first

---

## TL;DR

We considered making **chain** (Luhmann's Folgezettel — "what note came next in my thinking") a first-class structure in lens. After four rounds of design iteration, **we decided against it**. Chain is a paper-era workaround that dissolves in a modern digital system with timestamps, topic filters, and semantic links. Persisting it as an explicit structure adds friction in the wrong place.

This doc records why, so future agents (human or otherwise) do not re-propose it without reading this first.

---

## What chain would have been

Each note would carry a `prev: note_id | null` field indicating the note that sparked its creation. This forms a tree (at most one parent per note). In parallel, `links[]` would continue to hold semantic relations (supports / refines / contradicts / related / indexes).

Example:

```yaml
id: note_C
title: "..."
prev: note_B            # C was written because B got me thinking
links:
  - {to: note_A, rel: supports, reason: "..."}
```

This was proposed as the clean separation of:
- **Chain** — author's thinking trajectory (tree, subjective, temporal)
- **Links** — semantic relations between propositions (graph, objective, timeless)

---

## Why we rejected it

The entire value chain ought to survive without explicit chain storage:

| What chain claims to do | How it's reconstructible from existing data |
|---|---|
| "Walk my thinking about X" | `search X` + order by `created_at` |
| "Chain is cold" | Topic cluster with no recent activity (doesn't require chain structure) |
| "Walking Reader" UI | Filter by topic, order by time; or user-curated reading list |
| "What came before B in my thinking?" | B's `created_at` + topic + existing links |

The **one** thing chain uniquely captures is **explicit authoring intent** — "I wrote B because A was in my head at that moment." That intent is:

1. **Fragile**. The author forgets which specific note sparked them; multiple notes usually contributed.
2. **Low-value in query**. Users rarely need to know "which specific prior card sparked this one" — they need "what was I thinking about this topic."
3. **Placed friction incorrectly**. Requiring authors to tag chain parents at write time adds cognitive load at the moment of creation (should be about capturing the thought). Better: the system **infers** trajectory from signals (time, topic, link reason) rather than demanding manual tagging.

Luhmann had chain because **paper gave him no alternative**. He had no full-text search, no topic filter, no `created_at` sort. Chains (encoded via numeric IDs like `21/3d1`) were the only mechanism available. His chain discipline was a **workaround**, not the core of the method.

The core of the method was: atomic notes, structural links between them, letting patterns emerge without forced categories. All of this lens already does without needing chain.

---

## What we did instead

- **SKILL.md** (v0.22.0): removed the "Folgezettel check" as a separate step in the rel decision tree. The tree is back to 5 structural options. A brief note points to this doc for rationale.
- **`continues` rel**: remains in the schema for backward compatibility. **Do not use in new writes.** It will be formally deprecated (and eventually removed) if not regrown through organic need.
- **Data cleanup**: the two `continues` edges created on 2026-04-17 during the experiment were reverted (one to pure `supports`, one to `related`).

---

## When to reconsider

Reintroduce chain only if:

1. **Real usage evidence** shows users need to express "this note came from that specific note" and time+topic reconstruction repeatedly fails. Not speculative — actual friction from actual use.
2. **Briefing / Walking Reader / etc. explicitly hit a wall** that time+topic+links cannot clear. If they can be built and operate well without chain (which we believe they can), chain stays out.
3. **Schema cost is budgeted**. Adding `note.prev` is a migration. Don't add it because "it feels Luhmann-ish." Add it because a specific feature cannot ship without it.

The default stance: **if a problem can be solved by existing primitives (time + topic + links), prefer that over adding a new structure.**

---

## Meta-lesson

The discussion that led here went through four rounds:

1. Propose: chain as a rel type (what v0.21 shipped briefly)
2. Refine: chain as an orthogonal check (still a rel, but separately evaluated)
3. Redesign: chain as a `note.prev` schema field (clean separation)
4. Question: **is chain necessary at all?**

Each of the first three rounds **added complexity**. The fourth round was the first to **subtract**. That was the right move.

This is a pattern: when a design keeps accumulating abstractions, the next courageous step is usually **to delete**, not to redesign. If we'd codified chain at any of the first three rounds, we'd now be carrying permanent complexity for what turned out to be zero lasting value.

See `docs/partner-model.md` for the broader product direction. This doc is a specific subtraction in service of that direction.
