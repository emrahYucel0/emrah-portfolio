# AUDIT-01: Site denetimi (main b04e1ed)

- **Tarih:** 2026-09-30
- **Kapsam:** `main` = `origin/main` b04e1ed. Contact finali birleşik ama canlıda değil.
- **Kural:** yalnız okuma. Kod değiştirilmedi, commit yapılmadı, Linefield worktree'sine ve onun sunucularına dokunulmadı.
- **Kanıtlar:** `tools/diag/out/audit-01/` klasöründe (git'e girmez; repo herkese açık ve kareler yeniden üretilebilir). `d*` masaüstü 1440×900, `m*` mobil 375×812 ve 430×932, `s*` karşılaştırma ve zaman çizelgesi sayfalarıdır. Dosya yolları repo köküne göre verilmiştir.

---

## 0. Özet

Site, portfolyo türü için gerçekten yeni bir malzeme dili kuruyor. Ad, iki yüz (CREATIVE / FULL-STACK), İşler ve iletişim aynı satır malzemesinden türüyor. Bu bütünlük ve zanaat, jüride Tasarım ve Yaratıcılık puanlarını taşır.

Puanı düşürenler ise sayfanın asıl işinde toplanıyor: **işleri göstermek ve iletişime geçirmek**.

- **İşlerin gerçek görseli geç ve dolaylı görünüyor.** Satır tonu, önizlemeyi okunmaz yapıyor. Hareketi azaltılmış modda case study "odaları" tamamen boş kalıyor.
- **İletişime doğrudan gelen boş bir kâğıt görüyor.** Paylaşılan `/tr/contact` bağlantısı ilk ekranda hiçbir bilgi göstermiyor.
- **Açılış yavaş bir bağlantıda çok uzun sürüyor.** Fast 3G ve 4× CPU koşulunda ad yaklaşık 11 sn'de beliriyor. JS yüklenemezse ekran sonsuza kadar çizgili ve boş kalıyor.
- **Asıl etkileşim hiç öğretilmiyor.** İmleçle çizgileri yarmak ve ilk durakta ilerlemek için hiçbir ipucu yok.

**Tahmini jüri puanı (bağımsız):**

| Kategori | Puan |
|---|---|
| Tasarım | 7.4 |
| Kullanılabilirlik | 5.8 |
| Yaratıcılık | 8.0 |
| İçerik | 6.3 |
| **Ağırlıklı (40/30/20/10)** | **≈ 6.9** |

Bu puan Honorable Mention ile SOTD eşiğinin sınırında. Önerilen engelleyici düzeltmeler ve hızlı kazanımlar yapılırsa Kullanılabilirlik ≈ 6.8 ve İçerik ≈ 7.0'a çıkar. Ağırlıklı puan ≈ 7.3 olur (§5).

### Yöntem ve sınırlar
- **Denetlenen build:** `builds/merge-contact-finale/`. `diff -rq` ile `.output/public` ile aynı olduğu doğrulandı (fark yalnız `axe.min.js`).
- **Sunucular:** kendi `tools/diag/sv.cjs` sunucularım 4910 ve 4911 (`--wk`) portlarında çalıştı. Linefield sunucularına (4500/4501/4650/4800–4803/5390) dokunulmadı.
- **Kullanılan araçlar:**
  - Playwright (repo dışı scratchpad harness): Chrome (gerçek GPU, ANGLE/Intel), WebKit, Firefox 155.
  - Gerçek dokunma olayları için Chrome CDP.
  - axe-core, Lighthouse 12.8.2 (kurulu Chrome ile), sharp piksel örneklemesi.
- **Doğrulanmayanlar:**
  - **Safari masaüstü ve gerçek iPhone.** Windows'ta Safari yok. WebKit bir vekildir ve aşağıda önemli bir farkı var (§B9). iOS jestleri emülasyon ve kod ile incelendi (§6 kontrol listesi).
  - **Lighthouse (yerel):** `sv.cjs` sıkıştırmasız ve `no-store` olduğu için yerel sayılar karamsardır. Karşılaştırma için canlı sitede de çalıştırıldı.
- **Önemli not:** Brief'teki A/B/C listeleri görev metninde bana baştan göründü. "Bağımsız bulgular" bölümünü kendi turumun karelerinden yazdım, listelerle eşlemeyi ancak sonra (§4) yaptım. Yine de tam körlük iddia etmiyorum.

---

## 1. Bağımsız bulgular

### 1.1 Güçlü olanlar
- **Tek malzeme, tek dil.** Ad, yüzler, İşler, Lab ve iletişim aynı satır ızgarasından çıkıyor. Hiçbir durak "başka bir siteye geçildi" hissi vermiyor. Jürinin "bütünlük" beklentisini doğrudan karşılıyor. Kanıt: `s13-desktop-stops.webp`.
- **Geçişler malzemeden doğuyor.** Ad→CREATIVE geçişinde satırlar açılıp kelimeyi yeniden yazıyor. CREATIVE→FULL-STACK, basılı tutunca negatif yüze "itiliyor". Kanıt: `d05-creative-hold.webp`, `d03-name-creative-pen.webp`.
- **Açılma hareketi güçlü bir fikir.** İşe basılı tutunca satırlar yarılıyor ve gerçek ekran görüntüsü yarıktan görünüyor. Sitenin en iyi anı bu. Kanıt: `d09-works-ege-hold.webp`.
- **Case study ritimleri kişisel.** Her proje için ayrı bir ritim var (authored / scale / system), her birinde kendi mürekkep rengi, kapsül "odalar" ve cihaz kareleri kullanılıyor. Kanıt: `d11-ist-facts.webp`, `d13-ege-f1.webp`, `d17-evden-f3.webp`.
- **Hakkımda masaüstünde güzel ve okunur.** Metin, adın satırları arasına oyulmuş kapsüllerde duruyor. Kanıt: `d19-about-detail.webp`.
- **Teknik zemin sağlam.**
  - axe: 13 rota ve durum, 0 ihlal.
  - Klavye odak halkaları her yerde görünüyor. Sekmeyle açılan düz gezinme paneli var (`s07-keyboard-focus.webp`).
  - JS kapalıyken ev, hakkımda ve iletişim düzgün bir belge oluyor (`s08-nojs-and-blocked.webp`).
  - Üçüncü parti script yok, çerez yok.
  - Canlı Lighthouse masaüstü 100/100/100/100.

### 1.2 Zayıf olanlar
- **İşler, sitenin en az okunan yeri.**
  - Seçili iş durgun halde gri satır tonu olarak duruyor. İstanbul büyük tipografisi sayesinde seçilebiliyor. Ege ve Evden neredeyse okunmuyor (`d08-works-ege-tone.webp`, `m12-375-ege-registered.webp`).
  - Gerçek görseli görmek için ya görsele basılı tutmak ya da projeyi açmak gerekiyor.
  - İşverenin iki saniyede "ne yapmış" diye bakacağı yer burası.
- **Case study'lerde okuma cepleri.** Metnin arkasında yumuşak kenarlı koyu dikdörtgenler var.
  - Kasıtlı bir cep, ama bir "kart" ya da render hatası gibi okunuyor.
  - Bazen metinden çok daha büyük: `d17-evden-f3.webp` sağ altta büyük, neredeyse boş bir koyu blok.
  - Ek kanıt: `d11`, `d13`, `d14`, `d16`.
- **"Sonraki iş" önizlemesi kendi rengine gömülü.** Sonraki proje, mevcut projenin mürekkep renginde tonlanıyor. Kırmızı üstüne kırmızı ve yeşil üstüne kahve kalıyor, okunmuyor (`d12`, `d15`, `d18`, `m15`).
- **İletişim finaline doğrudan gelinirse ilk ekran boş.** `/tr/contact` bağlantısıyla gelen ziyaretçi 8 saniye boyunca yalnız çizgiler ve küçük bir "AŞAĞI KAYDIR" görüyor (`d22-contact-p0-8s.webp`, `m24-375-contact-p0-8s.webp`).
  - İletişim bilgilerinin hepsini görmek için masaüstünde 4.2, mobilde 5.4 ekran boyu kaydırmak gerekiyor.
  - Menüdeki "İletişim" düğmesi finali bitmiş haliyle açıyor. Sorun yalnız doğrudan gelişte, ama e-posta imzası ya da CV'deki bir link tam olarak bu yol.
- **Son kompozisyonda hiyerarşi ters.** İletişim finalinin bitmiş halinde en büyük öğe "GitHub". Telefon neredeyse okunmayacak kadar küçük (`d23-contact-end.webp`). Bir işveren için öncelik sırası e-posta, telefon, LinkedIn'dir.
- **Açılış.**
  - Hızlı ağda 0.4–1.5 sn düz çizgili bir plaka görünüyor.
  - Fast 3G ve 4× CPU'da plaka 2.4 sn'de geliyor, ad ≈ 10.8 sn'de (`s02-boot-fast3g-mobile.webp`).
  - JS yüklenemezse (engellenmiş, eski tarayıcı, CDN hatası) plaka hiç kalkmıyor ve ziyaretçi sonsuza kadar boş çizgi görüyor (`s08`, sağdaki kare).
- **Mobil yüzler.** CREATIVE ve FULL-STACK kelimeleri dikeyde, sol kenarda koşuyor. Chrome'da okunur ama başı çevirmeden okunmuyor. Bu kelimeler ekranın yarısını kaplıyor (`m03`, `m05`).

### 1.3 Eksik olanlar
- **Açık bir eylem çağrısı yok.** Hiçbir yerde "Birlikte çalışalım / Proje için yazın" demiyor. Tek CTA şeritteki küçük "İLETİŞİM" yazısı. Durum satırı ("Seçili freelance projelere açığım") pasif kalıyor.
- **Case study'lerin kendi URL'si yok.** Paylaşılamıyor, sitemap'te yok, arama motoru içeriği (olgular, PSI, stack) yalnız ev sayfasının düz katmanında özet olarak görüyor.
- **Hareketi azaltılmış modda işler görünmüyor.** Case study odaları boş mürekkep alanı olarak çiziliyor (§B13, engelleyici).
- **İlk durakta nasıl ilerleneceği söylenmiyor.** Ad durağında ipucu satırı sessiz. Tek işaret 2.1 sn'deki küçük "nefes" (`main.js:1693-1702`).
- **Yüksek DPI görsel yok.** Proje görselleri en fazla 1600 px (bazıları 1875 px). 1440 CSS px genişliğindeki 2× bir ekranda (MacBook) ≈ 1.5–1.8 kat büyütülüyor.

### 1.4 Kafa karıştıran noktalar
- **Tarama kalemi bir imleç gibi okunuyor.** Durak geçişlerinde ekranda yatay bir tarama satırı ve ucunda nokta ile halka dolaşıyor (`d03`). Kasıtlı, ama bir yükleme göstergesi ya da ikinci bir imleç gibi okunuyor.
- **"Ege" karışıklığı.**
  - İstanbul Şehir İçi ekran görüntüsünün logosu "Ege Kent Nakliyat" (`d10-ist-seam.webp`).
  - Hemen sonraki iş "Ege Eşya".
  - Ziyaretçi iki "Ege"yi aynı müşteri sanabilir.
- **Ege'nin PageSpeed bloğunda performans ve erişilebilirlik puanı yok.** Yalnız BP ve SEO gösteriliyor (`facts.ts:42`). Bu, "zayıf puanı gizliyor" diye okunur.
- **Basılı tutma ipucu cihaza göre değişiyor.** Masaüstünde "basılı tut", mobilde "görsele dokun". Oysa mobilde basılı tutmak da çalışıyor.
- **Ekran okuyucuya çelişkili talimat.** "Açmak için görseli basılı tut — Projeyi aç" düğmesi ekran okuyucuya "görseli basılı tut" diyor (`main.js:1288`).

### 1.5 Tempo ve hikâye
Hikâye sırası şöyle: **ad → iki yüz (ne yapıyorum) → işler → lab → iletişim.** Mantıklı bir sıra. Ancak:
- **İlk işin gerçek görseline ulaşmak uzun sürüyor.** Masaüstünde en az 3 kaydırma ve bir basılı tutma ya da tık gerekiyor, yaklaşık 8–10 saniye. Bir jüri üyesi sabırlıdır, bir işveren değildir.
- **İşler → Lab köprüsü 2.5 sn ve çoğu boş.** Kareler büyük ölçüde boş kâğıt ve tek bir koyu bant (`d20-bridge-mid.webp`, `m22-375-bridge-gap.webp`).
- **İletişim uzun bir kaydırmayla ödüllendiriyor, ama önce boşluk gösteriyor.**
- **Linefield ve Cross Section eklendiğinde** İşler'e varış iki durak daha uzayacak. Öneri §5'te.

### 1.6 Bağımsız jüri puan gerekçesi
- **Tasarım 7.4.** Özgün, tutarlı ve zanaatli. Eksiler:
  - 10–10.5 px mono yardımcı metnin baskınlığı.
  - Okuma ceplerinin "kart" gibi görünmesi.
  - İletişimin bitmiş halindeki hiyerarşi.
  - Mobil yüzlerde kelimenin dikey ve kırpık durması.
- **Kullanılabilirlik 5.8.**
  - Artılar: klavye ve axe temiz, JS kapalı yol var.
  - Eksiler:
    - Asıl etkileşim öğretilmiyor.
    - İşlerin gerçek görseli geç geliyor.
    - İletişim doğrudan girişte boş.
    - Hareketi azaltılmış modda işler kayıp.
    - Sayfa yakınlaştırması engelli.
    - Lab'de iki parmak jesti başka sayfaya götürüyor.
- **Yaratıcılık 8.0.** Satırı "malzeme" olarak kullanan sistem ve basılı tutup açma hareketi ödüllük fikirler.
- **İçerik 6.3.**
  - Artılar: somut rakamlar (968 URL, 39 ilçe, PSI), dürüst ve net bir Hakkımda.
  - Eksiler: CTA yok, case study'lerin URL'si yok, Ege PSI eksik, küçük çeviri tutarsızlıkları.

---

## 2. A: Jüri eleştirisinden gelen maddeler

Her maddede şu alanlar var:

- **Bulgu**
- **Kanıt**
- **Etki:** jüri ve kullanıcı açısından
- **Çözüm**
- **Büyüklük:** K = küçük, O = orta, B = büyük
- **C2:** C2'ye dokunuyor mu? Evet ise Linefield ile çakışma riski de yazıldı (yüksek / düşük).

**Linefield ile çakışma riski** şöyle değerlendirildi: `LINEFIELD-MERGE.md`'deki 7 ortak dosya (`engine/c2/main.js`, `states.js`, `useC2Engine.ts`, `nuxt.config.ts`, `types.ts`, `tr.ts`, `en.ts`) Linefield birleşmeden **yüksek** risk taşır. Diğer C2 dosyaları (`flat.js`, `surface.js`, `world.js`, `style.css`, `media.js`) **düşük** risk taşır.

### A1. Mobil: dokunmatikte "çizgileri yarmak"ın karşılığı
- **Bulgu:** İmleç fiziği her işaretçi türünden besleniyor (`main.js:1594-1598`, `physics.js:99-107`). Sürüklenen parmak da satırları tarar, ama hover olmadığı için dokunmadan hiçbir şey olmuyor. Durak durak:

  | Durak | Dokunmada ne kalıyor | Ne kayboluyor |
  |---|---|---|
  | Ad | Parmakla sürükleme satırları tarar. Parmak basılı tutulursa ad kısa bir yarık açar ama hiç "yol vermez" (`main.js:517`, yük 0.5'te sınırlı). | Hover taraması. İpucu yok. |
  | Yüzler | Yatay sürükleme yüzü kaydan çıkarır (`main.js:394`). "İki parmakla sıkıştır" jesti öbür yüze iter. | "Developer" rolü (`states.js:166`). Yüz açıklıkları yerine softRect cepler. Kelime dikeyde. |
  | İşler | Yana kaydırınca iş değişir, dokununca proje açılır. Basılı tutmak da yarık açar (`s11`: works-finger-hold). | Hover önizlemesi. "Aç" düğmesi ≤700 px'te gizli (`style.css:292`). `.work .current` 760 px'ten kısa ekranlarda gizli (`style.css:253`), yani 375×667'de seçili işin açıklaması yok. |
  | Lab | Kayıtlara dokunma çalışıyor. | İki parmak açma, sayfa yakınlaştırması yerine **Contact'a gidiyor** (§C22). |
  | İletişim | Kaydırma yazıcıyı sürüyor. İpucu "kaydırmaya devam et". | İmleçle dikkat yönlendirme. Bu, tasarımın bilinçli bir çevirisi. |

- **Kanıt:**
  - 375 px: `m01`–`m07`, `m12`–`m17`, `m19`–`m25`.
  - 430 px: `m08`–`m11`.
  - Tüm 375 px duraklar: `s12-mobile-375-stops.webp`, dokunma: `s11-touch-375.webp`.
- **Etki:** Jüri mobil çeviriye bakar. Dokunmada "yarma" pasif bir süs olarak kalıyor. Yüzleri itme jesti (sıkıştırma) keşfedilmezse iki yüz arasındaki "negatif" fikri kaçıyor.
- **Çözüm:**
  - Dokunmada ilk dokunuşta bir kez "iz" bırak: parmağın altında satırlar ayrılsın ve 1 sn kalsın. Böylece malzemenin dokunmaya cevap verdiği hemen anlaşılır.
  - Kısa ekranlarda `.work .current` yerine tek satırlık bir özet göster.
- **Büyüklük / C2:** O. C2 evet: `main.js` (yüksek risk), `style.css` (düşük).

### A2. Keşfedilebilirlik
- **Bulgu:** Öğretilen etkileşimler (`hintFor`, `main.js:1198-1210`; hepsi 2.5 sn gecikmeli ve alt şeritte):

  | Etkileşim | Masaüstünde nerede ve nasıl | Dokunmada nerede ve nasıl | Öğretilmezse ne kaçırılır |
  |---|---|---|---|
  | Duraklar arası ilerleme | **Öğretilmiyor.** Ad durağında ipucu sessiz, yalnız 2.1 sn'de "nefes" var. | **Öğretilmiyor.** | Ziyaretçi adın bir poster olduğunu sanıp kalabilir. |
  | İmleçle yarma (asıl etkileşim) | **Öğretilmiyor.** | Karşılığı yok. | Sitenin imzası fark edilmeyebilir. |
  | Yüzde basılı tutup öbür yüze itme | "basılı tut" (şerit, 2.5 sn) | "iki parmakla sıkıştır" | Negatif yüz fikri. |
  | İşleri seçme ve açma | "kaydır · görseli basılı tut" ve panelde "AÇMAK İÇİN GÖRSELİ BASILI TUT" | "yana kaydır · görsele dokun" | — (iyi öğretiliyor) |
  | Proje içinde ilerleme | "kaydır" (3.5 sn) | aynı | — |
  | Projeden çıkma (Esc, "← Tüm işler") | Şerit düğmesi görünüyor. Esc yalnız ekran okuyucu metninde. | Düğme | Düşük risk. |
  | Ok tuşları | Yalnız ekran okuyucu metninde (`a11y.keys`) | — | Klavye kullanıcısı tuşları bilmez. |
  | Lab kayıtları | Kayıtlar görünür düğmeler | aynı | — |
  | Contact finali | "aşağı kaydır", sonra "imleci gezdir" | "aşağı kaydır", sonra "kaydırmaya devam et" | — (referans model) |

- **Kanıt:**
  - Günlükler: masaüstü ad durağında ipucu satırı "İstanbul · Seçili freelance…".
  - 375 px'te CREATIVE'de "iki parmakla sıkıştır", İşler'de "yana kaydır · görsele dokun".
  - Kareler: `d01`, `d04` (sağ alt "BASILI TUT"), `d07`, `m03`, `m07`.
- **Etki:** Jüri Kullanılabilirlik puanını doğrudan düşürür. Birinci ziyarette ziyaretçi 2.5 sn beklemez.
- **Çözüm:**
  - Finalin yaklaşımını ev sayfasına taşı.
  - Ad durağında, ilk ziyarette **bir kez** bir "aşağı kaydır / kaydır" ipucu göster ve nefesi onunla eşle.
  - Masaüstünde ilk fare hareketinde bir kez "imleci gezdir" ipucu göster. Oturum başına bir kez, finaldeki `sessionStorage` deseniyle (`finale.js:174-183`).
  - İpucu gecikmesini 2.5 sn'den 1.2 sn'ye indir.
- **Büyüklük / C2:** K. C2 evet: `main.js` `hintFor` ve locale dosyaları (yüksek risk).

### A3. İşler okunurluğu: ziyaretçi gerçek görseli ne zaman net görüyor?
- **Bulgu:**
  - **Masaüstü:**
    - İşler durağında seçili iş yalnız satır tonuyla çiziliyor (`surface.js:103-121`, `amp:0`, ton satır kalınlığı olarak). Gri ve düşük çözünürlüklü.
    - Gerçek renkli görsel iki yolla görünüyor:
      - Görsele ≈0.5–1 sn basılı tutunca açılan yarıkta (`d09`).
      - Projeye girildiğinde (release, `main.js:747-750`).
    - En erken net görüntü, ad'dan itibaren 3 kaydırma, ~4 sn bekleme ve basılı tutma ya da tık sonrası geliyor: **≈ 8–10 sn**.
  - **Mobil:** Aynı. Önizleme tam genişlikte satır tonu (`m07`, `m12`). Gerçek görsel ancak "görsele dokun" ile projeye girince geliyor. Girişte başlık ~0.3 sn çift basılıyor (bilinen sorun, `m13`).
- **Etki:** İşveren için en kritik an. "Tonlu kapak" konsepti İstanbul'da işliyor (büyük tip), Ege ve Evden'de işlemiyor.
- **Çözüm (sırayla dene):**
  1. Seçili iş durgunlaştıktan ~1 sn sonra tonu "kayda girmiş" bir hale geçir: yüksek kontrast ve `lod 0`. İsteğe bağlı olarak kısa bir kaydırmayla (ya da 2 sn sonra) gerçek görseli yarıktan otomatik aç. Bir "önizleme nefesi".
  2. İşler durağında gerçek küçük görseli panelde, listenin altında göster. Malzeme sağda kalsın.
  3. Ton dönüşümünde (`tone-core.js:27-49`) ekran görüntüleri için yerel kontrastı ve kenarı artır. Bu en ucuz seçenek, ama yalnız kısmen çözer.
- **Büyüklük / C2:** O–B. C2 evet: `states.js` (yüksek risk), `surface.js` ve `tone-core.js` (düşük).

### A4. Düz HTML katmanı senkronu

| # | Uyuşmazlık | Kaynak | Büyüklük |
|---|---|---|---|
| 1 | Runtime'ın düz gezinmesinde (`#plain`) üç Lab çalışmasının hepsi `/tr/lab`'a gidiyor. Ev sayfasının düz katmanı ise `/tr/lab/{id}`'ye bağlıyor. | `engine/c2/main.js:1044` ile `app/pages/[locale]/index.vue:47` | K |
| 2 | Çalışma sayısı "03" sabit yazılmış (sayılmıyor). | `tr.ts:130`, `en.ts:125` (`lab.count`); `LabBench.vue:508` ("/ 03"); `main.js:1030` | K |
| 3 | Çalışma numaraları bileşene gömülü. | `StudyWeight.vue:226` ("01"), `StudyLine.vue:57`, `StudyTone.vue:126` | K |
| 4 | Runtime'ın Lab listesi `TXT.lab.studies` anahtar sırasını izliyor, `facts.studies` sırasını değil. | `main.js:560` | K |
| 5 | Weight kelimeleri (AREA, WEIGHT…) TR'de de İngilizce ve içerikte değil, bileşende. | `StudyWeight.vue:16` | K (bilinçli olabilir) |
| 6 | "Düz gezinmeye geç" etiketi belge rotalarında (Lab, Contact) `#main`'e gidiyor. Runtime'da `#plain`'e gidiyor. Metin ile hedef uyuşmuyor. | `app/layouts/default.vue:38` | K |
| 7 | Önceden işlenmiş ev sayfasında `/tr#work` ve `/tr#lab` bağlantıları `aria-current="page"` taşıyor. | `SiteHeader.vue:27` (router hash'i yok sayıyor) | K |
| 8 | Runtime `#work` ve `#lab` hash'lerini tanımıyor, yalnız `#contact`'ı tanıyor. | `app/plugins/c2.client.ts:28` | K |
| 9 | h1 farklı: runtime'da "ad — roller, konum", düz katmanda yalnız ad. | `main.js:972` | K |
| 10 | EN'de "Istanbul" ile "İstanbul" karışık. | `en.ts:22` (contact açıklaması) ile `en.ts:30` | K |
| 11 | Runtime'ın düz gezinmesinde "Seçili işler" müşteri sitelerine (dış bağlantı) gidiyor. Case study içeriği düz katmanda hiç yok. | `main.js:1043` | O (URL'li case study ile birlikte, §B10) |
| 12 | Kullanılmayan, eskimiş metin: "Oda açmak için Enter'a bas; her oda sıradaki çalışmayı gösterir." (eski Lab). | `tr.ts:191`, `en.ts:186` | K |
| 13 | Ekran okuyucuya "C2 surface active" gibi bir iç ifade okunuyor. | `app/components/C2Surface.client.vue:22` | K |

- **Kanıt:** erişilebilirlik ağacı dökümleri (/tr ve /tr/contact), `s08`.
- **Etki:** Kullanıcı açısından düşük. Crawl ve ekran okuyucu tutarlılığı açısından orta. Jüri fark etmez, SEO ve erişilebilirlik denetleyicisi fark eder.
- **Çözüm:** Sayı ve numaraları `facts.studies`'ten türet. Lab bağlantılarını çalışma rotalarına ver. Skip bağlantısının hedefini metinle eşle. Hash bağlantılarında `aria-current` verme.
- **Büyüklük / C2:** K. C2 kısmen: 1, 4, 9, 11 `main.js`'te (yüksek risk); gerisi C2 dışı.

### A5. Menü ve şerit kontrastı (WCAG, en kötü arka plan)
Ölçüm yöntemi: metin gizlendi, gerçek arka plan pikselleri örneklendi, her metin öğesi için en kötü piksel ve 10. yüzdelik değeri hesaplandı. 1440×900'de tüm duraklar ve üç projenin bütün kareleri tarandı: 159 öğe.

| Öğe | Renk / arka plan | Oran | WCAG AA (küçük metin 4.5) |
|---|---|---|---|
| Index üst ve alt şerit (ad, İŞLER…, roller, ipucu) | mürekkep / kâğıt, kâğıt / gece | > 6.6 (en kötüsü listede değil) | Geçer |
| Lab ve Contact şeridi | `#46464a` / `#efeee9` | 8.09 | Geçer |
| Proje üst şeridi (← TÜM İŞLER, proje adı, SONRAKİ) | kâğıt / İstanbul mürekkebi `#8e3a17` | 6.07 | Geçer |
| Proje üst şeridindeki alan adı (`ISTANBULSEHIRICI.COM`, op .86) | aynı | 4.92 | Kıl payı geçer |
| **Proje ipucu "KAYDIR"** (op .78, 10.5 px) | aynı | **4.33** | **Kalır** |
| **Ad durağındaki "HAKKIMDA" düğmesi** (10.5 px, satırların üstünde) | mürekkep / satır mürekkebi | min 1.02, **p10 1.67** | **Kalır** (satırlar harfin altından geçiyor) |
| İşler listesindeki alt satırlar (`.wk`, op .55–.64) | kâğıt / `#121212` | 5.18 | Geçer, ama 10 px |

- **Kanıt:** `audit/contrast2.cjs` çıktısı (scratchpad), kareler `d01` (HAKKIMDA sağda, satırların üstünde) ve `d10`–`d12`.
- **KNOWN-ISSUES ile ilişki:** Kayıttaki "İstanbul şerit adı 1.00:1" bu build'de 1440×900'de **üretilemedi** (6.07:1). Kayıt güncellenmeli ya da koşulu (kare / zamanlama) netleştirilmeli.
- **Etki:** Düşük–orta. Jüri fark etmez. Erişilebilirlik denetleyicisi "HAKKIMDA"yı işaretler.
- **Çözüm:**
  - "HAKKIMDA" düğmesinin altında 6–8 px'lik bir satır boşluğu aç (zaten "nefes" özelliği var, kalıcı küçük bir oda yeter).
  - Proje ipucunun opaklığını .78'den .9'a çıkar.
- **Büyüklük / C2:** K. C2 evet: `style.css` (düşük risk); HAKKIMDA odası için `states.js` (yüksek risk).

### A6. Tipografik hiyerarşi

| Rol | Kesim ve boyut |
|---|---|
| Görüntü (tuvalde) | Big Shoulders Display 900. Ad ve yüz kelimeleri, ekran yüksekliğine göre. |
| Yüz konumlandırma | Geist Variable 300, 63 px / 0.98, −0.045em ("Dokunduğun yüzeyi kuruyorum") |
| Hakkımda girişi | Geist 360, 30 px |
| Case study cümlesi (`.wb-line`) | Geist 360, 24.5 px |
| Contact h1 | Geist 600, 54 px (yalnız düz katmanda) |
| Gövde | Geist 380–400, 15–17 px (proje olguları 15 px / 380, yüz maddeleri 17 px / 400, Hakkımda 16 px / 380) |
| Yardımcı metin | Geist Mono 400, **10–11 px**, büyük harf, .04em. Şerit, etiketler, kicker, stack, ipuçları ve PSI'nin tamamı. Opaklık .55–.9. Lab notu 10 px, bazı etiketler 9.5 px. |
| Lab ve final | Archivo Var (genişlik ekseni) |
| Düz kabuk (JS yok, 404, `/`) | Sistem fontları. `base.css:43-44`, marka tipinin yerine geçiyor. |

- **Bulgu:**
  - Hiyerarşi iki uçlu: dev görüntü tipi ve çok küçük mono. Arada 13–14 px'lik bir orta katman neredeyse yok.
  - Gövdenin sesi (Geist 360–380) zarif ama ince. Düşük DPI Windows ekranlarda, satır zemin üstünde soluk duruyor.
  - Yardımcı metin sitenin en sık gördüğü tip, ama okunurluğu en düşük olanı.
  - Lighthouse mobil Lab: "okunaksız yazı boyutu" (BP 96, `.lab-stage .note` 10 px, metnin %55'i).
- **Kanıt:** `d04`, `d07`, `d11`, `d21`, `m23`; hesaplanmış stil dökümü (scratchpad `edge.cjs` çıktısı).
- **Etki:** Jüri "tipografi incelikli ama mikro metin fazla küçük" der. İşveren için olgular ve stack satırları zor okunur.
- **Çözüm:**
  - Mono yardımcı metni 11.5–12 px'e çıkar. İçerik taşıyan mono (stack, PSI, kicker) için 12–13 px'lik ayrı bir rol tanımla.
  - Gövdeyi 380 → 400–420'ye al.
  - Opaklıkla susturmak yerine ayrı bir ton token'ı kullan.
  - Düz kabuğa Geist'ı ver (fontlar zaten self-hosted).
- **Büyüklük / C2:** O. C2 evet: `style.css` (düşük risk); Lab ve final dosyaları C2 dışı.

### A7. Hakkımda kapsülleri
- **Bulgu:**
  - **Masaüstü:** 5 kapsül zig-zag duruyor (`layoutAbout`, `main.js:702-719`). Kutu boyutları:
    - intro 605×284
    - bg 540×102
    - tr 540×76
    - now 544×142
    - meta 540×186
  - Metin uzunluğu ve biçim uyumlu. Giriş cümlesi büyük kapsülde güçlü duruyor.
  - Sağ sütundaki iki kapsülde satırlar kapsül çıkıntılarına çok yakın başlıyor ("Bu yaklaşım…"). Metin ile oyulan kenar arasında nefes az.
  - **Mobil:** Kapsüller üst üste diziliyor, aralar 62 px. "Hakkımda daha fazla" ile açılan ayrıntı, 724 px'lik kaydırma kabında 1250 px içerik taşıyor.
- **Kanıt:** `d19-about-detail.webp`, `m19`, `m20`, `m21`.
- **Etki:** Olumlu. Sitenin en iyi okunan metni. Küçük bir cila gerekiyor.
- **Çözüm:** Kapsül iç boşluğunu kenarın eğriliğine göre artır (oda oyma, `main.js:683-701`). Mobilde kapsül aralığını 62 px'ten ~40 px'e indir.
- **Büyüklük / C2:** K. C2 evet: `main.js` (yüksek risk), `style.css` (düşük).

---

## 3. B: Ek denetim maddeleri

### B8. İlk yükleme ve performans

| Rota | Lighthouse mobil (yerel) P/A/BP/SEO | Mobil FCP / LCP / TBT / CLS | Masaüstü (yerel) P | Masaüstü LCP / CLS |
|---|---|---|---|---|
| /tr | 84 / 100 / 100 / 100 | 2.6 s / 3.9 s / 60 ms / 0.001 | 98 | 0.9 s / 0 |
| /tr/about | 85 / 100 / 100 / 100 | 2.4 / 3.8 / 60 / 0.001 | 99 | 0.8 / 0 |
| /tr/lab | **76** / 100 / **96** / 100 | 2.7 / 3.9 / 0 / **0.175** | 99 | 0.8 / 0.048 |
| /tr/contact | 84 / 100 / 100 / 100 | 2.7 / 3.9 / 20 / 0.001 | 99 | 0.8 / 0 |
| **Canlı** yucelemrah.com/tr (eski build, aynı ev) | **91** / 100 / 100 / 100 | 1.9 / 2.9 / 0 / 0 | **100** | 0.5 / 0.014 |

- **JS boyutu:**
  - /tr ilk yükte 17 dosya: 406 KB ham, **138 KB brotli**.
  - Tüm `_nuxt` JS: 514 KB ham, 178 KB brotli.
  - Kullanılmayan JS tahmini ≈108 KB (ham).
  - Toplam sayfa ≈ 1 MB sıkıştırmasız, canlıda 457 KB.
- **Yerel sayılar karamsar.** Lighthouse'un "metin sıkıştırması" ve "bfcache" bulguları `sv.cjs` kaynaklı (brotli yok, `no-store`). Canlı Apache'de ikisi de yok.
- **LCP yanıltıcı.** Lighthouse LCP öğesi olarak plakanın altındaki **gizli düz kabuğun** paragrafını (`.u-measure.lead`) ölçüyor. Kullanıcının gördüğü anlamlı ilk ekran (ad) daha geç:

  | Koşul | Plaka | Ad (`c2=on`) |
  |---|---|---|
  | Chrome, hızlı | FCP 0.34 s | 0.86 s |
  | WebKit, hızlı | — | 1.5 s |
  | Firefox, hızlı | — | 1.6 s |
  | Fast 3G + 4× CPU | FCP 1.66 s | intro 7.6 s, index 10.75 s, `c2=on` 13.8 s |

  Kanıt: `s01-boot-desktop.webp`, `s02-boot-fast3g-mobile.webp`.
- **Neden:** `prepare()` ilk kareden önce fontları, shader'ı ve **bütün önizleme görsellerini** bekliyor (`main.js:1802-1826`, `ensurePreviews`).
- **Lab mobil CLS 0.175 (kötü).** `.lab-stage .note` JS ile yerleştiriliyor.
- **Etki:** Canlı sayılar iyi, jüri için sorun yok. Yavaş ağdaki ilk ziyaretçi 10 sn'den uzun süre boş çizgi görür ve siteden çıkabilir.
- **Çözüm:**
  - Adı önizlemeleri beklemeden çiz. Önizlemeleri ilk kareden sonra yükle (İşler ≥ 3 durak uzakta).
  - Lab notunun yerini CSS ile ayır ya da ilk konumda `visibility:hidden` tut.
- **Büyüklük / C2:** O. C2 evet: `main.js` `prepare` (yüksek risk). Lab kısmı C2 dışı, K.

### B9. Tarayıcı desteği
- **Firefox 155 (Playwright, gerçek GPU):**
  - Tüm yolculuk, üç case study, Lab ve Contact çalışıyor. Görüntü Chrome ile aynı (`s09-firefox-index.webp`, `s10-firefox-projects.webp`).
  - Hata yok. Yalnız iki zararsız uyarı var: `WEBGL_debug_renderer_info` kullanımdan kalkıyor (`main.js` yazılım GPU sondası) ve sondanın kasıtlı "context lost" uyarısı.
  - İleride Firefox'un bu uzantıyı kaldırması sondayı kör eder. `RENDERER`'a düşen bir yedek yol eklenmeli (K, `main.js`, yüksek risk).
- **WebKit (Safari vekili): önemli fark.**
  - Tuval başlıkları (ad, CREATIVE, FULL-STACK) Playwright WebKit'te değişken fontun **ince (100) kesimiyle** çiziliyor. Chrome ve Firefox'ta 900 ile çiziliyor (`s03-engine-hero-chrome-vs-webkit.webp`).
  - Kod `900 … "Big Shoulders Display Variable"` istiyor (`states.js:14`, `main.js:1806`). WebKit'in tuvalde değişken font ağırlığını uygulamaması biliniyor.
  - **Gerçek Safari ve iOS'ta doğrulanmadı.** Gerçekse sitenin kimliği Safari'de başka görünüyor. §6 kontrol listesinde 1. madde.
- **Etki:** Yüksek, eğer Safari'de doğrulanırsa. Mac kullanan jüri üyelerinin çoğu Safari ya da Chrome kullanır.
- **Çözüm (doğrulanırsa):** Tuval için ağırlığa özel statik bir 900 kesim yükle (fontsource'un statik 900 dosyası). Ayrı bir `FontFace` ailesi olarak kaydet ve tuvalde onu kullan.
- **Büyüklük / C2:** K. C2 evet: `states.js` `FAMILY` ve `main.js` import (yüksek risk).

### B10. Case study sayfaları
- **Yapı:** Üç ritim var.
  - **İstanbul (authored):** tam kapak → iki görüntülü "seam" → olgular, stack, PSI ve cihaz odaları → kapanış / sonraki.
  - **Ege (scale):** kapsül → üç cihaz ve "968 sitemap URL'si" → yarıklı yayın mimarisi ve PSI → sonraki.
  - **Evden (system):** kapsül → yalnız metin "Hizmetin arkasındaki sistem" → admin kapsülü → cihazlar ve PSI → sonraki.
  - Kanıt: `d10`–`d18`, `m14`–`m17`.
- **İçerik kalitesi:** Rakamlar ve roller somut. Ancak:
  - **Problem → yaklaşım → sonuç** anlatısı yok. Her proje olgu listesi olarak kalıyor.
  - Ege PSI eksik (§1.4).
  - Evden f1 neredeyse boş bir yeşil alan ve tek bir metin bloğu (`d16`).
- **Görsel çözünürlük:**
  - Kaynaklar en fazla 1600 px (Ege landing 1440×1210 gösterim için 1600 kaynak).
  - 2× ekranda yumuşuyor. Mobil 640 px türevleri telefon karesinde yeterli.
  - AVIF ve WebP var, iyi.
- **Gezinme:**
  - "← TÜM İŞLER" (sol üst), alan adı bağlantısı (orta), "SONRAKİ" (sağ üst), sonda "Sonraki · <ad>".
  - **Önceki iş yok.** Esc ile çıkılıyor (öğretilmiyor).
  - Ana akışa dönüş İşler durağına oluyor, doğru.
- **URL:** Case study'lerin kendi rotası yok. Paylaşılamaz ve indekslenemez. `sitemap.xml` 15 URL içeriyor, hiçbiri case study değil.
- **Hareketi azaltılmış mod:** odalar boş (§B13).
- **Çözüm:**
  - Her projeye `/[locale]/work/[id]` rotası ver. Önceden işlenmiş, düz metinli bir belge olsun. Runtime oradan projeyi açabilsin, Lab ve Contact'taki gibi bir devir.
  - "Önceki" bağlantısı ekle.
  - Ege PSI'yi tamamla ya da bloğu kaldır.
  - Her projeye bir satırlık "sonuç" cümlesi ekle.
  - 2400 px türevleri üret.
- **Büyüklük / C2:** B (rota) ve K (içerik). Rota için C2 evet: `main.js` devri (yüksek risk).

### B11. Paylaşım ve SEO
- **Başlık ve açıklamalar:** 16 sayfanın hepsinde var ve yerelleştirilmiş. Ev başlığı TR ve EN'de aynı ("Emrah Yücel — Creative Developer & Full-Stack Developer"). Kabul edilebilir.
- **Canonical ve hreflang:** tr-TR / en / x-default doğru. Kök `/` canonical ve x-default olarak işaretli.
- **OG ve Twitter:**
  - Tek görsel var: `og/emrah-yucel-portfolio.jpg`, 1200×630, 111 KB. Yalnız ad, rol ve URL yok.
  - Sayfaya özel görsel yok (Lab, Contact).
  - `summary_large_image` doğru.
- **İkonlar:** favicon.ico, favicon.svg, 32 px PNG, apple-touch-icon 180 px var. **Web manifest yok** (CSP `manifest-src` izin veriyor).
- **Yapılandırılmış veri:** Person JSON-LD her yerel sayfada var, kökte yok. Projeler için `CreativeWork` yok (URL olmadığı için).
- **Sitemap ve robots:** sitemap 15 URL ve alternates içeriyor. robots yalnız `/finale-debug.js`'i engelliyor.
- **Canlı sunucu:** `curl` user-agent'ına 403 dönüyor. Googlebot, facebookexternalhit, LinkedInBot, WhatsApp, Twitterbot ve Slackbot 200 alıyor. OG görseli botlara açık. Sorun yok.
- **Çözüm:** OG görseline rol ve alan adını ekle. Lab ve Contact için ayrı OG. Manifest. Case study rotalarıyla birlikte `CreativeWork` ekle.
- **Büyüklük / C2:** K. C2 hayır: `useLocaleSeo.ts`, `modules/production-files.ts`.

### B12. Kenar durumlar
- **404:** Statik `404.html` iki dilli, `noindex`, /tr ve /en bağlantılarını veriyor, sistem fontu kullanıyor. İşlevsel ama markasız: satır malzemesi yok. Yerel sunucu 404.html sunmadığı için statik olarak incelendi. Apache'de `ErrorDocument 404 /404.html` tanımlı.
- **JS kapalı:**
  - Ev, hakkımda ve contact iyi birer belge (`s08`: sol ve üçüncü kare).
  - **`/tr/lab` bozuk:** boş sayfa, sol üstte üst üste binmiş küçük etiketler ve tek bir "01 · weight aç→" bağlantısı. Line ve Tone'a bağlantı yok (`s08`: ikinci kare).
  - Çalışma sayfalarında `.lab-nojs` bloğu var.
- **JS yüklenemezse** (bundle 404 ya da engellenmiş): `/tr`'de plaka sonsuza kadar kalıyor. İçerik DOM'da var ama örtülü (`s08`: dördüncü kare). `base.css:151-177`'de zaman aşımı yok. Siteyi iOS < 15.4'te açan her ziyaretçi bunu görür (site tabanı iOS 15.4).
- **Yavaş ağ:** §B8. Ad ≈ 10.8 sn'de, runtime 13.8 sn'de.
- **Dil değiştirme:**
  - Her sayfa tipinde çalışıyor. Geçmişe bir kayıt ekliyor (Geri tuşu geri alıyor).
  - İşler durağında seçili iş korunuyor. Contact kaydırma yerini koruyor.
  - **Lab çalışma sayfasında kaydırma yeri kayboluyor** (`/tr/lab/line` 2412 → 0).
- **Çözüm:**
  - Plakaya saf CSS ile bir zaman aşımı ekle, örneğin `animation: plate-out 0s 8s forwards`. `data-c2` gelmezse düz kabuk görünür.
  - Lab bench için `<noscript>` ya da JS'siz bir liste ver.
  - Çalışma sayfasında dil değişince `scrollY` oranını koru.
  - 404'e plaka satırlarını ekle.
- **Büyüklük / C2:** K. C2 hayır: `base.css`, `LabBench.vue`, `LabChrome.vue`, `production-files.ts`.

### B13. Erişilebilirlik (site geneli)
- **axe:** `/`, `/tr`, `/tr/about`, `/tr/lab`, 3 çalışma, `/tr/contact`, `/en`, `/en/contact`, `/404.html`, İşler durağı ve açık proje: **0 ihlal**. axe tuval üstü metnin kontrastını ölçemiyor; §A5 bunu kapsıyor.
- **Klavye:** Odak halkası 2 px ve `currentColor`. Her durakta görünür. Sekme sırası mantıklı.
  - /tr: skip → ad → menü → EN → HAKKIMDA → düz gezinme paneli (odakla beliriyor) → işler (dış bağlantılar) → Lab → iletişim.
  - Kanıt: `s07`.
- **Ekran okuyucu sırası (/tr):**
  - Runtime tüm katmanları birden okutuyor: Hakkımda ayrıntısı, yüzler, işler, **açık olmayan projenin "Proje" gezinmesi** ("← Tüm işler / Siteyi ziyaret et / Sonraki") ve Lab.
  - Proje kapalıyken proje gezinmesinin okunması kafa karıştırıyor.
  - Contact'ta "Konum İstanbul, Türkiye" bir **düğme** olarak okunuyor. Rolü belirsiz.
- **Hareketi azaltılmış mod: ENGELLEYİCİ.**
  - Case study odaları **boş**: yalnız mürekkep rengi, görüntü yok. İstanbul'un ilk karesi dışında hiçbir iş görünmüyor.
  - Chrome ve WebKit'te, masaüstünde ve 375 px'te aynı (`s04-reduced-projects-chrome.webp`, `s05-reduced-projects-webkit.webp`, `s06-reduced-projects-375.webp`).
  - `#media .on` öğeleri etkin, ama 2B yassı çizici onların üstünü örtüyor.
  - Muhtemel kök neden: `flat.js:121-123`, `fill=0` iken bile tüm tuvali durumun kâğıt rengiyle boyuyor. WebGL yolunda odalar saydam.
  - macOS ve iOS'ta "Hareketi azalt" açık olan her ziyaretçi, işlerin hiçbirini görmüyor.
- **Hareketi azaltılmış mod, diğer bölümler:** ad, yüzler, İşler, Lab ve Contact doğru (`s04`; `s06`'daki ilk kare).
- **Yakınlaştırma:**
  - C2 rotalarında `html, body { touch-action:none }` (`style.css:16`) iki parmakla sayfa yakınlaştırmasını kapatıyor.
  - Masaüstünde Ctrl+tekerlek `preventDefault` ediliyor (`main.js:316-322`). Mac trackpad'deki iki parmak açma da bu olay.
  - Tarayıcı menüsünden yakınlaştırma çalışıyor. WCAG 1.4.4 tam ihlal değil, ama 10.5 px'lik metinle birleşince risk.
- **Çözüm:**
  - `flat.js`'te `fill=0` iken kâğıdı yalnız malzeme bölgelerine boya, odaları temizle (`clearRect`).
  - Kapalı proje katmanlarına `inert` ya da `aria-hidden` ver.
  - "Konum" öğesini düğme yerine metin yap.
  - Tekerlek işleyicisinde `if (e.ctrlKey) return`.
- **Büyüklük / C2:** K–O. C2 evet: `flat.js` (düşük risk); `main.js` (yüksek, ama tek satır).

### B14. Metin ve içerik

| # | Bulgu | Kaynak | Öneri |
|---|---|---|---|
| 1 | "Seçili freelance projelere açığım": "seçili" Türkçede arayüz sıfatı gibi duruyor ("seçili öğe"). | `tr.ts:34, 55` | "Yeni freelance projelere açığım" ya da "Seçtiğim freelance projelere açığım" |
| 2 | EN'de iki farklı ifade: "Available for selected freelance work" ve "…projects." | `en.ts:31, 52` | Tek ifade: "Available for select freelance projects" |
| 3 | EN'de "Istanbul" ile "İstanbul" karışık. | `en.ts:22, 30` | Birini seç (EN için "Istanbul") |
| 4 | Ege PSI'de Perf ve A11y `null`, yalnız BP ve SEO gösteriliyor. | `facts.ts:42` | Ölç ve doldur, ya da Ege'de PSI bloğunu gösterme |
| 5 | TR'de "production sitesi", "Best Practices" gibi İngilizce ifadeler. | `tr.ts:87, 175` | "yayındaki üç site", "İyi uygulamalar". Rol adları bilinçli olarak İngilizce kalabilir. |
| 6 | Eskimiş `labKeys` metni. | `tr.ts:191`, `en.ts:186` | Sil ya da güncelle |
| 7 | Eylem çağrısı yok. Tek iletişim yolu şeritteki "İLETİŞİM" ve durum satırı. | — | Hakkımda'nın ve her case study'nin sonunda "Bir proje mi var? Yaz →" |
| 8 | İstanbul Şehir İçi görüntüsünde "Ege Kent Nakliyat" logosu var, sonraki iş "Ege Eşya". | Görsel içerik | Proje açılışında müşteri ve marka adını bir satırla netleştir |
| 9 | Telefon Contact'ın bitmiş halinde neredeyse okunmuyor. | `d23` | Finalin son kompozisyonunda e-posta ve telefonu öne al |
| 10 | Weight kelimeleri TR'de İngilizce. | `StudyWeight.vue:16` | Bilinçliyse sorun değil. Değilse locale'e taşı. |

Yazım hatası bulunmadı. TR ve EN anahtar setleri eşit. EN'de İstanbul `stack` alanı yok, ama `facts.ts`'ten İngilizce yedeğe düşüyor (bilinçli).

- **Büyüklük / C2:** K. Locale dosyaları, `types.ts` ile birlikte yüksek riskli ortak dosyalar (Linefield sonrası yap).

### B15. Gizlilik (KVKK/GDPR)
- **Durum:**
  - Analitik yok, üçüncü parti script yok, harici font yok (hepsi self-hosted), çerez yok, localStorage yok.
  - Yalnız `sessionStorage` kullanılıyor, tamamı işlevsel: `ey.locale`, ziyaret belleği `MEM_KEY` ve finalin tek seferlik ipucu bayrağı (`useVisit.ts`, `main.js:1741-1750`, `finale.js:174-183`).
  - Bunlar "kesinlikle gerekli / işlevsel" sınıfında. Çerez bandı gerekmez.
- **Öneri:** Footer'a ya da Hakkımda'ya tek satır ekle: "Bu site çerez ya da analitik kullanmaz; dil tercihiniz yalnız bu oturumda tutulur." Güven sinyali olur ve ileride analitik eklenirse bu metin güncellenmeli.
- **Büyüklük / C2:** K. C2 hayır.

---

## 4. C: Kullanıcı kayıtlarından gelen bulgular (doğrulama)

| # | Kayıt | Sonuç | Kanıt | Not / çözüm | Büyüklük / C2 |
|---|---|---|---|---|---|
| 16 | Açılışta 1–2 sn düz gri ekran, ad sonra geliyor. | **Doğrulandı.** Hızlı ağda 0.4–1.5 sn (Chrome 0.86 s, WebKit 1.5 s, Firefox 1.6 s), Fast 3G'de ≈ 10.8 sn. | `s01`, `s02` | Plaka bilinçli (C2Plate.vue), ama ad çok geç geliyor. §B8: adı önizlemeleri beklemeden çiz. İsteğe bağlı olarak adı plakaya SVG path olarak göm (font gerektirmez). | O, C2 (`main.js`, yüksek) |
| 17 | Mobilde CREATIVE ile FULL-STACK arasında yalnız çizgilerin olduğu boş bir kare. | **Kısmen doğrulandı.** Klavye ve dokunma geçişlerinde neredeyse boş kareler ad→CREATIVE (~0.35 sn, `m02`) ve FULL-STACK→İşler (`m06`) arasında görüldü. CREATIVE→FULL-STACK ortasında yarım siyah ve yarım beyaz bloklar var (`m04`). | `m02`, `m04`, `m06`, `s14` | Metin katmanı 0.6 sn + 0.1 sn gecikmeyle beliriyor (`style.css:75-76`) ve yeni yüz kelimesi tarama silmesiyle geç yazılıyor. Öneri: önceki kelimeyi yeni kelime gelene kadar tut, katman gecikmesini 0 yap. | K–O, C2 (`style.css` düşük, `main.js` yüksek) |
| 18 | Mobil İşler'de önizleme durgun halde bile satır tonuyla veriliyor, iş görünmüyor. | **Doğrulandı.** | `m07`, `m12` | §A3 | O–B, C2 |
| 19 | Case study sonundaki "sonraki iş" görseli satır tonuyla, okunmuyor. | **Doğrulandı.** Üstelik mevcut projenin mürekkep renginde. | `d12`, `d15`, `d18`, `m15` | Sonraki kareyi `nextReg` bittikten sonra gerçek küçük görsele geçir, ya da tonu kâğıt rengiyle ve tam kontrastla çiz. | O, C2 (`main.js:1533-1563` yüksek, `states.js:325-352` yüksek) |
| 20 | İstanbul case study'de başlık metninin arkasında yumuşak kenarlı koyu dikdörtgen (diğerlerinde de?). | **Doğrulandı, üç projede de var.** `softRect` cebi (`states.js:77-83`, `317`, `338`). Proje içinde `surface.fill=0` iken saydam, altındaki `#media` zemini proje mürekkebi. | `d11` (sağ), `d13`, `d14` (sol alt), `d16`, `d17` (sağ alt, metinden büyük), `d12`, `d15`, `d18` | Kasıtlı bir okuma cebi. Önerilen: cebi metin kutusuna sıkı sar (iç boşluk 16–24 px), yumuşak kenarı 24 px'ten ~8 px'e indir. Ya da cebi satırların "aralanması" olarak çiz, koyu dolgu olarak değil. | K–O, C2 (`states.js` yüksek, `world.js` düşük) |
| 21 | Ad→CREATIVE geçişinde ortada gri kesik çizgi ve halka; kasıtlı mı? | **Doğrulandı, kasıtlı:** "tarama kalemi". Shader'da r≈3 nokta ve r≈11 halka (`surface.js:299-301`), boustrophedon tarama (`surface.js:144-146, 250-251`), konum `penAt()` (`main.js:1399-1404`), iki yüz arası hariç her durak geçişinde etkin (`main.js:1602-1606`). | `d03` (sol üst ve ortada halka, orta sağda gri tarama satırı) | Fikir iyi: final de bir "plotter". Ama ev sayfasında açıklanmadığı için yükleme göstergesi ya da ikinci imleç gibi okunuyor. İki seçenek: (a) finaldeki kalemle aynı çizimi ve adı paylaşsın, geçişin "yazıcısı" olduğu belli olsun; (b) halkayı kaldır, yalnız tarama satırı kalsın. | K, C2 (`surface.js` düşük) |
| 22 | Mobilde "İKİ PARMAKLA SIKIŞTIR" iOS'un sayfa yakınlaştırmasıyla çakışıyor mu? | **Kodda çakışmıyor, ama bedeli var.** Ayrıntılar tablonun altında. | `s11` (05–07, 12–13) | Ayrıntılar tablonun altında. | K, C2 (`style.css` düşük, `main.js` yüksek) + `useLabSpine.ts` |
| 23 | Mobilde ipuçları var, masaüstünde yok; masaüstünde ne öğretilmiyor? | **Kayıt kısmen yanlış.** Masaüstünde de ipuçları var: yüzde "basılı tut", İşler'de "kaydır · görseli basılı tut" ve panelde "AÇMAK İÇİN GÖRSELİ BASILI TUT", projede "kaydır". Masaüstünde **hiç öğretilmeyenler:** ilk durakta ilerleme, imleçle yarma, Esc ve ok tuşları. | `d04` (sağ alt), `d07` | §A2 | K, C2 |
| 24 | Hakkımda metninin mobildeki uzunluğu. | **Ölçüldü:** giriş ekranı (1 ekran) + ayrıntı 1250 px / 724 px kap = 1.73 ekran. **Toplam ≈ 2.7 ekran boyu.** Düz `/tr/about` 1409/812 = 1.74 ekran. | `m19`–`m21` | Uzun değil. Algı muhtemelen iç kaydırma kabından geliyor: sayfa kaydırması yerine ayrı bir kap var, sonu görünmüyor. Öneri: kabın altında ilerleme çizgisi ya da son kapsülde "← Geri" ile birlikte "İletişim →". | K, C2 (`main.js` yüksek) |

**C22 ayrıntıları:**
- **C2 rotalarında sayfa yakınlaştırması zaten kapalı:** `html, body { touch-action:none }`, `style.css:16`. iOS 13+ bunu uyguluyor. Yani tarayıcı yakınlaştırması hiç başlamıyor ve jest çakışmıyor. Bedeli, sayfa yakınlaştırmasının da olmaması (§B13).
- **Sıkıştırma çok zor:** Parmakların başlangıç aralığının ≈ %18'ine kadar kapanması gerekiyor (`k>4` ve direnç, `main.js:793-811`). CDP dokunmasıyla ölçüldü:
  - 320 → 110 px: tetiklenmiyor.
  - 340 → 60 px: tetikleniyor.
  - Öneri: eşiği `k>2.6`'ya indir. Ya da tek parmakla basılı tutmayı da öğret, zaten çalışıyor.
- **Lab bench'te iki parmak açma Contact'a götürüyor.** Jest kaydırma olarak okunuyor (`lab.css:56, 66` `touch-action:none`, `LabBench.vue:521`'deki "pinch zoom stays" yorumuyla çelişiyor).
- **Contact'ta yakınlaştırma çalışıyor** (5×).
- **Emülasyon; iPhone'da doğrulanmalı (§6).**

### A/B/C ile çakışma ve itirazlar
- **Bağımsız bulgularla örtüşenler:**
  - A2 ve A3, §1.2'deki İşler ve ipucu sorunlarıyla aynı.
  - A5 ve A6, §1.2'deki mikro tipografi ile aynı.
  - C18, C19, C20 ve C21'in hepsini ayrıca kendim de gördüm.
- **Listede olmayan, bağımsız turda bulunanlar (en önemlileri):**
  1. Hareketi azaltılmış modda boş case study odaları (engelleyici).
  2. İletişim finaline doğrudan gelişte ilk ekranın boş olması.
  3. JS yüklenemezse sonsuz plaka.
  4. Lab bench'te iki parmak ve Ctrl+tekerlek jestlerinin sayfa değiştirmesi.
  5. WebKit'te tuval fontunun ince kesimle çizilmesi (Safari'de doğrulanmalı).
  6. Ege PSI eksikliği ve CTA yokluğu.
- **İtiraz, C23:** "masaüstünde ipucu yok" doğru değil (yukarıdaki tablo). Sorun ipucunun **olmaması** değil, **ilk durakta** olmaması ve **asıl etkileşimin** (yarma) hiç anılmaması.
- **Kısmi itiraz, C17:** Tam boş kareyi CREATIVE ile FULL-STACK arasında değil, ad→CREATIVE ve FULL-STACK→İşler geçişlerinde yakaladım. Kayıttaki kare parmak hızına bağlı bir ara durum olabilir. Kök neden aynı.
- **İtiraz, C24:** Metin uzun değil (≈ 2.7 ekran). Sorun uzunluk değil, iç kaydırma kabının sonunun görünmemesi.
- **KNOWN-ISSUES ile çelişki:** "İstanbul şerit adı 1.00:1" bu build'de 1440×900'de üretilemedi (§A5).

---

## 5. Tempo ve yolculuğun toplam uzunluğu

**Bugünkü masaüstü yolculuk, en kısa yol (tekerlekle):**

| Adım | Girdi | Süre |
|---|---|---|
| ad → CREATIVE → FULL-STACK → İşler | 3 | ≈ 1.2–1.6 sn geçiş + 2.5 sn ipucu bekleme / durak |
| İşler'de 3 işi gezme ve köprüye geçme | ≈ 3–4 | — |
| İşler→Lab köprüsü | 1 | 2.5 sn |
| Bench'ten Contact'a | 1 | — |
| Contact finali (4.2 ekran boyu) | ≈ 6–8 | — |
| **Toplam, case study'siz** | **≈ 14–17 girdi** | **≈ 30–40 sn** |
| Üç case study'yle | + ≈ 16 girdi (4 + 4 + 5 kare, açma ve sonraki) | + 45–60 sn |

Linefield (FULL-STACK ile İşler arası) ve Cross Section (İşler ile Lab arası) **ayrı duraklar** olarak eklenirse:
- İşlere varış 3 duraktan 4'e çıkar.
- Toplam yolculuk, her sahne 2–4 girdi ve 3–6 sn hesabıyla, **≈ 20–25 girdiye** uzar.
- İlk gerçek iş görseline varış 8–10 sn'den **≈ 12–15 sn'ye** çıkar.

İşverene bakan bir portfolyo için bu sınırın üstü.

**Öneri:**
1. **Linefield durak değil, geçiş olsun.** FULL-STACK→İşler geçişini kaydırmayla sürülen tek bir koridor olarak yap, ≤ 1–1.5 ekran boyu. Ayrı bir dinlenme durağı ve ipucu beklemesi olmasın. "Arka uç → ön yüz" fikri zaten FULL-STACK→İşler arasındaki anlam geçişi.
2. **Cross Section bugünkü 2.5 sn'lik boş köprünün yerine geçsin, üstüne eklenmesin** (`main.js:1333-1370`). SURFACE → EDGE → DEPTH panjuru, İşler'den Lab'e "yüzeyden derine" geçişi zaten anlatıyor. Toplam süre ≤ 2 sn.
3. **İlk işin gerçek görseli en geç 8 sn'de görünsün.** Bunun için A3'teki "önizleme nefesi" ve ad durağındaki ilerleme ipucu şart.
4. **Kısayol her zaman görünür kalsın.** Şeritteki İŞLER ve İLETİŞİM bugün de var, bu doğru. Ek olarak hero'da ikinci bir satır olarak "İşleri gör ↓" düşünülebilir.
5. **İletişimin doğrudan açılışında facts p=0'da görünsün.** Final, "imzasını" facts okunur haldeyken atsın (§1.2).

Bu yapıyla toplam yolculuk yaklaşık bugünkü uzunlukta kalır (≈ 15–18 girdi), iki yeni sahne eklenmiş olur.

**Puan etkisi (tahmin):**
- Engelleyiciler ve hızlı kazanımlarla Kullanılabilirlik 5.8 → ~6.8, İçerik 6.3 → ~7.0.
- Tasarım iyileştirmeleri (A3, C19, C20, tipografi) ve iki yeni sahne başarılı olursa Tasarım 7.4 → ~7.8, Yaratıcılık 8.0 → ~8.3.
- Ağırlıklı ≈ 7.5–7.6: SOTD bölgesi.

---

## 6. iPhone kontrol listesi (≈ 5 dk, Safari)
LAN önizlemesi için ayrı bir port kullanın: `node tools/diag/sv.cjs ../builds/merge-contact-finale 4920 --lan --wk`. 4501'e dokunmayın.

1. **Ad ve CREATIVE kalınlığı:** Harfler dolu ve kalın (Chrome gibi, `s03` sol) mı, ince (sağ) mı?
2. **Sayfa yakınlaştırması:** /tr'de iki parmakla yakınlaştırmayı dene. Beklenen: yakınlaşmaz, sıkıştırma hissi verir. Aynısını /tr/contact'ta dene. Beklenen: yakınlaşır.
3. **Sıkıştırma:** CREATIVE'de iki parmağı dikeyde uzak başlatıp neredeyse değene kadar kapat. FULL-STACK'e geçiyor mu? Kaç denemede?
4. **Lab'de iki parmak açma:** Bench'te iki parmakla açma yap. Sayfa Contact'a gidiyor mu?
5. **Hareketi azalt:** Ayarlar → Erişilebilirlik → Hareket → Hareketi Azalt açıkken bir projeye gir. Odalarda ekran görüntüleri görünüyor mu?
6. **İşler:** Önizlemede işi seçebiliyor musun? Görsele dokununca proje açılıyor mu? Basılı tutunca yarık açılıyor mu?
7. **Doğrudan giriş:** `/tr/contact` bağlantısını yeni sekmede aç. İlk ekranda ne var?
8. **Hakkımda ayrıntısı:** Sonuna kadar kaydır. Sonun geldiği belli mi?

---

## 7. Öncelik tablosu

**C2 / risk sütunu:** "yüksek" = Linefield'ın 7 ortak dosyasından birine dokunuyor. Linefield birleştikten sonra yapılması önerilir. "düşük" = C2 dosyası ama ortak değil. "—" = C2 dışı.

### 7.1 Önce: kullanıcıyı engelleyenler

| # | Madde | Dosya | Büyüklük | C2 / risk |
|---|---|---|---|---|
| 1 | Hareketi azaltılmış modda case study odaları boş, işler görünmüyor. | `engine/c2/flat.js:121-123` | K–O | evet / düşük |
| 2 | JS yüklenemezse plaka sonsuza kadar kalıyor. CSS zaman aşımı eklenmeli. | `app/assets/css/base.css:151-177` | K | — |
| 3 | `/contact`'a doğrudan girişte ilk ekran boş (8 sn+). p=0'da facts okunur olmalı. | `engine/lab/finale/*`, `contact.vue` | K–O | — |
| 4 | Lab bench'te iki parmak ve Ctrl+tekerlek sayfa değiştiriyor. C2'de Ctrl+tekerlek yakınlaştırması yutuluyor. | `useLabSpine.ts:51-54`, `lab.css:56,66`, `main.js:316-322` | K | kısmen / yüksek (tek satır) |
| 5 | Yavaş ağda ad ≈ 11 sn'de geliyor. İlk kare önizlemeleri beklememeli. | `main.js:1802-1826` | O | evet / yüksek |
| 6 | Safari'de tuval başlıkları ince kesimle mi çiziliyor? Önce doğrula (§6-1), sonra statik 900 kesim. | `states.js:14`, `main.js:10,1806` | K | evet / yüksek |
| 7 | JS'siz Lab bench bozuk. | `LabBench.vue` | K | — |

### 7.2 Sonra: hızlı kazanımlar

| # | Madde | Dosya | Büyüklük | C2 / risk |
|---|---|---|---|---|
| 8 | Ad durağında ilk ziyarette "kaydır" ipucu, masaüstünde bir kez "imleci gezdir", gecikme 1.2 sn. | `main.js:1198-1210`, locale dosyaları | K | evet / yüksek |
| 9 | "Açmak için görseli basılı tut" aria-label hatası (dokunmada ve ekran okuyucuda). | `main.js:1288` | K | evet / yüksek |
| 10 | Düz katman senkronu: çalışma bağlantıları, "03", numaralar, skip hedefi, `aria-current`, "C2 surface active". | §A4 tablosu | K | kısmen |
| 11 | "HAKKIMDA" düğmesine küçük bir oda aç (kontrast), proje ipucu opaklığını .9 yap. | `states.js`, `style.css` | K | evet / yüksek + düşük |
| 12 | İçerik: Ege PSI, TR durum cümlesi, EN tutarlılığı, eski `labKeys`, CTA satırı, "Ege Kent" açıklaması. | `facts.ts`, `tr.ts`, `en.ts` | K | locale / yüksek |
| 13 | Lab mobil CLS 0.175 ve 10 px not. | `LabBench.vue`, `lab.css` | K | — |
| 14 | Çalışma sayfasında dil değişince kaydırma yeri korunsun. | `LabChrome.vue` | K | — |
| 15 | Sıkıştırma eşiğini düşür (`k>2.6`). | `main.js:811` | K | evet / yüksek |
| 16 | Kapalı proje katmanlarına `inert` ver. Contact'taki "Konum"u metin yap. | `main.js`, `contact.vue` | K | kısmen |
| 17 | 2400 px görsel türevleri (2× ekranlar). | `shared/content/media.ts`, görsel hattı | K–O | — |
| 18 | Gizlilik notu, web manifest, rol yazılı OG görseli, Lab ve Contact için ayrı OG. | `useLocaleSeo.ts`, `production-files.ts` | K | — |
| 19 | 404'e marka satırları. | `production-files.ts:52-92` | K | — |
| 20 | Firefox için `RENDERER` yedeği (uzantı kalkınca). | `main.js:91-104` | K | evet / yüksek |

### 7.3 En son: tasarım iyileştirmeleri

| # | Madde | Dosya | Büyüklük | C2 / risk |
|---|---|---|---|---|
| 21 | İşler okunurluğu: durgun işte "önizleme nefesi" ya da panelde gerçek küçük görsel, ton kontrastı. | `states.js`, `surface.js`, `tone-core.js` | O–B | evet / yüksek + düşük |
| 22 | "Sonraki iş" önizlemesi okunur olsun: gerçek görsel ya da kâğıt tonunda tam kontrast. | `main.js:1533-1563`, `states.js:325-352` | O | evet / yüksek |
| 23 | Okuma cepleri metne sıkı sarılsın, kenar yumuşaklığı azalsın. | `states.js:77-83`, `world.js` | K–O | evet / yüksek + düşük |
| 24 | Tarama kalemi finalin kalemiyle eşleşsin ya da halka kaldırılsın. | `surface.js:299-301` | K | evet / düşük |
| 25 | Geçişlerde boş kare kalmasın: önceki kelime yeni kelime gelene kadar dursun, katman gecikmesi 0. | `style.css:75-76`, `main.js` | K–O | evet / düşük + yüksek |
| 26 | Tipografi orta katmanı: mono 11.5–12 px, içerik mono'su 12–13 px, gövde 400+, düz kabukta Geist. | `style.css`, `lab.css`, `base.css` | O | evet / düşük |
| 27 | Contact'ın bitmiş kompozisyonunda hiyerarşi: e-posta ve telefon önde, GitHub geride. | `engine/lab/finale/partition.js` vb. | O | — |
| 28 | Case study'lere URL (`/[locale]/work/[id]`), "önceki iş" ve bir satırlık sonuç cümlesi. | yeni rota, `main.js` devri | B | evet / yüksek |
| 29 | Tempo: Linefield geçiş olarak, Cross Section köprünün yerine (§5). | Linefield worktree, `main.js:1333-1370` | B | evet / yüksek (zaten Linefield'ın işi) |
| 30 | Hakkımda kapsül iç boşluğu ve mobil aralık, ayrıntı kabının sonu görünür olsun. | `main.js:683-719`, `style.css:278` | K | evet / yüksek + düşük |
| 31 | Mobil yüz kelimesi: dikey kelimenin okunurluğu ya da kısmen yatay bir çözüm. | `states.js:153-172` | O | evet / yüksek |

**Sıralama önerisi:**
- **Hemen, Linefield'dan bağımsız (C2 dışı ya da düşük risk):** 1, 2, 3, 7, 13, 14, 17, 18, 19, 24.
- **Linefield birleştikten sonra (ortak dosyalar):** 4–6, 8–12, 15, 16, 20–23, 25–31.

---

## 8. Düzeltme turu 1: yapılanlar

Dal `fix/audit-01-batch1`, origin/main b04e1ed'den açıldı. 7 ortak dosyanın hiçbirine dokunulmadı.

| Commit | Madde |
|---|---|
| c5f489d | Hareketi azaltılmış modda case study odaları görseli gösteriyor (`engine/c2/flat.js`) |
| c25ca0a | HAKKIMDA ve proje ipucu en kötü zeminde WCAG AA'yı geçiyor |
| 7302946 | Mobil Hakkımda'da okuma çizgisi var; metnin nerede bittiği görünüyor |
| ab842b8 | Rol ve adres yazılı OG görselleri; Lab ve Contact için ayrı OG; web manifest; kök `/` sayfasında JSON-LD; `nuxt prepare` koruması |
| e45691c | Düz katman: çalışma numaraları, `aria-current`, h1, "C2 surface active" |
| 3c358bf | JS gelmezse plaka çekiliyor (html.c2-failed ya da 20 sn); 404 sitenin malzemesinde |
| 54a1c30 | `/contact` doğrudan URL'de bitmiş halde açılıyor |
| b861703 | Bench yakınlaştırılabiliyor; iki parmak ve Ctrl+tekerlek sayfa değiştirmiyor |
| 57a07eb | `#work` ve `#lab` doğru yere varıyor; bench numaraları listeden türetiliyor; JS'siz bench listesi |
| edd2b80 | Çalışma sayfasında dil değişince kaydırma yeri korunuyor |

## 9. Düzeltme turu 2: Linefield sonrası

Bu maddeler Linefield'ın ortak dosyalarına (`LINEFIELD-MERGE.md`) ya da runtime'ın jest koduna dokunuyor. Linefield `main`'e birleştikten sonra yapılacak.

| # | Madde | Dosyalar | Neden bekliyor / not |
|---|---|---|---|
| 1 | **§14 TR/EN metin düzeltmeleri** (madde 9): "Seçili freelance…" ifadesi; EN'deki iki farklı durum cümlesinin teke indirilmesi; Istanbul/İstanbul; "production sitesi" ve "Best Practices"; eskimiş `labKeys`; eylem çağrısı satırı; "Ege Kent" açıklaması | `shared/content/locales/tr.ts`, `en.ts`, `types.ts` | Üçü de ortak dosya. Ege PSI bilerek olduğu gibi bırakıldı (kullanıcı kararı). |
| 2 | **Düz katmanın kalan satırları** (A4 tablosu) | `engine/c2/main.js`; #2, #6, #10 ve #12 için ayrıca locale ve `types.ts` | Satırlar ayrıntılı olarak aşağıda. |
| 3 | **C2 sayfalarında sayfa yakınlaştırması (WCAG 1.4.4)**: `html, body { touch-action:none }` iki parmakla yakınlaştırmayı kapatıyor. Masaüstünde Ctrl+tekerlek `preventDefault` ediliyor. | `engine/c2/style.css:16`, `engine/c2/main.js:316-322` ve dokunma işleyicileri | Sayfa yakınlaştırması ile iki parmakla "sıkıştırma" jestinin nasıl birlikte yaşayacağına birlikte karar verilecek. Bench ve Contact'ta bu turda çözüldü (b861703). |
| 4 | **HAKKIMDA odası**: HAKKIMDA'nın arkasında satırların açılması, yani malzemenin kendi odası | `engine/c2/states.js` | Kontrast CSS ile zaten çözüldü (kâğıt bant, c25ca0a). Bu madde isteğe bağlı bir tasarım rafinesi. |
| 5 | **Yavaş ağda ilk kare**: Fast 3G + 4× CPU'da ad ≈ 10.8 sn'de geliyor, çünkü `prepare()` bütün önizleme görsellerini bekliyor | `engine/c2/main.js:1802-1826` | Adı önizlemeleri beklemeden çiz; önizlemeleri ilk kareden sonra yükle. |
| 6 | **Ad → CREATIVE boş karesi**: geçişte ~0.35 sn'lik neredeyse boş kare | `engine/c2/style.css:75-76` (katman gecikmesi), `engine/c2/main.js` | Önceki kelime yeni kelime gelene kadar dursun. FULL-STACK → İşler karesi Linefield'la, İşler → Lab karesi Cross Section'la değişecek. |
| 7 | **OPEN_WORK aria-label**: dokunmatikte ve ekran okuyucuda "görseli basılı tut" okunuyor | `engine/c2/main.js:1288` | `TXT.work.open` yerine `OPEN_WORK()` kullanılmalı. |

**Düz katmanın kalan satırları** (tablo satırı 2; A4 tablosundaki numaralarla):
- **#1:** runtime'ın düz gezinmesindeki Lab bağlantıları → `/lab/{id}` (`main.js:1044`).
- **#2 (metin kısmı):** `lab.count` "03" (locale) ve `main.js:1030`.
- **#4:** runtime Lab sırası `facts.studies`'ten gelsin (`main.js:560`).
- **#6:** belge rotalarında skip bağlantısının etiketi. Yeni bir metin anahtarı gerekiyor: `types.ts` ve locale dosyaları.
- **#10:** EN'de Istanbul/İstanbul (`en.ts`).
- **#11:** runtime düz gezinmesinde case study içeriği (`main.js`). Case study URL'leri gelirse onlarla birlikte yapılmalı.
- **#12:** `labKeys`.

**Birleştirme planı:** Linefield oturumu durduğunda önce tam kapı koşulacak. Kapı temizse `fix/audit-01-batch1` `--no-ff` ile `main`'e birleştirilip push edilecek. Bu adım kullanıcının haberiyle yapılacak.

---

## 10. Düzeltme turu 2: yapılanlar

Dal `fix/audit-01-batch2`, febd93f'ten açıldı (batch 1 ve Linefield ile birleşmiş `main`). §9'un maddeleri sırayla yapıldı.

| Commit | §9 maddesi | Not |
|---|---|---|
| b4054e7 | 1, metin | Durum satırı "Seçili projelere açığım" / "Available for selected projects"; EN'de Istanbul; `labKeys` kaldırıldı; "Bir projeniz mi var? Yazın →" eylem çağrısı Hakkımda'nın sonunda ve her projenin son karesinde; İstanbul Şehir İçi'nin açılışında "Ege Kent Nakliyat'ın İstanbul şehir içi markası". "production sitesi", "Best Practices" ve Ege PSI kararla olduğu gibi kaldı. |
| 63b3f20 | 2, düz katman #1, #2, #4, #6 | Çalışma bağlantıları kendi sayfasına gidiyor; sıra facts.ts'ten geliyor; "03" sayılıyor; belge rotalarındaki skip bağlantısı "İçeriğe geç" diyor. #10 ve #12 madde 1'de yapıldı. #11 case study URL'lerini bekliyor. |
| 22d429d | 3, C2 yakınlaştırma | Kullanıcı kararı: iki parmak ve Ctrl+tekerlek tarayıcının. Sıkıştırma jesti kaldırıldı; yüzden yüze geçiş basılı tutarak yapılıyor. Yakınlaşmış sayfada site jest okumuyor. |
| — | 4, HAKKIMDA odası | Kullanıcı kararıyla atlandı. Kâğıt bant (1. tur) kalıyor. |
| 205e1d5 | 5, yavaş ağda ilk kare | Fontlar head'den önceden yükleniyor ve birlikte iniyor; önizlemeler fontları beklemiyor; ilk kare önizlemeleri beklemiyor. Fast 3G + 4× CPU'da 11,2 → 8,9 sn. |
| 25987e8 | 6, ad → CREATIVE boş karesi | Creative'in metni odasıyla birlikte geliyor (0,75): 0,6–0,7 sn daha erken. |
| 13756b4 | 7, OPEN_WORK aria-label | Dokunmatikte ad, görünen talimatla aynı. |

**Kontroller:** her maddeden sonra hızlı kontroller koşuldu: Linefield giriş, çıkış ve hareketi azaltılmış; `workopen`; `journey`; `herotouch`; `touch`; `spine`. Tam kapı koşulmadı.

**Açık kalanlar:**
- Sert fırlatmada coast/tail aşımı febd93f'te de var: ortak bir karşılaştırmada febd93f'te 10 denemenin 5'i, bu dalda 2'si kaldı. Linefield oturumunun konusu.
- `spine`'ın momentum kuyruğu kontrolü makine yüklüyken febd93f'te de kalıyor; yük kalkınca geçiyor.
- Düz katman #11, case study URL'lerini bekliyor.
