import { CalculationEngine } from '../calculation-engine';
import { CalculationResult } from '@/types/calculation';

describe('CalculationEngine', () => {
  describe('getMaterialInfo', () => {
    it('should return material info for valid material type', () => {
      const info = CalculationEngine.getMaterialInfo('beyaz_alcipan');
      expect(info.name).toBe('Beyaz Alçıpan');
      expect(info.coefficient).toBe(0.33);
      expect(info.unit).toBe('adet');
    });
  });

  describe('getUnitPrice', () => {
    it('should return default unit price for material', () => {
      const price = CalculationEngine.getUnitPrice('beyaz_alcipan');
      expect(price).toBe(45);
    });
  });

  describe('calculateMaterial', () => {
    it('should calculate materials for düz tavan', () => {
      const results = CalculationEngine.calculateMaterial({
        area: 10,
        isTuru: 'tavan',
        altTuru: 'duz_tavan',
      });

      expect(results).toHaveLength(7); // 7 malzeme türü
      expect(results[0].materialType).toBe('beyaz_alcipan');
      expect(results[0].quantity).toBe(4); // 10 * 0.33 = 3.3, yuvarlanmış 4
    });

    it('should calculate materials for giydirme duvar', () => {
      const results = CalculationEngine.calculateMaterial({
        area: 20,
        isTuru: 'duvar',
        altTuru: 'giydirme_duvar',
      });

      expect(results).toHaveLength(6); // 6 malzeme türü
      expect(results[0].materialType).toBe('u_profili');
    });

    it('should use custom unit price when provided', () => {
      const results = CalculationEngine.calculateMaterial({
        area: 10,
        isTuru: 'tavan',
        altTuru: 'duz_tavan',
        unitPrice: 50,
      });

      expect(results[0].unitPrice).toBe(50);
      expect(results[0].totalPrice).toBe(4 * 50); // quantity * custom price
    });
  });

  describe('calculateMultipleMaterials', () => {
    it('should calculate multiple selected materials', () => {
      const results = CalculationEngine.calculateMultipleMaterials(
        15,
        ['beyaz_alcipan', 'c_profili', 'u_profili']
      );

      expect(results).toHaveLength(3);
      expect(results[0].materialType).toBe('beyaz_alcipan');
      expect(results[1].materialType).toBe('c_profili');
      expect(results[2].materialType).toBe('u_profili');
    });

    it('should use custom prices when provided', () => {
      const customPrices = {
        beyaz_alcipan: 50,
        c_profili: 10,
      };

      const results = CalculationEngine.calculateMultipleMaterials(
        10,
        ['beyaz_alcipan', 'c_profili'],
        customPrices
      );

      expect(results[0].unitPrice).toBe(50);
      expect(results[1].unitPrice).toBe(10);
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate total cost correctly', () => {
      const results: CalculationResult[] = [
        {
          materialType: 'beyaz_alcipan',
          materialName: 'Beyaz Alçıpan',
          quantity: 5,
          unit: 'adet',
          unitPrice: 45,
          totalPrice: 225,
          coefficient: 0.33,
        },
        {
          materialType: 'c_profili',
          materialName: 'C Profili',
          quantity: 10,
          unit: 'adet',
          unitPrice: 8,
          totalPrice: 80,
          coefficient: 0.853,
        },
      ];

      const total = CalculationEngine.calculateTotalCost(results);
      expect(total).toBe(305);
    });
  });

  describe('validateArea', () => {
    it('should validate positive area', () => {
      const result = CalculationEngine.validateArea(10);
      expect(result.isValid).toBe(true);
    });

    it('should reject zero area', () => {
      const result = CalculationEngine.validateArea(0);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('0\'dan büyük');
    });

    it('should reject negative area', () => {
      const result = CalculationEngine.validateArea(-5);
      expect(result.isValid).toBe(false);
    });

    it('should reject too large area', () => {
      const result = CalculationEngine.validateArea(15000);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('10,000');
    });
  });

  describe('validateUnitPrice', () => {
    it('should validate positive price', () => {
      const result = CalculationEngine.validateUnitPrice(50);
      expect(result.isValid).toBe(true);
    });

    it('should reject negative price', () => {
      const result = CalculationEngine.validateUnitPrice(-10);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('negatif');
    });

    it('should reject too high price', () => {
      const result = CalculationEngine.validateUnitPrice(15000);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('10,000');
    });
  });

  describe('getAvailableMaterials', () => {
    it('should return tavan materials for tavan job type', () => {
      const materials = CalculationEngine.getAvailableMaterials('tavan');
      expect(materials).toContain('beyaz_alcipan');
      expect(materials).toContain('c_profili');
      expect(materials).toContain('u_profili');
      expect(materials).toContain('aski_teli');
    });

    it('should return duvar materials for duvar job type', () => {
      const materials = CalculationEngine.getAvailableMaterials('duvar');
      expect(materials).toContain('u_profili');
      expect(materials).toContain('c_profili');
      expect(materials).toContain('alcipan');
      expect(materials).toContain('agraf');
    });
  });

  describe('Material coefficients accuracy', () => {
    it('should have correct coefficients for düz tavan materials', () => {
      const results = CalculationEngine.calculateMaterial({
        area: 1,
        isTuru: 'tavan',
        altTuru: 'duz_tavan',
      });

      const beyazAlcipan = results.find(r => r.materialType === 'beyaz_alcipan');
      const cProfili = results.find(r => r.materialType === 'c_profili');
      const uProfili = results.find(r => r.materialType === 'u_profili');

      expect(beyazAlcipan?.quantity).toBe(1); // 1 * 0.33 = 0.33, yuvarlanmış 1
      expect(cProfili?.quantity).toBe(1); // 1 * 0.853 = 0.853, yuvarlanmış 1
      expect(uProfili?.quantity).toBe(1); // 1 * 0.3 = 0.3, yuvarlanmış 1
    });

    it('should have correct coefficients for karopan tavan materials', () => {
      const results = CalculationEngine.calculateMaterial({
        area: 1,
        isTuru: 'tavan',
        altTuru: 'karopan_tavan',
      });

      const tAnaTasiyici = results.find(r => r.materialType === 't_ana_tasiyici');
      const tali120 = results.find(r => r.materialType === 'tali_120_tasiyici');
      const plaka = results.find(r => r.materialType === 'plaka');
      const askiTeli = results.find(r => r.materialType === 'aski_teli');

      expect(tAnaTasiyici?.quantity).toBe(1); // 1 * 0.231 = 0.231, yuvarlanmış 1
      expect(tali120?.quantity).toBe(2); // 1 * 1.43 = 1.43, yuvarlanmış 2
      expect(plaka?.quantity).toBe(3); // 1 * 3 = 3
      expect(askiTeli?.quantity).toBe(1); // 1 * 0.73 = 0.73, yuvarlanmış 1
    });

    it('should have correct coefficients for klipin tavan materials', () => {
      const results = CalculationEngine.calculateMaterial({
        area: 1,
        isTuru: 'tavan',
        altTuru: 'klipin_tavan',
      });

      const omega = results.find(r => r.materialType === 'omega');
      const plaka = results.find(r => r.materialType === 'plaka');
      const askiTeli = results.find(r => r.materialType === 'aski_teli');

      expect(omega?.quantity).toBe(1); // 1 * 0.853 = 0.853, yuvarlanmış 1
      expect(plaka?.quantity).toBe(3); // 1 * 3 = 3
      expect(askiTeli?.quantity).toBe(1); // 1 * 0.73 = 0.73, yuvarlanmış 1
    });

    it('should have correct coefficients for giydirme duvar materials', () => {
      const results = CalculationEngine.calculateMaterial({
        area: 1,
        isTuru: 'duvar',
        altTuru: 'giydirme_duvar',
      });

      const uProfili = results.find(r => r.materialType === 'u_profili');
      const cProfili = results.find(r => r.materialType === 'c_profili');
      const alcipan = results.find(r => r.materialType === 'alcipan');

      expect(uProfili?.quantity).toBe(1); // 1 * 0.29 = 0.29, yuvarlanmış 1
      expect(cProfili?.quantity).toBe(1); // 1 * 0.58 = 0.58, yuvarlanmış 1
      expect(alcipan?.quantity).toBe(1); // 1 * 0.36 = 0.36, yuvarlanmış 1
    });
  });
});