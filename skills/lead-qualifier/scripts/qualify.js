/**
 * Igil lead qualifier
 * Scores unscored leads from a run and marks them qualified/unqualified.
 *
 * Usage:
 *   node qualify.js --run-id "uuid"
 *   node qualify.js --lead-id "uuid"
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    'run-id':  { type: 'string' },
    'lead-id': { type: 'string' },
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const THRESHOLD = parseInt(process.env.SCORE_THRESHOLD, 10) || 60;

const PUBLIC_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

function hasPublicEmail(email) {
  if (!email) return false;
  return PUBLIC_EMAIL_DOMAINS.includes(email.split('@')[1]?.toLowerCase());
}

function score(lead) {
  let s = 0;
  if (!lead.has_website)                    s += 25;
  else if (lead.website_status === 'dead')  s += 20;
  if (hasPublicEmail(lead.email))           s += 10;
  if ((lead.reviews_count || 0) >= 20)      s += 20;
  if ((lead.rating || 0) >= 4.0)            s += 15;
  if (lead.phone)                           s += 10;
  s += 15; // niche match
  if (lead.instagram_url || lead.facebook_url) s += 5;
  return s;
}

async function main() {
  const { 'run-id': runId, 'lead-id': leadId } = args;

  let query = supabase.from('leads').select('*');
  if (runId)  query = query.eq('run_id', runId);
  if (leadId) query = query.eq('id', leadId);

  const { data: leads, error } = await query;
  if (error) throw error;

  let qualified = 0;
  let rejected = 0;

  for (const lead of leads) {
    const s = score(lead);
    const isQualified = s >= THRESHOLD;
    isQualified ? qualified++ : rejected++;

    await supabase
      .from('leads')
      .update({ score: s, qualified: isQualified })
      .eq('id', lead.id);
  }

  const result = { scored: leads.length, qualified, rejected, run_id: runId };
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
