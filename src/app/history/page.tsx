'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatNumber } from '@/lib/calculation-engine';
import { CalculationHistory } from '@/types/calculation';

export default function HistoryPage() {
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadHistory = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // TODO: Implement history loading from Supabase
      // Şimdilik mock data
      const mockHistory: CalculationHistory[] = [
        {
          id: '1',
          userId: user.id,
          name: 'Oturma Odası Düz Tavan',
          area: 25.5,
          isTuru: 'tavan',
          altTuru: 'duz_tavan',
          results: [
            {
              materialType: 'beyaz_alcipan',
              materialName: 'Beyaz Alçıpan',
              quantity: 9,
              unit: 'adet',
              unitPrice: 45,
              totalPrice: 405,
              coefficient: 0.33,
            },
            {
              materialType: 'c_profili',
              materialName: 'C Profili',
              quantity: 22,
              unit: 'adet',
              unitPrice: 8,
              totalPrice: 176,
              coefficient: 0.853,
            },
            {
              materialType: 'u_profili',
              materialName: 'U Profili',
              quantity: 8,
              unit: 'adet',
              unitPrice: 12,
              totalPrice: 96,
              coefficient: 0.3,
            },
          ],
          totalCost: 677,
          createdAt: '2025-01-09T10:30:00Z',
          updatedAt: '2025-01-09T10:30:00Z',
        },
        {
          id: '2',
          userId: user.id,
          name: 'Mutfak Giydirme Duvar',
          area: 12.0,
          isTuru: 'duvar',
          altTuru: 'giydirme_duvar',
          results: [
            {
              materialType: 'u_profili',
              materialName: 'U Profili',
              quantity: 4,
              unit: 'adet',
              unitPrice: 12,
              totalPrice: 48,
              coefficient: 0.29,
            },
            {
              materialType: 'c_profili',
              materialName: 'C Profili',
              quantity: 7,
              unit: 'adet',
              unitPrice: 8,
              totalPrice: 56,
              coefficient: 0.58,
            },
            {
              materialType: 'alcipan',
              materialName: 'Alçıpan',
              quantity: 5,
              unit: 'adet',
              unitPrice: 45,
              totalPrice: 225,
              coefficient: 0.36,
            },
          ],
          totalCost: 329,
          createdAt: '2025-01-08T15:45:00Z',
          updatedAt: '2025-01-08T15:45:00Z',
        },
      ];
      
      setTimeout(() => {
        setHistory(mockHistory);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Geçmiş yüklenirken hata:', error);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [user, loadHistory]);

  const handleDelete = async (id: string) => {
    if (confirm('Bu hesaplamayı silmek istediğinizden emin misiniz?')) {
      // TODO: Implement delete functionality
      setHistory(prev => prev.filter(item => item.id !== id));
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

  if (!user) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Giriş Gerekli
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              Hesaplama geçmişinizi görüntülemek için giriş yapmalısınız.
            </p>
            <div className="mt-6">
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Giriş Yap
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Hesaplama Geçmişi
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Geçmiş hesaplamalarınızı görüntüleyin ve yönetin
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Yükleniyor...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-6 text-lg font-medium text-gray-900">
              Henüz hesaplama geçmişiniz yok
            </h3>
            <p className="mt-2 text-gray-500">
              İlk hesaplamanızı yapmak için hesaplayıcıya gidin.
            </p>
            <div className="mt-6">
              <a
                href="/calculator"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Hesaplayıcıya Git
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {history.map((item) => (
                <li key={item.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-indigo-600">
                          {item.name}
                        </h3>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <svg
                                className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                />
                              </svg>
                              {formatNumber(item.area)} m²
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              <svg
                                className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                />
                              </svg>
                              {formatCurrency(item.totalCost)}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <svg
                              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3a4 4 0 118 0v4m-8 0h8m-8 0H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2"
                              />
                            </svg>
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-sm text-gray-600">
                            {item.results.length} malzeme türü hesaplandı
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            // TODO: Implement view details
                            alert('Detay görüntüleme özelliği yakında eklenecek');
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Detay
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
