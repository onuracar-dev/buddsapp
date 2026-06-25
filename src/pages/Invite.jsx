import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { data: invite, error } = await supabase
          .from('invites')
          .select('*')
          .eq('id', token)
          .single();

        if (error || !invite) {
          toast.error('Geçersiz davet linki.');
          navigate('/login');
          return;
        }

        if (invite.used) {
          toast.error('Bu davet linki daha önce kullanılmış.');
          navigate('/login');
          return;
        }

        // Token geçerliyse, localStorage'a kaydet ve login'e yönlendir
        localStorage.setItem('budds_invite_token', token);
        toast.success('Davet doğrulandı! Lütfen giriş yapın.');
        navigate('/login');

      } catch (error) {
        toast.error('Bir hata oluştu.');
        navigate('/login');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

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
