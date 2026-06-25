import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import StoryViewer from './StoryViewer';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StoriesTray() {
  const { currentUser, userProfile, activeWorkspaceId } = useAuth();
  const [storiesByUser, setStoriesByUser] = useState({});
  const [usersInfo, setUsersInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);

  useEffect(() => {
    fetchStories();
    
    const channel = supabase.channel('public:stories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, fetchStories)
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [activeWorkspaceId]);

  const fetchStories = async () => {
    if (!activeWorkspaceId) return;

    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) return;

    const grouped = {};
    const userIds = new Set();
    
    stories.forEach(story => {
      if (!grouped[story.user_id]) grouped[story.user_id] = [];
      grouped[story.user_id].push(story);
      userIds.add(story.user_id);
    });

    setStoriesByUser(grouped);

    if (userIds.size > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, display_name, photo_url, workspace_id, email')
        .in('id', Array.from(userIds))
        .or(`workspace_id.eq.${activeWorkspaceId},email.eq.${import.meta.env.VITE_ADMIN_EMAIL}`);

      if (usersData) {
        const infoMap = {};
        usersData.forEach(u => infoMap[u.id] = u);
        setUsersInfo(infoMap);
      }
    }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('stories').getPublicUrl(fileName);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await supabase.from('stories').insert([{
        user_id: currentUser.id,
        content: data.publicUrl,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        expires_at: expiresAt.toISOString()
      }]);
      
      toast.success('Hikaye paylaşıldı!');
    } catch (error) {
      toast.error('Hikaye yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return null;

  const myStories = storiesByUser[currentUser.id] || [];
  const otherUserIds = Object.keys(storiesByUser).filter(id => id !== currentUser.id && usersInfo[id]);

  return (
    <>
      <div style={{ display: 'flex', gap: '15px', padding: '15px 20px', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
        {/* Benim Hikayem */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <div style={{ position: 'relative' }}>
            <img 
              onClick={() => myStories.length > 0 ? setViewingUserId(currentUser.id) : document.getElementById('storyUpload').click()}
              src={userProfile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.display_name || 'S')}&background=random&color=fff&size=100&bold=true`} 
              style={{ 
                width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer',
                border: myStories.length > 0 ? '3px solid var(--accent)' : '3px solid transparent'
              }} 
              alt="Benim Hikayem"
            />
            {/* Her Zaman Göster: Kullanıcı "+" ikonuna tıklarsa direkt yükleme ekranı açılır */}
            <div 
              onClick={(e) => { e.stopPropagation(); document.getElementById('storyUpload').click(); }}
              style={{
                position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', 
                borderRadius: '50%', width: '22px', height: '22px', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer',
                border: '2px solid var(--background)'
              }}>
              <Plus size={14} strokeWidth={3} />
            </div>
            <input id="storyUpload" type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {uploading ? 'Yükleniyor...' : 'Hikayen'}
          </span>
        </div>

        {/* Diğer Kullanıcıların Hikayeleri */}
        {otherUserIds.map(uid => (
          <div key={uid} onClick={() => setViewingUserId(uid)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <img 
              src={usersInfo[uid]?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(usersInfo[uid]?.display_name || 'U')}&background=random&color=fff&size=100&bold=true`} 
              style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} 
              alt="Story"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {usersInfo[uid]?.display_name?.split(' ')[0] || 'Kullanıcı'}
            </span>
          </div>
        ))}
      </div>

      {viewingUserId && (
        <StoryViewer 
          stories={storiesByUser[viewingUserId]} 
          user={viewingUserId === currentUser.id ? userProfile : usersInfo[viewingUserId]}
          onClose={() => setViewingUserId(null)} 
        />
      )}
    </>
  );
}
