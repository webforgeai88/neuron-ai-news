-- Neuron portfolio CMS. Additive schema: does not alter other applications.
create table public.neuron_workspaces (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('main','demo')),
 created_at timestamptz not null default now(), expires_at timestamptz,
 check ((kind='main' and expires_at is null) or (kind='demo' and expires_at is not null))
);
create unique index neuron_one_main on public.neuron_workspaces(kind) where kind='main';
create index neuron_workspace_expiry on public.neuron_workspaces(expires_at) where kind='demo';
insert into public.neuron_workspaces(kind) values ('main');
create table public.neuron_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 login text unique not null check(login ~ '^[a-z0-9_.-]{3,40}$'),
 name text not null check(length(name) between 1 and 80),
 role text not null check(role in ('admin','employee')), active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index neuron_one_admin on public.neuron_profiles(role) where role='admin';
create table public.neuron_posts (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.neuron_workspaces(id) on delete cascade,
 slug text not null check(length(slug) between 1 and 200), title text not null check(length(title) between 1 and 180),
 excerpt text not null default '' check(length(excerpt)<=500), body text not null check(length(body) between 1 and 100000),
 category text not null check(category in ('Модели','Инструменты','Исследования','Индустрия','Робототехника')),
 links jsonb not null default '[]'::jsonb check(jsonb_typeof(links)='array' and jsonb_array_length(links)<=10),
 cover text not null default '', status text not null check(status in ('draft','published')),
 author text not null check(length(author) between 1 and 80),
 created bigint not null, updated bigint not null,
 unique(workspace_id,slug)
);
create index neuron_posts_feed on public.neuron_posts(workspace_id,status,created desc);
create table public.neuron_demo_staff (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.neuron_workspaces(id) on delete cascade,
 login text not null check(login ~ '^[a-z0-9_.-]{3,40}$'),name text not null check(length(name) between 1 and 80),
 password_hash text not null,created_at timestamptz not null default now(), unique(workspace_id,login)
);
create table public.neuron_demo_sessions (
 token_hash text primary key,workspace_id uuid not null references public.neuron_workspaces(id) on delete cascade,
 role text not null check(role in ('admin','employee','reader')),staff_id uuid references public.neuron_demo_staff(id) on delete cascade,
 expires_at timestamptz not null
);
create index neuron_demo_workspace on public.neuron_demo_sessions(workspace_id);
create index neuron_demo_staff_sessions on public.neuron_demo_sessions(staff_id) where staff_id is not null;
create table public.neuron_auth_sessions (
 access_hash text primary key, refresh_hash text unique not null,
 user_id uuid not null references public.neuron_profiles(id) on delete cascade,
 expires_at timestamptz not null
);
create index neuron_auth_user on public.neuron_auth_sessions(user_id);
create table public.neuron_settings(key text primary key,value text not null);
create table public.neuron_rate_limits(key text primary key,hits integer not null,expires_at timestamptz not null);
create index neuron_rate_expiry on public.neuron_rate_limits(expires_at);
alter table public.neuron_workspaces enable row level security;
alter table public.neuron_profiles enable row level security;
alter table public.neuron_posts enable row level security;
alter table public.neuron_demo_staff enable row level security;
alter table public.neuron_demo_sessions enable row level security;
alter table public.neuron_auth_sessions enable row level security;
alter table public.neuron_settings enable row level security;
alter table public.neuron_rate_limits enable row level security;
revoke all on public.neuron_workspaces,public.neuron_profiles,public.neuron_demo_staff,public.neuron_demo_sessions,public.neuron_auth_sessions,public.neuron_settings,public.neuron_rate_limits from anon,authenticated;
grant all on public.neuron_workspaces,public.neuron_profiles,public.neuron_posts,public.neuron_demo_staff,public.neuron_demo_sessions,public.neuron_auth_sessions,public.neuron_settings,public.neuron_rate_limits to service_role;
grant select on public.neuron_posts,public.neuron_workspaces to anon,authenticated;
create policy neuron_main_workspace on public.neuron_workspaces for select to anon,authenticated using(kind='main');
create policy neuron_public_articles on public.neuron_posts for select to anon,authenticated using(status='published' and workspace_id in (select id from public.neuron_workspaces where kind='main'));
create function public.neuron_rate_limit(rate_key text,max_hits integer,window_seconds integer) returns boolean language sql security invoker set search_path='' as $$
 insert into public.neuron_rate_limits(key,hits,expires_at) values(rate_key,1,now()+make_interval(secs=>window_seconds))
 on conflict(key) do update set hits=case when neuron_rate_limits.expires_at<now() then 1 else neuron_rate_limits.hits+1 end,
 expires_at=case when neuron_rate_limits.expires_at<now() then now()+make_interval(secs=>window_seconds) else neuron_rate_limits.expires_at end
 returning hits<=max_hits;
$$;
revoke all on function public.neuron_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.neuron_rate_limit(text,integer,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('neuron-covers','neuron-covers',true,3145728,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
