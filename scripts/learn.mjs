#!/usr/bin/env -S node --no-warnings
// learn.mjs — council meta-learning memory over node:sqlite (zero deps).
// Verbs: run-start | reflect | review | run-end | recall | backfill
// DB: $COUNCIL_DB or ~/council/data/council.sqlite (auto-created).

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

const USAGE = `usage: learn.mjs <verb> [args]
  run-start <run_id> --dir <run_dir> [--goals <n>]
  reflect   <run_id> --text "<text>" [--goal <Gn>] [--phase <frame|plan|execute|review|close|report>]
  review    <run_id> --file <markdown-path> --lesson "<one-liner>" [--lesson "..."]...
  run-end   <run_id> --status <done|partial|aborted> [--register <path-to-register.md>]
  recall    [--limit <n>] [--grep <word>]
  backfill  [--runs-dir <dir>]`;

function fail(msg, code) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}
function usageError(msg) {
  fail((msg ? msg + '\n' : '') + USAGE, 2);
}

function openDb() {
  const dbPath = process.env.COUNCIL_DB || path.join(os.homedir(), 'council/data/council.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  let db;
  try {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec('PRAGMA journal_mode = WAL');
    db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id         TEXT PRIMARY KEY,
      run_dir    TEXT NOT NULL,
      started_at TEXT,
      ended_at   TEXT,
      status     TEXT,
      goal_count INTEGER,
      source     TEXT NOT NULL DEFAULT 'live'
    );
    CREATE TABLE IF NOT EXISTS goals (
      run_id TEXT NOT NULL REFERENCES runs(id),
      gid    TEXT NOT NULL,
      text   TEXT,
      mode   TEXT,
      status TEXT,
      PRIMARY KEY (run_id, gid)
    );
    CREATE TABLE IF NOT EXISTS reflections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id     TEXT NOT NULL REFERENCES runs(id),
      created_at TEXT NOT NULL,
      kind       TEXT NOT NULL,
      goal_id    TEXT,
      phase      TEXT,
      text       TEXT NOT NULL
    );
  `);
  } catch (e) {
    process.stderr.write(`learn.mjs: cannot open DB at ${dbPath} — ${e.message}\n`);
    process.stderr.write(`  delete or restore ${dbPath}, it auto-recreates\n`);
    process.exit(1);
  }
  return db;
}

// Known flags per verb (null = no check, for future extensibility).
const KNOWN_FLAGS = {
  'run-start': new Set(['dir', 'goals']),
  'reflect':   new Set(['text', 'goal', 'phase']),
  'review':    new Set(['file', 'lesson']),
  'run-end':   new Set(['status', 'register']),
  'recall':    new Set(['limit', 'grep']),
  'backfill':  new Set(['runs-dir']),
};

// --- arg parsing: flags become {flag: value}; --lesson accumulates into an array.
function parseFlags(argv, verb) {
  const known = KNOWN_FLAGS[verb] ?? null;
  const flags = { lesson: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) usageError(`unexpected argument: ${a}`);
    const key = a.slice(2);
    if (known && !known.has(key)) usageError(`unknown flag --${key} for verb '${verb}'`);
    const val = argv[i + 1];
    if (val === undefined) usageError(`missing value for --${key}`);
    i++;
    if (key === 'lesson') flags.lesson.push(val);
    else flags[key] = val;
  }
  return flags;
}

// --- register.md parser (tolerant: '## G1: text' and '## G1 — text';
//     field lines with or without '- ' prefix; decorated values).
const MODES = new Set(['CODE', 'RESEARCH', 'MIXED']);
const STATUSES = new Set(['done', 'blocked', 'needs-revision', 'pending', 'in-flight']);

function parseRegister(content) {
  const goals = [];
  let cur = null;
  for (const line of content.split(/\r?\n/)) {
    const h = line.match(/^##\s+(G\d+)\b(.*)$/);
    if (h) {
      const text = h[2].replace(/^\s*(?::|—|–|-+)\s*/, '').trim();
      cur = { gid: h[1], text: text || null, mode: 'unknown', status: 'unknown' };
      goals.push(cur);
      continue;
    }
    if (!cur) continue;
    const f = line.match(/^[-\s]*(Mode|Status):\s*(.+)$/);
    if (!f) continue;
    const firstWord = f[2].trim().split(/\s+/)[0] || '';
    if (f[1] === 'Mode') {
      const w = firstWord.toUpperCase().replace(/[^A-Z]+$/, '');
      cur.mode = MODES.has(w) ? w : 'unknown';
    } else {
      const w = firstWord.toLowerCase().replace(/[^a-z-]+$/, '');
      cur.status = STATUSES.has(w) ? w : 'unknown';
    }
  }
  return goals;
}

function upsertGoals(db, runId, goals) {
  const stmt = db.prepare(
    `INSERT INTO goals (run_id, gid, text, mode, status) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(run_id, gid) DO UPDATE SET text = excluded.text, mode = excluded.mode, status = excluded.status`
  );
  for (const g of goals) stmt.run(runId, g.gid, g.text, g.mode, g.status);
  return goals.length;
}

function runExists(db, runId) {
  return !!db.prepare('SELECT 1 FROM runs WHERE id = ?').get(runId);
}

// --- recall digest (also printed by run-start). Hard cap 40 output lines.
// CAP = 40 total lines; footer uses 2 lines (overflow notice + runs-recorded),
// leaving CAP - 2 = 38 lines for lesson rows.
const CAP = 40;
function printDigest(db, { limit = 10, grep = null } = {}) {
  const out = [];
  const shownCap = Math.min(limit, CAP - 2);
  let total, rows;
  if (grep) {
    const pat = `%${grep}%`;
    total = db.prepare(
      `SELECT count(*) AS c FROM reflections WHERE kind IN ('lesson','self-review') AND text LIKE ?`
    ).get(pat).c;
    rows = db.prepare(
      `SELECT run_id, text FROM reflections WHERE kind IN ('lesson','self-review') AND text LIKE ?
       ORDER BY id DESC LIMIT ?`
    ).all(pat, shownCap);
  } else {
    total = db.prepare(`SELECT count(*) AS c FROM reflections WHERE kind = 'lesson'`).get().c;
    rows = db.prepare(
      `SELECT run_id, text FROM reflections WHERE kind = 'lesson' ORDER BY id DESC LIMIT ?`
    ).all(shownCap);
  }
  if (total === 0) {
    out.push('no lessons recorded yet');
  } else {
    for (const r of rows) {
      let text = r.text.replace(/\s+/g, ' ').trim();
      if (text.length > 300) text = text.slice(0, 297) + '...';
      out.push(`[${r.run_id}] ${text}`);
    }
    if (total > rows.length) out.push(`(+ ${total - rows.length} more — use --grep)`);
  }
  const counts = { live: 0, backfill: 0 };
  for (const r of db.prepare('SELECT source, count(*) AS c FROM runs GROUP BY source').all()) {
    if (r.source in counts) counts[r.source] = r.c;
  }
  const n = counts.live + counts.backfill;
  out.push(`runs recorded: ${n} (live: ${counts.live}, backfill: ${counts.backfill})`);
  process.stdout.write(out.slice(0, CAP).join('\n') + '\n');
}

// --- verbs -----------------------------------------------------------------

function cmdRunStart(db, runId, flags) {
  if (!flags.dir) usageError('run-start requires --dir');
  const goalCount = flags.goals !== undefined ? Number.parseInt(flags.goals, 10) : null;
  if (flags.goals !== undefined && !Number.isInteger(goalCount)) usageError('--goals must be an integer');
  db.prepare(
    `INSERT INTO runs (id, run_dir, started_at, goal_count, source) VALUES (?, ?, ?, ?, 'live')
     ON CONFLICT(id) DO UPDATE SET source = 'live', run_dir = excluded.run_dir
     WHERE runs.source = 'backfill'`
  ).run(runId, flags.dir, new Date().toISOString(), goalCount);
  printDigest(db);
}

function cmdReflect(db, runId, flags) {
  const text = (flags.text || '').trim();
  if (!text) usageError('reflect requires non-empty --text');
  if (!runExists(db, runId)) fail(`reflect refused: unknown run '${runId}' — run-start it first.`, 1);
  db.prepare(
    `INSERT INTO reflections (run_id, created_at, kind, goal_id, phase, text) VALUES (?, ?, 'mid-run', ?, ?, ?)`
  ).run(runId, new Date().toISOString(), flags.goal ?? null, flags.phase ?? null, text);
}

function cmdReview(db, runId, flags) {
  if (!flags.file) usageError('review requires --file');
  if (flags.lesson.length === 0) usageError('review requires at least one --lesson (≤200 chars each)');
  for (const l of flags.lesson) {
    if (l.length > 200) fail(`lesson too long (${l.length} > 200 chars): "${l.slice(0, 60)}..."`, 1);
    if (!l.trim()) fail('lesson must be non-empty', 1);
  }
  if (!runExists(db, runId)) fail(`review refused: unknown run '${runId}' — run-start it first.`, 1);
  let content;
  try {
    content = fs.readFileSync(flags.file, 'utf8');
  } catch {
    fail(`review file not readable: ${flags.file}`, 1);
  }
  if (!content.trim()) fail(`review file is empty: ${flags.file}`, 1);
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO reflections (run_id, created_at, kind, goal_id, phase, text) VALUES (?, ?, ?, NULL, NULL, ?)`
  );
  db.exec('BEGIN');
  try {
    ins.run(runId, now, 'self-review', content);
    for (const l of flags.lesson) ins.run(runId, now, 'lesson', l.trim());
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function cmdRunEnd(db, runId, flags) {
  if (!['done', 'partial', 'aborted'].includes(flags.status)) {
    usageError('run-end requires --status <done|partial|aborted>');
  }
  const hasReview = db.prepare(
    `SELECT 1 FROM reflections WHERE run_id = ? AND kind = 'self-review' LIMIT 1`
  ).get(runId);
  if (!hasReview) {
    fail(`run-end refused: no self-review recorded. See learning.md — run the questionnaire and 'learn.mjs review' first.`, 1);
  }
  if (flags.register) {
    let content;
    try {
      content = fs.readFileSync(flags.register, 'utf8');
    } catch {
      fail(`register not readable: ${flags.register}`, 1);
    }
    const goals = parseRegister(content);
    upsertGoals(db, runId, goals);
    db.prepare('UPDATE runs SET goal_count = ? WHERE id = ?').run(goals.length, runId);
  }
  db.prepare('UPDATE runs SET ended_at = ?, status = ? WHERE id = ?')
    .run(new Date().toISOString(), flags.status, runId);
}

function cmdRecall(db, flags) {
  let limit = 10;
  if (flags.limit !== undefined) {
    limit = Number.parseInt(flags.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) usageError('--limit must be a positive integer');
  }
  printDigest(db, { limit, grep: flags.grep ?? null });
}

function cmdBackfill(db, flags) {
  const runsDir = flags['runs-dir'] || path.join(os.homedir(), 'council/runs');
  let entries;
  try {
    entries = fs.readdirSync(runsDir, { withFileTypes: true });
  } catch {
    fail(`runs dir not readable: ${runsDir}`, 1);
  }
  const exists = db.prepare('SELECT 1 FROM runs WHERE id = ?');
  const insRun = db.prepare(
    `INSERT INTO runs (id, run_dir, started_at, ended_at, status, goal_count, source)
     VALUES (?, ?, ?, NULL, ?, ?, 'backfill')`
  );
  let n = 0, m = 0, k = 0;
  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!ent.isDirectory()) continue;
    const id = ent.name;
    const ts = id.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(?:-|$)/);
    if (!ts) continue; // not a run dir
    if (exists.get(id)) { k++; continue; }
    const startedAt = `${ts[1]}-${ts[2]}-${ts[3]}T${ts[4]}:${ts[5]}:00Z`;
    const dir = path.join(runsDir, id);
    const status = fs.existsSync(path.join(dir, 'report.md')) ? 'done' : 'partial';
    let goals = [];
    const regPath = path.join(dir, 'register.md');
    if (fs.existsSync(regPath)) {
      try { goals = parseRegister(fs.readFileSync(regPath, 'utf8')); } catch { goals = []; }
    }
    insRun.run(id, dir, startedAt, status, goals.length > 0 ? goals.length : null);
    m += upsertGoals(db, id, goals);
    n++;
  }
  process.stdout.write(`backfilled ${n} runs, ${m} goals, skipped ${k} existing\n`);
}

// --- main ------------------------------------------------------------------

const [, , verb, ...rest] = process.argv;
const NEEDS_RUN_ID = new Set(['run-start', 'reflect', 'review', 'run-end']);

if (!verb) usageError();

let runId = null;
let flagArgv = rest;
if (NEEDS_RUN_ID.has(verb)) {
  if (!rest[0] || rest[0].startsWith('--')) usageError(`${verb} requires <run_id>`);
  runId = rest[0];
  flagArgv = rest.slice(1);
}
const flags = parseFlags(flagArgv, verb);
const db = openDb();

switch (verb) {
  case 'run-start': cmdRunStart(db, runId, flags); break;
  case 'reflect':   cmdReflect(db, runId, flags); break;
  case 'review':    cmdReview(db, runId, flags); break;
  case 'run-end':   cmdRunEnd(db, runId, flags); break;
  case 'recall':    cmdRecall(db, flags); break;
  case 'backfill':  cmdBackfill(db, flags); break;
  default:          usageError(`unknown verb: ${verb}`);
}
