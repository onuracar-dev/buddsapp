# BuddsApp 🚀
*A modern, real-time community chat platform with voice channels, stories, and AI integration.*

[Türkçe dökümantasyon için aşağı kaydırın / Scroll down for Turkish documentation](#buddsapp-türkçe-kılavuz-tr)

---

## 🌟 Features
- **Real-Time Messaging**: Built with Supabase Realtime for instant chat.
- **Voice Channels**: Powered by LiveKit for crystal-clear WebRTC audio communication.
- **Stories**: Upload 24-hour vanishing images and videos just like Instagram.
- **AI Companion**: Integrated Gemini AI bot (`@AI`) that remembers chat context and jokes with users.
- **Role-Based Access**: Granular roles (Admin, Moderator, Member) and customizable badges.
- **Server Discovery**: Join different workspaces/servers via invite links.
- **File Sharing**: Document previews (PDF, Word, Excel) integrated natively.

## 🛠 Tech Stack
- **Frontend**: React (Vite), Vanilla CSS (Custom Design System), Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL, Edge Functions, Storage)
- **Voice Infrastructure**: LiveKit Cloud
- **AI**: Google Gemini API

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- Node.js installed (v18+)
- A [Supabase](https://supabase.com) account
- A [LiveKit](https://cloud.livekit.io) account (for voice calls)
- A [Vercel](https://vercel.com) account (for deployment)

### 2. Clone & Install
```bash
git clone https://github.com/yourusername/buddsapp.git
cd buddsapp
npm install
```

### 3. Environment Variables (.env)
Rename `.env.example` to `.env` and fill in the blanks:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# LiveKit (For Voice Calls)
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud

# Admin Identity
VITE_ADMIN_EMAIL=your_admin_email@example.com
VITE_EASTER_EGG_PASS=your_secret_invitation_code
```

### 4. Supabase Setup
1. **Database Schema**: Execute the SQL commands found in `supabase/schema.sql` (if provided) in your Supabase SQL Editor.
2. **Authentication**: Enable Email login in Supabase Auth settings.
3. **Storage**: Create a public bucket named `chats` for media and file uploads.
4. **LiveKit Token Function**: Deploy the `supabase/functions/livekit-token` Edge Function and set `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` as Supabase secrets. Do not expose the LiveKit API secret in frontend `.env` files.
5. **Global Settings**: In your Supabase database, create a table `global_settings` and insert an row with `id='gemini_api_key'` and your Google Gemini API Key in `text_value`.

### 5. Running Locally
```bash
npm run dev
```

### 6. Deployment (Vercel)
Deploy easily using Vercel. Make sure to add your `.env` variables to Vercel's Environment Variables settings before deploying.
```bash
npx vercel --prod
```

---
---

# BuddsApp (Türkçe Kılavuz) 🇹🇷
*Ses kanalları, hikayeler ve Yapay Zeka entegrasyonu ile modern, gerçek zamanlı bir topluluk sohbet platformu.*

## 🌟 Özellikler
- **Gerçek Zamanlı Mesajlaşma**: Anında sohbet için Supabase Realtime altyapısı.
- **Ses Kanalları**: Net ve kesintisiz sesli iletişim için LiveKit (WebRTC) teknolojisi.
- **Hikayeler (Stories)**: Instagram tarzı 24 saat sonra kaybolan fotoğraf ve video paylaşımı.
- **Yapay Zeka Asistanı**: Sohbet geçmişini anlayan ve muhabbete katılan Google Gemini destekli `@AI` bot.
- **Rol ve Yetki Sistemi**: Yönetici, Moderatör ve Üye gibi detaylı rol dağılımı ve özel rozetler.
- **Sunucu Keşfi**: Davet linkleri ile farklı sunuculara (workspace) katılma.
- **Dosya Paylaşımı**: PDF, Word ve Excel dosyaları için yerleşik Google Docs görüntüleyicisi.

## 🛠 Kullanılan Teknolojiler
- **Önyüz (Frontend)**: React (Vite), Saf CSS, Lucide İkonları
- **Arkayüz & Veritabanı**: Supabase (PostgreSQL, Storage)
- **Ses Altyapısı**: LiveKit Cloud
- **Yapay Zeka**: Google Gemini API

---

## 🚀 Kurulum Rehberi

### 1. Gereksinimler
- Node.js (v18+)
- [Supabase](https://supabase.com) Hesabı (Veritabanı için)
- [LiveKit](https://cloud.livekit.io) Hesabı (Sesli sohbet için)
- [Vercel](https://vercel.com) Hesabı (Yayınlamak için)

### 2. İndirme ve Kurulum
```bash
git clone https://github.com/yourusername/buddsapp.git
cd buddsapp
npm install
```

### 3. Çevre Değişkenleri (.env)
Proje ana dizinindeki `.env.example` dosyasının adını `.env` olarak değiştirin ve içini kendi bilgilerinizle doldurun:
```env
VITE_SUPABASE_URL=senin_supabase_url_adresin
VITE_SUPABASE_ANON_KEY=senin_supabase_anon_key_şifren

# LiveKit (Ses Odaları İçin)
VITE_LIVEKIT_URL=wss://senin-projen.livekit.cloud

# Kurucu (Admin) Bilgileri
VITE_ADMIN_EMAIL=kendi_eposta_adresin@gmail.com
VITE_EASTER_EGG_PASS=gizli_giris_sifren
```
*(Not: `VITE_ADMIN_EMAIL` kısmına yazdığınız e-posta ile kayıt olduğunuzda sistem size otomatik "Kurucu" yetkisi verecektir. `VITE_EASTER_EGG_PASS` ise davet ekranındaki gizli şifredir.)*

### 4. Supabase Ayarları
1. **Veritabanı**: Supabase SQL editöründen gerekli tablo yapılarını kurun.
2. **Kayıt Sistemi (Auth)**: Supabase Auth ayarlarından "Email" ile girişi aktif edin.
3. **Depolama (Storage)**: Medya dosyaları için `chats` isminde "Public" bir bucket (kutu) oluşturun.
4. **LiveKit Token Fonksiyonu**: `supabase/functions/livekit-token` Edge Function'ını deploy edin ve `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` değerlerini Supabase secrets olarak tanımlayın. LiveKit API secret değerini frontend `.env` dosyasına koymayın.
5. **Yapay Zeka Ayarı**: Veritabanınızda `global_settings` adında bir tablo oluşturup, `id` kısmına `gemini_api_key`, `text_value` kısmına ise Google Gemini API anahtarınızı girin.

### 5. Bilgisayarda Çalıştırma
```bash
npm run dev
```

### 6. Yayınlama (Vercel)
Projeyi internete açmak için Vercel'i kullanabilirsiniz. Terminale aşağıdaki kodu yazmadan önce, Vercel paneline girip projeyi oluştururken `.env` içindeki tüm şifreleri Vercel ayarlarından eklemeyi unutmayın!
```bash
npx vercel --prod
```
