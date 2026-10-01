# ROADMAP: emrah-portfolio

Projenin **tek yapılacaklar listesi**. Başka bir yerde tutulan liste bunun yerine geçmez; ayrıntı başka bir
belgedeyse (AUDIT-01, LINEFIELD.md, DEPLOYMENT.md…) burada ona bağlantı verilir.

## Bu dosya nasıl güncellenir (her oturum)

1. **Başlarken oku.** Bir maddeye başlamadan önce o maddenin karar durumuna ve bağımlılığına bak.
2. **Başladığında** maddenin durumunu `sürüyor` yap; dalı ve worktree'yi yaz.
3. **Kullanıcı bir karar verdiğinde** maddenin **Karar** alanına tarihiyle yaz. Karar sohbette kalmasın.
4. **Bitirdiğinde** maddeyi "Tamamlananlar"a taşı: tarih, dal, commit'ler ve hangi kontrollerin koşulduğu.
5. **Yeni bir iş çıktığında** (denetim bulgusu, hata, kullanıcı isteği) buraya madde olarak ekle.
6. Bu dosyadaki değişikliği işin kendi commit'iyle ya da hemen ardından commit et.

**Öncelik:**
- **P0:** yayından ya da Awwwards başvurusundan önce şart.
- **P1:** yayın için güçlü öneri.
- **P2:** iyileştirme; zaman kalırsa.

**Karar durumu:**
- **Karar verildi:** yapılacak iş belli.
- **Karar bekliyor:** neyin beklendiği yazılı.
- **Önce inceleme:** mevcut davranış ölçülmeden tasarlanmayacak.

Son güncelleme: 2026-10-02, `fix/audit-01-batch2` (R12, R16 tamamlandı).

---

## Durum özeti

| # | Madde | Öncelik | Karar | Bağımlılık |
|---|---|---|---|---|
| R1 | Birleştirme: düzeltme turu 2 → `main`, yayın dalı | P0 | Karar bekliyor (ne zaman) | tam kapı (R16 sayesinde paralel koşulabilir) |
| R2 | Bakır = eylem rengi | P1 | Karar verildi (2026-10-02); sürüyor | — |
| R3 | Tek ipucu sistemi | P1 | Karar verildi (2026-10-02) | — |
| R4 | Özel imleç | P2 | Karar verildi (biçim) | R2 |
| R5 | İşler: "İNCELE →" ve mobilde okunur durgun önizleme | P1 | Karar verildi | R2 |
| R6 | Lab bench girişleri: okunur boyut, üzerine gelince ön gösterim | P2 | Kısmen: ön gösterimin biçimi bekliyor | — |
| R7 | Lab'de kaydırma çalışmalar arasında, tıklama içeri | P2 | Önce inceleme | R6 |
| R8 | Case study: kendi URL'leri, okunur "sonraki iş", başlık arkası | P1 | Karar bekliyor (URL biçimi) | — |
| R9 | Koyu zeminlerde satır titreşimi | **P0** (R18 için) | Neden açık; önce ölçüm | — |
| R10 | Safari'de adın ince kesimle çizilmesi | P1 | Önce gerçek iPhone | R22 |
| R11 | Yavaş ağda ilk kare (8,9 sn) | P2 | Önce değerlendirme | — |
| R13 | Gövde metni ve tipografik hiyerarşi | P1 | Karar bekliyor (ölçek) | — |
| R14 | Cross Section (İşler → Lab köprüsünün yerine) | P1 | Karar verildi (yön; kesit anında bekleme) | R2, R15 |
| R15 | Tempo, ilerleme göstergesi, performans bütçesi | P2 | Karar bekliyor | R14 |
| R17 | Yayın (DEPLOYMENT.md, CSP, canlı yedeği) | P0 | Karar bekliyor (tarih) | R1 |
| R18 | Awwwards başvurusu (Developer Award) | P0 | Karar bekliyor (tarih) | R17, R9, R22, R23 |
| R19 | Full-Stack'in siyah kapsüllerinin çevresindeki hale | P1 | Karar bekliyor (varyant ya da kural) | — |
| R20 | Arka belleğe piksel sayısı tavanı (önerilen 8,3 Mpx) | P1 | Karar bekliyor (değer) | R9 ile birlikte ölçülür |
| R21 | Büyük ekranlarda büyük harf başına satır sayısına üst sınır | P2 | Karar bekliyor (sanat yönetimi) | — |
| R22 | Gerçek cihaz testi (iPad, Mac'te Safari, Android telefon) | P0 | Karar verildi | — |
| R23 | Awwwards başvuru malzemesi (ekran görüntüleri, kısa video, başlık, açıklama) | P0 | Karar bekliyor (içerik) | R9 |

---

## Yapılacaklar

### R1. Birleştirme: düzeltme turu 2 → `main`
- **Açıklama:** `fix/audit-01-batch2` (febd93f + 7 commit, b4054e7..c64d995 ve bu dosya) henüz `main`'e
  birleşmedi. Birleşmeden önce tam kapı koşulacak. `origin/main` hâlâ b04e1ed'de; Linefield ve düzeltme turu 1'i
  taşıyan yerel `main` (febd93f) push edilmedi.
- **Karar:** Birleştirmeyi ve push'u kullanıcı söyler. Dal 2026-10-01'de yedek olarak origin'e push edildi;
  `main`'e dokunulmadı.
- **Dosyalar:** `tools/diag/run6.sh`, `docs/contact-finale/LINEFIELD-MERGE.md`, `docs/audit/AUDIT-01.md` §10.
- **Bağımlılık:** tam kapı. R16 yapıldı: başka bir oturum durmadan, kendi portlarıyla koşulabilir.
- **Öncelik:** P0.

### R2. Bakır = eylem rengi
- **Açıklama:** Sitede "buraya tıklanır" demenin tek rengi bakır olsun. Üç token:
  - **Yazı için koyu bakır:** krem zeminde en az 4,5:1.
  - **İşaretler için parlak bakır:** oklar, çizgiler, halkalar; grafik öğe olarak en az 3:1.
  - **Siyah zemin için açık ton.**

  Ölçülen adaylar (krem `#efeee9` / gece `#0b0c0e`):

  | Renk | Kremde | Gecede | Not |
  |---|---|---|---|
  | `#b8622f` | 3,75:1 | 4,50:1 | Linefield'ın pas çizgisi. Kremde işaret için yeterli, yazı için değil. |
  | `#9a4f22` | 5,14:1 | — | Yazı rengi adayı |
  | `#8f4a20` | 5,71:1 | — | Yazı rengi adayı |
  | `#d4875a` | — | 6,91:1 | Siyah zemin adayı |
- **Yerler:**
  - Lab "AÇ →"
  - hero'daki küçük Hakkımda butonu
  - EMRAH YÜCEL ayrılınca açılan bölümde "Hakkımda daha fazla" ve yeni **"Kapat"** butonu. Bu buton bölümü
    kapatır; "Geri" değildir.
  - detaylı Hakkımda sayfasındaki "Geri"
  - case study eylemleri
  - iletişim finalinin eylemleri
  - menünün aktif öğesi
- **Karar:** Rol ve yerler belli (2026-10-01).
  - **Tokenlar (2026-10-02):** yazı `#9a4f22` (kremde 5,14:1), işaret `#b8622f` (kremde 3,75:1), siyah zemin
    `#d4875a` (6,91:1).
  - **Menü (2026-10-02):** menüde bakır yok. Menü gezinmedir, eylem değil; bakır içerikte kalır. Listedeki
    "menünün aktif öğesi" yeri bu yüzden düştü.
  - **Durum:** sürüyor (`fix/audit-01-batch2`, audit oturumu).
  - **Yapılan (2026-10-02, birinci kısım):**
    - Tokenlar: `engine/c2/style.css` (`--act`, tonla değişir) ve `app/assets/css/base.css`.
    - Bakır olanlar: hero'daki Hakkımda, "Hakkımda daha fazla", yeni **Kapat**, uzun Hakkımda'nın eylem
      çağrısı ve "Geri", bench'teki "aç →", `/about` sayfasındaki "Geri", düz katmanın bağlantıları, finalin
      "kopyala" düğmesi.
    - Kapat, Hakkımda bölümünü kapatır ve odağı hero'daki Hakkımda'ya geri verir.
    - Ölçüm: hepsi 4,77–5,14:1, gerçek zemin piksellerine karşı. axe: bütün rotalarda ve Hakkımda açıkken 0 ihlal.
  - **Bekleyen (kullanıcı kararı):**
    - Case study eylemleri proje mürekkebi üzerinde duruyor. Hiçbir bakır orada 4,5:1'e ulaşmıyor (en iyisi
      `#d4875a`, 2,68–4,06:1). İstanbul'un mürekkebi `#8e3a17` zaten bakıra yakın.
    - Finalin bağlantıları kalemle, kopan satırın kendi mürekkebiyle çiziliyor (mürekkep korunumu).
- **Dosyalar:**
  - Tokenlar: `engine/c2/style.css`, `app/assets/css/base.css`, `app/assets/css/lab.css`
  - Hero butonu ve Hakkımda bölümü: `engine/c2/main.js`; hero `.hero-about`, bölüm `.more` (~1280), detay
    `.ad-back` (~1294)
  - Lab: `engine/c2/main.js` `.lopen` (~1328), `app/components/lab/LabBench.vue` `.open-link` (~515)
  - Hakkımda sayfası: `app/pages/[locale]/about.vue` `.back`
  - Case study: `engine/c2/main.js` `.wnav` (~1334), `.wb-cta`
  - Final: `app/pages/[locale]/contact.vue`, `engine/lab/finale/`
  - Menü: `engine/c2/main.js` `.nav` (~1255)
  - Yeni "Kapat" metni: `shared/content/locales/tr.ts`, `en.ts`, `types.ts`
- **Bağımlılık:** yok. R4, R5, R14 bu tokenları kullanır.
- **Öncelik:** P1.

### R3. Tek ipucu sistemi (site geneli)
- **Açıklama:**
  - "Kaydır" ipucu yalnız gerektiği yerde çıkar: hero'nun ilk durağı, iletişim varışı ve ekranın bitmiş
    göründüğü yerler.
  - Oturum başına bir kez gösterilir.
  - Yalnız 2–3 sn girdi gelmezse çıkar.
  - Alt şeridin ortasında, küçük mono yazıyla.
  - Farklı jestler (basılı tut, yana kaydır, dokun) kendi ipucunu birer kez alır.
  - İletişim finalindeki beckon bu sisteme taşınır.

  **Bugünkü durum (2026-10-01):**
  - `hintFor` her durakta kendi zamanlamasını kullanıyor: yüzlerde ve İşler'de 2,5 sn, dünyada 3,5 sn.
  - "Öğrenildi" bayrakları sayfa ömrü boyunca tutuluyor, oturum boyunca değil.
  - Final, kendi beckon'unu ayrı bir mekanizmayla gösteriyor.
- **Karar:** Karar verildi (2026-10-01). Ayrıntılar (2026-10-02):
  - "Ekranın bitmiş göründüğü yer" olarak yalnız **Linefield geçidinin sonu** seçildi. "Kaydır" ipucu bu yüzden
    üç yerde çıkar: hero'nun ilk durağı, Linefield geçidinin sonu ve iletişim varışı.
  - **Bir kez kuralı:** "kaydır" site genelinde oturumda bir kez, ilk uygun yerde gösterilir. İletişim varışının
    kendi bir kezi var, çünkü orada kaydırmak duraklar arasında gezdirmiyor, çizimi sürüyor.
- **Dosyalar:**
  - `engine/c2/main.js`: `hintFor` (~1531), `A.learned`
  - `engine/c2/style.css`: `#hint`
  - `engine/lab/finale/finale.js`: beckon (~154)
  - `app/pages/[locale]/contact.vue`
  - `shared/content/locales/*.ts`: `hints`, `contact.hintScroll`
  - Oturum hafızası: `sessionStorage`, zaten kullanılıyor (`app/composables/useVisit.ts`)
- **Bağımlılık:** yok. R7 ve R14 yeni yerlerini bu sisteme ekler.
- **Öncelik:** P1.

### R4. Özel imleç
- **Açıklama:** Çizgilerin üzerinde bir halka, bir işin görselinin üzerinde "AÇ". Yalnız ince işaretçide
  (`pointer: fine`). Dokunmatikte ve hareketi azaltılmış modda yok. Klavye odağını etkilemez.
- **Karar:** Biçim belli. Halkanın boyutu ve rengi R2 ile birlikte belirlenecek.
- **Dosyalar:** `engine/c2/main.js` (işaretçi işleyicileri, `pressable`), `engine/c2/style.css`,
  `shared/content/locales/*.ts` ("AÇ").
- **Bağımlılık:** R2.
- **Öncelik:** P2.

### R5. İşler: "İNCELE →" ve mobilde durgun önizleme
- **Açıklama:**
  - Her işin altında bakır bir "İNCELE →" bağlantısı. Basılı tutmayı bilmeyen ziyaretçi için görünür bir kapı.
  - Mobilde durgun önizleme okunur olsun. Bugün görsel satır tonu olarak çiziliyor ve gerçek görsel ancak
    açılınca net (AUDIT-01 A3).
- **Karar:** Karar verildi (2026-10-01).
- **Dosyalar:**
  - `engine/c2/main.js`: iş katmanı, `OPEN_WORK`, `ensurePreviews`
  - `engine/c2/surface.js`: satır tonu
  - `engine/c2/world.js`
  - `engine/c2/style.css`
  - `shared/content/locales/*.ts`
- **Bağımlılık:** R2.
- **Öncelik:** P1.

### R6. Lab bench girişleri
- **Açıklama:** Bench girişleri okunur boyutta olsun. Üzerine gelince çalışmanın kısa bir ön gösterimi
  oynasın. Dokunmatikte ön gösterim yok. Hareketi azaltılmış modda durgun kare gösterilir.
- **Karar:** Yapılacağı belli (2026-10-01). **Bekleyen:** ön gösterimin biçimi. Sitede çalışma kaydı (video)
  yok; iki yol var: kısa bir kayıt ya da çalışmanın küçük canlı hâli.
- **Dosyalar:** `app/components/lab/LabBench.vue`, `app/assets/css/lab.css`, `app/components/lab/Study*.vue`.
- **Bağımlılık:** yok.
- **Öncelik:** P2.

### R7. Lab'de kaydırma çalışmalar arasında gezdirsin, tıklama içeri soksun
- **Açıklama:**
  - İşler'deki kural Lab'de de geçerli olsun: kaydırma çalışmalar arasında gezdirir, tıklama çalışmanın içine
    sokar.
  - Lab ↔ iletişim dikişi korunacak.
  - **Önce mevcut davranış incelenecek:** bench'te dikey jestin ne yaptığı, `useLabSpine`'ın eşikleri,
    `useContactSeam`'in devralma noktası.
- **Karar:** Önce inceleme. Tasarım, ölçümden sonra kullanıcıya sunulacak.
- **Dosyalar:**
  - `app/components/lab/LabBench.vue`
  - `app/composables/useLabSpine.ts`
  - `app/composables/useContactSeam.ts`
  - `app/assets/css/lab.css`
  - Harness'lar: `tools/diag/spine.cjs`, `journey.cjs`
- **Bağımlılık:** R6 (aynı bileşen).
- **Öncelik:** P2.

### R8. Case study
- **Açıklama:**
  - **Kendi URL'leri.** Bugün case study'lerin URL'si yok; paylaşılamıyor, taranamıyor. Düz katmanın son satırı
    #11 (case study içeriği düz gezinmede) buna bağlı.
  - **"Sonraki iş" görseli okunur olsun.**
  - **Başlığın arkasındaki koyu dikdörtgen.** `softRect` boşluğu (AUDIT-01 madde 20) incelenip kaldırılacak ya
    da gerekçelendirilecek.
- **Karar:** Üçü de yapılacak. **Bekleyen:** URL biçimi (örneğin `/{locale}/work/{id}`); doğrudan açılınca
  case study mi açılsın, düz sayfa mı.
- **Dosyalar:**
  - `engine/c2/main.js`: dünya modu, `nextReg`, `worldFull`, `HOST`
  - `engine/c2/world.js`
  - `engine/c2/states.js`: `softRect`
  - `app/composables/useC2Engine.ts`
  - `app/pages/[locale]/`: yeni rota
  - `nuxt.config.ts`: prerender
  - `shared/content/`
  - `modules/production-files` (sitemap)
  - Düz katman: `app/pages/[locale]/index.vue`
- **Bağımlılık:** yok. Düz katman #11 buna bağlı.
- **Öncelik:** P1.

### R9. Koyu zeminlerde satır titreşimi
- **Açıklama:** Koyu zeminlerde satırlar titreşiyor (shimmer). Canlı sitede de var. **Nedeni henüz bilinmiyor.**
- **Ölçülmüş olgular (Linefield oturumu):**
  - Masaüstünde `V.dpr` tavanı 1,5 (`main.js:148`); MacBook'ta DPR 2 iken çizim oranı 1,5. **Ama neden bu
    gösterilemedi:** DPR 2'de her cihaz aralığı zaten tam sayıya oturuyor, yayılım yine de 73 seviye farklı.
  - Şimdiye kadarki en güçlü ilişki: çizim anında satır aralığının arka bellek pikseli cinsinden değeri.
    Linefield'ın inceltilmiş aralığı 10,50 px iken yayılım 73,5; 7,00 px iken 0,0. Mekanizma açık.
- **Aday düzeltmeler (hiçbiri doğrulanmadı):**
  - satır aralığını arka bellek pikselinde tamsayıya kilitlemek
  - tamsayı çizim oranı (DPR 2'de 2 ile 1 karşılaştırması: kare süresi ve görüntü)
  - gamma-doğru karıştırma (ayrı bir adım)
- **Karar:** Önce mekanizma ölçülecek, sonra düzeltme seçilecek. Yayını (R17) engellemez, çünkü canlıda da var.
  **Awwwards başvurusundan (R18) önce şart.**
- **Dosyalar:** `engine/c2/main.js` (`V.dpr`, `measure`), `engine/c2/surface.js` (shader, `resize`),
  `engine/c2/linefield/` (kendi aralık hesabı), `docs/LINEFIELD.md` (ölçümler).
- **Bağımlılık:** yok. Gerçek MacBook ekranında görsel onay gerekiyor (R22). R20 ile birlikte ölçülmeli.
- **Öncelik:** P0 (R18 için; R17 için değil).

### R10. Safari'de adın ince kesimle çizilmesi
- **Açıklama:** Playwright WebKit, kanvastaki "EMRAH YÜCEL"i 900 yerine ince kesimle çiziyor. Gerçek Safari'de
  doğrulanmadı.
- **Karar:** Önce gerçek iPhone ve Mac Safari kontrolü (AUDIT-01 §6 iPhone kontrol listesi). Gerçekse font
  yüklemesi düzeltilecek: değişken font ağırlığı, `document.fonts.load` dizgisi, kanvasa yazmadan önce bekleme.
- **Dosyalar:** `engine/c2/main.js` (`prepare`, `ST.FAMILY`), `engine/c2/states.js`, `app/layouts/default.vue`
  (font preload).
- **Bağımlılık:** gerçek cihaz.
- **Öncelik:** P1.

### R11. Yavaş ağda ilk kare
- **Açıklama:** Fast 3G + 4× CPU'da ilk kare 11,2 sn'den 8,9 sn'ye indi (205e1d5). Daha da iyileştirilebilir mi
  değerlendirilecek. Ölçüm yöntemi: `sv.cjs` önbelleksiz sunduğu için runtime iki kez iniyor, yani rakam en
  kötü durum.
- **Adaylar:**
  - runtime chunk'ının boyutu ve bölünmesi
  - shader derlemesinin ilk kareden sonraya ertelenmesi
  - plakanın (C2Plate) daha erken ve daha anlamlı olması
- **Karar:** Önce değerlendirme.
- **Dosyalar:** `engine/c2/main.js` (`prepare`), `app/components/C2Plate.vue`, `app/layouts/default.vue`,
  `nuxt.config.ts`.
- **Bağımlılık:** yok.
- **Öncelik:** P2.

### R13. Gövde metni ve tipografik hiyerarşi
- **Açıklama:** Bugün metin rolleri dağınık. Runtime, düz kabuk, Lab ve Contact farklı aile, boyut ve opaklık
  kullanıyor (AUDIT-01 A6). Tek bir tip ölçeği ve gövde metni kuralı çıkarılacak, dört katmana uygulanacak.
- **Karar:** Bekleyen: ölçek, ve gövde fontunun Geist mi kalacağı.
- **Dosyalar:** `engine/c2/style.css`, `app/assets/css/base.css`, `app/assets/css/lab.css`,
  `app/pages/[locale]/contact.vue`, `app/pages/[locale]/about.vue`.
- **Bağımlılık:** yok. R2 ile birlikte yapılması verimli.
- **Öncelik:** P1.

### R14. Cross Section
- **Açıklama:**
  - Bugünkü İşler → Lab köprüsünün (`startBridge`, ~2,5 sn) **yerine** geçer, üstüne eklenmez.
  - Kaydırmayla sürülür.
  - Her iki dikişi kesintisiz.
  - Mobil sürümü var.
  - Bakır vurgulu.

  Sıra: SURFACE → EDGE → DEPTH.
- **Karar (2026-10-01):** Kesit anında bilinçli bir bekleme var: EDGE, bakır çizginin çevresinde adım adım
  döner, onaylı demo `cross-section-v2.html`'deki gibi. Öncesindeki ve sonrasındaki geçişler çevik kalır. Süre
  ya da ekran boyu hedefi yok. Ayrıntılar, Linefield'daki gibi bir faz planıyla kendi belgesinde tutulacak.
- **Dosyalar:**
  - `engine/c2/main.js`: `startBridge`, `A.mode === 'bridge'`
  - `engine/c2/states.js`
  - Yeni modül: Linefield'ın `engine/c2/linefield/` örüntüsüyle, kapalı varsayılan bir build bayrağının arkasında
  - `nuxt.config.ts`
  - `docs/` altında kendi belgesi
- **Bağımlılık:** R2 (bakır), R15 (tempo bütçesi). Linefield'ın birleşme örüntüsü örnek alınır.
- **Öncelik:** P1.

### R15. Tempo, ilerleme göstergesi, performans bütçesi
- **Açıklama:**
  - Adan finale toplam yolculuğun süresi ve adım sayısı Linefield ve Cross Section ile uzuyor (AUDIT-01 §5).
  - Ziyaretçiye nerede olduğunu gösteren bir ilerleme göstergesi.
  - Durak başına bir kare ve süre bütçesi, harness'la ölçülebilir biçimde.
- **Karar:** Bekleyen: göstergenin biçimi; bütçenin rakamları.
- **Dosyalar:** `engine/c2/main.js` (`SPINE`, `domUpdate`), `engine/c2/style.css`, `tools/diag/journey.cjs`.
- **Bağımlılık:** R14.
- **Öncelik:** P2.

### R17. Yayın
- **Açıklama:**
  - `docs/DEPLOYMENT.md`'ye göre yayın.
  - Canlıda CSP doğrulaması: `.htaccess`'teki hash'ler, `cspboot.cjs`.
  - Yayından önce canlı sitenin yedeği.
- **Karar:** Bekleyen: tarih.
- **Dosyalar:** `docs/DEPLOYMENT.md`, `modules/production-files` (.htaccess ve CSP hash'leri), `tools/diag/cspboot.cjs`.
- **Bağımlılık:** R1. R9'a bağlı değil: titreşim canlıda da var ve yayını engellemiyor.
- **Öncelik:** P0.

### R18. Awwwards başvurusu
- **Açıklama:** Developer Award için mühendislik tarafı öne çıkarılacak. Malzeme:
  - tek shader'lı runtime
  - düz HTML katmanı ve hareketi azaltılmış yol
  - jest kuralı
  - harness'lar
  - performans rakamları

  Başvuru metni ve görselleri hazırlanacak.
- **Karar:** Bekleyen: tarih ve kategori metni.
- **Dosyalar:** yeni `docs/AWWWARDS.md` (taslak).
- **Bağımlılık:** R17, R9, R22 ve R23.
- **Öncelik:** P0.

### R19. Full-Stack'in siyah kapsüllerinin çevresindeki hale
- **Açıklama:** Satırlar kapsülün kenarında yığılıyor; siyah kapsüllerin çevresinde bir hale oluşuyor.
- **Durum:** Atılabilir A/B/C varyantları `builds/var-A`, `var-B` ve `var-C`'de. Olası düzeltme koridorun mürekkep
  korunumu kuralı.
- **Karar:** Bekleyen: varyant ya da korunum kuralı.
- **Dosyalar:** `engine/c2/states.js` (Full-Stack yüzü), `engine/c2/surface.js`, `engine/c2/linefield/corridor.js`
  (korunum kuralı).
- **Bağımlılık:** yok.
- **Öncelik:** P1.

### R20. Arka belleğe piksel sayısı tavanı
- **Açıklama:** Büyük ve yüksek DPR'lı ekranlarda kanvasın arka belleği sınırsız büyüyor. Önerilen tavan 8,3 Mpx
  (3840×2160). Tavanı aşan ekranda çizim oranı düşürülür.
- **Karar:** Bekleyen: değer.
- **Dosyalar:** `engine/c2/main.js` (`V.dpr`, `V.u`, `measure`), `engine/c2/surface.js` (`resize`),
  `engine/c2/linefield/`.
- **Bağımlılık:** çizim oranını değiştirdiği için R9 ile birlikte ölçülmeli.
- **Öncelik:** P1.

### R21. Büyük ekranlarda büyük harf başına satır sayısına üst sınır
- **Açıklama:** Büyük harf başına düşen satır sayısı telefonda 12, 4K'da 37. Bir üst sınır konup konmayacağı ve
  değeri sanat yönetimi kararı.
- **Karar:** Bekleyen: kullanıcının sanat yönetimi kararı.
- **Dosyalar:** `engine/c2/linefield/state.js` (satır aralığı), `engine/c2/states.js`, `docs/LINEFIELD.md`.
- **Bağımlılık:** yok.
- **Öncelik:** P2.

### R22. Gerçek cihaz testi
- **Açıklama:** Otomatik tarayıcı sonuçları cihaz doğrulaması sayılmaz. Test edilecekler:
  - iPad
  - Mac'te Safari
  - bir Android telefon

  iPhone kontrol listesi AUDIT-01 §6'da. R10 (Safari'de ince ad) ve R9 (MacBook'ta titreşim) bu teste bağlı.
- **Karar:** Karar verildi (2026-10-01).
- **Dosyalar:** `docs/audit/AUDIT-01.md` §6, `docs/contact-finale/DEVICE-TEST.md`.
- **Bağımlılık:** yerel ağa açık bir sunucu (`sv.cjs --lan`).
- **Öncelik:** P0.

### R23. Awwwards başvuru malzemesi
- **Açıklama:** ekran görüntüleri, kısa bir video, başlık ve açıklama.
- **Karar:** Bekleyen: içerik ve ton.
- **Dosyalar:** yeni `docs/AWWWARDS.md`.
- **Bağımlılık:** R18'in parçası. Görüntüler R9 düzeldikten sonra çekilmeli.
- **Öncelik:** P0.

---

## Tamamlananlar

| Tarih | İş | Dal / commit | Belge |
|---|---|---|---|
| 2026-09-30 | İletişim finali: prototip (lab-contact) ve entegrasyon | `origin/main` b04e1ed | `docs/contact-finale/` |
| 2026-09-30 | Denetim AUDIT-01 | `fix/audit-01-batch1` | `docs/audit/AUDIT-01.md` §0–§7 |
| 2026-09-30 | Düzeltme turu 1 (12 commit; kullanıcı onaylı). Linefield ile birlikte yerel `main`'de febd93f. | `fix/audit-01-batch1` d6bf6fd..8eadef7, etiket `audit-01-batch1-rc` | AUDIT-01 §8 |
| 2026-10-01 | Linefield (bayrak arkasında) | yerel `main` febd93f | `docs/LINEFIELD.md` |
| 2026-10-01 | Düzeltme turu 2. Ayrıntılar aşağıda. | `fix/audit-01-batch2` b4054e7..c64d995 | AUDIT-01 §9–§10 |
| 2026-10-01 | R12: sert trackpad fırlatmasının kuyruğu ikinci durağı açmıyor | `fix/audit-01-batch2` a2967db | aşağıda |
| 2026-10-02 | R16: tam kapı başka bir oturumla aynı anda koşulabiliyor | `fix/audit-01-batch2` (bu commit) | aşağıda |

**Düzeltme turu 2'nin maddeleri:**
- metinler ve eylem çağrısı
- düz katmanın #1, #2, #4 ve #6 numaralı satırları
- C2'de yakınlaştırma ve Ctrl+tekerlek tarayıcıya bırakıldı. Sıkıştırma jestinin yerini yüzden yüze basılı
  tutma aldı.
- yavaş ağda ilk kare 11,2 → 8,9 sn
- ad → CREATIVE boş karesi
- OPEN_WORK etiketi

**R12'nin ayrıntısı (2026-10-01):**
- **Neden.** Kural yerindeydi; aşımı iki durum açıyordu. Sayfa bir varışı çizerken meşgul olduğundan, tarayıcı
  tekerlek olaylarını birleştirip (coalesce) tek olay olarak veriyor.
  - Birleşmiş bir olay 2–3 karenin toplamını taşıyor. Zarf olay başına sönümlendiği için bu olay "yeni atış" (RISE)
    sayılıyor ve aynı kuyruğa ikinci bir durak bütçesi veriliyordu.
  - Sert bir atışın kendi açılış rampası da (120 Hz, çift olaylar: 40 · 100 · 280 px) RISE sayılıyordu. pT o anda
    eşiği çoktan geçmiş olduğundan atış bir durak indiriliyor, kalanı ikinci durağa gidiyordu.
  - gesture2'nin yük altında bazen kalıp bazen geçmesinin sebebi de bu: olaylar Playwright'tan tek tek gidiyor,
    aralıkları makinenin yüküyle büyüyor.
- **Düzeltme** (`engine/c2/main.js`, `opensGesture`):
  - RISE, her olayı taşıdığı kare başına okur: boyut ÷ (aralık / 16,7 ms), 1 ile 8 kare arasında. Taban (floor)
    ham boyutta kalır.
  - RISE yalnız akış kendi tepesinin yarısının altına düştükten sonra okunur (`GEST_FALLEN` 0,5). Rampa ve sabit
    akış hiçbir zaman yeni atış sayılmaz; bilinçli ikinci atış her zaman sönen bir kuyruktan sonra gelir.
- **Yeni harness:** `tools/diag/trackpad.cjs`. Akışlar sayfanın içinden sabit zaman çizelgesiyle gönderilir:
  macOS 60/120 Hz momentum, Windows precision touchpad, gesture2'nin coast ve tail'i; birleşik ve sıralı teslim.
- **Ölçüm** (her durak, iki yön; flag-on build):
  - Önce: WebKit 62 atışta 11 aşım, Chrome 70'te 1.
  - Sonra: WebKit 115'te 0, Chrome 140'ta 0.
- **Kontroller:**
  - gesture2 alt kümesi (burst ve tail her duraktan ve bench'ten; ikinci atış 150/300/500 ms; üç ritim 3/2/1):
    flag-on ve flag-off PASS.
  - Linefield giriş, çıkış ve hareketi azaltılmış; `workopen` (on/off); `touch`; `herotouch`; `spine`: PASS.
  - Tam gesture2 takımı koşulmadı.

**R16'nın ayrıntısı (2026-10-02):**
- `run6.sh` ve harness'lar portu zaten argüman olarak alıyordu; engel `serve.sh`'tı. 4500–4700'ü durduruyor ve
  sabit portlarda (4500, 4501, 4650) sunuyordu.
- **Değişiklik:**
  - `SERVE_PORTS="<test> <LAN> <baseline>"` ile `serve.sh` yalnız o üç portu durdurup onlarda sunar.
  - `BUILD_DIR` snapshot klasörünü değiştirir.
  - `run6.sh`'ta `GATE_LOG` log dosyasını değiştirir.
  - Değişken verilmezse davranış aynı.
  - `serve.sh`'ın sunucu alt kabukları çıktıyı tutmuyor; `sh serve.sh | tail` artık bitiyor.
- **Kullanım:** `SERVE_PORTS="4910 4911 4914" sh tools/diag/serve.sh`, sonra `sh tools/diag/run6.sh 4910 4914`.
  CLAUDE.md'ye yazıldı.
- **Kontrol:** 4921/4922/4923 ile koşuldu. Üç sunucu da cspboot PASS verdi; 4500–4799 dinleyicileri aynı PID'lerle
  kaldı. Hatalı argüman (iki port) açık bir mesajla durdu. Tam kapı koşulmadı.

**Kullanıcı kararıyla kapatılanlar:**
- HAKKIMDA odası (AUDIT-01 §9 madde 4): atlandı; 1. turdaki kâğıt bant kalıyor.
- Ege PSI rakamları: olduğu gibi kalıyor.
