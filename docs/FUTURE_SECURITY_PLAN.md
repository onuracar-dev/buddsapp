# İleri Düzey Güvenlik (Kriptografi) Planı

Bu belge, uygulamanın temel özellikleri tamamlandıktan sonra güvenliği artırmak amacıyla uygulanabilecek Uçtan Uca Şifreleme (E2EE), XSS/CSP Koruması ve Kod Karmaşıklaştırma (Obfuscation) adımlarını özetler.

## Neden Ertelendi?
- E2EE sistemi düz metin arama ve sunucu tabanlı filtreleme gibi özellikleri zorlaştırır.
- Kod karmaşıklaştırma (Obfuscation), geliştirme aşamasındaki hata ayıklama (debugging) sürecini zorlaştırır.
- Sisteme tam geçiş yapıldığında test amacıyla atılan eski mesajların sıfırlanması gerekecektir.

## Uygulanacak Adımlar

### 1. Uçtan Uca Şifreleme (E2EE)
- **Anahtar Üretimi:** Kullanıcı giriş yaptığında tarayıcıda otomatik bir Asimetrik Anahtar Çifti (Public/Private Key) üretilecek. Public Key veritabanına kaydedilecek, Private Key sadece cihazda (localStorage) kalacak.
- **Sohbet Şifrelemesi:** Her sohbet için özel bir Simetrik Şifre (AES-GCM) üretilecek. Bu şifre, gruptaki herkesin Public Key'i ile şifrelenip veritabanına konacak.
- **Mesaj Şifrelemesi:** Gönderilen her metin mesajı önce AES ile şifrelenecek, veritabanına tamamen okunmaz bir şifre bloğu (Örn: `U2FsdGVkX1+...`) olarak gidecek. Veritabanı admini dahil kimse mesajların içeriğini göremeyecek.
- **Kısıtlama:** Yeni cihaza geçen kullanıcı eski mesajlarını okuyamaz (Snapchat/Signal mantığı).

### 2. XSS ve CSP Koruması
- Vercel ve Vite yapılandırmasına **Content-Security-Policy (CSP)** başlıkları eklenecek. Bu sayede sohbete zararlı bir JavaScript kodu veya dış bağlantı enjekte edilmesi engellenecek.

### 3. Kod Karmaşıklaştırma (Obfuscation)
- `vite-plugin-javascript-obfuscator` paketi kurularak, derlenen kodlar anlamsız değişken isimlerine dönüştürülecek. İstemci tarafında tersine mühendislik yapılmasını zorlaştıracak.

---
**Not:** Bu adımlar uygulama kararlı sürüme ulaştığında ve yeni özellik ekleme aşaması bittiğinde devreye alınmalıdır.
