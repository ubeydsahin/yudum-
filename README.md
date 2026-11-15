# Yudum

**Yudum**, günlük su içme alışkanlığını oyunlaştıran, bahçe & akvaryum büyütme, donanım adım sayar (**Spor** sekmesi) ve çevrimdışı çalışma özelliklerine sahip bir **Android (Capacitor 8)** ve **PWA** uygulamasıdır.

- **Geliştirici:** Said Ubeydullah ŞAHİN
- **Paket Kimliği:** `com.saidubeydullahsahin.yudum`
- **Minimum Android Sürümü:** Android 7.0+ (`minSdkVersion 24`, `targetSdkVersion 36`)

## Öne Çıkan Özellikler

- **Akıllı Su Takibi & Şişe Seçenekleri:** `100 ml`, `200 ml`, `330 ml`, `500 ml`, `750 ml`, `1000 ml` hızlı içim seçenekleri ve özel bardak/şişe hacmi.
- **Sabah İlk Yudum Bonusu:** `05:00 – 10:59` saatleri arasında günün ilk suyunda ekstra `+3 💧` ve `+15 XP`.
- **Bahçe, Dostlar & Canlı Akvaryum:** Su içtikçe büyüyen bitkiler, saksılar, hayvan dostlar ve yem atıldığında yeme yönelip yemleri yakalayan canlı balık fiziği.
- **🏃 Spor & Adım Sayar:** Android donanım adım sensörü (`StepCounter` Capacitor eklentisi — `TYPE_STEP_COUNTER` / `TYPE_STEP_DETECTOR`), adım hedefleri (`3.000 / 6.000 / 10.000` ödülleri), tahmini mesafe/kalori ve adıma göre ek su önerisi.
- **Grafik, Rozetler & Yedekleme:** 7 günlük su ve adım grafikleri, rozet koleksiyonu, JSON yedekleme/geri yükleme ve yerel bildirim hatırlatıcıları.

## Geliştirme & APK Derleme

### Gereksinimler

- Node.js (npm)
- JDK 21+ (`JAVA_HOME`)
- Android SDK (`ANDROID_HOME`)

### Web & Capacitor Senkronizasyonu

```bash
npm install
npm run cap:sync
```

### Debug veya Signed Release APK Üretimi

Release APK imzalama için proje köküne (`.gitignore` tarafından hariç tutulan) bir `keystore.properties` dosyası ve `.jks` anahtar deposu ekleyin:

```properties
storeFile=yudum-release.jks
storePassword=SIFRENIZ
keyAlias=yudum
keyPassword=SIFRENIZ
```

Ardından derleme komutunu çalıştırın:

```bash
# Debug APK
npm run apk:debug

# İmzalı Release APK (Yudum-v1.1.apk)
npm run apk:release
```

## Lisans

MIT
