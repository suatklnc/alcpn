'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import CalculationForm from '@/components/CalculationForm';
import ResultsPanel from '@/components/ResultsPanel';
import { CalculationResult } from '@/types/calculation';
import { useAuth } from '@/lib/auth-context';

export default function CalculatorPage() {
  const [results, setResults] = useState<CalculationResult[]>([]);
  const { user } = useAuth();

  const handleCalculate = (newResults: CalculationResult[]) => {
    setResults(newResults);
  };

  const handleClear = () => {
    setResults([]);
  };




  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Malzeme Hesaplayıcı
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Malzeme miktarlarını ve maliyetlerini kolayca hesaplayın
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="order-2 lg:order-1">
              <CalculationForm onCalculate={handleCalculate} />
            </div>

            {/* Results */}
            <div className="order-1 lg:order-2">
              <ResultsPanel
                results={results}
                onClear={handleClear}
              />
            </div>
          </div>

          {/* Info Cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Hızlı Hesaplama</h3>
                  <p className="text-sm text-gray-600">Anında sonuç alın</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Dışa Aktarma</h3>
                  <p className="text-sm text-gray-600">CSV formatında indirin</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Kaydetme</h3>
                  <p className="text-sm text-gray-600">Hesaplamalarınızı saklayın</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Güncel Fiyatlar</h3>
                  <p className="text-sm text-gray-600">Piyasa fiyatları</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold text-lg">💡</span>
              </div>
              <h3 className="text-2xl font-bold text-blue-900">Kullanım İpuçları</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <p className="text-blue-800">Alan değerini m² cinsinden doğru bir şekilde giriniz</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-blue-600 font-bold text-sm">2</span>
                  </div>
                  <p className="text-blue-800">Özel birim fiyat girmezseniz güncel piyasa fiyatları kullanılır</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-blue-600 font-bold text-sm">3</span>
                  </div>
                  <p className="text-blue-800">Hesaplama sonuçlarını CSV olarak indirebilirsiniz</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-blue-600 font-bold text-sm">4</span>
                  </div>
                  <p className="text-blue-800">
                    {user ? 'Hesaplamalarınızı kaydedebilir' : 'Giriş yaparak hesaplamalarınızı kaydedebilir'} ve daha sonra görüntüleyebilirsiniz
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
