import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './supabase';
import { useEffect } from 'react';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AnnouncementBanner from './components/AnnouncementBanner';
import Home from './pages/Home';
import Admin from './pages/Admin';
import ChatRoom from './pages/ChatRoom';
import Invite from './pages/Invite';
import Settings from './pages/Settings';
import IncomingCallModal from './components/call/IncomingCallModal';
import CallRoom from './components/call/CallRoom';
import { MusicProvider } from './contexts/MusicContext';
import GlobalMusicPlayer from './components/GlobalMusicPlayer';
import UserPublicProfile from './pages/UserPublicProfile';
import Members from './pages/Members';

// Protected Route Component
const ProtectedRoute = ({ children, requireProfile = true }) => {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Ban Kontrolü
  if (userProfile?.banned_until && new Date(userProfile.banned_until) > new Date()) {
    return (
      <div className="flex-col flex-center" style={{ height: '100vh', background: 'var(--background)', color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>⛔</h1>
        <h2>Hesabın Donduruldu</h2>
        <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
          Kaldırılma Tarihi: <br/> 
          <strong style={{ color: 'var(--text-primary)' }}>{new Date(userProfile.banned_until).toLocaleString('tr-TR')}</strong>
        </p>
      </div>
    );
  }

  // Kullanıcı giriş yapmış ama profilini tamamlamamışsa
  if (requireProfile && !userProfile && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }
  
  return children;
};



function App() {
  const { currentUser } = useAuth();

  // Heartbeat (Aktiflik) Sistemi ve Mobil Ekran Optimizasyonu
  useEffect(() => {
    // Mobil klavye açıldığında ekranın sıkışıp kalmasını (100dvh hatasını) engeller
    const updateAppHeight = () => {
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
      document.body.style.height = `${height}px`;
      const root = document.getElementById('root');
      if (root) root.style.height = `${height}px`;
    };
    
    window.addEventListener('resize', updateAppHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateAppHeight);
      window.visualViewport.addEventListener('scroll', updateAppHeight);
    }
    updateAppHeight();

    if (!currentUser) return;
    
    const updateLastSeen = async () => {
      await supabase.from('users').update({ last_seen: new Date() }).eq('id', currentUser.id);
    };

    updateLastSeen(); // İlk girişte
    const interval = setInterval(updateLastSeen, 60000); // Her 1 dakikada bir

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateAppHeight);
    };
  }, [currentUser]);

  return (
    <MusicProvider>
      <AnnouncementBanner />
      <IncomingCallModal />
      <GlobalMusicPlayer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/invite/:token" element={<Invite />} />
        
        <Route path="/profile" element={
          <ProtectedRoute requireProfile={false}>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        
        <Route path="/chat/:chatId" element={
          <ProtectedRoute>
            <ChatRoom />
          </ProtectedRoute>
        } />

        <Route path="/call/:roomName" element={
          <ProtectedRoute>
            <CallRoom />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/user/:userId" element={
          <ProtectedRoute>
            <UserPublicProfile />
          </ProtectedRoute>
        } />

        <Route path="/members" element={
          <ProtectedRoute>
            <Members />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute requireProfile={false}>
            <Admin />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </MusicProvider>
  );
}

export default App;
