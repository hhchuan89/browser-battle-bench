alter table public.bbb_reports
  add column if not exists ingest_source text;

alter table public.bbb_reports
  add column if not exists integrity_status text;

update public.bbb_reports
set ingest_source = coalesce(ingest_source, 'live')
where ingest_source is null;

update public.bbb_reports
set integrity_status = coalesce(integrity_status, 'legacy')
where integrity_status is null;

alter table public.bbb_reports
  alter column ingest_source set default 'live';

alter table public.bbb_reports
  alter column integrity_status set default 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bbb_reports_ingest_source_check'
      AND conrelid = 'public.bbb_reports'::regclass
  ) THEN
    alter table public.bbb_reports
      add constraint bbb_reports_ingest_source_check
      check (ingest_source in ('live', 'import_local'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bbb_reports_integrity_status_check'
      AND conrelid = 'public.bbb_reports'::regclass
  ) THEN
    alter table public.bbb_reports
      add constraint bbb_reports_integrity_status_check
      check (integrity_status in ('hash_verified', 'legacy'));
  END IF;
END;
$$;

create index if not exists idx_bbb_reports_ingest_source_created_at
  on public.bbb_reports (ingest_source, created_at desc);
