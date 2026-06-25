import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Megaphone, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const { activeWorkspaceId } = useAuth();

  const fetchAnnouncements = async () => {
    let query = supabase.from('global_settings').select('*');
    if (activeWorkspaceId) {
      query = query.in('id', ['announcement', `announcement_${activeWorkspaceId}`]);
    } else {
      query = query.eq('id', 'announcement');
    }
    
    const { data } = await query;
    if (data) {
      setAnnouncements(data);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('public:global_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_settings' }, (payload) => {
        if (payload.new?.id?.startsWith('announcement')) {
           fetchAnnouncements();
           setHiddenIds(prev => prev.filter(id => id !== payload.new.id)); // Yeni gelince göster
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkspaceId]);

  const activeAnnouncements = announcements.filter(ann => {
    if (!ann.is_active || hiddenIds.includes(ann.id)) return false;
    if (ann.expires_at && new Date(ann.expires_at) < new Date()) return false;
    return true;
  });

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="flex-col">
      {activeAnnouncements.map(ann => (
        <div key={ann.id} style={{
          background: ann.id === 'announcement' ? 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' : 'linear-gradient(90deg, #ec4899 0%, #f43f5e 100%)',
          color: '#fff',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
          fontWeight: '500',
          fontSize: '0.9rem',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={18} style={{ animation: 'pulse 2s infinite' }} />
            <span>{ann.text_value}</span>
          </div>
          <button 
            onClick={() => setHiddenIds(prev => [...prev, ann.id])}
            style={{ padding: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1) rotate(-5deg); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
