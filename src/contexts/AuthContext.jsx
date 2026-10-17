import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Kullanıcı profilini çekme fonksiyonu
  const fetchUserProfile = async (uid) => {
    try {
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      // 7 saniyelik timeout (Ağ bağlantısı zayıfsa sonsuz mavi ekranda kalmasını önlemek için)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 7000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
        
      if (error) {
        console.error("Profil getirilirken hata:", error);
        return null;
      }

      if (!data) return null;

      const isAdminUser = data.role === 'admin';

      const profileWithAdmin = {
        ...data,
        isAdmin: isAdminUser
      };

      setUserProfile(profileWithAdmin);
      
      if (profileWithAdmin?.isAdmin) {
        // Fetch all workspaces for Admin
        const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true });
        if (wsData) {
          setWorkspaces(wsData);
          const savedWs = localStorage.getItem('budds_admin_workspace');
          if (savedWs && wsData.find(w => w.id === savedWs)) {
            setActiveWorkspaceId(savedWs);
          } else if (wsData.length > 0) {
            setActiveWorkspaceId(wsData[0].id);
          }
        }
      } else {
        setActiveWorkspaceId(profileWithAdmin.workspace_id);
      }

      localStorage.setItem(`budds_profile_cache_${uid}`, JSON.stringify(profileWithAdmin));
      return profileWithAdmin;

    } catch (error) {
      console.warn("Profil getirilirken hata veya zaman aşımı:", error.message);
      
      // Çevrimdışı/Yavaş ağ durumunda cache'den kurtar
      const cached = localStorage.getItem(`budds_profile_cache_${uid}`);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          setUserProfile(parsedCache);
          
          if (parsedCache.isAdmin) {
            const savedWorkspace = localStorage.getItem('budds_admin_workspace');
            if (savedWorkspace) setActiveWorkspaceId(savedWorkspace);
          } else {
            setActiveWorkspaceId(parsedCache.workspace_id);
          }
          
          return parsedCache;
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
      return null;
    }
  };

  const changeWorkspace = (id) => {
    setActiveWorkspaceId(id);
    if (userProfile?.isAdmin) {
      localStorage.setItem('budds_admin_workspace', id);
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const loginWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserProfile(null);
    setCurrentUser(null);
  };

  useEffect(() => {
    const consumeInviteToken = async (user) => {
      const token = localStorage.getItem('budds_invite_token');
      if (token && user) {
        try {
          const { data: wsId, error } = await supabase.rpc('redeem_invite', { code: token });
          if (error) {
            console.error("Token kullanma hatası:", error);
            toast.error("Davet kodu doğrulanamadı: " + error.message);
            localStorage.removeItem('budds_invite_token');
          } else {
            localStorage.removeItem('budds_invite_token');
            if (wsId) {
              setUserProfile(prev => prev ? { ...prev, workspace_id: wsId } : prev);
              setActiveWorkspaceId(wsId);
            }
            toast.success("Mekana başarıyla katıldınız!");
          }
        } catch (e) {
          console.error("Invite redeem hatası", e);
          localStorage.removeItem('budds_invite_token');
        }
      }
    };

    let isMounted = true;

    // Emniyet sübabı: Herhangi bir API takılırsa sonsuz loading'de (mavi ekranda) kalmamak için 10 sn sonra zorla bitir
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Auth check timed out (10s). Forcing UI unblock.");
        setLoading(false);
      }
    }, 10000);

    const finishLoading = () => {
      if (isMounted) {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };

    // Mevcut session'ı kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        consumeInviteToken(user);
        fetchUserProfile(user.id).then(finishLoading).catch(finishLoading);
      } else {
        finishLoading();
      }
    }).catch(err => {
      console.error("Session hatası:", err);
      finishLoading();
    });

    // Auth state değişikliklerini dinle (Giriş/Çıkış yapıldığında tetiklenir)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        consumeInviteToken(user);
        await fetchUserProfile(user.id);
      } else {
        setUserProfile(null);
      }
      finishLoading();
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    activeWorkspaceId,
    workspaces,
    changeWorkspace,
    fetchUserProfile,
    loginWithGoogle,
    loginWithApple,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
