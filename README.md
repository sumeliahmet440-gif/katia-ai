# Katia AI v3 (LekoStudio)

## GitHub + Render
1. Tüm dosyaları reponun köküne yükle (server.js ve index.html aynı klasörde).
2. Render > New > Web Service > repoyu seç. Build: `npm install` · Start: `node server.js`
3. Environment: `GROQ_API_KEY` = senin Groq anahtarın (https://console.groq.com/keys). Anahtar sadece sunucuda durur, sayfa koduna girmez.
4. Katia, Ayaz ve Horror modları bu anahtarı otomatik kullanır. Diğer modlar için Ayarlar > API Anahtarları (Xiaomi MiMo dahil).

## APK (Capacitor)
- `config.js` içine Render adresini yaz: `window.KATIA_SERVER='https://katia-al-byww.onrender.com';`
- `mkdir www && cp index.html app.css extras.css app.js extras.js oyun.js oyun-mario.js oyun.css hesap.js hesap.css config.js sw.js manifest.json icon* reklam*.jpg www/`
- `npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor-community/speech-recognition @capacitor/browser`
- Android izinleri: INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, CAMERA, ACCESS_FINE_LOCATION
- iOS Info.plist: NSMicrophoneUsageDescription, NSSpeechRecognitionUsageDescription, NSCameraUsageDescription, NSLocationWhenInUseUsageDescription
- Sunucuda `ALLOWED_ORIGINS` gerekmez; `https://localhost` ve `capacitor://localhost` zaten tanımlı.

## Mikrofon
Capacitor eklentisi varsa onu, iOS Safari ve WebView'de MediaRecorder + sunucu (Whisper), masaüstü/Android Chrome'da tarayıcının ses tanımasını kullanır.


## Hesaplar, Leko modu ve ban (v4)
- Siteye ilk girişte herkes bir isim seçer. İsimler benzersizdir: Ayaz = AYaz = aYaz = ayaz (büyük/küçük harf ve Türkçe harf farkı yok sayılır).
- Leko modu şifreyle açılır (şifre sunucuda özet olarak durur; Render'da `LEKO_PASS` tanımlarsan o geçerli olur). Cihaz bir kez girince bir daha sorulmaz.
- Leko moduna **ilk giren kurucudur**. Kurucu herkesi banlayabilir. Diğer Leko moduna girenler sadece normal kullanıcıları banlayabilir; Leko hesaplarını banlayamaz.
- Leko modunda üst çubuktaki YÖNETİM düğmesi: kullanıcı listesi, ayarlarını değiştirme, mesaj gönderme, banlama / ban kaldırma.
- Sunucuda `GROQ_API_KEY` (veya `groq.key` dosyası) tüm modlar için kullanılır; telefonda da ayrıca anahtar girmek gerekmez.

### Kalıcı veritabanı (ÖNEMLİ)
Render ücretsiz planda dosyalar her yeniden başlatmada silinir; isimler ve banlar kaybolur. Çözüm (ücretsiz):
1. https://upstash.com adresinde ücretsiz bir Redis oluştur.
2. REST URL ve REST TOKEN değerlerini al.
3. Render > Environment: `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` ekle.
4. `/api/durum` adresinde `"kalici":true` görmelisin.


## Oyun modu, uygulamalar, izinler (v5)
- **OYUN modu** (Modlar menüsünde): `mario` yaz → Leko Bros açılır (özgün platform oyunu, dosya içinde, dış kaynak yok). **30 bölüm** vardır: 1-1 Çimenlik · 1-2 Yeraltı · 1-3 Gökyüzü (bulut platformlar) · 1-4 Kale (lav, dikenli düşmanlar) · 1-5 Son Gece · 1-6 Orman (zıplayan düşmanlar) · 1-7 Çöl (geniş uçurumlar, hızlı düşmanlar) · 1-8 Buz (kaygan zemin, buz parçaları) · 1-9 Volkan (lav gölleri, taş basamaklar) · 1-10 Karanlık Kale · 1-11 Plaj · 1-12 Maden · 1-13 Fırtına (gökyüzü platformları, yağmur) · 1-14 Kristal Mağara (kaygan zemin) · 1-15 Ejderha Kalesi · 1-16 Çiftlik · 1-17 Bataklık · 1-18 Kar Fırtınası (kaygan) · 1-19 Şeker Diyarı · **1-20 Sahte Kale (SAHTE BOSS: 3 vuruşta karton çıkar, kapı açılır)** · 1-21 Uzay (düşük yerçekimi, yüksek zıplama) · 1-22 Piramit · 1-23 Harabe · 1-24 Gökkuşağı · 1-25 Kral Kalesi · 1-26 Gece Ormanı · 1-27 Altın Çöl · 1-28 Donmuş Kale · 1-29 Derin Uzay · **1-30 Kral Ejderha (final, çok güçlü boss)**. **Her bölümün sonunda boss arenası** vardır: kapı boss ölmeden açılmaz. Boss canı bölüm ilerledikçe artar (1-1: 12, 1-29: 68, 1-30: 220); saldırıları: ateş topu, yer dalgası, minyon çağırma (1-11+), meteor yağmuru (1-16+), atılma (1-21+). Canın yarıdan azalınca hızlanır; her %25 canda arenadaki güç blokları yenilenir. Üstüne zıplamak 2, ateş topu 1 hasar verir. Boss'ta ölünce bölümü baştan oynamazsın, arena girişinden devam edersin. **Mekanikler:** bazı ? bloklardan mantar çıkar (büyürsün, büyükken tuğla kırarsın); büyükken bir ? bloğa daha vurursan ateş çiçeği çıkar (X / F / Shift ya da telefonda ATEŞ düğmesiyle en fazla 2 ateş topu; toplar zıplar, düşmanları ve dikenlileri öldürür). Hasar alınca ateş → büyük → küçük olursun, küçükken ölürsün; büyüklük bölümler arasında korunur, ölünce kaybolur. Bölümü bitirince dokun / Enter ile sonrakine geçilir; canlar biterse aynı bölüm yeniden denenir; 30. bölüm bitince oyun baştan başlar. Diğer modlarda sadece mesajın tamamı `mario` ise açılır.
- **Ayarlar → UYGULAMA EKLE** (ilk sekme): eklenen uygulama ana ekranda kısayol olur, dokununca sitesi açılır.
- **Ayarlar → İZİNLER**: ana şalter + kategoriler. Açıkken: "youtubede X aç", "spotifyda X çal", "not al: …", "yarın saat 15:00 toplantı takvime ekle", "5551234567 ara", "X haritada aç". Anlaşılamayan işler için (ek istek harcar) yapay zeka eylemi seçer.
- **Leko modu**: "istatistik", "kimler çevrimiçi", "duyur: …", "mesaj isim: …", "banla isim", "ban kaldır isim", "hesapla", "şifre üret", "zar at"; Yönetim panelinde DUYURU düğmesi.
- **???** gizli modu: kalp atışı, uğultu, gözler, kararma, ani yüz. Ayarlar → MOD AYARLARI'ndan kapatılabilir.


## Oyun düzenleme modu (sadece Leko modu açıkken)
- Oyun açıkken klavyede **X tuşuna 3 kez hızlıca** basınca düzenleme paneli açılır (Leko modunda ve yönetici hesabıyla; aksi halde hiçbir şey olmaz). Oyun panel açıkken durur.
- Bölüm seç; alanlar: düşman sayısı çarpanı, düşman hızı, boss can çarpanı, boss saldırı hızı, süre, yerçekimi, zıplama gücü, oyuncu hızı, kaygan zemin, güç blokları (kapatınca mantar/çiçek çıkmaz). Boş bırakılan alan varsayılandır.
- **KAYDET (HERKESE)**: ayarlar sunucuda saklanır, tüm oyunculara yansır (en geç ~30 sn; oyun yeniden başlayınca/bölüm yüklenince geçerli). Ayarlı bölümde sol üstte "AYARLI" yazar. **KAYDET + BÖLÜME GİT** seçilen bölümü hemen başlatır.
- Sunucu değerleri güvenli aralığa sıkıştırır (ör. düşman çarpanı en çok 4, süre 30-999). Sadece yöneticiler kaydedebilir. Kalıcı olması için Upstash Redis bağlı olmalı (yukarıdaki bölüm), yoksa Render yeniden başlayınca ayarlar silinir.
