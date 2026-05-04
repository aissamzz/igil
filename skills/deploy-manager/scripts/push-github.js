/**
 * Igil deploy manager — push demo to GitHub.
 *
 * Usage:
 *   node push-github.js --slug "dr-patel-dental" --path "demos/dr-patel-dental" --run-id "uuid"
 */

import { execSync } from 'child_process';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    slug:     { type: 'string' },
    path:     { type: 'string' },
    'run-id': { type: 'string' },
  },
});

const GITHUB_TOKEN    = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

async function createRepoIfNotExists(repoName) {
  const res = await fetch(`https://api.github.com/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: repoName, private: true, auto_init: false }),
  });
  const data = await res.json();
  // 422 = repo already exists — that's fine
  if (!res.ok && res.status !== 422) throw new Error(`GitHub repo creation failed: ${data.message}`);
  return `https://github.com/${GITHUB_USERNAME}/${repoName}`;
}

async function main() {
  const { slug, path: demoPath, 'run-id': runId } = args;
  const repoName = `igil-demo-${runId.slice(0, 8)}`;
  const repoUrl  = await createRepoIfNotExists(repoName);
  const remoteUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${repoName}.git`;

  execSync(`
    cd "${demoPath}" &&
    git init &&
    git checkout -b main &&
    git add . &&
    git commit -m "demo: ${slug}" &&
    git remote add origin ${remoteUrl} &&
    git push -u origin main --force
  `, { encoding: 'utf8', stdio: 'inherit' });

  console.log(JSON.stringify({ repoUrl, slug }));
}

main().catch(err => { console.error(err); process.exit(1); });
