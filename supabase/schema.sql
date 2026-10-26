-- MADE FOR YOU: run this entire script in Supabase > SQL Editor.
-- IMPORTANT: this starter uses public gifts for anyone who has a gift URL.
-- Do not put highly sensitive/private information in gifts. Password protection
-- in this starter is a convenience feature, not cryptographic security.

create extension if not exists pgcrypto;

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (category in ('birthday','anniversary','confession')),
  content_type text not null check (content_type in ('letter','polaroids','cards')),
  sender_name text not null default 'Someone who cares',
  recipient_name text not null,
  title text not null,
  event_date date,
  letter text not null default '',
  card_message text not null default '',
  secret_message text not null default '',
  password_hash text,
  memories jsonb not null default '[]'::jsonb,
  voice_url text,
  music_url text,
  video_url text,
  created_at timestamptz not null default now()
);

alter table public.gifts enable row level security;

-- Public read by slug allows recipients to open gifts without an account.
drop policy if exists "Anyone can read a gift by link" on public.gifts;
create policy "Anyone can read a gift by link"
on public.gifts for select
to anon, authenticated
using (true);

-- Anonymous inserts let visitors create gifts without signing in.
drop policy if exists "Anyone can create a gift" on public.gifts;
create policy "Anyone can create a gift"
on public.gifts for insert
to anon, authenticated
with check (
  char_length(slug) between 5 and 80
  and char_length(recipient_name) between 1 and 80
  and char_length(title) between 1 and 120
);

-- Public bucket is needed so recipients can view gift media through shared URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gift-media',
  'gift-media',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/webm','audio/ogg','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload gift media" on storage.objects;
create policy "Anyone can upload gift media"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'gift-media');

drop policy if exists "Anyone can read gift media" on storage.objects;
create policy "Anyone can read gift media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'gift-media');

-- For a public launch, consider adding rate limits, moderation, storage quotas,
-- abuse reporting, and a server-side password verification design.
