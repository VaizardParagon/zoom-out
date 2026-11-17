#!/usr/bin/env node
// The cheap half of a refresh: everything that can be computed, so the agent reads and writes only what changed.
// Run from the repo root.
//   node map.mjs scan [--all]      stamp today's date, fill people, trail, now, runBy and work.branch from git, print the worklist
//   node map.mjs show <id|top> ..  print those features (or the top-level fields) without opening the whole map
//   node map.mjs apply <patch>     merge a small patch file into the map
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const [cmd, ...rest] = process.argv.slice(2);
const flags = rest.filter(a => a.startsWith('--')), args = rest.filter(a => !a.startsWith('--'));
const root = resolve('.');
const mapPath = join(root, 'system-map', 'map.json');
const die = m => { console.error(m); process.exit(1); };
if (!['scan', 'show', 'apply'].includes(cmd)) die('Usage: node map.mjs scan [--all] | show <id|top> ... | apply <patch.json>');
if (!existsSync(mapPath)) die(`No map at ${mapPath}. Run from the repo root.`);
let M;
try { M = JSON.parse(readFileSync(mapPath, 'utf8')); } catch (e) { die(`map.json is not valid JSON: ${e.message}`); }
const save = () => writeFileSync(mapPath, JSON.stringify(M, null, 2) + '\n');
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const feats = M.features || (M.features = []);
const byId = Object.fromEntries(feats.map(f => [f.id, f]));

// ---------------------------------------------------------------- show
if (cmd === 'show') {
  const out = {};
  args.forEach(a => {
    if (a === 'top') { const { features, people, parts, links, flows, ...top } = M; out.top = top; }
    else out[a] = byId[a] || 'no such feature';
  });
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
}

// ---------------------------------------------------------------- apply
if (cmd === 'apply') {
  if (!args[0]) die('apply needs a patch file');
  let P;
  try { P = JSON.parse(readFileSync(resolve(args[0]), 'utf8')); } catch (e) { die(`Patch is not valid JSON: ${e.message}`); }
  const merge = (obj, patch) => Object.entries(patch).forEach(([k, v]) => { if (v === null) delete obj[k]; else obj[k] = v; });
  const unknown = [...Object.keys(P.features || {}), ...(P.rechecked || []), ...(P.remove || [])].filter(id => !byId[id]);
  if (unknown.length) die(`Patch names features that do not exist: ${unknown.join(', ')}`);
  let changed = 0;
  Object.entries(P.features || {}).forEach(([id, p]) => {
    merge(byId[id], p);
    if ('status' in p || 'evidence' in p) byId[id].checked = today;
    changed++;
  });
  (P.rechecked || []).forEach(id => { byId[id].checked = today; });
  (P.add || []).forEach(f => { if (byId[f.id]) die(`add: feature ${f.id} already exists`); feats.push({ status: 'none', checked: today, ...f }); });
  if ((P.remove || []).length) {
    const gone = new Set(P.remove);
    M.features = feats.filter(f => !gone.has(f.id));
    const keep = ids => (ids || []).filter(id => !gone.has(id));
    (M.people || []).forEach(p => { p.now = keep(p.now); (p.trail || []).forEach(t => { t.features = keep(t.features); }); p.trail = (p.trail || []).filter(t => t.features.length); });
    (M.flows || []).forEach(fl => (fl.steps || []).forEach(st => {
      if (Array.isArray(st.features)) st.features = keep(st.features);
      else Object.keys(st.features || {}).forEach(l => { st.features[l] = keep(st.features[l]); });
    }));
  }
  merge(M, P.top || {});
  save();
  console.log(`Applied: ${changed} feature(s) changed, ${(P.rechecked || []).length} marked rechecked, ${(P.add || []).length} added, ${(P.remove || []).length} removed, top-level fields set: ${Object.keys(P.top || {}).join(', ') || 'none'}.`);
  process.exit(0);
}

// ---------------------------------------------------------------- scan
const git = (...a) => { try { return execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 }).trim(); } catch { return null; } };
const lines = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
const escRx = s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const globRx = p => new RegExp('^' + p.split('**').map(part => part.split('*').map(escRx).join('[^/]*')).join('.*') + '$');
const matches = (patterns, file) => (patterns || []).some(p => p.includes('*') ? globRx(p).test(file) : file === p || file.startsWith(p.endsWith('/') ? p : p + '/'));
const owners = file => feats.filter(f => matches(f.paths, file));
const noise = file => /^system-map\//.test(file) || /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|[^/]*\.lock)$/.test(file) || /(^|\/)\./.test(file);

const inGit = git('rev-parse', '--is-inside-work-tree') === 'true';
const oldDate = M.updated;
const sinceSha = inGit ? git('log', '-1', '--format=%H', '--', 'system-map/map.json') : null;
const all = flags.includes('--all') || !sinceSha;

// files that changed since the last committed map, plus what is not committed yet
const committed = sinceSha ? lines(git('diff', '--name-only', sinceSha, 'HEAD')) : [];
const uncommitted = inGit ? [...new Set([...lines(git('diff', '--name-only', 'HEAD')), ...lines(git('ls-files', '--others', '--exclude-standard'))])] : [];
const changedFiles = [...new Set([...committed, ...uncommitted])].filter(f => !/^system-map\//.test(f));

// people: who committed what, by day
const people = M.people || (M.people = []);
const person = (name, email) => {
  const e = (email || '').replace(/[<>]/g, '').toLowerCase();
  let p = people.find(x => e && (x.emails || []).includes(e)) || people.find(x => x.name === name);
  if (!p) { p = { name, emails: [], now: [], trail: [] }; people.push(p); }
  if (e && !(p.emails || (p.emails = [])).includes(e)) p.emails.push(e);
  p.trail = p.trail || [];
  return p;
};
const bot = (name, email) => /\[bot\]|dependabot|renovate|github-actions/i.test(`${name} ${email}`);
let trailAdded = 0, commitCount = 0;
if (inGit) {
  const fullHistory = !sinceSha || !people.some(p => (p.trail || []).length);
  const log = git('log', fullHistory ? 'HEAD' : `${sinceSha}..HEAD`, '--no-merges', '--date=short', '--name-only', '--format=%x1e%an%x1f%ae%x1f%ad%x1f%s') || '';
  commitCount = sinceSha ? +(git('rev-list', '--count', '--no-merges', `${sinceSha}..HEAD`) || 0) : +(git('rev-list', '--count', '--no-merges', 'HEAD') || 0);
  const days = new Map();
  log.split('\x1e').filter(Boolean).forEach(block => {
    const [head, ...files] = block.split('\n');
    const [name, email, date, subject] = head.split('\x1f');
    if (!name || bot(name, email)) return;
    const p = person(name, email), key = `${p.name}\x1f${date}`;
    const d = days.get(key) || { p, date, subjects: [], feats: new Set() };
    d.subjects.push(subject || '');
    files.map(f => f.trim()).filter(Boolean).forEach(f => owners(f).forEach(o => d.feats.add(o.id)));
    days.set(key, d);
  });
  const tidy = s => { let t = s.replace(/^\w+(\([^)]*\))?!?:\s*/, '').trim(); t = t.charAt(0).toUpperCase() + t.slice(1); return /[.!?]$/.test(t) ? t : t + '.'; };
  days.forEach(d => {
    if (!d.feats.size) return;
    const more = d.subjects.length - 1;
    d.p.trail = d.p.trail.filter(t => t.date !== d.date);
    d.p.trail.push({ date: d.date, summary: tidy(d.subjects[0]) + (more ? ` Plus ${more} more commit${more === 1 ? '' : 's'}.` : ''), features: [...d.feats] });
    d.p.trail.sort((a, b) => (a.date < b.date ? -1 : 1));
    trailAdded++;
  });
}

// open branches: which features each one touches, and who is on it
let branchSet = 0, openCount = 0;
people.forEach(p => { p.now = []; });
if (inGit) {
  const current = git('rev-parse', '--abbrev-ref', 'HEAD');
  const defaultB = (git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD') || '').replace(/^origin\//, '') || ['main', 'master'].find(b => git('rev-parse', '--verify', '--quiet', b) !== null) || current;
  const defaultRef = git('rev-parse', '--verify', '--quiet', `origin/${defaultB}`) !== null ? `origin/${defaultB}` : defaultB;
  const open = new Map(), unread = new Set(); // unread: branches past the 40 examined, so nothing is known about them
  lines(git('for-each-ref', '--sort=-committerdate', '--format=%(refname)%1f%(authorname)%1f%(authoremail)', 'refs/heads', 'refs/remotes/origin')).forEach(l => {
    const [ref, name, email] = l.split('\x1f');
    const branch = ref.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/origin\//, '');
    if (branch === 'HEAD' || branch === defaultB || open.has(branch)) return;
    if (open.size >= 40) { unread.add(branch); return; }
    if (git('merge-base', '--is-ancestor', ref, defaultRef) !== null) return; // already merged
    const touched = new Set();
    lines(git('diff', '--name-only', `${defaultRef}...${ref}`)).forEach(f => owners(f).forEach(o => touched.add(o.id)));
    open.set(branch, { name, email, touched });
  });
  openCount = open.size;
  feats.forEach(f => {
    const cur = f.work && f.work.branch;
    if (cur && (open.has(cur) || unread.has(cur))) return;
    const pick = [...open.entries()].find(([, b]) => b.touched.has(f.id));
    if (pick) { f.work = { ...(f.work || {}), branch: pick[0] }; branchSet++; }
    else if (cur) { delete f.work.branch; if (!Object.keys(f.work).length) delete f.work; }
  });
  open.forEach(b => { if (!b.touched.size || bot(b.name, b.email)) return; const p = person(b.name, b.email); b.touched.forEach(id => { if (!p.now.includes(id)) p.now.push(id); }); });
  const me = git('config', 'user.name');
  if (me) {
    const p = person(me, git('config', 'user.email'));
    M.runBy = p.name;
    uncommitted.forEach(f => owners(f).forEach(o => { if (!p.now.includes(o.id)) p.now.push(o.id); }));
  }
}

M.updated = today;
save();

// the worklist: the only features the agent needs to read
const changedFeats = feats.filter(f => changedFiles.some(file => matches(f.paths, file)));
const noPaths = feats.filter(f => !(f.paths || []).length);
const work = all ? feats : [...new Set([...changedFeats, ...noPaths])];
const plan = changedFiles.filter(f => matches(M.planPaths, f));
const unowned = changedFiles.filter(f => !noise(f) && !owners(f).length && !plan.includes(f));
const watch = feats.filter(f => f.status === 'progress' || f.blocked);
const cut = (list, n) => list.slice(0, n).join(', ') + (list.length > n ? ` (+${list.length - n} more)` : '');
const out = [];
out.push(`zoom-out scan · ${M.project} · last map ${oldDate} · today ${today}${inGit ? '' : ' · not a git repo, so nothing could be compared'}`);
out.push(`Since the last map: ${commitCount} commit(s), ${changedFiles.length} file(s) changed, ${openCount} open branch(es).`);
out.push(`Filled from git: ${trailAdded} work-trail day(s), "now" for ${people.filter(p => p.now.length).length} person(s), branch set on ${branchSet} feature(s), runBy ${M.runBy || 'unknown'}.`);
out.push('', `WORKLIST: ${work.length} of ${feats.length} feature(s) to recheck${all ? ' (everything: first map, or --all)' : ''}. All others keep their status.`);
work.forEach(f => {
  const files = changedFiles.filter(file => matches(f.paths, file));
  out.push(`  ${f.id} [${f.status}${f.blocked ? ', blocked' : ''}] ${f.title}${(f.paths || []).length ? '' : ' · NO PATHS YET'}${files.length ? ' · changed: ' + cut(files, 4) : ''}`);
});
out.push('', `PLAN DOCUMENTS CHANGED: ${plan.length ? cut(plan, 20) : 'none'}${(M.planPaths || []).length ? '' : ' (no planPaths recorded, so this cannot be told)'}`);
out.push(`CHANGED FILES IN NO FEATURE: ${unowned.length ? cut(unowned, 30) : 'none'}`);
out.push(`IN PROGRESS OR BLOCKED, for the tracker check: ${watch.length ? cut(watch.map(f => f.id), 40) : 'none'}`);
console.log(out.join('\n'));
