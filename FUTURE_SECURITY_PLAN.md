# İleri Düzey Güvenlik (Kriptografi) Planı - GELECEK İÇİN

Bu belge, uygulamanın özellikleri tamamen bittikten sonra "Askeri Düzeyde" güvenli hale getirilmesi için uygulanacak Uçtan Uca Şifreleme (E2EE), XSS/CSP Koruması ve Kod Karmaşıklaştırma (Obfuscation) adımlarını hatırda tutmak için oluşturulmuştur.

## Neden Ertelendi?
- E2EE sistemi mesaj arama, sunucu tabanlı filtreleme gibi gelecekte eklenecek özellikleri imkansız hale getirir.
- Kod karmaşıklaştırma (Obfuscation), geliştirme aşamasındaki hata ayıklama (debugging) sürecini kör eder.
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
- `vite-plugin-javascript-obfuscator` paketi kurularak, derlenen kodlar tamamen anlamsız değişken isimlerine dönüştürülecek. İstemci tarafında tersine mühendislik yapılması imkansız hale getirilecek.

---
**Not:** Bu adımlar uygulama V1.0 sürümüne ulaştığında ve yeni "özellik" ekleme aşaması bittiğinde devreye alınmalıdır.
