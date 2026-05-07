-- ============================================================
-- Igil / Murus Mare — Supabase Database Migration
-- File: 001_igil_initial_schema.sql
-- Run this in the Supabase SQL editor or via CLI:
--   supabase db push
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type lead_status as enum (
  'scraped',
  'qualified',
  'researched',
  'site_built',
  'deployed',
  'notified',
  'outreach_sent',
  'responded',
  'won',
  'lost',
  'rejected'
);

create type outreach_channel as enum (
  'email',
  'sms',
  'whatsapp',
  'phone',
  'in_person'
);

create type outreach_direction as enum (
  'outbound',
  'inbound'
);

create type build_status as enum (
  'pending',
  'building',
  'ready_to_deploy',
  'live',
  'failed',
  'github_push_failed'
);

-- ============================================================
-- BUSINESSES (the spine of the entire pipeline)
-- ============================================================

create table public.businesses (
  -- Identity
  id                uuid        primary key default gen_random_uuid(),
  place_id          text        unique not null,       -- Google Maps Place ID (dedup key)

  -- Business info
  name              text        not null,
  niche             text        not null,
  city              text        not null,
  state             text,
  country           text        not null default 'US',
  phone             text,
  email             text,
  address           text,
  rating            numeric(2,1),                      -- 0.0–5.0
  review_count      int         not null default 0,
  google_maps_url   text,

  -- Enriched data
  social_media      jsonb       not null default '{}'::jsonb,
  photos            jsonb       not null default '[]'::jsonb,
  has_website       boolean     not null default false,
  website_url       text,

  -- Pipeline fields
  lead_score        int         not null default 0,    -- 0–100
  status            lead_status not null default 'scraped',
  notes             text,                              -- upsell hints, owner name, etc.

  -- Build & deploy fields
  prompt_used       text,                              -- full prompt sent to Codex
  github_repo_url   text,
  coolify_app_uuid  text,
  deployed_url      text,

  -- Outreach
  outreach_email    text,                              -- full email (subject + body)
  outreach_sms      text,                              -- SMS/WhatsApp message

  -- Ownership (for future multi-user dashboard)
  owner_user_id     uuid references auth.users(id),

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes
create index idx_businesses_status       on public.businesses (status);
create index idx_businesses_niche_city   on public.businesses (niche, city);
create index idx_businesses_lead_score   on public.businesses (lead_score desc);
create index idx_businesses_no_website   on public.businesses (has_website) where has_website = false;
create index idx_businesses_owner        on public.businesses (owner_user_id);
create index idx_businesses_created_at   on public.businesses (created_at desc);
create index idx_businesses_place_id     on public.businesses (place_id); -- for fast dedup
create index idx_businesses_deployed     on public.businesses (status) where status = 'deployed';
create index idx_businesses_priority     on public.businesses (lead_score desc, status)
  where status in ('qualified', 'researched');

-- Auto-update updated_at
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- NICHE RESEARCH (cached per niche+city+state, refreshed every 7 days)
-- ============================================================

create table public.niche_research (
  id            uuid        primary key default gen_random_uuid(),

  -- Lookup key
  niche         text        not null,
  city          text        not null,
  state         text,

  -- Research output
  top_sites     jsonb       not null default '[]'::jsonb,  -- [{url, title, analysis}, ...]
  design_notes  text,        -- LLM-summarised aesthetic patterns across top 3 sites
  services      jsonb       not null default '[]'::jsonb,  -- common services in this niche
  pricing       jsonb       not null default '{}'::jsonb,  -- pricing patterns observed

  -- Meta
  brave_query   text,
  raw_response  jsonb,

  -- Timestamps
  created_at    timestamptz not null default now(),

  -- Unique constraint for cache lookup
  unique (niche, city, state)
);

create index idx_niche_research_lookup on public.niche_research (niche, city, state);
create index idx_niche_research_age    on public.niche_research (created_at desc);

-- ============================================================
-- SITE BUILDS (one row per build attempt, supports re-builds)
-- ============================================================

create table public.site_builds (
  id                 uuid        primary key default gen_random_uuid(),
  business_id        uuid        not null references public.businesses (id) on delete cascade,

  -- Build info
  template_used      text        not null default 'template-business-v1',
  prompt             text        not null,
  build_version      int         not null default 1,      -- increments on rebuild

  -- GitHub
  github_repo_url    text,
  github_commit_sha  text,

  -- Coolify
  coolify_app_uuid   text,
  deployed_url       text,

  -- Status
  build_status       build_status not null default 'pending',
  build_log          text,                                 -- last 5000 chars of build output

  -- Quality
  lighthouse_score   jsonb,                               -- {"perf":97,"a11y":100,"seo":100}
  formspree_form_id  text,

  -- Timestamps
  created_at         timestamptz not null default now()
);

create index idx_site_builds_business on public.site_builds (business_id);
create index idx_site_builds_status   on public.site_builds (build_status);
create index idx_site_builds_created  on public.site_builds (created_at desc);

-- ============================================================
-- OUTREACH MESSAGES (full conversation history per lead)
-- ============================================================

create table public.outreach_messages (
  id            uuid              primary key default gen_random_uuid(),
  business_id   uuid              not null references public.businesses (id) on delete cascade,

  -- Message
  channel       outreach_channel  not null,
  direction     outreach_direction not null default 'outbound',
  subject       text,                                    -- email only
  body          text              not null,

  -- Tracking
  sent_at       timestamptz,
  delivered_at  timestamptz,
  opened_at     timestamptz,
  replied_at    timestamptz,
  reply_body    text,
  external_id   text,                                    -- provider message ID

  -- Timestamps
  created_at    timestamptz not null default now()
);

create index idx_outreach_business on public.outreach_messages (business_id);
create index idx_outreach_channel  on public.outreach_messages (channel);
create index idx_outreach_sent     on public.outreach_messages (sent_at desc nulls last);
create index idx_outreach_replied  on public.outreach_messages (replied_at) where replied_at is not null;

-- ============================================================
-- DO NOT CONTACT LIST
-- ============================================================

create table public.do_not_contact (
  id          uuid        primary key default gen_random_uuid(),
  place_id    text        unique,
  email       text,
  phone       text,
  reason      text,
  added_at    timestamptz not null default now()
);

create index idx_dnc_place_id on public.do_not_contact (place_id);
create index idx_dnc_email    on public.do_not_contact (email);
create index idx_dnc_phone    on public.do_not_contact (phone);

-- ============================================================
-- SCRAPE QUEUE (managed in file system but mirrored to DB)
-- ============================================================

create table public.scrape_queue (
  id          uuid        primary key default gen_random_uuid(),
  niche       text        not null,
  city        text        not null,
  state       text,
  country     text        not null default 'US',
  status      text        not null default 'pending',  -- pending|running|done|failed
  run_at      timestamptz,
  completed_at timestamptz,
  businesses_found int   default 0,
  businesses_qualified int default 0,
  error_log   text,
  created_at  timestamptz not null default now()
);

create index idx_queue_status on public.scrape_queue (status, created_at);

-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- Pipeline overview (for Aissam's dashboard)
create or replace view public.pipeline_summary as
select
  status,
  count(*)           as total,
  avg(lead_score)    as avg_score,
  max(lead_score)    as max_score,
  count(*) filter (where lead_score >= 70) as priority_count
from public.businesses
group by status
order by
  case status
    when 'scraped'       then 1
    when 'qualified'     then 2
    when 'researched'    then 3
    when 'site_built'    then 4
    when 'deployed'      then 5
    when 'notified'      then 6
    when 'outreach_sent' then 7
    when 'responded'     then 8
    when 'won'           then 9
    when 'lost'          then 10
    when 'rejected'      then 11
  end;

-- Priority build queue (businesses ready to build, ordered by score)
create or replace view public.build_queue as
select
  b.id,
  b.name,
  b.niche,
  b.city,
  b.state,
  b.lead_score,
  b.phone,
  b.email,
  b.social_media,
  b.photos,
  b.notes,
  b.prompt_used,
  b.deployed_url,
  b.created_at,
  nr.top_sites      as niche_top_sites,
  nr.design_notes   as niche_design_notes,
  nr.services       as niche_services
from public.businesses b
left join public.niche_research nr
  on nr.niche = b.niche
  and nr.city = b.city
  and (nr.state = b.state or (nr.state is null and b.state is null))
  and nr.created_at > now() - interval '7 days'
where b.status = 'researched'
  and b.lead_score >= 60
order by b.lead_score desc;

-- Revenue tracker (won clients)
create or replace view public.revenue_summary as
select
  count(*)                as total_clients,
  count(*) * 249          as monthly_revenue_usd,
  count(*) * 249 * 12     as annual_revenue_usd,
  50 - count(*)           as clients_to_goal
from public.businesses
where status = 'won';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.businesses        enable row level security;
alter table public.niche_research    enable row level security;
alter table public.site_builds       enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.do_not_contact    enable row level security;
alter table public.scrape_queue      enable row level security;

-- BUSINESSES: owner sees only their own rows
create policy "owner_select" on public.businesses
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "owner_insert" on public.businesses
  for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

create policy "owner_update" on public.businesses
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy "owner_delete" on public.businesses
  for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

-- SITE BUILDS: accessible if you own the parent business
create policy "owner_site_builds" on public.site_builds
  for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = site_builds.business_id
      and b.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = site_builds.business_id
      and b.owner_user_id = (select auth.uid())
    )
  );

-- OUTREACH MESSAGES: same pattern
create policy "owner_outreach" on public.outreach_messages
  for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = outreach_messages.business_id
      and b.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = outreach_messages.business_id
      and b.owner_user_id = (select auth.uid())
    )
  );

-- NICHE RESEARCH: readable by all authenticated, writable only via service role
create policy "auth_read_niche_research" on public.niche_research
  for select to authenticated
  using (true);

-- DO NOT CONTACT: full access for authenticated
create policy "owner_dnc" on public.do_not_contact
  for all to authenticated
  using (true)
  with check (true);

-- SCRAPE QUEUE: full access for authenticated
create policy "owner_queue" on public.scrape_queue
  for all to authenticated
  using (true)
  with check (true);

-- ============================================================
-- SEED: Initial scrape queue (US priority targets)
-- ============================================================

insert into public.scrape_queue (niche, city, state, country) values
  -- High-density no-website niches × sweet-spot metros
  ('plumber',      'Phoenix',      'AZ', 'US'),
  ('plumber',      'Mesa',         'AZ', 'US'),
  ('plumber',      'Tampa',        'FL', 'US'),
  ('plumber',      'Orlando',      'FL', 'US'),
  ('plumber',      'Charlotte',    'NC', 'US'),
  ('hvac',         'Phoenix',      'AZ', 'US'),
  ('hvac',         'Tampa',        'FL', 'US'),
  ('hvac',         'Houston',      'TX', 'US'),
  ('electrician',  'Phoenix',      'AZ', 'US'),
  ('electrician',  'Charlotte',    'NC', 'US'),
  ('salon',        'Phoenix',      'AZ', 'US'),
  ('salon',        'Las Vegas',    'NV', 'US'),
  ('salon',        'Nashville',    'TN', 'US'),
  ('barbershop',   'Phoenix',      'AZ', 'US'),
  ('barbershop',   'Atlanta',      'GA', 'US'),
  ('auto repair',  'Phoenix',      'AZ', 'US'),
  ('auto repair',  'Tampa',        'FL', 'US'),
  ('landscaping',  'Phoenix',      'AZ', 'US'),
  ('landscaping',  'Nashville',    'TN', 'US'),
  ('cleaning',     'Phoenix',      'AZ', 'US'),
  ('cleaning',     'Charlotte',    'NC', 'US'),
  ('roofer',       'Phoenix',      'AZ', 'US'),
  ('roofer',       'Dallas',       'TX', 'US'),
  ('pest control', 'Phoenix',      'AZ', 'US'),
  ('pest control', 'Tampa',        'FL', 'US');

-- ============================================================
-- END OF MIGRATION
-- ============================================================
