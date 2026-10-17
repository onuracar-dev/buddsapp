-- BuddsApp Demo Seed Verisi
-- 1 Demo Workspace, 5 Sahte Kullanıcı Profili ve Doğal Bir Sohbet Geçmişi
--
-- ÖNEMLİ: public.users.id kolonu auth.users tablosuna foreign key ile bağlı olabilir.
-- Bu seed dosyasını çalıştırmadan önce Supabase Dashboard -> Authentication -> Users sekmesinden
-- demo kullanıcıları (özellikle demo1@example.com) oluşturun ve üretilen Auth UUID değerlerini
-- aşağıdaki users tablosundaki id alanlarına yazın.

-- 1. Workspace
insert into public.workspaces (id, name, created_at)
values 
  ('00000000-0000-0000-0000-000000000001', 'Demo Workspace', now() - interval '7 days')
on conflict (id) do update set name = excluded.name;

-- 2. Demo Kullanıcı Profilleri
insert into public.users (id, display_name, username, email, role, photo_url, workspace_id, message_count, last_seen, created_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'Demo User 1', 'demo_admin', 'demo1@example.com', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo1', '00000000-0000-0000-0000-000000000001', 12, now(), now() - interval '7 days'),
  ('00000000-0000-0000-0000-0000000000a2', 'Demo User 2', 'demo_user2', 'demo2@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo2', '00000000-0000-0000-0000-000000000001', 8, now() - interval '10 minutes', now() - interval '6 days'),
  ('00000000-0000-0000-0000-0000000000a3', 'Demo User 3', 'demo_user3', 'demo3@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo3', '00000000-0000-0000-0000-000000000001', 5, now() - interval '30 minutes', now() - interval '5 days'),
  ('00000000-0000-0000-0000-0000000000a4', 'Demo User 4', 'demo_user4', 'demo4@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo4', '00000000-0000-0000-0000-000000000001', 4, now() - interval '1 hour', now() - interval '4 days'),
  ('00000000-0000-0000-0000-0000000000a5', 'Demo User 5', 'demo_user5', 'demo5@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo5', '00000000-0000-0000-0000-000000000001', 3, now() - interval '2 hours', now() - interval '3 days')
on conflict (id) do update set 
  display_name = excluded.display_name,
  role = excluded.role,
  workspace_id = excluded.workspace_id;

-- 3. Demo Davet Kodu (Valid Hex UUID)
insert into public.invites (id, workspace_id, created_by, used, created_at)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', false, now())
on conflict (id) do nothing;

-- 4. Demo Sohbet Odası (Genel Kanal)
insert into public.chats (id, name, type, workspace_id, participants, allow_speaking, last_message, created_at)
values
  (
    '00000000-0000-0000-0000-0000000000c1',
    'Genel Sohbet',
    'public_group',
    '00000000-0000-0000-0000-000000000001',
    array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5'],
    true,
    jsonb_build_object('text', 'Yayın hazırlıkları tamam, repoyu inceleyebilirsiniz.', 'senderUid', '00000000-0000-0000-0000-0000000000a1', 'timestamp', now()),
    now() - interval '2 days'
  )
on conflict (id) do update set name = excluded.name;

-- 5. Doğal Sohbet Mesajları (24 Mesaj - Valid Hex UUIDs)
insert into public.messages (id, chat_id, sender_uid, type, content, read_by, created_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'text', 'Selam herkese! Demo workspace ortamına hoş geldiniz.', array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2'], now() - interval '180 minutes'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'text', 'Hoş bulduk! Edge function geçişi tamamlandı mı?', array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2'], now() - interval '175 minutes'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'text', 'Evet, hem LiveKit token üretimi hem de Gemini AI proxy fonksiyonu Edge Functions tarafına taşındı.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '170 minutes'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'text', 'Böylece tarayıcı bundle içerisine hiçbir secret sızmıyor, çok iyi olmuş.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '165 minutes'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'ai_bot', 'Secret yönetimi dediğin böyle olur kanka. Client tarafına anahtar bırakılmaz! 😎', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '164 minutes'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'text', 'Budds AI da hemen lafa girdi haha 😂', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '160 minutes'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'text', 'Sesli oda bağlantılarını test ettiniz mi?', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '150 minutes'),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'text', 'Evet, LiveKit Room entegrasyonu gayet stabil çalışıyor. Yetkilendirme kontrolü de Edge Function içinde yapılıyor.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '145 minutes'),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a5', 'text', 'Mobil görünümde 375px genişlikte denediniz mi hiç?', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '130 minutes'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'text', 'Evet, yatay kaydırma tamamen kaldırıldı, mesaj balonları ve input bar dar ekrana tam oturuyor.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '125 minutes'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'text', 'Arayüzdeki tasarım token seti de index.css içinde tek bir `:root` yapısında toplandı.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '110 minutes'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'text', 'RLS politikaları hangi tabloları kapsıyor şu an?', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '100 minutes'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'text', 'users, workspaces, chats, messages, calls, invites, stories ve global_settings. Her kullanıcı yalnızca kendi çalışma alanını görebiliyor.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '95 minutes'),
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'text', 'Admin yetkisi de email karşılaştırması yerine veritabanındaki role kolonuna bağlandı.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '80 minutes'),
  ('00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a5', 'text', 'Davet kodları da artık redeem_invite RPC fonksiyonu üzerinden işleniyor.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '70 minutes'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'text', 'Aynen öyle, invites tablosuna doğrudan erişim sadece admin rolüne açık.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '60 minutes'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'text', 'PWA önbelleği de düzgün senkronize oluyor mu?', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '50 minutes'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'text', 'Vite PWA plugin devrede, service worker güncelleme akışı pürüzsüz.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '40 minutes'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'ai_bot', 'PWA dedin de aklıma geldi, masaüstüne yükleyip tam ekran kullanınca yağ gibi akıyor! 🚀', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '39 minutes'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'text', 'Haha Budds AI haklı. Responsive tarafta da padding ve marginler çok temiz oturdu.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '30 minutes'),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a5', 'text', 'GitHub repo dokümantasyonu da self-host adımlarıyla birlikte güncellendi mi?', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '20 minutes'),
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'text', 'Evet, hem README hem de landing showcase sayfası adım adım self-host talimatlarını içeriyor.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '15 minutes'),
  ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'text', 'Harika iş! Eline sağlık herkesin.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '5 minutes'),
  ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'text', 'Yayın hazırlıkları tamam, repoyu inceleyebilirsiniz.', array['00000000-0000-0000-0000-0000000000a1'], now() - interval '1 minute');
