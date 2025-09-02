'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { multiMaterialFormSchema } from '@/lib/validation/calculation-schema';
import { getAvailableMaterials } from '@/lib/material-utils';
import { CalculationResult } from '@/types/calculation';
import { materialTypeLabels } from '@/lib/validation/calculation-schema';
import { useAuth } from '@/lib/auth-context';

interface MultiMaterialFormProps {
  onCalculate: (results: CalculationResult[]) => void;
  refreshKey?: number;
}

type FormData = {
  area: number;
  isTuru: 'tavan' | 'duvar';
  altTuru: 'duz_tavan' | 'karopan_tavan' | 'klipin_tavan' | 'giydirme_duvar' | 'tek_kat_tek_iskelet' | 'cift_kat_cift_iskelet';
  selectedMaterials: ('beyaz_alcipan' | 'c_profili' | 'u_profili' | 'aski_teli' | 'aski_masasi' | 'klips' | 'vida' | 't_ana_tasiyici' | 'tali_120_tasiyici' | 'tali_60_tasiyici' | 'plaka' | 'omega' | 'alcipan' | 'agraf' | 'dubel_civi' | 'vida_25' | 'vida_35')[];
};

export default function MultiMaterialForm({ onCalculate, refreshKey }: MultiMaterialFormProps) {
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
    resolver: zodResolver(multiMaterialFormSchema),
    defaultValues: {
      area: 0,
      isTuru: 'tavan',
      altTuru: 'duz_tavan',
      selectedMaterials: [],
    },
  });

  const watchedIsTuru = watch('isTuru');
  const watchedSelectedMaterials = watch('selectedMaterials') || [];



  // İş türüne göre mevcut malzemeleri getir
  const availableMaterials = getAvailableMaterials(watchedIsTuru);

  const toggleMaterial = (materialType: string) => {
    const currentMaterials = getValues('selectedMaterials') || [];
    const isSelected = currentMaterials.includes(materialType as FormData['selectedMaterials'][0]);
    
    if (isSelected) {
      const newMaterials = currentMaterials.filter(m => m !== materialType);
      setValue('selectedMaterials', newMaterials);
    } else {
      setValue('selectedMaterials', [...currentMaterials, materialType as FormData['selectedMaterials'][0]]);
    }
  };



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
          selectedMaterials: data.selectedMaterials,
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
        Çoklu Malzeme Hesaplama
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="tavan">Tavan İşleri</option>
            <option value="duvar">Duvar İşleri</option>
          </select>
          {errors.isTuru && (
            <p className="mt-1 text-sm text-red-600">{errors.isTuru.message}</p>
          )}
        </div>

        {/* Malzeme Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Malzemeler ({watchedSelectedMaterials.length} seçili)
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
            {availableMaterials.map((materialType) => {
              const isSelected = watchedSelectedMaterials.includes(materialType);
              return (
                <label
                  key={materialType}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMaterial(materialType)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">
                    {materialTypeLabels[materialType] || materialType}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.selectedMaterials && (
            <p className="mt-1 text-sm text-red-600">{errors.selectedMaterials.message}</p>
          )}
        </div>



        {/* Hesapla Butonu */}
        <button
          type="submit"
          disabled={isCalculating || watchedSelectedMaterials.length === 0}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCalculating ? 'Hesaplanıyor...' : 'Hesapla'}
        </button>
      </form>
    </div>
  );
}