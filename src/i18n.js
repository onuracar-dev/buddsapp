import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      settings: 'Settings',
      theme: 'Theme',
      language: 'Language',
      accentColor: 'Accent Color',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      system: 'System',
      save: 'Save',
      back: 'Back',
      logout: 'Logout',
      profile: 'Profile',
      chats: 'Chats',
      stories: 'Stories',
      newChat: 'New Chat'
    }
  },
  tr: {
    translation: {
      settings: 'Ayarlar',
      theme: 'Tema',
      language: 'Dil',
      accentColor: 'Vurgu Rengi',
      darkMode: 'Karanlık Mod',
      lightMode: 'Aydınlık Mod',
      system: 'Sistem',
      save: 'Kaydet',
      back: 'Geri',
      logout: 'Çıkış Yap',
      profile: 'Profil',
      chats: 'Sohbetler',
      stories: 'Hikayeler',
      newChat: 'Yeni Sohbet'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'tr', // Kullanıcının önceki dil seçimi
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
