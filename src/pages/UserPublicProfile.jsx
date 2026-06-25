import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, MessageCircle, Info, ExternalLink, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserPublicProfile() {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', color: 'var(--text-primary)' }}>
        <Activity className="spin" size={48} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-center flex-col" style={{ height: '100vh', color: 'var(--text-primary)' }}>
        <h2>Kullanıcı Bulunamadı</h2>
        <button onClick={() => navigate('/')} className="btn-primary mt-3">Geri Dön</button>
      </div>
    );
  }

  const badges = profile.badges || [];
  const socialLinks = profile.social_links || {};

  return (
    <div className="flex-col" style={{ minHeight: '100vh', background: 'var(--bg-color)', overflowY: 'auto', paddingBottom: '100px' }}>
      
      {/* Kapak Fotoğrafı */}
      <div style={{
        width: '100%',
        height: '250px',
        background: profile.cover_url ? `url(${profile.cover_url})` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        {/* Geri Butonu */}
        <button 
          onClick={() => navigate(-1)} 
          style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Profil Detayları */}
      <div style={{ padding: '0 20px', marginTop: '-60px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Avatar */}
        <img 
          src={profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name)}&background=random&color=fff&size=150&bold=true`}
          alt="Avatar"
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid var(--bg-color)',
            boxShadow: 'var(--shadow-md)',
            background: 'var(--surface)'
          }}
        />

        {/* İsim ve Düzenle Butonu */}
        <div className="flex-center mt-3" style={{ gap: '10px' }}>
          <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>{profile.display_name}</h1>
          {currentUser?.id === userId && (
            <button onClick={() => navigate('/profile')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem' }}>Profili Düzenle</button>
          )}
        </div>

        {/* Mesaj Butonu */}
        {currentUser?.id !== userId && (
          <button 
            className="btn-primary mt-3"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 25px', borderRadius: '25px', fontSize: '1rem' }}
          >
            <MessageCircle size={20} />
            Mesaj Gönder
          </button>
        )}

        {/* Biyografi */}
        <div style={{ marginTop: '25px', width: '100%', maxWidth: '600px', background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Info size={18} color="var(--primary)" />
            Hakkında
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
            {profile.bio || "Bu kullanıcı henüz kendinden bahsetmemiş."}
          </p>
        </div>

        {/* İstatistikler & Rozetler */}
        <div style={{ marginTop: '20px', width: '100%', maxWidth: '600px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{profile.message_count || 0}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>Toplam Mesaj</span>
          </div>

          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: 'var(--text-primary)' }}>Rozetler</h4>
            <div className="flex-center" style={{ gap: '10px', flexWrap: 'wrap' }}>
              {badges.length > 0 ? (
                badges.map((badge, idx) => (
                  <div key={idx} style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {badge}
                  </div>
                ))
              ) : (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Henüz rozet yok</span>
              )}
            </div>
          </div>

        </div>

        {/* Sosyal Medya Linkleri */}
        {Object.keys(socialLinks).length > 0 && (
          <div style={{ marginTop: '20px', width: '100%', maxWidth: '600px', background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <ExternalLink size={18} color="var(--accent)" />
              Sosyal Ağlar
            </h3>
            <div className="flex-col" style={{ gap: '10px' }}>
              {socialLinks.instagram && (
                <a href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#E1306C', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📸 Instagram: {socialLinks.instagram}
                </a>
              )}
              {socialLinks.twitter && (
                <a href={`https://twitter.com/${socialLinks.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#1DA1F2', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🐦 Twitter: {socialLinks.twitter}
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
