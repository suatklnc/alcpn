'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CalculatorIcon, 
  CalendarIcon, 
  DocumentDuplicateIcon,
  ShareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';
import Layout from '@/components/Layout';

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
    if (!authLoading) {
      if (user && params.id) {
        fetchCalculationDetail(params.id as string);
      } else if (!user) {
        // Kullanıcı giriş yapmamışsa state'i temizle
        setCalculation(null);
        setIsLoading(false);
        setError('Giriş yapmanız gerekiyor');
      }
    }
  }, [user, authLoading, params.id]);

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
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Hesaplama detayları yükleniyor...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Kullanıcı giriş yapmamışsa
  if (!authLoading && !user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md mx-auto">
                <CalculatorIcon className="mx-auto h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Giriş Yapmanız Gerekiyor
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  Hesaplama detaylarını görüntülemek için lütfen giriş yapın.
                </p>
                <div className="space-x-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Giriş Yap
                  </Link>
                  <button
                    onClick={() => router.back()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Geri Dön
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !calculation) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col space-y-6 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Hesaplama Detayları
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Detaylı malzeme analizi ve maliyet hesaplaması
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={copyToClipboard}
                className="group inline-flex items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200 transform hover:scale-105"
              >
                <DocumentDuplicateIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                <span className="hidden sm:inline">Kopyala</span>
              </button>
              <button
                onClick={shareCalculation}
                className="group inline-flex items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-200 transform hover:scale-105"
              >
                <ShareIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                <span className="hidden sm:inline">Paylaş</span>
              </button>
              <button
                onClick={handleDeleteCalculation}
                disabled={isDeleting}
                className="group inline-flex items-center px-4 py-3 border border-red-300 shadow-sm text-sm font-medium rounded-xl text-red-700 bg-white hover:bg-red-50 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mr-2"></div>
                    <span className="hidden sm:inline">Siliniyor...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline">Sil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <CalculatorIcon className="h-6 w-6 mr-3" />
              Hesaplama Özeti
            </h2>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <CalculatorIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">İş Türü</p>
                    <p className="text-lg font-semibold text-gray-900">{getJobTypeLabel(calculation.job_type)}</p>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-bold text-sm">{getSubTypeLabel(calculation.sub_type).charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Alt Tür</p>
                    <p className="text-lg font-semibold text-gray-900">{getSubTypeLabel(calculation.sub_type)}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold text-sm">m²</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Alan</p>
                    <p className="text-lg font-semibold text-gray-900">{calculation.area} m²</p>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Tarih</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(calculation.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Total Cost */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-lg">₺</span>
                    </div>
                    <span className="text-xl font-semibold text-gray-900">Toplam Maliyet</span>
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(calculation.total_cost)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Materials Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              Malzeme Detayları
            </h2>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Malzeme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Miktar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Birim Fiyat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {calculation.calculation_result.materials.map((material, index) => (
                  <tr key={index} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                          <span className="text-white font-bold text-sm">
                            {getMaterialLabel(material.materialType).charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                            {getMaterialLabel(material.materialType)}
                          </div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block mt-1">
                            Katsayı: {material.coefficient}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg inline-block">
                        {formatNumber(material.quantity)} {material.unit}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(material.unitPrice)}
                      </div>
                      {calculation.custom_prices[material.materialType] && (
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block mt-1">
                          Özel fiyat
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg inline-block">
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
              <div key={index} className="px-6 py-6 border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {getMaterialLabel(material.materialType).charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                      {getMaterialLabel(material.materialType)}
                    </h3>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Katsayı: {material.coefficient}
                      </span>
                      {calculation.custom_prices[material.materialType] && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full ml-2">
                          Özel fiyat
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                      {formatCurrency(material.totalPrice)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">Miktar</p>
                    <p className="text-base font-semibold text-gray-900">{formatNumber(material.quantity)} {material.unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">Birim Fiyat</p>
                    <p className="text-base font-semibold text-gray-900">{formatCurrency(material.unitPrice)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Prices Info */}
        {Object.keys(calculation.custom_prices).length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">!</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-1">Özel Fiyatlar Kullanıldı</h3>
                <p className="text-sm text-blue-800">
                  Bu hesaplamada bazı malzemeler için özel birim fiyatlar kullanılmıştır.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}
