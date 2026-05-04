/**
 * Igil notes writer — generates upsell notes and priority tags per qualified lead.
 *
 * Usage:
 *   node notes.js --lead-id "uuid"
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: { 'lead-id': { type: 'string' } },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FEATURES_BY_NICHE = {
  dentist:           ['online booking', 'patient portal', 'before/after gallery', 'multilingual support', 'SEO'],
  'aesthetic clinic':['booking system', 'treatment menu', 'before/after gallery', 'loyalty program', 'SEO'],
  'boutique hotel':  ['booking engine', 'room gallery', 'local guide', 'event/wedding page', 'SEO'],
  'local service':   ['quote form', 'service area map', 'emergency CTA', 'review generation', 'SEO'],
};

function getPriorityTag(lead) {
  if (!lead.has_website && lead.score >= 80) return 'quick-win';
  if (lead.website_status === 'dead' || (lead.has_website && lead.score >= 70)) return 'rebuild-candidate';
  return 'upsell-potential';
}

function estimateRetainer(missingFeatures) {
  const n = missingFeatures.length;
  if (n <= 1)  return '$300–500/mo';
  if (n === 2) return '$500–800/mo';
  if (n === 3) return '$800–1,500/mo';
  return '$1,500–3,000/mo';
}

async function generateImprovementNotes(lead, missingFeatures) {
  const situation = lead.has_website
    ? `They have a ${lead.website_status === 'dead' ? 'broken' : 'basic'} website at ${lead.website}.`
    : 'They have no website.';

  const prompt = `
Write 2–3 short improvement suggestions for ${lead.name}, a ${lead.niche} in ${lead.city}.
${situation}
Missing features: ${missingFeatures.join(', ')}.
Be specific, practical, and reference the niche. No filler.
Return plain text, no bullet points.
`.trim();

  const res = await openai.chat.completions.create({
    model: 'gpt-5.3-codex',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.5,
  });

  return res.choices[0].message.content.trim();
}

async function main() {
  const { 'lead-id': leadId } = args;

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const nicheKey      = lead.niche.toLowerCase();
  const allFeatures   = FEATURES_BY_NICHE[nicheKey] || FEATURES_BY_NICHE['local service'];
  const priorityTag   = getPriorityTag(lead);
  const retainerEst   = estimateRetainer(allFeatures);
  const improvNotes   = await generateImprovementNotes(lead, allFeatures);

  const record = {
    lead_id:             leadId,
    missing_features:    allFeatures,
    improvement_notes:   improvNotes,
    retainer_estimate:   retainerEst,
    priority_tag:        priorityTag,
  };

  const { error } = await supabase
    .from('notes')
    .upsert(record, { onConflict: 'lead_id' });
  if (error) throw error;

  console.log(JSON.stringify({ leadId, priorityTag, retainerEst }));
}

main().catch(err => { console.error(err); process.exit(1); });
