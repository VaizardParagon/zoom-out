#!/usr/bin/env node
// Draws the system map page from system-map/map.json.
// Usage: node build.mjs [project folder, default: current folder]
// Writes system-map/index.html (open in a browser) and system-map/index.artifact.html (for the Artifact tool).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || '.');
const dir = join(root, 'system-map');
const mapPath = join(dir, 'map.json');
const ORDER = ['none', 'progress', 'built', 'tested', 'live'];
const KINDS = ['decision', 'off', 'build'];

if (!existsSync(mapPath)) { console.error(`No map at ${mapPath}`); process.exit(1); }
let M;
try { M = JSON.parse(readFileSync(mapPath, 'utf8')); } catch (e) { console.error(`map.json is not valid JSON: ${e.message}`); process.exit(1); }

const errs = [];
const need = (ok, msg) => { if (!ok) errs.push(msg); };
const dupes = (list, what) => { const seen = new Set(); list.forEach(x => { need(!seen.has(x), `duplicate ${what}: ${x}`); seen.add(x); }); };
const iso = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

need(M.project, 'project: missing');
need(iso(M.updated), 'updated: must be a date like 2026-11-12');
need(typeof M.about === 'string' && M.about.trim(), 'about: missing (one or two sentences on what this system is and who uses it)');
need(typeof M.recap === 'string' && M.recap.trim(), 'recap: missing (one short paragraph on what happened since the last run)');
need(Array.isArray(M.nextSteps) && M.nextSteps.length >= 1 && M.nextSteps.length <= 5, 'nextSteps: need one to five');
(Array.isArray(M.nextSteps) ? M.nextSteps : []).forEach((s, i) => {
  need(s && s.step && s.why, `nextSteps ${i + 1}: needs step and why`);
  if (s && s.prompt != null) {
    need(typeof s.prompt === 'string' && s.prompt.trim(), `nextSteps ${i + 1}: prompt must be text`);
    const text = String(s.prompt).toLowerCase().replace(/\u2019/g, "'");
    ['Evidence:', 'Done when:', "Needs the human's OK:"].forEach(l => need(text.includes(l.toLowerCase()), `nextSteps ${i + 1}: prompt needs a line starting "${l}"`));
  }
});
const since = (x, where) => need(!x || x.since == null || iso(x.since), `${where}: since must be a date`);
(M.questions || []).forEach((q, i) => { need(q && q.question, `questions ${i + 1}: needs question`); since(q, `questions ${i + 1}`); });
(M.pending || []).forEach((p, i) => { need(p && p.title, `pending ${i + 1}: needs title`); since(p, `pending ${i + 1}`); });
(M.features || []).forEach(f => since(f.blocked, `feature ${f.id}, blocked`));
const known = id => (M.features || []).some(f => f.id === id);
(M.people || []).forEach((p, i) => {
  const n = `people ${i + 1}${p && p.name ? ` (${p.name})` : ''}`;
  need(p && p.name, `${n}: needs name`);
  ((p && p.now) || []).forEach(id => need(known(id), `${n}: now has feature "${id}", which does not exist`));
  ((p && p.trail) || []).forEach(t => {
    need(iso(t.date) && t.summary && Array.isArray(t.features), `${n}: each trail entry needs date, summary and features`);
    (t.features || []).forEach(id => need(known(id), `${n}: trail has feature "${id}", which does not exist`));
  });
});
dupes((M.people || []).map(p => p && p.name), 'person');
need(!M.runBy || (M.people || []).some(p => p.name === M.runBy), 'runBy: must be the name of one of people');
need(Array.isArray(M.bands) && M.bands.length, 'bands: need at least one');
need(Array.isArray(M.parts) && M.parts.length, 'parts: need at least one');
need(Array.isArray(M.features) && M.features.length, 'features: need at least one');
const parts = M.parts || [], feats = M.features || [], bands = M.bands || [];
const partIds = new Set(parts.map(p => p.id)), featIds = new Set(feats.map(f => f.id));
dupes(parts.map(p => p.id), 'part id');
dupes(feats.map(f => f.id), 'feature id');
dupes(parts.map(p => `band ${p.band}, col ${p.col}`), 'part position');
parts.forEach(p => {
  need(p.id && p.title, `part ${p.id || '?'}: needs id and title`);
  need(Number.isInteger(p.band) && p.band >= 0 && p.band < bands.length, `part ${p.id}: band must index into bands`);
  need(Number.isInteger(p.col) && p.col >= 0, `part ${p.id}: col must be 0 or more`);
  need(p.external || feats.some(f => f.part === p.id), `part ${p.id}: has no features (mark it external or remove it)`);
});
feats.forEach(f => {
  const n = `feature ${f.id || '?'}`;
  need(f.id && f.title, `${n}: needs id and title`);
  need(partIds.has(f.part), `${n}: part "${f.part}" does not exist`);
  need(ORDER.includes(f.status), `${n}: status must be one of ${ORDER.join(', ')}`);
  need(M.hasLive !== false || f.status !== 'live', `${n}: status is live but hasLive is false`);
  need(iso(f.checked), `${n}: checked must be a date`);
  need(f.source, `${n}: source is missing (where was this promised?)`);
  need(f.status === 'none' || f.evidence, `${n}: evidence is missing for status ${f.status}`);
  if (f.blocked) need(KINDS.includes(f.blocked.kind) && f.blocked.note, `${n}: blocked needs kind (${KINDS.join(', ')}) and note`);
  if (f.work && f.work.branch != null) need(typeof f.work.branch === 'string' && /^\S+$/.test(f.work.branch) && !/^(origin|refs|remotes)\//.test(f.work.branch), `${n}: work.branch must be the bare branch name, as git branch prints it`);
  if (f.work && f.work.who) {
    need(M.tracker === 'linear' || M.tracker === 'github', `${n}: work.who is set but tracker is not linear or github (assignees come only from the tracker)`);
    need(f.work.ticket && /^https?:\/\//.test(f.work.url || ''), `${n}: work.who needs the ticket and its url from the tracker`);
  }
});
(M.links || []).forEach(l => need(Array.isArray(l) && l.length === 2 && partIds.has(l[0]) && partIds.has(l[1]), `link ${JSON.stringify(l)}: both ends must be part ids`));
(M.flows || []).forEach(fl => {
  need(fl.title && Array.isArray(fl.steps) && fl.steps.length, `flow ${fl.title || '?'}: needs title and steps`);
  (fl.steps || []).forEach(st => {
    const lists = Array.isArray(st.features) ? [st.features] : Object.entries(st.features || {}).map(([lane, ids]) => {
      need((fl.lanes || []).includes(lane), `flow ${fl.title}, step ${st.title}: lane "${lane}" is not in lanes`); return ids; });
    need(lists.length && lists.every(l => Array.isArray(l) && l.length), `flow ${fl.title}, step ${st.title}: needs features`);
    lists.flat().forEach(id => need(featIds.has(id), `flow ${fl.title}, step ${st.title}: feature "${id}" does not exist`));
  });
});
if (errs.length) { console.error(`map.json has ${errs.length} problem(s):\n- ${errs.join('\n- ')}`); process.exit(1); }

// Progress over time: the ladder counts in every committed version of the map, plus this one. Read from git, never stored in map.json.
const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
const tallyOf = m => {
  const counts = Object.fromEntries(ORDER.map(s => [s, 0]));
  (m.features || []).forEach(f => { if (f.status in counts) counts[f.status]++; });
  return { date: m.updated, total: (m.features || []).length, blocked: (m.features || []).filter(f => f.blocked).length, counts };
};
let history = [];
try {
  const shas = git(['log', '--format=%H', '-n', '60', '--', 'system-map/map.json']).split(/\s+/).filter(Boolean).reverse();
  for (const sha of shas) { try { const m = JSON.parse(git(['show', `${sha}:./system-map/map.json`])); if (iso(m.updated)) history.push(tallyOf(m)); } catch { /* skip a version that does not parse */ } }
} catch { /* not a git repo, or no earlier map */ }
history.push(tallyOf(M));
history = [...new Map(history.map(h => [h.date, h])).values()].sort((a, b) => (a.date < b.date ? -1 : 1));

const custom = join(dir, 'template.html');
const template = readFileSync(existsSync(custom) ? custom : join(here, 'template.html'), 'utf8');
const htmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fragment = template
  .replace('__TITLE__', () => htmlEsc(`${M.project} System Map`))
  .replace('__MAP_JSON__', () => JSON.stringify({ ...M, _history: history }).replace(/</g, '\\u003c'));
writeFileSync(join(dir, 'index.artifact.html'), fragment);
writeFileSync(join(dir, 'index.html'), `<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>body{margin:0}</style>\n${fragment}`);
const ignore = join(dir, '.gitignore');
if (!existsSync(ignore)) writeFileSync(ignore, 'index.artifact.html\n');

// What moved since the last committed map
const say = [];
const tally = ORDER.filter(s => s !== 'live' || M.hasLive !== false).map(s => `${feats.filter(f => f.status === s).length} ${s}`).join(', ');
say.push(`${feats.length} features: ${tally}. ${feats.filter(f => f.blocked).length} blocked.`);
let old = null;
try { old = JSON.parse(execFileSync('git', ['-C', root, 'show', 'HEAD:./system-map/map.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { /* no earlier map */ }
if (!old) say.push('No earlier committed map to compare with.');
else {
  const was = Object.fromEntries((old.features || []).map(f => [f.id, f]));
  const up = [], down = [], added = [], gone = [];
  feats.forEach(f => { const o = was[f.id]; if (!o) return added.push(f.title);
    const d = ORDER.indexOf(f.status) - ORDER.indexOf(o.status);
    if (d > 0) up.push(`${f.title} (${o.status} to ${f.status})`); if (d < 0) down.push(`${f.title} (${o.status} to ${f.status})`); });
  (old.features || []).forEach(o => { if (!featIds.has(o.id)) gone.push(o.title); });
  const line = (label, list) => { if (list.length) say.push(`${label} (${list.length}): ${list.join('; ')}`); };
  say.push(`Since the map of ${old.updated}:`);
  line('Moved up', up); line('Moved down', down); line('Added to the promise', added); line('Removed from the promise', gone);
  if (!up.length && !down.length && !added.length && !gone.length) say.push('Nothing moved.');
}
const stale = feats.filter(f => f.checked !== M.updated).length;
if (stale) say.push(`${stale} feature(s) not rechecked on ${M.updated}.`);
const noBranch = feats.filter(f => f.status === 'progress' && !(f.work && f.work.branch));
if (noBranch.length) say.push(`In progress with no branch recorded (${noBranch.length}): ${noBranch.map(f => f.title).join('; ')}`);
const noPrompt = (M.nextSteps || []).filter(x => !x.prompt).length;
if (noPrompt) say.push(`${noPrompt} next step(s) have no prompt.`);
say.push(`Progress over time: ${history.length} refresh(es) charted.`);
if ((M.pending || []).length) say.push(`${M.pending.length} item(s) waiting for the human's OK.`);
say.push(`Template: ${existsSync(custom) ? 'this project\'s own copy' : 'default'}.`, `Page: ${join(dir, 'index.html')}`);
console.log(say.join('\n'));
