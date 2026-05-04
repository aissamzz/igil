/**
 * Igil deploy manager — deploy to Coolify and assign subdomain.
 *
 * Usage:
 *   node deploy-coolify.js --slug "dr-patel-dental" --repo-url "https://github.com/..." --lead-id "uuid" --run-id "uuid"
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    slug:       { type: 'string' },
    'repo-url': { type: 'string' },
    'lead-id':  { type: 'string' },
    'run-id':   { type: 'string' },
  },
});

const supabase      = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COOLIFY_BASE  = process.env.COOLIFY_BASE_URL;
const COOLIFY_TOKEN = process.env.COOLIFY_API_TOKEN;

function coolifyHeaders() {
  return {
    Authorization: `Bearer ${COOLIFY_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function createApp(slug, repoUrl) {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/applications`, {
    method: 'POST',
    headers: coolifyHeaders(),
    body: JSON.stringify({
      name:           `igil-${slug}`,
      git_repository: repoUrl,
      git_branch:     'main',
      build_command:  'npx next build',
      publish_directory: 'out',
      fqdn:           `https://${slug}.murusmare.com`,
    }),
  });
  if (!res.ok) throw new Error(`Coolify app creation failed: ${await res.text()}`);
  return (await res.json()).id;
}

async function triggerDeploy(appId) {
  const res = await fetch(`${COOLIFY_BASE}/api/v1/deploy`, {
    method: 'POST',
    headers: coolifyHeaders(),
    body: JSON.stringify({ uuid: appId }),
  });
  if (!res.ok) throw new Error(`Coolify deploy trigger failed: ${await res.text()}`);
}

async function pollUntilLive(appId, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 10_000));
    const res  = await fetch(`${COOLIFY_BASE}/api/v1/applications/${appId}`, { headers: coolifyHeaders() });
    const data = await res.json();
    if (data.status === 'running') return true;
    if (data.status === 'failed')  return false;
  }
  return false;
}

async function verifyLive(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const { slug, 'repo-url': repoUrl, 'lead-id': leadId, 'run-id': runId } = args;
  const demoUrl = `https://${slug}.murusmare.com`;

  // Insert pending demo record
  const { data: demo } = await supabase
    .from('demos')
    .insert({ lead_id: leadId, run_id: runId, demo_url: demoUrl, deployment_status: 'pending' })
    .select()
    .single();

  let deploymentStatus = 'failed';
  let errorMessage     = null;

  try {
    const appId = await createApp(slug, repoUrl);
    await triggerDeploy(appId);
    const live = await pollUntilLive(appId);

    if (live) {
      // Verify HTTP 200
      const ok = await verifyLive(demoUrl) || await verifyLive(demoUrl); // retry once
      deploymentStatus = ok ? 'live' : 'failed';
      if (!ok) errorMessage = 'Site did not return HTTP 200 after deployment';
    } else {
      errorMessage = 'Coolify deployment failed or timed out';
    }
  } catch (err) {
    errorMessage = err.message;
  }

  await supabase
    .from('demos')
    .update({
      deployment_status: deploymentStatus,
      deployed_at:       deploymentStatus === 'live' ? new Date().toISOString() : null,
      repo_url:          repoUrl,
      error_message:     errorMessage,
    })
    .eq('id', demo.id);

  console.log(JSON.stringify({ slug, demoUrl, deploymentStatus, errorMessage }));

  if (deploymentStatus === 'failed') process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
