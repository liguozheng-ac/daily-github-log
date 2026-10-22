import { mkdir, access, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const owner = process.env.SNAPSHOT_OWNER || 'liguozheng-ac';
if (!/^[a-zA-Z0-9-]+$/.test(owner)) throw new Error('Invalid GitHub username');
const timeZone = 'Asia/Shanghai';
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(now).map(({ type, value }) => [type, value]));
const day = `${parts.year}-${parts.month}-${parts.day}`;
const output = `snapshots/${parts.year}/${parts.month}/${day}.json`;
let exists = false;
try { await access(output); exists = true; }
catch (error) { if (error.code !== 'ENOENT') throw error; }

if (exists) {
  console.log(`Already recorded ${day}; nothing to update.`);
} else {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'daily-github-log',
    ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
  };
  async function request(path) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`https://api.github.com${path}`, {
          headers, signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`GitHub HTTP ${response.status} for ${path}`);
        return await response.json();
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  const repositories = [];
  for (let page = 1; ; page++) {
    const batch = await request(`/users/${owner}/repos?type=owner&sort=full_name&per_page=100&page=${page}`);
    repositories.push(...batch.filter(repo => !repo.private && !['daily-github-log', owner].includes(repo.name)));
    if (batch.length < 100) break;
  }
  const snapshots = [];
  for (const repo of repositories) {
    let latestCommit = null;
    if (repo.size > 0) {
      const commits = await request(`/repos/${repo.full_name}/commits?sha=${encodeURIComponent(repo.default_branch)}&per_page=1`);
      if (commits.length) latestCommit = {
        sha: commits[0].sha,
        url: commits[0].html_url,
        committed_at: commits[0].commit.committer.date,
      };
    }
    snapshots.push({
      repository: repo.full_name,
      url: repo.html_url,
      default_branch: repo.default_branch,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      open_issues_and_pull_requests: repo.open_issues_count,
      pushed_at: repo.pushed_at,
      latest_commit: latestCommit,
    });
  }
  const snapshot = {
    date: day,
    time_zone: timeZone,
    captured_at: now.toISOString(),
    generated_by: 'Automated public GitHub repository snapshot; not a manual coding activity log.',
    owner,
    repositories: snapshots,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  console.log(`Recorded ${snapshots.length} public repositories in ${output}`);
}
