-- Igil — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor

-- ──────────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────
-- Helper: auto-update updated_at
-- ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ──────────────────────────────────────────────
-- runs
-- ──────────────────────────────────────────────
create table runs (
  id              uuid primary key default uuid_generate_v4(),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  niches          text[] not null default '{}',
  cities          text[] not null default '{}',
  leads_scraped   int not null default 0,
  leads_qualified int not null default 0,
  demos_created   int not null default 0,
  demos_failed    int not null default 0,
  status          text not null default 'running'
                    check (status in ('running', 'completed', 'failed')),
  updated_at      timestamptz not null default now()
);

create trigger runs_updated_at
  before update on runs
  for each row execute function set_updated_at();

-- ──────────────────────────────────────────────
-- leads
-- ──────────────────────────────────────────────
create table leads (
  id                      uuid primary key default uuid_generate_v4(),
  run_id                  uuid references runs(id) on delete set null,
  place_id                text unique not null,           -- Google Maps place ID (dedup key)
  name                    text not null,
  niche                   text not null,
  city                    text not null,
  address                 text,
  phone                   text,
  website                 text,
  has_website             bool not null default false,
  website_status          text check (website_status in ('live', 'dead', null)),
  email                   text,
  has_professional_email  bool,
  rating                  numeric(3,1),
  reviews_count           int,
  instagram_url           text,
  facebook_url            text,
  score                   int not null default 0,
  qualified               bool not null default false,
  processed_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index leads_run_id_idx    on leads(run_id);
create index leads_niche_idx     on leads(niche);
create index leads_qualified_idx on leads(qualified);
create index leads_score_idx     on leads(score desc);

create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ──────────────────────────────────────────────
-- demos
-- ──────────────────────────────────────────────
create table demos (
  id                  uuid primary key default uuid_generate_v4(),
  lead_id             uuid unique references leads(id) on delete cascade, -- one demo per lead
  run_id              uuid references runs(id) on delete set null,
  demo_url            text,
  repo_url            text,
  deployment_status   text not null default 'pending'
                        check (deployment_status in ('pending', 'live', 'failed')),
  deployed_at         timestamptz,
  error_message       text,
  updated_at          timestamptz not null default now()
);

create index demos_run_id_idx           on demos(run_id);
create index demos_deployment_status_idx on demos(deployment_status);

create trigger demos_updated_at
  before update on demos
  for each row execute function set_updated_at();

-- ──────────────────────────────────────────────
-- outreach
-- ──────────────────────────────────────────────
create table outreach (
  id            uuid primary key default uuid_generate_v4(),
  lead_id       uuid not null references leads(id) on delete cascade,
  demo_id       uuid references demos(id) on delete cascade,
  channel       text not null check (channel in ('whatsapp', 'email', 'instagram', 'facebook')),
  message       text not null,
  generated_at  timestamptz not null default now(),
  sent_at       timestamptz,
  unique (lead_id, channel)               -- one message per lead per channel
);

create index outreach_lead_id_idx on outreach(lead_id);

-- ──────────────────────────────────────────────
-- notes
-- ──────────────────────────────────────────────
create table notes (
  id                  uuid primary key default uuid_generate_v4(),
  lead_id             uuid unique references leads(id) on delete cascade,
  missing_features    text[] not null default '{}',
  improvement_notes   text,
  retainer_estimate   text,
  priority_tag        text check (priority_tag in ('quick-win', 'upsell-potential', 'rebuild-candidate')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger notes_updated_at
  before update on notes
  for each row execute function set_updated_at();

-- ──────────────────────────────────────────────
-- niche_insights
-- ──────────────────────────────────────────────
create table niche_insights (
  id                uuid primary key default uuid_generate_v4(),
  niche             text not null,
  city              text not null,
  competitor_urls   text[] not null default '{}',
  layout_patterns   jsonb,
  common_services   text[] not null default '{}',
  tone              text,
  color_palette     text[] not null default '{}',
  ctas              text[] not null default '{}',
  researched_at     timestamptz not null default now(),
  unique (niche, city)                    -- one insight record per niche+city combination
);

create index niche_insights_niche_idx on niche_insights(niche);
