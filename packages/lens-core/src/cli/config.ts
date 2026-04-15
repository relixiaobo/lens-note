/**
 * lens config — Read and write user configuration.
 *
 * Config is stored in ~/.lens/config.yaml. The `context` section
 * provides personalization info that agents read via `lens status --json`.
 *
 * Usage:
 *   lens config list                   # Show all config
 *   lens config get context.role       # Get a specific field
 *   lens config set context.role "PM"  # Set a field
 *
 * --stdin:
 *   {"command":"config","input":{"action":"get","key":"context.role"}}
 *   {"command":"config","input":{"action":"set","key":"context.role","value":"PM"}}
 *   {"command":"config","input":{"action":"list"}}
 */

import { readFileSync, writeFileSync } from "fs";
import yaml from "js-yaml";
import { paths } from "../core/paths";
import { ensureInitialized } from "../core/storage";
import type { CommandOptions } from "./commands";
import { respondSuccess } from "./response";

export interface LensConfig {
  context?: {
    role?: string;
    audience?: string;
    language?: string;
    style?: string;
  };
}

export function readConfig(): LensConfig {
  try {
    const raw = readFileSync(paths.config, "utf-8");
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LensConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: LensConfig): void {
  const content = yaml.dump(config, { lineWidth: -1, noRefs: true });
  writeFileSync(paths.config, content, "utf-8");
}

function getNestedValue(obj: any, key: string): unknown {
  const parts = key.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj: any, key: string, value: string): void {
  const parts = key.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] == null || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

export async function handleConfig(args: string[], opts: CommandOptions) {
  ensureInitialized();

  const action = args[0];

  if (!action || action === "list") {
    const config = readConfig();
    if (opts.json) {
      respondSuccess(config);
    } else {
      const content = yaml.dump(config, { lineWidth: -1, noRefs: true });
      console.log(content.trim() || "(empty config)");
    }
    return;
  }

  if (action === "get") {
    const key = args[1];
    if (!key) throw new Error('Usage: lens config get <key>  (e.g., "context.role")');
    const config = readConfig();
    const value = getNestedValue(config, key);
    if (opts.json) {
      const result: Record<string, any> = { key, value: value ?? null };
      if (value === undefined) {
        result.available_keys = ["context.role", "context.audience", "context.language", "context.style"];
      }
      respondSuccess(result);
    } else {
      console.log(value !== undefined ? String(value) : "(not set)");
    }
    return;
  }

  if (action === "set") {
    const key = args[1];
    const value = args.slice(2).join(" ");
    if (!key || !value) throw new Error('Usage: lens config set <key> <value>  (e.g., lens config set context.role "PM")');
    const config = readConfig();
    setNestedValue(config, key, value);
    writeConfig(config);
    if (opts.json) {
      respondSuccess({ key, value, action: "set" });
    } else {
      console.log(`${key} = ${value}`);
    }
    return;
  }

  throw new Error(`Unknown config action: "${action}". Use: list, get, set`);
}

/** Handle --stdin config dispatch */
export async function handleConfigInput(input: any, opts: CommandOptions) {
  if (!input || typeof input !== "object") throw new Error("config: input object required");
  const { action, key, value } = input;

  if (action === "list" || !action) {
    return handleConfig(["list"], opts);
  }
  if (action === "get") {
    if (!key) throw new Error('config get: "key" is required');
    return handleConfig(["get", key], opts);
  }
  if (action === "set") {
    if (!key || value === undefined) throw new Error('config set: "key" and "value" are required');
    return handleConfig(["set", key, String(value)], opts);
  }
  throw new Error(`Unknown config action: "${action}"`);
}
