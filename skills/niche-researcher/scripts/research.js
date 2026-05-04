/**
 * Igil niche researcher — searches Brave for top competitor sites per niche,
 * extracts design patterns via GPT-4o, and caches results in Supabase.
 *
 * Usage:
 *   node research.js --niche "dentist" --city "Austin, TX"
 *   node research.js --niche "dentist" --city "Austin, TX" --force
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
    niche:  { type: 'string' },
    city:   { type: 'string' },
    force:  { type: 'boolean', default: false },
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NICHE_PATTERNS = readFileSync(join(__dirname, '../references/niche-patterns.md'), 'utf8');
const CACHE_DAYS     = 7;

async function getCached(niche, city) {
  const cutoff = new Date(Date.now() - CACHE_DAYS * 86_400_000).toISOString();
  const { data } = await supabase
    .from('niche_insights')
    .select('*')
    .eq('niche', niche)
    .eq('city', city)
    .gte('researched_at', cutoff)
    .single();
  return data;
}

async function braveSearch(query) {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    { headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY } }
  );
  if (!res.ok) throw new Error(`Brave API error: ${res.status}`);
  const data = await res.json();
  return (data.web?.results || []).slice(0, 3).map(r => r.url);
}

async function fetchPageText(url) {
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip tags to get plain text (rough but good enough for pattern extraction)
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000);
  } catch {
    return null;
  }
}

async function extractPatterns(niche, urls, pageTexts) {
  const content = urls
    .map((url, i) => pageTexts[i] ? `### ${url}\n${pageTexts[i]}` : `### ${url}\n(could not fetch)`)
    .join('\n\n');

  const prompt = `
You are analyzing competitor websites for the "${niche}" niche to inform demo site design.

Analyze these pages and extract a JSON object with these fields:
- layout_patterns: object with section_order (array) and hero_style (string)
- common_services: array of 4-6 service names typical for this niche
- tone: one sentence describing the copywriting style
- color_palette: array of 2-3 dominant hex color codes (estimate from description)
- ctas: array of 2-4 call-to-action phrases used

Fallback to sensible defaults for this niche if content is insufficient.
Return ONLY valid JSON, no markdown.

Reference defaults from this file if needed:
${NICHE_PATTERNS}

Pages:
${content}
`.trim();

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(res.choices[0].message.content);
}

async function run({ niche, city, force = false } = args) {
  if (!force) {
    const cached = await getCached(niche, city);
    if (cached) {
      console.log(`Using cached niche insights for ${niche} in ${city}`);
      return cached;
    }
  }

  console.log(`Researching: ${niche} in ${city}`);
  let urls      = [];
  let patterns  = {};

  try {
    urls          = await braveSearch(`best ${niche} website ${city}`);
    const texts   = await Promise.all(urls.map(fetchPageText));
    patterns      = await extractPatterns(niche, urls, texts);
  } catch (err) {
    console.warn('Research failed, using niche defaults:', err.message);
    // GPT-4o will use NICHE_PATTERNS as fallback
    patterns = await extractPatterns(niche, [], []);
  }

  const record = {
    niche,
    city,
    competitor_urls:  urls,
    layout_patterns:  patterns.layout_patterns  || {},
    common_services:  patterns.common_services  || [],
    tone:             patterns.tone             || '',
    color_palette:    patterns.color_palette    || [],
    ctas:             patterns.ctas             || [],
    researched_at:    new Date().toISOString(),
  };

  const { error } = await supabase
    .from('niche_insights')
    .upsert(record, { onConflict: 'niche,city' });
  if (error) throw error;

  console.log(JSON.stringify({ niche, city, urls }));
  return record;
}

run().catch(err => { console.error(err); process.exit(1); });
export { run };
