# Extraction Quality Spike

This is a **pre-product validation** script. Run it before writing any product code.

## Purpose

Validate that Claude can reliably extract structured Claim / Frame / Question objects from real articles. The results determine which schema fields to keep in v0.1.

## Usage

```bash
# Install dependency (pi-ai — same LLM library lens will use in production)
bun add @mariozechner/pi-ai

# Run with built-in sample articles
ANTHROPIC_API_KEY=sk-ant-... bun run spike/extraction-spike.ts

# Run with a custom file
ANTHROPIC_API_KEY=sk-ant-... bun run spike/extraction-spike.ts --file path/to/article.md
```

> **Note**: This spike uses [pi-ai](https://github.com/badlogic/pi-mono) instead of `@anthropic-ai/sdk` directly. pi-ai is the LLM library chosen for lens (see `docs/architecture.md` §1.9). Running the spike also validates that pi-ai works for our use case. If pi-ai's API doesn't match the code, the script will print a fallback note.

## What it tests

| Field Group | Pass Threshold | If Fails |
|---|---|---|
| Toulmin core (statement/evidence/qualifier) | >= 80% completeness | Product viability at risk |
| Toulmin extended (warrant/rebuttals) | >= 50% completeness | Make optional in v0.1 |
| Miller structure_type (9 types) | >= 70% consistency | Defer to v0.2 |
| Reif elaboration (5 dimensions) | >= 60% consistency | Defer to v0.2 |

## Output

- Console: quality metrics and schema recommendations
- `spike/results/<timestamp>.json`: full extraction data for manual review

## After running

Update `docs/schema.md` section 8.2 with the actual results, and adjust the v0.1 type definitions accordingly.
