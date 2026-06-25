import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMusic } from '../contexts/MusicContext';
import useChats from '../hooks/useChats';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogOut, MessageSquarePlus, Settings, Image as ImageIcon, ShieldAlert, Users, ChevronDown } from 'lucide-react';
import NewChatModal from '../components/chat/NewChatModal';
import StoriesTray from '../components/stories/StoriesTray';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import imageCompression from 'browser-image-compression';
import { supabase } from '../supabase';

export default function Home() {
  const { currentUser, userProfile, logout, activeWorkspaceId, workspaces, changeWorkspace } = useAuth();
  const { tuneIn, forcePlay } = useMusic();
  const { chats, loading } = useChats();
  const navigate = useNavigate();
  const [showNewChat, setShowNewChat] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [globalBg, setGlobalBg] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [publicRooms, setPublicRooms] = useState([]);
  const isAdmin = userProfile?.isAdmin || false;

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('home_bg_url').eq('id', 'global').single();
        if (data && data.home_bg_url) setGlobalBg(data.home_bg_url);
      } catch (e) {}
    };
    
    const fetchPublicRooms = async () => {
      if (!activeWorkspaceId) {
        setPublicRooms([]);
        return;
      }
      const { data } = await supabase.from('chats').select('*').eq('type', 'public_group').eq('workspace_id', activeWorkspaceId).order('created_at', { ascending: true });
      if (data) setPublicRooms(data);
    };

    fetchSettings();
    fetchPublicRooms();
  }, [activeWorkspaceId]);

  React.useEffect(() => {
    const fetchProfiles = async () => {
      if (!chats || chats.length === 0) return;
      const uids = new Set();
      chats.forEach(chat => chat?.participants?.forEach(id => {
        if (id !== currentUser.id) uids.add(id);
      }));
      if (uids.size === 0) return;
      
      const { data } = await supabase.from('users').select('id, display_name, photo_url').in('id', Array.from(uids));
      if (data) {
        const map = {};
        data.forEach(u => map[u.id] = u);
        setUserProfiles(map);
      }
    };
    fetchProfiles();
  }, [chats, currentUser.id]);

  const handleGlobalBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const toastId = toast.loading('Anasayfa arka planı yükleniyor...');
    try {
      // Sıkıştırma ayarları
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      
      const fileExt = compressedFile.name.split('.').pop() || 'jpeg';
      const filePath = `global_bg_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('chats').upload(filePath, compressedFile);
      if (error) throw error;
      const { data } = supabase.storage.from('chats').getPublicUrl(filePath);
      
      await supabase.from('app_settings').upsert({ id: 'global', home_bg_url: data.publicUrl });
      setGlobalBg(data.publicUrl);
      toast.success('Anasayfa arka planı güncellendi!', { id: toastId });
    } catch(err) { 
      toast.error('Arka plan yüklenemedi', { id: toastId }); 
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Çıkış yapıldı');
    } catch (error) {
      toast.error('Çıkış yapılamadı: ' + error.message);
    }
  };

  const getChatName = (chat) => {
    if (chat?.type === 'group' || chat?.type === 'public_group') return chat.name;
    const isSpyMode = isAdmin && chat?.participants?.length > 0 && !chat.participants.includes(currentUser.id);
    if (isSpyMode && chat?.participants?.length >= 2) {
      return `${userProfiles[chat.participants[0]]?.display_name || 'Bilinmiyor'} || ${userProfiles[chat.participants[1]]?.display_name || 'Bilinmiyor'} Sohbeti`;
    }
    const otherUserId = chat?.participants?.find(id => id !== currentUser.id);
    if (!otherUserId) return 'Kendi Kendine Sohbet';
    return userProfiles[otherUserId]?.display_name || `Bilinmeyen (Silinmiş Hesap)`; 
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return format(timestamp, 'HH:mm', { locale: tr });
  };

  const getStreak = (chat) => {
    if (!chat.streak_count || !chat.streak_last_date) return 0;
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastStreakStr = new Date(chat.streak_last_date).toDateString();
    
    if (lastStreakStr === todayStr || lastStreakStr === yesterday.toDateString()) {
      return chat.streak_count;
    }
    return 0; // Sönmüş
  };

  return (
    <div className="flex-col" style={{ flex: 1, minHeight: 0, background: globalBg ? `url(${globalBg}) center/cover no-repeat` : 'var(--background)', position: 'relative', overflow: 'hidden' }}>
      {/* Navbar */}
      <div className="flex-between glass" style={{ 
        padding: '15px 20px', 
        borderBottom: '1px solid var(--border)',
        zIndex: 10
      }}>
        <div className="flex-center" style={{ gap: '10px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: '700', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>BuddsApp</h2>
          {isAdmin && workspaces.length > 0 && (
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 14px', 
                  borderRadius: 'var(--radius-full)', 
                  background: 'var(--primary)', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {workspaces.find(ws => ws.id === activeWorkspaceId)?.name || 'Mekan Seç'}
                <ChevronDown size={14} strokeWidth={3} style={{ transform: isWorkspaceMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </div>
              
              {isWorkspaceMenuOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                    onClick={() => setIsWorkspaceMenuOpen(false)} 
                  />
                  <div 
                    className="glass flex-col"
                    style={{ 
                      position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '150px',
                      background: 'rgba(20, 20, 30, 0.95)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', padding: '5px', zIndex: 100,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(10px)',
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    {workspaces.map(ws => (
                      <div 
                        key={ws.id}
                        onClick={() => { changeWorkspace(ws.id); setIsWorkspaceMenuOpen(false); }}
                        style={{
                          padding: '10px 15px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                          color: ws.id === activeWorkspaceId ? 'var(--primary)' : '#fff',
                          background: ws.id === activeWorkspaceId ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                          fontWeight: ws.id === activeWorkspaceId ? 'bold' : 'normal',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => { if(ws.id !== activeWorkspaceId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseOut={(e) => { if(ws.id !== activeWorkspaceId) e.currentTarget.style.background = 'transparent' }}
                      >
                        {ws.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-center" style={{ gap: '15px' }}>
          {isAdmin && (
            <>
              <button 
                onClick={() => navigate('/admin')}
                style={{ padding: '8px', borderRadius: '50%', background: 'transparent' }}
                title="Yönetim Paneli"
              >
                <ShieldAlert size={20} color="var(--primary)" />
              </button>
              <label style={{ padding: '8px', cursor: 'pointer', background: 'transparent' }} title="Anasayfa Arka Planını Değiştir (Global)">
                <ImageIcon size={20} color="var(--primary)" />
                <input type="file" accept="image/*" onChange={handleGlobalBgUpload} style={{ display: 'none' }} />
              </label>
            </>
          )}
          <button 
            onClick={() => navigate('/members')}
            style={{ padding: '8px', borderRadius: '50%', background: 'transparent' }}
            title="Topluluk"
          >
            <Users size={20} color="var(--primary)" />
          </button>
          <button 
            onClick={() => navigate('/settings')}
            style={{ padding: '8px', borderRadius: '50%', background: 'transparent' }}
          >
            <Settings size={20} color="var(--text-secondary)" />
          </button>
          {userProfile?.photo_url ? (
            <img 
              src={userProfile.photo_url} 
              alt="Profil" 
              onClick={() => navigate(`/user/${currentUser.id}`)}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} 
            />
          ) : (
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.display_name || 'U')}&background=3b82f6&color=fff&size=100&bold=true`}
              alt="Profil" 
              onClick={() => navigate(`/user/${currentUser.id}`)}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} 
            />
          )}
          <button 
            onClick={handleLogout}
            style={{ padding: '8px', background: 'transparent' }}
            title="Çıkış Yap"
          >
            <LogOut size={20} color="var(--danger)" />
          </button>
        </div>
      </div>

      {/* Hikayeler (Stories) */}
      <StoriesTray />

      {/* Chat Listesi Konteyneri */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        
        {/* Resmi Odalar (Public Groups) */}
        {publicRooms.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 10px', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>🌐 Resmi Odalar</h3>
            <div className="flex-col" style={{ gap: '8px' }}>
              {publicRooms.map(room => (
                <div 
                  key={room.id} 
                  onClick={() => {
                    if (room.youtube_id) {
                      tuneIn(room.id, room.youtube_id, room.created_at, room.name);
                    }
                    navigate(`/chat/${room.id}`);
                  }}
                  className="flex-between glass"
                  style={{
                    padding: '12px 15px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s', background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div className="flex-center" style={{ gap: '15px' }}>
                    {room.photo_url ? (
                      <img 
                        src={room.photo_url} 
                        style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }} 
                        alt="Group Avatar" 
                      />
                    ) : (
                      <div className="flex-center" style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '1.2rem', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
                        {room.name.includes('Oyun') ? '🎮' : room.name.includes('Müzik') ? '🎵' : room.name.includes('Geyik') ? '☕' : '🌍'}
                      </div>
                    )}
                    <div className="flex-col">
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                        {room.name.includes('||') ? room.name.split('||')[0].trim() : room.name}
                      </span>
                      {room.name.includes('||') ? (
                        room.name.split('||')[1]?.trim() && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                            {room.name.split('||')[1].trim()}
                          </span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Açık Sohbet Odası</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm("Bu resmi odayı kalıcı olarak silmek istediğinize emin misiniz?")) return;
                        try {
                          const { supabase } = await import('../supabase');
                          await supabase.from('chats').delete().eq('id', room.id);
                        } catch(err) {}
                      }}
                      style={{ background: 'var(--danger)', color: '#fff', padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      Sil
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Özel Sohbetler (Private Chats) */}
        <h3 style={{ margin: '0 0 10px 10px', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>💬 Sohbetlerim</h3>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '20px' }}>Yükleniyor...</p>
        ) : chats.length === 0 ? (
          <div className="flex-center flex-col" style={{ height: '100%', color: 'var(--text-tertiary)', gap: '10px' }}>
            <MessageSquarePlus size={48} opacity={0.5} />
            <p>Henüz sohbetin yok. Sağ alttaki butondan başlat!</p>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: '5px' }}>
            {chats.filter(c => c?.type !== 'public_group').map(chat => (
              <div 
                key={chat.id} 
                onClick={() => {
                  if (chat.youtube_id) {
                    tuneIn(chat.id, chat.youtube_id, chat.created_at, chat.name);
                  }
                  navigate(`/chat/${chat.id}`);
                }}
                className="flex-between chat-item"
                style={{
                  padding: '15px', background: 'var(--surface)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s',
                  marginBottom: '8px', boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div className="flex-center" style={{ gap: '15px' }}>
                  {chat?.type?.includes('group') ? (
                    <img 
                      src={chat.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'G')}&background=random&color=fff&size=100&bold=true`}
                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--shadow-sm)' }}
                      alt="Avatar"
                    />
                  ) : (
                    <img 
                      src={userProfiles[chat?.participants?.find(id => id !== currentUser.id)]?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getChatName(chat))}&background=random&color=fff&size=100&bold=true`}
                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--shadow-sm)' }}
                      alt="Avatar"
                    />
                  )}
                  <div className="flex-col">
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                      {getChatName(chat)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '3px' }}>
                      {chat.last_message ? chat.last_message.text : 'Sohbet başlatıldı'}
                    </span>
                  </div>
                </div>
                <div className="flex-col" style={{ alignItems: 'flex-end', height: '100%', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {formatTime(new Date(chat.updated_at))}
                  </span>
                  {getStreak(chat) > 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 'bold', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '12px' }}>
                      🔥 {getStreak(chat)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Floating Action Button */}
      <button 
        onClick={() => setShowNewChat(true)}
        className="flex-center shadow-lg"
        style={{
          position: 'absolute', bottom: '30px', right: '30px',
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          cursor: 'pointer', transition: 'all 0.2s', zIndex: 20,
          border: 'none'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
        }}
      >
        <MessageSquarePlus size={28} />
      </button>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
