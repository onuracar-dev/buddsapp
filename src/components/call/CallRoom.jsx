import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useParticipants } from '@livekit/components-react';
import '@livekit/components-styles';
import { generateLiveKitToken } from '../../utils/livekitToken';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';

function AutoDisconnectHandler({ onDisconnect }) {
  const participants = useParticipants();
  const [hasHadMultiple, setHasHadMultiple] = useState(false);

  useEffect(() => {
    if (participants.length >= 2) {
      setHasHadMultiple(true);
    }
  }, [participants.length]);

  useEffect(() => {
    if (hasHadMultiple && participants.length === 1) {
      const timer = setTimeout(() => {
        onDisconnect();
      }, 2000); // 2 saniye bekle (bağlantı kopmalarına karşı)
      return () => clearTimeout(timer);
    }
  }, [hasHadMultiple, participants.length, onDisconnect]);

  return null;
}

export default function CallRoom() {
  const { roomName } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const startTimeRef = React.useRef(null);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    
    const checkAndGetToken = async () => {
      try {
        // İzin kontrolü yap, izni yoksa tarayıcı uyarı fırlatır veya direkt catch'e düşer.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // İzni test edip hemen kapatıyoruz.
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert('Mikrofon izni engellenmiş! Telefonunuzun Ayarlar (Settings) bölümünden uygulamaya (veya Safari/Chrome\'a) mikrofon izni verip tekrar deneyin.');
        } else {
          alert('Mikrofona erişilemiyor: ' + err.message);
        }
        navigate('/');
        return;
      }

      try {
        const jwt = await generateLiveKitToken(roomName, userProfile.display_name || 'Kullanıcı', currentUser.id);
        setToken(jwt);
        startTimeRef.current = Date.now();
      } catch (error) {
        console.error('Token hatası', error);
        navigate('/');
      }
    };
    
    checkAndGetToken();

    return () => {
      if (startTimeRef.current && currentUser) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (duration > 0) {
          supabase.from('call_logs').insert([{
            room_id: roomName,
            user_id: currentUser.id,
            call_type: 'video',
            duration_seconds: duration
          }]).then(() => {});
        }
      }
      supabase.from('calls').update({ status: 'ended' }).eq('room_name', roomName).then(() => {});
    };
  }, [roomName, currentUser, userProfile, navigate]);

  const handleDisconnect = async () => {
    if (startTimeRef.current && currentUser) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 0) {
        await supabase.from('call_logs').insert([{
          room_id: roomName,
          user_id: currentUser.id,
          call_type: 'video',
          duration_seconds: duration
        }]);
      }
      startTimeRef.current = null; // Prevent double insertion on unmount
    }
    await supabase.from('calls').update({ status: 'ended' }).eq('room_name', roomName);
    navigate('/');
  };

  if (!token) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>Bağlanıyor...</div>;
  }

  return (
    <div style={{ height: '100vh', background: '#000' }}>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL}
        onDisconnected={handleDisconnect}
        data-lk-theme="default"
        style={{ height: '100vh' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        <AutoDisconnectHandler onDisconnect={handleDisconnect} />
      </LiveKitRoom>
    </div>
  );
}
