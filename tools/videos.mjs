// Refreshes content/videos.json: the newest public videos on the studio's YouTube channel, for the
// "From the channel" section.  node tools/videos.mjs   then   node tools/build.mjs
// Reads the channel through the studio's YouTube tool (C:/GODOT/youtube/yt.mjs, outside this repo:
// it holds the OAuth token), which lists every upload newest first as "<id> <privacy> <views> views | <title>".
// Shorts are told by "#shorts" in the title. Nothing on the site breaks if this is never run again:
// the JSON in content/ is what gets built.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = process.env.YT_TOOL || 'C:/GODOT/youtube/yt.mjs';
const KEEP = 8;

const out = execFileSync(process.execPath, [TOOL, 'videos'], { cwd: path.dirname(TOOL), encoding: 'utf8' });
const seen = new Set();
const videos = [];
for (const line of out.split(/\r?\n/)) {
  const m = line.match(/^(\S{11}) (\w+)\s+(\d+) views \| (.+)$/);
  if (!m || m[2] !== 'public' || seen.has(m[1])) continue;
  seen.add(m[1]);
  const short = /#shorts/i.test(m[4]);
  videos.push({ id: m[1], title: m[4].replace(/\s*#shorts\s*$/i, '').trim(), views: Number(m[3]), short });
}
const pick = videos.slice(0, KEEP);
fs.writeFileSync(path.join(ROOT, 'content/videos.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), videos: pick }, null, 2) + '\n');
console.log(`content/videos.json: ${pick.length} of ${videos.length} public videos`);
