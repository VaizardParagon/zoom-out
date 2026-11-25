// Checks the access tables (`matrices`) in the map build.
// Run: node --test test/
// Optional: ZOOM_OUT_BASELINE=<folder> also compares the no-matrices build byte for byte with the
// index.html and index.artifact.html in that folder (a build of the example map from before a change).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = join(dirname(fileURLToPath(import.meta.url)), '..', 'skill', 'zoom-out');
const example = JSON.parse(readFileSync(join(skill, 'example-map.json'), 'utf8'));
const template = readFileSync(join(skill, 'template.html'), 'utf8');

function build(map) {
  const root = mkdtempSync(join(tmpdir(), 'zoom-out-test-'));
  mkdirSync(join(root, 'system-map'));
  writeFileSync(join(root, 'system-map', 'map.json'), JSON.stringify(map, null, 2));
  const run = spawnSync(process.execPath, [join(skill, 'build.mjs'), root], { encoding: 'utf8' });
  const read = name => (existsSync(join(root, 'system-map', name)) ? readFileSync(join(root, 'system-map', name), 'utf8') : null);
  return { ...run, html: read('index.html'), artifact: read('index.artifact.html') };
}
const without = () => { const m = structuredClone(example); delete m.matrices; return m; };

// The matrix code of the template, evaluated on its own so the table it draws can be read without a browser.
function renderMatrices(map) {
  const blocks = [...template.matchAll(/^[ \t]*\/\*<matrices>\*\/\r?\n([\s\S]*?)^[ \t]*\/\*<\/matrices>\*\/\r?\n/gm)].map(m => m[1]);
  const code = blocks.find(b => b.includes('function mxSection'));
  assert.ok(code, 'template has a matrices block that defines mxSection');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return new Function('M', 'esc', `${code}\nreturn (M.matrices || []).map(mxSection).join('');`)(map, esc);
}

test('the example map carries a small matrix', () => {
  assert.ok(Array.isArray(example.matrices) && example.matrices.length >= 1);
});

test('a map without matrices builds with none of the matrix code', () => {
  const r = build(without());
  assert.equal(r.status, 0, r.stderr);
  for (const out of [r.html, r.artifact]) {
    assert.ok(!out.includes('matrices>*/'), 'no block markers left in the page');
    assert.ok(!out.includes('mxSection'), 'no matrix code in the page');
  }
});

test('a map without matrices builds byte for byte as the baseline', { skip: !process.env.ZOOM_OUT_BASELINE && 'set ZOOM_OUT_BASELINE to compare' }, () => {
  const r = build(without()), base = process.env.ZOOM_OUT_BASELINE;
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.html, readFileSync(join(base, 'index.html'), 'utf8'), 'index.html differs from the baseline');
  assert.equal(r.artifact, readFileSync(join(base, 'index.artifact.html'), 'utf8'), 'index.artifact.html differs from the baseline');
});

test('an empty matrices list builds as a map without matrices', () => {
  const r = build({ ...without(), matrices: [] });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.html.includes('mxSection'));
});

test('a map with matrices gets the matrix code, without the markers', () => {
  const r = build(example);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.html.includes('function mxSection'));
  assert.ok(!r.html.includes('matrices>*/'));
  assert.match(r.stdout, /Access tables: 1/);
});

test('each matrix is a real table with column and row headers, and every tick is named "column: row"', () => {
  const html = renderMatrices(example);
  for (const mx of example.matrices) {
    assert.match(html, /<table[ >]/);
    assert.match(html, /<th scope="col"/);
    assert.match(html, /<th scope="row"/);
    assert.match(html, /<th scope="rowgroup"/);
    const label = k => mx.columns.find(c => c.key === k).label;
    const row = k => mx.groups.flatMap(g => g.rows).find(r => r.key === k).label;
    for (const [c, r] of mx.cells) assert.ok(html.includes(`aria-label="${label(c)}: ${row(r)}"`), `tick ${c}/${r} is named`);
    assert.equal((html.match(/class="mxt"/g) || []).length, mx.cells.length, 'one tick per cell');
  }
});

test('counts are computed from the cells, each shown in its own column header and row', () => {
  const mx = example.matrices[0], html = renderMatrices(example), rows = mx.groups.flatMap(g => g.rows);
  const heads = [...html.matchAll(/<th scope="col" data-c="[^"]*">([\s\S]*?)<\/th>/g)].map(m => m[1]);
  assert.equal(heads.length, mx.columns.length, 'one header per column');
  mx.columns.forEach((c, j) => {
    const n = mx.cells.filter(([k]) => k === c.key).length;
    assert.ok(heads[j].includes(`>${c.label}</span>`), `header ${j + 1} is ${c.label}`);
    assert.ok(heads[j].includes(`<span class="mxn">${n} of ${rows.length}</span>`), `header ${c.label} shows ${n} of ${rows.length}\n${heads[j]}`);
  });
  const trs = [...html.matchAll(/<tr data-r="[^"]*">([\s\S]*?)<\/tr>/g)].map(m => m[1]);
  assert.equal(trs.length, rows.length, 'one table row per row');
  rows.forEach((r, k) => {
    const n = mx.cells.filter(([, x]) => x === r.key).length;
    assert.ok(trs[k].includes(`>${r.label}</span>`), `row ${k + 1} is ${r.label}`);
    assert.ok(trs[k].endsWith(`<td class="mxcn">${n}</td>`), `row ${r.label} shows ${n} ticks\n${trs[k]}`);
  });
});

test('keys never go into the page as attributes, so a key HTML cannot keep as written still works', () => {
  const map = structuredClone(example), mx = map.matrices[0];
  const rename = { ramp: 'ramp\r1', scan: 'scan\r\n2' };
  mx.columns.forEach(c => { if (rename[c.key]) c.key = rename[c.key]; });
  mx.groups.forEach(g => g.rows.forEach(r => { if (rename[r.key]) r.key = rename[r.key]; }));
  mx.cells = mx.cells.map(([c, r]) => [rename[c] || c, rename[r] || r]);
  const html = renderMatrices(map);
  for (const [, v] of html.matchAll(/data-(?:c|r|mxc|mxr)="([^"]*)"/g)) assert.match(v, /^\d+$/, `data attribute holds an index, not a key: ${JSON.stringify(v)}`);
  assert.equal(build(map).status, 0);
});

test('a matrix may be called like a page section ("Board"); it is routed by data-mx, not by its heading', () => {
  const map = structuredClone(example); map.matrices[0].title = 'Board';
  const r = build(map);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.html.includes("NAV[String(mx.title)"), 'matrix titles are not added to the heading routes');
  assert.match(r.html, /sec\.dataset\.mx != null/, 'matrix sections are routed by their data-mx attribute');
});

test('the build names what is wrong in a broken matrix', () => {
  const bad = { ...without(), matrices: [{ title: 'Board', columns: [{ key: 'a', label: 'A' }, { key: 'a', label: 'B' }], groups: [{ label: 'G', rows: [{ key: 'x', label: 'X' }] }], cells: [['a', 'nope'], ['zz', 'x']], questions: [3] }] };
  const r = build(bad);
  assert.equal(r.status, 1);
  for (const msg of ['duplicate matrices 1 (Board) column key: a', 'cell ["a","nope"]', 'cell ["zz","x"]', 'questions must be a list of text']) assert.ok(r.stderr.includes(msg), `says: ${msg}\n${r.stderr}`);
});

test('the build refuses matrices that are not a list', () => {
  const r = build({ ...without(), matrices: { title: 'x' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /matrices: must be a list/);
});

test('a project template without matrix support is reported as out of date when the map has matrices', () => {
  const root = mkdtempSync(join(tmpdir(), 'zoom-out-test-'));
  mkdirSync(join(root, 'system-map'));
  writeFileSync(join(root, 'system-map', 'map.json'), JSON.stringify(example));
  const old = template.replace(/^[ \t]*\/\*<matrices>\*\/\r?\n[\s\S]*?^[ \t]*\/\*<\/matrices>\*\/\r?\n/gm, '');
  writeFileSync(join(root, 'system-map', 'template.html'), old);
  const out = execFileSync(process.execPath, [join(skill, 'build.mjs'), root], { encoding: 'utf8' });
  assert.match(out, /TEMPLATE OUT OF DATE: .*access tables/);
});
