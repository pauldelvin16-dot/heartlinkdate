
-- ROLES
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create policy "view own roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  age int check (age >= 18 and age <= 120),
  gender text,
  orientation text,
  interested_in text,
  country text,
  city text,
  ethnicity text,
  age_group text,
  conditions text[] default '{}',
  interests text[] default '{}',
  photos text[] default '{}',
  phone text,
  is_simulated boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "anyone authed views active profiles" on public.profiles for select to authenticated using (is_active = true);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "admins manage all profiles" on public.profiles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.handle_updated_at();

-- New user trigger -> create blank profile + 'user' role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- SWIPES
create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  unique(swiper_id, target_id)
);
alter table public.swipes enable row level security;
create policy "view own swipes" on public.swipes for select using (auth.uid() = swiper_id);
create policy "insert own swipes" on public.swipes for insert with check (auth.uid() = swiper_id);

-- MATCHES
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_a, user_b)
);
alter table public.matches enable row level security;
create policy "view own matches" on public.matches for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "admins view all matches" on public.matches for select using (public.has_role(auth.uid(),'admin'));

-- Trigger: when a like creates a mutual, insert match
create or replace function public.handle_swipe_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if new.liked then
    if exists(select 1 from public.swipes s where s.swiper_id = new.target_id and s.target_id = new.swiper_id and s.liked = true) then
      a := least(new.swiper_id, new.target_id);
      b := greatest(new.swiper_id, new.target_id);
      insert into public.matches(user_a, user_b) values (a,b) on conflict do nothing;
    end if;
  end if;
  return new;
end; $$;
create trigger swipes_match after insert on public.swipes for each row execute function public.handle_swipe_match();

-- SITE SETTINGS (single row id=1)
create table public.site_settings (
  id int primary key default 1,
  site_name text not null default 'HeartLink',
  tagline text default 'Find your spark',
  logo_url text,
  primary_color text default '340 82% 52%',
  contact_email text,
  contact_whatsapp text,
  premium_message text default 'Congrats on your match! Contact us to unlock direct messaging.',
  allowed_country_codes text[] not null default '{"+44","+33","+34","+39","+49","+31","+353","+1","+61"}',
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);
alter table public.site_settings enable row level security;
create policy "anyone reads site settings" on public.site_settings for select using (true);
create policy "admins write site settings" on public.site_settings for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.site_settings(id) values (1) on conflict do nothing;

-- PREMIUM CONTACTS
create table public.premium_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  whatsapp text,
  email text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.premium_contacts enable row level security;
create policy "authed view active contacts" on public.premium_contacts for select to authenticated using (is_active = true);
create policy "admins manage contacts" on public.premium_contacts for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- STORAGE
insert into storage.buckets (id,name,public) values ('profile-photos','profile-photos',true) on conflict do nothing;
create policy "public read photos" on storage.objects for select using (bucket_id = 'profile-photos');
create policy "users upload own photos" on storage.objects for insert to authenticated with check (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users update own photos" on storage.objects for update to authenticated using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users delete own photos" on storage.objects for delete to authenticated using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);
