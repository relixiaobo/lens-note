/**
 * Shared JSON response helpers.
 *
 * All --json output uses a stable envelope:
 *   Success:     {"ok": true, "data": {...}}
 *   Error:       {"ok": false, "error": {"code": "...", "message": "..."}, "hint": "..."}
 *   Deprecation: {"ok": false, "error": {"code": "deprecated_command", ...}, "replacement": "..."}
 */

export function respondSuccess(data: any): void {
  console.log(JSON.stringify({ ok: true, data }, null, 2));
}

export function respondError(code: string, message: string, hint?: string, extra?: Record<string, any>): void {
  const output: Record<string, any> = {
    ok: false,
    error: { code, message },
  };
  if (hint) output.hint = hint;
  if (extra) Object.assign(output, extra);
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = 1;
}

export function respondDeprecation(command: string, replacement: string, hint: string): void {
  console.log(JSON.stringify({
    ok: false,
    error: { code: "deprecated_command", message: `${command} has been replaced by ${replacement}` },
    hint,
    replacement,
  }));
  process.exitCode = 1;
}
