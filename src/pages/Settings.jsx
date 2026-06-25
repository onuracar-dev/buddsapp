import React, { useState, useEffect } from 'react';
import { ArrowLeft, Moon, Sun, Monitor, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [accent, setAccent] = useState(localStorage.getItem('accent') || 'blue');

  const themes = [
    { id: 'light', name: t('lightMode'), icon: <Sun size={20} /> },
    { id: 'dark', name: t('darkMode'), icon: <Moon size={20} /> },
    { id: 'system', name: t('system'), icon: <Monitor size={20} /> }
  ];

  const accents = [
    { id: 'blue', color: '#0084ff', label: 'Blue' },
    { id: 'green', color: '#10b981', label: 'Green' },
    { id: 'purple', color: '#8b5cf6', label: 'Purple' },
    { id: 'orange', color: '#f97316', label: 'Orange' },
    { id: 'pink', color: '#ec4899', label: 'Pink' }
  ];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('accent', accent);
  }, [accent]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="flex-col" style={{ height: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex-center glass" style={{ padding: '15px 20px', justifyContent: 'flex-start', gap: '15px' }}>
        <button onClick={() => navigate('/')} style={{ padding: '5px', background: 'transparent' }}>
          <ArrowLeft size={24} color="var(--text-primary)" />
        </button>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>{t('settings')}</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Language Section */}
        <section>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '10px' }}>{t('language')}</h3>
          <div className="glass shadow-sm" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div onClick={() => changeLanguage('tr')} className="flex-between" style={{ padding: '15px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: i18n.language === 'tr' ? '600' : '400' }}>Türkçe</span>
              {i18n.language === 'tr' && <Check size={20} color="var(--primary)" />}
            </div>
            <div onClick={() => changeLanguage('en')} className="flex-between" style={{ padding: '15px', cursor: 'pointer' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: i18n.language === 'en' ? '600' : '400' }}>English</span>
              {i18n.language === 'en' && <Check size={20} color="var(--primary)" />}
            </div>
          </div>
        </section>

        {/* Theme Section */}
        <section>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '10px' }}>{t('theme')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {themes.map(tOption => (
              <div 
                key={tOption.id} 
                onClick={() => setTheme(tOption.id)}
                className="flex-col glass shadow-sm" 
                style={{ 
                  alignItems: 'center', padding: '15px 10px', gap: '10px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: theme === tOption.id ? '2px solid var(--primary)' : '2px solid transparent'
                }}
              >
                <div style={{ color: theme === tOption.id ? 'var(--primary)' : 'var(--text-secondary)' }}>
                  {tOption.icon}
                </div>
                <span style={{ fontSize: '0.85rem', color: theme === tOption.id ? 'var(--primary)' : 'var(--text-primary)', fontWeight: '500' }}>
                  {tOption.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Accent Color Section */}
        <section>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '10px' }}>{t('accentColor')}</h3>
          <div className="glass shadow-sm" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
            {accents.map(acc => (
              <div 
                key={acc.id}
                onClick={() => setAccent(acc.id)}
                style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', background: acc.color, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: accent === acc.id ? `0 0 0 3px var(--background), 0 0 0 5px ${acc.color}` : 'none',
                  transform: accent === acc.id ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s'
                }}
              >
                {accent === acc.id && <Check size={20} color="#fff" />}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
