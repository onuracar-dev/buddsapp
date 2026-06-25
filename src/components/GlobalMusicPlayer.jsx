import React, { useMemo } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { Play, Pause, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const GlobalMusicPlayer = () => {
  const { currentTrack, isPlaying, stopMusic, radioTitle, togglePlay } = useMusic();
  const navigate = useNavigate();
  const location = useLocation();

  const radioTime = useMemo(() => {
    if (!currentTrack) return { songIndex: 0, startSeconds: 0 };
    const createdAt = new Date(currentTrack.createdAt).getTime();
    const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);
    const AVG_SONG_DURATION = 210;
    return {
      songIndex: Math.floor(elapsedSeconds / AVG_SONG_DURATION) % 50,
      startSeconds: elapsedSeconds % AVG_SONG_DURATION
    };
  }, [currentTrack]);

  // Odada mıyız kontrolü
  const isInCurrentRoom = currentTrack ? location.pathname === `/chat/${currentTrack.roomId}` : false;

  return (
    <>
      {/* Gizli (ama var olan) Global Oynatıcı (API tarafından doldurulacak) */}
      <div style={{ position: 'fixed', bottom: -500, left: -500, width: '50px', height: '50px', opacity: 0.01, pointerEvents: 'none', zIndex: -9999 }}>
        <div id="global-yt-player"></div>
      </div>

      {/* Eğer başka sayfalardaysak sağ alt veya üstte çıkacak ufak Mini Player (PIP) */}
      {currentTrack && !isInCurrentRoom && (
        <div 
          onClick={() => navigate(`/chat/${currentTrack.roomId}`)}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            background: 'linear-gradient(45deg, #1e293b, #0f172a)',
            border: '1px solid var(--primary)',
            borderRadius: '12px',
            padding: '10px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            cursor: 'pointer',
            maxWidth: '280px',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          <div style={{ width: '35px', height: '35px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
            {currentTrack.isPlaylist ? (
              <div className="flex-center" style={{ width: '100%', height: '100%', background: 'var(--primary)', color: '#fff' }}>
                <span style={{ fontSize: '1.2rem', animation: isPlaying ? 'pulse 2s infinite' : 'none' }}>📻</span>
              </div>
            ) : (
              <img 
                src={`https://img.youtube.com/vi/${currentTrack.youtubeId}/default.jpg`} 
                alt="Kapak" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>
          
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🎵 {currentTrack.roomName || 'Bilinmeyen Oda'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {radioTitle} {isPlaying ? '' : '(Durduruldu)'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button 
              onClick={togglePlay}
              style={{ background: 'transparent', border: 'none', color: '#fff', padding: '5px', cursor: 'pointer' }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); stopMusic(); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', padding: '5px', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalMusicPlayer;
