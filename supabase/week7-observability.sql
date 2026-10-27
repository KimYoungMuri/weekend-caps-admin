-- Week 7: prompt chains, LLM config, observability, signup allowlist
-- Run once in Supabase → SQL Editor (same project as Weekend Caps). Safe to re-run.

-- 0) Superadmin helper + lock down is_superadmin so users can't promote themselves
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_superadmin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, first_name, last_name, avatar_url, updated_at) on public.profiles to authenticated;
grant update (first_name, last_name, avatar_url, updated_at) on public.profiles to authenticated;

-- 1) LLM providers + models
create table if not exists public.llm_providers (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  base_url text,
  api_key_env text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.llm_models (
  id bigint generated always as identity primary key,
  provider_id bigint not null references public.llm_providers (id) on delete cascade,
  model_id text not null,
  display_name text not null,
  temperature numeric(3, 2) not null default 0.9 check (temperature between 0 and 2),
  max_output_tokens integer not null default 256 check (max_output_tokens > 0),
  priority integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_id, model_id)
);

-- 2) Prompt chains, their steps, and the mix (traffic weight per chain)
create table if not exists public.prompt_chains (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_steps (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.prompt_chains (id) on delete cascade,
  step_order integer not null,
  name text not null,
  instruction text not null,
  model_id bigint references public.llm_models (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (chain_id, step_order)
);

create table if not exists public.prompt_chain_mix (
  id bigint generated always as identity primary key,
  chain_id bigint not null unique references public.prompt_chains (id) on delete cascade,
  weight integer not null default 0 check (weight between 0 and 100),
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 3) Terms (slang glossary fed into prompts) + few-shot generation examples
create table if not exists public.terms (
  id bigint generated always as identity primary key,
  term text not null unique,
  definition text not null,
  example text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_examples (
  id bigint generated always as identity primary key,
  prompt text not null,
  caption text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4) Observability: one request per "Generate" click, one response per LLM call
create table if not exists public.generation_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  chain_id bigint references public.prompt_chains (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  error text,
  generation_id bigint references public.generations (id) on delete set null,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.llm_responses (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.generation_requests (id) on delete cascade,
  step_id bigint references public.prompt_chain_steps (id) on delete set null,
  model_id bigint references public.llm_models (id) on delete set null,
  model_name text not null,
  input_text text not null,
  output_text text,
  status text not null check (status in ('succeeded', 'failed')),
  error text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists generation_requests_created_idx on public.generation_requests (created_at desc);
create index if not exists llm_responses_request_idx on public.llm_responses (request_id);

-- 5) Signup allowlist
create table if not exists public.allowed_signup_domains (
  id bigint generated always as identity primary key,
  domain text not null unique check (domain = lower(domain) and domain !~ '@'),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.whitelisted_emails (
  id bigint generated always as identity primary key,
  email text not null unique check (email = lower(email) and email ~ '@'),
  note text,
  created_at timestamptz not null default now()
);

-- Callable by any signed-in user without exposing the lists themselves.
create or replace function public.is_email_allowed(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.whitelisted_emails where email = lower(check_email))
    or exists (
      select 1 from public.allowed_signup_domains
      where domain = lower(split_part(check_email, '@', 2))
    );
$$;

grant execute on function public.is_email_allowed(text) to authenticated;

-- 6) RLS
alter table public.llm_providers enable row level security;
alter table public.llm_models enable row level security;
alter table public.prompt_chains enable row level security;
alter table public.prompt_chain_steps enable row level security;
alter table public.prompt_chain_mix enable row level security;
alter table public.terms enable row level security;
alter table public.generation_examples enable row level security;
alter table public.generation_requests enable row level security;
alter table public.llm_responses enable row level security;
alter table public.allowed_signup_domains enable row level security;
alter table public.whitelisted_emails enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'llm_providers', 'llm_models', 'prompt_chains', 'prompt_chain_steps', 'prompt_chain_mix',
        'terms', 'generation_examples', 'generation_requests', 'llm_responses',
        'allowed_signup_domains', 'whitelisted_emails'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Generation config: the caption app reads it as the signed-in user; only superadmins write.
do $$
declare t text;
begin
  foreach t in array array[
    'llm_providers', 'llm_models', 'prompt_chains', 'prompt_chain_steps',
    'prompt_chain_mix', 'terms', 'generation_examples'
  ]
  loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())',
      t || '_admin_write', t
    );
  end loop;
end $$;

create policy "generation_requests_select" on public.generation_requests
  for select to authenticated using (auth.uid() = user_id or public.is_superadmin());
create policy "generation_requests_insert_own" on public.generation_requests
  for insert to authenticated with check (auth.uid() = user_id);
create policy "generation_requests_update_own" on public.generation_requests
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "llm_responses_select" on public.llm_responses
  for select to authenticated
  using (
    public.is_superadmin()
    or exists (select 1 from public.generation_requests r where r.id = request_id and r.user_id = auth.uid())
  );
create policy "llm_responses_insert_own" on public.llm_responses
  for insert to authenticated
  with check (
    exists (select 1 from public.generation_requests r where r.id = request_id and r.user_id = auth.uid())
  );

create policy "allowed_signup_domains_admin" on public.allowed_signup_domains
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy "whitelisted_emails_admin" on public.whitelisted_emails
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

-- Superadmins can read every vote / generation request in the admin app already via select-all policies.

-- 7) Images: superadmins manage everything in the avatars bucket
drop policy if exists "Superadmins manage avatars" on storage.objects;
create policy "Superadmins manage avatars"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'avatars' and public.is_superadmin())
  with check (bucket_id = 'avatars' and public.is_superadmin());

-- 8) Seed data
insert into public.llm_providers (name, slug, base_url, api_key_env)
values ('Google AI Studio', 'google', 'https://generativelanguage.googleapis.com', 'GEMINI_API_KEY')
on conflict (slug) do nothing;

insert into public.llm_models (provider_id, model_id, display_name, temperature, max_output_tokens, priority)
select p.id, m.model_id, m.display_name, m.temperature, m.max_tokens, m.priority
from public.llm_providers p
cross join (values
  ('gemini-flash-latest', 'Gemini Flash (latest)', 0.95, 512, 10),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', 0.95, 512, 20),
  ('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 0.9, 256, 30)
) as m(model_id, display_name, temperature, max_tokens, priority)
where p.slug = 'google'
on conflict (provider_id, model_id) do nothing;

insert into public.prompt_chains (name, description) values
  ('Brainstorm → Punch-up', 'Two steps: draft five candidate captions, then pick and sharpen the funniest one.'),
  ('One-shot', 'Single call: write the caption directly. Cheaper and faster, usually less sharp.')
on conflict (name) do nothing;

insert into public.prompt_chain_steps (chain_id, step_order, name, instruction)
select c.id, s.step_order, s.name, s.instruction
from public.prompt_chains c
join (values
  ('Brainstorm → Punch-up', 1, 'Brainstorm',
   E'You write chronically-online captions for Columbia students exploring NYC on weekends.\nWrite 5 different candidate captions (1-2 sentences each) for this vibe: {{prompt}}\n\nUseful slang and places:\n{{terms}}\n\nCaptions people loved before:\n{{examples}}\n\nReturn a numbered list only.'),
  ('Brainstorm → Punch-up', 2, 'Punch-up',
   E'Here are candidate captions for the vibe "{{prompt}}":\n{{previous}}\n\nPick the single funniest one and tighten it: witty, slightly unhinged, Gen-Z internet voice, max 2 sentences.\nReturn ONLY the final caption text, no quotes, no preamble.'),
  ('One-shot', 1, 'Write caption',
   E'You write chronically-online captions for Columbia students exploring NYC on weekends.\nRules: return ONLY the caption, 1-2 sentences, witty and slightly unhinged Gen-Z voice, grounded in NYC dorm/subway/weekend energy.\n\nSlang and places you can use:\n{{terms}}\n\nExamples:\n{{examples}}\n\nVibe: {{prompt}}')
) as s(chain_name, step_order, name, instruction) on s.chain_name = c.name
on conflict (chain_id, step_order) do nothing;

insert into public.prompt_chain_mix (chain_id, weight)
select c.id, case c.name when 'Brainstorm → Punch-up' then 70 else 30 end
from public.prompt_chains c
on conflict (chain_id) do nothing;

insert into public.terms (term, definition, example) values
  ('Butler', 'Butler Library, where Columbia students go to suffer', 'third floor of Butler at 2am'),
  ('the 1', 'The 1 train, the subway line that stops at 116th St–Columbia', 'the 1 running local on a Saturday'),
  ('Low Steps', 'The steps of Low Library where everyone sits when it''s nice out', 'main-character moment on Low Steps'),
  ('JJ''s', 'JJ''s Place, the late-night dining hall', 'JJ''s mozz sticks at 1am'),
  ('bodega cat', 'The cat that guards every NYC corner store', 'the bodega cat judging my 3rd energy drink'),
  ('Ferris', 'Ferris Booth Commons dining hall', 'Ferris brunch line'),
  ('core', 'The Core Curriculum (Lit Hum, CC, etc.)', 'reading 400 pages of Plato for CC')
on conflict (term) do nothing;

insert into public.generation_examples (prompt, caption, notes)
select * from (values
  ('lost on the L train after a midterm', 'took the L to "decompress" and now I live in Bushwick apparently', 'Seed example'),
  ('Butler at 3am', 'Butler at 3am is just a group chat where nobody talks and everyone is crying', 'Seed example'),
  ('first nice day of spring', 'Low Steps went from empty to Coachella in 0.4 seconds', 'Seed example'),
  ('spent $40 on a bagel tour', 'not me treating a $40 bagel crawl like a semester abroad', 'Seed example')
) as v(prompt, caption, notes)
where not exists (select 1 from public.generation_examples);

insert into public.allowed_signup_domains (domain, note) values
  ('columbia.edu', 'Columbia students and staff'),
  ('barnard.edu', 'Barnard students and staff')
on conflict (domain) do nothing;

insert into public.whitelisted_emails (email, note) values
  ('ykimbestday@gmail.com', 'Owner personal account')
on conflict (email) do nothing;
