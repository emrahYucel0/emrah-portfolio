# Gerçek cihaz testi: İletişim finali (ana site), adım adım

Hedef cihaz iPhone 7 Plus, iOS 15.8, Safari. Taban **iOS 15.4 / Safari 15.4** (sitenin belgelenen tabanı).
Bu belge ana repodaki (`emrah-portfolio`, dal `feature/contact-finale`) finali test eder. Prototipinki
`lab-contact/review/DEVICE-TEST.md`.

Her adımda **Geç** beklenen davranıştır, **Kal** hatadır. Bir şey takılırsa şunları gönder: adım numarası, kabaca
nerede olduğun, `?hud=1`'deki üç sayı ve bir ekran görüntüsü.

## 0. Sunucuyu yerel ağda başlat

Bilgisayarda **Git Bash** aç:

```sh
cd ~/Desktop/EmrahYucel-Portfolio/emrah-portfolio
npm run generate                 # güncel build (~1 dk)
cd tools/diag
sh serve.sh                      # 4500 / 4501 / 4650'yi yeniden başlatır
```

- `serve.sh: ready.` yazınca hazırdır. Komut geri dönmez, çünkü sunucular çalışmaya devam eder. Pencereyi açık bırak.
- Telefon için port **4501**. Bu port yerel ağa açıktır (`0.0.0.0`). 4500 ve 4650 yalnız bu bilgisayar içindir.
- Bilgisayarın adresini bulmak için PowerShell'de `ipconfig` çalıştır. Wi-Fi bağdaştırıcısının IPv4 adresini al.
  Bu makinede şu an **192.168.1.102**. `172.x` ile başlayanlar sanal bağdaştırıcıdır, onları kullanma.
- Telefon aynı Wi-Fi'da olmalı. Safari'de şunları açacaksın:
  - `http://192.168.1.102:4501/tr/lab` → Lab
  - `http://192.168.1.102:4501/tr/contact` → final
  - `http://192.168.1.102:4501/tr` → ana sayfa (C2)
- Sayfa açılmazsa Windows Güvenlik Duvarı Node için özel ağ izni istemiş olabilir; onayla.
- Build'i yeniledikten sonra `serve.sh`'ı **mutlaka yeniden başlat**. Eski sunucu yeni sayfaya eski CSP'yi
  gönderir ve site açılmaz. Ayrıntı `serve.sh`'ın başında yazıyor.

Geçişleri en temiz hâliyle görmek için Safari'de **gizli sekme** kullan. Ziyaret belleği (hangi çalışmanın kayıtlı
olduğu, bırakılan yerler) sekme başına tutulur.

## 0.5 Bir şey çalışmıyorsa: teşhis paneli

Adresin sonuna `?debug=1` ekle: `http://192.168.1.102:4501/tr/contact?debug=1`. Üstte bir panel çıkar ve şunları
gösterir:

- `finale RUNNING` ya da `NOT STARTED`
- yakalanmamış hatalar
- hangi yedek yola neden düşüldüğü
- özellik yoklamaları ve dokunmatik tespiti

Panele dokununca katlanır. Ekran görüntüsünü göndermen yeter, Web Inspector gerekmez.

## 1. Lab → final (parmakla, aşağı yön)

1. `…/tr/lab` sayfasını aç ve bench tam otursun (1–2 sn).
2. Ekranın ortasında **bir kez yukarı kaydır** (parmak yukarı gider, yani "sonraki").
3. **Geç:**
   - Bench kendini çıplak satır alanına temizler: kayıtlar, alan, cetvel ve not ~0,3 sn'de söner.
   - Aynı satırlar üzerinde İletişim sayfası açılır ve şeritte İLETİŞİM koyulaşır.
   - Alt şeridin iki ucu ana sayfanınkiyle aynıdır. Solda `CREATIVE DEVELOPER · FULL-STACK DEVELOPER` yazar
     (telefonda gizli, ana sayfadaki gibi), sağda `İSTANBUL · SEÇİLİ FREELANCE PROJELERE AÇIĞIM`. Bu yazılar çizim
     boyunca değişmez.
   - Arada beyaz an, boş kare ya da titreme yoktur; satırlar yerinden oynamaz.
   - Parmağını kaldırdığında sayfa **kaymamıştır**, çizim en baştan (p = 0) başlar.
   - Yarım saniye kadar sonra alt şeridin ortasında `AŞAĞI KAYDIR` belirir. Kopacak satır (alta yakın olan) yerinden
     hafifçe kalkıp sarkarak nefes alır; kaydırmadığın sürece bu döngü sürer.
   - İlk kaydırmada yazı söner ve satır normal kopmaya geçer. Tepeye geri dönünce ikisi de geri gelmez.
4. **Kal:**
   - beyaz ya da düz liste hâlinde bir kare görünmesi,
   - satırların zıplaması,
   - aynı kaydırmanın finali aşağı sürüklemesi,
   - İşler'e ya da başka bir yere gitmesi.

## 2. Final → Lab (parmakla, yukarı yön)

1. Adım 1'in sonunda, finalin en tepesindeyken **bir kez aşağı kaydır** (parmak aşağı gider, yani "önceki").
2. **Geç:**
   - Çıplak satırların üstünde bench yeniden kurulur: kayıtlar, alan ve cetvel ~0,4 sn'de belirir.
   - Bıraktığın çalışma yine kayıtlıdır.
   - Aynı hareket bench'i **İşler'e geçirmez**.
3. Tekrar aşağı yöne git (adım 1). Bu kez çizimin biraz içine kaydır, sonra **tek bir hızlı fiskeyle** en tepeye
   geri dön. **Geç:** final tepede durur, Lab'e gitmez.
4. Şimdi **yeni** bir aşağı kaydırma yap. **Geç:** Lab açılır.

## 3. C2'den iletişim durağına varış

1. Yeni gizli sekmede `…/tr` adresini aç ve açılış bitsin.
2. İşler'e kadar yukarı kaydır, sonra bir kez daha kaydır. İşler → Lab köprüsü bench'i açar.
3. Safari'nin **Geri** düğmesine bas. C2, Lab durağında sessizce durmalı; bench'i yeniden açmamalı.
4. Buradan **bir kez yukarı kaydır** (sonraki).
5. **Geç:**
   - C2 iletişim durağına gider ve oraya varınca final açılır, çizim en baştan (p = 0) başlar.
   - Eski C2 iletişim yazıları (ad, e-posta listesi) görünmez.
6. Safari'de **Geri**'ye bas. **Geç:** C2 iletişim durağında sessizce durur.
7. Oradan **bir kez daha yukarı kaydır**. **Geç:** final yine p = 0'dan açılır.

## 4. Menüden ve bağlantıdan gelince p = 1

Her birinde **Geç:** final çizimi bitmiş, e-posta emmiş hâlde açılır.

1. `…/tr`'de şeritteki **İLETİŞİM**.
2. `…/tr/lab`'de şeritteki **İLETİŞİM**.
3. Finalde çizimin ortasındayken şeritteki **İLETİŞİM**: final olduğu yerde yerine oturur.
4. Adres çubuğuna `http://192.168.1.102:4501/tr#contact` yaz: `/tr/contact` açılır, p = 1.

## 5. Geri / İleri ve dil

1. Finalde çizimin ortasına kaydır, şeritteki **LAB**'e dokun (bench açılır), sonra **Geri**'ye bas.
   **Geç:** final bıraktığın yerdedir, baştan oynamaz. **İleri** → bench.
2. Finalde ortadayken şeritteki **EN**'e dokun.
   - **Geç:** aynı yerde İngilizce açılır; sağ uçta `ISTANBUL · AVAILABLE FOR SELECTED FREELANCE WORK` yazar.
   - **Geri** → Türkçe, yine aynı yerde.

## 6. Finalin kendisi

1. **Çizim:**
   - Yukarıdan yavaşça kaydır: satır kopar → kağıt aralanır → etiketler → e-posta üç satır → diğer değerler.
   - E-posta bitince kağıt onu **içer** ve kalın harfe döner.
   - **Geç:** geri kaydırınca aynı çizim geri sarılır; hiçbir anda söz kaybolmaz.
2. **Kaydırmayla dikkat:**
   - Çizim bittikten sonra ~1,2 ekran daha kaydır. Sırayla e-posta, telefon, GitHub, LinkedIn ve konum büyür.
   - Telefon tek satırda kalır ve emmez.
3. **Dokunuşlar:**
   - Tek dokunuşla ve beklemeden: telefon → arama ekranı, e-posta → Mail taslağı, GitHub/LinkedIn → yeni sekme.
   - Geri dönünce o değerde bulut ve `△1` görünür.
   - **KOPYALA** → panoya adres gelir ve kalem "KOPYALANDI" notunu yazar.

## 6.5 Dikkat gösterimi (oturumda bir kez)

1. Yeni bir gizli sekmede finale menüden gel (p = 1). Kaydırma ve dokunma olmadan bekle.
2. Telefonda ~2 sn sonra:
   - Alt şeritte `KAYDIRMAYA DEVAM ET` belirir.
   - Dikkat kendiliğinden e-postadan telefona, oradan GitHub'a yürür; GitHub büyür.
   - ~1 sn durur, sonra e-postaya döner ve yazı söner. Sayfa bu sırada kaymaz.
3. Gösterim sürerken ekrana dokunmak ya da kaydırmak onu hemen bırakır.
4. **Geç:** aynı sekmede finale yeniden gelince gösterim tekrar oynamaz.
5. Masaüstünde (bilgisayardan kontrol için):
   - İmleç ~2 sn durunca `İMLECİ GEZDİR` belirir ve GitHub büyüyüp e-postaya döner.
   - İmleci oynatmak gösterimi anında bırakır.
6. Hareketi Azalt açıkken yalnız yazı görünür, hiçbir şey kıpırdamaz.

## 7. Erişilebilirlik ve ayarlar

1. **Hareketi Azalt** (Ayarlar → Erişilebilirlik → Hareket) AÇIK iken:
   - Lab ↔ final geçişi anında olur, temizlenme ve yeniden kurulma görünmez.
   - Final dört durakta atlar.
   - Varışta satır nefes almaz; yalnız `AŞAĞI KAYDIR` yazısı görünür.
   - 1–4. adımlar yine aynı yere varır.
2. **VoiceOver**, finalin en tepesindeyken (p = 0):
   - Sağa kaydırdıkça sırayla "İletişim" başlığı ve beş bilgi okunur.
   - GitHub "GitHub profili (yeni sekmede açılır)" diye okunur.
   - Çift dokunuş eylemi yapar. Eylemden sonra "Revizyon 1: …", kopyalayınca "kopyalandı" duyulur.
3. **Yatay tutuş:** taşma ya da üst üste binme olmaz.

## 8. HUD

1. `…/tr/contact?hud=1` aç; sağ üstte `p50 / p95 / max` (ms) çıkar.
2. İki tam tur yavaş kaydır. **Geç:** p95 ≤ 25 ms.
3. 10 sn dokunma. **Geç:** `n` artmaz.
