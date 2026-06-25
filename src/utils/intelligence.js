export const gatherIntelligence = async () => {
  let ip = 'Bilinmiyor';
  let location = 'Bilinmiyor';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      ip = data.ip || 'Bilinmiyor';
      location = `${data.city || 'Bilinmeyen Şehir'}, ${data.country_name || 'Bilinmeyen Ülke'}`.trim();
    }
  } catch (e) {
    console.warn("IP API timeout veya hata:", e.message);
  }

  const ua = navigator.userAgent;
  let device = 'Bilinmeyen Cihaz';
  
  if (/iPhone/i.test(ua)) device = 'Apple iPhone';
  else if (/iPad/i.test(ua)) device = 'Apple iPad';
  else if (/Android/i.test(ua)) device = 'Android Telefon';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Macintosh/i.test(ua)) device = 'Apple Mac';
  else if (/Linux/i.test(ua)) device = 'Linux PC';

  let browser = 'Bilinmeyen Tarayıcı';
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua) && !/OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  else if (/OPR/i.test(ua)) browser = 'Opera';
  
  return {
    ip_address: ip,
    location: location,
    device_info: `${device} - ${browser}`
  };
};
