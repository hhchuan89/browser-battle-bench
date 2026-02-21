create extension if not exists pgcrypto;

create table if not exists public.bbb_reports (
  id uuid primary key default gen_random_uuid(),
  mode text,
  scenario_id text,
  scenario_name text,
  model_id text,
  score numeric(5,2),
  grade text,
  tier text,
  pass_rate numeric(5,2),
  total_rounds int,
  passed_rounds int,
  run_hash text,
  replay_hash text,
  source_run_ref text,
  report_summary jsonb,
  created_at timestamptz not null default now()
);

alter table public.bbb_reports add column if not exists mode text;
alter table public.bbb_reports add column if not exists scenario_id text;
alter table public.bbb_reports add column if not exists scenario_name text;
alter table public.bbb_reports add column if not exists model_id text;
alter table public.bbb_reports add column if not exists score numeric(5,2);
alter table public.bbb_reports add column if not exists grade text;
alter table public.bbb_reports add column if not exists tier text;
alter table public.bbb_reports add column if not exists pass_rate numeric(5,2);
alter table public.bbb_reports add column if not exists total_rounds int;
alter table public.bbb_reports add column if not exists passed_rounds int;
alter table public.bbb_reports add column if not exists run_hash text;
alter table public.bbb_reports add column if not exists replay_hash text;
alter table public.bbb_reports add column if not exists source_run_ref text;
alter table public.bbb_reports add column if not exists report_summary jsonb;
alter table public.bbb_reports add column if not exists created_at timestamptz not null default now();

alter table public.bbb_reports
  alter column score type numeric(5,2)
  using case
    when score is null then null
    else score::numeric(5,2)
  end;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bbb_reports'
      AND column_name = 'raw_json'
  ) THEN
    execute $q$
      update public.bbb_reports
      set report_summary = coalesce(report_summary, raw_json, '{}'::jsonb)
      where report_summary is null
    $q$;

    execute $q$
      update public.bbb_reports
      set mode = coalesce(mode, raw_json->>'mode', 'quick')
      where mode is null
    $q$;

    execute $q$
      update public.bbb_reports
      set scenario_id = coalesce(scenario_id, raw_json->>'scenario_id', 'unknown-scenario')
      where scenario_id is null
    $q$;

    execute $q$
      update public.bbb_reports
      set scenario_name = coalesce(scenario_name, raw_json->>'scenario_name', 'Unknown Scenario')
      where scenario_name is null
    $q$;

    execute $q$
      update public.bbb_reports
      set model_id = coalesce(model_id, raw_json->>'model_id', 'Unknown Model')
      where model_id is null
    $q$;

    execute $q$
      update public.bbb_reports
      set grade = coalesce(grade, raw_json->>'grade', 'C')
      where grade is null
    $q$;

    execute $q$
      update public.bbb_reports
      set tier = coalesce(tier, raw_json->>'tier', 'UNKNOWN')
      where tier is null
    $q$;

    execute $q$
      update public.bbb_reports
      set source_run_ref = coalesce(source_run_ref, raw_json->>'source_run_ref')
      where source_run_ref is null
    $q$;
  END IF;
END;
$$;

update public.bbb_reports set mode = 'quick' where mode is null;
update public.bbb_reports set scenario_id = 'unknown-scenario' where scenario_id is null;
update public.bbb_reports set scenario_name = 'Unknown Scenario' where scenario_name is null;
update public.bbb_reports set model_id = 'Unknown Model' where model_id is null;
update public.bbb_reports set score = 0 where score is null;
update public.bbb_reports set grade = 'C' where grade is null;
update public.bbb_reports set tier = 'UNKNOWN' where tier is null;
update public.bbb_reports set report_summary = '{}'::jsonb where report_summary is null;

alter table public.bbb_reports alter column mode set not null;
alter table public.bbb_reports alter column scenario_id set not null;
alter table public.bbb_reports alter column scenario_name set not null;
alter table public.bbb_reports alter column model_id set not null;
alter table public.bbb_reports alter column score set not null;
alter table public.bbb_reports alter column grade set not null;
alter table public.bbb_reports alter column tier set not null;
alter table public.bbb_reports alter column report_summary set not null;
alter table public.bbb_reports alter column report_summary set default '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bbb_reports_mode_check'
      AND conrelid = 'public.bbb_reports'::regclass
  ) THEN
    alter table public.bbb_reports
      add constraint bbb_reports_mode_check
      check (mode in ('arena', 'quick', 'gauntlet', 'stress'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bbb_reports_grade_check'
      AND conrelid = 'public.bbb_reports'::regclass
  ) THEN
    alter table public.bbb_reports
      add constraint bbb_reports_grade_check
      check (grade in ('S', 'A', 'B', 'C', 'F'));
  END IF;
END;
$$;

create index if not exists idx_bbb_reports_created_at_desc
  on public.bbb_reports (created_at desc);

create index if not exists idx_bbb_reports_score_created_at
  on public.bbb_reports (score desc, created_at desc);

create index if not exists idx_bbb_reports_mode_created_at
  on public.bbb_reports (mode, created_at desc);

create unique index if not exists idx_bbb_reports_run_hash_unique
  on public.bbb_reports (run_hash)
  where run_hash is not null;

create table if not exists public.bbb_upload_guard (
  ip_hash text primary key,
  window_start timestamptz not null,
  hit_count int not null default 0
);

alter table public.bbb_reports enable row level security;
alter table public.bbb_upload_guard enable row level security;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bbb_reports' AND policyname = 'allow_anonymous_insert'
  ) THEN
    drop policy allow_anonymous_insert on public.bbb_reports;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bbb_reports' AND policyname = 'allow_anonymous_read'
  ) THEN
    drop policy allow_anonymous_read on public.bbb_reports;
  END IF;
END;
$$;
