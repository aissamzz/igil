/**
 * Igil notifier — sends Telegram messages to the operator.
 *
 * Usage:
 *   node telegram.js --type demo --lead-id "uuid"
 *   node telegram.js --type summary --run-id "uuid"
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    type:      { type: 'string' },  // 'demo' or 'summary'
    'lead-id': { type: 'string' },
    'run-id':  { type: 'string' },
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

async function send(text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
    if (res.ok) return true;
    if (i < retries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return false;
}

function channelEmoji(channel) {
  return { whatsapp: '📱', email: '📧', instagram: '📸', facebook: '📘' }[channel] || '💬';
}

async function sendDemoNotification(leadId) {
  const { data: lead }     = await supabase.from('leads').select('*').eq('id', leadId).single();
  const { data: demo }     = await supabase.from('demos').select('*').eq('lead_id', leadId).single();
  const { data: outreach } = await supabase.from('outreach').select('*').eq('lead_id', leadId);

  const lines = [
    `✅ <b>${lead.name}</b>`,
    `${lead.city} · ${lead.niche} · Score: ${lead.score}`,
    '',
    `🌐 ${demo.demo_url}`,
  ];

  const channels = ['whatsapp', 'email', 'instagram', 'facebook'];
  for (const channel of channels) {
    const msg = outreach?.find(o => o.channel === channel);
    if (msg) {
      lines.push('');
      lines.push(`${channelEmoji(channel)} <b>${channel.charAt(0).toUpperCase() + channel.slice(1)}:</b>`);
      lines.push(msg.message);
    }
  }

  return send(lines.join('\n'));
}

async function sendRunSummary(runId) {
  const { data: run } = await supabase.from('runs').select('*').eq('id', runId).single();

  const text = [
    `🏁 <b>Run Complete</b> · ${new Date(run.completed_at).toLocaleDateString('en-US')}`,
    '',
    `Niches: ${run.niches.join(', ')}`,
    `Scraped: ${run.leads_scraped} | Qualified: ${run.leads_qualified} | Deployed: ${run.demos_created} | Failed: ${run.demos_failed}`,
    '',
    `Ready for outreach: ${run.demos_created} leads`,
  ].join('\n');

  return send(text);
}

async function main() {
  const { type, 'lead-id': leadId, 'run-id': runId } = args;

  let ok;
  if (type === 'demo')    ok = await sendDemoNotification(leadId);
  if (type === 'summary') ok = await sendRunSummary(runId);

  if (!ok) {
    console.error('Telegram notification failed after retries');
    process.exit(1);
  }
  console.log('Notification sent');
}

main().catch(err => { console.error(err); process.exit(1); });
