import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Plus, Copy, Check, Hash, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Admin() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [storageSize, setStorageSize] = useState(0);
  const [activeTab, setActiveTab] = useState('system'); // 'system', 'users', 'workspaces'
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementDuration, setAnnouncementDuration] = useState('60');
  const [selectedWorkspaceForAnnouncement, setSelectedWorkspaceForAnnouncement] = useState('global');
  const [currentAnnouncements, setCurrentAnnouncements] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [publicRoomName, setPublicRoomName] = useState('');
  const [publicRoomDescription, setPublicRoomDescription] = useState('');
  const [publicRoomYoutubeUrl, setPublicRoomYoutubeUrl] = useState('');
  const [selectedWorkspaceForRoom, setSelectedWorkspaceForRoom] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const AI_DAILY_LIMIT = 1500;

  const isAdmin = userProfile?.isAdmin;

  useEffect(() => {
    if (!isAdmin) return;

    const fetchInvites = async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*, users(display_name)')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setInvites(data);
      }
    };
    
    const fetchData = async () => {
      const { data: usersData } = await supabase.from('users').select('*').order('last_seen', { ascending: false });
      if (usersData) setUsers(usersData);
      
      const { data: invitesData } = await supabase.from('invites').select('*, users(display_name)').order('created_at', { ascending: false });
      if (invitesData) setInvites(invitesData);

      const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true });
      if (wsData) setWorkspaces(wsData);

      const { data: annData } = await supabase.from('global_settings').select('*').like('id', 'announcement%');
      if (annData) setCurrentAnnouncements(annData.filter(a => a.is_active));

      const { data: geminiData } = await supabase.from('global_settings').select('*').eq('id', 'gemini_api_key').single();
      if (geminiData) setGeminiKey(geminiData.text_value || '');

      const today = new Date();
      today.setHours(0,0,0,0);
      const { count: aiCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'ai_bot')
        .gte('created_at', today.toISOString());
      setAiUsageCount(aiCount || 0);

      const { data: sizeData } = await supabase.rpc('get_storage_size');
      setStorageSize(sizeData || 0);    };

    const fetchCallLogs = async () => {
      const { data } = await supabase.from('call_logs').select('*, users(display_name)').order('created_at', { ascending: false });
      if (data) setCallLogs(data);
    };

    fetchInvites();
    fetchData();
    fetchCallLogs();

    const channel = supabase
      .channel('public:invites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invites' }, () => {
        fetchInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const generateInvite = async (workspaceId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('invites')
        .insert([{ created_by: currentUser.id, workspace_id: workspaceId }]);

      if (error) throw error;
      toast.success('Yeni davet linki oluşturuldu!');
    } catch (error) {
      toast.error('Davet oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async () => {
    const name = prompt('Yeni mekanın (sunucunun) adını girin:');
    if (!name || !name.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .insert([{ name: name.trim(), created_by: currentUser.id }]);
        
      if (error) throw error;
      toast.success('Mekan başarıyla oluşturuldu!');
      
      const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true });
      if (wsData) setWorkspaces(wsData);
    } catch (error) {
      toast.error('Mekan oluşturulamadı: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkspace = async (id) => {
    if (!window.confirm('DİKKAT: Bu mekanı silerseniz, içindeki tüm sohbetler, odalar ve davet kodları da silinecektir! Emin misiniz?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('workspaces').delete().eq('id', id);
      if (error) throw error;
      toast.success('Mekan başarıyla silindi.');
      
      const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true });
      if (wsData) setWorkspaces(wsData);
    } catch (e) {
      toast.error('Mekan silinemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const nukeEverything = async () => {
    const code = prompt('DİKKAT: NÜKLEER SEÇENEK!\n\nTüm sohbetler, mesajlar, resimler ve videolar KALICI olarak yok edilecektir.\nBunu onaylıyorsanız kutucuğa "SIFIRLA" yazın:');
    if (code !== 'SIFIRLA') {
      toast.error('İşlem iptal edildi.');
      return;
    }
    
    if (!window.confirm('EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ!')) return;

    setLoading(true);
    toast.loading('Nükleer bomba ateşlendi, veriler siliniyor...', { id: 'nuke' });
    try {
      await supabase.storage.emptyBucket('chats');
      await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chats').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast.success('SİSTEM TAMAMEN SIFIRLANDI.', { id: 'nuke' });
      const { data } = await supabase.rpc('get_storage_size');
      setStorageSize(data || 0);
    } catch (e) {
      toast.error('Sıfırlama sırasında hata oluştu: ' + e.message, { id: 'nuke' });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}/invite/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id + '_link');
    toast.success('Link kopyalandı!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteInvite = async (id) => {
    if (!window.confirm('Bu davet linkini (ve istihbarat raporunu) silmek istediğine emin misin?')) return;
    try {
      await supabase.from('invites').delete().eq('id', id);
      toast.success('Davet kalıcı olarak silindi.');
    } catch (e) {
      toast.error('Silinemedi.');
    }
  };

  const copyCode = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id + '_code');
    toast.success('Sadece kod kopyalandı!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const publishAnnouncement = async () => {
    if (!announcementText.trim()) return toast.error('Duyuru metni boş olamaz!');
    setLoading(true);
    try {
      const expires_at = announcementDuration === '0' ? null : new Date(Date.now() + parseInt(announcementDuration) * 60 * 1000).toISOString();
      const announcementId = selectedWorkspaceForAnnouncement === 'global' ? 'announcement' : `announcement_${selectedWorkspaceForAnnouncement}`;
      
      await supabase.from('global_settings').upsert({
        id: announcementId,
        text_value: announcementText,
        is_active: true,
        expires_at: expires_at,
        updated_at: new Date().toISOString()
      });
      toast.success(selectedWorkspaceForAnnouncement === 'global' ? 'Duyuru tüm kullanıcılara gönderildi!' : 'Duyuru seçili mekana gönderildi!');
      
      const { data } = await supabase.from('global_settings').select('*').like('id', 'announcement%');
      if (data) setCurrentAnnouncements(data.filter(a => a.is_active));
      setAnnouncementText('');
    } catch (err) {
      toast.error('Duyuru yayınlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  const removeAnnouncement = async (id) => {
    setLoading(true);
    try {
      await supabase.from('global_settings').update({ is_active: false }).eq('id', id);
      toast.success('Duyuru yayından kaldırıldı.');
      const { data } = await supabase.from('global_settings').select('*').like('id', 'announcement%');
      if (data) setCurrentAnnouncements(data.filter(a => a.is_active));
    } catch (err) {
      toast.error('Duyuru kaldırılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = e.target;
      const displayName = form.displayName.value;
      const role = form.role.value;
      const banTime = form.banTime.value;
      
      let banned_until = null;
      if (banTime !== '0') {
        banned_until = new Date(Date.now() + parseInt(banTime) * 60 * 1000).toISOString();
      }

      await supabase.from('users').update({ 
        display_name: displayName,
        role: role,
        banned_until: banned_until
      }).eq('id', editingUser.id);
      
      toast.success('Kullanıcı güncellendi!');
      setEditingUser(null);
      
      const { data } = await supabase.from('users').select('*').order('last_seen', { ascending: false });
      if (data) setUsers(data);
    } catch (err) {
      toast.error('Güncelleme başarısız: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (editingUser.email === import.meta.env.VITE_ADMIN_EMAIL) {
      toast.error('Ana yönetici hesabını silemezsin!');
      return;
    }
    
    const confirmCode = prompt(`DİKKAT: Bu işlem kullanıcının tüm verilerini (mesajlar, aramalar vb.) kalıcı olarak siler!\nOnaylamak için "${editingUser.display_name}" yazın:`);
    if (confirmCode !== editingUser.display_name) {
      toast.error('İşlem iptal edildi.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user', { target_user_id: editingUser.id });
      if (error) throw error;
      
      toast.success('Kullanıcı kalıcı olarak SİLİNDİ!');
      setEditingUser(null);
      const { data } = await supabase.from('users').select('*').order('last_seen', { ascending: false });
      if (data) setUsers(data);
    } catch (err) {
      toast.error('Silme işlemi başarısız: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPublicRoom = async () => {
    if (!publicRoomName.trim()) return;
    setLoading(true);
    try {
      // Extract youtube ID and check if playlist
      let youtubeId = null;
      let isPlaylist = false;
      if (publicRoomYoutubeUrl.trim()) {
        const urlStr = publicRoomYoutubeUrl.trim();
        try {
          const urlObj = new URL(urlStr);
          if (urlObj.searchParams.has('list')) {
            youtubeId = urlObj.searchParams.get('list');
            isPlaylist = true;
          } else if (urlObj.searchParams.has('v')) {
            youtubeId = urlObj.searchParams.get('v');
          } else {
            youtubeId = urlObj.pathname.split('/').pop();
          }
        } catch {
          youtubeId = urlStr; // Fallback
        }
      }

      const finalName = publicRoomDescription.trim() 
        ? `${publicRoomName.trim()}||${publicRoomDescription.trim()}`
        : publicRoomName.trim();

      const { error } = await supabase.from('chats').insert([{
        type: 'public_group',
        name: finalName,
        participants: [],
        youtube_id: youtubeId,
        workspace_id: selectedWorkspaceForRoom,
        allow_speaking: false,
        last_message: { is_playlist: isPlaylist } // playlist bilgisini meta olarak tutuyoruz
      }]);
      if (error) throw error;
      toast.success('Resmi oda başarıyla oluşturuldu!');
      setPublicRoomName('');
      setPublicRoomDescription('');
      setPublicRoomYoutubeUrl('');
    } catch (e) {
      toast.error('Oda oluşturulamadı: Lütfen SQL kodunu çalıştırdığınızdan emin olun.');
    } finally {
      setLoading(false);
    }
  };

  const saveGeminiKey = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('global_settings').upsert({
        id: 'gemini_api_key',
        text_value: geminiKey,
        is_active: true,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success('Gemini API Anahtarı kaydedildi!');
    } catch (e) {
      console.error(e);
      toast.error('Anahtar kaydedilemedi: Güvenlik kuralları (RLS) engelledi. Supabase SQL üzerinden "gemini_api_key" satırını manuel ekleyin.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (totalSeconds) => {
    if (totalSeconds < 60) return `${totalSeconds} sn`;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (s === 0) return `${m} dk`;
    return `${m} dk ${s} sn`;
  };

  const callChartData = React.useMemo(() => {
    const dataMap = {};
    callLogs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('tr-TR');
      if (!dataMap[date]) dataMap[date] = { date, duration: 0 };
      dataMap[date].duration += (log.duration_seconds / 60);
    });
    // Grafikte dakikayı ondalıklı görelim (örn 1.5 dk = 1 dk 30 sn)
    return Object.values(dataMap).map(d => ({ ...d, duration: Number(d.duration.toFixed(2)) })).reverse();
  }, [callLogs]);

  const totalSeconds = callLogs.reduce((acc, log) => acc + log.duration_seconds, 0);
  const totalCallFormatted = formatDuration(totalSeconds);

  if (!isAdmin) {
    return <div className="flex-center" style={{ height: '100vh' }}>Yetkisiz Erişim</div>;
  }

  return (
    <div className="flex-col" style={{ flex: 1, minHeight: 0, background: 'var(--background)', padding: '20px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        
        <div className="flex-col glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
          <div className="flex-between" style={{ marginBottom: '15px' }}>
            <div className="flex-center" style={{ gap: '10px' }}>
              <button 
                onClick={() => navigate('/')}
                style={{ padding: '8px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)' }}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Admin Paneli</h2>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>Sistem Yönetimi</p>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: 'var(--radius-md)' }}>
            <button 
              onClick={() => setActiveTab('system')}
              style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'system' ? 'var(--primary)' : 'transparent', color: activeTab === 'system' ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', transition: '0.3s' }}
            >
              Sistem & Davetler
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'users' ? 'var(--primary)' : 'transparent', color: activeTab === 'users' ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', transition: '0.3s' }}
            >
              Kullanıcılar ({users.length})
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'analytics' ? 'var(--primary)' : 'transparent', color: activeTab === 'analytics' ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', transition: '0.3s' }}
            >
              İstatistikler
            </button>
            <button 
              onClick={() => setActiveTab('workspaces')}
              style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'workspaces' ? 'var(--primary)' : 'transparent', color: activeTab === 'workspaces' ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', transition: '0.3s' }}
            >
              Sunucular
            </button>
          </div>
        </div>

        {activeTab === 'workspaces' && (
          <div className="flex-col" style={{ gap: '20px' }}>
            <div className="flex-between glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Mekanlar (Sunucular)</h3>
                <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Uygulamadaki tüm izole odalar</p>
              </div>
              <button 
                onClick={createWorkspace} 
                disabled={loading}
                className="flex-center shadow-md"
                style={{ 
                  padding: '8px 15px', background: 'var(--primary)', color: 'var(--primary-foreground)',
                  borderRadius: 'var(--radius-full)', fontWeight: 'bold', opacity: loading ? 0.7 : 1, fontSize: '0.85rem'
                }}
              >
                <Plus size={16} style={{ marginRight: '5px' }} /> Yeni Mekan Kur
              </button>
            </div>

            {workspaces.map(ws => (
              <div key={ws.id} className="glass flex-col" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                <div className="flex-between" style={{ marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Hash size={20} color="var(--primary)" /> {ws.name}
                  </h3>
                  <div className="flex-center" style={{ gap: '10px' }}>
                    <button 
                      onClick={() => generateInvite(ws.id)} 
                      disabled={loading}
                      style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Kod Üret
                    </button>
                    <button 
                      onClick={() => deleteWorkspace(ws.id)}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}
                    >
                      Sil
                    </button>
                  </div>
                </div>

                <div className="flex-col" style={{ gap: '10px' }}>
                  <h4 style={{ margin: '10px 0 5px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Bu Mekanın Davet Kodları</h4>
                  {invites.filter(i => i.workspace_id === ws.id).map((invite) => (
                    <div key={invite.id} className="flex-between" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                      <div className="flex-col">
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{invite.id}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          Oluşturulma: {format(new Date(invite.created_at), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex-center" style={{ gap: '10px' }}>
                        {invite.used ? (
                          <div className="flex-center" style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            <Check size={16} style={{ marginRight: '4px' }} />
                            Kullanıldı ({invite.users?.display_name || invite.used_by_name || 'Bilinmiyor'})
                          </div>
                        ) : (
                          <button
                            onClick={() => copyLink(invite.id)}
                            className="flex-center"
                            style={{ padding: '6px 10px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', transition: '0.2s' }}
                          >
                            {copiedId === invite.id + '_link' ? <Check size={16} color="var(--success)" /> : <LinkIcon size={16} />}
                          </button>
                        )}
                        <button
                          onClick={() => deleteInvite(invite.id)}
                          style={{ padding: '6px', color: 'var(--danger)', background: 'transparent' }}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                  {invites.filter(i => i.workspace_id === ws.id).length === 0 && (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Bu mekan için henüz kod üretilmemiş.</p>
                  )}
                </div>
              </div>
            ))}
            {workspaces.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                Henüz hiç mekan kurulmamış.
              </div>
            )}
          </div>
        )}

        {activeTab === 'system' && (
          <>
            <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
              <div className="flex-between" style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Depolama Alanı (Storage)</h3>
              </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Tüm resimler, videolar ve ses kayıtları.</p>
          
          <div style={{ width: '100%', height: '20px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              width: `${Math.min((storageSize / 1073741824) * 100, 100)}%`, 
              height: '100%', 
              background: (storageSize / 1073741824) > 0.8 ? 'var(--danger)' : ((storageSize / 1073741824) > 0.5 ? 'var(--warning)' : 'var(--primary)'),
              transition: 'width 0.5s ease-in-out'
            }} />
          </div>
          <div className="flex-between" style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            <span>{(storageSize / (1024 * 1024)).toFixed(2)} MB Kullanımda</span>
            <span>1024 MB (1 GB) Limit</span>
          </div>
          <button 
            onClick={nukeEverything}
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 'bold', marginTop: '15px' }}
          >
            Tüm Verileri ve Depolamayı Sıfırla ☢️
          </button>
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>📢 Global Duyuru Yayını</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Tüm kullanıcıların ekranının en üstüne sabitlenecek anlık bir mesaj gönder.</p>
          
          <div className="flex-col" style={{ gap: '10px' }}>
            <textarea 
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Duyuru metnini buraya yaz..."
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', minHeight: '80px', resize: 'vertical' }}
            />
            <div className="flex-between">
              <select 
                value={selectedWorkspaceForAnnouncement}
                onChange={(e) => setSelectedWorkspaceForAnnouncement(e.target.value)}
                style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', flex: 1, marginRight: '10px' }}
              >
                <option value="global">Tüm Sunucular (Global)</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name} Sunucusu</option>
                ))}
              </select>
              <select 
                value={announcementDuration}
                onChange={(e) => setAnnouncementDuration(e.target.value)}
                style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', flex: 1, marginRight: '10px' }}
              >
                <option value="0">Süresiz (Kaldırana Kadar)</option>
                <option value="1">1 Dakika</option>
                <option value="10">10 Dakika</option>
                <option value="60">1 Saat</option>
                <option value="1440">1 Gün</option>
                <option value="10080">1 Hafta</option>
              </select>
              <button 
                onClick={publishAnnouncement}
                disabled={loading}
                style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 'bold' }}
              >
                Yayınla 🚀
              </button>
            </div>
          </div>

          {currentAnnouncements?.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 'bold', marginBottom: '5px' }}>Şu an yayında olan duyurular:</div>
              {currentAnnouncements.map(ann => (
                <div key={ann.id} style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '10px' }}>
                  <div style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '10px' }}>
                    <strong style={{color: 'var(--primary)', marginRight: '5px'}}>
                      [{ann.id === 'announcement' ? 'Global' : workspaces.find(w => w.id === ann.id.replace('announcement_', ''))?.name || 'Bilinmiyor'}]
                    </strong> 
                    {ann.text_value}
                  </div>
                  <button 
                    onClick={() => removeAnnouncement(ann.id)}
                    disabled={loading}
                    style={{ width: '100%', padding: '8px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '0.85rem' }}
                  >
                    Yayından Kaldır
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>🌐 Resmi & Radyo Odası Oluştur</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Ana sayfada herkesin görebileceği ve katılabileceği genel sohbet odaları açın. Bir YouTube linki eklerseniz oda 'Radyo/Müzik Odası'na dönüşür.</p>
          <div className="flex-col" style={{ gap: '10px' }}>
            <input 
              value={publicRoomName}
              onChange={(e) => setPublicRoomName(e.target.value)}
              placeholder="Oda İsmi (Örn: Arabesk Geceler)"
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
            />
            <input 
              value={publicRoomDescription}
              onChange={(e) => setPublicRoomDescription(e.target.value)}
              placeholder="Açıklama (Opsiyonel, Boş bırakırsanız yazmaz)"
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
            />
            <input 
              value={publicRoomYoutubeUrl}
              onChange={(e) => setPublicRoomYoutubeUrl(e.target.value)}
              placeholder="YouTube Video Linki (Opsiyonel)"
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
            />
            <select 
              value={selectedWorkspaceForRoom}
              onChange={(e) => setSelectedWorkspaceForRoom(e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
            >
              <option value="" disabled>Hangi Mekana Kurulacak?</option>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            <button 
              onClick={createPublicRoom}
              disabled={loading || !publicRoomName.trim() || !selectedWorkspaceForRoom}
              style={{ width: '100%', padding: '10px 20px', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 'bold', opacity: (loading || !publicRoomName.trim() || !selectedWorkspaceForRoom) ? 0.5 : 1 }}
            >
              Oda Aç
            </button>
          </div>
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>🤖 Budds AI (Gemini Entegrasyonu)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Sohbetlere katılan Yapay Zeka botunun çalışması için Google AI Studio (Gemini) API anahtarını buraya girin.</p>
          <div className="flex-between" style={{ gap: '10px' }}>
            <input 
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
            />
            <button 
              onClick={saveGeminiKey}
              disabled={loading}
              style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 'bold' }}
            >
              Kaydet
            </button>
          </div>
          <div style={{ marginTop: '20px', padding: '15px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Günlük Tahmini API Kullanımı</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: aiUsageCount > AI_DAILY_LIMIT * 0.8 ? 'var(--danger)' : 'var(--primary)' }}>
                {aiUsageCount} / {AI_DAILY_LIMIT} İstek
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${Math.min((aiUsageCount / AI_DAILY_LIMIT) * 100, 100)}%`, 
                background: aiUsageCount > AI_DAILY_LIMIT * 0.8 ? 'var(--danger)' : 'var(--primary)',
                transition: 'width 0.5s ease-out'
              }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px', textAlign: 'center' }}>
              Google AI Studio ücretsiz paketi günlük ortalama 1500 istek ile sınırlıdır.
            </p>
          </div>
        </div>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Davet Linkleri</h3>
        <div className="flex-col" style={{ gap: '10px' }}>
          {invites.map((invite) => (
            <div key={invite.id} className="flex-col" style={{
              padding: '15px', background: 'var(--surface)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
            }}>
              <div className="flex-between">
                <div className="flex-col">
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>ID: {invite.id.slice(0, 8)}...</div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {format(new Date(invite.created_at), 'dd MMM yyyy HH:mm')}
                  </span>
                  <div style={{ 
                    fontSize: '0.8rem', marginTop: '5px', fontWeight: 'bold',
                    color: invite.used ? 'var(--danger)' : 'var(--success)'
                  }}>
                    {invite.used ? 'Kullanıldı' : 'Aktif'}
                  </div>
                </div>
                <div className="flex-center" style={{ gap: '8px' }}>
                  <button 
                    onClick={() => copyCode(invite.id)}
                    disabled={invite.used}
                    style={{
                      padding: '8px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-hover)', cursor: invite.used ? 'not-allowed' : 'pointer',
                      opacity: invite.used ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                    title="Sadece Kodu Kopyala"
                  >
                    {copiedId === invite.id + '_code' ? <Check size={18} color="var(--success)" /> : <Hash size={18} color="var(--text-primary)" />}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kod</span>
                  </button>
                  <button 
                    onClick={() => copyLink(invite.id)}
                    disabled={invite.used}
                    style={{
                      padding: '8px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-hover)', cursor: invite.used ? 'not-allowed' : 'pointer',
                      opacity: invite.used ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                    title="Tam Linki Kopyala"
                  >
                    {copiedId === invite.id + '_link' ? <Check size={18} color="var(--success)" /> : <LinkIcon size={18} color="var(--text-primary)" />}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Link</span>
                  </button>
                  <button 
                    onClick={() => deleteInvite(invite.id)}
                    style={{
                      padding: '8px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--danger)', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                    title="Daveti Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {invite.used && (
                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    🕵️‍♂️ İstihbarat Raporu
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div><strong style={{ color: 'var(--text-primary)' }}>Kullanan:</strong> {invite.used_by_name || 'Bilinmiyor'}</div>
                    <div><strong style={{ color: 'var(--text-primary)' }}>IP Adresi:</strong> {invite.ip_address || 'Bilinmiyor'}</div>
                    <div><strong style={{ color: 'var(--text-primary)' }}>Cihaz:</strong> {invite.device_info || 'Bilinmiyor'}</div>
                    <div><strong style={{ color: 'var(--text-primary)' }}>Konum:</strong> {invite.location || 'Bilinmiyor'}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {invites.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>
              Henüz davet linki oluşturulmamış.
            </div>
          )}
        </div>
        </>
      )}

        {activeTab === 'users' && (
          <div className="flex-col" style={{ gap: '10px' }}>
            {users.map(user => {
              const isActive = user.last_seen && (new Date() - new Date(user.last_seen)) < 300000; // 5 dakika
              const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
              return (
                <div key={user.id} onClick={() => setEditingUser(user)} className="glass flex-between" style={{ padding: '15px', borderRadius: 'var(--radius-md)', cursor: 'pointer', borderLeft: isBanned ? '4px solid var(--danger)' : (isActive ? '4px solid var(--success)' : '4px solid var(--border)') }}>
                  <div className="flex-center" style={{ gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="pp" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      {isActive && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--surface)' }} />}
                    </div>
                    <div className="flex-col">
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.display_name} {isBanned && '⛔'}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{user.username} • {user.role.toUpperCase()}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px', fontWeight: '500' }}>
                        📍 {user.email === import.meta.env.VITE_ADMIN_EMAIL ? 'Tüm Sunucular (Kurucu)' : (workspaces.find(ws => ws.id === user.workspace_id)?.name || 'Sunucu Atanmamış')}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {isActive ? 'Çevrimiçi' : (user.last_seen ? format(new Date(user.last_seen), 'dd MMM HH:mm') : 'Hiç girmedi')}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="glass flex-col" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px', color: 'var(--text-primary)' }}>Arama İstatistikleri</h3>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Toplam Görüntülü/Sesli Konuşma Süresi:</p>
              <h2 style={{ margin: '5px 0 0', color: 'var(--accent)' }}>{totalCallFormatted}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '5px' }}>
                (LiveKit Ücretsiz 50GB kotası, ortalama 3000 dakikalık görüntülü görüşmeye denktir)
              </p>
            </div>
            
            <div style={{ height: '300px', width: '100%', padding: '10px 0' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callChartData}>
                  <XAxis dataKey="date" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="duration" fill="var(--primary)" name="Dakika" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <h3 style={{ margin: '20px 0 15px', color: 'var(--text-primary)' }}>Son Aramalar</h3>
            <div className="flex-col" style={{ gap: '10px' }}>
              {callLogs.slice(0, 20).map(log => (
                <div key={log.id} className="flex-between glass" style={{ padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex-col">
                    <strong style={{ color: 'var(--text-primary)' }}>{log.users?.display_name || 'Bilinmeyen'}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {log.call_type === 'video' ? '📹 Görüntülü' : '📞 Sesli'} • Oda: {log.room_id}
                    </span>
                  </div>
                  <div className="flex-center" style={{ gap: '15px' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatDuration(log.duration_seconds)}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              ))}
              {callLogs.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Henüz arama kaydı yok.</p>}
            </div>
          </div>
        )}

      </div>

      {/* DÜZENLEME MODALI */}
      {editingUser && (
        <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Kullanıcı Düzenle</h3>
            <form onSubmit={handleUpdateUser} className="flex-col" style={{ gap: '15px' }}>
              <div className="flex-col">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İsim (Display Name)</label>
                <input name="displayName" defaultValue={editingUser.display_name} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff' }} />
              </div>
              <div className="flex-col">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rol</label>
                <select name="role" defaultValue={editingUser.role} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff' }}>
                  <option value="user">Normal Kullanıcı</option>
                  <option value="vip">VIP</option>
                  <option value="mod">Moderatör</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex-col">
                <label style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 'bold' }}>Cezalandır (Hesabı Dondur)</label>
                <select name="banTime" defaultValue="0" style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}>
                  <option value="0">Ceza Yok (Aktif)</option>
                  <option value="1">1 Dakika</option>
                  <option value="10">10 Dakika</option>
                  <option value="60">1 Saat</option>
                  <option value="600">10 Saat</option>
                  <option value="1440">1 Gün</option>
                  <option value="14400">10 Gün</option>
                  <option value="52560000">Süresiz (100 Yıl)</option>
                </select>
                {editingUser.banned_until && new Date(editingUser.banned_until) > new Date() && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '5px' }}>Şu an banlı: {new Date(editingUser.banned_until).toLocaleString()}</span>
                )}
              </div>
              
              <div className="flex-col" style={{ marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 'bold', marginBottom: '5px' }}>Tehlikeli Bölge</label>
                <button 
                  type="button" 
                  onClick={handleDeleteUser} 
                  disabled={loading}
                  style={{ padding: '10px', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}
                >
                  Kullanıcıyı Kalıcı Olarak SİL
                </button>
              </div>

              <div className="flex-between" style={{ marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ padding: '10px 15px', background: 'transparent', color: 'var(--text-secondary)' }}>İptal</button>
                <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-full)', fontWeight: 'bold' }}>Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
