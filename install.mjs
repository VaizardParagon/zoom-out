#!/usr/bin/env node
// Copies skill/zoom-out into the Claude Code and Codex skills folders. Rerun after changing the skill.
//
// A destination that is a link is left alone. A link already follows a skill folder, so it needs no
// reinstall, and replacing it with a copy would freeze the skill at today's version. Machines set up
// from a dotfiles repo link the skill this way.
import { cpSync, rmSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = join(dirname(fileURLToPath(import.meta.url)), 'skill', 'zoom-out');
const home = homedir();

// lstat reports a Windows junction as a symbolic link, so this covers both kinds.
const isLink = (path) => lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() ?? false;
const present = (path) => lstatSync(path, { throwIfNoEntry: false }) !== undefined;

function linkTarget(path) {
  try { return realpathSync(path); } catch { return 'a folder that no longer exists'; }
}

// Codex also reads ~/.agents/skills. A zoom-out there already reaches Codex, and a second one in
// ~/.codex/skills would show the skill twice.
const shared = join(home, '.agents', 'skills', 'zoom-out');

for (const tool of ['.claude', '.codex']) {
  const skills = join(home, tool, 'skills');
  if (!existsSync(skills)) { console.log(`Skipped ${skills} (folder not found)`); continue; }
  const dest = join(skills, 'zoom-out');
  if (isLink(dest)) { console.log(`Left ${dest} alone (it is a link to ${linkTarget(dest)})`); continue; }
  if (tool === '.codex' && present(shared)) { console.log(`Skipped ${dest} (Codex already reads ${shared})`); continue; }
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Installed ${dest}`);
}
