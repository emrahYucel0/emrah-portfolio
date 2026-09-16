import type { LocaleCopy } from '../types'

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
  },
  nav: { skip: 'Düz gezinmeye geç', label: 'Portfolyo', work: 'İşler', about: 'Hakkımda', lab: 'Lab', contact: 'İletişim' },
  roles: { creative: 'Creative Developer', fullStack: 'Full-Stack Developer', and: 've' },
  identity: {
    city: 'İstanbul',
    location: 'İstanbul, Türkiye',
    status: 'Seçili freelance projelere açığım',
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
    status: 'Seçili freelance projelere açığım.',
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
  work: {
    heading: 'İşler',
    intro: 'Hizmet markaları için uçtan uca tasarlanıp geliştirilmiş üç production sitesi.',
    open: 'Açmak için görseli basılı tut',
    visit: 'Siteyi ziyaret et',
    allWork: 'Tüm işler',
    next: 'Sonraki',
    again: 'Yeniden',
    projectNav: 'Proje',
    projects: {
      istanbul: {
        strength: 'Özgün dijital yön',
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
    line: 'Yer açmak için basılı tut. Yüzeyin geri kalanı o yeri vermek zorunda.',
    heading: 'Lab çalışmaları',
    studies: {
      '01': 'Tipografik büyütme çalışması',
      '02': 'Diyagonal blok çalışması',
      '03': 'Sıkışık dikey tipografi çalışması',
      '04': 'Tek çizgi çizim çalışması',
      '05': 'Satır yayılması çalışması',
    },
  },
  contact: { heading: 'İletişim', emailLabel: 'E-posta', phoneLabel: 'Telefon' },
  psi: {
    head: 'PageSpeed Insights', mobile: 'Mobil', desktop: 'Masaüstü',
    labels: ['Performans', 'Erişilebilirlik', 'Best Practices', 'SEO'],
    short: ['PERF', 'A11Y', 'BP', 'SEO'],
  },
  hints: {
    quietSeparator: ' · ',
    open: 'basılı tut', openTouch: 'isimlerin arasında basılı tut',
    face: 'basılı tut', faceTouch: 'iki parmakla sıkıştır',
    work: 'kaydır · görseli basılı tut', workTouch: 'yana kaydır · görseli basılı tut',
    lab: 'herhangi bir yerde basılı tut', world: 'kaydır',
  },
  a11y: {
    plainNav: 'Düz gezinme', selectedWork: 'Seçili işler', labStudies: 'Lab çalışmaları',
    aboutRegion: 'Hakkımda', aboutDetail: 'Emrah Yücel hakkında', capabilities: 'Yetkinlikler',
    projectImages: 'Bu projedeki görseller:',
  },
  localeSwitch: { label: 'Dil', to: 'English', short: 'EN', hreflang: 'en' },
  entry: {
    title: 'Emrah Yücel — Creative Developer & Full-Stack Developer',
    description: 'İstanbul merkezli Creative Developer ve Full-Stack Developer. Bir dil seçin.',
    choose: 'Bir dil seçin',
  },
  notFound: { title: 'Sayfa bulunamadı', message: 'Bu sayfa bulunamadı.' },
} satisfies LocaleCopy
