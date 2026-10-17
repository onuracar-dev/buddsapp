-- Uygulamadan önce kendi Supabase projende test et.
-- BuddsApp RLS (Row Level Security) Politikaları
-- Kullanıcı sadece kendi workspace'ini görür.
-- Rol değiştirmeyi ve admin işlemlerini sadece role = 'admin' olan yapabilir.

-- Yardımcı fonksiyon: Kullanıcı admin mi?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Yardımcı fonksiyon: Kullanıcının workspace_id'si
create or replace function public.current_user_workspace_id()
returns text as $$
  select workspace_id from public.users
  where id = auth.uid()
  limit 1;
$$ language sql security definer;

--------------------------------------------------------------------------------
-- 1. USERS TABLOSU
--------------------------------------------------------------------------------
alter table public.users enable row level security;

-- Okuma: Kullanıcı kendi workspace'indeki kullanıcıları veya admin tüm kullanıcıları görebilir
create policy "users_select_policy" on public.users
  for select
  using (
    auth.uid() = id
    or workspace_id = public.current_user_workspace_id()
    or public.is_admin()
  );

-- Ekleme: Yeni kayıt olan kullanıcı kendi kaydını ekleyebilir (varsayılan role: 'member')
create policy "users_insert_policy" on public.users
  for insert
  with check (
    auth.uid() = id
  );

-- Güncelleme: Kullanıcı kendi profilini güncelleyebilir (fakat admin olmayan rolünü admin yapamaz), admin herkesi güncelleyebilir
create policy "users_update_policy" on public.users
  for update
  using (
    auth.uid() = id or public.is_admin()
  )
  with check (
    (auth.uid() = id and (role = 'member' or role = (select role from public.users where id = auth.uid())))
    or public.is_admin()
  );

-- Silme: Sadece admin kullanıcı silebilir
create policy "users_delete_policy" on public.users
  for delete
  using (
    public.is_admin()
  );

--------------------------------------------------------------------------------
-- 2. WORKSPACES TABLOSU
--------------------------------------------------------------------------------
alter table public.workspaces enable row level security;

create policy "workspaces_select_policy" on public.workspaces
  for select
  using (
    id = public.current_user_workspace_id()
    or public.is_admin()
  );

create policy "workspaces_admin_all" on public.workspaces
  for all
  using (public.is_admin())
  with check (public.is_admin());

--------------------------------------------------------------------------------
-- 3. CHATS TABLOSU
--------------------------------------------------------------------------------
alter table public.chats enable row level security;

-- Okuma: Kendi workspace'indeki veya katılımcısı olduğu sohbetler ya da admin
create policy "chats_select_policy" on public.chats
  for select
  using (
    workspace_id = public.current_user_workspace_id()
    or auth.uid()::text = any(participants)
    or public.is_admin()
  );

-- Ekleme: Workspace üyeleri veya admin
create policy "chats_insert_policy" on public.chats
  for insert
  with check (
    workspace_id = public.current_user_workspace_id()
    or public.is_admin()
  );

-- Güncelleme: Katılımcılar veya admin
create policy "chats_update_policy" on public.chats
  for update
  using (
    workspace_id = public.current_user_workspace_id()
    or auth.uid()::text = any(participants)
    or public.is_admin()
  );

-- Silme: Sadece admin veya chat oluşturan
create policy "chats_delete_policy" on public.chats
  for delete
  using (
    public.is_admin()
  );

--------------------------------------------------------------------------------
-- 4. MESSAGES TABLOSU
--------------------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "messages_select_policy" on public.messages
  for select
  using (
    exists (
      select 1 from public.chats c
      where c.id = messages.chat_id
      and (
        c.workspace_id = public.current_user_workspace_id()
        or auth.uid()::text = any(c.participants)
        or public.is_admin()
      )
    )
  );

create policy "messages_insert_policy" on public.messages
  for insert
  with check (
    auth.uid() = sender_uid
    or public.is_admin()
  );

create policy "messages_update_policy" on public.messages
  for update
  using (
    auth.uid() = sender_uid
    or public.is_admin()
  );

create policy "messages_delete_policy" on public.messages
  for delete
  using (
    auth.uid() = sender_uid
    or public.is_admin()
  );

--------------------------------------------------------------------------------
-- 5. CALLS TABLOSU
--------------------------------------------------------------------------------
alter table public.calls enable row level security;

create policy "calls_select_policy" on public.calls
  for select
  using (
    caller_id = auth.uid()
    or exists (
      select 1 from public.chats c
      where c.id = calls.chat_id
      and (
        auth.uid()::text = any(c.participants)
        or c.workspace_id = public.current_user_workspace_id()
      )
    )
    or public.is_admin()
  );

create policy "calls_insert_policy" on public.calls
  for insert
  with check (
    caller_id = auth.uid()
    or public.is_admin()
  );

create policy "calls_update_policy" on public.calls
  for update
  using (
    caller_id = auth.uid()
    or exists (
      select 1 from public.chats c
      where c.id = calls.chat_id
      and auth.uid()::text = any(c.participants)
    )
    or public.is_admin()
  );

--------------------------------------------------------------------------------
-- 6. INVITES TABLOSU
--------------------------------------------------------------------------------
alter table public.invites enable row level security;

-- Okuma: Davet kodunu kontrol eden anonim/giriş yapmış kullanıcılar veya workspace adminleri
create policy "invites_select_policy" on public.invites
  for select
  using (
    workspace_id = public.current_user_workspace_id()
    or used = false
    or public.is_admin()
  );

-- Ekleme / Silme: Sadece admin davet kodu üretebilir veya silebilir
create policy "invites_insert_policy" on public.invites
  for insert
  with check (
    public.is_admin()
  );

create policy "invites_delete_policy" on public.invites
  for delete
  using (
    public.is_admin()
  );

-- Güncelleme: Daveti kullanan kişi (used=true yapmak için) veya admin
create policy "invites_update_policy" on public.invites
  for update
  using (
    used = false
    or public.is_admin()
  );

--------------------------------------------------------------------------------
-- 7. STORIES TABLOSU
--------------------------------------------------------------------------------
alter table public.stories enable row level security;

create policy "stories_select_policy" on public.stories
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = stories.user_id
      and (u.workspace_id = public.current_user_workspace_id() or public.is_admin())
    )
  );

create policy "stories_insert_policy" on public.stories
  for insert
  with check (
    user_id = auth.uid()
  );

create policy "stories_delete_policy" on public.stories
  for delete
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

--------------------------------------------------------------------------------
-- 8. GLOBAL_SETTINGS & APP_SETTINGS TABLOLARI
--------------------------------------------------------------------------------
alter table public.global_settings enable row level security;

create policy "global_settings_select_policy" on public.global_settings
  for select
  using (true);

create policy "global_settings_admin_write" on public.global_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.app_settings enable row level security;

create policy "app_settings_select_policy" on public.app_settings
  for select
  using (true);

create policy "app_settings_admin_write" on public.app_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());
