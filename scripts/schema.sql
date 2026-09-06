-- Art Wall — Postgres schema (Neon).
--
-- The original v1 targeted Supabase (RLS + realtime publication). That project
-- was deleted; this schema is the same tables without Supabase-only roles.

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

create table if not exists public.strokes (
  id uuid primary key default gen_random_uuid(),
  wall_id text not null default 'street',
  points jsonb not null,
  color text not null,
  width integer not null,
  client_id text not null,
  created_at timestamptz not null default now(),
  is_eraser boolean not null default false,
  constraint strokes_points_normalized check (public.stroke_points_are_normalized(points)),
  constraint strokes_color_hex check (color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint strokes_width_range check (width between 1 and 24),
  constraint strokes_client_id_length check (char_length(client_id) between 1 and 128),
  constraint strokes_wall_id_valid check (wall_id in ('street', 'ideas', 'chalkboard'))
);

create index if not exists strokes_created_at_desc_idx
on public.strokes (created_at desc);

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

alter table public.strokes
  add column if not exists is_eraser boolean not null default false;

update public.strokes
set is_eraser = true
where is_eraser = false
  and lower(color) in ('#d1d0cc', '#f4e9cd', '#224236');
