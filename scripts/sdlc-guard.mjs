#!/usr/bin/env node
// sdlc-guard.mjs — PreToolUse hook guard for the Agentic SDLC plugin.
// Zero dependencies. Pure decision core (decide) + stdin/stdout CLI.
//
// Makes two design invariants deterministic instead of prompt-enforced:
//   4 — deploys stay human-gated: pushes that update a deploy branch (main,
//       master, or $SDLC_DEPLOY_BRANCHES), force/delete/tag/mirror pushes,
//       gh release, and npm publish get an "ask" — the human approving the
//       permission prompt IS the gate, so ask, never deny. Commits, local
//       tags, and pushes to feature branches pass through.
//   2 — sdlc-metadata.yml has exactly one writer (scripts/sdlc-state.mjs):
//       direct edits are denied with a pointer at the state script.
//
// Fails open by design: on anything not positively recognized as gated the guard
// stays silent (normal permission flow applies). It is defense-in-depth over the
// prompt contract, not a wall — shell parsing here is approximate on purpose.

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const STATE_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'sdlc-state.mjs')

const METADATA = /sdlc-metadata\.ya?ml/
// the plugin's own template file is not the state file
const isMeta = t => METADATA.test(t) && !t.includes('templates/')

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const DEFAULT_DEPLOY_BRANCHES = ['main', 'master']
// push flags that publish more than one feature branch or rewrite remote history
const PUSH_GATED_FLAGS = new Set([
  '-f', '--force', '--force-with-lease', '--force-if-includes', '-d', '--delete',
  '--tags', '--follow-tags', '--mirror', '--all', '--prune',
])
// push flags that consume the following token as their argument
const PUSH_ARG_FLAGS = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec'])
const GH_RELEASE_READONLY = new Set(['list', 'view', 'download'])
const NPM_LIKE = new Set(['npm', 'pnpm', 'yarn'])
const WRAPPERS = new Set(['env', 'command', 'sudo', 'nohup', 'time'])

function askReason(matched) {
  return `Human gate (Agentic SDLC invariant 4): "${matched}" deploys, publishes, or rewrites ` +
    'shared history. The human approving this prompt is the gate.'
}

export function deployBranches(env = process.env) {
  const raw = env.SDLC_DEPLOY_BRANCHES
  if (!raw) return new Set(DEFAULT_DEPLOY_BRANCHES)
  return new Set(raw.split(',').map(b => b.trim()).filter(Boolean))
}

function gitCurrentBranch(cwd) {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8', timeout: 3000 })
  if (r.status !== 0) return null
  const branch = r.stdout.trim()
  return branch && branch !== 'HEAD' ? branch : null
}

// Why a push needs the human gate, or null when it only updates non-deploy branches.
// Unknown current branch on a refspec-less push → gated (the push is the thing we guard).
function pushGate(rest, { cwd, currentBranch, deploy }) {
  const positional = []
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i]
    if (PUSH_ARG_FLAGS.has(t)) { i++; continue }
    if (t.startsWith('-')) {
      const flag = t.split('=')[0]
      if (PUSH_GATED_FLAGS.has(flag)) return `git push ${flag}`
      continue
    }
    positional.push(t.replace(/^["']|["']$/g, ''))
  }
  const refspecs = positional.slice(1)
  const current = () => currentBranch(cwd)
  if (refspecs.length === 0) {
    const branch = current()
    if (!branch) return 'git push (current branch unknown)'
    return deploy.has(branch) ? `git push (on ${branch})` : null
  }
  for (const spec of refspecs) {
    if (spec.startsWith('+') || spec.startsWith(':')) return `git push ${spec}`  // force / delete
    let dst = spec.includes(':') ? spec.slice(spec.indexOf(':') + 1) : spec
    if (dst === '') return `git push ${spec}`
    if (dst.startsWith('refs/tags/')) return `git push ${spec}`
    dst = dst.replace(/^refs\/heads\//, '')
    if (dst === 'HEAD' || dst === '@') {
      const branch = current()
      if (!branch) return `git push ${spec} (current branch unknown)`
      dst = branch
    }
    if (deploy.has(dst)) return `git push ${spec}`
  }
  return null
}

function denyReason(what) {
  return `${what} blocked (Agentic SDLC invariant 2): sdlc-metadata.yml has exactly one ` +
    `writer. Use the state script instead: node ${STATE_SCRIPT} ` +
    '<init|complete|config|brief|counts|plan-add|cycle|gate-log|plan-active|clarifier-round|loop-reset|reopen>.'
}

// Split into simple-command segments across chains, pipes, and substitutions,
// then tokenize past env assignments and transparent wrappers.
function segments(command) {
  return command.split(/\|\||&&|;|\||\n|\$\(|`|\(|\)/).map(s => s.trim()).filter(Boolean)
}

function tokens(segment) {
  const toks = segment.split(/\s+/)
  let i = 0
  while (i < toks.length &&
    (/^[A-Za-z_][A-Za-z0-9_]*=/.test(toks[i]) || WRAPPERS.has(toks[i]))) i++
  return toks.slice(i)
}

// First non-flag token after argv[0]; skips the argument of git's -C / -c.
function subcommand(toks) {
  let dir = null
  for (let j = 1; j < toks.length; j++) {
    const t = toks[j]
    if (t === '-C') { dir = toks[j + 1] ?? null; j++; continue }
    if (t === '-c') { j++; continue }
    if (t.startsWith('-')) continue
    return { sub: t, rest: toks.slice(j + 1), dir }
  }
  return { sub: null, rest: [], dir }
}

function checkBashPublish(command, ctx) {
  for (const seg of segments(command)) {
    const toks = tokens(seg)
    const cmd = toks[0]
    if (!cmd) continue
    const { sub, rest, dir } = subcommand(toks)
    if (cmd === 'git' && sub === 'push') {
      if (rest.includes('--dry-run') || rest.includes('-n')) continue
      const cwd = dir ? join(ctx.cwd ?? process.cwd(), dir) : ctx.cwd
      const gated = pushGate(rest, { ...ctx, cwd })
      if (gated) return { decision: 'ask', reason: askReason(gated) }
      continue
    }
    if (cmd === 'gh' && sub === 'release') {
      const ghSub = rest.find(t => !t.startsWith('-'))
      if (!ghSub || GH_RELEASE_READONLY.has(ghSub)) continue
      return { decision: 'ask', reason: askReason(`gh release ${ghSub}`) }
    }
    if (NPM_LIKE.has(cmd) && sub === 'publish') {
      if (rest.includes('--dry-run')) continue
      return { decision: 'ask', reason: askReason(`${cmd} publish`) }
    }
  }
  return null
}

function checkBashMetadataWrite(command) {
  if (!METADATA.test(command)) return null
  const redirect = command.match(/>{1,2}\s*["']?(\S*sdlc-metadata\.ya?ml)/)
  if (redirect && isMeta(redirect[1])) {
    return { decision: 'deny', reason: denyReason('Shell redirect into sdlc-metadata.yml') }
  }
  for (const seg of segments(command)) {
    const toks = tokens(seg)
    const cmd = toks[0]
    if (!cmd) continue
    const args = toks.slice(1)
    if (cmd === 'sed' && args.some(t => t.startsWith('-i')) && args.some(isMeta)) {
      return { decision: 'deny', reason: denyReason('In-place sed of sdlc-metadata.yml') }
    }
    if (cmd === 'tee' && args.some(isMeta)) {
      return { decision: 'deny', reason: denyReason('tee into sdlc-metadata.yml') }
    }
    if ((cmd === 'cp' || cmd === 'mv') && args.length > 0 && isMeta(args[args.length - 1])) {
      return { decision: 'deny', reason: denyReason(`${cmd} onto sdlc-metadata.yml`) }
    }
  }
  return null
}

function checkFileEdit(toolName, toolInput) {
  const path = toolInput.file_path ?? toolInput.notebook_path
  if (typeof path !== 'string' || !isMeta(path)) return null
  return { decision: 'deny', reason: denyReason(`Direct ${toolName} of ${path}`) }
}

// decide(hookInput, opts?) → null (no opinion — fail open) | { decision: 'ask'|'deny', reason }
// opts.currentBranch(cwd) and opts.env are injectable for tests.
export function decide(input, opts = {}) {
  if (!input || typeof input !== 'object') return null
  const tool = input.tool_name
  const toolInput = input.tool_input
  if (!toolInput || typeof toolInput !== 'object') return null
  if (tool === 'Bash' && typeof toolInput.command === 'string') {
    const ctx = {
      cwd: typeof input.cwd === 'string' ? input.cwd : undefined,
      currentBranch: opts.currentBranch ?? gitCurrentBranch,
      deploy: deployBranches(opts.env),
    }
    return checkBashMetadataWrite(toolInput.command) ?? checkBashPublish(toolInput.command, ctx)
  }
  if (EDIT_TOOLS.has(tool)) return checkFileEdit(tool, toolInput)
  return null
}

async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  let input
  try { input = JSON.parse(raw) } catch { return }
  const d = decide(input)
  if (!d) return
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: d.decision,
      permissionDecisionReason: d.reason,
    },
  }) + '\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
