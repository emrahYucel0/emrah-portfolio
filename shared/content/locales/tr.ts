import type { LocaleCopy } from '../types'

/** replaced at transform time by the bundler; see the note in nuxt.config.ts */
declare const __LINEFIELD__: boolean

// Turkish is a first-class experience, not a translation layer. The About prose is Emrah's own approved copy.
// Professional role names (Creative Developer, Full-Stack Developer), brand names and the two face words stay
// as they are: they are positioning, not language.
export const tr = {
  meta: {
    home: {
      title: 'Emrah Yücel — Creative Developer & Full-Stack Developer',
      description:
        'Emrah Yücel, İstanbul merkezli bir Creative Developer ve Full-Stack Developer: etkileşim, frontend mühendisliği, backend sistemler, CMS, performans ve teknik SEO.',
    },
    about: {
      title: 'Hakkımda — Emrah Yücel',
      description:
        'Kimya ve endüstriyel üretimden creative development ve full-stack sistemlere — Emrah Yücel nasıl çalışır, ne kurar.',
    },
    lab: {
      title: 'Lab — Emrah Yücel',
      description:
        'Aynı malzeme, benim adım dışında bir şey üzerinde: alan ve bölüşüm, uzunluk ve yapı, satır ağırlığıyla kurulan görüntü.',
    },
    contact: {
      title: 'İletişim — Emrah Yücel',
      description: 'Emrah Yücel ile iletişim: e-posta, telefon, GitHub, LinkedIn. İstanbul, Türkiye.',
    },
    imageAlt: 'Emrah Yücel — Creative Developer ve Full-Stack Developer. Kâğıt üzerinde yatay mürekkep satırlarıyla dizilmiş isim.',
  },
  nav: { skip: 'Düz gezinmeye geç', skipContent: 'İçeriğe geç', label: 'Portfolyo', work: 'İşler', about: 'Hakkımda', lab: 'Lab', contact: 'İletişim' },
  roles: { creative: 'Creative Developer', fullStack: 'Full-Stack Developer', and: 've' },
  identity: {
    city: 'İstanbul',
    location: 'İstanbul, Türkiye',
    status: 'Seçili projelere açığım',
    positioning: ['Dokunduğun yüzeyi kuruyorum', 've altındaki sistemi'],
  },
  home: {
    intro:
      'Ben Emrah Yücel, İstanbul merkezli bir Creative Developer ve Full-Stack Developer’ım. Etkileyici dijital deneyimler tasarlıyor, arkalarındaki sistemleri kuruyorum.',
    positioning: 'Nasıl hareket ettiğini tasarlıyorum, üzerinde çalıştığı sistemi kuruyorum.',
    more: 'Hakkımda daha fazla',
    workHeading: 'İşler',
    labHeading: 'Lab',
  },
  about: {
    heading: 'Hakkımda',
    intro:
      'Ben Emrah Yücel, İstanbul merkezli bir Creative Developer ve Full-Stack Developer’ım. Dijital deneyimleri uçtan uca geliştiriyorum — etkileşim ve frontend mühendisliğinden backend sistemlerine, CMS yapılarına, performansa ve production süreçlerine kadar.',
    background:
      'Yazılıma giden yolum kimya ve endüstriyel üretimle başladı. Formülasyon, kalite kontrol ve teknik kısıtlarla çalışmak; sistemlerle düşünmeyi, varsayımları test etmeyi, önemli olanı ölçmeyi ve tekrarlanabilirliğe önem vermeyi öğretti.',
    transition:
      'Bu yaklaşım, yazılıma geçtiğimde de benimle kaldı. Hâlâ aynı şekilde çalışıyorum: önce sistemi anlarım, kısıtlarıyla çalışırım, sonra görsel ve teknik taraf tek bir şeymiş gibi hissedene kadar sonucu rafine ederim.',
    current:
      'Bugün; creative development, frontend, full-stack sistemler, CMS/admin mimarisi, performans ve teknik SEO üzerinde çalışıyorum.',
    status: 'Seçili projelere açığım.',
    capabilitiesHeading: 'Yetkinlikler',
    capabilities: [
      { text: 'Creative Development', lang: 'en' }, { text: 'Motion & Interaction', lang: 'en' },
      { text: 'Frontend Engineering', lang: 'en' }, { text: 'Full-Stack Development', lang: 'en' },
      ['CMS / ', { text: 'Admin', lang: 'en' }, ' Sistemleri'], 'Performans & Teknik SEO',
    ],
    back: 'Geri',
  },
  faces: {
    surface: {
      word: 'CREATIVE',
      role: 'Creative Developer',
      items: [
        { name: { text: 'Creative development', lang: 'en' }, note: 'Özgün görsel sistemler · etkileşim' },
        { name: { text: 'Motion & interaction', lang: 'en' }, note: 'Kaydırma · hareket · koreografi' },
        { name: { text: 'Frontend engineering', lang: 'en' }, note: 'Vue · Nuxt · TypeScript · Tailwind CSS' },
      ],
    },
    system: {
      word: 'FULL-STACK',
      role: 'Full-Stack Developer',
      items: [
        { name: { text: 'Full-stack development', lang: 'en' }, note: 'SSR · REST API · Prisma · kimlik doğrulama' },
        { name: 'CMS / admin sistemleri', note: 'Veritabanı tabanlı yayın ve düzenleme' },
        { name: 'Performans & teknik SEO', note: 'Metadata · routing · sitemap · yalın build' },
      ],
    },
    stack: 'Nuxt · Vue · TypeScript · Tailwind CSS · GSAP · Prisma',
  },
  /*
   * LINEFIELD is unreleased, so its copy leaves the published bundle with its code. The flag is a
   * build-time constant, so with it false this is `... {}` and the words are not in the file at all —
   * which is what the flag-off gate greps the built JavaScript for.
   */
  ...(typeof __LINEFIELD__ !== 'undefined' && __LINEFIELD__ ? { linefield: {
    heading: 'Nasıl düşünürüm',
    backendLabel: 'BACKEND — NASIL DÜŞÜNÜRÜM',
    frontendLabel: 'FRONTEND — NASIL DÜŞÜNÜRÜM',
    backendSaid: 'Durum, ölçek, hata, doğruluk',
    frontendSaid: 'His, zamanlama, sürtünme, ilk kare',
  } } : {}),
  work: {
    heading: 'İşler',
    intro: 'Hizmet markaları için uçtan uca tasarlanıp geliştirilmiş üç production sitesi.',
    open: 'Açmak için görseli basılı tut',
    openTouch: 'Açmak için görsele dokun',
    visit: 'Siteyi ziyaret et',
    allWork: 'Tüm işler',
    next: 'Sonraki',
    again: 'Yeniden',
    projectNav: 'Proje',
    projects: {
      istanbul: {
        strength: 'Özgün dijital yön',
        client: 'Ege Kent Nakliyat’ın İstanbul şehir içi markası',
        line: 'Alışılmış bir hizmet kategorisi, özgün bir dijital deneyim olarak ele alındı — kendi görsel dili, teknik illüstrasyonu ve çok yalın bir SSR yapısı.',
        role: 'Özgün görsel yön, yaratıcı frontend mühendisliği ve yüksek performanslı production.',
        facts: ['Özgün görsel dil ve teknik illüstrasyon', '39 ilçelik içerik yaklaşımı', 'Sınırlandırılmış fiyat hesaplayıcı', 'Admin / CMS'],
        captions: { illustration: 'Teknik illüstrasyon', landing: 'Tipografi öncelikli açılış' },
        stack: 'Nuxt SSR · projeye ait fontlar · özel görsel işleme hattı · SVG illüstrasyon',
        alts: { hero: "İstanbul Şehir İçi ana sayfası masaüstünde; iki bina arasındaki taşınmayı anlatan teknik illüstrasyonla.", landing: "İstanbul Şehir İçi sitesinin koyu, tipografi öncelikli açılış bölümü, masaüstünde.", mobile: "İstanbul Şehir İçi sitesi mobilde.", tablet: "İstanbul Şehir İçi ilçe sayfası tablette; 39 ilçelik haritasıyla." },
      },
      ege: {
        strength: 'Ölçekte SEO',
        line: 'Yapılandırılmış içerik, SSR ve veritabanı tabanlı bir yayın sistemi üzerine kurulu, SEO ağırlıklı bir hizmet platformu.',
        role: 'SEO mimarisi, ölçeklenebilir içerik yapısı ve sistematik yayın yönetimi.',
        facts: ['968 sitemap URL’si', '15 admin düzenleme alanı', 'Sunucu tarafında üretilen bölge ve hizmet içeriği', 'Veritabanı tabanlı yayın'],
        captions: { structure: 'Yayın mimarisi' },
        alts: { hero: "Ege Eşya ana sayfası masaüstünde.", landing: "Ege Eşya hizmetler sayfası masaüstünde.", mobile: "Ege Eşya sitesi mobilde.", tablet: "Ege Eşya yayımlanmış hizmet yazısı tablette." },
      },
      evden: {
        strength: 'Hizmetin arkasındaki sistem',
        line: 'Genele açık deneyim ile yönetim sisteminin tek bir ürün olarak tasarlandığı, full-stack bir hizmet platformu.',
        role: 'CMS/admin sistemi, full-stack mimari ve production performansı.',
        facts: ['Admin / CMS', 'SSR SEO mimarisi — sitemap, robots, metadata', 'Duyarlı mobil arayüz', 'Production kurulumu ve bakımı'],
        captions: { admin: ['Genele açık sitenin arkasındaki yönetim sistemi · ', { text: 'Admin', lang: 'en' }, ' / CMS'], production: 'Yayında' },
        alts: { hero: "Evden Eve Nakliyat ana sayfası masaüstünde.", admin: "Evden Eve Nakliyat yönetim paneli; hizmet bölgelerinin yönetildiği ekran.", mobile: "Evden Eve Nakliyat sitesi mobilde.", tablet: "Evden Eve Nakliyat hizmet sayfası tablette." },
      },
    },
  },
  lab: {
    title: 'Lab',
    line: 'Aynı malzeme, benim adım dışında bir şey üzerinde. Her çalışma tek bir özelliği sınar.',
    heading: 'Lab çalışmaları',
    registered: 'kayıtlı',
    registering: 'yeniden kaydediliyor',
    open: 'aç',
    count: 'Lab · {n} çalışma',
    back: 'Lab',
    studies: {
      weight: {
        name: 'Weight',
        prim: 'alan · bölüşüm',
        note: 'Sabit bir alan ve birbirinden yer almak zorunda olan kelimeler. Kurallar kayar; sayfa kendini yeniden bölüşür.',
        question: 'Dikkat nereye giderse alan oraya gider mi?',
      },
      line: {
        name: 'Line',
        prim: 'uzunluk · yapı',
        note: 'Sabit uzunlukta tek bir çizgi. Her yapı aynı koşudan harcanır; kalan uzunluk kenarda bekler.',
        question: 'Bir çizgi ne kadar yapı taşıyabilir?',
      },
      tone: {
        name: 'Tone',
        prim: 'görüntü · satır ağırlığı',
        note: 'Ton bilgisi satırların ağırlığıyla taşınır. Altında resim yok — satırlar resmin kendisi.',
        question: 'Bir görüntü yalnızca satır ağırlığıyla kurulabilir mi?',
      },
    },
    line_states: ['gergin', 'eğri', 'açıklık', 'toplanmış', 'bırakılmış', 'sınır'],
    line_says: [
      'Gergin — bütün koşu tek bir uzunlukta yatıyor.',
      'Eğri — aynı uzunluk, tek bir yavaş bükülme.',
      'Açıklık — çizgi açılıyor; yapı uzunlukla satın alınıyor.',
      'Toplanmış — koşu tek, sıkı bir makaraya sarılıyor.',
      'Bırakılmış — aynı uzunluk, alana yeniden açılıyor.',
      'Sınır — çizgi geçmediği bir kenara varıyor; kalanı orada dinleniyor.',
    ],
    line_spent: 'harcandı',
    line_held: 'hâlâ kenarda',
    tone_sources: ['fotoğraf', 'arayüz', 'malzeme'],
    tone_rows: 'satır',
    weight_holds: 'sayfayı tutuyor',
  },
  contact: { heading: 'İletişim', emailLabel: 'E-posta', phoneLabel: 'Telefon', cta: 'Bir projeniz mi var? Yazın' },
  finale: {
    copy: 'kopyala', copied: 'kopyalandı', copyEmail: 'E-postayı kopyala', locationRole: 'Konum',
    revision: 'Revizyon', githubAria: 'GitHub profili', linkedinAria: 'LinkedIn profili',
    hintScroll: 'aşağı kaydır', hintCursor: 'imleci gezdir', hintKeepScrolling: 'kaydırmaya devam et',
  },
  psi: {
    head: 'PageSpeed Insights', mobile: 'Mobil', desktop: 'Masaüstü',
    labels: ['Performans', 'Erişilebilirlik', 'Best Practices', 'SEO'],
    short: ['PERF', 'A11Y', 'BP', 'SEO'],
  },
  hints: {
    quietSeparator: ' · ',
    face: 'basılı tut',
    work: 'kaydır · görseli basılı tut', workTouch: 'yana kaydır · görsele dokun',
    world: 'kaydır',
  },
  a11y: {
    plainNav: 'Düz gezinme', selectedWork: 'Seçili işler', labStudies: 'Lab çalışmaları',
    aboutRegion: 'Hakkımda', aboutDetail: 'Emrah Yücel hakkında', capabilities: 'Yetkinlikler',
    projectImages: 'Bu projedeki görseller:',
    keys: 'Portfolyoda ilerlemek için ok tuşlarını ya da Page Up ve Page Down tuşlarını kullan.',
    workKeys: 'Sol ve sağ ok tuşları proje seçer; Enter projeyi açar.',
    worldKeys: 'Ok tuşları proje içinde ilerler; Escape tüm işlere döner.',
    newTab: '(yeni sekmede açılır)',
    openProject: 'Projeyi aç',
    openHint: 'Klavye veya ekran okuyucuyla etkinleştirin.',
  },
  localeSwitch: { label: 'Dil', to: 'English', short: 'EN', hreflang: 'en' },
  entry: {
    title: 'Emrah Yücel — Creative Developer & Full-Stack Developer',
    description: 'İstanbul merkezli Creative Developer ve Full-Stack Developer. Bir dil seçin.',
    choose: 'Bir dil seçin',
  },
  notFound: { title: 'Sayfa bulunamadı', message: 'Bu sayfa bulunamadı.' },
} satisfies LocaleCopy
