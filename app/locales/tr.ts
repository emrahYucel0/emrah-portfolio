import type { Messages } from './messages'

// TR is a first-class experience, not a translation layer. Wording is Emrah to confirm.
export const tr = {
  meta: {
    home: {
      title: 'Emrah Yücel — Creative Developer & Full-Stack Developer',
      description:
        'Emrah Yücel, İstanbul’da çalışan bir Creative Developer ve Full-Stack Developer: etkileşim, frontend mühendisliği, backend sistemler, CMS, performans ve teknik SEO.',
    },
    about: {
      title: 'Hakkımda — Emrah Yücel',
      description:
        'Kimya ve endüstriyel üretimden creative development ve full-stack sistemlere: Emrah Yücel nasıl çalışır, ne kurar.',
    },
  },
  nav: {
    skip: 'İçeriğe geç',
    label: 'Portfolyo',
    home: 'Anasayfa',
    work: 'Çalışmalar',
    about: 'Hakkımda',
    lab: 'Lab',
    contact: 'İletişim',
  },
  roles: { creative: 'Creative Developer', fullStack: 'Full-Stack Developer' },
  home: {
    intro:
      'Ben Emrah Yücel; İstanbul’da yaşayan bir Creative Developer ve Full-Stack Developer’ım. Dijital deneyimleri baştan sona kuruyorum — etkileşim ve frontend mühendisliğinden backend sistemlere, CMS’e, performansa ve prodüksiyona kadar.',
    workHeading: 'Seçili çalışmalar',
    labHeading: 'Lab',
    labLine: 'Tipografik ve malzeme çalışmaları.',
    aboutLink: 'Hakkımda daha fazlası',
  },
  about: {
    heading: 'Hakkımda',
    intro:
      'Ben Emrah Yücel; İstanbul’da yaşayan bir Creative Developer ve Full-Stack Developer’ım. Dijital deneyimleri baştan sona kuruyorum — etkileşim ve frontend mühendisliğinden backend sistemlere, CMS’e, performansa ve prodüksiyona kadar.',
    background:
      'Yazılıma giden yolum kimya ve endüstriyel üretimde başladı. Formülasyon, kalite kontrol ve teknik kısıtlarla çalışmak bana sistemlerle düşünmeyi, varsayımları test etmeyi, önemli olanı ölçmeyi ve tekrarlanabilirliği önemsemeyi öğretti.',
    transition:
      'Yazılıma geçtiğimde bu bakış benimle kaldı. Hâlâ aynı şekilde çalışıyorum: sistemi anla, kısıtlarıyla çalış, sonra görsel ve teknik parçalar tek bir şey gibi hissettirene kadar sonucu inceltmeye devam et.',
    current:
      'Bugün creative development, frontend, full-stack sistemler, CMS/admin mimarisi, performans ve teknik SEO alanlarında çalışıyorum.',
    status: 'Seçili freelance projeler için uygunum.',
    capabilitiesHeading: 'Yetkinlikler',
    capabilities: [
      'Creative Development',
      'Motion & Etkileşim',
      'Frontend Mühendisliği',
      'Full-Stack Geliştirme',
      'CMS / Admin Sistemleri',
      'Performans & Teknik SEO',
    ],
    back: 'Geri',
  },
  work: {
    lines: {
      'istanbul-sehir-ici': 'Özgün dijital yön',
      'ege-esya': 'Ölçekte SEO',
      'evden-eve-nakliyat': 'Hizmetin arkasındaki sistem',
    },
    roleLabels: {
      'creative-direction': 'Kreatif yön',
      'original-design': 'Özgün tasarım',
      'creative-development': 'Creative development',
      'seo-architecture': 'SEO mimarisi',
      'content-scale': 'Ölçekte içerik',
      'publishing-system': 'Yayın sistemi',
      admin: 'Admin',
      cms: 'CMS',
      'full-stack': 'Full-stack sistem',
      'production-performance': 'Prodüksiyon performansı',
    },
    visit: 'Siteye git',
  },
  lab: {
    studies: {
      '01': 'Tipografik büyütme çalışması',
      '02': 'Diyagonal blok çalışması',
      '03': 'Sıkışık dikey tipografi çalışması',
      '04': 'Tek çizgi çizim çalışması',
      '05': 'Satır yayılması çalışması',
    },
  },
  contact: {
    heading: 'İletişim',
    location: 'İstanbul, Türkiye',
    status: 'Seçili freelance projeler için uygunum',
    emailLabel: 'E-posta',
    phoneLabel: 'Telefon',
  },
  localeSwitch: { label: 'Dil', to: 'English' },
  entry: {
    title: 'Emrah Yücel — Creative Developer & Full-Stack Developer',
    description: 'İstanbul’da Creative Developer ve Full-Stack Developer. Bir dil seçin.',
    choose: 'Bir dil seçin',
  },
} satisfies Messages
