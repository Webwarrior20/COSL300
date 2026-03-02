create extension if not exists pgcrypto;

create table if not exists public.game_content_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  source_file_path text,
  uploaded_by text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_content_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.game_content_sets(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  round_title text not null,
  category_name text not null,
  point_value integer not null check (point_value in (100, 200, 300, 400, 500)),
  fun_fact text,
  task_text text,
  prize_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (set_id, round_number, category_name, point_value)
);

create index if not exists game_content_items_set_round_idx
  on public.game_content_items (set_id, round_number, sort_order);

alter table public.game_content_sets enable row level security;
alter table public.game_content_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_content_sets'
      and policyname = 'published sets are readable'
  ) then
    create policy "published sets are readable"
      on public.game_content_sets
      for select
      to anon, authenticated
      using (published = true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_content_items'
      and policyname = 'published items are readable'
  ) then
    create policy "published items are readable"
      on public.game_content_items
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.game_content_sets s
          where s.id = game_content_items.set_id
            and s.published = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_content_sets'
      and policyname = 'authenticated can manage sets'
  ) then
    create policy "authenticated can manage sets"
      on public.game_content_sets
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_content_items'
      and policyname = 'authenticated can manage items'
  ) then
    create policy "authenticated can manage items"
      on public.game_content_items
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
