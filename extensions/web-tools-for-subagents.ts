/**
 * web-tools-for-subagents
 *
 * Teaches `pi-interactive-subagents` where `web_search` / `web_fetch` live when
 * those tools are installed as **pi packages** (`pi install npm:pi-web-access`,
 * `pi install npm:pi-web-fetch`) instead of the legacy
 * `<agent-dir>/extensions/web-search/index.ts` layout.
 *
 * Why this is needed: a subagent is launched with `--no-extensions` plus an
 * explicit `-e <path>` for every extension-backed tool in its `tools:`
 * frontmatter. The spawning extension resolves those paths from a fixed map
 * (see `getToolExtensionPath` in pi-interactive-subagents) that only knows the
 * legacy layout. With a package install the path does not exist, so the tool
 * name is allow-listed but no extension backs it — the child simply has no
 * `web_search` and no `web_fetch`, and agents like `researcher` silently lose
 * the ability to search or fetch.
 *
 * The same hook `visual-tools` uses fixes it: `registerToolExtension(name,
 * path)` on `globalThis.__pi_interactive_subagents`. Deferred to `session_start`
 * because pi loads project-local extensions before the global subagents
 * extension has set that global. Registration is idempotent for the same
 * name+path, so `/reload` is harmless.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import * as fs from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

interface InteractiveSubagentsApi {
  registerToolExtension: (name: string, extensionPath: string) => void
}

/** pi's config dir: `$PI_CODING_AGENT_DIR` or `~/.pi/agent` (same rule the subagents extension uses). */
function agentConfigDir(): string {
  return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent")
}

/**
 * Where a tool's extension file can live, in preference order:
 *   1. the legacy layout the subagents extension already knows
 *   2. the pi package layout (`pi install npm:...` -> <agent-dir>/npm/node_modules)
 */
function candidates(pkg: string, legacyName: string): string[] {
  const base = agentConfigDir()
  return [
    join(base, "extensions", legacyName, "index.ts"),
    join(base, "npm", "node_modules", pkg, "index.ts"),
  ]
}

function findExtension(pkg: string, legacyName: string): string | undefined {
  return candidates(pkg, legacyName).find((p) => fs.existsSync(p))
}

function registerToolExtensions(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (globalThis as any).__pi_interactive_subagents as InteractiveSubagentsApi | undefined
  if (!api?.registerToolExtension) return // subagents extension not loaded — nothing to do

  const webAccess = findExtension("pi-web-access", "web-search")
  const webFetch = findExtension("pi-web-fetch", "web-fetch")

  // Names come from the packages' own tool registrations; only names listed in
  // an agent's `tools:` frontmatter are ever turned into `-e` flags.
  const mapping: Array<[string, string | undefined]> = [
    ["web_search", webAccess],
    ["fetch_content", webAccess],
    ["source_check", webAccess],
    ["get_search_content", webAccess],
    ["web_fetch", webFetch],
  ]

  for (const [name, path] of mapping) {
    if (!path) continue
    try {
      api.registerToolExtension(name, path)
    } catch {
      // Already registered under a different path — leave the existing one alone.
    }
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async () => {
    registerToolExtensions()
  })
}
