#!/usr/bin/env node
// Copies skill/zoom-out into the Claude Code and Codex skills folders. Rerun after changing the skill.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = join(dirname(fileURLToPath(import.meta.url)), 'skill', 'zoom-out');
for (const tool of ['.claude', '.codex']) {
  const skills = join(homedir(), tool, 'skills');
  if (!existsSync(skills)) { console.log(`Skipped ${skills} (folder not found)`); continue; }
  const dest = join(skills, 'zoom-out');
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Installed ${dest}`);
}
