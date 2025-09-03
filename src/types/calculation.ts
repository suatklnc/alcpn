// İş türleri (alcpn.md'den)
export type IsTuru = 'tavan' | 'duvar';

// Tavan türleri (alcpn.md'den)
export type TavanTuru = 
  | 'duz_tavan'
  | 'karopan_tavan'
  | 'klipin_tavan';

// Duvar türleri (alcpn.md'den)
export type DuvarTuru =
  | 'giydirme_duvar'
  | 'tek_kat_tek_iskelet'
  | 'cift_kat_cift_iskelet';

// Malzeme türleri (alcpn.md'den detaylı malzemeler)
export type MaterialType =
  // Tavan malzemeleri
  | 'beyaz_alcipan'
  | 'c_profili'
  | 'u_profili'
  | 'aski_teli'
  | 'aski_masasi'
  | 'klips'
  | 'vida'
  | 't_ana_tasiyici'
  | 'tali_120_tasiyici'
  | 'tali_60_tasiyici'
  | 'plaka'
  | 'omega'
  | 'celik_dubel'
  | 'clip_in_aski_masasi'
  | 'alüminyum_plaka'
  // Duvar malzemeleri
  | 'duvar_u_profili'
  | 'duvar_c_profili'
  | 'agraf'
  | 'dubel_civi'
  | 'duvar_dubel'
  | 'vida_25'
  | 'vida_35';

// Hesaplama sonucu
export interface CalculationResult {
  materialType: MaterialType;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  coefficient: number;
}

// Hesaplama parametreleri
export interface CalculationParams {
  area: number; // m²
  isTuru: IsTuru;
  altTuru: TavanTuru | DuvarTuru;
  unitPrice?: number; // Genel birim fiyat (opsiyonel)
  customPrices?: Record<string, number>; // Her malzeme için özel fiyat (opsiyonel)
}

// Malzeme bilgileri
export interface MaterialInfo {
  type: MaterialType;
  name: string;
  unit: string;
  coefficient: number; // m² başına miktar
  description?: string;
  defaultUnitPrice: number; // Varsayılan birim fiyat
}

// Hesaplama katsayıları (alcpn.md'den)
export const MATERIAL_COEFFICIENTS: Record<MaterialType, MaterialInfo> = {
  // Tavan malzemeleri
  beyaz_alcipan: {
    type: 'beyaz_alcipan',
    name: 'Beyaz Alçıpan',
    unit: 'adet',
    coefficient: 0.33, // 0.33 × m²
    description: 'Beyaz alçıpan levha',
    defaultUnitPrice: 45,
  },
  c_profili: {
    type: 'c_profili',
    name: 'C Profili',
    unit: 'adet',
    coefficient: 0.853, // 0.853 × m²
    description: 'C profili metal',
    defaultUnitPrice: 8,
  },
  u_profili: {
    type: 'u_profili',
    name: 'U Profili',
    unit: 'adet',
    coefficient: 0.3, // 0.3 × m²
    description: 'U profili metal',
    defaultUnitPrice: 12,
  },
  aski_teli: {
    type: 'aski_teli',
    name: 'Askı Teli',
    unit: 'adet',
    coefficient: 0.73, // 0.73 × m²
    description: 'Askı teli',
    defaultUnitPrice: 2.5,
  },
  aski_masasi: {
    type: 'aski_masasi',
    name: 'Askı Masası',
    unit: 'adet',
    coefficient: 0.73, // 0.73 × m²
    description: 'Askı masası',
    defaultUnitPrice: 3,
  },
  klips: {
    type: 'klips',
    name: 'Klips',
    unit: 'adet',
    coefficient: 2.915, // 2.915 × m²
    description: 'Klips bağlantı elemanı',
    defaultUnitPrice: 0.8,
  },
  vida: {
    type: 'vida',
    name: 'Vida',
    unit: 'adet',
    coefficient: 16, // 16 × m²
    description: 'Vida bağlantı elemanı',
    defaultUnitPrice: 0.3,
  },
  t_ana_tasiyici: {
    type: 't_ana_tasiyici',
    name: 'T Ana Taşıyıcı',
    unit: 'adet',
    coefficient: 0.231, // 0.231 × m²
    description: 'T ana taşıyıcı profil',
    defaultUnitPrice: 15,
  },
  tali_120_tasiyici: {
    type: 'tali_120_tasiyici',
    name: 'Tali 120 Taşıyıcı',
    unit: 'adet',
    coefficient: 1.43, // 1.43 × m²
    description: 'Tali 120 taşıyıcı profil',
    defaultUnitPrice: 6,
  },
  tali_60_tasiyici: {
    type: 'tali_60_tasiyici',
    name: 'Tali 60 Taşıyıcı',
    unit: 'adet',
    coefficient: 1.47, // 1.47 × m²
    description: 'Tali 60 taşıyıcı profil',
    defaultUnitPrice: 4,
  },
  plaka: {
    type: 'plaka',
    name: 'Plaka',
    unit: 'adet',
    coefficient: 3, // 3 × m²
    description: 'Plaka malzeme',
    defaultUnitPrice: 25,
  },
  omega: {
    type: 'omega',
    name: 'Omega',
    unit: 'adet',
    coefficient: 0.853, // 0.853 × m²
    description: 'Omega profil',
    defaultUnitPrice: 10,
  },
  celik_dubel: {
    type: 'celik_dubel',
    name: 'Çelik Dubel',
    unit: 'adet',
    coefficient: 0.73, // 0.73 × m²
    description: 'Çelik dubel',
    defaultUnitPrice: 1.5,
  },
  clip_in_aski_masasi: {
    type: 'clip_in_aski_masasi',
    name: 'Clip In Askı Maşası',
    unit: 'adet',
    coefficient: 0.73, // 0.73 × m²
    description: 'Clip in askı maşası',
    defaultUnitPrice: 2.0,
  },
  alüminyum_plaka: {
    type: 'alüminyum_plaka',
    name: 'Alüminyum Plaka',
    unit: 'adet',
    coefficient: 3, // 3 × m²
    description: 'Alüminyum plaka',
    defaultUnitPrice: 30,
  },
  // Duvar malzemeleri
  agraf: {
    type: 'agraf',
    name: 'Agraf',
    unit: 'adet',
    coefficient: 3.5, // 3.5 × m²
    description: 'Agraf bağlantı elemanı',
    defaultUnitPrice: 1.2,
  },
  dubel_civi: {
    type: 'dubel_civi',
    name: 'Dubel Çivi',
    unit: 'adet',
    coefficient: 1.74, // 1.74 × m²
    description: 'Dubel çivi',
    defaultUnitPrice: 0.5,
  },
  vida_25: {
    type: 'vida_25',
    name: 'Vida 25mm',
    unit: 'adet',
    coefficient: 22, // 22 × m²
    description: '25mm vida',
    defaultUnitPrice: 0.25,
  },
  vida_35: {
    type: 'vida_35',
    name: 'Vida 35mm',
    unit: 'adet',
    coefficient: 44, // 44 × m²
    description: '35mm vida',
    defaultUnitPrice: 0.3,
  },
  duvar_u_profili: {
    type: 'duvar_u_profili',
    name: 'Duvar U Profili',
    unit: 'adet',
    coefficient: 0.3, // 0.3 × m² (duvar için)
    description: 'Duvar U profili metal',
    defaultUnitPrice: 11.0,
  },
  duvar_c_profili: {
    type: 'duvar_c_profili',
    name: 'Duvar C Profili',
    unit: 'adet',
    coefficient: 0.3, // 0.3 × m² (duvar için)
    description: 'Duvar C profili metal',
    defaultUnitPrice: 103.75,
  },
  duvar_dubel: {
    type: 'duvar_dubel',
    name: 'Duvar Dubel',
    unit: 'adet',
    coefficient: 1.74, // 1.74 × m² (duvar için)
    description: 'Duvar dubel',
    defaultUnitPrice: 0.4,
  },
};

// Form verileri
export interface CalculationFormData {
  area: number;
  isTuru: IsTuru;
  altTuru: TavanTuru | DuvarTuru;
  customUnitPrice?: number;
}

// Hesaplama geçmişi
export interface CalculationHistory {
  id: string;
  userId: string;
  name: string;
  area: number;
  isTuru: IsTuru;
  altTuru: TavanTuru | DuvarTuru;
  results: CalculationResult[];
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  // Sharing fields
  shareId?: string;
  isShared?: boolean;
  sharedAt?: string;
}

// Paylaşılan hesaplama (public access)
export interface SharedCalculation {
  id: string;
  shareId: string;
  jobType: IsTuru;
  subType: TavanTuru | DuvarTuru;
  area: number;
  customPrices?: Record<string, number>;
  calculationResult: {
    materials: CalculationResult[];
    totalCost: number;
    area: number;
    jobType: IsTuru;
    subType: TavanTuru | DuvarTuru;
    customPrices?: Record<string, number>;
  };
  totalCost: number;
  createdAt: string;
  sharedAt: string;
}

// Share response
export interface ShareResponse {
  success: boolean;
  shareId: string;
  shareUrl: string;
  isAlreadyShared: boolean;
}

// İş türü etiketleri
export const IS_TURU_LABELS: Record<IsTuru, string> = {
  tavan: 'Tavan İşleri',
  duvar: 'Duvar İşleri',
};

// Tavan türü etiketleri
export const TAVAN_TURU_LABELS: Record<TavanTuru, string> = {
  duz_tavan: 'Düz Tavan',
  karopan_tavan: 'Karopan Tavan',
  klipin_tavan: 'Klipin Tavan',
};

// Duvar türü etiketleri
export const DUVAR_TURU_LABELS: Record<DuvarTuru, string> = {
  giydirme_duvar: 'Giydirme Duvar',
  tek_kat_tek_iskelet: 'Tek Kat Tek İskelet',
  cift_kat_cift_iskelet: 'Çift Kat Çift İskelet',
};