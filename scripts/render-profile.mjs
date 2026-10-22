import { readFile, writeFile } from 'node:fs/promises';

const owner = process.env.SNAPSHOT_OWNER || 'liguozheng-ac';
if (!/^[a-zA-Z0-9-]+$/.test(owner)) throw new Error('Invalid GitHub username');
const timeZone = 'Asia/Shanghai';
const dateParts = (value) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).formatToParts(value).map(({ type, value }) => [type, value]));
const dayOf = (value) => {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const today = dayOf(new Date());
const snapshotPath = `snapshots/${today.slice(0, 4)}/${today.slice(5, 7)}/${today}.json`;
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
if (snapshot.owner !== owner || snapshot.date !== today) throw new Error('Snapshot owner or date mismatch');
const capturedAt = new Date(snapshot.captured_at);
if (!Number.isFinite(capturedAt.getTime())) throw new Error('Invalid snapshot timestamp');
const capturedParts = dateParts(capturedAt);
const selectedProjects = [
  ['j-gamelqa', 'J-GameLQA'],
  ['j-speechops', 'J-SpeechOps'],
  ['japanese-speech-xray', 'Japanese Speech X-Ray'],
];
const rows = selectedProjects.map(([name, label]) => {
  const repo = snapshot.repositories.find(repo => repo.repository === `${owner}/${name}`);
  if (!repo) return `| [${label}](https://github.com/${owner}/${name}) | Not in this snapshot | — |`;
  const commit = repo.latest_commit;
  if (!commit) return `| [${label}](https://github.com/${owner}/${name}) | No commit recorded | — |`;
  if (!/^[0-9a-f]{40}$/.test(commit.sha)) throw new Error('Invalid commit SHA');
  const committedAt = new Date(commit.committed_at);
  if (!Number.isFinite(committedAt.getTime())) throw new Error('Invalid commit timestamp');
  return `| [${label}](https://github.com/${owner}/${name}) | ${dayOf(committedAt)} | [\`${commit.sha.slice(0, 7)}\`](https://github.com/${owner}/${name}/commit/${commit.sha}) |`;
});
const content = [
  `Snapshot captured **${dayOf(capturedAt)} ${capturedParts.hour}:${capturedParts.minute}** (Asia/Shanghai).`,
  '',
  '| Project | Latest commit date | Commit |',
  '| --- | --- | --- |',
  ...rows,
  '',
  `[Snapshot details](https://github.com/${owner}/${owner}/blob/main/${snapshotPath}) · [Snapshot archive](https://github.com/${owner}/${owner}/tree/main/snapshots)`,
].join('\n');
const readmePath = 'README.md';
const readme = await readFile(readmePath, 'utf8');
const start = '<!-- PROJECT-ACTIVITY:START -->';
const end = '<!-- PROJECT-ACTIVITY:END -->';
if (readme.split(start).length !== 2 || readme.split(end).length !== 2 || readme.indexOf(start) > readme.indexOf(end)) {
  throw new Error('README must contain exactly one ordered pair of activity markers');
}
const updated = readme.slice(0, readme.indexOf(start) + start.length)
  + '\n' + content + '\n'
  + readme.slice(readme.indexOf(end));
if (updated !== readme) {
  await writeFile(readmePath, updated);
  console.log(`Updated README project activity from ${snapshotPath}`);
} else {
  console.log('README project activity is already current.');
}
