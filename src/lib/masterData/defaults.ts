import type { City, District } from './types';

// ── Cities ────────────────────────────────────────────────────

export const DEFAULT_CITIES: City[] = [
  { id: 'riyadh',   name: 'الرياض'           },
  { id: 'jeddah',   name: 'جدة'              },
  { id: 'dammam',   name: 'الدمام'           },
  { id: 'khobar',   name: 'الخبر'            },
  { id: 'mecca',    name: 'مكة المكرمة'      },
  { id: 'medina',   name: 'المدينة المنورة'  },
  { id: 'taif',     name: 'الطائف'           },
  { id: 'abha',     name: 'أبها'             },
  { id: 'tabuk',    name: 'تبوك'             },
  { id: 'buraydah', name: 'بريدة'            },
];

// ── Districts ─────────────────────────────────────────────────

export const DEFAULT_DISTRICTS: District[] = [

  // ── الرياض ───────────────────────────────────────────────
  { id: 'ryd-narjis',     cityId: 'riyadh', name: 'النرجس',         aliases: ['Al Narjis', 'narjis', 'النرجيس'] },
  { id: 'ryd-malqa',      cityId: 'riyadh', name: 'الملقا',         aliases: ['Al Malqa', 'malqa'] },
  { id: 'ryd-yasmin',     cityId: 'riyadh', name: 'الياسمين',       aliases: ['Al Yasmin', 'yasmin', 'حي الياسمين'] },
  { id: 'ryd-olaya',      cityId: 'riyadh', name: 'العليا',         aliases: ['Al Olaya', 'olaya'] },
  { id: 'ryd-aqiq',       cityId: 'riyadh', name: 'العقيق',         aliases: ['Al Aqiq', 'aqiq'] },
  { id: 'ryd-munisiyah',  cityId: 'riyadh', name: 'المونسية',       aliases: ['Al Munisiyah', 'munisiyah'] },
  { id: 'ryd-diriyah',    cityId: 'riyadh', name: 'الدرعية',        aliases: ['Al Diriyah', 'diriyah', 'درعية'] },
  { id: 'ryd-qirawan',    cityId: 'riyadh', name: 'القيروان',       aliases: ['Al Qirawan', 'qirawan'] },
  { id: 'ryd-rahmaniyah', cityId: 'riyadh', name: 'الرحمانية',      aliases: ['Al Rahmaniyah', 'rahmaniyah'] },
  { id: 'ryd-ghadir',     cityId: 'riyadh', name: 'الغدير',         aliases: ['Al Ghadir', 'ghadir'] },
  { id: 'ryd-taawun',     cityId: 'riyadh', name: 'التعاون',        aliases: ['Al Taawun', 'taawun'] },
  { id: 'ryd-nahdah',     cityId: 'riyadh', name: 'النهضة',         aliases: ['Al Nahdah', 'nahdah'] },
  { id: 'ryd-shifa',      cityId: 'riyadh', name: 'الشفا',          aliases: ['Al Shifa', 'shifa'] },
  { id: 'ryd-urqa',       cityId: 'riyadh', name: 'عرقة',           aliases: ['Urqa', 'arqa'] },
  { id: 'ryd-wadi',       cityId: 'riyadh', name: 'الوادي',         aliases: ['Al Wadi', 'wadi'] },
  { id: 'ryd-sahafah',    cityId: 'riyadh', name: 'الصحافة',        aliases: ['Al Sahafah', 'sahafah'] },
  { id: 'ryd-khalij',     cityId: 'riyadh', name: 'الخليج',         aliases: ['Al Khalij', 'khalij'] },
  { id: 'ryd-safarat',    cityId: 'riyadh', name: 'السفارات',       aliases: ['Al Safarat', 'safarat'] },
  { id: 'ryd-rawdah',     cityId: 'riyadh', name: 'الروضة',         aliases: ['Al Rawdah', 'rawdah'] },
  { id: 'ryd-marwah',     cityId: 'riyadh', name: 'المروج',         aliases: ['Al Marwah', 'marwah'] },
  { id: 'ryd-hamra',      cityId: 'riyadh', name: 'الحمراء',        aliases: ['Al Hamra', 'hamra'] },
  { id: 'ryd-falah',      cityId: 'riyadh', name: 'الفلاح',         aliases: ['Al Falah', 'falah'] },
  { id: 'ryd-badiah',     cityId: 'riyadh', name: 'البادية',        aliases: ['Al Badiah', 'badiah'] },
  { id: 'ryd-malaqa',     cityId: 'riyadh', name: 'الملك فهد',      aliases: ['King Fahd', 'حي الملك فهد'] },

  // ── جدة ──────────────────────────────────────────────────
  { id: 'jed-shatee',     cityId: 'jeddah', name: 'الشاطئ',         aliases: ['Al Shati', 'shatee', 'شاطئ'] },
  { id: 'jed-rawdah',     cityId: 'jeddah', name: 'الروضة',         aliases: ['Al Rawdah', 'rawdah'] },
  { id: 'jed-nuzha',      cityId: 'jeddah', name: 'النزهة',         aliases: ['Al Nuzha', 'nuzha'] },
  { id: 'jed-umm-salama', cityId: 'jeddah', name: 'أم السلم',       aliases: ['Umm Al Salama', 'umm salama'] },
  { id: 'jed-zahra',      cityId: 'jeddah', name: 'الزهراء',        aliases: ['Al Zahra', 'zahra'] },
  { id: 'jed-safa',       cityId: 'jeddah', name: 'الصفا',          aliases: ['Al Safa', 'safa'] },
  { id: 'jed-hamra',      cityId: 'jeddah', name: 'الحمراء',        aliases: ['Al Hamra', 'hamra'] },
  { id: 'jed-salamah',    cityId: 'jeddah', name: 'السلامة',        aliases: ['Al Salamah', 'salamah'] },
  { id: 'jed-faisaliyah', cityId: 'jeddah', name: 'الفيصلية',       aliases: ['Al Faisaliyah', 'faisaliyah'] },
  { id: 'jed-zumurrud',   cityId: 'jeddah', name: 'الزمرد',         aliases: ['Al Zumurrud', 'zumurrud'] },
  { id: 'jed-muhammadiyah', cityId: 'jeddah', name: 'المحمدية',     aliases: ['Al Muhammadiyah', 'muhammadiyah'] },
  { id: 'jed-naeem',      cityId: 'jeddah', name: 'النعيم',         aliases: ['Al Naeem', 'naeem'] },
  { id: 'jed-sulaymani',  cityId: 'jeddah', name: 'السليمانية',     aliases: ['Al Sulaymaniyah', 'sulaymani'] },
  { id: 'jed-baghdadiyah', cityId: 'jeddah', name: 'البغدادية',     aliases: ['Al Baghdadiyah', 'baghdadiyah'] },

  // ── الدمام ───────────────────────────────────────────────
  { id: 'dmm-taawun',     cityId: 'dammam', name: 'التعاون',        aliases: ['Al Taawun', 'taawun'] },
  { id: 'dmm-faisaliyah', cityId: 'dammam', name: 'الفيصلية',       aliases: ['Al Faisaliyah', 'faisaliyah'] },
  { id: 'dmm-rakka',      cityId: 'dammam', name: 'الراكة',         aliases: ['Al Rakka', 'rakka'] },
  { id: 'dmm-shatee',     cityId: 'dammam', name: 'الشاطئ الشرقي',  aliases: ['Eastern Corniche', 'shatee sharqi'] },
  { id: 'dmm-safa',       cityId: 'dammam', name: 'الصفا',          aliases: ['Al Safa', 'safa'] },
  { id: 'dmm-nuzha',      cityId: 'dammam', name: 'النزهة',         aliases: ['Al Nuzha', 'nuzha'] },
  { id: 'dmm-jalawyah',   cityId: 'dammam', name: 'الجلوية',        aliases: ['Al Jalawyah', 'jalawyah'] },
  { id: 'dmm-shulah',     cityId: 'dammam', name: 'الشعلة',         aliases: ['Al Shulah', 'shulah'] },

  // ── الخبر ────────────────────────────────────────────────
  { id: 'kbr-aqrabiyah',  cityId: 'khobar', name: 'العقربية',       aliases: ['Al Aqrabiyah', 'aqrabiyah'] },
  { id: 'kbr-tibishi',    cityId: 'khobar', name: 'الطبيشي',        aliases: ['Al Tibishi', 'tibishi'] },
  { id: 'kbr-khuzama',    cityId: 'khobar', name: 'الخزامى',        aliases: ['Al Khuzama', 'khuzama'] },
  { id: 'kbr-corniche',   cityId: 'khobar', name: 'الكورنيش',       aliases: ['Corniche', 'corniche'] },
  { id: 'kbr-hamra',      cityId: 'khobar', name: 'الحمراء',        aliases: ['Al Hamra', 'hamra'] },
  { id: 'kbr-rakka-n',    cityId: 'khobar', name: 'الراكة الشمالية', aliases: ['Al Rakka North', 'rakka north'] },

  // ── مكة المكرمة ──────────────────────────────────────────
  { id: 'mck-aziziyah',   cityId: 'mecca',  name: 'العزيزية',       aliases: ['Al Aziziyah', 'aziziyah'] },
  { id: 'mck-rusayfah',   cityId: 'mecca',  name: 'الرصيفة',        aliases: ['Al Rusayfah', 'rusayfah'] },
  { id: 'mck-shisha',     cityId: 'mecca',  name: 'الشيشة',         aliases: ['Al Shisha', 'shisha'] },
  { id: 'mck-zahra',      cityId: 'mecca',  name: 'الزاهر',         aliases: ['Al Zaher', 'zaher'] },

  // ── المدينة المنورة ─────────────────────────────────────
  { id: 'med-qiblatain',  cityId: 'medina', name: 'القبلتين',        aliases: ['Al Qiblatain', 'qiblatain'] },
  { id: 'med-azhari',     cityId: 'medina', name: 'الأزهري',        aliases: ['Al Azhari', 'azhari'] },
  { id: 'med-nawwariyah', cityId: 'medina', name: 'النواريه',        aliases: ['Al Nawwariyah', 'nawwariyah'] },
];
