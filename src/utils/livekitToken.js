import { supabase } from '../supabase';

/**
 * Kullanıcı için odalara giriş yetkisi (Token) üretir.
 * LiveKit API secret kesinlikle tarayıcıya gönderilmemelidir; token üretimi
 * Supabase Edge Function gibi güvenli bir server tarafında yapılır.
 */
export async function generateLiveKitToken(roomName, participantName, participantId) {
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: {
      roomName,
      participantName,
      participantId
    }
  });

  if (error) {
    throw new Error(error.message || 'LiveKit token servisine ulaşılamadı');
  }

  const jwt = data?.token;
  if (!jwt) {
    throw new Error('LiveKit token servisi geçerli bir token döndürmedi');
  }

  return jwt;
}
