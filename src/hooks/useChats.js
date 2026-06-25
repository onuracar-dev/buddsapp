import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

export default function useChats() {
  const { currentUser, activeWorkspaceId, userProfile } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      setLoading(false);
      return;
    }

    const fetchChats = async () => {
      if (!activeWorkspaceId) {
        setChats([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('chats')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('updated_at', { ascending: false });

      if (!userProfile?.isAdmin) {
        query = query.contains('participants', [currentUser.id]);
      }
      
      const { data, error } = await query;
        
      if (!error && data) {
        setChats(data);
      }
      setLoading(false);
    };

    fetchChats();

    const channelFilter = userProfile?.isAdmin
      ? `workspace_id=eq.${activeWorkspaceId}`
      : `participants=cs.{${currentUser.id}}`;

    const channel = supabase
      .channel('public:chats')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats',
        filter: channelFilter
      }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeWorkspaceId, userProfile?.isAdmin]);

  return { chats, loading };
}
