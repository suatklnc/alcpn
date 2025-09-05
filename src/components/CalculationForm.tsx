'use client';

import { useState, useEffect } from 'react';
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

  // isTuru değiştiğinde altTuru'yu resetle
  useEffect(() => {
    if (watchedIsTuru === 'tavan') {
      setValue('altTuru', 'duz_tavan');
    } else if (watchedIsTuru === 'duvar') {
      setValue('altTuru', 'giydirme_duvar');
    }
  }, [watchedIsTuru, setValue]);



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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          Malzeme Hesaplama
        </h2>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Alan Girişi */}
        <div>
          <label htmlFor="area" className="block text-sm font-semibold text-gray-700 mb-2">
            Alan (m²)
          </label>
          <div className="relative">
            <input
              type="number"
              id="area"
              step="0.1"
              min="0.1"
              max="10000"
              {...register('area', { valueAsNumber: true })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-gray-50 focus:bg-white transition-all duration-200"
              placeholder="Örn: 25.5"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-sm font-medium">m²</span>
            </div>
          </div>
          {errors.area && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.area.message}
            </p>
          )}
        </div>

        {/* İş Türü Seçimi */}
        <div>
          <label htmlFor="isTuru" className="block text-sm font-semibold text-gray-700 mb-2">
            İş Türü
          </label>
          <div className="relative">
            <select
              id="isTuru"
              {...register('isTuru')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-gray-50 focus:bg-white transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="tavan">Tavan İşleri</option>
              <option value="duvar">Duvar İşleri</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.isTuru && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.isTuru.message}
            </p>
          )}
        </div>

        {/* Alt Tür Seçimi */}
        <div>
          <label htmlFor="altTuru" className="block text-sm font-semibold text-gray-700 mb-2">
            {watchedIsTuru === 'tavan' ? 'Tavan Türü' : 'Duvar Türü'}
          </label>
          <div className="relative">
            <select
              id="altTuru"
              {...register('altTuru')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-gray-50 focus:bg-white transition-all duration-200 appearance-none cursor-pointer"
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
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.altTuru && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.altTuru.message}
            </p>
          )}
        </div>





        {/* Hesapla Butonu */}
        <button
          type="submit"
          disabled={isCalculating}
          className="group w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
        >
          {isCalculating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Hesaplanıyor...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Hesapla
            </div>
          )}
        </button>
        </form>
      </div>
    </div>
  );
}