-- Uygulamadan önce kendi Supabase projende test et.
-- BuddsApp RLS (Row Level Security) Politikaları
-- Kullanıcı sadece kendi workspace'ini görür.
-- Rol değiştirmeyi ve admin işlemlerini sadece role = 'admin' olan yapabilir.

--------------------------------------------------------------------------------
-- YARDIMCI FONKSİYONLAR
--------------------------------------------------------------------------------

-- Yardımcı fonksiyon: Kullanıcı admin mi?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Yardımcı fonksiyon: Kullanıcının workspace_id'si
create or replace function public.current_user_workspace_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.users
  where id = auth.uid()
  limit 1;
$$;

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

-- Ekleme: Yeni kayıt olan kullanıcı kendi kaydını sadece 'member' rolü ile ekleyebilir
create policy "users_insert_policy" on public.users
  for insert
  with check (
    auth.uid() = id
    and role = 'member'
  );

-- Güncelleme: Kullanıcı kendi profilini veya admin herkesi güncelleyebilir
create policy "users_update_policy" on public.users
  for update
  using (
    auth.uid() = id or public.is_admin()
  )
  with check (
    auth.uid() = id or public.is_admin()
  );

-- Silme: Sadece admin kullanıcı silebilir
create policy "users_delete_policy" on public.users
  for delete
  using (
    public.is_admin()
  );

-- Kullanıcı alanlarını koruma trigger'ı:
-- Client'tan (authenticated/anon) gelen doğrudan update'lerde admin değilse role ve workspace_id değiştirilemez.
-- workspace_id sadece redeem_invite (security definer, current_user = fonksiyon sahibi) üzerinden set edilir.
-- Bu fonksiyon bilerek security definer DEĞİL: current_user çağıranın rolünü göstermeli.
create or replace function public.protect_user_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.role := old.role;
    new.workspace_id := old.workspace_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_protect_user_fields on public.users;
create trigger tr_protect_user_fields
  before update on public.users
  for each row
  execute function public.protect_user_fields();

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

-- Ekleme: Kullanıcı sadece erişim hakkı olan bir sohbete kendi adına mesaj gönderebilir
create policy "messages_insert_policy" on public.messages
  for insert
  with check (
    (
      auth.uid() = sender_uid
      and exists (
        select 1 from public.chats c
        where c.id = messages.chat_id
        and (
          c.workspace_id = public.current_user_workspace_id()
          or auth.uid()::text = any(c.participants)
        )
      )
    )
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
-- 6. INVITES TABLOSU VE REDEEM RPC
--------------------------------------------------------------------------------
alter table public.invites enable row level security;

-- Doğrudan okuma / ekleme / güncelleme / silme sadece admin'e açıktır.
create policy "invites_select_policy" on public.invites
  for select
  using (
    public.is_admin()
  );

create policy "invites_insert_policy" on public.invites
  for insert
  with check (
    public.is_admin()
  );

create policy "invites_update_policy" on public.invites
  for update
  using (
    public.is_admin()
  )
  with check (
    public.is_admin()
  );

create policy "invites_delete_policy" on public.invites
  for delete
  using (
    public.is_admin()
  );

-- Davet kullanma RPC'si (Security Definer)
-- Oturum açmış kullanıcının davet kodunu doğrular, daveti kullanıldı işaretler ve workspace_id atar.
create or replace function public.redeem_invite(code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Oturum açılmamış.';
  end if;

  select * into v_invite
  from public.invites
  where id::text = trim(redeem_invite.code)
    and used = false
  for update;

  if not found then
    raise exception 'Geçersiz veya kullanılmış davet kodu.';
  end if;

  update public.invites
  set used = true,
      used_by = v_user_id
  where id = v_invite.id;

  update public.users
  set workspace_id = v_invite.workspace_id
  where id = v_user_id;

  return v_invite.workspace_id::text;
end;
$$;

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

--------------------------------------------------------------------------------
-- 9. ESKİ SECRET TEMİZLİĞİ
--------------------------------------------------------------------------------
-- Eski client tarafından okunabilen açık anahtar kaydını temizle
delete from public.global_settings where id = 'gemini_api_key';
