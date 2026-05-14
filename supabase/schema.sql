-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('manager', 'worker')),
  organization_id uuid,
  created_at timestamptz default now()
);

-- Organizations (for future multi-tenant SaaS)
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

alter table public.profiles
  add constraint profiles_organization_id_fkey
  foreign key (organization_id) references public.organizations(id);

-- Clients
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz default now()
);

-- Jobs
create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  worker_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  location text,
  scheduled_date date,
  scheduled_time_start time,
  scheduled_time_end time,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- Daily work reports (Fichas de Trabalho Diárias)
create table public.daily_reports (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  report_date date not null default current_date,
  description text not null,
  time_start time,
  time_end time,
  hours_worked numeric(4,2),
  materials_used text,
  observations text,
  created_at timestamptz default now()
);

-- Job start/finish reports
create table public.job_reports (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  report_type text not null check (report_type in ('start', 'finish')),
  report_date date not null default current_date,
  description text,
  client_observations text,
  client_name text,
  client_approved boolean,
  client_signature_url text,
  created_at timestamptz default now()
);

-- Media attachments
create table public.media (
  id uuid primary key default uuid_generate_v4(),
  daily_report_id uuid references public.daily_reports(id) on delete cascade,
  job_report_id uuid references public.job_reports(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  caption text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.clients enable row level security;
alter table public.jobs enable row level security;
alter table public.daily_reports enable row level security;
alter table public.job_reports enable row level security;
alter table public.media enable row level security;

-- RLS Policies: users can read their own org data
create policy "profiles: own" on public.profiles for all using (id = auth.uid());
create policy "orgs: own" on public.organizations for all using (
  id = (select organization_id from public.profiles where id = auth.uid())
);
create policy "clients: own org" on public.clients for all using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
);
create policy "jobs: own org" on public.jobs for all using (
  organization_id = (select organization_id from public.profiles where id = auth.uid())
);
create policy "daily_reports: own org" on public.daily_reports for all using (
  job_id in (
    select id from public.jobs where organization_id = (
      select organization_id from public.profiles where id = auth.uid()
    )
  )
);
create policy "job_reports: own org" on public.job_reports for all using (
  job_id in (
    select id from public.jobs where organization_id = (
      select organization_id from public.profiles where id = auth.uid()
    )
  )
);
create policy "media: own org" on public.media for all using (
  daily_report_id in (
    select dr.id from public.daily_reports dr
    join public.jobs j on j.id = dr.job_id
    where j.organization_id = (select organization_id from public.profiles where id = auth.uid())
  ) or
  job_report_id in (
    select jr.id from public.job_reports jr
    join public.jobs j on j.id = jr.job_id
    where j.organization_id = (select organization_id from public.profiles where id = auth.uid())
  )
);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'User'), coalesce(new.raw_user_meta_data->>'role', 'worker'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
