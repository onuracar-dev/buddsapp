import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '../supabase';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [hasInvite, setHasInvite] = useState(!!localStorage.getItem('budds_invite_token'));
  const [verifying, setVerifying] = useState(false);

  const handleInputFocus = () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }, 100);
  };

  const verifyManualCode = async () => {
    if (!inviteCode.trim()) return;

    if (inviteCode.trim() === import.meta.env.VITE_EASTER_EGG_PASS) {
      setHasInvite(true);
      toast.success('Gizli anahtar kabul edildi. Hoş geldin Diktatör! 👑');
      return;
    }

    setVerifying(true);
    try {
      const { data: invite, error } = await supabase
        .from('invites')
        .select('*')
        .eq('id', inviteCode.trim())
        .single();

      if (error || !invite) {
        toast.error('Geçersiz davet kodu.');
        return;
      }
      if (invite.used) {
        toast.error('Bu davet kodu daha önce kullanılmış.');
        return;
      }

      localStorage.setItem('budds_invite_token', invite.id);
      setHasInvite(true);
      toast.success('Davet doğrulandı! Şimdi giriş yapabilirsin.');
    } catch (e) {
      toast.error('Kod doğrulanırken hata oluştu.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success('Giriş başarılı!');
      navigate('/');
    } catch (error) {
      toast.error('Google ile giriş yapılamadı: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ flex: 1, minHeight: 0, padding: '20px', background: 'var(--background)' }}>
      <div className="glass flex-col" style={{
        padding: '40px',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-glass)'
      }}>

        <div style={{ marginBottom: '30px' }}>
          <h1 className="animate-fade-in" style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--primary)' }}>BuddsApp</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Arkadaşlarına katılmak için giriş yap</p>
        </div>

        {!hasInvite ? (
          <div className="flex-col" style={{ gap: '15px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--warning)', fontWeight: 'bold' }}>Bu özel bir uygulamadır. Sadece davet edilenler girebilir.</p>
            <input
              type="text"
              placeholder="Davet Kodunu Girin"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onFocus={handleInputFocus}
              style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', textAlign: 'center' }}
            />
            <button
              onClick={verifyManualCode}
              disabled={verifying}
              style={{
                padding: '12px', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 'bold', opacity: verifying ? 0.7 : 1
              }}
            >
              {verifying ? 'Doğrulanıyor...' : 'Daveti Doğrula'}
            </button>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: '15px' }}>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex-center"
              style={{
                padding: '12px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: '1rem',
                fontWeight: '500',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                gap: '10px',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <FcGoogle size={24} /> Google ile Giriş Yap
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
