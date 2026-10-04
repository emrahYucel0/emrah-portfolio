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

Son güncelleme: 2026-10-02, `fix/audit-01-batch2` (R12, R16, R3, R2, R5, R24, R8, R7 ve AUDIT-01 §9'un son satırı
tamamlandı; R26 kararla kapandı). Kalan her madde bir karar, gerçek cihaz ya da yayın bekliyor. Dalın ucu
`audit-01-batch2-rc` etiketiyle işaretli; birleştirmeyi Linefield oturumu yapacak.

---

## Durum özeti

| # | Madde | Öncelik | Karar | Bağımlılık |
|---|---|---|---|---|
| R1 | Birleştirme: düzeltme turu 2 → `main`, yayın dalı | P0 | **Bitti** (2026-10-02, `4d64ac8`) | — |
| R4 | Özel imleç | P2 | Kısmen: halkanın boyutu ve rengi bekliyor | — (R2 bitti) |
| R6 | Lab bench girişleri: okunur boyut, üzerine gelince ön gösterim | P2 | Kısmen: ön gösterimin biçimi bekliyor | — |
| R9 | Koyu zeminlerde satır titreşimi | **P0** (R18 için) | Neden açık; önce ölçüm | — |
| R10 | Safari'de adın ince kesimle çizilmesi | P1 | **Kapandı** (2026-10-04: iPhone'da kalın; Playwright WebKit artefaktı) | R22 |
| R11 | Yavaş ağda ilk kare (8,9 sn) | P2 | Önce değerlendirme | — |
| R13 | Gövde metni ve tipografik hiyerarşi | P1 | Karar bekliyor (ölçek) | — |
| R14 | Cross Section (İşler → Lab köprüsünün yerine) | P1 | **Yayın adayı hazır** (`df5ab32`, paket hazır; iPhone kontrolü ve yükleme bekliyor; `feature/cross-section`) | R2, R15 |
| R15 | Tempo, ilerleme göstergesi, performans bütçesi | P2 | Karar bekliyor | R14 |
| R17 | Yayın (DEPLOYMENT.md, CSP, canlı yedeği) | P0 | **Bitti** (2026-10-03, `b8918dc` canlıda) | — |
| R18 | Awwwards başvurusu (Developer Award) | P0 | Karar bekliyor (tarih) | R17, R9, R22, R23 |
| R19 | Full-Stack'in siyah kapsüllerinin çevresindeki hale | P1 | Karar bekliyor (varyant ya da kural) | — |
| R27 | Harness'lar izlenen `docs/` yollarına yazıyor | P2 | **Bitti** (2026-10-03) | — |
| R28 | Mac dokunmatik yüzeyinde ikinci kaydırmanın yutulması (120 Hz) | **P0** | **Canlıda (`1e663bd`); gerçek MacBook onayı bekliyor** | R22 |
| R20 | Arka belleğe piksel sayısı tavanı (önerilen 8,3 Mpx) | P1 | **Karar verildi:** bu yayında yok; görüntü kalitesi turunda R9 ve R19 ile kendi adımı | R9, R19 |
| R21 | Büyük ekranlarda büyük harf başına satır sayısına üst sınır | P2 | Karar bekliyor (sanat yönetimi) | — |
| R22 | Gerçek cihaz testi (iPad, Mac'te Safari, Android telefon) | P0 | Karar verildi | — |
| R23 | Awwwards başvuru malzemesi (ekran görüntüleri, kısa video, başlık, açıklama) | P0 | Karar bekliyor (içerik) | R9 |
| R25 | Linefield yayında açılsın mı | P0 | **Karar verildi: açık. Bitti** (`fb01609`) | — |

---

## Yapılacaklar

### R1. Birleştirme: düzeltme turu 2 → `main`
- **Açıklama:** `fix/audit-01-batch2`, febd93f'ten açıldı (yerel `main`: Linefield ve düzeltme turu 1); ucu
  `audit-01-batch2-rc` etiketiyle işaretli (b4054e7'den etiketlenen commit'e kadar). Henüz `main`'e birleşmedi.
  Birleşmeden önce tam kapı koşulacak. `origin/main` hâlâ b04e1ed'de.
- **Karar (2026-10-02):** Birleştirmeyi ve kapıyı Linefield oturumu yapar (`main` o worktree'de açık). Bu oturum
  birleştirmez ve push etmez. Dal yedek olarak origin'de (74d1757'ye kadar); etiket push edilmedi.
- **BİTTİ (2026-10-02).** Düzeltme turu 1 `febd93f` ile, turu 2 `4d64ac8` ile `main`'e birleşti (rebase değil,
  merge). `pre-audit-merge` ve `pre-batch2-merge` etiketleri birleşmelerden önceki uçları işaretliyor. Hiçbiri
  push edilmedi.
- **Yayının kaydetmesi gereken bilinen sorunlar:**
  - R9: koyu zeminlerde satır titreşimi (canlıda da var; nedeni açık).
  - R10: kapandı (2026-10-04). Gerçek iPhone'da ad ve Cross Section sözcükleri kalın; Playwright WebKit'teki ince
    kesim bir artefakt.
  - R7 telefonda: otomatik koşular (WebKit ve Chrome, dokunmatik, yerel ağ) geçti, gerçek iPhone'da yeniden
    bakılmadı (R22). Finalden parmakla yukarı çıkış WebKit'te sınanamıyor, yalnız Chrome'da sınandı.
  - Tam gesture2 takımı (yaklaşık 67 dk) bu dalda koşulmadı; alt kümesi koşuldu.
  - Hareketi azaltılmış modda bench ↔ final dikişi anında bir kesme (tasarım gereği, bench'te perde yok).
  - `spine`'ın momentum kuyruğu kontrolü makine yüklüyken kalabiliyor (febd93f'te de; yük kalkınca geçiyor).
- **Dosyalar:** `tools/diag/run6.sh`, `docs/contact-finale/LINEFIELD-MERGE.md`, `docs/audit/AUDIT-01.md` §10.
- **Bağımlılık:** tam kapı. R16 yapıldı: başka bir oturum durmadan, kendi portlarıyla koşulabilir.
- **Öncelik:** P0.

### R4. Özel imleç
- **Açıklama:** Çizgilerin üzerinde bir halka, bir işin görselinin üzerinde "AÇ". Yalnız ince işaretçide
  (`pointer: fine`). Dokunmatikte ve hareketi azaltılmış modda yok. Klavye odağını etkilemez.
- **Karar:** Biçim belli. **Bekleyen:** halkanın boyutu ve rengi. R2 bitti (bakır yalnız DOM eylemlerinde); halkanın
  bakır mı mürekkep mi olacağı kullanıcının kararı.
- **Dosyalar:** `engine/c2/main.js` (işaretçi işleyicileri, `pressable`), `engine/c2/style.css`,
  `shared/content/locales/*.ts` ("AÇ").
- **Bağımlılık:** yok (R2 tamamlandı).
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
- **Kapandı (2026-10-04).** Kullanıcı gerçek iPhone'unda baktı: SURFACE, EDGE, DEPTH ve kahraman adı ("EMRAH YÜCEL")
  istendiği gibi **kalın** çiziliyor. Playwright WebKit'teki ince kesim **Playwright'ın WebKit yapısına özgü bir
  artefakt**; gerçek Safari'de yok. Font yüklemesi değiştirilmedi. Harness'lerde WebKit'teki ince kesim bir hata
  sayılmaz.

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
- **Karar (2026-10-02, 1 — sözcükler):** SURFACE / EDGE / DEPTH **İngilizce kalır**, iki dilde de. Çevrilmez:
  bunlar malzemenin adı, sayfanın metni değil (Linefield'ın iki dilli sözcüklerinden ayrılan yer burası).
- **Karar (2026-10-02, 2 — tasarım):** Onaylanan `cross-section-v2.html` düzeni:
  - Yüzeyler lamel (slat) olarak durur; **ön yüzlerinde SURFACE, arka yüzlerinde DEPTH**.
  - Kesit anında lameller **tam profilden** (edge-on) tutulur — kesit tam o an görülür.
  - **EDGE bakır çizginin çevresinde duraklarla döner**; varsayılan **iki durak**, bir sabit olarak tutulur.
  - **Yörünge halkası yok.**
  - **Sert bir fiske o anı asla atlamaz**: kesit anı tek bir hareketle geçilemez (R24 ve bir-hareket-bir-durak
    kuralıyla aynı aile; Cross Section'ın kendi kapısında ayrıca sınanır).
- **Durum: sürüyor (2026-10-04: Faz C, C3 onay bekliyor).** Dal `feature/cross-section`, worktree `emrah-portfolio-cross`. Faz A (yalnız
  okuma, plan) onaylandı; Faz B (sahne, `?cross=1` arkasında, yalnız geliştirmede) başladı. Kaynak belge:
  `docs/CROSS-SECTION.md`. Referans demo: `docs/reference/cross-section-v2.html`.
- **Karar (2026-10-03, Faz A onayı):**
  1. **Teknik B:** lameller C2'nin kendi shader'ında (bir varyant); bakır çizgi ve EDGE küçük bir DOM katmanı.
     Faz B önce Intel performans ölçümüyle başlar (`csperf`, kullanıcının makinesinde); geçmezse C'ye (kanvas 2D
     lamel çizici) geçilir ve kullanıcıya söylenir.
  2. **Hareketi azaltılmış mod kesme olarak kalır**, sitenin geri kalanı gibi; `flat.js`'e çapraz geçiş eklenmez.
     `docs/LINEFIELD.md`'deki "çapraz geçiş" ifadesi düzeltildi (`flat.js` tek yuva çiziyor).
  3. **Tempo hedefi:** İşler → bench toplam **yaklaşık 5 jest** (kısa dönüş ve taşıma, bandın durakları). Kesin
     aralıklar Faz B'de cihazda ayarlanır ve R15'e karşı kaydedilir.
  4. **Atmosfer:** Faz B'de iki sürüm yan yana gösterilir, kesit anında demonun sıcak parıltısıyla ve onsuz;
     seçim kullanıcının.
  5. **DEPTH → bench:** Faz C hedefi, panjurun canlı bench'in üstünde açılması (`'cs'` ekran sahipliği durumu).
     iPhone'da ya da tam kapıda kırılgan çıkarsa yedek: DEPTH opakken rota değişir, kanvas bench'in üstünde
     solar. **İki durumda da sert kesme yok.**
  6. **EDGE noktasını korur:** `EDGE.`
- **Faz B (2026-10-03, inceleme bekliyor).** Ayrıntı `docs/CROSS-SECTION.md`'de.
  - **Teknik B kuruldu ve ölçüldü.** Intel UHD'de, iyileştirmeden sonra bile sıradan bir yerin yaklaşık iki katı
    tutuyor: 1440×900@2'de GPU 31,7 ms, kontrol 16,0 ms. **Geçmedi.** Karar 1 gereği C'ye geçildi.
  - **Teknik C.** C2'nin kendi düz SURFACE/DEPTH resimleri doku olarak kullanılıyor; lameller perspektifte
    geometri olarak çiziliyor.
  - **Maliyet.** 1440×900@2'de GPU 10,5 ms, kontrol 15,9 ms; 1920×1080@1'de 7,9 ms, kontrol 11,4 ms. Geçti.
  - **Durgun hâlde.** Lameller C2'nin kendi karesini veriyor: 1440×900@2'de ön yüz 0 piksel farkla.
  - **Titreşim ölçülmedi.** Kalibre edilen iki ölçü de ayırt etmedi; cihazda değerlendirilecek.
  - **Bayrak kapalı build.** Canlı paketle (`1e663bd`) build kimliği ve zaman damgası dışında bayt bayt aynı.
- **Karar (2026-10-03, Faz B onayı — olduğu gibi):**
  1. **Parıltı açık.** Kesit anında demonun sıcak atmosferi, ışık süpürmesi ve EDGE'in halesi kalıyor
     (`CS_GLOW`).
  2. **Kenarların bakırı R2 tokenlarında** kalıyor: `#b8622f`'ten `#d4875a`'ya. Demonun şeftali tepesi
     kullanılmıyor.
  3. **Sözcükler sitenin satırlarından** yapılıyor.
  4. **Tempo ölçüldüğü gibi:** İşler → bench 5 jest. İşler'den çıkan jest lamelleri doğrudan banda döndürür; bench'ten
     önceki durak DEPTH.
- **Karar (2026-10-03, Faz C onayı):** önerilen varsayılanlarla.
  - Koyu ucun zemini `#111215` (DEPTH kâğıdı).
  - Yatay telefon kuralı önerildiği gibi.
  - Sıra: önce C1 + C2, İş dikişi için durulur. Tam kapıdan önce sorulur.
- **Faz C, C1 + C2 (2026-10-03, onay bekliyor).** Ayrıntı `docs/CROSS-SECTION.md`'de.
  - **Yer.** Cross Section omurgada bir yer: `work · cross · lab`.
  - **Tempo.** 5 jest; bir jest bir konum. Sert fiske bandı atlamıyor; dokunmada da (Chrome ve WebKit).
  - **İş dikişi yapı gereği aynı.** Lamellerin uçtaki karesi C2'nin karesiyle 1440×900'de 0 piksel farklı; inişler
    her boyutta 0 piksel. Telefonda en çok 1 seviye.
  - **Başlık atlaması.** Yeri kelimesiz geçiyor.
  - **Bayrak kapalı build.** Canlı paketle bayt bayt aynı JavaScript.
  - **Bench çıkışı şimdilik yolculukla** (C3 perde açılmasını getirecek).
  - **Açık:** iPhone'daki ince sözcük sonucu bildirilmedi (R10). **Kapandı 2026-10-04:** iPhone'da kalın.
- **C2 onaylandı (2026-10-04).** Kullanıcının masaüstünde, sert yenilemeden sonra sahne baştan sona çiziliyor. İş
  dikişi onaylandı. Kullanıcının DPR'si şu an 1; Cross Section kontrolleri DPR 1 ve 2'de koşuyor (KNOWN-ISSUES, R9).
  Masaüstü düzeyinde ekran görüntüsü ya da kayıt asla alınmaz.
- **Faz C, C3 (2026-10-04, onay bekliyor): DEPTH ⇄ bench dikişi.** Ayrıntı `docs/CROSS-SECTION.md`'de.
  - **İleri.** DEPTH'ten bir jest daha: panjur canlı bench'in üstünde açılıyor. Rota opak DEPTH'in altında değişiyor
    (`'cs'` ekran sahipliği); bench 01'de açılıyor.
  - **Geri.** Bench'te 01'deyken yukarı jest panjuru kapatıyor, DEPTH'e varılıyor. Lab'dan yukarı çıkış artık
    Cross Section'ı atlamıyor; yol iki yönde de 5 jest. Lab şeridindeki İŞLER bağlantısı bir atlama olarak kalıyor.
  - **Yedek hazır:** `CS_REVEAL = 'fade'` (rota DEPTH altında değişir, kanvas solar). Hazır olmayan bir çalışma
    ortamında Lab'dan yukarı jest DEPTH'e kesmeyle varıyor; atlama yok.
- **C3 onaylandı (2026-10-04)** (masaüstü ve iPhone). R10 kapandı.
- **Faz C, C4 + C5 (2026-10-04, son kapıyı ve entegrasyon onayını bekliyor).** Ayrıntı `docs/CROSS-SECTION.md`'de.
  - **Masaüstünde panjur.** Masaüstündeki lameller zaten telefondakilerle aynı CSS piksel boyundaydı (~20 px); fark
    sayıdaydı: masaüstünde 45, telefonda 29. Panjurun kendi lamelleri artık alanın en az %3,5'i (telefonun payı):
    1920×991'de 5 satır, 33 px, 27 lamel. Telefon onaylandığı gibi kalıyor. Dikiş ölçümleri 0 px.
  - **Telefonu çevirmek.** SURFACE'ta, bantta, DEPTH'te, lameller dönerken ve panjur sırasında konum korunuyor;
    yeni görünümü gören ilk karede yeni boyutta çiziliyor (Chrome ve WebKit). Önceden panjur sırasında hiç yeniden
    çizilmiyordu.
  - **Yatay telefon kuralı:** 520 px altında satırlar 5,2 px'ten sık değil (844×390'da 19 lamel); EDGE yükseklikten.
  - **Hareketi azaltılmış mod:** her konum bir kesme; bantta EDGE anı durağan bir resim olarak (bakır çubuklar,
    çizgi, EDGE).
  - **Bayrak kapalı build:** canlı paketle aynı JavaScript ve CSS.
- **Entegrasyon onaylandı (2026-10-04)** (masaüstü ve iPhone).
- **Yayın adayı (2026-10-04, yüklenmedi).** Ayrıntı `docs/CROSS-SECTION.md` ve `docs/DEPLOY-LOG.md`'de.
  - **Duyarlı tarama:** 29 boyut (telefon, tablet, dizüstü, masaüstü, geniş; DPR 1–3, 1,25 ve 1,5 dahil) geçti. İki
    dar düzeltme: uzun telefonlarda panjur lamelleri telefona benzetildi; kesirli DPR'de şerit sınırındaki satır C2'nin
    kendisi.
  - **Yayında varsayılan olarak açık** (R25 gibi). Tek satırlık kapatma: `NUXT_PUBLIC_CROSS=0`; bu build canlı paketle
    JS ve CSS'te bayt bayt aynı.
  - **Kapı (bayrak açık, dört grup, sessiz makine):** iki bilinen durum dışında hepsi geçti; ikisi de canlıda da var
    (LAB A11Y `.hint`, GESTURE hızlı fiskeler).
  - **Paket:** `deploy/yucelemrah-df5ab32.zip`, SHA-256 `9a627488d516721a…`, 220 dosya, 8,9 MiB.
  - **Yayın onaylandı (2026-10-04)** kullanıcının iPhone kontrolünden sonra. `main` ileri sarıldı ve push edildi.
    Paket `df5ab32`'den; sonraki commit'ler yalnızca belge. Yüklemeyi kullanıcı cPanel'den elle yapıyor.
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
- **R14'ten (2026-10-03):**
  - **Hedef.** Cross Section'da İşler → bench yaklaşık 5 jest (kullanıcı kararı).
  - **Ölçülen.** Faz B'nin hata ayıklama girişinde geçit 4 jest (dönüş, yanında, önünde, bırakıp taşıma); bench'e
    çıkışla birlikte 5. Mouse çentiği, 60 Hz kaydırma ve 120 Hz fiske aynı sayıyı veriyor (`cstempo.cjs`).
  - **Kesin aralıklar** cihazda ayarlanacak.
- **Öncelik:** P2.

### R17. Yayın
- **Açıklama:**
  - `docs/DEPLOYMENT.md`'ye göre yayın.
  - Canlıda CSP doğrulaması: `.htaccess`'teki hash'ler, `cspboot.cjs`.
  - Yayından önce canlı sitenin yedeği.
- **BİTTİ (2026-10-03).** `b8918dc` canlıda. Paket `deploy/yucelemrah-b8918dc.zip` (219 dosya, 8,9 MiB,
  SHA-256 `08b27a0274508771…`) cPanel'den yüklendi ve kullanıcı tarafından canlıda doğrulandı; `origin/main`
  yüklemeden önce `b8918dc`'ye ileri sarıldı (fast-forward, force yok). Yüklemeden sonra bu makineden:
  `cspboot --static https://yucelemrah.com` geçti (/tr, /tr/lab, /en — her satır içi betik politikada adlı),
  `cspboot https://yucelemrah.com chrome` ve `webkit` geçti (çalışma zamanı ayağa kalkıyor, `data-c2` açık,
  belge kaydırma çubuğu yok). Canlı omurga: `name · creative · system · linefield · work · lab · rest` —
  **Linefield yayında** (R25) — `/tr/contact` 200, sayfa hatası yok. Kayıt: `docs/DEPLOY-LOG.md`.
  Bu, Contact finali, Linefield ve iki düzeltme turunu bir ziyaretçiye ilk kez gösteren yükleme.
- **Dosyalar:** `docs/DEPLOYMENT.md`, `docs/DEPLOY-LOG.md`, `modules/production-files` (.htaccess ve CSP
  hash'leri), `tools/diag/cspboot.cjs`.
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
- **Karar (2026-10-04):** Cross Section yayınında yok. Görüntü kalitesi turunda R9 ve R19 ile birlikte kendi adımı
  olacak. Ölçüm (`docs/CROSS-SECTION.md`, duyarlı tarama): 3840×2160@2'de arka bellek 18,7 Mpx. Bu Intel UHD'de
  sıradan bir yer 101 ms, Cross Section 74 ms; 8,3 Mpx tavanla ikisi de yaklaşık yarıya iniyor (45 ms ve 34 ms).
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
- **Karar (2026-10-02): AÇIK. BİTTİ (`fb01609`).** Linefield yayın build'inde varsayılan olarak açıktır; bir
  yayın, adını taşıdığı özelliği unutamaz. `nuxt.config.ts` bayrağı tersine çevrildi: yalnız
  `NUXT_PUBLIC_LINEFIELD=0` (ya da `false` / `off` / `no`) kapatır — tek satırlık bir kapatma anahtarı olarak
  duruyor. `DEPLOYMENT.md`'nin yayın komutu ve kontrol listesi güncellendi (pakette Linefield var mı diye bir
  grep dahil). Tam kapı hem bayrak açık hem bayrak kapalı build'e karşı koşuldu.
- **Dosyalar:** `nuxt.config.ts`, `docs/DEPLOYMENT.md`, `docs/LINEFIELD.md`, `tools/diag/run6.sh`.
- **Bağımlılık:** R1 (birleştirme) ve R17 (yayın).
- **Öncelik:** P0 (yayın biçimini belirliyor).

---

### R28. Mac dokunmatik yüzeyinde ikinci kaydırmanın yutulması (özellikle 120 Hz)

- **Açıklama.** Mac'te momentum kaydırması sürerken parmakları yere koymak momentumu anında kesiyor; ardından
  kısa bir sessizlikten sonra yeni kaydırmanın olayları başlıyor. Bu, jürinin çoğunun kullandığı hareket. Ölçüm
  (`tools/diag/mactrack.cjs`, 48 yargılanan durum): **ikinci kaydırma, elin gerçekten bıraktığı 80-250 ms'lik
  sessizliklerde sık sık yutuluyor.** 400 ms sessizlikte her zaman duyuluyor.
- **Neden — tek bir sabit.** `engine/c2/main.js`:

  ```js
  rise = mag > GEST_FLOOR && perFrame > A.gEnv * GEST_RISE && A.gEnv < A.gPeak * GEST_FALLEN
  ```

  `GEST_FLOOR` **0,12 durak**, ve 1 piksel tekerlek = 0,0011 durak; yani eşik **tek bir olayda 109 piksel**.
  - 60 Hz Mac kaydırması: parmak rampası en çok 44 piksel (eşiğin altında), ama kendi momentumunun ilk olayı
    190 piksel = 0,21 durak — eşiği **geçiyor**. Bu yüzden 60 Hz genelde duyuluyor, 7. olay civarında.
  - **120 Hz (ProMotion): en büyük olay, momentumu dahil, 95 piksel = 0,105 durak — eşiğin ALTINDA.** Yani bir
    120 Hz akışı yükselişle (rise) **hiçbir zaman** yeni bir hareket açamaz; tek girişi 340-400 ms'lik boşluk.
- **Önerilen düzeltme (sonraki yayın).** Eşiği **olay başına değil kare başına** ifade etmek: `perFrame` zaten
  olay sıklığına göre normalleştiriyor (`mag / clamp(gap / GEST_FRAME, 1, GEST_COALESCED)`), dolayısıyla
  `mag > GEST_FLOOR` yerine `perFrame > GEST_FLOOR` benzeri bir ölçüt, 120 Hz'in küçük ama sık olaylarını içeri
  alırken sönümlenen bir momentum kuyruğunu almaz. Tek satır, ama Step 6'nın (bir hareket = bir durak) koruduğu
  kuralın tam ortasında.
- **Doğrulama sırası.** Önce **gerçek bir MacBook'ta** doğrulanır (R22) — bugünkü ölçüm Windows'ta Chrome ile
  oynatılmış bir yeniden kurgu, gerçek bir Mac değil. Sonra düzeltilir ve **`gesture2`, `trackpad` ve `mactrack`**
  kapılarından yeniden geçirilir; `mactrack`'in 400 ms satırı zaten 12/12, düzeltmeden sonra 80-250 ms satırları
  da dolmalı ve `trackpad`'in 140 durumu bir durak kuralını bozmamalı.
- **DÜZELTİLDİ (2026-10-03, `fix/r28-mac-second-swipe`).** İki parça, beş satır kod:
  1. **Eşik kare başına okunuyor.** `clamp(gap / GEST_FRAME, 1, …)` yalnız BÖLER; yarım kare sonra gelen bir olay
     hâlâ "bir olaylık" sayılıyordu. Bölen `GEST_DENSE = 0.5`'e inince, 8,33 ms'de bir gelen 95 piksel **kare
     başına 190 piksel** okunuyor — 60 Hz'in tek olayda gönderdiğiyle birebir aynı. `Math.max(mag, inFrame)`
     kullanıldı, takas değil: seyrek bir akışta olayın kendi boyu gerekir (300 ms sonraki bilinçli bir fare
     çentiği 120 piksel ama kare başına 15 pikseldir), yani kural **ancak daha fazlasını kabul eder, daha azını
     değil**.
  2. **Durmuş bir akış sönmüştür.** `gEnv < gPeak * GEST_FALLEN` zarfı okur, zarf da yalnız olay başına söner;
     parmaklar yere konup momentum kesilince zarf olduğu yerde **donuyordu** (ölçüm: 300 ms'de kesilince
     env/peak 0,535, yarının hemen üstünde), yani hiç yükseliş mümkün olmuyordu. `quiet = gap > GEST_STREAM`
     eklendi: 120 ms'den geniş bir boşluk akışın bittiğini söyler. **Sönen bir kuyruk bunu kullanamaz** — kendi
     olayları 8–17 ms aralıklıdır, 120 ms'lik bir delik bırakmaz.
- **Ölçümler.** macOS ikinci kaydırma: **48 durumda 21 yutulma → 4**; 120 Hz artık 60 Hz ile aynı seviyede.
  Windows hassas dokunmatik: PASS. `trackpad` 7 şeklin 140 durumu: **PASS, sıfır taşma**. Serbest dönen tekerlek
  (`freespin.cjs`, iki motorda 105'er dönüş): **350 ms'ye kadar birebir aynı** — yani `quiet`'in yönettiği bütün
  aralıkta fark yok. Hızlı kontroller: `touch`, `spine`, `linefield` (148 ok), `bench`, `workopen`, `worktap`,
  `worktext` — hepsi PASS.
- **R28'in yapmadığı iki şey, ikisi de ayrı kayıtlı:** 450–600 ms'lik son çentiklerde serbest dönen tekerleğin
  ikinci durak alması, ve `long` şeklinin akış ortasında ikinci durak alması. İkisi de R28 öncesi motorda da var
  (ikincisinde **daha sık**: 10 koşuda 3'e karşı 1), ikisi de bu yayında değiştirilmedi.
- **CANLIDA (2026-10-03, `1e663bd`).** `deploy/yucelemrah-1e663bd.zip` cPanel'den yüklendi ve kullanıcı
  tarafından canlıda doğrulandı. Yüklemeden sonra bu makineden: `cspboot --static`, `cspboot ... chrome` ve
  `... webkit` — üçü de geçti. Ayrıca düzeltmenin kendi imzası canlıda sınandı, yalnız "açılıyor mu" diye değil:
  8 ms'de bir 95 piksel gönderen bir akış — 120 Hz'lik bir dokunmatik yüzeyin momentum biçimi, eski olay başına
  eşiğin ALTINDA, yeni kare başına eşiğin ÜSTÜNDE — indeksi bir durak hareket ettirdi. Kayıt:
  `docs/DEPLOY-LOG.md` (Not 4).
- **R22 AÇIK KALIYOR.** Buradaki her şey Windows'ta Chrome ile oynatılmış bir macOS yeniden kurgusudur; hiçbir
  Apple donanımına dokunulmadı ve harness gerçek bir ProMotion'ın 8,33 ms'si yerine ~10 ms veriyor. **Gerçek bir
  MacBook'ta denenene kadar bu düzeltme kapanmış sayılmamalı** — canlıda olması onaylandığı anlamına gelmez.
- **Not — harness'ın kendi hatası, kayıt için.** İlk tam koşuda iki durum "üç durak" göstermişti. Site bunu
  yapamaz: `A.pT` her harekette `A.gFrom ± 1`'e kıstırılıyor (`main.js:587`), yani üç durak üç hareket açılışı
  demek, ve gerçek bir 120 Hz akışı eşiği hiç geçemediği için üçüncüyü açamaz. Sebep harness'tı: vadesi gelen
  olayları **toplayıp tek bir tekerlek olayı** olarak gönderiyordu, ve rampanın beş olayı toplanınca 110 piksel
  ediyor — eşiğin üstünde. Uzun koşudaki zamanlama sapmasında bu, hiçbir dokunmatik yüzeyin göndermediği bir
  "süper olay" üretiyordu. Artık her olay **ayrı ayrı** gönderiliyor; aynı iki durum 6/6 yeniden koşuldu, üç
  durak bir kez bile çıkmadı ve sonuç belirlenimli hâle geldi.
- **Öncelik:** P0 (sonraki yayın). **Bağımlılık:** R22 (gerçek MacBook).

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
| 2026-10-02 | R7: Lab'de kaydırmak gezdirir, tıklamak açar; bench'in alt şeridi site şeridi; etiketlerdeki ikilenme (kullanıcı onaylı) | `fix/audit-01-batch2` 6954a14; telefon kontrolü 74d1757 | aşağıda |
| 2026-10-02 | AUDIT-01 §9, düz katman #11: runtime'ın düz listesinde her iş kendi adresine gidiyor | `fix/audit-01-batch2` (bu commit) | AUDIT-01 §10 |

**AUDIT-01 §9 #11'in ayrıntısı (2026-10-02):** R8'in adresleri gelince yapıldı. Runtime'ın düz listesinde
(`#plain`) her iş artık dış siteye değil kendi adresine gidiyor: `openWorkAt`, işi alandan açılmış gibi açıyor (adres
bir adım, Geri İşler'e döner, odak işin özetinde). İşin sitesi yanında ayrı bir bağlantı (yeni sekme). Script'siz ana
sayfa zaten böyleydi. Kontroller: kendi denetimi TR ve EN, flag-on ve flag-off, Chrome ve WebKit; `workopen` (on/off);
axe 0.

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

**R27 — harness'lar izlenen yollara yazıyor (2026-10-02'de bulundu):**

`responsive.cjs` bir kez koştuğunda `docs/contact-finale/responsive/` altındaki 20 boyutun karesini,
`contact-sheet.png`'i ve `responsive.json`'u yeniden yazıyor. Yayın kapısında iki kez koştu ve finalin F3
turundan kalan **işlenmiş kanıtı** sessizce değiştirdi: commit öncesi 31 izlenen dosya değişmiş görünüyordu,
hiçbirine elle dokunulmamıştı. Bu yayın için `git checkout -- docs/contact-finale/` ile geri alındı.

Sorun yalnız `responsive.cjs` değil. İzlenen `docs/` yollarına yazan altı harness var:

| harness | yazdığı yer |
|---|---|
| `beckon.cjs` | `docs/contact-finale/f3b/` |
| `finale-a11y.cjs` | `docs/contact-finale/f3/` |
| `responsive.cjs` | `docs/contact-finale/responsive/` |
| `seam.cjs` | `docs/contact-finale/f2/` |
| `lfpair.cjs`, `lfsheet.cjs` | `docs/reference/linefield-v2.html` (yalnız **okuyor**; referans demo) |

**Yön:** ölçüm çıktısı yok sayılan `tools/diag/out/` altına yazılır; finalin inceleme kanıtı bulunduğu yerde
**donmuş** kalır. Bir kontrolün çıktısı, başka bir turun kanıtının üstüne yazılmamalı.

**BİTTİ (2026-10-03).** Dördü de yeniden yönlendirildi — `responsive.cjs` → `tools/diag/out/responsive/`,
`beckon.cjs` → `out/beckon/`, `finale-a11y.cjs` → `out/finale-a11y/`, `seam.cjs` → `out/seam/` — ve her birinin
başlığında nedeni yazıyor. `.gitignore`'a **tek bir kesin satır** eklendi,
`docs/contact-finale/responsive/findings/`; bilerek daha geniş değil, çünkü `docs/contact-finale/` altında 58
dosya izlenen belgedir ve bir yok sayma kuralı asla kaynağı gizleyebilecek durumda olmamalıdır. Yeniden
üretilebilir 144 PNG (26 MB) silindi.

**Doğrulama.** Dördü de birer kez koşturuldu ve `docs/` altındaki her dosyanın md5'i koşulardan **önce ve sonra
birebir aynı** çıktı (`67fe641f30402672ad8317cb21a89bf6`, 278 dosya, 0 bekleyen değişiklik). Kanıt bu kez
`tools/diag/out/{responsive,beckon,finale-a11y,seam}/` altına düştü. VS Code'daki 151 bekleyen değişiklik
11'e indi.

`lfpair.cjs` ve `lfsheet.cjs` dokunulmadı: `docs/reference/linefield-v2.html`'i yalnız **okuyorlar**.

**O zamana kadar:** bu harness'lardan biri koştuktan sonra, commit'ten önce `git checkout -- docs/contact-finale/`.
`seam.cjs record` da buna dahildir — hale/dikiş araştırması onu kullanıyor.
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

- **Kapı dikişi yalnız normal harekette koşuyordu.** `run6.sh` `seam.cjs`'i mod argümanı vermeden çağırıyordu,
  yani `REDUCED` false kalıyordu ve harness'ın `if (REDUCED)` ile korunan kendi azaltılmış-hareket iddiaları
  **hiç koşmamıştı**. Kapıya azaltılmış hareket satırı eklendi; bu yayında bir kez tek başına koşuluyor.
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
  - Ölçüm: aşağı yönde fark 0 piksel; yukarı yönde bench'in ilk karesi finalle 0 piksel farkla aynı, sıçrayan
    kare yok.
  - **Düzeltme (2026-10-02, yayın kapısından sonra).** Yayın kapısı bu dikişi `FAIL` bildirdi; iki nedenle, ikisi
    de kontrolün kendisinde:
    1. Yukarı yöndeki kontrol **bayt eşitliği** istiyordu (`anyPx === 0`); aşağı yöndeki ikizi ise ±8 parlaklık
       düzeyine izin veriyor (`overPx === 0`). Bench soğuk kurulduğunda alt şeridin üstündeki 1 piksellik tüy
       çizgi finalinkinden 28 düzey koyu (`rgb(145,144,141)` / `rgb(173,172,169)`) ve bu tek satır bayt eşitliğini
       kalıcı olarak bozuyordu. Kontrol artık **en çok bir piksel satırına** izin veriyor.
    2. Kapı paralel koşarken screencast ilk kareleri düşürüyor: kapının gördüğü ilk kare +141 ms'ti, yani bench
       kendini kaydetmeye başlayalı 220 ms olmuştu. Kontrol artık **yakalanan ilk kareye** bakıyor ve devirden
       sonraki 60 ms içinde kare gelmediyse `FAIL` değil `NOT MEASURED` yazıyor. Sıçrama ölçüsü de kare aralığı
       başına normalleştirildi (kapıda 4,53; sakin makinede 1,29 ve 1,74 — eşik 3).
  - **Bisect (2026-10-02).** Aynı harness beş build'de koşuldu (`seamup.cjs`); yukarı yönde bench'in ilk karesi:
    `b04e1ed` ortalama 13,05 (170.429 piksel 8 düzeyin üstünde) · `febd93f` 12,85 · `e4c6541` 12,83 (7 piksel
    aralıklı 127 tam genişlik satır, ortalama 94/255) · **`6954a14` (R7) 0,033 (1.440 piksel)** · **güncel `main`
    0,033**. Yani R7'den önce yukarı dikiş gerçekten de **bench'in bütün satır alanının bir an görünmesiydi**;
    R7 onu bir tüy çizgiye indirdi ve `main` R7 ile birebir aynı. Gerileme yok; bu yayın dikişin düzelmiş hâlini
    ilk kez yayına çıkarıyor. Ziyaretçinin olağan yolunda (bench'ten aşağı, sonra yukarı) fark **0 piksel**.
  - **Kapı artık hareketi azaltılmış modda da koşuyor.** Daha önce `seam.cjs` kapıda mod argümanı almıyordu, bu
    yüzden yalnız normal modda koşuyordu ve `if (REDUCED)` ile korunan kontrolleri hiç çalışmamıştı (`87ab3d6`).
    Bu yayında bir kez tek başına koşuldu: **geçti**.
- **Harness'lar:**
  - Yeni `bench.cjs` (Chrome ve WebKit).
  - Yeni kurala göre yazılanlar: `seam.cjs` (yukarı yön screencast'le, alt şerit dahil), `spine.cjs`,
    `gesture2.cjs` (bench bölümü), `journey.cjs`, `touch.cjs`, `beckon.cjs`, `finale-a11y.cjs`.
- **Kontroller:** `bench` (Chrome ve WebKit); `seam` (3 koşu ve hareketi azaltılmış); `spine`; `beckon`;
  `finale-a11y`; gesture2 alt kümesi (flag-on ve flag-off); `trackpad`; `journey` (TR ve EN hareketi azaltılmış);
  `touch`; Linefield giriş ve çıkış; `workopen`; axe 0 (Lab dahil); typecheck: PASS.
- **Telefon (2026-10-02):** kullanıcının iPhone'u (Safari, gizli sekme, 4921) Lab'i R7 öncesi gibi gösterdi: şeritte
  "KAYITLI", tek kaydırmada iletişim.
  - **Sunucu tarafı:** 4910 ve 4921 `0.0.0.0`'da tek süreç. IP'den ve 127.0.0.1'den aynı baytlar geliyor, build
    kimliği klasördekiyle aynı. Yanıtlar `no-store`. Build HEAD'den sonra değişen kaynak içermiyor. Güncel kodda
    görünür bir "KAYITLI" yok; yalnız ekran okuyucu durumunda var.
  - **Bulunan boşluk:** `bench.cjs`'in telefon bölümü parmağı Chrome'un CDP'siyle sürüyordu, WebKit'te hiç
    koşmuyordu. Artık `node bench.cjs <port> webkit <host> --phone` WebKit'te dokunma pointer olaylarıyla kaydırıyor,
    Playwright'ın dokunuşuyla açıyor, şeridi denetliyor ve her adımın karesini alıyor.
  - **Sonuç:** WebKit, 390 px, dokunmatik, `192.168.1.102` üzerinden 4921 ve 4910'da; Chrome dokunmayla 4921'de
    (finalden parmakla yukarı dahil): PASS.
  - Gerçek iPhone'da yeniden bakılacak (R22). Otomatik sonuç cihaz doğrulaması sayılmaz.

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
- R26, çalışma sayfalarının (Weight/Line/Tone) altı (2026-10-02): göstergeler kalıyor; site şeridi oraya gelmiyor.
  Line'ın canlı ölçümü ve Tone'un kaynak düğmeleri çalışmanın kendi aletleri.
- Durum cümlesi "İSTANBUL · SEÇİLİ PROJELERE AÇIĞIM" (2026-10-02): kullanıcının kararı, olduğu gibi kalıyor.
- HAKKIMDA odası (AUDIT-01 §9 madde 4): atlandı; 1. turdaki kâğıt bant kalıyor.
- Ege PSI rakamları: olduğu gibi kalıyor.
