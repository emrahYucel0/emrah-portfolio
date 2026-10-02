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

Son güncelleme: 2026-10-02, `fix/audit-01-batch2` (R12, R16, R3, R2, R5, R24, R8, R7 tamamlandı; R25, R26 bekliyor).

---

## Durum özeti

| # | Madde | Öncelik | Karar | Bağımlılık |
|---|---|---|---|---|
| R1 | Birleştirme: düzeltme turu 2 → `main`, yayın dalı | P0 | Karar bekliyor (ne zaman) | tam kapı (R16 sayesinde paralel koşulabilir) |
| R4 | Özel imleç | P2 | Karar verildi (biçim) | R2 |
| R6 | Lab bench girişleri: okunur boyut, üzerine gelince ön gösterim | P2 | Kısmen: ön gösterimin biçimi bekliyor | — |
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
| R25 | Linefield yayında açılsın mı | P0 | Karar bekliyor | R1, R17 |
| R26 | Çalışma sayfalarının (Weight/Line/Tone) altı | P2 | Karar bekliyor | — |

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

### R4. Özel imleç
- **Açıklama:** Çizgilerin üzerinde bir halka, bir işin görselinin üzerinde "AÇ". Yalnız ince işaretçide
  (`pointer: fine`). Dokunmatikte ve hareketi azaltılmış modda yok. Klavye odağını etkilemez.
- **Karar:** Biçim belli. Halkanın boyutu ve rengi R2 ile birlikte belirlenecek.
- **Dosyalar:** `engine/c2/main.js` (işaretçi işleyicileri, `pressable`), `engine/c2/style.css`,
  `shared/content/locales/*.ts` ("AÇ").
- **Bağımlılık:** R2.
- **Öncelik:** P2.

### R6. Lab bench girişleri
- **Açıklama:** Bench girişleri okunur boyutta olsun. Üzerine gelince çalışmanın kısa bir ön gösterimi
  oynasın. Dokunmatikte ön gösterim yok. Hareketi azaltılmış modda durgun kare gösterilir.
- **Karar:** Yapılacağı belli (2026-10-01). **Bekleyen:** ön gösterimin biçimi. Sitede çalışma kaydı (video)
  yok; iki yol var: kısa bir kayıt ya da çalışmanın küçük canlı hâli.
- **Dosyalar:** `app/components/lab/LabBench.vue`, `app/assets/css/lab.css`, `app/components/lab/Study*.vue`.
- **Bağımlılık:** yok.
- **Öncelik:** P2.

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

### R25. Linefield yayında açılsın mı
- **Bugünkü durum:**
  - Linefield `NUXT_PUBLIC_LINEFIELD` build bayrağının arkasında.
  - `docs/LINEFIELD.md`: "her yayın build'inde kapalı".
  - `docs/DEPLOYMENT.md`'nin yayın komutu bayraksız: `npm run generate`.
  - Yani bugünkü süreçle yayına Linefield'sız bir site çıkar. Bayrak kapalı build'de Linefield'ın tek baytı yok
    (doğrulanmış).
- **Açılması için gerekenler (karar verilirse):**
  1. Yayın komutu `NUXT_PUBLIC_LINEFIELD=1 npm run generate` olur. `DEPLOYMENT.md` ve kontrol listesi güncellenir.
  2. Tam kapı bayrak açık build'e karşı koşulur. Bugünkü kapı bayrak kapalı build'i bir taban çizgisiyle
     karşılaştırıyor; açık build için `LINEFIELD.md`'deki faz kontrolleri kapıya eklenir.
  3. İleride bayrak tümüyle kaldırılabilir (kod her zaman açık); ayrı bir karar.
- **Önizleme:** 2026-10-02'de güncel dalın bayrak açık build'i 4921'de (yerel ağ, `--wk`), bayrak kapalısı
  4910'da.
- **Karar:** Bekleyen.
- **Dosyalar:** `nuxt.config.ts`, `docs/DEPLOYMENT.md`, `docs/LINEFIELD.md`, `tools/diag/run6.sh`.
- **Bağımlılık:** R1 (birleştirme) ve R17 (yayın).
- **Öncelik:** P0 (yayın biçimini belirliyor).

### R26. Çalışma sayfalarının (Weight/Line/Tone) altı
- **Bugünkü durum (2026-10-02):** Çalışma sayfalarında site şeridi yok. Her çalışmanın altta kendi göstergeleri var:
  - **Weight:** altta bir şey yok; üstte başlık ve bir ölçek çubuğu.
  - **Line:** solda "02 Line · uzunluk · yapı", sağda canlı ölçüm ("%19 harcandı / %81 hâlâ kenarda"); üstte
    "EĞRİ 02 / 06".
  - **Tone:** solda kaynak düğmeleri (fotoğraf / arayüz / malzeme; kontrol), sağda "32 satır".
- **Öneri:** olduğu gibi kalsın. Line'ın ölçümü ve Tone'un düğmeleri çalışmanın kendi aletleri; site şeridi
  onların yerini alamaz, yanlarına da sığmaz. Bench'le tutarlılık yalnız "hangi çalışmadayım" bilgisiyle, o da
  üstte zaten var.
- **Karar:** Bekleyen.
- **Dosyalar:** `app/components/lab/Study*.vue`.
- **Öncelik:** P2.

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
| 2026-10-02 | R16: tam kapı başka bir oturumla aynı anda koşulabiliyor | `fix/audit-01-batch2` 4d8d833 | aşağıda |
| 2026-10-02 | R3: tek ipucu sistemi | `fix/audit-01-batch2` bc03881 | aşağıda |
| 2026-10-02 | R2: bakır = eylem rengi | `fix/audit-01-batch2` a21a96c | aşağıda |
| 2026-10-02 | R5: İşler'de "İNCELE →" ve telefonda okunur durgun önizleme | `fix/audit-01-batch2` dfbcc0b | aşağıda |
| 2026-10-02 | R24: İşler alanının ucundan tek çentik çıkıyor | `fix/audit-01-batch2` 40d54f1 | aşağıda |
| 2026-10-02 | R8: case study'lerin adresi, okunur "sonraki iş", satırları aralayan cep | `fix/audit-01-batch2` 526bc8e, c5e9b2a, 2e0f9a4 | aşağıda |
| 2026-10-02 | R7: Lab'de kaydırmak gezdirir, tıklamak açar; bench'in alt şeridi site şeridi; etiketlerdeki ikilenme | `fix/audit-01-batch2` (bu commit) | aşağıda |

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

**R7'nin ayrıntısı (2026-10-02; kullanıcı kararları aynı gün):**
- **Kural:** bench'te bir jest bir çalışma ilerletir. 01 → 02 → 03'ten sonraki aşağı jest iletişim finaline gider
  (bugünkü dikiş, p = 0); 01'den yukarı jest İşler'e.
- **Açma:** tıklama ya da bakır "AÇ →" çalışmayı açar. Başka bir etikete tıklamak onu seçer; bu kısayol olarak
  kaldı.
- **Varış:**
  - Finalden yukarı: 03 Tone.
  - Bir çalışmadan Geri ile (ya da çalışmanın kendi "← Lab"ı ile): o çalışma.
  - Diğer her yol: 01 Weight.
- **Tek jest = tek çalışma:** runtime'ın kuralı (`useLabSpine`). Bir akış 340 ms, tek çentik 240 ms sessizliğe kadar
  tek jesttir; her olay sessizliği yeniden başlatır. Ters yöne dönüş yeni jesttir. Parmakta bir dokunuş bir jest.
- **İpucu (R3'ün sistemi):** 2,5 sn girdi yoksa oturumda bir kez, alt şeridin ortasında. Masaüstünde "KAYDIRARAK
  GEZ · TIKLAYARAK AÇ", dokunmatikte "KAYDIRARAK GEZ · DOKUNARAK AÇ".
- **Alt şerit:** "LAB — 01 / 03" ve "KAYITLI" kalktı. Solda roller, sağda İstanbul ve durum; ana sayfa şeridiyle aynı
  kaynaktan. Final şeridiyle aynı ölçüde ve opak; finalin şerit yazılarındaki geçiş animasyonu kalktı. Şerit artık
  dikişte değişmiyor.
- **Etiketler:**
  - İkilenen yazı, seçili olmayan kayıtlara bilinçli eklenen "kayıt dışı ikinci baskı"ydı (`.nm::after`, 2,4 px
    kayık); kaldırıldı.
  - Etiket düğmelerinde stil sıfırlaması yoktu; tarayıcının gri düğme kutusu görünüyordu. O da kalktı.
  - Etiketler artık en az 44 px.
- **Dikiş (iki yönde piksel farkı 0):**
  - Yukarı yönde bench ilk karesini boş kanvasla boyuyordu (bir kare, 12 ms): R7'den önce de vardı, ölçülmüyordu.
    `ResizeObserver`'ın ilk çağrısı da kanvası silip bir kare boş bırakıyordu. İkisi de düzeldi.
  - İpuçları devirde iki tarafta da solmadan hemen gidiyor.
  - Finalden çıkarken satırın nefesi duruyor ve bir kare çıplak çiziliyor.
  - Ölçüm: aşağı yönde fark 0 piksel; yukarı yönde bench'in ilk iki karesi finalle 0 piksel farkla aynı, sıçrayan
    kare yok.
- **Harness'lar:**
  - Yeni `bench.cjs` (Chrome ve WebKit).
  - Yeni kurala göre yazılanlar: `seam.cjs` (yukarı yön screencast'le, alt şerit dahil), `spine.cjs`,
    `gesture2.cjs` (bench bölümü), `journey.cjs`, `touch.cjs`, `beckon.cjs`, `finale-a11y.cjs`.
- **Kontroller:** `bench` (Chrome ve WebKit); `seam` (3 koşu ve hareketi azaltılmış); `spine`; `beckon`;
  `finale-a11y`; gesture2 alt kümesi (flag-on ve flag-off); `trackpad`; `journey` (TR ve EN hareketi azaltılmış);
  `touch`; Linefield giriş ve çıkış; `workopen`; axe 0 (Lab dahil); typecheck: PASS.

**R8'in ayrıntısı (2026-10-02):**
- **Adresler** (526bc8e):
  - `/{locale}/work/{istanbul|ege|evden}`.
  - İşler'den açmak bir adım, "Sonraki" adresi değiştirir, Geri İşler'e döner.
  - Doğrudan adres işi ilk karesinde açar.
  - Düz sayfa, SEO, sitemap ve prerender; bilinmeyen bir iş 404 verir.
- **Okunur "sonraki iş"** (c5e9b2a): son karede sonraki işin görüntüsü satırların arasından okunuyor.
- **Cep (kullanıcı kararı "karma"):**
  - Cep satırları %40'a inceltiyor.
  - Metnin her satır kutusunun arkası tamamen boş. Kutular DOM'da ölçülüyor (`pocketLines`) ve karenin boşluk
    haritasına veriliyor (`states.js`, `clearLines`).
  - Ölçüm, sözcükler yerleşince çerçeve döngüsünde alınıyor. Doğrudan adresle açılan işte DOM henüz gösterilmeden
    kurulduğu için ilk denemede her şey 0 ölçüyordu; bu yüzden döngüde alınıyor.
  - **AA korundu:** `panelfit.cjs` kapının argümanlarıyla (Ege, Evden; 1920, 1440, 1280; TR, EN) 0 hatayla geçti,
    en kötü piksel 7,52:1 (eski cep 2,34:1). İstanbul 1440 ve 390'da 6,07:1.
- **Kontroller:** R8a, R8b ve R5 denetimleri; Linefield giriş, çıkış ve hareketi azaltılmış; `workopen` (on/off);
  `proj`; `journey` (TR ve EN hareketi azaltılmış); `spine`; axe 0; typecheck.

**R24'ün ayrıntısı (2026-10-02):**
- **Bulgu (febd93f'te de var):**
  - İşler alanının ucundan çıkmak için alan ±0,45 yol almalıydı; bir çentik 0,34 taşıyor.
  - 180 ms sessizlikten sonra alan kayda geri yaylanıyor. Bu yüzden 180 ms'den seyrek çentiklerle alandan hiç
    çıkılamıyordu: 330 ms arayla altı çentikte `wT` −0,18'i geçmedi.
  - `linefield.cjs`'in "back from Work" kontrolü zamanlamaya göre kalıyordu: eski ve yeni build'de 4 koşuda 2.
- **Karar (2026-10-02):** tek çentik alanın ucundan çıkar. Omurganın geri kalanında da bir çentik bir durak.
- **Değişiklik:** `GEST_EDGE` 0,25. Firefox'un çentiği (üç satır) 0,27 taşıyor. Alanı koşmuş bir jest hâlâ uçta
  duruyor (`GEST_INNER`, R12 kuralı aynı).
- **Kontroller:**
  - Yavaş çentikle Work'ten geri: 4/4 koşuda tek çentikte geçide.
  - Linefield girişi 3/3; Linefield çıkış ve hareketi azaltılmış.
  - gesture2 alt kümesi (flag-on ve flag-off) ve `trackpad.cjs` (24 atış; work, system, linefield).
  - `workopen` (on/off); `worktap`; `touch`; `journey` TR; `spine`; typecheck: PASS.

**R5'in ayrıntısı (2026-10-02):**
- **"İNCELE →" / "VIEW →":** her işin adının altında, her cihazda. İşler sütunu sitenin kendi gecesi (`#121212`),
  projenin mürekkebi değil; bu yüzden bakırın koyu zemin tonu (`#d4875a`, 6,6:1).
  - Telefonda adın altındaki satırı paylaşıyor; sütun uzamıyor.
  - Erişilebilir adı "İncele — Projeyi aç: {iş}" (görünen sözcükle başlıyor, WCAG 2.5.3).
  - Eski "Açmak için görseli basılı tut" yazısı kalktı; o jest artık R3'ün ipucu.
- **Telefonda durgun önizleme (kullanıcı kararı C, 2026-10-02):** dikey ekranda iş kayda oturup 0,4 sn hiçbir şey
  kıpırdamayınca gerçek görüntü, alanın kendi satırları arasından görünüyor. Maske satır aralığında; açık bantlar
  satırların üstünde.
  - Kaydırırken, basılı tutarken ve açılışta satırlar yalnız.
  - Hareketi azaltılmış modda da var. Geniş ekranlar satırlarla kalıyor.
- **Ayrıca:** telefon şeridinde Türkçe büyük harflerin noktaları kesiliyordu ("ISTANBUL · SEÇILI … AÇIGIM");
  ecc85fa düzeltti.
- **Kontroller:**
  - R5 denetimi 10/10.
  - Linefield çıkış ve hareketi azaltılmış; `workopen` (on/off); `worktap`; `touch`; `journey` (TR ve EN
    hareketi azaltılmış); `herotouch`; `spine`; axe 0; typecheck: PASS.
  - Linefield girişindeki "back from Work" zamanlamaya bağlı kalıyordu; R24 düzeltti.

**R2'nin ayrıntısı (2026-10-02):**
- **Tokenlar:** yazı `#9a4f22`, işaret `#b8622f`, siyah zemin `#d4875a`.
- **Bakır olmayanlar (kararla):**
  - Menü.
  - Projelerin kendi mürekkebi: hiçbir bakır orada 4,5:1'e ulaşmıyor. Case study eylemleri ve İşler alanı kâğıt
    rengi ve altı çizili kalır.
  - Finalin kalemle çizilen bağlantıları: mürekkep korunumu bozulmasın.
- **Bakır olanlar:** hero'daki Hakkımda, Hakkımda bölümündeki "daha fazla" ve yeni Kapat, uzun Hakkımda'nın
  eylem çağrısı ve "Geri", bench'teki "aç →", `/about`'taki "Geri", düz katmanın bağlantıları, finalin "kopyala"
  düğmesi.
- **Ölçüm:** 4,77–5,14:1, gerçek zemin piksellerine karşı. axe: 0.

**R3'ün ayrıntısı (2026-10-02):**
- **Kurallar** (kullanıcı kararları 2026-10-01 ve 2026-10-02):
  - İpucu alt şeridin ortasında, şeridin kendi mono yazısıyla çıkar.
  - Yalnız 2,5 sn girdi yoksa çıkar.
  - İlk girdide ya da yer değişince gider.
  - Her jestin ipucu oturumda bir kez gösterilir.
  - "aşağı kaydır" üç yerde sorulur: hero'nun ilk durağı, Linefield geçidinin sonu (ikisi arasında bir kez) ve
    iletişim varışı (kendi bir kezi var).
  - "basılı tut" yüzlerde, kendi jesti İşler'de sorulur.
  - Proje içindeki "kaydır" kalktı.
- **Kod:**
  - Yeni `engine/cues.js` (`CUE_IDLE`, `cueSeen`, `cueSpend`; `sessionStorage`, depolama yoksa sayfa başına bir
    kez).
  - Runtime: `cueFor` / `cueAsked`, `#cue` ve `.is-cueing`. Telefonda ipucu şeridi yalnız kaplar.
  - Şeridin sağ ucu (`#hint`) artık hep durum satırı.
  - Final: beckon (sözler ve nefes) varıştan 2,5 sn sonra, oturumda bir kez geliyor. Rehber de aynı modülü
    kullanıyor (2 sn → 2,5 sn).
- **Harness'lar:**
  - `beckon.cjs` ve `finale-a11y.cjs`'in p = 0 bölümleri artık bench'ten iniyor. Doğrudan `/contact`, düzeltme
    turu 1'den beri yerleşik açılıyor; bu yüzden o bölümler o günden beri kalıyordu. Bunu R3'ten önceki build'de de
    doğruladım: aynı 4 hata.
  - Telefon rehberi kontrolü sabit süre yerine durumu bekliyor.
  - `worktap.cjs` `#cue`'yu okuyor; `finale-guide` anahtarı `cue:finale-guide` oldu.
- **Kontroller:**
  - Runtime ipucu denetimi 1440 ve 390'da: 25 kontrol PASS.
  - `beckon` iki koşuda PASS; `finale-a11y` PASS.
  - Linefield giriş, çıkış ve hareketi azaltılmış; `workopen` (on/off); `worktap`; `journey` (TR ve EN
    hareketi azaltılmış); `herotouch`; `spine`; `seam`; typecheck: PASS.

**Kullanıcı kararıyla kapatılanlar:**
- HAKKIMDA odası (AUDIT-01 §9 madde 4): atlandı; 1. turdaki kâğıt bant kalıyor.
- Ege PSI rakamları: olduğu gibi kalıyor.
