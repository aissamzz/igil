/**
 * Igil outreach writer — generates personalized messages per channel via GPT-4o.
 * Detects available channels from lead data and writes to Supabase outreach table.
 *
 * Usage:
 *   node write.js --lead-id "uuid" --demo-url "https://slug.murusmare.com"
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    'lead-id':  { type: 'string' },
    'demo-url': { type: 'string' },
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TEMPLATES = readFileSync(join(__dirname, '../assets/message-templates.md'), 'utf8');

function getSituation(lead) {
  if (!lead.has_website) return 'have no website';
  if (lead.website_status === 'dead') return `have a broken website (${lead.website})`;
  return 'have a basic website that could be improved';
}

function detectChannels(lead) {
  const channels = [];
  if (lead.phone)         channels.push('whatsapp');
  if (lead.email)         channels.push('email');
  if (lead.instagram_url) channels.push('instagram');
  if (lead.facebook_url)  channels.push('facebook');
  return channels;
}

async function generateMessage(lead, channel, demoUrl) {
  const situation = getSituation(lead);
  const isEmail   = channel === 'email';

  const prompt = `
You are writing a cold outreach message on behalf of Murus Mare, a premium digital agency.

Business: ${lead.name}
Type: ${lead.niche}
City: ${lead.city}
Situation: They ${situation}
Demo we built: ${demoUrl}
Channel: ${channel}

Rules:
- ${isEmail ? 'Start with: Subject: [subject line]\n\nThen the message body.' : 'One paragraph, no subject line.'}
- Max 5 sentences
- Line 1: address business by name
- Line 2: share the demo URL
- Mention 1 specific thing about their situation
- End with: — Aissam, Murus Mare
- No openers like "I came across" or "I noticed you"
- No urgency language
- Tone: direct, professional, brief

Reference tone examples from these templates:
${TEMPLATES}
`.trim();

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  });

  return res.choices[0].message.content.trim();
}

async function main() {
  const { 'lead-id': leadId, 'demo-url': demoUrl } = args;

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const { data: demo } = await supabase.from('demos').select('id').eq('lead_id', leadId).single();
  if (!demo) throw new Error(`No demo found for lead: ${leadId}`);

  const channels  = detectChannels(lead);
  const generated = [];

  for (const channel of channels) {
    const message = await generateMessage(lead, channel, demoUrl);
    generated.push({ lead_id: leadId, demo_id: demo.id, channel, message });
  }

  if (generated.length > 0) {
    const { error } = await supabase
      .from('outreach')
      .upsert(generated, { onConflict: 'lead_id,channel' });
    if (error) throw error;
  }

  console.log(JSON.stringify({ leadId, channels, count: generated.length }));
  return generated;
}

main().catch(err => { console.error(err); process.exit(1); });
export { main as write };
