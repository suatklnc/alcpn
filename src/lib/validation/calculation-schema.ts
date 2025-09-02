import { z } from 'zod';
import { IsTuru, TavanTuru, DuvarTuru } from '@/types/calculation';

// İş türü enum
export const isTuruEnum = z.enum(['tavan', 'duvar']);

// Tavan türü enum
export const tavanTuruEnum = z.enum([
  'duz_tavan',
  'karopan_tavan', 
  'klipin_tavan',
]);

// Duvar türü enum
export const duvarTuruEnum = z.enum([
  'giydirme_duvar',
  'tek_kat_tek_iskelet',
  'cift_kat_cift_iskelet',
]);

// Malzeme türü enum
export const materialTypeEnum = z.enum([
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
  'alcipan',
  'agraf',
  'dubel_civi',
  'vida_25',
  'vida_35',
]);

// Tekli hesaplama form şeması
export const calculationFormSchema = z.object({
  area: z
    .number()
    .min(0.1, 'Alan en az 0.1 m² olmalıdır')
    .max(10000, 'Alan en fazla 10,000 m² olabilir')
    .refine(
      value => Number.isFinite(value) && value > 0,
      'Geçerli bir alan değeri giriniz'
    ),
  isTuru: isTuruEnum,
  altTuru: z.union([tavanTuruEnum, duvarTuruEnum]),
  customPrices: z
    .record(
      z.string(),
      z
        .union([
          z.number().min(0, 'Birim fiyat negatif olamaz').max(10000, 'Birim fiyat en fazla 10,000 TL olabilir'),
          z.string().optional(),
          z.undefined(),
          z.null()
        ])
    )
    .optional(),
});

// Çoklu malzeme form şeması
export const multiMaterialFormSchema = z.object({
  area: z
    .number()
    .min(0.1, 'Alan en az 0.1 m² olmalıdır')
    .max(10000, 'Alan en fazla 10,000 m² olabilir'),
  isTuru: isTuruEnum,
  altTuru: z.union([tavanTuruEnum, duvarTuruEnum]),
  selectedMaterials: z
    .array(materialTypeEnum)
    .min(1, 'En az bir malzeme türü seçiniz')
    .max(15, 'En fazla 15 malzeme türü seçilebilir'),
  customPrices: z
    .record(
      z.string(),
      z
        .number()
        .min(0, 'Birim fiyat negatif olamaz')
        .max(10000, 'Birim fiyat en fazla 10,000 TL olabilir')
    )
    .optional(),
});

// Hata mesajı alma fonksiyonu
export const getErrorMessage = (error: z.ZodError, field: string): string => {
  const fieldError = error.issues.find(err =>
    err.path.includes(field)
  );
  return fieldError?.message || 'Geçersiz değer';
};

// İş türü etiketleri
export const isTuruLabels: Record<IsTuru, string> = {
  tavan: 'Tavan İşleri',
  duvar: 'Duvar İşleri',
};

// Tavan türü etiketleri
export const tavanTuruLabels: Record<TavanTuru, string> = {
  duz_tavan: 'Düz Tavan',
  karopan_tavan: 'Karopan Tavan',
  klipin_tavan: 'Klipin Tavan',
};

// Duvar türü etiketleri
export const duvarTuruLabels: Record<DuvarTuru, string> = {
  giydirme_duvar: 'Giydirme Duvar',
  tek_kat_tek_iskelet: 'Tek Kat Tek İskelet',
  cift_kat_cift_iskelet: 'Çift Kat Çift İskelet',
};

// Malzeme türü etiketleri
export const materialTypeLabels: Record<string, string> = {
  beyaz_alcipan: 'Beyaz Alçıpan',
  c_profili: 'C Profili',
  u_profili: 'U Profili',
  aski_teli: 'Askı Teli',
  aski_masasi: 'Askı Masası',
  klips: 'Klips',
  vida: 'Vida',
  t_ana_tasiyici: 'T Ana Taşıyıcı',
  tali_120_tasiyici: 'Tali 120 Taşıyıcı',
  tali_60_tasiyici: 'Tali 60 Taşıyıcı',
  plaka: 'Plaka',
  omega: 'Omega',
  alcipan: 'Alçıpan',
  agraf: 'Agraf',
  dubel_civi: 'Dubel Çivi',
  vida_25: 'Vida 25mm',
  vida_35: 'Vida 35mm',
};