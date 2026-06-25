import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, ArrowLeft, Search, Activity } from 'lucide-react';

export default function Members() {
  const { activeWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!activeWorkspaceId) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, photo_url, badges, message_count')
        .or(`workspace_id.eq.${activeWorkspaceId},email.eq.${import.meta.env.VITE_ADMIN_EMAIL}`)
        .order('message_count', { ascending: false });

      if (data) {
        setUsers(data);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [activeWorkspaceId]);

  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-col" style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '20px' }}>
      
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <div className="flex-center" style={{ gap: '15px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'var(--surface)', border: 'none', padding: '10px', borderRadius: '50%', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="var(--primary)" /> Topluluk
          </h2>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Kullanıcı ara..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', padding: '15px 15px 15px 45px', 
            borderRadius: 'var(--radius-lg)', background: 'var(--surface)', 
            border: '1px solid var(--border)', color: 'var(--text-primary)' 
          }}
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex-center" style={{ flex: 1, color: 'var(--primary)' }}>
          <Activity className="spin" size={40} />
        </div>
      ) : (
        /* Members Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {filteredUsers.map(user => (
            <div 
              key={user.id} 
              onClick={() => navigate(`/user/${user.id}`)}
              style={{ 
                background: 'var(--surface)', padding: '20px 10px', 
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', 
                border: '1px solid var(--border)', transition: 'transform 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'none'}
            >
              <img 
                src={user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || 'U')}&background=random&color=fff&size=100`}
                alt={user.display_name}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }}
              />
              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', textAlign: 'center', wordBreak: 'break-word', fontSize: '0.9rem' }}>
                {user.display_name}
              </span>
              
              {/* Top Badge Display */}
              {user.badges && user.badges.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '5px', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  {user.badges[user.badges.length - 1]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div className="flex-center" style={{ flex: 1, color: 'var(--text-tertiary)' }}>
          Kullanıcı bulunamadı.
        </div>
      )}
    </div>
  );
}
