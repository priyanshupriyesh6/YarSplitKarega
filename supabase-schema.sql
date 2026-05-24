-- ───────────────────────────────────────────────────────────────────────
--  Supabase Database Schema for SplitSmart / YarSplitKarega
--  Copy and run this in your Supabase SQL Editor
-- ───────────────────────────────────────────────────────────────────────

-- 1. Create a table for public profiles (linked to Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text,
  avatar_url text,
  default_currency text default 'INR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create a profile when a user registers
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email, default_currency)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'INR'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Create groups table
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text default '🏖️',
  cover_color text default '#6C63FF',
  currency text default 'INR',
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  total_spent numeric default 0 not null,
  balances jsonb default '{}'::jsonb not null
);

alter table public.groups enable row level security;

-- 3. Create group_members junction table
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, profile_id)
);

alter table public.group_members enable row level security;

-- 4. Create expenses table
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  title text not null,
  amount numeric not null,
  currency text default 'INR' not null,
  category text not null,
  paid_by uuid references public.profiles(id) on delete set null,
  paid_by_name text not null,
  split_type text default 'equal' not null,
  date date not null,
  tags text[],
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.expenses enable row level security;

-- 5. Create expense_splits table
create table public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  display_name text not null,
  amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.expense_splits enable row level security;

-- 6. Create settlements table
create table public.settlements (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  from_uid uuid references public.profiles(id) on delete set null not null,
  from_name text not null,
  to_uid uuid references public.profiles(id) on delete set null not null,
  to_name text not null,
  amount numeric not null,
  currency text default 'INR' not null,
  settled_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.settlements enable row level security;

-- ── ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────

-- Groups Policies
create policy "Users can view groups they are member of" on public.groups
  for select using (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = groups.id 
      and group_members.profile_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() is not null);

create policy "Members can update their groups" on public.groups
  for update using (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = groups.id 
      and group_members.profile_id = auth.uid()
    )
  );

-- Group Members Policies
create policy "Members can view group members" on public.group_members
  for select using (auth.uid() is not null);

create policy "Members can insert membership" on public.group_members
  for insert with check (auth.uid() is not null);

-- Expenses Policies
create policy "Members can view group expenses" on public.expenses
  for select using (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = expenses.group_id 
      and group_members.profile_id = auth.uid()
    )
  );

create policy "Members can insert group expenses" on public.expenses
  for insert with check (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = expenses.group_id 
      and group_members.profile_id = auth.uid()
    )
  );

create policy "Members can update group expenses" on public.expenses
  for update using (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = expenses.group_id 
      and group_members.profile_id = auth.uid()
    )
  );

create policy "Members can delete group expenses" on public.expenses
  for delete using (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = expenses.group_id 
      and group_members.profile_id = auth.uid()
    )
  );

-- Splits Policies
create policy "Members can view group expense splits" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id
      and gm.profile_id = auth.uid()
    )
  );

create policy "Members can insert group expense splits" on public.expense_splits
  for insert with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id
      and gm.profile_id = auth.uid()
    )
  );

-- Settlements Policies
create policy "Members can view group settlements" on public.settlements
  for select using (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = settlements.group_id 
      and group_members.profile_id = auth.uid()
    )
  );

create policy "Members can insert group settlements" on public.settlements
  for insert with check (
    exists (
      select 1 from public.group_members 
      where group_members.group_id = settlements.group_id 
      and group_members.profile_id = auth.uid()
    )
  );
