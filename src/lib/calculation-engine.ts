import {
  MaterialType,
  MaterialInfo,
  CalculationParams,
  CalculationResult,
  IsTuru,
  TavanTuru,
  DuvarTuru,
  MATERIAL_COEFFICIENTS,
} from '@/types/calculation';

// Hesaplama motoru sınıfı
export class CalculationEngine {
  // Malzeme bilgilerini getir
  static getMaterialInfo(materialType: MaterialType): MaterialInfo {
    return MATERIAL_COEFFICIENTS[materialType];
  }

  // Varsayılan birim fiyatı getir
  static getUnitPrice(materialType: MaterialType): number {
    return MATERIAL_COEFFICIENTS[materialType].defaultUnitPrice;
  }

  // Tek malzeme hesaplama
  static calculateMaterial(params: CalculationParams): CalculationResult[] {
    const { area, isTuru, altTuru, unitPrice, customPrices } = params;
    
    // Hangi malzemelerin hesaplanacağını belirle
    const materials = this.getMaterialsForJobType(isTuru, altTuru);
    
    const results: CalculationResult[] = [];
    
    for (const materialType of materials) {
      const materialInfo = this.getMaterialInfo(materialType);
      const quantity = area * materialInfo.coefficient;
      
      // Önce customPrices'tan, sonra genel unitPrice'tan, son olarak default fiyattan al
      const price = customPrices?.[materialType] || unitPrice || materialInfo.defaultUnitPrice;
      
      results.push({
        materialType,
        materialName: materialInfo.name,
        quantity: Math.ceil(quantity), // Yukarı yuvarla
        unit: materialInfo.unit,
        unitPrice: price,
        totalPrice: Math.ceil(quantity) * price,
        coefficient: materialInfo.coefficient,
      });
    }
    
    return results;
  }

  // İş türüne göre malzemeleri belirle
  static getMaterialsForJobType(
    isTuru: IsTuru, 
    altTuru: TavanTuru | DuvarTuru
  ): MaterialType[] {
    if (isTuru === 'tavan') {
      return this.getTavanMalzemeleri(altTuru as TavanTuru);
    } else {
      return this.getDuvarMalzemeleri(altTuru as DuvarTuru);
    }
  }

  // Tavan malzemeleri (alcpn.md'den)
  private static getTavanMalzemeleri(tavanTuru: TavanTuru): MaterialType[] {
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
        ];
      case 'karopan_tavan':
        return [
          't_ana_tasiyici',
          'tali_120_tasiyici',
          'tali_60_tasiyici',
          'plaka',
          'u_profili',
          'aski_teli',
          'vida',
        ];
      case 'klipin_tavan':
        return [
          'omega',
          'plaka',
          'u_profili',
          'aski_teli',
          'vida',
        ];
      default:
        return [];
    }
  }

  // Duvar malzemeleri (alcpn.md'den)
  private static getDuvarMalzemeleri(duvarTuru: DuvarTuru): MaterialType[] {
    switch (duvarTuru) {
      case 'giydirme_duvar':
        return [
          'u_profili',
          'c_profili',
          'vida_25',
          'alcipan',
          'agraf',
          'dubel_civi',
        ];
      case 'tek_kat_tek_iskelet':
        return [
          'u_profili',
          'c_profili',
          'vida_35',
          'alcipan',
          'dubel_civi',
        ];
      case 'cift_kat_cift_iskelet':
        return [
          'u_profili',
          'c_profili',
          'vida_25',
          'vida_35',
          'alcipan',
          'dubel_civi',
        ];
      default:
        return [];
    }
  }

  // Çoklu malzeme hesaplama (API için güncellenmiş)
  static calculateMultipleMaterials(
    jobType: IsTuru,
    subType: TavanTuru | DuvarTuru,
    area: number,
    customPrices?: Record<string, number>,
    selectedMaterials?: MaterialType[]
  ): { success: boolean; data?: { materials: CalculationResult[]; totalCost: number; area: number; jobType: IsTuru; subType: TavanTuru | DuvarTuru; customPrices?: Record<string, number> }; error?: string } {
    try {
      // Alan validasyonu
      const areaValidation = this.validateArea(area);
      if (!areaValidation.isValid) {
        return { success: false, error: areaValidation.message };
      }

      // Malzemeleri belirle - eğer selectedMaterials varsa onları kullan, yoksa iş türüne göre tüm malzemeleri al
      let materials: MaterialType[];
      if (selectedMaterials && selectedMaterials.length > 0) {
        materials = selectedMaterials;
      } else {
        materials = this.getMaterialsForJobType(jobType, subType);
      }

      const results: CalculationResult[] = [];
      
      for (const materialType of materials) {
        const materialInfo = this.getMaterialInfo(materialType);
        const quantity = area * materialInfo.coefficient;
        
        // Önce customPrices'tan, sonra default fiyattan al
        const price = customPrices?.[materialType] || materialInfo.defaultUnitPrice;
        // console.log(`Material: ${materialType}, Custom: ${customPrices?.[materialType]}, Default: ${materialInfo.defaultUnitPrice}, Final: ${price}`);
        
        results.push({
          materialType,
          materialName: materialInfo.name,
          quantity: Math.ceil(quantity),
          unit: materialInfo.unit,
          unitPrice: price,
          totalPrice: Math.ceil(quantity) * price,
          coefficient: materialInfo.coefficient,
        });
      }

      // Toplam maliyeti hesapla
      const totalCost = this.calculateTotalCost(results);

      return {
        success: true,
        data: {
          materials: results,
          totalCost,
          area,
          jobType,
          subType,
          customPrices,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Toplam maliyet hesaplama
  static calculateTotalCost(results: CalculationResult[]): number {
    return results.reduce((total, result) => total + result.totalPrice, 0);
  }

  // Alan validasyonu
  static validateArea(area: number): { isValid: boolean; message?: string } {
    if (area <= 0) {
      return { isValid: false, message: 'Alan 0\'dan büyük olmalıdır' };
    }
    if (area > 10000) {
      return { isValid: false, message: 'Alan 10,000 m²\'den küçük olmalıdır' };
    }
    return { isValid: true };
  }

  // Birim fiyat validasyonu
  static validateUnitPrice(price: number): { isValid: boolean; message?: string } {
    if (price < 0) {
      return { isValid: false, message: 'Birim fiyat negatif olamaz' };
    }
    if (price > 10000) {
      return { isValid: false, message: 'Birim fiyat 10,000 TL\'den küçük olmalıdır' };
    }
    return { isValid: true };
  }

  // Malzeme türlerini iş türüne göre filtrele
  static getAvailableMaterials(isTuru: IsTuru): MaterialType[] {
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
        'plaka',
        'omega',
      ];
    } else {
      return [
        'u_profili',
        'c_profili',
        'vida_25',
        'vida_35',
        'alcipan',
        'agraf',
        'dubel_civi',
      ];
    }
  }
}

// Yardımcı fonksiyonlar
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};