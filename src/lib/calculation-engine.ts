import {
  MaterialType,
  CalculationParams,
  CalculationResult,
  IsTuru,
  TavanTuru,
  DuvarTuru,
  MATERIAL_COEFFICIENTS,
} from '@/types/calculation';
import { getMaterialsForJobType } from '@/lib/material-utils';

// Hesaplama motoru sınıfı
export class CalculationEngine {
  private static materialPricesCache: Record<string, number> | null = null;
  private static cacheTimestamp: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 dakika



  // Varsayılan birim fiyatı getir (Sadece Supabase'den güncel fiyatları al)
  static async getUnitPrice(materialType: MaterialType): Promise<number> {
    try {
      const prices = await this.getMaterialPrices();
      
      // Duvar U profili için özel fiyat kontrolü
      if (materialType === 'duvar_u_profili') {
        return prices['duvar_u_profili'] || 0;
      }
      
      // Duvar C profili için özel fiyat kontrolü
      if (materialType === 'duvar_c_profili') {
        return prices['duvar_c_profili'] || 0;
      }
      
      // Duvar dubel için özel fiyat kontrolü
      if (materialType === 'duvar_dubel') {
        return prices['duvar_dubel'] || 0;
      }
      
      // Sadece Supabase'den gelen fiyatları kullan, hardcoded değerleri kullanma
      return prices[materialType] || 0;
    } catch (error) {
      console.error('Error fetching material price:', error);
      // Hata durumunda da hardcoded değer kullanma, 0 döndür
      return 0;
    }
  }

  // Malzeme fiyatlarını getir (cache'li)
  private static async getMaterialPrices(): Promise<Record<string, number>> {
    const now = Date.now();
    
    // Cache kontrolü
    if (this.materialPricesCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.materialPricesCache;
    }

    try {
      // Environment detection: Server-side vs Client-side
      if (typeof window === 'undefined') {
        // Server-side: Doğrudan Supabase'den veri çek
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data, error } = await supabase
          .from('material_prices')
          .select('material_type, unit_price');

        if (error) {
          console.error('Error fetching material prices from Supabase:', error);
          return {};
        }

        // Veriyi Record<string, number> formatına çevir
        const prices: Record<string, number> = {};
        if (data) {
          data.forEach(item => {
            prices[item.material_type] = item.unit_price;
          });
        }

        this.materialPricesCache = prices;
        this.cacheTimestamp = now;
        return prices;
      } else {
        // Client-side: API endpoint kullan
        const response = await fetch('/api/material-prices');
        if (response.ok) {
          const prices = await response.json();
          this.materialPricesCache = prices;
          this.cacheTimestamp = now;
          return prices;
        }
      }
    } catch (error) {
      console.error('Error fetching material prices:', error);
    }

    // Fallback: boş fiyat listesi döndür (hardcoded değerler kullanma)
    return {};
  }

  // Tek malzeme hesaplama
  static async calculateMaterial(params: CalculationParams): Promise<CalculationResult[]> {
    const { area, isTuru, altTuru, unitPrice, customPrices } = params;
    
    // Hangi malzemelerin hesaplanacağını belirle
    const materials = getMaterialsForJobType(isTuru, altTuru);
    
    const results: CalculationResult[] = [];
    
    for (const materialType of materials) {
      const materialInfo = MATERIAL_COEFFICIENTS[materialType];
      
      // Vida katsayısını tavan türüne göre ayarla
      let coefficient = materialInfo.coefficient;
      if (materialType === 'vida' && isTuru === 'tavan') {
        if (altTuru === 'duz_tavan') {
          coefficient = 12; // Düz tavan için 12
        } else if (altTuru === 'karopan_tavan' || altTuru === 'klipin_tavan') {
          coefficient = 4; // Karopan ve klipin tavan için 4
        }
      }
      
      // Duvar C profili katsayısını duvar türüne göre ayarla
      if (materialType === 'duvar_c_profili' && isTuru === 'duvar') {
        if (altTuru === 'tek_kat_tek_iskelet' || altTuru === 'giydirme_duvar') {
          coefficient = 0.58; // Tek kat tek iskelet ve giydirme duvar için 0.58
        } else if (altTuru === 'cift_kat_cift_iskelet') {
          coefficient = 1.16; // Çift kat çift iskelet için 1.16
        }
      }
      
      // Duvar dubel katsayısını duvar türüne göre ayarla
      if (materialType === 'duvar_dubel' && isTuru === 'duvar') {
        if (altTuru === 'cift_kat_cift_iskelet') {
          coefficient = 3.48; // Çift kat çift iskelet için 3.48
        }
      }
      
      const quantity = area * coefficient;
      
      // Önce customPrices'tan, sonra genel unitPrice'tan, son olarak güncel fiyattan al
      let price = customPrices?.[materialType] || unitPrice;
      if (!price) {
        price = await this.getUnitPrice(materialType);
      }
      
      results.push({
        materialType,
        materialName: materialInfo.name,
        quantity: Math.ceil(quantity), // Yukarı yuvarla
        unit: materialInfo.unit,
        unitPrice: price,
        totalPrice: Math.ceil(quantity) * price,
        coefficient: coefficient, // Güncellenmiş katsayıyı kullan
      });
    }
    
    return results;
  }



  // Çoklu malzeme hesaplama (API için güncellenmiş)
  static async calculateMultipleMaterials(
    jobType: IsTuru,
    subType: TavanTuru | DuvarTuru,
    area: number,
    customPrices?: Record<string, number>,
    selectedMaterials?: MaterialType[]
  ): Promise<{ success: boolean; data?: { materials: CalculationResult[]; totalCost: number; area: number; jobType: IsTuru; subType: TavanTuru | DuvarTuru; customPrices?: Record<string, number> }; error?: string }> {
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
        materials = getMaterialsForJobType(jobType, subType);
      }

      const results: CalculationResult[] = [];
      
      for (const materialType of materials) {
        const materialInfo = MATERIAL_COEFFICIENTS[materialType];
        
        // Vida katsayısını tavan türüne göre ayarla
        let coefficient = materialInfo.coefficient;
        if (materialType === 'vida' && jobType === 'tavan') {
          if (subType === 'duz_tavan') {
            coefficient = 12; // Düz tavan için 12
          } else if (subType === 'karopan_tavan' || subType === 'klipin_tavan') {
            coefficient = 4; // Karopan ve klipin tavan için 4
          }
        }
        
        // Duvar C profili katsayısını duvar türüne göre ayarla
        if (materialType === 'duvar_c_profili' && jobType === 'duvar') {
          if (subType === 'tek_kat_tek_iskelet' || subType === 'giydirme_duvar') {
            coefficient = 0.58; // Tek kat tek iskelet ve giydirme duvar için 0.58
          } else if (subType === 'cift_kat_cift_iskelet') {
            coefficient = 1.16; // Çift kat çift iskelet için 1.16
          }
        }
        
        // Duvar dubel katsayısını duvar türüne göre ayarla
        if (materialType === 'duvar_dubel' && jobType === 'duvar') {
          if (subType === 'cift_kat_cift_iskelet') {
            coefficient = 3.48; // Çift kat çift iskelet için 3.48
          }
        }
        
        const quantity = area * coefficient;
        
        // Önce customPrices'tan, sonra güncel fiyattan al
        let price = customPrices?.[materialType];
        if (!price) {
          price = await this.getUnitPrice(materialType);
        }
        // console.log(`Material: ${materialType}, Custom: ${customPrices?.[materialType]}, Default: ${materialInfo.defaultUnitPrice}, Final: ${price}`);
        
        results.push({
          materialType,
          materialName: materialInfo.name,
          quantity: Math.ceil(quantity),
          unit: materialInfo.unit,
          unitPrice: price,
          totalPrice: Math.ceil(quantity) * price,
          coefficient: coefficient, // Güncellenmiş katsayıyı kullan
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
        'beyaz_alcipan',
        'agraf',
        'dubel_civi',
      ];
    }
  }
}

