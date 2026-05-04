/**
 * Igil lead scraper — wraps Barty-Bart google-maps-scraper
 * Falls back to Apify apify/google-maps-scraper actor on failure.
 *
 * Usage:
 *   node scrape.js --niche "dentist" --city "Austin, TX" --run-id "uuid" --limit 100
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    niche:    { type: 'string' },
    city:     { type: 'string' },
    'run-id': { type: 'string' },
    limit:    { type: 'string', default: '100' },
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const FRANCHISE_KEYWORDS = ['mcdonald', 'starbucks', 'walmart', 'cvs', 'walgreens', 'aspen dental', 'heartland dental'];
const PUBLIC_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

async function getExistingPlaceIds() {
  const { data } = await supabase.from('leads').select('place_id');
  return new Set((data || []).map(r => r.place_id));
}

function isFranchise(name) {
  const lower = name.toLowerCase();
  return FRANCHISE_KEYWORDS.some(kw => lower.includes(kw));
}

function hasPublicEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return PUBLIC_EMAIL_DOMAINS.includes(domain);
}

function scoreLead(lead) {
  let score = 0;
  if (!lead.website)                    score += 25;
  else if (lead.website_status === 'dead') score += 20;
  if (hasPublicEmail(lead.email))       score += 10;
  if ((lead.reviews_count || 0) >= 20)  score += 20;
  if ((lead.rating || 0) >= 4.0)        score += 15;
  if (lead.phone)                       score += 10;
  score += 15; // niche match (already filtered by query)
  if (lead.instagram_url || lead.facebook_url) score += 5;
  return score;
}

async function scrapeWithBartyBart(niche, city, limit) {
  // Invoke Barty-Bart scraper — adjust path to your local install
  const query = `${niche} in ${city}`;
  const output = execSync(
    `node ../google-maps-scraper/index.js --query "${query}" --limit ${limit} --json`,
    { encoding: 'utf8', timeout: 120_000 }
  );
  return JSON.parse(output);
}

async function scrapeWithApify(niche, city, limit) {
  // Start Apify actor run and wait for results
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/apify~google-maps-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchStrings: [`${niche} in ${city}`],
        maxCrawledPlaces: limit,
        language: 'en',
        countryCode: 'us',
      }),
      signal: AbortSignal.timeout(300_000), // Apify runs can take a few minutes
    }
  );
  if (!runRes.ok) throw new Error(`Apify error: ${await runRes.text()}`);
  const items = await runRes.json();

  // Normalize Apify output to match Barty-Bart field names
  return items.map(r => ({
    place_id:      r.placeId,
    name:          r.title,
    address:       r.address,
    phone:         r.phone,
    website:       r.website || null,
    email:         r.email || null,
    rating:        r.totalScore || null,
    reviews_count: r.reviewsCount || 0,
    instagram_url: r.socialMediaLinks?.find(l => l.includes('instagram')) || null,
    facebook_url:  r.socialMediaLinks?.find(l => l.includes('facebook')) || null,
  }));
}

async function checkWebsiteStatus(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    return res.ok ? 'live' : 'dead';
  } catch {
    return 'dead';
  }
}

async function main() {
  const { niche, city, 'run-id': runId, limit } = args;
  const maxLeads = parseInt(limit, 10);

  console.log(`Scraping: ${niche} in ${city} (limit: ${maxLeads})`);

  const existingIds = await getExistingPlaceIds();

  let rawResults;
  try {
    rawResults = await scrapeWithBartyBart(niche, city, maxLeads);
  } catch (err) {
    console.warn('Barty-Bart failed, falling back to Apify:', err.message);
    rawResults = await scrapeWithApify(niche, city, maxLeads);
  }

  const leads = [];
  for (const r of rawResults) {
    if (isFranchise(r.name || '')) continue;
    if (existingIds.has(r.place_id)) continue;

    const websiteStatus = await checkWebsiteStatus(r.website);
    const lead = {
      run_id:                 runId,
      place_id:               r.place_id,
      name:                   r.name,
      niche,
      city,
      address:                r.address,
      phone:                  r.phone,
      website:                r.website || null,
      has_website:            !!r.website,
      website_status:         websiteStatus,
      email:                  r.email || null,
      has_professional_email: r.email ? !hasPublicEmail(r.email) : null,
      rating:                 r.rating || null,
      reviews_count:          r.reviews_count || 0,
      instagram_url:          r.instagram_url || null,
      facebook_url:           r.facebook_url || null,
      score:                  0,
      qualified:              false,
    };
    lead.score = scoreLead(lead);
    lead.qualified = lead.score >= (parseInt(process.env.SCORE_THRESHOLD, 10) || 60);
    leads.push(lead);
  }

  if (leads.length > 0) {
    const { error } = await supabase.from('leads').upsert(leads, { onConflict: 'place_id' });
    if (error) throw error;
  }

  const result = {
    scraped: rawResults.length,
    inserted: leads.length,
    skipped_duplicates: rawResults.length - leads.length,
    run_id: runId,
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
