import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const handleInvite = async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      if (currentUser) {
        try {
          const { error } = await supabase.rpc('redeem_invite', { code: token });
          if (error) {
            toast.error('Geçersiz veya kullanılmış davet linki.');
            navigate('/login');
            return;
          }

          toast.success('Davet kabul edildi! Mekana katıldınız.');
          navigate('/');
        } catch (_error) {
          toast.error('Davet kullanılırken bir hata oluştu.');
          navigate('/login');
        } finally {
          setVerifying(false);
        }
      } else {
        localStorage.setItem('budds_invite_token', token);
        toast.success('Davet linki algılandı! Lütfen giriş yapın.');
        navigate('/login');
      }
    };

    handleInvite();
  }, [token, currentUser, navigate]);

  return (
    <div className="flex-center" style={{ height: '100vh', background: 'var(--background)' }}>
      {verifying && (
        <div className="flex-col flex-center glass" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', gap: '15px' }}>
          <Loader2 size={40} className="animate-spin" color="var(--primary)" />
          <p style={{ color: 'var(--text-secondary)' }}>Davet kontrol ediliyor...</p>
        </div>
      )}
    </div>
  );
}
