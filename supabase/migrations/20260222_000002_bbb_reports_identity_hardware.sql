alter table public.bbb_reports add column if not exists gladiator_name text;
alter table public.bbb_reports add column if not exists github_username text;
alter table public.bbb_reports add column if not exists device_id uuid;

alter table public.bbb_reports add column if not exists canonical_model_id text;
alter table public.bbb_reports add column if not exists model_family text;
alter table public.bbb_reports add column if not exists param_size text;
alter table public.bbb_reports add column if not exists quantization text;

alter table public.bbb_reports add column if not exists gpu_name text;
alter table public.bbb_reports add column if not exists gpu_vendor text;
alter table public.bbb_reports add column if not exists gpu_raw text;
alter table public.bbb_reports add column if not exists os_name text;
alter table public.bbb_reports add column if not exists browser_name text;
alter table public.bbb_reports add column if not exists vram_gb numeric(8,2);

create index if not exists idx_bbb_reports_gladiator_name_created_at
  on public.bbb_reports (gladiator_name, created_at desc)
  where gladiator_name is not null;

create index if not exists idx_bbb_reports_github_username_created_at
  on public.bbb_reports (github_username, created_at desc)
  where github_username is not null;

create index if not exists idx_bbb_reports_device_id_created_at
  on public.bbb_reports (device_id, created_at desc)
  where device_id is not null;

create index if not exists idx_bbb_reports_canonical_model_id_created_at
  on public.bbb_reports (canonical_model_id, created_at desc)
  where canonical_model_id is not null;

create index if not exists idx_bbb_reports_gpu_name_created_at
  on public.bbb_reports (gpu_name, created_at desc)
  where gpu_name is not null;

create unique index if not exists idx_bbb_reports_mode_source_run_ref_unique
  on public.bbb_reports (mode, source_run_ref)
  where source_run_ref is not null;

create unique index if not exists idx_bbb_reports_run_hash_unique
  on public.bbb_reports (run_hash)
  where run_hash is not null;
