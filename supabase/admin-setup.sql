-- Run in Supabase → SQL Editor (same project as Weekend Caps)

-- 1) Superadmin flag
alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- 2) Promote yourself (edit the email if needed)
update public.profiles
set is_superadmin = true
where id = (
  select id from auth.users
  where email in (
    'yk3057@columbia.edu',
    'ykimbestday@gmail.com'
  )
  limit 1
);

-- If that matched 0 rows, run this after you know your auth user id:
-- update public.profiles set is_superadmin = true where id = '<your-user-uuid>';

-- 3) Let superadmins manage ALL generations (CRUD beyond "own row")
drop policy if exists "generations_admin_update" on public.generations;
create policy "generations_admin_update"
  on public.generations for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  );

drop policy if exists "generations_admin_delete" on public.generations;
create policy "generations_admin_delete"
  on public.generations for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  );

drop policy if exists "generations_admin_insert" on public.generations;
create policy "generations_admin_insert"
  on public.generations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  );
