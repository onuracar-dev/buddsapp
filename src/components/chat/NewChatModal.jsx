import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Search, Users, MessageSquare } from 'lucide-react';

export default function NewChatModal({ onClose }) {
  const { currentUser, activeWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Grup modu state'leri
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!activeWorkspaceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`workspace_id.eq.${activeWorkspaceId},email.eq.${import.meta.env.VITE_ADMIN_EMAIL}`);
        if (error) throw error;
        
        const usersList = data.filter(doc => doc.id !== currentUser.id);
        setUsers(usersList);
      } catch (error) {
        toast.error("Kullanıcılar getirilemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser.id, activeWorkspaceId]);

  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUserSelection = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const startDM = async (targetUser) => {
    try {
      // Önce bu iki kişi arasında daha önce oluşturulmuş bir DM var mı kontrol et
      const { data: existingChats, error: searchError } = await supabase
        .from('chats')
        .select('id, participants')
        .eq('type', 'dm')
        .eq('workspace_id', activeWorkspaceId)
        .contains('participants', [currentUser.id, targetUser.id]);

      if (searchError) throw searchError;

      if (existingChats && existingChats.length > 0) {
        navigate(`/chat/${existingChats[0].id}`);
        onClose();
        return;
      }

      // Yoksa yeni DM oluştur
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          type: 'dm',
          participants: [currentUser.id, targetUser.id],
          workspace_id: activeWorkspaceId,
          last_message: null
        }])
        .select()
        .single();

      if (createError) throw createError;

      navigate(`/chat/${newChat.id}`);
      onClose();
    } catch (error) {
      toast.error('Sohbet başlatılamadı');
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) return toast.error('Grup adı boş olamaz');

    try {
      const participantIds = [currentUser.id, ...selectedUsers.map(u => u.id)];
      const { data: newGroup, error } = await supabase
        .from('chats')
        .insert([{
          type: 'group',
          name: groupName,
          participants: participantIds,
          admins: [currentUser.id],
          workspace_id: activeWorkspaceId,
          last_message: null
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/chat/${newGroup.id}`);
      onClose();
    } catch (error) {
      toast.error('Grup oluşturulamadı');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass flex-col" style={{
        width: '90%', maxWidth: '400px', maxHeight: '80vh',
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '20px', position: 'relative'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px' }}>
          <X size={24} color="var(--text-secondary)" />
        </button>

        <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
          {isGroupMode ? 'Yeni Grup Kur' : 'Yeni Sohbet'}
        </h3>

        {!isGroupMode && (
          <button 
            onClick={() => setIsGroupMode(true)}
            className="flex-center"
            style={{
              padding: '12px', background: 'var(--primary-light)', color: 'var(--primary)',
              borderRadius: 'var(--radius-md)', marginBottom: '15px', gap: '10px',
              fontWeight: '500'
            }}
          >
            <Users size={20} /> Yeni Grup Kur
          </button>
        )}

        {isGroupMode && (
          <div style={{ marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="Grup Adı" 
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--background)'
              }}
            />
          </div>
        )}

        <div className="flex-center" style={{
          background: 'var(--background)', padding: '8px 12px',
          borderRadius: 'var(--radius-full)', marginBottom: '15px'
        }}>
          <Search size={18} color="var(--text-tertiary)" style={{ marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Kişi ara..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Yükleniyor...</p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Kişi bulunamadı.</p>
          ) : (
            filteredUsers.map(user => {
              const isSelected = selectedUsers.find(u => u.id === user.id);
              return (
                <div 
                  key={user.id} 
                  onClick={() => isGroupMode ? toggleUserSelection(user) : startDM(user)}
                  className="flex-center"
                  style={{
                    padding: '10px', borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', background: isSelected ? 'var(--primary-light)' : 'transparent',
                    justifyContent: 'space-between', border: '1px solid transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = isSelected ? 'var(--primary-light)' : 'var(--surface-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.background = isSelected ? 'var(--primary-light)' : 'transparent'}
                >
                  <div className="flex-center" style={{ gap: '12px' }}>
                    <img 
                      src={user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=random&color=fff&size=100&bold=true`} 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      alt="Avatar"
                    />
                    <div className="flex-col">
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{user.display_name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{user.username}</span>
                    </div>
                  </div>
                  {!isGroupMode && <MessageSquare size={18} color="var(--text-tertiary)" />}
                  {isGroupMode && (
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--primary)' : 'transparent'
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {isGroupMode && (
          <div className="flex-between" style={{ marginTop: '15px', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {selectedUsers.length} kişi seçildi
            </span>
            <div className="flex-center" style={{ gap: '10px' }}>
              <button onClick={() => setIsGroupMode(false)} style={{ color: 'var(--text-secondary)' }}>İptal</button>
              <button 
                onClick={createGroup}
                style={{
                  padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)',
                  borderRadius: 'var(--radius-full)', fontWeight: '500'
                }}
              >
                Oluştur
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
