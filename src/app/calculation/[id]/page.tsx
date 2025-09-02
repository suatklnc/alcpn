'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  CalculatorIcon, 
  CalendarIcon, 
  DocumentDuplicateIcon,
  ShareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';

interface CalculationDetail {
  id: string;
  user_id: string;
  job_type: string;
  sub_type: string;
  area: number;
  custom_prices: Record<string, number>;
  calculation_result: {
    materials: Array<{
      materialType: string;
      materialName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      totalPrice: number;
      coefficient: number;
    }>;
    totalCost: number;
  };
  total_cost: number;
  created_at: string;
}

export default function CalculationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [calculation, setCalculation] = useState<CalculationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Geçici olarak development için authentication kontrolünü devre dışı bırak
    if (params.id) {
      fetchCalculationDetail(params.id as string);
    }
  }, [params.id]);

  const fetchCalculationDetail = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user/calculations/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Hesaplama bulunamadı');
        }
        throw new Error('Hesaplama detayları alınamadı');
      }

      const data = await response.json();
      setCalculation(data.calculation);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bilinmeyen hata');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  const getJobTypeLabel = (jobType: string) => {
    const labels: Record<string, string> = {
      tavan: 'Tavan',
      duvar: 'Duvar',
    };
    return labels[jobType] || jobType;
  };

  const getSubTypeLabel = (subType: string) => {
    const labels: Record<string, string> = {
      duz_tavan: 'Düz Tavan',
      karopan_tavan: 'Karopan Tavan',
      klipin_tavan: 'Klipin Tavan',
      giydirme_duvar: 'Giydirme Duvar',
      tek_kat_tek_iskelet: 'Tek Kat Tek İskelet',
      cift_kat_cift_iskelet: 'Çift Kat Çift İskelet',
    };
    return labels[subType] || subType;
  };

  const getMaterialLabel = (materialType: string) => {
    const labels: Record<string, string> = {
      aluminyum_profil: 'Alüminyum Profil',
      aluminyum_levha: 'Alüminyum Levha',
      aski_teli: 'Askı Teli',
      vida: 'Vida',
      dubel: 'Dubel',
      silikon: 'Silikon',
      boya: 'Boya',
    };
    return labels[materialType] || materialType;
  };

  const copyToClipboard = async () => {
    if (!calculation) return;
    
    const summary = `Hesaplama Özeti:
İş Türü: ${getJobTypeLabel(calculation.job_type)}
Alt Tür: ${getSubTypeLabel(calculation.sub_type)}
Alan: ${calculation.area} m²
Toplam Maliyet: ${formatCurrency(calculation.total_cost)}
Tarih: ${formatDate(calculation.created_at)}

Malzemeler:
${calculation.calculation_result.materials.map(m => 
  `- ${getMaterialLabel(m.materialType)}: ${formatNumber(m.quantity)} ${m.unit} (${formatCurrency(m.totalPrice)})`
).join('\n')}`;

    try {
      await navigator.clipboard.writeText(summary);
      alert('Hesaplama özeti panoya kopyalandı!');
    } catch (error) {
      console.error('Kopyalama hatası:', error);
      alert('Kopyalama başarısız oldu');
    }
  };

  const shareCalculation = async () => {
    if (!calculation) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hesaplama Detayları',
          text: `${getJobTypeLabel(calculation.job_type)} - ${getSubTypeLabel(calculation.sub_type)} hesaplaması`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Paylaşım hatası:', error);
      }
    } else {
      copyToClipboard();
    }
  };

  const handleDeleteCalculation = async () => {
    if (!calculation) return;
    
    if (!confirm('Bu hesaplamayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/user/calculations/${calculation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hesaplama silinemedi');
      }

      // Başarılı silme sonrası hesaplama geçmişine yönlendir
      router.push('/my-calculations');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Hesaplama silinemedi');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Hesaplama detayları yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Geçici olarak development için authentication kontrolünü devre dışı bırak
  // TODO: Production'da gerçek authentication kontrolü ekle

  if (error || !calculation) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">Hata: {error || 'Hesaplama bulunamadı'}</p>
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Geri Dön
                </button>
                <Link
                  href="/my-calculations"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Hesaplama Geçmişi
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <Link
                href="/my-calculations"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Hesaplama Geçmişi
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hesaplama Detayları</h1>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Kopyala</span>
              </button>
              <button
                onClick={shareCalculation}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ShareIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Paylaş</span>
              </button>
              <button
                onClick={handleDeleteCalculation}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    <span className="hidden sm:inline">Siliniyor...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Sil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Hesaplama Özeti</h2>
          </div>
          <div className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <CalculatorIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">İş Türü</p>
                    <p className="text-sm text-gray-900 truncate">{getJobTypeLabel(calculation.job_type)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3 flex-shrink-0">
                    {getSubTypeLabel(calculation.sub_type)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">Alt Tür</p>
                    <p className="text-sm text-gray-900 truncate">{getSubTypeLabel(calculation.sub_type)}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">Alan</p>
                    <p className="text-sm text-gray-900">{calculation.area} m²</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">Tarih</p>
                    <p className="text-sm text-gray-900">{formatDate(calculation.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Total Cost */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <span className="text-lg font-medium text-gray-900">Toplam Maliyet</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculation.total_cost)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Materials Breakdown */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Malzeme Detayları</h2>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Malzeme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miktar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Birim Fiyat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calculation.calculation_result.materials.map((material, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getMaterialLabel(material.materialType)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Katsayı: {material.coefficient}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatNumber(material.quantity)} {material.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(material.unitPrice)}
                      </div>
                      {calculation.custom_prices[material.materialType] && (
                        <div className="text-xs text-blue-600">
                          Özel fiyat
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(material.totalPrice)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {calculation.calculation_result.materials.map((material, index) => (
              <div key={index} className="px-4 py-4 border-b border-gray-200 last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {getMaterialLabel(material.materialType)}
                    </h3>
                    <p className="text-xs text-gray-500">Katsayı: {material.coefficient}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(material.totalPrice)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Miktar</p>
                    <p className="text-gray-900">{formatNumber(material.quantity)} {material.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Birim Fiyat</p>
                    <p className="text-gray-900">{formatCurrency(material.unitPrice)}</p>
                    {calculation.custom_prices[material.materialType] && (
                      <p className="text-xs text-blue-600">Özel fiyat</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Prices Info */}
        {Object.keys(calculation.custom_prices).length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Özel Fiyatlar Kullanıldı</h3>
            <div className="text-sm text-blue-800">
              Bu hesaplamada bazı malzemeler için özel birim fiyatlar kullanılmıştır.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
