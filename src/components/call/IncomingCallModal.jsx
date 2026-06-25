import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function IncomingCallModal() {
  const { currentUser } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const [callerName, setCallerName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('public:calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async (payload) => {
        const call = payload.new;
        
        if (call && call.status === 'ringing' && call.caller_id !== currentUser.id) {
          const { data: chat } = await supabase.from('chats').select('participants').eq('id', call.chat_id).single();
          
          if (chat && chat.participants.includes(currentUser.id)) {
            const { data: user } = await supabase.from('users').select('display_name').eq('id', call.caller_id).single();
            setCallerName(user?.display_name || 'Biri');
            setIncomingCall(call);
          }
        } 
        else if (call && call.status !== 'ringing' && incomingCall && incomingCall.id === call.id) {
          setIncomingCall(null);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser, incomingCall]);

  useEffect(() => {
    let timer;
    if (incomingCall) {
      // 45 saniye içinde açılmazsa aramayı ekrandan düşür
      timer = setTimeout(() => {
        setIncomingCall(null);
      }, 45000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const acceptCall = async () => {
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', incomingCall.id);
    navigate(`/call/${incomingCall.room_name}`);
    setIncomingCall(null);
  };

  const rejectCall = async () => {
    await supabase.from('calls').update({ status: 'rejected' }).eq('id', incomingCall.id);
    setIncomingCall(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass flex-col" style={{ padding: '40px', borderRadius: '20px', alignItems: 'center', gap: '20px', textAlign: 'center', minWidth: '300px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {incomingCall.type === 'video' ? <Video size={40} color="#fff" /> : <Phone size={40} color="#fff" />}
        </div>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{callerName}</h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>
            {incomingCall.type === 'video' ? 'Görüntülü' : 'Sesli'} arıyor...
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
          <button onClick={rejectCall} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
            <PhoneOff size={28} />
          </button>
          <button onClick={acceptCall} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
            {incomingCall.type === 'video' ? <Video size={28} /> : <Phone size={28} />}
          </button>
        </div>
      </div>
    </div>
  );
}
