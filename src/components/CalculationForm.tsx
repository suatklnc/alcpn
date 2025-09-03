'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calculationFormSchema } from '@/lib/validation/calculation-schema';

import { CalculationResult } from '@/types/calculation';
import { useAuth } from '@/lib/auth-context';

interface CalculationFormProps {
  onCalculate: (results: CalculationResult[]) => void;
}

type FormData = {
  area: number;
  isTuru: 'tavan' | 'duvar';
  altTuru: 'duz_tavan' | 'karopan_tavan' | 'klipin_tavan' | 'giydirme_duvar' | 'tek_kat_tek_iskelet' | 'cift_kat_cift_iskelet';
};

export default function CalculationForm({ onCalculate }: CalculationFormProps) {
  const [isCalculating, setIsCalculating] = useState(false);

  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(calculationFormSchema),
    defaultValues: {
      area: 0,
      isTuru: 'tavan',
      altTuru: 'duz_tavan',
    },
  });

  const watchedIsTuru = watch('isTuru');
  const watchedAltTuru = watch('altTuru');



  const onSubmit = async (data: FormData) => {
    if (!user) {
      alert('Hesaplama yapmak için giriş yapmalısınız.');
      return;
    }

    setIsCalculating(true);
    
    try {
      // API'yi kullanarak hesaplama yap
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobType: data.isTuru,
          subType: data.altTuru,
          area: data.area,
        }),
      });

      if (!response.ok) {
        throw new Error('Hesaplama başarısız');
      }

      const result = await response.json();
      
      if (result.success) {
        // API sonucunu eski format'a çevir
                          const results = result.data.materials.map((material: { materialType: string; materialName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; coefficient: number }) => ({
          materialType: material.materialType,
          materialName: material.materialName,
          quantity: material.quantity,
          unit: material.unit,
          unitPrice: material.unitPrice,
          totalPrice: material.totalPrice,
          coefficient: material.coefficient,
        }));
        
        onCalculate(results);
      } else {
        throw new Error(result.error || 'Hesaplama hatası');
      }
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      alert('Hesaplama sırasında hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setIsCalculating(false);
    }
  };



  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Malzeme Hesaplama
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Alan Girişi */}
        <div>
          <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
            Alan (m²)
          </label>
          <input
            type="number"
            id="area"
            step="0.1"
            min="0.1"
            max="10000"
            {...register('area', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="Örn: 25.5"
          />
          {errors.area && (
            <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
          )}
        </div>

        {/* İş Türü Seçimi */}
        <div>
          <label htmlFor="isTuru" className="block text-sm font-medium text-gray-700 mb-1">
            İş Türü
          </label>
          <select
            id="isTuru"
            {...register('isTuru')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="tavan">Tavan İşleri</option>
            <option value="duvar">Duvar İşleri</option>
          </select>
          {errors.isTuru && (
            <p className="mt-1 text-sm text-red-600">{errors.isTuru.message}</p>
          )}
        </div>

        {/* Alt Tür Seçimi */}
        <div>
          <label htmlFor="altTuru" className="block text-sm font-medium text-gray-700 mb-1">
            {watchedIsTuru === 'tavan' ? 'Tavan Türü' : 'Duvar Türü'}
          </label>
          <select
            id="altTuru"
            {...register('altTuru')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            {watchedIsTuru === 'tavan' ? (
              <>
                <option value="duz_tavan">Düz Tavan</option>
                <option value="karopan_tavan">Karopan Tavan</option>
                <option value="klipin_tavan">Klipin Tavan</option>
              </>
            ) : (
              <>
                <option value="giydirme_duvar">Giydirme Duvar</option>
                <option value="tek_kat_tek_iskelet">Tek Kat Tek İskelet</option>
                <option value="cift_kat_cift_iskelet">Çift Kat Çift İskelet</option>
              </>
            )}
          </select>
          {errors.altTuru && (
            <p className="mt-1 text-sm text-red-600">{errors.altTuru.message}</p>
          )}
        </div>





        {/* Hesapla Butonu */}
        <button
          type="submit"
          disabled={isCalculating}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCalculating ? 'Hesaplanıyor...' : 'Hesapla'}
        </button>
      </form>
    </div>
  );
}