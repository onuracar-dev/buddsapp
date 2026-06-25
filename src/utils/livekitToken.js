import { SignJWT } from 'jose';

// VITE ile başlayan çevresel değişkenler (Environment Variables)
const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY;
const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET;

/**
 * Kullanıcı için odalara giriş yetkisi (Token) üretir.
 * Normalde bu işlem güvenlik sebebiyle arka uçta (Backend) yapılır, 
 * ancak sistemde sunucu olmadığı için tarayıcıda geçici olarak oluşturuyoruz.
 */
export async function generateLiveKitToken(roomName, participantName, participantId) {
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit kimlik bilgileri eksik (.env dosyasını kontrol edin)');
  }

  // API Secret'ı kriptografik bir anahtara dönüştür (jose kütüphanesi için zorunlu)
  const secretKey = new TextEncoder().encode(apiSecret);

  // LiveKit'in beklediği formatta bir bilet (JWT) oluştur
  const jwt = await new SignJWT({
    iss: apiKey, // Veren: API Key
    sub: participantId, // Katılımcı ID'si
    name: participantName, // Görünecek ad
    video: {
      room: roomName,
      roomJoin: true, // Odaya katılma yetkisi
      canPublish: true, // Kamera/Mikrofon açma yetkisi
      canSubscribe: true // Başkalarını görme yetkisi
    }
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h') // 2 saat geçerli
    .sign(secretKey);

  return jwt;
}
