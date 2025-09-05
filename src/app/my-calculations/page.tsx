'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  CalendarIcon, 
  CalculatorIcon,
  CurrencyDollarIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClipboardDocumentIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
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

  // Filtrelenmiş ve sıralanmış hesaplamalar
  const filteredCalculations = useMemo(() => {
    let filtered = calculations;

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(calc => 
        getJobTypeLabel(calc.job_type).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getSubTypeLabel(calc.sub_type).toLowerCase().includes(searchTerm.toLowerCase()) ||
        calc.area.toString().includes(searchTerm) ||
        formatCurrency(calc.total_cost).includes(searchTerm)
      );
    }

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(calc => calc.job_type === filterType);
    }

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest':
          return b.total_cost - a.total_cost;
        case 'lowest':
          return a.total_cost - b.total_cost;
        case 'area_high':
          return b.area - a.area;
        case 'area_low':
          return a.area - b.area;
        default:
          return 0;
      }
    });

    return filtered;
  }, [calculations, searchTerm, filterType, sortBy]);


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

  const handleCopyToClipboard = async (calculation: CalculationHistory) => {
    const textContent = [
      `HESAPLAMA DETAYI`,
      `================`,
      `İş Türü: ${getJobTypeLabel(calculation.job_type)}`,
      `Alt Tür: ${getSubTypeLabel(calculation.sub_type)}`,
      `Alan: ${calculation.area} m²`,
      `Toplam Maliyet: ${formatCurrency(calculation.total_cost)}`,
      `Tarih: ${formatDate(calculation.created_at)}`,
      `================`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(textContent);
      alert('Hesaplama detayları panoya kopyalandı!');
    } catch (err) {
      console.error('Panoya kopyalama hatası:', err);
      alert('Panoya kopyalama başarısız oldu.');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Hesaplama Geçmişim
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Tüm hesaplamalarınızı yönetin ve analiz edin
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Link
                  href="/calculator"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105 transition-all duration-200"
                >
                  <CalculatorIcon className="h-5 w-5 mr-2" />
                  Yeni Hesaplama
                </Link>
              </div>
            </div>
          </div>


          {/* Filtreleme ve Arama */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Arama */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Hesaplama ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-700 focus:outline-none focus:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Tip Filtresi */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="all">Tüm İş Türleri</option>
                  <option value="tavan">Tavan</option>
                  <option value="duvar">Duvar</option>
                </select>
              </div>

              {/* Sıralama */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="highest">En Yüksek Maliyet</option>
                  <option value="lowest">En Düşük Maliyet</option>
                  <option value="area_high">En Büyük Alan</option>
                  <option value="area_low">En Küçük Alan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Calculations List */}
          {filteredCalculations.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CalculatorIcon className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {calculations.length === 0 ? 'Henüz hesaplama yok' : 'Arama sonucu bulunamadı'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {calculations.length === 0 
                    ? 'İlk hesaplamanızı yapmak için calculator sayfasına gidin.'
                    : 'Farklı arama terimleri deneyin veya filtreleri temizleyin.'
                  }
                </p>
                <div className="space-y-3">
                  <Link
                    href="/calculator"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <CalculatorIcon className="h-5 w-5 mr-2" />
                    Hesaplama Yap
                  </Link>
                  {calculations.length > 0 && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterType('all');
                        setSortBy('newest');
                      }}
                      className="block mx-auto px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCalculations.map((calculation) => (
                <div
                  key={calculation.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden group"
                >
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                          {calculation.job_type === 'tavan' ? (
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {getJobTypeLabel(calculation.job_type)}
                          </h3>
                          <p className="text-indigo-100 text-sm">
                            {getSubTypeLabel(calculation.sub_type)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {formatCurrency(calculation.total_cost)}
                        </p>
                        <p className="text-indigo-100 text-sm">Toplam Maliyet</p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Details */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center text-gray-600">
                        <CalendarIcon className="h-5 w-5 mr-3 text-gray-400" />
                        <span className="text-sm">{formatDate(calculation.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <div className="w-5 h-5 mr-3 flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <span className="text-sm">Alan: <span className="font-semibold text-gray-900">{calculation.area} m²</span></span>
                      </div>

                      <div className="flex items-center text-gray-600">
                        <CurrencyDollarIcon className="h-5 w-5 mr-3 text-gray-400" />
                        <span className="text-sm">Birim Maliyet: <span className="font-semibold text-gray-900">{formatCurrency(calculation.total_cost / calculation.area)}/m²</span></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/calculation/${calculation.id}`}
                        className="group flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 hover:text-indigo-800 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 border border-indigo-200 hover:border-indigo-300"
                      >
                        <EyeIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        Detay
                      </Link>
                      
                      <button
                        onClick={() => handleCopyToClipboard(calculation)}
                        className="group flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-700 hover:text-green-800 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 border border-green-200 hover:border-green-300"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        Kopyala
                      </button>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteCalculation(calculation.id)}
                      disabled={deletingId === calculation.id}
                      className="group w-full mt-4 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 hover:text-red-700 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-red-200 hover:border-red-300"
                    >
                      {deletingId === calculation.id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mr-2"></div>
                          Siliniyor...
                        </>
                      ) : (
                        <>
                          <TrashIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                          Sil
                        </>
                      )}
                    </button>
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
