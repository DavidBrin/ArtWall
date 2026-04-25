create extension if not exists pgcrypto;

create or replace function public.stroke_points_are_normalized(payload jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(payload) = 'array'
    and jsonb_array_length(payload) between 2 and 2048
    and not exists (
      select 1
      from jsonb_array_elements(payload) as point
      where jsonb_typeof(point) <> 'array'
        or jsonb_array_length(point) <> 2
        or jsonb_typeof(point -> 0) <> 'number'
        or jsonb_typeof(point -> 1) <> 'number'
        or (point ->> 0)::double precision < 0
        or (point ->> 0)::double precision > 1
        or (point ->> 1)::double precision < 0
        or (point ->> 1)::double precision > 1
    );
$$;

create table if not exists public.strokes (
  id uuid primary key default gen_random_uuid(),
  points jsonb not null,
  color text not null,
  width integer not null,
  client_id text not null,
  created_at timestamptz not null default now(),
  constraint strokes_points_normalized check (public.stroke_points_are_normalized(points)),
  constraint strokes_color_hex check (color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint strokes_width_range check (width between 1 and 24),
  constraint strokes_client_id_length check (char_length(client_id) between 1 and 128)
);

create index if not exists strokes_created_at_desc_idx on public.strokes (created_at desc);

alter table public.strokes enable row level security;

drop policy if exists "Public read strokes" on public.strokes;
create policy "Public read strokes"
on public.strokes
for select
to anon, authenticated
using (true);

drop policy if exists "Public insert strokes" on public.strokes;
create policy "Public insert strokes"
on public.strokes
for insert
to anon, authenticated
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'strokes'
  ) then
    alter publication supabase_realtime add table public.strokes;
  end if;
end
$$;
