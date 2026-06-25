import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

export default function StoryViewer({ stories, user, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleNext();
    }, 5000); // 5 saniye sonra geç
    return () => clearTimeout(timer);
  }, [currentIndex, stories]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!stories || stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column'
    }}>
      {/* Progress Bars */}
      <div style={{ display: 'flex', gap: '5px', padding: '10px 20px', position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
        {stories.map((s, i) => (
          <div key={s.id} style={{
            flex: 1, height: '3px', background: i <= currentIndex ? '#fff' : 'rgba(255,255,255,0.3)',
            borderRadius: '2px', transition: 'background 0.3s'
          }} />
        ))}
      </div>

      {/* Header */}
      <div className="flex-between" style={{ padding: '20px', position: 'absolute', top: '15px', width: '100%', zIndex: 10 }}>
        <div className="flex-center" style={{ gap: '10px' }}>
          <img src={user?.photo_url || 'https://via.placeholder.com/40'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
          <div className="flex-col">
            <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.9rem' }}>{user?.display_name || 'Kullanıcı'}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>{format(new Date(currentStory.created_at), 'HH:mm')}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', color: '#fff' }}><X size={28} /></button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div 
          onClick={handlePrev} 
          style={{ position: 'absolute', left: 0, width: '30%', height: '100%', zIndex: 5, cursor: 'pointer' }}
        />
        <div 
          onClick={handleNext} 
          style={{ position: 'absolute', right: 0, width: '70%', height: '100%', zIndex: 5, cursor: 'pointer' }}
        />

        {currentStory.type === 'image' ? (
          <img src={currentStory.content} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Story" />
        ) : (
          <video src={currentStory.content} autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </div>
    </div>
  );
}
