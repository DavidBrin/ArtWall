create or replace function public.point_is_normalized(payload jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(payload) = 'array'
    and jsonb_array_length(payload) = 2
    and jsonb_typeof(payload -> 0) = 'number'
    and jsonb_typeof(payload -> 1) = 'number'
    and (payload ->> 0)::double precision between 0 and 1
    and (payload ->> 1)::double precision between 0 and 1;
$$;

alter table public.strokes
add column if not exists wall_id text not null default 'street';

alter table public.strokes
drop constraint if exists strokes_wall_id_valid;

alter table public.strokes
add constraint strokes_wall_id_valid
check (wall_id in ('street', 'ideas', 'chalkboard'));

create index if not exists strokes_wall_id_created_at_desc_idx
on public.strokes (wall_id, created_at desc);

create table if not exists public.wall_texts (
  id uuid primary key default gen_random_uuid(),
  wall_id text not null,
  text text not null,
  position jsonb not null,
  color text not null,
  font_size integer not null,
  client_id text not null,
  created_at timestamptz not null default now(),
  constraint wall_texts_wall_id_valid check (wall_id in ('street', 'ideas', 'chalkboard')),
  constraint wall_texts_text_length check (char_length(btrim(text)) between 1 and 280),
  constraint wall_texts_position_normalized check (public.point_is_normalized(position)),
  constraint wall_texts_color_hex check (color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint wall_texts_font_size_range check (font_size between 14 and 96),
  constraint wall_texts_client_id_length check (char_length(client_id) between 1 and 128)
);

create index if not exists wall_texts_wall_id_created_at_desc_idx
on public.wall_texts (wall_id, created_at desc);

alter table public.wall_texts enable row level security;

drop policy if exists "Public read wall texts" on public.wall_texts;
create policy "Public read wall texts"
on public.wall_texts
for select
to anon, authenticated
using (true);

drop policy if exists "Public insert wall texts" on public.wall_texts;
create policy "Public insert wall texts"
on public.wall_texts
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
      and tablename = 'wall_texts'
  ) then
    alter publication supabase_realtime add table public.wall_texts;
  end if;
end
$$;
