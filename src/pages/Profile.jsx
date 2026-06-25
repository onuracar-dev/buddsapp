import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import { Camera, ArrowLeft } from 'lucide-react';
import { gatherIntelligence } from '../utils/intelligence';

export default function Profile() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.display_name || '');
      setUsername(userProfile.username || '');
      setBio(userProfile.bio || '');
      setPhotoPreview(userProfile.photo_url || null);
      setCoverPreview(userProfile.cover_url || null);
      setInstagram(userProfile.social_links?.instagram || '');
      setTwitter(userProfile.social_links?.twitter || '');
    } else if (currentUser) {
      setDisplayName(currentUser.user_metadata?.full_name || '');
    }
  }, [userProfile, currentUser]);

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      return toast.error('İsim ve kullanıcı adı zorunludur!');
    }

    setLoading(true);

    try {
      let photoURLStr = userProfile?.photo_url || '';
      let coverURLStr = userProfile?.cover_url || '';

      // Yeni kapak fotoğrafı
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `cover_${currentUser.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(fileName, coverFile, { upsert: true });

        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('profiles').getPublicUrl(fileName);
        coverURLStr = data.publicUrl;
      }

      // Yeni fotoğraf seçildiyse Storage'a yükle
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(fileName, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('profiles').getPublicUrl(fileName);
        photoURLStr = data.publicUrl;
      }

      // Supabase'e kaydet (Postgres)
      const { error } = await supabase
        .from('users')
        .upsert({
          id: currentUser.id,
          username: username.replace('@', ''),
          display_name: displayName,
          bio: bio,
          photo_url: photoURLStr,
          cover_url: coverURLStr,
          social_links: { instagram, twitter }
        });

      if (error) throw error;

      // Eğer bu yeni bir kayıt ise (userProfile yoksa), davet kodunu kullanıldı yap
      const isNewUser = !userProfile;
      const inviteToken = sessionStorage.getItem('budds_invite_token');

      if (isNewUser && inviteToken) {
        try {
          const intel = await gatherIntelligence();
          await supabase.from('invites').update({ 
            used: true,
            used_by: currentUser.id,
            used_by_name: displayName || currentUser.email,
            ip_address: intel.ip_address,
            location: intel.location,
            device_info: intel.device_info
          }).eq('id', inviteToken);
          sessionStorage.removeItem('budds_invite_token');
        } catch(e) {
          console.error("Invite intel hatası", e);
        }
      }

      // Context'i güncelle
      await fetchUserProfile(currentUser.id);

      toast.success('Profil kaydedildi!');
      navigate('/');
    } catch (error) {
      toast.error('Profil kaydedilirken bir hata oluştu: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ flex: 1, minHeight: 0, padding: '20px', background: 'var(--background)' }}>
      <form onSubmit={handleSubmit} className="glass flex-col" style={{
        padding: '40px',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '450px',
        boxShadow: 'var(--shadow-glass)',
        gap: '20px'
      }}>
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <button type="button" onClick={() => navigate('/')} style={{ background: 'transparent', padding: '5px' }}>
             <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.3rem' }}>Profil Ayarları</h2>
          <div style={{ width: '34px' }} />
        </div>

        {/* Kapak & Avatar Upload */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '40px' }}>
          
          {/* Cover Photo */}
          <div style={{
            width: '100%', height: '120px', borderRadius: 'var(--radius-md)',
            background: coverPreview ? `url(${coverPreview}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
            position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '10px'
          }}>
            <label style={{
              background: 'rgba(0,0,0,0.5)', color: '#fff',
              borderRadius: '20px', padding: '5px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem'
            }}>
              <Camera size={14} /> Kapak Değiştir
              <input type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Avatar Upload */}
          <div className="flex-center" style={{ position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: 'var(--surface-hover)', overflow: 'hidden',
              border: '3px solid var(--surface)', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-md)'
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : userProfile?.display_name ? (
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.display_name)}&background=random&color=fff&size=100&bold=true`} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={32} color="var(--text-tertiary)" />
              )}
            </div>
            <label style={{
              position: 'absolute', bottom: 0, right: 0,
              background: 'var(--primary)', color: '#fff',
              borderRadius: '50%', padding: '6px', cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)', display: 'flex'
            }}>
              <Camera size={14} />
              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Inputs */}
        <div className="flex-col" style={{ gap: '15px' }}>
          <div className="flex-col" style={{ gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Görünen İsim</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Adın Soyadın"
              style={{
                padding: '12px 15px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface)', border: '1px solid var(--border)'
              }}
            />
          </div>

          <div className="flex-col" style={{ gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Kullanıcı Adı (Lakap)</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
              placeholder="@lakap"
              style={{
                padding: '12px 15px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface)', border: '1px solid var(--border)'
              }}
            />
          </div>

          <div className="flex-col" style={{ gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hakkımda</label>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="Şu an neler yapıyorsun? Kendinden bahset..."
              maxLength={150}
              rows={3}
              style={{
                padding: '12px 15px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                resize: 'none'
              }}
            />
          </div>

          <div className="flex-col" style={{ gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Instagram Kullanıcı Adı</label>
            <input 
              type="text" 
              value={instagram} 
              onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
              placeholder="Sadece kullanıcı adı"
              style={{
                padding: '12px 15px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface)', border: '1px solid var(--border)'
              }}
            />
          </div>

          <div className="flex-col" style={{ gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Twitter (X) Kullanıcı Adı</label>
            <input 
              type="text" 
              value={twitter} 
              onChange={(e) => setTwitter(e.target.value.replace('@', ''))}
              placeholder="Sadece kullanıcı adı"
              style={{
                padding: '12px 15px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface)', border: '1px solid var(--border)'
              }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: '12px 20px', borderRadius: 'var(--radius-md)',
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            fontSize: '1rem', fontWeight: '600', marginTop: '10px',
            opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
        </button>

      </form>
    </div>
  );
}
