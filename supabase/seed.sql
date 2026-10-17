-- BuddsApp Demo Seed Verisi
-- 1 Demo Workspace, 5 Sahte Kullanıcı Profili ve Doğal Bir Sohbet Geçmişi

-- 1. Workspace
insert into public.workspaces (id, name, created_at)
values 
  ('a0000000-0000-0000-0000-000000000001', 'Demo Workspace', now() - interval '7 days')
on conflict (id) do update set name = excluded.name;

-- 2. Demo Kullanıcı Profilleri
insert into public.users (id, display_name, username, email, role, photo_url, workspace_id, message_count, last_seen, created_at)
values
  ('u0000000-0000-0000-0000-000000000001', 'Demo User 1', 'demo_admin', 'demo1@example.com', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo1', 'a0000000-0000-0000-0000-000000000001', 12, now(), now() - interval '7 days'),
  ('u0000000-0000-0000-0000-000000000002', 'Demo User 2', 'demo_user2', 'demo2@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo2', 'a0000000-0000-0000-0000-000000000001', 8, now() - interval '10 minutes', now() - interval '6 days'),
  ('u0000000-0000-0000-0000-000000000003', 'Demo User 3', 'demo_user3', 'demo3@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo3', 'a0000000-0000-0000-0000-000000000001', 5, now() - interval '30 minutes', now() - interval '5 days'),
  ('u0000000-0000-0000-0000-000000000004', 'Demo User 4', 'demo_user4', 'demo4@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo4', 'a0000000-0000-0000-0000-000000000001', 4, now() - interval '1 hour', now() - interval '4 days'),
  ('u0000000-0000-0000-0000-000000000005', 'Demo User 5', 'demo_user5', 'demo5@example.com', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo5', 'a0000000-0000-0000-0000-000000000001', 3, now() - interval '2 hours', now() - interval '3 days')
on conflict (id) do update set 
  display_name = excluded.display_name,
  role = excluded.role,
  workspace_id = excluded.workspace_id;

-- 3. Demo Davet Kodu
insert into public.invites (id, workspace_id, created_by, used, created_at)
values
  ('DEMO-INVITE-2026', 'a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', false, now())
on conflict (id) do nothing;

-- 4. Demo Sohbet Odası (Genel Kanal)
insert into public.chats (id, name, type, workspace_id, participants, allow_speaking, last_message, created_at)
values
  (
    'c0000000-0000-0000-0000-000000000001',
    'Genel Sohbet',
    'public_group',
    'a0000000-0000-0000-0000-000000000001',
    array['u0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000004', 'u0000000-0000-0000-0000-000000000005'],
    true,
    jsonb_build_object('text', 'Yayın hazırlıkları tamam, repoyu inceleyebilirsiniz.', 'senderUid', 'u0000000-0000-0000-0000-000000000001', 'timestamp', now()),
    now() - interval '2 days'
  )
on conflict (id) do update set name = excluded.name;

-- 5. Doğal Sohbet Mesajları (24 Mesaj)
insert into public.messages (id, chat_id, sender_uid, type, content, read_by, created_at)
values
  ('m0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'text', 'Selam herkese! Demo workspace ortamına hoş geldiniz.', array['u0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002'], now() - interval '180 minutes'),
  ('m0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'text', 'Hoş bulduk! Edge function geçişi tamamlandı mı?', array['u0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002'], now() - interval '175 minutes'),
  ('m0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'text', 'Evet, hem LiveKit token üretimi hem de Gemini AI proxy fonksiyonu Edge Functions tarafına taşındı.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '170 minutes'),
  ('m0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'text', 'Böylece tarayıcı bundle içerisine hiçbir secret sızmıyor, çok iyi olmuş.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '165 minutes'),
  ('m0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'ai_bot', 'Secret yönetimi dediğin böyle olur kanka. Client tarafına anahtar bırakılmaz! 😎', array['u0000000-0000-0000-0000-000000000001'], now() - interval '164 minutes'),
  ('m0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004', 'text', 'Budds AI da hemen lafa girdi haha 😂', array['u0000000-0000-0000-0000-000000000001'], now() - interval '160 minutes'),
  ('m0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'text', 'Sesli oda bağlantılarını test ettiniz mi?', array['u0000000-0000-0000-0000-000000000001'], now() - interval '150 minutes'),
  ('m0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000001', 'text', 'Evet, LiveKit Room entegrasyonu gayet stabil çalışıyor. Yetkilendirme kontrolü de Edge Function içinde yapılıyor.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '145 minutes'),
  ('m0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000005', 'text', 'Mobil görünümde 375px genişlikte denediniz mi hiç?', array['u0000000-0000-0000-0000-000000000001'], now() - interval '130 minutes'),
  ('m0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000003', 'text', 'Evet, yatay kaydırma tamamen kaldırıldı, mesaj balonları ve input bar dar ekrana tam oturuyor.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '125 minutes'),
  ('m0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000004', 'text', 'Arayüzdeki tasarım token seti de index.css içinde tek bir `:root` yapısında toplandı.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '110 minutes'),
  ('m0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000002', 'text', 'RLS politikaları hangi tabloları kapsıyor şu an?', array['u0000000-0000-0000-0000-000000000001'], now() - interval '100 minutes'),
  ('m0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001', 'text', 'users, workspaces, chats, messages, calls, invites, stories ve global_settings. Her kullanıcı yalnızca kendi çalışma alanını görebiliyor.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '95 minutes'),
  ('m0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000003', 'text', 'Admin yetkisi de email karşılaştırması yerine veritabanındaki role kolonuna bağlandı.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '80 minutes'),
  ('m0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000005', 'text', 'Peki self-host etmek isteyen biri ne yapacak?', array['u0000000-0000-0000-0000-000000000001'], now() - interval '70 minutes'),
  ('m0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000001', 'text', 'README ve landing sayfasındaki adımları izleyecek: Supabase projesi oluşturup SQL migration ve seed dosyasını çalıştıracak, ortam değişkenlerini girecek.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '65 minutes'),
  ('m0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000002', 'text', 'Gerçekten çok temiz ve yalın bir mimari oldu.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '50 minutes'),
  ('m0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-000000000004', 'text', 'Tanıtım sitesi de hazır mı?', array['u0000000-0000-0000-0000-000000000001'], now() - interval '40 minutes'),
  ('m0000000-0000-0000-0000-000000000019', 'c0000000-0000-0000-0000-000000000001', 'text', 'Evet, landing/ altında bağımsız statik bir sayfa olarak buddsapp.onuracar.dev adresine deploy edilecek.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '35 minutes'),
  ('m0000000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000003', 'text', 'Tüm mühendislik kararları ve mimari diyagramı da yer alıyor mu?', array['u0000000-0000-0000-0000-000000000001'], now() - interval '20 minutes'),
  ('m0000000-0000-0000-0000-000000000021', 'c0000000-0000-0000-0000-000000000001', 'text', 'Evet, problem-çözüm kartları ve inline SVG mimari şeması dahil edildi.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '15 minutes'),
  ('m0000000-0000-0000-0000-000000000022', 'c0000000-0000-0000-0000-000000000002', 'text', 'Elinize sağlık!', array['u0000000-0000-0000-0000-000000000001'], now() - interval '10 minutes'),
  ('m0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000005', 'text', 'Son kontrolleri yapıp yayına geçebiliriz o zaman.', array['u0000000-0000-0000-0000-000000000001'], now() - interval '5 minutes'),
  ('m0000000-0000-0000-0000-000000000024', 'c0000000-0000-0000-0000-000000000001', 'text', 'Yayın hazırlıkları tamam, repoyu inceleyebilirsiniz.', array['u0000000-0000-0000-0000-000000000001'], now())
on conflict (id) do nothing;
