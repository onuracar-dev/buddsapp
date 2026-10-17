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
    } catch (_e) {
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
    <div className="login-page">
      <div className="glass flex-col login-card">
        <div className="login-header">
          <h1 className="animate-fade-in login-title">BuddsApp</h1>
          <p className="login-subtitle">Arkadaşlarına katılmak için giriş yap</p>
        </div>

        {!hasInvite ? (
          <div className="flex-col login-invite-box">
            <p className="login-notice">Bu özel bir uygulamadır. Sadece davet edilenler girebilir.</p>
            <input
              type="text"
              placeholder="Davet Kodunu Girin"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onFocus={handleInputFocus}
              className="login-input"
            />
            <button
              onClick={verifyManualCode}
              disabled={verifying}
              className="login-btn-primary"
            >
              {verifying ? 'Doğrulanıyor...' : 'Daveti Doğrula'}
            </button>
          </div>
        ) : (
          <div className="flex-col login-invite-box">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex-center login-google-btn"
            >
              <FcGoogle size={22} /> Google ile Giriş Yap
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
