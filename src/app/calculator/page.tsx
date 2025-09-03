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

  const handleSave = async (name: string) => {
    if (!user) {
      alert('Hesaplamayı kaydetmek için giriş yapmalısınız.');
      return;
    }

    // TODO: Implement save functionality with Supabase
    console.log('Saving calculation:', { name, results, userId: user.id });
    alert(`"${name}" adlı hesaplama kaydedildi! (Henüz backend entegrasyonu yapılmadı)`);
  };



  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Malzeme Hesaplayıcı
            </h1>
            <p className="mt-2 text-base sm:text-lg text-gray-600">
              Malzeme miktarlarını ve maliyetlerini kolayca hesaplayın
            </p>
          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Form */}
          <div>
            <CalculationForm onCalculate={handleCalculate} />
          </div>

          {/* Results */}
          <div>
            <ResultsPanel
              results={results}
              onSave={user ? handleSave : undefined}
              onClear={handleClear}
            />
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Hızlı Hesaplama
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Malzeme miktarlarını ve maliyetlerini kolayca hesaplayın
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Dışa Aktarma
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Sonuçları CSV formatında indirin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            💡 Kullanım İpuçları
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Alan değerini m² cinsinden doğru bir şekilde giriniz</li>
            <li>• Özel birim fiyat girmezseniz güncel piyasa fiyatları kullanılır</li>
            <li>• Hesaplama sonuçlarını CSV olarak indirebilirsiniz</li>
            <li>
              • {user ? 'Hesaplamalarınızı kaydedebilir' : 'Giriş yaparak hesaplamalarınızı kaydedebilir'} ve daha sonra görüntüleyebilirsiniz
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
