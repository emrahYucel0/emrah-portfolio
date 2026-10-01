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

Son güncelleme: 2026-10-01, `fix/audit-01-batch2` (düzeltme turu 2 sonrası).

---

## Durum özeti

| # | Madde | Öncelik | Karar | Bağımlılık |
|---|---|---|---|---|
| R1 | Birleştirme: düzeltme turu 2 → `main`, yayın dalı | P0 | Karar bekliyor (ne zaman) | R16 kolaylaştırır |
| R2 | Bakır = eylem rengi | P1 | Kısmen: menünün aktif öğesi bekliyor | — |
| R3 | Tek ipucu sistemi | P1 | Karar verildi | R2 (renk yok, ama aynı şerit) |
| R4 | Özel imleç | P2 | Karar verildi (biçim) | R2 |
| R5 | İşler: "İNCELE →" ve mobilde okunur durgun önizleme | P1 | Karar verildi | R2 |
| R6 | Lab bench girişleri: okunur boyut, üzerine gelince ön gösterim | P2 | Kısmen: ön gösterimin biçimi bekliyor | — |
| R7 | Lab'de kaydırma çalışmalar arasında, tıklama içeri | P2 | Önce inceleme | R6 |
| R8 | Case study: kendi URL'leri, okunur "sonraki iş", başlık arkası | P1 | Karar bekliyor (URL biçimi) | — |
| R9 | Koyu zeminlerde satır titreşimi | **P0** | Önce ölçüm (prototip) | — |
| R10 | Safari'de adın ince kesimle çizilmesi | P1 | Önce gerçek iPhone | — |
| R11 | Yavaş ağda ilk kare (8,9 sn) | P2 | Önce değerlendirme | — |
| R12 | Sert fırlatmada coast/tail aşımı | P1 | Linefield oturumunun | — |
| R13 | Gövde metni ve tipografik hiyerarşi | P1 | Karar bekliyor (ölçek) | — |
| R14 | Cross Section (İşler → Lab köprüsünün yerine) | P1 | Karar verildi (yön) | R2, R15 |
| R15 | Tempo, ilerleme göstergesi, performans bütçesi | P2 | Karar bekliyor | R14 |
| R16 | Tam kapının paralel çalışabilmesi | P1 | Karar verildi | — |
| R17 | Yayın (DEPLOYMENT.md, CSP, canlı yedeği) | P0 | Karar bekliyor (tarih) | R1, R9 |
| R18 | Awwwards başvurusu (Developer Award) | P0 | Karar bekliyor (tarih) | R17 ve bütün P0'lar |

---

## Yapılacaklar

### R1. Birleştirme: düzeltme turu 2 → `main`
- **Açıklama:** `fix/audit-01-batch2` (febd93f + 7 commit, b4054e7..c64d995 ve bu dosya) henüz `main`'e
  birleşmedi. Birleşmeden önce tam kapı koşulacak. `origin/main` hâlâ b04e1ed'de; Linefield ve düzeltme turu 1'i
  taşıyan yerel `main` (febd93f) push edilmedi.
- **Karar:** Birleştirmeyi ve push'u kullanıcı söyler. Dal 2026-10-01'de yedek olarak origin'e push edildi;
  `main`'e dokunulmadı.
- **Dosyalar:** `tools/diag/run6.sh`, `docs/contact-finale/LINEFIELD-MERGE.md`, `docs/audit/AUDIT-01.md` §10.
- **Bağımlılık:** tam kapı. R16 yapılırsa başka bir oturum durmadan da koşulabilir.
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
- **Karar:** Rol ve yerler belli (2026-10-01). **Bekleyen:** menüde hangi öğelerin bakır olacağı, ve token
  değerleri (yukarıdaki adaylardan seçilecek; gerçek zeminler üzerinde ölçülerek).
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
- **Karar:** Karar verildi (2026-10-01).
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
- **Açıklama:** Çizim oranı tamsayı değil. MacBook'ta DPR 2 iken `V.dpr` 1,5 oluyor (`main.js:148`, masaüstü
  tavanı 1,5), bu yüzden satırlar piksel ızgarasına oturmuyor ve koyu zeminlerde titreşiyor. İki adımda
  yapılacak:
  1. Tamsayı oran prototipi: DPR 2'de 2 ve 1 ile ölçülecek; kare süresi ve görüntü karşılaştırılacak.
  2. Gamma-doğru karıştırma ayrı bir adım olarak ele alınacak.
- **Karar:** Önce ölçüm. **Awwwards başvurusundan önce şart.**
- **Dosyalar:** `engine/c2/main.js` (`V.dpr`, `measure`), `engine/c2/surface.js` (shader, `resize`),
  `engine/c2/linefield/` (kendi `V.dpr`'ı).
- **Bağımlılık:** yok. Gerçek MacBook ekranında görsel onay gerekiyor.
- **Öncelik:** P0.

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

### R12. Sert fırlatmada coast/tail aşımı
- **Açıklama:** Tek bir fiziksel jest en fazla bir durak ilerletmeli. Sert bir trackpad fırlatmasının kuyruğu
  bazen ikinci bir durak açıyor. Aşım febd93f'te de var: bir A/B denemesinde febd93f'te 10 atışın 5'i, batch 2'de
  2'si kaldı.
- **Karar:** Linefield oturumunun işi.
- **Dosyalar:**
  - `engine/c2/main.js`: `opensGesture`, `landGesture`, `GEST_*`
  - `engine/c2/linefield/input.js`
  - Harness'lar: `tools/diag/gesture2.cjs` (WebKit, `--wk` portu; ~67 dk, önce sor)
- **Bağımlılık:** yok.
- **Öncelik:** P1.

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

  Öneri (AUDIT-01 §5): SURFACE → EDGE → DEPTH, toplam ≤ 2 sn ya da ≤ 1–1,5 ekran boyu.
- **Karar:** Yön verildi. Ayrıntılar, Linefield'daki gibi bir faz planıyla kendi belgesinde tutulacak.
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

### R16. Tam kapının paralel çalışabilmesi
- **Açıklama:** `run6.sh`, `serve.sh` ve `baseline.sh` portları ve build klasörlerini sabit kullanıyor
  (4500–4700). `serve.sh` bu portlardaki her süreci öldürüyor. Bu yüzden iki oturum aynı anda kapı koşamıyor.
  Port tabanı ve build klasörü parametre ya da ortam değişkeniyle ayarlanabilir olsun. Varsayılanlar
  değişmesin.
- **Karar:** Karar verildi (2026-10-01).
- **Dosyalar:** `tools/diag/run6.sh`, `tools/diag/serve.sh`, `tools/diag/baseline.sh`, ve bu scriptlerin
  çağırdığı harness'ların port argümanları.
- **Bağımlılık:** yok. R1'i kolaylaştırır.
- **Öncelik:** P1.

### R17. Yayın
- **Açıklama:**
  - `docs/DEPLOYMENT.md`'ye göre yayın.
  - Canlıda CSP doğrulaması: `.htaccess`'teki hash'ler, `cspboot.cjs`.
  - Yayından önce canlı sitenin yedeği.
- **Karar:** Bekleyen: tarih.
- **Dosyalar:** `docs/DEPLOYMENT.md`, `modules/production-files` (.htaccess ve CSP hash'leri), `tools/diag/cspboot.cjs`.
- **Bağımlılık:** R1, ve bütün P0'lar (R9).
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
- **Bağımlılık:** R17, R9 ve bütün P0'lar.
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

**Düzeltme turu 2'nin maddeleri:**
- metinler ve eylem çağrısı
- düz katmanın #1, #2, #4 ve #6 numaralı satırları
- C2'de yakınlaştırma ve Ctrl+tekerlek tarayıcıya bırakıldı. Sıkıştırma jestinin yerini yüzden yüze basılı
  tutma aldı.
- yavaş ağda ilk kare 11,2 → 8,9 sn
- ad → CREATIVE boş karesi
- OPEN_WORK etiketi

**Kullanıcı kararıyla kapatılanlar:**
- HAKKIMDA odası (AUDIT-01 §9 madde 4): atlandı; 1. turdaki kâğıt bant kalıyor.
- Ege PSI rakamları: olduğu gibi kalıyor.
