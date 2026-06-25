import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const MusicContext = createContext(null);

export const MusicProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null); // { roomId, youtubeId, createdAt, title, isPlaylist }
  const [isPlaying, setIsPlaying] = useState(false);
  const [radioTitle, setRadioTitle] = useState('');
  const ytPlayerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const isPlayingRef = useRef(false);

  const channelRef = useRef(null);
  const clientId = useRef(Math.random().toString(36).substr(2, 9)).current;

  // Sync refs with state
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    window.onYouTubeIframeAPIReady = () => {
      ytPlayerRef.current = new window.YT.Player('global-yt-player', {
        height: '100',
        width: '100',
        videoId: '',
        playerVars: { 
          'playsinline': 1,
          'origin': window.location.origin
        },
        events: {
          'onReady': () => { console.log("YouTube Player API Ready"); },
          'onStateChange': (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
          }
        }
      });
    };
    
    // Eğer script daha önce yüklendiyse direkt başlat
    if (window.YT && window.YT.Player && !ytPlayerRef.current) {
      window.onYouTubeIframeAPIReady();
    }
  }, []);

  const forcePlay = useCallback(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      try { ytPlayerRef.current.playVideo(); } catch(e) {}
    }
  }, []);

  const forcePause = useCallback(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      try { ytPlayerRef.current.pauseVideo(); } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (!currentTrack?.roomId) return;

    const channel = supabase.channel(`public:music:${currentTrack.roomId}`);
    channel.on('broadcast', { event: 'music_sync' }, (payload) => {
      if (payload.payload.senderId === clientId) return; // Kendi gönderdiğimiz sinyali yoksay
      if (payload.payload.action === 'pause') {
        forcePause();
        setIsPlaying(false);
        toast.success('Müzik başkası tarafından durduruldu', { icon: '⏸️' });
      } else if (payload.payload.action === 'play') {
        forcePlay();
        setIsPlaying(true);
        toast.success('Müzik başkası tarafından başlatıldı', { icon: '▶️' });
      }
    }).subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentTrack?.roomId, clientId, forcePlay, forcePause]);

  const stopMusic = useCallback(() => {
    setIsPlaying(false);
    setCurrentTrack(null);
    setRadioTitle('');
    if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
      try { ytPlayerRef.current.stopVideo(); } catch(e) {}
    }
  }, []);

  const tuneIn = useCallback((roomId, youtubeId, createdAt, roomName) => {
    // Aynı odaya tekrar girildiyse müziği baştan başlatma, devam et!
    if (currentTrackRef.current?.roomId === roomId && currentTrackRef.current?.youtubeId === youtubeId) {
      if (!isPlayingRef.current) setIsPlaying(true);
      return;
    }

    const isPlaylist = youtubeId.length > 15;
    setCurrentTrack({ roomId, youtubeId, createdAt: createdAt || Date.now(), isPlaylist, roomName });
    setIsPlaying(true);
    setRadioTitle('Yükleniyor...');

    const createdAtMs = createdAt ? new Date(createdAt).getTime() : Date.now();
    const totalElapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
    const avgDuration = 210; // Ortalama 3.5 dakika
    const calcIndex = isPlaylist ? (Math.floor(totalElapsedSeconds / avgDuration) % 40) : 0;
    const startSeconds = totalElapsedSeconds % avgDuration;

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try { ytPlayerRef.current.stopVideo(); } catch(e) {}
      
      if (isPlaylist) {
        ytPlayerRef.current.loadPlaylist({ list: youtubeId, listType: 'playlist', index: calcIndex, startSeconds: startSeconds });
      } else {
        ytPlayerRef.current.loadVideoById({ videoId: youtubeId, startSeconds });
      }
    }

    // İsim çekme işlemi
    const url = isPlaylist 
      ? `https://www.youtube.com/playlist?list=${youtubeId}`
      : `https://www.youtube.com/watch?v=${youtubeId}`;
      
    fetch(`https://noembed.com/embed?url=${url}`)
      .then(res => res.json())
      .then(data => {
         if (data && data.title) {
           setRadioTitle(data.title);
         } else {
           setRadioTitle(isPlaylist ? 'Müzik Listesi' : 'Canlı Şarkı');
         }
      })
      .catch(() => {
         setRadioTitle('Canlı Radyo');
      });

  }, []);

  const togglePlay = useCallback((e) => {
    if (e) e.stopPropagation();
    const newIsPlaying = !isPlayingRef.current;
    
    if (isPlayingRef.current) {
      forcePause();
      setIsPlaying(false);
    } else {
      forcePlay();
      setIsPlaying(true);
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'music_sync',
        payload: { action: newIsPlaying ? 'play' : 'pause', senderId: clientId }
      });
    }
  }, [forcePlay, forcePause, clientId]);

  return (
    <MusicContext.Provider value={{
      currentTrack,
      isPlaying,
      setIsPlaying,
      tuneIn,
      stopMusic,
      radioTitle,
      forcePlay,
      forcePause,
      togglePlay
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
