import React, { useRef, useEffect, useState } from 'react';
import { X, Check, Pen, Eraser, RotateCcw } from 'lucide-react';

export default function DoodleModal({ file, onCancel, onSend }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(5);
  const [mode, setMode] = useState('draw'); // draw, erase
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!file) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      // Calculate aspect ratio to fit inside screen
      let width = img.width;
      let height = img.height;
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.7;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      setImageLoaded(true);
    };
  }, [file]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Handle both mouse and touch
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleSend = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      // Create a new File from blob
      const newFile = new File([blob], file.name, { type: 'image/png' });
      onSend(newFile);
    }, 'image/png', 0.9);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Top Toolbar */}
      <div className="flex-between" style={{ width: '100%', padding: '15px 20px', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
        <button onClick={onCancel} style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '50%', color: '#fff' }}><X size={24} /></button>
        
        <div className="flex-center" style={{ gap: '15px', background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '30px' }}>
          <button onClick={() => setMode('draw')} style={{ color: mode === 'draw' ? 'var(--primary)' : '#fff' }}><Pen size={20} /></button>
          <button onClick={() => setMode('erase')} style={{ color: mode === 'erase' ? 'var(--primary)' : '#fff' }}><Eraser size={20} /></button>
          <div style={{ width: '1px', height: '20px', background: '#555' }} />
          <input type="color" value={color} onChange={e => { setColor(e.target.value); setMode('draw'); }} style={{ width: '30px', height: '30px', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
          <input type="range" min="2" max="20" value={brushSize} onChange={e => setBrushSize(e.target.value)} style={{ width: '80px' }} />
        </div>

        <button onClick={handleSend} style={{ background: 'var(--primary)', padding: '10px 20px', borderRadius: '30px', color: '#fff', fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center' }}>
          Gönder <Check size={18} />
        </button>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', padding: '80px 20px 20px 20px' }}>
        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          style={{ 
            cursor: mode === 'erase' ? 'crosshair' : 'crosshair',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            borderRadius: '8px',
            touchAction: 'none'
          }}
        />
        {!imageLoaded && <div style={{ position: 'absolute', color: '#fff' }}>Yükleniyor...</div>}
      </div>

    </div>
  );
}
