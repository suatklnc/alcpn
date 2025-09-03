import { MaterialType, IsTuru, TavanTuru, DuvarTuru, MATERIAL_COEFFICIENTS } from '@/types/calculation';

// Malzeme bilgilerini getir
export function getMaterialInfo(materialType: MaterialType) {
  return MATERIAL_COEFFICIENTS[materialType];
}

// İş türüne göre malzemeleri belirle
export function getMaterialsForJobType(
  isTuru: IsTuru, 
  altTuru: TavanTuru | DuvarTuru
): MaterialType[] {
  if (isTuru === 'tavan') {
    return getTavanMalzemeleri(altTuru as TavanTuru);
  } else {
    return getDuvarMalzemeleri(altTuru as DuvarTuru);
  }
}

// Tavan malzemeleri (alcpn.md'den)
function getTavanMalzemeleri(tavanTuru: TavanTuru): MaterialType[] {
  switch (tavanTuru) {
    case 'duz_tavan':
      return [
        'beyaz_alcipan',
        'c_profili',
        'u_profili',
        'aski_teli',
        'aski_masasi',
        'klips',
        'vida',
        'celik_dubel',
      ];
    case 'karopan_tavan':
      return [
        't_ana_tasiyici',
        'tali_120_tasiyici',
        'tali_60_tasiyici',
        'u_profili',
        'aski_teli',
        'vida',
        'celik_dubel',
      ];
    case 'klipin_tavan':
      return [
        'alüminyum_plaka',
        'omega',
        'u_profili',
        'aski_teli',
        'vida',
        'celik_dubel',
        'clip_in_aski_masasi',
      ];
    default:
      return [];
  }
}

// Duvar malzemeleri (alcpn.md'den)
function getDuvarMalzemeleri(duvarTuru: DuvarTuru): MaterialType[] {
  switch (duvarTuru) {
    case 'giydirme_duvar':
      return [
        'beyaz_alcipan',
        'duvar_c_profili',
        'duvar_u_profili',
        'agraf',
        'duvar_dubel',
        'vida_25',
      ];
    case 'tek_kat_tek_iskelet':
      return [
        'beyaz_alcipan',
        'duvar_c_profili',
        'duvar_u_profili',
        'duvar_dubel',
        'vida_25',
      ];
    case 'cift_kat_cift_iskelet':
      return [
        'beyaz_alcipan',
        'duvar_c_profili',
        'duvar_u_profili',
        'duvar_dubel',
        'vida_25',
        'vida_35',
      ];
    default:
      return [];
  }
}

// Mevcut malzemeleri getir (tüm malzeme türleri)
export function getAvailableMaterials(isTuru: IsTuru): MaterialType[] {
  if (isTuru === 'tavan') {
    return [
      'beyaz_alcipan',
      'c_profili',
      'u_profili',
      'aski_teli',
      'aski_masasi',
      'klips',
      'vida',
      't_ana_tasiyici',
      'tali_120_tasiyici',
      'tali_60_tasiyici',
      'omega',
      'celik_dubel',
      'clip_in_aski_masasi',
      'alüminyum_plaka',
    ];
  } else {
    return [
      'beyaz_alcipan',
      'c_profili',
      'duvar_c_profili',
      'duvar_u_profili',
      'agraf',
      'dubel_civi',
      'duvar_dubel',
      'vida_25',
      'vida_35',
    ];
  }
}

// Toplam maliyeti hesapla
export function calculateTotalCost(results: Array<{ totalPrice: number }>): number {
  return results.reduce((total, result) => total + result.totalPrice, 0);
}
