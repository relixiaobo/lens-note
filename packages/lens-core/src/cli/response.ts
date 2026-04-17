/**
 * Shared JSON response helpers.
 *
 * All --json output uses a stable envelope:
 *   Success:     {"ok": true, "schema_version": 1, "data": {...}}
 *   Error:       {"ok": false, "schema_version": 1, "error": {"code": "...", "message": "..."}, "hint": "..."}
 *   Deprecation: {"ok": false, "schema_version": 1, "error": {"code": "deprecated_command", ...}, "replacement": "..."}
 *
 * `schema_version` is the envelope version, not the payload version. Bump only
 * when the envelope itself changes shape (not when `data` fields change).
 */

import { appendFileSync } from "fs";
import { paths } from "../core/paths";

export const SCHEMA_VERSION = 1;

/**
 * Append a diagnostic entry to ~/.lens/diagnostics.jsonl.
 * Best-effort — never throws, never blocks the main response.
 */
function logDiagnostic(entry: { code: string; message: string; command?: string; timestamp: string }): void {
  try {
    appendFileSync(paths.diagnostics, JSON.stringify(entry) + "\n");
  } catch {
    // Best-effort: if LENS_HOME doesn't exist or isn't writable, skip silently
  }
}

/**
 * Error subclass that carries a machine-readable code and an actionable hint.
 *
 * Thrown errors bubble up to main.ts / dispatchRequest and the top-level
 * handler renders them into a `{ok: false, error, hint}` envelope. Use a plain
 * `Error` when no specific guidance applies; use `LensError` whenever the
 * caller can usefully act on the hint.
 */
export class LensError extends Error {
  code: string;
  hint?: string;

  constructor(message: string, opts?: { code?: string; hint?: string }) {
    super(message);
    this.name = "LensError";
    this.code = opts?.code || "command_error";
    this.hint = opts?.hint;
  }
}

export function respondSuccess(data: any): void {
  console.log(JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data }, null, 2));
}

export function respondError(code: string, message: string, hint?: string, extra?: Record<string, any>): void {
  const output: Record<string, any> = {
    ok: false,
    schema_version: SCHEMA_VERSION,
    error: { code, message },
  };
  if (hint) output.hint = hint;
  if (extra) Object.assign(output, extra);
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = 1;
  logDiagnostic({ code, message, timestamp: new Date().toISOString() });
}

export function respondDeprecation(command: string, replacement: string, hint: string): void {
  console.log(JSON.stringify({
    ok: false,
    schema_version: SCHEMA_VERSION,
    error: { code: "deprecated_command", message: `${command} has been replaced by ${replacement}` },
    hint,
    replacement,
  }));
  process.exitCode = 1;
}

/**
 * Build a stand-alone error envelope object. Use when the caller emits its own
 * JSON (e.g., `main.ts` top-level error handling that needs to preserve the
 * `command` field). Prefer `respondError` whenever possible.
 */
export function errorEnvelope(code: string, message: string, extra?: Record<string, any>): Record<string, any> {
  return {
    ok: false,
    schema_version: SCHEMA_VERSION,
    error: { code, message },
    ...(extra || {}),
  };
}

/**
 * Translate a caught error (anywhere in the CLI) into an envelope object.
 * Preserves LensError's code + hint; falls back to `command_error` for bare
 * Errors. Extra fields (like `command`) merge on top.
 */
export function errorEnvelopeFromThrown(err: unknown, extra?: Record<string, any>): Record<string, any> {
  if (err instanceof LensError) {
    logDiagnostic({ code: err.code, message: err.message, command: extra?.command, timestamp: new Date().toISOString() });
    return errorEnvelope(err.code, err.message, {
      ...(err.hint ? { hint: err.hint } : {}),
      ...(extra || {}),
    });
  }
  const message = err instanceof Error ? err.message : String(err);
  logDiagnostic({ code: "command_error", message, command: extra?.command, timestamp: new Date().toISOString() });
  return errorEnvelope("command_error", message, extra);
}
