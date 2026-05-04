/**
 * Igil demo builder — generates a Next.js + Tailwind site via ChatGPT Codex (coding-agent skill).
 *
 * Usage:
 *   node generate.js --lead-id "uuid" --niche "dentist"
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    'lead-id': { type: 'string' },
    niche:     { type: 'string' },
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\b(the|llc|inc|co|&)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function loadTemplate(niche) {
  const templateMap = {
    'dentist':           'dentist.jsx',
    'aesthetic clinic':  'aesthetic-clinic.jsx',
    'boutique hotel':    'boutique-hotel.jsx',
    'local service':     'local-service.jsx',
  };
  const file = templateMap[niche.toLowerCase()] || 'local-service.jsx';
  const path = join(__dirname, '../assets/templates', file);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

async function getLeadAndInsights(leadId, niche) {
  const [{ data: lead }, { data: insights }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', leadId).single(),
    supabase.from('niche_insights').select('*').eq('niche', niche).order('researched_at', { ascending: false }).limit(1).single(),
  ]);
  return { lead, insights };
}

function buildPrompt(lead, insights, template) {
  const services = insights?.common_services?.slice(0, 6).join(', ') || 'General Services';
  const cta = insights?.ctas?.[0] || 'Contact Us';
  const colors = insights?.color_palette?.slice(0, 3).join(', ') || '#FFFFFF, #1B4F8A, #E8F4FD';

  return `
You are generating a complete, production-ready Next.js + Tailwind CSS single-page website for a real business.

## Business Data
- Name: ${lead.name}
- Type: ${lead.niche}
- City: ${lead.city}
- Address: ${lead.address || 'N/A'}
- Phone: ${lead.phone || 'N/A'}
- Email: ${lead.email || 'N/A'}
- Rating: ${lead.rating || 'N/A'} (${lead.reviews_count || 0} reviews)

## Design Instructions
- Colors: ${colors}
- Services to list: ${services}
- Primary CTA: "${cta}"
- Tone: ${insights?.tone || 'professional, trustworthy'}

## Structure (single page, in this order)
1. Hero: business name, tagline, CTA button
2. About: 2–3 sentences (generate from business type and city)
3. Services: 3–6 service cards
4. Reviews: 3 placeholder review cards (5 stars, realistic names)
5. Contact: phone, address, Google Maps embed link
6. Footer: social links placeholder + Murus Mare watermark

## Footer Watermark (required, do not remove)
<p className="text-xs text-gray-300 opacity-40 mt-4">
  Site by <a href="https://murusmare.com" className="underline">Murus Mare</a>
</p>

## Technical Requirements
- File: pages/index.jsx only
- Framework: Next.js with output: 'export' in next.config.js
- Styling: Tailwind CSS only — no custom CSS files
- No TypeScript, no external image dependencies
- No Lorem Ipsum — all text must be realistic for this business
- Include package.json with next, react, react-dom, tailwindcss
- Include next.config.js, tailwind.config.js, postcss.config.js

## Template Reference
Use this as structural reference:
${template}

Output the full project as separate files. Start each file with: // FILE: {filename}
`.trim();
}

async function validateBuild(outputDir) {
  try {
    execSync(`cd ${outputDir} && npm install --silent && npx next build`, {
      encoding: 'utf8',
      timeout: 120_000,
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { 'lead-id': leadId, niche } = args;

  const { lead, insights } = await getLeadAndInsights(leadId, niche);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const slug = slugify(lead.name);
  const outputDir = join(process.cwd(), 'demos', slug);
  const template = loadTemplate(niche);
  const prompt = buildPrompt(lead, insights, template);

  console.log(`Generating demo for: ${lead.name} (${slug})`);

  // Invoke coding-agent skill (OpenClaw built-in)
  // The coding-agent writes files to the output directory
  execSync(
    `openclaw skill run coding-agent --background --prompt "${prompt.replace(/"/g, '\\"')}" --output-dir "${outputDir}"`,
    { encoding: 'utf8', timeout: 300_000, stdio: 'inherit' }
  );

  const valid = await validateBuild(outputDir);
  if (!valid) {
    console.warn('Build failed on first attempt — retrying with simplified prompt');
    const simplePrompt = `Generate a minimal Next.js + Tailwind site for ${lead.name}, a ${niche} in ${lead.city}. Phone: ${lead.phone || 'N/A'}. Use ${insights?.ctas?.[0] || 'Contact Us'} as CTA. Include Murus Mare watermark in footer.`;
    execSync(
      `openclaw skill run coding-agent --background --prompt "${simplePrompt}" --output-dir "${outputDir}"`,
      { encoding: 'utf8', timeout: 300_000, stdio: 'inherit' }
    );
    const retryValid = await validateBuild(outputDir);
    if (!retryValid) throw new Error(`Demo build failed after retry for ${lead.name}`);
  }

  console.log(JSON.stringify({ slug, outputDir, leadId }));
}

main().catch(err => { console.error(err); process.exit(1); });
