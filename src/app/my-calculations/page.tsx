'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarIcon, CalculatorIcon, CurrencyDollarIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';
import Layout from '@/components/Layout';

interface CalculationHistory {
  id: string;
  job_type: string;
  sub_type: string;
  area: number;
  total_cost: number;
  created_at: string;
  custom_prices: Record<string, number>;
}

export default function MyCalculationsPage() {
  const [calculations, setCalculations] = useState<CalculationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchCalculations();
      } else {
        // Kullanıcı giriş yapmamışsa state'i temizle
        setCalculations([]);
        setIsLoading(false);
        setError(null);
      }
    }
  }, [user, authLoading]);

  const fetchCalculations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/calculations');
      
      if (!response.ok) {
        throw new Error('Hesaplama geçmişi alınamadı');
      }

      const data = await response.json();
      setCalculations(data.calculations || []);
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

  const handleDeleteCalculation = async (id: string) => {
    if (!confirm('Bu hesaplamayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setDeletingId(id);
      const response = await fetch(`/api/user/calculations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hesaplama silinemedi');
      }

      // Başarılı silme sonrası listeyi güncelle
      setCalculations(prev => prev.filter(calc => calc.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Hesaplama silinemedi');
    } finally {
      setDeletingId(null);
    }
  };

  // Kullanıcı giriş yapmamışsa
  if (!authLoading && !user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md mx-auto">
                <CalculatorIcon className="mx-auto h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Giriş Yapmanız Gerekiyor
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  Hesaplama geçmişinizi görüntülemek için lütfen giriş yapın.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Giriş Yap
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Hesaplama geçmişi yükleniyor...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">Hata: {error}</p>
                <button
                  onClick={fetchCalculations}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Tekrar Dene
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hesaplama Geçmişim</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Daha önce yaptığınız tüm hesaplamaları görüntüleyin
          </p>
        </div>

        {/* New Calculation Button */}
        <div className="mb-4 sm:mb-6">
          <Link
            href="/calculator"
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CalculatorIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Yeni Hesaplama
          </Link>
        </div>

        {/* Calculations List */}
        {calculations.length === 0 ? (
          <div className="text-center py-12">
            <CalculatorIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz hesaplama yok</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk hesaplamanızı yapmak için calculator sayfasına gidin.
            </p>
            <div className="mt-6">
              <Link
                href="/calculator"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
              >
                <CalculatorIcon className="h-4 w-4 mr-2" />
                Hesaplama Yap
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {calculations.map((calculation) => (
              <div
                key={calculation.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center min-w-0 flex-1">
                      <CalculatorIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {getJobTypeLabel(calculation.job_type)}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 flex-shrink-0">
                      {getSubTypeLabel(calculation.sub_type)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatDate(calculation.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <span className="mr-2">Alan:</span>
                      <span className="font-medium">{calculation.area} m²</span>
                    </div>

                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <CurrencyDollarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                      <span className="mr-2">Toplam:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(calculation.total_cost)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 sm:mt-6 space-y-2">
                    <Link
                      href={`/calculation/${calculation.id}`}
                      className="w-full inline-flex justify-center items-center px-3 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Detayları Görüntüle
                    </Link>
                    
                    <button
                      onClick={() => handleDeleteCalculation(calculation.id)}
                      disabled={deletingId === calculation.id}
                      className="w-full inline-flex justify-center items-center px-3 sm:px-4 py-2 border border-red-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === calculation.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-red-600 mr-2"></div>
                          Siliniyor...
                        </>
                      ) : (
                        <>
                          <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          Sil
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}
